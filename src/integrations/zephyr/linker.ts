/**
 * Shared utility for linking Zephyr test cases to Jira work items
 * 
 * This module provides reusable linking functionality used by:
 * - upload-and-link.ts
 * - link-to-jira.ts
 */

import { zephyrClient } from './client';
import { jiraClient } from '../jira/client';
import { logger } from '../../utils/logger';
import { parseJiraKey, extractProjectPrefix } from '../../utils/helpers';

export interface LinkResult {
  testCaseKey: string;
  testCaseName: string;
  success: boolean;
  error?: string;
  action: 'linked' | 'skipped' | 'failed';
}

export interface LinkOptions {
  workItem: string;
  testCases: any[]; // Zephyr test cases to link
  dryRun?: boolean;
}

export class ZephyrLinker {
  /**
   * Link test cases to a Jira work item
   */
  async linkTestCases(options: LinkOptions): Promise<LinkResult[]> {
    const { workItem, testCases, dryRun = false } = options;
    const results: LinkResult[] = [];
    const workItemPrefix = (workItem || '').trim(); // e.g. SF-648

    try {
      // Step 1: Verify Jira work item exists
      logger.info(`📋 Linking to Jira work item: ${workItemPrefix}`);
      logger.info(`📋 Verifying Jira work item exists...`);
      let jiraIssue;
      try {
        jiraIssue = await jiraClient.getIssue(workItem);
        logger.info(`✅ Found Jira work item: ${jiraIssue.fields.summary}`);
      } catch (error: any) {
        logger.error(`❌ Failed to fetch Jira work item ${workItem}: ${error.message}`);
        // Return failed results for all test cases
        for (const testCase of testCases) {
          const tcAny = testCase as any;
          results.push({
            testCaseKey: tcAny.key || 'UNKNOWN',
            testCaseName: tcAny.name || 'Unknown',
            success: false,
            error: `Jira work item not found: ${error.message}`,
            action: 'failed',
          });
        }
        return results;
      }

      // Step 2: Get Jira issue ID (internal ID required by Zephyr API)
      logger.info(`🔍 Getting Jira issue ID...`);
      const jiraIssueId = await jiraClient.getIssueId(workItem);
      logger.info(`✅ Jira issue ID: ${jiraIssueId}`);

      // Step 3: Check existing links
      logger.info(`🔍 Checking for existing links...`);
      const existingLinks = await jiraClient.getRemoteIssueLinks(workItem);
      const existingZephyrLinks = existingLinks.filter((link: any) => {
        const globalId = link.globalId || '';
        return globalId.startsWith('zephyr-testcase-');
      });
      const existingKeys = existingZephyrLinks.map((link: any) => {
        const globalId = link.globalId || '';
        const match = globalId.match(/zephyr-testcase-(.+)/);
        return match ? match[1] : 'unknown';
      });
      logger.debug(`   Found ${existingKeys.length} existing Zephyr link(s)`);

      // Step 4: Link test cases
      if (dryRun) {
        logger.info(`\n   [DRY RUN] Would link the following test cases:`);
        testCases.forEach((tc: any) => {
          const key = tc.key || tc.testCaseKey || 'N/A';
          const name = tc.name || 'N/A';
          logger.info(`   - ${key}: ${name}`);
        });
        logger.info(`\n   Run without --dry-run to actually create the links.`);
        
        // Return dry-run results
        for (const testCase of testCases) {
          const tcAny = testCase as any;
          results.push({
            testCaseKey: tcAny.key || 'UNKNOWN',
            testCaseName: tcAny.name || 'Unknown',
            success: true,
            action: 'linked',
          });
        }
        return results;
      }

      logger.info(`\n🔗 Linking ${testCases.length} test case(s) to Jira work item: ${workItemPrefix}`);
      
      for (const testCase of testCases) {
        const tcAny = testCase as any;
        const testCaseKey = tcAny.key || tcAny.testCaseKey;
        const testCaseName = tcAny.name || 'Unnamed Test Case';
        const labels: string[] = tcAny.labels || [];
        
        if (!testCaseKey) {
          logger.warn(`⚠️  Skipping test case without key: ${testCaseName}`);
          results.push({
            testCaseKey: 'UNKNOWN',
            testCaseName,
            success: false,
            error: 'Test case key not found',
            action: 'failed',
          });
          continue;
        }

        // Safeguard: ensure this test case belongs to the work item we're linking to
        // (prevents linking to wrong Jira issue if wrong list is passed)
        const nameOrLabelsMatch = testCaseName.startsWith(workItemPrefix) ||
          labels.some((l: string) => l === workItemPrefix || l.startsWith(workItemPrefix + '-'));
        if (!nameOrLabelsMatch) {
          logger.warn(`⚠️  Skipping ${testCaseKey}: name/labels do not match work item "${workItemPrefix}" (avoid linking to wrong issue)`);
          results.push({
            testCaseKey,
            testCaseName,
            success: false,
            error: `Test case does not belong to work item ${workItemPrefix}`,
            action: 'failed',
          });
          continue;
        }

        // Check if link already exists
        const linkExists = existingKeys.includes(testCaseKey);
        if (linkExists) {
          logger.debug(`   ⏭️  Link already exists for ${testCaseKey}, skipping`);
          results.push({
            testCaseKey,
            testCaseName,
            success: true,
            action: 'skipped',
          });
          continue;
        }

        try {
          await zephyrClient.linkTestCaseToJiraIssue(testCaseKey, jiraIssueId);
          logger.info(`   ✅ Linked: ${testCaseKey} - ${testCaseName}`);
          results.push({
            testCaseKey,
            testCaseName,
            success: true,
            action: 'linked',
          });
        } catch (error: any) {
          logger.error(`   ❌ Failed to link ${testCaseKey}: ${error.message}`);
          results.push({
            testCaseKey,
            testCaseName,
            success: false,
            error: error.message,
            action: 'failed',
          });
        }
      }

      return results;
    } catch (error: any) {
      logger.error(`❌ Fatal error during linking: ${error.message}`);
      // Return failed results for all test cases
      for (const testCase of testCases) {
        const tcAny = testCase as any;
        results.push({
          testCaseKey: tcAny.key || 'UNKNOWN',
          testCaseName: tcAny.name || 'Unknown',
          success: false,
          error: error.message,
          action: 'failed',
        });
      }
      return results;
    }
  }

  /**
   * Find test cases for a work item (by label or name pattern)
   * Includes retries to handle Zephyr indexing delays
   */
  async findTestCasesForWorkItem(workItem: string, projectKey?: string, retries: number = 3): Promise<any[]> {
    const parsedKey = parseJiraKey(workItem);
    if (!parsedKey) {
      logger.warn(`⚠️  Invalid work item format: ${workItem}`);
      return [];
    }

    // Extract project key from work item if not provided (e.g., ST-234 -> ST, SF-520 -> SF)
    const extractedProjectKey = extractProjectPrefix(workItem);
    const searchProjectKey = projectKey || extractedProjectKey || process.env.ZEPHYR_PROJECT_KEY || 'SF';
    
    if (!projectKey && extractedProjectKey) {
      logger.debug(`📋 Using project key "${searchProjectKey}" extracted from work item "${workItem}"`);
    } else if (!extractedProjectKey) {
      logger.warn(`⚠️  Could not extract project key from work item "${workItem}". Using default: ${searchProjectKey}`);
    }
    const foundKeys = new Set<string>();
    const allTestCases: any[] = [];
    
    // Try multiple times with delays to handle Zephyr indexing
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Always search by both label AND name pattern (like checkForDuplicates does)
        // This ensures we find test cases even if they don't have the work item label
        
        // Step 1: Search by label
        logger.debug(`[Attempt ${attempt}/${retries}] Searching for test cases with label: "${parsedKey}"`);
        const byLabel = await zephyrClient.searchTestCasesByLabel(parsedKey, searchProjectKey);
        byLabel.forEach((tc: any) => {
          const key = tc.key || (tc as any).key;
          if (key && !foundKeys.has(key)) {
            allTestCases.push(tc);
            foundKeys.add(key);
          }
        });
        logger.debug(`   Found ${byLabel.length} test case(s) by label`);
        
        // Step 2: Always also search by name pattern (even if label search found results)
        // This catches test cases that exist but don't have the work item label
        logger.debug(`[Attempt ${attempt}/${retries}] Searching for test cases by name pattern "${parsedKey}:"...`);
        try {
          const isZephyrScaleCloud = (zephyrClient as any).isZephyrScaleCloud;
          if (isZephyrScaleCloud) {
            // Fetch test cases with pagination, filtering as we go (more efficient for large datasets)
            let startAt = 0;
            const maxResults = 1000;
            let hasMore = true;
            let totalScanned = 0;
            const workItemPattern = new RegExp(`^${parsedKey}(-|$)`); // Matches "SF-567" or "SF-567-UI-001"
            
            while (hasMore) {
              const response = await (zephyrClient as any).client.get(
                `/testcases?projectKey=${encodeURIComponent(searchProjectKey)}&startAt=${startAt}&maxResults=${maxResults}`
              );
              
              // Debug: Log response structure on first page
              if (startAt === 0) {
                logger.debug(`   API Response structure: ${JSON.stringify(Object.keys(response.data || {}))}`);
                if (response.data && typeof response.data === 'object') {
                  logger.debug(`   Response keys: ${Object.keys(response.data).join(', ')}`);
                  if ('total' in response.data) {
                    logger.debug(`   Total test cases in project: ${response.data.total}`);
                  }
                  if ('isLast' in response.data) {
                    logger.debug(`   Is last page: ${response.data.isLast}`);
                  }
                }
              }
              
              const data: { values?: any[]; data?: any[]; total?: number; isLast?: boolean; startAt?: number; maxResults?: number } = response.data;
              const pageTestCases = data.values || data.data || [];
              
              if (Array.isArray(pageTestCases)) {
                totalScanned += pageTestCases.length;
                
                // Filter by name that starts with work item OR by test case ID pattern (filter during pagination)
                const pageMatches = pageTestCases.filter((tc: any) => {
                  const labels = tc.labels || [];
                  const name = tc.name || '';
                  
                  // Check name first (more reliable immediately after creation)
                  // Match names like "SF-570-UI-001: ..." or "SF-570: ..."
                  if (name.startsWith(parsedKey)) {
                    return true;
                  }
                  
                  // Check labels for test case ID pattern (e.g., SF-567-UI-001, SF-567-API-001)
                  return labels.some((l: string) => {
                    // Match test case ID pattern (e.g., SF-567-UI-001, SF-567-API-001)
                    if (workItemPattern.test(l)) return true;
                    return false;
                  });
                });
                
                // Add unique test cases from this page
                pageMatches.forEach((tc: any) => {
                  const key = tc.key || (tc as any).key;
                  if (key && !foundKeys.has(key)) {
                    allTestCases.push(tc);
                    foundKeys.add(key);
                  }
                });
                
                logger.debug(`   Scanned page ${Math.floor(startAt / maxResults) + 1}: ${pageTestCases.length} test cases, found ${pageMatches.length} matches (total scanned: ${totalScanned}, total matches: ${allTestCases.length})`);
              }
              
              // Check if there are more pages
              if (data.isLast === false && pageTestCases.length === maxResults) {
                startAt += maxResults;
                hasMore = true;
              } else {
                hasMore = false;
              }
              
              // Safety check: don't fetch more than 10,000 test cases
              if (totalScanned >= 10000) {
                logger.warn(`   Reached safety limit of 10,000 test cases. Stopping pagination.`);
                hasMore = false;
              }
            }
            
            logger.info(`   Found ${allTestCases.length} test case(s) by name pattern (scanned ${totalScanned} total test cases)`);
            
            // If we found test cases but they weren't in the label search, log some examples
            const nameOnlyMatches = allTestCases.filter((tc: any) => {
              const key = tc.key || (tc as any).key;
              return !byLabel.some((btc: any) => (btc.key || (btc as any).key) === key);
            });
            
            if (nameOnlyMatches.length > 0 && byLabel.length === 0) {
              logger.debug(`   Sample test case names found:`);
              nameOnlyMatches.slice(0, 3).forEach((tc: any) => {
                logger.debug(`     - ${tc.key || (tc as any).key}: ${tc.name}`);
                logger.debug(`       Labels: ${(tc.labels || []).join(', ')}`);
              });
            }
          }
        } catch (nameSearchError: any) {
          logger.warn(`   Name pattern search failed: ${nameSearchError.message}`);
          if (nameSearchError.response) {
            logger.debug(`   API Error Response: ${JSON.stringify(nameSearchError.response.data)}`);
          }
        }
        
        // If we found test cases, return them
        if (allTestCases.length > 0) {
          logger.info(`✅ Found ${allTestCases.length} test case(s) for "${workItem}" (attempt ${attempt}/${retries})`);
          return allTestCases;
        }
        
        // If no results and we have more attempts, wait and retry
        if (attempt < retries) {
          const delayMs = 2000 * attempt; // 2s, 4s, 6s...
          logger.debug(`   No test cases found. Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      } catch (error: any) {
        logger.debug(`   Search attempt ${attempt} failed: ${error.message}`);
        if (attempt < retries) {
          const delayMs = 2000 * attempt;
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    if (allTestCases.length === 0) {
      logger.warn(`⚠️  No test cases found for "${workItem}" after ${retries} attempts.`);
      logger.warn(`   This could mean:`);
      logger.warn(`   - Test cases haven't been uploaded to Zephyr yet`);
      logger.warn(`   - Test cases exist but don't have labels matching "${parsedKey}"`);
      logger.warn(`   - Test cases are in a different project`);
      logger.warn(`   - Test cases are still being indexed by Zephyr (try again in a few minutes)`);
    }
    
    return allTestCases;
  }
}

