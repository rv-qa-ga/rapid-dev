#!/usr/bin/env ts-node

/**
 * Upload Framework Utilities list to Confluence
 *
 * Adds or updates a "Framework Utilities" section on the QA Automation Framework
 * Complete Workflow Guide page (TM space, page 2692710418).
 *
 * Requires: ATLASSIAN_EMAIL, ATLASSIAN_API_TOKEN (or JIRA_EMAIL, JIRA_API_TOKEN)
 * in .env.qa or environment.
 *
 * Usage:
 *   npm run docs:upload:utilities-list
 *   ts-node scripts/upload-framework-utilities-to-confluence.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPaths = [
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`📁 Loaded env from: ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'TM';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';

const PAGE_ID = '2692710418';
const PAGE_TITLE = 'QA Automation Framework - Complete Workflow Guide';

function tableSection(title: string, rows: Array<{ script: string; purpose: string }>): string {
  if (rows.length === 0) return '';
  const bodyRows = rows
    .map(
      (r) =>
        `<tr><td><code>${escapeHtml(r.script)}</code></td><td>${escapeHtml(r.purpose)}</td></tr>`
    )
    .join('\n');
  return `
<h3>${escapeHtml(title)}</h3>
<table class="wrapped confluenceTable">
  <colgroup><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#0052cc;color:white;">npm script</th>
      <th style="background-color:#0052cc;color:white;">Purpose</th>
    </tr>
  </thead>
  <tbody>
${bodyRows}
  </tbody>
</table>
`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildUtilitiesContent(): string {
  const sections: Array<{ title: string; rows: Array<{ script: string; purpose: string }> }> = [
    {
      title: 'Test execution',
      rows: [
        { script: 'test, test:all', purpose: 'Run all tests (via run-tests-with-env.js)' },
        { script: 'test:ui, test:api, test:salesforce, test:dynamics, test:sqlserver', purpose: 'Run tests by layer/project' },
        { script: 'test:interactive, test:interactive:login, test:interactive:sf529', purpose: 'Interactive test runs' },
        { script: 'test:login, test:login:check, test:login:all', purpose: 'Login-focused runs' },
        { script: 'test:tag:smoke, test:tag:regression, test:tag:ui, test:tag:api', purpose: 'Run by tag' },
        { script: 'test:uat:smoke, test:uat:build-validation', purpose: 'UAT smoke / build validation' },
        { script: 'test:env:dev, test:env:qa, test:env:uat, test:env:prod', purpose: 'Run with specific env' },
        { script: 'test:regression', purpose: 'Run Zephyr cycle tests' },
        { script: 'test:sf467:one, test:sf788', purpose: 'Single-scenario / single-feature runs' },
      ],
    },
    {
      title: 'Zephyr Scale',
      rows: [
        { script: 'zephyr:UploadTestCase', purpose: 'Sync feature files → Zephyr test cases' },
        { script: 'zephyr:UploadAndLink', purpose: 'Upload test cases and link to Jira work items' },
        { script: 'zephyr:UploadAndLink:Sprint101', purpose: 'Sprint 101–specific upload and link' },
        { script: 'zephyr:LinkToJira', purpose: 'Link existing Zephyr test cases to Jira' },
        { script: 'zephyr:UploadResult', purpose: 'Upload test results to Zephyr' },
        { script: 'zephyr:UploadWithAttachments', purpose: 'Upload results with attachments' },
        { script: 'zephyr:update', purpose: 'Update execution' },
        { script: 'zephyr:SyncToCycle', purpose: 'Sync test cases to a Zephyr cycle' },
        { script: 'zephyr:RemoveDuplicates', purpose: 'Remove duplicate Zephyr test cases' },
        { script: 'zephyr:CleanupExecutions', purpose: 'Clean up Zephyr executions' },
        { script: 'diagnose:duplicates', purpose: 'Diagnose Zephyr duplicates' },
      ],
    },
    {
      title: 'Test data',
      rows: [
        { script: 'data:manual-test (+ variants)', purpose: 'Generate manual test data (ranges/variants)' },
        { script: 'data:manual-test:reassign-owner', purpose: 'Reassign owner on manual test data' },
        { script: 'data:contracting-test (+ variants)', purpose: 'Generate contracting test data' },
        { script: 'data:contracting-samples-by-stage', purpose: 'Create contracting samples by stage' },
        { script: 'data:contracting-list', purpose: 'List contracting records' },
        { script: 'record:account, record:account:fields', purpose: 'Record account creation / fields' },
        { script: 'export:qa-users', purpose: 'Export QA users' },
      ],
    },
    {
      title: 'Jira / work items / Azure DevOps',
      rows: [
        { script: 'jira:generate', purpose: 'Generate feature files from Jira' },
        { script: 'jira:find-missing', purpose: 'Find missing work items' },
        { script: 'process:new-qa-items', purpose: 'Process new QA work items' },
        { script: 'engineering:fetch-jira', purpose: 'Fetch Mulesoft/Jira stories (ENG)' },
        { script: 'azure-devops:test', purpose: 'Test Azure DevOps connection' },
        { script: 'azure-devops:fetch', purpose: 'Fetch ADO work items' },
        { script: 'ado:generate-tests', purpose: 'Generate SQL test cases from ADO' },
      ],
    },
    {
      title: 'Reports',
      rows: [
        { script: 'report:html', purpose: 'Generate HTML report' },
        { script: 'report:test, report:test:example', purpose: 'Generate test report from JSON' },
        { script: 'report:convert', purpose: 'Convert Cucumber to test results format' },
        { script: 'report:full (+ variants)', purpose: 'Full reports (overall/work-item/both)' },
        { script: 'report:open', purpose: 'Open report in browser' },
        { script: 'report:weekly-qa', purpose: 'QA progress report' },
        { script: 'report:allure, report:allure:open', purpose: 'Allure report generate/open' },
        { script: 'report:sprint-101-status, report:sprint-101-zephyr', purpose: 'Sprint 101 status/Zephyr reports' },
        { script: 'report:OpportunityReadinessHelptext, report:UNSD, report:DDTasks-bugs', purpose: 'Opportunity Readiness, UNSD, DD Tasks reports' },
      ],
    },
    {
      title: 'Confluence / docs',
      rows: [
        { script: 'docs:update, docs:update:sections, docs:list:sections, docs:search', purpose: 'Update/list/search Confluence' },
        { script: 'docs:upload:workflow', purpose: 'Upload full workflow to Confluence' },
        { script: 'docs:create:zephyr-link-subpage', purpose: 'Create Zephyr link utility subpage' },
        { script: 'docs:create:github-runner-subpage', purpose: 'Create GitHub runner VM subpage' },
        { script: 'docs:create:automation-presentation-subpage', purpose: 'Create automation presentation subpage' },
        { script: 'docs:create:onboarding-progress-tracker', purpose: 'Create onboarding progress tracker subpage' },
        { script: 'docs:update:bsgqa-hub, docs:update:tm-home', purpose: 'Update BSGQA hub / TM home' },
        { script: 'docs:upload:lloyds-test-strategy', purpose: 'Upload Lloyds test strategy' },
      ],
    },
    {
      title: 'Validation',
      rows: [
        { script: 'validate:steps, validate:steps:all', purpose: 'Validate step definitions' },
        { script: 'validate:sql-mappings, validate:migration, validate:fields', purpose: 'Validate SQL/migration/test data' },
        { script: 'validate:DDTasks, validate:SF587-*, validate:OpportunityReadiness*, validate:RegionFields', purpose: 'Validate DD Tasks, SF-587, Opportunity Readiness, Region' },
        { script: 'compare:account', purpose: 'Compare account (Dynamics)' },
      ],
    },
    {
      title: 'Scan / describe',
      rows: [
        { script: 'scan:qa:ui, scan:qa:ui:admin', purpose: 'Scan QA UI (optionally as admin)' },
        { script: 'scan:fields, scan:fields:all', purpose: 'Scan Salesforce fields' },
        { script: 'describe:OpportunityReadiness', purpose: 'Describe Opportunity Readiness fields' },
        { script: 'scan:opportunity-flow-setup', purpose: 'Scan opportunity flow setup' },
      ],
    },
    {
      title: 'Cleanup',
      rows: [
        { script: 'clean', purpose: 'Remove reports and test-results' },
        { script: 'cleanup:test-data (+ dry/force)', purpose: 'Cleanup test data' },
        { script: 'cleanup:accounts, cleanup:accounts:force', purpose: 'Cleanup accounts' },
        { script: 'cleanup:persistent-data (+ dry/force)', purpose: 'Cleanup persistent data' },
      ],
    },
    {
      title: 'Connectivity / auth / SQL',
      rows: [
        { script: 'get-token', purpose: 'Get access token' },
        { script: 'connectivity:check', purpose: 'Check connectivity' },
        { script: 'test:sql, test:sql:db', purpose: 'Test SQL connection (optionally DB)' },
        { script: 'sql:query', purpose: 'Run SQL query' },
      ],
    },
    {
      title: 'Workflow (GitHub Actions)',
      rows: [
        { script: 'workflow:check', purpose: 'Check workflow status' },
        { script: 'workflow:logs', purpose: 'Get workflow logs' },
        { script: 'workflow:cancel', purpose: 'Cancel workflow runs' },
      ],
    },
    {
      title: 'Postman / API',
      rows: [
        { script: 'postman:generate', purpose: 'Generate Postman collection' },
        { script: 'postman:verify', purpose: 'Verify Postman collection' },
      ],
    },
    {
      title: 'Other scripts / generation',
      rows: [
        { script: 'generate:steps', purpose: 'Generate step definitions' },
        { script: 'sql:generate-comprehensive', purpose: 'Generate comprehensive SQL test cases' },
        { script: 'transform:party-csv', purpose: 'Transform party CSV for Workbench' },
        { script: 'listen:platform-events', purpose: 'Listen to platform events' },
        { script: 'setup:fetch-secrets', purpose: 'Fetch secrets from Key Vault' },
        { script: 'qa:deferred:generate-page, add-rows, update', purpose: 'QA deferred tracker (page, rows, Confluence)' },
        { script: 'demo:live', purpose: 'Presentation demo' },
      ],
    },
    {
      title: 'Knowledge / learning / MRD-FLS',
      rows: [
        { script: 'knowledge:build, knowledge:build:item', purpose: 'Build knowledge base' },
        { script: 'learning:detect-v2, learning:detect-v2:item', purpose: 'Detect v2 features' },
        { script: 'learning:analyze, learning:analyze:item', purpose: 'Analyze QA changes' },
        { script: 'extract:mrd-fls, analyze:mrd-fls', purpose: 'Extract/analyze MRD FLS' },
        { script: 'report:mrd-fls (+ comprehensive, simple-excel)', purpose: 'MRD FLS reports' },
      ],
    },
  ];

  const tables = sections.map((s) => tableSection(s.title, s.rows)).join('\n');

  return `
<h2>Framework Utilities</h2>
<p>Utilities available in this framework (run with <code>npm run &lt;script-name&gt;</code>).</p>
${tables}
<p><em>Standalone scripts (e.g. verify-sf561-picklists, verify-sf721-country-import, check-* scripts) can be run with <code>ts-node scripts/&lt;script&gt;.ts</code>. Shared modules live in <code>src/utils/</code> (helpers, logger, auth, validators, etc.).</em></p>
`;
}

/**
 * Insert or replace "Framework Utilities" section in page body.
 * If section exists, replace it; otherwise insert before footer panel or at end.
 */
function insertOrReplaceUtilitiesSection(html: string, newSection: string): string {
  const sectionHeading = '<h2>Framework Utilities</h2>';
  const existingStart = html.indexOf(sectionHeading);
  if (existingStart !== -1) {
    const afterHeading = html.indexOf('</h2>', existingStart) + 5;
    const nextH2 = html.substring(afterHeading).match(/<h2>/i);
    const end = nextH2 && nextH2.index !== undefined
      ? afterHeading + nextH2.index
      : html.length;
    return html.substring(0, existingStart) + newSection.trim() + html.substring(end);
  }
  const footerMarker = 'Documentation maintained by QA Automation Team';
  const footerIdx = html.indexOf(footerMarker);
  if (footerIdx !== -1) {
    const insertAt = html.lastIndexOf('<ac:structured-macro', footerIdx);
    if (insertAt !== -1) {
      return html.substring(0, insertAt) + '\n' + newSection.trim() + '\n\n' + html.substring(insertAt);
    }
  }
  return html + '\n' + newSection.trim();
}

async function uploadUtilitiesList() {
  console.log('\n📄 Upload Framework Utilities list to Confluence');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (or JIRA_EMAIL/JIRA_API_TOKEN) must be set');
    process.exit(1);
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  const client = axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  try {
    console.log('📖 Reading current Confluence page...');
    const { data: currentPage } = await client.get(
      `/content/${PAGE_ID}?expand=version,body.storage`
    );
    const currentVersion = currentPage.version.number;
    let currentContent = currentPage.body.storage.value;
    console.log(`   Page: ${currentPage.title}`);
    console.log(`   Version: ${currentVersion}`);

    const newSection = buildUtilitiesContent();
    const updatedContent = insertOrReplaceUtilitiesSection(currentContent, newSection);

    console.log('\n📤 Updating page with Framework Utilities section...');
    await client.put(`/content/${PAGE_ID}`, {
      id: PAGE_ID,
      type: 'page',
      title: currentPage.title,
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: updatedContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: 'Added/updated Framework Utilities list',
      },
    });

    console.log('\n✅ Confluence page updated successfully.');
    console.log(`\n📎 View at: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PAGE_ID}/${encodeURIComponent(PAGE_TITLE.replace(/ /g, '+'))}`);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

uploadUtilitiesList();
