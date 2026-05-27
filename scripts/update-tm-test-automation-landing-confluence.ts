#!/usr/bin/env ts-node

/**
 * Update TM Confluence "Test Automation" landing page (body only, TM space).
 * Page: https://accelins.atlassian.net/wiki/spaces/TM/pages/1982333036/
 *
 * Requires: ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN in src/config/env/.env.qa (or .env.qa / .env)
 *
 * Usage:
 *   npx ts-node scripts/update-tm-test-automation-landing-confluence.ts
 *   npm run docs:update:tm-test-automation
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

const TM_TEST_AUTOMATION_PAGE_ID = '1982333036';

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

/** Confluence storage: tables with explicit #172B4D text on light backgrounds (readable in light and dark theme). */
function buildLandingBody(): string {
  const tableHead =
    '<thead><tr>' +
    '<th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">#</th>' +
    '<th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Stage</th>' +
    '<th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">What this covers</th>' +
    '</tr></thead>';

  const cell =
    (bg: string) =>
      `padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:${bg};color:#172B4D;`;

  const capabilityFlowPanels = `
<p style="color:#172B4D;">The <a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide"><strong>Complete Workflow Guide</strong></a> documents the six QA lifecycle phases in detail (commands, checklists, and tooling). The table below is the same story at a glance: how work moves from intent to evidence.</p>

<h3>End-to-end capability flow</h3>
<table class="wrapped confluenceTable">
  ${tableHead}
  <tbody>
    <tr>
      <td style="${cell('#F4F5F7')}width:40px;text-align:center;"><strong>1</strong></td>
      <td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">Human-led QA</strong></td>
      <td style="${cell('#FFFFFF')}">
        <ul style="margin-top:4px;margin-bottom:0;color:#172B4D;">
          <li>Requirements and acceptance</li>
          <li>Approvals and release decisions</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:center;background-color:#F4F5F7;color:#42526E;border:1px solid #DFE1E6;"><strong>&#8595;</strong></td>
    </tr>
    <tr>
      <td style="${cell('#F4F5F7')}text-align:center;"><strong>2</strong></td>
      <td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">AI-assisted engineering</strong> (e.g. Cursor)</td>
      <td style="${cell('#FFFFFF')}">
        <ul style="margin-top:4px;margin-bottom:0;color:#172B4D;">
          <li>Jira / work items &rarr; scenarios</li>
          <li>Step validation and gap fill</li>
          <li>Docs and Confluence alignment</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:center;background-color:#F4F5F7;color:#42526E;border:1px solid #DFE1E6;"><strong>&#8595;</strong></td>
    </tr>
    <tr>
      <td style="${cell('#F4F5F7')}text-align:center;"><strong>3</strong></td>
      <td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">Unified automation framework</strong></td>
      <td style="${cell('#FFFFFF')}">
        <ul style="margin-top:4px;margin-bottom:0;color:#172B4D;">
          <li>Page objects and field registry</li>
          <li>API clients and contracts</li>
          <li>Test data factories and cleanup</li>
          <li>Cucumber / BDD layer</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:center;background-color:#F4F5F7;color:#42526E;border:1px solid #DFE1E6;"><strong>&#8595;</strong></td>
    </tr>
    <tr>
      <td style="${cell('#F4F5F7')}text-align:center;"><strong>4</strong></td>
      <td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">Execution and CI</strong></td>
      <td style="${cell('#FFFFFF')}">
        <ul style="margin-top:4px;margin-bottom:0;color:#172B4D;">
          <li>GitHub runner / pipelines</li>
          <li>Nightly and on-demand runs</li>
        </ul>
      </td>
    </tr>
    <tr>
      <td colspan="3" style="padding:6px 12px;text-align:center;background-color:#F4F5F7;color:#42526E;border:1px solid #DFE1E6;"><strong>&#8595;</strong></td>
    </tr>
    <tr>
      <td style="${cell('#F4F5F7')}text-align:center;"><strong>5</strong></td>
      <td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">Observability and management</strong></td>
      <td style="${cell('#FFFFFF')}">
        <ul style="margin-top:4px;margin-bottom:0;color:#172B4D;">
          <li>Dashboards and alerts</li>
          <li>Zephyr / test case linkage</li>
          <li>Evidence (e.g. Confluence)</li>
        </ul>
      </td>
    </tr>
  </tbody>
</table>

<h3>Capability stack (one-line summary)</h3>
<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Layer</th>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Summary</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="${cell('#F4F5F7')}"><strong style="color:#172B4D;">1</strong></td><td style="${cell('#FFFFFF')}"><span style="color:#172B4D;">Business workflow &mdash; E2E scope</span></td></tr>
    <tr><td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">2</strong></td><td style="${cell('#F4F5F7')}"><span style="color:#172B4D;">AI-assisted design (Cursor, Jira-linked scenarios)</span></td></tr>
    <tr><td style="${cell('#F4F5F7')}"><strong style="color:#172B4D;">3</strong></td><td style="${cell('#FFFFFF')}"><span style="color:#172B4D;">Framework (UI + API, POM, data, shared steps)</span></td></tr>
    <tr><td style="${cell('#FFFFFF')}"><strong style="color:#172B4D;">4</strong></td><td style="${cell('#F4F5F7')}"><span style="color:#172B4D;">Execution (GitHub / CI, nightly + manual)</span></td></tr>
    <tr><td style="${cell('#F4F5F7')}"><strong style="color:#172B4D;">5</strong></td><td style="${cell('#FFFFFF')}"><span style="color:#172B4D;">Signal (dashboards, Zephyr, evidence)</span></td></tr>
  </tbody>
</table>
`;

  return `
<h2>Overview</h2>
<p style="color:#172B4D;">The <strong>E2E automation framework</strong> is a single platform that brings <strong>UI and API</strong> testing together for the <strong>CLM</strong> program (Salesforce-led) and connected systems. It automates the heavy parts of the QA lifecycle&mdash;from understanding a Jira work item through generating scenarios, data, execution, and evidence&mdash;while <strong>keeping QA in control</strong> at each hand-off, the same model described in the <a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide">Complete Workflow Guide</a>.</p>
<p style="color:#172B4D;">Typical flow: <strong>Jira work item</strong> &rarr; generated Gherkin and tags &rarr; validated step definitions and page objects &rarr; test data from the factory &rarr; runs on the <strong>Linux VM with GitHub Runner</strong> (and pipeline/Gearset hooks where used) &rarr; results and <strong>Confluence evidence</strong> for audit. <strong>Primary how-to:</strong> <a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide">Complete Workflow Guide</a> &mdash; this page stays high level (capabilities, scope, roadmap).</p>

<h2>Key capabilities</h2>
<p style="color:#172B4D;">Condensed from the workflow guide; see the guide for tables, commands, and phase checklists.</p>
<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Capability</th>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">In one line</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;"><strong>Unified platform</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">One codebase for UI + API across CLM-connected systems.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;"><strong>Multi-system coverage</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Salesforce, MuleSoft, RDM, CMT, and downstream data and file paths as documented in the guide.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;"><strong>Lifecycle automation</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Six phases from requirement analysis through evidence; automated outputs, QA review before the next step.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;"><strong>Generation &amp; structure</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Scenarios from Jira; Cucumber/BDD; page objects, field registry, shared steps, and factories for consistency.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;"><strong>Test data</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Factory create/cleanup; optional on-demand data where the guide describes it.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;"><strong>Traceability</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Jira &rarr; test case &rarr; execution &rarr; evidence (Zephyr Scale + Confluence).</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;"><strong>Execution &amp; reporting</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Playwright and API clients; headless/CI; HTML, JSON, Allure; runs aligned with GitHub Actions / Runner on Linux.</td>
    </tr>
  </tbody>
</table>

<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p style="color:#172B4D;"><strong>How we work:</strong> Each automated phase produces drafts or artefacts quickly; <strong>QA reviews and approves</strong> before moving on&mdash;so speed does not replace judgement (see &quot;QA Lifecycle Automation Phases&quot; in the <a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide">Complete Workflow Guide</a>).</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Technology stack (summary)</h2>
<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Layer</th>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Technology</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Test runner</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Cucumber.js (BDD)</td></tr>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">UI</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Playwright</td></tr>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">API</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Axios + JWT (per integration)</td></tr>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Language</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">TypeScript</td></tr>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Reporting</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">HTML, JSON, Allure</td></tr>
  </tbody>
</table>

<h2>Capability overview</h2>
${capabilityFlowPanels}

<h3>Execution (summary)</h3>
<ul style="color:#172B4D;">
  <li><strong>Runner:</strong> GitHub-hosted or self-hosted automation; nightly and on-demand; wired to CI where applicable.</li>
  <li><strong>Layers:</strong> UI (browser), API (contracts and integrations), data checks where in scope.</li>
  <li><strong>Reporting:</strong> Dashboards, logs, and failure alerts for quick response.</li>
</ul>
<h3>Test data (summary)</h3>
<ul style="color:#172B4D;">
  <li>Programmatic creation and cleanup aligned to environments so teams get <strong>predictable datasets</strong> without manual seeding for every run.</li>
</ul>

<h2>End-to-end scope (systems view)</h2>
<p style="color:#172B4D;"><em>Reference architecture &mdash; data and process flow across layers.</em> If the diagram was previously attached, it should appear below (filename may have changed if re-uploaded).</p>
<p><ac:image ac:align="center"><ri:attachment ri:filename="image-20250320-202430.png" /></ac:image></p>

<h3>1. Data source</h3>
<p style="color:#172B4D;"><strong>Salesforce</strong> (member/product truth), <strong>Gen-2</strong> ingestion/storage<strong>*</strong>, <strong>Blob/SharePoint</strong>.</p>

<h3>2. Power Apps and operations</h3>
<p style="color:#172B4D;">Contract management, operations workflow, Launchpad, reference data &mdash; UI workflows and validations.</p>

<h3>3. Data warehouse</h3>
<p style="color:#172B4D;">ODS, TDS, XML/utility validations; ETL/SSIS and integrity checks where automated.</p>

<h3>4. General ledger and core finance<strong>*</strong></h3>
<p style="color:#172B4D;">Dynamics 365 GL<strong>*</strong>, Tagetik<strong>*</strong>, Duck Creek<strong>*</strong> &mdash; reconciliation and process checks as scope expands.</p>

<h3>5. Financial reporting<strong>*</strong></h3>
<p style="color:#172B4D;">Data mart / Power BI<strong>*</strong>, Workiva<strong>*</strong> &mdash; reporting and export validation as scope grows.</p>

<h2>Automation execution strategy</h2>
<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Topic</th>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Detail</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;"><strong>Framework</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Single stack for <strong>UI + API</strong> (Playwright, Cucumber/BDD, TypeScript), shared patterns for POM, field registry, factories, common steps.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;"><strong>Scheduling</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Nightly unattended runs; manual and pipeline triggers for releases and investigations.</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;"><strong>Results</strong></td>
      <td style="padding:10px 12px;vertical-align:top;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Centralised reporting (e.g. Azure DevOps / dashboards); notifications on failure; linkage to test cases and evidence where defined.</td>
    </tr>
  </tbody>
</table>

<h2>Roadmap (items marked * above)</h2>
<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Item</th>
      <th style="background-color:#0747A6;color:#FFFFFF;padding:10px 12px;text-align:left;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Gen-2 (ingestion/storage)</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Planned / TBD &mdash; align with program</td></tr>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Dynamics 365 GL, Tagetik, Duck Creek</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#F4F5F7;color:#172B4D;">Planned expansion</td></tr>
    <tr><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Data mart / PBI, Workiva</td><td style="padding:10px 12px;border:1px solid #DFE1E6;background-color:#FFFFFF;color:#172B4D;">Planned expansion</td></tr>
  </tbody>
</table>

<h2>Related pages (TM)</h2>
<ul style="color:#172B4D;">
  <li><a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/2692710418/Complete+Workflow+Guide">Complete Workflow Guide</a> (full end-to-end process, commands, phases, and checklists).</li>
  <li><a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/1961787450/Knowledge+Base+%E2%80%94+Test+%26+integration+automation">Knowledge Base &mdash; Test &amp; integration automation</a> (per-system depth).</li>
  <li><a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/2979201092/BSGQA+Next-Version+Planning+Hub+Overview">BSGQA Next-Version Planning Hub Overview</a> (priorities and delivery context).</li>
</ul>

<hr/>
<p style="color:#42526E;"><em>Last updated by automation framework script.</em></p>
`.trim();
}

async function main(): Promise<void> {
  console.log('\n📄 TM &mdash; Test Automation landing page');
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

  const page = await client.getPage(TM_TEST_AUTOMATION_PAGE_ID, { expand: 'version,body.storage' });
  if (!page) {
    console.error(`❌ Page ${TM_TEST_AUTOMATION_PAGE_ID} not found or not accessible.`);
    process.exit(1);
  }

  const ver = page.version?.number ?? 1;
  console.log(`   Page: "${page.title}" (id ${TM_TEST_AUTOMATION_PAGE_ID}), version ${ver}`);

  const body = buildLandingBody();
  await client.updatePageContent(TM_TEST_AUTOMATION_PAGE_ID, body, ver + 1, {
    title: page.title,
    message: 'Test Automation: intro aligned to Complete Workflow Guide',
  });

  console.log('\n   ✅ Page body updated.');
  console.log(`\n📎 ${client.getBaseUrl()}/spaces/TM/pages/${TM_TEST_AUTOMATION_PAGE_ID}/`);
  console.log('\n✅ Done.\n');
}

main().catch((e) => {
  console.error(e?.response?.data || e?.message || e);
  process.exit(1);
});
