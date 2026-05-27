#!/usr/bin/env ts-node

/**
 * Create or update Confluence sub-page under QA Test Plan (SA space).
 *
 * Parent: https://accelins.atlassian.net/wiki/spaces/SA/pages/2532114485/QA+Test+Plan+Strategy+and+Approach
 *
 * Usage:
 *   npx ts-node scripts/upload-clm-go-live-test-plan-to-confluence.ts
 *   npx ts-node scripts/upload-clm-go-live-test-plan-to-confluence.ts --page-id <id>
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

const PARENT_PAGE_ID = '2532114485';
/** Existing page — update in place when renaming (created as CLM Go-Live — Migration & Integration). */
const DEFAULT_PAGE_ID = '3330703367';
const SUBPAGE_TITLE = 'Migration & Integration (Regression) Test Plan';
const PLAN_PATH = path.resolve(
  __dirname,
  '../docs/clm/CLM_GO_LIVE_MIGRATION_INTEGRATION_TEST_PLAN.md'
);

function parseArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return undefined;
}

async function main() {
  const args = process.argv.slice(2);
  const parentPageId = parseArg(args, '--parent-page-id') ?? PARENT_PAGE_ID;
  const title = parseArg(args, '--title') ?? SUBPAGE_TITLE;
  const directPageId = parseArg(args, '--page-id') ?? DEFAULT_PAGE_ID;

  if (!fs.existsSync(PLAN_PATH)) {
    console.error(`❌ Plan not found: ${PLAN_PATH}`);
    process.exit(1);
  }

  process.env.CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'SA';

  const client = new ConfluenceClient({
    spaceKey: 'SA',
  });

  if (!client.isConfigured()) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN in .env.qa');
    process.exit(1);
  }

  const md = fs.readFileSync(PLAN_PATH, 'utf-8');
  const body = markdownToConfluenceStorage(md);

  console.log('\n📄 CLM Go-Live Test Plan → Confluence (SA)');
  console.log(`   Source: ${path.relative(process.cwd(), PLAN_PATH)}`);
  console.log(`   Title:  "${title}"`);
  console.log(`   Parent: ${parentPageId}\n`);

  try {
    let existing: { id: string; title?: string; version?: { number?: number }; _links?: { webui?: string } } | null =
      null;

    if (directPageId) {
      existing = await client.getPage(directPageId, { expand: 'version,_links' });
      if (!existing) {
        console.error(`❌ Page ${directPageId} not found`);
        process.exit(1);
      }
    } else {
      existing = await client.findChildPageByTitle(parentPageId, title);
    }

    if (existing) {
      const full = await client.getPage(existing.id, { expand: 'version,_links' });
      const ver = full?.version?.number ?? existing.version?.number ?? 1;
      await client.updatePageContent(existing.id, body, ver + 1, {
        title,
        message: 'Updated Migration & Integration (Regression) Test Plan',
      });
      console.log('✅ Page updated');
      console.log(`📎 ${client.getBaseUrl()}${full?._links?.webui ?? existing._links?.webui}`);
    } else {
      const page = await client.createPageWithBody(parentPageId, title, body);
      console.log('✅ Sub-page created');
      console.log(`   Page ID: ${page.id}`);
      console.log(`📎 ${client.getBaseUrl()}${page._links.webui}`);
    }
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number; data?: unknown } };
    console.error('❌', e.message ?? err);
    if (e.response) {
      console.error('   Status:', e.response.status);
      console.error('   Data:', JSON.stringify(e.response.data, null, 2));
    }
    process.exit(1);
  }
}

main().catch(console.error);
