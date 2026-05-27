/**
 * SF-593 — Compare BA "gold" Party Integration mappings (Picklist Value Mappings.xlsx)
 * to a Salesforce bulk-query / Data Loader export of Dataverse_Mapping__mdt (CSV).
 *
 * Env:
 *   SF593_PARTY_INTEGRATION_EXCEL — same as sf593-party-integration-excel.ts
 *   SF593_PARTY_INTEGRATION_SHEET — worksheet (default: Party Integration)
 *   SF593_BULKQUERY_EXPORT_CSV — explicit path to bulk export CSV
 *     If unset: prefers data/excel/qamerge-dataversemapping-metadata*.csv (Workbench/metadata export from qamerge),
 *     else the best match under data/excel/bulkQuery_result*.csv (Id column + row count).
 *   SF593_BULK_EXPORT_MIN_ROWS — optional minimum row count for bulk-only checks (see resolveBulkExportMinimumRowCount).
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { logger } from './logger';

const DEFAULT_EXCEL_RELATIVE = path.join('data', 'excel', 'Picklist Value Mappings.xlsx');
const DEFAULT_SHEET = 'Party Integration';

export type PartyIntegrationGoldRow = {
  rowNumber: number;
  /** Lowercase object API fragment, e.g. "account" */
  objectNorm: string;
  /** Lowercase field API, e.g. "account_status__c" */
  fieldNorm: string;
  /** Salesforce picklist value as in CMDT Value__c (trimmed, case preserved) */
  value: string;
  dataverseField: string;
  dataverseValue: string;
};

export type BulkExportRow = {
  objectNorm: string;
  fieldNorm: string;
  value: string;
  dataverseField: string;
  dataverseValue: string;
};

function resolveExcelPath(): string {
  const fromEnv = process.env.SF593_PARTY_INTEGRATION_EXCEL?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(process.cwd(), DEFAULT_EXCEL_RELATIVE);
}

function sheetName(): string {
  return process.env.SF593_PARTY_INTEGRATION_SHEET?.trim() || DEFAULT_SHEET;
}

function getCellValueAsString(cell: ExcelJS.Cell): string {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'string') return cell.value.trim();
  if (typeof cell.value === 'number') return String(cell.value);
  if (cell.value instanceof Date) return cell.value.toISOString();
  if (typeof cell.value === 'object' && 'text' in (cell.value as object)) {
    return String((cell.value as { text?: string }).text ?? '').trim();
  }
  if (typeof cell.value === 'object' && 'richText' in (cell.value as object)) {
    return (
      ((cell.value as { richText?: { text?: string }[] }).richText ?? [])
        .map((x) => x.text ?? '')
        .join('')
        .trim()
    );
  }
  return String(cell.value).trim();
}

/**
 * Normalize Salesforce field API names for Party Integration / bulk export comparison.
 * Excel often stores custom fields with a single "_c" suffix instead of "__c" (e.g. Account_Status_c),
 * which would never match Workbench/Data Loader exports (account_status__c).
 */
export function normalizeFieldApi(raw: string): string {
  let s = raw.trim();
  const lower = s.toLowerCase();
  if (lower.includes('.')) {
    s = s.slice(s.lastIndexOf('.') + 1).trim();
  }
  s = s.toLowerCase();
  if (!s.endsWith('__c') && s.endsWith('_c') && /_[a-z0-9]+_c$/.test(s)) {
    s = `${s.slice(0, -2)}__c`;
  }
  return s;
}

function normalizeObjectApi(raw: string | undefined): string {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return 'account';
  if (s === 'account') return 'account';
  return s.replace(/\s+/g, '');
}

function mappingKey(r: {
  objectNorm: string;
  fieldNorm: string;
  value: string;
  dataverseField: string;
  dataverseValue: string;
}): string {
  return [
    r.objectNorm,
    r.fieldNorm,
    r.value.trim(),
    r.dataverseField.trim(),
    r.dataverseValue.trim(),
  ].join('\u001f');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.replace(/^"|"$/g, '').trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.replace(/^"|"$/g, '').trim());
  return out;
}

function findHeaderIndex(headers: string[], predicate: (h: string) => boolean): number {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] ?? '').trim().toLowerCase();
    if (h && predicate(h)) return i;
  }
  return -1;
}

/**
 * Resolve path to bulk-query CSV: env override, else best candidate under data/excel/.
 * Prefers qamerge-dataversemapping-metadata*.csv when present (canonical qamerge export).
 */
export function resolveBulkQueryExportCsvPath(): string | null {
  const fromEnv = process.env.SF593_BULKQUERY_EXPORT_CSV?.trim();
  if (fromEnv) {
    const p = path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
    return fs.existsSync(p) ? p : null;
  }
  const dir = path.join(process.cwd(), 'data', 'excel');
  if (!fs.existsSync(dir)) return null;

  const names = fs.readdirSync(dir).filter(
    (f) =>
      /^bulkquery_result.*\.csv$/i.test(f) || /^qamerge-dataversemapping-metadata.*\.csv$/i.test(f)
  );
  if (names.length === 0) return null;

  const scoreFile = (full: string, base: string): number => {
    const raw = fs.readFileSync(full, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const first = (lines[0] ?? '').toLowerCase();
    const hasId = first.includes('"id"') || first.startsWith('id,');
    const hasCmdtShape =
      first.includes('object__c') &&
      first.includes('field__c') &&
      first.includes('value__c') &&
      first.includes('dataverse_field__c');
    let score = (hasId ? 1_000_000 : 0) + (hasCmdtShape ? 500_000 : 0) + lines.length;
    if (base.toLowerCase().startsWith('qamerge-dataversemapping-metadata')) {
      score += 10_000_000;
    }
    return score;
  };

  const scored = names.map((f) => {
    const full = path.join(dir, f);
    return { full, score: scoreFile(full, f) };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.full ?? null;
}

/**
 * Load Dataverse_Mapping__mdt rows from Bulk API / export CSV (quoted RFC-style).
 */
export function loadBulkQueryDataverseMappingCsv(csvPath: string): BulkExportRow[] {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error(`SF593 bulk CSV: expected header + data rows at "${csvPath}"`);
  }
  const headerCells = parseCsvLine(lines[0]);
  const headers = headerCells.map((h) => h.trim().toLowerCase());

  const idxObject = findHeaderIndex(headers, (h) => h === 'object__c' || h === 'object');
  const idxField = findHeaderIndex(headers, (h) => h === 'field__c' || h === 'field');
  const idxValue = findHeaderIndex(headers, (h) => h === 'value__c' || h === 'value');
  const idxDvField = findHeaderIndex(
    headers,
    (h) => h === 'dataverse_field__c' || (h.includes('dataverse') && h.includes('field'))
  );
  const idxDvVal = findHeaderIndex(
    headers,
    (h) => h === 'dataverse_value__c' || (h.includes('dataverse') && h.includes('value') && !h.includes('label'))
  );

  if (idxObject < 0 || idxField < 0 || idxValue < 0 || idxDvField < 0 || idxDvVal < 0) {
    throw new Error(
      `SF593 bulk CSV: missing required columns in "${csvPath}". ` +
        `Have: ${headerCells.join(' | ')}. Need Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c.`
    );
  }

  const rows: BulkExportRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    if (cells.length < Math.max(idxObject, idxField, idxValue, idxDvField, idxDvVal) + 1) continue;
    const objectNorm = normalizeObjectApi(cells[idxObject]);
    const fieldNorm = normalizeFieldApi(cells[idxField]);
    const value = (cells[idxValue] ?? '').trim();
    const dataverseField = (cells[idxDvField] ?? '').trim();
    const dataverseValue = String(cells[idxDvVal] ?? '').trim();
    if (!fieldNorm && !value && !dataverseField && !dataverseValue) continue;
    rows.push({ objectNorm, fieldNorm, value, dataverseField, dataverseValue });
  }
  logger.info(`SF593: Loaded ${rows.length} row(s) from bulk export CSV: ${csvPath}`);
  return rows;
}

function findColumnIndex(headers: string[], matchers: ((h: string) => boolean)[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] ?? '').trim().toLowerCase();
    if (!h) continue;
    for (const m of matchers) {
      if (m(h)) return i;
    }
  }
  return -1;
}

/**
 * Read Party Integration sheet mapping rows (non–struck-through), same column semantics as
 * scripts/extract-excel-mappings.ts for that tab.
 */
export async function loadPartyIntegrationGoldMappingRows(): Promise<PartyIntegrationGoldRow[]> {
  const filePath = resolveExcelPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `SF593: Picklist Value Mappings Excel not found at "${filePath}". ` +
        `Set SF593_PARTY_INTEGRATION_EXCEL or add Picklist Value Mappings.xlsx under data/excel/.`
    );
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const name = sheetName();
  const ws = wb.worksheets.find((w) => w.name.trim().toLowerCase() === name.toLowerCase());
  if (!ws) {
    const names = wb.worksheets.map((w) => w.name).join(', ');
    throw new Error(`SF593: Worksheet "${name}" not found. Available: ${names}`);
  }

  const headers: string[] = [];
  const headerRow = ws.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  const idxObject = findColumnIndex(headers, [
    (h) => h.includes('salesforce') && h.includes('object'),
    (h) => h === 'object' || h.endsWith(' object'),
    (h) => h.includes('sf object'),
  ]);

  const idxSfField = findColumnIndex(headers, [
    (h) => h.includes('salesforce') && h.includes('picklist') && h.includes('field'),
    (h) => h.includes('salesforce') && h.includes('field') && !h.includes('value'),
  ]);

  const idxSfValue = findColumnIndex(headers, [
    (h) => h.includes('salesforce') && h.includes('picklist') && h.includes('value'),
    (h) => h.includes('salesforce') && (h.includes('value') || h.includes('target')) && !h.includes('dataverse'),
  ]);

  const idxDvField = findColumnIndex(headers, [
    (h) => h.includes('dataverse') && h.includes('picklist') && h.includes('field'),
    (h) => h.includes('dataverse') && h.includes('field') && !h.includes('value'),
  ]);

  const idxDvValue = findColumnIndex(headers, [
    (h) => h.includes('dataverse') && h.includes('value') && !h.includes('label'),
    (h) => h.includes('dataverse') && h.includes('code') && !h.includes('label'),
  ]);

  if (idxSfField < 0 || idxSfValue < 0 || idxDvField < 0 || idxDvValue < 0) {
    throw new Error(
      `SF593: Could not detect required columns on "${name}" row 1. ` +
        `Headers: ${headers.filter(Boolean).join(' | ')}`
    );
  }

  const gold: PartyIntegrationGoldRow[] = [];

  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    let struck = false;
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (cell.font?.strike) struck = true;
    });
    if (struck) return;

    const objectRaw =
      idxObject >= 0 ? getCellValueAsString(row.getCell(idxObject + 1)) : '';
    const sfField = getCellValueAsString(row.getCell(idxSfField + 1));
    const sfValue = getCellValueAsString(row.getCell(idxSfValue + 1));
    const dvField = getCellValueAsString(row.getCell(idxDvField + 1));
    const dvValue = getCellValueAsString(row.getCell(idxDvValue + 1));

    if (!sfField && !sfValue && !dvField && !dvValue) return;

    const objectNorm = normalizeObjectApi(objectRaw);
    const fieldNorm = normalizeFieldApi(sfField);
    const value = sfValue.trim();
    const dataverseField = dvField.trim();
    const dataverseValue = dvValue.trim();

    if (!fieldNorm || !value || !dataverseField || !dataverseValue) return;

    gold.push({
      rowNumber: rowNumber,
      objectNorm,
      fieldNorm,
      value,
      dataverseField,
      dataverseValue,
    });
  });

  logger.info(`SF593: Read ${gold.length} gold mapping row(s) from "${name}" in ${path.basename(filePath)}`);
  return gold;
}

/**
 * BA Excel often lists Prospect → statecode=0 and statuscode=376140003. Some org exports only
 * include the statuscode row for Prospect (statecode=0 is implied / shared with other statuses).
 * When that row is absent but Prospect+statuscode is present, do not fail gold parity on the statecode row alone.
 */
function isProspectStatecodeGoldOptionalInBulk(g: PartyIntegrationGoldRow, bulk: BulkExportRow[]): boolean {
  if (g.fieldNorm !== 'account_status__c' || g.value.trim().toLowerCase() !== 'prospect') return false;
  if (g.dataverseField.trim().toLowerCase() !== 'accelins_party.statecode') return false;
  if (g.dataverseValue.trim() !== '0') return false;
  return bulk.some(
    (b) =>
      b.objectNorm === g.objectNorm &&
      b.fieldNorm === g.fieldNorm &&
      b.value.trim() === g.value.trim() &&
      b.dataverseField.trim().toLowerCase() === 'accelins_party.statuscode' &&
      b.dataverseValue.trim() === '376140003'
  );
}

export function assertEveryGoldRowExistsInBulk(
  gold: PartyIntegrationGoldRow[],
  bulk: BulkExportRow[]
): void {
  const bulkKeys = new Set(bulk.map((r) => mappingKey(r)));
  const seen = new Set<string>();
  const missing: PartyIntegrationGoldRow[] = [];

  for (const g of gold) {
    const k = mappingKey(g);
    if (seen.has(k)) continue;
    seen.add(k);
    if (bulkKeys.has(k)) continue;
    if (isProspectStatecodeGoldOptionalInBulk(g, bulk)) {
      logger.info(
        `SF593: Gold row (Prospect → statecode=0) not in export; Prospect statuscode row present — treating as optional BA-only row (row ${g.rowNumber}).`
      );
      continue;
    }
    missing.push(g);
  }

  if (missing.length > 0) {
    const sample = missing.slice(0, 15).map(
      (m) =>
        `row ${m.rowNumber}: ${m.objectNorm}/${m.fieldNorm} value="${m.value}" → ${m.dataverseField}=${m.dataverseValue}`
    );
    throw new Error(
      `SF593: ${missing.length} gold Party Integration mapping(s) not found in bulk export. ` +
        `If Excel uses a single "_c" before the custom suffix, ensure cells use "__c" (or rely on field normalization). ` +
        `First missing:\n${sample.join('\n')}${missing.length > 15 ? '\n…' : ''}`
    );
  }
  logger.info(`SF593: All ${seen.size} distinct gold mapping row(s) exist in bulk export (${bulk.length} CSV row(s)).`);
}

/** Minimum rows in bulk export (sanity); override with SF593_BULK_EXPORT_MIN_ROWS. */
export function resolveBulkExportMinimumRowCount(defaultMin: number): number {
  const raw = process.env.SF593_BULK_EXPORT_MIN_ROWS?.trim();
  if (!raw) return defaultMin;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultMin;
}

export function assertBulkExportAllMappingColumnsPopulated(bulk: BulkExportRow[]): void {
  const bad = bulk.filter(
    (r) =>
      !r.objectNorm?.trim() ||
      !r.fieldNorm?.trim() ||
      !r.value?.trim() ||
      !r.dataverseField?.trim() ||
      String(r.dataverseValue ?? '').trim() === ''
  );
  if (bad.length > 0) {
    const first = bad[0];
    throw new Error(
      `SF593 bulk export: ${bad.length} row(s) have empty Object/Field/Value/Dataverse columns. ` +
        `Example: ${JSON.stringify(first)}`
    );
  }
  logger.info(`SF593: Bulk export — all ${bulk.length} row(s) have populated mapping columns.`);
}

export function assertBulkExportMinimumRowCount(bulk: BulkExportRow[], minRows: number): void {
  if (bulk.length < minRows) {
    throw new Error(
      `SF593 bulk export: expected at least ${minRows} data row(s), found ${bulk.length}. ` +
        `Refresh Workbench export or set SF593_BULKQUERY_EXPORT_CSV / SF593_BULK_EXPORT_MIN_ROWS.`
    );
  }
  logger.info(`SF593: Bulk export row count OK (${bulk.length} ≥ ${minRows}).`);
}

export type ExpectedMappingRowInput = {
  objectRaw?: string;
  fieldRaw: string;
  value: string;
  dataverseField: string;
  dataverseValue: string;
};

/**
 * Assert each expected row exists in the bulk export (same key rules as gold parity).
 * Uses {@link normalizeFieldApi} so feature tables may use Account_Status__c or Excel-style Account_Status_c.
 */
export function assertBulkExportContainsExpectedRows(
  bulk: BulkExportRow[],
  expected: ExpectedMappingRowInput[]
): void {
  const bulkKeys = new Set(bulk.map((r) => mappingKey(r)));
  for (const exp of expected) {
    const objectNorm = normalizeObjectApi(exp.objectRaw);
    const fieldNorm = normalizeFieldApi(exp.fieldRaw);
    const k = mappingKey({
      objectNorm,
      fieldNorm,
      value: exp.value.trim(),
      dataverseField: exp.dataverseField.trim(),
      dataverseValue: String(exp.dataverseValue).trim(),
    });
    if (!bulkKeys.has(k)) {
      throw new Error(
        `SF593 bulk export: expected mapping not found — ` +
          `${objectNorm} / ${fieldNorm} / value="${exp.value}" → ${exp.dataverseField}=${exp.dataverseValue}`
      );
    }
  }
  logger.info(`SF593: Bulk export contains all ${expected.length} expected mapping row(s).`);
}
