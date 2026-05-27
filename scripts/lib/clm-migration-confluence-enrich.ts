/**
 * Post-process CLM QA progress Confluence storage HTML:
 * status lozenges, phase pipeline table (no white SVG), attachment link panel.
 */

import { CLM_QA_FAILURES_ATTACHMENT } from './clm-migration-evidence-excel';

export const CLM_QA_DASHBOARD_ATTACHMENT = 'CLM-MIGRATION-QA-DASHBOARD.html';
export const CLM_QA_EVIDENCE_ATTACHMENT = 'CLM-MIGRATION-QA-EVIDENCE.xlsx';
export { CLM_QA_FAILURES_ATTACHMENT };

type StatusColour = 'Green' | 'Yellow' | 'Red' | 'Blue' | 'Grey';

function statusMacro(title: string, colour: StatusColour): string {
  return `<ac:structured-macro ac:name="status" ac:schema-version="1"><ac:parameter ac:name="title">${title}</ac:parameter><ac:parameter ac:name="colour">${colour}</ac:parameter></ac:structured-macro>`;
}

function attachmentLink(filename: string, label: string): string {
  return `<p><ac:link><ri:attachment ri:filename="${filename}" /><ac:plain-text-link-body><![CDATA[${label}]]></ac:plain-text-link-body></ac:link></p>`;
}

function statusForOutcome(text: string): string {
  const t = text.trim();
  if (/^pass$/i.test(t)) return statusMacro('Pass', 'Green');
  if (/^fail$/i.test(t)) return statusMacro('Fail', 'Red');
  if (/partial/i.test(t)) return statusMacro('Partial', 'Yellow');
  if (/in progress/i.test(t)) return statusMacro('In progress', 'Yellow');
  if (/^active$/i.test(t)) return statusMacro('Active', 'Blue');
  if (/blocked/i.test(t)) return statusMacro('Blocked', 'Red');
  if (/pending|not started/i.test(t)) return statusMacro('Pending', 'Grey');
  return t;
}

/** Replace standalone Pass/Fail/Partial cells in table rows with Confluence status lozenges. */
export function applyStatusLozenges(html: string): string {
  return html
    .replace(/<td>Pass<\/td>/g, `<td>${statusMacro('Pass', 'Green')}</td>`)
    .replace(/<td>Fail<\/td>/g, `<td>${statusMacro('Fail', 'Red')}</td>`)
    .replace(/<td>Partial<\/td>/g, `<td>${statusMacro('Partial', 'Yellow')}</td>`)
    .replace(/<td>Pending<\/td>/g, `<td>${statusMacro('Pending', 'Grey')}</td>`)
    .replace(/<td>Blocked<\/td>/g, `<td>${statusMacro('Blocked', 'Red')}</td>`)
    .replace(/<td>Active<\/td>/g, `<td>${statusMacro('Active', 'Blue')}</td>`)
    .replace(/<td>In progress<\/td>/g, `<td>${statusMacro('In progress', 'Yellow')}</td>`)
    .replace(/<td>Not started<\/td>/g, `<td>${statusMacro('Not started', 'Grey')}</td>`);
}

/** Horizontal phase pipeline matching the local HTML dashboard (no Kroki SVG). */
export function phasePipelineTableHtml(): string {
  const rows = [
    ['Access', 'Connectivity', '~75%', 'Partial', 'SF JWT + D365 OData pass; MuleSoft OAuth 401 on INT'],
    ['A', 'Migration validation', '~85%', 'Active', 'Automation complete for 18 entities; 14/18 all-fields Pass (lookup resolution)'],
    ['B', 'Lifecycle SF→D365', '~15%', 'Blocked', 'MuleSoft preprod; B-L2 migrated-update not automated'],
    ['C', 'ADP / Data Cloud', '0%', 'Pending', '5 manual scenarios — Snowflake / Data Cloud env'],
    ['D', 'Downstream', '0%', 'Pending', '5 manual scenarios — ODS, Tagetik, Duck Creek, F&O'],
    ['E', 'Bordereaux', '0%', 'Pending', '5 manual scenarios — test file paths'],
  ];
  const body = rows
    .map(
      ([id, name, pct, outcome, notes]) =>
        `<tr><td><strong>${id}</strong></td><td>${name}</td><td>${pct}</td><td>${statusForOutcome(outcome)}</td><td>${notes}</td></tr>`
    )
    .join('\n');
  return `<table class="wrapped relative-table confluenceTable"><colgroup><col style="width: 8%;"/><col style="width: 22%;"/><col style="width: 10%;"/><col style="width: 14%;"/><col style="width: 46%;"/></colgroup><thead><tr><th>Phase</th><th>Name</th><th>Progress</th><th>Outcome</th><th>Notes</th></tr></thead><tbody>${body}</tbody></table>`;
}

export function quickLinksPanelHtml(): string {
  return `<ac:structured-macro ac:name="info" ac:schema-version="1">
<ac:parameter ac:name="title">Downloads — field-level detail</ac:parameter>
<ac:rich-text-body>
${attachmentLink(CLM_QA_EVIDENCE_ATTACHMENT, '📊 Download Excel evidence (all entities — summary + per-entity diffs)')}
${attachmentLink(CLM_QA_FAILURES_ATTACHMENT, '🔴 Download failures only (one tab per entity — missing rows + field mismatches)')}
${attachmentLink(CLM_QA_DASHBOARD_ATTACHMENT, '🖥 Open interactive HTML dashboard (matches local preview styling)')}
<p><em>Excel evidence includes Summary plus per-entity detail. The <strong>failures</strong> workbook lists only missing TARGET rows and mapped-field mismatches (Match=N), one worksheet tab per failing entity.</em></p>
</ac:rich-text-body>
</ac:structured-macro>`;
}

/** Remove Kroki SVG image blocks and inject phase pipeline table in their place. */
export function replaceMermaidWithPhaseTable(html: string): string {
  const mermaidImg =
    /<ac:image[^>]*>\s*<ri:attachment ri:filename="clm-migration-qa-progress-mermaid-\d+\.svg"\s*\/>\s*<\/ac:image>/g;
  if (mermaidImg.test(html)) {
    return html.replace(mermaidImg, phasePipelineTableHtml());
  }
  // Placeholder from skipped render
  return html.replace(
    /<p><em>Diagram \d+ — not rendered[^<]*<\/em><\/p>/g,
    phasePipelineTableHtml()
  );
}

export function enrichClmQaProgressBody(storageHtml: string): string {
  let html = storageHtml.replace(
    /<p>PHASE_PIPELINE_PLACEHOLDER<\/p>/g,
    phasePipelineTableHtml()
  );
  html = replaceMermaidWithPhaseTable(html);
  html = applyStatusLozenges(html);
  // Prepend quick-links panel after first metadata block (before first h2)
  const h2Idx = html.indexOf('<h2>');
  if (h2Idx >= 0) {
    html = `${html.slice(0, h2Idx)}${quickLinksPanelHtml()}\n${html.slice(h2Idx)}`;
  } else {
    html = `${quickLinksPanelHtml()}\n${html}`;
  }
  return html;
}
