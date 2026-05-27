/**
 * Create persistent Sample Account + Lead in Salesforce (qamerge by default).
 * Names use prefix QAMERGESAMPLEAUTO (Account Name; Lead LastName + Company).
 *
 * Idempotent: Account reuses existing by Name; Lead skips if same LastName + Company exists.
 *
 * IMPORTANT: Loads dotenv and locks ENV before importing TestDataFactory/config so
 * `.env.qamerge` cannot override `cross-env ENV=qamerge` incorrectly.
 *
 * Usage:
 *   npm run data:qamerge-sample
 *   cross-env ENV=qamerge npx ts-node scripts/seed-qamerge-sample-lead-account.ts
 *
 * Optional: SF_MANUAL_TEST_DATA_OWNER_ID — 18-char User Id to own both records.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const ACCOUNT_NAME = 'QAMERGESAMPLEAUTO_Account';
const LEAD_LAST_NAME = 'QAMERGESAMPLEAUTO_Lead';
const LEAD_FIRST_NAME = 'Sample';

const envTarget = (process.env.ENV || 'qamerge').toLowerCase();
process.env.ENV = envTarget;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${envTarget}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}
process.env.ENV = envTarget;

async function main(): Promise<void> {
  const { testDataFactory } = await import('../src/test-data/TestDataFactory');
  const { logger } = await import('../src/utils/logger');

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  QAMERGESAMPLEAUTO Account + Lead (${envTarget})`);
  console.log('  Persistent seed — safe to re-run (skips duplicates).');
  console.log('═══════════════════════════════════════════════════════════\n');

  await testDataFactory.initialize();

  const ownerId = process.env.SF_MANUAL_TEST_DATA_OWNER_ID?.trim();

  const accountPayload: Record<string, any> = {
    Name: ACCOUNT_NAME,
  };
  if (ownerId) {
    accountPayload.OwnerId = ownerId;
    logger.info(`Using OwnerId for Account: ${ownerId}`);
  }

  const account = await testDataFactory.createAccount(accountPayload, {
    checkExists: true,
    deleteIfExists: false,
    reuseExisting: true,
  });
  testDataFactory.markAsPersistent(account.id);
  console.log(`Account: ${account.name} | Id: ${account.id}`);

  const leadSoql = `SELECT Id FROM Lead WHERE LastName = '${LEAD_LAST_NAME.replace(/'/g, "\\'")}' AND Company = '${ACCOUNT_NAME.replace(/'/g, "\\'")}' LIMIT 1`;
  const existingLead = await testDataFactory.query(leadSoql);
  if (existingLead?.records?.length > 0) {
    const lid = existingLead.records[0].Id as string;
    testDataFactory.markAsPersistent(lid);
    console.log(`Lead already exists (skipped create): ${LEAD_LAST_NAME} @ ${ACCOUNT_NAME} | Id: ${lid}`);
    console.log('\nDone.\n');
    return;
  }

  const leadPayload: Record<string, any> = {
    FirstName: LEAD_FIRST_NAME,
    LastName: LEAD_LAST_NAME,
    Company: ACCOUNT_NAME,
  };
  if (ownerId) {
    leadPayload.OwnerId = ownerId;
    logger.info(`Using OwnerId for Lead: ${ownerId}`);
  }

  const lead = await testDataFactory.createLead(leadPayload);
  testDataFactory.markAsPersistent(lead.id);
  console.log(`Lead: ${lead.name} | Id: ${lead.id}`);
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
