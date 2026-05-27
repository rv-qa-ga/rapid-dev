/**
 * Injects a Lloyd's Agency journal pipeline overview (pass / fail per E2E scenario group)
 * into Cucumber HTML produced by multiple-cucumber-html-reporter. The reporter escapes
 * `pageFooter`, so we post-process `index.html` and insert a block before `</body>`.
 *
 * Flow labels align with docs/lloyds/SKILL.md (ADP → Mule → XML/blob → Dataverse → F&O / Tagetik / TDS).
 */

import * as fs from 'fs';
import * as path from 'path';

export type PipelineStepStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'not_run';

export type PipelineDiagramNode = {
  id: string;
  title: string;
  subtitle: string;
  /** Scenario name must match and include repository id */
  scenarioNameMatch: RegExp;
};

/** Order matches typical programme sequence + lloyds-pipeline-e2e-readonly*.feature layout */
export const LLOYDS_E2E_PIPELINE_NODES: PipelineDiagramNode[] = [
  {
    id: 'adp-dv',
    title: 'ADP (Snowflake)',
    subtitle: '↔ Dataverse workflow totals',
    scenarioNameMatch: /Latest ADP summary totals align with Dataverse workflow/i,
  },
  {
    id: 'chain',
    title: 'Mule XML → Azure Blob → Dataverse',
    subtitle: '+ FOWD↔XML, Tagetik slice, TDS',
    scenarioNameMatch: /Cross-system read-only/i,
  },
  {
    id: 'mule-sql',
    title: 'Mule (Azure SQL)',
    subtitle: 'PROCESS_TRACKER',
    scenarioNameMatch: /Mule PROCESS_TRACKER has a row/i,
  },
  {
    id: 'dv-xml',
    title: 'Dataverse',
    subtitle: 'XML File record',
    scenarioNameMatch: /Dataverse XML File exists/i,
  },
  {
    id: 'tagetik-sf',
    title: 'Tagetik (Snowflake)',
    subtitle: 'FOWT__TAGETIK_V1 readiness',
    scenarioNameMatch: /Tagetik slice FOWT__TAGETIK_V1/i,
  },
  {
    id: 'fno-odata',
    title: 'D365 F&O',
    subtitle: 'OData read (LedgerJournalLines)',
    scenarioNameMatch: /Dynamics F&O OData read/i,
  },
];

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function elementOverallStatus(el: { steps?: { result?: { status?: string } }[] }): PipelineStepStatus {
  const steps = (el.steps || []).filter((s) => String(s?.result?.status || '').length > 0);
  if (steps.length === 0) return 'pending';
  const statuses = steps.map((s) => String(s.result?.status || '').toLowerCase());
  if (statuses.some((x) => x === 'failed')) return 'failed';
  if (statuses.every((x) => x === 'skipped')) return 'skipped';
  if (statuses.every((x) => x === 'passed' || x === 'skipped')) return 'passed';
  if (statuses.some((x) => x === 'passed')) return 'passed';
  return 'pending';
}

function flattenScenarioElements(cucumberJson: unknown): { name: string; status: PipelineStepStatus }[] {
  if (!Array.isArray(cucumberJson)) return [];
  const out: { name: string; status: PipelineStepStatus }[] = [];
  for (const feature of cucumberJson) {
    const elements = (feature as { elements?: unknown[] }).elements || [];
    for (const el of elements) {
      const type = String((el as { type?: string }).type || '');
      if (type === 'background') continue;
      const name = String((el as { name?: string }).name || '');
      out.push({ name, status: elementOverallStatus(el as { steps?: { result?: { status?: string } }[] }) });
    }
  }
  return out;
}

function resolveNodeStatuses(
  cucumberJson: unknown,
  repoId: string,
): { node: PipelineDiagramNode; status: PipelineStepStatus }[] {
  const scenarios = flattenScenarioElements(cucumberJson);
  return LLOYDS_E2E_PIPELINE_NODES.map((node) => {
    const hit = scenarios.find(
      (s) => node.scenarioNameMatch.test(s.name) && s.name.includes(repoId),
    );
    return { node, status: hit ? hit.status : 'not_run' };
  });
}

function statusColor(status: PipelineStepStatus): { border: string; bg: string; label: string } {
  switch (status) {
    case 'passed':
      return { border: '#198754', bg: '#d1e7dd', label: 'PASS' };
    case 'failed':
      return { border: '#dc3545', bg: '#f8d7da', label: 'FAIL' };
    case 'skipped':
      return { border: '#fd7e14', bg: '#fff3cd', label: 'SKIP' };
    case 'pending':
      return { border: '#6c757d', bg: '#e2e3e5', label: 'PEND' };
    default:
      return { border: '#adb5bd', bg: '#f8f9fa', label: '—' };
  }
}

export function buildLloydsPipelineDiagramHtml(repoId: string, cucumberJson: unknown): string {
  const rows = resolveNodeStatuses(cucumberJson, repoId);
  const cards = rows
    .map(({ node, status }, i) => {
      const c = statusColor(status);
      const arrow =
        i < rows.length - 1
          ? `<span aria-hidden="true" style="align-self:center;font-size:1.25rem;color:#6c757d;padding:0 4px">→</span>`
          : '';
      const card = `<div style="flex:1 1 140px;min-width:120px;max-width:220px;border:2px solid ${c.border};background:${c.bg};border-radius:8px;padding:10px 8px;text-align:center;box-sizing:border-box">
  <div style="font-size:0.7rem;font-weight:700;color:#495057;letter-spacing:0.03em">${escHtml(c.label)}</div>
  <div style="font-weight:600;font-size:0.82rem;margin:6px 0;line-height:1.25">${escHtml(node.title)}</div>
  <div style="font-size:0.72rem;color:#495057;line-height:1.2">${escHtml(node.subtitle)}</div>
</div>`;
      return card + arrow;
    })
    .join('');

  return `
<section id="lloyds-agency-pipeline-flow" lang="en" style="margin:28px 16px 32px;padding:20px 16px;background:#fff;border:1px solid #dee2e6;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
  <h2 style="margin:0 0 8px;font-size:1.15rem;color:#212529">Lloyd's Agency journal pipeline — E2E read-only snapshot</h2>
  <p style="margin:0 0 16px;font-size:0.85rem;color:#495057;line-height:1.45">
    One card per automated scenario group for repository <strong>${escHtml(repoId)}</strong>.
    Programme flow (see <code>docs/lloyds/SKILL.md</code>): <strong>ADP (Snowflake)</strong> → <strong>MuleSoft</strong> (XML generation, <code>PROCESS_TRACKER</code>) →
    <strong>journal XML</strong> on <strong>Azure Blob</strong> → <strong>Dataverse</strong> (Accounting Approvals) → <strong>D365 F&O</strong> (DMF / journals) and <strong>Tagetik / TDS</strong> on the posting path.
    Green = all steps passed or skipped-only; red = at least one failed step; amber = all skipped; grey = no matching scenario in this JSON.
  </p>
  <div style="display:flex;flex-wrap:wrap;align-items:stretch;justify-content:flex-start;gap:0">
    ${cards}
  </div>
</section>`.trim();
}

const INJECT_MARKER = 'data-lloyds-pipeline-injected="1"';

export function injectLloydsPipelineOverviewIntoCucumberIndex(
  indexHtmlPath: string,
  cucumberJson: unknown,
  repoId: string,
): void {
  if (!fs.existsSync(indexHtmlPath)) return;
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');
  if (html.includes(INJECT_MARKER)) return;

  const fragment = `<div ${INJECT_MARKER}>${buildLloydsPipelineDiagramHtml(repoId, cucumberJson)}</div>`;
  const needle = '</body>';
  const idx = html.lastIndexOf(needle);
  if (idx === -1) {
    console.warn(`[lloyds-e2e-pipeline] Could not find </body> in ${indexHtmlPath} — skipping pipeline inject.`);
    return;
  }
  html = html.slice(0, idx) + fragment + '\n' + html.slice(idx);
  fs.writeFileSync(indexHtmlPath, html, 'utf-8');
}

/** Inject into the main overview index under a report stamp folder (…-full / …-US-xxxxx). */
export function injectLloydsPipelineForReportDir(
  reportDir: string,
  cucumberJson: unknown,
  repoId: string,
): void {
  const indexPath = path.join(reportDir, 'index.html');
  injectLloydsPipelineOverviewIntoCucumberIndex(indexPath, cucumberJson, repoId);
}
