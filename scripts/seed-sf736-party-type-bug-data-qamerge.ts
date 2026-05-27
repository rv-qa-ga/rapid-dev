/**
 * Create Salesforce Accounts (all 17 SF-467 types) in qamerge with integration triggered,
 * for SF-736 Party Type / Data Source / Status validation evidence.
 *
 * Each run uses a timestamped name prefix (SF736-INT-YYYYMMDD-HHmm-*) and does NOT delete
 * prior seed data. Persistent bug evidence under SF736-BUG-QAMERGE-* is never removed.
 *
 * Set SF736_BUG_RECREATE=1 to delete only accounts matching the current run prefix before seeding.
 *
 * Usage:
 *   npm run data:sf736-bug-qamerge
 *   cross-env ENV=qamerge SF736_SEED_PREFIX=SF736-INT-20260519-1430 npx ts-node scripts/seed-sf736-party-type-bug-data-qamerge.ts
 *
 * Output:
 *   data/sf736-party-type-bug-seed-qamerge.json
 *   docs/sf736-party-type-bug-seed-qamerge.md
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { chromium } from '@playwright/test';

const PERSISTENT_PREFIX = 'SF736-BUG-QAMERGE';

function timestampPrefix(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `SF736-INT-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const NAME_PREFIX = (process.env.SF736_SEED_PREFIX ?? timestampPrefix()).trim();
const SYNC_WAIT_SECONDS = 120;
const POLL_MS = 5000;

const envTarget = (process.env.ENV || 'qamerge').toLowerCase();
process.env.ENV = envTarget;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${envTarget}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}
process.env.ENV = envTarget;

const CONTRACT_ERROR =
  'A signed contract must be uploaded and approved before the Account can be set to Contracted or Active.';
const OPP_HAS_APPROVED = 'Has_Approved_Contract__c';
const OPP_EXECUTED = 'Executed_Contract_Confirmed__c';

function accountNameForType(accountType: string): string {
  const slug = accountType.replace(/\s+/g, ' ').trim().replace(/\s/g, '-').replace(/-+/g, '-');
  return `${NAME_PREFIX}-${slug}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const { SF736_ACCOUNT_TYPES } = await import('../src/utils/sf-account-party-type-mapping');
  const { integrationCreateFieldsForAccountType, validateAccountPartyIntegrationFields, readPartyOptionSetValue } =
    await import('../src/utils/sf-account-party-integration-validation');
  const { resolveExpectedPartyTypeCode, partyTypeMatchesAccountType, readPartyTypeFromDynamicsRow, fetchPartyWithExpandedType } =
    await import('../src/utils/sf-account-party-type-mapping');
  const { SalesforceAPIClient } = await import('../src/api-clients/salesforce/SalesforceAPIClient');
  const { DynamicsAPIClient } = await import('../src/api-clients/dynamics/DynamicsAPIClient');
  const { TestDataFactory } = await import('../src/test-data/TestDataFactory');
  const { primeSfAccountDataverseFieldFromOrg, sfAccountDataverseField } = await import(
    '../src/utils/sf-account-dataverse-field'
  );
  const { logger } = await import('../src/utils/logger');

  function readAccountDv(rec: Record<string, unknown> | null | undefined): string | undefined {
    if (!rec) return undefined;
    const primary = sfAccountDataverseField();
    const pv = rec[primary];
    if (pv != null && String(pv).trim() !== '') return String(pv).trim();
    const alt = rec['Dataverse_Id__c'] ?? rec['Dataverse_ID__c'];
    if (alt != null && String(alt).trim() !== '') return String(alt).trim();
    return undefined;
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  SF-736 Party Type bug seed (${envTarget})`);
  console.log(`  Prefix: ${NAME_PREFIX}-*  |  ${SF736_ACCOUNT_TYPES.length} account types`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const sf = new SalesforceAPIClient(ctx.request);
  const d365 = new DynamicsAPIClient(ctx.request);
  await sf.authenticate();
  await d365.authenticate();
  await primeSfAccountDataverseFieldFromOrg(sf);

  const factory = new TestDataFactory();
  factory.setAPIContext(ctx.request);
  await factory.initialize();

  if (process.env.SF736_BUG_RECREATE === '1') {
    const stale = await sf.query(
      `SELECT Id, Name FROM Account WHERE Name LIKE '${NAME_PREFIX}-%'`
    );
    for (const rec of stale.records ?? []) {
      const id = rec.Id as string;
      try {
        await sf.deleteRecord('Account', id);
        console.log(`  Deleted prior seed Account: ${rec.Name} (${id})`);
      } catch (e: unknown) {
        console.log(`  ⚠ Could not delete ${rec.Name}: ${String((e as Error)?.message ?? e)}`);
      }
    }
  } else {
    console.log(`  Preserving existing seed data (prefix ${PERSISTENT_PREFIX}-* and prior ${NAME_PREFIX}-* runs)`);
  }

  const dvField = sfAccountDataverseField();
  const results: Array<Record<string, unknown>> = [];

  const writeOutputs = (): void => {
    const outJson = path.resolve(process.cwd(), 'data/sf736-party-type-bug-seed-qamerge.json');
    fs.mkdirSync(path.dirname(outJson), { recursive: true });
    fs.writeFileSync(
      outJson,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          environment: envTarget,
          namePrefix: NAME_PREFIX,
          bugSummary:
            'Account→Party sync: Party Type blank for some types; 4 insurer/reinsurer types fail to sync on qamerge',
          records: results,
        },
        null,
        2
      )
    );

    const mdLines = [
      '# SF-736 Party Type / Data Source bug — qamerge seed data',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      'Persistent bug evidence (prefix `SF736-BUG-QAMERGE-`) is retained. This run uses timestamped prefix.',
      '',
      '| Account Type | SF Account Id | D365 Party Id | SF Type | Expected PTP | D365 Party Type | D365 DS Written | Failures |',
      '|---|---|---|---|---|---|---|---|',
    ];
    for (const r of results) {
      mdLines.push(
        `| ${r.accountType} | ${r.salesforceAccountId} | ${r.dataverseId ?? '—'} | ${r.sfType} | ${r.expectedPartyTypeCode} | ${r.d365PartyType ?? '(empty)'} | ${r.d365DataSourceWritten ?? '(empty)'} | ${(r.integrationFieldFailures as string[]).join(', ') || '—'} |`
      );
    }
    mdLines.push('', `Full JSON: \`data/sf736-party-type-bug-seed-qamerge.json\``);
    fs.writeFileSync(path.resolve(process.cwd(), 'docs/sf736-party-type-bug-seed-qamerge.md'), mdLines.join('\n'));
  };

  async function fetchAccount(accountId: string): Promise<Record<string, unknown>> {
    const soql =
      `SELECT Id, Name, Type, Account_Status__c, PTY_Code__c, Party_Code__c, ` +
      `Reporting_Region__c, Affiliate_Non_Affiliate__c, Data_Source_Written__c, ` +
      `Data_Source_Claims__c, ${dvField}, Phone, BillingStreet, BillingCity ` +
      `FROM Account WHERE Id = '${accountId}' LIMIT 1`;
    const res = await sf.query(soql);
    const row = res.records?.[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error(`Account not found: ${accountId}`);
    return row;
  }

  async function ensureContractOpp(accountId: string): Promise<void> {
    const existing = await sf.query(
      `SELECT Id FROM Opportunity WHERE AccountId = '${accountId}' ORDER BY CreatedDate DESC LIMIT 1`
    );
    const existingId = existing.records?.[0]?.Id as string | undefined;
    if (existingId) {
      await sf.updateRecord('Opportunity', existingId, {
        [OPP_HAS_APPROVED]: true,
        [OPP_EXECUTED]: true,
      });
      return;
    }
    const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const opp = await sf.createRecord('Opportunity', {
      Name: `SF736_BUG_Contract_${Date.now()}`,
      AccountId: accountId,
      Type: 'Existing Business',
      StageName: 'Pipeline',
      CloseDate: closeDate,
    });
    await sf.updateRecord('Opportunity', opp.id as string, {
      [OPP_HAS_APPROVED]: true,
      [OPP_EXECUTED]: true,
    });
    try {
      await sf.updateRecord('Account', accountId, { Opportunity__c: opp.id });
    } catch {
      /* optional on some orgs */
    }
  }

  function buildStatusPatch(row: Record<string, unknown>, status: string): Record<string, unknown> {
    const patch: Record<string, unknown> = { Account_Status__c: status };
    if (!row.Reporting_Region__c) patch.Reporting_Region__c = 'US';
    const t = String(row.Type || '');
    if (
      ['Member', 'Insurer', 'Insurer Branch', 'Group', 'Reinsurer'].includes(t) &&
      ['Onboarding', 'Active', 'Contracted'].includes(status) &&
      !row.Affiliate_Non_Affiliate__c
    ) {
      patch.Affiliate_Non_Affiliate__c = 'AFL';
    }
    if (
      t === 'Member' &&
      ['Onboarding', 'Active', 'Contracted'].includes(status) &&
      !row.Party_Code__c
    ) {
      patch.Party_Code__c = 'SF736BUG';
    }
    return patch;
  }

  async function triggerSync(accountId: string): Promise<{ status: string; error?: string }> {
    for (const status of ['Onboarding', 'Active'] as const) {
      try {
        if (status === 'Active') await ensureContractOpp(accountId);
        const row = await fetchAccount(accountId);
        const patch = buildStatusPatch(row, status);
        await sf.updateRecord('Account', accountId, patch);
        logger.info(`✅ Triggered sync for ${accountId} → ${status}`);
        return { status };
      } catch (e: unknown) {
        const msg = String((e as Error)?.message ?? e);
        if (status === 'Onboarding') {
          logger.warn(`Onboarding trigger failed for ${accountId}: ${msg}`);
          continue;
        }
        return { status, error: msg };
      }
    }
    return { status: 'none', error: 'Could not trigger Onboarding or Active' };
  }

  async function waitForDataverseId(accountId: string): Promise<string | undefined> {
    const deadline = Date.now() + SYNC_WAIT_SECONDS * 1000;
    while (Date.now() <= deadline) {
      const row = await fetchAccount(accountId);
      const dv = readAccountDv(row);
      if (dv) return dv;
      await sleep(POLL_MS);
    }
    return undefined;
  }

  for (const accountType of SF736_ACCOUNT_TYPES) {
    const name = accountNameForType(accountType);
    console.log(`\n── ${accountType} ──`);

    try {
    let accountId: string;
    let created = false;

    const existing = await sf.query(
      `SELECT Id FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}' LIMIT 1`
    );
    if (existing.records?.length) {
      accountId = existing.records[0].Id as string;
      factory.markAsPersistent(accountId);
      console.log(`  Reusing Account: ${name} (${accountId})`);
    } else {
      const payload = await factory.composeAccountPayloadForIntegrationApi({
        Name: name,
        Type: accountType,
        Account_Status__c: 'Prospect',
        ...integrationCreateFieldsForAccountType(accountType),
      });
      const res = await sf.createRecord('Account', payload);
      accountId = res.id as string;
      factory.markAsPersistent(accountId);
      created = true;
      console.log(`  Created Account: ${name} (${accountId})`);
    }

    let account = await fetchAccount(accountId);
    let dataverseId = readAccountDv(account);
    let triggerStatus = String(account.Account_Status__c ?? '');

    if (!dataverseId || ['Prospect', 'Draft'].includes(triggerStatus)) {
      const trigger = await triggerSync(accountId);
      triggerStatus = trigger.status;
      if (trigger.error) {
        console.log(`  ⚠ Sync trigger failed: ${trigger.error}`);
      } else {
        console.log(`  Sync triggered via status: ${triggerStatus}`);
        await sleep(10000);
        dataverseId = await waitForDataverseId(accountId);
      }
    }

    account = await fetchAccount(accountId);
    dataverseId = readAccountDv(account) ?? dataverseId;

    let partyTypeExpected = '';
    try {
      partyTypeExpected = await resolveExpectedPartyTypeCode(accountType, {
        salesforceClient: sf,
        dynamicsClient: d365,
      });
    } catch {
      partyTypeExpected = '(no CMDT mapping)';
    }

    let partySnapshot: Record<string, unknown> = {};
    let integrationFailures: string[] = [];
    let partyTypeActual = '';
    let dataSourceWritten = '';
    let dataSourceClaims = '';

    if (dataverseId) {
      try {
        const party = await fetchPartyWithExpandedType(d365, dataverseId);
        partySnapshot = {
          accelins_partyid: party.accelins_partyid,
          accelins_partymasterid: party.accelins_partymasterid,
          accelins_name: party.accelins_name,
          accelins_datasource: party.accelins_datasource,
          accelins_datasourceclaims: party.accelins_datasourceclaims,
          accelins_party_type_name: party.accelins_party_type_name,
          _accelins_partytype_value: party._accelins_partytype_value,
          accelins_PartyType: party.accelins_PartyType,
        };
        partyTypeActual = await readPartyTypeFromDynamicsRow(party, d365);
        const dsWrittenRead = readPartyOptionSetValue(party, 'accelins_datasource');
        const dsClaimsRead = readPartyOptionSetValue(party, 'accelins_datasourceclaims');
        dataSourceWritten = dsWrittenRead.display || dsClaimsRead.display;
        dataSourceClaims = dsClaimsRead.display;

        const checks = await validateAccountPartyIntegrationFields(account, party, {
          salesforceClient: sf,
          dynamicsClient: d365,
        });
        integrationFailures = checks.filter((c) => !c.passed).map((c) => c.label);
        const typeOk = partyTypeMatchesAccountType(
          partyTypeActual,
          accountType,
          partyTypeExpected.startsWith('PTP-') ? partyTypeExpected : undefined
        );
        if (!typeOk && !integrationFailures.some((f) => f.startsWith('Party Type'))) {
          integrationFailures.unshift('Party Type (Account.Type)');
        }
        console.log(
          `  D365 Party ${dataverseId}: Type="${partyTypeActual || '(empty)'}"${typeOk ? ' ✓' : ' ✗'}, ` +
            `DS Written="${dataSourceWritten || '(empty)'}", DS Claims="${dataSourceClaims || '(empty)'}"`
        );
      } catch (validationErr: unknown) {
        const msg = String((validationErr as Error)?.message ?? validationErr);
        integrationFailures = [`validation error: ${msg}`];
        console.log(`  ⚠ D365 validation error: ${msg}`);
      }
    } else {
      console.log(`  ⚠ ${dvField} not populated after ${SYNC_WAIT_SECONDS}s`);
    }

    results.push({
      accountType,
      accountName: name,
      salesforceAccountId: accountId,
      created,
      accountStatus: account.Account_Status__c,
      triggerStatus,
      ptyCode: account.PTY_Code__c,
      dataverseId: dataverseId ?? null,
      sfType: account.Type,
      sfDataSourceWritten: account.Data_Source_Written__c,
      sfDataSourceClaims: account.Data_Source_Claims__c,
      expectedPartyTypeCode: partyTypeExpected,
      d365PartyType: partyTypeActual || null,
      d365DataSourceWritten: dataSourceWritten || null,
      d365DataSourceClaims: dataSourceClaims || null,
      integrationFieldFailures: integrationFailures,
      partySnapshot,
      qamergeSfUrl: `https://arx--qamerge.sandbox.my.salesforce.com/lightning/r/Account/${accountId}/view`,
    });
    } catch (typeErr: unknown) {
      const msg = String((typeErr as Error)?.message ?? typeErr);
      console.log(`  ✗ Failed for ${accountType}: ${msg}`);
      results.push({
        accountType,
        accountName: name,
        error: msg,
        integrationFieldFailures: [`seed error: ${msg}`],
      });
    }
  }

  await browser.close();
  writeOutputs();

  const synced = results.filter((r) => r.dataverseId).length;
  const typeMissing = results.filter(
    (r) =>
      r.dataverseId &&
      !partyTypeMatchesAccountType(
        String(r.d365PartyType ?? ''),
        String(r.accountType ?? ''),
        String(r.expectedPartyTypeCode ?? '').startsWith('PTP-')
          ? String(r.expectedPartyTypeCode)
          : undefined
      )
  ).length;
  const dsMissing = results.filter((r) => {
    if (!r.dataverseId) return false;
    const failures = (r.integrationFieldFailures as string[]) ?? [];
    return failures.some((f) => f.startsWith('Data Source'));
  }).length;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Done: ${results.length} types | ${synced} synced to D365`);
  console.log(`  Party Type empty on D365: ${typeMissing}/${synced}`);
  console.log(`  Data Source mismatch: ${dsMissing}/${synced}`);
  console.log(`  JSON: data/sf736-party-type-bug-seed-qamerge.json`);
  console.log(`  MD:   docs/sf736-party-type-bug-seed-qamerge.md`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
