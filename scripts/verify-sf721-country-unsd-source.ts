#!/usr/bin/env ts-node
/**
 * SF-721: Verify Country Data — Source vs Salesforce Comparison
 *
 * Reads the approved source file (default: CountryDataImport_Second.csv),
 * queries all Country__c records from Salesforce, compares every mapped field
 * on every record, and generates a detailed Excel evidence workbook.
 *
 * Optional: --xlsx path to use the legacy accelins_country_UNSD region.xlsx instead.
 *
 * Usage:
 *   npx ts-node scripts/verify-sf721-country-unsd-source.ts
 *   npx ts-node scripts/verify-sf721-country-unsd-source.ts --env qa
 *   npx ts-node scripts/verify-sf721-country-unsd-source.ts --csv data/excel/CountryDataImport_Second.csv
 *   npx ts-node scripts/verify-sf721-country-unsd-source.ts --xlsx data/excel/accelins_country_UNSD region.xlsx --env qa
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import axios, { AxiosInstance } from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { logger } from '../src/utils/logger';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface FieldMapping {
  xlsxColumn: string;
  sfApiName: string;
  label: string;
  dataType: 'text' | 'number' | 'picklist';
  knownCorrections?: Record<string, string>;
}

interface FieldComparison {
  field: string;
  label: string;
  xlsxValue: string;
  sfValue: string;
  match: boolean;
  difference: string;
  correctionApplied: string;
}

interface RecordResult {
  rowNumber: number;
  countryName: string;
  countryMasterId: string;
  foundInSF: boolean;
  totalFields: number;
  matchedFields: number;
  failedFields: number;
  status: 'PASS' | 'FAIL' | 'NOT FOUND';
  fieldComparisons: FieldComparison[];
}

// ════════════════════════════════════════════════════════════════════════════
// FIELD MAPPING: XLSX Dataverse column → SF API name
// Derived from "M accelins_country → country_c" mapping tab
// ════════════════════════════════════════════════════════════════════════════

const FIELD_MAPPINGS: FieldMapping[] = [
  { xlsxColumn: 'accelins_name',              sfApiName: 'Name',                       label: 'Country Name',              dataType: 'text' },
  { xlsxColumn: 'accelins_alpha2code',        sfApiName: 'Alpha2_Code__c',             label: 'Alpha2 Code',               dataType: 'text' },
  { xlsxColumn: 'accelins_alpha3code',        sfApiName: 'Alpha3_Code__c',             label: 'Alpha3 Code',               dataType: 'text' },
  { xlsxColumn: 'accelins_currencycode',      sfApiName: 'Accelins_CurrencyCode__c',   label: 'Currency Code',             dataType: 'text' },
  // Country_Master_ID__c excluded — new IDs (CRY-000255+) were generated during
  // import; Prod Dataverse IDs (CRY-000001..254) in the XLSX are expected to differ.
  { xlsxColumn: 'accelins_isonumber',         sfApiName: 'ISO_Number__c',              label: 'ISO Numeric Code',          dataType: 'number' },
  {
    xlsxColumn: 'accelins_business_areaname',
    sfApiName: 'Business_Area_Name__c',
    label: 'Business Area Name',
    dataType: 'picklist',
  },
  {
    xlsxColumn: 'accelins_regionname',
    sfApiName: 'Distribution_Region_Name__c',
    label: 'Distribution Region Name',
    dataType: 'picklist',
    knownCorrections: { 'Caribean': 'Caribbean' },
  },
  { xlsxColumn: 'UNSD Region',               sfApiName: 'UNSD_Region__c',             label: 'UNSD Region',               dataType: 'picklist' },
  { xlsxColumn: 'UNSD Sub-region',           sfApiName: 'UNSD_Sub_region__c',         label: 'UNSD Sub-region',           dataType: 'picklist' },
];

// Country_Master_ID__c differs between source XLSX (Prod Dataverse IDs CRY-000001..254)
// and Salesforce (new IDs CRY-000255..508 generated during import).
// Match by country name instead for XLSX. For CSV use Name (CountryDataImport_Second has no Country_Master_ID__c).
const MATCH_KEY_XLSX = 'accelins_name';
const MATCH_KEY_CSV = 'Name';  // CSV source uses Name; match SF by Name
const MATCH_KEY_SF = 'Name';

// CSV field mapping (CountryDataImport_Second.csv columns → SF)
// Note: CountryDataImport_Second.csv has no Country_Master_ID__c column; match by Name.
const CSV_MAPPINGS: FieldMapping[] = [
  { xlsxColumn: 'Name',                       sfApiName: 'Name',                       label: 'Country Name',              dataType: 'text' },
  { xlsxColumn: 'Alpha2_Code__c',             sfApiName: 'Alpha2_Code__c',             label: 'Alpha2 Code',               dataType: 'text' },
  { xlsxColumn: 'Alpha3_Code__c',             sfApiName: 'Alpha3_Code__c',             label: 'Alpha3 Code',               dataType: 'text' },
  { xlsxColumn: 'Accelins_CurrencyCode__c',   sfApiName: 'Accelins_CurrencyCode__c',   label: 'Currency Code',             dataType: 'text' },
  { xlsxColumn: 'Business_Area_Name__c',      sfApiName: 'Business_Area_Name__c',      label: 'Business Area Name',       dataType: 'picklist' },
  { xlsxColumn: 'Distribution_Region_Name__c', sfApiName: 'Distribution_Region_Name__c', label: 'Distribution Region Name', dataType: 'picklist' },
  { xlsxColumn: 'ISO_Number__c',              sfApiName: 'ISO_Number__c',             label: 'ISO Numeric Code',           dataType: 'number' },
  { xlsxColumn: 'Status__c',                   sfApiName: 'Status__c',                 label: 'Status',                     dataType: 'picklist' },
  { xlsxColumn: 'UNSD_Region__c',             sfApiName: 'UNSD_Region__c',            label: 'UNSD Region',                dataType: 'picklist' },
  { xlsxColumn: 'UNSD_Sub_region__c',         sfApiName: 'UNSD_Sub_region__c',         label: 'UNSD Sub-region',            dataType: 'picklist' },
];

// ════════════════════════════════════════════════════════════════════════════
// CLI
// ════════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: { csvPath: string; xlsxPath?: string; env: string } = {
    csvPath: 'data/excel/CountryDataImport_Second.csv',
    env: 'qa',
  };
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--csv' || args[i] === '-c') && args[i + 1]) { opts.csvPath = args[++i]; opts.xlsxPath = undefined; }
    if ((args[i] === '--xlsx' || args[i] === '-x') && args[i + 1]) { opts.xlsxPath = args[++i]; opts.csvPath = ''; }
    if ((args[i] === '--env' || args[i] === '-e') && args[i + 1]) { opts.env = args[++i]; }
  }
  return opts;
}

// ════════════════════════════════════════════════════════════════════════════
// XLSX READER
// ════════════════════════════════════════════════════════════════════════════

async function readXlsx(filePath: string): Promise<{ headers: string[]; records: Record<string, string>[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];

  const headers: string[] = [];
  ws.getRow(1).eachCell((cell, colNum) => {
    headers[colNum - 1] = String(cell.value ?? '').trim();
  });

  const records: Record<string, string>[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.hasValues) continue;
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => {
      const val = row.getCell(idx + 1).value;
      rec[h] = normalise(val);
    });
    if (rec[MATCH_KEY_XLSX]) records.push(rec);
  }
  return { headers, records };
}

// ════════════════════════════════════════════════════════════════════════════
// CSV READER (CountryDataImport_Second.csv)
// ════════════════════════════════════════════════════════════════════════════

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function readCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const rec: Record<string, string> = {};
    headers.forEach((h, idx) => { rec[h] = normalise(values[idx] ?? ''); });
    if (rec[MATCH_KEY_CSV] || rec['Name']) records.push(rec);
  }
  return records;
}

// ════════════════════════════════════════════════════════════════════════════
// FIELD COMPARISON
// ════════════════════════════════════════════════════════════════════════════

function normalise(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (s === 'NULL' || s === 'null') return '';
  return s;
}

function compareField(xlsxVal: string, sfVal: any, mapping: FieldMapping): FieldComparison {
  const xNorm = normalise(xlsxVal);
  const sNorm = normalise(sfVal);
  let correctionApplied = '';

  // Apply known corrections before comparing
  let xExpected = xNorm;
  if (mapping.knownCorrections && mapping.knownCorrections[xNorm]) {
    xExpected = mapping.knownCorrections[xNorm];
    correctionApplied = `"${xNorm}" → "${xExpected}" (known correction applied during import)`;
  }

  let match: boolean;
  let difference = '';

  if (mapping.dataType === 'number') {
    const xNum = xExpected === '' ? NaN : Number(xExpected);
    const sNum = sNorm === '' ? NaN : Number(sNorm);
    match = (isNaN(xNum) && isNaN(sNum)) || xNum === sNum;
    if (!match) difference = `XLSX=${xExpected}, SF=${sNorm}`;
  } else {
    if (xExpected === '' && sNorm === '') {
      match = true;
    } else {
      match = xExpected === sNorm;
    }
    if (!match) {
      if (xExpected.toLowerCase() === sNorm.toLowerCase()) {
        difference = `Case mismatch: XLSX="${xExpected}", SF="${sNorm}"`;
      } else if (xExpected.replace(/\s+/g, '') === sNorm.replace(/\s+/g, '')) {
        difference = `Whitespace mismatch: XLSX="${xExpected}", SF="${sNorm}"`;
      } else {
        difference = `XLSX="${xExpected}", SF="${sNorm}"`;
      }
    }
  }

  return {
    field: mapping.sfApiName,
    label: mapping.label,
    xlsxValue: xNorm,
    sfValue: sNorm,
    match,
    difference,
    correctionApplied,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SALESFORCE QUERY
// ════════════════════════════════════════════════════════════════════════════

async function queryAllCountries(client: AxiosInstance, mappings: FieldMapping[]): Promise<Record<string, any>[]> {
  const fields = mappings.map(m => m.sfApiName).join(', ');
  const soql = `SELECT Id, ${fields} FROM Country__c ORDER BY Name`;

  let all: Record<string, any>[] = [];
  let resp = await client.get('/query/', { params: { q: soql } });
  all = all.concat(resp.data.records || []);
  while (resp.data.nextRecordsUrl) {
    resp = await client.get(resp.data.nextRecordsUrl);
    all = all.concat(resp.data.records || []);
  }
  return all;
}

// ════════════════════════════════════════════════════════════════════════════
// EXCEL EVIDENCE GENERATION
// ════════════════════════════════════════════════════════════════════════════

const COLORS = {
  HEADER_BG: 'FF0B5394',
  HEADER_FONT: 'FFFFFFFF',
  PASS_BG: 'FFC6EFCE',
  PASS_FONT: 'FF006100',
  FAIL_BG: 'FFFFC7CE',
  FAIL_FONT: 'FF9C0006',
  NOT_FOUND_BG: 'FFFFEB9C',
  NOT_FOUND_FONT: 'FF9C6500',
  INFO_BG: 'FFE7F3FF',
  INFO_FONT: 'FF0B5394',
};

function styleHeader(ws: ExcelJS.Worksheet): void {
  const row = ws.getRow(1);
  row.font = { bold: true, size: 11, color: { argb: COLORS.HEADER_FONT } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 30;
}

function applyStatusStyle(cell: ExcelJS.Cell, status: string): void {
  const bg = status === 'PASS' ? COLORS.PASS_BG : status === 'FAIL' ? COLORS.FAIL_BG : COLORS.NOT_FOUND_BG;
  const fg = status === 'PASS' ? COLORS.PASS_FONT : status === 'FAIL' ? COLORS.FAIL_FONT : COLORS.NOT_FOUND_FONT;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
  cell.font = { color: { argb: fg }, bold: true };
}

const DETAIL_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Row #',                key: 'row',         width: 7 },
  { header: 'Country Name',         key: 'country',     width: 32 },
  { header: 'Country Master ID',    key: 'masterId',    width: 18 },
  { header: 'Record Status',        key: 'recStatus',   width: 14 },
  { header: 'Field Label',          key: 'fieldLabel',  width: 26 },
  { header: 'Source Column',        key: 'xlsxCol',     width: 28 },
  { header: 'SF API Name',          key: 'sfApi',       width: 28 },
  { header: 'Source Value',         key: 'xlsxVal',     width: 40 },
  { header: 'Salesforce Value',     key: 'sfVal',       width: 40 },
  { header: 'Field Result',         key: 'fieldResult', width: 12 },
  { header: 'Difference',           key: 'diff',        width: 50 },
  { header: 'Correction Applied',   key: 'correction',  width: 50 },
];

async function generateEvidence(
  results: RecordResult[],
  sourceCount: number,
  sfCount: number,
  outputPath: string,
  sourceFileName: string,
  mappings: FieldMapping[],
  matchKeyLabel: string,
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SF-721 Country UNSD Source Verification';
  wb.created = new Date();

  const totalPass = results.filter(r => r.status === 'PASS').length;
  const totalFail = results.filter(r => r.status === 'FAIL').length;
  const totalNotFound = results.filter(r => r.status === 'NOT FOUND').length;
  const totalFieldChecks = results.reduce((s, r) => s + r.totalFields, 0);
  const totalFieldPass = results.reduce((s, r) => s + r.matchedFields, 0);
  const totalFieldFail = results.reduce((s, r) => s + r.failedFields, 0);
  const correctionsUsed = results.reduce(
    (s, r) => s + r.fieldComparisons.filter(f => f.correctionApplied).length, 0,
  );

  // ── TAB 1: SUMMARY ──────────────────────────────────────────────────
  const sumWs = wb.addWorksheet('Summary');
  sumWs.columns = [{ width: 40 }, { width: 35 }];

  const summaryRows: (string | number)[][] = [
    ['SF-721 Source vs Salesforce — Verification Evidence'],
    [''],
    ['Generated', new Date().toISOString()],
    ['Source File', sourceFileName],
    ['Salesforce Object', 'Country__c'],
    ['Match Key', matchKeyLabel],
    ['Fields Compared per Record', mappings.length],
    ['Fields Excluded', 'Dataverse system/audit columns (when using XLSX)'],
    [''],
    ['RECORD-LEVEL SUMMARY'],
    ['Source Records', sourceCount],
    ['Salesforce Records', sfCount],
    ['Records Matched (PASS)', totalPass],
    ['Records with Mismatches (FAIL)', totalFail],
    ['Records Not Found in SF', totalNotFound],
    ['Record Match Rate', `${((totalPass / sourceCount) * 100).toFixed(1)}%`],
    [''],
    ['FIELD-LEVEL SUMMARY'],
    ['Total Field Checks', totalFieldChecks],
    ['Fields Matched (PASS)', totalFieldPass],
    ['Fields Mismatched (FAIL)', totalFieldFail],
    ['Field Match Rate', `${((totalFieldPass / totalFieldChecks) * 100).toFixed(1)}%`],
    ['Known Corrections Applied', `${correctionsUsed} (e.g. "Caribean" → "Caribbean")`],
    [''],
    ['FIELD MAPPING (Source → Salesforce)'],
    ...mappings.map(m => [`  ${m.xlsxColumn}`, `${m.sfApiName} (${m.label})`]),
    [''],
    ['OVERALL RESULT', totalFail === 0 && totalNotFound === 0 ? 'ALL PASS' : 'FAILURES DETECTED'],
  ];

  summaryRows.forEach((row, idx) => {
    const excelRow = sumWs.addRow(row);
    if (idx === 0) excelRow.font = { bold: true, size: 16, color: { argb: COLORS.HEADER_BG } };
    if (['RECORD-LEVEL SUMMARY', 'FIELD-LEVEL SUMMARY', 'FIELD MAPPING (XLSX → Salesforce)'].includes(String(row[0]))) {
      excelRow.font = { bold: true, size: 12 };
      excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
    }
    if (row[0] === 'OVERALL RESULT') {
      excelRow.font = { bold: true, size: 14 };
      const cell = excelRow.getCell(2);
      const pass = String(row[1]).includes('ALL PASS');
      applyStatusStyle(cell, pass ? 'PASS' : 'FAIL');
      cell.font = { ...cell.font!, size: 14 };
    }
  });

  // ── TAB 2: ALL RECORDS DETAIL ───────────────────────────────────────
  const detWs = wb.addWorksheet('All Records - Detail');
  detWs.columns = DETAIL_COLUMNS as ExcelJS.Column[];
  styleHeader(detWs);

  for (const rec of results) {
    if (!rec.foundInSF) {
      const row = detWs.addRow({
        row: rec.rowNumber, country: rec.countryName, masterId: rec.countryMasterId,
        recStatus: 'NOT FOUND', fieldLabel: '—', xlsxCol: '—', sfApi: '—',
        xlsxVal: '—', sfVal: '—', fieldResult: 'NOT FOUND',
        diff: 'Record not found in Salesforce', correction: '',
      });
      applyStatusStyle(row.getCell('recStatus'), 'NOT FOUND');
      applyStatusStyle(row.getCell('fieldResult'), 'NOT FOUND');
      continue;
    }
    for (const fc of rec.fieldComparisons) {
      const mapping = mappings.find(m => m.sfApiName === fc.field)!;
      const row = detWs.addRow({
        row: rec.rowNumber, country: rec.countryName, masterId: rec.countryMasterId,
        recStatus: rec.status, fieldLabel: fc.label, xlsxCol: mapping.xlsxColumn, sfApi: fc.field,
        xlsxVal: fc.xlsxValue, sfVal: fc.sfValue, fieldResult: fc.match ? 'PASS' : 'FAIL',
        diff: fc.difference, correction: fc.correctionApplied,
      });
      applyStatusStyle(row.getCell('fieldResult'), fc.match ? 'PASS' : 'FAIL');
      applyStatusStyle(row.getCell('recStatus'), rec.status);
      row.getCell('diff').alignment = { wrapText: true, vertical: 'top' };
      row.getCell('correction').alignment = { wrapText: true, vertical: 'top' };
      if (fc.correctionApplied) {
        row.getCell('correction').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.INFO_BG } };
        row.getCell('correction').font = { color: { argb: COLORS.INFO_FONT } };
      }
    }
  }
  detWs.views = [{ state: 'frozen', ySplit: 1 }];
  detWs.autoFilter = { from: 'A1', to: `L${detWs.rowCount}` };

  // ── TAB 3: MISMATCHES ONLY ──────────────────────────────────────────
  const failWs = wb.addWorksheet('Mismatches Only');
  failWs.columns = DETAIL_COLUMNS as ExcelJS.Column[];
  styleHeader(failWs);

  let failRows = 0;
  for (const rec of results) {
    if (rec.status === 'NOT FOUND') {
      const row = failWs.addRow({
        row: rec.rowNumber, country: rec.countryName, masterId: rec.countryMasterId,
        recStatus: 'NOT FOUND', fieldLabel: '—', xlsxCol: '—', sfApi: '—',
        xlsxVal: '—', sfVal: '—', fieldResult: 'NOT FOUND',
        diff: 'Record not found in Salesforce', correction: '',
      });
      applyStatusStyle(row.getCell('recStatus'), 'NOT FOUND');
      applyStatusStyle(row.getCell('fieldResult'), 'NOT FOUND');
      failRows++;
    }
    for (const fc of rec.fieldComparisons.filter(f => !f.match)) {
      const mapping = mappings.find(m => m.sfApiName === fc.field)!;
      const row = failWs.addRow({
        row: rec.rowNumber, country: rec.countryName, masterId: rec.countryMasterId,
        recStatus: 'FAIL', fieldLabel: fc.label, xlsxCol: mapping.xlsxColumn, sfApi: fc.field,
        xlsxVal: fc.xlsxValue, sfVal: fc.sfValue, fieldResult: 'FAIL',
        diff: fc.difference, correction: fc.correctionApplied,
      });
      applyStatusStyle(row.getCell('recStatus'), 'FAIL');
      applyStatusStyle(row.getCell('fieldResult'), 'FAIL');
      row.getCell('diff').alignment = { wrapText: true, vertical: 'top' };
      failRows++;
    }
  }
  if (failRows === 0) {
    const row = failWs.addRow({
      row: '', country: '', masterId: '', recStatus: '', fieldLabel: '', xlsxCol: '', sfApi: '',
      xlsxVal: '', sfVal: '', fieldResult: 'ALL PASS', diff: 'No mismatches found.', correction: '',
    });
    applyStatusStyle(row.getCell('fieldResult'), 'PASS');
  }
  failWs.views = [{ state: 'frozen', ySplit: 1 }];

  // ── TAB 4: RECORD SUMMARY ──────────────────────────────────────────
  const recWs = wb.addWorksheet('Record Summary');
  recWs.columns = [
    { header: 'Row #',             key: 'row',      width: 7 },
    { header: 'Country Name',      key: 'country',  width: 32 },
    { header: 'Country Master ID', key: 'masterId', width: 18 },
    { header: 'Found in SF',       key: 'found',    width: 12 },
    { header: 'Fields Checked',    key: 'total',    width: 14 },
    { header: 'Fields Matched',    key: 'matched',  width: 14 },
    { header: 'Fields Failed',     key: 'failed',   width: 14 },
    { header: 'Result',            key: 'result',   width: 12 },
  ] as ExcelJS.Column[];
  styleHeader(recWs);

  for (const rec of results) {
    const row = recWs.addRow({
      row: rec.rowNumber, country: rec.countryName, masterId: rec.countryMasterId,
      found: rec.foundInSF ? 'Yes' : 'No',
      total: rec.totalFields, matched: rec.matchedFields, failed: rec.failedFields,
      result: rec.status,
    });
    applyStatusStyle(row.getCell('result'), rec.status);
  }
  recWs.views = [{ state: 'frozen', ySplit: 1 }];
  recWs.autoFilter = { from: 'A1', to: `H${recWs.rowCount}` };

  await wb.xlsx.writeFile(outputPath);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const opts = parseArgs();

  // Resolve source: prefer CSV (CountryDataImport_Second) unless --xlsx is provided
  const useXlsx = !!opts.xlsxPath && fs.existsSync(path.resolve(process.cwd(), opts.xlsxPath));
  const csvFullPath = opts.csvPath ? path.resolve(process.cwd(), opts.csvPath) : '';
  const useCsv = !useXlsx && !!opts.csvPath && fs.existsSync(csvFullPath);

  if (!useXlsx && !useCsv) {
    throw new Error(`Source file not found. Use default CSV: ${opts.csvPath} or specify --xlsx path.`);
  }

  const sourceFileName = useXlsx ? opts.xlsxPath! : opts.csvPath;
  const mappings = useXlsx ? FIELD_MAPPINGS : CSV_MAPPINGS;
  const matchKeySource = useXlsx ? MATCH_KEY_XLSX : MATCH_KEY_CSV;
  const matchKeySf = MATCH_KEY_SF;  // Name in both XLSX and CSV path
  const countryNameKey = useXlsx ? 'accelins_name' : 'Name';
  const matchKeyLabel = useXlsx ? `${MATCH_KEY_XLSX} → ${MATCH_KEY_SF}` : `${MATCH_KEY_CSV} → ${matchKeySf}`;

  console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║  SF-721: Source vs Salesforce — Country Data Comparison          ║');
  console.log(`║  Source: ${sourceFileName.padEnd(54)}║`);
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // Load environment
  const envPaths = [
    path.resolve(process.cwd(), `src/config/env/.env.${opts.env}`),
    path.resolve(process.cwd(), `.env.${opts.env}`),
  ];
  for (const p of envPaths) { if (fs.existsSync(p)) { dotenv.config({ path: p }); break; } }

  // ── STEP 1: READ SOURCE (CSV or XLSX) ───────────────────────────────
  let sourceRecords: Record<string, string>[];
  if (useXlsx) {
    const xlsxFullPath = path.resolve(process.cwd(), opts.xlsxPath!);
    console.log(`📖 Reading XLSX: ${opts.xlsxPath}`);
    const { records } = await readXlsx(xlsxFullPath);
    sourceRecords = records;
  } else {
    console.log(`📖 Reading CSV: ${opts.csvPath}`);
    sourceRecords = readCsv(csvFullPath);
  }
  console.log(`   ✅ ${sourceRecords.length} records loaded from source\n`);

  // Build lookup by match key
  const sourceMap = new Map<string, { record: Record<string, string>; rowNum: number }>();
  sourceRecords.forEach((rec, idx) => {
    const key = rec[matchKeySource]?.trim();
    if (key) sourceMap.set(key, { record: rec, rowNum: idx + 2 });
  });

  // ── STEP 2: AUTHENTICATE ──────────────────────────────────────────
  console.log('🔐 Authenticating with Salesforce (JWT)...');
  const auth = await SalesforceJWTAuth.authenticate();
  const apiVersion = process.env.SF_API_VERSION || 'v60.0';
  const sfClient = axios.create({
    baseURL: `${auth.instanceUrl}/services/data/${apiVersion}`,
    headers: { Authorization: `Bearer ${auth.accessToken}`, 'Content-Type': 'application/json' },
  });
  console.log('   ✅ Authenticated\n');

  // ── STEP 3: QUERY SALESFORCE ──────────────────────────────────────
  console.log('📡 Querying all Country__c records from Salesforce...');
  const sfRecords = await queryAllCountries(sfClient, mappings);
  console.log(`   ✅ ${sfRecords.length} records from Salesforce\n`);

  const sfMap = new Map<string, Record<string, any>>();
  for (const r of sfRecords) {
    const key = normalise(r[matchKeySf]);
    if (key) sfMap.set(key, r);
  }

  // ── STEP 4: COMPARE ──────────────────────────────────────────────
  console.log('🔍 Comparing records...\n');
  const results: RecordResult[] = [];
  let passCount = 0, failCount = 0, notFoundCount = 0;

  for (const [key, { record: sourceRec, rowNum }] of sourceMap.entries()) {
    const sfRec = sfMap.get(key);
    const countryName = sourceRec[countryNameKey] || key;

    if (!sfRec) {
      results.push({
        rowNumber: rowNum, countryName, countryMasterId: key,
        foundInSF: false, totalFields: 0, matchedFields: 0, failedFields: 0,
        status: 'NOT FOUND', fieldComparisons: [],
      });
      notFoundCount++;
      console.log(`   ❌ Row ${rowNum}: ${countryName} (${key}) — NOT FOUND in SF`);
      continue;
    }

    const comparisons: FieldComparison[] = [];
    let matched = 0, failed = 0;

    for (const mapping of mappings) {
      const sourceVal = sourceRec[mapping.xlsxColumn] ?? '';
      const sfVal = sfRec[mapping.sfApiName];
      const fc = compareField(sourceVal, sfVal, mapping);
      comparisons.push(fc);
      if (fc.match) matched++; else failed++;
    }

    const status = failed === 0 ? 'PASS' : 'FAIL';
    if (status === 'PASS') passCount++; else failCount++;

    results.push({
      rowNumber: rowNum, countryName, countryMasterId: key,
      foundInSF: true, totalFields: mappings.length,
      matchedFields: matched, failedFields: failed,
      status, fieldComparisons: comparisons,
    });

    if (failed > 0) {
      console.log(`   ⚠️  Row ${rowNum}: ${countryName} — ${failed} field mismatch(es)`);
      comparisons.filter(c => !c.match).forEach(c => {
        console.log(`      └─ ${c.label}: ${c.difference}`);
      });
    }
  }

  // SF records not in source
  const sfOnlyKeys = [...sfMap.keys()].filter(k => !sourceMap.has(k));

  // ── STEP 5: CONSOLE SUMMARY ───────────────────────────────────────
  console.log('\n' + '═'.repeat(67));
  console.log('  COMPARISON SUMMARY');
  console.log('═'.repeat(67));
  console.log(`  Source records:              ${sourceRecords.length}`);
  console.log(`  Salesforce records:         ${sfRecords.length}`);
  console.log(`  Matched (PASS):              ${passCount}`);
  console.log(`  Mismatched (FAIL):          ${failCount}`);
  console.log(`  Not Found in SF:             ${notFoundCount}`);
  console.log(`  SF-only (not in source):    ${sfOnlyKeys.length}`);
  if (sfOnlyKeys.length > 0 && sfOnlyKeys.length <= 10) {
    sfOnlyKeys.forEach(k => {
      const r = sfMap.get(k)!;
      console.log(`     → ${r.Name} (${k})`);
    });
  } else if (sfOnlyKeys.length > 10) {
    console.log(`     → ${sfOnlyKeys.length} records (see Excel evidence)`);
  }
  console.log(`  Record Match Rate:          ${((passCount / sourceRecords.length) * 100).toFixed(1)}%`);
  console.log('═'.repeat(67));
  console.log(`  RESULT: ${failCount === 0 && notFoundCount === 0 ? '✅ ALL PASS' : '❌ FAILURES DETECTED'}`);
  console.log('═'.repeat(67) + '\n');

  // ── STEP 6: GENERATE EXCEL ────────────────────────────────────────
  const reportsDir = path.resolve(process.cwd(), 'data/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(reportsDir, `SF-721-UNSD-Source-vs-SF-Evidence-${ts}.xlsx`);

  console.log(`📊 Generating Excel evidence: ${outPath}`);
  await generateEvidence(results, sourceRecords.length, sfRecords.length, outPath, sourceFileName, mappings, matchKeyLabel);
  console.log('   ✅ Excel evidence saved\n');

  if (failCount > 0 || notFoundCount > 0) {
    console.log(`⚠️  ${failCount + notFoundCount} issue(s) found. Review "Mismatches Only" tab.\n`);
  } else {
    console.log('✅ All source records match Salesforce. Evidence ready for QA sign-off.\n');
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
