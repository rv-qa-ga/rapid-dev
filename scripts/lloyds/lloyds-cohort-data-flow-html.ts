#!/usr/bin/env ts-node
/**
 * **Cohort data-flow HTML** — one section per cloned repository with:
 * ADP summary key amounts vs Dataverse ODS / XML vs F&O OData status vs TDS row presence,
 * and per-axis **R/Y/G** (red if magnitude gap > tolerance) using the same **±ABS** rule
 * as Cucumber (magnitude compare; sign ignored).
 *
 *   npm run lloyds:cohort-data-flow-html
 *   ts-node scripts/lloyds/lloyds-cohort-data-flow-html.ts --repos US-56464,US-57244
 *   ts-node scripts/lloyds/lloyds-cohort-data-flow-html.ts --tolerance 5
 */

import * as fs from 'fs';
import * as path from 'path';
import { LLOYDS_CLONED_REPOSITORY_IDS } from '../../src/integrations/lloyds/lloydsClonedRepoCohort';
import { buildLloydsRepoDataSnapshot } from '../../src/integrations/lloyds/lloydsRepoDataSnapshot';
import {
  buildAmountFieldFlow,
  LLOYDS_DEFAULT_TOTAL_TOLERANCE,
} from '../../src/integrations/lloyds/lloydsAmountCompare';

function h(s: unknown): string {
  if (s === null || s === undefined) return '—';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellClass(ok: boolean | 'na'): string {
  if (ok === 'na') return 'na';
  return ok ? 'ok' : 'fail';
}

function parseArgs(argv: string[]): { repos: string[]; out: string; tolerance: number } {
  const defRepos = [...LLOYDS_CLONED_REPOSITORY_IDS];
  let out = path.resolve(
    process.cwd(),
    `reports/html/lloyds-cohort-data-flow-${new Date().toISOString().replace(/[:.]/g, '-')}.html`,
  );
  let tolerance = LLOYDS_DEFAULT_TOTAL_TOLERANCE;
  let repos: string[] = defRepos;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out' && argv[i + 1]) out = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--out=')) out = path.resolve(process.cwd(), a.slice('--out='.length));
    else if (a === '--tolerance' && argv[i + 1]) tolerance = Math.abs(Number(argv[++i]) || 5);
    else if (a === '--repos' && argv[i + 1]) {
      repos = argv[++i]
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    }
  }
  return { repos, out, tolerance };
}

function renderRepoSection(repo: string, snap: Record<string, unknown>, tolerance: number): string {
  const adpS = snap.adpSnowflake as { ok: boolean; data?: Record<string, unknown>; error?: string } | undefined;
  const dvS = snap.dataverseXmlFile as { ok: boolean; data?: Record<string, unknown>; error?: string } | undefined;
  const fno = snap.dynamicsFnoOdata as { ok: boolean; data?: { status: number; url: string }; error?: string } | undefined;
  const tds = snap.tdsTagetikWritten as { ok: boolean; data?: { rowCount: number }; error?: string } | undefined;
  const mule = snap.muleProcessTracker as { ok: boolean; error?: string } | undefined;
  const blob = snap.azureBlob as { ok: boolean; error?: string } | undefined;

  const adpData = adpS?.ok ? adpS.data ?? null : null;
  let ods: Record<string, number | null> = {};
  let xml: Record<string, number | null> = {};
  if (dvS?.ok && dvS.data) {
    const d = dvS.data;
    ods = { prm: d.odsPrm as number, com: d.odsCom, coi: d.odsCoi, tax: d.odsTax, oth: d.odsOth };
    xml = { prm: d.xmlPrm, com: d.xmlCom, coi: d.xmlCoi, tax: d.xmlTax, oth: d.xmlOth };
  }

  const flow = buildAmountFieldFlow(
    adpData,
    ods.prm,
    ods.com,
    ods.coi,
    ods.tax,
    ods.oth,
    xml.prm,
    xml.com,
    xml.coi,
    xml.tax,
    xml.oth,
    null,
    tolerance,
  );

  const sectionBad =
    (adpS && !adpS.ok) ||
    (dvS && !dvS.ok) ||
    flow.some((f) => !f.adpVsXmlMagOk || !f.adpVsOdsMagOk || !f.odsVsXmlMagOk) ||
    (fno?.ok && fno.data && fno.data.status >= 400);

  const fnoLine =
    fno?.ok && fno.data
      ? `${fno.data.status} <code>${h(fno.data.url)}</code>`
      : h(fno?.error || 'n/a');
  const tdsLine = tds?.ok
    ? `${tds.data?.rowCount ?? 0} row(s) (sample in JSON snapshot)`
    : h(tds?.error);

  const rows = flow
    .map((f) => {
      return `<tr>
  <td><strong>${h(f.field)}</strong></td>
  <td>${h(f.adp)}</td>
  <td>${h(f.ods)}</td>
  <td>${h(f.xml)}</td>
  <td class="${cellClass(f.adpVsOdsMagOk)}">${f.adpVsOdsMagOk ? 'G' : 'R'}</td>
  <td class="${cellClass(f.adpVsXmlMagOk)}">${f.adpVsXmlMagOk ? 'G' : 'R'}</td>
  <td class="${cellClass(f.odsVsXmlMagOk)}">${f.odsVsXmlMagOk ? 'G' : 'R'}</td>
</tr>`;
    })
    .join('\n');

  return `
<section class="repo ${sectionBad ? 'repo-bad' : 'repo-good'}">
  <h2 id="${h(repo)}">Repository <code>${h(repo)}</code> ${sectionBad ? '— issues' : '— OK (amounts)'}</h2>
  <p class="meta">Run id: <code>${h(adpData?._ACCEL_UNIQUE_RUN_ID)}</code> ·
    PROCESS_TRACKER: ${mule?.ok ? 'row present' : h(mule?.error)} ·
    Blob: ${blob?.ok ? 'OK' : h(blob?.error)} ·
    TDS: ${tdsLine}
  </p>
  <p><strong>Dynamics F&amp;O OData (probe):</strong> ${fnoLine}</p>
  <table class="flow">
    <thead>
      <tr>
        <th>Axis</th>
        <th>ADP (Snowflake)</th>
        <th>Dataverse ODS</th>
        <th>Dataverse XML</th>
        <th>ADP↔ODS (|Δ|≤${tolerance})</th>
        <th>ADP↔XML (|Δ|≤${tolerance})</th>
        <th>ODS↔XML (|Δ|≤${tolerance})</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <p class="note">Monetary compare uses <strong>magnitudes</strong> (sign ignored), same as Lloyd's Cucumber. Currency must still match when both sides are set. Tagetik TDS line-level amounts are not auto-mapped to PRM/COM/… in this table — use the JSON report for raw TDS rows.</p>
</section>
`;
}

async function main(): Promise<void> {
  const { repos, out, tolerance } = parseArgs(process.argv.slice(2));
  const sections: string[] = [];
  for (const repo of repos) {
    process.stdout.write(`… ${repo} `);
    const snap = await buildLloydsRepoDataSnapshot(repo);
    sections.push(renderRepoSection(repo, snap, tolerance));
    process.stdout.write('ok\n');
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Lloyd's cohort data flow — ${h(new Date().toISOString())}</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.4rem; }
    .ok { color: #0b6e4f; font-weight: 700; }
    .fail, .bad { color: #b00020; font-weight: 700; }
    .na { color: #666; }
    table.flow { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 0.9rem; }
    table.flow th, table.flow td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
    table.flow th:first-child, table.flow td:first-child { text-align: left; }
    section.repo { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid #ddd; }
    section.repo-bad { background: #fff5f5; }
    .meta, .note { font-size: 0.85rem; color: #444; }
    code { background: #f3f3f3; padding: 0 4px; }
  </style>
</head>
<body>
  <h1>Lloyd's — data flow report (per repository)</h1>
  <p>Generated <strong>${h(new Date().toISOString())}</strong> · tolerance <strong>±${tolerance}</strong> on absolute magnitudes (sign ignored) · repositories: <strong>${h(repos.join(', '))}</strong></p>
  <p>Sources: same snapshot as <code>npm run lloyds:repo-data-report</code> (ADP latest summary, Dataverse latest XML File, F&amp;O OData head probe, TDS row count).</p>
  ${sections.join('\n')}
</body>
</html>`;

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf-8');
  const latest = path.resolve(process.cwd(), 'reports/html/lloyds-cohort-data-flow-latest.html');
  fs.writeFileSync(latest, html, 'utf-8');
  console.log(`\n✅ Wrote ${out}`);
  console.log(`✅ Latest: ${latest}\n`);
}

main().catch((e) => {
  console.error((e as Error).stack || (e as Error).message);
  process.exit(1);
});
