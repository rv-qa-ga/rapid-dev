/**
 * UNSD Allowed Combinations Loader
 *
 * Loads valid UNSD Region + Sub-region combinations for SF-719 (Country object).
 * Uses framework patterns: path.join(process.cwd(), 'data/excel/...'), ExcelJS, fs.
 *
 * Primary source: data/excel/Allowed Combinations of Region and Sub region.xlsx
 * Fallback / added context: data/excel/CountryDataImport_Second.csv (or CountryDataImport_Second.xlsx)
 *   - Same source as verify-sf721-country-import.ts; provides real country UNSD pairs.
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

const ALLOWED_COMBINATIONS_EXCEL = 'data/excel/Allowed Combinations of Region and Sub region.xlsx';
const COUNTRY_DATA_IMPORT_CSV = 'data/excel/CountryDataImport_Second.csv';
const COUNTRY_DATA_IMPORT_XLSX = 'data/excel/CountryDataImport_Second.xlsx';

export interface UnsdCombination {
  region: string;
  subRegion: string;
}

/**
 * Parse a single CSV line (handles quoted fields)
 */
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

/**
 * Parse CSV file to array of records (aligned with scripts/verify-sf721-country-import.ts)
 */
function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
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

function getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'string') return cell.value.trim();
  if (typeof cell.value === 'number') return cell.value.toString();
  if (cell.value instanceof Date) return cell.value.toISOString().split('T')[0];
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    return (cell.value as any).richText.map((rt: any) => rt.text).join('');
  }
  if (typeof cell.value === 'object' && 'result' in cell.value) return String((cell.value as any).result);
  return String(cell.value).trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    for (const name of possibleNames) {
      if (h === name.toLowerCase() || h.includes(name.toLowerCase())) return i;
    }
  }
  return -1;
}

/**
 * Load allowed UNSD Region + Sub-region combinations.
 * Tries Allowed Combinations Excel first; then CountryDataImport_Second (xlsx or csv) for added context.
 */
export async function loadAllowedUnsdCombinations(excelPath?: string): Promise<UnsdCombination[]> {
  const dataExcelDir = path.join(process.cwd(), 'data', 'excel');
  const primaryPath = excelPath
    ? path.isAbsolute(excelPath)
      ? excelPath
      : path.join(process.cwd(), excelPath)
    : path.join(process.cwd(), ALLOWED_COMBINATIONS_EXCEL);

  if (fs.existsSync(primaryPath)) {
    const combinations = await loadFromExcel(primaryPath);
    if (combinations.length > 0) {
      logger.info(`Loaded ${combinations.length} UNSD allowed combinations from ${path.basename(primaryPath)}`);
      return combinations;
    }
  }

  // Fallback: CountryDataImport_Second (added context) — same source as verify-sf721-country-import
  const csvPath = path.join(process.cwd(), COUNTRY_DATA_IMPORT_CSV);
  const xlsxPath = path.join(process.cwd(), COUNTRY_DATA_IMPORT_XLSX);

  if (fs.existsSync(xlsxPath)) {
    const fromXlsx = await loadCountryUnsdPairsFromExcel(xlsxPath);
    if (fromXlsx.length > 0) {
      logger.info(`Loaded ${fromXlsx.length} UNSD pairs from CountryDataImport_Second.xlsx (added context)`);
      return fromXlsx;
    }
  }

  if (fs.existsSync(csvPath)) {
    const fromCsv = loadCountryUnsdPairsFromCsv(csvPath);
    if (fromCsv.length > 0) {
      logger.info(`Loaded ${fromCsv.length} UNSD pairs from CountryDataImport_Second.csv (added context)`);
      return fromCsv;
    }
  }

  throw new Error(
    `No UNSD combinations found. Place "${path.basename(primaryPath)}" or CountryDataImport_Second.csv/xlsx in data/excel (${dataExcelDir}).`
  );
}

async function loadFromExcel(filePath: string): Promise<UnsdCombination[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet('Sheet1') || workbook.getWorksheet('Allowed Combinations');
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  const regionCol = findColumnIndex(headers, ['UNSD Region', 'Region', 'UNSD_Region__c']);
  const subRegionCol = findColumnIndex(headers, ['UNSD Sub-region', 'Sub-region', 'Subregion', 'UNSD_Sub_region__c']);
  if (regionCol === -1 || subRegionCol === -1) {
    logger.warn(`UNSD Excel missing Region/Sub-region columns. Headers: ${headers.join(', ')}`);
    return [];
  }

  const combinations: UnsdCombination[] = [];
  const seen = new Set<string>();

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const region = getCellValueAsString(row.getCell(regionCol + 1)).trim();
    const subRegion = getCellValueAsString(row.getCell(subRegionCol + 1)).trim();
    if (!region || !subRegion) return;
    const key = `${region}|${subRegion}`;
    if (seen.has(key)) return;
    seen.add(key);
    combinations.push({ region, subRegion });
  });

  return combinations;
}

async function loadCountryUnsdPairsFromExcel(filePath: string): Promise<UnsdCombination[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0] || workbook.getWorksheet(1);
  if (!sheet) return [];

  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  const regionCol = findColumnIndex(headers, ['UNSD_Region__c', 'UNSD Region', 'Region']);
  const subRegionCol = findColumnIndex(headers, ['UNSD_Sub_region__c', 'UNSD Sub-region', 'Sub-region']);
  if (regionCol === -1 || subRegionCol === -1) return [];

  const seen = new Set<string>();
  const combinations: UnsdCombination[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const region = getCellValueAsString(row.getCell(regionCol + 1)).trim();
    const subRegion = getCellValueAsString(row.getCell(subRegionCol + 1)).trim();
    if (!region || !subRegion) return;
    const key = `${region}|${subRegion}`;
    if (seen.has(key)) return;
    seen.add(key);
    combinations.push({ region, subRegion });
  });

  return combinations;
}

function loadCountryUnsdPairsFromCsv(filePath: string): UnsdCombination[] {
  const records = parseCsv(filePath);
  if (records.length === 0) return [];
  const keys = Object.keys(records[0]);
  // Prefer SF/Excel column names (UNSD_Region__c, UNSD_Sub_region__c) over generic "Region"/"Sub-region"
  const regionKey =
    keys.find((k) => k === 'UNSD_Region__c' || (/\bUNSD.*Region\b/i.test(k) && !/Sub/i.test(k))) ||
    keys.find((k) => /^Region$/i.test(k) && !/Sub/i.test(k));
  const subRegionKey =
    keys.find((k) => k === 'UNSD_Sub_region__c') ||
    keys.find((k) => /UNSD.*Sub.*region/i.test(k) || /Sub[_-]?region/i.test(k));
  if (!regionKey || !subRegionKey) return [];

  const seen = new Set<string>();
  const combinations: UnsdCombination[] = [];

  for (const row of records) {
    const region = String(row[regionKey] ?? '').trim();
    const subRegion = String(row[subRegionKey] ?? '').trim();
    if (!region || !subRegion) continue;
    const key = `${region}|${subRegion}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combinations.push({ region, subRegion });
  }

  return combinations;
}

/**
 * Check if a (region, subRegion) pair is in the allowed list (case-insensitive trim compare)
 */
export function isAllowedCombination(combinations: UnsdCombination[], region: string, subRegion: string): boolean {
  const r = (region || '').trim().toLowerCase();
  const s = (subRegion || '').trim().toLowerCase();
  return combinations.some((c) => c.region.trim().toLowerCase() === r && c.subRegion.trim().toLowerCase() === s);
}
