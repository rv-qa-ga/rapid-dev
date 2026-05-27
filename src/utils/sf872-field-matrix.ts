/**
 * SF-872 field matrix: expected JSON vs Salesforce describe (label, API name, data type).
 * JSON lives under data/sf872/expected-fields/<ObjectApiName>.json
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Sf872ComparisonRow } from './sf872-object-creation-verify';

export type Sf872ExpectedField = {
  apiName: string;
  label: string;
  dataType: string;
};

export type Sf872ExpectedFieldMatrixFile = {
  objectApiName: string;
  generatedAt?: string;
  note?: string;
  fields: Sf872ExpectedField[];
};

/** Reference targets as shown in Salesforce Setup "Data Type" column (Product not Product2). */
const REFERENCE_DISPLAY_ALIASES: Record<string, string> = {
  Product2: 'Product',
};

export type DescribeFieldLike = {
  name: string;
  label?: string;
  type: string;
  length?: number;
  referenceTo?: string[];
  autoNumber?: boolean;
  extraTypeInfo?: string;
  calculated?: boolean;
  formula?: string | null;
};

/**
 * Maps describe metadata to a string comparable to Setup → Fields & Relationships "Data Type".
 */
export function formatDescribeFieldDataType(field: DescribeFieldLike): string {
  const t = (field.type || '').toLowerCase();

  if (field.autoNumber === true) {
    return 'Auto Number';
  }

  if (t === 'reference') {
    const refs = (field.referenceTo || [])
      .map((r) => REFERENCE_DISPLAY_ALIASES[r] || r)
      .sort((a, b) => a.localeCompare(b));
    if (refs.length === 0) return 'Lookup';
    return `Lookup(${refs.join(', ')})`;
  }

  if (t === 'picklist') return 'Picklist';
  if (t === 'multipicklist') return 'Multi-Select Picklist';

  if (t === 'boolean') return 'Checkbox';
  if (t === 'date') return 'Date';
  if (t === 'datetime') return 'Date/Time';
  if (t === 'currency') return 'Currency';
  if (t === 'percent') return 'Percent';
  if (t === 'double') {
    if (field.calculated || field.formula) return 'Formula (Number)';
    return 'Number';
  }
  if (t === 'int') return 'Number';

  if (t === 'url') return 'URL';
  if (t === 'email') return 'Email';
  if (t === 'phone') return 'Phone';

  if (t === 'textarea') {
    const x = (field.extraTypeInfo || '').toLowerCase();
    if (x.includes('richtext')) return 'Rich Text Area';
    return 'Long Text Area';
  }

  if (t === 'string') {
    const len = field.length;
    if (len && len > 0) return `Text(${len})`;
    return 'Text';
  }

  if (t === 'encryptedstring') {
    const len = field.length;
    return len ? `Text (Encrypted)(${len})` : 'Text (Encrypted)';
  }

  if (t === 'id') return 'Record ID';

  return field.type || 'Unknown';
}

export function expectedFieldMatrixPath(objectApiName: string, cwd = process.cwd()): string {
  return path.join(cwd, 'data', 'sf872', 'expected-fields', `${objectApiName}.json`);
}

export function loadExpectedFieldMatrix(objectApiName: string, cwd = process.cwd()): Sf872ExpectedFieldMatrixFile {
  const p = expectedFieldMatrixPath(objectApiName, cwd);
  if (!fs.existsSync(p)) {
    throw new Error(
      `SF-872 expected field matrix not found: ${p}\n` +
        `Run: npx cross-env ENV=qa ts-node scripts/sf872-bootstrap-field-expectations.ts`
    );
  }
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw) as Sf872ExpectedFieldMatrixFile;
  if (!data.objectApiName || !Array.isArray(data.fields)) {
    throw new Error(`Invalid SF-872 field matrix JSON: ${p}`);
  }
  if (data.objectApiName !== objectApiName) {
    throw new Error(
      `Field matrix objectApiName mismatch: file says "${data.objectApiName}" but scenario uses "${objectApiName}" (${p})`
    );
  }
  return data;
}

function normLabel(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function normDataType(s: string): string {
  return normLabel(s);
}

/**
 * Bidirectional "all fields" compare: every describe field must appear in JSON and vice versa.
 * Each field: apiName must match key; label and dataType compared (dataType from describe via formatter).
 */
export function compareFieldMatrixToDescribe(
  objectApiName: string,
  expected: Sf872ExpectedFieldMatrixFile,
  describeFields: DescribeFieldLike[] | undefined,
  jsonRelativePath: string
): Sf872ComparisonRow[] {
  const rows: Sf872ComparisonRow[] = [];

  rows.push({
    check: 'Field matrix JSON',
    expected: jsonRelativePath,
    actual: `${expected.fields.length} field row(s)`,
    ok: true,
    notes: 'Bidirectional match: JSON and describe must list the same API names',
  });

  if (!describeFields || describeFields.length === 0) {
    rows.push({
      check: 'Describe fields',
      expected: 'non-empty fields[]',
      actual: 'missing or empty',
      ok: false,
    });
    return rows;
  }

  const byNameExpected = new Map<string, Sf872ExpectedField>();
  for (const f of expected.fields) {
    const k = f.apiName;
    if (byNameExpected.has(k)) {
      rows.push({
        check: `JSON duplicate apiName`,
        expected: 'unique',
        actual: k,
        ok: false,
      });
    }
    byNameExpected.set(k, f);
  }

  const byNameActual = new Map<string, DescribeFieldLike>();
  for (const f of describeFields) {
    if (f?.name) byNameActual.set(f.name, f);
  }

  const expectedKeys = new Set(byNameExpected.keys());
  const actualKeys = new Set(byNameActual.keys());

  const onlyExpected = [...expectedKeys].filter((k) => !actualKeys.has(k));
  const onlyActual = [...actualKeys].filter((k) => !expectedKeys.has(k));

  rows.push({
    check: 'Field count (JSON vs describe)',
    expected: String(expectedKeys.size),
    actual: String(actualKeys.size),
    ok: expectedKeys.size === actualKeys.size && onlyExpected.length === 0 && onlyActual.length === 0,
    notes:
      onlyExpected.length || onlyActual.length
        ? `Only in JSON: ${onlyExpected.join(', ') || '—'} | Only in org: ${onlyActual.join(', ') || '—'}`
        : undefined,
  });

  for (const k of onlyExpected.sort()) {
    rows.push({
      check: `Field present in JSON but missing in org describe`,
      expected: k,
      actual: '(absent)',
      ok: false,
    });
  }

  for (const k of onlyActual.sort()) {
    rows.push({
      check: `Field in org describe but missing from JSON`,
      expected: '(not in JSON)',
      actual: k,
      ok: false,
    });
  }

  const sortedApiNames = [...expectedKeys].filter((k) => actualKeys.has(k)).sort((a, b) => a.localeCompare(b));

  for (const apiName of sortedApiNames) {
    const exp = byNameExpected.get(apiName)!;
    const act = byNameActual.get(apiName)!;
    const actualLabel = normLabel(act.label || '');
    const actualDt = normDataType(formatDescribeFieldDataType(act));
    const expLabel = normLabel(exp.label);
    const expDt = normDataType(exp.dataType);

    const labelOk = actualLabel === expLabel;
    rows.push({
      check: `Field ${apiName} — label`,
      expected: expLabel,
      actual: actualLabel,
      ok: labelOk,
    });

    const dtOk = actualDt === expDt;
    rows.push({
      check: `Field ${apiName} — data type`,
      expected: expDt,
      actual: actualDt,
      ok: dtOk,
    });
  }

  return rows;
}
