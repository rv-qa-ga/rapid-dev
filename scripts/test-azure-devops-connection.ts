#!/usr/bin/env ts-node

/**
 * Utility to test Azure DevOps connection and list basic information
 */

import { AzureDevOpsClient } from '../src/integrations/azure-devops/client';
import { logger } from '../src/utils/logger';

async function testConnection(): Promise<void> {
  try {
    logger.info('🔍 Testing Azure DevOps connection...');
    
    const client = new AzureDevOpsClient();
    
    // Test 1: Get projects
    logger.info('\n📋 Fetching projects...');
    const projects = await client.getProjects();
    console.log(`\n✅ Found ${projects.length} projects:`);
    projects.slice(0, 10).forEach(project => {
      console.log(`   - ${project.name} (${project.id}) - ${project.state}`);
    });
    if (projects.length > 10) {
      console.log(`   ... and ${projects.length - 10} more`);
    }
    
    // Test 2: Query work items by state
    logger.info('\n📋 Fetching work items in "Ready for QA" or "In QA" state...');
    const workItems = await client.getWorkItemsByState(
      ['Ready for QA', 'In QA'],
      ['User Story', 'Story', 'Bug', 'Task']
    );
    
    console.log(`\n✅ Found ${workItems.length} work items:`);
    workItems.slice(0, 10).forEach(item => {
      const title = item.fields['System.Title'] || 'No title';
      const state = item.fields['System.State'] || 'Unknown';
      const type = item.fields['System.WorkItemType'] || 'Unknown';
      console.log(`   - ${item.id}: ${title} (${type} - ${state})`);
    });
    if (workItems.length > 10) {
      console.log(`   ... and ${workItems.length - 10} more`);
    }
    
    logger.info('\n✅ Azure DevOps connection test completed successfully!');
    
  } catch (error: any) {
    logger.error('❌ Error testing Azure DevOps connection:', error);
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
  testConnection()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

