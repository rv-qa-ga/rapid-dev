#!/usr/bin/env ts-node

/**
 * Rewrite TM "Testing Processes" parent page (1961721940) as a navigation hub:
 * short intro, preserved top diagrams, navigation table with links to lifecycle folders,
 * related programme links, then legacy reference screenshots (same attachments).
 *
 * Requires: ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN (e.g. src/config/env/.env.qa)
 *
 * Usage:
 *   npx ts-node scripts/update-testing-processes-parent-hub.ts
 *   npm run confluence:update:testing-processes-hub
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

const PARENT_PAGE_ID = '1961721940';

/** Folder page IDs under Testing Processes (same as create-testing-processes-overview-pages.ts). */
const FOLDER_TEST_PLANNING = '3186688051';
const FOLDER_TEST_DESIGN = '3185672265';
const FOLDER_TEST_EXECUTION = '3184722009';
const FOLDER_DEFECT_MANAGEMENT = '3185213495';

/** Generic folder titles (Confluence folder pages under Testing Processes). */
const FOLDER_NAME_PLANNING = 'Test planning';
const FOLDER_NAME_DESIGN = 'Test design';
const FOLDER_NAME_EXECUTION = 'Test execution';
const FOLDER_NAME_DEFECTS = 'Defect management';

const LINK_WORKFLOW_GUIDE =
  'https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide';
const LINK_TEST_AUTOMATION = 'https://accelins.atlassian.net/wiki/spaces/TM/pages/1982333036/Test+Automation';

const REGRESSION_HUB_ALIASES = ['Regression testing', 'Regression testing folder', 'Regression Testing folder'];
const UAT_HUB_ALIASES = ['UAT and Prod Support', 'UAT and Prod support folder', 'UAT and prod support folder'];

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

function p(text: string): string {
  return `<p style="color:#172B4D;">${text}</p>`;
}

function h2(title: string): string {
  return `<h2>${title}</h2>`;
}

function pageUrl(client: ConfluenceClient, pageId: string): string {
  return `${client.getBaseUrl().replace(/\/$/, '')}/spaces/TM/pages/${pageId}`;
}

const HUB_INTRO_MARKER = '<h2>Testing processes hub</h2>';

/** Legacy narrative starts here; diagrams above stay on the hub (first publish only). */
function splitLegacyIntro(storage: string): { top: string; rest: string } {
  const m = storage.match(/<h3[^>]*>\s*Requirement Analysis\s*<\/h3>/i);
  if (!m || m.index === undefined) {
    return { top: '', rest: '' };
  }
  return { top: storage.slice(0, m.index).trim(), rest: storage.slice(m.index) };
}

function extractImages(storage: string): string[] {
  return [...storage.matchAll(/<ac:image[\s\S]*?<\/ac:image>/gi)].map((x) => x[0]);
}

/**
 * Dark-mode readability: the second overview diagram (work item statuses) is low-contrast on dark UI.
 * Wrap only the second Confluence image macro in a white table cell (idempotent if already wrapped).
 */
function wrapSecondAcImageInLightWell(html: string): string {
  const matches = [...html.matchAll(/<ac:image[\s\S]*?<\/ac:image>/gi)];
  if (matches.length < 2 || matches[1].index === undefined) return html;
  const start = matches[1].index;
  const pre = html.slice(Math.max(0, start - 160), start);
  if (pre.includes('tp-diagram-lightbox')) return html;
  const second = matches[1][0];
  const end = start + second.length;
  const wrapped =
    '<table class="wrapped confluenceTable tp-diagram-lightbox" style="margin-left:auto;margin-right:auto;max-width:100%;"><tbody><tr>' +
    '<td style="background-color:#FFFFFF;padding:16px 20px;border:1px solid #DFE1E6;">' +
    second +
    '</td></tr></tbody></table>';
  return html.slice(0, start) + wrapped + html.slice(end);
}

/**
 * Idempotent: after the first hub publish, split using our own headings so re-runs do not depend on legacy Azure copy.
 */
function splitExistingHub(storage: string): { visualInner: string; referenceInner: string } | null {
  if (!storage.includes(HUB_INTRO_MARKER)) return null;
  const visualM = storage.match(
    /<h2>Visual overview<\/h2>([\s\S]*?)<h2>Navigate by (?:topic|folder)<\/h2>/i
  );
  const refM = storage.match(
    /<h2>Reference snapshots \(legacy tooling\)<\/h2>([\s\S]*?)<h2>Open questions and contacts<\/h2>/i
  );
  return {
    visualInner: (visualM?.[1] ?? '').trim(),
    referenceInner: (refM?.[1] ?? '').trim(),
  };
}

/** When all images landed under Reference (failed split), move the two programme overview diagrams back up. */
function promoteFirstTwoImagesToVisual(referenceInner: string): { visualInner: string; referenceInner: string } {
  const imgs = extractImages(referenceInner);
  if (imgs.length < 2) return { visualInner: '', referenceInner };
  const topTwo = imgs.slice(0, 2);
  const rest = imgs.slice(2);
  const visualInner =
    '<h3>QA Process explained in the Overall Demand Management and Delivery Process</h3>' +
    `<p style="text-align:center;">${topTwo[0]}</p>` +
    '<h3><strong>Test Process and Work Item Statuses</strong></h3>' +
    `<p style="text-align:center;">${topTwo[1]}</p>`;
  const beforeFirstImage = referenceInner.split(/<ac:image/i)[0] ?? '';
  const referenceInnerNew =
    beforeFirstImage + rest.map((img) => `<p style="text-align:center;">${img}</p>`).join('');
  return { visualInner, referenceInner: referenceInnerNew.trim() };
}

function rebalanceHubSections(visualInner: string, referenceInner: string): { visualInner: string; referenceInner: string } {
  const hasVisualDiagram = /<ac:image/i.test(visualInner);
  if (hasVisualDiagram || extractImages(referenceInner).length < 2) {
    return { visualInner, referenceInner };
  }
  return promoteFirstTwoImagesToVisual(referenceInner);
}

function buildVisualAndReference(storage: string): { visualInner: string; referenceInner: string } {
  const hub = splitExistingHub(storage);
  if (hub && (hub.visualInner || hub.referenceInner)) {
    return rebalanceHubSections(hub.visualInner, hub.referenceInner);
  }
  const { top, rest } = splitLegacyIntro(storage);
  if (top && rest) {
    const imgs = extractImages(rest);
    const referenceInner =
      imgs.length > 0
        ? p(
            'The images below were captured when some teams used <strong>Azure DevOps</strong> for work items, test plans, and runs. The <strong>ideas</strong> (status flow, defect loop, sign-off sample) still apply; follow the <strong>Navigate by topic</strong> links for current Jira / Zephyr / Confluence practice.'
          ) + imgs.map((img) => `<p style="text-align:center;">${img}</p>`).join('')
        : '';
    return { visualInner: top, referenceInner };
  }
  console.warn(
    '⚠️  Could not split page (no hub markers and no legacy "Requirement Analysis" heading). Re-publish from a restored backup or paste legacy HTML once.'
  );
  return { visualInner: '', referenceInner: '' };
}

async function resolveChildId(
  client: ConfluenceClient,
  parentId: string,
  aliases: string[]
): Promise<string | null> {
  for (const t of aliases) {
    const found = await client.findChildPageByTitleCaseInsensitive(parentId, t);
    if (found?.id) return found.id;
  }
  return null;
}

function navTable(rows: Array<{ folder: string; summary: string; href: string }>): string {
  const head =
    '<thead><tr>' +
    '<th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Folder</th>' +
    '<th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Summary</th>' +
    '</tr></thead>';
  const bodyRows = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? '#FFFFFF' : '#F4F5F7';
      return (
        '<tr>' +
        `<td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:${bg};color:#172B4D;"><a href="${r.href}"><strong>${r.folder}</strong></a></td>` +
        `<td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:${bg};color:#172B4D;">${r.summary}</td>` +
        '</tr>'
      );
    })
    .join('');
  return `<table class="wrapped confluenceTable">${head}<tbody>${bodyRows}</tbody></table>`;
}

async function buildBody(client: ConfluenceClient, currentStorage: string): Promise<string> {
  const { visualInner, referenceInner } = buildVisualAndReference(currentStorage);

  const [idReg, idUat] = await Promise.all([
    resolveChildId(client, PARENT_PAGE_ID, REGRESSION_HUB_ALIASES),
    resolveChildId(client, PARENT_PAGE_ID, UAT_HUB_ALIASES),
  ]);

  const hubSelf = pageUrl(client, PARENT_PAGE_ID);
  const folderRow = (folder: string, summary: string, folderPageId: string) => ({
    folder,
    summary,
    href: pageUrl(client, folderPageId),
  });
  const hubFolderRow = (folder: string, summary: string, id: string | null) => ({
    folder,
    summary,
    href: id ? pageUrl(client, id) : hubSelf,
  });

  const navRows = [
    folderRow(
      FOLDER_NAME_PLANNING,
      'Scope on boards, programme-level test plans vs lightweight team-level planning.',
      FOLDER_TEST_PLANNING
    ),
    folderRow(
      FOLDER_NAME_DESIGN,
      'Scenarios, coverage, test catalogue hygiene, and alignment with automation.',
      FOLDER_TEST_DESIGN
    ),
    folderRow(
      FOLDER_NAME_EXECUTION,
      'Environments, runs, evidence, and QA sign-off on work items.',
      FOLDER_TEST_EXECUTION
    ),
    folderRow(
      FOLDER_NAME_DEFECTS,
      'Defect lifecycle, triage, and traceability back to scope and runs.',
      FOLDER_DEFECT_MANAGEMENT
    ),
    hubFolderRow(
      'Regression testing',
      'Regression suite maintenance and automated execution (child pages under this folder).',
      idReg
    ),
    hubFolderRow(
      'UAT and Prod Support',
      'UAT readiness, production feedback loop, and regression follow-up.',
      idUat
    ),
  ];

  if (!idReg) console.warn('⚠️  Regression testing folder not found under parent (create it or fix title).');
  if (!idUat) console.warn('⚠️  UAT and Prod Support folder not found under parent (create it or fix title).');

  const intro =
    h2('Testing processes hub') +
    p(
      'Use this page as the <strong>entry point</strong> for how we plan, design, execute, and close the loop on quality. Detailed guidance lives in the <strong>lifecycle folders</strong> linked below (each folder holds overview pages and related content) so this hub stays short and navigable.'
    ) +
    p(
      '<strong>Tooling today:</strong> <strong>Jira</strong>, <strong>Zephyr Scale</strong>, <strong>Confluence</strong>, and <strong>GitHub</strong>-based automation. Older screenshots that mention <strong>Azure DevOps</strong> are kept below as <strong>visual references</strong> only.'
    );

  const visual = visualInner
    ? h2('Visual overview') + wrapSecondAcImageInLightWell(visualInner)
    : h2('Visual overview') +
      p('<em>Diagrams could not be restored automatically; restore from page history or re-attach overview images.</em>');

  const navigate =
    h2('Navigate by folder') +
    p(
      'Open the <strong>folder</strong> for the phase you are in. Each folder groups the same lifecycle topics as standard test terminology; overview pages inside the folder link back here for cross-links and contacts.'
    ) +
    navTable(navRows);

  const related =
    h2('Programme automation and end-to-end workflow') +
    ul([
      `<a href="${LINK_WORKFLOW_GUIDE}">Complete Workflow Guide</a> &mdash; automation phases, commands, and evidence patterns.`,
      `<a href="${LINK_TEST_AUTOMATION}">Test Automation</a> &mdash; framework scope, execution strategy, and roadmap context.`,
    ]);

  const reference = referenceInner ? h2('Reference snapshots (legacy tooling)') + referenceInner : '';

  const contacts =
    h2('Open questions and contacts') +
    p(
      'For trade-offs and clarifications, involve the <strong>QA lead</strong>, <strong>Product owner</strong>, and <strong>Engineering lead</strong> (roles; add names in chat or meeting notes where needed).'
    );

  return (intro + visual + navigate + related + reference + contacts).trim();
}

function ul(items: string[]): string {
  const lis = items.map((t) => `<li style="color:#172B4D;">${t}</li>`).join('');
  return `<ul>${lis}</ul>`;
}

async function main(): Promise<void> {
  console.log('\n📄 TM — Testing Processes parent hub');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY || 'TM',
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });

  if (!client.isConfigured()) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (e.g. in src/config/env/.env.qa)');
    process.exit(1);
  }

  const page = await client.getPage(PARENT_PAGE_ID, { expand: 'version,body.storage' });
  if (!page?.version?.number) {
    console.error(`❌ Page ${PARENT_PAGE_ID} not found or not accessible.`);
    process.exit(1);
  }

  const storage = page.body?.storage?.value ?? '';
  const body = await buildBody(client, storage);
  const ver = page.version.number;

  await client.updatePageContent(PARENT_PAGE_ID, body, ver + 1, {
    title: page.title,
    message: 'Testing Processes: hub navigation uses lifecycle folder links',
  });

  console.log(`   ✅ Updated "${page.title}" (${PARENT_PAGE_ID}) v${ver} → v${ver + 1}`);
  console.log(`\n📎 ${pageUrl(client, PARENT_PAGE_ID)}\n✅ Done.\n`);
}

main().catch((e) => {
  console.error(e?.response?.data || e?.message || e);
  process.exit(1);
});
