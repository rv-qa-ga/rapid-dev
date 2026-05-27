/**
 * Utility to automatically link Zephyr test cases to Jira work items
 * 
 * This script:
 * 1. Takes a Jira work item ID (e.g., SF-506)
 * 2. Finds all test cases in Zephyr that have that work item ID as a label
 * 3. Links those test cases to the Jira work item using remote issue links
 * 
 * Usage:
 *   npm run zephyr:LinkToJira -- --work-item SF-506
 */

import { zephyrClient } from './client';
import { jiraClient } from '../jira/client';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';
import { ZephyrLinker } from './linker';
import { extractProjectPrefix } from '../../utils/helpers';

interface LinkOptions {
  workItem: string;
  testCase?: string; // Optional: specific test case ID (e.g., SF-505-UI-001) or Zephyr key (e.g., SF-T199)
  dryRun?: boolean;
}

async function linkTestCasesToJira(options: LinkOptions): Promise<void> {
  const { workItem, testCase, dryRun = false } = options;

  logger.info('\n' + '='.repeat(60));
  logger.info('🔗 LINK ZEPHYR TEST CASES TO JIRA WORK ITEM');
  logger.info('='.repeat(60));
  logger.info(`\nWork Item: ${workItem}`);
  logger.info(`Dry Run: ${dryRun ? 'Yes (no changes will be made)' : 'No (will create links)'}`);
  logger.info('');

  try {
    // Step 1: Verify Jira work item exists
    logger.info(`📋 Step 1: Verifying Jira work item exists...`);
    let jiraIssue;
    try {
      jiraIssue = await jiraClient.getIssue(workItem);
      logger.info(`✅ Found Jira work item: ${jiraIssue.fields.summary}`);
    } catch (error: any) {
      logger.error(`❌ Failed to fetch Jira work item ${workItem}: ${error.message}`);
      logger.error(`   Please verify the work item exists and you have access to it.`);
      process.exit(1);
    }

    // Step 2: Find test cases in Zephyr
    const linker = new ZephyrLinker();
    // Extract project key from work item (e.g., ST-234 -> ST, SF-520 -> SF)
    const projectKey = extractProjectPrefix(workItem) || process.env.ZEPHYR_PROJECT_KEY || 'SF';
    if (!extractProjectPrefix(workItem)) {
      logger.warn(`⚠️  Could not extract project key from work item "${workItem}". Using default: ${projectKey}`);
    } else {
      logger.info(`📋 Using project key "${projectKey}" extracted from work item "${workItem}"`);
    }
    let testCases: any[] = [];
    
    if (testCase) {
      // Link a specific test case
      logger.info(`\n🔍 Step 2: Searching for specific test case "${testCase}"...`);
      
      // Try to find by test case ID (label) first
      const byId = await zephyrClient.searchTestCasesByTestCaseId(testCase, projectKey);
      
      if (byId.length > 0) {
        testCases = byId;
        logger.info(`✅ Found test case by ID: ${testCase}`);
      } else {
        // Try to find by Zephyr key (e.g., SF-T199)
        try {
          const byKey = await zephyrClient.getTestCase(testCase);
          testCases = [byKey];
          logger.info(`✅ Found test case by Zephyr key: ${testCase}`);
        } catch (error: any) {
          logger.error(`❌ Test case "${testCase}" not found in Zephyr`);
          logger.error(`   Searched by:`);
          logger.error(`   - Test case ID (label): ${testCase}`);
          logger.error(`   - Zephyr key: ${testCase}`);
          logger.error(`\n   Please verify the test case exists and try again.`);
          process.exit(1);
        }
      }
    } else {
      // Find all test cases for this work item (uses shared finder)
      logger.info(`\n🔍 Step 2: Searching for test cases in Zephyr...`);
      testCases = await linker.findTestCasesForWorkItem(workItem, projectKey);
      
      if (testCases.length === 0) {
        logger.warn(`⚠️  No test cases found for "${workItem}"`);
        logger.info(`\n   This could mean:`);
        logger.info(`   - Test cases haven't been uploaded to Zephyr yet`);
        logger.info(`   - Test cases exist but don't have labels matching "${workItem}"`);
        logger.info(`   - Test cases are in a different project`);
        logger.info(`\n   To upload test cases, run:`);
        logger.info(`   npm run zephyr:UploadTestCase -- --work-item ${workItem}`);
        logger.info(`\n   To diagnose, run:`);
        logger.info(`   npm run diagnose:duplicates -- ${workItem}`);
        process.exit(0);
      }
    }

    logger.info(`✅ Found ${testCases.length} test case(s) in Zephyr:`);
    testCases.forEach((tc: any, index: number) => {
      const key = tc.key || 'N/A';
      const name = tc.name || 'N/A';
      logger.info(`   ${index + 1}. ${key}: ${name}`);
    });

    // Step 3 & 4: Use shared linker to link test cases
    logger.info(`\n🔗 Step 3 & 4: Linking test cases to Jira work item...`);
    const results = await linker.linkTestCases({
      workItem,
      testCases,
      dryRun,
    });

    // Summary
    const successCount = results.filter(r => r.action === 'linked').length;
    const skipCount = results.filter(r => r.action === 'skipped').length;
    const errorCount = results.filter(r => r.action === 'failed').length;

    logger.info(`\n` + '='.repeat(60));
    logger.info('📊 LINKING SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`   Total test cases found: ${testCases.length}`);
    logger.info(`   ✅ Successfully linked: ${successCount}`);
    logger.info(`   ⏭️  Already linked (skipped): ${skipCount}`);
    if (errorCount > 0) {
      logger.info(`   ❌ Failed to link: ${errorCount}`);
    }
    logger.info('');

    if (successCount > 0) {
      logger.info(`✅ Successfully linked ${successCount} test case(s) to Jira work item ${workItem}`);
      const jiraBaseUrl = process.env.JIRA_BASE_URL || config.getJiraConfig().baseUrl;
      if (jiraBaseUrl) {
        logger.info(`   View the links in Jira: ${jiraBaseUrl.replace(/\/+$/, '')}/browse/${workItem}`);
      }
    } else if (skipCount > 0) {
      logger.info(`ℹ️  All test cases are already linked to Jira work item ${workItem}`);
    }

  } catch (error: any) {
    logger.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: LinkOptions = {
  workItem: '',
  testCase: undefined,
  dryRun: false,
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--work-item' && args[i + 1]) {
    options.workItem = args[i + 1];
    i++;
  } else if (arg === '--test-case' && args[i + 1]) {
    options.testCase = args[i + 1];
    i++;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg.startsWith('--work-item=')) {
    options.workItem = arg.split('=')[1];
  } else if (arg.startsWith('--test-case=')) {
    options.testCase = arg.split('=')[1];
  }
}

if (!options.workItem) {
  logger.error('❌ Error: --work-item is required');
  logger.error('');
  logger.error('Usage:');
  logger.error('  # Link all test cases for a work item');
  logger.error('  npm run zephyr:LinkToJira -- --work-item SF-506');
  logger.error('');
  logger.error('  # Link a specific test case');
  logger.error('  npm run zephyr:LinkToJira -- --work-item SF-506 --test-case SF-506-UI-001');
  logger.error('  npm run zephyr:LinkToJira -- --work-item SF-506 --test-case SF-T199');
  logger.error('');
  logger.error('  # Dry run (preview without making changes)');
  logger.error('  npm run zephyr:LinkToJira -- --work-item SF-506 --dry-run');
  logger.error('');
  logger.error('Options:');
  logger.error('  --work-item <ID>    Jira work item ID (e.g., SF-506) [required]');
  logger.error('  --test-case <ID>    Specific test case ID (e.g., SF-506-UI-001) or Zephyr key (e.g., SF-T199) [optional]');
  logger.error('  --dry-run           Show what would be linked without making changes');
  process.exit(1);
}

// Run the linking process
linkTestCasesToJira(options).catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

