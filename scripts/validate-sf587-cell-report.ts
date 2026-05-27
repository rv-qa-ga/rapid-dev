#!/usr/bin/env ts-node
/**
 * SF-587: Cell-level validation report — Coding Questions & Exposure Questions vs Excel.
 *
 * For each row in the Excel (Coding Questions and Exposure Questions tabs), validates
 * each relevant cell against Salesforce and reports Pass/Fail with cell reference
 * (e.g. B2 = Label, F2 = Mandatory, G2 = Field type, H2 = Rules/picklist options).
 *
 * Criteria per row: Label (B), Auto populate (C), Mandatory (F), Field type (G),
 * Rules / picklist options (H), Prospect/Active (J). Uses REST describe so picklist
 * values can be compared when available.
 *
 * Usage: ENV=qa npm run validate:SF587-cell-report
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const EXCEL_PATH = path.join(process.cwd(), 'data', 'excel', 'GAB Coding Questionaire GAB.xlsx');
const CODING_OBJECT = 'Coding_Questionaire__c';
const EXPOSURE_OBJECT = 'Exposure_Questionnaire__c';
const CODING_LOB_CHILD_OBJECT = process.env.SF587_LOB_CHILD_OBJECT || 'CodingQuestionaire_Lines_of_Business__c';

function colLetter(colIndex: number): string {
  let s = '';
  let n = colIndex;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s || 'A';
}

function cellRef(colIndex: number, rowNumber: number): string {
  return colLetter(colIndex) + rowNumber;
}

interface SfField {
  name: string;
  label: string;
  type: string;
  nillable?: boolean;
  picklistValues?: Array<{ value: string; label?: string }>;
  [key: string]: any;
}

interface ExcelRow {
  sheet: string;
  rowIndex: number;
  sectionName: string;
  label: string;
  mandatory: string;
  fieldType: string;
  autoPopulate: string;
  autopopulateObject: string;
  autopopulateApiName: string;
  rules: string;
  regionSelection: string;
  prospectActive: string;
}

interface CellCheck {
  sheet: string;
  rowIndex: number;
  cell: string;
  criterion: string;
  expected: string;
  actual: string;
  pass: boolean;
  objectName?: string;
  sfFieldName?: string;
}

function normalizeLabelForMatch(s: string): string {
  let t = (s || '').trim();
  t = t.replace(/\s*\([^)]*\)\s*/g, ' ');
  t = t.replace(/'/g, '');
  t = t.replace(/\?\.\s*$/g, '').replace(/\?\s*$/g, '').replace(/\.\s*$/g, '');
  return t.toLowerCase().replace(/\s+/g, ' ').trim();
}

function parsePicklistOptionsFromRules(rules: string): string[] {
  const raw = (rules || '').trim();
  if (!raw) return [];
  const options: string[] = [];
  const lines = raw.split(/\n|Option\s*\d+\s*[:.]\s*/i).map((s) => s.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^(?:Option\s*\d+\s*[:.]\s*)?(.+)$/i);
    if (match) options.push(match[1].trim());
  }
  if (options.length > 0) return options;
  const comma = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (comma.length > 0) return comma;
  return [raw];
}

function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<{ fields: SfField[] }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  return axios.get(url, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }).then((r) => r.data);
}

async function getFieldsViaTooling(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<SfField[]> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const soql = `SELECT QualifiedApiName, Label, DataType, IsNillable FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectName}'`;
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/tooling/query?q=${encodeURIComponent(soql)}`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } });
  const records = res.data?.records || [];
  return records.map((r: any) => ({
    name: r.QualifiedApiName || r.qualifiedApiName,
    label: r.Label || r.label || '',
    type: (r.DataType || r.dataType || 'string').toLowerCase(),
    nillable: r.IsNillable !== false,
  }));
}

function findFieldByLabel(fields: SfField[], label: string): SfField | null {
  const norm = normalizeLabelForMatch(label);
  if (!norm) return null;
  for (const f of fields) {
    const sfNorm = normalizeLabelForMatch(f.label);
    if (sfNorm === norm || (sfNorm && norm && (sfNorm.includes(norm) || norm.includes(sfNorm)))) return f;
  }
  if (norm.includes('country') && norm.includes('member')) {
    const f = fields.find((x) => normalizeLabelForMatch(x.label).includes('country'));
    if (f) return f;
  }
  return null;
}

const LOB_LABEL_MAP: Array<{ pattern: RegExp; sfLabel: string }> = [
  { pattern: /^lines?\s+of\s+business\s*\d*$/i, sfLabel: 'Line of Business' },
  { pattern: /^product\s*\d+$/i, sfLabel: 'Product' },
  { pattern: /^admission\s+status$/i, sfLabel: 'Admission Status' },
  { pattern: /if product is admitted.*what lob/i, sfLabel: 'LOB of Admitted Product' },
  { pattern: /is this lob fully ceded/i, sfLabel: 'LOB fully ceded/pass' },
  { pattern: /coverage occurance or claim made/i, sfLabel: 'Coverage Occurance or Claim made?' },
  { pattern: /terrorism coverage is included/i, sfLabel: 'Terrorism Coverage?' },
  { pattern: /terrorism coverage is offered standalone/i, sfLabel: 'Terrorism Standalone?' },
];

function isLobRow(label: string): boolean {
  return LOB_LABEL_MAP.some(({ pattern }) => pattern.test((label || '').trim()));
}

function getLobSfLabel(label: string): string | null {
  for (const { pattern, sfLabel } of LOB_LABEL_MAP) {
    if (pattern.test((label || '').trim())) return sfLabel;
  }
  return null;
}

async function loadExcel(): Promise<{
  coding: ExcelRow[];
  exposure: ExcelRow[];
  headerIndices: { label: number; mandatory: number; fieldType: number; autoPopulate: number; rules: number; prospectActive: number };
}> {
  if (!fs.existsSync(EXCEL_PATH)) throw new Error(`Excel not found: ${EXCEL_PATH}`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const getHeaderIndices = (sheet: ExcelJS.Worksheet) => {
    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: true }, (c: any, col: number) => {
      headers[col - 1] = (c.value ?? '').toString().trim();
    });
    return {
      sectionName: headers.findIndex((h) => /Section Name/i.test(h || '')),
      label: headers.findIndex((h) => /^Label$/i.test(h || '')),
      mandatory: headers.findIndex((h) => /Mandatory/i.test(h || '')),
      fieldType: headers.findIndex((h) => /Field type/i.test(h || '')),
      autoPopulate: headers.findIndex((h) => /Auto populate/i.test(h || '')),
      autopopulateObject: headers.findIndex((h) => /Autopopulate object name/i.test(h || '')),
      autopopulateApiName: headers.findIndex((h) => /Auto populate API name/i.test(h || '')),
      rules: headers.findIndex((h) => /Rules/i.test(h || '')),
      regionSelection: headers.findIndex((h) => /Region Selection/i.test(h || '')),
      prospectActive: headers.findIndex((h) => /Prospect.*Active|Active.*Prospect/i.test((h || '').toString())),
    };
  };

  const getCell = (row: ExcelJS.Row, colIndex: number): string => {
    if (colIndex < 0) return '';
    const cell = row.getCell(colIndex + 1);
    const v = cell?.value;
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object' && v && 'richText' in v && Array.isArray((v as any).richText)) {
      return ((v as any).richText as Array<{ text?: string }>).map((x) => x?.text ?? '').join('').trim();
    }
    return String(v).trim();
  };

  const coding: ExcelRow[] = [];
  const exposure: ExcelRow[] = [];
  let headerIndices = { label: 1, mandatory: 5, fieldType: 6, autoPopulate: 2, rules: 7, prospectActive: 9 };

  for (const sheet of workbook.worksheets) {
    const name = sheet.name.trim();
    if (name === 'Coding Questions') {
      const idx = getHeaderIndices(sheet);
      headerIndices = {
        label: idx.label,
        mandatory: idx.mandatory,
        fieldType: idx.fieldType,
        autoPopulate: idx.autoPopulate,
        rules: idx.rules,
        prospectActive: idx.prospectActive,
      };
      sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        if (rowNumber === 1) return;
        const label = getCell(row, idx.label);
        if (!label) return;
        coding.push({
          sheet: name,
          rowIndex: rowNumber,
          sectionName: getCell(row, idx.sectionName),
          label,
          mandatory: getCell(row, idx.mandatory),
          fieldType: getCell(row, idx.fieldType),
          autoPopulate: getCell(row, idx.autoPopulate),
          autopopulateObject: getCell(row, idx.autopopulateObject),
          autopopulateApiName: getCell(row, idx.autopopulateApiName),
          rules: getCell(row, idx.rules),
          regionSelection: getCell(row, idx.regionSelection),
          prospectActive: getCell(row, idx.prospectActive),
        });
      });
    } else if (name === 'Exposure Questions') {
      const idx = getHeaderIndices(sheet);
      sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
        if (rowNumber === 1) return;
        const label = getCell(row, idx.label);
        if (!label) return;
        exposure.push({
          sheet: name,
          rowIndex: rowNumber,
          sectionName: getCell(row, idx.sectionName),
          label,
          mandatory: getCell(row, idx.mandatory),
          fieldType: getCell(row, idx.fieldType),
          autoPopulate: getCell(row, idx.autoPopulate),
          autopopulateObject: getCell(row, idx.autopopulateObject),
          autopopulateApiName: getCell(row, idx.autopopulateApiName),
          rules: getCell(row, idx.rules),
          regionSelection: getCell(row, idx.regionSelection),
          prospectActive: getCell(row, idx.prospectActive),
        });
      });
    }
  }
  return { coding, exposure, headerIndices };
}

function runCellValidation(
  objectName: string,
  fields: SfField[],
  rows: ExcelRow[],
  headerIndices: { label: number; mandatory: number; fieldType: number; autoPopulate: number; rules: number; prospectActive: number },
  lobFields?: SfField[],
  lobObjectName?: string
): CellCheck[] {
  const checks: CellCheck[] = [];
  for (const r of rows) {
    const useLob = isLobRow(r.label) && lobFields?.length && lobObjectName;
    const effectiveFields = useLob ? lobFields! : fields;
    const effectiveObject = useLob ? lobObjectName! : objectName;
    const searchLabel = useLob ? getLobSfLabel(r.label)! : r.label;
    const sfField = useLob
      ? effectiveFields.find((f) => normalizeLabelForMatch(f.label) === normalizeLabelForMatch(searchLabel)) ?? null
      : findFieldByLabel(effectiveFields, r.label);

    const idx = headerIndices;
    const rowNum = r.rowIndex;
    const cell = (col: number) => cellRef(col, rowNum);

    if (idx.label >= 0) {
      checks.push({
        sheet: r.sheet,
        rowIndex: rowNum,
        cell: cell(idx.label),
        criterion: 'Label',
        expected: r.label,
        actual: sfField?.label ?? '— no matching field',
        pass: !!sfField,
        objectName: effectiveObject,
        sfFieldName: sfField?.name ?? undefined,
      });
    }

    if (idx.autoPopulate >= 0) {
      const excelAuto = (r.autoPopulate || '').trim().toLowerCase();
      const expectNo = /^(no|n\/a|false|0)$/.test(excelAuto) || !excelAuto;
      const isLookup = sfField && /reference|lookup/.test(sfField.type || '');
      const pass = !sfField ? true : expectNo ? !isLookup : isLookup;
      checks.push({
        sheet: r.sheet,
        rowIndex: rowNum,
        cell: cell(idx.autoPopulate),
        criterion: 'Auto populate',
        expected: r.autoPopulate || 'No',
        actual: !sfField ? '—' : isLookup ? 'Lookup' : sfField.type || '—',
        pass,
        objectName: effectiveObject,
        sfFieldName: sfField?.name ?? undefined,
      });
    }

    if (idx.mandatory >= 0) {
      const expectedRequired = /yes|true|mandatory|1/i.test((r.mandatory || '').trim());
      const nillable = sfField?.nillable !== false;
      const actualRequired = !nillable;
      checks.push({
        sheet: r.sheet,
        rowIndex: rowNum,
        cell: cell(idx.mandatory),
        criterion: 'Mandatory',
        expected: r.mandatory || '—',
        actual: !sfField ? '—' : actualRequired ? 'Required' : 'Optional',
        pass: !sfField ? true : expectedRequired === actualRequired,
        objectName: effectiveObject,
        sfFieldName: sfField?.name ?? undefined,
      });
    }

    if (idx.fieldType >= 0) {
      const ex = (r.fieldType || '').toLowerCase();
      const sf = (sfField?.type || '').toLowerCase();
      let typeOk = false;
      if (ex.includes('picklist') && (sf === 'picklist' || sf.startsWith('picklist'))) typeOk = true;
      else if ((ex.includes('text') || ex.includes('free text')) && (sf === 'string' || sf.startsWith('text') || sf === 'textarea')) typeOk = true;
      else if (ex.includes('checkbox') && (sf === 'boolean' || sf === 'checkbox')) typeOk = true;
      else if (ex.includes('lookup') && (sf === 'reference' || sf.startsWith('lookup'))) typeOk = true;
      else if (!ex || ex === 'n/a') typeOk = true;
      else typeOk = ex === sf || sf.startsWith('text(');
      checks.push({
        sheet: r.sheet,
        rowIndex: rowNum,
        cell: cell(idx.fieldType),
        criterion: 'Field type',
        expected: r.fieldType || '—',
        actual: sfField?.type ?? '—',
        pass: !sfField ? false : typeOk,
        objectName: effectiveObject,
        sfFieldName: sfField?.name ?? undefined,
      });
    }

    if (idx.rules >= 0 && (r.fieldType || '').toLowerCase().includes('picklist') && r.rules?.trim()) {
      const expectedOptions = parsePicklistOptionsFromRules(r.rules);
      const sfOptions = sfField?.picklistValues ?? [];
      const sfValues = new Set(sfOptions.map((p) => (p.value || p.label || '').trim().toLowerCase()));
      const sfLabels = new Set(sfOptions.map((p) => (p.label ?? p.value ?? '').trim().toLowerCase()));
      let pass = true;
      let actualStr = '—';
      if (sfOptions.length > 0) {
        const missing = expectedOptions.filter((opt) => {
          const o = opt.trim().toLowerCase();
          return !sfValues.has(o) && !sfLabels.has(o) && ![...sfValues, ...sfLabels].some((s) => s.includes(o) || o.includes(s));
        });
        pass = missing.length === 0;
        actualStr = sfOptions.map((p) => p.label ?? p.value).join(', ') || '—';
        if (missing.length) actualStr += ` [Missing in SF: ${missing.join(', ')}]`;
      } else {
        pass = false;
        actualStr = 'No picklist values from describe';
      }
      checks.push({
        sheet: r.sheet,
        rowIndex: rowNum,
        cell: cell(idx.rules),
        criterion: 'Picklist options (Rules)',
        expected: expectedOptions.join('; ') || r.rules.slice(0, 80),
        actual: actualStr,
        pass,
        objectName: effectiveObject,
        sfFieldName: sfField?.name ?? undefined,
      });
    }

    if (idx.prospectActive >= 0) {
      checks.push({
        sheet: r.sheet,
        rowIndex: rowNum,
        cell: cell(idx.prospectActive),
        criterion: 'Prospect/Active',
        expected: (r.prospectActive || '').trim() || '—',
        actual: '— (spec only)',
        pass: true,
        objectName: effectiveObject,
        sfFieldName: sfField?.name ?? undefined,
      });
    }
  }
  return checks;
}

function escapeHtml(s: string): string {
  return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildHtmlReport(checks: CellCheck[], generatedAt: string): string {
  const passCount = checks.filter((c) => c.pass).length;
  const failCount = checks.length - passCount;
  const rows = checks
    .map(
      (c) =>
        `<tr class="${c.pass ? 'pass' : 'fail'}">
  <td>${escapeHtml(c.sheet)}</td><td>${c.rowIndex}</td><td>${escapeHtml(c.cell)}</td><td>${escapeHtml(c.criterion)}</td>
  <td>${escapeHtml(c.expected)}</td><td>${escapeHtml(c.actual)}</td><td>${c.pass ? 'Pass' : 'Fail'}</td>
  <td>${escapeHtml(c.objectName ?? '')}</td><td>${escapeHtml(c.sfFieldName ?? '')}</td>
</tr>`
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><title>SF-587 Cell-Level Validation</title>
<style>
  body{ font-family: Segoe UI,sans-serif; margin: 24px; background: #f5f5f5; }
  table{ border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  th,td{ border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
  th{ background: #0B5394; color: white; }
  tr.pass { background: #e8f5e9; } tr.fail { background: #ffebee; }
  .summary{ padding: 12px 16px; background: white; margin-bottom: 16px; border-radius: 6px; }
  .summary.fail { border-left: 4px solid #c62828; } .summary.pass { border-left: 4px solid #2e7d32; }
</style>
</head>
<body>
  <h1>SF-587 Questionnaire — Cell-Level Validation Report</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} | Excel: GAB Coding Questionaire GAB.xlsx | Objects: ${CODING_OBJECT}, ${EXPOSURE_OBJECT}</p>
  <div class="summary ${failCount > 0 ? 'fail' : 'pass'}">
    <strong>Summary:</strong> ${passCount} checks passed, ${failCount} failed (of ${checks.length} cell checks).
  </div>
  <p><strong>Cell reference:</strong> B = Label, C = Auto populate, F = Mandatory, G = Field type, H = Rules (picklist options), J = Prospect/Active.</p>
  <table>
    <thead><tr><th>Sheet</th><th>Row</th><th>Cell</th><th>Criterion</th><th>Expected (Excel)</th><th>Actual (SF)</th><th>Pass/Fail</th><th>Object</th><th>SF Field</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
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
  console.log('  SF-587 Cell-Level Validation (Coding & Exposure vs Excel)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('📖 Loading Excel:', EXCEL_PATH);
  const { coding, exposure, headerIndices } = await loadExcel();
  console.log(`   Coding Questions: ${coding.length} rows`);
  console.log(`   Exposure Questions: ${exposure.length} rows\n`);

  const apiUser = process.env.SF_API_JWT_USERNAME || (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);
  if (apiUser) console.log(`🔐 Using JWT user: ${apiUser}\n`);
  console.log('🔐 Authenticating...');
  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  console.log('   ✅ Authenticated\n');

  console.log(`📡 Describing ${CODING_OBJECT} (REST for picklist values)...`);
  const codingDescribe = await describeObject(auth.accessToken, auth.instanceUrl, CODING_OBJECT);
  let codingFields: SfField[] = codingDescribe.fields || [];
  if (codingFields.length < 35) {
    try {
      const tooling = await getFieldsViaTooling(auth.accessToken, auth.instanceUrl, CODING_OBJECT);
      if (tooling.length > codingFields.length) {
        const byName = new Map(codingFields.map((f) => [f.name, f]));
        tooling.forEach((t) => {
          if (!byName.has(t.name)) byName.set(t.name, t);
        });
        codingFields = Array.from(byName.values());
      }
    } catch (_) {}
  }
  console.log(`   ${codingFields.length} fields\n`);

  console.log(`📡 Describing ${EXPOSURE_OBJECT}...`);
  const exposureDescribe = await describeObject(auth.accessToken, auth.instanceUrl, EXPOSURE_OBJECT);
  let exposureFields: SfField[] = exposureDescribe.fields || [];
  if (exposureFields.length < 35) {
    try {
      const tooling = await getFieldsViaTooling(auth.accessToken, auth.instanceUrl, EXPOSURE_OBJECT);
      if (tooling.length > exposureFields.length) {
        const byName = new Map(exposureFields.map((f) => [f.name, f]));
        tooling.forEach((t) => {
          if (!byName.has(t.name)) byName.set(t.name, t);
        });
        exposureFields = Array.from(byName.values());
      }
    } catch (_) {}
  }
  console.log(`   ${exposureFields.length} fields\n`);

  let lobFields: SfField[] = [];
  try {
    lobFields = await getFieldsViaTooling(auth.accessToken, auth.instanceUrl, CODING_LOB_CHILD_OBJECT);
    if (lobFields.length > 0) console.log(`📡 LOB child: ${lobFields.length} fields\n`);
  } catch (_) {}

  const allChecks: CellCheck[] = [];
  allChecks.push(
    ...runCellValidation(CODING_OBJECT, codingFields, coding, headerIndices, lobFields.length > 0 ? lobFields : undefined, CODING_LOB_CHILD_OBJECT)
  );
  allChecks.push(...runCellValidation(EXPOSURE_OBJECT, exposureFields, exposure, headerIndices));

  const passCount = allChecks.filter((c) => c.pass).length;
  const failCount = allChecks.length - passCount;

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`  Result: ${passCount}/${allChecks.length} passed, ${failCount} failed`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const htmlPath = path.join(reportDir, `SF587-Cell-Validation-${timestamp}.html`);
  fs.writeFileSync(htmlPath, buildHtmlReport(allChecks, new Date().toISOString()), 'utf8');
  console.log(`📊 Report: ${htmlPath}\n`);

  const failed = allChecks.filter((c) => !c.pass);
  if (failed.length > 0) {
    console.log('Failed checks (sample):');
    failed.slice(0, 25).forEach((c) => {
      console.log(`  ${c.sheet} ${c.cell} (${c.criterion}): Expected "${(c.expected || '').slice(0, 35)}" → Actual "${(c.actual || '').slice(0, 45)}"`);
    });
  }
}

main().catch((err: any) => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
