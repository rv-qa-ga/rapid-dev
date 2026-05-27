#!/usr/bin/env ts-node

/**
 * List all sections (headings) in a Confluence page
 * 
 * Usage:
 *   npm run docs:list:sections
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

async function listSections() {
  console.log('\n📋 Listing Sections in Confluence Page');
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
    
    console.log(`   Page title: ${currentPage.title}`);
    console.log(`   Content size: ${(currentContent.length / 1024).toFixed(1)} KB\n`);

    // Extract all headings
    const headingPattern = /<h([1-6])>([^<]+)<\/h[1-6]>/gi;
    const headings: Array<{ level: number; text: string; fullMatch: string }> = [];
    let match;

    while ((match = headingPattern.exec(currentContent)) !== null) {
      headings.push({
        level: parseInt(match[1], 10),
        text: match[2].trim(),
        fullMatch: match[0],
      });
    }

    if (headings.length === 0) {
      console.log('⚠️  No headings found in the page.');
      return;
    }

    console.log(`📑 Found ${headings.length} section(s):\n`);
    
    // Group by level and display
    headings.forEach((heading, index) => {
      const indent = '  '.repeat(heading.level - 1);
      const levelMarker = '#'.repeat(heading.level);
      console.log(`${indent}${levelMarker} ${heading.text}`);
      console.log(`${indent}   (Use this exact text: "${heading.text}")`);
      if (index < headings.length - 1) console.log('');
    });

    // Also look for Zephyr-related sections
    console.log('\n\n🔍 Zephyr-related sections:');
    const zephyrSections = headings.filter(h => 
      h.text.toLowerCase().includes('zephyr') || 
      h.text.toLowerCase().includes('upload')
    );
    
    if (zephyrSections.length > 0) {
      zephyrSections.forEach(section => {
        console.log(`   - ${section.text} (h${section.level})`);
      });
    } else {
      console.log('   No Zephyr-related sections found.');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

listSections();

