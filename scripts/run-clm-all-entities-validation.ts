#!/usr/bin/env ts-node
/** Run CLM migration validation for every INT-ready entity (read-only). */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { chromium } from '@playwright/test';

const targetEnv = (process.env.ENV || 'int').toLowerCase();
dotenv.config({
  path: path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`),
  override: true,
});
process.env.ENV = targetEnv;

interface EntityRunSummary {
  key: string;
  jira: string;
  label: string;
  dynamicsCount: number;
  missingInSalesforce: number;
  recordsWithFieldDiffs: number;
  existenceOk: boolean;
  fieldsOk: boolean;
  error?: string;
  reportPath?: string;
}

async function main(): Promise<void> {
  const {
    getClmMigrationEntitiesReadyOnInt,
    evaluateClmMigrationExistenceMatch,
  } = await import('../src/utils/clm-migration-entity-config');
  const { DynamicsAPIClient } = await import('../src/api-clients/dynamics/DynamicsAPIClient');
  const { SalesforceAPIClient } = await import('../src/api-clients/salesforce/SalesforceAPIClient');
  const { clearFieldMappingsCache } = await import('../src/utils/migration-field-mapper');
  const { runClmEntityMigrationValidation } = await import(
    '../src/utils/clm-migration-validation.service'
  );
  const { writeClmMigrationExcelReport } = await import('../src/utils/clm-migration-excel-report');
  const { primeSfAccountDataverseFieldFromOrg } = await import(
    '../src/utils/sf-account-dataverse-field'
  );
  const {
    collectClmMigrationRecordCounts,
    writeClmMigrationRecordCountReport,
  } = await import('../src/utils/clm-migration-record-count');

  const entities = getClmMigrationEntitiesReadyOnInt();
  const onlyKeys = (process.env.CLM_MIGRATION_ENTITY_KEYS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const toRun = onlyKeys.length
    ? entities.filter((e) => onlyKeys.includes(e.key))
    : entities;

  const browser = await chromium.launch({ headless: true });
  const apiContext = await browser.newContext();
  const summaries: EntityRunSummary[] = [];

  try {
    const dynamicsClient = new DynamicsAPIClient(apiContext.request);
    await dynamicsClient.authenticate();
    const salesforceClient = new SalesforceAPIClient(apiContext.request);
    await salesforceClient.authenticate();
    await primeSfAccountDataverseFieldFromOrg(salesforceClient);

    console.log(`\n=== CLM migration record counts (${toRun.length} entities) ===\n`);
    const counts = await collectClmMigrationRecordCounts(dynamicsClient, salesforceClient);
    const countReport = await writeClmMigrationRecordCountReport(counts);
    console.log(`Count report: ${countReport}\n`);

    for (const entity of toRun) {
      clearFieldMappingsCache();
      console.log(`\n--- Validating ${entity.key} (${entity.jira}) ---`);
      try {
        const run = await runClmEntityMigrationValidation(
          dynamicsClient,
          salesforceClient,
          entity.key
        );
        const { path: reportPath } = await writeClmMigrationExcelReport(run);
        const existenceOk = evaluateClmMigrationExistenceMatch(
          entity,
          run.missingInSalesforce.length
        );
        const fieldsOk = run.recordsWithFieldDiffs === 0;
        summaries.push({
          key: entity.key,
          jira: entity.jira,
          label: entity.label,
          dynamicsCount: run.dynamicsRecords.length,
          missingInSalesforce: run.missingInSalesforce.length,
          recordsWithFieldDiffs: run.recordsWithFieldDiffs,
          existenceOk,
          fieldsOk,
          reportPath,
        });
        console.log(
          `  Dynamics=${run.dynamicsRecords.length} missing=${run.missingInSalesforce.length} ` +
            `fieldDiffs=${run.recordsWithFieldDiffs} existence=${existenceOk ? 'OK' : 'FAIL'} ` +
            `fields=${fieldsOk ? 'OK' : 'FAIL'}`
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ERROR: ${msg}`);
        summaries.push({
          key: entity.key,
          jira: entity.jira,
          label: entity.label,
          dynamicsCount: 0,
          missingInSalesforce: -1,
          recordsWithFieldDiffs: -1,
          existenceOk: false,
          fieldsOk: false,
          error: msg,
        });
      }
    }
  } finally {
    await apiContext.close();
    await browser.close();
  }

  const outDir = path.join(process.cwd(), 'reports', 'clm', 'migration');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(outDir, `all-entities-validation-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ generatedAt: new Date().toISOString(), summaries }, null, 2));

  console.log('\n=== Summary ===\n');
  for (const s of summaries) {
    const status = s.error
      ? 'ERROR'
      : s.existenceOk && s.fieldsOk
        ? 'PASS'
        : 'FAIL';
    console.log(
      `${status.padEnd(5)} ${s.key.padEnd(24)} missing=${s.missingInSalesforce} diffs=${s.recordsWithFieldDiffs}`
    );
  }
  console.log(`\nJSON: ${jsonPath}\n`);

  const { buildClmMigrationFailuresWorkbook, CLM_QA_FAILURES_ATTACHMENT } = await import(
    './lib/clm-migration-evidence-excel'
  );
  const failuresPath = path.join(outDir, CLM_QA_FAILURES_ATTACHMENT);
  const failures = await buildClmMigrationFailuresWorkbook(failuresPath);
  if (failures.empty) {
    console.log(`Failures workbook: ${failuresPath} (no failures — all entities passed)\n`);
  } else {
    console.log(
      `Failures workbook: ${failuresPath} — ${failures.entityCount} entity tab(s), ${failures.totalFailureRows} failure row(s)\n`
    );
  }

  const failed = summaries.some((s) => s.error || !s.existenceOk || !s.fieldsOk);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
