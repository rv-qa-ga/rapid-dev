/**
 * Extract ignored fields from Party Integration tab
 * Identifies rows with strikethrough formatting
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface IgnoredField {
  rowNumber: number;
  salesforceField?: string;
  salesforceValue?: string;
  dataverseField?: string;
  dataverseValue?: string;
  comments?: string;
  allRowData: Record<string, string>;
}

async function extractIgnoredFields(): Promise<IgnoredField[]> {
  const excelPath = path.join(process.cwd(), 'data/excel/Picklist Value Mappings.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  console.log(`📖 Reading Excel file: ${excelPath}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const worksheet = workbook.getWorksheet('Party Integration');
  
  if (!worksheet) {
    throw new Error('Party Integration sheet not found');
  }

  console.log(`Processing "Party Integration" tab...\n`);

  // Get headers from first row
  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const value = getCellValueAsString(cell);
    headers[colNumber - 1] = value;
  });

  console.log(`Headers: ${headers.join(', ')}\n`);

  const ignoredFields: IgnoredField[] = [];

  // Process each row (starting from row 2)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    // Check if any cell in the row has strikethrough
    let hasStrikethrough = false;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cell.font && cell.font.strike) {
        hasStrikethrough = true;
      }
    });

    if (hasStrikethrough) {
      const ignoredField: IgnoredField = {
        rowNumber,
        allRowData: {}
      };

      // Extract all cell values
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        const value = getCellValueAsString(cell);
        
        if (header) {
          ignoredField.allRowData[header] = value;
          
          // Map to specific fields based on header names
          if (header.toLowerCase().includes('salesforce picklist field')) {
            ignoredField.salesforceField = value;
          }
          if (header.toLowerCase().includes('salesforce picklist value')) {
            ignoredField.salesforceValue = value;
          }
          if (header.toLowerCase().includes('dataverse picklist field')) {
            ignoredField.dataverseField = value;
          }
          if (header.toLowerCase().includes('dataverse value')) {
            ignoredField.dataverseValue = value;
          }
          if (header.toLowerCase().includes('comment')) {
            ignoredField.comments = value;
          }
        }
      });

      ignoredFields.push(ignoredField);
      
      console.log(`Row ${rowNumber}: Found strikethrough`);
      console.log(`  Salesforce Field: ${ignoredField.salesforceField || 'N/A'}`);
      console.log(`  Salesforce Value: ${ignoredField.salesforceValue || 'N/A'}`);
      console.log(`  Dataverse Field: ${ignoredField.dataverseField || 'N/A'}`);
      console.log(`  Dataverse Value: ${ignoredField.dataverseValue || 'N/A'}`);
      console.log(``);
    }
  });

  return ignoredFields;
}

function getCellValueAsString(cell: ExcelJS.Cell): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }

  if (typeof cell.value === 'string') {
    return cell.value;
  }

  if (typeof cell.value === 'number') {
    return cell.value.toString();
  }

  if (cell.value instanceof Date) {
    return cell.value.toISOString();
  }

  if (typeof cell.value === 'object' && 'text' in cell.value) {
    return (cell.value as any).text;
  }

  return String(cell.value);
}

// Main execution
(async () => {
  try {
    const ignoredFields = await extractIgnoredFields();
    
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`SUMMARY`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
    console.log(`Total ignored fields found: ${ignoredFields.length}\n`);

    // Save to JSON
    const outputPath = path.join(process.cwd(), 'reports', 'ignored-fields.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(ignoredFields, null, 2));
    console.log(`📄 Ignored fields data saved to: ${outputPath}`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();

