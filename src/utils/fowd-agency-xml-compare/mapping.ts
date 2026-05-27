import ExcelJS from 'exceljs';
import type { MappingPair } from './types';

const HEADER_HINTS = /source field|target xml|column a|column b/i;

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && value !== null && 'text' in value) {
    return String((value as { text?: string }).text ?? '');
  }
  return String(value).trim();
}

/**
 * Load Snowflake column (A) ↔ XML attribute (B) pairs from the Lloyds ADP mapping workbook.
 * Dedupes repeated rows; preserves first occurrence order.
 */
export async function loadMappingFromXlsx(
  filePath: string,
  options?: { sheetName?: string },
): Promise<MappingPair[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet =
    (options?.sheetName && workbook.getWorksheet(options.sheetName)) ||
    workbook.getWorksheet('ADP_XML_Mapping') ||
    workbook.worksheets[0];
  if (!sheet) {
    throw new Error(`No worksheet found in ${filePath}`);
  }

  const seen = new Set<string>();
  const pairs: MappingPair[] = [];
  let startRow = 1;
  const firstA = cellToString(sheet.getRow(1).getCell(1).value);
  const firstB = cellToString(sheet.getRow(1).getCell(2).value);
  if (HEADER_HINTS.test(`${firstA} ${firstB}`)) {
    startRow = 2;
  }

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < startRow) return;
    const snowflakeColumn = cellToString(row.getCell(1).value);
    const xmlAttribute = cellToString(row.getCell(2).value);
    if (!snowflakeColumn || !xmlAttribute) return;
    const key = `${snowflakeColumn}|${xmlAttribute}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ snowflakeColumn, xmlAttribute });
  });

  if (pairs.length === 0) {
    throw new Error(`No mapping rows found in ${filePath} (sheet: ${sheet.name})`);
  }

  return pairs;
}
