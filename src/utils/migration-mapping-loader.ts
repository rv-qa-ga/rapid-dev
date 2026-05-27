/**
 * Migration Mapping Loader
 * Loads field mappings from AccountMigrationMappingDocument.xlsx
 * Reads from "M party -> accounts" sheet
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { FieldMapping } from './migration-field-mapper';
import { logger } from './logger';

const EXCEL_FILE_NAME =
  process.env.CLM_MAPPING_GOVERNANCE_EXCEL?.trim() ||
  'data/excel/Mapping and Governance of Data Attributes for CLM Design.xlsx';
const MAPPING_SHEET_NAME = 'M party -> accounts';

/** Display labels in governance workbook → Salesforce API names */
const SALESFORCE_FIELD_LABEL_TO_API: Record<string, string> = {
  'discontinued date': 'Discontinued_Date__c',
  'onboarded date': 'Onboarded_Date__c',
};

/**
 * Governance sheets sometimes use UI labels (with spaces) instead of API names.
 */
export function normalizeSalesforceApiField(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^[A-Za-z][A-Za-z0-9_]*(__c|__r)?$/.test(trimmed)) {
    // Governance typo: Country_Master_ID_c → Country_Master_ID__c (single _c suffix)
    if (/_c$/.test(trimmed) && !trimmed.endsWith('__c')) {
      return trimmed.replace(/_c$/, '__c');
    }
    return trimmed;
  }
  const mapped = SALESFORCE_FIELD_LABEL_TO_API[trimmed.toLowerCase()];
  if (mapped) {
    return mapped;
  }
  if (/\s/.test(trimmed)) {
    const underscored = trimmed.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
    if (!underscored) {
      return trimmed;
    }
    if (
      underscored.endsWith('__c') ||
      underscored.endsWith('__r') ||
      underscored === 'Name' ||
      /Id$/.test(underscored)
    ) {
      return underscored;
    }
    return `${underscored}__c`;
  }
  return trimmed;
}

export interface ExcelMappingRow {
  sourceField: string;
  targetField: string;
  sourceFieldType: string;
  targetFieldType: string;
  transformationLogic: string;
  required: boolean;
  includeInMigration: boolean;
  validationRule: string;
  comments: string;
}

/**
 * Load field mappings from Excel file
 */
export interface LoadMappingsOptions {
  excelPath?: string;
  sheetName?: string;
}

export async function loadMappingsFromExcel(
  excelPathOrOptions?: string | LoadMappingsOptions
): Promise<FieldMapping[]> {
  const opts: LoadMappingsOptions =
    typeof excelPathOrOptions === 'string'
      ? { excelPath: excelPathOrOptions }
      : excelPathOrOptions ?? {};
  const filePath = opts.excelPath || path.join(process.cwd(), EXCEL_FILE_NAME);
  const sheetName = opts.sheetName || MAPPING_SHEET_NAME;

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Excel mapping file not found: ${filePath}. ` +
      `Set CLM_MIGRATION_FIELD_EXCEL or place "${EXCEL_FILE_NAME}" in data/excel/.`
    );
  }

  logger.info(`📖 Loading field mappings from: ${filePath} (sheet: ${sheetName})`);

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in Excel file ${filePath}`);
    }

    const mappings: FieldMapping[] = [];
    const headers: string[] = [];

    // Read headers from first row
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = getCellValueAsString(cell);
      headers[colNumber - 1] = value;
    });

    logger.debug(`Headers found: ${headers.join(', ')}`);

    // Find column indices
    const sourceFieldCol = findColumnIndex(headers, ['Source Field Name', 'SourceField', 'Source Field']);
    const targetFieldCol = findColumnIndex(headers, ['Target Field Name', 'TargetField', 'Target Field']);
    const sourceTypeCol = findColumnIndex(headers, ['Source Field Type', 'SourceFieldType']);
    const targetTypeCol = findColumnIndex(headers, ['Target Field Type & Length', 'Target Field Type', 'TargetFieldType']);
    const transformationCol = findColumnIndex(headers, ['Transformation Logic', 'Transformation']);
    const requiredCol = findColumnIndex(headers, ['Required in Target? (Y/N)', 'Required', 'Required?']);
    const includeCol = findColumnIndex(headers, ['Include in Migration? (Y/N)', 'Include in Migration', 'Include']);
    const validationCol = findColumnIndex(headers, ['Validation / Business Rule', 'Validation', 'Business Rule']);
    const commentsCol = findColumnIndex(headers, ['Comments / Notes', 'Comments', 'Notes']);

    if (sourceFieldCol === -1 || targetFieldCol === -1) {
      throw new Error('Required columns "Source Field Name" and "Target Field Name" not found in Excel file');
    }

    // Read data rows (starting from row 2)
    let rowCount = 0;
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const sourceField = getCellValueAsString(row.getCell(sourceFieldCol + 1));
      const targetField = getCellValueAsString(row.getCell(targetFieldCol + 1));

      // Skip empty rows or rows with invalid field names
      const invalidFieldNames = ['N/A', 'None', 'NONE', 'n/a', 'none', '', ' ', 'N', 'Y', 'Yes', 'No'];
      const src = sourceField.trim();
      const tgt = targetField.trim();
      if (
        !src ||
        !tgt ||
        invalidFieldNames.includes(tgt) ||
        invalidFieldNames.includes(src) ||
        /^[YN]$/i.test(src) ||
        /^[YN]$/i.test(tgt)
      ) {
        if (src && (invalidFieldNames.includes(tgt) || /^[YN]$/i.test(tgt))) {
          logger.debug(`Skipping ${src} -> ${tgt} (invalid target field name)`);
        }
        return;
      }

      // Column N: Include in Migration? (Y/N) — only Y rows are in scope
      if (includeCol !== -1) {
        const includeValue = getCellValueAsString(row.getCell(includeCol + 1)).toUpperCase();
        if (includeValue !== 'Y' && includeValue !== 'YES') {
          logger.debug(
            `Skipping ${sourceField} -> ${targetField} (Include in Migration = ${includeValue || '(blank)'})`
          );
          return;
        }
      }

      const sourceType = getCellValueAsString(row.getCell(sourceTypeCol + 1));
      const targetType = getCellValueAsString(row.getCell(targetTypeCol + 1));
      const transformation = getCellValueAsString(row.getCell(transformationCol + 1));
      const requiredValue = getCellValueAsString(row.getCell(requiredCol + 1));
      const validation = getCellValueAsString(row.getCell(validationCol + 1));
      const comments = getCellValueAsString(row.getCell(commentsCol + 1));

      const salesforceApiField = normalizeSalesforceApiField(targetField);

      // Determine field type from target type
      let fieldType = inferFieldType(targetType, sourceType);
      fieldType = refineClmFieldType(sourceField.trim(), salesforceApiField, fieldType);

      // Determine if critical (required fields are critical)
      const isCritical = parseBoolean(requiredValue);

      // Determine tolerance based on field type and transformation
      let tolerance = inferTolerance(fieldType, transformation, validation);
      if (/email/i.test(src) || /email/i.test(salesforceApiField)) {
        tolerance = 'case-insensitive';
      }
      if (salesforceApiField !== targetField.trim()) {
        logger.debug(
          `Normalized SF field "${targetField.trim()}" -> "${salesforceApiField}" (${sourceField})`
        );
      }

      mappings.push({
        dynamicsField: sourceField.trim(),
        salesforceField: salesforceApiField,
        fieldType,
        isCritical,
        tolerance,
        transformation: transformation && transformation !== 'None' && transformation !== 'N/A' 
          ? createTransformationFunction(transformation) 
          : undefined
      });

      rowCount++;
    });

    logger.info(`✅ Loaded ${mappings.length} field mappings from Excel (${rowCount} rows processed)`);
    return mappings;
  } catch (error: any) {
    logger.error(`❌ Error loading field mappings from Excel: ${error.message}`);
    throw error;
  }
}

/**
 * Get cell value as string, handling various cell types
 */
function getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }

  // Handle merged cells
  if (cell.isMerged && cell.master) {
    return getCellValueAsString(cell.master);
  }

  // Handle different value types
  if (typeof cell.value === 'string') {
    return cell.value.trim();
  }
  if (typeof cell.value === 'number') {
    return cell.value.toString();
  }
  if (cell.value instanceof Date) {
    return cell.value.toISOString().split('T')[0];
  }
  if (typeof cell.value === 'boolean') {
    return cell.value ? 'Yes' : 'No';
  }
  if (typeof cell.value === 'object') {
    // Handle rich text or formula results
    if ('richText' in cell.value) {
      return (cell.value as any).richText.map((rt: any) => rt.text).join('');
    }
    if ('result' in cell.value) {
      return String(cell.value.result);
    }
    return String(cell.value);
  }

  return String(cell.value).trim();
}

/**
 * Find column index by header name (case-insensitive, partial match)
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].toLowerCase().trim();
    for (const name of possibleNames) {
      if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

/** Audit timestamps and user lookups — validated separately or not comparable GUID↔SF User Id. */
export const DYNAMICS_AUDIT_COMPARE_SKIP = new Set([
  'createdon',
  'modifiedon',
  'createdby',
  'modifiedby',
  'ownerid',
  'createdonbehalfby',
  'modifiedonbehalfby',
  '_createdby_value',
  '_modifiedby_value',
  '_ownerid_value',
  '_createdonbehalfby_value',
  '_modifiedonbehalfby_value',
]);

/** Party/D365 fields that OData often returns empty (lookup IDs) — skip compare when SOURCE blank. */
export const DYNAMICS_LOOKUP_COMPARE_SKIP_IF_EMPTY = new Set([
  'createdby',
  'modifiedby',
  'ownerid',
  'createdonbehalfby',
  'modifiedonbehalfby',
  'accelins_claimsproductionperiodeffectivefrom',
  'accelins_claimsproductionperiodeffectiveto',
  'accelins_writtenaccountingperiodeffectivefrom',
  'accelins_writtenaccountingperiodeffectiveto',
  'accelins_aslob1',
]);

function refineClmFieldType(
  dynamicsField: string,
  salesforceField: string,
  inferred: FieldMapping['fieldType']
): FieldMapping['fieldType'] {
  const df = dynamicsField.toLowerCase();
  const sf = salesforceField.toLowerCase();
  if (df === 'statuscode' || sf.includes('account_status')) {
    return 'picklist';
  }
  if (sf === 'dataverse_id__c' || df === 'accelins_partyid') {
    return 'external-id';
  }
  if (
    inferred === 'lookup' ||
    sf === 'accountid' ||
    sf === 'userid' ||
    /^(class_of_business|line_of_business|subproduct|aslob|osfi|member|legal_entity|group|tpa_account|tpa_group_account|member_products_and_programs)__c$/i.test(
      salesforceField
    )
  ) {
    return 'lookup';
  }
  return inferred;
}

/**
 * Infer field type from type string
 */
function inferFieldType(targetType: string, sourceType: string): FieldMapping['fieldType'] {
  const typeStr = (targetType || sourceType || '').toLowerCase();

  if (typeStr.includes('lookup') || typeStr.includes('reference')) {
    return 'lookup';
  }
  if (typeStr.includes('picklist') || typeStr.includes('choice')) {
    return 'picklist';
  }
  if (typeStr.includes('date') || typeStr.includes('datetime')) {
    return 'date';
  }
  if (typeStr.includes('number') || typeStr.includes('int') || typeStr.includes('decimal')) {
    return 'number';
  }
  if (typeStr.includes('boolean') || typeStr.includes('bit')) {
    return 'boolean';
  }
  if (typeStr.includes('uniqueidentifier') || typeStr.includes('guid') || typeStr.includes('id')) {
    return 'external-id';
  }

  return 'text'; // Default
}

/**
 * Infer tolerance from field type and transformation logic
 */
function inferTolerance(
  fieldType: FieldMapping['fieldType'],
  transformation: string,
  validation: string
): FieldMapping['tolerance'] {
  const transLower = (transformation || '').toLowerCase();
  const validLower = (validation || '').toLowerCase();

  // If transformation mentions case-insensitive
  if (transLower.includes('case') || transLower.includes('lower') || transLower.includes('upper')) {
    return 'case-insensitive';
  }

  // If validation mentions unique or exact match
  if (validLower.includes('unique') || validLower.includes('exact')) {
    return 'exact';
  }

  // For text fields, default to trimmed
  if (fieldType === 'text') {
    return 'trimmed';
  }

  // For external-id, must be exact
  if (fieldType === 'external-id') {
    return 'exact';
  }

  // Default to exact
  return 'exact';
}

/**
 * Create transformation function from transformation logic string
 */
function createTransformationFunction(transformation: string): ((value: any) => any) | undefined {
  const transLower = transformation.toLowerCase();

  // Handle common transformations
  if (transLower.includes('trim')) {
    return (value: any) => value ? String(value).trim() : value;
  }
  if (transLower.includes('lowercase') || transLower.includes('lower')) {
    return (value: any) => value ? String(value).toLowerCase() : value;
  }
  if (transLower.includes('uppercase') || transLower.includes('upper')) {
    return (value: any) => value ? String(value).toUpperCase() : value;
  }

  // For complex transformations, return undefined and handle in comparison logic
  return undefined;
}

/**
 * Parse boolean from various formats
 */
function parseBoolean(value: string): boolean {
  const normalized = value.toString().toLowerCase().trim();
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'y';
}

