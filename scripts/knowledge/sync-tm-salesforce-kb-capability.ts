#!/usr/bin/env ts-node
/**
 * Sync TM Confluence under **Salesforce core functions** for one **capability** (overview + configured child pages).
 *
 * - **TM only.** Parent: `CONFLUENCE_TM_SALESFORCE_KNOWLEDGE_PAGE_ID`.
 * **Interactive:** Y/N per page (create + overwrite).
 * **--missing-only:** no TTY; create missing pages only; **case-insensitive** child match (no duplicates).
 *
 * Usage:
 *   npx ts-node scripts/knowledge/sync-tm-salesforce-kb-capability.ts --capability leads
 *   npx ts-node scripts/knowledge/sync-tm-salesforce-kb-capability.ts --capability leads --missing-only
 *   npx ts-node scripts/knowledge/sync-tm-salesforce-kb-capability.ts --capability account --missing-only
 *   npx ts-node scripts/knowledge/sync-tm-salesforce-kb-capability.ts --capability opportunity --missing-only
 *
 * **--apply-updates** (no TTY): push template bodies from this script to Confluence — **overwrite** existing
 * pages and **create** any missing, **without prompts**. Use when you intend to refresh TM from repo (Confluence history retained).
 * Do not use in CI unless you accept overwriting manual Confluence edits.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import type { ConfluenceClient } from '../../src/integrations/confluence/client';

const ROOT = path.resolve(__dirname, '../..');

const ENV_QA_PATHS = [
  path.join(ROOT, 'src/config/env/.env.qa'),
  path.join(ROOT, '.env.qa'),
];

const ENV_FALLBACK = path.join(ROOT, '.env');

function loadEnv(): void {
  let loaded = false;
  for (const p of ENV_QA_PATHS) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: true });
      console.log(`📁 Loaded env: ${path.relative(ROOT, p)}\n`);
      loaded = true;
      break;
    }
  }
  if (!loaded && fs.existsSync(ENV_FALLBACK)) {
    dotenv.config({ path: ENV_FALLBACK, override: true });
    console.warn(`⚠️  Using ${path.relative(ROOT, ENV_FALLBACK)} — prefer .env.qa\n`);
  } else if (!loaded) {
    console.error('❌ No .env.qa found.');
    process.exit(1);
  }
}

function askYn(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${question} [y/n]: `, (answer) => {
      rl.close();
      resolve(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

interface PageSpec {
  title: string;
  bodyStorage: string;
}

interface CapabilityDef {
  overviewTitle: string;
  repoFolder: string;
  tagExampleUi: string;
  tagExampleApi: string;
  overviewBody: () => string;
  children: Array<{ title: string; body: () => string }>;
}

function footer(scriptNote: string): string {
  return `<p><small>${scriptNote}</small></p>`;
}

const SCRIPT = 'scripts/knowledge/sync-tm-salesforce-kb-capability.ts';
/** Jira browse base (align with JIRA_BASE_URL host if you self-host). */
const JIRA_BROWSE = 'https://accelins.atlassian.net/browse';

const CAPABILITIES: Record<string, CapabilityDef> = {
  leads: {
    overviewTitle: 'Leads',
    repoFolder: 'src/features/kb/sf/lead/',
    tagExampleUi: '@kb_sf_lead_ui_001',
    tagExampleApi: '@kb_sf_lead_api_001',
    overviewBody: () =>
      `
<h2>Purpose</h2>
<p>Functional view of the <strong>Lead</strong> object in Salesforce: capture, progression through <strong>New</strong> / <strong>Funnel</strong>, <strong>Disqualified</strong> (terminal), and <strong>conversion</strong> to Account, Contact, and Opportunity. Content is synthesized from Jira-linked automation in this repo (not a test runbook).</p>
<h2>Canonical Jira (requirements)</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-753"><strong>SF-753</strong></a> &mdash; Lead lifecycle, Funnel field, status movement, disqualification rules, and conversion validation (Funnel rules must not be bypassed when converting from New).</li>
  <li><a href="${JIRA_BROWSE}/SF-726"><strong>SF-726</strong></a> &mdash; Accounts created via Lead Conversion default to <strong>Prospect</strong>; accounts may also be created without a Lead.</li>
  <li><a href="${JIRA_BROWSE}/SF-730"><strong>SF-730</strong></a> &mdash; Regional / <strong>Distribution Region</strong> behaviour on <strong>Opportunity</strong> at Lead conversion (not mapped directly from Lead; derived via Account).</li>
  <li><a href="${JIRA_BROWSE}/SF-899"><strong>SF-899</strong></a> &mdash; When an Opportunity is created from Lead Conversion, Opportunity Type defaults to <strong>New Member</strong>.</li>
</ul>
<h2>Process summary (from acceptance themes in repo)</h2>
<ul>
  <li><strong>Statuses:</strong> Leads move between <strong>New</strong> and <strong>Funnel</strong> (backward allowed); <strong>Disqualified</strong> is terminal (no return to active statuses).</li>
  <li><strong>Create in Funnel:</strong> A Lead may be saved directly in <strong>Funnel</strong>; validations that apply in <strong>New</strong> still apply when creating or moving into Funnel.</li>
  <li><strong>Convert from New:</strong> Changing status to <strong>Converted</strong> from <strong>New</strong> runs Funnel-stage validations; conversion is blocked if they fail.</li>
  <li><strong>After conversion:</strong> New Account should be <strong>Prospect</strong> (SF-726); Opportunity type and regional fields follow SF-899 / SF-730.</li>
</ul>
<h2>Sub-pages</h2>
<p><strong>Create</strong> &mdash; creating and editing Leads before conversion. <strong>Convert</strong> &mdash; conversion outcomes and downstream Account / Opportunity rules.</p>
<h2>Automation in this repo (Layer A &mdash; story traceability)</h2>
<ul>
  <li><code>src/features/ui/SF/SF-753.feature</code>, <code>src/features/api/SF/SF-753.feature</code> &mdash; lifecycle / Funnel / UI create Lead.</li>
  <li><code>src/features/ui/SF/SF-726.feature</code>, <code>src/features/api/SF/SF-726.feature</code> &mdash; Prospect default from conversion.</li>
  <li><code>src/features/ui/SF/SF-730.feature</code> &mdash; Opportunity at conversion (regional).</li>
  <li><code>src/features/ui/SF/SF-899.feature</code> &mdash; Opportunity type from conversion.</li>
  <li><code>src/features/ui/General/qa-smoke-test.feature</code> &mdash; smoke: Lead list access, create Lead via UI.</li>
</ul>
${automationTwoLayers('Leads', 'lead', '@kb_sf_lead_ui_001', '@kb_sf_lead_api_001')}
${conflictsBlock()}
${footer(`Content source: Jira keys above + Gherkin in repo. Regenerate via <code>${SCRIPT}</code> — capability <code>leads</code> (interactive overwrite to push).`)}
`.trim(),
    children: [
      {
        title: 'Create',
        body: () =>
          `
<h2>Purpose</h2>
<p>How users <strong>create</strong> and <strong>maintain</strong> Lead records before conversion: required data, <strong>Lead Status</strong>, <strong>Funnel</strong>, and validation behaviour.</p>
<h2>Creating a Lead</h2>
<ul>
  <li>From the <strong>Leads</strong> tab: <strong>New</strong>, set at minimum fields your org requires (smoke tests use <strong>Company</strong>, <strong>Last Name</strong>, and &quot;fill required Lead fields&quot; &mdash; see <code>qa-smoke-test.feature</code>).</li>
  <li>API-backed setup for tests often uses JWT / <code>Given I have a valid Salesforce API token</code> (see SF-753 API file for object describe smoke).</li>
</ul>
<h2>Status and Funnel (SF-753)</h2>
<ul>
  <li><strong>New</strong> and <strong>Funnel</strong>: users may move backward between them; a Lead can be <strong>created directly in Funnel</strong> without passing through New first.</li>
  <li>All validation and required-field rules that apply when saving in <strong>New</strong> must also apply when creating or updating into <strong>Funnel</strong>.</li>
  <li><strong>Funnel</strong> custom field: visible and editable on Lead (UI scenarios in SF-753); read-only users cannot edit.</li>
  <li><strong>Disqualified</strong>: allowed from New or Funnel; cannot move back to active statuses.</li>
</ul>
<h2>Related Jira</h2>
<p><a href="${JIRA_BROWSE}/SF-753">SF-753</a> (primary). For conversion-side behaviour see sibling page <strong>Convert</strong>.</p>
<h2>Related automation files</h2>
<ul>
  <li><code>src/features/ui/SF/SF-753.feature</code> (UI)</li>
  <li><code>src/features/api/SF/SF-753.feature</code> (API smoke / describe)</li>
  <li><code>src/features/ui/General/qa-smoke-test.feature</code> (Lead list + create)</li>
</ul>
${footer('Synced by automation — edit in Confluence; next interactive sync may overwrite if you confirm.')}
`.trim(),
      },
      {
        title: 'Convert',
        body: () =>
          `
<h2>Purpose</h2>
<p>What happens when a Lead is <strong>converted</strong>: validations, Account defaults, and Opportunity creation rules (including type and regional fields).</p>
<h2>Before conversion (SF-753)</h2>
<ul>
  <li>From <strong>New</strong>, setting status to <strong>Converted</strong> must evaluate the same validations as for <strong>Funnel</strong>; conversion is blocked if they fail.</li>
  <li>Funnel validations must not be bypassed when converting directly from New.</li>
</ul>
<h2>Account (SF-726)</h2>
<ul>
  <li>Accounts created <strong>via Lead Conversion</strong> must default to <strong>Prospect</strong> (automation: API/UI SF-726).</li>
  <li>Accounts may still be created <strong>without</strong> an associated Lead where the process allows it.</li>
</ul>
<h2>Opportunity at conversion</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-899"><strong>SF-899</strong></a>: Opportunity created from Lead Conversion should default <strong>Opportunity Type</strong> to <strong>New Member</strong>.</li>
  <li><a href="${JIRA_BROWSE}/SF-730"><strong>SF-730</strong></a>: <strong>UNSD Region</strong> on Lead is <strong>not</strong> mapped to Opportunity; <strong>Distribution Region</strong> on Opportunity is derived from the <strong>related Account</strong> (not directly from Lead). Field label / read-only behaviour is covered in SF-730 UI scenarios.</li>
</ul>
<h2>Related automation files</h2>
<ul>
  <li><code>src/features/api/SF/SF-726.feature</code>, <code>src/features/ui/SF/SF-726.feature</code></li>
  <li><code>src/features/ui/SF/SF-899.feature</code></li>
  <li><code>src/features/ui/SF/SF-730.feature</code></li>
  <li><code>src/features/api/SF/SF-726-Demo.feature</code> (demo variant)</li>
</ul>
<p>Parent: <strong>Leads</strong> overview. Related: <strong>Create</strong>.</p>
${footer('Synced by automation — edit in Confluence; next interactive sync may overwrite if you confirm.')}
`.trim(),
      },
    ],
  },

  account: {
    overviewTitle: 'Account',
    repoFolder: 'src/features/kb/sf/account/',
    tagExampleUi: '@kb_sf_account_ui_001',
    tagExampleApi: '@kb_sf_account_api_001',
    overviewBody: () =>
      `
<h2>Purpose</h2>
<p>Functional view of <strong>Account</strong> creation, <strong>types</strong> (Member, Non-Member MGA, Legal Entity, etc.), <strong>status / lifecycle</strong>, stacked validations, and links to Opportunities and integrations. Synthesized from Jira-linked automation in this repo.</p>
<p><strong>KB marker:</strong> <code>account-overview-v2</code> (if you do not see this line, Confluence is not showing the latest push).</p>
<h2>Canonical Jira (requirements)</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-726"><strong>SF-726</strong></a> &mdash; Member / Non-Member MGA lifecycle; accounts from <strong>Lead Conversion</strong> default to <strong>Prospect</strong>; direct creation without a Lead where allowed.</li>
  <li><a href="${JIRA_BROWSE}/SF-1044"><strong>SF-1044</strong></a> &mdash; Member and Non-Member MGA <strong>stacked validations</strong> by lifecycle stage (e.g. creating as Onboarding enforces Prospect rules).</li>
  <li><a href="${JIRA_BROWSE}/SF-1045"><strong>SF-1045</strong></a> &mdash; Account validation rules (contract / Runoff, Billing Country, Party Code, Legal Entity, TPA, Affiliate, etc.) &mdash; API and UI coverage in repo.</li>
  <li><a href="${JIRA_BROWSE}/SF-758"><strong>SF-758</strong></a> &mdash; Other account types: lifecycle and governance (Lead Conversion out of scope for some types).</li>
  <li><a href="${JIRA_BROWSE}/SF-709"><strong>SF-709</strong></a> &mdash; Restrict Account Status values by Account Type.</li>
  <li><a href="${JIRA_BROWSE}/SF-612"><strong>SF-612</strong></a> / <a href="${JIRA_BROWSE}/SF-614"><strong>SF-614</strong></a> &mdash; Member Legal Entity Relationship, <code>Is_Active__c</code>, Dataverse alignment (API-heavy).</li>
</ul>
<h2>Typical themes</h2>
<ul>
  <li><strong>Creation:</strong> Direct in Salesforce vs via Lead Conversion; required fields and relationships (e.g. Legal Entity for Members).</li>
  <li><strong>Status:</strong> Prospect, Onboarding, Active, Contracted, etc. &mdash; transitions may stack validations from prior stages (SF-1044).</li>
  <li><strong>Integration:</strong> Dataverse IDs, platform events, TPA Maps &mdash; see linked SF-* and <strong>Drift log</strong> for changes.</li>
</ul>
<h2>Sub-pages</h2>
<p><strong>Account &mdash; Create</strong> and <strong>Account &mdash; Lifecycle and status</strong>.</p>
<h2>Automation in this repo (Layer A)</h2>
<ul>
  <li><code>src/features/ui/SF/SF-726.feature</code>, <code>src/features/api/SF/SF-726.feature</code></li>
  <li><code>src/features/ui/SF/SF-1044.feature</code>, <code>src/features/api/SF/SF-1044.feature</code></li>
  <li><code>src/features/ui/SF/SF-1045.feature</code>, <code>src/features/api/SF/SF-1045.feature</code></li>
  <li><code>src/features/ui/SF/SF-758.feature</code>, <code>src/features/api/SF/SF-758.feature</code></li>
</ul>
${automationTwoLayers('Account', 'account', '@kb_sf_account_ui_001', '@kb_sf_account_api_001')}
${conflictsBlock()}
${footer(`Regenerate: <code>${SCRIPT}</code> <code>--capability account --apply-updates</code>`)}
`.trim(),
    children: [
      {
        title: 'Account — Create',
        body: () =>
          `
<h2>Purpose</h2>
<p>Creating Accounts: types, required data, and when <strong>stacked validations</strong> apply (especially Member / Non-Member MGA).</p>
<p><strong>KB marker:</strong> <code>account-create-v2</code></p>
<h2>Lead conversion vs direct create</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-726">SF-726</a>: Account created via <strong>Lead Conversion</strong> defaults to <strong>Prospect</strong>.</li>
  <li>Accounts may be created <strong>without</strong> a Lead where the process allows (same story family).</li>
</ul>
<h2>Member / Non-Member MGA (SF-1044)</h2>
<ul>
  <li>Creating with Status <strong>Onboarding</strong> enforces validations that apply to <strong>Prospect</strong>.</li>
  <li>Creating as <strong>Contracted</strong> enforces Prospect <strong>and</strong> Onboarding validation sets (see UI scenarios in SF-1044).</li>
  <li>Skipping intermediate statuses is only allowed when all governing rules for skipped stages are satisfied.</li>
</ul>
<h2>Validation rules (SF-1045)</h2>
<p>Broad account validation themes (contract, Runoff, Billing Country, Party Code, Legal Entity, TPA, Affiliate) are automated under SF-1045 UI/API features &mdash; use those files for exact behaviour.</p>
<h2>Related automation</h2>
<ul>
  <li><code>src/features/ui/SF/SF-1044.feature</code>, <code>src/features/ui/SF/SF-1045.feature</code></li>
  <li><code>src/features/api/SF/SF-1044.feature</code>, <code>src/features/api/SF/SF-1045.feature</code></li>
  <li><code>src/features/ui/SF/SF-726.feature</code></li>
</ul>
<p>Parent: <strong>Account</strong> overview. Related: <strong>Account &mdash; Lifecycle and status</strong>.</p>
${footer('Regenerate: npm script <code>confluence:sync:tm-sf-kb-account -- --apply-updates</code>')}
`.trim(),
      },
      {
        title: 'Account — Lifecycle and status',
        body: () =>
          `
<h2>Purpose</h2>
<p>Account <strong>status</strong> progression, alignment with <strong>Opportunity</strong> stages where applicable, governance, and restrictions by <strong>Account Type</strong>.</p>
<p><strong>KB marker:</strong> <code>account-lifecycle-v2</code></p>
<h2>Status and type (SF-709, SF-758)</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-709">SF-709</a>: which <strong>Account Status</strong> values are valid depends on <strong>Account Type</strong>.</li>
  <li><a href="${JIRA_BROWSE}/SF-758">SF-758</a>: lifecycle for <strong>other</strong> account types; Lead Conversion may be out of scope for some types.</li>
</ul>
<h2>Alignment with Opportunity (checkpoint)</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-761">SF-761</a> (Opportunity) documents broad Account alignment: e.g. Pipeline &rarr; Prospect; Due Diligence/Contracting &rarr; Onboarding; Go-Live &rarr; Contracted; Live &rarr; Active &mdash; detailed sync at contracted checkpoint may be covered in SF-762 and related stories.</li>
</ul>
<h2>Stacked rules reminder (SF-1044)</h2>
<p>Status jumps must satisfy cumulative validations from skipped stages; see <strong>Account &mdash; Create</strong> and SF-1044 UI feature.</p>
<h2>Related automation</h2>
<ul>
  <li><code>src/features/ui/SF/SF-1044.feature</code>, <code>src/features/ui/SF/SF-709.feature</code>, <code>src/features/ui/SF/SF-758.feature</code></li>
  <li><code>src/features/api/SF/SF-709.feature</code>, <code>src/features/api/SF/SF-758.feature</code> (where present)</li>
</ul>
<p>Parent: <strong>Account</strong> overview. Related: <strong>Account &mdash; Create</strong>.</p>
${footer('Regenerate: npm script <code>confluence:sync:tm-sf-kb-account -- --apply-updates</code>')}
`.trim(),
      },
    ],
  },

  opportunity: {
    overviewTitle: 'Opportunity',
    repoFolder: 'src/features/kb/sf/opportunity/',
    tagExampleUi: '@kb_sf_opportunity_ui_001',
    tagExampleApi: '@kb_sf_opportunity_api_001',
    overviewBody: () =>
      `
<h2>Purpose</h2>
<p>Functional view of <strong>Opportunities</strong>: types (New Business, Renewal, Expansion, etc.), <strong>stages</strong>, readiness / MOU / questionnaires, <strong>Product Map</strong> lifecycle, and hand-offs to contracting and Live. Synthesized from Jira-linked automation.</p>
<p><strong>KB marker:</strong> <code>opportunity-overview-v2</code> (if missing, page was not overwritten by latest push).</p>
<h2>Canonical Jira (requirements)</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-761"><strong>SF-761</strong></a> &mdash; <strong>New Business</strong> sequential lifecycle: Pipeline &rarr; Due Diligence &rarr; Contracting &rarr; Go-Live &rarr; Live; <strong>Unqualified</strong> from Pipeline, Due Diligence, or Contracting; Account alignment with stages.</li>
  <li><a href="${JIRA_BROWSE}/SF-899"><strong>SF-899</strong></a> &mdash; Opportunity <strong>Type</strong> values; Opportunity from <strong>Lead Conversion</strong> defaults Type to <strong>New Member</strong>.</li>
  <li><a href="${JIRA_BROWSE}/SF-730"><strong>SF-730</strong></a> &mdash; Regional / <strong>Distribution Region</strong> on Opportunity at Lead conversion (derived via Account).</li>
  <li><a href="${JIRA_BROWSE}/SF-977"><strong>SF-977</strong></a> / <a href="${JIRA_BROWSE}/SF-980"><strong>SF-980</strong></a> &mdash; <strong>Product Map</strong> lifecycle for <strong>Expansion</strong> opportunities; statuses, history, Live transition.</li>
  <li><a href="${JIRA_BROWSE}/SF-723"><strong>SF-723</strong></a> &mdash; Opportunity moved to <strong>Contracting</strong> stage (related UI/API in repo).</li>
  <li>Readiness / MOU / summary fields: e.g. <a href="${JIRA_BROWSE}/SF-920">SF-920</a>, <a href="${JIRA_BROWSE}/SF-874">SF-874</a>, <a href="${JIRA_BROWSE}/SF-875">SF-875</a> &mdash; see feature headers in repo.</li>
</ul>
<h2>Sub-pages</h2>
<p><strong>Opportunity &mdash; Create</strong> and <strong>Opportunity &mdash; Lifecycle and approvals</strong>.</p>
<h2>Automation in this repo (Layer A) — sample</h2>
<ul>
  <li><code>src/features/ui/SF/SF-761.feature</code>, <code>src/features/api/SF/SF-761.feature</code></li>
  <li><code>src/features/api/SF/SF-977.feature</code>, <code>src/features/ui/SF/SF-977.feature</code></li>
  <li><code>src/features/ui/SF/SF-899.feature</code>, <code>src/features/ui/SF/SF-730.feature</code></li>
</ul>
${automationTwoLayers('Opportunity', 'opportunity', '@kb_sf_opportunity_ui_001', '@kb_sf_opportunity_api_001')}
${conflictsBlock()}
${footer(`Regenerate: <code>${SCRIPT}</code> <code>--capability opportunity --apply-updates</code>`)}
`.trim(),
    children: [
      {
        title: 'Opportunity — Create',
        body: () =>
          `
<h2>Purpose</h2>
<p>How Opportunities are <strong>created</strong> and tied to <strong>Accounts</strong>: types, sub-types, Lead conversion defaults, and regional context.</p>
<p><strong>KB marker:</strong> <code>opportunity-create-v2</code></p>
<h2>From Lead conversion</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-899">SF-899</a>: Type defaults to <strong>New Member</strong> when created from Lead Conversion.</li>
  <li><a href="${JIRA_BROWSE}/SF-730">SF-730</a>: Distribution Region on Opportunity follows <strong>Account</strong>; Lead UNSD Region is not copied to Opportunity.</li>
</ul>
<h2>Types and Product Map (Expansion)</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-977">SF-977</a>: <strong>Expansion</strong> opportunities drive <code>Product_Map__c</code> lifecycle (Draft, Active Pending Go-Live, Active on Live) per <a href="${JIRA_BROWSE}/SF-980">SF-980</a> rules &mdash; see API feature for exact scenarios.</li>
  <li>UI entry: Accelerant Console &rarr; Product Maps (SF-977 UI smoke).</li>
</ul>
<h2>Related automation</h2>
<ul>
  <li><code>src/features/ui/SF/SF-899.feature</code>, <code>src/features/ui/SF/SF-730.feature</code></li>
  <li><code>src/features/api/SF/SF-977.feature</code>, <code>src/features/ui/SF/SF-977.feature</code></li>
</ul>
<p>Parent: <strong>Opportunity</strong> overview. Related: <strong>Opportunity &mdash; Lifecycle and approvals</strong>.</p>
${footer('Regenerate: npm script <code>confluence:sync:tm-sf-kb-opportunity -- --apply-updates</code>')}
`.trim(),
      },
      {
        title: 'Opportunity — Lifecycle and approvals',
        body: () =>
          `
<h2>Purpose</h2>
<p><strong>Stages</strong>, disqualification, contracting / go-live, approvals and tasks, readiness / MOU themes.</p>
<p><strong>KB marker:</strong> <code>opportunity-lifecycle-v2</code></p>
<h2>New Business lifecycle (SF-761)</h2>
<ul>
  <li>Stages: <strong>Pipeline</strong> &rarr; <strong>Due Diligence</strong> &rarr; <strong>Contracting</strong> &rarr; <strong>Go-Live</strong> &rarr; <strong>Live</strong> (terminology may be validated/renamed in UI scenarios).</li>
  <li><strong>Unqualified</strong> allowed from Pipeline, Due Diligence, or Contracting only.</li>
  <li>Progression depends on <strong>approvals</strong> and required <strong>task</strong> confirmations.</li>
  <li>Account status broadly aligns with Opportunity stage (see SF-761 header comments).</li>
</ul>
<h2>Contracting and readiness</h2>
<ul>
  <li><a href="${JIRA_BROWSE}/SF-723">SF-723</a>: moving to <strong>Contracting</strong> stage.</li>
  <li>Readiness / MOU / summary: follow <a href="${JIRA_BROWSE}/SF-920">SF-920</a>, <a href="${JIRA_BROWSE}/SF-874">SF-874</a>, <a href="${JIRA_BROWSE}/SF-875">SF-875</a> in repo for field and approval behaviour.</li>
</ul>
<h2>Product Map at Live (SF-977)</h2>
<p>When Opportunity (Expansion) reaches <strong>Live</strong>, Product Maps in <strong>Active Pending Go-Live</strong> transition to <strong>Active</strong>; history recorded on <code>Product_Map__History</code> &mdash; see SF-977 API scenarios.</p>
<h2>Related automation</h2>
<ul>
  <li><code>src/features/ui/SF/SF-761.feature</code>, <code>src/features/api/SF/SF-761.feature</code></li>
  <li><code>src/features/ui/SF/SF-723.feature</code>, <code>src/features/api/SF/SF-723.feature</code></li>
  <li><code>src/features/api/SF/SF-977.feature</code></li>
</ul>
<p>Parent: <strong>Opportunity</strong> overview. Related: <strong>Opportunity &mdash; Create</strong>.</p>
${footer('Regenerate: npm script <code>confluence:sync:tm-sf-kb-opportunity -- --apply-updates</code>')}
`.trim(),
      },
    ],
  },
};

function automationTwoLayers(
  label: string,
  folder: string,
  tagUi: string,
  tagApi: string
): string {
  return `
<h2>Automation (two layers)</h2>
<ul>
  <li><strong>Layer A:</strong> Per Jira user story — Zephyr + SF-* features (audit).</li>
  <li><strong>Layer B:</strong> TM KB journeys — repo <code>src/features/kb/sf/${folder}/</code>, tags e.g. <code>${tagUi}</code> / <code>${tagApi}</code>, Zephyr folder <strong>TM KB / Salesforce</strong>, cycles e.g. <strong>KB-SF-QA</strong>.</li>
</ul>
`.trim();
}

function conflictsBlock(): string {
  return `
<h2>Requirement conflicts</h2>
<p>If stories disagree, prefer the <strong>higher SF-* number</strong>; tie-break with Jira <strong>created</strong> date. Log drift under TM &rarr; <strong>Drift log</strong>.</p>
`.trim();
}

function parseCapabilityArg(): string {
  const idx = process.argv.indexOf('--capability');
  if (idx >= 0 && process.argv[idx + 1]) {
    return process.argv[idx + 1].trim().toLowerCase();
  }
  return '';
}

async function ensurePage(
  client: ConfluenceClient,
  ancestorId: string,
  spec: PageSpec,
  options: { missingOnly: boolean; applyUpdates: boolean; capabilityKey: string }
): Promise<string | null> {
  const existing = await client.findChildPageByTitleCaseInsensitive(ancestorId, spec.title);
  const base = client.getBaseUrl();
  const verMsg = `TM Salesforce KB — ${options.capabilityKey} sync (automation)`;

  if (existing) {
    if (options.missingOnly) {
      console.log(`   ℹ️  Already exists (skip): ${spec.title} (${existing.id})`);
      return existing.id;
    }
    if (!options.applyUpdates) {
      const ok = await askYn(
        `OVERWRITE body of "${spec.title}" (id ${existing.id})? Manual edits will be replaced in current version (history kept).`
      );
      if (!ok) {
        console.log(`   ⏭️  Skipped update: ${spec.title}`);
        return existing.id;
      }
    } else {
      console.log(`   🔄 Apply-updates: overwriting "${spec.title}" (${existing.id})`);
    }

    const full = await client.getPage(existing.id, { expand: 'version' });
    if (!full) {
      console.error(`   ❌ Could not load version for ${existing.id}`);
      return existing.id;
    }
    await client.updatePageContent(existing.id, spec.bodyStorage, full.version.number + 1, {
      title: spec.title,
      message: verMsg,
    });
    const webui = (existing as { _links?: { webui?: string } })._links?.webui;
    const urlSuffix = webui ? `${base}${webui}` : `${base}/pages/${existing.id}`;
    console.log(`   ✅ Updated: ${spec.title} (${existing.id}) ${urlSuffix}`);
    return existing.id;
  }

  if (options.missingOnly || options.applyUpdates) {
    console.log(
      `   ➕ Creating ${options.applyUpdates && !options.missingOnly ? '(apply-updates) ' : ''}page: ${spec.title}`
    );
    const created = await client.createPageWithBody(ancestorId, spec.title, spec.bodyStorage);
    console.log(`   ✅ Created: ${spec.title} (${created.id}) ${base}${created._links?.webui || ''}`);
    return created.id;
  }

  const ok = await askYn(`CREATE page "${spec.title}" under parent ${ancestorId}?`);
  if (!ok) {
    console.log(`   ⏭️  Skipped create: ${spec.title}`);
    return null;
  }
  const created = await client.createPageWithBody(ancestorId, spec.title, spec.bodyStorage);
  console.log(`   ✅ Created: ${spec.title} (${created.id}) ${base}${created._links?.webui || ''}`);
  return created.id;
}

async function main(): Promise<void> {
  const missingOnly = process.argv.includes('--missing-only');
  const applyUpdates = process.argv.includes('--apply-updates');
  const capabilityKey = parseCapabilityArg();

  if (!capabilityKey || !CAPABILITIES[capabilityKey]) {
    const keys = Object.keys(CAPABILITIES).join(', ');
    console.error(`❌ Provide --capability <name>. Supported: ${keys}`);
    process.exit(1);
  }

  if (missingOnly && applyUpdates) {
    console.error('❌ Use only one of --missing-only or --apply-updates.');
    process.exit(1);
  }

  if (!process.stdin.isTTY && !missingOnly && !applyUpdates) {
    console.error('❌ Interactive mode requires a TTY.');
    console.error('   Use --missing-only (create missing only) or --apply-updates (push all template bodies, no prompts).');
    process.exit(1);
  }

  loadEnv();
  const { ConfluenceClient } = await import('../../src/integrations/confluence/client');

  const salesforceParentId =
    process.env.CONFLUENCE_TM_SALESFORCE_KNOWLEDGE_PAGE_ID || '3146645519';

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY,
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });

  if (!client.isConfigured()) {
    console.error('❌ Confluence not configured (ATLASSIAN_* or JIRA_* in .env.qa).');
    process.exit(1);
  }

  const parent = await client.getPage(salesforceParentId, { expand: 'version' });
  if (!parent) {
    console.error(`❌ Salesforce KB parent page not found: ${salesforceParentId}`);
    process.exit(1);
  }

  const def = CAPABILITIES[capabilityKey];
  console.log(`📄 Salesforce core functions parent: ${parent.title} (${salesforceParentId})`);
  console.log(`📌 Capability: ${capabilityKey} (${def.overviewTitle})\n`);

  const overviewId = await ensurePage(
    client,
    salesforceParentId,
    {
      title: def.overviewTitle,
      bodyStorage: def.overviewBody(),
    },
    { missingOnly, applyUpdates, capabilityKey }
  );

  if (!overviewId) {
    console.log(`\n⚠️  Overview "${def.overviewTitle}" not available — skipping child pages.`);
    process.exit(0);
  }

  for (const ch of def.children) {
    await ensurePage(
      client,
      overviewId,
      {
        title: ch.title,
        bodyStorage: ch.body(),
      },
      { missingOnly, applyUpdates, capabilityKey }
    );
  }

  console.log(`\n✅ Done. Open parent: ${client.getBaseUrl()}/spaces/${process.env.CONFLUENCE_SPACE_KEY || 'TM'}/pages/${salesforceParentId}`);
}

main().catch((e: any) => {
  console.error('❌', e.message);
  if (e.response?.data) {
    console.error(typeof e.response.data === 'string' ? e.response.data : JSON.stringify(e.response.data, null, 2));
  }
  process.exit(1);
});
