/**
 * Loads picklist value mappings from Picklist Value Mappings.xlsx migration tabs.
 * Used to translate Dynamics SOURCE values to expected Salesforce TARGET values before compare.
 */

import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { PICKLIST_MAPPINGS_EXCEL } from './clm-migration-entity-config';
import { logger } from './logger';

export interface PicklistValueMap {
  /** Dynamics field → (normalized Dynamics value → expected Salesforce value) */
  byField: Map<string, Map<string, string>>;
}

const picklistCache = new Map<string, PicklistValueMap>();

function normKey(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
}

function getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  if (typeof cell.value === 'string') {
    return cell.value.trim();
  }
  if (typeof cell.value === 'number') {
    return cell.value.toString();
  }
  if (cell.value instanceof Date) {
    return cell.value.toISOString();
  }
  if (typeof cell.value === 'object' && 'result' in cell.value) {
    return String((cell.value as { result: unknown }).result).trim();
  }
  return String(cell.value).trim();
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = (headers[i] || '').toLowerCase().trim();
    for (const name of possibleNames) {
      if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

export async function loadPicklistMigrationTab(
  tabName: string,
  excelPath?: string
): Promise<PicklistValueMap> {
  const cacheKey = `${excelPath || PICKLIST_MAPPINGS_EXCEL}::${tabName}`;
  const cached = picklistCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const filePath =
    excelPath ||
    process.env.CLM_PICKLIST_MAPPINGS_EXCEL?.trim() ||
    path.join(process.cwd(), PICKLIST_MAPPINGS_EXCEL);

  if (!fs.existsSync(filePath)) {
    logger.warn(`Picklist mappings file not found: ${filePath}`);
    return { byField: new Map() };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  if (!tabName?.trim()) {
    return { byField: new Map() };
  }

  const worksheet = workbook.getWorksheet(tabName);
  if (!worksheet) {
    logger.warn(`Picklist tab "${tabName}" not found in ${filePath}`);
    return { byField: new Map() };
  }

  const headers: string[] = [];
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  const dvFieldCol = findColumnIndex(headers, [
    'Dataverse Field',
    'Dataverse Field Name',
    'Field Name',
  ]);
  const dvValueCol = findColumnIndex(headers, [
    'Dataverse Value',
    'Dataverse Raw Value',
    'Dataverse Code',
    'Raw Value',
  ]);
  const dvLabelCol = findColumnIndex(headers, ['Dataverse Label', 'Label']);
  const sfTargetCol = findColumnIndex(headers, [
    'Salesforce Value (Target)',
    'Salesforce Value Target',
    'Salesforce Target',
    'Target Value',
    'Salesforce Picklist Value',
  ]);

  const byField = new Map<string, Map<string, string>>();
  let rowCount = 0;

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const dvField = getCellValueAsString(row.getCell(dvFieldCol + 1)).trim();
    const sfTarget = getCellValueAsString(row.getCell(sfTargetCol + 1)).trim();
    if (!dvField || !sfTarget || sfTargetCol === -1) {
      return;
    }

    const fieldKey = dvField.toLowerCase();
    const shortKey = fieldKey.includes('.') ? fieldKey.split('.').pop()! : fieldKey;
    const registerField = (key: string) => {
      if (!byField.has(key)) {
        byField.set(key, new Map());
      }
      return byField.get(key)!;
    };
    const fieldMap = registerField(fieldKey);
    const shortFieldMap = shortKey !== fieldKey ? registerField(shortKey) : fieldMap;

    const register = (raw: string) => {
      const k = normKey(raw);
      if (k) {
        fieldMap.set(k, sfTarget);
        if (shortFieldMap !== fieldMap) {
          shortFieldMap.set(k, sfTarget);
        }
      }
    };

    if (dvValueCol !== -1) {
      register(getCellValueAsString(row.getCell(dvValueCol + 1)));
    }
    if (dvLabelCol !== -1) {
      register(getCellValueAsString(row.getCell(dvLabelCol + 1)));
    }

    rowCount++;
  });

  const result: PicklistValueMap = { byField };
  picklistCache.set(cacheKey, result);
  logger.info(`Loaded picklist value map from "${tabName}": ${rowCount} row(s), ${byField.size} field(s)`);
  return result;
}

/** Expected Salesforce value after Party Migration (etc.) tab lookup; undefined = no row for this value. */
export function expectedSalesforcePicklistValue(
  dynamicsField: string,
  dynamicsRawValue: unknown,
  map: PicklistValueMap
): string | undefined {
  const fieldMap = map.byField.get(dynamicsField.toLowerCase());
  if (!fieldMap) {
    return undefined;
  }
  const key = normKey(dynamicsRawValue);
  if (!key) {
    return undefined;
  }
  return fieldMap.get(key);
}

export function clearPicklistMigrationCache(): void {
  picklistCache.clear();
}
