/**
 * HTML comparison report: Expected vs Actual for SF-872 API/UI runs.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Sf872ComparisonRow } from './sf872-object-creation-verify';

export type Sf872ReportMeta = {
  title: string;
  objectApiName?: string;
  /** Reference only; SF-872 tests do not read Excel migration workbooks. */
  specPath?: string;
  scenarioName?: string;
  kind: 'API' | 'UI';
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function writeSf872ComparisonReport(
  meta: Sf872ReportMeta,
  rows: Sf872ComparisonRow[],
  outDir = path.join(process.cwd(), 'reports', 'sf872')
): string {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeObj = (meta.objectApiName || 'object').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `SF-872-${meta.kind}-${safeObj}-${ts}.html`;
  const outPath = path.join(outDir, fileName);

  const passed = rows.filter((r) => r.ok).length;
  const failed = rows.length - passed;
  const allOk = failed === 0;

  const tableRows = rows
    .map((r) => {
      const status = r.ok ? '<span class="pass">PASS</span>' : '<span class="fail">FAIL</span>';
      return `<tr class="${r.ok ? 'ok' : 'bad'}">
  <td>${esc(r.check)}</td>
  <td>${esc(r.expected)}</td>
  <td>${esc(r.actual)}</td>
  <td>${status}</td>
  <td>${esc(r.notes || '')}</td>
</tr>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${esc(meta.title)}</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; margin: 24px; color: #1a1a1a; }
    h1 { font-size: 1.25rem; }
    .meta { color: #555; margin-bottom: 16px; font-size: 0.9rem; }
    .summary { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
    .summary.pass { background: #e8f5e9; border: 1px solid #4caf50; }
    .summary.fail { background: #ffebee; border: 1px solid #f44336; }
    table { border-collapse: collapse; width: 100%; font-size: 0.875rem; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f5f5f5; }
    tr.ok td { background: #fafafa; }
    tr.bad td { background: #fff8f8; }
    .pass { color: #2e7d32; font-weight: 600; }
    .fail { color: #c62828; font-weight: 600; }
  </style>
</head>
<body>
  <h1>${esc(meta.title)}</h1>
  <div class="meta">
    <div><strong>Scenario:</strong> ${esc(meta.scenarioName || '—')}</div>
    <div><strong>Reference:</strong> ${esc(meta.specPath || 'N/A — SF-872 validates object creation only; Excel holds migration data separately')}</div>
    ${meta.objectApiName ? `<div><strong>Object:</strong> ${esc(meta.objectApiName)}</div>` : ''}
    <div><strong>Generated:</strong> ${esc(new Date().toISOString())}</div>
  </div>
  <div class="summary ${allOk ? 'pass' : 'fail'}">
    <strong>Summary:</strong> ${passed} passed, ${failed} failed (${rows.length} checks)
  </div>
  <table>
    <thead>
      <tr>
        <th>Check</th>
        <th>Expected</th>
        <th>Actual</th>
        <th>Result</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(outPath, html, 'utf8');
  return outPath;
}
