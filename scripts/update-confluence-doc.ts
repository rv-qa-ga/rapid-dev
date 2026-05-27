#!/usr/bin/env ts-node

/**
 * Update Confluence Documentation Page
 * 
 * Updates the CLM Automation Framework documentation page on Confluence
 * Uses proper Confluence Storage Format with panels, tables, and macros
 * 
 * Usage:
 *   npm run docs:update
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
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

/**
 * Generate Confluence Storage Format content
 */
function generateConfluenceContent(): string {
  return `
<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#deebff</ac:parameter>
  <ac:parameter ac:name="titleBGColor">#0052cc</ac:parameter>
  <ac:parameter ac:name="titleColor">#ffffff</ac:parameter>
  <ac:parameter ac:name="title">E2E Automation Framework</ac:parameter>
  <ac:rich-text-body>
    <p><strong>Unified test automation platform</strong> consolidating UI and API testing for the CLM ecosystem.</p>
    <p>Automates critical phases of the QA lifecycle while maintaining human oversight and control at each stage.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h1>Systems Integration Overview</h1>

<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p>The framework provides end-to-end testing capabilities across the CLM ecosystem.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Data Flow Architecture</h2>

<table class="wrapped confluenceTable">
  <colgroup><col /><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#0052cc;color:white;text-align:center;">Layer</th>
      <th style="background-color:#0052cc;color:white;text-align:center;">Systems</th>
      <th style="background-color:#0052cc;color:white;text-align:center;">Data Flow</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>🔵 Core Platform</strong></td>
      <td>Salesforce CRM</td>
      <td>➡️ Data Cloud (one-way)</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>🟢 Integration</strong></td>
      <td>MuleSoft (Integration Layer)</td>
      <td>↔️ Salesforce (two-way)</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>🟡 Source Systems</strong></td>
      <td>Operations Workflow, RDM, CMT</td>
      <td>↔️ MuleSoft (two-way)</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>🟠 Data Pipeline</strong></td>
      <td>Fivetran → Snowflake</td>
      <td>RDM/CMT ➡️ Snowflake</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>🔴 Data Ingestion</strong></td>
      <td>Data Ingestion Layer</td>
      <td>➡️ Snowflake (external data)</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>🟣 Data Store</strong></td>
      <td>ODS/TDS (SQL Server)</td>
      <td>Snowflake ➡️ ODS/TDS</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;"><strong>⚫ Downstream</strong></td>
      <td>Blob/SharePoint</td>
      <td>ODS/TDS ➡️ Storage</td>
    </tr>
  </tbody>
</table>

<h2>Systems In Scope</h2>

<table class="wrapped confluenceTable">
  <colgroup><col /><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#00875a;color:white;">System</th>
      <th style="background-color:#00875a;color:white;">Type</th>
      <th style="background-color:#00875a;color:white;">Testing Coverage</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>Salesforce CRM</strong></td><td>Core Platform</td><td>✅ UI + API Testing</td></tr>
    <tr><td><strong>Data Cloud</strong></td><td>Data Platform</td><td>✅ API Integration Testing</td></tr>
    <tr><td><strong>MuleSoft</strong></td><td>Integration Layer</td><td>✅ API Contract Testing</td></tr>
    <tr><td><strong>Operations Workflow</strong></td><td>Business Process</td><td>✅ UI + API Testing</td></tr>
    <tr><td><strong>RDM</strong></td><td>Reference Data Management</td><td>✅ API Testing</td></tr>
    <tr><td><strong>CMT</strong></td><td>Configuration Management</td><td>✅ API Testing</td></tr>
    <tr><td><strong>ODS</strong></td><td>Operational Data Store (SQL Server)</td><td>📋 Data Validation (Phase 1)</td></tr>
    <tr><td><strong>Blob/SP</strong></td><td>Storage (SharePoint/Blob)</td><td>✅ File Upload/Download</td></tr>
    <tr><td><strong>Snowflake</strong></td><td>Data Warehouse</td><td>✅ Data Validation Testing</td></tr>
  </tbody>
</table>

<h2>Systems Out of Scope</h2>

<table class="wrapped confluenceTable">
  <colgroup><col /><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#de350b;color:white;">System</th>
      <th style="background-color:#de350b;color:white;">Type</th>
      <th style="background-color:#de350b;color:white;">Reason</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>TDS</td><td>Transaction Data Store</td><td>Future consideration</td></tr>
    <tr><td>Tagetik</td><td>Financial Reporting</td><td>Separate validation process</td></tr>
    <tr><td>MS Dynamics 365 GL</td><td>General Ledger Interface</td><td>Out of CLM scope</td></tr>
    <tr><td>VIPR Local</td><td>Data Processing</td><td>Not in current roadmap</td></tr>
    <tr><td>Launchpad</td><td>Portal</td><td>Future - Planned</td></tr>
    <tr><td>Intrali</td><td>External Integration</td><td>Future - Planned</td></tr>
    <tr><td>Duck Creek</td><td>Policy Admin</td><td>Future - Planned</td></tr>
    <tr><td>Bordereaux Submission</td><td>Data Submission</td><td>Future - Planned</td></tr>
  </tbody>
</table>

<hr />

<h1>QA Lifecycle Automation</h1>

<ac:structured-macro ac:name="note" ac:schema-version="1">
  <ac:rich-text-body>
    <p>Each phase is <strong>initiated, controlled, and reviewed by QA engineers</strong> to ensure quality and accuracy.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<table class="wrapped confluenceTable">
  <colgroup><col /><col /><col /><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#6554c0;color:white;text-align:center;">Phase</th>
      <th style="background-color:#6554c0;color:white;">Name</th>
      <th style="background-color:#6554c0;color:white;">Description</th>
      <th style="background-color:#6554c0;color:white;">Status</th>
      <th style="background-color:#6554c0;color:white;">Comment</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>1</strong></td>
      <td><strong>Requirement Analysis</strong></td>
      <td>Extract requirements from Jira work items</td>
      <td>✅ Automated</td>
      <td>Manual QA Reviewed</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>2</strong></td>
      <td><strong>Test Case Design</strong></td>
      <td>Generate Gherkin (BDD) test cases</td>
      <td>✅ Automated</td>
      <td>Manual QA Reviewed</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>3</strong></td>
      <td><strong>Test Data Setup</strong></td>
      <td>Create test data via API</td>
      <td>✅ Automated</td>
      <td>Manual QA Reviewed</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>4</strong></td>
      <td><strong>Test Execution</strong></td>
      <td>Run UI + API tests with Playwright</td>
      <td>✅ Automated</td>
      <td>Manual QA Reviewed</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>5</strong></td>
      <td><strong>Evidence Generation</strong></td>
      <td>Screenshots, reports, Confluence upload</td>
      <td>✅ Automated</td>
      <td>Manual QA Reviewed</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#fff0b3;"><strong>6</strong></td>
      <td><strong>Bug Creation</strong></td>
      <td>Auto-create Jira bugs for failures</td>
      <td>📋 Planned</td>
      <td>Manual</td>
    </tr>
  </tbody>
</table>

<hr />

<h1>Phase Details</h1>

<h2>Phase 1: Requirement Analysis</h2>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:parameter ac:name="title">Objective</ac:parameter>
  <ac:rich-text-body>
    <p>Extract and analyze requirements from Jira work items to understand test scope.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<table class="wrapped confluenceTable">
  <tbody>
    <tr><td><strong>Input</strong></td><td>Jira Work Item ID (e.g., SF-520, CLM-1234)</td></tr>
    <tr><td><strong>Process</strong></td><td>Connects to Jira API, extracts acceptance criteria, field definitions, and business rules</td></tr>
    <tr><td><strong>Output</strong></td><td>Structured test requirements ready for test case design</td></tr>
    <tr><td><strong>QA Control</strong></td><td>QA reviews extracted requirements for completeness and accuracy</td></tr>
  </tbody>
</table>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Command</ac:parameter>
  <ac:plain-text-body><![CDATA[npm run jira:generate -- --work-item SF-520]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Phase 2: Test Case Design</h2>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:parameter ac:name="title">Objective</ac:parameter>
  <ac:rich-text-body>
    <p>Generate comprehensive test cases from requirements in Gherkin (BDD) format.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<p><strong>Generated Test Types:</strong></p>
<ul>
  <li>✅ Data-driven scenarios (Scenario Outlines)</li>
  <li>✅ End-to-end workflow tests</li>
  <li>✅ Permission-based access tests</li>
  <li>✅ Validation and error handling tests</li>
  <li>✅ Search and filter tests</li>
  <li>✅ Cross-system integration tests</li>
</ul>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Step 1: Generate Test Cases</ac:parameter>
  <ac:plain-text-body><![CDATA[# Generate UI test cases
npm run jira:generate -- --work-item SF-520 --type ui

# Generate API test cases
npm run jira:generate -- --work-item SF-520 --type api]]></ac:plain-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Step 2: Upload to Zephyr Scale</ac:parameter>
  <ac:plain-text-body><![CDATA[# Upload all test cases for a work item
npm run zephyr:UploadTestCase -- --work-item SF-520

# Upload a specific test case
npm run zephyr:UploadTestCase -- --test-case SF-520-UI-001]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Phase 3: Test Data Setup</h2>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:parameter ac:name="title">Objective</ac:parameter>
  <ac:rich-text-body>
    <p>Create and manage test data required for test execution across all integrated systems.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<p><strong>Features:</strong></p>
<ul>
  <li>🔄 Automatic test data creation before each scenario</li>
  <li>🧹 Automatic cleanup after test completion</li>
  <li>🔑 Unique identifiers to prevent data conflicts</li>
  <li>📋 Comprehensive field population (24+ fields per Account)</li>
  <li>🔗 Cross-system data synchronization</li>
</ul>

<h2>Phase 4: Test Execution</h2>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:parameter ac:name="title">Objective</ac:parameter>
  <ac:rich-text-body>
    <p>Execute tests across UI and API layers with intelligent handling across all integrated systems.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<p><strong>Execution Modes:</strong></p>
<ul>
  <li>🖥️ <strong>Headed Mode</strong> - Visual browser for debugging</li>
  <li>👻 <strong>Headless Mode</strong> - Fast CI/CD execution</li>
  <li>🔍 <strong>Debug Mode</strong> - Step-by-step with Playwright Inspector</li>
</ul>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Commands</ac:parameter>
  <ac:plain-text-body><![CDATA[# Run all tests for a work item
npm run test:all -- --tags @SF-520

# Run specific test case
npm run test:all -- --tags @SF-520-UI-001

# Run by priority
npm run test:all -- --tags @p1]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Phase 5: Evidence Generation</h2>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:parameter ac:name="title">Objective</ac:parameter>
  <ac:rich-text-body>
    <p>Capture comprehensive evidence for audit, compliance, and debugging.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<p><strong>Evidence Types:</strong></p>
<ul>
  <li>📸 <strong>Screenshots</strong> - Captured at key verification points</li>
  <li>📄 <strong>HTML Reports</strong> - Interactive test result summaries</li>
  <li>📊 <strong>JSON Reports</strong> - Machine-readable results for CI/CD</li>
  <li>🔗 <strong>Zephyr Integration</strong> - Test executions linked to test cycles</li>
</ul>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Upload Results</ac:parameter>
  <ac:plain-text-body><![CDATA[# Upload results to Zephyr with Confluence evidence
npm run zephyr:UploadResult -- --cycle "Sprint-93-QA" --test-case SF-520-UI-001]]></ac:plain-text-body>
</ac:structured-macro>

<hr />

<h1>Test Tagging Strategy</h1>

<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p><strong>Tag Format:</strong> <code>@{PROJECT}-{WORKITEM}-{TYPE}-{SEQUENCE}</code></p>
    <p>Examples: <code>@SF-520-UI-001</code>, <code>@SF-520-API-001</code>, <code>@CLM-1234-UI-001</code></p>
  </ac:rich-text-body>
</ac:structured-macro>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0052cc;color:white;">Tag Type</th>
      <th style="background-color:#0052cc;color:white;">Purpose</th>
      <th style="background-color:#0052cc;color:white;">Examples</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>Work Item</strong></td><td>Links to Jira story</td><td><code>@SF-520</code>, <code>@CLM-1234</code></td></tr>
    <tr><td><strong>Test Case ID</strong></td><td>Unique test identifier</td><td><code>@SF-520-UI-001</code>, <code>@SF-520-API-002</code></td></tr>
    <tr><td><strong>Priority</strong></td><td>Execution priority</td><td><code>@p1</code>, <code>@p2</code>, <code>@p3</code></td></tr>
    <tr><td><strong>Test Type</strong></td><td>Test category</td><td><code>@smoke</code>, <code>@regression</code>, <code>@e2e</code></td></tr>
    <tr><td><strong>Feature</strong></td><td>Feature area</td><td><code>@workflow</code>, <code>@validation</code>, <code>@permissions</code></td></tr>
  </tbody>
</table>

<hr />

<h1>Technical Architecture</h1>

<h2>Technology Stack</h2>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#00875a;color:white;">Layer</th>
      <th style="background-color:#00875a;color:white;">Technology</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>Test Runner</strong></td><td>Cucumber.js (BDD)</td></tr>
    <tr><td><strong>Browser Automation</strong></td><td>Playwright</td></tr>
    <tr><td><strong>API Testing</strong></td><td>Axios + JWT Authentication</td></tr>
    <tr><td><strong>Language</strong></td><td>TypeScript</td></tr>
    <tr><td><strong>Reporting</strong></td><td>HTML + JSON + Allure</td></tr>
    <tr><td><strong>CI/CD Ready</strong></td><td>Headless execution support</td></tr>
  </tbody>
</table>

<h2>Design Patterns</h2>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#6554c0;color:white;">Pattern</th>
      <th style="background-color:#6554c0;color:white;">Purpose</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>Page Object Model (POM)</strong></td><td>Encapsulates UI interactions per system</td></tr>
    <tr><td><strong>Field Registry</strong></td><td>Centralized field locators for all systems</td></tr>
    <tr><td><strong>Test Data Factory</strong></td><td>Manages test data lifecycle across systems</td></tr>
    <tr><td><strong>Step Definitions</strong></td><td>Reusable Cucumber steps</td></tr>
    <tr><td><strong>API Client Pattern</strong></td><td>Consistent API interactions per system</td></tr>
  </tbody>
</table>

<hr />

<h1>Framework Utilities &amp; Tools</h1>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">1. Test Data Factory</ac:parameter>
  <ac:rich-text-body>
    <p>Automatically creates and manages test data via Salesforce API.</p>
    <ul>
      <li><strong>Auto-Creation</strong> - Creates Accounts, Contacts, Opportunities before tests</li>
      <li><strong>Full Field Population</strong> - 24+ fields populated with realistic data</li>
      <li><strong>Auto-Cleanup</strong> - Removes test data after test completion</li>
      <li><strong>Unique Identifiers</strong> - Prevents data conflicts</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">2. Test Data Cleanup</ac:parameter>
  <ac:rich-text-body>
    <p>Removes orphaned test data from failed or interrupted test runs.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[npm run cleanup:accounts
npm run cleanup:test-data -- Account "Test Account%" 100]]></ac:plain-text-body>
    </ac:structured-macro>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">3. On-Demand Test Data Creation</ac:parameter>
  <ac:rich-text-body>
    <p>Create <strong>persistent test data</strong> that is NOT automatically cleaned up. Use this for manual testing, demo environments, or when you need sample records to remain in the QA org.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[# Create accounts for all 16 Account Types
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allTypes"

# Create accounts with all 7 Account Statuses
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allStatuses"

# Create accounts for all Regions (US, UK, EU, CA, ROW)
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allRegions"

# Create accounts for 15 different Countries
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand and @allCountries"

# Create everything (comprehensive data set)
npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand"]]></ac:plain-text-body>
    </ac:structured-macro>
    <p><strong>Available Tags:</strong></p>
    <table class="wrapped confluenceTable">
      <thead>
        <tr>
          <th>Tag</th>
          <th>Records</th>
          <th>Data Diversity</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><code>@allTypes</code></td><td>16 Accounts</td><td>All Account Types (Agency, Insurer, Member, etc.)</td></tr>
        <tr><td><code>@allStatuses</code></td><td>7 Accounts</td><td>New, Prospect, Onboarding, Contracted, Active, Runoff, Offboarded</td></tr>
        <tr><td><code>@allRegions</code></td><td>5 Accounts</td><td>US, UK, EU, CA, ROW</td></tr>
        <tr><td><code>@allCountries</code></td><td>15 Accounts</td><td>Germany, UK, France, Netherlands, US, Canada, Australia, etc.</td></tr>
        <tr><td><code>@createLeads</code></td><td>Sample Leads</td><td>Various lead sources and statuses</td></tr>
        <tr><td><code>@createContacts</code></td><td>Sample Contacts</td><td>Various departments and titles</td></tr>
        <tr><td><code>@createOpportunities</code></td><td>Sample Opportunities</td><td>Various stages and amounts</td></tr>
      </tbody>
    </table>
    <p><strong>Key Features:</strong></p>
    <ul>
      <li>🔒 Records are marked as <strong>persistent</strong> and will NOT be deleted by cleanup hooks</li>
      <li>🌍 Automatically populates region-specific data (currency, phone format, address)</li>
      <li>📝 Uses unique timestamps to avoid naming conflicts</li>
      <li>✅ API-based creation for speed and reliability</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">4. Step Definition Validator</ac:parameter>
  <ac:rich-text-body>
    <p>Validates that all Gherkin steps have matching step definitions.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[npm run validate:steps -- --work-item SF-503
npm run validate:steps -- --feature src/features/ui/SF/SF-520.feature
npm run validate:steps:all]]></ac:plain-text-body>
    </ac:structured-macro>
    <p><strong>Features:</strong></p>
    <ul>
      <li>✅ Validates both UI and API feature files for a work item</li>
      <li>📊 Shows coverage percentage and missing steps</li>
      <li>🔍 Identifies which steps use existing common step definitions</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">5. Step Definition Generator</ac:parameter>
  <ac:rich-text-body>
    <p>Automatically generates missing step definitions for feature files. Prioritizes common steps to maximize reuse.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[# Generate for a specific work item (recommended)
npm run generate:steps -- --work-item SF-503

# Generate for UI features only
npm run generate:steps -- --ui

# Generate for API features only
npm run generate:steps -- --api

# Generate for all feature files
npm run generate:steps]]></ac:plain-text-body>
    </ac:structured-macro>
    <p><strong>Features:</strong></p>
    <ul>
      <li>🔍 Scans common step definitions first (highest priority)</li>
      <li>♻️ Reuses existing common steps when possible</li>
      <li>📝 Generates only missing step definitions</li>
      <li>📁 Creates step definition files in appropriate locations (ui/ or api/)</li>
      <li>💡 Provides tips if similar steps exist in common files</li>
    </ul>
    <p><strong>Recommended Workflow:</strong></p>
    <ol>
      <li>Generate feature file from Jira: <code>npm run jira:generate -- --work-item SF-503</code></li>
      <li>Validate step definitions: <code>npm run validate:steps -- --work-item SF-503</code></li>
      <li>Generate missing steps: <code>npm run generate:steps -- --work-item SF-503</code></li>
    </ol>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">6. Interactive Test Runner</ac:parameter>
  <ac:rich-text-body>
    <p>Run tests with Playwright Inspector for debugging and locator selection.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[npm run test:interactive
npm run test:interactive:login]]></ac:plain-text-body>
    </ac:structured-macro>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">7. Playwright Recorder (Codegen)</ac:parameter>
  <ac:rich-text-body>
    <p>Record interactions to generate selectors and test code.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[npm run record:account
npm run record:account:fields]]></ac:plain-text-body>
    </ac:structured-macro>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">8. Report Generation</ac:parameter>
  <ac:rich-text-body>
    <p>Multiple report formats for different audiences.</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">bash</ac:parameter>
      <ac:plain-text-body><![CDATA[npm run report:full
npm run report:full:work-item
npm run report:allure
npm run report:allure:open]]></ac:plain-text-body>
    </ac:structured-macro>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">9. Confluence Evidence Storage</ac:parameter>
  <ac:rich-text-body>
    <p>Upload test evidence to Confluence for audit trails (due to space limit in Zephyr Scale).</p>
    <p><strong>Structure:</strong></p>
    <ul>
      <li>📁 Test Evidence (Parent Folder)</li>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;└── 📁 Sprint-93-QA (Test Cycle Folder)</li>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── 📄 SF-520-UI-001 - Scenario Name</li>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;├── 📸 screenshot-1.png</li>
      <li>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;&nbsp;└── 📊 test-report.html</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<hr />

<h1>Utility Command Reference</h1>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0052cc;color:white;">Command</th>
      <th style="background-color:#0052cc;color:white;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><code>npm run test:all</code></td><td>Run all tests with environment selection</td></tr>
    <tr><td><code>npm run test:feature -- --tags "@SF-503"</code></td><td>Run all tests (UI + API) for a specific work item</td></tr>
    <tr><td><code>npm run test:ui -- --tags "@SF-503"</code></td><td>Run UI tests only for a specific work item</td></tr>
    <tr><td><code>npm run test:api -- --tags "@SF-503"</code></td><td>Run API tests only for a specific work item</td></tr>
    <tr><td><code>npm run test:interactive</code></td><td>Run with Playwright Inspector</td></tr>
    <tr><td><code>npm run jira:generate -- --work-item SF-503</code></td><td>Generate tests from Jira work item</td></tr>
    <tr><td><code>npm run zephyr:UploadTestCase -- --work-item SF-503</code></td><td>Upload test cases to Zephyr for specific work item</td></tr>
    <tr><td><code>npm run zephyr:UploadTestCase -- --test-case SF-503-UI-001</code></td><td>Upload specific test case to Zephyr</td></tr>
    <tr><td><code>npm run zephyr:UploadResult -- --work-item SF-503 --cycle "Sprint-93-QA"</code></td><td>Upload test results to Zephyr for work item</td></tr>
    <tr><td><code>npm run validate:steps -- --work-item SF-503</code></td><td>Validate step definitions for a work item (UI + API)</td></tr>
    <tr><td><code>npm run validate:steps -- --feature src/features/ui/SF/SF-503.feature</code></td><td>Validate step definitions for a specific feature file</td></tr>
    <tr><td><code>npm run validate:steps:all</code></td><td>Validate step definitions for all feature files</td></tr>
    <tr><td><code>npm run generate:steps -- --work-item SF-503</code></td><td>Generate missing step definitions for a work item (UI + API)</td></tr>
    <tr><td><code>npm run generate:steps -- --ui</code></td><td>Generate missing step definitions for UI features only</td></tr>
    <tr><td><code>npm run generate:steps -- --api</code></td><td>Generate missing step definitions for API features only</td></tr>
    <tr><td><code>npm run generate:steps</code></td><td>Generate missing step definitions for all feature files</td></tr>
    <tr><td><code>npm run cleanup:accounts</code></td><td>Clean up test data</td></tr>
    <tr><td><code>npm run report:full</code></td><td>Generate full HTML report</td></tr>
    <tr><td><code>npm run report:allure</code></td><td>Generate Allure report</td></tr>
    <tr><td><code>npm run record:account</code></td><td>Record with Playwright Codegen</td></tr>
  </tbody>
</table>

<hr />

<h1>Environment Support</h1>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#6554c0;color:white;">Environment</th>
      <th style="background-color:#6554c0;color:white;">Purpose</th>
      <th style="background-color:#6554c0;color:white;">Configuration</th>
    </tr>
  </thead>
  <tbody>
    <tr><td><strong>DEV</strong></td><td>Development testing</td><td><code>.env.dev</code></td></tr>
    <tr><td><strong>QA</strong></td><td>QA validation</td><td><code>.env.qa</code></td></tr>
    <tr><td><strong>UAT</strong></td><td>User acceptance testing</td><td><code>.env.uat</code></td></tr>
    <tr><td><strong>PROD</strong></td><td>Production verification</td><td><code>.env.prod</code></td></tr>
  </tbody>
</table>

<hr />

<h1>Key Benefits</h1>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#00875a;color:white;">Benefit</th>
      <th style="background-color:#00875a;color:white;">Impact</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>✅ <strong>Unified Platform</strong></td><td>Single framework for UI + API testing across all CLM systems</td></tr>
    <tr><td>✅ <strong>Multi-System Coverage</strong></td><td>Tests span Salesforce, MuleSoft, RDM, CMT, and downstream systems</td></tr>
    <tr><td>✅ <strong>Faster Execution</strong></td><td>Parallel test execution capability</td></tr>
    <tr><td>✅ <strong>Reduced Maintenance</strong></td><td>Centralized locators and reusable steps</td></tr>
    <tr><td>✅ <strong>Full Traceability</strong></td><td>Jira → Test Case → Execution → Evidence</td></tr>
    <tr><td>✅ <strong>QA Control</strong></td><td>Human oversight at every phase</td></tr>
    <tr><td>✅ <strong>Audit Ready</strong></td><td>Comprehensive evidence in Confluence</td></tr>
    <tr><td>✅ <strong>Data Integrity</strong></td><td>Cross-system data validation</td></tr>
  </tbody>
</table>

<hr />

<h1>Quick Start</h1>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Getting Started</ac:parameter>
  <ac:plain-text-body><![CDATA[# Install dependencies
npm install

# Run tests for a specific work item
npm run test:all -- --tags @SF-520

# Run tests by priority
npm run test:all -- --tags @p1

# Upload results to Zephyr
npm run zephyr:UploadResult -- --cycle "Sprint-93-QA"]]></ac:plain-text-body>
</ac:structured-macro>

<hr />

<h1>Roadmap</h1>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#0052cc;color:white;">Phase</th>
      <th style="background-color:#0052cc;color:white;">Feature</th>
      <th style="background-color:#0052cc;color:white;">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>🔄</td><td>Salesforce CRM UI Testing</td><td style="background-color:#fff0b3;">In Progress</td></tr>
    <tr><td>🔄</td><td>Salesforce CRM API Testing</td><td style="background-color:#fff0b3;">In Progress</td></tr>
    <tr><td>📋</td><td>MuleSoft Integration Testing</td><td style="background-color:#deebff;">Planned</td></tr>
    <tr><td>🔄</td><td>Zephyr Scale Integration</td><td style="background-color:#fff0b3;">In Progress</td></tr>
    <tr><td>🔄</td><td>Confluence Evidence Storage</td><td style="background-color:#fff0b3;">In Progress</td></tr>
    <tr><td>🔄</td><td>RDM/CMT API Testing</td><td style="background-color:#fff0b3;">In Progress</td></tr>
    <tr><td>📋</td><td>ODS Data Validation</td><td style="background-color:#deebff;">Planned (Phase 1)</td></tr>
    <tr><td>📋</td><td>Automatic Bug Creation</td><td style="background-color:#deebff;">Planned</td></tr>
  </tbody>
</table>

<hr />

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#f4f5f7</ac:parameter>
  <ac:rich-text-body>
    <p style="text-align:center;"><em>Documentation maintained by QA Automation Team</em></p>
    <p style="text-align:center;"><em>Last Updated: December 2024</em></p>
  </ac:rich-text-body>
</ac:structured-macro>
`;
}

async function updateConfluencePage() {
  console.log('\n📄 Updating Confluence Documentation Page');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    process.exit(1);
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  const client = axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  try {
    console.log('📖 Getting current page version...');
    const { data: currentPage } = await client.get(`/content/${PAGE_ID}?expand=version`);
    const currentVersion = currentPage.version.number;
    console.log(`   Current version: ${currentVersion}`);
    console.log(`   Page title: ${currentPage.title}`);

    console.log('\n🔄 Generating Confluence-formatted content...');
    const confluenceContent = generateConfluenceContent();
    console.log(`   Content size: ${(confluenceContent.length / 1024).toFixed(1)} KB`);

    console.log('\n📤 Updating Confluence page...');
    const updatePayload = {
      id: PAGE_ID,
      type: 'page',
      title: 'CLM Automation Framework',
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: confluenceContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: 'Updated via E2E Automation Framework - Professional formatting',
      },
    };

    await client.put(`/content/${PAGE_ID}`, updatePayload);

    console.log('\n✅ Confluence page updated successfully!');
    console.log(`\n📎 View at: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PAGE_ID}/CLM+Automation+Framework`);

  } catch (error: any) {
    console.error('\n❌ Error updating Confluence page:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

updateConfluencePage();
