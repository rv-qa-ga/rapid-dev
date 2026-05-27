#!/usr/bin/env ts-node

/**
 * Analyze Migration Mapping Excel File
 * Reads and displays the structure of AccountMigrationMappingDocument.xlsx
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

async function analyzeMigrationMapping() {
  const excelPath = path.join(process.cwd(), 'data/excel/AccountMigrationMappingDocument.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ File not found: ${excelPath}`);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('Analyzing Migration Mapping Document');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    console.log(`📚 Total Sheets: ${workbook.worksheets.length}\n`);

    // Analyze each sheet
    for (const worksheet of workbook.worksheets) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📊 Sheet: "${worksheet.name}"`);
      console.log(`   Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);
      console.log('='.repeat(80));

      // Get headers
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value?.toString()?.trim() || `Column${colNumber}`;
      });

      console.log(`\n   Headers (${headers.length}):`);
      headers.forEach((header, idx) => {
        console.log(`     ${(idx + 1).toString().padStart(2)}: ${header}`);
      });

      // Show sample data (first 5 rows)
      console.log(`\n   Sample Data (first 5 rows):`);
      for (let rowNum = 2; rowNum <= Math.min(6, worksheet.rowCount); rowNum++) {
        const row = worksheet.getRow(rowNum);
        const rowData: any = {};
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          if (header) {
            let value = cell.value;
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            } else if (value !== null && value !== undefined) {
              value = value.toString();
            } else {
              value = '(empty)';
            }
            rowData[header] = value;
          }
        });

        if (Object.keys(rowData).length > 0) {
          console.log(`\n   Row ${rowNum}:`);
          Object.entries(rowData).forEach(([key, value]) => {
            const displayValue = String(value).length > 50 
              ? String(value).substring(0, 50) + '...' 
              : String(value);
            console.log(`     ${key}: ${displayValue}`);
          });
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  analyzeMigrationMapping();
}

