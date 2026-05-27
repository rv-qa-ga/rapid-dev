/**
 * Parse Picklist Value Mappings.xlsx to extract entity information
 * This script reads all tabs and extracts entity names and metadata
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface EntityInfo {
  tabName: string;
  entityName: string;
  direction?: string; // SF->D365 or D365->SF
  operation?: string; // Create, Update, Delete, Upsert
  fields: string[];
  ignoredFields: string[];
  notes: string[];
}

interface TabSummary {
  tabName: string;
  entities: EntityInfo[];
  allColumns: string[];
  rowCount: number;
}

async function parseExcelFile(): Promise<TabSummary[]> {
  const excelPath = path.join(process.cwd(), 'data/excel/Picklist Value Mappings.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  console.log(`📖 Reading Excel file: ${excelPath}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const summaries: TabSummary[] = [];

  // Process each worksheet
  for (const worksheet of workbook.worksheets) {
    const tabName = worksheet.name;
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`Processing Tab: "${tabName}"`);
    console.log(`═══════════════════════════════════════════════════════════════`);

    const summary: TabSummary = {
      tabName,
      entities: [],
      allColumns: [],
      rowCount: 0
    };

    // Get headers from first row
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = getCellValueAsString(cell);
      headers[colNumber - 1] = value;
    });

    summary.allColumns = headers.filter(h => h && h.trim() !== '');
    console.log(`Columns found: ${summary.allColumns.join(', ')}`);

    // Try to identify entity name from tab name or content
    let inferredEntity = inferEntityFromTabName(tabName);
    
    // Look for entity indicators in headers or first few rows
    const entityInfo: EntityInfo = {
      tabName,
      entityName: inferredEntity || 'Unknown',
      fields: [],
      ignoredFields: [],
      notes: []
    };

    // Analyze rows to find entity information
    let rowCount = 0;
    const fieldSet = new Set<string>();
    const ignoredFieldSet = new Set<string>();

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      rowCount++;
      
      // Check if row is strikethrough (ignored)
      let isIgnored = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        if (cell.font && cell.font.strike) {
          isIgnored = true;
        }
      });

      // Extract field names from various columns
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        const value = getCellValueAsString(cell);
        
        if (!value || value.trim() === '') return;

        // Look for field names in common column patterns
        if (header && (
          header.toLowerCase().includes('field') ||
          header.toLowerCase().includes('source') ||
          header.toLowerCase().includes('target') ||
          header.toLowerCase().includes('salesforce') ||
          header.toLowerCase().includes('dynamics') ||
          header.toLowerCase().includes('d365') ||
          header.toLowerCase().includes('picklist')
        )) {
          if (isIgnored) {
            ignoredFieldSet.add(value.trim());
          } else {
            fieldSet.add(value.trim());
          }
        }

        // Look for entity name in content
        if (header && (
          header.toLowerCase().includes('entity') ||
          header.toLowerCase().includes('object') ||
          header.toLowerCase() === 'sf object' ||
          header.toLowerCase() === 'dv entity'
        )) {
          if (value && value.trim() !== '') {
            const entityValue = value.trim();
            // Normalize entity names
            if (entityValue.toLowerCase() === 'contact' || entityValue.toLowerCase() === 'accelins_contact') {
              entityInfo.entityName = 'Contact';
            } else if (entityValue.toLowerCase() === 'party' || entityValue.toLowerCase() === 'accelins_party' || entityValue.toLowerCase() === 'account') {
              entityInfo.entityName = entityValue.charAt(0).toUpperCase() + entityValue.slice(1).toLowerCase();
            } else {
              entityInfo.entityName = entityValue;
            }
          }
        }
        
        // Special handling for Status Mapping tab
        if (tabName === 'Status Mapping' && header && header.toLowerCase() === 'sf object') {
          if (value && value.trim() !== '') {
            entityInfo.entityName = value.trim();
          }
        }

        // Look for direction indicators
        if (header && (
          header.toLowerCase().includes('direction') ||
          header.toLowerCase().includes('flow')
        )) {
          if (value && (value.includes('SF') || value.includes('D365') || value.includes('Dynamics'))) {
            entityInfo.direction = value.trim();
          }
        }

        // Look for operation type
        if (header && (
          header.toLowerCase().includes('operation') ||
          header.toLowerCase().includes('action')
        )) {
          if (value) {
            entityInfo.operation = value.trim();
          }
        }
      });
    });

    summary.rowCount = rowCount;
    entityInfo.fields = Array.from(fieldSet).sort();
    entityInfo.ignoredFields = Array.from(ignoredFieldSet).sort();

    // If we found fields, add the entity
    if (entityInfo.fields.length > 0 || entityInfo.entityName !== 'Unknown') {
      summary.entities.push(entityInfo);
    }

    // If no entity found but tab has data, try to infer from tab name
    if (summary.entities.length === 0 && rowCount > 0) {
      const inferred = inferEntityFromTabName(tabName);
      if (inferred) {
        summary.entities.push({
          tabName,
          entityName: inferred,
          fields: [],
          ignoredFields: [],
          notes: [`Inferred from tab name: ${tabName}`]
        });
      }
    }

    console.log(`Rows: ${rowCount}`);
    console.log(`Entity: ${entityInfo.entityName}`);
    if (entityInfo.direction) console.log(`Direction: ${entityInfo.direction}`);
    if (entityInfo.operation) console.log(`Operation: ${entityInfo.operation}`);
    console.log(`Fields found: ${entityInfo.fields.length}`);
    console.log(`Ignored fields: ${entityInfo.ignoredFields.length}`);

    summaries.push(summary);
  }

  return summaries;
}

function inferEntityFromTabName(tabName: string): string | null {
  const normalized = tabName.toLowerCase().trim();
  
  // Common entity patterns - prioritize more specific matches
  if (normalized.includes('party')) {
    return 'Party';
  }
  if (normalized.includes('contact')) {
    return 'Contact';
  }
  if (normalized.includes('account') && !normalized.includes('billingcountry')) {
    return 'Account';
  }
  if (normalized.includes('status') && normalized.includes('mapping')) {
    // Status Mapping tab - need to check content to determine entity
    return null; // Will be determined from content
  }
  
  // Common entity patterns
  const entityPatterns: { [key: string]: string } = {
    'opportunity': 'Opportunity',
    'lead': 'Lead',
    'case': 'Case',
    'contract': 'Contract',
    'policy': 'Policy',
    'claim': 'Claim',
    'quote': 'Quote',
    'product': 'Product',
    'pricebook': 'Pricebook',
    'order': 'Order',
    'invoice': 'Invoice',
    'payment': 'Payment'
  };

  for (const [pattern, entity] of Object.entries(entityPatterns)) {
    if (normalized.includes(pattern)) {
      return entity;
    }
  }

  // If tab name looks like an entity name (capitalized, single word or camelCase)
  if (/^[A-Z][a-zA-Z0-9]+$/.test(tabName.trim())) {
    return tabName.trim();
  }

  return null;
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
    const summaries = await parseExcelFile();
    
    console.log(`\n\n`);
    console.log(`═══════════════════════════════════════════════════════════════`);
    console.log(`SUMMARY - ENTITIES FOUND`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);

    const entityMap = new Map<string, { tabs: string[], fields: string[], ignoredFields: string[] }>();

    for (const summary of summaries) {
      for (const entity of summary.entities) {
        if (!entityMap.has(entity.entityName)) {
          entityMap.set(entity.entityName, {
            tabs: [],
            fields: [],
            ignoredFields: []
          });
        }

        const entry = entityMap.get(entity.entityName)!;
        entry.tabs.push(entity.tabName);
        entity.fields.forEach(f => {
          if (!entry.fields.includes(f)) {
            entry.fields.push(f);
          }
        });
        entity.ignoredFields.forEach(f => {
          if (!entry.ignoredFields.includes(f)) {
            entry.ignoredFields.push(f);
          }
        });
      }
    }

    console.log(`Entities I plan to generate features for:\n`);
    let index = 1;
    for (const [entityName, data] of entityMap.entries()) {
      console.log(`${index}. ${entityName}`);
      console.log(`   Tab(s): ${data.tabs.join(', ')}`);
      console.log(`   Fields: ${data.fields.length} found`);
      if (data.ignoredFields.length > 0) {
        console.log(`   Ignored fields: ${data.ignoredFields.length}`);
      }
      console.log(``);
      index++;
    }

    // Save detailed JSON output
    const outputPath = path.join(process.cwd(), 'reports', 'picklist-mappings-analysis.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const output = {
      generatedAt: new Date().toISOString(),
      excelFile: 'data/excel/Picklist Value Mappings.xlsx',
      tabSummaries: summaries,
      entitySummary: Array.from(entityMap.entries()).map(([name, data]) => ({
        entityName: name,
        tabs: data.tabs,
        fieldCount: data.fields.length,
        ignoredFieldCount: data.ignoredFields.length,
        fields: data.fields,
        ignoredFields: data.ignoredFields
      }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n📄 Detailed analysis saved to: ${outputPath}`);

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();

