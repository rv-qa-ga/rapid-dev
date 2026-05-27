#!/usr/bin/env ts-node

/**
 * Create or update the TM "Knowledge Base — Test & integration automation" hub and 13 child pages.
 *
 * Confluence credentials: load from **.env.qa** (see paths below). Set ATLASSIAN_EMAIL +
 * ATLASSIAN_API_TOKEN (or JIRA_EMAIL / JIRA_API_TOKEN) there with CONFLUENCE_* as needed.
 *
 * Parent page (default): https://accelins.atlassian.net/wiki/spaces/TM/pages/1961787450
 * Override: CONFLUENCE_KNOWLEDGE_BASE_PARENT_ID
 *
 * Behavior (agreed plan):
 * - Parent: set title and **replace entire body** with hub template.
 * - Each child: create if missing; if found by exact title under parent, **update title + body** (canonical template).
 *
 * Usage:
 *   npx ts-node scripts/setup/create-knowledge-base-subpages.ts --dry-run
 *   npx ts-node scripts/setup/create-knowledge-base-subpages.ts
 *   npm run confluence:setup:knowledge-base
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

/** Prefer QA secrets for Confluence (do not commit real tokens). */
const ENV_QA_PATHS = [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
];

const ENV_FALLBACK = path.resolve(__dirname, '../../.env');

function loadEnv(): void {
  let loaded = false;
  for (const envPath of ENV_QA_PATHS) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      console.log(`📁 Loaded Confluence secrets from: ${path.relative(process.cwd(), envPath)}\n`);
      loaded = true;
      break;
    }
  }
  if (!loaded && fs.existsSync(ENV_FALLBACK)) {
    dotenv.config({ path: ENV_FALLBACK, override: true });
    console.warn(
      `⚠️  No .env.qa found; loaded ${path.relative(process.cwd(), ENV_FALLBACK)}. Use src/config/env/.env.qa for Confluence.\n`
    );
  } else if (!loaded) {
    console.error(
      '❌ No env file found. Create src/config/env/.env.qa (or .env.qa at repo root) with ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN.'
    );
    process.exit(1);
  }
}

const DEFAULT_PARENT_PAGE_ID = '1961787450';
const PARENT_TITLE = 'Knowledge Base — Test & integration automation';

const CHILD_PAGES: Array<{ title: string; purposeLine: string }> = [
  {
    title: 'Automation ↔ requirements index',
    purposeLine: 'Maps Jira/Zephyr tags, feature paths, and work items to business flows (living index).',
  },
  {
    title: 'Salesforce core functions',
    purposeLine: 'Lead flow, account creation, status changes, and SF-side rules exercised by automation.',
  },
  {
    title: 'ADP + Snowflake',
    purposeLine: 'Payroll / ADP flows, sync to Snowflake, and downstream consumers.',
  },
  {
    title: 'Dynamics CRM',
    purposeLine: 'Dataverse / CRM: contact sync, lead conversion, and CRM-side validation points.',
  },
  {
    title: 'Dynamics F&O',
    purposeLine: 'Financial processing, ledger/transactions, and F&O integration touchpoints.',
  },
  {
    title: 'SQL Server (ODS / TDS)',
    purposeLine: 'ODS/TDS pipelines, SSIS jobs, stored procedures, and SQL validations in tests.',
  },
  {
    title: 'Tagetik',
    purposeLine: 'Financial reporting flows and aggregation as covered by integration tests.',
  },
  {
    title: 'Duck Creek (DCR)',
    purposeLine: 'Policy lifecycle, bordereaux, and DCR-related automation scope.',
  },
  {
    title: 'MuleSoft',
    purposeLine: 'API-led integrations and system-to-system orchestration.',
  },
  {
    title: 'Azure Service Bus',
    purposeLine: 'Queues, topics, and event-driven flows validated in test suites.',
  },
  {
    title: 'Microsoft Fabric',
    purposeLine: 'Data ingestion and transformation pipelines in scope for test coverage.',
  },
  {
    title: 'Drift log',
    purposeLine: 'Requirement drift: Jira ticket, systems impacted, old vs new requirement, test impact.',
  },
  {
    title: 'Test coverage map',
    purposeLine: 'Business flows → feature files/scenarios; gaps and owners.',
  },
];

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function childStubBody(purposeLine: string): string {
  return `
<h2>Purpose</h2>
<p>${escapeXml(purposeLine)}</p>
<h2>Upstream systems</h2>
<p><em>TBD — list systems and data sources.</em></p>
<h2>Downstream systems</h2>
<p><em>TBD — list consumers and hand-offs.</em></p>
<h2>Key business rules</h2>
<p><em>TBD — link to Jira/approved specs.</em></p>
<h2>Data contracts</h2>
<p><em>TBD — schemas, keys, SLAs.</em></p>
<h2>APIs / events</h2>
<p><em>TBD — endpoints, topics, platform events.</em></p>
<h2>Change history</h2>
<table>
  <tr><th>Date</th><th>Change</th><th>Owner</th></tr>
  <tr><td><em>TBD</em></td><td>Initial stub from automation hub script</td><td><em>TBD</em></td></tr>
</table>
`.trim();
}

function parentHubBody(): string {
  return `
<h1>${escapeXml(PARENT_TITLE)}</h1>
<p>This page is the <strong>central hub</strong> for test and integration automation knowledge: business flows across systems, traceability to Jira/Zephyr, and coverage gaps. Sub-pages are maintained by QA/engineering; major changes should be reflected in the <strong>Drift log</strong> child page.</p>
<h2>How to use</h2>
<ul>
  <li>Start from <strong>Automation ↔ requirements index</strong> for tags, paths, and work-item mapping.</li>
  <li>Record requirement changes in <strong>Drift log</strong> before large test updates.</li>
  <li>Maintain <strong>Test coverage map</strong> as features are added or retired.</li>
</ul>
<h2>Sub-pages</h2>
<ac:structured-macro ac:name="children" ac:schema-version="2">
  <ac:parameter ac:name="all">true</ac:parameter>
  <ac:parameter ac:name="sort">title</ac:parameter>
</ac:structured-macro>
<hr/>
<p><small>Hub template applied by repo script <code>scripts/setup/create-knowledge-base-subpages.ts</code> (Confluence REST API). Previous page versions remain in Confluence history.</small></p>
`.trim();
}

async function main(): Promise<void> {
  loadEnv();

  // Load after .env.qa so `confluence/client` singleton (if any) and this instance see credentials.
  const { ConfluenceClient } = await import('../../src/integrations/confluence/client');

  const dryRun = process.argv.includes('--dry-run');
  const parentPageId = process.env.CONFLUENCE_KNOWLEDGE_BASE_PARENT_ID || DEFAULT_PARENT_PAGE_ID;

  const client = new ConfluenceClient({
    baseUrl: process.env.CONFLUENCE_BASE_URL,
    spaceKey: process.env.CONFLUENCE_SPACE_KEY,
    email: process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL,
    apiToken: process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN,
  });

  if (!client.isConfigured()) {
    console.error('❌ Confluence not configured. Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN in .env.qa');
    process.exit(1);
  }

  const base = client.getBaseUrl();

  if (dryRun) {
    console.log('🔍 DRY RUN — no API writes.\n');
    console.log(`Parent page ID: ${parentPageId}`);
    console.log(`Parent title: ${PARENT_TITLE}`);
    console.log(`Space: ${process.env.CONFLUENCE_SPACE_KEY || 'TM'}`);
    console.log(`Would replace parent body and upsert ${CHILD_PAGES.length} child pages.\n`);
    CHILD_PAGES.forEach((c, i) => console.log(`  ${i + 1}. ${c.title}`));
    process.exit(0);
  }

  const parent = await client.getPage(parentPageId, { expand: 'version,body.storage' });
  if (!parent) {
    console.error(`❌ Parent page ${parentPageId} not found or not accessible.`);
    process.exit(1);
  }

  console.log(`📄 Updating parent: ${parent.title} (${parentPageId})`);
  await client.updatePageContent(parentPageId, parentHubBody(), parent.version.number + 1, {
    title: PARENT_TITLE,
    message: 'Knowledge hub: replace body + title (automation script)',
  });
  console.log(`   ✅ Parent updated: ${base}/spaces/TM/pages/${parentPageId}\n`);

  for (const { title, purposeLine } of CHILD_PAGES) {
    const existing = await client.findChildPageByTitle(parentPageId, title);
    const body = childStubBody(purposeLine);
    if (existing) {
      const full = await client.getPage(existing.id, { expand: 'version' });
      if (!full) continue;
      await client.updatePageContent(existing.id, body, full.version.number + 1, {
        title,
        message: 'Knowledge hub child: refresh stub (automation script)',
      });
      console.log(`   ✅ Updated child: ${title} (${existing.id})`);
    } else {
      const created = await client.createPageWithBody(parentPageId, title, body);
      console.log(`   ✅ Created child: ${title} (${created.id})`);
    }
  }

  console.log(`\n✅ Done. Open: ${base}/spaces/TM/pages/${parentPageId}`);
}

main().catch((err) => {
  console.error('❌', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
