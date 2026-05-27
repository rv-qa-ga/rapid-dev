/**
 * Delete a Confluence page by ID
 */

import axios from 'axios';
import { config } from '../src/config/config';
import { logger } from '../src/utils/logger';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
const envFile = path.resolve(__dirname, `../src/config/env/.env.${config.getEnvironment()}`);
dotenv.config({ path: envFile });

async function deleteConfluencePage(pageId: string) {
  const email = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL;
  const apiToken = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN;
  const baseURL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';

  if (!email || !apiToken) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    process.exit(1);
  }

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const client = axios.create({
    baseURL: `${baseURL}/rest/api`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  try {
    console.log(`🗑️  Deleting Confluence page: ${pageId}`);
    
    // First, get the page to confirm it exists
    const { data: page } = await client.get(`/content/${pageId}?expand=space`);
    console.log(`   Title: ${page.title}`);
    console.log(`   Space: ${page.space.name} (${page.space.key})`);
    
    // Delete the page
    await client.delete(`/content/${pageId}`);
    
    console.log(`\n✅ Page deleted successfully!`);
  } catch (error: any) {
    console.error(`\n❌ Error deleting page: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

// Get page ID from command line
const pageId = process.argv[2];
if (!pageId) {
  console.error('❌ Error: Please provide a page ID');
  console.error('   Usage: npx ts-node scripts/delete-confluence-page.ts <page-id>');
  process.exit(1);
}

deleteConfluencePage(pageId);
