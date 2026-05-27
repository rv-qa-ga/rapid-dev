#!/usr/bin/env ts-node

/**
 * Generate SQL Server Test Cases from Azure DevOps Work Items
 * 
 * Analyzes work items from ADO-Work-Items.txt and generates Gherkin test cases
 * focused on SQL Server database changes (ODS/TDS)
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsClient } from '../../src/integrations/azure-devops/client';
import { SqlTestCaseGenerator } from '../../src/integrations/azure-devops/SqlTestCaseGenerator';
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
 * Main function to generate test cases
 */
async function generateTestCases(): Promise<void> {
  try {
    logger.info('🔍 Reading work items from ADO-Work-Items.txt...');
    
    // Read work item IDs from file
    const workItemIds = readWorkItemIds();
    
    if (workItemIds.length === 0) {
      logger.warn('No work items found in file');
      return;
    }
    
    logger.info(`📋 Found ${workItemIds.length} work items to process`);
    
    // Initialize clients
    const adoClient = new AzureDevOpsClient();
    const generator = new SqlTestCaseGenerator('src/features/sqlserver');
    
    const results = {
      processed: 0,
      generated: 0,
      skipped: 0,
      errors: 0,
    };
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 GENERATING SQL SERVER TEST CASES');
    console.log('='.repeat(80) + '\n');
    
    // Process each work item
    for (const workItemId of workItemIds) {
      try {
        logger.info(`\n📝 Processing work item: ${workItemId}`);
        
        // Fetch work item from Azure DevOps
        const workItem = await adoClient.getWorkItem(workItemId);
        
        // Generate test cases (now async due to PR analysis)
        const filePath = await generator.generateTestCases(workItem);
        
        if (filePath) {
          results.generated++;
          console.log(`✅ ${workItemId}: Generated test cases -> ${filePath}`);
        } else {
          results.skipped++;
          console.log(`⏭️  ${workItemId}: No test cases generated (may not be SQL-related)`);
        }
        
        results.processed++;
        
      } catch (error: any) {
        results.errors++;
        logger.error(`❌ Error processing work item ${workItemId}:`, error.message);
        console.log(`❌ ${workItemId}: Error - ${error.message}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total work items processed: ${results.processed}`);
    console.log(`Test cases generated: ${results.generated}`);
    console.log(`Skipped (not SQL-related): ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    console.log('='.repeat(80) + '\n');
    
    if (results.generated > 0) {
      logger.info(`✅ Successfully generated ${results.generated} test case files in src/features/sqlserver/`);
    }
    
  } catch (error: any) {
    logger.error('❌ Error generating test cases:', error);
    if (error.response) {
      logger.error(`Azure DevOps API Error: ${error.response.status} - ${error.response.statusText}`);
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  generateTestCases()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

