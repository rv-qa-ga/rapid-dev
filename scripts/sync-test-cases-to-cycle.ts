#!/usr/bin/env ts-node
/**
 * Sync test cases to a Zephyr Scale test cycle
 * 
 * This script finds test cases (by work item, tags, or feature file) and ensures
 * they are added to the specified test cycle. This allows test cases to be visible
 * in the cycle before test execution begins.
 * 
 * Usage:
 *   # Sync test cases for a work item
 *   npm run zephyr:SyncToCycle -- --work-item SF-506 --cycle "Automation" --environment qa
 *   
 *   # Sync test cases by tags
 *   npm run zephyr:SyncToCycle -- --tags "@smoke,@regression" --cycle "Automation" --environment qa
 *   
 *   # Sync test cases from feature file
 *   npm run zephyr:SyncToCycle -- --feature "src/features/ui/SF/SF-523.feature" --cycle "Automation" --environment qa
 */

import { zephyrClient } from '../src/integrations/zephyr/client';
import { ZephyrLinker } from '../src/integrations/zephyr/linker';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../src/utils/logger';
import { config } from '../src/config/config';

interface Options {
  workItem?: string;
  tags?: string;
  feature?: string;
  cycleName: string;
  environment: string;
  dryRun: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let workItem: string | undefined;
  let tags: string | undefined;
  let feature: string | undefined;
  let cycleName = '';
  let environment = 'qa';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--work-item' && args[i + 1] && !args[i + 1].startsWith('--')) {
      workItem = args[++i];
    } else if (arg === '--tags' && args[i + 1] && !args[i + 1].startsWith('--')) {
      tags = args[++i];
    } else if (arg === '--feature' && args[i + 1] && !args[i + 1].startsWith('--')) {
      feature = args[++i];
    } else if (arg === '--cycle' && args[i + 1] && !args[i + 1].startsWith('--')) {
      cycleName = args[++i];
      if (cycleName === '""' || cycleName === "''" || cycleName === '') {
        cycleName = '';
      }
    } else if (arg === '--environment' && args[i + 1] && !args[i + 1].startsWith('--')) {
      environment = args[++i];
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--work-item=')) {
      workItem = arg.split('=')[1];
    } else if (arg.startsWith('--tags=')) {
      tags = arg.split('=')[1];
    } else if (arg.startsWith('--feature=')) {
      feature = arg.split('=')[1];
    } else if (arg.startsWith('--cycle=')) {
      cycleName = arg.split('=')[1];
      if (cycleName === '""' || cycleName === "''" || cycleName === '') {
        cycleName = '';
      }
    } else if (arg.startsWith('--environment=')) {
      environment = arg.split('=')[1];
    }
  }

  if (!cycleName) {
    console.error('❌ Error: --cycle parameter is required');
    console.error('Usage examples:');
    console.error('  npm run zephyr:SyncToCycle -- --work-item SF-506 --cycle "Automation" --environment qa');
    console.error('  npm run zephyr:SyncToCycle -- --tags "@smoke" --cycle "Automation" --environment qa');
    console.error('  npm run zephyr:SyncToCycle -- --feature "src/features/ui/SF/SF-523.feature" --cycle "Automation" --environment qa');
    process.exit(1);
  }

  if (!workItem && !tags && !feature) {
    console.error('❌ Error: Specify --work-item, --tags, or --feature');
    console.error('Usage examples:');
    console.error('  npm run zephyr:SyncToCycle -- --work-item SF-506 --cycle "Automation" --environment qa');
    console.error('  npm run zephyr:SyncToCycle -- --tags "@smoke" --cycle "Automation" --environment qa');
    console.error('  npm run zephyr:SyncToCycle -- --feature "src/features/ui/SF/SF-523.feature" --cycle "Automation" --environment qa');
    process.exit(1);
  }

  return { workItem, tags, feature, cycleName, environment, dryRun };
}

/**
 * Extract test case IDs from feature file
 * Looks for tags matching pattern: @SF-520-UI-001 or @SF-520-API-001
 */
function extractTestCaseIdsFromFeature(featurePath: string): string[] {
  const testCaseIds = new Set<string>();
  
  if (!fs.existsSync(featurePath)) {
    logger.error(`Feature file not found: ${featurePath}`);
    return [];
  }

  const content = fs.readFileSync(featurePath, 'utf-8');
  const lines = content.split('\n');

  // Pattern: @SF-520-UI-001 or @SF-520-API-001
  const testCaseIdPattern = /@([A-Z]+-\d+-(UI|API)-\d+)/g;

  for (const line of lines) {
    const matches = line.matchAll(testCaseIdPattern);
    for (const match of matches) {
      testCaseIds.add(match[1]); // Remove @ prefix
    }
  }

  return Array.from(testCaseIds).sort();
}

/**
 * Extract test case IDs from tags string
 * Tags format: "@smoke,@regression" or "@SF-520-UI-001,@SF-520-API-001"
 */
function extractTestCaseIdsFromTags(tagsString: string): string[] {
  const testCaseIds: string[] = [];
  const tags = tagsString.split(',').map(t => t.trim().replace(/^@/, ''));
  
  // Pattern: SF-520-UI-001 or SF-520-API-001
  const testCaseIdPattern = /^[A-Z]+-\d+-(UI|API)-\d+$/;

  for (const tag of tags) {
    if (testCaseIdPattern.test(tag)) {
      testCaseIds.push(tag);
    }
  }

  return testCaseIds;
}

/**
 * Find test cases in Zephyr by test case IDs
 */
async function findTestCasesByIds(testCaseIds: string[], projectKey: string): Promise<any[]> {
  const testCases: any[] = [];
  const notFound: string[] = [];

  for (const testCaseId of testCaseIds) {
    try {
      const found = await zephyrClient.searchTestCasesByTestCaseId(testCaseId, projectKey);
      if (found.length > 0) {
        testCases.push(found[0]); // Use first match
        if (found.length > 1) {
          logger.warn(`⚠️  Multiple test cases found for ${testCaseId}, using first match`);
        }
      } else {
        notFound.push(testCaseId);
      }
    } catch (error: any) {
      logger.warn(`⚠️  Error searching for test case ${testCaseId}: ${error.message}`);
      notFound.push(testCaseId);
    }
  }

  if (notFound.length > 0) {
    logger.warn(`⚠️  ${notFound.length} test case(s) not found in Zephyr:`);
    notFound.forEach(id => logger.warn(`   - ${id}`));
    logger.warn(`   Hint: Run 'npm run zephyr:UploadTestCase -- --work-item <WORK_ITEM>' first`);
  }

  return testCases;
}

/**
 * Find or create test cycle
 */
async function findOrCreateCycle(cycleName: string): Promise<{ key: string; name: string } | null> {
  logger.info(`Looking for test cycle: ${cycleName}`);
  
  const cycles = await zephyrClient.searchTestCycles(cycleName);
  const exactMatch = cycles.find(c => c.name === cycleName);
  
  if (exactMatch) {
    logger.info(`✅ Found test cycle: ${exactMatch.name} (${exactMatch.key})`);
    return { key: exactMatch.key || '', name: exactMatch.name };
  }

  // Create new cycle
  logger.info(`Creating new test cycle: ${cycleName}`);
  try {
    const newCycle = await zephyrClient.createTestCycle({
      name: cycleName,
      description: `Test cycle for automation runs - created on ${new Date().toISOString()}`,
      plannedStartDate: new Date().toISOString(),
    });
    logger.info(`✅ Created test cycle: ${newCycle.name} (${newCycle.key})`);
    return { key: newCycle.key || '', name: newCycle.name };
  } catch (error: any) {
    logger.error(`❌ Failed to create test cycle: ${error.message}`);
    return null;
  }
}

/**
 * Get test case keys already in the cycle
 */
async function getTestCasesInCycle(testCycleKey: string): Promise<Set<string>> {
  const testCaseKeys = new Set<string>();
  
  try {
    const executions = await zephyrClient.getTestExecutions(testCycleKey);
    for (const exec of executions) {
      if (exec.testCaseKey) {
        testCaseKeys.add(exec.testCaseKey);
      } else if (exec.testCase && exec.testCase.key) {
        testCaseKeys.add(exec.testCase.key);
      } else if (exec.testCase && exec.testCase.self) {
        // Extract key from self URL: /testcases/SF-T305/versions/1 -> SF-T305
        const match = exec.testCase.self.match(/\/testcases\/([^\/]+)/);
        if (match && match[1]) {
          testCaseKeys.add(match[1]);
        }
      }
    }
    logger.debug(`Found ${testCaseKeys.size} test case(s) already in cycle`);
  } catch (error: any) {
    logger.warn(`⚠️  Could not get existing test cases from cycle: ${error.message}`);
  }

  return testCaseKeys;
}

async function main() {
  const options = parseArgs();
  
  // Set environment
  process.env.ENV = options.environment;
  
  console.log('\n🔄 Syncing test cases to Zephyr cycle');
  console.log('═'.repeat(60));
  if (options.workItem) {
    console.log(`   Work Item: ${options.workItem}`);
  }
  if (options.tags) {
    console.log(`   Tags: ${options.tags}`);
  }
  if (options.feature) {
    console.log(`   Feature File: ${options.feature}`);
  }
  console.log(`   Cycle: ${options.cycleName}`);
  console.log(`   Environment: ${options.environment}`);
  console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('═'.repeat(60));

  try {
    // Step 1: Find test cases
    let testCases: any[] = [];
    const projectKey = process.env.ZEPHYR_PROJECT_KEY || 'SF';

    if (options.workItem) {
      logger.info(`\n📋 Step 1: Finding test cases for work item "${options.workItem}"...`);
      const linker = new ZephyrLinker();
      testCases = await linker.findTestCasesForWorkItem(options.workItem, projectKey);
      
      if (testCases.length === 0) {
        logger.warn(`⚠️  No test cases found for work item "${options.workItem}"`);
        logger.info(`   This could mean:`);
        logger.info(`   - Test cases haven't been uploaded to Zephyr yet`);
        logger.info(`   - Test cases exist but don't have labels matching "${options.workItem}"`);
        logger.info(`\n   To upload test cases, run:`);
        logger.info(`   npm run zephyr:UploadTestCase -- --work-item ${options.workItem}`);
        process.exit(0);
      }
      
      logger.info(`✅ Found ${testCases.length} test case(s) for work item "${options.workItem}"`);
    } else if (options.tags) {
      logger.info(`\n📋 Step 1: Extracting test case IDs from tags...`);
      const testCaseIds = extractTestCaseIdsFromTags(options.tags);
      
      if (testCaseIds.length === 0) {
        logger.warn(`⚠️  No test case IDs found in tags: ${options.tags}`);
        logger.info(`   Tags should match pattern: @SF-520-UI-001 or @SF-520-API-001`);
        process.exit(0);
      }
      
      logger.info(`✅ Extracted ${testCaseIds.length} test case ID(s) from tags`);
      testCases = await findTestCasesByIds(testCaseIds, projectKey);
      
      if (testCases.length === 0) {
        logger.warn(`⚠️  No test cases found in Zephyr for the extracted IDs`);
        process.exit(0);
      }
    } else if (options.feature) {
      logger.info(`\n📋 Step 1: Extracting test case IDs from feature file...`);
      const featurePath = path.resolve(process.cwd(), options.feature);
      const testCaseIds = extractTestCaseIdsFromFeature(featurePath);
      
      if (testCaseIds.length === 0) {
        logger.warn(`⚠️  No test case IDs found in feature file: ${options.feature}`);
        logger.info(`   Test cases should have tags matching pattern: @SF-520-UI-001 or @SF-520-API-001`);
        process.exit(0);
      }
      
      logger.info(`✅ Extracted ${testCaseIds.length} test case ID(s) from feature file`);
      testCases = await findTestCasesByIds(testCaseIds, projectKey);
      
      if (testCases.length === 0) {
        logger.warn(`⚠️  No test cases found in Zephyr for the extracted IDs`);
        process.exit(0);
      }
    }

    if (testCases.length === 0) {
      logger.error(`❌ No test cases found to sync`);
      process.exit(1);
    }

    // Step 2: Find or create cycle
    logger.info(`\n📋 Step 2: Finding or creating test cycle "${options.cycleName}"...`);
    const cycle = await findOrCreateCycle(options.cycleName);
    
    if (!cycle) {
      logger.error(`❌ Failed to find or create test cycle`);
      process.exit(1);
    }

    // Step 3: Get existing test cases in cycle
    logger.info(`\n📋 Step 3: Checking which test cases are already in cycle...`);
    const existingTestCaseKeys = await getTestCasesInCycle(cycle.key);

    // Step 4: Add missing test cases
    logger.info(`\n📋 Step 4: Adding test cases to cycle...`);
    const testCasesToAdd = testCases.filter(tc => {
      const key = tc.key || '';
      return key && !existingTestCaseKeys.has(key);
    });

    if (testCasesToAdd.length === 0) {
      logger.info(`✅ All ${testCases.length} test case(s) are already in the cycle`);
      console.log('\n' + '═'.repeat(60));
      console.log('✅ Sync complete!');
      console.log('═'.repeat(60));
      return;
    }

    logger.info(`   ${testCasesToAdd.length} test case(s) need to be added`);
    logger.info(`   ${testCases.length - testCasesToAdd.length} test case(s) already in cycle`);

    if (options.dryRun) {
      console.log(`\n[DRY RUN] Would add ${testCasesToAdd.length} test case(s) to cycle:`);
      testCasesToAdd.forEach((tc, index) => {
        console.log(`   ${index + 1}. ${tc.key || 'N/A'}: ${tc.name || 'N/A'}`);
      });
      console.log(`\n✅ Dry run complete. Use without --dry-run to add test cases.`);
      return;
    }

    let added = 0;
    let failed = 0;

    for (let i = 0; i < testCasesToAdd.length; i++) {
      const tc = testCasesToAdd[i];
      const key = tc.key || '';
      
      if (!key) {
        logger.warn(`⚠️  Skipping test case without key: ${tc.name || 'N/A'}`);
        failed++;
        continue;
      }

      try {
        await zephyrClient.addTestCaseToCycle(key, cycle.key);
        added++;
        logger.info(`   ✅ Added: ${key} - ${tc.name || 'N/A'}`);
      } catch (error: any) {
        failed++;
        logger.error(`   ❌ Failed to add ${key}: ${error.message}`);
      }

      // Show progress for large batches
      if ((i + 1) % 10 === 0 || i === testCasesToAdd.length - 1) {
        logger.info(`   Progress: ${i + 1}/${testCasesToAdd.length} test case(s) processed...`);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Sync complete!');
    console.log(`   Added: ${added} test case(s)`);
    if (failed > 0) {
      console.log(`   Failed: ${failed} test case(s)`);
    }
    console.log(`   Already in cycle: ${testCases.length - testCasesToAdd.length} test case(s)`);
    console.log('═'.repeat(60));

  } catch (error: any) {
    logger.error('\n❌ Error:', error.message);
    if (error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
