/**
 * Reads expected picklist values for Account.identifiers_available_in_Salesforce__c
 * from the Party Integration tab of Picklist Value Mappings.xlsx (SF-593 / SF-1081).
 *
 * Configure via env:
 *   SF593_PARTY_INTEGRATION_EXCEL — absolute or repo-relative path (default: data/excel/Picklist Value Mappings.xlsx)
 *   SF593_PARTY_INTEGRATION_SHEET — worksheet name (default: Party Integration)
 *   SF593_BULKQUERY_EXPORT_CSV — optional; bulk Dataverse_Mapping__mdt export for gold-vs-actual (see sf593-gold-vs-bulkquery.ts)
 *   SF593_EXCEL_PICKLIST_COLUMN — 1-based column index (optional; if unset, header row is scanned)
 *   SF593_EXCEL_HEADER_ROW — header row number (default: 1)
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { logger } from './logger';

const DEFAULT_RELATIVE = path.join('data', 'excel', 'Picklist Value Mappings.xlsx');
const DEFAULT_SHEET = 'Party Integration';

function resolveExcelPath(): string {
  const fromEnv = process.env.SF593_PARTY_INTEGRATION_EXCEL?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(process.cwd(), DEFAULT_RELATIVE);
}

function sheetName(): string {
  return process.env.SF593_PARTY_INTEGRATION_SHEET?.trim() || DEFAULT_SHEET;
}

function headerRowValues(ws: ExcelJS.Worksheet, headerRowNum: number): string {
  const row = ws.getRow(headerRowNum);
  const parts: string[] = [];
  row.eachCell({ includeEmpty: false }, (_c, colNumber) => {
    parts.push(`[${colNumber}]=${String(row.getCell(colNumber).value ?? '').trim()}`);
  });
  return parts.join('; ') || '(empty)';
}

/**
 * Returns distinct non-empty string values from the Party Integration picklist column.
 */
export async function readPartyIntegrationPicklistValuesFromExcel(): Promise<string[]> {
  const filePath = resolveExcelPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `SF593: Picklist mapping Excel not found at "${filePath}". ` +
        `Copy "Picklist Value Mappings.xlsx" there or set SF593_PARTY_INTEGRATION_EXCEL.`
    );
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const name = sheetName();
  const ws = wb.worksheets.find((w) => w.name.trim().toLowerCase() === name.toLowerCase());
  if (!ws) {
    const names = wb.worksheets.map((w) => w.name).join(', ');
    throw new Error(`SF593: Worksheet "${name}" not found. Available sheets: ${names}`);
  }

  const forcedCol = process.env.SF593_EXCEL_PICKLIST_COLUMN?.trim();
  let colIndex: number | undefined = forcedCol ? parseInt(forcedCol, 10) : undefined;
  if (forcedCol && (Number.isNaN(colIndex!) || colIndex! < 1)) {
    throw new Error(
      `SF593: SF593_EXCEL_PICKLIST_COLUMN must be a positive integer (1-based column index), got "${forcedCol}"`
    );
  }

  const headerRowNum = Math.max(1, parseInt(process.env.SF593_EXCEL_HEADER_ROW?.trim() || '1', 10) || 1);

  if (!colIndex) {
    const headerRow = ws.getRow(headerRowNum);
    headerRow.eachCell({ includeEmpty: false }, (_cell, colNumber) => {
      const t = String(headerRow.getCell(colNumber).value ?? '').trim().toLowerCase();
      if (!t) return;
      if (t.includes('identifiers') && t.includes('salesforce') && colIndex === undefined) {
        colIndex = colNumber;
      }
    });
    if (!colIndex) {
      throw new Error(
        `SF593: Could not detect picklist column from row ${headerRowNum}. ` +
          `Set SF593_EXCEL_PICKLIST_COLUMN to the 1-based column index. Row ${headerRowNum}: ` +
          `${headerRowValues(ws, headerRowNum)}`
      );
    }
  }

  const values: string[] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowNum) return;
    const cell = row.getCell(colIndex!);
    const raw = cell.value;
    let s = '';
    if (raw === null || raw === undefined) s = '';
    else if (typeof raw === 'object' && 'text' in (raw as object)) s = String((raw as { text?: string }).text ?? '');
    else if (typeof raw === 'object' && 'richText' in (raw as object)) {
      s = ((raw as { richText?: { text?: string }[] }).richText ?? [])
        .map((x) => x.text ?? '')
        .join('');
    } else s = String(raw);
    s = s.trim();
    if (s && s.toLowerCase() !== 'n/a') values.push(s);
  });

  const unique = [...new Set(values)];
  logger.info(`SF593: Read ${unique.length} distinct value(s) from Excel column ${colIndex} sheet "${ws.name}"`);
  return unique.sort((a, b) => a.localeCompare(b));
}
