/**
 * Writes a comparison report as XHTML (well-formed XML). Open in a browser to see
 * attribute-level match (green) vs mismatch (red) per DOCUMENT and paired journal line.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AttributeMatchResult, CompareMismatch, CompareReport } from './types';

const XHTML_NS = 'http://www.w3.org/1999/xhtml';

function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeXmlAttr(s: string): string {
  return escapeXmlText(s).replace(/"/g, '&quot;');
}

/** HTML id token — document numbers may contain characters invalid in id. */
function safeSectionId(document: string): string {
  return `doc-${document.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

/** `DOC:105335840#0` → { document: "105335840", pairIndex: 0 } */
function parseDocMatchKey(key: string): { document: string; pairIndex: number } | null {
  const m = /^DOC:(.*)#(\d+)$/.exec(key);
  if (!m) return null;
  return { document: m[1], pairIndex: Number(m[2]) };
}

function collectDocumentsFromReport(report: CompareReport): string[] {
  const set = new Set<string>();
  for (const s of report.documentPairingSummary) {
    set.add(s.document);
  }
  for (const k of Object.keys(report.attributeMatchesByMatchKey)) {
    const p = parseDocMatchKey(k);
    if (p) set.add(p.document);
  }
  for (const k of Object.keys(report.mismatchesByMatchKey)) {
    const p = parseDocMatchKey(k);
    if (p) set.add(p.document);
  }
  for (const m of report.mismatches) {
    if (m.document) set.add(m.document);
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function matchKeysForDocument(doc: string, report: CompareReport): string[] {
  const keys = new Set<string>([
    ...Object.keys(report.attributeMatchesByMatchKey),
    ...Object.keys(report.mismatchesByMatchKey),
  ]);
  const out: string[] = [];
  for (const k of keys) {
    const p = parseDocMatchKey(k);
    if (p && p.document === doc) out.push(k);
  }
  return out.sort((a, b) => {
    const pa = parseDocMatchKey(a);
    const pb = parseDocMatchKey(b);
    if (!pa || !pb) return a.localeCompare(b);
    return pa.pairIndex - pb.pairIndex || a.localeCompare(b);
  });
}

type AttrRow = {
  snowflakeColumn: string;
  xmlAttribute: string;
  pairSource: string;
  snowflakeDisplay: string;
  xmlDisplay: string;
  isMatch: boolean;
};

function buildAttrRowsForMatchKey(
  mk: string,
  report: CompareReport,
): AttrRow[] {
  const matches = report.attributeMatchesByMatchKey[mk] ?? [];
  const mismatches = report.mismatchesByMatchKey[mk] ?? [];
  const rows: AttrRow[] = [];
  for (const m of matches) {
    rows.push({
      snowflakeColumn: m.snowflakeColumn,
      xmlAttribute: m.xmlAttribute,
      pairSource: m.pairSource,
      snowflakeDisplay: m.snowflakeDisplay,
      xmlDisplay: m.xmlDisplay,
      isMatch: true,
    });
  }
  for (const m of mismatches) {
    rows.push({
      snowflakeColumn: m.snowflakeColumn,
      xmlAttribute: m.xmlAttribute,
      pairSource: m.pairSource ?? 'mapping',
      snowflakeDisplay: m.snowflakeDisplay,
      xmlDisplay: m.xmlDisplay,
      isMatch: false,
    });
  }
  rows.sort((a, b) =>
    a.snowflakeColumn.toUpperCase().localeCompare(b.snowflakeColumn.toUpperCase()),
  );
  return rows;
}

function unpairedForDocument(doc: string, report: CompareReport): CompareMismatch[] {
  return report.mismatches.filter((m) => m.kind === 'UNPAIRED_ROW' && m.document === doc);
}

/**
 * Writes an XHTML document (UTF-8, `.xml` recommended). Browsers render green/red styling.
 */
export function writeFowdCompareReportXml(report: CompareReport, filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const documents = collectDocumentsFromReport(report);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push(
    `<html xmlns="${XHTML_NS}" xml:lang="en" lang="en"><head>`,
    '<meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8"/>',
    `<title>${escapeXmlText(`FOWD compare — ${report.description}`)}</title>`,
    '<style type="text/css">',
    'body{font-family:Segoe UI,system-ui,sans-serif;margin:1rem 1.5rem;color:#1a1a1a;}',
    'h1{font-size:1.25rem;margin-top:0;}',
    'h2{font-size:1.1rem;margin:1.25rem 0 0.5rem;border-bottom:1px solid #ccc;padding-bottom:0.25rem;}',
    'h3{font-size:1rem;margin:0.75rem 0 0.35rem;color:#333;}',
    'table{border-collapse:collapse;width:100%;max-width:1200px;margin:0.5rem 0;font-size:0.875rem;}',
    'th,td{border:1px solid #bbb;padding:0.35rem 0.5rem;text-align:left;vertical-align:top;}',
    'th{background:#f0f0f0;}',
    'tr.row-match{background-color:#e8f5e9;}',
    'tr.row-mismatch{background-color:#ffebee;}',
    '.status-match{color:#156534;font-weight:600;}',
    '.status-mismatch{color:#b71c1c;font-weight:600;}',
    '.meta{color:#555;font-size:0.85rem;margin:0.25rem 0;}',
    '.legend span{margin-right:1rem;padding:0.15rem 0.4rem;border-radius:3px;}',
    '.legend .status-match{background:#e8f5e9;}',
    '.legend .status-mismatch{background:#ffebee;}',
    '.warn{background:#fff3e0;border:1px solid #ff9800;padding:0.5rem;margin:0.5rem 0;max-width:1200px;}',
    '.pair-meta{color:#666;font-size:0.8rem;}',
    '</style>',
    '</head><body>',
  );

  parts.push(`<h1>FOWD agency policy ↔ Dynamics XML comparison</h1>`);
  parts.push(
    `<p class="meta">Generated <time datetime="${escapeXmlAttr(generatedAt)}">${escapeXmlText(generatedAt)}</time> · DESCRIPTION filter: <strong>${escapeXmlText(report.description)}</strong>`,
  );
  if (report.documentFilter) {
    parts.push(` · DOCUMENT filter: <strong>${escapeXmlText(report.documentFilter)}</strong>`);
  }
  parts.push(` · Overall: <strong class="${report.ok ? 'status-match' : 'status-mismatch'}">${escapeXmlText(report.ok ? 'PASS' : 'FAIL')}</strong></p>`);
  parts.push(
    '<p class="legend"><span class="status-match">Match (green)</span><span class="status-mismatch">Mismatch (red)</span></p>',
  );

  if (report.descriptionAlignmentIssues.length > 0) {
    parts.push('<h2>Description / document alignment</h2><ul>');
    for (const iss of report.descriptionAlignmentIssues) {
      parts.push(`<li>${escapeXmlText(iss.message)}</li>`);
    }
    parts.push('</ul>');
  }

  for (const doc of documents) {
    const summary = report.documentPairingSummary.find((s) => s.document === doc);
    parts.push(`<section id="${escapeXmlAttr(safeSectionId(doc))}">`);
    parts.push(`<h2>Document <span class="doc-num">${escapeXmlText(doc || '(empty)')}</span></h2>`);
    if (summary) {
      parts.push(
        `<p class="pair-meta">Snowflake rows: ${summary.snowflakeRowCount} · XML lines: ${summary.xmlLineCount} · Paired: ${summary.pairedLineCount} · Unpaired SF: ${summary.unpairedSnowflakeRows} · Unpaired XML: ${summary.unpairedXmlLines}</p>`,
      );
    }

    const mks = matchKeysForDocument(doc, report);
    for (const mk of mks) {
      const parsed = parseDocMatchKey(mk);
      if (!parsed) continue;
      const rows = buildAttrRowsForMatchKey(mk, report);
      if (rows.length === 0) continue;

      const sfLn = report.attributeMatches.find((a) => a.matchKey === mk)?.snowflakeLineNumber
        ?? report.mappingAttributeMismatches.find((m) => m.matchKey === mk)?.snowflakeLineNumber
        ?? '';
      const xmlLn = report.attributeMatches.find((a) => a.matchKey === mk)?.xmlLineNumber
        ?? report.mappingAttributeMismatches.find((m) => m.matchKey === mk)?.xmlLineNumber
        ?? '';

      parts.push(`<h3>Paired line #${parsed.pairIndex} <span class="pair-meta">(${escapeXmlText(mk)})</span></h3>`);
      parts.push(
        `<p class="pair-meta">Snowflake LINE_NUMBER: ${escapeXmlText(String(sfLn))} · XML LINENUMBER: ${escapeXmlText(String(xmlLn))}</p>`,
      );
      parts.push('<table><thead><tr>');
      parts.push(
        '<th>Snowflake column</th><th>XML attribute</th><th>Pair source</th><th>Snowflake value</th><th>XML value</th><th>Result</th>',
      );
      parts.push('</tr></thead><tbody>');
      for (const r of rows) {
        const rowClass = r.isMatch ? 'row-match' : 'row-mismatch';
        const statusClass = r.isMatch ? 'status-match' : 'status-mismatch';
        const statusText = r.isMatch ? 'Match' : 'Mismatch';
        parts.push(`<tr class="${rowClass}">`);
        parts.push(`<td><code>${escapeXmlText(r.snowflakeColumn)}</code></td>`);
        parts.push(`<td><code>${escapeXmlText(r.xmlAttribute)}</code></td>`);
        parts.push(`<td>${escapeXmlText(r.pairSource)}</td>`);
        parts.push(`<td>${escapeXmlText(r.snowflakeDisplay)}</td>`);
        parts.push(`<td>${escapeXmlText(r.xmlDisplay)}</td>`);
        parts.push(
          `<td><span class="${statusClass}">${escapeXmlText(statusText)}</span></td>`,
        );
        parts.push('</tr>');
      }
      parts.push('</tbody></table>');
    }

    const unpaired = unpairedForDocument(doc, report);
    if (unpaired.length > 0) {
      parts.push('<h3>Structural / unpaired rows</h3>');
      for (const u of unpaired) {
        parts.push('<div class="warn">');
        parts.push(
          `<p><strong>${escapeXmlText(String(u.snowflakeLineNumber ?? u.xmlLineNumber ?? u.matchKey ?? ''))}</strong></p>`,
        );
        parts.push(`<p>${escapeXmlText(u.snowflakeDisplay || u.xmlDisplay)}</p>`);
        parts.push('</div>');
      }
    }

    parts.push('</section>');
  }

  parts.push('</body></html>');
  fs.writeFileSync(filePath, parts.join(''), 'utf8');
}
