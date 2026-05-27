#!/usr/bin/env ts-node

import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function checkSheets() {
  const excelPath = path.join(process.cwd(), 'data/excel/AccountMigrationMappingDocument.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  
  console.log('Available sheets:');
  workbook.worksheets.forEach(ws => {
    console.log(`  - "${ws.name}" (${ws.rowCount} rows, ${ws.columnCount} cols)`);
  });
}

checkSheets().catch(console.error);

