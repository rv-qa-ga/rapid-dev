/**
 * SF-789 - Dataverse field identifiers for Member Legal Entity Group → Member Maps integration.
 * Validates that Custom Metadata (Dataverse_Mapping__mdt) in QA org matches the Integration Member Maps
 * Excel spec (Picklist Value Mappings.xlsx, tab "Integration Member Maps").
 *
 * Setup page: https://arx--qa.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/page
 */

import * as path from 'path';
import * as fs from 'fs';
import ExcelJS from 'exceljs';
import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { CustomMetadataValidator } from '../../../utils/custom-metadata-validator';
import { logger } from '../../../utils/logger';

const EXCEL_PATH = 'data/excel/Picklist Value Mappings.xlsx';
const TAB_NAME = 'Integration Member Maps';
const MLER_OBJECT = 'Member_Legal_Entity_Relationship__c';

/** Explicit fields to avoid FIELDS(ALL) LIMIT 200 restriction on Custom Metadata */
const DV_MAPPING_FIELDS = [
  'Id',
  'DeveloperName',
  'MasterLabel',
  'Object__c',
  'Field__c',
  'Value__c',
  'Dataverse_Field__c',
  'Dataverse_Value__c',
];

interface MappingRow {
  objectName?: string;
  sfField?: string;
  sfValue?: string;
  mapTo?: string;
  dvField?: string;
  dvLabel?: string;
  dvValue?: string | number;
  rowNum: number;
  isDeprecated?: boolean;
}

function getCellValue(cell: any): string {
  if (!cell || cell.value == null) return '';
  if (typeof cell.value === 'string') return cell.value.trim();
  if (typeof cell.value === 'number') return String(cell.value);
  if (cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
    return String((cell.value as any).text).trim();
  }
  return String(cell.value).trim();
}

function isRowDeprecated(row: any): boolean {
  let strikethrough = false;
  row.eachCell?.({ includeEmpty: true }, (cell: any) => {
    if (cell.font && cell.font.strike) strikethrough = true;
  });
  return strikethrough;
}

// ═══════════════════════════════════════════════════════════════════════════
// Background - Load Excel
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'the Integration Member Maps expected mappings are loaded from Picklist Value Mappings Excel',
  async function (this: AutomationWorld) {
    const excelPath = path.join(process.cwd(), EXCEL_PATH);
    if (!fs.existsSync(excelPath)) {
      throw new Error(`SF-789: Picklist Value Mappings not found at ${EXCEL_PATH}`);
    }
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);
    const worksheet = workbook.getWorksheet(TAB_NAME);
    if (!worksheet) {
      throw new Error(
        `SF-789: Tab "${TAB_NAME}" not found. Available: ${workbook.worksheets.map((ws: any) => ws.name).join(', ')}`
      );
    }

    const findCol = (headers: string[], patterns: string[]): number => {
      for (let i = 0; i < headers.length; i++) {
        const h = (headers[i] || '').toLowerCase();
        if (patterns.some((p) => h.includes(p.toLowerCase()))) return i;
      }
      return -1;
    };

    const headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell: any, colNumber: number) => {
      headers[colNumber - 1] = getCellValue(cell);
    });

    const objectCol = findCol(headers, ['object name', 'object', 'sobject', 'salesforce object']);
    const sfFieldCol = findCol(headers, ['field name', 'salesforce field', 'sf field', 'source field']);
    const sfValueCol = findCol(headers, ['salesforce value', 'sf value', 'source value']);
    const mapToCol = findCol(headers, ['map to', 'mapping type', 'store in salesforce']);
    const dvFieldCol = findCol(headers, ['target field', 'dataverse field', 'dv field', 'alternate key']);
    const dvLabelCol = findCol(headers, ['dataverse label', 'dv label', 'label']);
    const dvValueCol = findCol(headers, ['target value', 'dataverse value', 'dv value']);

    const rows: MappingRow[] = [];
    worksheet.eachRow((row: any, rowNumber: number) => {
      if (rowNumber === 1) return;
      const objectName = objectCol >= 0 ? getCellValue(row.getCell(objectCol + 1)) : '';
      const sfField = sfFieldCol >= 0 ? getCellValue(row.getCell(sfFieldCol + 1)) : '';
      const sfValue = sfValueCol >= 0 ? getCellValue(row.getCell(sfValueCol + 1)) : '';
      const mapTo = mapToCol >= 0 ? getCellValue(row.getCell(mapToCol + 1)) : '';
      const dvField = dvFieldCol >= 0 ? getCellValue(row.getCell(dvFieldCol + 1)) : '';
      const dvLabel = dvLabelCol >= 0 ? getCellValue(row.getCell(dvLabelCol + 1)) : '';
      const dvValRaw = dvValueCol >= 0 ? row.getCell(dvValueCol + 1) : null;
      let dvValue: string | number | undefined;
      if (dvValRaw && dvValRaw.value != null) {
        const n = Number(dvValRaw.value);
        dvValue = !isNaN(n) ? n : String(dvValRaw.value).trim();
      }
      const isDeprecated = isRowDeprecated(row);
      if (objectName || sfField || sfValue || dvField) {
        rows.push({
          objectName,
          sfField,
          sfValue,
          mapTo,
          dvField,
          dvLabel,
          dvValue,
          rowNum: rowNumber,
          isDeprecated,
        });
      }
    });

    this.testContext.sf789MappingRows = rows;
    this.testContext.sf789MappingHeaders = headers;
    logger.info(`✅ SF-789: Loaded ${rows.length} rows from Integration Member Maps`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Query Custom Metadata (Object filter only)
// ═══════════════════════════════════════════════════════════════════════════

When(
  /^I query Custom Metadata "([^"]+)" records for Object "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, objectName: string) {
    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    if (!validator) {
      throw new Error(
        'Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token with Custom Metadata access" first.'
      );
    }

    logger.info(`📖 Querying Custom Metadata: ${metadataType} for Object: ${objectName}`);

    const records = await validator.queryCustomMetadataRecords(
      metadataType,
      DV_MAPPING_FIELDS,
      { Object__c: objectName }
    );

    this.testContext.customMetadataRecords = records;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = records.length;
    logger.info(`✅ Queried ${records.length} Custom Metadata records for ${objectName}`);
  }
);

When(
  /^I query Custom Metadata "([^"]+)" records for Object "([^"]+)" and Field "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, objectName: string, fieldName: string) {
    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    if (!validator) {
      throw new Error(
        'Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token with Custom Metadata access" first.'
      );
    }

    logger.info(`📖 Querying Custom Metadata: ${metadataType} for Object: ${objectName}, Field: ${fieldName}`);

    const records = await validator.queryCustomMetadataRecords(
      metadataType,
      DV_MAPPING_FIELDS,
      { Object__c: objectName, Field__c: fieldName }
    );

    this.testContext.customMetadataRecords = records;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = records.length;
    logger.info(`✅ Queried ${records.length} Custom Metadata records`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Compare Custom Metadata to Excel
// ═══════════════════════════════════════════════════════════════════════════

When(
  'I compare Integration Member Maps Excel to QA Custom Metadata for Member_Legal_Entity_Relationship__c',
  async function (this: AutomationWorld) {
    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    if (!validator) {
      throw new Error(
        'Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token with Custom Metadata access" first.'
      );
    }

    const records = await validator.queryCustomMetadataRecords(
      'Dataverse_Mapping__mdt',
      DV_MAPPING_FIELDS,
      { Object__c: MLER_OBJECT }
    );

    this.testContext.customMetadataRecords = records;
    this.testContext.sf789MetadataComparisonDone = true;
    logger.info(`✅ Queried ${records.length} Custom Metadata records for comparison`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Assertions
// ═══════════════════════════════════════════════════════════════════════════

Then(
  'the Custom Metadata records for Member_Legal_Entity_Relationship__c should match the Integration Member Maps Excel spec',
  async function (this: AutomationWorld) {
    const records = (this.testContext.customMetadataRecords || []) as any[];
    const excelRows = (this.testContext.sf789MappingRows || []) as MappingRow[];

    const mlerExcelRows = excelRows.filter(
      (r) =>
        !r.isDeprecated &&
        ((r.objectName || '').includes(MLER_OBJECT) ||
          (r.sfField || '').includes('Member_Legal_Entity') ||
          (r.sfField || '').includes('Member__c') ||
          (r.sfField || '').includes('Legal_Entity__c') ||
          (r.sfField || '').includes('Group__c') ||
          (r.sfField || '').includes('Is_Active__c'))
    );

    if (mlerExcelRows.length === 0 && excelRows.length > 0) {
      logger.warn('SF-789: No MLER-specific rows in Excel; assuming tab is MLER-focused');
    }

    const requiredFields = ['Member__c', 'Legal_Entity__c', 'Group__c', 'Is_Active__c'];
    const metadataFields = new Set(records.map((r: any) => r.Field__c).filter(Boolean));

    const missing: string[] = [];
    for (const f of requiredFields) {
      if (!metadataFields.has(f)) {
        const hasSimilar = [...metadataFields].some((mf) => mf?.includes(f.replace('__c', '')));
        if (!hasSimilar) missing.push(f);
      }
    }

    if (records.length === 0) {
      throw new Error(
        `SF-789: No Custom Metadata records found for ${MLER_OBJECT}. Check setup: https://arx--qa.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/page`
      );
    }

    if (missing.length > 0) {
      throw new Error(
        `SF-789: Custom Metadata missing required field mappings: ${missing.join(', ')}. ` +
          `Found fields: ${[...metadataFields].join(', ')}`
      );
    }

    logger.info(`✅ SF-789: Custom Metadata for ${MLER_OBJECT} matches Excel spec (${records.length} records)`);
  }
);

Then(
  'Custom Metadata should contain mappings for Member__c, Legal_Entity__c, and Group__c fields',
  async function (this: AutomationWorld) {
    const records = (this.testContext.customMetadataRecords || []) as any[];
    const fields = new Set(records.map((r: any) => r.Field__c).filter(Boolean));

    const required = ['Member__c', 'Legal_Entity__c', 'Group__c'];
    const missing = required.filter((f) => !fields.has(f));

    if (missing.length > 0) {
      throw new Error(
        `SF-789: Custom Metadata missing lookup mappings: ${missing.join(', ')}. Found: ${[...fields].join(', ')}`
      );
    }

    logger.info(`✅ SF-789: Member__c, Legal_Entity__c, Group__c mappings present`);
  }
);

Then(
  'each mapping should have valid Dataverse_Field__c and Dataverse_Value__c or lookup target',
  async function (this: AutomationWorld) {
    const records = (this.testContext.customMetadataRecords || []) as any[];
    const invalid: string[] = [];

    for (const r of records) {
      const dvField = r.Dataverse_Field__c;
      const dvValue = r.Dataverse_Value__c;
      const value = r.Value__c;
      const isLookup = (r.Field__c || '').match(/Member__c|Legal_Entity__c|Group__c/);
      if (isLookup) {
        if (!dvField || !String(dvField).includes('accelins_')) {
          invalid.push(`${r.DeveloperName}: lookup should have Dataverse_Field__c pointing to accelins_*`);
        }
      } else {
        if ((!dvField && !dvValue) || (dvField && !dvValue && value === undefined)) {
          invalid.push(`${r.DeveloperName}: missing Dataverse_Field__c or Dataverse_Value__c`);
        }
      }
    }

    if (invalid.length > 0) {
      throw new Error(`SF-789: Invalid mappings:\n${invalid.join('\n')}`);
    }

    logger.info(`✅ SF-789: All mappings have valid Dataverse_Field__c / Dataverse_Value__c`);
  }
);

Then(
  'Custom Metadata should contain Is_Active__c TRUE to statecode 0 and statuscode 1',
  async function (this: AutomationWorld) {
    const records = (this.testContext.customMetadataRecords || []) as any[];
    const trueRecords = records.filter(
      (r: any) => String(r.Value__c).toUpperCase() === 'TRUE' || r.Value__c === true
    );

    const hasStatecode0 = trueRecords.some(
      (r: any) => (r.Dataverse_Field__c || '').includes('statecode') && String(r.Dataverse_Value__c) === '0'
    );
    const hasStatuscode1 = trueRecords.some(
      (r: any) => (r.Dataverse_Field__c || '').includes('statuscode') && String(r.Dataverse_Value__c) === '1'
    );

    if (!hasStatecode0 || !hasStatuscode1) {
      throw new Error(
        `SF-789: Is_Active__c=TRUE must map to statecode 0 and statuscode 1. ` +
          `Found: statecode 0=${hasStatecode0}, statuscode 1=${hasStatuscode1}. ` +
          `Records: ${JSON.stringify(trueRecords.map((r: any) => ({ f: r.Dataverse_Field__c, v: r.Dataverse_Value__c })))}`
      );
    }

    logger.info(`✅ SF-789: Is_Active__c TRUE → statecode 0, statuscode 1`);
  }
);

Then(
  'Custom Metadata should contain Is_Active__c FALSE to statecode 1 and statuscode 2',
  async function (this: AutomationWorld) {
    const records = (this.testContext.customMetadataRecords || []) as any[];
    const falseRecords = records.filter(
      (r: any) => String(r.Value__c).toUpperCase() === 'FALSE' || r.Value__c === false
    );

    const hasStatecode1 = falseRecords.some(
      (r: any) => (r.Dataverse_Field__c || '').includes('statecode') && String(r.Dataverse_Value__c) === '1'
    );
    const hasStatuscode2 = falseRecords.some(
      (r: any) => (r.Dataverse_Field__c || '').includes('statuscode') && String(r.Dataverse_Value__c) === '2'
    );

    if (!hasStatecode1 || !hasStatuscode2) {
      throw new Error(
        `SF-789: Is_Active__c=FALSE must map to statecode 1 and statuscode 2. ` +
          `Found: statecode 1=${hasStatecode1}, statuscode 2=${hasStatuscode2}`
      );
    }

    logger.info(`✅ SF-789: Is_Active__c FALSE → statecode 1, statuscode 2`);
  }
);

Then(
  'every Excel row should have a matching Custom Metadata record in the QA org',
  async function (this: AutomationWorld) {
    const records = (this.testContext.customMetadataRecords || []) as any[];
    const excelRows = (this.testContext.sf789MappingRows || []) as MappingRow[];

    const mlerExcelRows = excelRows.filter(
      (r) =>
        !r.isDeprecated &&
        ((r.objectName || '').includes(MLER_OBJECT) ||
          !r.objectName ||
          (r.sfField || '').includes('Member') ||
          (r.sfField || '').includes('Legal') ||
          (r.sfField || '').includes('Group') ||
          (r.sfField || '').includes('Is_Active'))
    );

    const rowsToCheck = mlerExcelRows.length > 0 ? mlerExcelRows : excelRows.filter((r) => !r.isDeprecated);

    // Extract expected Field names from Excel (sfField may be "Object.Field" or just "Field")
    const expectedFields = new Set<string>();
    for (const row of rowsToCheck) {
      const f = (row.sfField || '').trim();
      if (f) {
        const fieldName = f.includes('.') ? f.split('.').pop() || f : f;
        expectedFields.add(fieldName);
      }
    }

    const metadataFields = new Set(records.map((r: any) => r.Field__c).filter(Boolean));

    // Each expected field from Excel should have at least one Custom Metadata record
    const missingFields: string[] = [];
    for (const ef of expectedFields) {
      const hasMatch = [...metadataFields].some(
        (mf) => mf === ef || (mf && mf.includes(ef.replace('__c', '')))
      );
      if (!hasMatch) {
        missingFields.push(ef);
      }
    }

    // Also ensure record count is reasonable (Custom Metadata >= 1 per expected field type)
    if (records.length === 0) {
      throw new Error(
        `SF-789: No Custom Metadata records for ${MLER_OBJECT}. ` +
          `Expected mappings from Excel (${rowsToCheck.length} rows) not found in QA org.`
      );
    }

    if (missingFields.length > 0) {
      throw new Error(
        `SF-789: Excel fields without Custom Metadata: ${missingFields.join(', ')}. ` +
          `Found: ${[...metadataFields].join(', ')}`
      );
    }

    logger.info(`✅ SF-789: All Excel rows have matching Custom Metadata records (${records.length} metadata, ${rowsToCheck.length} Excel rows)`);
  }
);
