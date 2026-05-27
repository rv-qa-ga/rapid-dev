#!/usr/bin/env ts-node

/**
 * List All Fields Included in Migration
 * Shows all fields from the mapping document that are marked for migration
 */

import { loadMappingsFromExcel } from '../src/utils/migration-mapping-loader';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('Fields Included in Migration');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  try {
    const mappings = await loadMappingsFromExcel();
    
    console.log(`Total Fields: ${mappings.length}\n`);
    console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
    console.log('│ # │ Dynamics Field                    │ Salesforce Field                  │ Type      │ Critical │');
    console.log('├───┼───────────────────────────────────┼───────────────────────────────────┼───────────┼─────────┤');
    
    mappings.forEach((mapping, index) => {
      const num = (index + 1).toString().padStart(2);
      const dynamicsField = mapping.dynamicsField.padEnd(33).substring(0, 33);
      const salesforceField = mapping.salesforceField.padEnd(35).substring(0, 35);
      const fieldType = mapping.fieldType.padEnd(11).substring(0, 11);
      const critical = mapping.isCritical ? 'Yes' : 'No';
      
      console.log(`│ ${num} │ ${dynamicsField} │ ${salesforceField} │ ${fieldType} │ ${critical.padEnd(7)} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────────────────────┘\n');
    
    // Summary by category
    const criticalCount = mappings.filter(m => m.isCritical).length;
    const lookupCount = mappings.filter(m => m.fieldType === 'lookup').length;
    const dateCount = mappings.filter(m => m.fieldType === 'date').length;
    const textCount = mappings.filter(m => m.fieldType === 'text').length;
    const numberCount = mappings.filter(m => m.fieldType === 'number').length;
    const picklistCount = mappings.filter(m => m.fieldType === 'picklist').length;
    const externalIdCount = mappings.filter(m => m.fieldType === 'external-id').length;
    
    console.log('Summary by Category:');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    console.log(`  Total Fields:           ${mappings.length}`);
    console.log(`  Critical Fields:        ${criticalCount}`);
    console.log(`  Lookup Fields:         ${lookupCount}`);
    console.log(`  Date Fields:           ${dateCount}`);
    console.log(`  Text Fields:           ${textCount}`);
    console.log(`  Number Fields:         ${numberCount}`);
    console.log(`  Picklist Fields:       ${picklistCount}`);
    console.log(`  External ID Fields:     ${externalIdCount}`);
    console.log('───────────────────────────────────────────────────────────────────────────────\n');
    
    // Detailed list
    console.log('Detailed Field List:');
    console.log('───────────────────────────────────────────────────────────────────────────────\n');
    
    mappings.forEach((mapping, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${mapping.dynamicsField}`);
      console.log(`    → ${mapping.salesforceField}`);
      console.log(`    Type: ${mapping.fieldType} | Critical: ${mapping.isCritical ? 'Yes' : 'No'} | Tolerance: ${mapping.tolerance}`);
      console.log('');
    });
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

