/**
 * Render QA Deferred items as Confluence Storage Format (XHTML).
 *
 * Two-tier layout:
 *   1) A compact summary table (ID, Area, Decision, Owner, Target Phase, Jira, Date)
 *   2) Expandable detail panels per item (Observation, Risk, Notes)
 *
 * All user-supplied text is XML-escaped to avoid broken markup.
 */

import type { DeferredItem } from './model';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function jiraLink(jiraKey: string, jiraUrl: string): string {
  return `<a href="${escapeXml(jiraUrl)}">${escapeXml(jiraKey)}</a>`;
}

function decisionBadge(decision: string): string {
  const colors: Record<string, { bg: string; icon: string }> = {
    Deferred: { bg: '#fff0b3', icon: '\u23F3' },
    Accepted: { bg: '#e3fcef', icon: '\u2705' },
    Rejected: { bg: '#ffebe6', icon: '\u274C' },
  };
  const { bg, icon } = colors[decision] || { bg: '#f4f5f7', icon: '' };
  return `<span style="background-color:${bg};padding:2px 8px;border-radius:3px;font-weight:bold;">${icon} ${escapeXml(decision)}</span>`;
}

const HEADER_BG = '#0052cc';
const HEADER_COLOR = 'white';

/** Borders + zebra striping so rows stay readable in light and dark Confluence themes (avoids theme-only striping that is nearly invisible in dark mode). */
const TABLE_BORDER = '#6B778C';
const ROW_BG_A = '#FFFFFF';
const ROW_BG_B = '#EBECF0';
const TABLE_BASE = `border-collapse:collapse;width:100%;`;

function zebraRowBg(rowIndex: number): string {
  return rowIndex % 2 === 0 ? ROW_BG_A : ROW_BG_B;
}

function summaryHeaderCellStyle(): string {
  return `background-color:${HEADER_BG};color:${HEADER_COLOR};text-align:center;border:1px solid #0747A6;padding:8px 10px;`;
}

function summaryBodyCellStyle(rowIndex: number): string {
  const bg = zebraRowBg(rowIndex);
  return `text-align:center;border:1px solid ${TABLE_BORDER};padding:8px 10px;background-color:${bg};`;
}

const DECISION_HEADER_BG = '#6554C0';
const DECISION_HEADER_BORDER = '#5243AA';

function decisionHeaderCellStyle(): string {
  return `background-color:${DECISION_HEADER_BG};color:white;text-align:left;border:1px solid ${DECISION_HEADER_BORDER};padding:8px 10px;`;
}

function decisionBodyCellStyle(rowIndex: number): string {
  const bg = zebraRowBg(rowIndex);
  return `vertical-align:top;text-align:left;border:1px solid ${TABLE_BORDER};padding:8px 10px;background-color:${bg};`;
}

const SUMMARY_COLUMNS = [
  { label: 'ID', width: '70px' },
  { label: 'Area', width: '140px' },
  { label: 'Decision', width: '110px' },
  { label: 'Owner', width: '90px' },
  { label: 'Target Phase', width: '100px' },
  { label: 'Jira', width: '90px' },
  { label: 'Date Raised', width: '105px' },
];

function summaryHeaderRow(): string {
  const cells = SUMMARY_COLUMNS.map(
    (col) => `      <th style="${summaryHeaderCellStyle()}">${escapeXml(col.label)}</th>`,
  ).join('\n');
  return `    <tr>\n${cells}\n    </tr>`;
}

function summaryDataRow(item: DeferredItem, rowIndex: number): string {
  const cells = [
    `<strong>${escapeXml(item.id)}</strong>`,
    escapeXml(item.area),
    decisionBadge(item.decision),
    escapeXml(item.owner),
    escapeXml(item.targetPhase),
    jiraLink(item.jiraKey, item.jiraUrl),
    escapeXml(item.dateRaised),
  ];
  const tdStyle = summaryBodyCellStyle(rowIndex);
  const tds = cells.map((c) => `      <td style="${tdStyle}">${c}</td>`).join('\n');
  return `    <tr>\n${tds}\n    </tr>`;
}

/**
 * Render the compact summary table.
 */
export function renderSummaryTable(items: DeferredItem[]): string {
  const colgroup = SUMMARY_COLUMNS.map((c) => `<col style="width:${c.width};" />`).join('');
  const rows = items.map((item, i) => summaryDataRow(item, i)).join('\n');

  return `<table class="wrapped confluenceTable" style="${TABLE_BASE}">
  <colgroup>${colgroup}</colgroup>
  <thead>
${summaryHeaderRow()}
  </thead>
  <tbody>
${rows}
  </tbody>
</table>`;
}

/**
 * Render expandable detail panels — one per item.
 */
function renderDetailPanel(item: DeferredItem): string {
  const decisionColor: Record<string, string> = {
    Deferred: '#fff0b3',
    Accepted: '#e3fcef',
    Rejected: '#ffebe6',
  };
  const panelBg = decisionColor[item.decision] || '#f4f5f7';

  const detailLabelStyle = `vertical-align:top;text-align:left;border:1px solid ${TABLE_BORDER};padding:8px 10px;background-color:${ROW_BG_B};width:150px;`;
  const detailValueStyle = (rowIdx: number) =>
    `vertical-align:top;text-align:left;border:1px solid ${TABLE_BORDER};padding:8px 10px;background-color:${zebraRowBg(rowIdx)};`;

  return `<ac:structured-macro ac:name="expand" ac:schema-version="1">
  <ac:parameter ac:name="title">${escapeXml(item.id)} — ${escapeXml(item.area)} (${escapeXml(item.jiraKey)})</ac:parameter>
  <ac:rich-text-body>
    <ac:structured-macro ac:name="panel" ac:schema-version="1">
      <ac:parameter ac:name="bgColor">${panelBg}</ac:parameter>
      <ac:rich-text-body>
        <p><strong>Decision:</strong> ${decisionBadge(item.decision)} &nbsp; <strong>Owner:</strong> ${escapeXml(item.owner)} &nbsp; <strong>Target:</strong> ${escapeXml(item.targetPhase)} &nbsp; <strong>Date:</strong> ${escapeXml(item.dateRaised)}</p>
      </ac:rich-text-body>
    </ac:structured-macro>
    <table class="wrapped confluenceTable" style="${TABLE_BASE}">
      <colgroup><col style="width:150px;" /><col /></colgroup>
      <tbody>
        <tr>
          <td style="${detailLabelStyle}"><strong>QA Observation</strong></td>
          <td style="${detailValueStyle(0)}">${escapeXml(item.observation)}</td>
        </tr>
        <tr>
          <td style="${detailLabelStyle}"><strong>Risk if Not Implemented</strong></td>
          <td style="${detailValueStyle(1)}">${escapeXml(item.risk)}</td>
        </tr>${item.notes ? `
        <tr>
          <td style="${detailLabelStyle}"><strong>Notes</strong></td>
          <td style="${detailValueStyle(2)}">${escapeXml(item.notes)}</td>
        </tr>` : ''}
      </tbody>
    </table>
  </ac:rich-text-body>
</ac:structured-macro>`;
}

export function renderDetails(items: DeferredItem[]): string {
  return items.map(renderDetailPanel).join('\n\n');
}

/**
 * Render just the table + details (for appending into an existing page).
 */
export function renderTable(items: DeferredItem[]): string {
  return `${renderSummaryTable(items)}\n\n<h3>Details</h3>\n\n${renderDetails(items)}`;
}

/**
 * Render the full page skeleton: anchor, title panel, decision definitions,
 * summary table, expandable details, and footer.
 */
export function renderFullPage(items: DeferredItem[]): string {
  const summaryTable = renderSummaryTable(items);
  const details = renderDetails(items);

  return `<ac:structured-macro ac:name="anchor" ac:schema-version="1">
  <ac:parameter ac:name="">qa-deferred-recommendations</ac:parameter>
</ac:structured-macro>

<ac:structured-macro ac:name="panel" ac:schema-version="1">
  <ac:parameter ac:name="bgColor">#deebff</ac:parameter>
  <ac:parameter ac:name="titleBGColor">#0052cc</ac:parameter>
  <ac:parameter ac:name="titleColor">#ffffff</ac:parameter>
  <ac:parameter ac:name="title">QA Deferred Recommendations / Known Limitations &mdash; MVP Phase 1</ac:parameter>
  <ac:rich-text-body>
    <p>This section tracks observations, risks, and recommendations identified by QA during MVP Phase 1 testing that have been <strong>deferred</strong>, <strong>accepted</strong>, or <strong>rejected</strong> by the project team.</p>
    <p>Each row is linked to a Jira ticket for traceability. Click any row in the <strong>Details</strong> section below to see the full observation, risk assessment, and notes.</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Decision Definitions</h2>

<table class="wrapped confluenceTable" style="${TABLE_BASE}">
  <colgroup><col style="width:140px;" /><col /></colgroup>
  <thead>
    <tr>
      <th style="${decisionHeaderCellStyle()}">Decision</th>
      <th style="${decisionHeaderCellStyle()}">Meaning</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="${decisionBodyCellStyle(0)}"><span style="background-color:#fff0b3;padding:2px 8px;border-radius:3px;font-weight:bold;">\u23F3 Deferred</span></td>
      <td style="${decisionBodyCellStyle(0)}">Acknowledged but intentionally postponed to a future phase. Will be re-evaluated.</td>
    </tr>
    <tr>
      <td style="${decisionBodyCellStyle(1)}"><span style="background-color:#e3fcef;padding:2px 8px;border-radius:3px;font-weight:bold;">\u2705 Accepted</span></td>
      <td style="${decisionBodyCellStyle(1)}">Risk is understood and accepted for MVP. No action planned.</td>
    </tr>
    <tr>
      <td style="${decisionBodyCellStyle(2)}"><span style="background-color:#ffebe6;padding:2px 8px;border-radius:3px;font-weight:bold;">\u274C Rejected</span></td>
      <td style="${decisionBodyCellStyle(2)}">Recommendation was reviewed and rejected. Documented for audit trail.</td>
    </tr>
  </tbody>
</table>

<h2>Summary</h2>

${summaryTable}

<h2>Details</h2>

<p><em>Click an item to expand the full observation, risk assessment, and notes.</em></p>

${details}

<hr />

<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p><strong>How to link to this section:</strong> Use the anchor <code>#qa-deferred-recommendations</code> from any Confluence page.</p>
    <p><strong>Maintained by:</strong> QA Automation Team &mdash; updated via <code>npm run qa:deferred:update</code></p>
  </ac:rich-text-body>
</ac:structured-macro>`;
}
