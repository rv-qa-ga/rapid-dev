#!/usr/bin/env ts-node

/**
 * Fetch ISDE Confluence: "Lloyds - MuleSoft Integrations for D365 F&O Agency Journals"
 * and child pages (field mappings, flow docs). Uses ConfluenceClient + .env.qa.
 *
 * Source: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2848423969
 *
 * Usage:
 *   npx ts-node scripts/fetch-lloyds-mulesoft-d365-confluence.ts
 *   npx ts-node scripts/fetch-lloyds-mulesoft-d365-confluence.ts --output docs/lloyds/custom.md
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';
import { storageHtmlToPlainText } from '../src/integrations/confluence/storage-html-to-plain';

const LLOYDS_MULE_D365_PAGE_ID = '2848423969';

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

async function main(): Promise<void> {
  const pageId = LLOYDS_MULE_D365_PAGE_ID;
  let outputPath = path.resolve(
    process.cwd(),
    'docs',
    'lloyds',
    'confluence-lloyds-mulesoft-d365-agency-journals.md'
  );
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--output' || args[i] === '-o') && args[i + 1]) {
      outputPath = path.resolve(process.cwd(), args[++i]);
    }
  }

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });
  if (!client.isConfigured()) {
    console.error('❌ Confluence not configured. Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (or JIRA_*) in .env');
    process.exit(1);
  }

  const sections: string[] = [];
  sections.push(`# Lloyd's — MuleSoft integrations for D365 F&O agency journals (Confluence export)\n`);
  sections.push(
    `*Fetched from Confluence (ISDE) — page ID ${pageId} and direct child pages. Regenerate: \`npx ts-node scripts/fetch-lloyds-mulesoft-d365-confluence.ts\`*\n`
  );
  sections.push(`**Wiki:** ${client.getBaseUrl()}/spaces/ISDE/pages/${pageId}\n`);

  try {
    const page = await client.getPage(pageId, { expand: 'version,body.storage' });
    if (!page) {
      console.error(`❌ Page ${pageId} not found or not accessible.`);
      process.exit(1);
    }
    console.log(`📄 ${page.title} (${pageId})`);
    const body = (page as any).body?.storage?.value ?? '';
    sections.push(`## ${page.title}\n\n`);
    sections.push(storageHtmlToPlainText(body));
    sections.push('\n---\n');

    const children = await client.getChildPages(pageId, { limit: 100 });
    console.log(`   Child pages: ${children.length}\n`);

    for (const child of children) {
      const full = await client.getPage(child.id, { expand: 'version,body.storage' });
      if (!full) continue;
      const childBody = (full as any).body?.storage?.value ?? '';
      console.log(`   📄 ${full.title} (${child.id})`);
      sections.push(`## ${full.title}\n\n`);
      sections.push(storageHtmlToPlainText(childBody));
      sections.push('\n---\n');
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(outputPath, sections.join('\n'), 'utf-8');
    console.log(`\n✅ Written to ${outputPath}`);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    if (err.response?.status) console.error('   Status:', err.response.status);
    process.exit(1);
  }
}

main();
