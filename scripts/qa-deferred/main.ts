#!/usr/bin/env ts-node

/**
 * QA Deferred Recommendations — CLI Utility
 *
 * Manages the "QA Deferred Recommendations / Known Limitations (MVP Phase 1)"
 * Confluence page by generating Confluence Storage Format (XHTML) or Markdown
 * tables from a JSON input file.
 *
 * Usage:
 *   # Generate page template (no data) → stdout
 *   npm run qa:deferred:generate-page
 *
 *   # Render rows as Confluence storage XHTML → stdout
 *   npm run qa:deferred:add-rows -- --input data/qa-deferred/items.json
 *
 *   # Render rows as Markdown → stdout
 *   npm run qa:deferred:add-rows -- --input data/qa-deferred/items.json --format markdown
 *
 *   # Push full page to Confluence (reads + appends)
 *   npm run qa:deferred:update -- --input data/qa-deferred/items.json
 *
 *   # With sorting and dedup
 *   npm run qa:deferred:add-rows -- --input items.json --sort-by area --dedupe-by jira_key
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { validateItems, type DeferredItem, type DeferredItemInput, VALID_SORT_FIELDS, type SortField } from './model';
import { sortItems, mergeItems, dedupeByJiraKey } from './utils';
import * as confluenceRenderer from './confluence-renderer';
import * as markdownRenderer from './markdown-renderer';

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------
const envPaths = [
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

const JIRA_BASE_URL = (process.env.JIRA_BASE_URL || 'https://accelins.atlassian.net').replace(/\/+$/, '');
const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'SA';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';

const PAGE_ID = '2961408071';

// ---------------------------------------------------------------------------
// CLI arg parsing (lightweight, no extra deps)
// ---------------------------------------------------------------------------
interface CliArgs {
  command: 'generate-page' | 'add-rows' | 'update-confluence';
  input?: string;
  format: 'confluence-storage' | 'markdown';
  sortBy: SortField;
  ascending: boolean;
  dedupeByJiraKey: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const command = args[0] as CliArgs['command'];

  if (!['generate-page', 'add-rows', 'update-confluence'].includes(command)) {
    printUsage();
    process.exit(1);
  }

  let input: string | undefined;
  let format: CliArgs['format'] = 'confluence-storage';
  let sortBy: SortField = 'date_raised';
  let ascending = false;
  let dedupe = false;

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--input':
        input = args[++i];
        break;
      case '--format':
        format = args[++i] as CliArgs['format'];
        if (!['confluence-storage', 'markdown'].includes(format)) {
          console.error(`Invalid --format: ${format}. Use "confluence-storage" or "markdown".`);
          process.exit(1);
        }
        break;
      case '--sort-by': {
        const val = args[++i] as SortField;
        if (!VALID_SORT_FIELDS.includes(val)) {
          console.error(`Invalid --sort-by: ${val}. Allowed: ${VALID_SORT_FIELDS.join(', ')}`);
          process.exit(1);
        }
        sortBy = val;
        break;
      }
      case '--ascending':
        ascending = true;
        break;
      case '--dedupe-by':
        if (args[++i] !== 'jira_key') {
          console.error('Only --dedupe-by jira_key is supported.');
          process.exit(1);
        }
        dedupe = true;
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printUsage();
        process.exit(1);
    }
  }

  return { command, input, format, sortBy, ascending, dedupeByJiraKey: dedupe };
}

function printUsage(): void {
  console.log(`
Usage:
  ts-node scripts/qa-deferred/main.ts <command> [options]

Commands:
  generate-page          Output the full page skeleton (template only, no data rows)
  add-rows               Render rows from --input as Confluence XHTML or Markdown
  update-confluence      Push the full page (skeleton + data) to the Confluence page

Options:
  --input <path>         Path to JSON file with items array (required for add-rows / update-confluence)
  --format <fmt>         "confluence-storage" (default) or "markdown"
  --sort-by <field>      Sort field: date_raised (default), area, decision, jira_key
  --ascending            Sort ascending instead of descending
  --dedupe-by jira_key   Remove duplicate Jira keys (last occurrence wins)

npm scripts:
  npm run qa:deferred:generate-page
  npm run qa:deferred:add-rows -- --input data/qa-deferred/items.json
  npm run qa:deferred:add-rows -- --input data/qa-deferred/items.json --format markdown
  npm run qa:deferred:update -- --input data/qa-deferred/items.json
`);
}

// ---------------------------------------------------------------------------
// Input loading
// ---------------------------------------------------------------------------
function loadItems(inputPath: string): DeferredItemInput[] {
  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`Invalid JSON in ${resolved}`);
    process.exit(1);
  }

  const items = Array.isArray(parsed) ? parsed : (parsed as any).items;
  if (!Array.isArray(items)) {
    console.error('JSON must be an array or an object with an "items" array.');
    process.exit(1);
  }

  return items as DeferredItemInput[];
}

function loadStdin(): DeferredItemInput[] {
  const raw = fs.readFileSync(0, 'utf-8');
  const parsed = JSON.parse(raw);
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) {
    throw new Error('STDIN JSON must be an array or an object with an "items" array.');
  }
  return items as DeferredItemInput[];
}

// ---------------------------------------------------------------------------
// Confluence API helpers (same pattern as update-confluence-doc.ts)
// ---------------------------------------------------------------------------
function createConfluenceClient() {
  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set in .env.qa');
    process.exit(1);
  }
  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  return axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

async function updateConfluencePage(content: string): Promise<void> {
  const client = createConfluenceClient();

  console.log('\n  Reading current page version...');
  const { data: currentPage } = await client.get(`/content/${PAGE_ID}?expand=version`);
  const currentVersion = currentPage.version.number;
  console.log(`  Current version: ${currentVersion} — "${currentPage.title}"`);

  console.log('  Uploading new content...');
  await client.put(`/content/${PAGE_ID}`, {
    id: PAGE_ID,
    type: 'page',
    title: currentPage.title,
    space: { key: CONFLUENCE_SPACE_KEY },
    body: {
      storage: {
        value: content,
        representation: 'storage',
      },
    },
    version: {
      number: currentVersion + 1,
      message: 'Updated QA Deferred Recommendations via automation',
    },
  });

  console.log(`  Done — version ${currentVersion + 1} published.`);
  console.log(`  View: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PAGE_ID}\n`);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
function processItems(
  rawInputs: DeferredItemInput[],
  opts: Pick<CliArgs, 'sortBy' | 'ascending' | 'dedupeByJiraKey'>,
): DeferredItem[] {
  let items = validateItems(rawInputs, JIRA_BASE_URL);
  if (opts.dedupeByJiraKey) {
    items = dedupeByJiraKey(items);
  }
  items = sortItems(items, opts.sortBy, opts.ascending);
  return items;
}

async function run(): Promise<void> {
  const cli = parseArgs();

  switch (cli.command) {
    // -- generate-page: full skeleton with empty table --
    case 'generate-page': {
      console.error('Generating page template (no data rows)...\n');
      const renderer = cli.format === 'markdown' ? markdownRenderer : confluenceRenderer;
      const output = renderer.renderFullPage([]);
      console.log(output);
      break;
    }

    // -- add-rows: render items to stdout --
    case 'add-rows': {
      const rawInputs = cli.input ? loadItems(cli.input) : loadStdin();
      const items = processItems(rawInputs, cli);

      console.error(`Rendering ${items.length} item(s) as ${cli.format}...\n`);
      const renderer = cli.format === 'markdown' ? markdownRenderer : confluenceRenderer;
      const output = renderer.renderFullPage(items);
      console.log(output);
      break;
    }

    // -- update-confluence: push to Confluence --
    case 'update-confluence': {
      if (!cli.input) {
        console.error('--input is required for update-confluence.');
        process.exit(1);
      }
      const rawInputs = loadItems(cli.input);
      const items = processItems(rawInputs, cli);

      console.log(`\n  QA Deferred Recommendations — Confluence Updater`);
      console.log(`  ════════════════════════════════════════════════\n`);
      console.log(`  Items to publish: ${items.length}`);
      console.log(`  Page ID: ${PAGE_ID}`);
      console.log(`  Format: Confluence Storage (XHTML)`);

      const content = confluenceRenderer.renderFullPage(items);
      await updateConfluencePage(content);
      break;
    }
  }
}

run().catch((err) => {
  console.error('\nFatal error:', err.message || err);
  if (err.response) {
    console.error('  Status:', err.response.status);
    console.error('  Body:', JSON.stringify(err.response.data, null, 2));
  }
  process.exit(1);
});
