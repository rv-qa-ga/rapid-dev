#!/usr/bin/env ts-node
/** Run Party/Account CLM migration field validation and write Excel report. */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { chromium } from '@playwright/test';

const targetEnv = (process.env.ENV || 'int').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`), override: true });
process.env.ENV = targetEnv;

async function main(): Promise<void> {
  const { DynamicsAPIClient } = await import('../src/api-clients/dynamics/DynamicsAPIClient');
  const { SalesforceAPIClient } = await import('../src/api-clients/salesforce/SalesforceAPIClient');
    const { clearFieldMappingsCache } = await import('../src/utils/migration-field-mapper');
    const { runClmEntityMigrationValidation } = await import(
      '../src/utils/clm-migration-validation.service'
    );
    clearFieldMappingsCache();
  const { writeClmMigrationExcelReport } = await import('../src/utils/clm-migration-excel-report');
  const { primeSfAccountDataverseFieldFromOrg } = await import(
    '../src/utils/sf-account-dataverse-field'
  );

  const browser = await chromium.launch({ headless: true });
  const apiContext = await browser.newContext();
  try {
    const dynamicsClient = new DynamicsAPIClient(apiContext.request);
    await dynamicsClient.authenticate();
    const salesforceClient = new SalesforceAPIClient(apiContext.request);
    await salesforceClient.authenticate();
    await primeSfAccountDataverseFieldFromOrg(salesforceClient);

    console.log('Running Party/Account migration validation (full population)...\n');
    const run = await runClmEntityMigrationValidation(
      dynamicsClient,
      salesforceClient,
      'party'
    );

    const { path: reportPath, summary } = await writeClmMigrationExcelReport(run);

    console.log('=== Party migration validation summary ===\n');
    console.log(`Dynamics parties queried: ${run.dynamicsRecords.length}`);
    console.log(`Missing in Salesforce: ${run.missingInSalesforce.length}`);
    console.log(`Records with field differences: ${run.recordsWithFieldDiffs}`);
    console.log(`Total field mismatches: ${summary.totalFieldMismatches}`);
    console.log(`Report: ${reportPath}\n`);

    const auditFields = new Set([
      'createdon',
      'modifiedon',
      'accelins_partyid',
    ]);
    const withDiffs = run.validationResults.filter((r) => r.fieldsDifferent > 0);
    const businessOnlyReal = withDiffs.filter((r) => {
      const bad = r.comparisons.filter(
        (c) =>
          !c.match &&
          !auditFields.has(c.field) &&
          c.field !== 'ownerid' &&
          !c.field.endsWith('by')
      );
      return bad.length > 0;
    });

    console.log(`Records with business-field differences (excl. audit/lookup): ${businessOnlyReal.length}\n`);

    for (const r of businessOnlyReal.slice(0, 20)) {
      console.log(`--- ${r.masterId} (${r.fieldsDifferent} total diff(s)) — business ---`);
      for (const c of r.comparisons.filter(
        (x) =>
          !x.match &&
          !auditFields.has(x.field) &&
          x.field !== 'ownerid' &&
          !x.field.endsWith('by')
      )) {
        console.log(
          `  ${c.field} -> ${c.salesforceField}: SOURCE="${c.dynamicsValue}" TARGET="${c.salesforceValue}"`
        );
      }
    }
    if (businessOnlyReal.length > 20) {
      console.log(`... and ${businessOnlyReal.length - 20} more (see Excel)\n`);
    }

    console.log('\n--- First 15 records (all field diffs) ---\n');
    for (const r of withDiffs.slice(0, 15)) {
      console.log(`--- ${r.masterId} (${r.fieldsDifferent} field diff(s)) ---`);
      for (const c of r.comparisons.filter((x) => !x.match)) {
        console.log(
          `  ${c.field} -> ${c.salesforceField}: SOURCE="${c.dynamicsValue}" TARGET="${c.salesforceValue}"`
        );
      }
    }
    if (withDiffs.length > 15) {
      console.log(`... and ${withDiffs.length - 15} more records with differences (see Excel)`);
    }

    const exitCode =
      run.missingInSalesforce.length > 0 || run.recordsWithFieldDiffs > 0 ? 1 : 0;
    process.exit(exitCode);
  } finally {
    await apiContext.close();
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
