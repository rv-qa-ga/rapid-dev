#!/usr/bin/env ts-node
/** Read-only Dataverse preprod query smoke — ENV=int|qamerge|...
 *  CLM uses Party (accelins_parties), not standard Dataverse accounts.
 *  Salesforce Account maps to Dynamics Party:
 *    PTY_Code__c ↔ accelins_partymasterid (PTY-000768)
 *    Dataverse_ID__c ↔ accelins_partyid (GUID)
 *
 *  Optional PTY verification (after syncing an Account):
 *    SF_PTY_CODE=PTY-901279 SF_DATAVERSE_ID=<guid> ENV=qamerge npx ts-node scripts/int-dataverse-query-smoke.ts
 */

const targetEnv = (process.env.ENV || 'int').toLowerCase();
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`), override: true });
process.env.ENV = targetEnv;

async function main(): Promise<void> {
  const { DynamicsAuth } = await import('../src/utils/dynamics-auth');
  const base = (process.env.D365_WEB_API_BASE_URL || '').replace(/\/+$/, '');
  console.log(`Dataverse preprod: ${base}\n`);

  const auth = await DynamicsAuth.authenticate();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  };

  const checks: Array<{ label: string; url: string }> = [
    { label: 'WhoAmI', url: `${base}/WhoAmI` },
    {
      label: 'Party / accelins_parties ($top=3, partymasterid + partyid)',
      url: `${base}/accelins_parties?$top=3&$select=accelins_partymasterid,accelins_partyid,accelins_name`,
    },
    {
      label: 'accelins_countries ($top=1)',
      url: `${base}/accelins_countries?$top=1&$select=accelins_countryid,accelins_name`,
    },
    {
      label: 'contacts / external contact ($top=1)',
      url: `${base}/contacts?$top=1&$select=contactid,fullname`,
    },
    {
      label: 'accelins_internal_contacts ($top=1)',
      url: `${base}/accelins_internal_contacts?$top=1&$select=accelins_internal_contactid`,
    },
    {
      label: 'accelins_membermappings ($top=1)',
      url: `${base}/accelins_membermappings?$top=1&$select=accelins_membermappingid`,
    },
    {
      label: 'accelins_tpamapses ($top=1)',
      url: `${base}/accelins_tpamapses?$top=1&$select=accelins_tpamapsid`,
    },
  ];

  const sfPtyCode = (process.env.SF_PTY_CODE || '').trim();
  const sfDataverseId = (process.env.SF_DATAVERSE_ID || '').trim();
  if (sfPtyCode && sfDataverseId) {
    const escapedId = sfDataverseId.replace(/'/g, "''");
    checks.push({
      label: `Party PTY verify (SF_DATAVERSE_ID=${sfDataverseId})`,
      url: `${base}/accelins_parties?$filter=accelins_partyid eq '${escapedId}'&$select=accelins_partymasterid,accelins_partyid,accelins_name`,
    });
  }

  let failed = 0;
  for (const c of checks) {
    const res = await fetch(c.url, { headers });
    const text = await res.text();
    if (!res.ok) {
      failed++;
      console.log(`❌ ${c.label}: HTTP ${res.status}`);
      console.log(`   ${text.slice(0, 500)}\n`);
      continue;
    }
    const body = JSON.parse(text) as { value?: Array<Record<string, unknown>> } & Record<string, unknown>;
    const sample = body.value?.[0] ?? body;
    console.log(`✅ ${c.label}`);
    console.log(`   ${JSON.stringify(sample).slice(0, 280)}\n`);

    if (c.label.startsWith('Party PTY verify') && sfPtyCode && sfDataverseId) {
      const row = body.value?.[0];
      if (!row) {
        failed++;
        console.log(`❌ No Party row for accelins_partyid=${sfDataverseId}\n`);
        continue;
      }
      const partyMasterId = String(row.accelins_partymasterid ?? '').trim();
      const partyId = String(row.accelins_partyid ?? '').trim();
      if (partyMasterId !== sfPtyCode) {
        failed++;
        console.log(
          `❌ PTY mismatch: SF PTY_Code__c=${sfPtyCode}, Dynamics accelins_partymasterid=${partyMasterId || '(empty)'}`
        );
        console.log(`   accelins_partyid (GUID): ${partyId}\n`);
      } else {
        console.log(`✅ PTY match: accelins_partymasterid=${partyMasterId}, accelins_partyid=${partyId}\n`);
      }
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
