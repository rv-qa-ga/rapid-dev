#!/usr/bin/env ts-node

/**
 * Create or update child pages under TM Testing Processes folders (descriptive titles, not "Overview").
 * Parent hub (rewritten as navigation hub): https://accelins.atlassian.net/wiki/spaces/TM/pages/1961721940/Testing+Processes
 *   Run separately: npm run confluence:update:testing-processes-hub
 *
 * Folder page IDs (TM):
 *   Test Planning folder      3186688051
 *   Test Design folder        3185672265
 *   Test Execution folder     3184722009
 *   Defect Management folder  3185213495
 *
 * Requires: ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN in src/config/env/.env.qa
 *
 * Usage:
 *   npx ts-node scripts/create-testing-processes-overview-pages.ts
 *   npm run confluence:create:testing-processes-overviews
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

/** Descriptive titles (unique in TM space). */
const TITLE_PLANNING = 'Scope, boards, and programme test plans';
const TITLE_DESIGN = 'Scenarios, coverage, and automation';
const TITLE_EXECUTION = 'Runs, environments, and evidence';
const TITLE_DEFECTS = 'Defect lifecycle and triage';

const PARENT_PAGE_ID = '1961721940';
const DEFECT_DIAGRAM_FILENAME = 'image-20250129-222946.png';

/** Prior titles to find existing pages for rename/update. */
const ALIASES_PLANNING = [TITLE_PLANNING, 'Overview — test planning', 'Overview'];
const ALIASES_DESIGN = [TITLE_DESIGN, 'Overview — test design'];
const ALIASES_EXECUTION = [TITLE_EXECUTION, 'Overview — test execution'];
const ALIASES_DEFECTS = [TITLE_DEFECTS, 'Overview — defect management'];

const FOLDER_TEST_PLANNING = '3186688051';
const FOLDER_TEST_DESIGN = '3185672265';
const FOLDER_TEST_EXECUTION = '3184722009';
const FOLDER_DEFECT_MANAGEMENT = '3185213495';

const LINK_TESTING_PROCESSES = `https://accelins.atlassian.net/wiki/spaces/TM/pages/${PARENT_PAGE_ID}/Testing+Processes`;
const DEFECT_DIAGRAM_DOWNLOAD_URL = `https://accelins.atlassian.net/wiki/download/attachments/${PARENT_PAGE_ID}/${DEFECT_DIAGRAM_FILENAME}`;
const LINK_WORKFLOW_GUIDE =
  'https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide';
const LINK_TEST_AUTOMATION = 'https://accelins.atlassian.net/wiki/spaces/TM/pages/1982333036/Test+Automation';
const LINK_SAMPLE_TEST_PLAN_SA =
  'https://accelins.atlassian.net/wiki/spaces/SA/pages/2532114485/QA+Test+Plan+Strategy+and+Approach';

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

function h3(title: string): string {
  return `<h3>${title}</h3>`;
}

function ul(items: string[]): string {
  const lis = items.map((t) => `<li style="color:#172B4D;">${t}</li>`).join('');
  return `<ul>${lis}</ul>`;
}

/** Single footer: detailed cross-links and contacts live on the Testing Processes hub. */
function hubFooter(): string {
  return p(
    `Cross-links to the workflow guide, automation landing, and contacts: <a href="${LINK_TESTING_PROCESSES}">Testing Processes hub</a>.`
  );
}

function buildOverviewPlanningBody(): string {
  return (
    h2('Purpose') +
    p(
      'Align the delivery team on <strong>what</strong> we will validate, <strong>when</strong>, and what &ldquo;ready to design and test&rdquo; means so we do not start detailed design or execution on unclear scope.'
    ) +
    h2('Programme test plans vs team boards') +
    p(
      'For <strong>large or programme-level initiatives</strong> (for example a major Salesforce implementation), we maintain a <strong>standalone test plan</strong> in Confluence for that programme. It complements work tracked in <strong>Jira</strong> and <strong>Zephyr Scale</strong> today; we previously used <strong>Azure DevOps</strong> for similar artefacts.'
    ) +
    p(
      '<strong>Sample only:</strong> The link below is <strong>one example</strong> of a programme test plan. <strong>Other programmes publish their own test plans in the appropriate Confluence space</strong>&mdash;we do not list every programme on this page.'
    ) +
    p(
      `<a href="${LINK_SAMPLE_TEST_PLAN_SA}">QA Test Plan Strategy and Approach</a> <em>(sample &mdash; SA space)</em>`
    ) +
    p(
      'For <strong>most other work</strong> that is not run as a dedicated programme with its own master plan, we <strong>do not</strong> create a separate Confluence test plan for every initiative. <strong>Test design, test execution, and evidence</strong> are managed on the <strong>team&rsquo;s boards and test tools</strong> so delivery stays lightweight and traceable.'
    ) +
    h3('When we publish a formal test plan') +
    p('It normally includes standard sections such as:') +
    ul([
      'Objectives and context',
      'Scope (<strong>in scope</strong> / <strong>out of scope</strong>)',
      'Assumptions and dependencies',
      'Test approach (levels, types, entry/exit)',
      'Environments and data',
      'Schedule or milestones and risks',
      'Roles and communications',
      'Deliverables and references (e.g. Jira epics, Zephyr folders, automation strategy)',
    ]) +
    h2('Outcomes (&ldquo;good looks like&rdquo;)') +
    ul([
      'Shared understanding of acceptance criteria and risks',
      'Test scope agreed for the increment or release; dependencies and environments visible',
      'No surprise must-haves mid-cycle without a conscious trade-off',
    ]) +
    h2('Who&rsquo;s involved') +
    ul([
      'Product owner / BA',
      'Engineering lead',
      'QA lead',
      'Feature team (as applicable)',
    ]) +
    h2('Typical flow (tool-agnostic)') +
    ul([
      'Refine backlog items and clarify acceptance and non-functionals',
      'Agree priority and cut-line for the timebox',
      'Agree where scenarios and runs will be recorded (today: <strong>Jira</strong> and <strong>Zephyr</strong>; historically: <strong>Azure DevOps</strong>)',
    ]) +
    h2('Entry and exit signals') +
    ul([
      '<strong>Entry:</strong> backlog item has a clear goal and acceptance; dependencies are visible.',
      '<strong>Exit:</strong> scope and priority agreed for design and execution; open questions are resolved or owned with a date.',
    ]) +
    hubFooter()
  );
}

function buildOverviewDesignBody(): string {
  return (
    h2('Purpose') +
    p(
      'Turn agreed scope into <strong>clear, reviewable checks</strong> (manual, automated, or both) so execution is predictable and evidence can be traced back to the work item.'
    ) +
    h2('Outcomes (&ldquo;good looks like&rdquo;)') +
    ul([
      'Scenarios and cases cover acceptance and main risks',
      'Ownership is clear for automated vs manual coverage where both apply',
      'Peer or team review happens before mass execution',
      'Artefacts link back to the Jira work item (Zephyr and repo where used)',
    ]) +
    h2('Who&rsquo;s involved') +
    ul([
      'QA (lead and engineers)',
      'BA / product owner for clarification',
      'Developers for edge cases and testability',
    ]) +
    h2('Typical flow (tool-agnostic)') +
    p(
      'Derive scenarios from acceptance criteria &rarr; review &rarr; record in test management. <strong>Today:</strong> <strong>Jira</strong> and <strong>Zephyr Scale</strong>. <strong>Previously:</strong> Azure DevOps test artefacts.'
    ) +
    p(
      '<strong>Automation:</strong> scenarios may be expressed in BDD and automated in the shared framework; see the <a href="' +
        LINK_WORKFLOW_GUIDE +
        '">Complete Workflow Guide</a> for the detailed path. <strong>Context:</strong> <a href="' +
        LINK_TEST_AUTOMATION +
        '">Test Automation</a>. Teams may use <strong>Cursor</strong> (or similar) to speed drafting while following the same engineering standards as the repo&mdash;keep behaviour and data rules explicit.'
    ) +
    h2('Test case review (framework-generated tests in Zephyr)') +
    p(
      'When test cases are <strong>generated by the automation framework</strong> and pushed to <strong>Zephyr Scale</strong>, they are not treated as final until QA has reviewed them. The lifecycle below keeps draft noise out of execution and makes coverage honest.'
    ) +
    ul([
      '<strong>Draft on creation</strong> &mdash; Newly generated test cases are created in <strong>Draft</strong> (or equivalent) status until they have been through review.',
      '<strong>After upload to Zephyr</strong> &mdash; Once the cases exist in Zephyr, a <strong>QA engineer</strong> reviews each test case for relevance, clarity, duplication, and fit to the work item.',
      '<strong>Approved</strong> &mdash; If the test case is valid and should be part of the active catalogue, QA updates the Zephyr status to <strong>Approved</strong> so it can be planned into cycles and executed with confidence.',
      '<strong>Deprecated</strong> &mdash; If a test case is <strong>not necessary</strong> (duplicate, obsolete, or superseded), QA marks it as <strong>Deprecated</strong> in Zephyr so it is excluded from normal planning while history remains traceable.',
      '<strong>Automated</strong> &mdash; When the scenario is implemented in the automation framework and the Zephyr record reflects that reality, QA updates the Zephyr status to <strong>Automated</strong> so manual and automated coverage stay aligned.',
    ]) +
    p(
      '<em>Exact status names should match your Zephyr workflow configuration; adjust labels in Zephyr if your project uses different pick-list values.</em>'
    ) +
    h2('Entry and exit signals') +
    ul([
      '<strong>Entry:</strong> planning exit criteria met; scope stable enough to design against.',
      '<strong>Exit:</strong> scenarios or cases reviewed and in a <strong>ready-to-run</strong> state for the agreed scope.',
    ]) +
    hubFooter()
  );
}

function buildOverviewExecutionBody(): string {
  return (
    h2('Purpose') +
    p(
      'Run the agreed checks in the right <strong>environment</strong> and <strong>timebox</strong>, record <strong>results</strong> and <strong>evidence</strong>, and make pass/fail and stop-go <strong>visible</strong> to the team.'
    ) +
    h2('Outcomes (&ldquo;good looks like&rdquo;)') +
    ul([
      'Executions map to the agreed scope',
      'Failures are visible, reproducible, and actionable',
      'Evidence supports audit and debugging',
      'Reruns and environment issues are distinguishable in the record',
    ]) +
    h2('Who&rsquo;s involved') +
    ul([
      'QA execution',
      'Developers for environment and fixes',
      'Product owner / BA for acceptance on ambiguous outcomes',
    ]) +
    h2('Typical flow (tool-agnostic)') +
    p(
      'Select build and environment &rarr; execute manual and/or automated suites &rarr; attach evidence &rarr; record status in test management and link to <strong>Jira</strong>. <strong>Today:</strong> <strong>Jira</strong>, <strong>Zephyr</strong>, and <strong>Confluence</strong> for evidence where used; automated suites run via <strong>GitHub</strong> pipelines and runners as described in the <a href="' +
        LINK_WORKFLOW_GUIDE +
        '">Complete Workflow Guide</a>. <strong>Previously:</strong> Azure DevOps Test Plans and runs.'
    ) +
    p(
      'More automation context: <a href="' + LINK_TEST_AUTOMATION + '">Test Automation</a>.'
    ) +
    h2('QA sign-off') +
    p(
      'When execution is complete for a <strong>Jira</strong> work item, record a <strong>clear sign-off in the work item comments</strong> so auditors and delivery can find evidence quickly. We normally include a <strong>link to the Zephyr Scale test cycle</strong> (or the cycle your project uses) where <strong>evidence is attached</strong> (executions, attachments, and any Confluence evidence links your process requires).'
    ) +
    ul([
      '<strong>State QA sign-off explicitly</strong> &mdash; Use wording your programme agrees on (for example that the item is <strong>QA signed off</strong> for the agreed scope) so the status is obvious from the comment history.',
      '<strong>Known issues</strong> &mdash; If sign-off applies but there are <strong>known limitations or open defects</strong>, summarise them in the same comment (what remains at risk, whether the business accepts it, and any linked Jira follow-ups).',
      '<strong>Risk-based testing</strong> &mdash; If completion relied on a <strong>risk-based</strong> or <strong>targeted</strong> approach (not full regression everywhere), say so <strong>explicitly</strong>: what was exercised, what was consciously out of scope, and who agreed.',
      '<strong>One place to look</strong> &mdash; The combination of <strong>cycle link + explicit sign-off language + caveats</strong> in the work item comment gives auditors a single anchor when they search for evidence against a specific item.',
    ]) +
    h2('Entry and exit signals') +
    ul([
      '<strong>Entry:</strong> design exit met; environment and build identified.',
      '<strong>Exit:</strong> agreed scope executed or consciously deferred with a record; no silent unknowns for release-critical gaps.',
    ]) +
    hubFooter()
  );
}

function buildOverviewDefectBody(): string {
  const diagramBlock =
    h2('Defect process diagram') +
    p(
      'The diagram below matches the <strong>Defect management</strong> section on the parent <a href="' +
        LINK_TESTING_PROCESSES +
        '">Testing Processes</a> hub. It illustrates the standard workflow; <strong>today</strong> defects are raised and tracked in <strong>Jira</strong> (and linked to <strong>Zephyr</strong> where used), whereas the parent page text referred to <strong>Azure DevOps</strong> historically.'
    ) +
    `<p style="text-align:center;"><ac:image ac:align="center" ac:width="600"><ri:url ri:value="${DEFECT_DIAGRAM_DOWNLOAD_URL}" /></ac:image></p>` +
    p(
      '<em>If the image does not render for you, open the parent page and view the attachment there, or download:</em> <a href="' +
        DEFECT_DIAGRAM_DOWNLOAD_URL +
        '">' +
        DEFECT_DIAGRAM_FILENAME +
        '</a>'
    );

  return (
    h2('Purpose') +
    p(
      'When behaviour does not match agreed expectations, capture <strong>enough context</strong> to fix quickly, <strong>prioritise</strong> fairly, and <strong>reduce recurrence</strong> where we can.'
    ) +
    diagramBlock +
    h2('Outcomes (&ldquo;good looks like&rdquo;)') +
    ul([
      'Defects are reproducible, prioritised, and linked to scope and tests',
      'Fixes are verified before close',
      'Follow-up work (regression test, automation, or task) is captured when needed',
    ]) +
    h2('Who&rsquo;s involved') +
    ul([
      'QA (raise and verify)',
      'Developers (fix)',
      'QA lead and engineering lead (severity and scheduling)',
      'Product owner (business priority)',
    ]) +
    h2('Typical flow (tool-agnostic)') +
    p(
      'Reproduce &rarr; log with evidence &rarr; triage &rarr; fix &rarr; verify &rarr; close. Link the item to the <strong>Jira</strong> work item and to <strong>Zephyr</strong> execution where applicable. <strong>Previously:</strong> a similar loop in <strong>Azure DevOps</strong>.'
    ) +
    p(
      'How failures feed automation and evidence practices: <a href="' +
        LINK_WORKFLOW_GUIDE +
        '">Complete Workflow Guide</a>; <a href="' +
        LINK_TEST_AUTOMATION +
        '">Test Automation</a>.'
    ) +
    h2('Entry and exit signals') +
    ul([
      '<strong>Entry:</strong> failed expectation with evidence attached.',
      '<strong>Exit:</strong> resolution verified; any follow-up test or task is logged.',
    ]) +
    hubFooter()
  );
}

async function findChildByAliases(
  client: ConfluenceClient,
  folderId: string,
  aliases: string[]
): Promise<{ id: string; title?: string } | null> {
  for (const t of aliases) {
    const found = await client.findChildPageByTitleCaseInsensitive(folderId, t);
    if (found?.id) return found;
  }
  return null;
}

async function upsertPage(
  client: ConfluenceClient,
  folderId: string,
  title: string,
  label: string,
  body: string,
  aliasTitles: string[]
): Promise<void> {
  const existing = await findChildByAliases(client, folderId, aliasTitles);
  if (existing?.id) {
    const page = await client.getPage(existing.id, { expand: 'version' });
    if (!page) {
      throw new Error(`Could not re-fetch page ${existing.id}`);
    }
    const ver = page.version?.number ?? 1;
    await client.updatePageContent(existing.id, body, ver + 1, {
      title,
      message: `Testing Processes / ${label}`,
    });
    console.log(`   ✅ Updated: ${label} → "${title}" (${existing.id})`);
  } else {
    const created = await client.createPageWithBody(folderId, title, body);
    console.log(`   ✅ Created: ${label} → "${title}" (${created.id})`);
  }
}

async function main(): Promise<void> {
  console.log('\n📄 TM — Testing Processes folder Overview pages');
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

  await upsertPage(
    client,
    FOLDER_TEST_PLANNING,
    TITLE_PLANNING,
    'Test Planning folder',
    buildOverviewPlanningBody(),
    ALIASES_PLANNING
  );
  await upsertPage(
    client,
    FOLDER_TEST_DESIGN,
    TITLE_DESIGN,
    'Test Design folder',
    buildOverviewDesignBody(),
    ALIASES_DESIGN
  );
  await upsertPage(
    client,
    FOLDER_TEST_EXECUTION,
    TITLE_EXECUTION,
    'Test Execution folder',
    buildOverviewExecutionBody(),
    ALIASES_EXECUTION
  );
  await upsertPage(
    client,
    FOLDER_DEFECT_MANAGEMENT,
    TITLE_DEFECTS,
    'Defect Management folder',
    buildOverviewDefectBody(),
    ALIASES_DEFECTS
  );

  console.log('\n✅ Done. Parent hub: ' + LINK_TESTING_PROCESSES + ' (run confluence:update:testing-processes-hub to refresh hub layout)\n');
}

main().catch((e) => {
  console.error(e?.response?.data || e?.message || e);
  process.exit(1);
});
