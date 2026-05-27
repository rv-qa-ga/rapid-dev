/**
 * List contracting test records (Approval Ready_001, 002, 003, etc.) from Salesforce.
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/list-contracting-records.ts
 *   npm run data:contracting-list
 *
 * Optional: CONTRACTING_DATA_PREFIX=WF_ (default), CONTRACTING_DATA_START=1, CONTRACTING_DATA_COUNT=10
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { testDataFactory } from '../src/test-data/TestDataFactory';

const env = (process.env.ENV || 'qa').toLowerCase();
process.env.ENV = env;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
}

const NAME_PREFIX = process.env.CONTRACTING_DATA_PREFIX?.trim() || 'WF_';
const start = Math.max(1, parseInt(process.env.CONTRACTING_DATA_START || '1', 10));
const count = Math.max(1, Math.min(99, parseInt(process.env.CONTRACTING_DATA_COUNT || '10', 10)));

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

async function main() {
  await testDataFactory.initialize();

  const records: Array<{ accountName: string; accountId: string; opportunityId: string; readinessId: string; accountStatus?: string; stageName?: string }> = [];

  for (let i = 0; i < count; i++) {
    const num = start + i;
    const accountName = `${NAME_PREFIX}${pad(num)}`;
    const accountResult = await testDataFactory.query(
      `SELECT Id, Account_Status__c FROM Account WHERE Name = '${accountName}' LIMIT 1`
    );
    const acc = accountResult?.records?.[0];
    if (!acc) {
      console.log(`[--] ${accountName}: not found`);
      continue;
    }
    const oppResult = await testDataFactory.query(
      `SELECT Id, StageName FROM Opportunity WHERE AccountId = '${acc.Id}' AND Name LIKE '%${accountName}%' LIMIT 1`
    );
    const opp = oppResult?.records?.[0];
    if (!opp) {
      records.push({ accountName, accountId: acc.Id, opportunityId: '--', readinessId: '--', accountStatus: acc.Account_Status__c });
      continue;
    }
    const readinessResult = await testDataFactory.query(
      `SELECT Id FROM Opportunity_Readiness__c WHERE Opportunity__c = '${opp.Id}' LIMIT 1`
    );
    const readinessId = readinessResult?.records?.[0]?.Id || '--';
    records.push({
      accountName,
      accountId: acc.Id,
      opportunityId: opp.Id,
      readinessId,
      accountStatus: acc.Account_Status__c,
      stageName: opp.StageName,
    });
  }

  console.log('\nContracting test records (Name prefix: ' + NAME_PREFIX + pad(start) + '–' + pad(start + count - 1) + ')\n');
  console.log('Account Name           | Account Id         | Opportunity Id      | Readiness Id        | Account Status | Stage');
  console.log('-----------------------|--------------------|--------------------|--------------------|----------------|------------------');
  for (const r of records) {
    const status = (r.accountStatus || '--').toString().slice(0, 14);
    const stage = (r.stageName || '--').toString().slice(0, 17);
    console.log(
      `${r.accountName.padEnd(22)} | ${r.accountId} | ${r.opportunityId} | ${(r.readinessId as string).padEnd(18)} | ${status.padEnd(14)} | ${stage}`
    );
  }
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
