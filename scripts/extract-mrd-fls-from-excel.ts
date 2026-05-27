#!/usr/bin/env ts-node

/**
 * Extract MRD FLS permissions from Excel file
 * 
 * Reads: data/excel/RVLOCAL-Mapping and Governance of Data Attributes for CLM Design.xlsx
 * Outputs: FLS matrix JSON with date-stamped versioning
 * 
 * Usage:
 *   npm run extract:mrd-fls
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface FieldFLS {
  fieldName: string;
  fieldLabel?: string;
  fieldType?: string;
  rolePermissions: {
    mrd: {
      view: boolean;
      edit: boolean;
      required?: boolean;
    };
  };
  sensitiveDataClassification?: Array<'PII' | 'Financial' | 'Compliance' | 'Confidential'>;
  notes?: string;
}

interface ObjectFLS {
  objectName: string;
  fields: FieldFLS[];
}

interface FLSMatrix {
  version: string;
  lastUpdated: string;
  source: string;
  confluenceReference?: string;
  description?: string;
  objects: { [objectName: string]: ObjectFLS };
}

async function extractMRDFLSFromExcel(): Promise<FLSMatrix> {
  const excelPath = path.join(process.cwd(), 'data/excel/RVLOCAL-Mapping and Governance of Data Attributes for CLM Design.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`📖 Reading Excel file: ${path.basename(excelPath)}`);
  console.log('='.repeat(80));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  console.log(`\n📚 Total Sheets: ${workbook.worksheets.length}`);
  workbook.eachSheet((ws) => {
    console.log(`   - "${ws.name}" (${ws.rowCount} rows, ${ws.columnCount} cols)`);
  });

  const flsMatrix: FLSMatrix = {
    version: `1.0.0-${new Date().toISOString().split('T')[0]}`,
    lastUpdated: new Date().toISOString(),
    source: excelPath,
    confluenceReference: 'https://accelins.atlassian.net/wiki/spaces/SA/pages/2773942425/Sharing+Visibility+and+Access+Model',
    description: 'Field-Level Security matrix for MRD role extracted from RVLOCAL-Mapping and Governance of Data Attributes for CLM Design.xlsx',
    objects: {},
  };

  // Process each sheet (each sheet represents an object)
  workbook.eachSheet((worksheet) => {
    const objectName = worksheet.name.trim();
    
    if (!objectName || objectName.toLowerCase().includes('summary') || objectName.toLowerCase().includes('index')) {
      console.log(`\n⏭️  Skipping sheet: "${objectName}" (summary/index sheet)`);
      return;
    }

    console.log(`\n📊 Processing Sheet: "${objectName}"`);
    console.log(`   Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = cell.value?.toString()?.trim() || '';
      headers[colNumber - 1] = value;
    });

    console.log(`\n   Headers (${headers.length}):`);
    headers.forEach((header, idx) => {
      if (header) {
        console.log(`     ${(idx + 1).toString().padStart(2)}: ${header}`);
      }
    });

    // Find column indices
    // Note: Columns M and N (index 12 and 13) contain MRD permissions
    const fieldNameCol = findColumnIndex(headers, ['Field Name', 'Field', 'API Name', 'Field API Name']);
    const fieldLabelCol = findColumnIndex(headers, ['Field Label', 'Label', 'Display Name']);
    const fieldTypeCol = findColumnIndex(headers, ['Field Type', 'Type', 'Data Type']);
    
    // Columns M (index 12) and N (index 13) contain MRD permissions
    // Try to find by column position first, then by header name
    let mrdViewCol = -1;
    let mrdEditCol = -1;
    
    // Check if columns M and N exist (0-based index 12 and 13)
    if (headers.length > 12) {
      const colMHeader = headers[12]?.toLowerCase().trim() || '';
      const colNHeader = headers[13]?.toLowerCase().trim() || '';
      
      // Column M is typically View, Column N is typically Edit
      if (colMHeader.includes('view') || colMHeader.includes('mrd')) {
        mrdViewCol = 12;
      }
      if (colNHeader.includes('edit') || colNHeader.includes('mrd')) {
        mrdEditCol = 13;
      }
      
      // If not found by header, assume M=View, N=Edit based on user specification
      if (mrdViewCol === -1 && mrdEditCol === -1) {
        console.log(`   ℹ️  Using columns M (index 12) and N (index 13) for MRD permissions`);
        mrdViewCol = 12; // Column M
        mrdEditCol = 13; // Column N
      }
    }
    
    // Fallback: Try to find by header name
    if (mrdViewCol === -1) {
      mrdViewCol = findColumnIndex(headers, ['MRD - View', 'MRD View', 'MRD View Access', 'View (MRD)', 'View']);
    }
    if (mrdEditCol === -1) {
      mrdEditCol = findColumnIndex(headers, ['MRD - Edit', 'MRD Edit', 'MRD Edit Access', 'Edit (MRD)', 'Edit']);
    }
    
    const requiredCol = findColumnIndex(headers, ['Required', 'Required?', 'Is Required']);
    const classificationCol = findColumnIndex(headers, ['Sensitive Data Classification', 'Classification', 'Data Classification', 'PII/Financial']);
    const notesCol = findColumnIndex(headers, ['Notes', 'Comments', 'Description']);

    if (fieldNameCol === -1) {
      console.log(`   ⚠️  Warning: Field Name column not found. Skipping sheet "${objectName}"`);
      return;
    }

    if (mrdViewCol === -1 && mrdEditCol === -1) {
      console.log(`   ⚠️  Warning: MRD View/Edit columns (M and N) not found. Skipping sheet "${objectName}"`);
      return;
    }
    
    console.log(`   📍 MRD Permissions Columns: M (index ${mrdViewCol}) = View, N (index ${mrdEditCol}) = Edit`);

    const fields: FieldFLS[] = [];

    // Process data rows (starting from row 2)
    for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      const fieldName = getCellValue(row, fieldNameCol)?.trim();
      if (!fieldName || fieldName === '' || fieldName.toLowerCase() === 'field name') {
        continue; // Skip empty rows or repeated headers
      }

      const fieldLabel = fieldLabelCol >= 0 ? getCellValue(row, fieldLabelCol)?.trim() : undefined;
      const fieldType = fieldTypeCol >= 0 ? getCellValue(row, fieldTypeCol)?.trim() : undefined;
      
      // Parse MRD permissions
      const mrdViewValue = (mrdViewCol >= 0 ? getCellValue(row, mrdViewCol)?.toString().toLowerCase().trim() : '') || '';
      const mrdEditValue = (mrdEditCol >= 0 ? getCellValue(row, mrdEditCol)?.toString().toLowerCase().trim() : '') || '';
      
      const mrdView = parseBoolean(mrdViewValue);
      const mrdEdit = parseBoolean(mrdEditValue);
      
      const requiredValue = (requiredCol >= 0 ? getCellValue(row, requiredCol)?.toString().toLowerCase().trim() : '') || '';
      const required = parseBoolean(requiredValue);
      
      // Parse sensitive data classification
      const classificationValue = (classificationCol >= 0 ? getCellValue(row, classificationCol)?.toString().trim() : '') || '';
      const sensitiveDataClassification = parseClassification(classificationValue);
      
      const notes = notesCol >= 0 ? getCellValue(row, notesCol)?.toString().trim() : undefined;

      const fieldFLS: FieldFLS = {
        fieldName,
        fieldLabel: fieldLabel || undefined,
        fieldType: fieldType || undefined,
        rolePermissions: {
          mrd: {
            view: mrdView,
            edit: mrdEdit,
            required: required || undefined,
          },
        },
        sensitiveDataClassification: sensitiveDataClassification.length > 0 ? sensitiveDataClassification : undefined,
        notes: notes || undefined,
      };

      fields.push(fieldFLS);
    }

    if (fields.length > 0) {
      // Map "Accounts SoT" to "Account" for Salesforce object name
      const mappedObjectName = objectName === 'Accounts SoT' ? 'Account' : objectName;
      
      flsMatrix.objects[mappedObjectName] = {
        objectName: mappedObjectName,
        fields,
      };
      console.log(`   ✅ Extracted ${fields.length} fields for ${objectName} (mapped to ${mappedObjectName})`);
    } else {
      console.log(`   ⚠️  No fields extracted for ${objectName}`);
    }
  });

  return flsMatrix;
}

function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.toLowerCase().trim() || '';
    for (const name of possibleNames) {
      if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
        return i;
      }
    }
  }
  return -1;
}

function getCellValue(row: ExcelJS.Row, colIndex: number): string | undefined {
  if (colIndex < 0) return undefined;
  const cell = row.getCell(colIndex + 1);
  if (!cell || cell.value === null || cell.value === undefined) {
    return undefined;
  }
  if (cell.value instanceof Date) {
    return cell.value.toISOString().split('T')[0];
  }
  return cell.value.toString().trim();
}

function parseBoolean(value: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1' || lower === '✓' || lower === 'x';
}

function parseClassification(value: string): Array<'PII' | 'Financial' | 'Compliance' | 'Confidential'> {
  if (!value) return [];
  const classifications: Array<'PII' | 'Financial' | 'Compliance' | 'Confidential'> = [];
  const lower = value.toLowerCase();
  
  if (lower.includes('pii') || lower.includes('personal')) {
    classifications.push('PII');
  }
  if (lower.includes('financial') || lower.includes('revenue') || lower.includes('payment')) {
    classifications.push('Financial');
  }
  if (lower.includes('compliance') || lower.includes('regulatory')) {
    classifications.push('Compliance');
  }
  if (lower.includes('confidential') || lower.includes('sensitive')) {
    classifications.push('Confidential');
  }
  
  return classifications;
}

async function main() {
  try {
    const flsMatrix = await extractMRDFLSFromExcel();
    
    // Generate date-stamped filename
    const dateStamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const outputPath = path.join(process.cwd(), `src/config/fls-matrix-${dateStamp}.json`);
    
    // Also create/update the main fls-matrix.json (latest version)
    const mainOutputPath = path.join(process.cwd(), 'src/config/fls-matrix.json');
    
    // Write date-stamped version
    fs.writeFileSync(outputPath, JSON.stringify(flsMatrix, null, 2), 'utf-8');
    console.log(`\n✅ Date-stamped FLS matrix written to: ${path.basename(outputPath)}`);
    
    // Write main version (latest)
    fs.writeFileSync(mainOutputPath, JSON.stringify(flsMatrix, null, 2), 'utf-8');
    console.log(`✅ Latest FLS matrix written to: ${path.basename(mainOutputPath)}`);
    
    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 EXTRACTION SUMMARY`);
    console.log('='.repeat(80));
    console.log(`   Objects: ${Object.keys(flsMatrix.objects).length}`);
    let totalFields = 0;
    for (const obj of Object.values(flsMatrix.objects)) {
      totalFields += obj.fields.length;
      const viewableFields = obj.fields.filter(f => f.rolePermissions.mrd.view).length;
      const editableFields = obj.fields.filter(f => f.rolePermissions.mrd.edit).length;
      console.log(`   - ${obj.objectName}: ${obj.fields.length} fields (${viewableFields} viewable, ${editableFields} editable)`);
    }
    console.log(`   Total Fields: ${totalFields}`);
    console.log(`   Version: ${flsMatrix.version}`);
    console.log(`   Last Updated: ${flsMatrix.lastUpdated}`);
    console.log('='.repeat(80));
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

