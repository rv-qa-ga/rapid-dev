#!/usr/bin/env ts-node

import * as ExcelJS from 'exceljs';
import * as path from 'path';

async function checkIntegrationSheet() {
  const excelPath = path.join(process.cwd(), 'data/excel/AccountMigrationMappingDocument.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  
  const sheet = workbook.getWorksheet('I accounts -> party');
  if (!sheet) {
    console.log('Sheet not found');
    return;
  }
  
  console.log(`Sheet: "I accounts -> party"`);
  console.log(`Rows: ${sheet.rowCount}, Columns: ${sheet.columnCount}\n`);
  
  // Get headers
  const headers: string[] = [];
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || '';
  });
  
  console.log('Headers:');
  headers.forEach((h, i) => {
    console.log(`  ${i + 1}: "${h}"`);
  });
  
  console.log('\nFirst few data rows:');
  for (let r = 2; r <= Math.min(5, sheet.rowCount); r++) {
    const row = sheet.getRow(r);
    const source = row.getCell(1)?.value?.toString() || '';
    const target = row.getCell(2)?.value?.toString() || '';
    console.log(`Row ${r}: "${source}" -> "${target}"`);
  }
}

checkIntegrationSheet().catch(console.error);

