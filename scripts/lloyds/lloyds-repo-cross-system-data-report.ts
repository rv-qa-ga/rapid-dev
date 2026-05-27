#!/usr/bin/env ts-node
/**
 * Read-only **cross-system data snapshot** for one Lloyd's repository id:
 * ADP (Snowflake summary + optional Tagetik slice) → Mule state (**Azure SQL `PROCESS_TRACKER`**)
 * → **Azure Blob** (`mulesoft-xml`) → **Dataverse** (`accelins_workflow`) → **Dynamics F&O OData** (opt-in)
 * → **TDS** `tagetik.TagetikWrittenforDataLoaderADP` (opt-in `SQL_LLOYDS_SERVER`).
 *
 * Same Entra / SSO patterns as Lloyd's Cucumber (`DefaultAzureCredential` + SPN where configured).
 *
 * Usage:
 *   npm run lloyds:repo-data-report
 *   cross-env ENV=qa ts-node scripts/lloyds/lloyds-repo-cross-system-data-report.ts --repo US-60464
 *   ts-node scripts/lloyds/lloyds-repo-cross-system-data-report.ts --repo US-60464 --json-out reports/lloyds-US-60464-snapshot.json --md-out reports/lloyds-US-60464-snapshot.md
 */

import * as fs from 'fs';
import * as path from 'path';

import { config } from '../../src/config/config';
import { buildLloydsRepoDataSnapshot } from '../../src/integrations/lloyds/lloydsRepoDataSnapshot';

type Section<T> = { ok: true; data: T } | { ok: false; error: string };

function parseArgs(argv: string[]): { repo: string; jsonOut: string; mdOut: string } {
  let repo = 'US-60464';
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  let jsonOut = path.resolve(process.cwd(), `reports/lloyds-repo-${repo}-snapshot-${ts}.json`);
  let mdOut = path.resolve(process.cwd(), `reports/lloyds-repo-${repo}-snapshot-${ts}.md`);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--repo' || a === '-r') && argv[i + 1]) repo = argv[++i];
    else if (a.startsWith('--repo=')) repo = a.slice('--repo='.length);
    else if ((a === '--json-out' || a === '-j') && argv[i + 1]) jsonOut = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--json-out=')) jsonOut = path.resolve(process.cwd(), a.slice('--json-out='.length));
    else if ((a === '--md-out' || a === '-m') && argv[i + 1]) mdOut = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--md-out=')) mdOut = path.resolve(process.cwd(), a.slice('--md-out='.length));
  }
  return { repo, jsonOut, mdOut };
}

function mdEscape(s: unknown): string {
  if (s === null || s === undefined) return '—';
  return String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function rowsToMdTable(rows: Record<string, unknown>[], maxCols = 12): string {
  if (!rows.length) return '_No rows._\n';
  const keys = Object.keys(rows[0]).slice(0, maxCols);
  const head = `| ${keys.map(mdEscape).join(' | ')} |`;
  const sep = `| ${keys.map(() => '---').join(' | ')} |`;
  const body = rows
    .map((r) => `| ${keys.map((k) => mdEscape(r[k])).join(' | ')} |`)
    .join('\n');
  return `${head}\n${sep}\n${body}\n`;
}

function buildMarkdown(repo: string, report: Record<string, unknown>): string {
  const lines: string[] = [];
  lines.push(`# Lloyd's cross-system data snapshot — **${repo}**`);
  lines.push('');
  lines.push(`- **Generated:** ${String(report.generatedAt || new Date().toISOString())}`);
  lines.push(`- **Environment:** ${config.getEnvironment()}`);
  lines.push('');
  lines.push('Pipeline order in this report: **ADP (Snowflake)** → **Mule (Azure SQL tracker)** → **Azure Blob** → **Dataverse** → **Dynamics F&O OData** → **TDS Tagetik table**.');
  lines.push('');

  const adp = report.adpSnowflake as Section<unknown>;
  lines.push('## 1. ADP — Snowflake (`FOWD__AGENCY_POLICY_FO_SUMMARY_V1`)');
  if (adp && typeof adp === 'object' && 'ok' in adp && adp.ok) {
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify((adp as { data: unknown }).data, null, 2));
    lines.push('```');
  } else {
    lines.push(`_Error: ${mdEscape((adp as { error?: string })?.error)}_`);
  }
  lines.push('');

  const snfTgt = report.snowflakeTagetikSlice as Section<unknown>;
  lines.push('## 1b. ADP warehouse — Snowflake Tagetik slice (`FOWT__TAGETIK_V1`, same run id)');
  if (snfTgt && typeof snfTgt === 'object' && 'ok' in snfTgt && snfTgt.ok) {
    const d = (snfTgt as { data: { rowCount: number; sample: Record<string, unknown>[] } }).data;
    lines.push(`Row count (limited query): **${d.rowCount}**`);
    if (d.sample.length) lines.push(rowsToMdTable(d.sample, 10));
    else lines.push('_No slice rows for this repo + run (downstream may not have posted yet)._');
  } else {
    lines.push(`_Skipped or error: ${mdEscape((snfTgt as { error?: string })?.error)}_`);
  }
  lines.push('');

  const mule = report.muleProcessTracker as Section<unknown>;
  lines.push('## 2. MuleSoft — control plane (**Azure SQL** `dbo.PROCESS_TRACKER`)');
  lines.push('_Mule runtime APIs are not queried here; tracker + ERROR_LOG are the programme control store on Azure SQL._');
  if (mule && typeof mule === 'object' && 'ok' in mule && mule.ok) {
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify((mule as { data: unknown }).data, null, 2));
    lines.push('```');
  } else {
    lines.push(`_Skipped or error: ${mdEscape((mule as { error?: string })?.error)}_`);
  }
  lines.push('');

  const blob = report.azureBlob as Section<unknown>;
  lines.push('## 3. Azure Blob — `mulesoft-xml` (journal XML artefact)');
  if (blob && typeof blob === 'object' && 'ok' in blob && blob.ok) {
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify((blob as { data: unknown }).data, null, 2));
    lines.push('```');
  } else {
    lines.push(`_Skipped or error: ${mdEscape((blob as { error?: string })?.error)}_`);
  }
  lines.push('');

  const dv = report.dataverseXmlFile as Section<unknown>;
  lines.push('## 4. Dataverse — `accelins_workflow` (XML File / Operational Workflow)');
  if (dv && typeof dv === 'object' && 'ok' in dv && dv.ok) {
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify((dv as { data: unknown }).data, null, 2));
    lines.push('```');
  } else {
    lines.push(`_Error: ${mdEscape((dv as { error?: string })?.error)}_`);
  }
  lines.push('');

  const fno = report.dynamicsFnoOdata as Section<unknown>;
  lines.push('## 5. Dynamics 365 F&O — OData (read-only probe)');
  if (fno && typeof fno === 'object' && 'ok' in fno && fno.ok) {
    const d = (fno as { data: { url: string; status: number; statusText: string } }).data;
    lines.push(`- **URL:** \`${d.url}\``);
    lines.push(`- **HTTP:** ${d.status} ${d.statusText}`);
  } else {
    lines.push(`_Skipped or error: ${mdEscape((fno as { error?: string })?.error)}_`);
  }
  lines.push('');

  const tds = report.tdsTagetikWritten as Section<unknown>;
  lines.push('## 6. TDS — `tagetik.TagetikWrittenforDataLoaderADP` (**sql-dev-uks-01** / `SQL_LLOYDS_*`)');
  if (tds && typeof tds === 'object' && 'ok' in tds && tds.ok) {
    const d = (tds as { data: { rowCount: number; rows: Record<string, unknown>[] } }).data;
    lines.push(`Row count (TOP N): **${d.rowCount}**`);
    if (d.rows.length) lines.push(rowsToMdTable(d.rows, 14));
    else lines.push('_No rows for this repository (and run id if filtered)._');
  } else {
    lines.push(`_Skipped or error: ${mdEscape((tds as { error?: string })?.error)}_`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Run **`npm run lloyds:e2e-repo-report`** (same repo feature) for Cucumber step-by-step validation report.');
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const { repo, jsonOut, mdOut } = parseArgs(process.argv.slice(2));
  const report: Record<string, unknown> = await buildLloydsRepoDataSnapshot(repo);
  if (!report.repositoryId) report.repositoryId = repo;

  fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
  fs.mkdirSync(path.dirname(mdOut), { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
  const md = buildMarkdown(repo, report);
  fs.writeFileSync(mdOut, md, 'utf-8');

  const latestMd = path.resolve(process.cwd(), 'reports/lloyds-repo-latest-snapshot.md');
  const latestJson = path.resolve(process.cwd(), 'reports/lloyds-repo-latest-snapshot.json');
  fs.writeFileSync(latestMd, md, 'utf-8');
  fs.writeFileSync(latestJson, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  console.log(`\n✅ Wrote JSON: ${jsonOut}`);
  console.log(`✅ Wrote Markdown: ${mdOut}`);
  console.log(`✅ Latest copy: ${latestMd} / ${latestJson}\n`);
}

main().catch((e) => {
  console.error((e as Error).stack || (e as Error).message);
  process.exit(1);
});
