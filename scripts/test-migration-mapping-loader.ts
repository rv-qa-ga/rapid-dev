#!/usr/bin/env ts-node

/**
 * Test Migration Mapping Loader
 * Tests loading field mappings from Excel file
 */

import { loadMappingsFromExcel } from '../src/utils/migration-mapping-loader';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('Testing Migration Mapping Loader');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  try {
    const mappings = await loadMappingsFromExcel();
    
    console.log(`✅ Successfully loaded ${mappings.length} field mappings\n`);
    
    console.log('Sample Mappings (first 10):');
    console.log('───────────────────────────────────────────────────────────────────────────────');
    mappings.slice(0, 10).forEach((mapping, index) => {
      console.log(`${(index + 1).toString().padStart(2)}. ${mapping.dynamicsField} → ${mapping.salesforceField}`);
      console.log(`    Type: ${mapping.fieldType}, Critical: ${mapping.isCritical ? 'Yes' : 'No'}, Tolerance: ${mapping.tolerance}`);
    });

    const criticalCount = mappings.filter(m => m.isCritical).length;
    const lookupCount = mappings.filter(m => m.fieldType === 'lookup').length;
    const dateCount = mappings.filter(m => m.fieldType === 'date').length;

    console.log('\n───────────────────────────────────────────────────────────────────────────────');
    console.log('Summary:');
    console.log(`  Total Mappings: ${mappings.length}`);
    console.log(`  Critical Fields: ${criticalCount}`);
    console.log(`  Lookup Fields: ${lookupCount}`);
    console.log(`  Date Fields: ${dateCount}`);
    console.log('───────────────────────────────────────────────────────────────────────────────\n');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

