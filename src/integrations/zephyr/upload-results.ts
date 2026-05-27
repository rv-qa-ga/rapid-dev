#!/usr/bin/env ts-node

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   Zephyr Scale - Upload Test Execution Results                             ║
 * ║                                                                            ║
 * ║   This script uploads test execution results to Zephyr Scale.              ║
 * ║   It reads Cucumber JSON results and creates executions in a test cycle.   ║
 * ║                                                                            ║
 * ║   Usage:                                                                   ║
 * ║   npm run zephyr:UploadResult -- --test-case SF-520-UI-001 --cycle Sprint-93-QA ║
 * ║   npm run zephyr:UploadResult -- --feature SF-520.feature --cycle Sprint-93-QA  ║
 * ║   npm run zephyr:UploadResult -- --work-item SF-520 --cycle Sprint-93-QA        ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import {
  filterTestCasesByAutomationIdName,
  zephyrClient,
  ZephyrTestExecutionResult,
  ZephyrTestCycle,
} from './client';
import { confluenceClient } from '../confluence/client';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { extractProjectPrefix } from '../../utils/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface CucumberStep {
  keyword: string;
  name: string;
  result: {
    status: 'passed' | 'failed' | 'skipped' | 'pending' | 'undefined';
    duration?: number;
    error_message?: string;
  };
  embeddings?: Array<{
    data: string;
    mime_type: string;
    name?: string;
  }>;
}

interface CucumberScenario {
  id: string;
  name: string;
  keyword: string;
  tags?: Array<{ name: string }>;
  steps: CucumberStep[];
  type: 'scenario' | 'background';
}

interface CucumberFeature {
  uri: string;
  name: string;
  keyword: string;
  tags?: Array<{ name: string }>;
  elements: CucumberScenario[];
}

interface TestResult {
  testCaseId: string;
  testCaseName: string;
  featureFile: string;
  featureName: string;
  status: 'Pass' | 'Fail' | 'Not Executed';
  duration: number;
  errorMessage?: string;
  screenshots: string[];
  tags: string[];
}

interface UploadOptions {
  testCaseId?: string;
  /** Upload only these Zephyr-style IDs (e.g. SF-872-API-015), comma-separated via --test-cases. */
  testCaseIds?: string[];
  featureFile?: string;
  workItem?: string;
  /** Upload every tagged test case in the Cucumber JSON (no filter). */
  uploadAll?: boolean;
  testCycleName: string;
  resultsFile?: string;
  reportFile?: string;
  createCycleIfMissing?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT PARSER
// ═══════════════════════════════════════════════════════════════════════════════

class ResultParser {
  /** Standard RBT IDs, e.g. @SF-520-UI-001 */
  private static readonly TEST_CASE_ID_REGEX = /^@[A-Z]+-\d+-(UI|API|MIG|E2E)-\d+$/;
  /** QA smoke build IDs from qa-smoke-test.feature, e.g. @SMOKE-001 (must match run-zephyr-cycle-tests / Zephyr labels) */
  private static readonly SMOKE_TEST_CASE_ID_REGEX = /^@SMOKE-\d+$/;
  /** CLM migration suite tags → Zephyr automation ID when JSON predates SF-1235-MIG-nnn tags */
  private static readonly CLM_MIG_TAG_TO_AUTOMATION_ID: Record<string, string> = {
    '@CLM-MIG-000': 'SF-1235-MIG-001',
    '@CLM-MIG-COUNTS': 'SF-1235-MIG-002',
    '@CLM-MIG-PARTY': 'SF-1235-MIG-003',
    '@CLM-MIG-PARTY-SMOKE': 'SF-1235-MIG-004',
  };

  /**
   * Find the latest Cucumber JSON results file
   */
  static findLatestResultsFile(): string | null {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    // Look for cucumber JSON files
    const jsonFiles = globSync('**/*.json', { cwd: reportsDir })
      .filter(f => !f.includes('test-results') && !f.includes('allure'))
      .map(f => ({
        path: path.join(reportsDir, f),
        mtime: fs.statSync(path.join(reportsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (jsonFiles.length > 0) {
      logger.info(`Found latest results file: ${jsonFiles[0].path}`);
      return jsonFiles[0].path;
    }

    // Try common file names
    const commonNames = [
      'cucumber-report.json',
      'cucumber_report.json',
      'results.json',
      'test-results.json'
    ];

    for (const name of commonNames) {
      const filePath = path.join(reportsDir, name);
      if (fs.existsSync(filePath)) {
        logger.info(`Found results file: ${filePath}`);
        return filePath;
      }
    }

    return null;
  }

  /**
   * Find the latest HTML report file
   */
  static findLatestHtmlReport(): string | null {
    const reportsDir = path.join(process.cwd(), 'reports');
    
    const htmlFiles = globSync('**/*.html', { cwd: reportsDir })
      .map(f => ({
        path: path.join(reportsDir, f),
        mtime: fs.statSync(path.join(reportsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (htmlFiles.length > 0) {
      return htmlFiles[0].path;
    }

    return null;
  }

  /**
   * Find screenshots for a test case from the CURRENT run only
   * Uses the scenario end timestamp to filter out screenshots from previous runs
   * 
   * @param testCaseId - The test case ID (e.g., SF-520-UI-001)
   * @param scenarioEndTime - Timestamp when the scenario ended (used to filter)
   * @param scenarioName - Name of the scenario (for more specific matching)
   */
  static findScreenshots(testCaseId: string, scenarioEndTime?: Date, scenarioName?: string): string[] {
    const screenshotsDir = path.join(process.cwd(), 'reports', 'screenshots');
    
    if (!fs.existsSync(screenshotsDir)) {
      return [];
    }

    const allScreenshots = globSync('*.png', { cwd: screenshotsDir });
    
    // Filter screenshots that match the test case ID
    const testCaseIdClean = testCaseId.toLowerCase().replace(/@/g, '');
    let matchingScreenshots = allScreenshots.filter(f => 
      f.toLowerCase().includes(testCaseIdClean)
    );

    // If we have a scenario end time, only include screenshots created within 
    // a reasonable window (5 minutes before the scenario ended)
    if (scenarioEndTime && matchingScreenshots.length > 0) {
      const windowStart = scenarioEndTime.getTime() - (5 * 60 * 1000); // 5 min before end
      const windowEnd = scenarioEndTime.getTime() + (1 * 60 * 1000); // 1 min after end (buffer)
      
      matchingScreenshots = matchingScreenshots.filter(f => {
        const filePath = path.join(screenshotsDir, f);
        const mtime = fs.statSync(filePath).mtime.getTime();
        return mtime >= windowStart && mtime <= windowEnd;
      });
    }

    // Sort by creation time (newest first) and limit to most recent 3
    const sortedScreenshots = matchingScreenshots
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(screenshotsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 3) // Limit to 3 most recent screenshots per scenario
      .map(f => f.name);

    return sortedScreenshots.map(f => path.join(screenshotsDir, f));
  }

  /**
   * Extract test case ID from scenario tags
   */
  static extractTestCaseId(tags: string[]): string | null {
    for (const tag of tags) {
      if (this.TEST_CASE_ID_REGEX.test(tag)) {
        return tag.substring(1); // Remove @ prefix
      }
    }
    for (const tag of tags) {
      if (this.SMOKE_TEST_CASE_ID_REGEX.test(tag)) {
        return tag.substring(1);
      }
    }
    for (const tag of tags) {
      const mapped = this.CLM_MIG_TAG_TO_AUTOMATION_ID[tag];
      if (mapped) {
        return mapped;
      }
    }
    return null;
  }

  /**
   * Map Cucumber status to Zephyr status
   */
  static mapStatus(cucumberStatus: string): 'Pass' | 'Fail' | 'Not Executed' {
    switch (cucumberStatus) {
      case 'passed':
        return 'Pass';
      case 'failed':
        return 'Fail';
      case 'skipped':
      case 'pending':
      case 'undefined':
      default:
        return 'Not Executed';
    }
  }

  /**
   * Parse Cucumber JSON results
   */
  static parseResults(resultsFile: string): TestResult[] {
    if (!fs.existsSync(resultsFile)) {
      throw new Error(`Results file not found: ${resultsFile}`);
    }

    const content = fs.readFileSync(resultsFile, 'utf-8');
    const cucumberResults: CucumberFeature[] = JSON.parse(content);
    const testResults: TestResult[] = [];

    for (const feature of cucumberResults) {
      const featureFile = path.basename(feature.uri);
      
      for (const scenario of feature.elements) {
        if (scenario.type !== 'scenario') continue;

        const tags = scenario.tags?.map(t => t.name) || [];
        const testCaseId = this.extractTestCaseId(tags);

        if (!testCaseId) {
          logger.debug(`Skipping scenario without test case ID: ${scenario.name}`);
          continue;
        }

        // Determine overall status
        let overallStatus: 'passed' | 'failed' | 'skipped' = 'passed';
        let totalDuration = 0;
        let errorMessage: string | undefined;
        const screenshots: string[] = [];

        for (const step of scenario.steps) {
          if (step.result) {
            totalDuration += step.result.duration || 0;
            
            if (step.result.status === 'failed') {
              overallStatus = 'failed';
              errorMessage = step.result.error_message;
            } else if (step.result.status === 'skipped' && overallStatus !== 'failed') {
              overallStatus = 'skipped';
            }

            // Extract embedded screenshots from Cucumber report
            // These are the ONLY screenshots from the current run
            if (step.embeddings) {
              for (const embed of step.embeddings) {
                const mt = (embed.mime_type || '').toLowerCase();
                if (mt.startsWith('image/')) {
                  // Save embedded screenshot with unique timestamp
                  const screenshotPath = path.join(
                    process.cwd(),
                    'reports',
                    'screenshots',
                    `embedded-${testCaseId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.png`
                  );
                  fs.writeFileSync(screenshotPath, Buffer.from(embed.data, 'base64'));
                  screenshots.push(screenshotPath);
                } else if (mt.includes('json') || mt.startsWith('text/')) {
                  // Cucumber JSON/text evidence (e.g. REST URI + request/response for audits)
                  const ext = mt.includes('json') ? 'json' : 'txt';
                  const auditPath = path.join(
                    process.cwd(),
                    'reports',
                    'screenshots',
                    `audit-${testCaseId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`
                  );
                  fs.writeFileSync(auditPath, Buffer.from(embed.data, 'base64'));
                  screenshots.push(auditPath);
                }
              }
            }
          }
        }

        // Only use embedded screenshots from the Cucumber report
        // These are guaranteed to be from the current test run
        // Do NOT add filesystem screenshots as they may include old runs

        testResults.push({
          testCaseId,
          testCaseName: scenario.name,
          featureFile,
          featureName: feature.name,
          status: this.mapStatus(overallStatus),
          duration: Math.round(totalDuration / 1000000), // Convert nanoseconds to milliseconds
          errorMessage,
          screenshots: [...new Set(screenshots)], // Remove duplicates
          tags
        });
      }
    }

    return testResults;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

class UploadManager {
  
  /**
   * Find or create a test cycle
   */
  async findOrCreateTestCycle(
    cycleName: string,
    createIfMissing: boolean = true
  ): Promise<ZephyrTestCycle | null> {
    logger.info(`Looking for test cycle: ${cycleName}`);

    const cycleProjectKey =
      process.env.ZEPHYR_PROJECT_KEY?.trim() || config.getZephyrConfig().projectKey || 'SF';
    if (cycleProjectKey !== 'SF') {
      logger.info(`Using Zephyr project "${cycleProjectKey}" for test cycle search/create (not SF).`);
    }

    // Search for existing cycle (must scope to the same project as test cases, e.g. PP not SF)
    const existingCycles = await zephyrClient.searchTestCycles(cycleName, cycleProjectKey);
    
    // Try exact match first (case-sensitive, as in Zephyr UI)
    let cycle = existingCycles.find(c => c.name === cycleName);

    // Case-insensitive exact name
    if (!cycle) {
      const needle = cycleName.toLowerCase();
      cycle = existingCycles.find(c => (c.name ?? '').toLowerCase() === needle);
    }

    // Prefer shortest name among partial matches so "Sprint 100" does not pick a longer sibling first
    if (!cycle && existingCycles.length > 0) {
      const ranked = [...existingCycles].sort(
        (a, b) => (a.name?.length ?? 0) - (b.name?.length ?? 0),
      );
      cycle = ranked[0];
      logger.info(`Found test cycle (partial name match): ${cycle.name} (${cycle.key})`);
    }
    
    if (cycle) {
      logger.info(`✅ Found test cycle: ${cycle.name} (${cycle.key})`);
      return cycle;
    }

    if (!createIfMissing) {
      logger.error(`Test cycle not found: ${cycleName}`);
      return null;
    }

    // Create new test cycle
    logger.info(`Creating new test cycle: ${cycleName}`);
    const newCycle = await zephyrClient.createTestCycle({
      name: cycleName,
      projectKey: cycleProjectKey,
      description: `Test cycle created by automation framework on ${new Date().toISOString()}`,
      plannedStartDate: new Date().toISOString(),
    });

    logger.info(`✅ Created test cycle: ${newCycle.name} (${newCycle.key})`);
    return newCycle;
  }

  /**
   * Find a test case in Zephyr by ID
   */
  async findTestCase(testCaseId: string): Promise<{ key: string; name: string } | null> {
    // Extract project key from test case ID (e.g., ST-241-UI-001 -> ST, SF-520-UI-001 -> SF)
    const extractedProjectKey = extractProjectPrefix(testCaseId);
    const envPk = process.env.ZEPHYR_PROJECT_KEY?.trim();
    const projectKey =
      extractedProjectKey || envPk || (zephyrClient as any).projectKey || 'SF';
    
    if (extractedProjectKey) {
      logger.debug(`📋 Using project key "${projectKey}" extracted from test case ID "${testCaseId}"`);
    } else {
      logger.warn(`⚠️  Could not extract project key from test case ID "${testCaseId}". Using default: ${projectKey}`);
    }
    
    // Search by label (test case ID) - this also searches by name pattern
    const testCases = await zephyrClient.searchTestCasesByTestCaseId(testCaseId, projectKey);
    
    if (testCases.length > 0) {
      const tc = testCases[0];
      return { key: tc.key || '', name: tc.name };
    }

    // Fallback: Direct search by name pattern with pagination (more reliable than API name search)
    // Get all test cases and filter by exact name pattern match
    // This handles cases where test cases exist but don't have the label set
    logger.debug(`Fallback: Searching for test case by name pattern "${testCaseId}:" with pagination`);
    try {
      const isZephyrScaleCloud = (zephyrClient as any).isZephyrScaleCloud;
      
      if (isZephyrScaleCloud) {
        // Use pagination to search through all test cases (not just first 1000)
        let startAt = 0;
        const maxResults = 1000;
        let hasMore = true;
        while (hasMore) {
          const response = await (zephyrClient as any).client.get(
            `/testcases?projectKey=${encodeURIComponent(projectKey)}&startAt=${startAt}&maxResults=${maxResults}`
          );
          const data: { values?: any[]; data?: any[]; isLast?: boolean; total?: number } = response.data;
          const pageTestCases = data.values || data.data || [];
          
          logger.debug(`Fallback: Scanning page ${Math.floor(startAt / maxResults) + 1}: ${pageTestCases.length} test cases`);
          
          const matchingTestCases = filterTestCasesByAutomationIdName(pageTestCases, testCaseId);
          
          if (matchingTestCases.length > 0) {
            const tc = matchingTestCases[0];
            logger.info(`   Found test case by automation id in name: ${tc.key} - ${tc.name}`);
            return { key: tc.key || '', name: tc.name };
          }
          
          // Check if there are more pages
          if (data.isLast === false && pageTestCases.length === maxResults) {
            startAt += maxResults;
            hasMore = true;
          } else {
            hasMore = false;
          }
          
          // Safety limit: don't search more than 10,000 test cases
          if (startAt >= 10000) {
            logger.debug(`Fallback: Reached safety limit of 10,000 test cases`);
            break;
          }
        }
        
        logger.debug(`Fallback: Searched through all pages, no match found`);
      }
    } catch (error: any) {
      logger.debug(`Fallback name search failed: ${error.message}`);
      if (error.stack) {
        logger.debug(error.stack);
      }
    }

    return null;
  }

  /**
   * Upload a single test result
   */
  async uploadTestResult(
    result: TestResult,
    testCycleKey: string,
    testCycleName: string,
    htmlReportPath?: string
  ): Promise<boolean> {
    logger.info(`\n📤 Uploading result for: ${result.testCaseId}`);

    // Find the test case in Zephyr
    const testCase = await this.findTestCase(result.testCaseId);
    
    if (!testCase) {
      logger.error(`❌ Test case not found in Zephyr: ${result.testCaseId}`);
      logger.info(`   Hint: Run 'npm run zephyr:UploadTestCase -- --test-case ${result.testCaseId}' first`);
      return false;
    }

    logger.info(`   Found test case: ${testCase.key} - ${testCase.name}`);

    // ═══════════════════════════════════════════════════════════════════════════
    // UPLOAD EVIDENCE TO CONFLUENCE
    // ═══════════════════════════════════════════════════════════════════════════
    let confluenceUrl: string | null = null;
    
    if (confluenceClient.isConfigured()) {
      logger.info(`   📎 Uploading evidence to Confluence...`);
      
      // Collect files to upload
      const filesToUpload: string[] = [...result.screenshots];
      if (htmlReportPath && fs.existsSync(htmlReportPath)) {
        filesToUpload.push(htmlReportPath);
      }
      
      if (filesToUpload.length > 0) {
        confluenceUrl = await confluenceClient.uploadEvidence(
          testCycleName,
          result.testCaseId,
          result.testCaseName,
          filesToUpload
        );
        
        if (confluenceUrl) {
          logger.info(`   ✅ Evidence uploaded to Confluence`);
          logger.info(`      📎 ${confluenceUrl}`);
        }
      }
    } else {
      logger.debug(`   Confluence not configured - skipping evidence upload`);
    }

    // Create the execution result with Confluence link in comment
    const executionResult: ZephyrTestExecutionResult = {
      testCaseKey: testCase.key,
      testCycleKey: testCycleKey,
      statusName: result.status,
      comment: this.buildComment(result, confluenceUrl),
      executionTime: result.duration,
      actualEndDate: new Date().toISOString(),
    };

    try {
      const execution = await zephyrClient.createTestExecutionResult(executionResult);
      logger.debug(`   Execution response: ${JSON.stringify(execution)}`);
      
      const executionKey = execution?.key || execution?.id?.toString();
      logger.debug(`   Using execution key: ${executionKey}`);
      
      logger.info(`   ✅ Execution created: ${result.status}`);

      // Attach HTML report to Zephyr execution (per test)
      if (executionKey && htmlReportPath && fs.existsSync(htmlReportPath)) {
        logger.info(`   📎 Attaching HTML report to execution...`);
        await zephyrClient.uploadExecutionAttachment(executionKey, htmlReportPath);
      }

      // Log evidence info
      if (confluenceUrl) {
        logger.info(`   📎 Evidence: ${confluenceUrl}`);
      } else if (result.screenshots.length > 0) {
        logger.info(`   📸 Evidence: ${result.screenshots.length} screenshot(s) saved locally`);
        logger.info(`      Location: reports/screenshots/`);
      }

      return true;
    } catch (error: any) {
      logger.error(`   ❌ Failed to create execution: ${error.message}`);
      return false;
    }
  }

  /**
   * Build a comment for the execution
   */
  private buildComment(result: TestResult, confluenceUrl?: string | null): string {
    const lines: string[] = [];
    
    lines.push(`**Test Case:** ${result.testCaseId}`);
    lines.push(`**Scenario:** ${result.testCaseName}`);
    lines.push(`**Feature:** ${result.featureName}`);
    lines.push(`**Status:** ${result.status}`);
    lines.push(`**Duration:** ${result.duration}ms`);
    
    if (result.errorMessage) {
      lines.push('');
      lines.push('**Error:**');
      lines.push('```');
      lines.push(result.errorMessage.substring(0, 500));
      lines.push('```');
    }

    // Add Confluence evidence link
    if (confluenceUrl) {
      lines.push('');
      lines.push('---');
      lines.push(`📎 **Evidence:** [View Screenshots & Reports](${confluenceUrl})`);
    }

    lines.push('');
    lines.push(`_Uploaded by E2E Automation Framework on ${new Date().toISOString()}_`);

    return lines.join('\n');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║             Zephyr Scale - Upload Test Execution Results                   ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: UploadOptions = {
    testCycleName: '',
    createCycleIfMissing: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--test-case':
        options.testCaseId = args[++i];
        break;
      case '--test-cases':
        options.testCaseIds = (args[++i] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case '--feature':
        options.featureFile = args[++i];
        break;
      case '--work-item':
        options.workItem = args[++i];
        break;
      case '--cycle':
        options.testCycleName = args[++i];
        break;
      case '--results':
        options.resultsFile = args[++i];
        break;
      case '--report':
        options.reportFile = args[++i];
        break;
      case '--no-create-cycle':
        options.createCycleIfMissing = false;
        break;
      case '--all':
        options.uploadAll = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
    }
  }

  // Validate required parameters
  if (!options.testCycleName) {
    logger.error('❌ Test cycle name is required. Use --cycle <name>');
    console.log('');
    printHelp();
    process.exit(1);
  }

  if (
    !options.testCaseId &&
    !(options.testCaseIds && options.testCaseIds.length > 0) &&
    !options.featureFile &&
    !options.workItem &&
    !options.uploadAll
  ) {
    logger.error('❌ Specify --test-case, --test-cases, --feature, --work-item, or --all');
    console.log('');
    printHelp();
    process.exit(1);
  }

  // Find results file
  const resultsFile = options.resultsFile || ResultParser.findLatestResultsFile();
  if (!resultsFile) {
    logger.error('❌ No Cucumber results file found. Run tests first or specify --results <file>');
    process.exit(1);
  }

  // Find HTML report
  const htmlReportPath = options.reportFile || ResultParser.findLatestHtmlReport();
  if (htmlReportPath) {
    logger.info(`Found HTML report: ${htmlReportPath}`);
  }

  // Parse results
  logger.info(`Parsing results from: ${resultsFile}`);
  let allResults: TestResult[];
  try {
    allResults = ResultParser.parseResults(resultsFile);
    logger.info(`Found ${allResults.length} test result(s) in report`);
  } catch (error: any) {
    logger.error(`Failed to parse results: ${error.message}`);
    process.exit(1);
  }

  // Filter results based on options
  let filteredResults = allResults;

  if (options.testCaseId) {
    filteredResults = allResults.filter(r => r.testCaseId === options.testCaseId);
    if (filteredResults.length === 0) {
      logger.error(`❌ No results found for test case: ${options.testCaseId}`);
      logger.info(`   Available test cases in report: ${allResults.map(r => r.testCaseId).join(', ') || 'None'}`);
      process.exit(1);
    }
  } else if (options.testCaseIds && options.testCaseIds.length > 0) {
    const allow = new Set(options.testCaseIds);
    filteredResults = allResults.filter((r) => allow.has(r.testCaseId));
    if (filteredResults.length === 0) {
      logger.error(`❌ No results found for --test-cases: ${options.testCaseIds.join(', ')}`);
      logger.info(`   Available test cases in report: ${allResults.map((r) => r.testCaseId).join(', ') || 'None'}`);
      process.exit(1);
    }
    logger.info(`Uploading ${filteredResults.length} scenario result(s) matching --test-cases (other scenarios in JSON ignored)`);
  } else if (options.featureFile) {
    const featureName = path.basename(options.featureFile, '.feature');
    filteredResults = allResults.filter(r => 
      r.featureFile.toLowerCase().includes(featureName.toLowerCase())
    );
    if (filteredResults.length === 0) {
      logger.error(`❌ No results found for feature: ${options.featureFile}`);
      process.exit(1);
    }
  } else if (options.workItem) {
    const workItem = options.workItem.trim();
    // Require "<KEY>-" so SF-1159 does not match SF-11599-… and only Zephyr-style automation IDs upload.
    const automationPrefix = `${workItem}-`;
    filteredResults = allResults.filter((r) => r.testCaseId.startsWith(automationPrefix));
    if (filteredResults.length === 0) {
      logger.error(`❌ No results found for work item: ${workItem}`);
      logger.info(
        `   Expected @${workItem}-API-### / @${workItem}-UI-### / @${workItem}-MIG-### tags in the Cucumber JSON (prefix "${automationPrefix}").`
      );
      logger.info(`   Available test cases in report: ${allResults.map((r) => r.testCaseId).join(', ') || 'None'}`);
      process.exit(1);
    }
    logger.info(
      `Uploading ${filteredResults.length} scenario result(s) for work item ${workItem} only (automation ID prefix "${automationPrefix}"; other scenarios in JSON ignored).`
    );
  } else if (options.uploadAll) {
    filteredResults = allResults;
    if (filteredResults.length === 0) {
      logger.error('❌ No test results with @WORK-ITEM-API/UI-### tags in report. Run Cucumber with JSON formatter.');
      process.exit(1);
    }
    logger.info(`Uploading all ${filteredResults.length} scenario result(s) from report (--all)`);
  }

  // Deduplicate results for scenario outlines (multiple examples = one test case)
  // Group by test case ID and consolidate status:
  // - If ANY failed → overall Fail
  // - If ALL passed → overall Pass
  // - Otherwise → Not Executed
  const resultsByTestCase = new Map<string, TestResult>();
  
  for (const result of filteredResults) {
    const existing = resultsByTestCase.get(result.testCaseId);
    
    if (!existing) {
      // First result for this test case
      resultsByTestCase.set(result.testCaseId, { ...result });
    } else {
      // Merge with existing result
      // Status: Fail takes priority, then Pass, then Not Executed
      if (result.status === 'Fail') {
        existing.status = 'Fail';
        existing.errorMessage = existing.errorMessage || result.errorMessage;
      }
      // Combine evidence files (PNG + JSON audit); cap so Confluence/Zephyr uploads stay bounded
      const combinedScreenshots = [...existing.screenshots, ...result.screenshots];
      existing.screenshots = combinedScreenshots.slice(0, 25);
      // Add durations
      existing.duration += result.duration;
    }
  }
  
  // Convert back to array
  const consolidatedResults = Array.from(resultsByTestCase.values());
  
  logger.info(`Consolidated ${filteredResults.length} scenario results into ${consolidatedResults.length} test case execution(s)`);

  // Display summary
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('📊 UPLOAD SUMMARY');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log(`   Test Cycle: ${options.testCycleName}`);
  console.log(`   Scenarios in Report: ${filteredResults.length}`);
  console.log(`   Unique Test Cases to Upload: ${consolidatedResults.length}`);
  console.log('');
  
  // Show results to be uploaded
  console.log('   Test Cases:');
  for (const result of consolidatedResults) {
    const statusIcon = result.status === 'Pass' ? '✅' : result.status === 'Fail' ? '❌' : '⏭️';
    const screenshotCount = result.screenshots.length;
    console.log(`      ${statusIcon} ${result.testCaseId}: ${result.testCaseName} (${result.status}, ${screenshotCount} screenshot(s))`);
  }
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('');

  // Initialize upload manager
  const uploadManager = new UploadManager();

  // Find or create test cycle
  const testCycle = await uploadManager.findOrCreateTestCycle(
    options.testCycleName,
    options.createCycleIfMissing
  );

  if (!testCycle || !testCycle.key) {
    logger.error('❌ Could not find or create test cycle');
    process.exit(1);
  }

  // Upload results (one execution per test case)
  let successCount = 0;
  let failCount = 0;

  for (const result of consolidatedResults) {
    const success = await uploadManager.uploadTestResult(
      result, 
      testCycle.key, 
      testCycle.name || options.testCycleName,  // Pass cycle name for Confluence folder
      htmlReportPath ?? undefined
    );
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  // Final summary
  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('📊 UPLOAD COMPLETE');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Test Cycle: ${testCycle.name} (${testCycle.key})`);
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('');

  if (failCount > 0) {
    process.exit(1);
  }
}

function printHelp() {
  console.log('Usage: npm run zephyr:UploadResult -- [options]');
  console.log('');
  console.log('Options:');
  console.log('  --test-case <id>     Upload result for a specific test case (e.g., SF-520-UI-001)');
  console.log('  --test-cases <ids>   Comma-separated test case IDs (only these uploads, e.g. SF-872-API-015,SF-872-API-016)');
  console.log('  --feature <file>     Upload results for all scenarios in a feature file');
  console.log('  --work-item <id>     Upload results for all test cases in a work item (e.g., SF-520)');
  console.log('  --all                Upload every tagged scenario in the Cucumber JSON (use latest --results or reports/json)');
  console.log('  --cycle <name>       Test cycle name in Zephyr (required)');
  console.log('  --results <file>     Path to Cucumber JSON results file (auto-detected if not specified)');
  console.log('  --report <file>      Path to HTML report to attach (auto-detected if not specified)');
  console.log('  --no-create-cycle    Do not create test cycle if it doesn\'t exist');
  console.log('  --help               Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  npm run zephyr:UploadResult -- --test-case SF-520-UI-001 --cycle Sprint-93-QA');
  console.log('  npm run zephyr:UploadResult -- --feature SF-520.feature --cycle Sprint-93-QA');
  console.log('  npm run zephyr:UploadResult -- --work-item SF-520 --cycle Sprint-93-QA');
  console.log('  npm run zephyr:UploadResult -- --all --cycle Sprint-101-QA');
}

// Run main
main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

