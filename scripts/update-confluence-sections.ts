#!/usr/bin/env ts-node

/**
 * Update Specific Sections in Confluence Page
 * 
 * This script allows you to update specific sections in a Confluence page
 * without affecting the rest of the page content or formatting.
 * 
 * It finds sections by their heading text and replaces them with new content.
 * 
 * Usage:
 *   npm run docs:update:sections -- --section "Section Name" --content "path/to/content.md"
 *   npm run docs:update:sections -- --section "Zephyr Integration" --inline "<h2>New Content</h2>"
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

interface SectionUpdate {
  sectionName: string;
  newContent: string;
  headingLevel?: number; // 1 for h1, 2 for h2, etc.
}

/**
 * Find a section in the content by its heading or paragraph text
 * Returns the start and end positions of the section
 * Supports numbered subsections like "9.6 Uploading Results to Zephyr"
 * Also searches in paragraphs and list items, not just headings
 */
function findSection(
  content: string,
  sectionName: string,
  headingLevel: number = 2
): { start: number; end: number; headingTag: string } | null {
  // Escape special characters in section name for regex
  const escapedName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // First, try to find in headings
  const headingTags = [`<h${headingLevel}>`, `<h${headingLevel + 1}>`, `<h${headingLevel - 1}>`].filter(tag => tag.match(/<h[1-6]>/));
  
  for (const headingTag of headingTags) {
    // Try exact match first (with or without numbering like "9.6 ")
    let patterns = [
      // Exact match: "9.6 Uploading Results to Zephyr" or just "Uploading Results to Zephyr"
      `${headingTag}${escapedName}</h[1-6]>`,
      // With numbering prefix: "9.6 Uploading Results to Zephyr"
      `${headingTag}[0-9.\\s]*${escapedName}</h[1-6]>`,
      // Partial match with numbering
      `${headingTag}[^<]*${escapedName}[^<]*</h[1-6]>`,
    ];
    
    let match: RegExpMatchArray | null = null;
    
    for (const pattern of patterns) {
      match = content.match(new RegExp(pattern, 'i'));
      if (match) break;
    }
    
    // If no exact match, try with HTML entities
    if (!match) {
      const escapedHtml = escapedName.replace(/&/g, '&amp;');
      const htmlPatterns = [
        `${headingTag}${escapedHtml}</h[1-6]>`,
        `${headingTag}[0-9.\\s]*${escapedHtml}</h[1-6]>`,
        `${headingTag}[^<]*${escapedHtml}[^<]*</h[1-6]>`,
      ];
      
      for (const pattern of htmlPatterns) {
        match = content.match(new RegExp(pattern, 'i'));
        if (match) break;
      }
    }
    
    if (match && match.index !== undefined) {
      const start = match.index;
      const headingEnd = match.index + match[0].length;
      
      // Find the end of this section (next heading of same or higher level, or end of content)
      const nextHeadingPattern = new RegExp(`<h[1-${headingLevel}]>`, 'i');
      const nextMatch = content.substring(headingEnd).match(nextHeadingPattern);
      
      const end = nextMatch && nextMatch.index !== undefined
        ? headingEnd + nextMatch.index 
        : content.length;
      
      return { start, end, headingTag };
    }
  }
  
  // If not found in headings, try paragraphs or list items (for numbered subsections)
  // Look for patterns like "<p>9.6 Uploading Results to Zephyr</p>" or "<strong>9.6 Uploading Results to Zephyr</strong>"
  const paragraphPatterns = [
    `<p><strong>${escapedName}</strong></p>`,
    `<p>${escapedName}</p>`,
    `<p>[0-9.\\s]*${escapedName}</p>`,
    `<strong>${escapedName}</strong>`,
    `<li><strong>${escapedName}</strong>`,
    `<li>${escapedName}</li>`,
  ];
  
  for (const pattern of paragraphPatterns) {
    const match = content.match(new RegExp(pattern, 'i'));
    if (match && match.index !== undefined) {
      const start = match.index;
      const sectionStart = match.index + match[0].length;
      
      // Find the end - look for next numbered section (like "9.7" or "10.") or next heading
      const nextSectionPattern = /(?:<h[1-6]>|<p><strong>|<p>)[0-9]+\.[0-9]+|<h[1-6]>/i;
      const nextMatch = content.substring(sectionStart).match(nextSectionPattern);
      
      const end = nextMatch && nextMatch.index !== undefined
        ? sectionStart + nextMatch.index 
        : content.length;
      
      return { start, end, headingTag: 'paragraph' };
    }
  }
  
  // Last resort: search for any occurrence of the text (case-insensitive, partial match)
  // This handles cases where the text might be split across tags or have extra formatting
  const searchText = sectionName.toLowerCase();
  const contentLower = content.toLowerCase();
  const textIndex = contentLower.indexOf(searchText);
  
  if (textIndex !== -1) {
    // Find a reasonable start (go back to find the beginning of the section)
    let start = textIndex;
    // Look backwards for a heading, paragraph start, or list item
    const beforeMatch = content.substring(Math.max(0, textIndex - 500), textIndex).match(/(<h[1-6]>|<p>|<li>|###|##|#)/i);
    if (beforeMatch && beforeMatch.index !== undefined) {
      start = textIndex - 500 + beforeMatch.index;
    } else {
      // Start from a reasonable point before the text
      start = Math.max(0, textIndex - 100);
    }
    
    // Find the end - look for next numbered section or heading
    const sectionStart = textIndex + searchText.length;
    const nextSectionPattern = /(?:<h[1-6]>|<p><strong>|<p>)[0-9]+\.[0-9]+|<h[1-6]>/i;
    const nextMatch = content.substring(sectionStart).match(nextSectionPattern);
    
    const end = nextMatch && nextMatch.index !== undefined
      ? sectionStart + nextMatch.index 
      : Math.min(content.length, sectionStart + 5000); // Limit to 5000 chars if no end found
    
    return { start, end, headingTag: 'text-match' };
  }
  
  return null;
}

/**
 * Replace a section in the content
 */
function replaceSection(
  content: string,
  sectionName: string,
  newContent: string,
  headingLevel: number = 2
): string {
  const section = findSection(content, sectionName, headingLevel);
  
  if (!section) {
    throw new Error(`Section "${sectionName}" not found in page content. Available sections might have different names or formatting.`);
  }
  
  // Extract the original heading to preserve it
  const headingMatch = content.substring(section.start, section.end).match(/<h[1-6]>[^<]*<\/h[1-6]>/i);
  const originalHeading = headingMatch ? headingMatch[0] : '';
  
  // Build new section with original heading
  const updatedSection = originalHeading + '\n' + newContent;
  
  // Replace the section
  const before = content.substring(0, section.start);
  const after = content.substring(section.end);
  
  return before + updatedSection + after;
}

/**
 * Convert markdown to Confluence Storage Format (simplified version)
 */
function markdownToConfluence(markdown: string): string {
  // This is a simplified converter - for complex markdown, use the full converter
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${lang || 'text'}</ac:parameter>
  <ac:plain-text-body><![CDATA[${code.trim()}]]></ac:plain-text-body>
</ac:structured-macro>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Paragraphs (lines that aren't already HTML)
  const lines = html.split('\n');
  const processed: string[] = [];
  for (const line of lines) {
    if (line.trim() && !line.match(/^<[^>]+>/) && !line.match(/^<\/[^>]+>/)) {
      processed.push(`<p>${line}</p>`);
    } else {
      processed.push(line);
    }
  }
  html = processed.join('\n');
  
  return html;
}

/**
 * Update specific sections in Confluence page
 */
async function updateConfluenceSections(updates: SectionUpdate[]) {
  console.log('\n📄 Updating Specific Sections in Confluence Page');
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
    // Step 1: Read current page content
    console.log('📖 Reading current Confluence page...');
    const { data: currentPage } = await client.get(`/content/${PAGE_ID}?expand=version,body.storage`);
    const currentVersion = currentPage.version.number;
    let currentContent = currentPage.body.storage.value;
    
    console.log(`   Current version: ${currentVersion}`);
    console.log(`   Page title: ${currentPage.title}`);
    console.log(`   Content size: ${(currentContent.length / 1024).toFixed(1)} KB`);

    // Step 2: Update each section
    console.log(`\n🔄 Updating ${updates.length} section(s)...`);
    
    for (const update of updates) {
      console.log(`\n   📝 Updating section: "${update.sectionName}"`);
      
      try {
        // Check if content is a file path or inline content
        let newContent = update.newContent;
        
        // If it looks like a file path, read it
        if (fs.existsSync(newContent) && fs.statSync(newContent).isFile()) {
          console.log(`      Reading from file: ${path.relative(process.cwd(), newContent)}`);
          const fileContent = fs.readFileSync(newContent, 'utf-8');
          
          // If it's markdown, convert it
          if (newContent.endsWith('.md')) {
            newContent = markdownToConfluence(fileContent);
          } else {
            newContent = fileContent;
          }
        }
        
        // Replace the section
        currentContent = replaceSection(
          currentContent,
          update.sectionName,
          newContent,
          update.headingLevel || 2
        );
        
        console.log(`      ✅ Section updated successfully`);
      } catch (error: any) {
        console.error(`      ❌ Failed to update section: ${error.message}`);
        throw error;
      }
    }

    console.log(`\n   Combined content size: ${(currentContent.length / 1024).toFixed(1)} KB`);

    // Step 3: Update the page
    console.log('\n📤 Updating Confluence page...');
    const updatePayload = {
      id: PAGE_ID,
      type: 'page',
      title: currentPage.title, // Keep the same title
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: currentContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: `Updated ${updates.length} section(s): ${updates.map(u => u.sectionName).join(', ')}`,
      },
    };

    await client.put(`/content/${PAGE_ID}`, updatePayload);

    console.log('\n✅ Confluence page updated successfully!');
    console.log(`\n📎 View at: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PAGE_ID}/QA+Automation+Framework+-+Complete+Workflow+Guide`);

  } catch (error: any) {
    console.error('\n❌ Error updating Confluence page:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const updates: SectionUpdate[] = [];
let currentUpdate: Partial<SectionUpdate> | null = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--section' && args[i + 1]) {
    // Save previous update if exists
    if (currentUpdate && currentUpdate.sectionName && currentUpdate.newContent) {
      updates.push(currentUpdate as SectionUpdate);
    }
    // Start new update
    currentUpdate = { sectionName: args[i + 1] };
    i++;
  } else if (arg === '--content' && args[i + 1]) {
    if (!currentUpdate) {
      console.error('❌ Error: --section must be specified before --content');
      process.exit(1);
    }
    currentUpdate.newContent = args[i + 1];
    i++;
  } else if (arg === '--inline' && args[i + 1]) {
    if (!currentUpdate) {
      console.error('❌ Error: --section must be specified before --inline');
      process.exit(1);
    }
    currentUpdate.newContent = args[i + 1];
    i++;
  } else if (arg === '--heading-level' && args[i + 1]) {
    if (!currentUpdate) {
      console.error('❌ Error: --section must be specified before --heading-level');
      process.exit(1);
    }
    currentUpdate.headingLevel = parseInt(args[i + 1], 10);
    i++;
  } else if (arg.startsWith('--section=')) {
    if (currentUpdate && currentUpdate.sectionName && currentUpdate.newContent) {
      updates.push(currentUpdate as SectionUpdate);
    }
    currentUpdate = { sectionName: arg.split('=')[1] };
  } else if (arg.startsWith('--content=')) {
    if (!currentUpdate) {
      console.error('❌ Error: --section must be specified before --content');
      process.exit(1);
    }
    currentUpdate.newContent = arg.split('=')[1];
  } else if (arg.startsWith('--inline=')) {
    if (!currentUpdate) {
      console.error('❌ Error: --section must be specified before --inline');
      process.exit(1);
    }
    currentUpdate.newContent = arg.split('=')[1];
  }
}

// Add the last update
if (currentUpdate && currentUpdate.sectionName && currentUpdate.newContent) {
  updates.push(currentUpdate as SectionUpdate);
}

if (updates.length === 0) {
  console.error('❌ Error: No sections specified for update');
  console.error('');
  console.error('Usage:');
  console.error('  # Update a section from a file');
  console.error('  npm run docs:update:sections -- --section "Section Name" --content "path/to/content.md"');
  console.error('');
  console.error('  # Update a section with inline HTML');
  console.error('  npm run docs:update:sections -- --section "Section Name" --inline "<h2>New Content</h2><p>Updated text</p>"');
  console.error('');
  console.error('  # Update multiple sections');
  console.error('  npm run docs:update:sections -- \\');
  console.error('    --section "Section 1" --content "file1.md" \\');
  console.error('    --section "Section 2" --inline "<h2>Content</h2>"');
  console.error('');
  console.error('Options:');
  console.error('  --section <name>        Section heading text to find and replace');
  console.error('  --content <path>        Path to file containing new content (markdown or HTML)');
  console.error('  --inline <html>         Inline HTML content for the section');
  console.error('  --heading-level <n>    Heading level (1-6, default: 2 for h2)');
  process.exit(1);
}

// Run the update
updateConfluenceSections(updates).catch((error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

