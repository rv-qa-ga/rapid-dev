#!/usr/bin/env ts-node

/**
 * Create Zephyr Link Utility Sub-Page and Link from Section 11.10
 * 
 * This script:
 * 1. Creates a new sub-page "Zephyr Test Case Linking Utility" under the main workflow guide
 * 2. Adds a link to the sub-page in section 11.10 (Jira Integration)
 * 
 * Usage:
 *   npm run docs:create:zephyr-link-subpage
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../src/config/env/.env.qa'),
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

const PARENT_PAGE_ID = '2692710418';
const SUBPAGE_TITLE = 'Jira Sync Utilities';
const SUBPAGE_CONTENT_FILE = path.resolve(__dirname, '../docs/CONFLUENCE_JIRA_SYNC_UTILITIES_CONFLUENCE.txt');
const SECTION_11_10_ADDITION_FILE = path.resolve(__dirname, '../docs/CONFLUENCE_SECTION_11_10_ADDITION.txt');

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
  html = html.replace(/\{code\}([\s\S]*?)\{code\}/g, (match, code) => {
    // Check if there's a language parameter
    const langMatch = code.match(/^language=(\w+)\n/);
    const language = langMatch ? langMatch[1] : 'text';
    const codeContent = langMatch ? code.substring(langMatch[0].length) : code;
    
    return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${language}</ac:parameter>
  <ac:plain-text-body><![CDATA[${codeContent.trim()}]]></ac:plain-text-body>
</ac:structured-macro>`;
  });
  
  // Inline code
  html = html.replace(/\{\{([^}]+)\}\}/g, '<code>$1</code>');
  
  // Links [text|page]
  html = html.replace(/\[([^\|]+)\|([^\]]+)\]/g, '<ac:link><ri:page ri:content-title="$2" /><ac:link-body>$1</ac:link-body></ac:link>');
  
  // Numbered lists (#)
  html = html.replace(/^# (.+)$/gim, '<li>$1</li>');
  // Wrap consecutive list items in <ol>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    return '<ol>' + match + '</ol>';
  });
  
  // Bullet lists (*)
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  // Wrap consecutive list items in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
    // Check if already wrapped
    if (!match.includes('<ol>') && !match.includes('<ul>')) {
      return '<ul>' + match + '</ul>';
    }
    return match;
  });
  
  // Paragraphs (lines that aren't already HTML)
  const lines = html.split('\n');
  const processed: string[] = [];
  let inList = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (!trimmed) {
      if (inList) {
        inList = false;
      }
      processed.push('');
      continue;
    }
    
    // Check if it's a list item
    if (trimmed.startsWith('<li>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<ul>')) {
      inList = true;
      processed.push(line);
      continue;
    }
    
    // Check if it's a closing list tag
    if (trimmed === '</ol>' || trimmed === '</ul>') {
      inList = false;
      processed.push(line);
      continue;
    }
    
    // Check if it's already HTML
    if (trimmed.match(/^<[^>]+>/) || trimmed.match(/^<\/[^>]+>/) || trimmed.match(/^<ac:/) || trimmed.match(/^<ri:/)) {
      processed.push(line);
      continue;
    }
    
    // Wrap in paragraph
    processed.push(`<p>${line}</p>`);
  }
  
  html = processed.join('\n');
  
  return html;
}

/**
 * Find section 11.10 in the content
 */
function findSection1110(content: string): { start: number; end: number } | null {
  // Look for "11.10" or "Jira Integration" heading - try multiple patterns
  const patterns = [
    /<h[1-6]>[^<]*11\.10[^<]*Jira Integration[^<]*<\/h[1-6]>/i,
    /<h[1-6]>[^<]*Jira Integration[^<]*<\/h[1-6]>/i,
    /<p><strong>11\.10[^<]*Jira Integration[^<]*<\/strong><\/p>/i,
    /11\.10[^<]*Jira Integration/i,  // More flexible pattern
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      const start = match.index;
      const headingEnd = start + match[0].length;
      
      // Find the end - look for next section (11.11 or 12. or next h1/h2)
      const nextSectionPattern = /(?:<h[1-2]>|<p><strong>)[^<]*(?:11\.11|12\.|11\.\d+)/i;
      const nextMatch = content.substring(headingEnd).match(nextSectionPattern);
      
      const end = nextMatch && nextMatch.index !== undefined
        ? headingEnd + nextMatch.index
        : content.length;
      
      return { start, end };
    }
  }
  
  // Last resort: search for "Jira Integration" anywhere in the content
  const jiraIntegrationIndex = content.toLowerCase().indexOf('jira integration');
  if (jiraIntegrationIndex !== -1) {
    // Find a reasonable section boundary
    const sectionStart = Math.max(0, jiraIntegrationIndex - 200);
    const sectionEnd = Math.min(content.length, jiraIntegrationIndex + 5000);
    return { start: sectionStart, end: sectionEnd };
  }
  
  return null;
}

/**
 * Create sub-page and add link to section 11.10
 */
async function createSubPageAndAddLink() {
  console.log('\n📄 Creating Zephyr Link Utility Sub-Page and Adding Link');
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
    console.log(`   Content size: ${(storageFormat.length / 1024).toFixed(1)} KB`);

    // Step 2: Check if sub-page already exists
    console.log('\n🔍 Checking if sub-page already exists...');
    try {
      const { data: existingPages } = await client.get(
        `/content?spaceKey=${CONFLUENCE_SPACE_KEY}&title=${encodeURIComponent(SUBPAGE_TITLE)}&expand=ancestors`
      );
      
      const subPage = existingPages.results?.find((page: any) => {
        return page.title === SUBPAGE_TITLE && 
               page.ancestors?.some((ancestor: any) => ancestor.id === PARENT_PAGE_ID);
      });
      
      if (subPage) {
        console.log(`   ⚠️  Sub-page already exists with ID: ${subPage.id}`);
        console.log('   Updating existing sub-page...');
        
        // Update existing page
        const { data: currentPage } = await client.get(`/content/${subPage.id}?expand=version`);
        const subPageUpdatePayload = {
          id: subPage.id,
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
            number: currentPage.version.number + 1,
            message: 'Updated Jira Sync Utilities documentation',
          },
        };
        
        await client.put(`/content/${subPage.id}`, subPageUpdatePayload);
        console.log('   ✅ Sub-page updated successfully');
        
        // Use existing page ID for linking
        const subPageId = subPage.id;
        
        // Step 3: Read parent page and add link
        console.log('\n📖 Reading parent page to add link...');
        const { data: parentPage } = await client.get(`/content/${PARENT_PAGE_ID}?expand=version,body.storage`);
        const currentVersion = parentPage.version.number;
        let currentContent = parentPage.body.storage.value;
        
        console.log(`   Current version: ${currentVersion}`);
        
        // Step 4: Find section 11.10 and add link
        const section = findSection1110(currentContent);
        if (!section) {
          console.log('   ⚠️  Section 11.10 not found. Adding link at the end of the page...');
          // Read the addition content
          const additionContent = fs.existsSync(SECTION_11_10_ADDITION_FILE)
            ? wikiMarkupToStorageFormat(fs.readFileSync(SECTION_11_10_ADDITION_FILE, 'utf-8'))
            : `<h4>11.10.1 Zephyr Test Case Linking Utility</h4>
<p>The Zephyr Link Utility allows you to automatically link Zephyr Scale test cases to Jira work items.</p>
<p><ac:link><ri:page ri:content-title="${SUBPAGE_TITLE}" /><ac:link-body>${SUBPAGE_TITLE}</ac:link-body></ac:link></p>`;
          
          currentContent += '\n' + additionContent;
        } else {
          console.log('   ✅ Found section 11.10');
          
          // Check if link already exists
          if (currentContent.includes(SUBPAGE_TITLE)) {
            console.log('   ⚠️  Link to sub-page already exists in section 11.10');
          } else {
            // Read the addition content
            const additionContent = fs.existsSync(SECTION_11_10_ADDITION_FILE)
              ? wikiMarkupToStorageFormat(fs.readFileSync(SECTION_11_10_ADDITION_FILE, 'utf-8'))
              : `<h4>11.10.1 Zephyr Test Case Linking Utility</h4>
<p>The Zephyr Link Utility allows you to automatically link Zephyr Scale test cases to Jira work items.</p>
<p><ac:link><ri:page ri:content-title="${SUBPAGE_TITLE}" /><ac:link-body>${SUBPAGE_TITLE}</ac:link-body></ac:link></p>`;
            
            // Insert before the end of section 11.10
            const before = currentContent.substring(0, section.end);
            const after = currentContent.substring(section.end);
            currentContent = before + '\n' + additionContent + '\n' + after;
            console.log('   ✅ Added link to section 11.10');
          }
        }
        
        // Step 5: Update parent page
        console.log('\n📤 Updating parent page...');
        const updatePayload = {
          id: PARENT_PAGE_ID,
          type: 'page',
          title: parentPage.title,
          space: { key: CONFLUENCE_SPACE_KEY },
          body: {
            storage: {
              value: currentContent,
              representation: 'storage',
            },
          },
          version: {
            number: currentVersion + 1,
            message: 'Added link to Zephyr Test Case Linking Utility sub-page in section 11.10',
          },
        };
        
        await client.put(`/content/${PARENT_PAGE_ID}`, updatePayload);
        console.log('   ✅ Parent page updated successfully');
        
        console.log('\n✅ Successfully updated existing sub-page and added link!');
        console.log(`\n📎 Sub-page: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${subPageId}/${encodeURIComponent(SUBPAGE_TITLE)}`);
        console.log(`📎 Parent page: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PARENT_PAGE_ID}/QA+Automation+Framework+-+Complete+Workflow+Guide`);
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

    // Step 4: Read parent page and add link
    console.log('\n📖 Reading parent page to add link...');
    const { data: parentPage } = await client.get(`/content/${PARENT_PAGE_ID}?expand=version,body.storage`);
    const currentVersion = parentPage.version.number;
    let currentContent = parentPage.body.storage.value;
    
    console.log(`   Current version: ${currentVersion}`);

    // Step 5: Find section 11.10 and add link
    const section = findSection1110(currentContent);
    if (!section) {
      console.log('   ⚠️  Section 11.10 not found. Adding link at the end of the page...');
      // Read the addition content
      const additionContent = fs.existsSync(SECTION_11_10_ADDITION_FILE)
        ? wikiMarkupToStorageFormat(fs.readFileSync(SECTION_11_10_ADDITION_FILE, 'utf-8'))
        : `<h4>11.10.1 Zephyr Test Case Linking Utility</h4>
<p>The Zephyr Link Utility allows you to automatically link Zephyr Scale test cases to Jira work items.</p>
<p><ac:link><ri:page ri:content-title="${SUBPAGE_TITLE}" /><ac:link-body>${SUBPAGE_TITLE}</ac:link-body></ac:link></p>`;
      
      currentContent += '\n' + additionContent;
    } else {
      console.log('   ✅ Found section 11.10');
      
      // Read the addition content
      const additionContent = fs.existsSync(SECTION_11_10_ADDITION_FILE)
        ? wikiMarkupToStorageFormat(fs.readFileSync(SECTION_11_10_ADDITION_FILE, 'utf-8'))
        : `<h4>11.10.1 Zephyr Test Case Linking Utility</h4>
<p>The Zephyr Link Utility allows you to automatically link Zephyr Scale test cases to Jira work items.</p>
<p><ac:link><ri:page ri:content-title="${SUBPAGE_TITLE}" /><ac:link-body>${SUBPAGE_TITLE}</ac:link-body></ac:link></p>`;
      
      // Insert before the end of section 11.10
      const before = currentContent.substring(0, section.end);
      const after = currentContent.substring(section.end);
      currentContent = before + '\n' + additionContent + '\n' + after;
      console.log('   ✅ Added link to section 11.10');
    }

    // Step 6: Update parent page
    console.log('\n📤 Updating parent page...');
    const updatePayload = {
      id: PARENT_PAGE_ID,
      type: 'page',
      title: parentPage.title,
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: currentContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
            message: 'Added Jira Sync Utilities sub-page and link in section 11.10',
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
createSubPageAndAddLink().catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

