#!/usr/bin/env ts-node
/**
 * Read the latest DD-Tasks-Field-Validation report and output bug-report text
 * for each section that has failures (one bug per section, copy-paste ready).
 */

import * as path from 'path';
import * as fs from 'fs';
import ExcelJS from 'exceljs';

const REPORTS_DIR = path.join(process.cwd(), 'reports');
const REPORT_PREFIX = 'DD-Tasks-Field-Validation-';

interface FailRow {
  section: string;
  confirmationFlagTopic: string;
  flagType: string;
  mandatory: string;
  region: string;
  inApi: string;
  apiName: string;
  passFail: string;
  notes: string;
}

async function main(): Promise<void> {
  const files = fs.readdirSync(REPORTS_DIR).filter((f) => f.startsWith(REPORT_PREFIX) && f.endsWith('.xlsx'));
  if (files.length === 0) {
    console.error('No DD-Tasks-Field-Validation report found in reports/. Run: npm run validate:DDTasks');
    process.exit(1);
  }
  files.sort().reverse();
  const reportPath = path.join(REPORTS_DIR, files[0]);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(reportPath);
  const detailWs = wb.getWorksheet('Detail');
  if (!detailWs) {
    console.error('No "Detail" sheet in report.');
    process.exit(1);
  }
  const rows: FailRow[] = [];
  detailWs.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const passFail = (row.getCell(8)?.value ?? '').toString().trim();
    if (passFail !== 'Fail') return;
    rows.push({
      section: (row.getCell(1)?.value ?? '').toString().trim(),
      confirmationFlagTopic: (row.getCell(2)?.value ?? '').toString().trim(),
      flagType: (row.getCell(3)?.value ?? '').toString().trim(),
      mandatory: (row.getCell(4)?.value ?? '').toString().trim(),
      region: (row.getCell(5)?.value ?? '').toString().trim(),
      inApi: (row.getCell(6)?.value ?? '').toString().trim(),
      apiName: (row.getCell(7)?.value ?? '').toString().trim(),
      passFail,
      notes: (row.getCell(9)?.value ?? '').toString().trim(),
    });
  });
  const bySection = new Map<string, FailRow[]>();
  for (const r of rows) {
    const list = bySection.get(r.section) || [];
    list.push(r);
    bySection.set(r.section, list);
  }
  const sectionOrder = ['Actuary', 'Claims', 'Compliance', 'Finance', 'IT Security', 'Operations', 'Underwriting'];
  console.log('Source report: ' + reportPath + '\n');
  console.log('═'.repeat(80));
  for (const section of sectionOrder) {
    const fails = bySection.get(section) || [];
    if (fails.length === 0) continue;
    console.log('\n## BUG: Due Diligence – ' + section + ' section – Missing/incorrect fields on Opportunity Readiness\n');
    console.log('**Summary**');
    console.log('The following required DD Tasks (Confirmation Flag Topics) from the ' + section + ' DD Tasks specification are not implemented on Opportunity_Readiness__c (no matching field label found via API describe).');
    console.log('');
    console.log('**Object:** Opportunity_Readiness__c');
    console.log('**Source:** data/excel/' + section + ' DD Tasks.xlsx');
    console.log('**Validation:** API describe vs Excel "Confirmation Flag Topic" column (field label match).');
    console.log('');
    console.log('**Failed checks (' + fails.length + '):**');
    console.log('');
    fails.forEach((f, i) => {
      console.log((i + 1) + '. **' + f.confirmationFlagTopic + '**');
      if (f.flagType) console.log('   - Flag type: ' + f.flagType);
      if (f.mandatory) console.log('   - Mandatory/Non-Mandatory: ' + f.mandatory);
      if (f.region) console.log('   - Region: ' + f.region);
      console.log('   - Notes: ' + (f.notes || 'No matching field label in describe'));
      console.log('');
    });
    console.log('**Steps to verify**');
    console.log('1. Setup → Object Manager → Opportunity Readiness → Fields & Relationships.');
    console.log('2. Confirm whether a field exists whose Label matches each item above.');
    console.log('3. If missing, create the field (or align label with spec).');
    console.log('');
    console.log('─'.repeat(80));
  }
  console.log('\nDone. Copy each "## BUG" block into your issue tracker (one bug per section).\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
