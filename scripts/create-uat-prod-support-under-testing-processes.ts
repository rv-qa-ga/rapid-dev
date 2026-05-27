#!/usr/bin/env ts-node

/**
 * "UAT and Prod Support" hub under Testing Processes + child page with expanded practices.
 *
 * Parent: https://accelins.atlassian.net/wiki/spaces/TM/pages/1961721940/Testing+Processes
 *
 * Usage:
 *   npx ts-node scripts/create-uat-prod-support-under-testing-processes.ts
 *   npm run confluence:create:uat-prod-support-folder
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

const PARENT_TESTING_PROCESSES = '1961721940';
/** Hub page title (Confluence heading / sidebar). */
const TITLE_FOLDER = 'UAT and Prod Support';
const TITLE_SUBPAGE = 'Customer feedback loop (UAT and Prod)';
/** Prior titles to find existing hub for rename. */
const FOLDER_TITLE_ALIASES = [TITLE_FOLDER, 'UAT and Prod support folder', 'UAT and prod support folder'];

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
<p style="color:#172B4D;">Hub for <strong>UAT</strong> and <strong>production support</strong> under Testing Processes. Use the page below for how QA enables UAT, how we run the customer feedback loop after production issues, and how we protect regressions.</p>
<ac:structured-macro ac:name="children" ac:schema-version="2">
  <ac:parameter ac:name="all">true</ac:parameter>
  <ac:parameter ac:name="sort">modified</ac:parameter>
</ac:structured-macro>
`.trim();
}

function buildSubpageBody(): string {
  return `
<h2>UAT and Prod Support</h2>
<p style="color:#172B4D;">This page describes how QA supports <strong>UAT</strong> and <strong>production support</strong> together: preparing the environment and data so the business can sign off in UAT, and closing the loop when production finds a defect so the same class of issue does not return unnoticed.</p>

<h2>QA support for UAT</h2>
<p style="color:#172B4D;">Before and during UAT, QA works with engineering and the business so that validation is credible and efficient.</p>
<ul>
<li style="color:#172B4D;"><strong>Data and pipelines</strong> &mdash; QA helps run or validate <strong>SSIS</strong> (and related) jobs where they feed the UAT path, checks that upstream loads completed, and that downstream consumers see the expected state for the change under test.</li>
<li style="color:#172B4D;"><strong>Test data</strong> &mdash; QA sets up or refreshes <strong>test data</strong> in the UAT environment (accounts, policies, reference data, flags) so scenarios match what the business needs to see, without asking UAT users to manufacture complex data themselves.</li>
<li style="color:#172B4D;"><strong>Environment readiness</strong> &mdash; QA confirms builds or releases landed in UAT, basic smoke paths are healthy, and known blockers are visible before UAT sessions.</li>
<li style="color:#172B4D;"><strong>Session support</strong> &mdash; During UAT, QA supports business users: clarifying expected behaviour, capturing defects with enough context, and distinguishing data or setup issues from product defects.</li>
<li style="color:#172B4D;"><strong>Evidence</strong> &mdash; QA ensures outcomes from UAT (pass/fail, defects, waivers) are recorded in the agreed tools so the release record stays traceable.</li>
</ul>
<p style="color:#172B4D;">Tooling is described in a tool-agnostic way; <strong>today</strong> work is typically tracked in <strong>Jira</strong> with tests in <strong>Zephyr Scale</strong>. The same responsibilities were previously reflected using <strong>Azure DevOps</strong>.</p>

<h2>Customer feedback loop and production support</h2>
<p style="color:#172B4D;">When production support (or a serious UAT finding) shows that behaviour does not match agreed expectations and a <strong>code fix</strong> is required, the team runs a deliberate feedback loop so learning is captured in the system, not only in chat.</p>
<ul>
<li style="color:#172B4D;"><strong>Intake and reproduce</strong> &mdash; QA reproduces on a controlled path, records steps, environment, and data conditions, and confirms severity with product and engineering.</li>
<li style="color:#172B4D;"><strong>Fix and verify</strong> &mdash; After the fix ships, QA verifies in the right tier (hotfix path, patch, or next release as agreed) and confirms the symptom is gone without obvious side effects.</li>
<li style="color:#172B4D;"><strong>Regression signal</strong> &mdash; If the issue could return when adjacent code or data changes, QA adds or updates coverage in the <strong>regression</strong> catalogue (automated, scripted manual, or both) so the class of defect is guarded in future sprints and releases.</li>
<li style="color:#172B4D;"><strong>Traceability</strong> &mdash; The defect, the fix, and the tests that proved it stay linked to the originating work item and release context so audits and post-incident reviews can follow the thread.</li>
<li style="color:#172B4D;"><strong>Hand back to operations</strong> &mdash; When verification is complete, support and the business get a clear statement of what changed and what was validated.</li>
</ul>
<p style="color:#172B4D;">Together, this loop ensures that production pain points and hard UAT lessons turn into <strong>durable quality</strong>, not one-off fixes.</p>

<h2>Who&rsquo;s involved</h2>
<ul>
<li style="color:#172B4D;"><strong>QA</strong> &mdash; UAT preparation, execution support, defect lifecycle, regression candidates</li>
<li style="color:#172B4D;"><strong>Engineering</strong> &mdash; deployments, SSIS and application fixes, technical investigation</li>
<li style="color:#172B4D;"><strong>Business / product</strong> &mdash; UAT decisions, acceptance, priority when production is impacted</li>
<li style="color:#172B4D;"><strong>Operations / support</strong> &mdash; customer-facing triage and communication where applicable</li>
</ul>

<h2>Open questions and contacts</h2>
<p style="color:#172B4D;">For UAT readiness, production incidents, and regression scope, involve the <strong>QA lead</strong>, <strong>Engineering lead</strong>, and <strong>Product owner</strong> (roles).</p>
`.trim();
}

async function findUnder(client: ConfluenceClient, parentId: string, title: string) {
  return client.findChildPageByTitleCaseInsensitive(parentId, title);
}

async function findFolder(client: ConfluenceClient) {
  for (const t of FOLDER_TITLE_ALIASES) {
    const f = await findUnder(client, PARENT_TESTING_PROCESSES, t);
    if (f?.id) return f;
  }
  return null;
}

async function main(): Promise<void> {
  console.log('\n📄 TM — UAT and Prod Support hub + sub-page');
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
      message: 'UAT and Prod Support: hub title and body',
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
      message: 'UAT and Prod Support: expanded UAT + feedback loop',
    });
    console.log(`   ✅ Updated sub-page: "${TITLE_SUBPAGE}" (${sub.id})`);
  }

  console.log('\n✅ Done.\n');
}

main().catch((e) => {
  console.error(e?.response?.data || e?.message || e);
  process.exit(1);
});
