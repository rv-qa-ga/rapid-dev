/** Re-validate existing SF736 seed accounts without recreating them. */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { chromium } from '@playwright/test';

process.env.ENV = 'qamerge';
dotenv.config({ path: path.resolve('src/config/env/.env.qamerge'), override: true });

async function main(): Promise<void> {
  const seedPath = path.resolve('data/sf736-party-type-bug-seed-qamerge.json');
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
    records: Array<Record<string, unknown>>;
  };

  const { SalesforceAPIClient } = await import('../src/api-clients/salesforce/SalesforceAPIClient');
  const { DynamicsAPIClient } = await import('../src/api-clients/dynamics/DynamicsAPIClient');
  const { fetchPartyWithExpandedType, readPartyTypeFromDynamicsRow, partyTypeMatchesAccountType } =
    await import('../src/utils/sf-account-party-type-mapping');
  const { validateAccountPartyIntegrationFields, readPartyOptionSetValue } = await import(
    '../src/utils/sf-account-party-integration-validation'
  );
  const { sfAccountDataverseField } = await import('../src/utils/sf-account-dataverse-field');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const sf = new SalesforceAPIClient(ctx.request);
  const d365 = new DynamicsAPIClient(ctx.request);
  await sf.authenticate();
  await d365.authenticate();

  const dvField = sfAccountDataverseField();
  console.log('\nRe-validation (Party Type by label + integration fields)\n');

  for (const rec of seed.records) {
    const accountType = String(rec.accountType ?? '');
    const accountId = String(rec.salesforceAccountId ?? '');
    const partyId = String(rec.dataverseId ?? '').trim();
    if (!partyId) {
      console.log(`${accountType}: NO SYNC (no ${dvField})`);
      continue;
    }

    const accountRes = await sf.query(
      `SELECT Id, Name, Type, Data_Source_Written__c, Data_Source_Claims__c, Affiliate_Non_Affiliate__c FROM Account WHERE Id = '${accountId}' LIMIT 1`
    );
    const account = accountRes.records?.[0] as Record<string, unknown>;
    const party = await fetchPartyWithExpandedType(d365, partyId);
    const partyType = await readPartyTypeFromDynamicsRow(party, d365);
    const dsWritten =
      readPartyOptionSetValue(party, 'accelins_datasource').display ||
      readPartyOptionSetValue(party, 'accelins_datasourceclaims').display;
    const dsClaims = readPartyOptionSetValue(party, 'accelins_datasourceclaims').display;
    const checks = await validateAccountPartyIntegrationFields(account, party, {
      salesforceClient: sf,
      dynamicsClient: d365,
    });
    const failed = checks.filter((c) => !c.passed).map((c) => c.label);
    const typeOk = partyTypeMatchesAccountType(
      partyType,
      accountType,
      String(rec.expectedPartyTypeCode ?? '').startsWith('PTP-')
        ? String(rec.expectedPartyTypeCode)
        : undefined
    );
    const status = failed.length === 0 && typeOk ? 'PASS' : 'FAIL';
    console.log(
      `${status} ${accountType}: PartyType="${partyType || '(empty)'}"` +
        ` DS=${dsWritten || '(empty)'}/${dsClaims || '(empty)'}` +
        (failed.length ? ` | ${failed.join(', ')}` : '')
    );
  }

  await browser.close();
}

main();
