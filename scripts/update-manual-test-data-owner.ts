/**
 * Reassign Manual Test Data records (Manual_TestData_*) from QA Automation user to QA MRD User.
 * Updates OwnerId on Account and Opportunity so the MRD user can edit the records.
 *
 * Prerequisites:
 *   - .env.qa with SF_QAMRDUSER_JWT_USERNAME (e.g. qa.mrd.user@accelins.com) or
 *     SF_MANUAL_TEST_DATA_OWNER_USERNAME or SF_MANUAL_TEST_DATA_OWNER_ID
 *   - Script runs as QA Automation (JWT) so it has permission to change owner.
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/update-manual-test-data-owner.ts
 *   npm run data:manual-test:reassign-owner
 *   # Dry run (no updates):
 *   cross-env ENV=qa DRY_RUN=1 npx ts-node scripts/update-manual-test-data-owner.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { testDataFactory } from '../src/test-data/TestDataFactory';
import { logger } from '../src/utils/logger';

const env = (process.env.ENV || 'qa').toLowerCase();
process.env.ENV = env;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[OK] Loaded ${envFile}`);
}

const NAME_PREFIX = 'Manual_TestData_';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Reassign Manual Test Data owner → QA MRD User');
  console.log(`  Environment: ${env.toUpperCase()}${DRY_RUN ? ' (DRY RUN – no updates)' : ''}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await testDataFactory.initialize();

  let ownerId = process.env.SF_MANUAL_TEST_DATA_OWNER_ID?.trim();
  if (!ownerId && (process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME)) {
    const username = process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME;
    if (username) {
      const escaped = String(username).replace(/'/g, "''");
      const res = await (testDataFactory as any).query(`SELECT Id FROM User WHERE Username = '${escaped}' LIMIT 1`);
      ownerId = res?.records?.[0]?.Id;
      if (ownerId) {
        console.log(`[OK] Resolved QA MRD User: "${username}" → ${ownerId}\n`);
      } else {
        throw new Error(`User not found for username: ${username}. Check SF_QAMRDUSER_JWT_USERNAME or SF_MANUAL_TEST_DATA_OWNER_USERNAME in .env.qa`);
      }
    }
  }
  if (!ownerId) {
    throw new Error('Set SF_MANUAL_TEST_DATA_OWNER_ID, SF_MANUAL_TEST_DATA_OWNER_USERNAME, or SF_QAMRDUSER_JWT_USERNAME in .env.qa');
  }

  // 1. Find all Manual_TestData_* Accounts
  const accountRes = await (testDataFactory as any).query(
    `SELECT Id, Name, OwnerId FROM Account WHERE Name LIKE '${NAME_PREFIX}%' ORDER BY Name`
  );
  const accounts = accountRes?.records || [];
  if (accounts.length === 0) {
    console.log(`No Account records found with Name LIKE '${NAME_PREFIX}%'. Nothing to update.\n`);
    return;
  }
  console.log(`Found ${accounts.length} Account(s): ${accounts.map((a: any) => a.Name).join(', ')}\n`);

  const accountIds = accounts.map((a: any) => a.Id);

  // 2. Find all Opportunities for those Accounts
  const idList = accountIds.map((id: string) => `'${id}'`).join(',');
  const oppRes = await (testDataFactory as any).query(
    `SELECT Id, Name, AccountId, OwnerId FROM Opportunity WHERE AccountId IN (${idList}) ORDER BY Name`
  );
  const opportunities = oppRes?.records || [];
  console.log(`Found ${opportunities.length} Opportunity(ies) linked to those Accounts.\n`);

  if (DRY_RUN) {
    console.log('[DRY RUN] Would update OwnerId to', ownerId, 'on:');
    accounts.forEach((a: any) => console.log(`  Account  ${a.Name} (${a.Id})`));
    opportunities.forEach((o: any) => console.log(`  Opportunity ${o.Name} (${o.Id})`));
    console.log('\nRun without DRY_RUN=1 to apply changes.\n');
    return;
  }

  let accountUpdated = 0;
  let accountErrors = 0;
  for (const acc of accounts) {
    try {
      await testDataFactory.updateRecord('Account', acc.Id, { OwnerId: ownerId });
      accountUpdated++;
      logger.info(`  Account ${acc.Name} → owner updated`);
    } catch (e: any) {
      accountErrors++;
      console.error(`  [ERROR] Account ${acc.Name} (${acc.Id}): ${e.message}`);
    }
  }

  let oppUpdated = 0;
  let oppErrors = 0;
  for (const opp of opportunities) {
    try {
      await testDataFactory.updateRecord('Opportunity', opp.Id, { OwnerId: ownerId });
      oppUpdated++;
      logger.info(`  Opportunity ${opp.Name} → owner updated`);
    } catch (e: any) {
      oppErrors++;
      console.error(`  [ERROR] Opportunity ${opp.Name} (${opp.Id}): ${e.message}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Accounts:    ${accountUpdated} updated, ${accountErrors} errors (of ${accounts.length})`);
  console.log(`  Opportunities: ${oppUpdated} updated, ${oppErrors} errors (of ${opportunities.length})`);
  console.log('  Owner set to:', ownerId);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
