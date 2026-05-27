#!/usr/bin/env ts-node
/**
 * Scan src/features/api/SF and src/features/ui/SF for *.feature files; emit Confluence-ready Markdown.
 *
 * Conflict rule (for humans / Jira sync): when stories disagree, prefer the higher SF-* number (newer backlog key);
 * optional Jira `created` tie-break via --enrich-jira (batch API).
 *
 * Confluence reads use framework ConfluenceClient + storageHtmlToPlainText (read-only).
 * Automation-authored structure lives in **TM** space only; optional reference page IDs (e.g. SA home) are merged as plain text — **no pages are created outside TM**.
 *
 * Usage:
 *   npx ts-node scripts/knowledge/generate-salesforce-knowledge-from-features.ts
 *   npx ts-node scripts/knowledge/generate-salesforce-knowledge-from-features.ts --reference-pages 2412675671
 *   npx ts-node scripts/knowledge/generate-salesforce-knowledge-from-features.ts --reference-pages 2412675671 --reference-children
 *   npx ts-node scripts/knowledge/generate-salesforce-knowledge-from-features.ts --out docs/knowledge/salesforce-test-knowledge-base.md
 *   npx ts-node scripts/knowledge/generate-salesforce-knowledge-from-features.ts --enrich-jira
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const ROOT = path.resolve(__dirname, '../..');

const ENV_QA_PATHS = [
  path.join(ROOT, 'src/config/env/.env.qa'),
  path.join(ROOT, '.env.qa'),
  path.join(ROOT, '.env'),
];

function loadEnv(): void {
  for (const p of ENV_QA_PATHS) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
      break;
    }
  }
}

interface WorkItemRow {
  key: string;
  num: number;
  featureTitle: string;
  apiPath: string | null;
  uiPath: string | null;
  jiraCreated?: string;
  jiraSummary?: string;
  jiraStatus?: string;
}

function parseSfKey(fileBase: string): string | null {
  const m = fileBase.match(/^(SF-\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

function readFeatureTitle(filePath: string): string {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const line = raw.split(/\r?\n/).find((l) => /^Feature:\s*/i.test(l));
  if (!line) return '(no Feature: line)';
  return line.replace(/^Feature:\s*/i, '').trim();
}

function collectRows(): Map<string, WorkItemRow> {
  const dirs = [
    path.join(ROOT, 'src/features/api/SF'),
    path.join(ROOT, 'src/features/ui/SF'),
  ];
  const map = new Map<string, WorkItemRow>();

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const kind = dir.includes(`${path.sep}api${path.sep}`) ? 'api' : 'ui';
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.feature')) continue;
      const key = parseSfKey(path.basename(name, '.feature'));
      if (!key) continue;
      const num = parseInt(key.replace(/^SF-/i, ''), 10);
      const rel = path.relative(ROOT, path.join(dir, name)).replace(/\\/g, '/');
      const title = readFeatureTitle(path.join(dir, name));

      let row = map.get(key);
      if (!row) {
        row = {
          key,
          num,
          featureTitle: title,
          apiPath: null,
          uiPath: null,
        };
        map.set(key, row);
      }
      if (kind === 'api') row.apiPath = rel;
      else row.uiPath = rel;

      if (title.length > row.featureTitle.length || row.featureTitle.startsWith('(no ')) {
        row.featureTitle = title;
      }
    }
  }
  return map;
}

function categoryFor(title: string): string {
  const t = title.toLowerCase();
  if (/\bdataverse|platform event|mule|integration field|dataverse_id|sync\b/.test(t)) return 'Integration & Dataverse';
  if (/\blead\b|conversion|convert/.test(t)) return 'Leads & conversion';
  if (/\bopportunity|contracting|readiness|mou|renewal|sub type|lifecycle/.test(t)) return 'Opportunities & contracting';
  if (/\baccount\b|member|mga|onboarding|status|governance|billing country|party|legal entity|mle|tpa map|relationship/.test(t))
    return 'Accounts, members & relationships';
  if (/\bcontact\b|accountteam|persona/.test(t)) return 'Contacts & teams';
  if (/\bquestionnaire|task|approval|workflow|committee|pog|ird|compliance|finance review|operations manager/.test(t))
    return 'Questionnaires, tasks & approvals';
  if (/\bvalidation|field update|rdm|reference|product map|metadata|country|region|currency/.test(t))
    return 'Validations, RDM & fields';
  return 'Other / cross-cutting';
}

async function enrichFromJira(rows: WorkItemRow[]): Promise<void> {
  loadEnv();
  const base = (process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
  const email = process.env.JIRA_EMAIL || process.env.ATLASSIAN_EMAIL;
  const token = process.env.JIRA_API_TOKEN || process.env.ATLASSIAN_API_TOKEN;
  if (!base || !email || !token) {
    console.warn('Skipping Jira enrich: set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in .env.qa');
    return;
  }
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const chunkSize = 40;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const jql = `key in (${chunk.map((r) => r.key).join(',')})`;
    const res = await fetch(`${base}/rest/api/3/search`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql,
        maxResults: chunkSize,
        fields: ['summary', 'created', 'status'],
      }),
    });
    if (!res.ok) {
      console.warn(`Jira search failed ${res.status}: ${await res.text()}`);
      return;
    }
    const data = (await res.json()) as {
      issues?: Array<{
        key: string;
        fields: { summary?: string; created?: string; status?: { name?: string } };
      }>;
    };
    const byKey = new Map(data.issues?.map((iss) => [iss.key, iss]) || []);
    for (const row of chunk) {
      const iss = byKey.get(row.key);
      if (iss?.fields) {
        row.jiraSummary = iss.fields.summary;
        row.jiraCreated = iss.fields.created?.slice(0, 10);
        row.jiraStatus = iss.fields.status?.name;
      }
    }
  }
}

const TM_KNOWLEDGE_HUB =
  'https://accelins.atlassian.net/wiki/spaces/TM/pages/1961787450/Knowledge+Base+%E2%80%94+Test+%26+integration+automation';
const TM_SALESFORCE_CHILD_DEFAULT = '3146645519';

async function fetchConfluenceReferenceAppendix(
  pageIds: string[],
  options: { includeChildren: boolean }
): Promise<string> {
  if (pageIds.length === 0) return '';

  const { ConfluenceClient } = await import('../../src/integrations/confluence/client');
  const { storageHtmlToPlainText } = await import('../../src/integrations/confluence/storage-html-to-plain');

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY,
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });
  if (!client.isConfigured()) {
    return '\n\n_(Reference Confluence fetch skipped: ATLASSIAN credentials not set.)_\n';
  }

  const base = client.getBaseUrl();
  const parts: string[] = [];
  parts.push('## Reference — existing Confluence pages (read-only excerpt)');
  parts.push('');
  parts.push(
    '*Plain text extracted via `ConfluenceClient` + `storageHtmlToPlainText`. Use for reconciliation only; **TM** remains where automation maintains the knowledge hub structure.*'
  );
  parts.push('');

  for (const id of pageIds) {
    const trimmed = id.trim();
    if (!trimmed) continue;
    try {
      const page = await client.getPage(trimmed, { expand: 'version,body.storage' });
      if (!page) {
        parts.push(`### Page ID ${trimmed}`);
        parts.push('_(not found or no access)_');
        parts.push('');
        continue;
      }
      const body = (page as { body?: { storage?: { value: string } } }).body?.storage?.value ?? '';
      parts.push(`### ${page.title}`);
      parts.push(`*Source: ${base}${(page as { _links?: { webui?: string } })._links?.webui || `/pages/${trimmed}`}*`);
      parts.push('');
      parts.push('```');
      parts.push(storageHtmlToPlainText(body) || '(empty body)');
      parts.push('```');
      parts.push('');

      if (options.includeChildren) {
        const children = await client.getChildPages(trimmed, { limit: 50 });
        for (const ch of children) {
          const full = await client.getPage(ch.id, { expand: 'body.storage' });
          const chBody = (full as { body?: { storage?: { value: string } } })?.body?.storage?.value ?? '';
          parts.push(`#### Child: ${ch.title}`);
          parts.push(`*${base}${ch._links?.webui || ''}*`);
          parts.push('');
          parts.push('```');
          parts.push(storageHtmlToPlainText(chBody) || '(empty)');
          parts.push('```');
          parts.push('');
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      parts.push(`### Page ID ${trimmed}`);
      parts.push(`_(fetch error: ${msg})_`);
      parts.push('');
    }
  }
  return parts.join('\n');
}

function parseReferencePageIds(argv: string[], envCsv: string | undefined): string[] {
  const out: string[] = [];
  const fromEnv = (envCsv || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  out.push(...fromEnv);
  const flagIdx = argv.indexOf('--reference-pages');
  if (flagIdx >= 0 && argv[flagIdx + 1]) {
    argv[flagIdx + 1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((id) => out.push(id));
  }
  return [...new Set(out)];
}

function buildMarkdown(rows: WorkItemRow[], referenceAppendix: string): string {
  const sorted = [...rows].sort((a, b) => b.num - a.num);
  const jiraBase = (process.env.JIRA_BASE_URL || 'https://accelins.atlassian.net').replace(/\/+$/, '');

  const byCat = new Map<string, WorkItemRow[]>();
  for (const row of sorted) {
    const c = categoryFor(row.featureTitle);
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(row);
  }

  const catOrder = [
    'Integration & Dataverse',
    'Leads & conversion',
    'Opportunities & contracting',
    'Accounts, members & relationships',
    'Contacts & teams',
    'Questionnaires, tasks & approvals',
    'Validations, RDM & fields',
    'Other / cross-cutting',
  ];

  const lines: string[] = [];
  lines.push('# Salesforce — test automation knowledge (from repo)');
  lines.push('');
  lines.push(
    `*Generated by \`scripts/knowledge/generate-salesforce-knowledge-from-features.ts\` — ${new Date().toISOString().slice(0, 10)}*`
  );
  lines.push('');
  lines.push('## Purpose');
  lines.push(
    `This page maps **Jira work items (SF-*)** to **Cucumber feature files** in the automation repo. **Publish and maintain Salesforce automation knowledge under TM** — parent [Knowledge Base — Test & integration automation](${TM_KNOWLEDGE_HUB}), child page **Salesforce core functions** (page ID \`${process.env.CONFLUENCE_TM_SALESFORCE_KNOWLEDGE_PAGE_ID || TM_SALESFORCE_CHILD_DEFAULT}\`). Do **not** create parallel structure in SA; you may still **read** other spaces for context (see Reference section when \`--reference-pages\` / \`CONFLUENCE_KNOWLEDGE_REFERENCE_PAGE_IDS\` is set).`
  );
  lines.push('');
  lines.push('## Authority when requirements conflict');
  lines.push('');
  lines.push(
    '1. **Primary:** The **latest Jira story** wins. Treat **higher SF number** as newer scope unless the team agrees otherwise (e.g. SF-520 supersedes SF-19).'
  );
  lines.push(
    '2. **Tie-break:** If two keys could apply, use Jira **created date** (newer first). Enable \`--enrich-jira\` when regenerating this doc to pull \`created\` from Jira.'
  );
  lines.push(
    '3. **Automation:** Tests reflect a point-in-time; update Gherkin after Jira is updated — log drift on TM → **Drift log**.'
  );
  lines.push('');
  lines.push('## Inventory summary');
  lines.push('');
  lines.push(`- **Unique work items (from filenames):** ${sorted.length}`);
  lines.push(`- **API features:** ${sorted.filter((r) => r.apiPath).length} with \`src/features/api/SF/\``);
  lines.push(`- **UI features:** ${sorted.filter((r) => r.uiPath).length} with \`src/features/ui/SF/\``);
  lines.push('');
  lines.push('## Coverage by theme (auto-grouped from feature titles)');
  lines.push('');
  lines.push('*Grouping is heuristic; adjust sub-pages in Confluence for your canonical process areas.*');
  lines.push('');

  for (const cat of catOrder) {
    const list = byCat.get(cat);
    if (!list?.length) continue;
    lines.push(`### ${cat}`);
    lines.push('');
    lines.push('| SF key | Jira | Summary / Feature title | API | UI |');
    lines.push('| --- | --- | --- | --- | --- |');
    for (const r of list.sort((a, b) => b.num - a.num)) {
      const jiraCell = `[${r.key}](${jiraBase}/browse/${r.key})`;
      const sum = (r.jiraSummary || r.featureTitle).replace(/\|/g, '\\|');
      const api = r.apiPath ? `\`${r.apiPath}\`` : '—';
      const ui = r.uiPath ? `\`${r.uiPath}\`` : '—';
      lines.push(`| ${r.key} | ${jiraCell} | ${sum} | ${api} | ${ui} |`);
    }
    lines.push('');
  }

  lines.push('## Full list (SF key descending — “newest key first”)');
  lines.push('');
  lines.push('| SF key | Status (Jira) | Created | Summary | API path | UI path |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of sorted) {
    const sum = (r.jiraSummary || r.featureTitle).replace(/\|/g, '\\|');
    lines.push(
      `| ${r.key} | ${r.jiraStatus || '—'} | ${r.jiraCreated || '—'} | ${sum} | ${r.apiPath || '—'} | ${r.uiPath || '—'} |`
    );
  }
  lines.push('');
  lines.push('## Suggested TM-only follow-up (under Salesforce core functions)');
  lines.push('');
  lines.push(
    '- Expand the **Salesforce core functions** child in TM with sections or child pages you need (coverage table, Dataverse/MuleSoft themes, lifecycles, validations).'
  );
  lines.push('- Link to **Test coverage map** and **Drift log** siblings under the same TM parent.');
  lines.push('- Theme examples for editors: Dataverse / MuleSoft (SF-612, SF-788, …); account & opportunity lifecycles; SF-1044 / SF-1045 validations; RDM / platform events.');
  lines.push('');
  if (referenceAppendix.trim()) {
    lines.push(referenceAppendix);
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  loadEnv();
  const args = process.argv.slice(2);
  let outPath = path.join(ROOT, 'docs/knowledge/salesforce-test-knowledge-base.md');
  let enrich = false;
  let refChildren = args.includes('--reference-children');
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) outPath = path.resolve(process.cwd(), args[++i]);
    if (args[i] === '--enrich-jira') enrich = true;
  }

  const refIds = parseReferencePageIds(args, process.env.CONFLUENCE_KNOWLEDGE_REFERENCE_PAGE_IDS);
  const referenceAppendix =
    refIds.length > 0 ? await fetchConfluenceReferenceAppendix(refIds, { includeChildren: refChildren }) : '';

  const map = collectRows();
  const rows = [...map.values()].sort((a, b) => b.num - a.num);
  if (enrich) await enrichFromJira(rows);

  const md = buildMarkdown(rows, referenceAppendix);
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outPath, md, 'utf-8');
  console.log(`Wrote ${path.relative(ROOT, outPath)} (${rows.length} work items)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
