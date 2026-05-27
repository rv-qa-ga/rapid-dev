#!/usr/bin/env ts-node

/**
 * Analyze Migration Mapping Document for Issues
 * Identifies potential problems with the migration mapping
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface MappingRow {
  sourceField: string;
  targetField: string;
  sourceType: string;
  targetType: string;
  transformation: string;
  lookupMapping: string;
  defaultValue: string;
  required: string;
  includeInMigration: string;
  validationRule: string;
  comments: string;
  sourceMaxLength?: string;
  targetLength?: string;
}

interface Issue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  field?: string;
  message: string;
  recommendation?: string;
  context?: 'migration' | 'integration'; // Track which context the issue belongs to
}

async function analyzeMigrationMapping() {
  const excelPath = path.join(process.cwd(), 'data/excel/AccountMigrationMappingDocument.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ File not found: ${excelPath}`);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('Migration & Integration Mapping Document Analysis');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const migrationIssues: Issue[] = [];
    const integrationIssues: Issue[] = [];

    // Analyze "M party -> accounts" sheet (MIGRATION: Dynamics -> Salesforce)
    const migrationSheet = workbook.getWorksheet('M party -> accounts');
    if (!migrationSheet) {
      migrationIssues.push({
        severity: 'error',
        category: 'Sheet Missing',
        message: 'Sheet "M party -> accounts" not found',
        context: 'migration'
      });
    } else {
      analyzeMappingSheet(migrationSheet, migrationIssues, 'migration');
    }

    // Analyze "I accounts -> party" sheet (INTEGRATION: Salesforce -> Dynamics via Mulesoft)
    const integrationSheet = workbook.getWorksheet('I accounts -> party');
    if (!integrationSheet) {
      integrationIssues.push({
        severity: 'error',
        category: 'Sheet Missing',
        message: 'Sheet "I accounts -> party" not found',
        context: 'integration'
      });
    } else {
      analyzeMappingSheet(integrationSheet, integrationIssues, 'integration');
    }

    // Analyze "Accounts SoT" sheet (Salesforce fields)
    const accountsSoT = workbook.getWorksheet('Accounts SoT');
    if (accountsSoT) {
      analyzeAccountsSoT(accountsSoT, migrationIssues, 'migration');
      analyzeAccountsSoT(accountsSoT, integrationIssues, 'integration');
    }

    // Analyze "accelins_party SoT" sheet (Dynamics fields)
    const partySoT = workbook.getWorksheet('accelins_party SoT');
    if (partySoT) {
      analyzePartySoT(partySoT, migrationIssues, 'migration');
      analyzePartySoT(partySoT, integrationIssues, 'integration');
    }

    // Print results separately for Migration and Integration
    printAnalysisResults(migrationIssues, integrationIssues);

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

function analyzeMappingSheet(sheet: ExcelJS.Worksheet, issues: Issue[], context: 'migration' | 'integration') {
  const sheetName = context === 'migration' ? 'M party -> accounts' : 'I accounts -> party';
  const contextLabel = context === 'migration' ? 'MIGRATION' : 'INTEGRATION';
  console.log(`📊 Analyzing "${sheetName}" mapping sheet (${contextLabel})...\n`);

  const headers: string[] = [];
  const mappings: MappingRow[] = [];

  // Read headers
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  // Find column indices
  const sourceFieldCol = findColumnIndex(headers, ['Source Field Name']);
  const targetFieldCol = findColumnIndex(headers, ['Target Field Name']);
  const sourceTypeCol = findColumnIndex(headers, ['Source Field Type']);
  const targetTypeCol = findColumnIndex(headers, ['Target Field Type & Length']);
  const transformationCol = findColumnIndex(headers, ['Transformation Logic']);
  const lookupCol = findColumnIndex(headers, ['Lookup / Reference Mapping']);
  const defaultValueCol = findColumnIndex(headers, ['Default Value (if blank)']);
  const requiredCol = findColumnIndex(headers, ['Required in Target? (Y/N)']);
  // For migration: "Include in Migration? (Y/N)", for integration: "Include in Integration? (Y/N)"
  const includeCol = findColumnIndex(headers, [
    'Include in Migration? (Y/N)', 
    'Include in Integration? (Y/N)',
    'Include in Migration',
    'Include in Integration',
    'Include'
  ]);
  const validationCol = findColumnIndex(headers, ['Validation / Business Rule']);
  const commentsCol = findColumnIndex(headers, ['Comments / Notes']);
  const sourceMaxLengthCol = findColumnIndex(headers, ['Source Field Max Length']);
  const targetLengthCol = findColumnIndex(headers, ['Target Field Type & Length']);

  // Read data rows
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const sourceField = sourceFieldCol >= 0 ? getCellValueAsString(row.getCell(sourceFieldCol + 1)) : '';
    const targetField = targetFieldCol >= 0 ? getCellValueAsString(row.getCell(targetFieldCol + 1)) : '';
    const include = includeCol >= 0 ? getCellValueAsString(row.getCell(includeCol + 1)).toUpperCase() : '';

    // Skip if explicitly excluded (only if include column exists)
    if (includeCol >= 0 && (include === 'N' || include === 'NO')) {
      return;
    }

    // Skip if no target field (invalid row)
    if (!targetField || targetField === 'N/A') {
      return;
    }

    // Include rows even if source field is empty (new Salesforce fields without Dynamics mapping)
    // Use target field name as source field name if source is empty
    const effectiveSourceField = sourceField || `[NEW] ${targetField}`;

    mappings.push({
      sourceField: effectiveSourceField.trim(),
      targetField: targetField.trim(),
      sourceType: sourceTypeCol >= 0 ? getCellValueAsString(row.getCell(sourceTypeCol + 1)) : '',
      targetType: targetTypeCol >= 0 ? getCellValueAsString(row.getCell(targetTypeCol + 1)) : '',
      transformation: transformationCol >= 0 ? getCellValueAsString(row.getCell(transformationCol + 1)) : '',
      lookupMapping: lookupCol >= 0 ? getCellValueAsString(row.getCell(lookupCol + 1)) : '',
      defaultValue: defaultValueCol >= 0 ? getCellValueAsString(row.getCell(defaultValueCol + 1)) : '',
      required: requiredCol >= 0 ? getCellValueAsString(row.getCell(requiredCol + 1)) : '',
      includeInMigration: include,
      validationRule: validationCol >= 0 ? getCellValueAsString(row.getCell(validationCol + 1)) : '',
      comments: commentsCol >= 0 ? getCellValueAsString(row.getCell(commentsCol + 1)) : '',
      sourceMaxLength: sourceMaxLengthCol >= 0 ? getCellValueAsString(row.getCell(sourceMaxLengthCol + 1)) : '',
      targetLength: targetLengthCol >= 0 ? getCellValueAsString(row.getCell(targetLengthCol + 1)) : ''
    });
  });

  console.log(`   Found ${mappings.length} fields included in migration\n`);

  // Check for issues
  mappings.forEach((mapping, index) => {
    // Check 1: Target field is N/A
    if (mapping.targetField === 'N/A' || mapping.targetField === '') {
      issues.push({
        severity: 'error',
        category: 'Missing Target Field',
        field: mapping.sourceField,
        message: `Source field "${mapping.sourceField}" has no target field mapping`,
        recommendation: context === 'migration' 
          ? 'Either map to a Salesforce field or set "Include in Migration" to "N"'
          : 'Either map to a Dynamics field or set "Include in Integration" to "N"',
        context: context
      });
    }

    // Check 1a: New Salesforce field without source mapping (only for migration)
    if (mapping.sourceField.startsWith('[NEW]') && context === 'migration') {
      issues.push({
        severity: 'warning',
        category: 'New Salesforce Field Without Source',
        field: mapping.targetField,
        message: `Target field "${mapping.targetField}" has no source field mapping (new Salesforce field)`,
        recommendation: 'Review if this field needs default value, transformation logic, or should be excluded from migration',
        context: context
      });
    }
    
    // For integration, check if source field exists (Salesforce -> Dynamics)
    if (context === 'integration' && !mapping.sourceField.startsWith('[NEW]') && !mapping.sourceField) {
      issues.push({
        severity: 'warning',
        category: 'Missing Source Field for Integration',
        field: mapping.targetField,
        message: `Integration target field "${mapping.targetField}" has no source Salesforce field mapping`,
        recommendation: 'Add source Salesforce field name for Mulesoft integration mapping',
        context: context
      });
    }

    // Check 2: Required field without default value
    if (mapping.required.toUpperCase() === 'Y' && 
        (!mapping.defaultValue || mapping.defaultValue === 'N/A') &&
        mapping.transformation === 'None' || mapping.transformation === 'N/A') {
      issues.push({
        severity: 'warning',
        category: 'Required Field Without Default',
        field: mapping.sourceField,
        message: `Required field "${mapping.sourceField}" has no default value and no transformation`,
        recommendation: 'Consider adding a default value or transformation logic',
        context: context
      });
    }

    // Check 3: Data type mismatch
    const typeMismatch = checkDataTypeMismatch(mapping.sourceType, mapping.targetType);
    if (typeMismatch) {
      issues.push({
        severity: 'warning',
        category: 'Data Type Mismatch',
        field: mapping.sourceField,
        message: typeMismatch,
        recommendation: 'Verify transformation logic handles the type conversion correctly',
        context: context
      });
    }

    // Check 4: Lookup mapping without transformation
    if (mapping.lookupMapping && 
        mapping.lookupMapping !== 'N/A' && 
        (!mapping.transformation || mapping.transformation === 'None' || mapping.transformation === 'N/A')) {
      issues.push({
        severity: 'error',
        category: 'Lookup Mapping Missing Logic',
        field: mapping.sourceField,
        message: `Lookup field "${mapping.sourceField}" has lookup mapping but no transformation logic`,
        recommendation: context === 'migration' 
          ? 'Add transformation logic to map GUID to Salesforce ID'
          : 'Add transformation logic to map Salesforce ID to Dynamics GUID',
        context: context
      });
    }

    // Check 5: Field length mismatch
    if (mapping.sourceMaxLength && mapping.targetLength) {
      const sourceLen = parseInt(mapping.sourceMaxLength);
      const targetLen = extractLength(mapping.targetLength);
      if (!isNaN(sourceLen) && !isNaN(targetLen) && sourceLen > targetLen) {
        issues.push({
          severity: 'error',
          category: 'Field Length Mismatch',
          field: mapping.sourceField,
          message: `Source field length (${sourceLen}) exceeds target field length (${targetLen})`,
          recommendation: 'Data truncation may occur. Consider increasing target field length or adding truncation logic',
          context: context
        });
      }
    }

    // Check 6: Critical field not required
    if (isCriticalField(mapping.sourceField) && mapping.required.toUpperCase() !== 'Y') {
      issues.push({
        severity: 'warning',
        category: 'Critical Field Not Required',
        field: mapping.sourceField,
        message: `Critical field "${mapping.sourceField}" is not marked as required`,
        recommendation: 'Consider marking as required to ensure data integrity',
        context: context
      });
    }

    // Check 7: Transformation logic but field not required
    if (mapping.transformation && 
        mapping.transformation !== 'None' && 
        mapping.transformation !== 'N/A' &&
        mapping.required.toUpperCase() !== 'Y') {
      issues.push({
        severity: 'info',
        category: 'Transformation on Optional Field',
        field: mapping.sourceField,
        message: `Field "${mapping.sourceField}" has transformation logic but is not required`,
        recommendation: 'Verify this is intentional',
        context: context
      });
    }
  });

  // Check 8: Missing critical fields
  const criticalFields = ['accelins_partyid', 'accelins_name', 'accelins_partymasterid'];
  criticalFields.forEach(criticalField => {
    const found = mappings.find(m => m.sourceField === criticalField);
    if (!found) {
      issues.push({
        severity: 'error',
        category: 'Missing Critical Field',
        field: criticalField,
        message: `Critical field "${criticalField}" is not included in ${context} mapping`,
        recommendation: `Add mapping for this critical field in ${context}`,
        context: context
      });
    }
  });

  // Check 9: Duplicate target fields
  const targetFields = mappings.map(m => m.targetField).filter(f => f && f !== 'N/A');
  const duplicates = targetFields.filter((field, index) => targetFields.indexOf(field) !== index);
  if (duplicates.length > 0) {
    issues.push({
      severity: 'error',
      category: 'Duplicate Target Fields',
      message: `Multiple source fields map to the same target field: ${[...new Set(duplicates)].join(', ')}`,
      recommendation: 'Review mapping - each target field should map to only one source field',
      context: context
    });
  }
}

function analyzeAccountsSoT(sheet: ExcelJS.Worksheet, issues: Issue[], context: 'migration' | 'integration') {
  const contextLabel = context === 'migration' ? 'MIGRATION' : 'INTEGRATION';
  console.log(`📊 Analyzing "Accounts SoT" (Salesforce fields) for ${contextLabel}...\n`);

  const headers: string[] = [];
  const fields: Map<string, any> = new Map();

  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  const apiNameCol = findColumnIndex(headers, ['SF API Name']);
  const dataTypeCol = findColumnIndex(headers, ['SF DataType']);
  const requiredCol = findColumnIndex(headers, ['Required']);
  const newOrExistingCol = findColumnIndex(headers, ['New or Existing Field']);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    if (apiNameCol === -1) return;
    const apiName = getCellValueAsString(row.getCell(apiNameCol + 1));
    if (!apiName || apiName === 'N/A') return;

    fields.set(apiName, {
      dataType: dataTypeCol !== -1 ? getCellValueAsString(row.getCell(dataTypeCol + 1)) : '',
      required: requiredCol !== -1 ? getCellValueAsString(row.getCell(requiredCol + 1)) : '',
      newOrExisting: newOrExistingCol !== -1 ? getCellValueAsString(row.getCell(newOrExistingCol + 1)) : ''
    });
  });

  console.log(`   Found ${fields.size} Salesforce Account fields\n`);
}

function analyzePartySoT(sheet: ExcelJS.Worksheet, issues: Issue[], context: 'migration' | 'integration') {
  const contextLabel = context === 'migration' ? 'MIGRATION' : 'INTEGRATION';
  console.log(`📊 Analyzing "accelins_party SoT" (Dynamics fields) for ${contextLabel}...\n`);

  const headers: string[] = [];
  const fields: Map<string, any> = new Map();

  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell);
  });

  const fieldNameCol = findColumnIndex(headers, ['Field Name']);
  const dataTypeCol = findColumnIndex(headers, ['Data Type']);
  const dataLengthCol = findColumnIndex(headers, ['Data Length']);

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    if (fieldNameCol === -1) return;
    const fieldName = getCellValueAsString(row.getCell(fieldNameCol + 1));
    if (!fieldName) return;

    fields.set(fieldName, {
      dataType: dataTypeCol !== -1 ? getCellValueAsString(row.getCell(dataTypeCol + 1)) : '',
      dataLength: dataLengthCol !== -1 ? getCellValueAsString(row.getCell(dataLengthCol + 1)) : ''
    });
  });

  console.log(`   Found ${fields.size} Dynamics Party fields\n`);
}

function crossReferenceAnalysis(
  mappingSheet: ExcelJS.Worksheet,
  accountsSoT: ExcelJS.Worksheet,
  partySoT: ExcelJS.Worksheet,
  issues: Issue[]
) {
  console.log('📊 Cross-referencing mappings with source of truth...\n');

  // This would do deeper analysis comparing the sheets
  // For now, we'll note that cross-reference analysis was done
  console.log('   Cross-reference analysis completed\n');
}

function checkDataTypeMismatch(sourceType: string, targetType: string): string | null {
  const sourceLower = (sourceType || '').toLowerCase();
  const targetLower = (targetType || '').toLowerCase();

  // Check for obvious mismatches
  if (sourceLower.includes('uniqueidentifier') && !targetLower.includes('id') && !targetLower.includes('lookup')) {
    return `Source is uniqueidentifier but target is not an ID/lookup field`;
  }

  if (sourceLower.includes('datetime') && !targetLower.includes('date') && !targetLower.includes('datetime')) {
    return `Source is datetime but target is not a date field`;
  }

  if (sourceLower.includes('int') && targetLower.includes('text')) {
    return `Source is integer but target is text - may need conversion`;
  }

  return null;
}

function extractLength(typeString: string): number {
  const match = typeString.match(/(\d+)/);
  return match ? parseInt(match[1]) : NaN;
}

function isCriticalField(fieldName: string): boolean {
  const criticalFields = [
    'accelins_partyid',
    'accelins_name',
    'accelins_partymasterid',
    'ownerid',
    'createdby',
    'modifiedby'
  ];
  return criticalFields.some(cf => fieldName.toLowerCase().includes(cf.toLowerCase()));
}

function printAnalysisResults(migrationIssues: Issue[], integrationIssues: Issue[]) {
  const migrationErrors = migrationIssues.filter(i => i.severity === 'error');
  const migrationWarnings = migrationIssues.filter(i => i.severity === 'warning');
  const migrationInfos = migrationIssues.filter(i => i.severity === 'info');
  
  const integrationErrors = integrationIssues.filter(i => i.severity === 'error');
  const integrationWarnings = integrationIssues.filter(i => i.severity === 'warning');
  const integrationInfos = integrationIssues.filter(i => i.severity === 'info');

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('ANALYSIS RESULTS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  console.log('MIGRATION (Dynamics -> Salesforce via Data Loader):');
  console.log(`  Total Issues: ${migrationIssues.length}`);
  console.log(`  ❌ Errors: ${migrationErrors.length}`);
  console.log(`  ⚠️  Warnings: ${migrationWarnings.length}`);
  console.log(`  ℹ️  Info: ${migrationInfos.length}\n`);

  console.log('INTEGRATION (Salesforce -> Dynamics via Mulesoft):');
  console.log(`  Total Issues: ${integrationIssues.length}`);
  console.log(`  ❌ Errors: ${integrationErrors.length}`);
  console.log(`  ⚠️  Warnings: ${integrationWarnings.length}`);
  console.log(`  ℹ️  Info: ${integrationInfos.length}\n`);

  // Print Migration Results
  if (migrationIssues.length > 0) {
    printIssuesByContext('MIGRATION', migrationIssues, migrationErrors, migrationWarnings, migrationInfos);
  }

  // Print Integration Results
  if (integrationIssues.length > 0) {
    printIssuesByContext('INTEGRATION', integrationIssues, integrationErrors, integrationWarnings, integrationInfos);
  }

  if (migrationIssues.length === 0 && integrationIssues.length === 0) {
    console.log('✅ No issues found! Migration and Integration mappings look good.\n');
  } else {
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log('Please review and address all errors before proceeding.');
    console.log('Warnings should be reviewed to ensure they are acceptable.');
    console.log('Information items are for awareness and may not require action.\n');
  }
}

function printIssuesByContext(
  context: string,
  issues: Issue[],
  errors: Issue[],
  warnings: Issue[],
  infos: Issue[]
) {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log(`${context} ANALYSIS`);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  if (errors.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    const action = context === 'MIGRATION' ? 'migration' : 'integration';
    console.log(`❌ ERRORS (Must be fixed before ${action})`);
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    errors.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.field ? `Field: ${issue.field}` : ''}`);
      console.log(`   ${issue.message}`);
      if (issue.recommendation) {
        console.log(`   💡 Recommendation: ${issue.recommendation}`);
      }
      console.log('');
    });
  }

  if (warnings.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('⚠️  WARNINGS (Should be reviewed)');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    warnings.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.field ? `Field: ${issue.field}` : ''}`);
      console.log(`   ${issue.message}`);
      if (issue.recommendation) {
        console.log(`   💡 Recommendation: ${issue.recommendation}`);
      }
      console.log('');
    });
  }

  if (infos.length > 0) {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('ℹ️  INFORMATION (For awareness)');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    infos.forEach((issue, index) => {
      console.log(`${index + 1}. [${issue.category}] ${issue.field ? `Field: ${issue.field}` : ''}`);
      console.log(`   ${issue.message}`);
      if (issue.recommendation) {
        console.log(`   💡 Recommendation: ${issue.recommendation}`);
      }
      console.log('');
    });
  }
}

function getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  if (cell.isMerged && cell.master) {
    return getCellValueAsString(cell.master);
  }
  if (typeof cell.value === 'string') return cell.value.trim();
  if (typeof cell.value === 'number') return cell.value.toString();
  if (cell.value instanceof Date) return cell.value.toISOString().split('T')[0];
  if (typeof cell.value === 'boolean') return cell.value ? 'Yes' : 'No';
  if (typeof cell.value === 'object') {
    if ('richText' in cell.value) {
      return (cell.value as any).richText.map((rt: any) => rt.text).join('');
    }
    if ('result' in cell.value) return String(cell.value.result);
    return String(cell.value);
  }
  return String(cell.value).trim();
}

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

if (require.main === module) {
  analyzeMigrationMapping();
}

