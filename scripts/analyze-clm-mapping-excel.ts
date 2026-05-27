/**
 * Analyze Mapping and Governance of Data Attributes for CLM Design Excel file
 * Extract field mappings for ST-191, ST-241, ST-242 integration testing
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface FieldMapping {
  salesforceField: string;
  salesforceObject: string;
  dataverseField: string;
  dataverseEntity: string;
  mappingType?: string;
  condition?: string;
  notes?: string;
  rowNumber: number;
}

interface TabInfo {
  tabName: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  entity?: string;
  direction?: 'integration' | 'migration' | 'both';
}

function getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  
  // Handle rich text
  if (typeof cell.value === 'object' && 'richText' in cell.value) {
    const richText = (cell.value as any).richText;
    if (Array.isArray(richText)) {
      return richText.map((rt: any) => rt.text || '').join('').trim();
    }
  }
  
  // Handle text object
  if (typeof cell.value === 'object' && 'text' in cell.value) {
    return String((cell.value as any).text).trim();
  }
  
  // Handle formula result
  if (cell.type === ExcelJS.ValueType.Formula && cell.result !== null && cell.result !== undefined) {
    return String(cell.result).trim();
  }
  
  // Handle date
  if (cell.value instanceof Date) {
    return cell.value.toISOString();
  }
  
  // Handle number
  if (typeof cell.value === 'number') {
    return String(cell.value);
  }
  
  // Default to string
  return String(cell.value).trim();
}

function findColumnIndex(headers: string[], possibleNames: string | string[]): number {
  const names = Array.isArray(possibleNames) ? possibleNames : [possibleNames];
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  for (const name of names) {
    const lowerName = name.toLowerCase().trim();
    const index = lowerHeaders.findIndex(h => h.includes(lowerName) || lowerName.includes(h));
    if (index !== -1) return index;
  }
  
  return -1;
}

async function analyzeExcelFile() {
  const excelPath = path.join(process.cwd(), 'data/excel/Mapping and Governance of Data Attributes for CLM Design-19-Jan-2025.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    console.error(`❌ File not found: ${excelPath}`);
    return;
  }

  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   ANALYZING CLM MAPPING EXCEL FILE                                           ║`);
  console.log(`║   ${path.basename(excelPath).padEnd(70)} ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  console.log(`📊 Total Sheets: ${workbook.worksheets.length}\n`);

  // Get all sheet names
  const allSheets: TabInfo[] = [];
  workbook.worksheets.forEach(ws => {
    const headers: string[] = [];
    if (ws.rowCount > 0) {
      ws.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
        headers[colNumber - 1] = getCellValueAsString(cell);
      });
    }
    
    allSheets.push({
      tabName: ws.name,
      rowCount: ws.rowCount,
      columnCount: ws.columnCount,
      headers: headers.filter(h => h)
    });
  });

  // Identify integration tabs (starting with "I ")
  const integrationTabs = allSheets.filter(s => s.tabName.startsWith('I '));
  console.log(`🔍 Integration Tabs (starting with "I "): ${integrationTabs.length}`);
  integrationTabs.forEach(s => {
    console.log(`   ✓ "${s.tabName}" (${s.rowCount} rows, ${s.columnCount} cols)`);
  });

  // Identify migration tabs (starting with "M ")
  const migrationTabs = allSheets.filter(s => s.tabName.startsWith('M '));
  console.log(`\n📦 Migration Tabs (starting with "M "): ${migrationTabs.length}`);
  migrationTabs.forEach(s => {
    console.log(`   ✓ "${s.tabName}" (${s.rowCount} rows, ${s.columnCount} cols)`);
  });

  // Focus on integration tabs for ST-191, ST-241, ST-242
  const relevantTabs = [
    { name: 'I accounts -> party', entity: 'Account', target: 'accelins_party', stories: ['ST-191'] },
    { name: 'I contacts -> externalcontact', entity: 'Contact', target: 'contact', stories: ['ST-242'] },
    { name: 'I TeamMember ->internal_contact', entity: 'AccountTeamMember', target: 'accelins_internal_contact', stories: ['ST-241'] }
  ];

  console.log(`\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   EXTRACTING MAPPINGS FOR ST-191, ST-241, ST-242                             ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  const allMappings: { [key: string]: FieldMapping[] } = {};

  for (const tabConfig of relevantTabs) {
    const worksheet = workbook.getWorksheet(tabConfig.name);
    
    if (!worksheet) {
      console.log(`⚠️  Tab "${tabConfig.name}" not found, skipping...`);
      continue;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Processing: "${tabConfig.name}"`);
    console.log(`   Entity: ${tabConfig.entity} → ${tabConfig.target}`);
    console.log(`   Stories: ${tabConfig.stories.join(', ')}`);
    console.log(`${'='.repeat(80)}\n`);

    // Get headers
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = getCellValueAsString(cell);
    });

    console.log(`📊 Headers (${headers.filter(h => h).length} columns):`);
    headers.forEach((h, i) => {
      if (h) console.log(`   ${i + 1}. ${h}`);
    });

    // Find key column indices
    const sfFieldCol = findColumnIndex(headers, ['Source Field Name', 'Salesforce Field', 'SF Field', 'Field', 'Source Field', 'Salesforce']);
    const dvFieldCol = findColumnIndex(headers, ['Target Field Name', 'Dataverse Field', 'DV Field', 'Target Field', 'Dataverse', 'accelins_']);
    const transformationCol = findColumnIndex(headers, ['Transformation Logic', 'Transformation', 'Logic', 'Rule']);
    const conditionCol = findColumnIndex(headers, ['Validation / Business Rule', 'Condition', 'If', 'When', 'Rule', 'Validation']);
    const notesCol = findColumnIndex(headers, ['Comments / Notes', 'Notes', 'Note', 'Comment', 'Description', 'Remarks']);

    console.log(`\n🔍 Column Mapping:`);
    console.log(`   Salesforce Field: Column ${sfFieldCol + 1}${sfFieldCol === -1 ? ' (NOT FOUND)' : ` (${headers[sfFieldCol]})`}`);
    console.log(`   Dataverse Field: Column ${dvFieldCol + 1}${dvFieldCol === -1 ? ' (NOT FOUND)' : ` (${headers[dvFieldCol]})`}`);
    if (conditionCol !== -1) console.log(`   Condition: Column ${conditionCol + 1} (${headers[conditionCol]})`);
    if (notesCol !== -1) console.log(`   Notes: Column ${notesCol + 1} (${headers[notesCol]})`);

    if (sfFieldCol === -1 || dvFieldCol === -1) {
      console.log(`\n⚠️  Required columns not found. Skipping data extraction.`);
      continue;
    }

    // Extract mappings
    const mappings: FieldMapping[] = [];
    let skippedRows = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Check for strikethrough (ignored fields)
      let hasStrikethrough = false;
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.font && cell.font.strike) {
          hasStrikethrough = true;
        }
      });
      if (hasStrikethrough) {
        skippedRows++;
        return;
      }

      const sfField = getCellValueAsString(row.getCell(sfFieldCol + 1));
      const dvField = getCellValueAsString(row.getCell(dvFieldCol + 1));
      const transformation = transformationCol !== -1 ? getCellValueAsString(row.getCell(transformationCol + 1)) : '';
      const condition = conditionCol !== -1 ? getCellValueAsString(row.getCell(conditionCol + 1)) : '';
      const notes = notesCol !== -1 ? getCellValueAsString(row.getCell(notesCol + 1)) : '';

      // Skip rows with no meaningful data
      if ((!sfField || sfField === 'N/A' || sfField.toLowerCase() === 'source field name') && 
          (!dvField || dvField === 'N/A' || dvField.toLowerCase() === 'target field name')) {
        skippedRows++;
        return; // Empty or header row
      }

      mappings.push({
        salesforceField: sfField,
        salesforceObject: tabConfig.entity,
        dataverseField: dvField,
        dataverseEntity: tabConfig.target,
        mappingType: transformation || undefined,
        condition: condition || undefined,
        notes: notes || undefined,
        rowNumber: rowNumber
      });
    });

    console.log(`\n📈 Extracted ${mappings.length} field mappings (${skippedRows} rows skipped)`);
    
    if (mappings.length > 0) {
      console.log(`\n📋 Sample Mappings (first 10):`);
      mappings.slice(0, 10).forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.salesforceField} → ${m.dataverseField}${m.condition ? ` (Condition: ${m.condition})` : ''}`);
      });
      if (mappings.length > 10) {
        console.log(`   ... and ${mappings.length - 10} more`);
      }
    }

    allMappings[tabConfig.name] = mappings;
  }

  // Generate summary report
  console.log(`\n\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   SUMMARY REPORT                                                              ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);

  console.log(`📊 Total Mappings Extracted:`);
  Object.keys(allMappings).forEach(tabName => {
    const mappings = allMappings[tabName];
    console.log(`   ${tabName}: ${mappings.length} mappings`);
  });

  // Save to JSON file
  const outputPath = path.join(process.cwd(), 'reports', 'clm-mapping-extracted.json');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const report = {
    sourceFile: path.basename(excelPath),
    extractedAt: new Date().toISOString(),
    tabs: Object.keys(allMappings).map(tabName => ({
      tabName,
      mappings: allMappings[tabName]
    }))
  };

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${outputPath}`);

  return report;
}

// Run the analysis
analyzeExcelFile().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
