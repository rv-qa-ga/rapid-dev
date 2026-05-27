#!/usr/bin/env ts-node
/**
 * UNSD Region and Sub-region Report — Expected vs Salesforce (per Country)
 *
 * Uses Salesforce API as QA MRD User to query all Country__c records and compares
 * UNSD Region and UNSD Sub Region against the expected source (CountryDataImport_Second CSV/Excel).
 * Produces an Excel report: for each country, expected vs actual and match status.
 *
 * Expected source columns: "UNSD Region", "UNSD Sub Region" (or UNSD_Region__c, UNSD_Sub_region__c).
 * Match key: Country_Master_ID__c or Name.
 *
 * Usage:
 *   SF_USE_QA_MRD_FOR_API=true npx ts-node scripts/check-unsd-region-subregion-report.ts
 *   SF_USE_QA_MRD_FOR_API=true npx ts-node scripts/check-unsd-region-subregion-report.ts --csv data/excel/CountryDataImport_Second.csv
 *   SF_USE_QA_MRD_FOR_API=true npx ts-node scripts/check-unsd-region-subregion-report.ts --xlsx data/excel/CountryDataImport_Second.xlsx --env qa
 *   npm run report:UNSD
 *
 * Requires: SF_QAMRDUSER_JWT_USERNAME (and JWT cert) when using QA MRD User.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import ExcelJS from 'exceljs';
import axios, { AxiosInstance } from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

interface ExpectedRow {
  matchKey: string; // Country_Master_ID__c or Name
  name: string;
  expectedRegion: string;
  expectedSubRegion: string;
  sourceRow?: number;
}

interface ReportRow {
  countryName: string;
  countryId: string;
  countryMasterId: string;
  expectedRegion: string;
  expectedSubRegion: string;
  actualRegion: string;
  actualSubRegion: string;
  regionMatch: boolean;
  subRegionMatch: boolean;
  bothMatch: boolean;
  validPerAllowedList: 'Yes' | 'No' | 'N/A'; // vs "Allowed Combinations of Region and Sub region.xlsx"
  notes: string;
}

const ALLOWED_COMBINATIONS_PATH = 'data/excel/Allowed Combinations of Region and Sub region.xlsx';

// ════════════════════════════════════════════════════════════════════════════
// CLI
// ════════════════════════════════════════════════════════════════════════════

function parseArgs(): { csvPath?: string; xlsxPath?: string; env: string; outputDir: string } {
  const args = process.argv.slice(2);
  const opts: { csvPath?: string; xlsxPath?: string; env: string; outputDir: string } = {
    env: 'qa',
    outputDir: 'reports',
  };
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--csv' || args[i] === '-c') && args[i + 1]) opts.csvPath = args[++i];
    if ((args[i] === '--xlsx' || args[i] === '-x') && args[i + 1]) opts.xlsxPath = args[++i];
    if ((args[i] === '--env' || args[i] === '-e') && args[i + 1]) opts.env = args[++i];
    if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) opts.outputDir = args[++i];
  }
  return opts;
}

// ════════════════════════════════════════════════════════════════════════════
// LOAD EXPECTED (CSV or Excel)
// ════════════════════════════════════════════════════════════════════════════

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
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

function loadExpectedFromCsv(csvPath: string): ExpectedRow[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);
  const nameCol = headers.findIndex((h) => /^Name$/i.test(h));
  const masterIdCol = headers.findIndex((h) => /Country_Master_ID__c/i.test(h));
  const regionCol = headers.findIndex((h) =>
    /UNSD_Region__c/i.test(h) || /UNSD\s*Region/i.test(h.replace(/_/g, ' '))
  );
  const subRegionCol = headers.findIndex((h) =>
    /UNSD_Sub_region__c/i.test(h) || /UNSD\s*Sub\s*Region/i.test(h.replace(/_/g, ' '))
  );
  if (nameCol === -1 || (regionCol === -1 && subRegionCol === -1)) {
    throw new Error(`CSV must have Name and UNSD Region / UNSD Sub Region columns. Headers: ${headers.join(', ')}`);
  }
  const rows: ExpectedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const name = (values[nameCol] ?? '').trim();
    const masterId = masterIdCol >= 0 ? (values[masterIdCol] ?? '').trim() : '';
    const matchKey = masterId || name || `row-${i + 2}`;
    const expectedRegion = regionCol >= 0 ? (values[regionCol] ?? '').trim() : '';
    const expectedSubRegion = subRegionCol >= 0 ? (values[subRegionCol] ?? '').trim() : '';
    rows.push({
      matchKey,
      name,
      expectedRegion,
      expectedSubRegion,
      sourceRow: i + 2,
    });
  }
  return rows;
}

async function loadExpectedFromExcel(xlsxPath: string): Promise<ExpectedRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet(1);
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
    headers[colNumber - 1] = (cell.value ?? '').toString().trim();
  });
  const getCell = (row: any, colIndex: number): string => {
    const cell = row.getCell(colIndex + 1);
    const v = cell?.value;
    if (v == null) return '';
    return typeof v === 'string' ? v.trim() : String(v).trim();
  };
  const nameCol = headers.findIndex((h) => /^Name$/i.test(h));
  const masterIdCol = headers.findIndex((h) => /Country_Master_ID__c/i.test(h));
  const regionCol = headers.findIndex((h) =>
    /UNSD_Region__c/i.test(h) || /UNSD\s*Region/i.test(h.replace(/_/g, ' '))
  );
  const subRegionCol = headers.findIndex((h) =>
    /UNSD_Sub_region__c/i.test(h) || /UNSD\s*Sub\s*Region/i.test(h.replace(/_/g, ' '))
  );
  if (nameCol === -1) {
    throw new Error(`Excel must have a Name column. Headers: ${headers.join(', ')}`);
  }
  const rows: ExpectedRow[] = [];
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const name = getCell(row, nameCol);
    const masterId = masterIdCol >= 0 ? getCell(row, masterIdCol) : '';
    const matchKey = masterId || name || `row-${rowNumber}`;
    const expectedRegion = regionCol >= 0 ? getCell(row, regionCol) : '';
    const expectedSubRegion = subRegionCol >= 0 ? getCell(row, subRegionCol) : '';
    rows.push({
      matchKey,
      name,
      expectedRegion,
      expectedSubRegion,
      sourceRow: rowNumber,
    });
  });
  return rows;
}

// ════════════════════════════════════════════════════════════════════════════
// LOAD ALLOWED COMBINATIONS (from "Allowed Combinations of Region and Sub region.xlsx" only)
// ════════════════════════════════════════════════════════════════════════════

interface UnsdCombo {
  region: string;
  subRegion: string;
}

function findCol(headers: string[], names: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    for (const n of names) {
      if (h === n.toLowerCase() || h.includes(n.toLowerCase().replace(/_/g, ' '))) return i;
    }
  }
  return -1;
}

async function loadAllowedCombinationsOnly(): Promise<UnsdCombo[]> {
  const fullPath = path.resolve(process.cwd(), ALLOWED_COMBINATIONS_PATH);
  if (!fs.existsSync(fullPath)) return [];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(fullPath);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet('Sheet1') || workbook.getWorksheet('Allowed Combinations');
  if (!sheet) return [];
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
    headers[colNumber - 1] = (cell.value ?? '').toString().trim();
  });
  const regionCol = findCol(headers, ['UNSD Region', 'Region', 'UNSD_Region__c']);
  const subRegionCol = findCol(headers, ['UNSD Sub-region', 'UNSD Sub Region', 'Sub-region', 'Subregion', 'UNSD_Sub_region__c']);
  if (regionCol === -1 || subRegionCol === -1) return [];
  const combos: UnsdCombo[] = [];
  const seen = new Set<string>();
  sheet.eachRow((row: any, rowNumber: number) => {
    if (rowNumber === 1) return;
    const region = (row.getCell(regionCol + 1)?.value ?? '').toString().trim();
    const subRegion = (row.getCell(subRegionCol + 1)?.value ?? '').toString().trim();
    if (!region || !subRegion) return;
    const key = `${region}|${subRegion}`;
    if (seen.has(key)) return;
    seen.add(key);
    combos.push({ region, subRegion });
  });
  return combos;
}

function isAllowed(combos: UnsdCombo[], region: string, subRegion: string): boolean {
  const r = (region ?? '').trim().toLowerCase();
  const s = (subRegion ?? '').trim().toLowerCase();
  if (!r || !s) return false;
  return combos.some((c) => c.region.trim().toLowerCase() === r && c.subRegion.trim().toLowerCase() === s);
}

// ════════════════════════════════════════════════════════════════════════════
// SALESFORCE QUERY (QA MRD User)
// ════════════════════════════════════════════════════════════════════════════

async function queryAllCountries(client: AxiosInstance): Promise<Record<string, any>[]> {
  const soql = `SELECT Id, Name, Country_Master_ID__c, UNSD_Region__c, UNSD_Sub_region__c FROM Country__c ORDER BY Name`;
  let allRecords: Record<string, any>[] = [];
  let response = await client.get('/query/', { params: { q: soql } });
  allRecords = allRecords.concat(response.data.records || []);

  while (response.data.nextRecordsUrl) {
    response = await client.get(response.data.nextRecordsUrl);
    allRecords = allRecords.concat(response.data.records || []);
  }
  return allRecords;
}

function normalise(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function valuesEqual(a: string, b: string): boolean {
  const x = normalise(a).toLowerCase();
  const y = normalise(b).toLowerCase();
  if (x === y) return true;
  return x.replace(/\s+/g, ' ') === y.replace(/\s+/g, ' ');
}

// ════════════════════════════════════════════════════════════════════════════
// EXCEL REPORT
// ════════════════════════════════════════════════════════════════════════════

const COLORS = {
  HEADER_BG: 'FF0B5394',
  HEADER_FONT: 'FFFFFFFF',
  PASS_BG: 'FFC6EFCE',
  PASS_FONT: 'FF006100',
  FAIL_BG: 'FFFFC7CE',
  FAIL_FONT: 'FF9C0006',
  WARN_BG: 'FFFFEB9C',
  WARN_FONT: 'FF9C6500',
};

function styleHeaderRow(ws: ExcelJS.Worksheet): void {
  const row = ws.getRow(1);
  row.font = { bold: true, size: 11, color: { argb: COLORS.HEADER_FONT } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
}

async function writeReportExcel(rows: ReportRow[], outputPath: string, expectedCount: number, sfCount: number): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'UNSD Region & Sub-region Report (QA MRD User)';
  wb.created = new Date();

  const bothMatch = rows.filter((r) => r.bothMatch).length;
  const regionMismatch = rows.filter((r) => r.regionMatch === false).length;
  const subRegionMismatch = rows.filter((r) => r.subRegionMatch === false).length;
  const notFound = rows.filter((r) => r.notes.includes('Not found')).length;

  // Summary sheet
  const summaryWs = wb.addWorksheet('Summary');
  summaryWs.addRow(['UNSD Region & Sub-region — Expected vs Salesforce (per Country)']);
  summaryWs.addRow([]);
  summaryWs.addRow(['Generated', new Date().toISOString()]);
  summaryWs.addRow(['API User', 'QA MRD User (SF_USE_QA_MRD_FOR_API=true)']);
  summaryWs.addRow(['Expected source', 'CountryDataImport_Second.csv / .xlsx']);
  summaryWs.addRow([]);
  summaryWs.addRow(['Expected records', expectedCount]);
  summaryWs.addRow(['Salesforce Country__c records', sfCount]);
  summaryWs.addRow(['Report rows', rows.length]);
  summaryWs.addRow(['Both Region & Sub-region match', bothMatch]);
  summaryWs.addRow(['Region mismatch count', regionMismatch]);
  summaryWs.addRow(['Sub-region mismatch count', subRegionMismatch]);
  summaryWs.addRow(['Expected country not in SF', notFound]);
  const validPerAllowed = rows.filter((r) => r.validPerAllowedList === 'Yes').length;
  const invalidPerAllowed = rows.filter((r) => r.validPerAllowedList === 'No').length;
  const naPerAllowed = rows.filter((r) => r.validPerAllowedList === 'N/A').length;
  summaryWs.addRow([]);
  summaryWs.addRow(['Allowed Combinations (Region + Sub-region)']);
  summaryWs.addRow(['Valid per allowed list', validPerAllowed]);
  summaryWs.addRow(['Invalid per allowed list', invalidPerAllowed]);
  summaryWs.addRow(['N/A (no SF data or list not used)', naPerAllowed]);
  summaryWs.addRow([]);
  summaryWs.addRow(['Overall', bothMatch === rows.length && notFound === 0 ? 'ALL MATCH' : 'MISMATCHES DETECTED']);
  summaryWs.getColumn(1).width = 32;
  summaryWs.getColumn(2).width = 28;

  // Detail sheet
  const detailWs = wb.addWorksheet('Detail');
  detailWs.columns = [
    { header: 'Country Name', key: 'countryName', width: 32 },
    { header: 'Country Id', key: 'countryId', width: 20 },
    { header: 'Country Master ID', key: 'countryMasterId', width: 18 },
    { header: 'Expected UNSD Region', key: 'expectedRegion', width: 22 },
    { header: 'Expected UNSD Sub Region', key: 'expectedSubRegion', width: 26 },
    { header: 'Actual UNSD Region', key: 'actualRegion', width: 22 },
    { header: 'Actual UNSD Sub Region', key: 'actualSubRegion', width: 26 },
    { header: 'Region Match', key: 'regionMatch', width: 12 },
    { header: 'Sub Region Match', key: 'subRegionMatch', width: 14 },
    { header: 'Both Match', key: 'bothMatch', width: 10 },
    { header: 'Valid per Allowed List', key: 'validPerAllowedList', width: 20 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  styleHeaderRow(detailWs);

  for (const r of rows) {
    const row = detailWs.addRow({
      countryName: r.countryName,
      countryId: r.countryId,
      countryMasterId: r.countryMasterId,
      expectedRegion: r.expectedRegion,
      expectedSubRegion: r.expectedSubRegion,
      actualRegion: r.actualRegion,
      actualSubRegion: r.actualSubRegion,
      regionMatch: r.regionMatch ? 'Yes' : 'No',
      subRegionMatch: r.subRegionMatch ? 'Yes' : 'No',
      bothMatch: r.bothMatch ? 'Yes' : 'No',
      validPerAllowedList: r.validPerAllowedList,
      notes: r.notes,
    });
    if (!r.bothMatch) {
      [8, 9, 10].forEach((col) => {
        row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FAIL_BG } };
        row.getCell(col).font = { color: { argb: COLORS.FAIL_FONT } };
      });
    }
    if (r.validPerAllowedList === 'No') {
      row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FAIL_BG } };
      row.getCell(11).font = { color: { argb: COLORS.FAIL_FONT } };
    }
  }
  detailWs.views = [{ state: 'frozen', ySplit: 1 }];
  detailWs.autoFilter = { from: 'A1', to: `L${detailWs.rowCount}` };

  await wb.xlsx.writeFile(outputPath);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const opts = parseArgs();

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  UNSD Region & Sub-region — Expected vs Salesforce (QA MRD)     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // Load env
  const envPaths = [
    path.resolve(process.cwd(), `src/config/env/.env.${opts.env}`),
    path.resolve(process.cwd(), `.env.${opts.env}`),
    path.resolve(process.cwd(), '.env'),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
      break;
    }
  }

  // Force QA MRD User for API
  const useQaMrd = process.env.SF_USE_QA_MRD_FOR_API === 'true';
  const qaMrdUsername = process.env.SF_QAMRDUSER_JWT_USERNAME;
  if (!useQaMrd || !qaMrdUsername) {
    console.log('⚠️  QA MRD User: Set SF_USE_QA_MRD_FOR_API=true and SF_QAMRDUSER_JWT_USERNAME in .env.qa');
    console.log('   Proceeding with default JWT user if not set.\n');
  }
  const usernameOverride = useQaMrd && qaMrdUsername ? qaMrdUsername : undefined;
  if (usernameOverride) {
    console.log(`🔐 Using QA MRD User for API: ${usernameOverride}`);
  }

  // Load expected
  let expectedRows: ExpectedRow[] = [];
  if (opts.xlsxPath) {
    const fullPath = path.resolve(process.cwd(), opts.xlsxPath);
    if (!fs.existsSync(fullPath)) throw new Error(`Excel not found: ${fullPath}`);
    expectedRows = await loadExpectedFromExcel(fullPath);
    console.log(`📖 Loaded ${expectedRows.length} expected rows from Excel: ${opts.xlsxPath}\n`);
  } else {
    const csvPath = opts.csvPath || 'data/excel/CountryDataImport_Second.csv';
    const fullPath = path.resolve(process.cwd(), csvPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Expected file not found: ${fullPath}. Use --csv or --xlsx to point to CountryDataImport_Second.`);
    }
    expectedRows = loadExpectedFromCsv(fullPath);
    console.log(`📖 Loaded ${expectedRows.length} expected rows from CSV: ${csvPath}\n`);
  }
  if (expectedRows.length === 0) {
    throw new Error('No expected rows loaded. Check CSV/Excel has Name and UNSD Region / UNSD Sub Region columns.');
  }

  // Authenticate as QA MRD User (or default)
  console.log('🔐 Authenticating with Salesforce (JWT)...');
  const authResult = await SalesforceJWTAuth.authenticate(usernameOverride);
  const apiVersion = process.env.SF_API_VERSION || 'v60.0';
  const sfClient = axios.create({
    baseURL: `${authResult.instanceUrl}/services/data/${apiVersion}`,
    headers: { Authorization: `Bearer ${authResult.accessToken}`, 'Content-Type': 'application/json' },
  });
  console.log('   ✅ Authenticated\n');

  // Load Allowed Combinations (for "Valid per Allowed List" check)
  const allowedCombos = await loadAllowedCombinationsOnly();
  if (allowedCombos.length > 0) {
    console.log(`📋 Loaded ${allowedCombos.length} allowed Region+Sub-region combinations from "${ALLOWED_COMBINATIONS_PATH}"\n`);
  } else {
    console.log(`⚠️  Allowed list not found or empty (${ALLOWED_COMBINATIONS_PATH}). "Valid per Allowed List" will be N/A.\n`);
  }

  // Query all Country__c
  console.log('📡 Querying all Country__c records (UNSD Region, UNSD Sub-region)...');
  const sfRecords = await queryAllCountries(sfClient);
  console.log(`   ✅ ${sfRecords.length} records returned from Salesforce\n`);

  const sfByMasterId = new Map<string, Record<string, any>>();
  const sfByName = new Map<string, Record<string, any>>();
  for (const rec of sfRecords) {
    const mid = normalise(rec.Country_Master_ID__c);
    const name = normalise(rec.Name);
    if (mid) sfByMasterId.set(mid, rec);
    if (name) sfByName.set(name.toLowerCase(), rec);
  }

  // Build report rows
  const reportRows: ReportRow[] = [];
  for (const exp of expectedRows) {
    const sfRec =
      (exp.matchKey && sfByMasterId.get(exp.matchKey)) ||
      (exp.name && sfByName.get(exp.name.toLowerCase())) ||
      sfByMasterId.get(exp.name) ||
      null;

    if (!sfRec) {
      reportRows.push({
        countryName: exp.name,
        countryId: '',
        countryMasterId: exp.matchKey,
        expectedRegion: exp.expectedRegion,
        expectedSubRegion: exp.expectedSubRegion,
        actualRegion: '',
        actualSubRegion: '',
        regionMatch: false,
        subRegionMatch: false,
        bothMatch: false,
        validPerAllowedList: 'N/A',
        notes: 'Expected country not found in Salesforce',
      });
      continue;
    }

    const actualRegion = normalise(sfRec.UNSD_Region__c);
    const actualSubRegion = normalise(sfRec.UNSD_Sub_region__c);
    const regionMatch = valuesEqual(exp.expectedRegion, actualRegion);
    const subRegionMatch = valuesEqual(exp.expectedSubRegion, actualSubRegion);
    const bothMatch = regionMatch && subRegionMatch;
    const notes: string[] = [];
    if (!regionMatch) notes.push(`Region: expected "${exp.expectedRegion}", actual "${actualRegion}"`);
    if (!subRegionMatch) notes.push(`Sub-region: expected "${exp.expectedSubRegion}", actual "${actualSubRegion}"`);
    const validPerAllowedList: 'Yes' | 'No' | 'N/A' =
      allowedCombos.length === 0 ? 'N/A' : isAllowed(allowedCombos, actualRegion, actualSubRegion) ? 'Yes' : 'No';

    reportRows.push({
      countryName: exp.name || sfRec.Name,
      countryId: sfRec.Id || '',
      countryMasterId: normalise(sfRec.Country_Master_ID__c),
      expectedRegion: exp.expectedRegion,
      expectedSubRegion: exp.expectedSubRegion,
      actualRegion,
      actualSubRegion,
      regionMatch,
      subRegionMatch,
      bothMatch,
      validPerAllowedList,
      notes: notes.length > 0 ? notes.join('; ') : 'Match',
    });
  }

  // Add any SF-only countries (no expected row)
  const expectedKeys = new Set(expectedRows.map((e) => e.matchKey));
  const expectedNames = new Set(expectedRows.map((e) => e.name.toLowerCase()));
  for (const rec of sfRecords) {
    const mid = normalise(rec.Country_Master_ID__c);
    const name = normalise(rec.Name).toLowerCase();
    if (mid && expectedKeys.has(mid)) continue;
    if (name && expectedNames.has(name)) continue;
    const actualR = normalise(rec.UNSD_Region__c);
    const actualS = normalise(rec.UNSD_Sub_region__c);
    const validPerAllowedList: 'Yes' | 'No' | 'N/A' =
      allowedCombos.length === 0 ? 'N/A' : isAllowed(allowedCombos, actualR, actualS) ? 'Yes' : 'No';
    reportRows.push({
      countryName: rec.Name,
      countryId: rec.Id,
      countryMasterId: mid,
      expectedRegion: '',
      expectedSubRegion: '',
      actualRegion: actualR,
      actualSubRegion: actualS,
      regionMatch: true,
      subRegionMatch: true,
      bothMatch: true,
      validPerAllowedList,
      notes: 'In Salesforce only (no expected row)',
    });
  }

  // Summary
  const bothMatchCount = reportRows.filter((r) => r.bothMatch && !r.notes.includes('not found')).length;
  const mismatchCount = reportRows.filter((r) => !r.bothMatch).length;
  const notFoundCount = reportRows.filter((r) => r.notes.includes('Expected country not found')).length;

  const validPerAllowedCount = reportRows.filter((r) => r.validPerAllowedList === 'Yes').length;
  const invalidPerAllowedCount = reportRows.filter((r) => r.validPerAllowedList === 'No').length;

  console.log('═'.repeat(60));
  console.log('  UNSD REPORT SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Expected rows:                ${expectedRows.length}`);
  console.log(`  Salesforce Country__c:        ${sfRecords.length}`);
  console.log(`  Both Region & Sub-region OK:  ${bothMatchCount}`);
  console.log(`  Mismatches:                   ${mismatchCount}`);
  console.log(`  Expected not in SF:           ${notFoundCount}`);
  if (allowedCombos.length > 0) {
    console.log(`  Valid per Allowed List:        ${validPerAllowedCount}`);
    console.log(`  Invalid per Allowed List:     ${invalidPerAllowedCount}`);
  }
  console.log('═'.repeat(60));
  console.log(`  RESULT: ${mismatchCount === 0 && notFoundCount === 0 ? '✅ ALL MATCH' : '❌ MISMATCHES DETECTED'}`);
  if (allowedCombos.length > 0 && invalidPerAllowedCount > 0) {
    console.log(`  ⚠️  ${invalidPerAllowedCount} country/countries have Region+Sub-region not in "Allowed Combinations".`);
  }
  console.log('═'.repeat(60) + '\n');

  const outDir = path.resolve(process.cwd(), opts.outputDir);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const excelPath = path.join(outDir, `UNSD-Region-Subregion-Report-${timestamp}.xlsx`);

  console.log(`📊 Writing Excel report: ${excelPath}`);
  await writeReportExcel(reportRows, excelPath, expectedRows.length, sfRecords.length);
  console.log('   ✅ Done.\n');

  if (mismatchCount > 0 || notFoundCount > 0) {
    console.log(`⚠️  Open the "Detail" sheet for per-country expected vs actual UNSD Region and Sub Region.\n`);
  }
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
