/**
 * Sprint 101 Status Report Utility
 *
 * For each of the 54 work items in Jira Sprint 101, reports:
 *   - Jira status
 *   - Number of test cases created in Zephyr (by label)
 *   - Number of test cases linked to the Jira issue (remote issue links)
 *
 * Usage:
 *   npx ts-node scripts/sprint-101-status-report.ts
 *   npx ts-node scripts/sprint-101-status-report.ts --output data/excel/sprint-101-status-report.csv
 *
 * Reads work items from: data/excel/Jira Sprint 101.xlsx (sheet "Jira")
 * Requires: Jira and Zephyr credentials in .env.qa (or ENV)
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';
import { jiraClient } from '../src/integrations/jira/client';
import { zephyrClient } from '../src/integrations/zephyr/client';
import { config } from '../src/config/config';

const EXCEL_PATH = path.join(process.cwd(), 'data', 'excel', 'Jira Sprint 101.xlsx');
const PROJECT_KEY = process.env.ZEPHYR_PROJECT_KEY || 'SF';

interface WorkItemRow {
  workItem: string;
  summary: string;
}

interface StatusRow {
  workItem: string;
  summary: string;
  status: string;
  testCasesCreated: number;
  testCasesLinked: number;
}

async function loadWorkItems(): Promise<WorkItemRow[]> {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel not found: ${EXCEL_PATH}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.getWorksheet('Jira') || workbook.worksheets[0];
  if (!sheet) throw new Error('No sheet "Jira" found');

  const rows: WorkItemRow[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (c) => cells.push(c.value));
    const key = String(cells[1] || '').trim();
    const summary = String(cells[2] || '').trim();
    if (key && /^[A-Z]+-\d+$/.test(key)) {
      rows.push({ workItem: key, summary });
    }
  });
  return rows;
}

async function getJiraStatus(workItem: string): Promise<string> {
  try {
    const issue = await jiraClient.getIssue(workItem);
    return issue?.fields?.status?.name ?? '—';
  } catch (e: any) {
    if (e?.response?.status === 404) return 'Not Found';
    return `Error: ${(e?.message || 'Unknown').slice(0, 30)}`;
  }
}

async function getZephyrTestCaseCount(workItem: string): Promise<number> {
  try {
    const list = await zephyrClient.searchTestCasesByLabel(workItem, PROJECT_KEY);
    return Array.isArray(list) ? list.length : 0;
  } catch (e: any) {
    return -1;
  }
}

async function getLinkedTestCaseCount(workItem: string): Promise<number> {
  try {
    const links = await jiraClient.getRemoteIssueLinks(workItem);
    const zephyrLinks = (links || []).filter(
      (link: any) => (link.globalId || '').toString().startsWith('zephyr-testcase-')
    );
    return zephyrLinks.length;
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

  console.log('Loading work items from', EXCEL_PATH, '...');
  const workItems = await loadWorkItems();
  console.log(`Found ${workItems.length} work items.\n`);

  const results: StatusRow[] = [];
  for (let i = 0; i < workItems.length; i++) {
    const { workItem, summary } = workItems[i];
    process.stdout.write(`  [${i + 1}/${workItems.length}] ${workItem} ... `);

    const [status, created, linked] = await Promise.all([
      getJiraStatus(workItem),
      getZephyrTestCaseCount(workItem),
      getLinkedTestCaseCount(workItem),
    ]);

    results.push({
      workItem,
      summary,
      status,
      testCasesCreated: created,
      testCasesLinked: linked,
    });
    console.log(`Status=${status}, Created=${created}, Linked=${linked}`);
  }

  // Console table
  console.log('\n' + '—'.repeat(120));
  console.log(
    'Work Item'.padEnd(12) +
      'Summary'.padEnd(52) +
      'Status'.padEnd(18) +
      'Test Cases Created'.padEnd(20) +
      'Test Cases Linked'
  );
  console.log('—'.repeat(120));
  for (const r of results) {
    const sum = (r.summary || '').slice(0, 50).padEnd(52);
    const st = (r.status || '—').slice(0, 16).padEnd(18);
    const cr = String(r.testCasesCreated >= 0 ? r.testCasesCreated : 'Error').padEnd(20);
    const ln = String(r.testCasesLinked >= 0 ? r.testCasesLinked : 'Error');
    console.log(`${r.workItem.padEnd(12)}${sum}${st}${cr}${ln}`);
  }
  console.log('—'.repeat(120));

  // CSV output
  if (outputPath) {
    const dir = path.dirname(outputPath);
    if (dir && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const header = 'Work Item,Summary,Status,Test Cases Created,Test Cases Linked';
    const lines = [header, ...results.map((r) => [r.workItem, r.summary, r.status, r.testCasesCreated, r.testCasesLinked].map(escapeCsv).join(','))];
    fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
    console.log(`\nWrote: ${outputPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
