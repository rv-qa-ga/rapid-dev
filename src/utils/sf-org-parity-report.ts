/**
 * Build Excel workbooks for QA vs UAT parity:
 *  - Objects sheet (describeGlobal; match by API name, include Label)
 *  - PermissionSets sheet (match by Name; include Label)
 *  - Optional CustomFieldDiffs sheet
 * Mismatching rows (presence differs OR label differs) are highlighted yellow.
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';

/** Mismatch highlight — Excel yellow fill. */
const YELLOW_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF59D' },
};

function applyRowFill(row: ExcelJS.Row, fill: ExcelJS.Fill): void {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = fill;
  });
}

export interface DescribeGlobalSObjectRow {
  name: string;
  label: string;
  custom: boolean;
}

export interface PermissionSetRow {
  name: string;
  label: string;
  namespacePrefix?: string | null;
  isCustom?: boolean;
  isOwnedByProfile?: boolean;
}

export function parseExcludePrefixes(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function filterDescribeGlobalRows(
  rows: DescribeGlobalSObjectRow[],
  mode: 'all' | 'custom',
  excludePrefixes: string[]
): DescribeGlobalSObjectRow[] {
  let out = rows;
  if (mode === 'custom') {
    out = out.filter((r) => r.custom);
  }
  if (excludePrefixes.length === 0) {
    return out;
  }
  return out.filter((r) => !excludePrefixes.some((p) => r.name.startsWith(p)));
}

function labelsDiffer(a: string | undefined, b: string | undefined): boolean {
  const la = (a || '').trim();
  const lb = (b || '').trim();
  return la !== lb;
}

/** Fetch non-profile-backed permission sets ordered by Name. */
export async function fetchPermissionSets(client: SalesforceAPIClient): Promise<PermissionSetRow[]> {
  const soql =
    'SELECT Name, Label, NamespacePrefix, IsCustom, IsOwnedByProfile ' +
    'FROM PermissionSet ORDER BY Name';
  const resp = (await client.query(soql)) as {
    records?: Array<{
      Name: string;
      Label: string;
      NamespacePrefix: string | null;
      IsCustom: boolean;
      IsOwnedByProfile: boolean;
    }>;
  };
  const records = Array.isArray(resp.records) ? resp.records : [];
  return records.map((r) => ({
    name: r.Name,
    label: r.Label ?? '',
    namespacePrefix: r.NamespacePrefix,
    isCustom: !!r.IsCustom,
    isOwnedByProfile: !!r.IsOwnedByProfile,
  }));
}

export async function writeDescribeGlobalParityWorkbook(params: {
  baselineRows: DescribeGlobalSObjectRow[];
  uatRows: DescribeGlobalSObjectRow[];
  permissionSets?: { baseline: PermissionSetRow[]; uat: PermissionSetRow[] };
  outputPath: string;
  baselineInstanceLabel: string;
  uatInstanceLabel: string;
}): Promise<void> {
  const baselineMap = new Map(params.baselineRows.map((r) => [r.name, r]));
  const uatMap = new Map(params.uatRows.map((r) => [r.name, r]));
  const allNames = new Set([...baselineMap.keys(), ...uatMap.keys()]);
  const sortedObjects = [...allNames].sort((a, b) => a.localeCompare(b));

  const dir = path.dirname(params.outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Automation sf-org-parity';
  wb.created = new Date();

  const bothObjects = sortedObjects.filter((n) => baselineMap.has(n) && uatMap.has(n));
  const objectLabelDiffs = bothObjects.filter((n) =>
    labelsDiffer(baselineMap.get(n)?.label, uatMap.get(n)?.label)
  ).length;

  const summary = wb.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 1 }] });
  summary.columns = [
    { header: 'Key', width: 44 },
    { header: 'Value', width: 72 },
  ];
  summary.addRows([
    ['Generated (UTC)', new Date().toISOString()],
    ['Baseline org', params.baselineInstanceLabel],
    ['UAT org', params.uatInstanceLabel],
    ['Baseline SObject count (after filter)', String(params.baselineRows.length)],
    ['UAT SObject count (after filter)', String(params.uatRows.length)],
    ['Objects union count', String(sortedObjects.length)],
    ['Objects both count', String(bothObjects.length)],
    ['Objects baseline-only count', String(sortedObjects.filter((n) => baselineMap.has(n) && !uatMap.has(n)).length)],
    ['Objects UAT-only count', String(sortedObjects.filter((n) => !baselineMap.has(n) && uatMap.has(n)).length)],
    ['Objects label mismatch count (API name present in both)', String(objectLabelDiffs)],
  ]);
  summary.getRow(1).font = { bold: true };

  const objects = wb.addWorksheet('Objects', { views: [{ state: 'frozen', ySplit: 1 }] });
  objects.columns = [
    { header: 'ObjectApiName', width: 44 },
    { header: 'Presence', width: 16 },
    { header: 'InBaseline', width: 12 },
    { header: 'InUAT', width: 10 },
    { header: 'Baseline_Label', width: 40 },
    { header: 'UAT_Label', width: 40 },
    { header: 'Label_Match', width: 14 },
    { header: 'Baseline_CustomFlag', width: 22 },
    { header: 'UAT_CustomFlag', width: 18 },
  ];
  for (const name of sortedObjects) {
    const b = baselineMap.get(name);
    const u = uatMap.get(name);
    let presence = 'Both';
    if (b && !u) {
      presence = 'Baseline-only';
    }
    if (!b && u) {
      presence = 'UAT-only';
    }
    const labelMatch = b && u ? (labelsDiffer(b.label, u.label) ? 'DIFF' : 'MATCH') : 'N/A';
    const row = objects.addRow([
      name,
      presence,
      b ? 'Y' : 'N',
      u ? 'Y' : 'N',
      b?.label ?? '',
      u?.label ?? '',
      labelMatch,
      b ? (b.custom ? 'Y' : 'N') : '',
      u ? (u.custom ? 'Y' : 'N') : '',
    ]);
    if (presence !== 'Both' || labelMatch === 'DIFF') {
      applyRowFill(row, YELLOW_FILL);
    }
  }
  objects.getRow(1).font = { bold: true };
  objects.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: objects.columnCount } };

  if (params.permissionSets) {
    const { baseline: psB, uat: psU } = params.permissionSets;
    const bMap = new Map(psB.map((p) => [p.name, p]));
    const uMap = new Map(psU.map((p) => [p.name, p]));
    const allPsNames = [...new Set([...bMap.keys(), ...uMap.keys()])].sort((a, b) => a.localeCompare(b));
    const bothPs = allPsNames.filter((n) => bMap.has(n) && uMap.has(n));
    const psLabelDiffs = bothPs.filter((n) => labelsDiffer(bMap.get(n)?.label, uMap.get(n)?.label)).length;

    summary.addRows([
      ['PermissionSet union count', String(allPsNames.length)],
      ['PermissionSet both count', String(bothPs.length)],
      ['PermissionSet baseline-only count', String(allPsNames.filter((n) => bMap.has(n) && !uMap.has(n)).length)],
      ['PermissionSet UAT-only count', String(allPsNames.filter((n) => !bMap.has(n) && uMap.has(n)).length)],
      ['PermissionSet label mismatch count (Name present in both)', String(psLabelDiffs)],
    ]);

    const ps = wb.addWorksheet('PermissionSets', { views: [{ state: 'frozen', ySplit: 1 }] });
    ps.columns = [
      { header: 'Name', width: 44 },
      { header: 'Presence', width: 16 },
      { header: 'InBaseline', width: 12 },
      { header: 'InUAT', width: 10 },
      { header: 'Baseline_Label', width: 50 },
      { header: 'UAT_Label', width: 50 },
      { header: 'Label_Match', width: 14 },
      { header: 'Baseline_Namespace', width: 22 },
      { header: 'UAT_Namespace', width: 22 },
      { header: 'Baseline_IsCustom', width: 18 },
      { header: 'UAT_IsCustom', width: 16 },
      { header: 'Baseline_IsOwnedByProfile', width: 24 },
      { header: 'UAT_IsOwnedByProfile', width: 22 },
    ];
    for (const name of allPsNames) {
      const b = bMap.get(name);
      const u = uMap.get(name);
      let presence = 'Both';
      if (b && !u) {
        presence = 'Baseline-only';
      }
      if (!b && u) {
        presence = 'UAT-only';
      }
      const labelMatch = b && u ? (labelsDiffer(b.label, u.label) ? 'DIFF' : 'MATCH') : 'N/A';
      const row = ps.addRow([
        name,
        presence,
        b ? 'Y' : 'N',
        u ? 'Y' : 'N',
        b?.label ?? '',
        u?.label ?? '',
        labelMatch,
        b?.namespacePrefix ?? '',
        u?.namespacePrefix ?? '',
        b ? (b.isCustom ? 'Y' : 'N') : '',
        u ? (u.isCustom ? 'Y' : 'N') : '',
        b ? (b.isOwnedByProfile ? 'Y' : 'N') : '',
        u ? (u.isOwnedByProfile ? 'Y' : 'N') : '',
      ]);
      if (presence !== 'Both' || labelMatch === 'DIFF') {
        applyRowFill(row, YELLOW_FILL);
      }
    }
    ps.getRow(1).font = { bold: true };
    ps.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ps.columnCount } };
  }

  await wb.xlsx.writeFile(params.outputPath);
  logger.info(
    `Parity workbook written: ${params.outputPath} (objects: ${sortedObjects.length}; label diffs: ${objectLabelDiffs})`
  );
}

function customFieldNamesFromDescribe(describeBody: { fields?: Array<{ name: string }> }): string[] {
  if (!Array.isArray(describeBody.fields)) {
    return [];
  }
  return describeBody.fields.map((f) => f.name).filter((n) => n.endsWith('__c')).sort();
}

export async function appendCustomFieldDiffSheet(params: {
  workbookPath: string;
  baselineClient: SalesforceAPIClient;
  uatClient: SalesforceAPIClient;
  baselineRows: DescribeGlobalSObjectRow[];
  uatRows: DescribeGlobalSObjectRow[];
  maxObjects: number;
}): Promise<{ rowsWritten: number; errors: number }> {
  const baselineNames = new Set(params.baselineRows.map((r) => r.name));
  const uatNames = new Set(params.uatRows.map((r) => r.name));
  const inBoth = [...baselineNames].filter((n) => uatNames.has(n)).sort((a, b) => a.localeCompare(b));
  const slice = inBoth.slice(0, Math.max(0, params.maxObjects));

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(params.workbookPath);

  const sheet = wb.addWorksheet('CustomFieldDiffs', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = [
    { header: 'ObjectApiName', width: 40 },
    { header: 'Baseline___c_count', width: 18 },
    { header: 'UAT___c_count', width: 14 },
    { header: 'OnlyInBaseline___c', width: 70 },
    { header: 'OnlyInUAT___c', width: 70 },
    { header: 'Notes', width: 40 },
  ];

  let errors = 0;
  for (const objectApiName of slice) {
    try {
      const [bd, ud] = await Promise.all([
        params.baselineClient.describeSObject(objectApiName),
        params.uatClient.describeSObject(objectApiName),
      ]);
      const bc = new Set(customFieldNamesFromDescribe(bd));
      const uc = new Set(customFieldNamesFromDescribe(ud));
      const onlyB = [...bc].filter((f) => !uc.has(f));
      const onlyU = [...uc].filter((f) => !bc.has(f));
      const diff = onlyB.length > 0 || onlyU.length > 0;
      const row = sheet.addRow([
        objectApiName,
        bc.size,
        uc.size,
        onlyB.join('; '),
        onlyU.join('; '),
        diff ? 'diff' : 'match',
      ]);
      if (diff) {
        applyRowFill(row, YELLOW_FILL);
      }
    } catch (e: any) {
      errors += 1;
      const row = sheet.addRow([
        objectApiName,
        '',
        '',
        '',
        '',
        `describe error: ${(e?.message || e).slice(0, 500)}`,
      ]);
      applyRowFill(row, YELLOW_FILL);
    }
  }

  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  await wb.xlsx.writeFile(params.workbookPath);
  logger.info(`Appended CustomFieldDiffs sheet: ${slice.length} object(s), ${errors} error row(s)`);
  return { rowsWritten: slice.length, errors };
}

export function defaultParityReportPath(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'reports', 'sf-org-parity', `sf-org-parity-${stamp}.xlsx`);
}
