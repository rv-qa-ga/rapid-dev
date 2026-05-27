/**
 * CLM migration validation — Excel report (SOURCE Dynamics vs TARGET Salesforce).
 */

import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { ClmEntityMigrationRunResult } from './clm-migration-validation.service';
import { ValidationResult } from './migration-field-mapper';

export interface ClmMigrationRunSummary {
  entityKey: string;
  entityLabel: string;
  fieldMappingExcel: string;
  fieldMappingSheet: string;
  picklistTab: string;
  dynamicsQueried: number;
  salesforceFound: number;
  missingInSalesforce: number;
  recordsWithFieldDiffs: number;
  totalFieldComparisons: number;
  totalFieldMismatches: number;
  excelPath: string;
  generatedAt: string;
}

function escSheetName(name: string): string {
  return name.replace(/[\\/*?:[\]]/g, '_').slice(0, 31);
}

export async function writeClmMigrationExcelReport(
  run: ClmEntityMigrationRunResult
): Promise<{ path: string; summary: ClmMigrationRunSummary }> {
  const results = run.validationResults;
  const summary: ClmMigrationRunSummary = {
    entityKey: run.entity.key,
    entityLabel: run.entity.label,
    fieldMappingExcel: run.fieldMappingSource,
    fieldMappingSheet: run.fieldMappingSheet,
    picklistTab: run.entity.picklistMigrationTab,
    dynamicsQueried: run.dynamicsRecords.length,
    salesforceFound: results.filter((r) => r.accountExists).length,
    missingInSalesforce: run.missingInSalesforce.length,
    recordsWithFieldDiffs: run.recordsWithFieldDiffs,
    totalFieldComparisons: results.reduce((s, r) => s + r.fieldsCompared, 0),
    totalFieldMismatches: results.reduce((s, r) => s + r.fieldsDifferent, 0),
    excelPath: '',
    generatedAt: new Date().toISOString(),
  };

  const dir =
    process.env.CLM_MIGRATION_REPORT_DIR?.trim() ||
    path.join(process.cwd(), 'reports', 'clm', 'migration');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `CLM-MIG-${summary.entityKey}-${stamp}.xlsx`;
  const outPath = path.join(dir, fileName);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'CLM Migration Validation';
  wb.created = new Date();

  const summarySheet = wb.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 56 },
  ];
  const rows: Array<[string, string | number]> = [
    ['Entity', summary.entityLabel],
    ['Jira', run.entity.jira],
    ['Generated (UTC)', summary.generatedAt],
    ['Governance mapping file', summary.fieldMappingExcel],
    ['Governance sheet (M tab)', summary.fieldMappingSheet],
    ['Include in Migration filter', 'Column N = Y only'],
    ['Picklist value tab (reference)', summary.picklistTab],
    ['Dynamics entity set (SOURCE)', run.entity.dynamicsEntitySet],
    ['Salesforce object (TARGET)', run.entity.salesforceObject],
    ['Correlation field (TARGET)', run.entity.salesforceCorrelationField],
    ['Dynamics records queried', summary.dynamicsQueried],
    ['Salesforce records found', summary.salesforceFound],
    ['Missing in Salesforce', summary.missingInSalesforce],
    ['Records with field differences', summary.recordsWithFieldDiffs],
    ['Total field comparisons', summary.totalFieldComparisons],
    ['Total field mismatches', summary.totalFieldMismatches],
  ];
  for (const [metric, value] of rows) {
    summarySheet.addRow({ metric, value });
  }

  const detail = wb.addWorksheet(escSheetName('Field Comparison'));
  detail.columns = [
    { header: 'CorrelationId', key: 'correlationId', width: 38 },
    { header: 'DynamicsField', key: 'dynamicsField', width: 30 },
    { header: 'SalesforceField', key: 'salesforceField', width: 30 },
    { header: 'SOURCE_Dynamics', key: 'source', width: 36 },
    { header: 'TARGET_Salesforce', key: 'target', width: 36 },
    { header: 'Match', key: 'match', width: 8 },
    { header: 'Severity', key: 'severity', width: 10 },
    { header: 'Difference', key: 'difference', width: 48 },
  ];

  for (const r of results) {
    for (const c of r.comparisons) {
      detail.addRow({
        correlationId: r.masterId,
        dynamicsField: c.field,
        salesforceField: c.salesforceField,
        source: c.dynamicsValue ?? '',
        target: c.salesforceValue ?? '',
        match: c.match ? 'Y' : 'N',
        severity: c.severity,
        difference: c.difference ?? '',
      });
    }
  }

  const missing = wb.addWorksheet(escSheetName('Missing in SF'));
  missing.columns = [
    { header: 'CorrelationId', key: 'id', width: 40 },
    { header: 'Notes', key: 'notes', width: 64 },
  ];
  for (const r of results.filter((x) => !x.accountExists)) {
    missing.addRow({ id: r.masterId, notes: r.recommendations.join('; ') });
  }

  const recordSummary = wb.addWorksheet(escSheetName('By Record'));
  recordSummary.columns = [
    { header: 'CorrelationId', key: 'id', width: 40 },
    { header: 'InSalesforce', key: 'found', width: 14 },
    { header: 'FieldsCompared', key: 'compared', width: 16 },
    { header: 'FieldsMatched', key: 'matched', width: 16 },
    { header: 'FieldsDifferent', key: 'diff', width: 16 },
    { header: 'CriticalOK', key: 'critical', width: 12 },
  ];
  for (const r of results) {
    recordSummary.addRow({
      id: r.masterId,
      found: r.accountExists ? 'Y' : 'N',
      compared: r.fieldsCompared,
      matched: r.fieldsMatched,
      diff: r.fieldsDifferent,
      critical: r.criticalFieldsMatched ? 'Y' : 'N',
    });
  }

  await wb.xlsx.writeFile(outPath);
  summary.excelPath = outPath;
  return { path: outPath, summary };
}
