/**
 * Generate persistent manual test data: 10 linked Account → Opportunity → Opportunity Readiness
 * records in QA, with Billing addresses across US, CA, UK, EU. Names start with Manual_TestData_001.
 *
 * Persistent: these records are NOT deleted by test framework @AfterAll.
 * Run once to seed data; re-running will reuse existing Accounts but may create duplicate
 * Opportunities and Readiness if run again (by design, no cleanup).
 *
 * EDIT PERMISSIONS: Records are created by the API user (e.g. qa-automation@...). If you need
 * QA MRD User (or another user) to be able to EDIT them, set SF_MANUAL_TEST_DATA_OWNER_ID to that
 * user's Salesforce User Id (18-char). Then re-run this script (or have an admin transfer
 * ownership of the existing Manual_TestData_* records to that user).
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/generate-manual-test-data.ts
 *   npm run data:manual-test
 *   # Generate 20 more records (Manual_TestData_021 – Manual_TestData_040):
 *   npm run data:manual-test:21-40
 *   # Generate 10 records with Party Code on Account (Manual_TestData_041 – Manual_TestData_050, Party_Code__c = P041–P050):
 *   npm run data:manual-test:41-50-party-code
 *   # Generate 20 more (Manual_TestData_051 – Manual_TestData_070, Party_Code__c = P051–P070):
 *   npm run data:manual-test:51-70
 *   # Generate 29 Member accounts 71–99, Party Code P071–P099, owner = QA MRD User:
 *   npm run data:manual-test:71-99-member
 *   # Or with env vars (start=21, count=20):
 *   cross-env ENV=qa MANUAL_TEST_DATA_START=21 MANUAL_TEST_DATA_COUNT=20 ts-node scripts/generate-manual-test-data.ts
 *   # Optional: create records owned by QA MRD User so they can edit:
 *   set SF_MANUAL_TEST_DATA_OWNER_ID=005xxxxxxxxxxxxxxxxx
 *   npm run data:manual-test
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { testDataFactory, COUNTRY_DEFAULTS } from '../src/test-data/TestDataFactory';
import { logger } from '../src/utils/logger';

// Load QA env so config and JWT use .env.qa
const env = (process.env.ENV || 'qa').toLowerCase();
process.env.ENV = env;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[OK] Loaded ${envFile}`);
} else {
  console.warn(`[WARN] No ${envFile}; using process.env`);
}

const REGIONS: Array<{ label: string; country: keyof typeof COUNTRY_DEFAULTS }> = [
  { label: 'US', country: 'United States' },
  { label: 'CA', country: 'Canada' },
  { label: 'UK', country: 'United Kingdom' },
  { label: 'EU', country: 'Germany' },
];

const NAME_PREFIX = 'Manual_TestData_';

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

async function main() {
  const startNum = Math.max(1, parseInt(process.env.MANUAL_TEST_DATA_START || '1', 10));
  const count = Math.max(1, Math.min(100, parseInt(process.env.MANUAL_TEST_DATA_COUNT || '10', 10)));
  const withPartyCode = process.env.MANUAL_TEST_DATA_WITH_PARTY_CODE === '1' || process.env.MANUAL_TEST_DATA_WITH_PARTY_CODE === 'true';
  const accountTypesRaw = process.env.MANUAL_TEST_DATA_ACCOUNT_TYPES?.trim();
  const accountTypes = accountTypesRaw ? accountTypesRaw.split(',').map((t) => t.trim()).filter(Boolean) : [] as string[];

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Generate Manual Test Data (${count} linked records)`);
  console.log(`  Environment: ${env.toUpperCase()} | Prefix: ${NAME_PREFIX}${pad(startNum)}–${NAME_PREFIX}${pad(startNum + count - 1)}`);
  if (withPartyCode) console.log('  Party Code: set on each Account (P + 3-digit number, e.g. P041)');
  console.log('  Regions: US, CA, UK, EU (Billing address on Account)');
  if (accountTypes.length) console.log(`  Account types: ${accountTypes.join(', ')}`);
  console.log('  Persistent: not deleted by test framework.');
  console.log('═══════════════════════════════════════════════════════════\n');

  await testDataFactory.initialize();

  let ownerId = process.env.SF_MANUAL_TEST_DATA_OWNER_ID?.trim();
  if (!ownerId && (process.env.USE_QA_MRD_AS_OWNER === 'true' || process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME)) {
    const username = process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME;
    if (username) {
      const escaped = String(username).replace(/'/g, "''");
      const res = await (testDataFactory as any).query(`SELECT Id FROM User WHERE Username = '${escaped}' LIMIT 1`);
      ownerId = res?.records?.[0]?.Id;
      if (ownerId) {
        console.log(`[OK] Resolved owner from Username "${username}" -> ${ownerId}\n`);
      } else {
        throw new Error(`Could not resolve User Id for username: ${username}. Check SF_QAMRDUSER_JWT_USERNAME or SF_MANUAL_TEST_DATA_OWNER_USERNAME.`);
      }
    }
  }
  if (ownerId) {
    console.log(`[OK] Records will be assigned to owner Id: ${ownerId} (QA MRD User)\n`);
  } else {
    console.log('[INFO] Records will be owned by the API user. To use QA MRD User as owner, set USE_QA_MRD_AS_OWNER=true and re-run.\n');
  }

  const created: Array<{ accountId: string; opportunityId: string; readinessId: string; region: string; accountName: string; type?: string; partyCode?: string }> = [];

  for (let i = 0; i < count; i++) {
    const num = startNum + i;
    const suffix = pad(num);
    const accountName = `${NAME_PREFIX}${suffix}`;
    const regionConfig = REGIONS[i % REGIONS.length];
    const countryDefaults = COUNTRY_DEFAULTS[regionConfig.country];
    if (!countryDefaults) {
      throw new Error(`No COUNTRY_DEFAULTS for ${regionConfig.country}`);
    }
    let accountType = accountTypes.length ? accountTypes[i % accountTypes.length] : undefined;
    // Normalize to org picklist value (QA uses "Non - Member MGA" with spaces)
    if (accountType === 'Non-Member MGA') accountType = 'Non - Member MGA';

    // Billing address: use country-specific defaults (UK/EU have no BillingState in payload)
    const accountData: Record<string, any> = {
      Name: accountName,
      BillingCountry: regionConfig.country,
      BillingCity: countryDefaults.city,
      BillingPostalCode: countryDefaults.postalCode,
      Phone: countryDefaults.phone,
      Functional_Currency__c: countryDefaults.currency === 'GBP' ? 'GBP' : countryDefaults.currency === 'CAD' ? 'CAD' : countryDefaults.currency === 'EUR' ? 'EUR' : 'USD',
      Description: `Manual test data – ${regionConfig.label} region. Created by generate-manual-test-data.ts. Do not delete in @AfterAll.`,
    };
    if (accountType) {
      accountData.Type = accountType;
    }
    if (regionConfig.country === 'United States' || regionConfig.country === 'Canada') {
      accountData.BillingState = countryDefaults.state;
    }
    if (ownerId) {
      accountData.OwnerId = ownerId;
    }
    // Party Code: 4-char alphanumeric (e.g. P041, P042). Unique per record.
    if (withPartyCode) {
      accountData.Party_Code__c = `P${pad(num)}`;
    }

    try {
      const account = await testDataFactory.createAccount(accountData, {
        checkExists: true,
        deleteIfExists: false,
        reuseExisting: true,
      });
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 90);
      const opportunityData: Record<string, unknown> = {
        Name: `${accountName} Opportunity`,
        Stage: 'Pipeline',
        CloseDate: closeDate.toISOString().split('T')[0],
      };
      if (ownerId) opportunityData.OwnerId = ownerId;
      const opportunity = await testDataFactory.createOpportunity(opportunityData, account.id);
      // Opportunity_Readiness__c has no OwnerId (e.g. inherits from Opportunity or is master-detail)
      const readiness = await testDataFactory.createOpportunityReadiness(
        opportunity.id,
        opportunity.name,
        { Name: `${accountName} Readiness` }
      );

      created.push({
        accountId: account.id,
        opportunityId: opportunity.id,
        readinessId: readiness.id,
        region: regionConfig.label,
        accountName,
        type: accountType,
        partyCode: withPartyCode ? accountData.Party_Code__c : undefined,
      });
      logger.info(`Created ${i + 1}/${count}: ${accountName} (${regionConfig.label}${accountType ? `, ${accountType}` : ''}${withPartyCode ? `, Party Code ${accountData.Party_Code__c}` : ''}) → Opp ${opportunity.id} → Readiness ${readiness.id}`);
    } catch (e: any) {
      console.error(`Failed at ${accountName}: ${e.message}`);
      throw e;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary (persistent – do not delete in @AfterAll)');
  console.log('═══════════════════════════════════════════════════════════\n');
  const withPartyCol = created.some((r) => r.partyCode);
  if (withPartyCol) {
    console.log('Account Name              | Party Code | Region | Type              | Account Id         | Opportunity Id      | Readiness Id');
    console.log('--------------------------|------------|--------|-------------------|--------------------|--------------------|-------------------');
    for (const r of created) {
      const typeStr = (r.type || '–').padEnd(17);
      const pc = (r.partyCode || '–').padEnd(10);
      console.log(`${r.accountName.padEnd(25)} | ${pc} | ${r.region.padEnd(6)} | ${typeStr} | ${r.accountId} | ${r.opportunityId} | ${r.readinessId}`);
    }
  } else {
    console.log('Account Name              | Region | Type              | Account Id         | Opportunity Id      | Readiness Id');
    console.log('--------------------------|--------|-------------------|--------------------|--------------------|-------------------');
    for (const r of created) {
      const typeStr = (r.type || '–').padEnd(17);
      console.log(`${r.accountName.padEnd(25)} | ${r.region.padEnd(6)} | ${typeStr} | ${r.accountId} | ${r.opportunityId} | ${r.readinessId}`);
    }
  }
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
