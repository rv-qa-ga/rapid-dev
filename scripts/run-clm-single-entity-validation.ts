#!/usr/bin/env ts-node
/**
 * Run CLM migration validation for a single entity key.
 * Usage: ENV=int npx ts-node scripts/run-clm-single-entity-validation.ts aslob
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { chromium } from '@playwright/test';

const entityKey = process.argv[2]?.trim();
if (!entityKey) {
  console.error('Usage: ENV=int npx ts-node scripts/run-clm-single-entity-validation.ts <entity-key>');
  process.exit(1);
}

const targetEnv = (process.env.ENV || 'int').toLowerCase();
dotenv.config({
  path: path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`),
  override: true,
});
process.env.ENV = targetEnv;

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const { DynamicsAPIClient } = await import('../src/api-clients/dynamics/DynamicsAPIClient');
  const { SalesforceAPIClient } = await import('../src/api-clients/salesforce/SalesforceAPIClient');
  const { runClmEntityMigrationValidation } = await import('../src/utils/clm-migration-validation.service');
  const { writeClmMigrationExcelReport } = await import('../src/utils/clm-migration-excel-report');

  const dv = new DynamicsAPIClient(ctx.request);
  await dv.authenticate();
  const sf = new SalesforceAPIClient(ctx.request);
  await sf.authenticate();

  const run = await runClmEntityMigrationValidation(dv, sf, entityKey);
  const { path: reportPath } = await writeClmMigrationExcelReport(run);
  console.log(`Report: ${reportPath}`);
  console.log(
    `Dynamics=${run.dynamicsRecords.length} missing=${run.missingInSalesforce.length} ` +
      `fieldDiffs=${run.recordsWithFieldDiffs}`
  );

  const sample = run.validationResults
    .filter((r) => r.fieldsDifferent > 0)
    .slice(0, 3);
  for (const r of sample) {
    const diffs = r.comparisons.filter((c) => !c.match);
    console.log(`\nRecord ${r.masterId} — ${diffs.length} diff(s):`);
    for (const d of diffs.slice(0, 5)) {
      console.log(`  ${d.field} -> ${d.salesforceField}: D="${d.dynamicsValue}" SF="${d.salesforceValue}"`);
    }
  }

  await ctx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
