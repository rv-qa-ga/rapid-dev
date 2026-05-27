#!/usr/bin/env ts-node

/**
 * Create GitHub Runner and VM Setup Sub-Page in Confluence
 * 
 * This script:
 * 1. Creates a new sub-page "GitHub Self-Hosted Runner and VM Setup" under the main workflow guide
 * 2. Adds a link to the sub-page in the parent page
 * 
 * Usage:
 *   npm run docs:create:github-runner-subpage
 * 
 * Or directly:
 *   ts-node scripts/create-github-runner-vm-subpage.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`📁 Loaded env from: ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'TM';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';

const PARENT_PAGE_ID = '2692710418'; // QA Automation Framework - Complete Workflow Guide
const SUBPAGE_TITLE = 'GitHub Self-Hosted Runner and VM Setup';
const SUBPAGE_CONTENT_FILE = path.resolve(__dirname, '../docs/CONFLUENCE_GITHUB_RUNNER_VM_SETUP.txt');

/**
 * Convert Wiki Markup to Confluence Storage Format
 */
function wikiMarkupToStorageFormat(wikiMarkup: string): string {
  let html = wikiMarkup;
  
  // Headers (h1, h2, h3, h4)
  html = html.replace(/^h1\. (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^h2\. (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^h3\. (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^h4\. (.*$)/gim, '<h4>$1</h4>');
  
  // Bold
  html = html.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  
  // Code blocks {code}...{code}
  html = html.replace(/\{code(?::(\w+))?\}([\s\S]*?)\{code\}/g, (match, lang, code) => {
    const language = lang || 'text';
    return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${language}</ac:parameter>
  <ac:plain-text-body><![CDATA[${code.trim()}]]></ac:plain-text-body>
</ac:structured-macro>`;
  });
  
  // Inline code
  html = html.replace(/\{\{([^}]+)\}\}/g, '<code>$1</code>');
  
  // Links [text|url] or [text|page]
  html = html.replace(/\[([^\|]+)\|([^\]]+)\]/g, (match, text, url) => {
    if (url.startsWith('http')) {
      return `<a href="${url}">${text}</a>`;
    }
    return `<ac:link><ri:page ri:content-title="${url}" /><ac:link-body>${text}</ac:link-body></ac:link>`;
  });
  
  // Numbered lists (#)
  const lines = html.split('\n');
  const processed: string[] = [];
  let inList = false;
  let listType: 'ol' | 'ul' | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      if (inList) {
        processed.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      processed.push('');
      continue;
    }
    
    // Numbered list item
    if (trimmed.match(/^# (.+)$/)) {
      if (!inList || listType !== 'ol') {
        if (inList) {
          processed.push(`</${listType}>`);
        }
        processed.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processed.push(`<li>${trimmed.replace(/^# /, '')}</li>`);
      continue;
    }
    
    // Bullet list item
    if (trimmed.match(/^\* (.+)$/)) {
      if (!inList || listType !== 'ul') {
        if (inList) {
          processed.push(`</${listType}>`);
        }
        processed.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processed.push(`<li>${trimmed.replace(/^\* /, '')}</li>`);
      continue;
    }
    
    // Close list if needed
    if (inList) {
      processed.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
    
    // Check if it's already HTML
    if (trimmed.match(/^<[^>]+>/) || trimmed.match(/^<\/[^>]+>/) || trimmed.match(/^<ac:/) || trimmed.match(/^<ri:/)) {
      processed.push(line);
      continue;
    }
    
    // Wrap in paragraph
    processed.push(`<p>${line}</p>`);
  }
  
  // Close any open list
  if (inList && listType) {
    processed.push(`</${listType}>`);
  }
  
  html = processed.join('\n');
  
  return html;
}

/**
 * Create sub-page and add link to parent page
 */
async function createSubPageAndAddLink() {
  console.log('\n📄 Creating GitHub Runner and VM Setup Sub-Page');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    process.exit(1);
  }

  if (!fs.existsSync(SUBPAGE_CONTENT_FILE)) {
    console.error(`❌ Error: Sub-page content file not found: ${SUBPAGE_CONTENT_FILE}`);
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
    // Step 1: Read sub-page content
    console.log('📖 Reading sub-page content...');
    const wikiMarkup = fs.readFileSync(SUBPAGE_CONTENT_FILE, 'utf-8');
    const storageFormat = wikiMarkupToStorageFormat(wikiMarkup);
    console.log('   ✅ Content converted to Confluence storage format');

    // Step 2: Check if sub-page already exists
    console.log('\n🔍 Checking for existing sub-page...');
    try {
      const searchResponse = await client.get('/content/search', {
        params: {
          cql: `space = ${CONFLUENCE_SPACE_KEY} AND title = "${SUBPAGE_TITLE}" AND ancestor = ${PARENT_PAGE_ID}`,
          expand: 'version',
        },
      });

      if (searchResponse.data.results && searchResponse.data.results.length > 0) {
        const existingPage = searchResponse.data.results[0];
        const subPageId = existingPage.id;
        console.log(`   ℹ️  Found existing sub-page with ID: ${subPageId}`);
        console.log('   📝 Updating existing sub-page...');

        // Update existing page
        const updatePayload = {
          id: subPageId,
          type: 'page',
          title: SUBPAGE_TITLE,
          space: { key: CONFLUENCE_SPACE_KEY },
          body: {
            storage: {
              value: storageFormat,
              representation: 'storage',
            },
          },
          version: {
            number: existingPage.version.number + 1,
            message: 'Updated GitHub Runner and VM Setup documentation',
          },
        };

        await client.put(`/content/${subPageId}`, updatePayload);
        console.log('   ✅ Sub-page updated successfully');

        console.log('\n✅ Successfully updated existing sub-page!');
        console.log(`\n📎 Sub-page: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${subPageId}/${encodeURIComponent(SUBPAGE_TITLE)}`);
        return;
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.log('   ⚠️  Error checking for existing page:', error.message);
      }
    }

    // Step 3: Create new sub-page
    console.log('\n📝 Creating new sub-page...');
    const createPayload = {
      type: 'page',
      title: SUBPAGE_TITLE,
      space: { key: CONFLUENCE_SPACE_KEY },
      ancestors: [{ id: PARENT_PAGE_ID }],
      body: {
        storage: {
          value: storageFormat,
          representation: 'storage',
        },
      },
    };

    const { data: newPage } = await client.post('/content', createPayload);
    const subPageId = newPage.id;
    console.log(`   ✅ Sub-page created with ID: ${subPageId}`);

    // Step 4: Read parent page to add link
    console.log('\n📖 Reading parent page to add link...');
    const { data: parentPage } = await client.get(`/content/${PARENT_PAGE_ID}?expand=version,body.storage`);
    const currentContent = parentPage.body.storage.value;
    const currentVersion = parentPage.version.number;

    // Step 5: Add link to parent page (add at the end or in a specific section)
    console.log('\n🔗 Adding link to parent page...');
    
    // Create link macro
    const linkMacro = `<ac:structured-macro ac:name="children" ac:schema-version="2">
  <ac:parameter ac:name="all">true</ac:parameter>
  <ac:parameter ac:name="sort">title</ac:parameter>
</ac:structured-macro>

<p><ac:link><ri:page ri:content-id="${subPageId}" /><ac:link-body><strong>${SUBPAGE_TITLE}</strong></ac:link-body></ac:link></p>

<p>This page documents the setup and configuration of the self-hosted GitHub Actions runner on a Linux VM, including Jira automation integration for triggering tests.</p>`;

    // Add link at the end of the content (before closing tags if any)
    const updatedContent = currentContent + '\n\n' + linkMacro;
    console.log('   ✅ Link added to parent page');

    // Step 6: Update parent page
    console.log('\n📤 Updating parent page...');
    const updatePayload = {
      id: PARENT_PAGE_ID,
      type: 'page',
      title: parentPage.title,
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: updatedContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: 'Added GitHub Self-Hosted Runner and VM Setup sub-page',
      },
    };

    await client.put(`/content/${PARENT_PAGE_ID}`, updatePayload);
    console.log('   ✅ Parent page updated successfully');

    console.log('\n✅ Successfully created sub-page and added link!');
    console.log(`\n📎 Sub-page: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${subPageId}/${encodeURIComponent(SUBPAGE_TITLE)}`);
    console.log(`📎 Parent page: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PARENT_PAGE_ID}/QA+Automation+Framework+-+Complete+Workflow+Guide`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run the script
createSubPageAndAddLink().catch(console.error);
