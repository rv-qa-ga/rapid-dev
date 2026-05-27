#!/usr/bin/env ts-node
/**
 * Validate Due Diligence (DD) Tasks fields on Opportunity_Readiness__c via Salesforce API.
 *
 * Reads requirements from data/excel/* DD Tasks.xlsx (Actuary, Claims, Compliance,
 * Finance, IT Security, Operations, Underwriting). Each sheet has: Team, Confirmation Flag
 * Topic, Flag Type, Mandatory/Non-Mandatory, Region. For each "Confirmation Flag Topic"
 * we check that a field exists on Opportunity_Readiness__c (by label match). Produces
 * an Excel report with pass/fail per check per section.
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/validate-dd-tasks-fields.ts
 *   SF_USE_QA_MRD_FOR_API=true npm run validate:DDTasks
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT_NAME = 'Opportunity_Readiness__c';
const EXCEL_DIR = path.join(process.cwd(), 'data', 'excel');
const DD_FILES = [
  'Actuary DD Tasks.xlsx',
  'Claims DD Tasks.xlsx',
  'Compliance DD Tasks.xlsx',
  'Finance DD Tasks.xlsx',
  'IT Security DD Tasks.xlsx',
  'Operations DD Tasks.xlsx',
  'Underwriting DD Tasks.xlsx',
];

interface SfField {
  name: string;
  label: string;
  type: string;
  nillable?: boolean;
  [key: string]: any;
}

interface DDRequirement {
  section: string;
  confirmationFlagTopic: string;
  flagType: string;
  mandatory: string;
  region: string;
  sourceRow: number;
}

interface CheckResult {
  section: string;
  confirmationFlagTopic: string;
  flagType: string;
  mandatory: string;
  region: string;
  sourceRow: number;
  inApi: boolean;
  apiName: string;
  pass: boolean;
  notes: string;
}

function normalizeLabel(s: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<{ fields: SfField[] }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }).then((r) => r.data);
}

function findFieldByTopic(fields: SfField[], topic: string): { field: SfField; notes: string } | null {
  const normTopic = normalizeLabel(topic);
  if (!normTopic) return null;
  const exact = fields.find((f) => normalizeLabel(f.label) === normTopic);
  if (exact) return { field: exact, notes: 'Exact label match' };
  const contains = fields.find((f) => normalizeLabel(f.label).includes(normTopic) || normTopic.includes(normalizeLabel(f.label)));
  if (contains) return { field: contains, notes: 'Partial label match' };
  return null;
}

async function loadDDRequirements(): Promise<DDRequirement[]> {
  const requirements: DDRequirement[] = [];
  for (const fileName of DD_FILES) {
    const filePath = path.join(EXCEL_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      continue;
    }
    const section = fileName.replace(/\s*DD Tasks\.xlsx$/i, '').trim();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const sheet = workbook.worksheets[0] || workbook.getWorksheet(1);
    if (!sheet) continue;
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (cell: any, col: number) => {
      headers[col - 1] = (cell.value ?? '').toString().trim();
    });
    const topicCol = headers.findIndex((h) => /Confirmation Flag Topic/i.test(h));
    const flagTypeCol = headers.findIndex((h) => /Flag Type/i.test(h));
    const mandatoryCol = headers.findIndex((h) => /Mandatory/i.test(h));
    const regionCol = headers.findIndex((h) => /Region/i.test(h));
    if (topicCol === -1) {
      console.warn(`⚠️  No "Confirmation Flag Topic" column in ${fileName}`);
      continue;
    }
    const getCell = (row: ExcelJS.Row, colIndex: number): string => {
      if (colIndex < 0) return '';
      const cell = row.getCell(colIndex + 1);
      const v = cell?.value;
      if (v == null) return '';
      return typeof v === 'string' ? v.trim() : String(v).trim();
    };
    sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
      if (rowNumber === 1) return;
      const topic = getCell(row, topicCol);
      if (!topic) return;
      requirements.push({
        section,
        confirmationFlagTopic: topic,
        flagType: flagTypeCol >= 0 ? getCell(row, flagTypeCol) : '',
        mandatory: mandatoryCol >= 0 ? getCell(row, mandatoryCol) : '',
        region: regionCol >= 0 ? getCell(row, regionCol) : '',
        sourceRow: rowNumber,
      });
    });
  }
  return requirements;
}

const COLORS = {
  HEADER_BG: 'FF0B5394',
  HEADER_FONT: 'FFFFFFFF',
  PASS_BG: 'FFC6EFCE',
  PASS_FONT: 'FF006100',
  FAIL_BG: 'FFFFC7CE',
  FAIL_FONT: 'FF9C0006',
};

function styleHeaderRow(ws: ExcelJS.Worksheet): void {
  const row = ws.getRow(1);
  row.font = { bold: true, size: 11, color: { argb: COLORS.HEADER_FONT } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
  row.alignment = { vertical: 'middle', wrapText: true };
}

async function writeReport(results: CheckResult[], outputPath: string): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DD Tasks Field Validation (Opportunity_Readiness__c API)';
  wb.created = new Date();

  const bySection = new Map<string, CheckResult[]>();
  for (const r of results) {
    const list = bySection.get(r.section) || [];
    list.push(r);
    bySection.set(r.section, list);
  }

  const summaryRows: Array<{ section: string; total: number; pass: number; fail: number; status: string }> = [];
  for (const [section, list] of bySection) {
    const pass = list.filter((r) => r.pass).length;
    const fail = list.filter((r) => !r.pass).length;
    summaryRows.push({
      section,
      total: list.length,
      pass,
      fail,
      status: fail === 0 ? 'PASS' : 'FAIL',
    });
  }
  const totalChecks = results.length;
  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.filter((r) => !r.pass).length;

  const summaryWs = wb.addWorksheet('Summary');
  summaryWs.addRow(['DD Tasks — Field validation vs Opportunity_Readiness__c (API describe)']);
  summaryWs.addRow([]);
  summaryWs.addRow(['Generated', new Date().toISOString()]);
  summaryWs.addRow(['Object', OBJECT_NAME]);
  summaryWs.addRow(['Source', 'data/excel/* DD Tasks.xlsx']);
  summaryWs.addRow([]);
  summaryWs.addRow(['Section', 'Total checks', 'Pass', 'Fail', 'Status']);
  const tableHeaderRow = summaryWs.lastRow;
  if (tableHeaderRow) {
    tableHeaderRow.font = { bold: true, size: 11, color: { argb: COLORS.HEADER_FONT } };
    tableHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
  }
  for (const s of summaryRows) {
    const row = summaryWs.addRow([s.section, s.total, s.pass, s.fail, s.status]);
    if (s.status === 'FAIL') {
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FAIL_BG } };
      row.getCell(5).font = { color: { argb: COLORS.FAIL_FONT } };
    } else {
      row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PASS_BG } };
      row.getCell(5).font = { color: { argb: COLORS.PASS_FONT } };
    }
  }
  summaryWs.addRow([]);
  summaryWs.addRow(['Overall', totalChecks, totalPass, totalFail, totalFail === 0 ? 'PASS' : 'FAIL']);
  summaryWs.getColumn(1).width = 22;
  summaryWs.getColumn(2).width = 14;
  summaryWs.getColumn(3).width = 10;
  summaryWs.getColumn(4).width = 10;
  summaryWs.getColumn(5).width = 10;

  const detailWs = wb.addWorksheet('Detail');
  detailWs.columns = [
    { header: 'Section', key: 'section', width: 18 },
    { header: 'Confirmation Flag Topic', key: 'confirmationFlagTopic', width: 50 },
    { header: 'Flag Type', key: 'flagType', width: 32 },
    { header: 'Mandatory/Non-Mandatory', key: 'mandatory', width: 22 },
    { header: 'Region', key: 'region', width: 12 },
    { header: 'In API', key: 'inApi', width: 8 },
    { header: 'API Name', key: 'apiName', width: 42 },
    { header: 'Pass/Fail', key: 'passFail', width: 10 },
    { header: 'Notes', key: 'notes', width: 24 },
  ];
  styleHeaderRow(detailWs);
  for (const r of results) {
    const row = detailWs.addRow({
      section: r.section,
      confirmationFlagTopic: r.confirmationFlagTopic,
      flagType: r.flagType,
      mandatory: r.mandatory,
      region: r.region,
      inApi: r.inApi ? 'Yes' : 'No',
      apiName: r.apiName || '',
      passFail: r.pass ? 'Pass' : 'Fail',
      notes: r.notes || '',
    });
    const passFailCol = 8;
    if (r.pass) {
      row.getCell(passFailCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.PASS_BG } };
      row.getCell(passFailCol).font = { color: { argb: COLORS.PASS_FONT } };
    } else {
      row.getCell(passFailCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.FAIL_BG } };
      row.getCell(passFailCol).font = { color: { argb: COLORS.FAIL_FONT } };
    }
  }
  detailWs.views = [{ state: 'frozen', ySplit: 1 }];
  detailWs.autoFilter = { from: 'A1', to: `I${detailWs.rowCount}` };

  await wb.xlsx.writeFile(outputPath);
}

async function main(): Promise<void> {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
    console.log(`[OK] Loaded ${envFile}\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  DD Tasks — Validate fields via API (Opportunity_Readiness__c describe)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);
  if (apiUser) console.log(`🔐 Using JWT user: ${apiUser}\n`);

  console.log('📖 Loading requirements from data/excel/* DD Tasks.xlsx...');
  const requirements = await loadDDRequirements();
  console.log(`   Loaded ${requirements.length} requirements across ${new Set(requirements.map((r) => r.section)).size} sections.\n`);

  console.log('🔐 Authenticating with Salesforce (JWT)...');
  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  console.log('   ✅ Authenticated\n');

  console.log(`📡 Describing ${OBJECT_NAME}...`);
  const describeData = await describeObject(auth.accessToken, auth.instanceUrl, OBJECT_NAME);
  const fields: SfField[] = describeData.fields || [];
  console.log(`   ✅ ${fields.length} fields returned.\n`);

  const results: CheckResult[] = [];
  for (const req of requirements) {
    const found = findFieldByTopic(fields, req.confirmationFlagTopic);
    const inApi = !!found;
    const apiName = found?.field.name ?? '';
    const pass = inApi;
    const notes = found?.notes ?? (inApi ? '' : 'No matching field label in describe');
    results.push({
      ...req,
      inApi,
      apiName,
      pass,
      notes,
    });
  }

  const bySection = new Map<string, CheckResult[]>();
  for (const r of results) {
    const list = bySection.get(r.section) || [];
    list.push(r);
    bySection.set(r.section, list);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Results by section');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  for (const [section, list] of bySection) {
    const pass = list.filter((r) => r.pass).length;
    const fail = list.filter((r) => !r.pass).length;
    const status = fail === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${section}: ${pass}/${list.length} pass, ${fail} fail — ${status}`);
  }
  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.filter((r) => !r.pass).length;
  console.log('\n' + '─'.repeat(60));
  console.log(`  Overall: ${totalPass}/${results.length} checks passed, ${totalFail} failed`);
  console.log(`  RESULT: ${totalFail === 0 ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const reportPath = path.join(reportDir, `DD-Tasks-Field-Validation-${timestamp}.xlsx`);
  console.log(`📊 Writing report: ${reportPath}`);
  await writeReport(results, reportPath);
  console.log('   ✅ Done.\n');
}

main().catch((err: any) => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
