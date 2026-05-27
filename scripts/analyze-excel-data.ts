/**
 * Script to analyze Excel files and extract structure
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

async function analyzeExcelFile(filePath: string, sheetName?: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analyzing: ${path.basename(filePath)}`);
  if (sheetName) {
    console.log(`Target Sheet: "${sheetName}"`);
  }
  console.log('='.repeat(80));

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheetCount = workbook.worksheets.length;
    console.log(`\n📚 Total Sheets: ${sheetCount}`);

    // List all sheets
    workbook.eachSheet((ws) => {
      console.log(`   - "${ws.name}" (${ws.rowCount} rows, ${ws.columnCount} cols)`);
    });

    // Analyze specific sheet or first sheet
    const worksheet = sheetName 
      ? workbook.getWorksheet(sheetName)
      : workbook.worksheets[0];

    if (!worksheet) {
      console.error(`\n❌ Sheet "${sheetName || 'first sheet'}" not found`);
      return;
    }

    console.log(`\n📊 Analyzing Sheet: "${worksheet.name}"`);
    console.log(`   Rows: ${worksheet.rowCount}, Columns: ${worksheet.columnCount}`);

    // Get headers
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
    });

    console.log(`\n   Headers (${headers.length}):`);
    headers.forEach((header, idx) => {
      console.log(`     ${(idx + 1).toString().padStart(2)}: ${header}`);
    });

    // Show sample data (first 3 rows)
    console.log(`\n   Sample Data (first 3 rows):`);
    for (let rowNum = 2; rowNum <= Math.min(4, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          const value = cell.value;
          if (value instanceof Date) {
            rowData[header] = value.toISOString().split('T')[0];
          } else {
            rowData[header] = value?.toString() || '';
          }
        }
      });
      const preview = JSON.stringify(rowData, null, 2);
      console.log(`     Row ${rowNum - 1}:`, preview.substring(0, 300) + (preview.length > 300 ? '...' : ''));
    }
  } catch (error: any) {
    console.error(`   Error reading workbook: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
  }
}

async function main() {
  const files = [
    { path: path.join(process.cwd(), 'data/excel/All Parties .xlsx'), sheetName: 'All Parties' },
    { path: path.join(process.cwd(), 'data/excel/contacts.xlsx'), sheetName: 'contacts' },
  ];

  for (const fileInfo of files) {
    try {
      await analyzeExcelFile(fileInfo.path, fileInfo.sheetName);
    } catch (error: any) {
      console.error(`Error analyzing ${fileInfo.path}:`, error.message);
    }
  }
}

main().catch(console.error);
