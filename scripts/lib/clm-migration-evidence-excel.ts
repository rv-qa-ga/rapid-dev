/**
 * Build combined CLM migration evidence workbook for Confluence upload.
 * Merges latest per-entity CLM-MIG-*.xlsx reports when present; always includes Summary sheet.
 */

import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

export const CLM_MIGRATION_REPORT_DIR = path.join(process.cwd(), 'reports', 'clm', 'migration');

export const CLM_QA_FAILURES_ATTACHMENT = 'CLM-MIGRATION-QA-FAILURES.xlsx';

/** Entity summary aligned with CLM_MIGRATION_QA_PROGRESS.md (2026-05-25 INT run). */
export const CLM_ENTITY_SUMMARY_ROWS: Array<{
  jira: string;
  entity: string;
  load: string;
  count: string;
  fields: string;
  notes: string;
}> = [
  { jira: 'SF-736', entity: 'Party', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '20 mapped-field diffs' },
  { jira: 'SF-738', entity: 'External contact', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '381 diffs; 37 ACR tolerance' },
  { jira: 'SF-737', entity: 'Internal contact', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '959 diffs; inactive excluded' },
  { jira: 'SF-769', entity: 'Member map', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-775', entity: 'TPA map', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '22/22 rows with diffs' },
  { jira: 'SF-739', entity: 'Country', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '247/252 with diffs' },
  { jira: 'SF-767', entity: 'Product map', load: 'Pass', count: 'Fail', fields: 'Fail', notes: 'SOURCE 5k vs SF 7,929 migrated' },
  { jira: 'SF-766', entity: 'Sub product', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '18 names missing on SF' },
  { jira: 'SF-785', entity: 'Product', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-780', entity: 'ASLOB', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '57/57 field diffs' },
  { jira: 'SF-798', entity: 'OSFI', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '38/38 field diffs' },
  { jira: 'SF-781', entity: 'Class of business', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-782', entity: 'Line of business', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-783', entity: 'BEGAAP COB', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-784', entity: 'Solvency II', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-779', entity: 'MPP', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'Full match' },
  { jira: 'SF-872', entity: 'POG product', load: 'Pass', count: 'Pass', fields: 'Fail', notes: '1 field diff' },
  { jira: 'SF-786', entity: 'Currency', load: 'Pass', count: 'Pass', fields: 'Pass', notes: 'ISO codes match' },
];

function escSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
}

function findLatestPerEntityReports(dir: string): Map<string, { path: string; mtime: number }> {
  const latest = new Map<string, { path: string; mtime: number }>();
  if (!fs.existsSync(dir)) return latest;

  const re = /^CLM-MIG-([a-z0-9_-]+)-(\d{4}-\d{2}-\d{2}T[\d-]+)\.xlsx$/i;
  for (const file of fs.readdirSync(dir)) {
    const m = file.match(re);
    if (!m) continue;
    const entityKey = m[1].toLowerCase();
    const full = path.join(dir, file);
    const mtime = fs.statSync(full).mtimeMs;
    const prev = latest.get(entityKey);
    if (!prev || mtime > prev.mtime) {
      latest.set(entityKey, { path: full, mtime });
    }
  }
  return latest;
}

/** Read worksheet rows as plain objects keyed by header text (row 1). */
function readSheetRows(ws: ExcelJS.Worksheet): Array<Record<string, unknown>> {
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim();
  });
  const rows: Array<Record<string, unknown>> = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const rec: Record<string, unknown> = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const key = headers[col - 1];
      if (key) rec[key] = cell.value;
    });
    if (Object.keys(rec).length > 0) rows.push(rec);
  });
  return rows;
}

function isFieldComparisonFailure(row: Record<string, unknown>): boolean {
  const match = String(row.Match ?? row.match ?? '').trim().toUpperCase();
  return match === 'N' || match === 'NO' || match === 'FALSE';
}

const FAILURE_SHEET_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'FailureType', key: 'failureType', width: 18 },
  { header: 'CorrelationId', key: 'correlationId', width: 38 },
  { header: 'DynamicsField', key: 'dynamicsField', width: 28 },
  { header: 'SalesforceField', key: 'salesforceField', width: 28 },
  { header: 'SOURCE_Dynamics', key: 'source', width: 36 },
  { header: 'TARGET_Salesforce', key: 'target', width: 36 },
  { header: 'Match', key: 'match', width: 8 },
  { header: 'Severity', key: 'severity', width: 10 },
  { header: 'Difference', key: 'difference', width: 48 },
  { header: 'Notes', key: 'notes', width: 48 },
];

function addFailuresSummarySheet(
  wb: ExcelJS.Workbook,
  entitySummaries: Array<{
    entityKey: string;
    jira: string;
    label: string;
    missingCount: number;
    fieldDiffRows: number;
    totalRows: number;
    tabName: string;
  }>
): void {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [
    { header: 'EntityKey', key: 'entityKey', width: 20 },
    { header: 'Jira', key: 'jira', width: 10 },
    { header: 'Entity', key: 'label', width: 32 },
    { header: 'Missing_in_TARGET', key: 'missingCount', width: 18 },
    { header: 'Field_mismatch_rows', key: 'fieldDiffRows', width: 20 },
    { header: 'Failure_rows_in_tab', key: 'totalRows', width: 20 },
    { header: 'Worksheet_tab', key: 'tabName', width: 24 },
  ];
  for (const s of entitySummaries) {
    ws.addRow(s);
  }
  ws.getRow(1).font = { bold: true };
  ws.addRow([]);
  ws.addRow(['Generated (UTC)', new Date().toISOString()]);
  ws.addRow([
    'Scope',
    'Failure records only — missing TARGET rows + mapped-field mismatches (Match=N)',
  ]);
  ws.addRow(['Source', 'Latest CLM-MIG-{entity}-*.xlsx per entity under reports/clm/migration']);
  ws.addRow(['Entities with failures', entitySummaries.length]);
  ws.addRow([
    'Total failure rows',
    entitySummaries.reduce((n, s) => n + s.totalRows, 0),
  ]);
}

/**
 * Build workbook containing only failure records — one worksheet tab per entity with failures.
 */
export async function buildClmMigrationFailuresWorkbook(outPath: string): Promise<{
  path: string;
  entityCount: number;
  totalFailureRows: number;
  empty: boolean;
}> {
  const dir = process.env.CLM_MIGRATION_REPORT_DIR?.trim() || CLM_MIGRATION_REPORT_DIR;
  const latest = findLatestPerEntityReports(dir);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CLM Migration QA Progress — Failures';
  wb.created = new Date();

  const entitySummaries: Array<{
    entityKey: string;
    jira: string;
    label: string;
    missingCount: number;
    fieldDiffRows: number;
    totalRows: number;
    tabName: string;
    rows: Array<Record<string, unknown>>;
  }> = [];

  let totalFailureRows = 0;

  for (const [entityKey, { path: reportPath }] of latest) {
    if (entityKey === 'record-counts') continue;

    try {
      const srcWb = new ExcelJS.Workbook();
      await srcWb.xlsx.readFile(reportPath);

      const fieldWs = srcWb.getWorksheet('Field Comparison');
      const missingWs = srcWb.getWorksheet('Missing in SF');
      const byRecordWs = srcWb.getWorksheet('By Record');
      const summaryWs = srcWb.getWorksheet('Summary');

      const jira =
        String(summaryWs?.getRow(2)?.getCell(2).value ?? '').trim() ||
        CLM_ENTITY_SUMMARY_ROWS.find((r) =>
          entityKey.includes(r.entity.toLowerCase().split(' ')[0])
        )?.jira ||
        '';
      const label = String(summaryWs?.getRow(1)?.getCell(2).value ?? '').trim() || entityKey;

      const fieldFailures = fieldWs ? readSheetRows(fieldWs).filter(isFieldComparisonFailure) : [];
      let missingRows = missingWs ? readSheetRows(missingWs) : [];

      if (missingRows.length === 0 && byRecordWs) {
        missingRows = readSheetRows(byRecordWs)
          .filter((r) => String(r.InSalesforce ?? '').trim().toUpperCase() === 'N')
          .map((r) => ({
            CorrelationId: r.CorrelationId ?? r.id,
            Notes: 'Record not found in Salesforce (TARGET)',
          }));
      }

      const failureCount = fieldFailures.length + missingRows.length;
      if (failureCount === 0) continue;

      const tabName = escSheetName(entityKey);
      const failureRows: Array<Record<string, unknown>> = [];

      for (const row of missingRows) {
        failureRows.push({
          failureType: 'Missing in TARGET',
          correlationId: row.CorrelationId ?? row.id ?? '',
          dynamicsField: '',
          salesforceField: '',
          source: '',
          target: '',
          match: 'N',
          severity: 'error',
          difference: '',
          notes: row.Notes ?? row.notes ?? '',
        });
      }

      for (const row of fieldFailures) {
        failureRows.push({
          failureType: 'Field mismatch',
          correlationId: row.CorrelationId ?? row.correlationId ?? '',
          dynamicsField: row.DynamicsField ?? row.dynamicsField ?? '',
          salesforceField: row.SalesforceField ?? row.salesforceField ?? '',
          source: row.SOURCE_Dynamics ?? row.source ?? '',
          target: row.TARGET_Salesforce ?? row.target ?? '',
          match: row.Match ?? row.match ?? 'N',
          severity: row.Severity ?? row.severity ?? '',
          difference: row.Difference ?? row.difference ?? '',
          notes: '',
        });
      }

      totalFailureRows += failureCount;
      entitySummaries.push({
        entityKey,
        jira,
        label,
        missingCount: missingRows.length,
        fieldDiffRows: fieldFailures.length,
        totalRows: failureCount,
        tabName,
        rows: failureRows,
      });
    } catch {
      // skip corrupt entity reports
    }
  }

  addFailuresSummarySheet(wb, entitySummaries);

  for (const entity of entitySummaries) {
    const ws = wb.addWorksheet(entity.tabName);
    ws.columns = FAILURE_SHEET_COLUMNS.map((c) => ({ ...c }));
    ws.getRow(1).font = { bold: true };
    for (const row of entity.rows) {
      ws.addRow(row);
    }
  }

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await wb.xlsx.writeFile(outPath);

  return {
    path: outPath,
    entityCount: entitySummaries.length,
    totalFailureRows,
    empty: entitySummaries.length === 0,
  };
}

async function copyWorksheet(
  sourceWb: ExcelJS.Workbook,
  targetWb: ExcelJS.Workbook,
  sourceSheetName: string,
  targetSheetName: string
): Promise<void> {
  const src = sourceWb.getWorksheet(sourceSheetName) ?? sourceWb.worksheets[0];
  if (!src) return;

  const dest = targetWb.addWorksheet(escSheetName(targetSheetName));
  src.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const destRow = dest.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const destCell = destRow.getCell(colNumber);
      destCell.value = cell.value;
      if (cell.style) destCell.style = { ...cell.style };
    });
    destRow.commit();
  });
  dest.columns = src.columns.map((c) => ({ width: c.width }));
}

function addSummarySheet(wb: ExcelJS.Workbook, mergedEntities: string[]): void {
  const ws = wb.addWorksheet('Summary');
  ws.columns = [
    { header: 'Jira', key: 'jira', width: 12 },
    { header: 'Entity', key: 'entity', width: 22 },
    { header: 'Load', key: 'load', width: 10 },
    { header: 'Count match', key: 'count', width: 12 },
    { header: 'Field validation', key: 'fields', width: 16 },
    { header: 'Notes', key: 'notes', width: 40 },
    { header: 'Detail tab in workbook', key: 'tab', width: 28 },
  ];
  for (const row of CLM_ENTITY_SUMMARY_ROWS) {
    const entityKey = row.entity.toLowerCase().replace(/\s+/g, '-');
    const hasTab = mergedEntities.some(
      (k) => k.includes(entityKey.split('-')[0]) || k === entityKey
    );
    ws.addRow({
      ...row,
      tab: hasTab ? 'See entity worksheet' : 'Re-run validation for diffs',
    });
  }
  ws.getRow(1).font = { bold: true };
  ws.addRow([]);
  ws.addRow(['Generated', new Date().toISOString()]);
  ws.addRow(['Source', 'INT read-only validation — Dynamics preprod vs Salesforce INT']);
  ws.addRow([
    'Merged entity reports',
    mergedEntities.length ? mergedEntities.join(', ') : '(none on disk — summary only)',
  ]);
}

const MERGE_SHEETS = ['Summary', 'Field Comparison', 'By Record'] as const;

/**
 * Write combined evidence workbook to outPath (stable filename for Confluence attachment).
 */
export async function buildClmMigrationEvidenceWorkbook(outPath: string): Promise<{
  path: string;
  mergedCount: number;
  summaryOnly: boolean;
}> {
  const dir = process.env.CLM_MIGRATION_REPORT_DIR?.trim() || CLM_MIGRATION_REPORT_DIR;
  const latest = findLatestPerEntityReports(dir);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CLM Migration QA Progress';
  wb.created = new Date();

  const mergedKeys: string[] = [];
  for (const [entityKey, { path: reportPath }] of latest) {
    if (entityKey === 'record-counts') continue;
    try {
      const srcWb = new ExcelJS.Workbook();
      await srcWb.xlsx.readFile(reportPath);
      for (const sheetName of MERGE_SHEETS) {
        if (srcWb.getWorksheet(sheetName)) {
          await copyWorksheet(srcWb, wb, sheetName, `${entityKey}-${sheetName}`);
        }
      }
      mergedKeys.push(entityKey);
    } catch {
      // skip corrupt files
    }
  }

  addSummarySheet(wb, mergedKeys);

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  await wb.xlsx.writeFile(outPath);

  return {
    path: outPath,
    mergedCount: mergedKeys.length,
    summaryOnly: mergedKeys.length === 0,
  };
}
