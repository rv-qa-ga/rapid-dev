#!/usr/bin/env ts-node
/** Run CLM migration record counts (all enabled entities) and write Excel report. */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { chromium } from '@playwright/test';

const targetEnv = (process.env.ENV || 'int').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`), override: true });
process.env.ENV = targetEnv;

async function main(): Promise<void> {
  const { DynamicsAPIClient } = await import('../src/api-clients/dynamics/DynamicsAPIClient');
  const { SalesforceAPIClient } = await import('../src/api-clients/salesforce/SalesforceAPIClient');
  const { collectClmMigrationRecordCounts, writeClmMigrationRecordCountReport } = await import(
    '../src/utils/clm-migration-record-count'
  );
  const { getClmMigrationEntitiesForCounts, CLM_MIGRATION_ENTITIES } = await import(
    '../src/utils/clm-migration-entity-config'
  );
  const { primeSfAccountDataverseFieldFromOrg } = await import('../src/utils/sf-account-dataverse-field');

  console.log(`ENV=${targetEnv}`);
  console.log(`Enabled entities: ${getClmMigrationEntitiesForCounts().length} / ${CLM_MIGRATION_ENTITIES.length}\n`);

  const browser = await chromium.launch({ headless: true });
  const apiContext = await browser.newContext();
  try {
    const dynamicsClient = new DynamicsAPIClient(apiContext.request);
    await dynamicsClient.authenticate();
    const salesforceClient = new SalesforceAPIClient(apiContext.request);
    await salesforceClient.authenticate();
    await primeSfAccountDataverseFieldFromOrg(salesforceClient);

    const counts = await collectClmMigrationRecordCounts(dynamicsClient, salesforceClient);
    const reportPath = await writeClmMigrationRecordCountReport(counts);

    console.log('\n=== CLM Migration Record Counts ===\n');
    console.log(
      '| Jira | Entity | SOURCE (Dynamics) | TARGET migrated (SF) | TARGET total | Match |'
    );
    console.log('|------|--------|-------------------|----------------------|--------------|-------|');
    for (const c of counts) {
      const status = c.error ? 'ERROR' : c.match ? 'Y' : 'N';
      console.log(
        `| ${c.entity.jira} | ${c.entity.key} | ${c.dynamicsCount} | ${c.salesforceMigratedCount} | ${c.salesforceTotalCount} | ${status} |`
      );
      if (c.error) console.log(`  Error: ${c.error}`);
      if (!c.error && !c.match) console.log(`  Delta: ${c.delta}`);
    }

    const matched = counts.filter((c) => c.match && !c.error).length;
    const mismatched = counts.filter((c) => !c.match && !c.error).length;
    const errors = counts.filter((c) => c.error).length;
    console.log(`\nMatch: ${matched} | Mismatch: ${mismatched} | Errors: ${errors}`);
    console.log(`Report: ${reportPath}`);
    process.exit(errors > 0 ? 2 : mismatched > 0 ? 1 : 0);
  } finally {
    await apiContext.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
