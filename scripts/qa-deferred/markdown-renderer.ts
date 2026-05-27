/**
 * Render QA Deferred items as Markdown.
 *
 * Two-tier layout:
 *   1) Compact summary table (ID, Area, Decision, Owner, Target Phase, Jira, Date)
 *   2) Detail sections per item (Observation, Risk, Notes)
 */

import type { DeferredItem } from './model';

function escapeMd(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function jiraLink(jiraKey: string, jiraUrl: string): string {
  return `[${jiraKey}](${jiraUrl})`;
}

const SUMMARY_COLUMNS = ['ID', 'Area', 'Decision', 'Owner', 'Target Phase', 'Jira', 'Date Raised'];

export function renderSummaryTable(items: DeferredItem[]): string {
  const header = `| ${SUMMARY_COLUMNS.join(' | ')} |`;
  const separator = `| ${SUMMARY_COLUMNS.map(() => '---').join(' | ')} |`;

  const rows = items.map((item) => {
    const cells = [
      `**${escapeMd(item.id)}**`,
      escapeMd(item.area),
      escapeMd(item.decision),
      escapeMd(item.owner),
      escapeMd(item.targetPhase),
      jiraLink(item.jiraKey, item.jiraUrl),
      item.dateRaised,
    ];
    return `| ${cells.join(' | ')} |`;
  });

  return [header, separator, ...rows].join('\n');
}

function renderDetail(item: DeferredItem): string {
  const lines = [
    `<details>`,
    `<summary><strong>${escapeMd(item.id)} — ${escapeMd(item.area)}</strong> (${jiraLink(item.jiraKey, item.jiraUrl)})</summary>`,
    ``,
    `| Field | Detail |`,
    `| --- | --- |`,
    `| **QA Observation** | ${escapeMd(item.observation)} |`,
    `| **Risk if Not Implemented** | ${escapeMd(item.risk)} |`,
  ];
  if (item.notes) {
    lines.push(`| **Notes** | ${escapeMd(item.notes)} |`);
  }
  lines.push(``, `</details>`);
  return lines.join('\n');
}

export function renderTable(items: DeferredItem[]): string {
  return renderSummaryTable(items);
}

export function renderFullPage(items: DeferredItem[]): string {
  const summary = renderSummaryTable(items);
  const details = items.map(renderDetail).join('\n\n');

  return `# QA Deferred Recommendations / Known Limitations — MVP Phase 1

This section tracks observations, risks, and recommendations identified by QA during MVP Phase 1 testing that have been **deferred**, **accepted**, or **rejected** by the project team.

Each row is linked to a Jira ticket for traceability. Expand any item in the **Details** section for the full observation and risk.

## Decision Definitions

| Decision | Meaning |
| --- | --- |
| **Deferred** | Acknowledged but intentionally postponed to a future phase. Will be re-evaluated. |
| **Accepted** | Risk is understood and accepted for MVP. No action planned. |
| **Rejected** | Recommendation was reviewed and rejected. Documented for audit trail. |

## Summary

${summary}

## Details

${details}

---

> **How to link to this section:** Use the anchor \`#qa-deferred-recommendations\` from any Confluence page.
>
> **Maintained by:** QA Automation Team — updated via \`npm run qa:deferred:update\`
`;
}
