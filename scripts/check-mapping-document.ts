/**
 * Check Mapping and Governance Excel file structure
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

async function checkMappingDocument() {
  const excelPath = path.join(process.cwd(), 'data/excel/RVLOCAL-Mapping and Governance of Data Attributes for CLM Design.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.log('File not found:', excelPath);
    return;
  }

  console.log(`📖 Reading: ${path.basename(excelPath)}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  console.log(`Total Sheets: ${workbook.worksheets.length}\n`);

  // Find "I" tabs (Integration tabs)
  const integrationTabs = workbook.worksheets.filter(ws => ws.name.startsWith('I '));
  
  console.log(`Integration Tabs (starting with "I "): ${integrationTabs.length}`);
  integrationTabs.forEach(ws => {
    console.log(`  - "${ws.name}" (${ws.rowCount} rows)`);
  });

  // Check if "I accounts -> party" exists
  const accountsPartyTab = workbook.getWorksheet('I accounts -> party');
  if (accountsPartyTab) {
    console.log(`\n✅ Found "I accounts -> party" tab`);
    console.log(`   Rows: ${accountsPartyTab.rowCount}`);
    console.log(`   Columns: ${accountsPartyTab.columnCount}`);
    
    // Get headers
    const headers: string[] = [];
    accountsPartyTab.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || '';
    });
    console.log(`   Headers: ${headers.filter(h => h).join(', ')}`);
  } else {
    console.log(`\n❌ "I accounts -> party" tab not found`);
  }
}

checkMappingDocument().catch(console.error);

