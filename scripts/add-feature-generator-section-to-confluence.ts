#!/usr/bin/env ts-node

/**
 * Add Feature Generator & Knowledge Base Sections to Confluence
 * 
 * Reads the current CLM Automation Framework page from Confluence,
 * adds new sections for Feature Generator and Knowledge Base,
 * and updates the page without losing existing manual updates.
 * 
 * Usage:
 *   npx ts-node scripts/add-feature-generator-section-to-confluence.ts
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
 * Generate the new Feature Generator section in Confluence Storage Format
 */
function generateFeatureGeneratorSection(): string {
  return `
<hr />

<h1>AI-Powered Feature Generator (v3.1)</h1>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#e3fcef</ac:parameter>
  <ac:parameter ac:name="titleBGColor">#00875a</ac:parameter>
  <ac:parameter ac:name="titleColor">#ffffff</ac:parameter>
  <ac:parameter ac:name="title">🤖 Intelligent Test Case Generation</ac:parameter>
  <ac:rich-text-body>
    <p>The Feature Generator automatically creates comprehensive BDD test cases from Jira work items using intelligent analysis of requirements, acceptance criteria, and parent/epic context.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>How It Works</h2>

<table class="wrapped confluenceTable">
  <colgroup><col /><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#0052cc;color:white;text-align:center;">Phase</th>
      <th style="background-color:#0052cc;color:white;">Process</th>
      <th style="background-color:#0052cc;color:white;">Output</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="background-color:#e6f0ff;text-align:center;"><strong>1</strong></td>
      <td><strong>Jira Analysis</strong> - Fetches work item, parent/epic, comments, and linked issues</td>
      <td>Comprehensive context extracted</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;text-align:center;"><strong>2</strong></td>
      <td><strong>Parent Context Enrichment</strong> - Reads parent/epic for business objectives and technical notes</td>
      <td>Business context understood</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;text-align:center;"><strong>3</strong></td>
      <td><strong>Requirement Extraction</strong> - Parses acceptance criteria (Given/When/Then)</td>
      <td>Structured requirements list</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;text-align:center;"><strong>4</strong></td>
      <td><strong>Field Detection</strong> - Identifies Salesforce objects and fields involved</td>
      <td>Field mappings extracted</td>
    </tr>
    <tr>
      <td style="background-color:#e6f0ff;text-align:center;"><strong>5</strong></td>
      <td><strong>Scenario Generation</strong> - Creates UI and API test scenarios with coverage analysis</td>
      <td>.feature files generated</td>
    </tr>
  </tbody>
</table>

<h2>Key Features</h2>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">📋 Parent/Epic Context Integration (NEW in v3.1)</ac:parameter>
  <ac:rich-text-body>
    <p>The generator automatically fetches and includes context from parent work items (Epics or parent Stories) to provide:</p>
    <ul>
      <li><strong>Business Objective</strong> - High-level goal from the parent epic</li>
      <li><strong>Parent Acceptance Criteria</strong> - Requirements that apply to all child stories</li>
      <li><strong>Technical Notes</strong> - Constraints and implementation details from parent</li>
      <li><strong>Related Work Items</strong> - Sibling stories for context awareness</li>
    </ul>
    <p><strong>Example Output in Feature File:</strong></p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">gherkin</ac:parameter>
      <ac:plain-text-body><![CDATA[# ═══════════════════════════════════════════════════════════════════════════
# PARENT/EPIC CONTEXT
# ═══════════════════════════════════════════════════════════════════════════
#
# Parent: SF-500 - Account Field Cleanup Epic
# Type: Epic | Status: In Progress
# Business Objective: Simplify Account page by removing unused fields...
#
# Parent Acceptance Criteria (3):
#   1. All deprecated fields removed from page layouts...
#   2. Field permissions updated for all profiles...
#
# Related Work Items: SF-520, SF-521, SF-522, SF-523]]></ac:plain-text-body>
    </ac:structured-macro>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">🎯 Intelligent Test Strategy</ac:parameter>
  <ac:rich-text-body>
    <p>The generator determines the optimal test approach for each requirement:</p>
    <table class="wrapped confluenceTable">
      <thead>
        <tr>
          <th>Requirement Type</th>
          <th>Recommended Test</th>
          <th>Reason</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Field visibility</td><td>UI</td><td>Visual verification required</td></tr>
        <tr><td>Field exists/metadata</td><td>API</td><td>Faster, more reliable</td></tr>
        <tr><td>Picklist values</td><td>API</td><td>Can verify all values at once</td></tr>
        <tr><td>User permissions</td><td>Both</td><td>UI for behavior, API for metadata</td></tr>
        <tr><td>Data mapping</td><td>API</td><td>Direct data comparison</td></tr>
      </tbody>
    </table>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">📊 Coverage Analysis</ac:parameter>
  <ac:rich-text-body>
    <p>Each generated feature file includes coverage analysis showing which requirements are tested:</p>
    <ac:structured-macro ac:name="code" ac:schema-version="1">
      <ac:parameter ac:name="language">gherkin</ac:parameter>
      <ac:plain-text-body><![CDATA[# Test Requirements (3):
#   REQ-1: Field should be hidden on all Account page layouts
#     → Test Type: UI | Priority: p1
#     → Covered by: @SF-506-UI-001, @SF-506-UI-002
#   REQ-2: Field should still exist in the object schema
#     → Test Type: API | Priority: p2
#     → Covered by: @SF-506-API-001]]></ac:plain-text-body>
    </ac:structured-macro>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Commands</h2>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Feature Generation Commands</ac:parameter>
  <ac:plain-text-body><![CDATA[# Generate from a single work item
npm run jira:generate -- SF-520

# Generate with version suffix (create new version)
npm run jira:generate -- SF-520 --version-all

# Generate from file (inputs/jira-work-items.txt)
npm run jira:generate

# Batch generate with options
npm run jira:generate -- --overwrite-all    # Overwrite existing files
npm run jira:generate -- --skip-all         # Skip existing files]]></ac:plain-text-body>
</ac:structured-macro>

<hr />

<h1>Knowledge Base &amp; Continuous Learning System</h1>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#deebff</ac:parameter>
  <ac:parameter ac:name="titleBGColor">#0052cc</ac:parameter>
  <ac:parameter ac:name="titleColor">#ffffff</ac:parameter>
  <ac:parameter ac:name="title">🧠 AI-Based Learning from QA Reviews</ac:parameter>
  <ac:rich-text-body>
    <p>The framework maintains a <strong>Knowledge Base</strong> that continuously learns from QA-reviewed feature files, improving test case generation over time.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>How the Learning System Works</h2>

<table class="wrapped confluenceTable">
  <colgroup><col /><col /><col /></colgroup>
  <thead>
    <tr>
      <th style="background-color:#6554c0;color:white;text-align:center;">Step</th>
      <th style="background-color:#6554c0;color:white;">Process</th>
      <th style="background-color:#6554c0;color:white;">Data Captured</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>1</strong></td>
      <td><strong>Initial Generation</strong> - Feature files generated from Jira (v1 files)</td>
      <td>Requirements, entities, fields, feature types</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>2</strong></td>
      <td><strong>QA Review</strong> - Manual QA reviews and refines test cases</td>
      <td>Corrections, additions, refinements</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>3</strong></td>
      <td><strong>Save as v2</strong> - QA-approved files saved with -v2 suffix</td>
      <td>Approved patterns, scenarios, step usage</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>4</strong></td>
      <td><strong>Knowledge Extraction</strong> - System analyzes differences between v1 and v2</td>
      <td>Patterns, preferences, corrections</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>5</strong></td>
      <td><strong>Pattern Recognition</strong> - Learns from similar work items</td>
      <td>Entity patterns, field patterns, scenario templates</td>
    </tr>
    <tr>
      <td style="text-align:center;background-color:#e6e6fa;"><strong>6</strong></td>
      <td><strong>Improved Generation</strong> - Future generations use learned patterns</td>
      <td>Better accuracy over time</td>
    </tr>
  </tbody>
</table>

<h2>Knowledge Base Structure</h2>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">text</ac:parameter>
  <ac:parameter ac:name="title">Knowledge Base Directory</ac:parameter>
  <ac:plain-text-body><![CDATA[data/knowledge-base/
├── work-items/                    # Context for each work item
│   ├── SF-520.json               # Extracted context, requirements, fields
│   ├── SF-521.json
│   └── ...
├── patterns/                      # Learned patterns
│   ├── entity-patterns.json      # Account, Contact, Opportunity patterns
│   ├── field-patterns.json       # Field type handling patterns
│   └── scenario-templates.json   # Successful scenario templates
└── work-items-index.json         # Index with v1/v2 file tracking]]></ac:plain-text-body>
</ac:structured-macro>

<h2>What the System Learns</h2>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">📂 Work Item Context</ac:parameter>
  <ac:rich-text-body>
    <p>For each processed work item, the system stores:</p>
    <ul>
      <li><strong>Entities</strong> - Salesforce objects involved (Account, Contact, etc.)</li>
      <li><strong>Fields</strong> - Field names and API names detected</li>
      <li><strong>Actions</strong> - What needs to be done (hide, delete, modify, validate)</li>
      <li><strong>Acceptance Criteria</strong> - Parsed Given/When/Then statements</li>
      <li><strong>Feature Types</strong> - field-visibility, picklist-values, validation-rule, etc.</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">🔄 QA Review Patterns</ac:parameter>
  <ac:rich-text-body>
    <p>When QA reviews and saves v2 files, the system learns:</p>
    <ul>
      <li><strong>Scenario Modifications</strong> - How QA refined generated scenarios</li>
      <li><strong>Additional Scenarios</strong> - Edge cases QA added</li>
      <li><strong>Step Preferences</strong> - Preferred step definitions used</li>
      <li><strong>Tag Usage</strong> - How QA organizes test cases with tags</li>
    </ul>
  </ac:rich-text-body>
</ac:structured-macro>

<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">🔗 Similar Work Item Matching</ac:parameter>
  <ac:rich-text-body>
    <p>The system finds similar work items based on:</p>
    <table class="wrapped confluenceTable">
      <thead>
        <tr>
          <th>Similarity Factor</th>
          <th>Weight</th>
          <th>Example</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Same Entities</td><td>30%</td><td>Both involve Account object</td></tr>
        <tr><td>Same Fields</td><td>40%</td><td>Both test Account_Status__c</td></tr>
        <tr><td>Same Feature Type</td><td>30%</td><td>Both are field-visibility tests</td></tr>
      </tbody>
    </table>
    <p>When generating new test cases, the system references similar QA-approved work items for improved accuracy.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Commands</h2>

<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">bash</ac:parameter>
  <ac:parameter ac:name="title">Knowledge Base Commands</ac:parameter>
  <ac:plain-text-body><![CDATA[# Build knowledge base for work items in jira-work-items.txt
npm run knowledge:build

# Build for a specific work item
npm run knowledge:build -- --work-item SF-520

# Update existing entries
npm run knowledge:build -- --update]]></ac:plain-text-body>
</ac:structured-macro>

<h2>Benefits of Continuous Learning</h2>

<table class="wrapped confluenceTable">
  <thead>
    <tr>
      <th style="background-color:#00875a;color:white;">Benefit</th>
      <th style="background-color:#00875a;color:white;">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>📈 <strong>Improved Accuracy</strong></td><td>Generated test cases become more accurate with each QA review</td></tr>
    <tr><td>⏱️ <strong>Reduced Review Time</strong></td><td>QA spends less time correcting as the system learns preferences</td></tr>
    <tr><td>🔄 <strong>Consistent Quality</strong></td><td>Patterns ensure consistent test case quality across similar work items</td></tr>
    <tr><td>📚 <strong>Institutional Knowledge</strong></td><td>Team's testing knowledge is captured and reused</td></tr>
    <tr><td>🎯 <strong>Context Awareness</strong></td><td>New work items benefit from context of similar past work items</td></tr>
  </tbody>
</table>

<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p><strong>QA Workflow for Learning:</strong></p>
    <ol>
      <li>Generate feature files: <code>npm run jira:generate -- SF-520</code></li>
      <li>Review generated files in <code>src/features/ui/SF/</code> and <code>src/features/api/SF/</code></li>
      <li>Make corrections and save as v2: <code>SF-520-v2.feature</code></li>
      <li>Build knowledge base: <code>npm run knowledge:build -- --work-item SF-520</code></li>
      <li>Future similar work items will benefit from your review!</li>
    </ol>
  </ac:rich-text-body>
</ac:structured-macro>
`;
}

async function readCurrentPageAndAddSections() {
  console.log('\n📄 Adding Feature Generator & Knowledge Base Sections to Confluence');
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
    // Step 1: Read current page content
    console.log('📖 Reading current Confluence page...');
    const { data: currentPage } = await client.get(`/content/${PAGE_ID}?expand=version,body.storage`);
    const currentVersion = currentPage.version.number;
    const currentContent = currentPage.body.storage.value;
    
    console.log(`   Current version: ${currentVersion}`);
    console.log(`   Page title: ${currentPage.title}`);
    console.log(`   Content size: ${(currentContent.length / 1024).toFixed(1)} KB`);

    // Step 2: Check if sections already exist
    if (currentContent.includes('AI-Powered Feature Generator') || currentContent.includes('Knowledge Base &amp; Continuous Learning')) {
      console.log('\n⚠️  Feature Generator or Knowledge Base sections already exist on this page.');
      console.log('   Skipping to avoid duplicates.');
      console.log('\n   If you want to update these sections, please remove them from Confluence first.');
      return;
    }

    // Step 3: Generate new sections
    console.log('\n🔄 Generating Feature Generator & Knowledge Base sections...');
    const newSections = generateFeatureGeneratorSection();
    console.log(`   New content size: ${(newSections.length / 1024).toFixed(1)} KB`);

    // Step 4: Append new sections to existing content
    // Find a good insertion point - before the footer panel or at the end
    let updatedContent: string;
    
    // Look for the footer panel (maintained by QA team)
    const footerPattern = /<ac:structured-macro ac:name="panel"[^>]*>[\s\S]*?Documentation maintained by[\s\S]*?<\/ac:structured-macro>\s*$/i;
    const footerMatch = currentContent.match(footerPattern);
    
    if (footerMatch) {
      // Insert before the footer
      const insertionPoint = currentContent.lastIndexOf(footerMatch[0]);
      updatedContent = currentContent.slice(0, insertionPoint) + newSections + '\n\n' + footerMatch[0];
      console.log('   Inserting before footer section...');
    } else {
      // Append at the end
      updatedContent = currentContent + newSections;
      console.log('   Appending to end of page...');
    }

    console.log(`   Combined content size: ${(updatedContent.length / 1024).toFixed(1)} KB`);

    // Step 5: Update the page
    console.log('\n📤 Updating Confluence page...');
    const updatePayload = {
      id: PAGE_ID,
      type: 'page',
      title: currentPage.title, // Keep the same title
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: updatedContent,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: 'Added Feature Generator & Knowledge Base sections',
      },
    };

    await client.put(`/content/${PAGE_ID}`, updatePayload);

    console.log('\n✅ Confluence page updated successfully!');
    console.log(`\n📎 View at: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${PAGE_ID}/CLM+Automation+Framework`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Main execution
readCurrentPageAndAddSections();



