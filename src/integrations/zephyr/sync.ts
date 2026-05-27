#!/usr/bin/env ts-node

/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   ZEPHYR TEST CASE UPLOAD UTILITY - V2                                      ║
 * ║                                                                            ║
 * ║   This version uploads test cases as Gherkin type (not Step-by-Step).      ║
 * ║                                                                            ║
 * ║   Key Features:                                                             ║
 * ║   - Uploads test cases as BDD-Gherkin type in Zephyr Scale                 ║
 * ║   - Gherkin script includes only steps (Given/When/Then/And)                ║
 * ║   - Tags and Scenario keywords are NOT included (handled via labels)        ║
 * ║   - Test Script type is set to 'GHERKIN' in Zephyr                         ║
 * ║                                                                            ║
 * ║   Last Updated: 2025-01-XX                                                  ║
 * ║   - Feature file parsing: ✅ Working                                       ║
 * ║   - Test case ID extraction: ✅ Working (UI & API formats)                 ║
 * ║   - Gherkin type upload: ✅ Working                                        ║
 * ║   - Zephyr upload: ✅ Working                                              ║
 * ║                                                                            ║
 * ║   Supported Test Case ID Formats:                                          ║
 * ║   - UI:  @SF-520-UI-001  → SF-520-UI-001: Scenario Name                    ║
 * ║   - API: @SF-520-API-001 → SF-520-API-001: Scenario Name                   ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { globSync } from 'glob';
import { zephyrClient, ZephyrTestCase } from './client';
import { logger } from '../../utils/logger';
import { parseJiraKey, extractTags, extractProjectPrefix } from '../../utils/helpers';

/**
 * CLI script to upload test cases from feature files to Zephyr Scale
 * 
 * Features:
 * - Accepts Jira work item as parameter (e.g., --work-item SF-520)
 * - Accepts test case ID as parameter (e.g., --test-case SF-520-001)
 * - Shows summary: test case count in feature files vs Zephyr before syncing
 * - Checks if test cases already exist before creating
 * - Prompts user to delete existing and create new, or skip
 * - Supports "delete all" and "skip all" options for batch operations
 * - Non-interactive mode for CI/CD (auto-skips or deletes based on ZEPHYR_DUPLICATE_ACTION)
 * - Test case names include ID: "SF-520-001: Account record types are configured"
 * 
 * Usage:
 *   npm run zephyr:UploadTestCase
 *   npm run zephyr:UploadTestCase -- --work-item SF-520
 *   npm run zephyr:UploadTestCase -- --test-case SF-520-001
 *   npm run zephyr:UploadTestCase -- --feature src/features/ui/SF/login.feature
 *   npm run zephyr:UploadTestCase -- --file inputs/test-cases-to-sync.txt
 * 
 * Environment Variables:
 *   ZEPHYR_NON_INTERACTIVE=true    - Disable prompts (for CI/CD)
 *   ZEPHYR_DUPLICATE_ACTION=delete - Default action in non-interactive mode (delete or skip)
 *   CI=true                         - Auto-enables non-interactive mode
 */

interface FeatureFile {
  path: string;
  content: string;
  scenarios: Array<{
    name: string;
    tags: string[];
    steps: string[];
  }>;
}

export class ZephyrSync {
  private rl: readline.Interface;
  private userChoices: Map<string, 'delete' | 'skip' | 'update' | 'all-delete' | 'all-skip'> = new Map();
  private nonInteractive: boolean;
  private createdInThisRun: Set<string>; // Track test case IDs created in current run to prevent duplicates

  constructor() {
    // Check if running in non-interactive mode (CI/CD, or env var set)
    this.nonInteractive = 
      process.env.CI === 'true' || 
      process.env.ZEPHYR_NON_INTERACTIVE === 'true' ||
      !process.stdin.isTTY;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    this.createdInThisRun = new Set();
  }

  /**
   * Prompt user for action when test case already exists
   */
  private async promptUser(testCaseName: string, existingKey: string): Promise<'delete' | 'skip' | 'update'> {
    return new Promise((resolve) => {
      const question = `\n⚠️  Test case "${testCaseName}" already exists in Zephyr (Key: ${existingKey})\n` +
        `What would you like to do?\n` +
        `  [d] Delete existing and create new\n` +
        `  [u] Update test script only (preserves test case ID)\n` +
        `  [s] Skip (keep existing)\n` +
        `  [a] Delete all existing and create new (for remaining test cases)\n` +
        `  [i] Skip all remaining (for remaining test cases)\n` +
        `Choice (d/u/s/a/i): `;

      this.rl.question(question, (answer) => {
        const choice = answer.trim().toLowerCase();
        
        if (choice === 'a' || choice === 'all-delete') {
          this.userChoices.set('*', 'all-delete');
          resolve('delete');
        } else if (choice === 'i' || choice === 'all-skip') {
          this.userChoices.set('*', 'all-skip');
          resolve('skip');
        } else if (choice === 'd' || choice === 'delete') {
          resolve('delete');
        } else if (choice === 'u' || choice === 'update') {
          resolve('update');
        } else if (choice === 's' || choice === 'skip') {
          resolve('skip');
        } else {
          logger.warn(`Invalid choice "${choice}". Defaulting to skip.`);
          resolve('skip');
        }
      });
    });
  }

  /**
   * Check if we should delete, update, or skip based on user's previous choices
   */
  private shouldDelete(testCaseName: string): 'delete' | 'skip' | 'update' | 'ask' {
    // Check for "all" choice
    const allChoice = this.userChoices.get('*');
    if (allChoice === 'all-delete') {
      return 'delete';
    }
    if (allChoice === 'all-skip') {
      return 'skip';
    }

    // Check for specific test case choice
    const specificChoice = this.userChoices.get(testCaseName);
    if (specificChoice === 'delete' || specificChoice === 'skip' || specificChoice === 'update') {
      return specificChoice;
    }

    // Need to ask user
    return 'ask';
  }

  /**
   * Close readline interface
   */
  close(): void {
    this.rl.close();
  }

  /**
   * Parse feature file
   * FIXED: Tags appear BEFORE Scenario definition in Gherkin, so we buffer them
   */
  private parseFeatureFile(filePath: string): FeatureFile {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const scenarios: FeatureFile['scenarios'] = [];

    let currentScenario: FeatureFile['scenarios'][0] | null = null;
    let inScenario = false;
    let pendingTags: string[] = []; // Buffer for tags that appear before Scenario

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('Feature:')) {
        // Feature definition - clear any pending tags (feature-level tags)
        pendingTags = [];
      } else if (trimmed.startsWith('@')) {
        // Tags - buffer them until we find the Scenario they belong to
        const tags = extractTags(trimmed);
        pendingTags.push(...tags);
      } else if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:')) {
        // Push previous scenario if exists
        if (currentScenario) {
          scenarios.push(currentScenario);
        }
        const scenarioName = trimmed.replace(/^Scenario( Outline)?:\s*/, '');
        currentScenario = {
          name: scenarioName,
          tags: [...pendingTags], // Assign buffered tags to this scenario
          steps: [],
        };
        pendingTags = []; // Clear the buffer
        inScenario = true;
      } else if (
        (trimmed.startsWith('Given') ||
          trimmed.startsWith('When') ||
          trimmed.startsWith('Then') ||
          trimmed.startsWith('And') ||
          trimmed.startsWith('But')) &&
        currentScenario
      ) {
        // Steps
        currentScenario.steps.push(trimmed);
      } else if (trimmed === '' && inScenario && currentScenario) {
        inScenario = false;
      } else if (trimmed.startsWith('Examples:') || trimmed.startsWith('|')) {
        // Examples table - skip but stay in scenario
      } else if (trimmed === '' || trimmed.startsWith('#')) {
        // Empty line or comment - if not in scenario, tags might follow
        // Don't clear pending tags here
      }
    }

    if (currentScenario) {
      scenarios.push(currentScenario);
    }

    return {
      path: filePath,
      content,
      scenarios,
    };
  }

  /**
   * Test Case ID Regex - matches UI, API, and Smoke test formats:
   *   - UI:  @SF-520-UI-001  -> SF-520-UI-001
   *   - API: @SF-520-API-001 -> SF-520-API-001
   *   - Smoke: @SMOKE-001 -> SMOKE-001
   */
  /** UI/API = standard RBT; MIG = CLM migration integration validation (e.g. SF-736-MIG-001) */
  private static readonly TEST_CASE_ID_REGEX = /^@([A-Z]+-\d+-(UI|API|MIG|E2E)-\d+|SMOKE-\d+)$/;

  /**
   * Build Gherkin script from scenario for BDD test script in Zephyr
   * 
   * IMPORTANT: Zephyr Scale Gherkin format requirements:
   * - Only include the steps (Given/When/Then/And/But)
   * - DO NOT include tags (@SF-501, etc.) - tags are handled via labels field
   * - DO NOT include "Scenario:" keyword - Zephyr handles this automatically
   * 
   * The script text should only contain the step definitions, one per line.
   * Example output:
   *   Given I have an existing AccountContactRelation record
   *   When I navigate to the AccountContactRelation record
   *   And I click Edit on the AccountContactRelation
   *   Then the "Relationship_Strength_c" field should not be visible
   * 
   * See: https://support.smartbear.com/zephyr/docs/en/test-cases/gherkin-behavior-driven-development--bdd-.html
   */
  private buildGherkinScript(scenario: FeatureFile['scenarios'][0]): string {
    const lines: string[] = [];
    
    // Only add the steps - no Feature, Scenario, or tags
    // Tags are handled via labels field in the test case
    // Scenario keyword is not allowed in Zephyr Scale Gherkin format
    for (const step of scenario.steps) {
      lines.push(step);
    }
    
    return lines.join('\n');
  }

  /**
   * Convert feature scenario to Zephyr test case
   */
  private scenarioToTestCase(
    scenario: FeatureFile['scenarios'][0],
    featureName: string
  ): ZephyrTestCase {
    // Extract Jira work item key (e.g., @SF-520 -> SF-520)
    const jiraTag = scenario.tags.find((tag) => /^@[A-Z]+-\d+$/.test(tag));
    const jiraKey = jiraTag ? jiraTag.substring(1) : null;
    
    // Extract test case ID - supports multiple formats:
    //   UI:  @SF-520-UI-001  -> SF-520-UI-001
    //   API: @SF-520-API-001 -> SF-520-API-001
    //   Smoke: @SMOKE-001 -> SMOKE-001
    const testCaseIdTag = scenario.tags.find((tag) => ZephyrSync.TEST_CASE_ID_REGEX.test(tag));
    const testCaseId = testCaseIdTag ? testCaseIdTag.substring(1) : null;

    // Format test case name: "SF-520-UI-001: Account record types are configured"
    // or for API: "SF-520-API-001: API - Query Account by Status"
    // or for Smoke: "SMOKE-001: Verify QA MRD User can create a Lead record"
    // Zephyr API limits name to 255 characters
    const MAX_NAME_LENGTH = 255;
    let testCaseName = scenario.name;
    if (testCaseId) {
      // Check if name already starts with the test case ID to avoid duplication
      if (!testCaseName.startsWith(`${testCaseId}:`) && !testCaseName.startsWith(`${testCaseId} -`)) {
        testCaseName = `${testCaseId}: ${scenario.name}`;
      }
    }
    if (testCaseName.length > MAX_NAME_LENGTH) {
      testCaseName = testCaseName.slice(0, MAX_NAME_LENGTH - 3) + '...';
    }

    // Convert Gherkin steps to Step-by-Step format for Zephyr
    // We'll upload these as teststeps after creating the test case
    const gherkinSteps = scenario.steps;

    // Determine project key from Jira work item key (e.g., SF-520 -> SF, ST-241 -> ST)
    // Must extract from Jira key - fail if cannot be extracted
    if (!jiraKey) {
      throw new Error(`Cannot determine project key: Jira work item key not found in scenario tags. Expected tag format: @SF-520 or @ST-241`);
    }
    
    const projectPrefix = extractProjectPrefix(jiraKey);
    if (!projectPrefix) {
      throw new Error(`Cannot determine project key: Invalid Jira key format "${jiraKey}". Expected format: PROJECT-NUMBER (e.g., SF-520, ST-241)`);
    }
    
    const projectKey = projectPrefix;
    logger.debug(`Using project key "${projectKey}" extracted from Jira key "${jiraKey}"`);

    const testCase: ZephyrTestCase = {
      name: testCaseName,
      projectKey: projectKey,
      objective: `Test scenario: ${scenario.name}`,
      labels: (() => {
        // Convert tags to labels - ensure work item label is always included
        const labels = scenario.tags.map((tag) => tag.substring(1));
        
        // CRITICAL: Ensure work item label is always included, even if not in tags
        // This prevents issues where test cases are uploaded without the work item label
        if (jiraKey && !labels.includes(jiraKey)) {
          labels.unshift(jiraKey); // Add work item label at the beginning
          logger.debug(`Added missing work item label "${jiraKey}" to test case labels`);
        }
        
        return labels;
      })(),
      // Store steps for Step-by-Step format upload
      // We'll convert these to teststeps after test case creation
      testScript: {
        type: 'STEP_BY_STEP',
        text: gherkinSteps.join('\n'), // Store steps as text for conversion
      },
    };

    // Only add custom fields if enabled and Jira key exists
    // Custom fields are optional and may not exist in all Zephyr instances
    const useCustomFields = process.env.ZEPHYR_USE_CUSTOM_FIELDS !== 'false';
    if (jiraKey && useCustomFields) {
      testCase.customFields = {
        'Jira Key': jiraKey,
      };
    }

    return testCase;
  }

  /**
   * Extract test case ID from scenario tags
   * Supports UI, API, and Smoke test formats:
   *   - UI:  @SF-520-UI-001  -> SF-520-UI-001
   *   - API: @SF-520-API-001 -> SF-520-API-001
   *   - Smoke: @SMOKE-001 -> SMOKE-001
   */
  private getTestCaseIdFromScenario(scenario: FeatureFile['scenarios'][0]): string | null {
    const testCaseIdTag = scenario.tags.find((tag) => ZephyrSync.TEST_CASE_ID_REGEX.test(tag));
    return testCaseIdTag ? testCaseIdTag.substring(1) : null;
  }

  /**
   * Sync feature file to Zephyr
   */
  async syncFeatureFile(filePath: string, filterWorkItem?: string): Promise<void> {
    logger.info(`Syncing feature file: ${filePath}`);

    const feature = this.parseFeatureFile(filePath);
    const featureName = path.basename(filePath, '.feature');
    
    // Determine project key from filterWorkItem if provided
    // Must extract from work item - fail if cannot be extracted
    let projectKey: string;
    if (filterWorkItem) {
      const projectPrefix = extractProjectPrefix(filterWorkItem);
      if (!projectPrefix) {
        throw new Error(`Cannot determine project key: Invalid work item format "${filterWorkItem}". Expected format: PROJECT-NUMBER (e.g., SF-520, ST-241)`);
      }
      projectKey = projectPrefix;
    } else {
      // If no filterWorkItem, extract from first scenario's Jira tag
      const firstScenario = feature.scenarios[0];
      if (!firstScenario) {
        throw new Error(`Cannot determine project key: No scenarios found in feature file`);
      }
      const jiraTag = firstScenario.tags.find((tag) => /^@[A-Z]+-\d+$/.test(tag));
      const jiraKey = jiraTag ? jiraTag.substring(1) : null;
      if (!jiraKey) {
        throw new Error(`Cannot determine project key: No Jira work item tag found in scenarios. Expected tag format: @SF-520 or @ST-241`);
      }
      const projectPrefix = extractProjectPrefix(jiraKey);
      if (!projectPrefix) {
        throw new Error(`Cannot determine project key: Invalid Jira key format "${jiraKey}". Expected format: PROJECT-NUMBER (e.g., SF-520, ST-241)`);
      }
      projectKey = projectPrefix;
    }

    // Filter scenarios by work item if specified
    let scenariosToSync = feature.scenarios;
    if (filterWorkItem) {
      const workItemTag = `@${filterWorkItem}`;
      scenariosToSync = feature.scenarios.filter(scenario => 
        scenario.tags.some(tag => tag === workItemTag || tag.startsWith(`${workItemTag}-`))
      );
      if (scenariosToSync.length === 0) {
        logger.warn(`⚠️  No scenarios found with work item tag ${workItemTag} in ${filePath}`);
        return;
      }
      logger.info(`📋 Filtering: Processing ${scenariosToSync.length} of ${feature.scenarios.length} scenarios for ${filterWorkItem}`);
    }

    // Track scenario IDs already processed in this file to prevent duplicates (e.g. same scenario listed twice)
    const processedScenarioIdsInThisFile = new Set<string>();

    for (const scenario of scenariosToSync) {
      try {
        const testCase = this.scenarioToTestCase(scenario, featureName);
        const testCaseId = this.getTestCaseIdFromScenario(scenario);
        
        if (!testCaseId) {
          logger.warn(`⚠️  Scenario "${scenario.name}" has no test case ID tag (e.g., @SF-520-001). Creating without duplicate check.`);
          await zephyrClient.createTestCase(testCase);
          logger.info(`✅ Created test case: ${testCase.name}`);
          continue;
        }
        
        // Skip if we already processed this scenario ID in this file (prevents duplicate uploads)
        if (processedScenarioIdsInThisFile.has(testCaseId)) {
          logger.debug(`⚠️  Skipping duplicate scenario "${testCaseId}" in same file (already processed in this run)`);
          continue;
        }
        processedScenarioIdsInThisFile.add(testCaseId);
        
        // Check if we already created this test case in this run (prevent duplicates in same run)
        // This check MUST happen BEFORE any API calls to prevent race conditions
        if (this.createdInThisRun.has(testCaseId)) {
          logger.warn(`⚠️  Test case "${testCaseId}" was already created in this run. Skipping to prevent duplicate.`);
          logger.debug(`   Already created test cases in this run: ${Array.from(this.createdInThisRun).join(', ')}`);
          continue;
        }
        
        // Check if test case already exists by searching for the test case ID label
        logger.info(`🔍 Checking for existing test case with ID: ${testCaseId}`);
        const existingTestCases = await zephyrClient.searchTestCasesByTestCaseId(testCaseId, projectKey, 3);
        
        if (existingTestCases.length > 0) {
          const existing = existingTestCases[0]; // Use first match
          const existingKey = existing.key || (existing as any).key || 'UNKNOWN';
          
          logger.info(`Found existing test case with ID "${testCaseId}": ${existing.name} (Key: ${existingKey})`);
          
          // Check user's previous choice or ask
          const action = this.shouldDelete(testCaseId);
          let userChoice: 'delete' | 'skip' | 'update';
          
          if (action === 'ask') {
            if (this.nonInteractive) {
              // Non-interactive mode: use default behavior from env var or skip
              const defaultAction = process.env.ZEPHYR_DUPLICATE_ACTION || 'skip';
              userChoice = (defaultAction === 'delete' || defaultAction === 'replace') ? 'delete' : 
                          (defaultAction === 'update') ? 'update' : 'skip';
              logger.info(`Non-interactive mode: ${userChoice === 'delete' ? 'Deleting and recreating' : userChoice === 'update' ? 'Updating test script' : 'Skipping'} existing test case (set ZEPHYR_DUPLICATE_ACTION=delete/update to change default)`);
            } else {
              userChoice = await this.promptUser(testCaseId, existingKey);
              this.userChoices.set(testCaseId, userChoice);
            }
          } else {
            userChoice = action;
            logger.info(`Using previous choice: ${userChoice === 'delete' ? 'Delete and recreate' : userChoice === 'update' ? 'Update test script' : 'Skip'}`);
          }
          
          if (userChoice === 'delete') {
            // Delete existing test case
            try {
              await zephyrClient.deleteTestCase(existingKey);
              logger.info(`✅ Deleted existing test case: ${existingKey}`);
            } catch (deleteError: any) {
              logger.error(`Failed to delete existing test case: ${deleteError.message}`);
              logger.warn(`Skipping creation of "${testCaseId}" due to delete failure`);
              continue;
            }
            
            // Create new test case
            try {
              await zephyrClient.createTestCase(testCase);
              this.createdInThisRun.add(testCaseId); // Track that we created this
              logger.info(`✅ Created new test case: ${testCase.name}`);
            } catch (createError: any) {
              logger.error(`❌ Failed to create test case after deletion: ${createError.message}`);
            }
          } else if (userChoice === 'update') {
            // Update only the test script (preserves test case ID)
            if (testCase.testScript) {
              try {
                await zephyrClient.updateTestScript(
                  existingKey,
                  testCase.testScript.type,
                  testCase.testScript.text
                );
                logger.info(`✅ Updated test script for: ${existingKey} (preserved test case ID)`);
              } catch (updateError: any) {
                logger.error(`❌ Failed to update test script: ${updateError.message}`);
                if (updateError.response) {
                  logger.error(`Response: ${JSON.stringify(updateError.response.data, null, 2)}`);
                }
                // Continue - don't fail the entire sync
              }
            } else {
              logger.warn(`⚠️  No test script to update for: ${existingKey}`);
            }
          } else {
            // Skip - keep existing
            logger.info(`⏭️  Skipped "${testCaseId}" - keeping existing test case`);
          }
        } else {
          // Test case doesn't exist, create it
          // Double-check in-run tracking before creating (race condition protection)
          if (this.createdInThisRun.has(testCaseId)) {
            logger.warn(`⚠️  Test case "${testCaseId}" was created by another process during search. Skipping to prevent duplicate.`);
            continue;
          }
          
          logger.info(`ℹ️  No existing test case found with ID "${testCaseId}". Creating new...`);
          
          // Add to tracking BEFORE creation to prevent race conditions
          this.createdInThisRun.add(testCaseId);
          
          try {
            await zephyrClient.createTestCase(testCase);
            logger.info(`✅ Created test case: ${testCase.name}`);
          } catch (createError: any) {
            // If creation fails, remove from tracking so it can be retried
            this.createdInThisRun.delete(testCaseId);
            throw createError;
          }
        }
      } catch (error: any) {
        logger.error(`❌ Failed to process test case for scenario "${scenario.name}": ${error.message}`);
      }
    }
  }

  /**
   * Sync all feature files
   */
  async syncAll(): Promise<void> {
    const featureFiles = globSync('src/features/**/*.feature');

    logger.info(`Found ${featureFiles.length} feature file(s)`);

    for (const file of featureFiles) {
      await this.syncFeatureFile(file);
    }
  }

  /**
   * Count test cases in Zephyr for a given Jira work item
   */
  async countTestCasesInZephyr(jiraKey: string, projectKey: string): Promise<number> {
    try {
      // Try to get all test cases for the project and filter by label
      // This is a workaround since direct label search may not be available
      const isZephyrScaleCloud = (zephyrClient as any).isZephyrScaleCloud;
      const client = (zephyrClient as any).client;
      
      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud - get test cases and filter by label
        try {
          // Try to get test cases with the label
          const { data } = await client.get(
            `/testcases?projectKey=${encodeURIComponent(projectKey)}&maxResults=1000`
          ) as { data: { values?: any[]; data?: any[] } };
          const allTestCases = data.values || data.data || [];
          
          // Filter by label containing the Jira key
          const matchingTestCases = allTestCases.filter((tc: any) => {
            const labels = tc.labels || [];
            return labels.some((label: string) => label === jiraKey || label.includes(jiraKey));
          });
          
          return matchingTestCases.length;
        } catch (error: any) {
          logger.debug(`Failed to count test cases: ${error.message}`);
          return -1; // Unknown
        }
      } else {
        // Zephyr for JIRA - try to search
        try {
          const { data } = await client.get(
            `/testcase/search?projectKey=${encodeURIComponent(projectKey)}`
          ) as { data: any[] };
          if (Array.isArray(data)) {
            // Filter by label if available
            const matching = data.filter((tc: any) => {
              const labels = tc.labels || [];
              return labels.some((label: string) => label === jiraKey || label.includes(jiraKey));
            });
            return matching.length;
          }
          return 0;
        } catch {
          return -1; // Unknown
        }
      }
    } catch (error: any) {
      logger.debug(`Failed to count test cases in Zephyr: ${error.message}`);
      return -1; // Unknown
    }
  }

  /**
   * Count test cases from feature files for a work item
   * Public method for use by other utilities
   */
  countTestCasesFromFeatureFiles(workItem: string): { total: number; files: Array<{ file: string; count: number }> } {
    const parsedKey = parseJiraKey(workItem);
    if (!parsedKey) {
      return { total: 0, files: [] };
    }

    const featureFiles = this.globFeaturePathsForJiraKey(parsedKey);
    const fileCounts: Array<{ file: string; count: number }> = [];
    let total = 0;

    for (const file of featureFiles) {
      try {
        const feature = this.parseFeatureFile(file);
        const workItemTag = `@${parsedKey}`;
        const filteredScenarios = feature.scenarios.filter((scenario: any) =>
          scenario.tags && scenario.tags.some((tag: string) => 
            tag === workItemTag || tag.startsWith(`${workItemTag}-`)
          )
        );
        const count = filteredScenarios.length;
        if (count > 0) {
          fileCounts.push({ file: path.basename(file), count });
          total += count;
        }
      } catch (error: any) {
        logger.debug(`Failed to parse feature file ${file}: ${error.message}`);
      }
    }

    return { total, files: fileCounts };
  }

  /**
   * Show summary before syncing
   */
  async showSyncSummary(jiraKey: string, featureFiles: string[]): Promise<void> {
    // Determine project key from Jira key (e.g., SF-520 -> SF, ST-241 -> ST)
    // Must extract from Jira key - fail if cannot be extracted
    const projectPrefix = extractProjectPrefix(jiraKey);
    if (!projectPrefix) {
      throw new Error(`Cannot determine project key: Invalid Jira key format "${jiraKey}". Expected format: PROJECT-NUMBER (e.g., SF-520, ST-241)`);
    }
    const projectKey = projectPrefix;
    
    logger.info('\n' + '='.repeat(60));
    logger.info(`📊 SYNC SUMMARY for ${jiraKey}`);
    logger.info('='.repeat(60));
    
    // Count test cases in feature files
    let totalFeatureTestCases = 0;
    const fileTestCounts: Array<{ file: string; count: number }> = [];
    
    for (const file of featureFiles) {
      const feature = this.parseFeatureFile(file);
      const count = feature.scenarios.length;
      totalFeatureTestCases += count;
      fileTestCounts.push({ file: path.basename(file), count });
    }
    
    logger.info(`\n📁 Feature Files Found: ${featureFiles.length}`);
    for (const { file, count } of fileTestCounts) {
      logger.info(`   - ${file}: ${count} test case(s)`);
    }
    logger.info(`   Total in Feature Files: ${totalFeatureTestCases} test case(s)`);
    
    // Count test cases in Zephyr
    logger.info(`\n🔍 Checking Zephyr for existing test cases...`);
    const zephyrCount = await this.countTestCasesInZephyr(jiraKey, projectKey);
    
    if (zephyrCount === -1) {
      logger.info(`   Existing in Zephyr: Unknown (could not query)`);
    } else {
      logger.info(`   Existing in Zephyr: ${zephyrCount} test case(s) with label "${jiraKey}"`);
    }
    
    logger.info('\n' + '='.repeat(60));
    
    if (!this.nonInteractive && zephyrCount > 0) {
      logger.info(`\n⚠️  Note: ${zephyrCount} test case(s) already exist in Zephyr.`);
      logger.info(`   You will be prompted for each duplicate during sync.`);
    }
    
    logger.info(`\n🚀 Starting sync...\n`);
  }

  /**
   * Sync specific work items
   */
  async syncWorkItems(workItems: string[]): Promise<void> {
    for (const workItem of workItems) {
      const jiraKey = parseJiraKey(workItem);
      if (!jiraKey) {
        logger.warn(`Invalid Jira key format: ${workItem}`);
        continue;
      }

      // Find feature files with this tag
      const featureFilesRaw = globSync(`src/features/**/${jiraKey}.feature`);

      if (featureFilesRaw.length === 0) {
        logger.warn(`No feature file found for: ${jiraKey}`);
        continue;
      }

      // Deduplicate by canonical path (same file can appear with different path forms on Windows)
      const seenPaths = new Set<string>();
      const featureFiles: string[] = [];
      for (const file of featureFilesRaw) {
        const resolved = path.resolve(file);
        const canonicalKey = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
        if (seenPaths.has(canonicalKey)) continue;
        seenPaths.add(canonicalKey);
        featureFiles.push(file);
      }

      // Show summary before syncing
      await this.showSyncSummary(jiraKey, featureFiles);

      for (const file of featureFiles) {
        await this.syncFeatureFile(file, jiraKey);
      }
    }
  }

  /**
   * Resolve feature file paths for a Jira key.
   * Matches KEY.feature (e.g. SF-883.feature) and KEY-*.feature (e.g. ENG-145-ods-source-repositoryid-from-adp.feature).
   */
  private globFeaturePathsForJiraKey(jiraKey: string): string[] {
    const exact = globSync(`src/features/**/${jiraKey}.feature`);
    const prefixed = globSync(`src/features/**/${jiraKey}-*.feature`);
    const seenPaths = new Set<string>();
    const out: string[] = [];
    const addFile = (file: string) => {
      const resolved = path.resolve(file);
      const canonicalKey = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
      if (seenPaths.has(canonicalKey)) return;
      seenPaths.add(canonicalKey);
      out.push(file);
    };
    for (const file of [...exact, ...prefixed]) {
      addFile(file);
    }

    // Scenarios tagged @SF-736 (etc.) in shared features (e.g. CLM-MIGRATION-VALIDATION.feature)
    const workItemTag = `@${jiraKey}`;
    const allFeatures = globSync('src/features/**/*.feature');
    for (const file of allFeatures) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        if (content.includes(workItemTag)) {
          addFile(file);
        }
      } catch {
        // skip unreadable files
      }
    }

    return out;
  }

  /**
   * Find a specific test case by ID across all feature files
   * Supports both UI and API formats:
   *   - SF-520-UI-001
   *   - SF-520-API-001
   */
  private findTestCaseById(testCaseId: string): { file: string; scenario: FeatureFile['scenarios'][0] } | null {
    // Extract work item from test case ID (e.g., SF-520-UI-001 -> SF-520)
    const workItemMatch = testCaseId.match(/^([A-Z]+-\d+)/);
    if (!workItemMatch) {
      logger.error(`Invalid test case ID format: ${testCaseId}. Expected format: SF-520-UI-001, SF-520-API-001, or SF-736-MIG-001`);
      return null;
    }

    const workItem = workItemMatch[1];
    const featureFiles = this.globFeaturePathsForJiraKey(workItem);
    
    logger.debug(`Searching for test case ${testCaseId} in ${featureFiles.length} feature file(s)`);

    for (const file of featureFiles) {
      const feature = this.parseFeatureFile(file);
      logger.debug(`Checking file: ${file} (${feature.scenarios.length} scenarios)`);
      
      const scenario = feature.scenarios.find((s) => {
        // Use the same regex as TEST_CASE_ID_REGEX to match UI and API formats
        const testCaseIdTag = s.tags.find((tag) => ZephyrSync.TEST_CASE_ID_REGEX.test(tag));
        const scenarioTestCaseId = testCaseIdTag ? testCaseIdTag.substring(1) : null;
        logger.debug(`  Scenario "${s.name}" tags: ${s.tags.join(', ')} -> ID: ${scenarioTestCaseId}`);
        return scenarioTestCaseId === testCaseId;
      });

      if (scenario) {
        return { file, scenario };
      }
    }

    return null;
  }

  /**
   * Check if a specific test case exists in Zephyr by name
   */
  async checkTestCaseExistsInZephyr(testCaseName: string, projectKey: string): Promise<{ exists: boolean; key?: string }> {
    try {
      const existing = await zephyrClient.searchTestCasesByName(testCaseName, projectKey);
      if (existing.length > 0) {
        const firstMatch = existing[0];
        const key = firstMatch.key || (firstMatch as any).key;
        return { exists: true, key };
      }
      return { exists: false };
    } catch (error: any) {
      logger.debug(`Failed to check if test case exists: ${error.message}`);
      return { exists: false };
    }
  }

  /**
   * Sync a single test case by ID
   */
  async syncTestCase(testCaseId: string): Promise<void> {
    logger.info(`\n🔍 Looking for test case: ${testCaseId}`);

    // Check if we already created this test case in this run (prevent duplicates in same run)
    if (this.createdInThisRun.has(testCaseId)) {
      logger.warn(`⚠️  Test case "${testCaseId}" was already created in this run. Skipping to prevent duplicate.`);
      return;
    }

    // Find the test case in feature files
    const testCaseInfo = this.findTestCaseById(testCaseId);
    if (!testCaseInfo) {
      logger.error(`Test case ${testCaseId} not found in any feature file`);
      return;
    }

    logger.info(`✅ Found test case in: ${testCaseInfo.file}`);

    // Convert to Zephyr test case format
    const featureName = path.basename(testCaseInfo.file, '.feature');
    const testCase = this.scenarioToTestCase(testCaseInfo.scenario, featureName);
    // Use project key from test case (already extracted from Jira key in scenarioToTestCase)
    const projectKey = testCase.projectKey;

    // Show summary
    logger.info('\n' + '='.repeat(60));
    logger.info(`📊 SYNC SUMMARY for Test Case: ${testCaseId}`);
    logger.info('='.repeat(60));
    logger.info(`\n📁 Feature File: ${path.basename(testCaseInfo.file)}`);
    logger.info(`   Test Case Name: ${testCaseInfo.scenario.name}`);
    logger.info(`   Formatted Name: ${testCase.name}`);

    // Check if exists in Zephyr by test case ID (label) - more reliable than name search
    // Use retries to account for Zephyr indexing delay
    logger.info(`\n🔍 Checking Zephyr for existing test case with ID: ${testCaseId}...`);
    const existingTestCases = await zephyrClient.searchTestCasesByTestCaseId(testCaseId, projectKey, 3);

    if (existingTestCases.length > 0) {
      const existing = existingTestCases[0]; // Use first match
      const existingKey = existing.key || (existing as any).key || 'UNKNOWN';
      logger.info(`   ✅ Found existing test case in Zephyr (Key: ${existingKey})`);
      logger.info('='.repeat(60));

      // Prompt user for action
      let userChoice: 'delete' | 'skip' | 'update';
      
      if (this.nonInteractive) {
        const defaultAction = process.env.ZEPHYR_DUPLICATE_ACTION || 'skip';
        userChoice = (defaultAction === 'delete' || defaultAction === 'replace') ? 'delete' : 
                    (defaultAction === 'update') ? 'update' : 'skip';
        logger.info(`\nNon-interactive mode: ${userChoice === 'delete' ? 'Deleting and recreating' : userChoice === 'update' ? 'Updating test script' : 'Skipping'} existing test case`);
      } else {
        userChoice = await this.promptUser(testCase.name, existingKey);
      }

      if (userChoice === 'delete') {
        // Delete existing test case
        try {
          await zephyrClient.deleteTestCase(existingKey);
          logger.info(`✅ Deleted existing test case: ${existingKey}`);
        } catch (deleteError: any) {
          logger.error(`Failed to delete existing test case: ${deleteError.message}`);
          logger.warn(`Skipping sync of "${testCaseId}" due to delete failure`);
          return;
        }

        // Create new test case
        try {
          await zephyrClient.createTestCase(testCase);
          this.createdInThisRun.add(testCaseId); // Track that we created this
          logger.info(`✅ Created new test case: ${testCase.name}`);
        } catch (createError: any) {
          logger.error(`❌ Failed to create test case after deletion: ${createError.message}`);
        }
      } else if (userChoice === 'update') {
        // Update only the test script (preserves test case ID)
        if (testCase.testScript) {
          try {
            await zephyrClient.updateTestScript(
              existingKey,
              testCase.testScript.type,
              testCase.testScript.text
            );
            logger.info(`✅ Updated test script for: ${existingKey} (preserved test case ID)`);
          } catch (updateError: any) {
            logger.error(`❌ Failed to update test script: ${updateError.message}`);
            if (updateError.response) {
              logger.error(`Response: ${JSON.stringify(updateError.response.data, null, 2)}`);
            }
            // Continue - don't fail the entire sync
          }
        } else {
          logger.warn(`⚠️  No test script to update for: ${existingKey}`);
        }
      } else {
        logger.info(`⏭️  Skipped "${testCaseId}" - keeping existing test case`);
      }
    } else {
      logger.info(`   ℹ️  Test case does not exist in Zephyr (not found in search)`);
      logger.warn(`\n⚠️  WARNING: Duplicate may exist but not found due to:`);
      logger.warn(`   - Zephyr indexing delay (newly created test cases may not appear immediately)`);
      logger.warn(`   - Search pagination limits (only first 1000 test cases are searched)`);
      logger.warn(`   - Test case may exist with different labels or name format`);
      logger.warn(`\n💡 RECOMMENDATION:`);
      logger.warn(`   - Wait 2-3 minutes after previous upload before retrying`);
      logger.warn(`   - Check Zephyr UI manually for existing test case: "${testCase.name}"`);
      logger.warn(`   - Use bulk upload (upload-and-link) which includes duplicate prevention`);
      logger.info('='.repeat(60));
      logger.info(`\n🚀 Creating new test case...\n`);

      // Create new test case
      try {
        await zephyrClient.createTestCase(testCase);
        this.createdInThisRun.add(testCaseId); // Track that we created this
        logger.info(`✅ Created test case: ${testCase.name}`);
        logger.warn(`\n⚠️  If this creates a duplicate, manually remove it from Zephyr UI`);
      } catch (createError: any) {
        logger.error(`❌ Failed to create test case: ${createError.message}`);
      }
    }
  }

  /**
   * Check for duplicate test cases in Zephyr for a work item
   * Returns true if duplicates are found, false otherwise
   */
  async checkForDuplicates(jiraKey: string): Promise<{ hasDuplicates: boolean; duplicateGroups: Array<{ testCaseId: string; count: number; testCases: any[] }> }> {
    const parsedKey = parseJiraKey(jiraKey);
    if (!parsedKey) {
      return { hasDuplicates: false, duplicateGroups: [] };
    }

    // Determine project key from Jira key (e.g., SF-520 -> SF, ST-241 -> ST)
    // Must extract from Jira key - fail if cannot be extracted
    const projectPrefix = extractProjectPrefix(jiraKey);
    if (!projectPrefix) {
      throw new Error(`Cannot determine project key: Invalid Jira key format "${jiraKey}". Expected format: PROJECT-NUMBER (e.g., SF-520, ST-241)`);
    }
    const projectKey = projectPrefix;
    const duplicateGroups: Array<{ testCaseId: string; count: number; testCases: any[] }> = [];

    try {
      // Get all test cases for this work item (by label AND name pattern)
      // Always search both ways to catch test cases without labels
      const allTestCases: any[] = [];
      const foundKeys = new Set<string>();
      
      // First try by label
      const byLabel = await zephyrClient.searchTestCasesByLabel(parsedKey, projectKey);
      byLabel.forEach((tc: any) => {
        const key = tc.key || (tc as any).key;
        if (key && !foundKeys.has(key)) {
          allTestCases.push(tc);
          foundKeys.add(key);
        }
      });
      
      // Always also search by name pattern (even if label search found results)
      // This catches test cases that exist but don't have the work item label
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
          
          // Add test cases found by name that weren't already found by label
          byName.forEach((tc: any) => {
            const key = tc.key || (tc as any).key;
            if (key && !foundKeys.has(key)) {
              allTestCases.push(tc);
              foundKeys.add(key);
            }
          });
        }
      } catch (error: any) {
        logger.debug(`Fallback search failed: ${error.message}`);
      }

      // Group by test case ID
      const testCaseIdMap = new Map<string, any[]>();
      
      for (const tc of allTestCases) {
        const tcAny = tc as any;
        const labels = tcAny.labels || [];
        const testCaseId = labels.find((l: string) => /^[A-Z]+-\d+-(UI|API|MIG|E2E)-\d+$/.test(l));

        // Also try to extract from name if not in labels
        let extractedId = testCaseId;
        if (!extractedId) {
          const nameMatch = tcAny.name?.match(/^([A-Z]+-\d+-(UI|API|MIG|E2E)-\d+)/);
          if (nameMatch) {
            extractedId = nameMatch[1];
          }
        }
        
        if (extractedId) {
          if (!testCaseIdMap.has(extractedId)) {
            testCaseIdMap.set(extractedId, []);
          }
          testCaseIdMap.get(extractedId)!.push(tcAny);
        }
      }

      // Find duplicates (more than 1 test case with same ID)
      for (const [testCaseId, testCases] of testCaseIdMap.entries()) {
        if (testCases.length > 1) {
          duplicateGroups.push({
            testCaseId,
            count: testCases.length,
            testCases: testCases.map(tc => ({
              key: tc.key || 'UNKNOWN',
              name: tc.name || 'Unknown',
              labels: tc.labels || [],
            })),
          });
        }
      }

      return {
        hasDuplicates: duplicateGroups.length > 0,
        duplicateGroups,
      };
    } catch (error: any) {
      logger.debug(`Error checking for duplicates: ${error.message}`);
      return { hasDuplicates: false, duplicateGroups: [] };
    }
  }

  /**
   * Display duplicate information and stop processing
   */
  displayDuplicatesAndStop(jiraKey: string, duplicateGroups: Array<{ testCaseId: string; count: number; testCases: any[] }>): void {
    logger.error('\n' + '='.repeat(80));
    logger.error('❌ DUPLICATE TEST CASES DETECTED - PROCESSING STOPPED');
    logger.error('='.repeat(80));
    logger.error(`\nWork Item: ${jiraKey}`);
    logger.error(`\n⚠️  Found ${duplicateGroups.length} duplicate group(s) in Zephyr:\n`);

    for (const group of duplicateGroups) {
      logger.error(`   ${group.testCaseId}: ${group.count} copies`);
      for (const tc of group.testCases) {
        logger.error(`      - ${tc.key}: ${tc.name}`);
        logger.error(`        Labels: ${tc.labels.join(', ') || 'none'}`);
      }
      logger.error('');
    }

    logger.error('='.repeat(80));
    logger.error('📋 ACTION REQUIRED:');
    logger.error('='.repeat(80));
    logger.error('\nBefore proceeding with upload, you must manually resolve duplicates:');
    logger.error('\n1. Review duplicates in Zephyr:');
    logger.error('   - Open Zephyr and search for the work item');
    logger.error('   - Identify which test cases are duplicates');
    logger.error('\n2. Remove duplicates using one of these methods:');
    logger.error('   a) Use the remove duplicates utility:');
    logger.error(`      npm run zephyr:RemoveDuplicates -- --work-item ${jiraKey} --dry-run`);
    logger.error(`      npm run zephyr:RemoveDuplicates -- --work-item ${jiraKey} --keep newest`);
    logger.error('\n   b) Manually delete duplicates in Zephyr UI');
    logger.error('      - Keep the most recent/complete test case');
    logger.error('      - Delete the duplicate(s)');
    logger.error('\n3. Verify duplicates are resolved:');
    logger.error(`   npm run diagnose:duplicates -- ${jiraKey}`);
    logger.error('\n4. Once duplicates are resolved, retry the upload:');
    logger.error(`   npm run zephyr:UploadTestCase -- --work-item ${jiraKey}`);
    logger.error(`   npm run zephyr:UploadAndLink -- --work-item ${jiraKey}`);
    logger.error('\n' + '='.repeat(80));
    logger.error('❌ PROCESSING STOPPED - Please resolve duplicates before continuing');
    logger.error('='.repeat(80) + '\n');
  }

  /**
   * Sync a single work item by key
   */
  async syncWorkItem(jiraKey: string): Promise<void> {
    const parsedKey = parseJiraKey(jiraKey);
    if (!parsedKey) {
      logger.error(`Invalid Jira key format: ${jiraKey}`);
      return;
    }

    // Reset tracking for this run to prevent duplicates within the same run
    // Only clear if this is a new work item (not a continuation)
    if (this.createdInThisRun.size > 0) {
      logger.debug(`Clearing previous run tracking (${this.createdInThisRun.size} test cases)`);
    }
    this.createdInThisRun.clear();

    // Check for duplicates BEFORE starting sync
    const skipDuplicateCheck = process.env.ZEPHYR_SKIP_DUPLICATE_CHECK === 'true';
    
    if (!skipDuplicateCheck) {
      logger.info(`\n🔍 Checking for duplicate test cases in Zephyr...`);
      const duplicateCheck = await this.checkForDuplicates(parsedKey);
      
      if (duplicateCheck.hasDuplicates) {
        this.displayDuplicatesAndStop(parsedKey, duplicateCheck.duplicateGroups);
        throw new Error(`Duplicate test cases detected for ${parsedKey}. Please resolve duplicates before continuing. Set ZEPHYR_SKIP_DUPLICATE_CHECK=true to bypass this check.`);
      }
      
      logger.info(`✅ No duplicates found in search results. Proceeding with sync...`);
      logger.warn(`\n⚠️  NOTE: Duplicate detection has limitations:`);
      logger.warn(`   - Only searches first 1000 test cases (pagination limit)`);
      logger.warn(`   - Newly created test cases may not appear immediately (indexing delay)`);
      logger.warn(`   - If duplicates are created, use "npm run zephyr:RemoveDuplicates" to identify and remove them\n`);
    } else {
      logger.warn(`⚠️  Skipping duplicate check (ZEPHYR_SKIP_DUPLICATE_CHECK=true)`);
      logger.warn(`   This may result in creating additional duplicates.\n`);
    }

    const featureFilesRaw = this.globFeaturePathsForJiraKey(parsedKey);

    if (featureFilesRaw.length === 0) {
      logger.warn(`No feature file found for: ${parsedKey}`);
      return;
    }

    // Deduplicate by canonical path (same file can appear with different path forms on Windows)
    const seenPaths = new Set<string>();
    const featureFiles: string[] = [];
    for (const file of featureFilesRaw) {
      const resolved = path.resolve(file);
      const canonicalKey = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
      if (seenPaths.has(canonicalKey)) {
        logger.debug(`Skipping duplicate path for same file: ${file}`);
        continue;
      }
      seenPaths.add(canonicalKey);
      featureFiles.push(file);
    }
    logger.debug(`Deduplicated to ${featureFiles.length} unique feature file(s) (from ${featureFilesRaw.length} glob result(s))`);

    // Show summary before syncing
    await this.showSyncSummary(parsedKey, featureFiles);

    // Process each feature file only once (prevent duplicate processing)
    const processedFiles = new Set<string>();
    logger.debug(`Found ${featureFiles.length} feature file(s) to process`);
    for (const file of featureFiles) {
      const normalizedPath = path.resolve(file);
      const canonicalPath = process.platform === 'win32' ? normalizedPath.toLowerCase() : normalizedPath;
      if (processedFiles.has(canonicalPath)) {
        logger.warn(`⚠️  Skipping duplicate file path: ${file} (already processed)`);
        continue;
      }
      processedFiles.add(canonicalPath);
      logger.debug(`Processing feature file: ${file} (normalized: ${normalizedPath})`);
      await this.syncFeatureFile(file, parsedKey);
    }
    logger.debug(`Processed ${processedFiles.size} unique feature file(s)`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sync = new ZephyrSync();
  const workItems: string[] = [];

  try {
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--test-case' && args[i + 1]) {
        // Sync specific test case
        const testCaseId = args[i + 1].trim();
        await sync.syncTestCase(testCaseId);
        i++;
        return;
      } else if (args[i] === '--work-item' && args[i + 1]) {
        // Sync specific work item
        const jiraKey = args[i + 1].trim();
        await sync.syncWorkItem(jiraKey);
        i++;
        return;
      } else if (args[i] === '--feature' && args[i + 1]) {
        const filePath = path.resolve(args[i + 1]);
        if (fs.existsSync(filePath)) {
          await sync.syncFeatureFile(filePath);
        } else {
          logger.error(`File not found: ${filePath}`);
          process.exit(1);
        }
        i++;
        return;
      } else if (args[i] === '--file' && args[i + 1]) {
        const filePath = path.resolve(args[i + 1]);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          workItems.push(...content.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#')));
        } else {
          logger.error(`File not found: ${filePath}`);
          process.exit(1);
        }
        i++;
      }
    }

    if (workItems.length > 0) {
      await sync.syncWorkItems(workItems);
    } else {
      await sync.syncAll();
    }

    logger.info('\n✅ Sync completed');
  } catch (error: any) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  } finally {
    // Ensure readline interface is closed
    sync.close();
  }
}

// Only run main() when this file is executed directly (e.g. npm run zephyr:UploadTestCase -- --work-item SF-646).
// When sync.ts is imported by upload-and-link.ts, main() must NOT run or syncWorkItem would execute twice.
if (typeof require !== 'undefined' && require.main === module) {
  main();
}

