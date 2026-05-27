/**
 * Enrich Lloyd's plan CSV rows (Engineering + Power platform) with live Jira fields
 * using the framework JiraClient. Writes a markdown testing-strategy appendix.
 *
 * Prerequisites: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN in src/config/env/.env.<ENV>
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/lloyds-jira-testing-strategy-sync.ts
 *   ENV=qa npx ts-node scripts/lloyds-jira-testing-strategy-sync.ts --csv data/excel/plans_lloyds_deliverables_18032026.csv
 *   ENV=qa npx ts-node scripts/lloyds-jira-testing-strategy-sync.ts --dry-run   # CSV summary only, no Jira calls
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import type { LloydsWorkItem } from './read-lloyds-deliverables-csv';

const DEFAULT_CSV = path.join(process.cwd(), 'data', 'excel', 'plans_lloyds_deliverables_18032026.csv');
const DEFAULT_OUT = path.join(process.cwd(), 'docs', 'lloyds', 'LLOYDS_JIRA_TESTING_STRATEGY_SYNC.md');

const env = process.env.ENV || 'qa';
const envPaths = [
  path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`),
  path.resolve(process.cwd(), `.env.${env}`),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

const JQL_CHUNK = 45;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let csvPath = DEFAULT_CSV;
  let outPath = DEFAULT_OUT;
  let dryRun = args.includes('--dry-run');
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--csv' || args[i] === '-c') && args[i + 1]) csvPath = path.resolve(process.cwd(), args[++i]);
    if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) outPath = path.resolve(process.cwd(), args[++i]);
  }

  const { readLloydsDeliverablesCsv, filterLloydsByAutomationScope } = await import(
    './read-lloyds-deliverables-csv'
  );

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  let items = filterLloydsByAutomationScope(readLloydsDeliverablesCsv(csvPath));
  items = items.filter((i) => i.workItemKey && /^[A-Z][A-Z0-9]+-\d+$/i.test(i.workItemKey.trim()));

  const keys = [...new Set(items.map((i) => i.workItemKey.trim().toUpperCase()))].sort();
  console.log(`Automation scope rows: ${items.length} (${keys.length} unique keys)`);

  type JiraRow = {
    key: string;
    csvSpace: string;
    csvTitle: string;
    csvStatus: string;
    csvHierarchy: string;
    parentTitle: string;
    jiraSummary?: string;
    jiraStatus?: string;
    jiraType?: string;
    jiraError?: string;
  };

  const byKey = new Map<string, LloydsWorkItem>();
  for (const it of items) {
    const k = it.workItemKey.trim().toUpperCase();
    if (!byKey.has(k)) byKey.set(k, it);
  }

  let jiraByKey = new Map<string, { summary: string; status: string; issuetype: string }>();

  if (!dryRun) {
    const { JiraClient } = await import('../src/integrations/jira/client');
    const jira = new JiraClient();

    for (const part of chunk(keys, JQL_CHUNK)) {
      const jql = `key in (${part.join(', ')}) ORDER BY key`;
      try {
        const { issues } = await jira.searchIssues(jql, 0, part.length);
        for (const iss of issues) {
          jiraByKey.set(iss.key.toUpperCase(), {
            summary: iss.fields?.summary ?? '',
            status: iss.fields?.status?.name ?? '',
            issuetype: iss.fields?.issuetype?.name ?? '',
          });
        }
      } catch (e: any) {
        console.error(`Jira batch failed: ${e.message}`);
        throw e;
      }
    }
    console.log(`Jira returned ${jiraByKey.size} issues`);
  }

  const rows: JiraRow[] = keys.map((key) => {
    const csv = byKey.get(key)!;
    const j = jiraByKey.get(key);
    return {
      key,
      csvSpace: csv.space,
      csvTitle: csv.title,
      csvStatus: csv.status,
      csvHierarchy: csv.hierarchy,
      parentTitle: csv.parentTitle,
      jiraSummary: j?.summary,
      jiraStatus: j?.status,
      jiraType: j?.issuetype,
      jiraError: !dryRun && !j ? 'Not returned by Jira (permission or deleted?)' : undefined,
    };
  });

  const generated = new Date().toISOString();
  const lines: string[] = [
    `# Lloyd's plan × Jira sync (Engineering & Power platform)`,
    ``,
    `> **Generated:** ${generated}  `,
    `> **Source CSV:** \`${path.relative(process.cwd(), csvPath).replace(/\\/g, '/')}\`  `,
    `> **Scope:** \`Space\` ∈ { **Engineering**, **Power platform** } — excludes Accelerant Platform (BDX, Tagetik, UAT delivery epics in this export).  `,
    `> **Regenerate:** \`ENV=${env} npx ts-node scripts/lloyds-jira-testing-strategy-sync.ts\`  `,
    ``,
    `## Summary`,
    ``,
    `- Rows in scope: **${items.length}**`,
    `- Unique keys: **${keys.length}**`,
    dryRun ? `- **Dry run:** no Jira API calls.` : `- Jira issues resolved: **${jiraByKey.size}** / ${keys.length}`,
    ``,
    `## Work items (CSV + Jira)`,
    ``,
    `| Key | Space | Type (CSV) | Status (plan export) | Status (Jira) | Jira type | Summary (Jira) |`,
    `|-----|-------|------------|----------------------|---------------|-----------|----------------|`,
  ];

  for (const r of rows) {
    const sum = (r.jiraSummary ?? r.csvTitle).replace(/\|/g, '\\|').slice(0, 120);
    const statusCol = dryRun ? '—' : r.jiraStatus || (r.jiraError ? `⚠ ${r.jiraError}` : '—');
    lines.push(
      `| ${r.key} | ${r.csvSpace.replace(/\|/g, '\\|')} | ${r.csvHierarchy} | ${r.csvStatus} | ${statusCol} | ${(r.jiraType ?? '—').replace(/\|/g, '\\|')} | ${sum} |`
    );
  }

  lines.push(
    ``,
    `## Testing strategy notes`,
    ``,
    `- **Engineering:** MuleSoft ↔ D365 F&O happy path and error epics, ODS/TDS — align API/DB scenarios with \`ENG-*\` keys above.`,
    `- **Power platform:** CMT/RDM, D365 journal feedback epics — align Dynamics + UI/API tests with \`PP-*\` keys.`,
    `- **Out of plan scope here:** Accelerant \`AC-*\` items (including Tagetik and BDX-for-UAT tracks) — track separately if needed.`,
    `- Parent programme doc: \`docs/lloyds/LLOYDS_TEST_STRATEGY_ENGINEERING_POWERPLATFORM.md\`.`,
    ``
  );

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
