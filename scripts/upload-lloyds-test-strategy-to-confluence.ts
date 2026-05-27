#!/usr/bin/env ts-node

/**
 * Upload Lloyd's QA Test Strategy to Confluence as a sub-page
 *
 * Source preference (first that exists wins):
 *   1. docs/lloyds/LLOYDS_TEST_STRATEGY.md   — repo-local phased automation plan (preferred)
 *   2. docs/lloyds/LLOYDS_TEST_STRATEGY.html — legacy programme-wide strategy (fallback)
 *
 * Creates or updates the Confluence sub-page "Test Strategy" under the given parent page.
 * Uses the framework Confluence client (src/integrations/confluence/client.ts).
 * Requires: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (or JIRA_EMAIL / JIRA_API_TOKEN) in .env
 *
 * Parent page (from Confluence): https://accelins.atlassian.net/wiki/spaces/TM/pages/3020062774
 * Target sub-page (default): "Lloyd's Project Test Strategy" — lives under
 *   Lloyd's of London → Projects → Lloyd's Project Test Strategy (ID 3021504571).
 *
 * Usage:
 *   npx ts-node scripts/upload-lloyds-test-strategy-to-confluence.ts
 *   npx ts-node scripts/upload-lloyds-test-strategy-to-confluence.ts --parent-page-id 3020062774
 *   npx ts-node scripts/upload-lloyds-test-strategy-to-confluence.ts --page-id 3021504571   # update a specific page directly
 *   npx ts-node scripts/upload-lloyds-test-strategy-to-confluence.ts --title "Lloyd's Project Test Strategy"
 *   npx ts-node scripts/upload-lloyds-test-strategy-to-confluence.ts --prefer-html          # force .html
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';
import { markdownToConfluenceStorage } from './lib/markdown-to-confluence';

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

const DEFAULT_PARENT_PAGE_ID = '3020062774';
const DEFAULT_SUBPAGE_TITLE = "Lloyd's Project Test Strategy";
const STRATEGY_MD_PATH = path.resolve(__dirname, '../docs/lloyds/LLOYDS_TEST_STRATEGY.md');
const STRATEGY_HTML_PATH = path.resolve(__dirname, '../docs/lloyds/LLOYDS_TEST_STRATEGY.html');

/**
 * Convert the legacy HTML file to Confluence storage format.
 * - Extracts the body contents
 * - Strips <script> / leaves <style> out (Confluence uses its own)
 * - Replaces Mermaid divs with a `code` macro (Confluence Cloud does not render fenced Mermaid)
 * - Tags tables with confluenceTable for Confluence styling
 */
function htmlToConfluenceStorage(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = bodyMatch ? bodyMatch[1].trim() : html;

  body = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  body = body.replace(
    /<div class="mermaid">([\s\S]*?)<\/div>/gi,
    (_: string, code: string) => {
      const cdata = code.trim().replace(/]]>/g, ']]]]><![CDATA[>');
      return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="title">Flow diagram (Mermaid)</ac:parameter>
  <ac:parameter ac:name="language">text</ac:parameter>
  <ac:plain-text-body><![CDATA[${cdata}]]></ac:plain-text-body>
</ac:structured-macro>`;
    }
  );

  body = body.replace(/<table>/gi, '<table class="confluenceTable">');

  return body;
}

interface ResolvedSource {
  kind: 'md' | 'html';
  path: string;
  storageFormat: string;
}

function resolveSource(preferHtml: boolean): ResolvedSource | null {
  const mdExists = fs.existsSync(STRATEGY_MD_PATH);
  const htmlExists = fs.existsSync(STRATEGY_HTML_PATH);

  if (!preferHtml && mdExists) {
    const md = fs.readFileSync(STRATEGY_MD_PATH, 'utf-8');
    return {
      kind: 'md',
      path: STRATEGY_MD_PATH,
      storageFormat: markdownToConfluenceStorage(md),
    };
  }
  if (htmlExists) {
    const html = fs.readFileSync(STRATEGY_HTML_PATH, 'utf-8');
    return {
      kind: 'html',
      path: STRATEGY_HTML_PATH,
      storageFormat: htmlToConfluenceStorage(html),
    };
  }
  if (mdExists) {
    const md = fs.readFileSync(STRATEGY_MD_PATH, 'utf-8');
    return {
      kind: 'md',
      path: STRATEGY_MD_PATH,
      storageFormat: markdownToConfluenceStorage(md),
    };
  }
  return null;
}

function parseArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const parentPageId = parseArg(args, '--parent-page-id') ?? DEFAULT_PARENT_PAGE_ID;
  const subpageTitle = parseArg(args, '--title') ?? DEFAULT_SUBPAGE_TITLE;
  const directPageId = parseArg(args, '--page-id');
  const preferHtml = args.includes('--prefer-html');

  console.log("\n📄 Lloyd's Test Strategy – Upload to Confluence");
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new ConfluenceClient();
  if (!client.isConfigured()) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set (e.g. in .env or .env.qa)');
    process.exit(1);
  }

  const source = resolveSource(preferHtml);
  if (!source) {
    console.error('❌ Error: Neither LLOYDS_TEST_STRATEGY.md nor .html found under docs/lloyds/');
    process.exit(1);
  }

  console.log(`📖 Source (${source.kind.toUpperCase()}): ${path.relative(process.cwd(), source.path)}`);
  console.log(`   Storage size: ${(source.storageFormat.length / 1024).toFixed(1)} KB`);
  console.log(`   Target title:  "${subpageTitle}"`);
  if (directPageId) console.log(`   Direct page id: ${directPageId}`);
  else console.log(`   Parent page id: ${parentPageId}`);
  console.log('');

  try {
    let existing: any = null;

    if (directPageId) {
      console.log(`🔍 Fetching page ${directPageId} directly...`);
      existing = await client.getPage(directPageId, { expand: 'version,_links' });
      if (!existing) {
        console.error(`❌ Page ${directPageId} not found (or no access).`);
        process.exit(1);
      }
    } else {
      console.log(`🔍 Looking for sub-page "${subpageTitle}" under parent ${parentPageId}...`);
      existing = await client.findChildPageByTitle(parentPageId, subpageTitle);
    }

    if (existing) {
      const full = await client.getPage(existing.id, { expand: 'version,_links' });
      const currentVersion = full?.version?.number ?? existing.version?.number ?? 1;
      console.log(
        `   Found existing page (ID: ${existing.id}, title: "${existing.title}", version: ${currentVersion}). Updating...\n`
      );
      await client.updatePageContent(existing.id, source.storageFormat, currentVersion + 1, {
        message: `Updated Lloyd's QA Test Strategy from framework (source: ${source.kind})`,
      });
      const webui = full?._links?.webui ?? existing._links?.webui;
      console.log('✅ Sub-page updated successfully.');
      console.log(`\n📎 View: ${client.getBaseUrl()}${webui}`);
    } else {
      console.log('   Not found. Creating new sub-page...\n');
      const newPage = await client.createPageWithBody(parentPageId, subpageTitle, source.storageFormat);
      console.log('✅ Sub-page created successfully.');
      console.log(`   Page ID: ${newPage.id}`);
      console.log(`\n📎 View: ${client.getBaseUrl()}${newPage._links.webui}`);
    }

    console.log(
      `\n📎 Parent: ${client.getBaseUrl()}/spaces/${process.env.CONFLUENCE_SPACE_KEY || 'TM'}/pages/${parentPageId}`
    );
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main().catch(console.error);
