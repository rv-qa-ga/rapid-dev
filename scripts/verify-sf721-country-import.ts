#!/usr/bin/env ts-node
/**
 * SF-721: Verify Country Data Import — CSV-to-Salesforce Comparison
 *
 * Reads CountryDataImport_Second.csv, queries all Country__c records from Salesforce,
 * compares every field on every record, and generates a detailed Excel
 * evidence workbook.
 *
 * Usage:
 *   npx ts-node scripts/verify-sf721-country-import.ts
 *   npx ts-node scripts/verify-sf721-country-import.ts --csv data/excel/CountryDataImport_Second.csv
 *   npx ts-node scripts/verify-sf721-country-import.ts --env qa
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
  csvHeader: string;
  sfApiName: string;
  sfLabel: string;
  dataType: 'text' | 'number' | 'picklist';
}

interface FieldComparison {
  field: string;
  fieldLabel: string;
  csvValue: string;
  sfValue: string;
  match: boolean;
  difference: string;
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
// FIELD MAPPING: CSV header → SF API name → label → type
// Derived from CountryDataImport.csv headers + Country__c object metadata
// ════════════════════════════════════════════════════════════════════════════

const FIELD_MAPPINGS: FieldMapping[] = [
  { csvHeader: 'Name',                       sfApiName: 'Name',                       sfLabel: 'Country Name',            dataType: 'text' },
  { csvHeader: 'Alpha2_Code__c',             sfApiName: 'Alpha2_Code__c',             sfLabel: 'Alpha2 Code',             dataType: 'text' },
  { csvHeader: 'Alpha3_Code__c',             sfApiName: 'Alpha3_Code__c',             sfLabel: 'Alpha3 Code',             dataType: 'text' },
  { csvHeader: 'Accelins_CurrencyCode__c',   sfApiName: 'Accelins_CurrencyCode__c',   sfLabel: 'Currency Code',           dataType: 'text' },
  { csvHeader: 'Country_Master_ID__c',       sfApiName: 'Country_Master_ID__c',       sfLabel: 'Country Master ID',       dataType: 'text' },
  // Dataverse_ID__c excluded from comparison — GUIDs are environment-specific
  // (Prod GUIDs in CSV ≠ QA/Dev GUIDs in Salesforce). Logged for info only.
  { csvHeader: 'Business_Area_Name__c',      sfApiName: 'Business_Area_Name__c',      sfLabel: 'Business Area Name',      dataType: 'picklist' },
  { csvHeader: 'Distribution_Region_Name__c',sfApiName: 'Distribution_Region_Name__c',sfLabel: 'Distribution Region Name', dataType: 'picklist' },
  { csvHeader: 'ISO_Number__c',              sfApiName: 'ISO_Number__c',              sfLabel: 'ISO Numeric Code',        dataType: 'number' },
  { csvHeader: 'Status__c',                  sfApiName: 'Status__c',                  sfLabel: 'Status',                  dataType: 'picklist' },
  { csvHeader: 'UNSD_Region__c',             sfApiName: 'UNSD_Region__c',             sfLabel: 'UNSD Region',             dataType: 'picklist' },
  { csvHeader: 'UNSD_Sub_region__c',         sfApiName: 'UNSD_Sub_region__c',         sfLabel: 'UNSD Sub-region',         dataType: 'picklist' },
];

const MATCH_KEY = 'Country_Master_ID__c';

// ════════════════════════════════════════════════════════════════════════════
// CLI
// ════════════════════════════════════════════════════════════════════════════

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    csvPath: 'data/excel/CountryDataImport_Second.csv',
    env: 'qa',
  };
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--csv' || args[i] === '-c') && args[i + 1]) { opts.csvPath = args[++i]; }
    if ((args[i] === '--env' || args[i] === '-e') && args[i + 1]) { opts.env = args[++i]; }
  }
  return opts;
}

// ════════════════════════════════════════════════════════════════════════════
// CSV PARSER (simple — no quoted-comma fields in this dataset)
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

function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  const records: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? '';
    });
    records.push(record);
  }
  return records;
}

// ════════════════════════════════════════════════════════════════════════════
// FIELD COMPARISON
// ════════════════════════════════════════════════════════════════════════════

function normalise(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function compareField(csvVal: string, sfVal: any, mapping: FieldMapping): FieldComparison {
  const csvNorm = normalise(csvVal);
  const sfNorm = normalise(sfVal);

  let match: boolean;
  let difference = '';

  if (mapping.dataType === 'number') {
    const csvNum = csvNorm === '' ? NaN : Number(csvNorm);
    const sfNum = sfNorm === '' ? NaN : Number(sfNorm);
    match = (isNaN(csvNum) && isNaN(sfNum)) || csvNum === sfNum;
    if (!match) difference = `CSV=${csvNorm}, SF=${sfNorm}`;
  } else {
    match = csvNorm === sfNorm;
    if (!match) {
      if (csvNorm.toLowerCase() === sfNorm.toLowerCase()) {
        difference = `Case mismatch: CSV="${csvNorm}", SF="${sfNorm}"`;
      } else if (csvNorm.replace(/\s+/g, '') === sfNorm.replace(/\s+/g, '')) {
        difference = `Whitespace mismatch: CSV="${csvNorm}", SF="${sfNorm}"`;
      } else {
        difference = `CSV="${csvNorm}", SF="${sfNorm}"`;
      }
    }
  }

  return {
    field: mapping.sfApiName,
    fieldLabel: mapping.sfLabel,
    csvValue: csvNorm,
    sfValue: sfNorm,
    match,
    difference,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SALESFORCE QUERY (handles >2000 records via queryMore)
// ════════════════════════════════════════════════════════════════════════════

async function queryAllCountries(client: AxiosInstance): Promise<Record<string, any>[]> {
  const fields = FIELD_MAPPINGS.map(m => m.sfApiName).join(', ');
  const soql = `SELECT Id, Dataverse_ID__c, ${fields} FROM Country__c ORDER BY Name`;

  let allRecords: Record<string, any>[] = [];
  let response = await client.get('/query/', { params: { q: soql } });
  allRecords = allRecords.concat(response.data.records || []);

  while (response.data.nextRecordsUrl) {
    response = await client.get(response.data.nextRecordsUrl);
    allRecords = allRecords.concat(response.data.records || []);
  }
  return allRecords;
}

// ════════════════════════════════════════════════════════════════════════════
// EXCEL GENERATION
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
  STRIPE_BG: 'FFF2F2F2',
};

function styleHeaderRow(ws: ExcelJS.Worksheet): void {
  const row = ws.getRow(1);
  row.font = { bold: true, size: 11, color: { argb: COLORS.HEADER_FONT } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 30;
}

function statusFill(status: string): Partial<ExcelJS.Fill> {
  if (status === 'PASS') return { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PASS_BG } };
  if (status === 'FAIL') return { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FAIL_BG } };
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.NOT_FOUND_BG } };
}

function statusFont(status: string): Partial<ExcelJS.Font> {
  if (status === 'PASS') return { color: { argb: COLORS.PASS_FONT }, bold: true };
  if (status === 'FAIL') return { color: { argb: COLORS.FAIL_FONT }, bold: true };
  return { color: { argb: COLORS.NOT_FOUND_FONT }, bold: true };
}

async function generateExcel(results: RecordResult[], csvCount: number, sfCount: number, outputPath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SF-721 Country Import Verification';
  wb.created = new Date();

  // ── TAB 1: SUMMARY ──────────────────────────────────────────────────
  const summaryWs = wb.addWorksheet('Summary');

  const totalPass = results.filter(r => r.status === 'PASS').length;
  const totalFail = results.filter(r => r.status === 'FAIL').length;
  const totalNotFound = results.filter(r => r.status === 'NOT FOUND').length;
  const totalFieldChecks = results.reduce((s, r) => s + r.totalFields, 0);
  const totalFieldPass = results.reduce((s, r) => s + r.matchedFields, 0);
  const totalFieldFail = results.reduce((s, r) => s + r.failedFields, 0);

  const summaryData = [
    ['SF-721 Country Data Import — Verification Evidence'],
    [''],
    ['Generated', new Date().toISOString()],
    ['CSV File', 'CountryDataImport_Second.csv'],
    ['Salesforce Object', 'Country__c'],
    ['Match Key', MATCH_KEY],
    ['Fields Compared', FIELD_MAPPINGS.length + ' (Dataverse_ID__c excluded — GUIDs are environment-specific)'],
    [''],
    ['RECORD-LEVEL SUMMARY'],
    ['CSV Records', csvCount],
    ['Salesforce Records', sfCount],
    ['Records Matched (PASS)', totalPass],
    ['Records with Mismatches (FAIL)', totalFail],
    ['Records Not Found in SF', totalNotFound],
    ['Record Match Rate', totalPass > 0 ? `${((totalPass / csvCount) * 100).toFixed(1)}%` : '0%'],
    [''],
    ['FIELD-LEVEL SUMMARY'],
    ['Total Field Checks', totalFieldChecks],
    ['Fields Matched (PASS)', totalFieldPass],
    ['Fields Mismatched (FAIL)', totalFieldFail],
    ['Field Match Rate', totalFieldChecks > 0 ? `${((totalFieldPass / totalFieldChecks) * 100).toFixed(1)}%` : '0%'],
    [''],
    ['OVERALL RESULT', totalFail === 0 && totalNotFound === 0 ? 'ALL PASS' : 'FAILURES DETECTED'],
  ];

  summaryWs.columns = [
    { width: 35 },
    { width: 30 },
  ];

  summaryData.forEach((row, idx) => {
    const excelRow = summaryWs.addRow(row);
    if (idx === 0) {
      excelRow.font = { bold: true, size: 16, color: { argb: COLORS.HEADER_BG } };
    }
    if (row[0] === 'RECORD-LEVEL SUMMARY' || row[0] === 'FIELD-LEVEL SUMMARY') {
      excelRow.font = { bold: true, size: 12 };
      excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
    }
    if (row[0] === 'OVERALL RESULT') {
      excelRow.font = { bold: true, size: 14 };
      const cell = excelRow.getCell(2);
      const isAllPass = String(row[1]).includes('ALL PASS');
      cell.fill = statusFill(isAllPass ? 'PASS' : 'FAIL') as ExcelJS.Fill;
      cell.font = { ...statusFont(isAllPass ? 'PASS' : 'FAIL'), size: 14 };
    }
  });

  // ── TAB 2: ALL RECORDS ───────────────────────────────────────────────
  const detailWs = wb.addWorksheet('All Records - Detail');
  detailWs.columns = [
    { header: 'Row #',              key: 'row',         width: 7 },
    { header: 'Country Name',       key: 'country',     width: 32 },
    { header: 'Country Master ID',  key: 'masterId',    width: 18 },
    { header: 'Record Status',      key: 'recStatus',   width: 14 },
    { header: 'Field Label',        key: 'fieldLabel',  width: 26 },
    { header: 'Field API Name',     key: 'fieldApi',    width: 28 },
    { header: 'CSV Value',          key: 'csvVal',      width: 38 },
    { header: 'Salesforce Value',   key: 'sfVal',       width: 38 },
    { header: 'Field Result',       key: 'fieldResult', width: 12 },
    { header: 'Difference',         key: 'diff',        width: 50 },
  ];
  styleHeaderRow(detailWs);

  for (const rec of results) {
    if (!rec.foundInSF) {
      const row = detailWs.addRow({
        row: rec.rowNumber,
        country: rec.countryName,
        masterId: rec.countryMasterId,
        recStatus: 'NOT FOUND',
        fieldLabel: '—',
        fieldApi: '—',
        csvVal: '—',
        sfVal: '—',
        fieldResult: 'NOT FOUND',
        diff: 'Record does not exist in Salesforce',
      });
      const sCell = row.getCell('recStatus');
      sCell.fill = statusFill('NOT FOUND') as ExcelJS.Fill;
      sCell.font = statusFont('NOT FOUND');
      row.getCell('fieldResult').fill = statusFill('NOT FOUND') as ExcelJS.Fill;
      row.getCell('fieldResult').font = statusFont('NOT FOUND');
      continue;
    }

    for (const fc of rec.fieldComparisons) {
      const row = detailWs.addRow({
        row: rec.rowNumber,
        country: rec.countryName,
        masterId: rec.countryMasterId,
        recStatus: rec.status,
        fieldLabel: fc.fieldLabel,
        fieldApi: fc.field,
        csvVal: fc.csvValue,
        sfVal: fc.sfValue,
        fieldResult: fc.match ? 'PASS' : 'FAIL',
        diff: fc.difference,
      });

      const frCell = row.getCell('fieldResult');
      frCell.fill = statusFill(fc.match ? 'PASS' : 'FAIL') as ExcelJS.Fill;
      frCell.font = statusFont(fc.match ? 'PASS' : 'FAIL');

      const rsCell = row.getCell('recStatus');
      rsCell.fill = statusFill(rec.status) as ExcelJS.Fill;
      rsCell.font = statusFont(rec.status);

      row.getCell('diff').alignment = { wrapText: true, vertical: 'top' };
    }
  }

  detailWs.views = [{ state: 'frozen', ySplit: 1 }];
  detailWs.autoFilter = { from: 'A1', to: `J${detailWs.rowCount}` };

  // ── TAB 3: MISMATCHES ONLY ──────────────────────────────────────────
  const failWs = wb.addWorksheet('Mismatches Only');
  failWs.columns = [
    { header: 'Row #',              key: 'row',         width: 7 },
    { header: 'Country Name',       key: 'country',     width: 32 },
    { header: 'Country Master ID',  key: 'masterId',    width: 18 },
    { header: 'Record Status',      key: 'recStatus',   width: 14 },
    { header: 'Field Label',        key: 'fieldLabel',  width: 26 },
    { header: 'Field API Name',     key: 'fieldApi',    width: 28 },
    { header: 'CSV Value',          key: 'csvVal',      width: 38 },
    { header: 'Salesforce Value',   key: 'sfVal',       width: 38 },
    { header: 'Field Result',       key: 'fieldResult', width: 12 },
    { header: 'Difference',         key: 'diff',        width: 50 },
  ];
  styleHeaderRow(failWs);

  let failRowCount = 0;
  for (const rec of results) {
    if (rec.status === 'NOT FOUND') {
      const row = failWs.addRow({
        row: rec.rowNumber,
        country: rec.countryName,
        masterId: rec.countryMasterId,
        recStatus: 'NOT FOUND',
        fieldLabel: '—',
        fieldApi: '—',
        csvVal: '—',
        sfVal: '—',
        fieldResult: 'NOT FOUND',
        diff: 'Record does not exist in Salesforce',
      });
      row.getCell('recStatus').fill = statusFill('NOT FOUND') as ExcelJS.Fill;
      row.getCell('recStatus').font = statusFont('NOT FOUND');
      row.getCell('fieldResult').fill = statusFill('NOT FOUND') as ExcelJS.Fill;
      row.getCell('fieldResult').font = statusFont('NOT FOUND');
      failRowCount++;
      continue;
    }

    for (const fc of rec.fieldComparisons.filter(f => !f.match)) {
      const row = failWs.addRow({
        row: rec.rowNumber,
        country: rec.countryName,
        masterId: rec.countryMasterId,
        recStatus: 'FAIL',
        fieldLabel: fc.fieldLabel,
        fieldApi: fc.field,
        csvVal: fc.csvValue,
        sfVal: fc.sfValue,
        fieldResult: 'FAIL',
        diff: fc.difference,
      });
      row.getCell('recStatus').fill = statusFill('FAIL') as ExcelJS.Fill;
      row.getCell('recStatus').font = statusFont('FAIL');
      row.getCell('fieldResult').fill = statusFill('FAIL') as ExcelJS.Fill;
      row.getCell('fieldResult').font = statusFont('FAIL');
      row.getCell('diff').alignment = { wrapText: true, vertical: 'top' };
      failRowCount++;
    }
  }

  if (failRowCount === 0) {
    failWs.addRow({ row: '', country: '', masterId: '', recStatus: '', fieldLabel: '', fieldApi: '', csvVal: '', sfVal: '', fieldResult: 'ALL PASS', diff: 'No mismatches found — all fields on all records match.' });
    const allPassCell = failWs.getRow(2).getCell('fieldResult');
    allPassCell.fill = statusFill('PASS') as ExcelJS.Fill;
    allPassCell.font = { ...statusFont('PASS'), size: 12 };
  }

  failWs.views = [{ state: 'frozen', ySplit: 1 }];

  // ── TAB 4: RECORD SUMMARY ──────────────────────────────────────────
  const recWs = wb.addWorksheet('Record Summary');
  recWs.columns = [
    { header: 'Row #',             key: 'row',        width: 7 },
    { header: 'Country Name',      key: 'country',    width: 32 },
    { header: 'Country Master ID', key: 'masterId',   width: 18 },
    { header: 'Found in SF',       key: 'found',      width: 12 },
    { header: 'Fields Checked',    key: 'total',      width: 14 },
    { header: 'Fields Matched',    key: 'matched',    width: 14 },
    { header: 'Fields Failed',     key: 'failed',     width: 14 },
    { header: 'Result',            key: 'result',     width: 12 },
  ];
  styleHeaderRow(recWs);

  for (const rec of results) {
    const row = recWs.addRow({
      row: rec.rowNumber,
      country: rec.countryName,
      masterId: rec.countryMasterId,
      found: rec.foundInSF ? 'Yes' : 'No',
      total: rec.totalFields,
      matched: rec.matchedFields,
      failed: rec.failedFields,
      result: rec.status,
    });
    const rCell = row.getCell('result');
    rCell.fill = statusFill(rec.status) as ExcelJS.Fill;
    rCell.font = statusFont(rec.status);
  }

  recWs.views = [{ state: 'frozen', ySplit: 1 }];
  recWs.autoFilter = { from: 'A1', to: `H${recWs.rowCount}` };

  // ── SAVE ────────────────────────────────────────────────────────────
  await wb.xlsx.writeFile(outputPath);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const opts = parseArgs();

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  SF-721: Country Data Import — CSV vs Salesforce Comparison  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Load environment
  const envPaths = [
    path.resolve(process.cwd(), `src/config/env/.env.${opts.env}`),
    path.resolve(process.cwd(), `.env.${opts.env}`),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) { dotenv.config({ path: p }); break; }
  }

  // ── STEP 1: READ CSV ────────────────────────────────────────────────
  const csvFullPath = path.resolve(process.cwd(), opts.csvPath);
  if (!fs.existsSync(csvFullPath)) {
    throw new Error(`CSV file not found: ${csvFullPath}`);
  }

  console.log(`📖 Reading CSV: ${opts.csvPath}`);
  const csvRecords = parseCsv(csvFullPath);
  console.log(`   ✅ ${csvRecords.length} records loaded from CSV\n`);

  // Build CSV lookup by match key
  const csvMap = new Map<string, { record: Record<string, string>; rowNum: number }>();
  csvRecords.forEach((rec, idx) => {
    const key = (rec[MATCH_KEY] || '').trim();
    if (key) csvMap.set(key, { record: rec, rowNum: idx + 2 });
  });

  // ── STEP 2: AUTHENTICATE TO SALESFORCE ──────────────────────────────
  console.log('🔐 Authenticating with Salesforce (JWT)...');
  const authResult = await SalesforceJWTAuth.authenticate();
  const apiVersion = process.env.SF_API_VERSION || 'v60.0';

  const sfClient = axios.create({
    baseURL: `${authResult.instanceUrl}/services/data/${apiVersion}`,
    headers: { Authorization: `Bearer ${authResult.accessToken}`, 'Content-Type': 'application/json' },
  });
  console.log('   ✅ Authenticated\n');

  // ── STEP 3: QUERY ALL COUNTRY__C RECORDS ────────────────────────────
  console.log('📡 Querying all Country__c records from Salesforce...');
  const sfRecords = await queryAllCountries(sfClient);
  console.log(`   ✅ ${sfRecords.length} records returned from Salesforce\n`);

  // Build SF lookup by match key
  const sfMap = new Map<string, Record<string, any>>();
  for (const rec of sfRecords) {
    const key = normalise(rec[MATCH_KEY]);
    if (key) sfMap.set(key, rec);
  }

  // ── STEP 4: COMPARE EACH CSV ROW ───────────────────────────────────
  console.log('🔍 Comparing records...\n');
  const results: RecordResult[] = [];
  let passCount = 0;
  let failCount = 0;
  let notFoundCount = 0;

  for (const [key, { record: csvRec, rowNum }] of csvMap.entries()) {
    const sfRec = sfMap.get(key);
    const countryName = csvRec['Name'] || '';

    if (!sfRec) {
      results.push({
        rowNumber: rowNum,
        countryName,
        countryMasterId: key,
        foundInSF: false,
        totalFields: 0,
        matchedFields: 0,
        failedFields: 0,
        status: 'NOT FOUND',
        fieldComparisons: [],
      });
      notFoundCount++;
      console.log(`   ❌ Row ${rowNum}: ${countryName} (${key}) — NOT FOUND in Salesforce`);
      continue;
    }

    const comparisons: FieldComparison[] = [];
    let matched = 0;
    let failed = 0;

    for (const mapping of FIELD_MAPPINGS) {
      const csvVal = csvRec[mapping.csvHeader] ?? '';
      const sfVal = sfRec[mapping.sfApiName];
      const fc = compareField(csvVal, sfVal, mapping);
      comparisons.push(fc);
      if (fc.match) matched++; else failed++;
    }

    const status = failed === 0 ? 'PASS' : 'FAIL';
    if (status === 'PASS') passCount++; else failCount++;

    results.push({
      rowNumber: rowNum,
      countryName,
      countryMasterId: key,
      foundInSF: true,
      totalFields: FIELD_MAPPINGS.length,
      matchedFields: matched,
      failedFields: failed,
      status,
      fieldComparisons: comparisons,
    });

    if (failed > 0) {
      console.log(`   ⚠️  Row ${rowNum}: ${countryName} — ${failed} field mismatch(es)`);
      comparisons.filter(c => !c.match).forEach(c => {
        console.log(`      └─ ${c.fieldLabel}: ${c.difference}`);
      });
    }
  }

  // Check for SF records not in CSV
  const sfOnlyKeys = [...sfMap.keys()].filter(k => !csvMap.has(k));

  // ── STEP 5: PRINT CONSOLE SUMMARY ──────────────────────────────────
  console.log('\n' + '═'.repeat(65));
  console.log('  COMPARISON SUMMARY');
  console.log('═'.repeat(65));
  console.log(`  CSV records:                ${csvRecords.length}`);
  console.log(`  Salesforce records:         ${sfRecords.length}`);
  console.log(`  Matched (PASS):             ${passCount}`);
  console.log(`  Mismatched (FAIL):          ${failCount}`);
  console.log(`  Not Found in SF:            ${notFoundCount}`);
  console.log(`  SF-only (not in CSV):       ${sfOnlyKeys.length}`);
  console.log(`  Record Match Rate:          ${((passCount / csvRecords.length) * 100).toFixed(1)}%`);
  console.log('═'.repeat(65));
  console.log(`  RESULT: ${failCount === 0 && notFoundCount === 0 ? '✅ ALL PASS' : '❌ FAILURES DETECTED'}`);
  console.log('═'.repeat(65) + '\n');

  // ── STEP 6: GENERATE EXCEL ─────────────────────────────────────────
  const reportsDir = path.resolve(process.cwd(), 'data/reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const excelPath = path.join(reportsDir, `SF-721-Country-Import-Evidence-${timestamp}.xlsx`);

  console.log(`📊 Generating Excel evidence: ${excelPath}`);
  await generateExcel(results, csvRecords.length, sfRecords.length, excelPath);
  console.log(`   ✅ Excel evidence saved\n`);

  if (failCount > 0 || notFoundCount > 0) {
    console.log(`⚠️  ${failCount + notFoundCount} issue(s) found. Review the "Mismatches Only" tab in the Excel.\n`);
  } else {
    console.log('✅ All CSV records match Salesforce. Evidence file ready for QA sign-off.\n');
  }
}

main().catch((err) => {
  console.error(`\n❌ Fatal error: ${err.message}`);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
