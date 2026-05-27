/**
 * Validate SQL Query Mappings Against Excel File
 * 
 * This script compares the CASE statement mappings in the SQL query
 * with the mappings in PicklistValueMappings.xlsx to ensure consistency.
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface SqlMapping {
  fieldName: string;
  dataverseCode: string | number;
  salesforceValue: string;
  type: 'option-set' | 'guid' | 'composite';
}

interface ExcelMapping {
  fieldName: string;
  dataverseCode: string | number | null;
  dataverseLabel: string | null;
  salesforceValue: string;
}

/**
 * Extract mappings from SQL query CASE statements
 */
function extractSqlMappings(): SqlMapping[] {
  const mappings: SqlMapping[] = [];

  // statuscode - composite logic (documented separately)
  mappings.push(
    { fieldName: 'statuscode', dataverseCode: 'composite:statecode=1', salesforceValue: 'Inactive', type: 'composite' },
    { fieldName: 'statuscode', dataverseCode: 'composite:statecode=0,statuscode=1', salesforceValue: 'Active', type: 'composite' },
    { fieldName: 'statuscode', dataverseCode: 'composite:statecode=0,statuscode=376140001', salesforceValue: 'Onboarding', type: 'composite' },
    { fieldName: 'statuscode', dataverseCode: 'composite:statecode=0,statuscode=376140002', salesforceValue: 'Offboarded', type: 'composite' }
  );

  // accelins_partytype - GUID mappings
  const partyTypeMappings = [
    { guid: 'B9033563-83CF-EB11-BACC-000D3A7FD928', value: 'Member' },
    { guid: '5C0C2D6F-83CF-EB11-BACC-000D3A7FD928', value: 'Insurer' },
    { guid: 'CE4F4275-83CF-EB11-BACC-000D3A7FD928', value: 'Third Party Administartor' },
    { guid: '4B717394-83CF-EB11-BACC-000D3A7FD928', value: 'Agency' },
    { guid: '152283A0-83CF-EB11-BACC-000D3A7FD928', value: 'Reinsurer' },
    { guid: '5192E8AC-83CF-EB11-BACC-000D3A7FD928', value: 'Reinsurance Broker' },
    { guid: 'BD02CCF2-7E05-EC11-B6E6-00224841D25C', value: 'Placing Broker' },
    { guid: 'C85F04A7-4607-ED11-82E4-002248428D72', value: 'Group' },
    { guid: 'D35F04A7-4607-ED11-82E4-002248428D72', value: 'Legal Entity' },
    { guid: '5D0E6E8E-9BE2-ED11-8846-6045BDD2C97F', value: 'Service Company' },
    { guid: 'C290FBA0-9BE2-ED11-8846-6045BDD2C97F', value: 'Acquisition Company' },
    { guid: 'FB3252B3-9BE2-ED11-8846-6045BDD2C97F', value: 'Reinsurer Branch' },
    { guid: '113352B3-9BE2-ED11-8846-6045BDD2C97F', value: 'Agency Branch' },
    { guid: '613451BF-9BE2-ED11-8846-6045BDD2C97F', value: 'Insurer Branch' },
    { guid: '62EC9BE6-A606-EE11-8F6E-6045BDD2C97F', value: 'Distribution Partner' },
    { guid: 'A3AA2790-5986-EF11-AC21-6045BDFBC95C', value: 'Non-Member MGA' }
  ];

  partyTypeMappings.forEach(m => {
    mappings.push({
      fieldName: 'accelins_partytype',
      dataverseCode: m.guid,
      salesforceValue: m.value,
      type: 'guid'
    });
  });

  // accelins_datasource
  mappings.push(
    { fieldName: 'accelins_datasource', dataverseCode: 376140001, salesforceValue: 'VIPR', type: 'option-set' },
    { fieldName: 'accelins_datasource', dataverseCode: 376140000, salesforceValue: 'Platform', type: 'option-set' }
  );

  // accelins_affiliate_nonaffiliate
  mappings.push(
    { fieldName: 'accelins_affiliate_nonaffiliate', dataverseCode: 376140001, salesforceValue: 'NAF', type: 'option-set' },
    { fieldName: 'accelins_affiliate_nonaffiliate', dataverseCode: 376140000, salesforceValue: 'AFL', type: 'option-set' }
  );

  // accelins_functional_currency
  const currencyMappings = [
    { guid: 'EEC11874-81CF-EB11-BACC-000D3AD63AA8', value: 'CAD' },
    { guid: '5CC21874-81CF-EB11-BACC-000D3AD63AA8', value: 'EUR' },
    { guid: '4D4F8679-81CF-EB11-BACC-000D3A7FD928', value: 'GBP' },
    { guid: '8D4F8679-81CF-EB11-BACC-000D3A7FD928', value: 'USD' }
  ];

  currencyMappings.forEach(m => {
    mappings.push({
      fieldName: 'accelins_functional_currency',
      dataverseCode: m.guid,
      salesforceValue: m.value,
      type: 'guid'
    });
  });

  // accelins_admittednonadmitted
  mappings.push(
    { fieldName: 'accelins_admittednonadmitted', dataverseCode: 376140000, salesforceValue: 'Admitted', type: 'option-set' },
    { fieldName: 'accelins_admittednonadmitted', dataverseCode: 376140001, salesforceValue: 'Non-Admitted', type: 'option-set' },
    { fieldName: 'accelins_admittednonadmitted', dataverseCode: 376140002, salesforceValue: 'Not Applicable', type: 'option-set' }
  );

  // accelins_mgaownership
  mappings.push(
    { fieldName: 'accelins_mgaownership', dataverseCode: 376140000, salesforceValue: 'Mission', type: 'option-set' },
    { fieldName: 'accelins_mgaownership', dataverseCode: 376140001, salesforceValue: 'Independent', type: 'option-set' },
    { fieldName: 'accelins_mgaownership', dataverseCode: 376140002, salesforceValue: 'Owned', type: 'option-set' }
  );

  // accelins_datasourceclaims (note: reversed from datasource)
  mappings.push(
    { fieldName: 'accelins_datasourceclaims', dataverseCode: 376140001, salesforceValue: 'Platform', type: 'option-set' },
    { fieldName: 'accelins_datasourceclaims', dataverseCode: 376140000, salesforceValue: 'VIPR', type: 'option-set' }
  );

  return mappings;
}

/**
 * Load mappings from Excel file
 */
async function loadExcelMappings(excelPath: string, sheetName: string = 'Party Migration'): Promise<ExcelMapping[]> {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  // Try exact match first, then case-insensitive
  let worksheet = workbook.getWorksheet(sheetName);
  if (!worksheet) {
    // Try case-insensitive match
    const allSheets = workbook.worksheets.map(ws => ws.name);
    const matchingSheet = allSheets.find(name => 
      name.toLowerCase() === sheetName.toLowerCase()
    );
    if (matchingSheet) {
      worksheet = workbook.getWorksheet(matchingSheet);
      console.log(`   Note: Using sheet "${matchingSheet}" (case-insensitive match)`);
    }
  }

  if (!worksheet) {
    const availableSheets = workbook.worksheets.map(ws => ws.name).join(', ');
    throw new Error(`Sheet "${sheetName}" not found in Excel file. Available sheets: ${availableSheets}`);
  }

  const mappings: ExcelMapping[] = [];
  const headers: string[] = [];

  // Read headers
  worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = getCellValueAsString(cell).trim();
  });

  // Filter out empty headers
  const nonEmptyHeaders = headers.filter(h => h && h.trim() !== '');
  console.log(`   Found ${nonEmptyHeaders.length} columns: ${nonEmptyHeaders.join(', ')}`);

  // Find column indices with more flexible matching
  const fieldNameCol = findColumnIndex(headers, [
    'Dataverse Field Name', 'Dataverse Field', 'Field Name', 'Field',
    'Source Field', 'Source Field Name', 'accelins_party'
  ]);
  const codeCol = findColumnIndex(headers, [
    'Dataverse Raw Value', 'Dataverse Code', 'Code', 'Value',
    'Datawords Code', 'Raw Value', 'Dataverse Value'
  ]);
  const labelCol = findColumnIndex(headers, [
    'Dataverse Label', 'Label', 'Display Label', 'Description'
  ]);
  const targetCol = findColumnIndex(headers, [
    'Salesforce Value Target', 'Salesforce Target', 'Target Value',
    'SF Value', 'Target', 'Salesforce Value', 'Salesforce Picklist Value'
  ]);

  if (fieldNameCol === -1) {
    console.error(`\n❌ Error: Field Name column not found.`);
    console.error(`   Looked for: Dataverse Field Name, Dataverse Field, Field Name, etc.`);
    console.error(`   Available columns: ${nonEmptyHeaders.join(', ')}`);
    throw new Error('Required column "Field Name" not found in Excel file');
  }

  if (targetCol === -1) {
    console.error(`\n❌ Error: Target Value column not found.`);
    console.error(`   Looked for: Salesforce Value Target, Salesforce Target, Target Value, etc.`);
    console.error(`   Available columns: ${nonEmptyHeaders.join(', ')}`);
    throw new Error('Required column "Salesforce Value Target" not found in Excel file');
  }

  console.log(`   Using columns:`);
  console.log(`     Field Name: Column ${fieldNameCol + 1} (${headers[fieldNameCol]})`);
  if (codeCol !== -1) {
    console.log(`     Code: Column ${codeCol + 1} (${headers[codeCol]})`);
  }
  if (labelCol !== -1) {
    console.log(`     Label: Column ${labelCol + 1} (${headers[labelCol]})`);
  }
  console.log(`     Target: Column ${targetCol + 1} (${headers[targetCol]})`);

  // Read data rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const fieldName = getCellValueAsString(row.getCell(fieldNameCol + 1)).trim();
    const code = getCellValueAsString(row.getCell(codeCol + 1));
    const label = labelCol !== -1 ? getCellValueAsString(row.getCell(labelCol + 1)).trim() : null;
    const targetValue = getCellValueAsString(row.getCell(targetCol + 1)).trim();

    if (!fieldName || !targetValue) return;

    // Normalize code
    let normalizedCode: string | number | null = null;
    if (code && code.trim() !== '') {
      const codeTrimmed = code.trim();
      const numValue = Number(codeTrimmed);
      normalizedCode = (!isNaN(numValue) && codeTrimmed === numValue.toString()) ? numValue : codeTrimmed;
    }

    mappings.push({
      fieldName,
      dataverseCode: normalizedCode,
      dataverseLabel: label,
      salesforceValue: targetValue
    });
  });

  return mappings;
}

/**
 * Compare SQL mappings with Excel mappings
 */
function compareMappings(sqlMappings: SqlMapping[], excelMappings: ExcelMapping[]): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   SQL Query vs Excel Mapping Validation                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const missingInExcel: SqlMapping[] = [];
  const mismatched: Array<{ sql: SqlMapping; excel: ExcelMapping | null }> = [];
  const found: SqlMapping[] = [];

  for (const sqlMapping of sqlMappings) {
    // Note: statuscode mappings are now simple (statecode not required for migration)
    // The SQL query handles statecode=1 → 'Inactive' directly

    // Find matching Excel mapping
    const excelMapping = excelMappings.find(ex => {
      const fieldMatch = ex.fieldName.toLowerCase() === sqlMapping.fieldName.toLowerCase() ||
                         ex.fieldName.toLowerCase().includes(sqlMapping.fieldName.toLowerCase()) ||
                         sqlMapping.fieldName.toLowerCase().includes(ex.fieldName.toLowerCase());

      if (!fieldMatch) return false;

      // Compare codes (handle string/number conversion)
      const sqlCode = String(sqlMapping.dataverseCode);
      const excelCode = ex.dataverseCode !== null ? String(ex.dataverseCode) : '';

      return sqlCode === excelCode || 
             (sqlCode.toLowerCase() === excelCode.toLowerCase());
    });

    if (!excelMapping) {
      missingInExcel.push(sqlMapping);
    } else if (excelMapping.salesforceValue !== sqlMapping.salesforceValue) {
      mismatched.push({ sql: sqlMapping, excel: excelMapping });
    } else {
      found.push(sqlMapping);
    }
  }

  // Report results
  console.log(`✅ Found in Excel: ${found.length} mappings`);
  console.log(`❌ Missing in Excel: ${missingInExcel.length} mappings`);
  console.log(`⚠️  Mismatched values: ${mismatched.length} mappings\n`);

  if (missingInExcel.length > 0) {
    console.log('❌ MISSING IN EXCEL:');
    console.log('═══════════════════════════════════════════════════════════════');
    missingInExcel.forEach(m => {
      console.log(`   ${m.fieldName}: ${m.dataverseCode} → ${m.salesforceValue}`);
    });
    console.log('');
  }

  if (mismatched.length > 0) {
    console.log('⚠️  MISMATCHED VALUES:');
    console.log('═══════════════════════════════════════════════════════════════');
    mismatched.forEach(({ sql, excel }) => {
      console.log(`   ${sql.fieldName}: ${sql.dataverseCode}`);
      console.log(`      SQL:    ${sql.salesforceValue}`);
      console.log(`      Excel:  ${excel?.salesforceValue || 'N/A'}`);
      console.log('');
    });
  }

  if (found.length > 0 && missingInExcel.length === 0 && mismatched.length === 0) {
    console.log('✅ All SQL mappings found in Excel with matching values!\n');
  }
}

// Helper functions
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

function getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  if (typeof cell.value === 'string') return cell.value.trim();
  if (typeof cell.value === 'number') return cell.value.toString();
  if (cell.value instanceof Date) return cell.value.toISOString().split('T')[0];
  return String(cell.value).trim();
}

// Main execution
(async () => {
  try {
    // Check for command-line argument
    const args = process.argv.slice(2);
    let excelPath: string | null = null;

    if (args.length > 0 && args[0] && !args[0].startsWith('--')) {
      // User provided file path
      excelPath = path.resolve(args[0]);
      if (!fs.existsSync(excelPath)) {
        console.error(`❌ Error: File not found: ${excelPath}`);
        process.exit(1);
      }
    } else {
      // Try different possible file names in default location
      const possibleFileNames = [
        'PicklistValueMappings.xlsx',
        'Picklist Value Mappings.xlsx',
        'PicklistValueMappings.xls',
        'Picklist Value Mappings.xls'
      ];

      const excelDir = path.join(process.cwd(), 'data', 'excel');

      // Find the Excel file
      for (const fileName of possibleFileNames) {
        const testPath = path.join(excelDir, fileName);
        if (fs.existsSync(testPath)) {
          excelPath = testPath;
          break;
        }
      }

      if (!excelPath) {
        console.error(`❌ Error: PicklistValueMappings.xlsx not found in ${excelDir}`);
        console.error(`   Tried: ${possibleFileNames.join(', ')}`);
        console.error(`\n   Usage: npm run validate:sql-mappings [path-to-excel-file]`);
        console.error(`   Example: npm run validate:sql-mappings "data/excel/PicklistValueMappings.xlsx"`);
        console.error(`\n   Please ensure the Excel file exists or provide the path as an argument.`);
        process.exit(1);
      }
    }

    console.log(`📁 Using Excel file: ${excelPath}\n`);
    
    console.log('📖 Loading SQL query mappings...');
    const sqlMappings = extractSqlMappings();
    console.log(`   Found ${sqlMappings.length} mappings in SQL query\n`);

    console.log('📖 Loading Excel mappings...');
    // Try exact case first, then case-insensitive
    let sheetName = 'Party Migration';
    const excelMappings = await loadExcelMappings(excelPath, sheetName);
    console.log(`   Found ${excelMappings.length} mappings in Excel file (sheet: "${sheetName}")\n`);

    compareMappings(sqlMappings, excelMappings);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();
