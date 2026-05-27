#!/usr/bin/env ts-node

/**
 * "Regression testing" hub + child page under TM Testing Processes.
 * Regression maintenance + automation across CLM-connected systems (no duplicate of parent narrative).
 *
 * Usage:
 *   npx ts-node scripts/create-regression-testing-under-testing-processes.ts
 *   npm run confluence:create:regression-testing-folder
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

const PARENT_TESTING_PROCESSES = '1961721940';
const TITLE_FOLDER = 'Regression testing';
const TITLE_SUBPAGE = 'Regression suite maintenance and automation';

const FOLDER_ALIASES = [TITLE_FOLDER, 'Regression testing folder', 'Regression Testing folder'];

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

function buildFolderBody(): string {
  return `
<p style="color:#172B4D;">Hub for <strong>regression suite maintenance</strong> and <strong>automated regression execution</strong> across programmes. Detail on the child page.</p>
<ac:structured-macro ac:name="children" ac:schema-version="2">
  <ac:parameter ac:name="all">true</ac:parameter>
  <ac:parameter ac:name="sort">modified</ac:parameter>
</ac:structured-macro>
`.trim();
}

function buildSubpageBody(): string {
  return `
<h2>Maintenance of regression</h2>
<p style="color:#172B4D;">Regression suite maintenance is an <strong>ongoing activity</strong>. After each sprint or release, the team identifies <strong>regression candidates</strong>, tags them for the regression catalogue (for example with a <strong>Regression</strong> tag or equivalent in Zephyr), and <strong>updates the existing suite</strong> so it stays credible as the product changes.</p>
<p style="color:#172B4D;"><strong>Today</strong> this work is reflected in <strong>Jira</strong> and <strong>Zephyr Scale</strong> (folders, labels, or status fields your project configures). <strong>Previously</strong> similar tracking used <strong>Azure DevOps</strong> test suites and tagging.</p>

<h2>What &ldquo;good&rdquo; regression maintenance looks like</h2>
<ul>
<li style="color:#172B4D;"><strong>Candidate hygiene</strong> &mdash; After each sprint or release, triage new stories and defects to decide what becomes a durable regression check versus a one-off.</li>
<li style="color:#172B4D;"><strong>Tagging and ownership</strong> &mdash; Regression candidates carry a clear marker (for example a <strong>Regression</strong> tag or Zephyr folder) and an owner so the suite does not grow without intent.</li>
<li style="color:#172B4D;"><strong>Suite updates</strong> &mdash; Retire or merge duplicate cases; refresh steps when the UI or API contract changes; align Zephyr records with what the automation repo actually runs.</li>
<li style="color:#172B4D;"><strong>Scope vs risk</strong> &mdash; Not everything is regression-tier; the team agrees what must stay green every build versus what runs nightly or weekly.</li>
</ul>

<h2>Automation for regression execution across systems</h2>
<p style="color:#172B4D;">The <strong>end-to-end automation framework</strong> is used to execute regression checks <strong>across the CLM-connected landscape</strong>, not only a single UI. Typical layers in scope for automated regression (depending on programme and environment) include:</p>
<ul>
<li style="color:#172B4D;"><strong>Salesforce CRM</strong> &mdash; UI and API scenarios (accounts, opportunities, key flows) via Playwright and REST.</li>
<li style="color:#172B4D;"><strong>Integration (e.g. MuleSoft)</strong> &mdash; API contract and integration checks where they are part of the agreed regression pack.</li>
<li style="color:#172B4D;"><strong>Reference and configuration systems (e.g. RDM, CMT)</strong> &mdash; API-level regression where those systems participate in the release under test.</li>
<li style="color:#172B4D;"><strong>Data and file paths</strong> &mdash; Snowflake validation, ODS/TDS checks, Blob/SharePoint file flows where automated suites already exist for the programme.</li>
</ul>
<p style="color:#172B4D;">Runs are normally scheduled or triggered from <strong>CI</strong> (for example <strong>GitHub Actions</strong> and runners on Linux) so the same tagged scenarios can run <strong>nightly or on demand</strong>; results and evidence link back to <strong>Zephyr</strong> cycles and <strong>Jira</strong> where your process requires it. Cucumber tags (for example <code>@regression</code> and work-item tags) keep traceability from code to test management.</p>
<p style="color:#172B4D;">Manual regression still has a role where automation is not yet built, where human judgement is required, or for short-lived hotfix paths&mdash;the goal is a <strong>combined</strong> catalogue, not automation-only or manual-only by default.</p>

<h2>Contacts</h2>
<p style="color:#172B4D;">For regression scope and automation priority, involve the <strong>QA lead</strong>, <strong>Engineering lead</strong>, and <strong>Product owner</strong> (roles).</p>
`.trim();
}

async function findUnder(client: ConfluenceClient, parentId: string, title: string) {
  return client.findChildPageByTitleCaseInsensitive(parentId, title);
}

async function findFolder(client: ConfluenceClient) {
  for (const t of FOLDER_ALIASES) {
    const f = await findUnder(client, PARENT_TESTING_PROCESSES, t);
    if (f?.id) return f;
  }
  return null;
}

async function main(): Promise<void> {
  console.log('\n📄 TM — Regression testing + sub-page');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY || 'TM',
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });

  if (!client.isConfigured()) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN');
    process.exit(1);
  }

  let folder = await findFolder(client);
  if (!folder?.id) {
    const created = await client.createPageWithBody(PARENT_TESTING_PROCESSES, TITLE_FOLDER, buildFolderBody());
    folder = { id: created.id, title: created.title };
    console.log(`   ✅ Created hub: "${TITLE_FOLDER}" (${folder.id})`);
  } else {
    const page = await client.getPage(folder.id, { expand: 'version' });
    const ver = page?.version?.number ?? 1;
    await client.updatePageContent(folder.id, buildFolderBody(), ver + 1, {
      title: TITLE_FOLDER,
      message: 'Regression testing: hub title and body',
    });
    console.log(`   ✅ Updated hub: "${TITLE_FOLDER}" (${folder.id})`);
  }

  let sub = await findUnder(client, folder.id, TITLE_SUBPAGE);
  const body = buildSubpageBody();
  if (!sub?.id) {
    const created = await client.createPageWithBody(folder.id, TITLE_SUBPAGE, body);
    console.log(`   ✅ Created sub-page: "${TITLE_SUBPAGE}" (${created.id})`);
  } else {
    const page = await client.getPage(sub.id, { expand: 'version' });
    const ver = page?.version?.number ?? 1;
    await client.updatePageContent(sub.id, body, ver + 1, {
      title: TITLE_SUBPAGE,
      message: 'Regression: drop parent/links; contacts only footer',
    });
    console.log(`   ✅ Updated sub-page: "${TITLE_SUBPAGE}" (${sub.id})`);
  }

  console.log('\n✅ Done.\n');
}

main().catch((e) => {
  console.error(e?.response?.data || e?.message || e);
  process.exit(1);
});
