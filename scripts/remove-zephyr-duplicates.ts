#!/usr/bin/env ts-node

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   REMOVE DUPLICATE TEST CASES FROM ZEPHYR                                  ║
 * ║                                                                            ║
 * ║   This utility identifies and removes duplicate test cases based on:         ║
 * ║   - Test case ID tag (e.g., SF-567-UI-001)                                ║
 * ║   - Test case name (exact match)                                            ║
 * ║                                                                            ║
 * ║   Usage:                                                                    ║
 * ║     npm run zephyr:RemoveDuplicates -- --work-item SF-567                   ║
 * ║     npm run zephyr:RemoveDuplicates -- --work-item SF-567 --keep newest    ║
 * ║     npm run zephyr:RemoveDuplicates -- --work-item SF-567 --dry-run        ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { zephyrClient } from '../src/integrations/zephyr/client';
import { logger } from '../src/utils/logger';
import { parseJiraKey } from '../src/utils/helpers';
import * as readline from 'readline';

interface TestCaseInfo {
  key: string;
  name: string;
  labels: string[];
  testCaseId?: string;
  created?: string;
  updated?: string;
  createdTimestamp?: number;
  updatedTimestamp?: number;
}

interface DuplicateGroup {
  identifier: string; // Test case ID or name
  type: 'test-case-id' | 'name';
  count: number;
  testCases: TestCaseInfo[];
  keepIndex: number; // Index of test case to keep
}

type KeepStrategy = 'newest' | 'oldest' | 'first' | 'interactive';

interface RemoveOptions {
  workItem: string;
  keepStrategy?: KeepStrategy;
  dryRun?: boolean;
  autoConfirm?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): RemoveOptions {
  const args = process.argv.slice(2);
  const options: RemoveOptions = {
    workItem: '',
    keepStrategy: 'newest',
    dryRun: false,
    autoConfirm: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--work-item' || arg === '-w') {
      options.workItem = args[++i] || '';
    } else if (arg === '--keep' || arg === '-k') {
      const strategy = args[++i]?.toLowerCase();
      if (strategy && ['newest', 'oldest', 'first', 'interactive'].includes(strategy)) {
        options.keepStrategy = strategy as KeepStrategy;
      }
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.autoConfirm = true;
    } else if (!arg.startsWith('--') && !options.workItem) {
      // Positional argument for work item
      options.workItem = arg;
    }
  }

  return options;
}

/**
 * Extract timestamp from date string
 */
function getTimestamp(dateStr?: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}

/**
 * Find all test cases for a work item (by label or name)
 */
async function findAllTestCases(workItem: string, projectKey: string): Promise<TestCaseInfo[]> {
  const allTestCases: TestCaseInfo[] = [];
  const foundKeys = new Set<string>();
  
  // First, try to find by label
  logger.info(`📋 Searching for test cases with label "${workItem}"...`);
  let testCasesByLabel = await zephyrClient.searchTestCasesByLabel(workItem, projectKey);
  
  // Add test cases found by label
  testCasesByLabel.forEach((tc: any) => {
    const key = tc.key || (tc as any).key;
    if (key && !foundKeys.has(key)) {
      allTestCases.push(tc);
      foundKeys.add(key);
    }
  });
  
  // ALWAYS also search by name pattern (even if label search found results)
  // This catches test cases that exist but don't have the work item label
  logger.info(`   Also searching by name pattern "${workItem}-*"...`);
  try {
    const isZephyrScaleCloud = (zephyrClient as any).isZephyrScaleCloud;
    if (isZephyrScaleCloud) {
      // Get all test cases with pagination support
      let allTestCasesRaw: any[] = [];
      let startAt = 0;
      const maxResults = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const response = await (zephyrClient as any).client.get(
          `/testcases?projectKey=${encodeURIComponent(projectKey)}&startAt=${startAt}&maxResults=${maxResults}`
        );
        const data: { values?: any[]; data?: any[]; startAt?: number; maxResults?: number; total?: number } = response.data;
        const batch = data.values || data.data || [];
        allTestCasesRaw = allTestCasesRaw.concat(batch);
        
        // Check if there are more results
        const total = data.total || 0;
        startAt += batch.length;
        hasMore = batch.length === maxResults && startAt < total;
        
        if (batch.length > 0) {
          logger.debug(`   Retrieved ${batch.length} test cases (total so far: ${allTestCasesRaw.length})`);
        }
      }
      
      logger.info(`   Retrieved ${allTestCasesRaw.length} total test cases from project`);
      
      // Filter by name that starts with work item
      const byName = allTestCasesRaw.filter((tc: any) => {
        const name = tc.name || '';
        return name.startsWith(workItem);
      });
      
      // Add test cases found by name that weren't already found by label
      byName.forEach((tc: any) => {
        const key = tc.key || (tc as any).key;
        if (key && !foundKeys.has(key)) {
          allTestCases.push(tc);
          foundKeys.add(key);
        }
      });
      
      logger.info(`   Found ${byName.length} test case(s) by name pattern (${allTestCases.length} total after deduplication)`);
    }
  } catch (error: any) {
    logger.error(`   Fallback search failed: ${error.message}`);
  }
  
  // Convert to TestCaseInfo
  for (const tc of testCasesByLabel) {
    const tcAny = tc as any;
    const labels = tcAny.labels || [];
    const testCaseId = labels.find((l: string) => /^[A-Z]+-\d+-(UI|API)-\d+$/.test(l));
    
    // Also try to extract from name if not in labels
    let extractedId = testCaseId;
    if (!extractedId) {
      const nameMatch = tcAny.name?.match(/^([A-Z]+-\d+-(UI|API)-\d+)/);
      if (nameMatch) {
        extractedId = nameMatch[1];
      }
    }
    
    const created = tcAny.created || tcAny.creationDate;
    const updated = tcAny.updated || tcAny.updateDate;
    
    allTestCases.push({
      key: tcAny.key || 'UNKNOWN',
      name: tcAny.name || 'Unknown',
      labels: labels,
      testCaseId: extractedId,
      created: created,
      updated: updated,
      createdTimestamp: getTimestamp(created),
      updatedTimestamp: getTimestamp(updated),
    });
  }
  
  return allTestCases;
}

/**
 * Identify duplicate groups
 */
function identifyDuplicates(testCases: TestCaseInfo[]): DuplicateGroup[] {
  const duplicateGroups: DuplicateGroup[] = [];
  
  // Group by test case ID
  const byTestCaseId = new Map<string, TestCaseInfo[]>();
  for (const tc of testCases) {
    if (tc.testCaseId) {
      if (!byTestCaseId.has(tc.testCaseId)) {
        byTestCaseId.set(tc.testCaseId, []);
      }
      byTestCaseId.get(tc.testCaseId)!.push(tc);
    }
  }
  
  // Find duplicates by test case ID
  for (const [testCaseId, group] of byTestCaseId.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({
        identifier: testCaseId,
        type: 'test-case-id',
        count: group.length,
        testCases: group,
        keepIndex: 0, // Will be set by keep strategy
      });
    }
  }
  
  // Group by name (for test cases without proper ID)
  const byName = new Map<string, TestCaseInfo[]>();
  for (const tc of testCases) {
    if (!tc.testCaseId) {
      // Only check test cases without ID
      const normalizedName = tc.name.trim().toLowerCase();
      if (!byName.has(normalizedName)) {
        byName.set(normalizedName, []);
      }
      byName.get(normalizedName)!.push(tc);
    }
  }
  
  // Find duplicates by name
  for (const [name, group] of byName.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({
        identifier: name,
        type: 'name',
        count: group.length,
        testCases: group,
        keepIndex: 0, // Will be set by keep strategy
      });
    }
  }
  
  return duplicateGroups;
}

/**
 * Determine which test case to keep based on strategy
 */
function determineKeepIndex(group: DuplicateGroup, strategy: KeepStrategy): number {
  const testCases = group.testCases;
  
  switch (strategy) {
    case 'newest':
      // Keep the one with the latest updated timestamp, or created if no update
      let newestIndex = 0;
      let newestTimestamp = testCases[0].updatedTimestamp || testCases[0].createdTimestamp || 0;
      for (let i = 1; i < testCases.length; i++) {
        const timestamp = testCases[i].updatedTimestamp || testCases[i].createdTimestamp || 0;
        if (timestamp > newestTimestamp) {
          newestTimestamp = timestamp;
          newestIndex = i;
        }
      }
      return newestIndex;
      
    case 'oldest':
      // Keep the one with the earliest created timestamp
      let oldestIndex = 0;
      let oldestTimestamp = testCases[0].createdTimestamp || Number.MAX_SAFE_INTEGER;
      for (let i = 1; i < testCases.length; i++) {
        const timestamp = testCases[i].createdTimestamp || Number.MAX_SAFE_INTEGER;
        if (timestamp < oldestTimestamp) {
          oldestTimestamp = timestamp;
          oldestIndex = i;
        }
      }
      return oldestIndex;
      
    case 'first':
      // Keep the first one (by key order)
      return 0;
      
    case 'interactive':
      // Will be handled separately
      return 0;
      
    default:
      return 0;
  }
}

/**
 * Interactive selection of which test case to keep
 */
async function interactiveSelect(group: DuplicateGroup): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    logger.info(`\n   Select which test case to KEEP for "${group.identifier}":`);
    group.testCases.forEach((tc, index) => {
      logger.info(`   [${index + 1}] ${tc.key}: ${tc.name}`);
      logger.info(`       Labels: ${tc.labels.join(', ') || 'none'}`);
      if (tc.created) logger.info(`       Created: ${tc.created}`);
      if (tc.updated) logger.info(`       Updated: ${tc.updated}`);
    });
    
    rl.question('\n   Enter number (1-' + group.testCases.length + '): ', (answer) => {
      rl.close();
      const selected = parseInt(answer, 10) - 1;
      if (selected >= 0 && selected < group.testCases.length) {
        resolve(selected);
      } else {
        logger.warn(`   Invalid selection, keeping first one (${group.testCases[0].key})`);
        resolve(0);
      }
    });
  });
}

/**
 * Remove duplicate test cases
 */
async function removeDuplicates(options: RemoveOptions): Promise<void> {
  const { workItem, keepStrategy = 'newest', dryRun = false, autoConfirm = false } = options;
  
  const parsedKey = parseJiraKey(workItem);
  if (!parsedKey) {
    logger.error(`❌ Invalid Jira key format: ${workItem}`);
    process.exit(1);
  }
  
  logger.info('\n' + '='.repeat(80));
  logger.info(`🗑️  REMOVE DUPLICATE TEST CASES FOR: ${parsedKey}`);
  logger.info('='.repeat(80));
  logger.info(`\n   Work Item: ${parsedKey}`);
  logger.info(`   Keep Strategy: ${keepStrategy}`);
  logger.info(`   Dry Run: ${dryRun ? 'YES (no changes will be made)' : 'NO (will delete duplicates)'}`);
  logger.info('');
  
  try {
    const projectKey = process.env.ZEPHYR_PROJECT_KEY || 'SF';
    
    // Find all test cases
    const allTestCases = await findAllTestCases(parsedKey, projectKey);
    
    if (allTestCases.length === 0) {
      logger.warn(`⚠️  No test cases found for "${parsedKey}"`);
      logger.info('   This could mean:');
      logger.info('   - Test cases haven\'t been uploaded to Zephyr yet');
      logger.info('   - Test cases exist but don\'t have the work item label');
      logger.info('   - Test cases are in a different project');
      process.exit(0);
    }
    
    logger.info(`✅ Found ${allTestCases.length} total test case(s)\n`);
    
    // Identify duplicates
    const duplicateGroups = identifyDuplicates(allTestCases);
    
    if (duplicateGroups.length === 0) {
      logger.info('✅ No duplicates found! All test cases are unique.\n');
      process.exit(0);
    }
    
    logger.info(`⚠️  Found ${duplicateGroups.length} duplicate group(s):\n`);
    
    // Determine which to keep for each group
    for (const group of duplicateGroups) {
      if (keepStrategy === 'interactive') {
        group.keepIndex = await interactiveSelect(group);
      } else {
        group.keepIndex = determineKeepIndex(group, keepStrategy);
      }
    }
    
    // Display what will be deleted
    let totalToDelete = 0;
    logger.info('📋 DUPLICATES TO REMOVE:\n');
    for (const group of duplicateGroups) {
      const keep = group.testCases[group.keepIndex];
      const toDelete = group.testCases.filter((_, i) => i !== group.keepIndex);
      totalToDelete += toDelete.length;
      
      logger.info(`   ${group.identifier} (${group.type}):`);
      logger.info(`   ✅ KEEP: ${keep.key} - ${keep.name}`);
      for (const tc of toDelete) {
        logger.info(`   ❌ DELETE: ${tc.key} - ${tc.name}`);
      }
      logger.info('');
    }
    
    logger.info(`\n📊 SUMMARY:`);
    logger.info(`   Total duplicates found: ${duplicateGroups.length} groups`);
    logger.info(`   Test cases to delete: ${totalToDelete}`);
    logger.info(`   Test cases to keep: ${duplicateGroups.length}\n`);
    
    if (dryRun) {
      logger.info('🔍 DRY RUN MODE - No test cases were deleted.\n');
      process.exit(0);
    }
    
    // Confirm deletion
    if (!autoConfirm) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      
      await new Promise<void>((resolve) => {
        rl.question('⚠️  Are you sure you want to delete these test cases? (yes/no): ', (answer) => {
          rl.close();
          if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
            logger.info('❌ Deletion cancelled.\n');
            process.exit(0);
          }
          resolve();
        });
      });
    }
    
    // Delete duplicates
    logger.info('\n🗑️  Deleting duplicate test cases...\n');
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const group of duplicateGroups) {
      const toDelete = group.testCases.filter((_, i) => i !== group.keepIndex);
      
      for (const tc of toDelete) {
        try {
          await zephyrClient.deleteTestCase(tc.key);
          logger.info(`✅ Deleted: ${tc.key} - ${tc.name}`);
          deletedCount++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error: any) {
          logger.error(`❌ Failed to delete ${tc.key}: ${error.message}`);
          errorCount++;
        }
      }
    }
    
    logger.info('\n' + '='.repeat(80));
    logger.info('📊 DELETION SUMMARY');
    logger.info('='.repeat(80));
    logger.info(`   Successfully deleted: ${deletedCount}`);
    logger.info(`   Errors: ${errorCount}`);
    logger.info(`   Remaining duplicates: ${duplicateGroups.length - deletedCount}`);
    logger.info('');
    
  } catch (error: any) {
    logger.error(`❌ Error removing duplicates: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

// Main
const options = parseArgs();

if (!options.workItem) {
  logger.error('❌ Please provide a work item ID (e.g., SF-567)');
  logger.error('');
  logger.error('Usage:');
  logger.error('  npm run zephyr:RemoveDuplicates -- --work-item SF-567');
  logger.error('  npm run zephyr:RemoveDuplicates -- --work-item SF-567 --keep newest');
  logger.error('  npm run zephyr:RemoveDuplicates -- --work-item SF-567 --dry-run');
  logger.error('');
  logger.error('Options:');
  logger.error('  --work-item, -w    Work item ID (e.g., SF-567)');
  logger.error('  --keep, -k          Keep strategy: newest, oldest, first, interactive (default: newest)');
  logger.error('  --dry-run, -d      Dry run mode (no deletions)');
  logger.error('  --yes, -y          Auto-confirm deletion');
  process.exit(1);
}

removeDuplicates(options).catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

