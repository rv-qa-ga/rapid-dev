#!/usr/bin/env ts-node

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   Zephyr Scale - Cleanup Test Executions                                  ║
 * ║                                                                            ║
 * ║   This script deletes test executions from a test cycle for a specific   ║
 * ║   work item that were created on or after a specified date.              ║
 * ║                                                                            ║
 * ║   Usage:                                                                   ║
 * ║   npm run zephyr:CleanupExecutions -- --work-item SF-570 --cycle Sprint-94-QA --date 2025-12-25 ║
 * ║   npm run zephyr:CleanupExecutions -- --work-item SF-570 --cycle Sprint-94-QA --date 2025-12-25 --dry-run ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { zephyrClient } from '../src/integrations/zephyr/client';
import { ZephyrLinker } from '../src/integrations/zephyr/linker';
import { logger } from '../src/utils/logger';

interface CleanupOptions {
  workItem: string;
  testCycleName: string;
  date: string; // ISO date string (YYYY-MM-DD)
  dryRun?: boolean;
}

function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateString}. Use YYYY-MM-DD format.`);
  }
  // Set to start of day for comparison
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function cleanupExecutions(options: CleanupOptions): Promise<void> {
  const { workItem, testCycleName, date, dryRun = false } = options;
  
  logger.info('\n' + '='.repeat(80));
  logger.info('🧹 ZEPHYR EXECUTION CLEANUP');
  logger.info('='.repeat(80));
  logger.info(`\nWork Item: ${workItem}`);
  logger.info(`Test Cycle: ${testCycleName}`);
  logger.info(`Date Filter: ${date} (executions on or after this date)`);
  logger.info(`Mode: ${dryRun ? '🔍 DRY RUN (no deletions)' : '🗑️  LIVE (will delete)'}`);
  logger.info('');

  // Parse the date
  const filterDate = parseDate(date);
  logger.info(`Filtering executions created on or after: ${formatDate(filterDate)}`);

  // Find the test cycle
  logger.info(`\n🔍 Step 1: Finding test cycle "${testCycleName}"...`);
  const testCycles = await zephyrClient.searchTestCycles(testCycleName);
  
  if (testCycles.length === 0) {
    logger.error(`❌ Test cycle not found: ${testCycleName}`);
    process.exit(1);
  }
  
  if (testCycles.length > 1) {
    logger.warn(`⚠️  Found ${testCycles.length} test cycles matching "${testCycleName}"`);
    logger.warn(`   Using first match: ${testCycles[0].name} (${testCycles[0].key})`);
  }
  
  const testCycle = testCycles[0];
  const testCycleKey = testCycle.key || '';
  logger.info(`✅ Found test cycle: ${testCycle.name} (${testCycleKey})`);

  // Find test cases for the work item
  logger.info(`\n🔍 Step 2: Finding test cases for work item "${workItem}"...`);
  const linker = new ZephyrLinker();
  const testCases = await linker.findTestCasesForWorkItem(workItem);
  
  if (testCases.length === 0) {
    logger.error(`❌ No test cases found for work item: ${workItem}`);
    logger.info(`   Hint: Make sure test cases exist in Zephyr for this work item`);
    process.exit(1);
  }
  
  logger.info(`✅ Found ${testCases.length} test case(s) for ${workItem}`);
  const testCaseKeys = new Set(testCases.map((tc: any) => tc.key || (tc as any).key).filter(Boolean));
  logger.debug(`   Test case keys: ${Array.from(testCaseKeys).join(', ')}`);

  // Get all executions from the test cycle
  logger.info(`\n🔍 Step 3: Getting all executions from test cycle...`);
  const allExecutions = await zephyrClient.getTestExecutions(testCycleKey);
  logger.info(`✅ Found ${allExecutions.length} total execution(s) in test cycle`);

  // Filter executions by test case and date
  logger.info(`\n🔍 Step 4: Filtering executions...`);
  const executionsToDelete: any[] = [];
  const allMatchingExecutions: any[] = []; // For debugging - all executions for this work item
  
  for (const execution of allExecutions) {
    const executionKey = execution.key || execution.id?.toString() || '';
    const testCaseKey = execution.testCase?.key || execution.testCaseKey || '';
    
    // Check if execution belongs to one of our test cases
    if (!testCaseKeys.has(testCaseKey)) {
      continue;
    }
    
    // Collect for debugging
    const executionDate = execution.actualEndDate || execution.createdOn || execution.creationDate || execution.actualStartDate;
    allMatchingExecutions.push({
      id: executionKey,
      testCaseKey,
      testCaseName: execution.testCase?.name || testCases.find((tc: any) => (tc.key || (tc as any).key) === testCaseKey)?.name || 'Unknown',
      date: executionDate,
      status: execution.status?.name || execution.statusName || 'Unknown',
      rawExecution: execution, // Keep raw for debugging
    });
    
    // Check if execution date is on or after filter date
    if (executionDate) {
      const execDate = new Date(executionDate);
      execDate.setHours(0, 0, 0, 0);
      
      if (execDate >= filterDate) {
        executionsToDelete.push({
          id: executionKey,
          testCaseKey,
          testCaseName: execution.testCase?.name || testCases.find((tc: any) => (tc.key || (tc as any).key) === testCaseKey)?.name || 'Unknown',
          date: executionDate,
          status: execution.status?.name || execution.statusName || 'Unknown',
        });
      }
    } else {
      // If no date, include it (might be recent)
      logger.debug(`   Execution ${executionKey} has no date, including it`);
      executionsToDelete.push({
        id: executionKey,
        testCaseKey,
        testCaseName: execution.testCase?.name || testCases.find((tc: any) => (tc.key || (tc as any).key) === testCaseKey)?.name || 'Unknown',
        date: 'No date',
        status: execution.status?.name || execution.statusName || 'Unknown',
      });
    }
  }
  
  // Show all matching executions for debugging
  if (allMatchingExecutions.length > 0) {
    logger.info(`\n📋 Found ${allMatchingExecutions.length} execution(s) for ${workItem} test cases (regardless of date):`);
    for (const exec of allMatchingExecutions.slice(0, 10)) { // Show first 10
      logger.info(`   • ${exec.id} - ${exec.testCaseKey} (${exec.testCaseName})`);
      logger.info(`     Date: ${exec.date || 'No date'}, Status: ${exec.status}`);
    }
    if (allMatchingExecutions.length > 10) {
      logger.info(`   ... and ${allMatchingExecutions.length - 10} more`);
    }
    logger.info('');
  }

  logger.info(`✅ Found ${executionsToDelete.length} execution(s) to delete`);

  if (executionsToDelete.length === 0) {
    logger.info('\n✅ No executions found matching the criteria. Nothing to clean up.');
    return;
  }

  // Display summary
  logger.info('\n' + '='.repeat(80));
  logger.info('📊 EXECUTIONS TO DELETE');
  logger.info('='.repeat(80));
  logger.info('');
  
  for (const exec of executionsToDelete) {
    logger.info(`   • ${exec.id} - ${exec.testCaseKey} (${exec.testCaseName})`);
    logger.info(`     Date: ${exec.date}, Status: ${exec.status}`);
  }
  
  logger.info('');

  // Confirm deletion (unless dry run)
  if (dryRun) {
    logger.info('🔍 DRY RUN: No executions were deleted.');
    logger.info(`   Would delete ${executionsToDelete.length} execution(s)`);
    return;
  }

  // Delete executions
  logger.info(`\n🗑️  Deleting ${executionsToDelete.length} execution(s)...`);
  let deletedCount = 0;
  let failedCount = 0;

  for (const exec of executionsToDelete) {
    try {
      await zephyrClient.deleteTestExecution(exec.id);
      deletedCount++;
      logger.info(`   ✅ Deleted: ${exec.id} - ${exec.testCaseKey}`);
    } catch (error: any) {
      failedCount++;
      logger.error(`   ❌ Failed to delete ${exec.id}: ${error.message}`);
    }
  }

  // Summary
  logger.info('\n' + '='.repeat(80));
  logger.info('📊 CLEANUP SUMMARY');
  logger.info('='.repeat(80));
  logger.info(`   ✅ Deleted: ${deletedCount}`);
  logger.info(`   ❌ Failed: ${failedCount}`);
  logger.info(`   📁 Test Cycle: ${testCycleName} (${testCycleKey})`);
  logger.info(`   📅 Date Filter: ${date}`);
  logger.info('='.repeat(80));
}

function printHelp() {
  console.log('Usage: npm run zephyr:CleanupExecutions -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --work-item <id>    Work item ID (e.g., SF-570)');
  console.log('  --cycle <name>      Test cycle name (e.g., Sprint-94-QA)');
  console.log('  --date <date>       Date filter in YYYY-MM-DD format (executions on or after this date)');
  console.log('  --dry-run           Preview what would be deleted without actually deleting');
  console.log('  --help              Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run zephyr:CleanupExecutions -- --work-item SF-570 --cycle Sprint-94-QA --date 2025-12-25');
  console.log('  npm run zephyr:CleanupExecutions -- --work-item SF-570 --cycle Sprint-94-QA --date 2025-12-25 --dry-run');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const options: CleanupOptions = {
    workItem: '',
    testCycleName: '',
    date: '',
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--work-item':
        options.workItem = args[++i];
        break;
      case '--cycle':
        options.testCycleName = args[++i];
        break;
      case '--date':
        options.date = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
    }
  }

  // Validate required parameters
  if (!options.workItem) {
    logger.error('❌ --work-item is required');
    printHelp();
    process.exit(1);
  }

  if (!options.testCycleName) {
    logger.error('❌ --cycle is required');
    printHelp();
    process.exit(1);
  }

  if (!options.date) {
    logger.error('❌ --date is required');
    printHelp();
    process.exit(1);
  }

  try {
    await cleanupExecutions(options);
  } catch (error: any) {
    logger.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

// Run main
main();

