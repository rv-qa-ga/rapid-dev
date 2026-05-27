#!/usr/bin/env ts-node

/**
 * Generate Comprehensive Test Cases from Azure DevOps Work Items
 * 
 * Analyzes a single work item in depth and produces comprehensive,
 * prioritized test cases with full context analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SQLTestCaseComprehensiveGenerator } from '../../src/integrations/azure-devops/SQLTestCaseComprehensiveGenerator';
import { logger } from '../../src/utils/logger';

const WORK_ITEMS_FILE = 'inputs/ADO-Work-Items.txt';

/**
 * Read work item IDs from file
 */
function readWorkItemIds(): number[] {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  if (!fs.existsSync(filePath)) {
    logger.error(`${WORK_ITEMS_FILE} not found`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const workItemIds: number[] = [];
  
  content
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      // Extract work item ID (e.g., "12345 - Description" or "12345")
      const match = trimmed.match(/^(\d+)/);
      if (match) {
        workItemIds.push(parseInt(match[1], 10));
      }
    });
  
  return workItemIds;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    const args = process.argv.slice(2);
    let workItemIds: number[] = [];
    
    // If work item ID provided as argument, use it
    if (args.length > 0) {
      const workItemId = parseInt(args[0], 10);
      if (isNaN(workItemId)) {
        logger.error(`Invalid work item ID: ${args[0]}`);
        process.exit(1);
      }
      workItemIds = [workItemId];
    } else {
      // Otherwise read from file
      logger.info('🔍 Reading work items from ADO-Work-Items.txt...');
      workItemIds = readWorkItemIds();
    }
    
    if (workItemIds.length === 0) {
      logger.warn('No work items found');
      return;
    }
    
    logger.info(`📋 Processing ${workItemIds.length} work item(s)`);
    
    const generator = new SQLTestCaseComprehensiveGenerator('src/features/sqlserver', 'src/features/sqlserver/sql-scripts');
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE SQL TEST CASE GENERATION');
    console.log('='.repeat(80) + '\n');
    
    // Process each work item
    for (const workItemId of workItemIds) {
      try {
        logger.info(`\n📝 Processing work item: ${workItemId}`);
        
        const analysis = await generator.generateSQLTestCases(workItemId);
        
        console.log(`✅ ${workItemId}: Generated SQL test case analysis`);
        console.log(`   - ${analysis.test_cases.length} test cases`);
        console.log(`   - ${analysis.affected_objects.length} affected objects`);
        console.log(`   - ${Object.keys(analysis.sql_test_scripts).length} SQL test scripts`);
        console.log(`   - Files: SQL-${workItemId}-test-case-analysis.{json,md}`);
        
      } catch (error: any) {
        logger.error(`❌ Error processing work item ${workItemId}:`, error.message);
        console.log(`❌ ${workItemId}: Error - ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SQL TEST CASE ANALYSIS COMPLETE');
    console.log('='.repeat(80) + '\n');
    
  } catch (error: any) {
    logger.error('❌ Error generating comprehensive test cases:', error);
    if (error.response) {
      logger.error(`Azure DevOps API Error: ${error.response.status} - ${error.response.statusText}`);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

