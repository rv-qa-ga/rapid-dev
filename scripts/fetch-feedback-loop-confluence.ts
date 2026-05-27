#!/usr/bin/env ts-node

/**
 * Fetch "Feedback Loop Overall Architecture for Service Bus Functions" from Confluence
 * and all its child pages. Uses framework Confluence client and .env.qa (ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN).
 *
 * Usage:
 *   npx ts-node scripts/fetch-feedback-loop-confluence.ts
 *   npx ts-node scripts/fetch-feedback-loop-confluence.ts --page-id 3015376910 --output docs/lloyds/confluence-feedback-loop-service-bus.md
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

const FEEDBACK_LOOP_PAGE_ID = '3015376910';

const envPaths = [
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`📁 Loaded env from: ${path.relative(process.cwd(), envPath)}\n`);
    break;
  }
}

/** Strip Confluence/HTML storage to readable plain text (keep structure with newlines). */
function htmlToText(html: string): string {
  if (!html || !html.trim()) return '';
  let s = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<ac:structured-macro[\s\S]*?<\/ac:structured-macro>/gi, '\n[macro]\n')
    .replace(/<ac:[\s\S]*?\/>/g, '')
    .replace(/<\/ac:[^>]+>/g, '\n');
  // Block elements -> newlines
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'br', 'hr', 'table', 'th', 'td'];
  for (const tag of blockTags) {
    const re = new RegExp(`</${tag}>`, 'gi');
    s = s.replace(re, '\n');
  }
  s = s.replace(/<[^>]+>/g, ' ');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  s = s.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/gm, '').trim();
  return s;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let pageId = FEEDBACK_LOOP_PAGE_ID;
  let outputPath = path.resolve(process.cwd(), 'docs', 'lloyds', 'confluence-feedback-loop-service-bus.md');
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--page-id' || args[i] === '-p') && args[i + 1]) {
      pageId = args[++i];
    } else if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputPath = path.resolve(process.cwd(), args[++i]);
    }
  }

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });
  if (!client.isConfigured()) {
    console.error('❌ Confluence not configured. Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN in .env.qa');
    process.exit(1);
  }

  const sections: string[] = [];
  sections.push(`# Feedback Loop Overall Architecture for Service Bus Functions\n`);
  sections.push(`*Fetched from Confluence (ISDE) – page ID ${pageId} and child pages.*\n`);
  sections.push(`Source: ${client.getBaseUrl()}/spaces/ISDE/pages/${pageId}\n`);

  try {
    const page = await client.getPage(pageId, { expand: 'version,body.storage' });
    if (!page) {
      console.error(`❌ Page ${pageId} not found or not accessible.`);
      process.exit(1);
    }
    const title = page.title;
    console.log(`📄 ${title} (${pageId})`);
    const body = (page as any).body?.storage?.value ?? '';
    sections.push(`## ${title}\n\n`);
    sections.push(htmlToText(body));
    sections.push('\n---\n');

    const children = await client.getChildPages(pageId, { limit: 100 });
    console.log(`   Child pages: ${children.length}\n`);

    for (const child of children) {
      const full = await client.getPage(child.id, { expand: 'version,body.storage' });
      if (!full) continue;
      const childBody = (full as any).body?.storage?.value ?? '';
      console.log(`   📄 ${full.title} (${child.id})`);
      sections.push(`## ${full.title}\n\n`);
      sections.push(htmlToText(childBody));
      sections.push('\n---\n');
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, sections.join('\n'), 'utf-8');
    console.log(`\n✅ Written to ${outputPath}`);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    if (err.response?.status) console.error('   Status:', err.response.status);
    if (err.response?.data) console.error('   Data:', JSON.stringify(err.response.data).slice(0, 300));
    process.exit(1);
  }
}

main();
