/**
 * Sprint 101 – Zephyr report
 *
 * For each Sprint 101 work item (from data/excel/Jira Sprint 101.xlsx) reports:
 *   - Work Item ID
 *   - Title (Jira summary)
 *   - Status (Jira status)
 *   - Number of test cases uploaded in Zephyr (by label)
 *   - Number of test cases linked to the Jira issue (from Zephyr Scale links, not Jira remotelink)
 *
 * Usage:
 *   npx ts-node scripts/sprint-101-zephyr-report.ts
 *   npx ts-node scripts/sprint-101-zephyr-report.ts --output data/excel/sprint-101-zephyr-report.csv
 *
 * Reads: data/excel/Jira Sprint 101.xlsx (sheet "Jira")
 * Requires: Jira and Zephyr credentials in .env.qa (or ENV)
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { jiraClient } from '../src/integrations/jira/client';
import { zephyrClient } from '../src/integrations/zephyr/client';

const EXCEL_PATH = path.join(process.cwd(), 'data', 'excel', 'Jira Sprint 101.xlsx');
const PROJECT_KEY = process.env.ZEPHYR_PROJECT_KEY || 'SF';

interface ReportRow {
  workItemId: string;
  title: string;
  status: string;
  testCasesUploaded: number;
  testCasesLinked: number;
}

async function loadSprint101WorkItems(): Promise<{ workItemId: string; title: string }[]> {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel not found: ${EXCEL_PATH}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.getWorksheet('Jira') || workbook.worksheets[0];
  if (!sheet) throw new Error('No sheet "Jira" found');

  const rows: { workItemId: string; title: string }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (c) => cells.push(c.value));
    const key = String(cells[1] || '').trim();
    const title = String(cells[2] || '').trim();
    if (key && /^[A-Z]+-\d+$/.test(key)) {
      rows.push({ workItemId: key, title });
    }
  });
  return rows;
}

async function getJiraStatus(workItemId: string): Promise<string> {
  try {
    const issue = await jiraClient.getIssue(workItemId);
    return issue?.fields?.status?.name ?? '—';
  } catch (e: any) {
    if (e?.response?.status === 404) return 'Not Found';
    return `Error: ${(e?.message || 'Unknown').slice(0, 30)}`;
  }
}

async function getTestCasesUploaded(workItemId: string): Promise<number> {
  try {
    const list = await zephyrClient.searchTestCasesByLabel(workItemId, PROJECT_KEY);
    return Array.isArray(list) ? list.length : 0;
  } catch (e: any) {
    return -1;
  }
}

/**
 * Get count of test cases that are linked to this Jira issue in Zephyr Scale.
 * Uses Zephyr API (GET test case -> links.issues), not Jira remote issue links,
 * so it reflects the links created by Zephyr Scale / upload-and-link.
 */
async function getTestCasesLinked(workItemId: string): Promise<number> {
  try {
    const jiraIssueId = await jiraClient.getIssueId(workItemId);
    const testCases = await zephyrClient.searchTestCasesByLabel(workItemId, PROJECT_KEY);
    if (!testCases.length) return 0;
    let linked = 0;
    const idStr = String(jiraIssueId);
    for (const tc of testCases) {
      const key = (tc as any).key;
      if (!key) continue;
      const issueIds = await zephyrClient.getTestCaseLinkedIssueIds(key);
      if (issueIds.includes(idStr)) linked += 1;
    }
    return linked;
  } catch (e: any) {
    return -1;
  }
}

function escapeCsv(s: string): string {
  if (s == null) return '';
  const t = String(s).trim();
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

async function main() {
  const outputPath = process.argv.includes('--output')
    ? process.argv[process.argv.indexOf('--output') + 1]
    : null;

  console.log('Sprint 101 – Zephyr report');
  console.log('Loading work items from', EXCEL_PATH, '...');
  const workItems = await loadSprint101WorkItems();
  console.log(`Found ${workItems.length} Sprint 101 work items.\n`);

  const results: ReportRow[] = [];
  for (let i = 0; i < workItems.length; i++) {
    const { workItemId, title } = workItems[i];
    process.stdout.write(`  [${i + 1}/${workItems.length}] ${workItemId} ... `);

    const [status, uploaded, linked] = await Promise.all([
      getJiraStatus(workItemId),
      getTestCasesUploaded(workItemId),
      getTestCasesLinked(workItemId),
    ]);

    results.push({
      workItemId,
      title,
      status,
      testCasesUploaded: uploaded,
      testCasesLinked: linked,
    });
    console.log(`Status=${status}, Uploaded=${uploaded}, Linked=${linked}`);
  }

  // Console table
  const col1 = 14;
  const col2 = 50;
  const col3 = 18;
  const col4 = 22;
  const col5 = 18;
  console.log('\n' + '—'.repeat(col1 + col2 + col3 + col4 + col5));
  console.log(
    'Work Item ID'.padEnd(col1) +
      'Title'.padEnd(col2) +
      'Status'.padEnd(col3) +
      'Test Cases Uploaded'.padEnd(col4) +
      'Test Cases Linked'.padEnd(col5)
  );
  console.log('—'.repeat(col1 + col2 + col3 + col4 + col5));
  for (const r of results) {
    const titleShort = (r.title || '').slice(0, col2 - 2).padEnd(col2);
    const statusShort = (r.status || '—').slice(0, col3 - 2).padEnd(col3);
    const up = String(r.testCasesUploaded >= 0 ? r.testCasesUploaded : 'Error').padEnd(col4);
    const ln = String(r.testCasesLinked >= 0 ? r.testCasesLinked : 'Error').padEnd(col5);
    console.log(`${r.workItemId.padEnd(col1)}${titleShort}${statusShort}${up}${ln}`);
  }
  console.log('—'.repeat(col1 + col2 + col3 + col4 + col5));

  // CSV output
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const header = 'Work Item ID,Title,Status,Test Cases Uploaded,Test Cases Linked';
    const lines = [
      header,
      ...results.map((r) =>
        [r.workItemId, r.title, r.status, r.testCasesUploaded, r.testCasesLinked].map(escapeCsv).join(',')
      ),
    ];
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    console.log(`\nWrote: ${outputPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
