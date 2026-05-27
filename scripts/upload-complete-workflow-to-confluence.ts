#!/usr/bin/env ts-node

/**
 * Upload Complete Workflow Documentation to Confluence
 * 
 * Reads the comprehensive workflow markdown file and uploads it to Confluence
 * Converts markdown to Confluence Storage Format with proper formatting
 * 
 * Usage:
 *   npm run docs:upload:workflow
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

const PAGE_ID = '2692710418';
const MARKDOWN_FILE = path.resolve(__dirname, '../docs/CLM_AUTOMATION_FRAMEWORK_COMPLETE_WORKFLOW.md');

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Convert markdown inline formatting to HTML
 */
function convertInlineFormatting(text: string): string {
  // Convert bold **text** to <strong>text</strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Convert inline code `code` to <code>code</code>
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Convert italic *text* to <em>text</em> (but not if it's part of bold)
  text = text.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>');
  return text;
}

/**
 * Parse markdown table and convert to Confluence table format
 */
function parseMarkdownTable(lines: string[]): string {
  if (lines.length < 2) return '';
  
  const rows: string[][] = [];
  let headerRow: string[] = [];
  let isFirstRow = true;
  
  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell.length > 0);
      
      // Skip separator row (|---|---|)
      if (cells.every(cell => /^:?-+:?$/.test(cell))) {
        continue;
      }
      
      if (isFirstRow && cells.length > 0) {
        headerRow = cells;
        isFirstRow = false;
      } else if (cells.length > 0) {
        rows.push(cells);
      }
    }
  }
  
  if (headerRow.length === 0) return '';
  
  // Determine column count
  const colCount = headerRow.length;
  const colgroup = Array(colCount).fill(0).map(() => '<col />').join('');
  
  // Build header
  const headerCells = headerRow.map(cell => {
    const content = convertInlineFormatting(cell);
    return `<th style="background-color:#0052cc;color:white;">${content}</th>`;
  }).join('');
  
  // Build body rows
  const bodyRows = rows.map(row => {
    const cells = row.map((cell, index) => {
      const content = convertInlineFormatting(cell);
      // Apply styling for first column if it contains phase numbers or special content
      let style = '';
      if (index === 0 && /^[\*\d\s]+$/.test(cell.trim())) {
        style = ' style="text-align:center;background-color:#e6e6fa;"';
      }
      return `<td${style}>${content}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');
  
  return `<table class="wrapped confluenceTable">
  <colgroup>${colgroup}</colgroup>
  <thead>
    <tr>${headerCells}</tr>
  </thead>
  <tbody>
${bodyRows}
  </tbody>
</table>`;
}

/**
 * Convert markdown to Confluence Storage Format
 */
function markdownToConfluence(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent: string[] = [];
  let tableLines: string[] = [];
  let inTable = false;
  let inList = false;
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Handle code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const code = codeBlockContent.join('\n');
        const lang = codeBlockLang || 'text';
        output.push(`<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${lang}</ac:parameter>
  <ac:plain-text-body><![CDATA[${code}]]></ac:plain-text-body>
</ac:structured-macro>`);
        codeBlockContent = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        // Start code block
        codeBlockLang = trimmed.substring(3).trim();
        inCodeBlock = true;
      }
      i++;
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      i++;
      continue;
    }
    
    // Handle tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
      i++;
      continue;
    } else {
      if (inTable) {
        // Process accumulated table
        const tableHtml = parseMarkdownTable(tableLines);
        if (tableHtml) {
          output.push(tableHtml);
        }
        tableLines = [];
        inTable = false;
      }
    }
    
    // Handle headers
    if (trimmed.startsWith('### ')) {
      const text = convertInlineFormatting(trimmed.substring(4));
      output.push(`<h3>${text}</h3>`);
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      const text = convertInlineFormatting(trimmed.substring(3));
      output.push(`<h2>${text}</h2>`);
      i++;
      continue;
    }
    if (trimmed.startsWith('# ')) {
      const text = convertInlineFormatting(trimmed.substring(2));
      output.push(`<h1>${text}</h1>`);
      i++;
      continue;
    }
    
    // Handle horizontal rules
    if (trimmed === '---' || trimmed.match(/^[-]{3,}$/)) {
      output.push('<hr />');
      i++;
      continue;
    }
    
    // Handle lists
    if (trimmed.match(/^[-*]\s+/)) {
      const content = convertInlineFormatting(trimmed.substring(2));
      if (!inList || listType !== 'ul') {
        if (inList && listType === 'ol') {
          output.push(`</ol>`);
        }
        listItems = [];
        listType = 'ul';
        inList = true;
      }
      listItems.push(`<li>${content}</li>`);
      i++;
      continue;
    }
    
    if (trimmed.match(/^\d+\.\s+/)) {
      const content = convertInlineFormatting(trimmed.replace(/^\d+\.\s+/, ''));
      if (!inList || listType !== 'ol') {
        if (inList && listType === 'ul') {
          output.push(`</ul>`);
        }
        listItems = [];
        listType = 'ol';
        inList = true;
      }
      listItems.push(`<li>${content}</li>`);
      i++;
      continue;
    }
    
    // Close list if we hit a non-list line
    if (inList && trimmed.length > 0) {
      if (listType === 'ul') {
        output.push(`<ul>${listItems.join('\n')}</ul>`);
      } else {
        output.push(`<ol>${listItems.join('\n')}</ol>`);
      }
      listItems = [];
      inList = false;
      listType = null;
    }
    
    // Handle regular paragraphs
    if (trimmed.length > 0) {
      const formatted = convertInlineFormatting(trimmed);
      output.push(`<p>${formatted}</p>`);
    } else {
      // Empty line
      output.push('');
    }
    
    i++;
  }
  
  // Close any open lists
  if (inList) {
    if (listType === 'ul') {
      output.push(`<ul>${listItems.join('\n')}</ul>`);
    } else if (listType === 'ol') {
      output.push(`<ol>${listItems.join('\n')}</ol>`);
    }
  }
  
  // Process any remaining table
  if (inTable && tableLines.length > 0) {
    const tableHtml = parseMarkdownTable(tableLines);
    if (tableHtml) {
      output.push(tableHtml);
    }
  }
  
  return output.join('\n');
}

/**
 * Read and convert markdown file
 */
function readAndConvertMarkdown(): string {
  if (!fs.existsSync(MARKDOWN_FILE)) {
    throw new Error(`Markdown file not found: ${MARKDOWN_FILE}`);
  }

  console.log(`📖 Reading markdown file: ${path.relative(process.cwd(), MARKDOWN_FILE)}`);
  const markdown = fs.readFileSync(MARKDOWN_FILE, 'utf-8');
  
  console.log('🔄 Converting markdown to Confluence Storage Format...');
  const confluenceContent = markdownToConfluence(markdown);
  
  return confluenceContent;
}

/**
 * Update Confluence page
 */
async function updateConfluencePage() {
  console.log('\n📄 Uploading Complete Workflow Documentation to Confluence');
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
    console.log('📖 Getting current page version...');
    const { data: currentPage } = await client.get(`/content/${PAGE_ID}?expand=version`);
    const currentVersion = currentPage.version.number;
    console.log(`   Current version: ${currentVersion}`);
    console.log(`   Page title: ${currentPage.title}`);

    const confluenceContent = readAndConvertMarkdown();
    console.log(`   Content size: ${(confluenceContent.length / 1024).toFixed(1)} KB`);

    console.log('\n📤 Updating Confluence page...');
    const updatePayload = {
      id: PAGE_ID,
      type: 'page',
      title: 'CLM Automation Framework - Complete Workflow Guide',
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: confluenceContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: 'Updated with complete workflow documentation - Proper formatting - December 2024',
      },
    };

    await client.put(`/content/${PAGE_ID}`, updatePayload);

    console.log('\n✅ Confluence page updated successfully!');
    console.log(`\n📎 View at: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PAGE_ID}/CLM+Automation+Framework`);

  } catch (error: any) {
    console.error('\n❌ Error updating Confluence page:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateConfluencePage();
