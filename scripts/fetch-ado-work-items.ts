#!/usr/bin/env ts-node

/**
 * Utility to fetch work items from Azure DevOps saved query and append to ADO-Work-Items.txt
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsClient } from '../src/integrations/azure-devops/client';
import { logger } from '../src/utils/logger';

const WORK_ITEMS_FILE = 'inputs/ADO-Work-Items.txt';
const QUERY_ID = '7abdba4d-c0dc-423d-b361-c98560bdf920';

/**
 * Read existing work item IDs from file
 */
function readWorkItemsFromFile(): Set<number> {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  if (!fs.existsSync(filePath)) {
    logger.warn(`${WORK_ITEMS_FILE} not found, will create new file`);
    return new Set();
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const workItemIds = new Set<number>();
  
  content
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      // Extract work item ID (e.g., "12345" or "12345 - Description")
      const match = trimmed.match(/^(\d+)/);
      if (match) {
        workItemIds.add(parseInt(match[1], 10));
      }
    });
  
  return workItemIds;
}

/**
 * Append work items to file
 */
function appendWorkItemsToFile(workItems: any[], existingIds: Set<number>): void {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  // Filter out work items that already exist
  const newWorkItems = workItems.filter(item => !existingIds.has(item.id));
  
  if (newWorkItems.length === 0) {
    logger.info('✅ All work items are already in the file');
    return;
  }

  // Prepare content to append
  const linesToAppend: string[] = [];
  newWorkItems.forEach(item => {
    const title = item.fields['System.Title'] || 'No title';
    const state = item.fields['System.State'] || 'Unknown';
    const type = item.fields['System.WorkItemType'] || 'Unknown';
    linesToAppend.push(`${item.id} - ${title} (${type} - ${state})`);
  });

  // Append to file
  const contentToAppend = '\n' + linesToAppend.join('\n') + '\n';
  fs.appendFileSync(filePath, contentToAppend, 'utf-8');
  
  logger.info(`✅ Appended ${newWorkItems.length} new work items to ${WORK_ITEMS_FILE}`);
}

/**
 * Main function to fetch and append work items
 */
async function fetchAndAppendWorkItems(): Promise<void> {
  try {
    logger.info('🔍 Fetching work items from Azure DevOps saved query...');
    
    // Initialize Azure DevOps client
    const client = new AzureDevOpsClient();
    
    logger.info(`📋 Query ID: ${QUERY_ID}`);
    
    // Execute saved query
    const workItems = await client.executeSavedQuery(QUERY_ID);
    
    logger.info(`✅ Found ${workItems.length} work items in the query`);
    
    // Read existing work items from file
    const existingIds = readWorkItemsFromFile();
    logger.info(`📄 Found ${existingIds.size} existing work items in ${WORK_ITEMS_FILE}`);
    
    // Display work items
    console.log('\n' + '='.repeat(80));
    console.log('📊 WORK ITEMS FROM AZURE DEVOPS QUERY');
    console.log('='.repeat(80));
    console.log(`\nTotal work items in query: ${workItems.length}`);
    console.log(`Existing work items in file: ${existingIds.size}`);
    
    if (workItems.length === 0) {
      console.log('\n⚠️  No work items found in the query');
    } else {
      console.log('\n📋 Work Items:');
      console.log('-'.repeat(80));
      
      workItems.forEach((item, index) => {
        const title = item.fields['System.Title'] || 'No title';
        const state = item.fields['System.State'] || 'Unknown';
        const type = item.fields['System.WorkItemType'] || 'Unknown';
        const isNew = !existingIds.has(item.id);
        const marker = isNew ? '🆕' : '✓';
        console.log(`${marker} ${index + 1}. ${item.id} - ${title}`);
        console.log(`     Type: ${type} | State: ${state}`);
        console.log('');
      });
    }
    
    // Append new work items to file
    appendWorkItemsToFile(workItems, existingIds);
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error: any) {
    logger.error('❌ Error fetching work items:', error);
    if (error.response) {
      logger.error(`Azure DevOps API Error: ${error.response.status} - ${error.response.statusText}`);
      if (error.response.data) {
        logger.error('Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fetchAndAppendWorkItems()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

