#!/usr/bin/env ts-node
/**
 * Generate detailed comparison report: Field Label | Data Type | Help Text
 * (Excel/spec vs Salesforce). Checks all three for each field and outputs
 * Pass/Fail per attribute plus overall result.
 *
 * Usage:
 *   SF_USE_QA_MRD_FOR_API=true npm run report:OpportunityReadinessHelptext
 *   OPPORTUNITY_SUMMARY_EXCEL="path/to/Opportunity Summary Fields (1).xlsx" npm run report:OpportunityReadinessHelptext
 *
 * Output: reports/opportunity-readiness-helptext-summary.xlsx
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT_NAME = 'Opportunity_Readiness__c';

const EXPECTED_LABELS_EXCEL = [
  'Name of prospect',
  'Summary of deal',
  'Proposed Effective Date',
  'Business Plan Provided',
  'Business Plan Details',
  'Brief history of MGA',
  'Key people involved',
  'Historic GWP & GLR',
  'Proposed Member Commission',
  'Previous Capacity',
  'Reason for change',
  'Product Description',
  'Limits',
  'Portfolio mix',
  'Deal Currency',
  'Est. Year 1 GWP',
  'Est. Year 2 GWP',
  'Reinsurance restrictions',
  'Reinsurance restriction details',
  'Claims Solution',
  'TPA Names',
  'Member Operating Region',
  'Geographies',
  'State/Provinces',
  'Distribution clash',
  'Distribution clash details',
  'Technical result',
  'Reason for support',
  'Opportunity Summary Fields Completed By',
  'Opportunity Summary Fields Completed Date',
];

interface SfField {
  name: string;
  label: string;
  type: string;
  inlineHelpText?: string | null;
  [key: string]: any;
}

async function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<{ fields: SfField[] }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  const response = await axios.get(url, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  return response.data;
}

function normalizeLabel(s: string): string {
  return (s || '').toLowerCase().trim();
}

function normalizeHelpText(t: string): string {
  return (t || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().replace(/\s+/g, ' ');
}

/** Normalize data type for comparison (Excel may use "Text", SF uses "string", etc.) */
function normalizeType(t: string): string {
  const s = (t || '').toLowerCase().trim();
  const map: Record<string, string> = {
    text: 'string',
    'long text': 'textarea',
    'multi-line': 'textarea',
    number: 'double',
    percent: 'percent',
    percentage: 'percent',
    currency: 'currency',
    date: 'date',
    'date/time': 'datetime',
    datetime: 'datetime',
    lookup: 'reference',
    'master-detail': 'reference',
    picklist: 'picklist',
    'multi-select': 'multipicklist',
    multipicklist: 'multipicklist',
    checkbox: 'boolean',
    boolean: 'boolean',
    url: 'url',
    'hyperlink': 'url',
    email: 'email',
    phone: 'phone',
    id: 'id',
  };
  return map[s] || s;
}

interface ExcelRow {
  label: string;
  dataType: string;
  helpText: string;
}

/** Read Excel spec: columns Label (or Field Label), Data Type (or Type), Help Text (or Helptext). */
async function readExcelSpec(excelPath: string): Promise<Map<string, ExcelRow>> {
  const map = new Map<string, ExcelRow>();
  if (!fs.existsSync(excelPath)) return map;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const sheet = workbook.worksheets[0];
  if (!sheet) return map;
  const headerRow = sheet.getRow(1);
  const headers = (headerRow.values as any[]) || [];
  const getCol = (patterns: string[]): number => {
    for (let i = 1; i < headers.length; i++) {
      const h = String(headers[i] ?? '').toLowerCase();
      if (patterns.some((p) => h.includes(p))) return i;
    }
    return -1;
  };
  const labelCol = getCol(['field label', 'label', 'field name', 'name']);
  const typeCol = getCol(['data type', 'type', 'datatype', 'field type']);
  const helpCol = getCol(['help text', 'helptext', 'help', 'inline help', 'description']);
  if (labelCol < 1) return map;
  const maxRow = Math.max(sheet.rowCount || 0, 80);
  for (let rowNum = 2; rowNum <= maxRow; rowNum++) {
    const row = sheet.getRow(rowNum);
    const values = (row.values as any[]) || [];
    const label = String(values[labelCol] ?? '').trim();
    if (!label) continue;
    map.set(normalizeLabel(label), {
      label,
      dataType: typeCol >= 1 ? String(values[typeCol] ?? '').trim() : '',
      helpText: helpCol >= 1 ? String(values[helpCol] ?? '').trim() : '',
    });
  }
  return map;
}

const LABEL_ALIASES: Record<string, string> = {
  'deal currency': 'currency iso code',
  'opportunity summary fields completed by': 'summary fields completed by',
  'opportunity summary fields completed date': 'summary fields completed date',
};

async function main(): Promise<void> {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) dotenv.config({ path: envFile, override: true });

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);

  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  const data = await describeObject(auth.accessToken, auth.instanceUrl, OBJECT_NAME);
  const fields: SfField[] = data.fields || [];

  const dataExcelDir = path.join(process.cwd(), 'data', 'excel');
  let excelPath = process.env.OPPORTUNITY_SUMMARY_EXCEL || '';
  if (!excelPath || !fs.existsSync(excelPath)) {
    const names = ['Opportunity Summary Fields (1).xlsx', 'Opportunity Summary Fields.xlsx', 'Opportunity Summary fields.xlsx', 'OpportunitySummaryFields.xlsx'];
    for (const n of names) {
      const p = path.join(dataExcelDir, n);
      if (fs.existsSync(p)) {
        excelPath = p;
        break;
      }
    }
    if (!excelPath && fs.existsSync(dataExcelDir)) {
      const files = fs.readdirSync(dataExcelDir).filter((f) => /\.xlsx?$/i.test(f) && (f.toLowerCase().includes('opportunity') || f.toLowerCase().includes('summary')));
      if (files.length > 0) excelPath = path.join(dataExcelDir, files[0]);
    }
    if (!excelPath) excelPath = path.join(dataExcelDir, 'Opportunity Summary Fields (1).xlsx');
  }
  const excelSpec = await readExcelSpec(excelPath);
  if (excelSpec.size > 0) {
    console.log('✅ Loaded', excelSpec.size, 'rows from Excel spec:', excelPath);
  } else if (fs.existsSync(excelPath)) {
    console.warn('⚠️  Excel found but no Label/Type/Help Text columns detected. Expected columns: Field Label (or Label), Data Type (or Type), Help Text (or Helptext).');
  } else {
    console.warn('⚠️  Excel not found in data/excel. Place "Opportunity Summary Fields (1).xlsx" in', dataExcelDir, 'or set OPPORTUNITY_SUMMARY_EXCEL.');
  }

  const sfByLabel = new Map<string, SfField>();
  for (const f of fields) {
    sfByLabel.set(normalizeLabel(f.label), f);
  }

  interface ReportRow {
    expectedLabel: string;
    sfLabel: string;
    labelResult: string;
    excelType: string;
    sfType: string;
    typeResult: string;
    excelHelp: string;
    sfHelp: string;
    helpResult: string;
    overall: string;
    notes: string;
  }

  const reportRows: ReportRow[] = [];
  for (const expectedLabel of EXPECTED_LABELS_EXCEL) {
    const norm = normalizeLabel(expectedLabel);
    const excelRow = excelSpec.get(norm) ?? excelSpec.get(expectedLabel);
    const excelLabel = excelRow?.label ?? expectedLabel;
    const excelType = excelRow?.dataType ?? '';
    const excelHelp = excelRow?.helpText ?? '';

    let sfField: SfField | undefined = sfByLabel.get(norm);
    if (!sfField && LABEL_ALIASES[norm]) {
      sfField = sfByLabel.get(LABEL_ALIASES[norm]);
    }
    const sfLabel = sfField?.label ?? '';
    const sfType = sfField?.type ?? '';
    const sfHelp = (sfField?.inlineHelpText ?? '').trim();

    const labelMatch = !sfLabel
      ? 'Fail'
      : normalizeLabel(sfLabel) === norm || normalizeLabel(sfLabel) === normalizeLabel(expectedLabel)
        ? 'Pass'
        : 'Fail';
    const typeNormExcel = normalizeType(excelType);
    const typeNormSf = normalizeType(sfType);
    const typeMatch =
      !excelType && !sfType
        ? 'N/A'
        : !excelType
          ? 'N/A'
          : typeNormExcel === typeNormSf
            ? 'Pass'
            : 'Fail';
    const helpNormExcel = normalizeHelpText(excelHelp);
    const helpNormSf = normalizeHelpText(sfHelp);
    const helpMatch =
      !excelHelp && !sfHelp
        ? 'N/A'
        : !excelHelp
          ? 'N/A'
          : helpNormExcel === helpNormSf
            ? 'Pass'
            : 'Fail';

    const anyFail = labelMatch === 'Fail' || typeMatch === 'Fail' || helpMatch === 'Fail';
    const overall = !sfField ? 'Fail' : anyFail ? 'Fail' : 'Pass';

    const notes: string[] = [];
    if (labelMatch === 'Fail' && sfLabel) notes.push(`Label: expected "${expectedLabel}" vs SF "${sfLabel}"`);
    if (typeMatch === 'Fail' && excelType && sfType) notes.push(`Type: expected "${excelType}" vs SF "${sfType}"`);
    if (helpMatch === 'Fail' && (excelHelp || sfHelp)) notes.push('Help text differs');

    reportRows.push({
      expectedLabel: excelLabel,
      sfLabel,
      labelResult: labelMatch,
      excelType,
      sfType,
      typeResult: typeMatch,
      excelHelp,
      sfHelp,
      helpResult: helpMatch,
      overall,
      notes: notes.join('; '),
    });
  }

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, 'opportunity-readiness-helptext-summary.xlsx');

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Field Comparison', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = [
    { header: 'Label (Expected / Excel)', key: 'expectedLabel', width: 42 },
    { header: 'Field Label (Salesforce)', key: 'sfLabel', width: 42 },
    { header: 'Label Result', key: 'labelResult', width: 10 },
    { header: 'Data Type (Expected / Excel)', key: 'excelType', width: 22 },
    { header: 'Data Type (Salesforce)', key: 'sfType', width: 22 },
    { header: 'Data Type Result', key: 'typeResult', width: 14 },
    { header: 'Help Text (Expected / Excel)', key: 'excelHelp', width: 55 },
    { header: 'Help Text (Salesforce)', key: 'sfHelp', width: 55 },
    { header: 'Help Text Result', key: 'helpResult', width: 14 },
    { header: 'Overall Result', key: 'overall', width: 12 },
    { header: 'Notes', key: 'notes', width: 50 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { wrapText: true };
  for (const r of reportRows) {
    sheet.addRow({
      expectedLabel: r.expectedLabel,
      sfLabel: r.sfLabel,
      labelResult: r.labelResult,
      excelType: r.excelType,
      sfType: r.sfType,
      typeResult: r.typeResult,
      excelHelp: r.excelHelp,
      sfHelp: r.sfHelp,
      helpResult: r.helpResult,
      overall: r.overall,
      notes: r.notes,
    });
  }
  const yellowFill = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFF00' } };
  for (let i = 0; i < reportRows.length; i++) {
    if (reportRows[i].overall === 'Fail') {
      const row = sheet.getRow(i + 2);
      row.eachCell((cell) => { cell.fill = yellowFill; });
    }
  }
  await workbook.xlsx.writeFile(outPath);

  const passOverall = reportRows.filter((r) => r.overall === 'Pass').length;
  const failOverall = reportRows.filter((r) => r.overall === 'Fail').length;
  const labelPass = reportRows.filter((r) => r.labelResult === 'Pass').length;
  const typePass = reportRows.filter((r) => r.typeResult === 'Pass').length;
  const typeNa = reportRows.filter((r) => r.typeResult === 'N/A').length;
  const helpPass = reportRows.filter((r) => r.helpResult === 'Pass').length;
  const helpNa = reportRows.filter((r) => r.helpResult === 'N/A').length;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  Opportunity Readiness – Detailed Field Comparison Report');
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Output:', outPath);
  console.log('  Overall: Pass', passOverall, '| Fail', failOverall);
  console.log('  Label:  Pass', labelPass, '/', reportRows.length);
  console.log('  Type:   Pass', typePass, '| N/A', typeNa, '| Fail', reportRows.length - typePass - typeNa);
  console.log('  Help:   Pass', helpPass, '| N/A', helpNa, '| Fail', reportRows.length - helpPass - helpNa);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
}

main().catch((err: any) => {
  console.error(err);
  process.exit(1);
});
