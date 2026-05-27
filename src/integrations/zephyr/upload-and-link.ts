#!/usr/bin/env ts-node

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   ZEPHYR UPLOAD AND LINK UTILITY                                            ║
 * ║                                                                            ║
 * ║   This wrapper utility:                                                     ║
 * ║   1. Uploads test cases from feature files to Zephyr Scale                 ║
 * ║   2. Links uploaded test cases to Jira work items                          ║
 * ║   3. Generates a comprehensive report on success/failure                    ║
 * ║                                                                            ║
 * ║   Usage:                                                                    ║
 * ║     npm run zephyr:UploadAndLink -- --work-item SF-505                     ║
 * ║     npm run zephyr:UploadAndLink -- --test-case SF-505-UI-001              ║
 * ║     npm run zephyr:UploadAndLink -- --work-item SF-505 --skip-link          ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import { ZephyrSync } from './sync';
import { zephyrClient } from './client';
import { logger } from '../../utils/logger';
import { parseJiraKey, extractProjectPrefix } from '../../utils/helpers';
import { ZephyrLinker } from './linker';
import * as readline from 'readline';

interface UploadAndLinkOptions {
  workItems?: string[];
  testCase?: string;
  skipLink?: boolean;
  dryRun?: boolean;
}

interface UploadResult {
  testCaseId: string;
  testCaseName: string;
  zephyrKey?: string;
  success: boolean;
  error?: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
}

interface LinkResult {
  testCaseKey: string;
  testCaseName: string;
  success: boolean;
  error?: string;
  action: 'linked' | 'skipped' | 'failed';
}

interface Report {
  workItem: string;
  uploadResults: UploadResult[];
  linkResults: LinkResult[];
  summary: {
    totalTestCases: number;
    uploaded: number;
    updated: number;
    skipped: number;
    failed: number;
    linked: number;
    linkSkipped: number;
    linkFailed: number;
  };
}

class UploadAndLinkUtility {
  private sync: ZephyrSync;
  private linker: ZephyrLinker;
  private uploadResults: UploadResult[] = [];
  private linkResults: LinkResult[] = [];
  private rl: readline.Interface;

  constructor() {
    this.sync = new ZephyrSync();
    this.linker = new ZephyrLinker();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  close(): void {
    if (this.rl) {
      this.rl.close();
    }
    if (this.sync) {
      this.sync.close();
    }
  }

  /**
   * Prompt user for confirmation
   */
  private async promptConfirmation(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.rl.question(`${message} (y/n): `, (answer) => {
        const normalized = answer.trim().toLowerCase();
        resolve(normalized === 'y' || normalized === 'yes');
      });
    });
  }

  /**
   * Upload test cases for a work item
   */
  async uploadTestCases(workItem: string): Promise<UploadResult[]> {
    logger.info('\n' + '='.repeat(80));
    logger.info('📤 STEP 1: UPLOADING TEST CASES TO ZEPHYR');
    logger.info('='.repeat(80));
    logger.info(`\nWork Item: ${workItem}\n`);

    const results: UploadResult[] = [];
    const parsedKey = parseJiraKey(workItem);
    
    if (!parsedKey) {
      logger.error(`❌ Invalid Jira key format: ${workItem}`);
      return results;
    }

    try {
      // Step 1: Count test cases from feature files
      logger.info(`📊 Counting test cases from feature files...`);
      const featureCounts = this.sync.countTestCasesFromFeatureFiles(parsedKey);
      
      if (featureCounts.total === 0) {
        logger.warn(`⚠️  No test cases found in feature files for ${parsedKey}`);
        logger.warn(`   Please ensure feature files exist at: src/features/**/${parsedKey}.feature`);
        return results;
      }

      // Step 2: Check for duplicates in Zephyr
      // Use project key from work item (e.g. ENG-145 -> ENG) so ENG board works without ZEPHYR_PROJECT_KEY
      const projectKey = extractProjectPrefix(parsedKey) || process.env.ZEPHYR_PROJECT_KEY || 'SF';
      logger.info(`Using Zephyr project key: ${projectKey} (from work item ${parsedKey})`);
      const skipDuplicateCheck = process.env.ZEPHYR_SKIP_DUPLICATE_CHECK === 'true';
      let existingCount = 0;
      
      if (!skipDuplicateCheck) {
        logger.info(`🔍 Checking for duplicate test cases in Zephyr...`);
        const duplicateCheck = await this.sync.checkForDuplicates(parsedKey);
        
        if (duplicateCheck.hasDuplicates) {
          this.sync.displayDuplicatesAndStop(parsedKey, duplicateCheck.duplicateGroups);
          throw new Error(`Duplicate test cases detected for ${parsedKey}. Please resolve duplicates before continuing. Set ZEPHYR_SKIP_DUPLICATE_CHECK=true to bypass this check.`);
        }
        
        // Get existing count
        const existingBefore = await zephyrClient.searchTestCasesByLabel(parsedKey, projectKey);
        existingCount = existingBefore.length;
        
        logger.info(`✅ No duplicates found in search results.`);
        logger.warn(`\n⚠️  NOTE: Duplicate detection has limitations:`);
        logger.warn(`   - Only searches first 1000 test cases (pagination limit)`);
        logger.warn(`   - Newly created test cases may not appear immediately (indexing delay)`);
        logger.warn(`   - If duplicates are created, use "npm run zephyr:RemoveDuplicates" to identify and remove them`);
      } else {
        logger.warn(`⚠️  Skipping duplicate check (ZEPHYR_SKIP_DUPLICATE_CHECK=true)`);
        logger.warn(`   This may result in creating additional duplicates.`);
        const existingBefore = await zephyrClient.searchTestCasesByLabel(parsedKey, projectKey);
        existingCount = existingBefore.length;
      }

      // Step 3: Display summary and ask for confirmation
      logger.info('\n' + '='.repeat(80));
      logger.info('📋 UPLOAD SUMMARY');
      logger.info('='.repeat(80));
      logger.info(`\n📁 Feature Files: ${featureCounts.files.length}`);
      for (const { file, count } of featureCounts.files) {
        logger.info(`   - ${file}: ${count} test case(s)`);
      }
      logger.info(`\n📊 Total Test Cases to Upload: ${featureCounts.total}`);
      logger.info(`📊 Existing in Zephyr: ${existingCount} test case(s)`);
      logger.info(`📊 New Test Cases: ${Math.max(0, featureCounts.total - existingCount)}`);
      logger.info('\n' + '='.repeat(80));

      // Step 4: Ask for user confirmation (unless non-interactive mode)
      const isNonInteractive =
        process.env.ZEPHYR_NON_INTERACTIVE === 'true' ||
        process.env.CI === 'true' ||
        !process.stdin.isTTY;
      
      if (!isNonInteractive) {
        const confirmed = await this.promptConfirmation(`\n❓ Proceed with uploading ${featureCounts.total} test case(s) to Zephyr?`);
        if (!confirmed) {
          logger.info(`\n❌ Upload cancelled by user.`);
          return results;
        }
        logger.info(`\n✅ User confirmed. Proceeding with upload...\n`);
      } else {
        logger.info(`\n✅ Non-interactive mode: Proceeding with upload automatically...\n`);
      }

      // Step 5: Upload test cases
      const existingBefore = await zephyrClient.searchTestCasesByLabel(parsedKey, projectKey);
      const existingKeysBefore = new Set(existingBefore.map((tc: any) => tc.key));
      logger.info(`📋 Found ${existingBefore.length} existing test case(s) before upload`);

      logger.info(`🚀 Starting upload process...`);
      await this.sync.syncWorkItem(parsedKey);

      // Wait for Zephyr to process and index the new test cases
      // Increased wait time and added retry logic
      logger.info(`⏳ Waiting for Zephyr to process test cases...`);
      let existingAfter: any[] = [];
      let retries = 0;
      const maxRetries = 5;
      const retryDelay = 3000; // 3 seconds

      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        existingAfter = await zephyrClient.searchTestCasesByLabel(parsedKey, projectKey);
        
        logger.debug(`   Retry ${retries + 1}/${maxRetries}: Found ${existingAfter.length} test case(s)`);
        
        // If we found more test cases than before, they're likely newly created
        if (existingAfter.length > existingBefore.length) {
          logger.info(`✅ Found ${existingAfter.length} test case(s) after upload (${existingAfter.length - existingBefore.length} new)`);
          break;
        }
        
        retries++;
      }

      if (existingAfter.length === existingBefore.length && existingAfter.length > 0) {
        logger.warn(`⚠️  No new test cases detected. All ${existingAfter.length} test cases may have already existed.`);
      } else if (existingAfter.length === 0) {
        logger.warn(`⚠️  No test cases found after upload. This could mean:`);
        logger.warn(`   - Test cases were created but don't have the "${parsedKey}" label`);
        logger.warn(`   - Test cases are still being processed by Zephyr`);
        logger.warn(`   - Upload may have failed silently`);
        
        // Fallback: Try to find test cases by name pattern (same logic as link utility)
        logger.info(`🔍 Attempting fallback search by name pattern...`);
        try {
          const isZephyrScaleCloud = (zephyrClient as any).isZephyrScaleCloud;
          if (isZephyrScaleCloud) {
            const response = await (zephyrClient as any).client.get(
              `/testcases?projectKey=${encodeURIComponent(projectKey)}&maxResults=1000`
            );
            const data: { values?: any[]; data?: any[] } = response.data;
            const allTestCasesRaw = data.values || data.data || [];
            
            // Filter by name that starts with work item
            const byName = allTestCasesRaw.filter((tc: any) => {
              const name = tc.name || '';
              return name.startsWith(parsedKey);
            });
            
            if (byName.length > 0) {
              logger.info(`✅ Fallback found ${byName.length} test case(s) by name pattern`);
              existingAfter = byName;
            }
          }
        } catch (error: any) {
          logger.warn(`   Fallback search failed: ${error.message}`);
        }
      }
      
      // Determine what was created/updated
      for (const testCase of existingAfter) {
        const testCaseAny = testCase as any;
        const testCaseKey = testCaseAny.key;
        const testCaseName = testCaseAny.name || 'Unknown';
        const labels = testCaseAny.labels || [];
        const testCaseId = labels.find((l: string) => /^[A-Z]+-\d+-(UI|API|MIG|E2E)-\d+$/.test(l));

        // If no test case ID found, try to extract from name
        let finalTestCaseId = testCaseId;
        if (!finalTestCaseId) {
          const nameMatch = testCaseName.match(/^([A-Z]+-\d+-(UI|API|MIG|E2E)-\d+)/);
          if (nameMatch) {
            finalTestCaseId = nameMatch[1];
            logger.debug(`   Extracted test case ID from name: ${finalTestCaseId}`);
          }
        }

        if (!finalTestCaseId) {
          logger.warn(`⚠️  Skipping test case without ID: ${testCaseKey} - ${testCaseName}`);
          logger.debug(`   Labels: ${labels.join(', ')}`);
          continue;
        }

        const wasNew = !existingKeysBefore.has(testCaseKey);
        const result: UploadResult = {
          testCaseId: finalTestCaseId,
          testCaseName,
          zephyrKey: testCaseKey,
          success: true,
          action: wasNew ? 'created' : 'updated',
        };
        results.push(result);
        logger.debug(`   ${wasNew ? '✅ Created' : '🔄 Updated'}: ${testCaseKey} - ${finalTestCaseId}`);
      }

      logger.info(`\n📊 Upload Summary: ${results.length} test case(s) processed`);
      logger.info(`   ✅ Created: ${results.filter(r => r.action === 'created').length}`);
      logger.info(`   🔄 Updated: ${results.filter(r => r.action === 'updated').length}`);

      // Check for any failures by comparing expected vs actual
      // This is a simplified approach - in a real scenario, we'd track during upload
      this.uploadResults = results;
      return results;
    } catch (error: any) {
      logger.error(`❌ Failed to upload test cases: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      return results;
    }
  }

  /**
   * Upload a single test case
   */
  async uploadSingleTestCase(testCaseId: string): Promise<UploadResult[]> {
    logger.info('\n' + '='.repeat(60));
    logger.info('📤 STEP 1: UPLOADING TEST CASE TO ZEPHYR');
    logger.info('='.repeat(60));
    logger.info(`\nTest Case: ${testCaseId}\n`);

    const results: UploadResult[] = [];

    try {
      // Use project key from test case id (e.g. ENG-145-UI-001 -> ENG) so ENG board works without ZEPHYR_PROJECT_KEY
      const projectKey = extractProjectPrefix(testCaseId) || testCaseId.match(/^([A-Z]+)-/)?.[1] || process.env.ZEPHYR_PROJECT_KEY || 'SF';
      logger.info(`Using Zephyr project key: ${projectKey} (from test case ${testCaseId})`);
      // Find test case before upload
      const existingBefore = await zephyrClient.searchTestCasesByTestCaseId(testCaseId, projectKey);
      const existedBefore = existingBefore.length > 0;

      // Upload test case
      await this.sync.syncTestCase(testCaseId);

      // Verify upload
      await new Promise(resolve => setTimeout(resolve, 1000));
      const existingAfter = await zephyrClient.searchTestCasesByTestCaseId(testCaseId, projectKey);

      if (existingAfter.length > 0) {
        const testCase = existingAfter[0];
        const testCaseAny = testCase as any;
        const result: UploadResult = {
          testCaseId,
          testCaseName: testCase.name || 'Unknown',
          zephyrKey: testCaseAny.key,
          success: true,
          action: existedBefore ? 'updated' : 'created',
        };
        results.push(result);
      } else {
        results.push({
          testCaseId,
          testCaseName: 'Unknown',
          success: false,
          error: 'Test case not found after upload',
          action: 'failed',
        });
      }

      this.uploadResults = results;
      return results;
    } catch (error: any) {
      logger.error(`❌ Failed to upload test case: ${error.message}`);
      results.push({
        testCaseId,
        testCaseName: 'Unknown',
        success: false,
        error: error.message,
        action: 'failed',
      });
      this.uploadResults = results;
      return results;
    }
  }

  /**
   * Link test cases to Jira work item
   * Uses shared ZephyrLinker for consistency
   */
  async linkTestCases(workItem: string, uploadResults: UploadResult[]): Promise<LinkResult[]> {
    logger.info('\n' + '='.repeat(60));
    logger.info('🔗 STEP 2: LINKING TEST CASES TO JIRA');
    logger.info('='.repeat(60));
    logger.info(`\nWork Item: ${workItem}\n`);

    try {
      let testCasesToLink: any[] = [];

      // If we have upload results, use those
      if (uploadResults.length > 0) {
        logger.info(`📋 Using ${uploadResults.length} test case(s) from upload results...`);
        // Convert upload results to test case format for linker
        testCasesToLink = uploadResults
          .filter(r => r.success && r.zephyrKey)
          .map(r => ({
            key: r.zephyrKey,
            name: r.testCaseName,
          }));
      }

      // Fallback: when upload results empty (e.g. Zephyr indexing delay after upload),
      // find test cases by work item so linking still runs.
      if (testCasesToLink.length === 0) {
        logger.warn(`⚠️  No upload results to link (upload may have just finished). Searching Zephyr for test cases with work item "${workItem}"...`);
        const parsedKey = parseJiraKey(workItem);
        if (parsedKey) {
          testCasesToLink = await this.linker.findTestCasesForWorkItem(workItem);
          logger.info(`   Found ${testCasesToLink.length} test case(s) for "${parsedKey}"`);
        }
      }

      if (testCasesToLink.length === 0) {
        logger.warn(`⚠️  No test cases found to link for ${workItem}`);
        return [];
      }

      // Use shared linker to link test cases
      const results = await this.linker.linkTestCases({
        workItem,
        testCases: testCasesToLink,
        dryRun: false,
      });

      this.linkResults = results;
      return results;
    } catch (error: any) {
      logger.error(`❌ Failed to link test cases: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
      return [];
    }
  }

  /**
   * Generate and display comprehensive report
   */
  generateReport(workItem: string, uploadResults: UploadResult[], linkResults: LinkResult[]): Report {
    const summary = {
      totalTestCases: uploadResults.length,
      uploaded: uploadResults.filter(r => r.action === 'created').length,
      updated: uploadResults.filter(r => r.action === 'updated').length,
      skipped: uploadResults.filter(r => r.action === 'skipped').length,
      failed: uploadResults.filter(r => r.action === 'failed').length,
      linked: linkResults.filter(r => r.action === 'linked').length,
      linkSkipped: linkResults.filter(r => r.action === 'skipped').length,
      linkFailed: linkResults.filter(r => r.action === 'failed').length,
    };

    const report: Report = {
      workItem,
      uploadResults,
      linkResults,
      summary,
    };

    // Display report
    logger.info('\n' + '='.repeat(80));
    logger.info('📊 UPLOAD AND LINK REPORT');
    logger.info('='.repeat(80));
    logger.info(`\nWork Item: ${workItem}`);
    logger.info(`\n📤 UPLOAD SUMMARY:`);
    logger.info(`   Total Test Cases: ${summary.totalTestCases}`);
    logger.info(`   ✅ Created: ${summary.uploaded}`);
    logger.info(`   🔄 Updated: ${summary.updated}`);
    logger.info(`   ⏭️  Skipped: ${summary.skipped}`);
    logger.info(`   ❌ Failed: ${summary.failed}`);

    if (linkResults.length > 0) {
      logger.info(`\n🔗 LINK SUMMARY:`);
      logger.info(`   ✅ Linked: ${summary.linked}`);
      logger.info(`   ⏭️  Already Linked (Skipped): ${summary.linkSkipped}`);
      logger.info(`   ❌ Failed: ${summary.linkFailed}`);
    }

    // Show failures
    const uploadFailures = uploadResults.filter(r => r.action === 'failed');
    if (uploadFailures.length > 0) {
      logger.info(`\n❌ UPLOAD FAILURES:`);
      uploadFailures.forEach((r, index) => {
        logger.info(`   ${index + 1}. ${r.testCaseId}: ${r.error || 'Unknown error'}`);
      });
    }

    const linkFailures = linkResults.filter(r => r.action === 'failed');
    if (linkFailures.length > 0) {
      logger.info(`\n❌ LINK FAILURES:`);
      linkFailures.forEach((r, index) => {
        logger.info(`   ${index + 1}. ${r.testCaseKey}: ${r.error || 'Unknown error'}`);
      });
    }

    // Show success details
    const successes = uploadResults.filter(r => r.success);
    if (successes.length > 0) {
      logger.info(`\n✅ SUCCESSFULLY PROCESSED:`);
      successes.forEach((r, index) => {
        const linkResult = linkResults.find(lr => lr.testCaseKey === r.zephyrKey);
        const linkStatus = linkResult 
          ? (linkResult.action === 'linked' ? '✅ Linked' : linkResult.action === 'skipped' ? '⏭️  Already Linked' : '❌ Link Failed')
          : '⏭️  Not Linked';
        logger.info(`   ${index + 1}. ${r.testCaseId} (${r.zephyrKey}) - ${r.action} - ${linkStatus}`);
      });
    }

    logger.info('\n' + '='.repeat(80));
    
    // Overall status
    const allSuccess = summary.failed === 0 && summary.linkFailed === 0;
    if (allSuccess) {
      logger.info('✅ ALL OPERATIONS COMPLETED SUCCESSFULLY');
    } else {
      logger.warn('⚠️  SOME OPERATIONS FAILED - SEE DETAILS ABOVE');
    }
    logger.info('='.repeat(80) + '\n');

    return report;
  }

}

async function processWorkItems(utility: UploadAndLinkUtility, workItems: string[], skipLink: boolean): Promise<{ totalFailures: number }> {
  const allUploadResults: Map<string, UploadResult[]> = new Map();
  const allLinkResults: Map<string, LinkResult[]> = new Map();
  let totalFailures = 0;

  for (let i = 0; i < workItems.length; i++) {
    const workItem = workItems[i];
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`📦 PROCESSING WORK ITEM ${i + 1} OF ${workItems.length}: ${workItem}`);
    logger.info('='.repeat(80));

    try {
      // Step 1: Upload test cases
      const uploadResults = await utility.uploadTestCases(workItem);
      allUploadResults.set(workItem, uploadResults);

      // Step 2: Link test cases (if not skipped)
      // Always run link step when !skipLink so that we link even when uploadResults
      // is empty (e.g. Zephyr indexing delay); linkTestCases falls back to finding
      // test cases by work item when uploadResults is empty.
      if (!skipLink) {
        const linkResults = await utility.linkTestCases(workItem, uploadResults);
        allLinkResults.set(workItem, linkResults);
      } else if (skipLink) {
        logger.info('\n⏭️  Skipping link step (--skip-link flag set)');
      }

      // Step 3: Generate report for this work item
      const linkResults = allLinkResults.get(workItem) || [];
      const report = utility.generateReport(workItem, uploadResults, linkResults);
      
      if (report.summary.failed > 0 || report.summary.linkFailed > 0) {
        totalFailures++;
      }
    } catch (error: any) {
      logger.error(`❌ Failed to process work item ${workItem}: ${error.message}`);
      totalFailures++;
    }
  }

  // Generate overall summary
  logger.info('\n' + '='.repeat(80));
  logger.info('📊 OVERALL SUMMARY');
  logger.info('='.repeat(80));
  logger.info(`\nTotal Work Items Processed: ${workItems.length}`);
  
  let totalUploaded = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalLinked = 0;
  let totalLinkSkipped = 0;
  let totalLinkFailed = 0;

  for (const workItem of workItems) {
    const uploadResults = allUploadResults.get(workItem) || [];
    const linkResults = allLinkResults.get(workItem) || [];
    
    totalUploaded += uploadResults.filter(r => r.action === 'created').length;
    totalUpdated += uploadResults.filter(r => r.action === 'updated').length;
    totalSkipped += uploadResults.filter(r => r.action === 'skipped').length;
    totalFailed += uploadResults.filter(r => r.action === 'failed').length;
    totalLinked += linkResults.filter(r => r.action === 'linked').length;
    totalLinkSkipped += linkResults.filter(r => r.action === 'skipped').length;
    totalLinkFailed += linkResults.filter(r => r.action === 'failed').length;
  }

  logger.info(`\n📤 UPLOAD TOTALS:`);
  logger.info(`   ✅ Created: ${totalUploaded}`);
  logger.info(`   🔄 Updated: ${totalUpdated}`);
  logger.info(`   ⏭️  Skipped: ${totalSkipped}`);
  logger.info(`   ❌ Failed: ${totalFailed}`);

  if (!skipLink) {
    logger.info(`\n🔗 LINK TOTALS:`);
    logger.info(`   ✅ Linked: ${totalLinked}`);
    logger.info(`   ⏭️  Already Linked: ${totalLinkSkipped}`);
    logger.info(`   ❌ Failed: ${totalLinkFailed}`);
  }

  logger.info('\n' + '='.repeat(80));
  if (totalFailures === 0 && totalFailed === 0 && totalLinkFailed === 0) {
    logger.info('✅ ALL WORK ITEMS PROCESSED SUCCESSFULLY');
  } else {
    logger.warn(`⚠️  ${totalFailures} WORK ITEM(S) HAD FAILURES`);
  }
  logger.info('='.repeat(80) + '\n');

  return { totalFailures };
}

async function main() {
  const utility = new UploadAndLinkUtility();
  
  try {
    const args = process.argv.slice(2);
    const options: UploadAndLinkOptions = {
      workItems: [],
      skipLink: false,
      dryRun: false,
    };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--work-item' && args[i + 1]) {
      if (!options.workItems) options.workItems = [];
      options.workItems.push(args[i + 1]);
      i++;
    } else if (arg === '--test-case' && args[i + 1]) {
      options.testCase = args[i + 1];
      i++;
    } else if (arg === '--file' && args[i + 1]) {
      // Read work items from file
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.resolve(args[i + 1]);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const workItems = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));
        if (!options.workItems) options.workItems = [];
        options.workItems.push(...workItems);
      } else {
        logger.error(`❌ File not found: ${filePath}`);
        process.exit(1);
      }
      i++;
    } else if (arg === '--skip-link') {
      options.skipLink = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--work-item=')) {
      if (!options.workItems) options.workItems = [];
      options.workItems.push(arg.split('=')[1]);
    } else if (arg.startsWith('--test-case=')) {
      options.testCase = arg.split('=')[1];
    }
  }

  if ((!options.workItems || options.workItems.length === 0) && !options.testCase) {
    logger.error('❌ Error: --work-item, --file, or --test-case is required');
    logger.error('');
    logger.error('Usage:');
    logger.error('  # Upload and link all test cases for a work item');
    logger.error('  npm run zephyr:UploadAndLink -- --work-item SF-505');
    logger.error('');
    logger.error('  # Upload and link for multiple work items');
    logger.error('  npm run zephyr:UploadAndLink -- --work-item SF-505 --work-item SF-506');
    logger.error('');
    logger.error('  # Upload and link from a file (one work item per line)');
    logger.error('  npm run zephyr:UploadAndLink -- --file inputs/jira-work-items.txt');
    logger.error('');
    logger.error('  # Upload and link a specific test case');
    logger.error('  npm run zephyr:UploadAndLink -- --test-case SF-505-UI-001');
    logger.error('');
    logger.error('  # Upload only (skip linking)');
    logger.error('  npm run zephyr:UploadAndLink -- --work-item SF-505 --skip-link');
    logger.error('');
    logger.error('Options:');
    logger.error('  --work-item <ID>    Jira work item ID (can be specified multiple times)');
    logger.error('  --file <path>       File containing work item IDs (one per line, # for comments)');
    logger.error('  --test-case <ID>    Specific test case ID (e.g., SF-505-UI-001)');
    logger.error('  --skip-link         Upload only, skip linking to Jira');
    logger.error('  --dry-run           Preview what would be done (not yet implemented)');
    process.exit(1);
  }

    // Handle single test case
    if (options.testCase) {
      // Extract work item from test case ID (e.g., SF-505-UI-001 -> SF-505)
      const match = options.testCase.match(/^([A-Z]+-\d+)/);
      if (!match) {
        logger.error(`❌ Could not extract work item from test case ID: ${options.testCase}`);
        process.exit(1);
      }
      const workItem = match[1];
      
      const uploadResults = await utility.uploadSingleTestCase(options.testCase);
      let linkResults: LinkResult[] = [];
      
      if (!options.skipLink) {
        linkResults = await utility.linkTestCases(workItem, uploadResults);
      }
      
      const report = utility.generateReport(workItem, uploadResults, linkResults);
      const hasFailures = report.summary.failed > 0 || report.summary.linkFailed > 0;
      process.exit(hasFailures ? 1 : 0);
    }
    // Handle multiple work items
    else if (options.workItems && options.workItems.length > 0) {
      const { totalFailures } = await processWorkItems(utility, options.workItems, options.skipLink || false);
      process.exit(totalFailures > 0 ? 1 : 0);
    }
  } catch (error: any) {
    logger.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  } finally {
    utility.close();
  }
}

main();

