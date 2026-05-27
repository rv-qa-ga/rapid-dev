#!/usr/bin/env ts-node
/**
 * SF-587: Validate Coding Questionnaire & Exposure Questionnaire (QA org) vs Excel spec.
 *
 * Reads: data/excel/GAB Coding Questionaire GAB.xlsx
 * Tabs: Coding Questions, LOB, Products, Exposure Questions (Instructions / Additional reqs = info only).
 * Compares expected fields (Label, Mandatory, Field type) to:
 *   - Coding_Questionaire__c  (Coding Questions, LOB, Products)
 *   - Exposure_Questionnaire__c (Exposure Questions)
 *
 * Output: reports/SF587-Questionnaire-Validation-<timestamp>.html and .xlsx
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/validate-sf587-questionnaire.ts
 *   npm run validate:SF587-questionnaire
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
/** Child object for LOB section (Line of Business #1, #2…). Override with SF587_LOB_CHILD_OBJECT. */
const CODING_LOB_CHILD_OBJECT = process.env.SF587_LOB_CHILD_OBJECT || 'CodingQuestionaire_Lines_of_Business__c';

function isLobChildRow(excelLabel: string): boolean {
  const L = (excelLabel || '').trim().toLowerCase();
  if (/^lines?\s+of\s+business\s*\d*$/.test(L)) return true;
  if (/^product\s*\d+$/.test(L)) return true;
  if (/^admission\s+status$/.test(L)) return true;
  if (/if product is admitted.*what lob is it filed as/i.test(L)) return true;
  if (/is this lob fully ceded\/pass through/i.test(L)) return true;
  if (/coverage occurance or claim made/i.test(L)) return true;
  if (/terrorism coverage is included for this lob/i.test(L)) return true;
  if (/terrorism coverage is offered standalone/i.test(L) || /terroism coverage is offered standalone/i.test(L)) return true;
  return false;
}

function getLobChildSfLabel(excelLabel: string): string | null {
  const L = (excelLabel || '').trim().toLowerCase();
  if (/^lines?\s+of\s+business\s*\d*$/.test(L)) return 'Line of Business';
  if (/^product\s*\d+$/.test(L)) return 'Product';
  if (/^admission\s+status$/.test(L)) return 'Admission Status';
  if (/if product is admitted.*what lob is it filed as/i.test(L)) return 'LOB of Admitted Product';
  if (/is this lob fully ceded\/pass through/i.test(L)) return 'LOB fully ceded/pass';
  if (/coverage occurance or claim made/i.test(L)) return 'Coverage Occurance or Claim made?';
  if (/terrorism coverage is included for this lob/i.test(L)) return 'Terrorism Coverage?';
  if (/terrorism coverage is offered standalone/i.test(L) || /terroism coverage is offered standalone/i.test(L)) return 'Terrorism Standalone?';
  return null;
}

interface SfField {
  name: string;
  label: string;
  type: string;
  nillable?: boolean;
  referenceTo?: string | string[];
  picklistValues?: Array<{ value: string; label?: string }>;
  [key: string]: any;
}

interface ExcelQuestionRow {
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

interface ValidationResult {
  sheet: string;
  rowIndex: number;
  objectName: string;
  expectedLabel: string;
  expectedMandatory: string;
  expectedType: string;
  expectedAutoPopulate: string;
  expectedAutopopulateObject: string;
  expectedAutopopulateApiName: string;
  expectedRules: string;
  expectedRegionSelection: string;
  expectedProspectActive: string;
  sfFieldName: string | null;
  sfLabel: string | null;
  /** When no exact match, closest SF field label for comparison. */
  sfClosestLabel: string | null;
  sfClosestName: string | null;
  sfType: string | null;
  sfNillable: boolean | null;
  /** Lookup/reference target object (SF); for auto-populate comparison. */
  sfReferenceTo: string | null;
  /** Note on auto-populate / reference match (informational). */
  aspectsNote: string;
  pass: boolean;
  /** 'pass' = label + type match; 'fail' = no match or mismatch. */
  status: 'pass' | 'fail';
  notes: string;
}

function normalizeLabel(s: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** For matching Excel labels to SF labels: strip parentheticals and punctuation so "Member(s) with similar policy" matches "Member with Similar Policy". */
function normalizeLabelForMatch(s: string): string {
  let t = (s || '').trim();
  t = t.replace(/\s*\([^)]*\)\s*/g, ' '); // remove (s), (es), etc.
  t = t.replace(/'/g, ''); // optional: remove apostrophe so "Member's" can match "Members"
  t = t.replace(/\?\.\s*$/g, '').replace(/\?\s*$/g, '').replace(/\.\s*$/g, ''); // trailing ? or .
  return t.toLowerCase().replace(/\s+/g, ' ').trim();
}

function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<{ fields: SfField[]; label?: string }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  return axios
    .get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    .then((r) => r.data);
}

/** Fetch custom fields via Tooling API - often returns all fields regardless of FLS (metadata). */
async function getFieldsViaTooling(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<SfField[]> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const baseUrl = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}`;
  // Query FieldDefinition (Tooling) for this entity - returns metadata, not filtered by FLS
  const soql = `SELECT QualifiedApiName, Label, DataType, IsNillable FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectName}'`;
  const encoded = encodeURIComponent(soql);
  const url = `${baseUrl}/tooling/query?q=${encoded}`;
  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const records = res.data?.records || [];
  return records.map((r: any) => ({
    name: r.QualifiedApiName || r.qualifiedApiName,
    label: r.Label || r.label || r.QualifiedApiName || '',
    type: (r.DataType || r.dataType || 'string').toLowerCase(),
    nillable: r.IsNillable !== false,
  }));
}

function findFieldByLabel(fields: SfField[], label: string): SfField | null {
  const norm = normalizeLabelForMatch(label);
  if (!norm) return null;
  for (const f of fields) {
    const sfNorm = normalizeLabelForMatch(f.label);
    if (sfNorm === norm) return f;
    if (sfNorm && norm && (sfNorm.includes(norm) || norm.includes(sfNorm))) return f;
  }
  // UI "What country is the member based in?" may have SF label "Country" or "Member Country"
  if (norm.includes('country') && norm.includes('member')) {
    const byCountry = fields.find((f) => {
      const sfNorm = normalizeLabelForMatch(f.label);
      return sfNorm && (sfNorm.includes('country') || sfNorm === 'country');
    });
    if (byCountry) return byCountry;
  }
  return null;
}

/** Find closest SF field by label for reporting when there is no exact match. Does not change pass/fail. */
function findClosestFieldByLabel(fields: SfField[], excelLabel: string): SfField | null {
  const excelNorm = normalizeLabelForMatch(excelLabel);
  if (!excelNorm) return null;
  // Strip common prefixes so "Exposure: Program" can match "Program"
  const withoutPrefix = excelNorm
    .replace(/^(exposure|coding)\s*:\s*/i, '')
    .replace(/^\s*:\s*/, '')
    .trim();
  const excelWords = withoutPrefix.split(/\s+/).filter(Boolean);
  let best: SfField | null = null;
  let bestScore = 0;
  for (const f of fields) {
    const sfNorm = normalizeLabelForMatch(f.label);
    if (!sfNorm) continue;
    if (sfNorm === excelNorm || sfNorm === withoutPrefix) return f; // exact after normalize/prefix strip
    const sfWords = sfNorm.split(/\s+/).filter(Boolean);
    const common = excelWords.filter((w) => sfWords.some((s) => s === w || s.includes(w) || w.includes(s)));
    const score = common.length / Math.max(excelWords.length, sfWords.length, 1);
    if (score > bestScore && score >= 0.3) {
      bestScore = score;
      best = f;
    }
    if (bestScore >= 1) break;
  }
  return best;
}

function typeCompatible(excelType: string, sfType: string): boolean {
  const ex = (excelType || '').toLowerCase();
  const sf = (sfType || '').toLowerCase();
  if (ex.includes('picklist') && (sf === 'picklist' || sf === 'multipicklist' || sf.startsWith('picklist'))) return true;
  if ((ex.includes('text') || ex.includes('free text')) && (sf === 'string' || sf === 'textarea' || sf.startsWith('text(') || sf === 'email' || sf === 'url' || sf === 'phone')) return true;
  if (ex.includes('number') && (sf === 'int' || sf === 'double' || sf === 'currency' || sf === 'percent')) return true;
  if (ex.includes('date') && (sf === 'date' || sf === 'datetime')) return true;
  if ((ex.includes('checkbox') || ex.includes('check box') || ex.includes('checkbok')) && (sf === 'boolean' || sf === 'checkbox')) return true;
  if ((ex.includes('lookup') || ex.includes('auto populate')) && (sf === 'reference' || sf === 'lookup' || sf.startsWith('lookup'))) return true;
  if (!ex || ex === 'n/a' || ex === 'tbd') return true;
  return sf === 'string' || sf.startsWith('text(') || ex === sf;
}

async function loadExcelQuestions(): Promise<{
  coding: ExcelQuestionRow[];
  exposure: ExcelQuestionRow[];
  lobValues: string[];
  productNames: string[];
}> {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found: ${EXCEL_PATH}`);
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);

  const coding: ExcelQuestionRow[] = [];
  const exposure: ExcelQuestionRow[] = [];
  let lobValues: string[] = [];
  let productNames: string[] = [];

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
      // Prospect/Active: when field should be shown (e.g. "Active" only). Match various header spellings including "Prospect/Active", "Prospect - Active", or header containing both words.
      prospectActive: headers.findIndex((h) => {
        const t = (h || '').toString().trim();
        return /Prospect\s*[\/\-]\s*Active/i.test(t) || /Prospect\s+and\s+Active|Prospect\s+or\s+Active/i.test(t) || /Prospect.*Active|Active.*Prospect/i.test(t) || /^Prospect$/i.test(t) || /^Active$/i.test(t) || (/Prospect/i.test(t) && /Active/i.test(t));
      }),
    };
  };

  const getCell = (row: ExcelJS.Row, colIndex: number): string => {
    if (colIndex < 0) return '';
    const cell = row.getCell(colIndex + 1);
    const v = cell?.value;
    if (v == null) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
    if (v && typeof v === 'object' && 'richText' in v && Array.isArray((v as any).richText)) {
      return ((v as any).richText as Array<{ text?: string }>)
        .map((x) => x?.text ?? '')
        .join('')
        .trim();
    }
    if (v && typeof v === 'object' && 'text' in v && typeof (v as any).text === 'string') return (v as any).text.trim();
    return String(v).trim();
  };

  for (const sheet of workbook.worksheets) {
    const name = sheet.name.trim();
    if (name === 'Coding Questions') {
      const idx = getHeaderIndices(sheet);
      if (idx.label < 0) continue;
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
      if (idx.label < 0) continue;
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
    } else if (name === 'LOB') {
      const row1 = sheet.getRow(1);
      const headers: string[] = [];
      row1.eachCell({ includeEmpty: true }, (c: any, col: number) => {
        headers[col - 1] = (c.value ?? '').toString().trim();
      });
      const lobCol = headers.findIndex((h) => /Line of Business/i.test(h || ''));
      if (lobCol >= 0) {
        sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
          if (rowNumber === 1) return;
          const v = getCell(row, lobCol);
          if (v) lobValues.push(v);
        });
      }
    } else if (name === 'Products') {
      const row1 = sheet.getRow(1);
      const headers: string[] = [];
      row1.eachCell({ includeEmpty: true }, (c: any, col: number) => {
        headers[col - 1] = (c.value ?? '').toString().trim();
      });
      const nameCol = headers.findIndex((h) => /^Name$/i.test(h || ''));
      if (nameCol >= 0) {
        sheet.eachRow((row: ExcelJS.Row, rowNumber: number) => {
          if (rowNumber === 1) return;
          const v = getCell(row, nameCol);
          if (v) productNames.push(v);
        });
      }
    }
  }

  return { coding, exposure, lobValues, productNames };
}

function runValidation(
  objectName: string,
  fields: SfField[],
  rows: ExcelQuestionRow[],
  lobContext?: { objectName: string; fields: SfField[] }
): ValidationResult[] {
  const results: ValidationResult[] = [];
  for (const r of rows) {
    const useLob = isLobChildRow(r.label) && lobContext?.fields?.length;
    const effectiveObject = useLob ? lobContext!.objectName : objectName;
    const effectiveFields = useLob ? lobContext!.fields : fields;
    const searchLabel = useLob ? getLobChildSfLabel(r.label)! : r.label;

    let sfField: SfField | null = null;
    if (useLob) {
      sfField = effectiveFields.find((f) => normalizeLabelForMatch(f.label) === normalizeLabelForMatch(searchLabel)) ?? null;
    } else {
      sfField = findFieldByLabel(effectiveFields, r.label);
    }
    const closest = !sfField ? findClosestFieldByLabel(effectiveFields, searchLabel) : null;
    const expectedRequired = /yes|true|mandatory|required|1/i.test(r.mandatory);
    let pass = false;
    let notes = '';

    if (!sfField) {
      if (closest) {
        notes = `No exact match. Given: "${r.label}". Closest in SF: "${closest.label}" (${closest.name}) — not 100% match.`;
      } else {
        notes = `No match. Given: "${r.label}". No similar field in SF.`;
      }
    } else {
      const nillable = sfField.nillable !== false;
      const requiredMatch = expectedRequired ? !nillable : true;
      const typeOk = typeCompatible(r.fieldType, sfField.type);
      pass = typeOk; // Pass if type (and label) match; mandatory mismatch reported in notes
      if (!requiredMatch)
        notes = expectedRequired
          ? `Given: "${r.label}". Expected in SF: "${sfField.label}". Required mismatch; SF field is nillable=true (schema allows null; may be required on page).`
          : `Given: "${r.label}". Expected in SF: "${sfField.label}". Optional; SF nillable=${nillable}.`;
      else if (!typeOk)
        notes = `Given: "${r.label}". Expected in SF: "${sfField.label}". Type mismatch: Excel "${r.fieldType}" vs SF "${sfField.type}".`;
      else notes = `Given: "${r.label}". Expected in SF: "${sfField.label}". Match.`;
    }

    if (useLob) {
      notes = `[LOB child object] ${notes}`;
    }

    const refTo = sfField?.referenceTo;
    const sfReferenceTo =
      refTo == null ? null : Array.isArray(refTo) ? (refTo.length > 0 ? refTo[0] : null) : String(refTo);

    let aspectsNote = '';
    if (sfField) {
      const parts: string[] = [];
      const excelAuto = (r.autoPopulate || '').trim();
      const excelObj = (r.autopopulateObject || '').trim();
      const excelApi = (r.autopopulateApiName || '').trim();
      const isLookup = /reference|lookup/i.test(sfField.type || '');
      if (excelAuto && /yes|true|1|auto/i.test(excelAuto)) {
        parts.push(isLookup ? 'Excel: Auto populate; SF: Lookup (consistent)' : `Excel: Auto populate; SF: ${sfField.type} (not lookup)`);
      }
      if (sfReferenceTo && (excelObj || excelApi)) {
        const refNorm = (sfReferenceTo || '').replace(/__c$/, '');
        const excelRef = (excelApi || excelObj || '').replace(/__c$/, '').trim();
        if (excelRef && refNorm && refNorm.toLowerCase().includes(excelRef.toLowerCase())) {
          parts.push(`Reference target: ${sfReferenceTo} (matches Excel)`);
        } else if (excelRef && refNorm) {
          parts.push(`Reference: Excel "${excelApi || excelObj}" vs SF "${sfReferenceTo}"`);
        }
      } else if (sfReferenceTo) {
        parts.push(`SF Reference To: ${sfReferenceTo}`);
      }
      if (r.rules && r.rules.trim()) parts.push(`Rules (Excel): ${(r.rules || '').trim().slice(0, 80)}${(r.rules || '').length > 80 ? '…' : ''}`);
      if (r.regionSelection && r.regionSelection.trim()) parts.push(`Region (Excel): ${r.regionSelection.trim()}`);
      if (r.prospectActive && r.prospectActive.trim()) parts.push(`Prospect/Active (Excel): ${r.prospectActive.trim()}`);
      aspectsNote = parts.join(' | ') || '—';
    } else {
      const parts: string[] = [];
      if (r.autoPopulate?.trim()) parts.push(`Auto populate: ${r.autoPopulate.trim()}`);
      if (r.rules?.trim()) parts.push(`Rules: ${r.rules.trim().slice(0, 60)}…`);
      if (r.regionSelection?.trim()) parts.push(`Region: ${r.regionSelection.trim()}`);
      if (r.prospectActive?.trim()) parts.push(`Prospect/Active: ${r.prospectActive.trim()}`);
      aspectsNote = parts.length ? parts.join(' | ') : '—';
    }

    const status: 'pass' | 'fail' = pass ? 'pass' : 'fail';

    results.push({
      sheet: r.sheet,
      rowIndex: r.rowIndex,
      objectName: effectiveObject,
      expectedLabel: r.label,
      expectedMandatory: r.mandatory,
      expectedType: r.fieldType,
      expectedAutoPopulate: r.autoPopulate || '',
      expectedAutopopulateObject: r.autopopulateObject || '',
      expectedAutopopulateApiName: r.autopopulateApiName || '',
      expectedRules: r.rules || '',
      expectedRegionSelection: r.regionSelection || '',
      expectedProspectActive: r.prospectActive || '',
      sfFieldName: sfField?.name ?? null,
      sfLabel: sfField?.label ?? null,
      sfClosestLabel: closest?.label ?? null,
      sfClosestName: closest?.name ?? null,
      sfType: sfField?.type ?? null,
      sfNillable: sfField != null ? (sfField.nillable !== false) : null,
      sfReferenceTo: sfReferenceTo ?? null,
      aspectsNote,
      pass,
      status,
      notes,
    });
  }
  return results;
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateHtmlReport(
  results: ValidationResult[],
  lobCount: number,
  productCount: number,
  generatedAt: string
): string {
  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.length - totalPass;
  const withProspectActive = results.filter((r) => (r.expectedProspectActive || '').trim().length > 0).length;
  const bySheet = new Map<string, ValidationResult[]>();
  for (const r of results) {
    const list = bySheet.get(r.sheet) || [];
    list.push(r);
    bySheet.set(r.sheet, list);
  }

  const statusText = (r: ValidationResult) => (r.status === 'pass' ? 'Pass' : 'Fail');
  const statusClass = (r: ValidationResult) => (r.status === 'pass' ? 'pass' : 'fail');

  const rows = results
    .map((r) => {
      const givenLabel = r.expectedLabel;
      const expectedSfLabel = r.sfLabel
        ? r.sfLabel
        : r.sfClosestLabel
          ? `${r.sfClosestLabel} (closest, not exact match)`
          : '— no match';
      const expectedSfApiName = r.sfFieldName ?? r.sfClosestName ?? '—';
      const prospectActiveVal = (r.expectedProspectActive || '').trim();
      const rowClass = prospectActiveVal ? ' conditional-prospect-active' : '';
      return `
    <tr class="${rowClass}">
      <td>${escapeHtml(r.sheet)}</td>
      <td>${r.rowIndex}</td>
      <td>${escapeHtml(r.objectName)}</td>
      <td><strong>Given (Excel):</strong> ${escapeHtml(givenLabel)}</td>
      <td>${escapeHtml(r.expectedMandatory)}</td>
      <td>${escapeHtml(r.expectedType)}</td>
      <td>${escapeHtml(expectedSfApiName)}</td>
      <td><strong>Expected (SF):</strong> ${escapeHtml(expectedSfLabel)}</td>
      <td>${escapeHtml(r.sfType ?? '—')}</td>
      <td class="${statusClass(r)}">${statusText(r)}</td>
      <td>${escapeHtml(r.notes)}</td>
      <td>${escapeHtml(r.expectedAutoPopulate)}</td>
      <td>${escapeHtml(r.expectedAutopopulateObject)}</td>
      <td>${escapeHtml(r.expectedAutopopulateApiName)}</td>
      <td>${escapeHtml(r.sfReferenceTo ?? '—')}</td>
      <td>${escapeHtml((r.expectedRules || '').slice(0, 40))}${(r.expectedRules || '').length > 40 ? '…' : ''}</td>
      <td>${escapeHtml(r.expectedRegionSelection)}</td>
      <td>${prospectActiveVal ? `<strong title="Field should only show for this member status">${escapeHtml(prospectActiveVal)}</strong>` : escapeHtml(r.expectedProspectActive)}</td>
      <td title="${escapeHtml(r.aspectsNote)}">${escapeHtml(r.aspectsNote.slice(0, 50))}${r.aspectsNote.length > 50 ? '…' : ''}</td>
    </tr>`;
    })
    .join('');

  let summaryRows = '';
  for (const [sheet, list] of bySheet) {
    const pass = list.filter((r) => r.pass).length;
    const fail = list.length - pass;
    const tabStatus = fail === 0 ? 'Pass' : 'Fail';
    const tabClass = fail === 0 ? 'pass' : 'fail';
    summaryRows += `<tr><td>${escapeHtml(sheet)}</td><td>${list.length}</td><td>${pass}</td><td>${fail}</td><td class="${tabClass}">${tabStatus}</td></tr>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SF-587 Questionnaire Validation</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; margin: 24px; background: #f5f5f5; }
    h1 { color: #0B5394; margin-bottom: 8px; }
    .meta { color: #555; font-size: 14px; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; max-width: 1400px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background: #0B5394; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f9f9f9; }
    .pass { color: #006100; font-weight: 600; }
    .fail { color: #9C0006; font-weight: 600; }
    .summary { margin-bottom: 20px; padding: 12px 16px; background: white; max-width: 1400px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary.pass { border-left: 4px solid #006100; }
    .summary.fail { border-left: 4px solid #9C0006; }
    .info { margin-bottom: 12px; color: #555; }
    tr.conditional-prospect-active { background: #FFF4E6; }
    th.prospect-active-col { background: #E65100 !important; color: white !important; }
  </style>
</head>
<body>
  <h1>SF-587 Coding & Exposure Questionnaire Validation</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} | Source: GAB Coding Questionaire GAB.xlsx vs QA org (Coding_Questionaire__c, Exposure_Questionnaire__c)</p>
  <div class="summary ${totalFail === 0 ? 'pass' : 'fail'}">
    <strong>Summary:</strong> ${totalPass} pass, ${totalFail} fail (of ${results.length} checks).
    ${totalFail === 0 ? 'All expected fields present with correct attributes.' : 'Some fields missing or attribute mismatch.'}
  </div>
  <div class="info"><strong>Excel reference:</strong> LOB tab has ${lobCount} values; Products tab has ${productCount} values. (LOB/Products field existence is validated via Coding Questions where applicable.)</div>
  <div class="info"><strong>Comparison:</strong> &quot;Given&quot; = Excel spec; &quot;Expected (SF)&quot; = Salesforce field. Status = Pass only when label and type match.</div>
  <div class="info"><strong>Prospect/Active (Excel):</strong> ${withProspectActive} row(s) have a value in this column. These fields should <strong>only be shown for the indicated member status</strong> (e.g. &quot;Active&quot; = must be hidden for Onboarding/Prospect). If such fields appear for members in Onboarding status, that is a UI bug — the script reports the spec; verify in the app that visibility is correct.</div>
  <div class="info"><strong>Additional aspects:</strong> Auto populate, Autopopulate object/API (Excel) vs SF Reference To; Rules, Region Selection. <strong>Aspects note</strong> summarizes auto-populate and reference target.</div>
  <h2>By tab</h2>
  <table>
    <thead><tr><th>Tab</th><th>Total</th><th>Pass</th><th>Fail</th><th>Status</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>
  <h2>Detail (per row)</h2>
  <table>
    <thead>
      <tr>
        <th>Tab</th><th>Row</th><th>Object</th><th>Given (Excel) Label</th><th>Mandatory</th><th>Expected Type</th>
        <th>SF API Name</th><th>Expected (SF) Label</th><th>SF Type</th><th>Status</th><th>Comparison notes</th>
        <th>Auto populate (Excel)</th><th>Autopopulate object (Excel)</th><th>Autopopulate API (Excel)</th><th>SF Reference To</th>
        <th>Rules (Excel)</th><th>Region Selection (Excel)</th><th class="prospect-active-col">Prospect/Active (Excel) — Show only when</th><th>Aspects note</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
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
}

async function writeExcelReport(
  results: ValidationResult[],
  lobCount: number,
  productCount: number,
  outputPath: string
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SF-587 Questionnaire Validation';
  wb.created = new Date();

  const summaryWs = wb.addWorksheet('Summary');
  summaryWs.addRow(['SF-587 Coding & Exposure Questionnaire — Validation vs QA org']);
  summaryWs.addRow([]);
  summaryWs.addRow(['Generated', new Date().toISOString()]);
  summaryWs.addRow(['Source Excel', EXCEL_PATH]);
  summaryWs.addRow(['Objects', `${CODING_OBJECT}, ${EXPOSURE_OBJECT}`]);
  summaryWs.addRow(['LOB values in Excel', lobCount]);
  summaryWs.addRow(['Products in Excel', productCount]);
  summaryWs.addRow([]);
  const withProspectActive = results.filter((r) => (r.expectedProspectActive || '').trim().length > 0).length;
  summaryWs.addRow(['Rows with Prospect/Active condition (Excel)', withProspectActive, '(Fields should only show for indicated member status; verify hidden for Onboarding when Excel says Active)']);
  summaryWs.addRow([]);
  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.length - totalPass;
  summaryWs.addRow(['Total checks', results.length, 'Pass', totalPass, 'Fail', totalFail, 'Result', totalFail === 0 ? 'PASS' : 'FAIL']);
  styleHeaderRow(summaryWs);

  const bySheet = new Map<string, ValidationResult[]>();
  for (const r of results) {
    const list = bySheet.get(r.sheet) || [];
    list.push(r);
    bySheet.set(r.sheet, list);
  }
  summaryWs.addRow([]);
  summaryWs.addRow(['Tab', 'Total', 'Pass', 'Fail', 'Status']);
  const headerRow = summaryWs.lastRow!;
  headerRow.font = { bold: true, color: { argb: COLORS.HEADER_FONT } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.HEADER_BG } };
  for (const [sheet, list] of bySheet) {
    const pass = list.filter((r) => r.pass).length;
    const fail = list.length - pass;
    const tabStatus = fail === 0 ? 'PASS' : 'FAIL';
    const row = summaryWs.addRow([sheet, list.length, pass, fail, tabStatus]);
    const statusCol = 5;
    row.getCell(statusCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fail === 0 ? COLORS.PASS_BG : COLORS.FAIL_BG } };
    row.getCell(statusCol).font = { color: { argb: fail === 0 ? COLORS.PASS_FONT : COLORS.FAIL_FONT } };
  }

  const detailWs = wb.addWorksheet('Detail');
  detailWs.columns = [
    { header: 'Tab', key: 'sheet', width: 20 },
    { header: 'Row', key: 'rowIndex', width: 6 },
    { header: 'Object', key: 'objectName', width: 28 },
    { header: 'Given (Excel) Label', key: 'givenLabel', width: 44 },
    { header: 'Mandatory', key: 'expectedMandatory', width: 12 },
    { header: 'Expected Type', key: 'expectedType', width: 18 },
    { header: 'SF API Name', key: 'sfApiName', width: 32 },
    { header: 'Expected (SF) Label', key: 'expectedSfLabel', width: 40 },
    { header: 'SF Type', key: 'sfType', width: 14 },
    { header: 'Pass/Fail', key: 'passFail', width: 10 },
    { header: 'Comparison notes', key: 'notes', width: 52 },
    { header: 'Auto populate (Excel)', key: 'expectedAutoPopulate', width: 14 },
    { header: 'Autopopulate object (Excel)', key: 'expectedAutopopulateObject', width: 22 },
    { header: 'Autopopulate API (Excel)', key: 'expectedAutopopulateApiName', width: 22 },
    { header: 'SF Reference To', key: 'sfReferenceTo', width: 24 },
    { header: 'Rules (Excel)', key: 'expectedRules', width: 36 },
    { header: 'Region Selection (Excel)', key: 'expectedRegionSelection', width: 18 },
    { header: 'Prospect/Active (Excel)', key: 'expectedProspectActive', width: 18 },
    { header: 'Aspects note', key: 'aspectsNote', width: 48 },
  ];
  styleHeaderRow(detailWs);
  for (const r of results) {
    const givenLabel = r.expectedLabel;
    const expectedSfLabel = r.sfLabel ?? (r.sfClosestLabel ? `${r.sfClosestLabel} (closest, not exact)` : '— no match');
    const sfApiName = r.sfFieldName ?? r.sfClosestName ?? '';
    const statusText = r.status === 'pass' ? 'Pass' : 'Fail';
    const row = detailWs.addRow({
      sheet: r.sheet,
      rowIndex: r.rowIndex,
      objectName: r.objectName,
      givenLabel,
      expectedMandatory: r.expectedMandatory,
      expectedType: r.expectedType,
      sfApiName,
      expectedSfLabel,
      sfType: r.sfType ?? '',
      passFail: statusText,
      notes: r.notes,
      expectedAutoPopulate: r.expectedAutoPopulate ?? '',
      expectedAutopopulateObject: r.expectedAutopopulateObject ?? '',
      expectedAutopopulateApiName: r.expectedAutopopulateApiName ?? '',
      sfReferenceTo: r.sfReferenceTo ?? '',
      expectedRules: r.expectedRules ?? '',
      expectedRegionSelection: r.expectedRegionSelection ?? '',
      expectedProspectActive: r.expectedProspectActive ?? '',
      aspectsNote: r.aspectsNote ?? '',
    });
    const passFailCol = 10;
    const bg = r.status === 'pass' ? COLORS.PASS_BG : COLORS.FAIL_BG;
    const fg = r.status === 'pass' ? COLORS.PASS_FONT : COLORS.FAIL_FONT;
    row.getCell(passFailCol).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    row.getCell(passFailCol).font = { color: { argb: fg } };
  }
  detailWs.views = [{ state: 'frozen', ySplit: 1 }];

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
  console.log('  SF-587 Questionnaire Validation (Excel vs QA org)');
  console.log('  Coding_Questionaire__c | Exposure_Questionnaire__c');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  console.log('📖 Loading Excel:', EXCEL_PATH);
  const { coding, exposure, lobValues, productNames } = await loadExcelQuestions();
  console.log(`   Coding Questions: ${coding.length} rows`);
  console.log(`   Exposure Questions: ${exposure.length} rows`);
  console.log(`   LOB values: ${lobValues.length}`);
  console.log(`   Products: ${productNames.length}`);
  const codingWithProspectActive = coding.filter((r) => (r.prospectActive || '').trim().length > 0).length;
  const exposureWithProspectActive = exposure.filter((r) => (r.prospectActive || '').trim().length > 0).length;
  if (codingWithProspectActive > 0 || exposureWithProspectActive > 0) {
    console.log(`   Prospect/Active: ${codingWithProspectActive} Coding rows, ${exposureWithProspectActive} Exposure rows have a value (these fields should only show for the indicated member status; e.g. "Active" = hide for Onboarding/Prospect).`);
  } else {
    console.log(`   Prospect/Active: no values read. If your Excel has this column, ensure the header matches (e.g. "Prospect/Active", "Prospect - Active").`);
  }
  console.log('');

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);
  if (apiUser) console.log(`🔐 Using JWT user: ${apiUser}\n`);

  console.log('🔐 Authenticating with Salesforce (JWT)...');
  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  console.log('   ✅ Authenticated\n');

  console.log(`📡 Describing ${CODING_OBJECT}...`);
  let codingFields: SfField[] = (await describeObject(auth.accessToken, auth.instanceUrl, CODING_OBJECT)).fields || [];
  if (codingFields.length < 35) {
    console.log(`   ✅ REST describe: ${codingFields.length} fields (FLS may hide custom fields)`);
    try {
      const toolingFields = await getFieldsViaTooling(auth.accessToken, auth.instanceUrl, CODING_OBJECT);
      if (toolingFields.length > codingFields.length) {
        console.log(`   ✅ Using Tooling API: ${toolingFields.length} fields (no FLS filter)`);
        codingFields = toolingFields;
      } else {
        console.log(`   Fields returned: ${codingFields.map((f) => f.name).join(', ')}`);
      }
    } catch (e: any) {
      console.log(`   ⚠️  Tooling API fallback failed: ${e.message}`);
      console.log(`   Fields returned: ${codingFields.map((f) => f.name).join(', ')}`);
    }
  } else {
    console.log(`   ✅ ${codingFields.length} fields`);
  }
  console.log('');

  console.log(`📡 Describing ${EXPOSURE_OBJECT}...`);
  let exposureFields: SfField[] = (await describeObject(auth.accessToken, auth.instanceUrl, EXPOSURE_OBJECT)).fields || [];
  if (exposureFields.length < 35) {
    console.log(`   ✅ REST describe: ${exposureFields.length} fields (FLS may hide custom fields)`);
    try {
      const toolingFields = await getFieldsViaTooling(auth.accessToken, auth.instanceUrl, EXPOSURE_OBJECT);
      if (toolingFields.length > exposureFields.length) {
        console.log(`   ✅ Using Tooling API: ${toolingFields.length} fields (no FLS filter)`);
        exposureFields = toolingFields;
      } else {
        console.log(`   Fields returned: ${exposureFields.map((f) => f.name).join(', ')}`);
      }
    } catch (e: any) {
      console.log(`   ⚠️  Tooling API fallback failed: ${e.message}`);
      console.log(`   Fields returned: ${exposureFields.map((f) => f.name).join(', ')}`);
    }
  } else {
    console.log(`   ✅ ${exposureFields.length} fields`);
  }
  console.log('');

  let lobChildFields: SfField[] = [];
  try {
    lobChildFields = await getFieldsViaTooling(auth.accessToken, auth.instanceUrl, CODING_LOB_CHILD_OBJECT);
    if (lobChildFields.length > 0) {
      console.log(`📡 LOB child object ${CODING_LOB_CHILD_OBJECT}: ${lobChildFields.length} fields (used for "Line of Business #1" section)`);
    } else {
      console.log(`📡 LOB child object ${CODING_LOB_CHILD_OBJECT}: no fields returned. Set SF587_LOB_CHILD_OBJECT to your LOB line object API name if different.`);
    }
  } catch (e: any) {
    console.log(`📡 LOB child object ${CODING_LOB_CHILD_OBJECT}: not found or no access (${e?.message ?? 'error'}). Set SF587_LOB_CHILD_OBJECT if your LOB line object has a different API name.`);
  }
  console.log('');

  const results: ValidationResult[] = [];
  results.push(
    ...runValidation(CODING_OBJECT, codingFields, coding, lobChildFields.length > 0 ? { objectName: CODING_LOB_CHILD_OBJECT, fields: lobChildFields } : undefined)
  );
  results.push(...runValidation(EXPOSURE_OBJECT, exposureFields, exposure));

  const totalPass = results.filter((r) => r.pass).length;
  const totalFail = results.length - totalPass;

  const bySheet = new Map<string, ValidationResult[]>();
  for (const r of results) {
    const list = bySheet.get(r.sheet) || [];
    list.push(r);
    bySheet.set(r.sheet, list);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Results by tab');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  for (const [sheet, list] of bySheet) {
    const pass = list.filter((r) => r.pass).length;
    const fail = list.length - pass;
    const status = fail === 0 ? 'PASS' : 'FAIL';
    console.log(`  ${sheet}: ${pass}/${list.length} pass, ${fail} fail — ${status}`);
  }
  console.log('\n' + '─'.repeat(60));
  console.log(`  Overall: ${totalPass}/${results.length} pass, ${totalFail} fail`);
  console.log(`  RESULT: ${totalFail === 0 ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const generatedAt = new Date().toISOString();

  const htmlPath = path.join(reportDir, `SF587-Questionnaire-Validation-${timestamp}.html`);
  const html = generateHtmlReport(results, lobValues.length, productNames.length, generatedAt);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`📊 HTML report: ${htmlPath}`);

  const xlsxPath = path.join(reportDir, `SF587-Questionnaire-Validation-${timestamp}.xlsx`);
  await writeExcelReport(results, lobValues.length, productNames.length, xlsxPath);
  console.log(`📊 Excel report: ${xlsxPath}\n`);
}

main().catch((err: any) => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
