/**
 * CLM migration — SOURCE (Dynamics) vs TARGET (Salesforce) record counts per entity.
 */

import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import {
  ClmMigrationEntityConfig,
  evaluateClmMigrationCountMatch,
  getClmMigrationEntitiesForCounts,
  getEntityCorrelationStrategy,
  isClmMigrationGoNoGoFullTable,
  resolveSalesforceCorrelationField,
  resolveSalesforceMatchField,
  resolveSalesforceMigrationObject,
} from './clm-migration-entity-config';
import { logger } from './logger';
import { resolveSalesforceMigrationCorrelationField } from './sf-migration-correlation-field';

export interface ClmEntityRecordCount {
  entity: ClmMigrationEntityConfig;
  dynamicsCount: number;
  /** Salesforce rows with correlation id populated (migrated / linked) */
  salesforceMigratedCount: number;
  /** All rows on the Salesforce object */
  salesforceTotalCount: number;
  delta: number;
  match: boolean;
  countMatchMode?: string;
  error?: string;
  /** Entity not yet loaded on INT — excluded from pass/fail when not Go/No-Go full table. */
  skipped?: boolean;
  skipReason?: string;
}

function activeOnlyFilter(): string | undefined {
  const flag = (process.env.CLM_MIGRATION_ACTIVE_ONLY || 'false').toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') {
    return 'statecode eq 0';
  }
  return undefined;
}

function isSalesforceNotDeployedError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes('invalid_type') ||
    m.includes('not supported') ||
    m.includes('invalid_field') ||
    m.includes('no such column') ||
    m.includes('not found') ||
    m.includes('sobject type')
  );
}

/** Verify SF object exists and correlation/match field is queryable before COUNT(). */
export async function probeSalesforceMigrationTarget(
  client: SalesforceAPIClient,
  entity: ClmMigrationEntityConfig
): Promise<{ ok: boolean; correlationField: string; reason?: string }> {
  const obj = entity.salesforceObject;
  const strategy = getEntityCorrelationStrategy(entity);

  try {
    await client.query(`SELECT Id FROM ${obj} LIMIT 1`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      correlationField: resolveSalesforceCorrelationField(entity),
      reason: `Salesforce object ${obj} not available: ${msg}`,
    };
  }

  if (strategy === 'name' || strategy === 'master-id' || strategy === 'iso-code') {
    const matchField = resolveSalesforceMatchField(entity);
    try {
      await client.query(`SELECT Id, ${matchField} FROM ${obj} LIMIT 1`);
      return { ok: true, correlationField: matchField };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        correlationField: matchField,
        reason: `Match field ${matchField} not on ${obj}: ${msg}`,
      };
    }
  }

  const corr = await resolveSalesforceMigrationCorrelationField(client, obj);
  try {
    await client.query(`SELECT Id, ${corr} FROM ${obj} LIMIT 1`);
    return { ok: true, correlationField: corr };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      correlationField: corr,
      reason: `Correlation field ${corr} not on ${obj}: ${msg}`,
    };
  }
}

export async function countDynamicsForEntity(
  client: DynamicsAPIClient,
  entity: ClmMigrationEntityConfig
): Promise<number> {
  const filter = activeOnlyFilter();
  const params: Record<string, string> = {};
  if (filter) {
    params.$filter = filter;
  }
  return client.countRecords(entity.dynamicsEntitySet, params);
}

export async function countSalesforceForEntity(
  client: SalesforceAPIClient,
  entity: ClmMigrationEntityConfig,
  correlationField?: string
): Promise<{ migrated: number; total: number }> {
  const corr = correlationField || resolveSalesforceCorrelationField(entity);
  const obj = entity.salesforceObject;

  const totalResult = await client.query(`SELECT COUNT() FROM ${obj}`);
  const total = totalResult.totalSize ?? 0;

  const migratedResult = await client.query(
    `SELECT COUNT() FROM ${obj} WHERE ${corr} != null`
  );
  const migrated = migratedResult.totalSize ?? 0;

  return { migrated, total };
}

export async function collectClmMigrationRecordCounts(
  dynamicsClient: DynamicsAPIClient,
  salesforceClient: SalesforceAPIClient
): Promise<ClmEntityRecordCount[]> {
  const results: ClmEntityRecordCount[] = [];
  const goNoGoFullTable = isClmMigrationGoNoGoFullTable();

  for (const entity of getClmMigrationEntitiesForCounts()) {
    try {
      const sfObject = await resolveSalesforceMigrationObject(salesforceClient, entity);
      const sfEntity: ClmMigrationEntityConfig =
        sfObject === entity.salesforceObject ? entity : { ...entity, salesforceObject: sfObject };
      const probe = await probeSalesforceMigrationTarget(salesforceClient, sfEntity);
      if (!probe.ok) {
        const reason = probe.reason || 'Salesforce TARGET not deployed on INT';
        logger.warn(`[${entity.key}] Skipping counts — ${reason}`);
        results.push({
          entity,
          dynamicsCount: -1,
          salesforceMigratedCount: -1,
          salesforceTotalCount: -1,
          delta: 0,
          match: !goNoGoFullTable,
          skipped: true,
          skipReason: reason,
        });
        continue;
      }

      const dynamicsCount = await countDynamicsForEntity(dynamicsClient, entity);
      const sf = await countSalesforceForEntity(salesforceClient, sfEntity, probe.correlationField);
      const { match, delta, mode } = evaluateClmMigrationCountMatch(
        entity,
        dynamicsCount,
        sf.migrated,
        sf.total
      );

      results.push({
        entity,
        dynamicsCount,
        salesforceMigratedCount: sf.migrated,
        salesforceTotalCount: sf.total,
        delta,
        match,
        countMatchMode: mode,
      });

      logger.info(
        `[${entity.key}] SOURCE ${entity.dynamicsEntitySet}=${dynamicsCount}, ` +
          `TARGET ${entity.salesforceObject} (migrated)=${sf.migrated}, ` +
          `TARGET total=${sf.total}, delta=${delta}, mode=${mode}, match=${match}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (isSalesforceNotDeployedError(msg)) {
        logger.warn(`[${entity.key}] Skipping counts (SF not on INT): ${msg}`);
        results.push({
          entity,
          dynamicsCount: -1,
          salesforceMigratedCount: -1,
          salesforceTotalCount: -1,
          delta: 0,
          match: !goNoGoFullTable,
          skipped: true,
          skipReason: msg,
        });
        continue;
      }
      logger.error(`Count failed for ${entity.key}: ${msg}`);
      results.push({
        entity,
        dynamicsCount: -1,
        salesforceMigratedCount: -1,
        salesforceTotalCount: -1,
        delta: 0,
        match: false,
        error: msg,
      });
    }
  }

  return results;
}

export async function writeClmMigrationRecordCountReport(
  counts: ClmEntityRecordCount[]
): Promise<string> {
  const dir =
    process.env.CLM_MIGRATION_REPORT_DIR?.trim() ||
    path.join(process.cwd(), 'reports', 'clm', 'migration');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(dir, `CLM-MIG-record-counts-${stamp}.xlsx`);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'CLM Migration Record Counts';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Record Counts');
  sheet.columns = [
    { header: 'Entity', key: 'label', width: 36 },
    { header: 'Jira', key: 'jira', width: 10 },
    { header: 'EntityKey', key: 'key', width: 18 },
    { header: 'SOURCE_Dynamics_EntitySet', key: 'dSet', width: 28 },
    { header: 'SOURCE_Count', key: 'dCount', width: 14 },
    { header: 'TARGET_Salesforce_Object', key: 'sfObj', width: 28 },
    { header: 'TARGET_Migrated_Count', key: 'sfMig', width: 20 },
    { header: 'TARGET_Total_Count', key: 'sfTot', width: 18 },
    { header: 'Delta_SOURCE_minus_TARGET', key: 'delta', width: 22 },
    { header: 'Counts_Match', key: 'match', width: 12 },
    { header: 'Count_Mode', key: 'countMode', width: 14 },
    { header: 'Skipped', key: 'skipped', width: 8 },
    { header: 'Error', key: 'error', width: 48 },
    { header: 'Skip_Reason', key: 'skipReason', width: 48 },
  ];

  for (const c of counts) {
    sheet.addRow({
      label: c.entity.label,
      jira: c.entity.jira,
      key: c.entity.key,
      dSet: c.entity.dynamicsEntitySet,
      dCount: c.dynamicsCount >= 0 ? c.dynamicsCount : '',
      sfObj: c.entity.salesforceObject,
      sfMig: c.salesforceMigratedCount >= 0 ? c.salesforceMigratedCount : '',
      sfTot: c.salesforceTotalCount >= 0 ? c.salesforceTotalCount : '',
      delta: c.dynamicsCount >= 0 ? c.delta : '',
      match: c.skipped ? 'SKIP' : c.error ? 'ERROR' : c.match ? 'Y' : 'N',
      countMode: c.countMatchMode ?? (c.skipped ? '' : 'exact'),
      skipped: c.skipped ? 'Y' : '',
      error: c.error ?? '',
      skipReason: c.skipReason ?? '',
    });
  }

  const summary = wb.addWorksheet('Summary');
  summary.addRow({ metric: 'Generated (UTC)', value: new Date().toISOString() });
  summary.addRow({
    metric: 'Entities checked',
    value: counts.length,
  });
  summary.addRow({
    metric: 'Counts match',
    value: counts.filter((c) => c.match && !c.error && !c.skipped).length,
  });
  summary.addRow({
    metric: 'Mismatches',
    value: counts.filter((c) => !c.match && !c.error && !c.skipped).length,
  });
  summary.addRow({
    metric: 'Skipped (not on INT)',
    value: counts.filter((c) => c.skipped).length,
  });
  summary.addRow({
    metric: 'Errors',
    value: counts.filter((c) => c.error).length,
  });
  summary.addRow({
    metric: 'Filter (Dynamics)',
    value: activeOnlyFilter() || '(none — all records)',
  });
  summary.addRow({
    metric: 'Go/No-Go full BA table',
    value: isClmMigrationGoNoGoFullTable() ? 'yes (skipped = fail)' : 'no (skipped = pass)',
  });
  summary.addRow({
    metric: 'INT-ready entities only',
    value: (process.env.CLM_MIGRATION_COUNT_READY_ONLY || 'false').toLowerCase() === 'true',
  });

  await wb.xlsx.writeFile(outPath);
  logger.info(`CLM migration record count report: ${outPath}`);
  return outPath;
}
