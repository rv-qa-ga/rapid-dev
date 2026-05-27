/**
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                            ║
 * ║   ⚠️  WARNING: LOCKED FILE - DO NOT MODIFY WITHOUT APPROVAL ⚠️             ║
 * ║                                                                            ║
 * ║   This file is LOCKED as of 2025-12-02.                                    ║
 * ║   The Zephyr Scale upload functionality is WORKING in this version.        ║
 * ║                                                                            ║
 * ║   BEFORE MAKING ANY CHANGES:                                               ║
 * ║   1. Get explicit approval from the team lead                              ║
 * ║   2. Document the reason for the change                                    ║
 * ║   3. Test the upload functionality after changes                           ║
 * ║   4. Verify test cases are created correctly in Zephyr                     ║
 * ║   5. Verify test steps appear in the Test Script tab                       ║
 * ║                                                                            ║
 * ║   Last Verified Working: 2025-12-02                                        ║
 * ║   - Test case creation: ✅ Working                                         ║
 * ║   - Test steps upload (Step-by-Step format): ✅ Working                    ║
 * ║   - Labels sync: ✅ Working                                                ║
 * ║                                                                            ║
 * ║   NOTE: BDD-Gherkin format is NOT supported by Zephyr Scale Cloud API.     ║
 * ║   Gherkin steps are converted to Step-by-Step format automatically.        ║
 * ║                                                                            ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 */

import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { extractProjectPrefix } from '../../utils/helpers';

/** Escape for use inside RegExp constructors. */
function escapeRegExpSegment(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Resolve Zephyr Scale **name** to automation id (e.g. `PP-392-UI-001`).
 * Jira/Zephyr UI often shows `PP-392-UI-001: Verify…` or `PP-392-UI-001 Verify…` (space, no colon).
 * Returns matches in priority order (colon > space-after-id > exact line > word-boundary in name).
 */
export function filterTestCasesByAutomationIdName(
  allTestCases: any[],
  testCaseId: string,
): any[] {
  const esc = escapeRegExpSegment(testCaseId);
  const colon = new RegExp(`^${esc}:`);
  const spaceAfter = new RegExp(`^${esc}\\s`);
  const exact = new RegExp(`^${esc}$`);
  const word = new RegExp(`\\b${esc}\\b`);

  let m = allTestCases.filter((tc: any) => colon.test(tc.name || ''));
  if (m.length > 0) return m;
  m = allTestCases.filter((tc: any) => spaceAfter.test(tc.name || ''));
  if (m.length > 0) return m;
  m = allTestCases.filter((tc: any) => exact.test(tc.name || ''));
  if (m.length > 0) return m;

  const byWord = allTestCases.filter((tc: any) => word.test(tc.name || ''));
  if (byWord.length === 0) return [];
  if (byWord.length === 1) return byWord;
  const starts = byWord.filter((tc: any) => (tc.name || '').startsWith(testCaseId));
  if (starts.length === 1) return starts;
  if (starts.length > 1) {
    logger.debug(
      `Multiple test cases start with "${testCaseId}" in name (${starts.length}); using first by key.`,
    );
    return [starts.sort((a: any, b: any) => (a.key || '').localeCompare(b.key || ''))[0]];
  }
  logger.debug(
    `Ambiguous word-boundary name match for "${testCaseId}" (${byWord.length} candidates); using first by key.`,
  );
  return [byWord.sort((a: any, b: any) => (a.key || '').localeCompare(b.key || ''))[0]];
}

export interface ZephyrTestCase {
  key?: string;
  name: string;
  projectKey: string;
  folder?: string;
  objective?: string;
  precondition?: string;
  labels?: string[];
  customFields?: Record<string, any>;
  /** Test script for BDD-Gherkin format */
  testScript?: {
    type: 'BDD' | 'GHERKIN' | 'PLAIN_TEXT' | 'STEP_BY_STEP';
    text: string;
  };
}

export interface ZephyrTestStep {
  description: string;
  testData?: string;
  expectedResult?: string;
}

export interface ZephyrExecution {
  testCaseKey: string;
  status: 'PASS' | 'FAIL' | 'EXECUTING' | 'BLOCKED';
  comment?: string;
  executionTime?: number;
  defects?: string[];
}

/** Test Cycle interface for Zephyr Scale */
export interface ZephyrTestCycle {
  id?: number;
  key?: string;
  name: string;
  projectKey?: string;
  description?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  folder?: string;
  status?: {
    id: number;
    name: string;
  };
}

/** Test Execution result for uploading to a test cycle */
export interface ZephyrTestExecutionResult {
  testCaseKey: string;
  testCycleKey: string;
  statusName: 'Pass' | 'Fail' | 'Not Executed' | 'Blocked' | 'In Progress';
  comment?: string;
  executionTime?: number;
  executedById?: string;
  assignedToId?: string;
  environmentName?: string;
  actualEndDate?: string;
  actualStartDate?: string;
}

class ZephyrClient {
  private client: AxiosInstance;
  private baseURL: string;
  private projectKey: string;

  constructor() {
    const zephyrConfig = config.getZephyrConfig();
    this.baseURL = process.env.ZEPHYR_BASE_URL || zephyrConfig.baseUrl;
    this.projectKey = process.env.ZEPHYR_PROJECT_KEY || zephyrConfig.projectKey;

    if (!this.baseURL) {
      throw new Error('ZEPHYR_BASE_URL must be set in environment or config');
    }

    const apiToken = process.env.ZEPHYR_API_TOKEN;

    if (!apiToken) {
      const envName = config.getEnvironment();
      throw new Error(
        `ZEPHYR_API_TOKEN must be set in src/config/env/.env.${envName} (or exported as an environment variable).`
      );
    }

    // Determine if using Zephyr Scale Cloud or Zephyr for JIRA (on-premise)
    // Zephyr Scale Cloud: https://api.zephyrscale.smartbear.com/v2 (fixed URL)
    // Zephyr for JIRA: {jira-url}/rest/atm/1.0
    // 
    // If ZEPHYR_BASE_URL contains "zephyrscale" or is explicitly set to Cloud API,
    // use Zephyr Scale Cloud. Otherwise, assume Zephyr for JIRA.
    const isZephyrScaleCloud = 
      this.baseURL.includes('zephyrscale.smartbear.com') || 
      this.baseURL.includes('api.zephyrscale') ||
      process.env.ZEPHYR_API_TYPE === 'cloud' ||
      process.env.ZEPHYR_API_TYPE === 'scale';
    
    let apiBaseURL: string;
    if (isZephyrScaleCloud) {
      // Zephyr Scale Cloud - always use fixed API URL
      // See: https://support.smartbear.com/zephyr/docs/en/rest-api/rest-api--overview-.html
      apiBaseURL = 'https://api.zephyrscale.smartbear.com/v2';
      logger.info('Using Zephyr Scale Cloud API (https://api.zephyrscale.smartbear.com/v2)');
    } else {
      // Zephyr for JIRA (on-premise) - use configured base URL
      const normalizedBaseUrl = this.baseURL.replace(/\/+$/, '');
      apiBaseURL = `${normalizedBaseUrl}/rest/atm/1.0`;
      logger.info(`Using Zephyr for JIRA (on-premise) API: ${apiBaseURL}`);
    }

    // Determine if SSL certificate verification should be disabled
    // Check both ZEPHYR_REJECT_UNAUTHORIZED and NODE_TLS_REJECT_UNAUTHORIZED
    // If either is set to disable verification, we disable it
    const disableSSLVerification = 
      process.env.ZEPHYR_REJECT_UNAUTHORIZED === 'false' ||
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ||
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === 'false';

    if (disableSSLVerification) {
      logger.warn('⚠️  SSL certificate verification is DISABLED for Zephyr API calls. This is insecure and should only be used in development.');
    }

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !disableSSLVerification, // rejectUnauthorized=false means allow invalid certs
    });

    this.client = axios.create({
      baseURL: apiBaseURL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      httpsAgent,
    });
    
    // Store API type for endpoint selection
    (this as any).isZephyrScaleCloud = isZephyrScaleCloud;
  }

  /**
   * Create a test case in Zephyr Scale
   */
  async createTestCase(testCase: ZephyrTestCase): Promise<ZephyrTestCase> {
    logger.info(`Creating Zephyr test case: ${testCase.name}`);

    // Use projectKey from testCase (extracted from Jira key) instead of client's default
    // Define outside try block so it's accessible in catch block for retry
    const projectKey = testCase.projectKey || this.projectKey;

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud ? '/testcases' : '/testcase';
      
      // Zephyr Scale Cloud uses different payload format
      let payload: any;
      if (isZephyrScaleCloud) {
        payload = {
          name: testCase.name,
          projectKey: projectKey,
          objective: testCase.objective,
          precondition: testCase.precondition,
          labels: testCase.labels || [],
        };
        
        // Include testScript for BDD-Gherkin format if provided
        // This should set the type to Gherkin during creation (one operation)
        if (testCase.testScript) {
          payload.testScript = {
            type: testCase.testScript.type,
            text: testCase.testScript.text
          };
          logger.debug(`Including testScript in creation payload: type=${testCase.testScript.type}, steps=${testCase.testScript.text.split('\n').filter(l => l.trim()).length}`);
        }
        
        // Only include customFields if they exist and are not empty
        // Custom fields are optional and may not exist in all Zephyr instances
        if (testCase.customFields && Object.keys(testCase.customFields).length > 0) {
          payload.customFields = testCase.customFields;
        }
      } else {
        payload = {
          ...testCase,
          projectKey: projectKey,
        };
      }

      // Debug: Log the payload being sent
      logger.debug(`Sending payload to Zephyr: ${JSON.stringify(payload, null, 2)}`);
      
      const { data } = await this.client.post<ZephyrTestCase>(endpoint, payload);
      const createdKey = data.key || (data as any).key;

      logger.info(`Test case created with key: ${createdKey || 'N/A'}`);
      
      // Convert Gherkin steps to Step-by-Step format and upload as teststeps
      // Zephyr creates test cases as "Step by Step" by default, which works for us
      if (testCase.testScript && createdKey && testCase.testScript.type === 'STEP_BY_STEP') {
        logger.info(`📝 Adding test steps in Step-by-Step format...`);
        
        try {
          // Wait a moment for test case to be fully created and processed by Zephyr
          // Increased wait time to ensure test case is ready for teststeps
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Convert Gherkin steps to Step-by-Step format
          const steps = testCase.testScript.text.split('\n').filter(line => line.trim());
          
          if (steps.length === 0) {
            logger.warn(`⚠️  No steps found in testScript.text`);
            return data;
          }
          
          const testStepItems = steps.map((step, index) => ({
            inline: {
              description: step.trim(),
              testData: '',
              expectedResult: index === steps.length - 1 ? 'Test completed successfully' : ''
            }
          }));
          
          const payload = {
            mode: 'OVERWRITE',
            items: testStepItems
          };
          
          logger.debug(`Creating ${testStepItems.length} test steps as Step-by-Step format`);
          logger.debug(`First step: ${testStepItems[0]?.inline?.description?.substring(0, 50)}...`);
          
          const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
          const teststepsEndpoint = isZephyrScaleCloud 
            ? `/testcases/${createdKey}/teststeps`
            : `/testcase/${createdKey}/teststeps`;
          
          await this.client.post(teststepsEndpoint, payload);
          logger.info(`✅ Created ${testStepItems.length} test steps for: ${createdKey}`);
          logger.info(`   Test Script tab will show "Type: Step by Step" with all steps`);
        } catch (stepError: any) {
          logger.error(`❌ Failed to create test steps: ${stepError.message}`);
          if (stepError.response) {
            logger.error(`Response status: ${stepError.response.status}`);
            logger.error(`Response data: ${JSON.stringify(stepError.response.data, null, 2)}`);
          }
          logger.warn(`⚠️  Test case created but test steps may need to be added manually`);
          // Don't throw - test case was created successfully, just steps failed
        }
      }
      
      return data;
    } catch (error: any) {
      // If error is about custom field not found, retry without custom fields
      if (error.response?.status === 400 && 
          error.response?.data?.message?.includes('custom field') &&
          testCase.customFields && 
          Object.keys(testCase.customFields).length > 0) {
        logger.warn(`Custom field error detected. Retrying without custom fields...`);
        
        try {
          const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
          const endpoint = isZephyrScaleCloud ? '/testcases' : '/testcase';
          
          let retryPayload: any;
          if (isZephyrScaleCloud) {
            retryPayload = {
              name: testCase.name,
              projectKey: projectKey, // Use projectKey from testCase, not client default
              objective: testCase.objective,
              precondition: testCase.precondition,
              labels: testCase.labels || [],
              // Omit customFields on retry
            };
            // Include testScript if provided
            if (testCase.testScript) {
              retryPayload.testScript = testCase.testScript;
            }
          } else {
            const { customFields, ...rest } = testCase;
            retryPayload = {
              ...rest,
              projectKey: projectKey, // Use projectKey from testCase, not client default
            };
          }

          // Debug: Log the retry payload
          logger.debug(`Retry payload to Zephyr: ${JSON.stringify(retryPayload, null, 2)}`);
          
          const { data } = await this.client.post<ZephyrTestCase>(endpoint, retryPayload);
          const createdKey = data.key || (data as any).key;
          logger.info(`Test case created with key: ${createdKey || 'N/A'} (without custom fields)`);
          
          // Add teststeps for Step-by-Step format
          if (testCase.testScript && createdKey && testCase.testScript.type === 'STEP_BY_STEP') {
            logger.info(`📝 Adding test steps in Step-by-Step format...`);
            
            try {
              // Wait a moment for test case to be fully created and processed by Zephyr
              // Increased wait time to ensure test case is ready for teststeps
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Convert Gherkin steps to Step-by-Step format
              const steps = testCase.testScript.text.split('\n').filter(line => line.trim());
              
              if (steps.length === 0) {
                logger.warn(`⚠️  No steps found in testScript.text`);
                return data;
              }
              
              const testStepItems = steps.map((step, index) => ({
                inline: {
                  description: step.trim(),
                  testData: '',
                  expectedResult: index === steps.length - 1 ? 'Test completed successfully' : ''
                }
              }));
              
              const payload = {
                mode: 'OVERWRITE',
                items: testStepItems
              };
              
              logger.debug(`Creating ${testStepItems.length} test steps as Step-by-Step format`);
              logger.debug(`First step: ${testStepItems[0]?.inline?.description?.substring(0, 50)}...`);
              
              const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
              const teststepsEndpoint = isZephyrScaleCloud 
                ? `/testcases/${createdKey}/teststeps`
                : `/testcase/${createdKey}/teststeps`;
              
              await this.client.post(teststepsEndpoint, payload);
              logger.info(`✅ Created ${testStepItems.length} test steps for: ${createdKey}`);
              logger.info(`   Test Script tab will show "Type: Step by Step" with all steps`);
            } catch (stepError: any) {
              logger.error(`❌ Failed to create test steps: ${stepError.message}`);
              if (stepError.response) {
                logger.error(`Response status: ${stepError.response.status}`);
                logger.error(`Response data: ${JSON.stringify(stepError.response.data, null, 2)}`);
              }
              logger.warn(`⚠️  Test case created but test steps may need to be added manually`);
              // Don't throw - test case was created successfully, just steps failed
            }
          }
          
          return data;
        } catch (retryError: any) {
          logger.error(`Failed to create test case even without custom fields: ${retryError.message}`);
          if (retryError.response) {
            logger.error(`Response status: ${retryError.response.status}`);
            logger.error(`Response data: ${JSON.stringify(retryError.response.data, null, 2)}`);
          }
          throw retryError;
        }
      }
      
      logger.error(`Failed to create test case: ${error.message}`);
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  }

  /**
   * Update a test case
   * For Zephyr Scale Cloud, uses PUT /testcases/{key} (plural)
   * For Zephyr for JIRA, uses PUT /testcase/{key} (singular)
   */
  async updateTestCase(testCaseKey: string, updates: Partial<ZephyrTestCase>): Promise<void> {
    logger.info(`Updating Zephyr test case: ${testCaseKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud ? `/testcases/${testCaseKey}` : `/testcase/${testCaseKey}`;
      
      // For Zephyr Scale Cloud, we need to get existing test case first to preserve all required fields
      if (isZephyrScaleCloud) {
        const existing = await this.getTestCase(testCaseKey);
        
        // Deep merge: preserve all existing fields, then apply updates
        // This ensures nested objects (project, status, priority) are preserved
        // Cast to any since API returns more fields than the interface defines
        const existingAny = existing as any;
        const payload: any = {
          ...existingAny,
          ...updates,
          // Explicitly preserve required fields that might be overwritten
          id: existingAny.id,
          key: testCaseKey,  // Keep key - API requires it even though it's in URL
          name: updates.name || existing.name,
          project: existingAny.project,
          status: existingAny.status,
          priority: existingAny.priority,
        };
        
        // Ensure testScript is properly merged (don't overwrite with undefined)
        if (updates.testScript) {
          payload.testScript = updates.testScript;
        }
        
        logger.debug(`Update payload: ${JSON.stringify(payload, null, 2)}`);
        await this.client.put(endpoint, payload);
      } else {
        await this.client.put(endpoint, updates);
      }
      
      logger.info(`Test case updated: ${testCaseKey}`);
    } catch (error: any) {
      logger.error(`Failed to update test case: ${error.message}`);
      if (error.response) {
        logger.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }
  }

  /**
   * Update a test case's test script (BDD-Gherkin format)
   * 
   * For Gherkin type: Uses updateTestCase with testScript field
   * For Step-by-Step type: Uses POST /testcases/{key}/teststeps endpoint
   * 
   * Note: Zephyr Scale Gherkin format should only include steps (Given/When/Then/And),
   * NOT tags or Scenario keywords. Tags are handled via labels field.
   */
  async updateTestScript(testCaseKey: string, scriptType: 'BDD' | 'GHERKIN' | 'PLAIN_TEXT' | 'STEP_BY_STEP', scriptText: string): Promise<void> {
    logger.info(`Updating test script for: ${testCaseKey} (type: ${scriptType})`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      
      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud - Convert all script types to Step-by-Step format
        // This is the most reliable format that works with Zephyr API
        
        if (scriptType === 'GHERKIN' || scriptType === 'BDD' || scriptType === 'STEP_BY_STEP') {
          // Convert Gherkin/BDD steps or Step-by-Step text to teststeps format
          const steps = scriptText.split('\n').filter(line => line.trim());
          const testStepItems = steps.map((step, index) => ({
            inline: {
              description: step.trim(),
              testData: '',
              expectedResult: index === steps.length - 1 ? 'Test completed successfully' : ''
            }
          }));
          
          const payload = {
            mode: 'OVERWRITE',
            items: testStepItems
          };
          
          logger.debug(`Converting ${scriptType} script to Step-by-Step format (${testStepItems.length} steps)`);
          await this.client.post(`/testcases/${testCaseKey}/teststeps`, payload);
          logger.info(`✅ Test steps updated as Step-by-Step for: ${testCaseKey} (${testStepItems.length} steps)`);
          return;
        } else {
          // PLAIN_TEXT or other types - use testScript field
          const existing = await this.getTestCase(testCaseKey);
          const existingAny = existing as any;
          
          const updatePayload: any = {
            id: existingAny.id,
            key: testCaseKey,
            name: existing.name,
            project: existingAny.project,
            status: existingAny.status,
            priority: existingAny.priority,
            objective: existing.objective || '',
            precondition: existing.precondition || null,
            labels: existing.labels || [],
            testScript: {
              type: scriptType,
              text: scriptText
            }
          };
          
          if (existingAny.folder) updatePayload.folder = existingAny.folder;
          if (existingAny.component) updatePayload.component = existingAny.component;
          if (existingAny.owner) updatePayload.owner = existingAny.owner;
          if (existingAny.customFields) updatePayload.customFields = existingAny.customFields;
          
          await this.client.put(`/testcases/${testCaseKey}`, updatePayload);
          logger.info(`✅ Test script updated as ${scriptType} type for: ${testCaseKey}`);
          return;
        }
      } else {
        // Zephyr for JIRA (on-premise)
        const payload = {
          testScript: scriptText,
        };
        await this.client.put(`/testcase/${testCaseKey}`, payload);
        logger.info(`Test script updated for: ${testCaseKey}`);
      }
    } catch (error: any) {
      logger.error(`❌ Failed to update test script: ${error.message}`);
      if (error.response) {
        logger.error(`Response status: ${error.response.status}`);
        logger.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      // Re-throw the error so the caller knows the update failed
      throw error;
    }
  }

  /**
   * Get test case by key
   */
  async getTestCase(testCaseKey: string): Promise<ZephyrTestCase> {
    logger.info(`Fetching Zephyr test case: ${testCaseKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud ? `/testcases/${testCaseKey}` : `/testcase/${testCaseKey}`;
      const { data } = await this.client.get<ZephyrTestCase>(endpoint);
      return data;
    } catch (error: any) {
      logger.error(`Failed to get test case: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for test cases by name
   */
  async searchTestCasesByName(name: string, projectKey?: string): Promise<ZephyrTestCase[]> {
    logger.debug(`Searching for test case with name: "${name}"`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const searchProjectKey = projectKey || this.projectKey;

      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud API - search using query parameter
        // API format: GET /testcases?projectKey={projectKey}&name={name}
        try {
          const { data } = await this.client.get<{ values?: ZephyrTestCase[]; data?: ZephyrTestCase[] }>(
            `/testcases?projectKey=${encodeURIComponent(searchProjectKey)}&name=${encodeURIComponent(name)}`
          );
          // Handle different response formats
          if (data.values && Array.isArray(data.values)) {
            return data.values;
          }
          if (data.data && Array.isArray(data.data)) {
            return data.data;
          }
          if (Array.isArray(data)) {
            return data;
          }
          return [];
        } catch (searchError: any) {
          // If search fails, try to get all test cases and filter (less efficient but works)
          logger.debug(`Direct search failed, trying alternative method: ${searchError.message}`);
          try {
            const { data } = await this.client.get<{ values?: ZephyrTestCase[] }>(
              `/testcases?projectKey=${encodeURIComponent(searchProjectKey)}&maxResults=100`
            );
            const allTestCases = data.values || [];
            // Filter by name (case-insensitive partial match)
            return allTestCases.filter(tc => 
              tc.name && tc.name.toLowerCase().includes(name.toLowerCase())
            );
          } catch {
            return [];
          }
        }
      } else {
        // Zephyr for JIRA - use search endpoint if available
        try {
          const { data } = await this.client.get<ZephyrTestCase[]>(
            `/testcase/search?projectKey=${encodeURIComponent(searchProjectKey)}&name=${encodeURIComponent(name)}`
          );
          return Array.isArray(data) ? data : [];
        } catch {
          // If search endpoint doesn't exist, return empty array
          logger.debug('Search endpoint not available, returning empty results');
          return [];
        }
      }
    } catch (error: any) {
      logger.debug(`Failed to search test cases: ${error.message}`);
      return [];
    }
  }

  /**
   * Search for test cases by label (e.g., work item ID like "SF-520")
   * This searches for test cases that have a specific label
   */
  async searchTestCasesByLabel(label: string, projectKey?: string): Promise<ZephyrTestCase[]> {
    logger.debug(`Searching for test cases with label: "${label}"`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const searchProjectKey = projectKey || this.projectKey;

      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud - get all test cases with pagination and filter by label
        try {
          const matchingTestCases: ZephyrTestCase[] = [];
          let startAt = 0;
          const maxResults = 1000;
          let hasMore = true;
          const isWorkItemPattern = /^[A-Z]+-\d+$/.test(label);
          
          // Fetch test cases with pagination
          while (hasMore) {
            const { data } = await this.client.get<{ 
              values?: ZephyrTestCase[]; 
              data?: ZephyrTestCase[]; 
              total?: number; 
              isLast?: boolean;
            }>(
              `/testcases?projectKey=${encodeURIComponent(searchProjectKey)}&startAt=${startAt}&maxResults=${maxResults}`
            );
            
            const pageTestCases = data.values || data.data || [];
            
            // Filter by label matching exactly first, then check if label is a work item pattern
            // For work item labels (e.g., "SF-567"), match exactly to avoid false matches with test case IDs (e.g., "SF-567-UI-001")
            // For other searches, allow partial matching
            const pageMatches = pageTestCases.filter((tc: any) => {
              const labels = tc.labels || [];
              if (isWorkItemPattern) {
                // For work item labels, match exactly to avoid matching test case ID labels
                return labels.some((l: string) => l === label);
              } else {
                // For other labels, allow exact or partial match
                return labels.some((l: string) => l === label || l.includes(label));
              }
            });
            
            matchingTestCases.push(...pageMatches);
            
            // Check if there are more pages
            if (data.isLast === false && pageTestCases.length === maxResults) {
              startAt += maxResults;
              hasMore = true;
            } else {
              hasMore = false;
            }
            
            // Safety check: don't fetch more than 10,000 test cases
            if (startAt >= 10000) {
              logger.debug(`Reached safety limit of 10,000 test cases. Stopping pagination.`);
              hasMore = false;
            }
          }
          
          logger.debug(`Found ${matchingTestCases.length} test case(s) with label "${label}"`);
          return matchingTestCases;
        } catch (searchError: any) {
          logger.debug(`Failed to search by label: ${searchError.message}`);
          return [];
        }
      } else {
        // Zephyr for JIRA - try to search by label
        try {
          const { data } = await this.client.get<ZephyrTestCase[]>(
            `/testcase/search?projectKey=${encodeURIComponent(searchProjectKey)}`
          );
          if (Array.isArray(data)) {
            // Filter by label - use exact matching for work item patterns
            const isWorkItemPattern = /^[A-Z]+-\d+$/.test(label);
            return data.filter((tc: any) => {
              const labels = tc.labels || [];
              if (isWorkItemPattern) {
                // For work item labels, match exactly to avoid matching test case ID labels
                return labels.some((l: string) => l === label);
              } else {
                // For other labels, allow exact or partial match
                return labels.some((l: string) => l === label || l.includes(label));
              }
            });
          }
          return [];
        } catch {
          logger.debug('Search endpoint not available, returning empty results');
          return [];
        }
      }
    } catch (error: any) {
      logger.debug(`Failed to search test cases by label: ${error.message}`);
      return [];
    }
  }

  /**
   * Search for test cases by test case ID (label)
   * This searches for test cases that have a specific label like "SF-520-001"
   */
  async searchTestCasesByTestCaseId(testCaseId: string, projectKey?: string, retries: number = 3): Promise<ZephyrTestCase[]> {
    logger.debug(`Searching for test case with ID (label): "${testCaseId}"`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      // SMOKE-XXX test cases are in SF project, not SMOKE project
      let searchProjectKey = projectKey || this.projectKey;
      if (testCaseId.startsWith('SMOKE-') && (!projectKey || projectKey === 'SMOKE')) {
        searchProjectKey = this.projectKey || process.env.ZEPHYR_PROJECT_KEY || 'SF';
        logger.debug(`SMOKE test case detected - using project key "${searchProjectKey}" instead of "${projectKey || 'SMOKE'}"`);
      }

      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud - get all test cases and filter by label
        // Retry with delay to account for Zephyr indexing time
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const { data } = await this.client.get<{ values?: ZephyrTestCase[]; data?: ZephyrTestCase[] }>(
              `/testcases?projectKey=${encodeURIComponent(searchProjectKey)}&maxResults=1000`
            );
            
            const allTestCases = data.values || data.data || [];
            logger.debug(`Retrieved ${allTestCases.length} total test cases from project (attempt ${attempt}/${retries})`);
            
            // Search by name: "PP-392-UI-001: …", "PP-392-UI-001 …", exact id line, or unique \b id \b in name (see filterTestCasesByAutomationIdName).
            let matchingTestCases = filterTestCasesByAutomationIdName(allTestCases, testCaseId);

            if (matchingTestCases.length > 0) {
              logger.debug(
                `Found ${matchingTestCases.length} test case(s) by name match for automation id "${testCaseId}" (e.g. ${matchingTestCases[0].key})`,
              );
            } else {
              // Fallback: Filter by label matching the test case ID exactly
              matchingTestCases = allTestCases.filter((tc: any) => {
                const labels = tc.labels || [];
                return labels.some((label: string) => label === testCaseId);
              });

              if (matchingTestCases.length > 0) {
                logger.debug(`Found ${matchingTestCases.length} test case(s) by label "${testCaseId}"`);
              } else if (attempt === retries && allTestCases.length > 0) {
                const sampleNames = allTestCases.slice(0, 5).map((tc: any) => tc.name || 'NO_NAME').join(', ');
                logger.debug(`Sample test case names (first 5): ${sampleNames}`);
                const sampleWithPattern = allTestCases.filter((tc: any) => {
                  const name = tc.name || '';
                  return name.includes(testCaseId);
                });
                if (sampleWithPattern.length > 0) {
                  logger.debug(
                    `Found ${sampleWithPattern.length} test case(s) with "${testCaseId}" in name (substring only; no word-boundary / prefix rule match)`,
                  );
                }
              }
            }
            
            if (matchingTestCases.length > 0 || attempt === retries) {
              logger.debug(`Found ${matchingTestCases.length} test case(s) with label "${testCaseId}" (attempt ${attempt}/${retries})`);
              return matchingTestCases;
            }
            
            // Wait before retry (Zephyr needs time to index labels)
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
            }
          } catch (searchError: any) {
            if (attempt === retries) {
              logger.debug(`Failed to search by label after ${retries} attempts: ${searchError.message}`);
              return [];
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        return [];
      } else {
        // Zephyr for JIRA - try to search by label
        try {
          const { data } = await this.client.get<ZephyrTestCase[]>(
            `/testcase/search?projectKey=${encodeURIComponent(searchProjectKey)}`
          );
          if (Array.isArray(data)) {
            // Filter by label
            return data.filter((tc: any) => {
              const labels = tc.labels || [];
              return labels.some((label: string) => label === testCaseId);
            });
          }
          return [];
        } catch {
          logger.debug('Search endpoint not available, returning empty results');
          return [];
        }
      }
    } catch (error: any) {
      logger.debug(`Failed to search test cases by ID: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete a test case
   */
  async deleteTestCase(testCaseKey: string): Promise<void> {
    logger.info(`Deleting Zephyr test case: ${testCaseKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud ? `/testcases/${testCaseKey}` : `/testcase/${testCaseKey}`;
      await this.client.delete(endpoint);
      logger.info(`Test case deleted: ${testCaseKey}`);
    } catch (error: any) {
      logger.error(`Failed to delete test case: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Jira issue IDs linked to a test case from Zephyr Scale.
   * Uses GET /testcases/{key} and reads links.issues (Zephyr stores the link, not Jira remotelink).
   * Returns array of issue IDs (strings). May be empty if API does not return links.
   */
  async getTestCaseLinkedIssueIds(testCaseKey: string): Promise<string[]> {
    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      if (!isZephyrScaleCloud) return [];
      const endpoint = `/testcases/${testCaseKey}`;
      const { data } = await this.client.get<{ links?: { issues?: Array<{ id?: string; issueId?: string }> } }>(endpoint);
      const issues = (data as any)?.links?.issues;
      if (!Array.isArray(issues)) return [];
      return issues
        .map((o: any) => o?.id ?? o?.issueId ?? o?.key)
        .filter(Boolean)
        .map(String);
    } catch (error: any) {
      logger.debug(`Failed to get issue links for test case ${testCaseKey}: ${error.message}`);
      return [];
    }
  }

  /**
   * Link a test case to a Jira issue using Zephyr Scale's links API
   * This creates the proper link that shows up in the "Zephyr Scale" section in Jira
   * 
   * Uses the endpoint: POST /testcases/{testCaseKey}/links/issues
   * Requires the Jira issue ID (internal ID), not the issue key
   */
  async linkTestCaseToJiraIssue(testCaseKey: string, jiraIssueId: string): Promise<void> {
    logger.info(`Linking Zephyr test case ${testCaseKey} to Jira issue ID ${jiraIssueId}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      
      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud - use the links/issues endpoint
        const payload = {
          issueId: jiraIssueId
        };
        
        await this.client.post(`/testcases/${testCaseKey}/links/issues`, payload);
        logger.info(`✅ Linked test case ${testCaseKey} to Jira issue ID ${jiraIssueId}`);
        logger.info(`   The link should appear in Jira's "Zephyr Scale" section`);
      } else {
        // Zephyr for JIRA - might use different endpoint
        logger.warn(`Linking test cases to Jira issues for Zephyr for JIRA is not yet implemented`);
        throw new Error('Linking not supported for Zephyr for JIRA');
      }
    } catch (error: any) {
      if (error.response) {
        // If link already exists (409 Conflict), that's okay
        if (error.response.status === 409) {
          logger.debug(`Link already exists between test case ${testCaseKey} and Jira issue ID ${jiraIssueId}`);
          return;
        }
        logger.error(`Failed to link test case: ${error.response.status} - ${error.response.statusText}`);
        logger.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
      } else {
        logger.error(`Failed to link test case: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Create test execution result
   */
  async createExecution(execution: ZephyrExecution): Promise<void> {
    logger.info(`Creating execution result for: ${execution.testCaseKey}`);

    try {
      await this.client.post('/testrun', {
        projectKey: this.projectKey,
        name: `Test Run - ${new Date().toISOString()}`,
        testCases: [
          {
            testCaseKey: execution.testCaseKey,
            status: execution.status,
            comment: execution.comment,
            executionTime: execution.executionTime,
            defects: execution.defects,
          },
        ],
      });

      logger.info(`Execution result created for: ${execution.testCaseKey}`);
    } catch (error: any) {
      logger.error(`Failed to create execution: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update test execution result
   */
  async updateExecution(
    executionKey: string,
    execution: Partial<ZephyrExecution>
  ): Promise<void> {
    logger.info(`Updating execution: ${executionKey}`);

    try {
      await this.client.put(`/testrun/${executionKey}`, execution);
      logger.info(`Execution updated: ${executionKey}`);
    } catch (error: any) {
      logger.error(`Failed to update execution: ${error.message}`);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST CYCLE METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Search for test cycles by name
   */
  async searchTestCycles(name: string, projectKey?: string): Promise<ZephyrTestCycle[]> {
    logger.debug(`Searching for test cycle with name: "${name}"`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const searchProjectKey = projectKey || this.projectKey;

      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud - get all test cycles and filter by name
        const { data } = await (this.client as any).get(
          `/testcycles?projectKey=${encodeURIComponent(searchProjectKey)}&maxResults=100`
        );
        
        const allCycles = data.values || data || [];
        
        // If name is empty, return all cycles
        if (!name || name.trim() === '') {
          logger.debug(`Found ${allCycles.length} test cycle(s) (no filter)`);
          return allCycles;
        }
        
        // Filter by name (case-insensitive partial match)
        const matchingCycles = allCycles.filter((cycle: any) => 
          cycle.name && cycle.name.toLowerCase().includes(name.toLowerCase())
        );
        
        logger.debug(`Found ${matchingCycles.length} test cycle(s) matching "${name}"`);
        return matchingCycles;
      } else {
        // Zephyr for JIRA
        const { data } = await (this.client as any).get(
          `/testcycle/search?projectKey=${encodeURIComponent(searchProjectKey)}&name=${encodeURIComponent(name)}`
        );
        return Array.isArray(data) ? data : [];
      }
    } catch (error: any) {
      logger.debug(`Failed to search test cycles: ${error.message}`);
      return [];
    }
  }

  /**
   * Get a specific test cycle by key
   */
  async getTestCycle(testCycleKey: string): Promise<ZephyrTestCycle | null> {
    logger.debug(`Getting test cycle: ${testCycleKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud ? `/testcycles/${testCycleKey}` : `/testcycle/${testCycleKey}`;
      
      const { data } = await (this.client as any).get(endpoint);
      return data;
    } catch (error: any) {
      logger.debug(`Failed to get test cycle: ${error.message}`);
      return null;
    }
  }

  /**
   * Create a new test cycle
   */
  async createTestCycle(testCycle: ZephyrTestCycle): Promise<ZephyrTestCycle> {
    logger.info(`Creating test cycle: ${testCycle.name}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud ? '/testcycles' : '/testcycle';
      
      const payload = {
        name: testCycle.name,
        projectKey: testCycle.projectKey || this.projectKey,
        description: testCycle.description,
        plannedStartDate: testCycle.plannedStartDate,
        plannedEndDate: testCycle.plannedEndDate,
      };

      const { data } = await this.client.post<ZephyrTestCycle>(endpoint, payload);
      logger.info(`Test cycle created with key: ${data.key || 'N/A'}`);
      return data;
    } catch (error: any) {
      logger.error(`Failed to create test cycle: ${error.message}`);
      if (error.response) {
        logger.debug(`Response: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST EXECUTION METHODS (for uploading results to test cycles)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add a test case to a test cycle (creates execution with "Not Executed" status)
   * This allows test cases to be visible in the cycle before test execution
   * 
   * @param testCaseKey - Zephyr test case key (e.g., SF-T199)
   * @param testCycleKey - Zephyr test cycle key (e.g., SF-C123)
   * @param projectKey - Optional project key (extracted from testCaseKey if not provided)
   * @returns Created execution object
   */
  async addTestCaseToCycle(
    testCaseKey: string,
    testCycleKey: string,
    projectKey?: string
  ): Promise<any> {
    logger.info(`Adding test case ${testCaseKey} to cycle ${testCycleKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      
      // Extract project key from test case key if not provided
      const extractedProjectKey = extractProjectPrefix(testCaseKey);
      const finalProjectKey = projectKey || extractedProjectKey || this.projectKey;
      
      if (extractedProjectKey && !projectKey) {
        logger.debug(`📋 Using project key "${finalProjectKey}" extracted from test case key "${testCaseKey}"`);
      } else if (projectKey) {
        logger.debug(`📋 Using provided project key: "${finalProjectKey}"`);
      } else {
        logger.debug(`⚠️  Could not extract project key from test case key "${testCaseKey}". Using client default: ${finalProjectKey}`);
      }
      
      // Create execution with "Not Executed" status
      const execution: ZephyrTestExecutionResult = {
        testCaseKey: testCaseKey,
        testCycleKey: testCycleKey,
        statusName: 'Not Executed',
        comment: 'Test case added to cycle before execution',
        actualStartDate: new Date().toISOString(),
      };

      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud uses /testexecutions endpoint
        const payload = {
          projectKey: finalProjectKey,
          testCaseKey: execution.testCaseKey,
          testCycleKey: execution.testCycleKey,
          statusName: execution.statusName,
          comment: execution.comment,
          actualStartDate: execution.actualStartDate,
        };

        logger.debug(`Adding test case to cycle with payload: ${JSON.stringify(payload)}`);
        const { data } = await this.client.post('/testexecutions', payload);
        logger.info(`✅ Test case added to cycle: ${testCaseKey}`);
        return data;
      } else {
        // Zephyr for JIRA
        const { data } = await this.client.post('/testrun', {
          projectKey: finalProjectKey,
          testCycleKey: execution.testCycleKey,
          testCases: [{
            testCaseKey: execution.testCaseKey,
            status: execution.statusName,
            comment: execution.comment,
          }],
        });
        logger.info(`✅ Test case added to cycle: ${testCaseKey}`);
        return data;
      }
    } catch (error: any) {
      // If execution already exists, that's okay - just log it
      if (error.response && (error.response.status === 400 || error.response.status === 409)) {
        logger.debug(`Test case ${testCaseKey} may already be in cycle ${testCycleKey}: ${error.message}`);
        // Return a mock response to indicate it's already there
        return { key: 'existing', testCaseKey, testCycleKey, alreadyExists: true };
      }
      logger.error(`Failed to add test case to cycle: ${error.message}`);
      if (error.response) {
        logger.debug(`Response status: ${error.response.status}`);
        logger.debug(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Create a test execution result in a test cycle
   */
  async createTestExecutionResult(execution: ZephyrTestExecutionResult): Promise<any> {
    logger.info(`Creating execution result for ${execution.testCaseKey} in cycle ${execution.testCycleKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      
      // Extract project key from test case key (e.g., ST-T76 -> ST, SF-T199 -> SF)
      // This ensures we use the correct project for the test case
      const extractedProjectKey = extractProjectPrefix(execution.testCaseKey);
      const projectKey = extractedProjectKey || this.projectKey;
      
      if (extractedProjectKey) {
        logger.debug(`📋 Using project key "${projectKey}" extracted from test case key "${execution.testCaseKey}"`);
      } else {
        logger.debug(`⚠️  Could not extract project key from test case key "${execution.testCaseKey}". Using client default: ${projectKey}`);
      }
      
      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud uses /testexecutions endpoint
        const payload = {
          projectKey: projectKey,
          testCaseKey: execution.testCaseKey,
          testCycleKey: execution.testCycleKey,
          statusName: execution.statusName,
          comment: execution.comment,
          executionTime: execution.executionTime,
          executedById: execution.executedById,
          actualEndDate: execution.actualEndDate || new Date().toISOString(),
          actualStartDate: execution.actualStartDate,
          environmentName: execution.environmentName,
        };

        logger.debug(`Creating execution with payload: ${JSON.stringify(payload)}`);
        const { data } = await this.client.post('/testexecutions', payload);
        logger.info(`✅ Execution result created for: ${execution.testCaseKey}`);
        return data;
      } else {
        // Zephyr for JIRA
        const { data } = await this.client.post('/testrun', {
          projectKey: projectKey,
          testCycleKey: execution.testCycleKey,
          testCases: [{
            testCaseKey: execution.testCaseKey,
            status: execution.statusName,
            comment: execution.comment,
            executionTime: execution.executionTime,
          }],
        });
        return data;
      }
    } catch (error: any) {
      logger.error(`Failed to create execution result: ${error.message}`);
      if (error.response) {
        logger.debug(`Response status: ${error.response.status}`);
        logger.debug(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Upload an attachment to a test execution
   * Uses native Node.js multipart/form-data (no external dependencies)
   */
  async uploadExecutionAttachment(
    executionKey: string,
    filePath: string,
    fileName?: string
  ): Promise<void> {
    logger.info(`Uploading attachment to execution ${executionKey}: ${filePath}`);

    try {
      const fs = await import('fs');
      const pathModule = await import('path');

      if (!fs.existsSync(filePath)) {
        logger.warn(`Attachment file not found: ${filePath}`);
        return;
      }

      const actualFileName = fileName || pathModule.basename(filePath);
      const fileContent = fs.readFileSync(filePath);
      const boundary = `----FormBoundary${Date.now()}`;
      
      // Determine content type based on file extension
      const ext = pathModule.extname(filePath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.html': 'text/html',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      // Build multipart form data manually
      const bodyParts: Buffer[] = [];
      
      // Add file part
      bodyParts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${actualFileName}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
      ));
      bodyParts.push(fileContent);
      bodyParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
      
      const body = Buffer.concat(bodyParts);

      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      const endpoint = isZephyrScaleCloud 
        ? `/testexecutions/${executionKey}/attachments`
        : `/testrun/${executionKey}/attachments`;

      logger.debug(`Uploading to endpoint: ${endpoint}`);
      logger.debug(`File size: ${fileContent.length} bytes, MIME type: ${contentType}`);

      // Retry-with-backoff on 5xx / network errors. Zephyr Cloud's CloudFront
      // edge sporadically returns 503 with a "Lambda function … invalid"
      // body; the retries succeed once the backend recovers.
      const maxAttempts = 4;
      let lastError: any;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await this.client.post(endpoint, body, {
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': body.length.toString(),
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          });
          logger.info(`✅ Attachment uploaded: ${actualFileName}${attempt > 1 ? ` (attempt ${attempt}/${maxAttempts})` : ''}`);
          logger.debug(`Upload response status: ${response.status}`);
          return;
        } catch (err: any) {
          lastError = err;
          const status = err?.response?.status;
          const retriable = !status || (status >= 500 && status < 600) || status === 429;
          if (!retriable || attempt === maxAttempts) {
            throw err;
          }
          const backoffMs = Math.min(30_000, 2_000 * Math.pow(2, attempt - 1));
          logger.warn(
            `Attachment upload attempt ${attempt}/${maxAttempts} failed (status=${status ?? 'no-response'}); retrying in ${backoffMs} ms`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
        }
      }
      throw lastError;
    } catch (error: any) {
      logger.warn(`Failed to upload attachment: ${error.message}`);
      if (error.response) {
        logger.debug(`Response status: ${error.response.status}`);
        logger.debug(`Response data: ${JSON.stringify(error.response.data)}`);
        logger.debug(`Full URL: ${error.config?.baseURL}${error.config?.url}`);
      }
      // Don't throw - attachment upload is secondary
    }
  }

  /**
   * Get all test executions for a test cycle
   */
  async getTestExecutions(testCycleKey: string): Promise<any[]> {
    logger.debug(`Getting executions for test cycle: ${testCycleKey}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      
      if (isZephyrScaleCloud) {
        const { data } = await (this.client as any).get(
          `/testexecutions?testCycle=${encodeURIComponent(testCycleKey)}&maxResults=1000`
        );
        return data.values || data || [];
      } else {
        const { data } = await (this.client as any).get(
          `/testrun?testCycleKey=${encodeURIComponent(testCycleKey)}`
        );
        return Array.isArray(data) ? data : [];
      }
    } catch (error: any) {
      logger.debug(`Failed to get executions: ${error.message}`);
      return [];
    }
  }

  /**
   * Delete a test execution by ID
   */
  async deleteTestExecution(executionId: string | number): Promise<void> {
    logger.debug(`Deleting test execution: ${executionId}`);

    try {
      const isZephyrScaleCloud = (this as any).isZephyrScaleCloud;
      
      if (isZephyrScaleCloud) {
        // Zephyr Scale Cloud uses /testexecutions/{id} endpoint
        await this.client.delete(`/testexecutions/${executionId}`);
        logger.info(`✅ Deleted test execution: ${executionId}`);
      } else {
        // Zephyr for JIRA
        await this.client.delete(`/testrun/${executionId}`);
        logger.info(`✅ Deleted test execution: ${executionId}`);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        logger.debug(`Execution ${executionId} not found (may have been already deleted)`);
        return;
      }
      logger.error(`Failed to delete execution ${executionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload Cucumber JSON results with attachments using automations endpoint
   * This is the ONLY way to upload attachments in Zephyr Scale Cloud
   * 
   * @param cucumberJsonPath - Path to Cucumber JSON results file
   * @param testCycleName - Name of the test cycle
   * @param attachments - Array of file paths to attach (HTML reports, screenshots)
   */
  async uploadCucumberResultsWithAttachments(
    cucumberJsonPath: string,
    testCycleName: string,
    attachments: string[] = []
  ): Promise<any> {
    logger.info(`Uploading Cucumber results with attachments via automations API`);

    try {
      const fs = await import('fs');
      const pathModule = await import('path');

      if (!fs.existsSync(cucumberJsonPath)) {
        throw new Error(`Cucumber results file not found: ${cucumberJsonPath}`);
      }

      const boundary = `----FormBoundary${Date.now()}`;
      const bodyParts: Buffer[] = [];
      
      // Add Cucumber JSON file
      const cucumberContent = fs.readFileSync(cucumberJsonPath);
      bodyParts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="cucumber-results.json"\r\n` +
        `Content-Type: application/json\r\n\r\n`
      ));
      bodyParts.push(cucumberContent);
      bodyParts.push(Buffer.from('\r\n'));
      
      // Add test cycle configuration
      const testCycleConfig = JSON.stringify({
        name: testCycleName,
        customFields: {}
      });
      bodyParts.push(Buffer.from(
        `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="testCycle"\r\n` +
        `Content-Type: application/json\r\n\r\n` +
        testCycleConfig + '\r\n'
      ));
      
      // Add attachments (HTML reports, screenshots)
      for (const attachmentPath of attachments) {
        if (fs.existsSync(attachmentPath)) {
          const fileName = pathModule.basename(attachmentPath);
          const fileContent = fs.readFileSync(attachmentPath);
          const ext = pathModule.extname(attachmentPath).toLowerCase();
          const mimeTypes: Record<string, string> = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.html': 'text/html',
            '.json': 'application/json',
          };
          const contentType = mimeTypes[ext] || 'application/octet-stream';
          
          bodyParts.push(Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="attachments"; filename="${fileName}"\r\n` +
            `Content-Type: ${contentType}\r\n\r\n`
          ));
          bodyParts.push(fileContent);
          bodyParts.push(Buffer.from('\r\n'));
        }
      }
      
      // Close boundary
      bodyParts.push(Buffer.from(`--${boundary}--\r\n`));
      
      const body = Buffer.concat(bodyParts);
      
      const endpoint = `/automations/executions/cucumber?projectKey=${this.projectKey}&autoCreateTestCases=false`;
      logger.debug(`Uploading to: ${endpoint}`);
      logger.debug(`Body size: ${body.length} bytes, Attachments: ${attachments.length}`);

      const response = await this.client.post(endpoint, body, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length.toString(),
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      logger.info(`✅ Cucumber results uploaded with ${attachments.length} attachment(s)`);
      return response.data;
    } catch (error: any) {
      logger.error(`Failed to upload Cucumber results: ${error.message}`);
      if (error.response) {
        logger.debug(`Response status: ${error.response.status}`);
        logger.debug(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}

export const zephyrClient = new ZephyrClient();

