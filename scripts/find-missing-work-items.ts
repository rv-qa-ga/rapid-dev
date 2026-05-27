#!/usr/bin/env ts-node

/**
 * Utility to find JIRA work items that are in "Ready for QA" or "In QA" status
 * but are missing from the jira-work-items.txt file
 * 
 * Usage:
 *   npm run jira:find-missing              # List missing work items and prompt interactively
 *   npm run jira:find-missing -- --auto-add # List and automatically add ALL missing items to file
 *   npm run jira:find-missing -- -a         # Short form of --auto-add
 * 
 * Interactive Mode:
 *   - Lists all missing work items
 *   - Prompts user to add "all" or enter comma-separated list (e.g., SF-600,SF-601)
 *   - Validates input and adds selected items to jira-work-items.txt
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { JiraClient, JiraIssue } from '../src/integrations/jira/client';
import { config } from '../src/config/config';
import { logger } from '../src/utils/logger';

const WORK_ITEMS_FILE = 'inputs/jira-work-items.txt';

/**
 * Read work item IDs from jira-work-items.txt file
 */
function readWorkItemsFromFile(): string[] {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  if (!fs.existsSync(filePath)) {
    logger.warn(`${WORK_ITEMS_FILE} not found`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const workItems: string[] = [];
  
  content
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      // Skip empty lines
      if (!trimmed) {
        return;
      }
      // Extract work item ID from both regular lines and commented lines
      // Matches patterns like:
      // - "SF-529"
      // - "SF-529 - Uploaded and results updated"
      // - "#SF-529 - Regenerated"
      // - "#SF-529"
      const match = trimmed.match(/#?([A-Z]+-\d+)/);
      if (match && match[1]) {
        workItems.push(match[1]);
      }
    });
  
  return workItems;
}

/**
 * Prompt user for input
 */
function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Append work items to jira-work-items.txt file
 */
function appendWorkItemsToFile(workItems: JiraIssue[], existingKeys: Set<string>): void {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  // Filter out work items that already exist
  const newWorkItems = workItems.filter((issue: JiraIssue) => {
    const issueKey = issue.key.toUpperCase();
    return !existingKeys.has(issueKey);
  });
  
  if (newWorkItems.length === 0) {
    logger.info('✅ All work items are already in the file');
    return;
  }

  // Prepare content to append (only work item IDs)
  const linesToAppend: string[] = [];
  newWorkItems.forEach((issue: JiraIssue) => {
    linesToAppend.push(issue.key);
  });

  // Append to file
  const contentToAppend = '\n' + linesToAppend.join('\n') + '\n';
  fs.appendFileSync(filePath, contentToAppend, 'utf-8');
  
  logger.info(`✅ Appended ${newWorkItems.length} new work item(s) to ${WORK_ITEMS_FILE}`);
}

/**
 * Append selected work items to jira-work-items.txt file
 */
function appendSelectedWorkItems(selectedItems: JiraIssue[]): void {
  if (selectedItems.length === 0) {
    logger.info('⚠️  No items selected to add');
    return;
  }

  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  // Prepare content to append (only work item IDs)
  const linesToAppend: string[] = [];
  selectedItems.forEach((issue: JiraIssue) => {
    linesToAppend.push(issue.key);
  });

  // Append to file
  const contentToAppend = '\n' + linesToAppend.join('\n') + '\n';
  fs.appendFileSync(filePath, contentToAppend, 'utf-8');
  
  logger.info(`✅ Appended ${selectedItems.length} work item(s) to ${WORK_ITEMS_FILE}`);
}

/**
 * Main function to find missing work items
 */
async function findMissingWorkItems(): Promise<void> {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const autoAdd = args.includes('--auto-add') || args.includes('-a');
    
    logger.info('🔍 Finding missing work items...');
    
    if (autoAdd) {
      logger.info('📝 Auto-add mode: Missing work items will be automatically added to the file');
    }
    
    // Initialize JIRA client
    const jiraClient = new JiraClient();
    const jiraConfig = config.getJiraConfig();
    const projectKey = jiraConfig.projectKey;
    
    logger.info(`📋 Project Key: ${projectKey}`);
    
    // Build JQL query for Stories in "Ready for QA" or "In QA" status
    const jql = `project = ${projectKey} AND issuetype = Story AND status IN ("Ready for QA", "In QA") ORDER BY key ASC`;
    
    logger.info(`🔎 Searching JIRA with JQL: ${jql}`);
    
    // Fetch work items from JIRA
    const searchResult = await jiraClient.searchIssues(jql);
    const jiraIssues: JiraIssue[] = searchResult.issues;
    
    logger.info(`✅ Found ${jiraIssues.length} work items in JIRA`);
    
    // Read work items from file
    const fileWorkItems = readWorkItemsFromFile();
    logger.info(`📄 Found ${fileWorkItems.length} work items in ${WORK_ITEMS_FILE}`);
    
    // Create a Set for faster lookup (normalize to uppercase for comparison)
    const fileWorkItemsSet = new Set(fileWorkItems.map(item => item.toUpperCase()));
    
    // Debug: Show some items from file for verification
    logger.debug(`Sample file work items: ${fileWorkItems.slice(0, 5).join(', ')}`);
    logger.debug(`Sample JIRA work items: ${jiraIssues.slice(0, 5).map((i: JiraIssue) => i.key).join(', ')}`);
    
    // Find missing work items
    const missingWorkItems = jiraIssues.filter((issue: JiraIssue) => {
      const issueKey = issue.key.toUpperCase();
      const isMissing = !fileWorkItemsSet.has(issueKey);
      if (!isMissing) {
        logger.debug(`Found match: ${issue.key} is in file`);
      }
      return isMissing;
    });
    
    // Display results
    console.log('\n' + '='.repeat(80));
    console.log('📊 MISSING WORK ITEMS REPORT');
    console.log('='.repeat(80));
    console.log(`\nTotal work items in JIRA (Ready for QA / In QA): ${jiraIssues.length}`);
    console.log(`Total work items in ${WORK_ITEMS_FILE}: ${fileWorkItems.length}`);
    console.log(`Missing work items: ${missingWorkItems.length}`);
    
    if (missingWorkItems.length === 0) {
      console.log('\n✅ All work items are already in the file!');
    } else {
      console.log('\n📋 Missing Work Items:');
      console.log('-'.repeat(80));
      
      missingWorkItems.forEach((issue: JiraIssue, index: number) => {
        const status = issue.fields.status.name;
        const summary = issue.fields.summary || 'No summary';
        console.log(`${index + 1}. ${issue.key} - ${summary}`);
        console.log(`   Status: ${status}`);
        console.log('');
      });
      
      // Auto-add if flag is set
      if (autoAdd) {
        console.log('\n📝 Auto-adding missing work items to file...');
        appendWorkItemsToFile(missingWorkItems, fileWorkItemsSet);
        console.log(`\n✅ Successfully added ${missingWorkItems.length} work item(s) to ${WORK_ITEMS_FILE}`);
      } else {
        // Interactive mode: ask user what to add
        console.log('\n' + '='.repeat(80));
        console.log('📝 ADD WORK ITEMS');
        console.log('='.repeat(80));
        console.log('\nOptions:');
        console.log('  • Type "all" to add all missing work items');
        console.log('  • Type comma-separated work item keys (e.g., SF-600,SF-601,SF-602)');
        console.log('  • Type "skip" or press Enter to skip adding items');
        console.log('');
        
        const answer = await promptUser('What would you like to add? ');
        
        if (answer.toLowerCase() === 'all') {
          console.log('\n📝 Adding all missing work items to file...');
          appendWorkItemsToFile(missingWorkItems, fileWorkItemsSet);
          console.log(`\n✅ Successfully added ${missingWorkItems.length} work item(s) to ${WORK_ITEMS_FILE}`);
        } else if (answer.toLowerCase() === 'skip' || answer === '') {
          console.log('\n⏭️  Skipped adding work items');
        } else {
          // Parse comma-separated list
          const requestedKeys = answer
            .split(',')
            .map(key => key.trim().toUpperCase())
            .filter(key => key.length > 0);
          
          if (requestedKeys.length === 0) {
            console.log('\n⚠️  No valid work item keys provided');
          } else {
            // Create a map for quick lookup
            const missingItemsMap = new Map<string, JiraIssue>();
            missingWorkItems.forEach((issue: JiraIssue) => {
              missingItemsMap.set(issue.key.toUpperCase(), issue);
            });
            
            // Find requested items that are actually missing
            const selectedItems: JiraIssue[] = [];
            const invalidKeys: string[] = [];
            
            requestedKeys.forEach(key => {
              const issue = missingItemsMap.get(key);
              if (issue) {
                selectedItems.push(issue);
              } else {
                // Check if it's already in the file
                if (fileWorkItemsSet.has(key)) {
                  console.log(`   ⚠️  ${key} is already in the file, skipping`);
                } else {
                  invalidKeys.push(key);
                }
              }
            });
            
            if (invalidKeys.length > 0) {
              console.log(`\n⚠️  Invalid or not found work item keys: ${invalidKeys.join(', ')}`);
              console.log('   These items are not in the missing items list');
            }
            
            if (selectedItems.length > 0) {
              console.log(`\n📝 Adding ${selectedItems.length} selected work item(s) to file...`);
              appendSelectedWorkItems(selectedItems);
              console.log(`\n✅ Successfully added ${selectedItems.length} work item(s) to ${WORK_ITEMS_FILE}`);
            } else {
              console.log('\n⚠️  No valid items to add');
            }
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
  } catch (error: any) {
    logger.error('❌ Error finding missing work items:', error);
    if (error.response) {
      logger.error(`JIRA API Error: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        logger.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  findMissingWorkItems()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

