#!/usr/bin/env ts-node

/**
 * Create or update CLM migration QA progress on Confluence (SA space).
 *
 * Parent (default): Migration test plan page
 *   https://accelins.atlassian.net/wiki/spaces/SA/pages/3330703367
 *
 * Usage:
 *   npm run docs:upload:clm-migration-progress
 *   npm run docs:preview:clm-migration-progress
 *   npx ts-node scripts/upload-clm-migration-qa-progress-to-confluence.ts --page-id <id>
 *   npx ts-node scripts/upload-clm-migration-qa-progress-to-confluence.ts --preview-html [path]
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';
import { markdownToBrowserPreviewHtml, markdownToConfluenceStorage } from './lib/markdown-to-confluence';
import {
  CLM_QA_DASHBOARD_ATTACHMENT,
  CLM_QA_EVIDENCE_ATTACHMENT,
  enrichClmQaProgressBody,
} from './lib/clm-migration-confluence-enrich';
import {
  buildClmMigrationEvidenceWorkbook,
  buildClmMigrationFailuresWorkbook,
  CLM_MIGRATION_REPORT_DIR,
  CLM_QA_FAILURES_ATTACHMENT,
} from './lib/clm-migration-evidence-excel';
import { parsePreviewHtmlPath, writeMarkdownPreviewHtml } from './lib/confluence-preview-html';

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

const PARENT_PAGE_ID = '3330703367';
/** After first publish; use --page-id to update in place. */
const DEFAULT_PAGE_ID = '3329785980';
const PAGE_TITLE = 'CLM Migration — QA Progress (INT / preprod)';
const PROGRESS_PATH = path.resolve(__dirname, '../docs/clm/CLM_MIGRATION_QA_PROGRESS.md');
const DASHBOARD_HTML_PATH = path.resolve(__dirname, '../docs/clm/CLM_MIGRATION_QA_PROGRESS_DASHBOARD.html');

function parseArg(args: string[], name: string): string | undefined {
  const idx = args.indexOf(name);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return undefined;
}

async function prepareAttachments(): Promise<{
  files: string[];
  evidenceSummaryOnly: boolean;
  failuresEmpty: boolean;
}> {
  const files: string[] = [];

  const evidenceTmp = path.join(os.tmpdir(), CLM_QA_EVIDENCE_ATTACHMENT);
  const evidence = await buildClmMigrationEvidenceWorkbook(evidenceTmp);
  files.push(evidence.path);
  if (evidence.summaryOnly) {
    console.log('   ⚠️  No per-entity CLM-MIG-*.xlsx on disk — Excel attachment is Summary sheet only.');
    console.log('      Run: npx ts-node scripts/run-clm-all-entities-validation.ts then re-upload.\n');
  } else {
    console.log(`   📊 Evidence workbook: ${evidence.mergedCount} entity report(s) merged\n`);
  }

  const failuresReportDir = path.join(CLM_MIGRATION_REPORT_DIR);
  if (!fs.existsSync(failuresReportDir)) fs.mkdirSync(failuresReportDir, { recursive: true });
  const failuresLocal = path.join(failuresReportDir, CLM_QA_FAILURES_ATTACHMENT);
  const failures = await buildClmMigrationFailuresWorkbook(failuresLocal);
  const failuresTmp = path.join(os.tmpdir(), CLM_QA_FAILURES_ATTACHMENT);
  fs.copyFileSync(failures.path, failuresTmp);
  files.push(failuresTmp);
  if (failures.empty) {
    console.log('   ⚠️  Failures workbook is empty (all entities passed or no reports on disk).\n');
  } else {
    console.log(
      `   🔴 Failures workbook: ${failures.entityCount} entity tab(s), ${failures.totalFailureRows} failure row(s)\n`
    );
  }

  if (!fs.existsSync(DASHBOARD_HTML_PATH)) {
    console.warn(`   ⚠️  Dashboard HTML not found: ${DASHBOARD_HTML_PATH}`);
  } else {
    const dashTmp = path.join(os.tmpdir(), CLM_QA_DASHBOARD_ATTACHMENT);
    fs.copyFileSync(DASHBOARD_HTML_PATH, dashTmp);
    files.push(dashTmp);
  }

  return { files, evidenceSummaryOnly: evidence.summaryOnly, failuresEmpty: failures.empty };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const previewPath = parsePreviewHtmlPath(args, 'clm-migration-qa-progress-confluence-preview');

  if (previewPath) {
    console.log('\n📄 CLM Migration QA Progress — **preview HTML** (no Confluence)\n');
    writeMarkdownPreviewHtml({
      markdownPath: PROGRESS_PATH,
      previewPath,
      markdownToHtml: markdownToBrowserPreviewHtml,
      documentTitle: 'CLM Migration QA Progress — local Confluence preview',
      bannerHtml: `<strong>Local preview only</strong> — open
    <code>docs/clm/CLM_MIGRATION_QA_PROGRESS_DASHBOARD.html</code> for full styled dashboard.
    Publish with <code>npm run docs:upload:clm-migration-progress</code> (page
    <a href="https://accelins.atlassian.net/wiki/spaces/SA/pages/3329785980">3329785980</a>).`,
    });
    console.log(`✅ Wrote preview: ${previewPath}`);
    console.log('   Open the file in a browser to verify tables before uploading.\n');
    return;
  }

  const parentPageId = parseArg(args, '--parent-page-id') ?? PARENT_PAGE_ID;
  const title = parseArg(args, '--title') ?? PAGE_TITLE;
  const directPageId = parseArg(args, '--page-id') ?? DEFAULT_PAGE_ID;

  if (!fs.existsSync(PROGRESS_PATH)) {
    console.error(`❌ Progress doc not found: ${PROGRESS_PATH}`);
    process.exit(1);
  }

  process.env.CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'SA';

  const client = new ConfluenceClient({ spaceKey: 'SA' });

  if (!client.isConfigured()) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN in .env.qa');
    process.exit(1);
  }

  const mdRaw = fs.readFileSync(PROGRESS_PATH, 'utf-8');
  let body = markdownToConfluenceStorage(mdRaw);
  body = enrichClmQaProgressBody(body);

  const { files: attachmentFiles } = await prepareAttachments();

  console.log('\n📄 CLM Migration QA Progress → Confluence (SA)');
  console.log(`   Source: ${path.relative(process.cwd(), PROGRESS_PATH)}`);
  console.log(`   Title:  "${title}"`);
  console.log(`   Parent: ${parentPageId}`);
  console.log(`   Attachments: ${attachmentFiles.map((f) => path.basename(f)).join(', ')}\n`);

  try {
    let existing: {
      id: string;
      title?: string;
      version?: { number?: number };
      _links?: { webui?: string };
    } | null = null;

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
        message: 'CLM QA dashboard — status lozenges, Excel + HTML attachments',
      });
      for (const f of attachmentFiles) {
        await client.uploadAttachment(existing.id, f);
      }
      console.log('✅ Page updated');
      console.log(`📎 ${client.getBaseUrl()}${full?._links?.webui ?? existing._links?.webui}`);
    } else {
      const page = await client.createPageWithBody(parentPageId, title, body);
      for (const f of attachmentFiles) {
        await client.uploadAttachment(page.id, f);
      }
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
