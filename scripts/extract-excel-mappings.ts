/**
 * Extract detailed field mappings and picklist values from Excel
 * For use in generating feature files
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

interface PicklistMapping {
  salesforceField: string;
  salesforceValue: string;
  dataverseField: string;
  dataverseValue: string;
  dataverseLabel?: string;
  comments?: string;
  metadata?: string;
  mapTo?: string;
  alternateKey?: string;
}

interface TabMappings {
  tabName: string;
  entity: string;
  direction: 'migration' | 'integration' | 'both';
  mappings: PicklistMapping[];
}

async function extractMappings(): Promise<TabMappings[]> {
  const excelPath = path.join(process.cwd(), 'data/excel/Picklist Value Mappings.xlsx');
  
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }

  console.log(`📖 Reading Excel file: ${excelPath}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  const results: TabMappings[] = [];

  // Process each relevant tab
  const tabsToProcess = [
    { name: 'Party Migration', entity: 'Account/Party', direction: 'migration' as const },
    { name: 'Party Integration', entity: 'Account/Party', direction: 'integration' as const },
    { name: 'Sheet2', entity: 'Account/Party', direction: 'both' as const },
    { name: 'Status Mapping', entity: 'Account/Party', direction: 'both' as const },
    { name: 'Migration External Contact', entity: 'Contact', direction: 'migration' as const },
    { name: 'Integration External Contact', entity: 'Contact', direction: 'integration' as const },
    { name: 'Migration Internal Contact', entity: 'Contact', direction: 'migration' as const },
    { name: 'Integration Internal Contact', entity: 'Contact', direction: 'integration' as const }
  ];

  for (const tabConfig of tabsToProcess) {
    const worksheet = workbook.getWorksheet(tabConfig.name);
    
    if (!worksheet) {
      console.log(`⚠️  Tab "${tabConfig.name}" not found, skipping...`);
      continue;
    }

    console.log(`\nProcessing tab: "${tabConfig.name}"`);

    const tabMapping: TabMappings = {
      tabName: tabConfig.name,
      entity: tabConfig.entity,
      direction: tabConfig.direction,
      mappings: []
    };

    // Get headers
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const value = getCellValueAsString(cell);
      headers[colNumber - 1] = value;
    });

    // Process rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      // Skip strikethrough rows (ignored fields)
      let hasStrikethrough = false;
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.font && cell.font.strike) {
          hasStrikethrough = true;
        }
      });
      if (hasStrikethrough) return;

      const mapping: PicklistMapping = {
        salesforceField: '',
        salesforceValue: '',
        dataverseField: '',
        dataverseValue: ''
      };

      // Extract values based on headers
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        const value = getCellValueAsString(cell);
        
        if (!header || !value) return;

        // Map headers to fields (flexible matching)
        const headerLower = header.toLowerCase();
        
        if (headerLower.includes('salesforce') && headerLower.includes('field')) {
          mapping.salesforceField = value;
        } else if (headerLower.includes('salesforce') && (headerLower.includes('value') || headerLower.includes('target'))) {
          mapping.salesforceValue = value;
        } else if (headerLower.includes('dataverse') && headerLower.includes('field')) {
          mapping.dataverseField = value;
        } else if (headerLower.includes('dataverse') && headerLower.includes('value') && !headerLower.includes('label')) {
          mapping.dataverseValue = value;
        } else if (headerLower.includes('dataverse') && headerLower.includes('label')) {
          mapping.dataverseLabel = value;
        } else if (headerLower.includes('comment')) {
          mapping.comments = value;
        } else if (headerLower.includes('metadata')) {
          mapping.metadata = value;
        } else if (headerLower.includes('map to') || headerLower.includes('map to/store')) {
          mapping.mapTo = value;
        } else if (headerLower.includes('alternate key')) {
          mapping.alternateKey = value;
        }

        // Special handling for Sheet2 (BillingCountry mappings)
        if (tabConfig.name === 'Sheet2') {
          if (headerLower.includes('object_field') || headerLower.includes('field')) {
            mapping.salesforceField = value;
          } else if (headerLower.includes('source_value')) {
            mapping.salesforceValue = value;
          } else if (headerLower.includes('target_value')) {
            mapping.dataverseValue = value;
          }
        }

        // Special handling for Status Mapping
        if (tabConfig.name === 'Status Mapping') {
          if (headerLower.includes('sf field')) {
            mapping.salesforceField = value;
          } else if (headerLower.includes('sf value')) {
            mapping.salesforceValue = value;
          } else if (headerLower.includes('dv entity')) {
            mapping.dataverseField = value;
          } else if (headerLower.includes('dv statecode') || headerLower.includes('dv statuscode')) {
            mapping.dataverseValue = value;
          }
        }
      });

      // Only add if we have meaningful data
      if (mapping.salesforceField || mapping.dataverseField || mapping.salesforceValue || mapping.dataverseValue) {
        tabMapping.mappings.push(mapping);
      }
    });

    console.log(`  Found ${tabMapping.mappings.length} mappings`);
    results.push(tabMapping);
  }

  return results;
}

function getCellValueAsString(cell: ExcelJS.Cell): string {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }

  if (typeof cell.value === 'string') {
    return cell.value.trim();
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

  return String(cell.value).trim();
}

// Main execution
(async () => {
  try {
    const mappings = await extractMappings();
    
    // Save to JSON
    const outputPath = path.join(process.cwd(), 'reports', 'excel-mappings-extracted.json');
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
    console.log(`\n📄 Mappings extracted and saved to: ${outputPath}`);

    // Print summary
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`SUMMARY`);
    console.log(`═══════════════════════════════════════════════════════════════\n`);
    
    for (const tab of mappings) {
      console.log(`${tab.tabName}: ${tab.mappings.length} mappings (${tab.entity}, ${tab.direction})`);
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
})();

