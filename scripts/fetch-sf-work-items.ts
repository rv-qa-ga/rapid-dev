#!/usr/bin/env ts-node
/**
 * Fetch SF work items from JIRA
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { jiraClient } from '../src/integrations/jira/client';
import { logger } from '../src/utils/logger';

// Load environment
const envPaths = [
  path.resolve(process.cwd(), 'src/config/env/.env.qa'),
  path.resolve(process.cwd(), '.env.qa'),
];

for (const envPath of envPaths) {
  if (require('fs').existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

async function fetchWorkItems() {
  const workItems = ['SF-596', 'SF-599', 'SF-600', 'SF-606', 'SF-593', 'SF-594', 'SF-595', 'SF-605'];
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         📋 FETCHING SF WORK ITEMS FROM JIRA                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  for (const key of workItems) {
    try {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`Fetching: ${key}`);
      console.log(`${'─'.repeat(60)}`);
      
      const issue = await jiraClient.getIssueWithFullDetails(key);
      
      console.log(`✅ Key: ${issue.key}`);
      console.log(`   Summary: ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype?.name || 'N/A'}`);
      console.log(`   Status: ${issue.fields.status?.name || 'N/A'}`);
      console.log(`   Priority: ${issue.fields.priority?.name || 'N/A'}`);
      
      if (issue.fields.description) {
        const desc = typeof issue.fields.description === 'string' 
          ? issue.fields.description 
          : JSON.stringify(issue.fields.description);
        console.log(`   Description: ${desc.substring(0, 300)}...`);
      }
      
    } catch (error: any) {
      console.error(`❌ Error fetching ${key}: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
      }
    }
  }
  
  console.log('\n✅ Done!\n');
}

fetchWorkItems().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
