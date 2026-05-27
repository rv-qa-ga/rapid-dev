#!/usr/bin/env ts-node

/**
 * Search for specific text in Confluence page content
 * 
 * Usage:
 *   npm run docs:search -- "9.6 Uploading Results to Zephyr"
 */

import axios from 'axios';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'TM';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';

const PAGE_ID = '2692710418';

async function searchContent(searchText: string) {
  console.log(`\n🔍 Searching for: "${searchText}"`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    process.exit(1);
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  const client = axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  try {
    console.log('📖 Reading Confluence page...');
    const { data: currentPage } = await client.get(`/content/${PAGE_ID}?expand=version,body.storage`);
    const currentContent = currentPage.body.storage.value;
    
    console.log(`   Page title: ${currentPage.title}\n`);

    // Search for the text (case insensitive)
    const searchRegex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const matches: Array<{ index: number; context: string }> = [];
    
    let match;
    while ((match = searchRegex.exec(currentContent)) !== null) {
      const start = Math.max(0, match.index - 200);
      const end = Math.min(currentContent.length, match.index + match[0].length + 200);
      const context = currentContent.substring(start, end);
      matches.push({
        index: match.index,
        context: context.replace(/\n/g, ' ').substring(0, 400),
      });
    }

    if (matches.length === 0) {
      console.log(`❌ Text not found. Trying variations...\n`);
      
      // Try variations
      const variations = [
        searchText.replace(/9\.6/, '9\\.6'),
        searchText.replace(/9\.6/, '9&#46;6'),
        'Uploading Results to Zephyr',
        'Zephyr',
      ];
      
      for (const variation of variations) {
        const varRegex = new RegExp(variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const varMatch = currentContent.match(varRegex);
        if (varMatch) {
          console.log(`✅ Found variation: "${variation}"`);
          const start = Math.max(0, (varMatch.index || 0) - 200);
          const end = Math.min(currentContent.length, (varMatch.index || 0) + (varMatch[0]?.length || 0) + 200);
          const context = currentContent.substring(start, end);
          console.log(`\nContext:\n${context.substring(0, 500)}...\n`);
        }
      }
    } else {
      console.log(`✅ Found ${matches.length} match(es):\n`);
      matches.forEach((m, i) => {
        console.log(`Match ${i + 1} (position ${m.index}):`);
        console.log(`...${m.context}...\n`);
      });
    }

    // Also search for headings near "Zephyr"
    console.log('\n📑 Searching for headings containing "Zephyr" or "Upload":\n');
    const headingPattern = /<h([1-6])>([^<]*(?:Zephyr|Upload|9\.6)[^<]*)<\/h[1-6]>/gi;
    let headingMatch;
    while ((headingMatch = headingPattern.exec(currentContent)) !== null) {
      console.log(`h${headingMatch[1]}: ${headingMatch[2]}`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
    }
    process.exit(1);
  }
}

const searchText = process.argv[2] || '9.6 Uploading Results to Zephyr';
searchContent(searchText);

