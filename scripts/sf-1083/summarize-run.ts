/**
 * SF-1083 — read reports/sf-1083/cucumber.json and emit:
 *  - Per-AC tag breakdown (pass/fail)
 *  - Per-object breakdown across ALL ACs
 *  - First failure message per failing scenario (concise)
 *  - Markdown table dump to reports/sf-1083/report.md
 */
import * as fs from 'fs';
import * as path from 'path';

interface CucumberStep {
  keyword?: string;
  name?: string;
  result?: { status?: string; error_message?: string; duration?: number };
}
interface CucumberElement {
  name?: string;
  steps?: CucumberStep[];
  tags?: Array<{ name?: string }>;
  type?: string;
}
interface CucumberFeature {
  name?: string;
  elements?: CucumberElement[];
}

const REF_OBJECTS = [
  'Member_Product_and_Program__c',
  'Sub_Product__c',
  'POG_Product__c',
  'OSFI__c',
  'ASLOB__c',
  'Line_of_Business__c',
  'Classes_of_Business__c',
  'BEGAAP_COB__c',
  'Solvency_II__c',
  'Insurance_Product__c',
];

const AC_TAGS: Array<[string, string]> = [
  ['@SF-1083-API-001', 'AC1 — Hyphen formatting'],
  ['@SF-1083-API-002', 'AC5 — Underscores'],
  ['@SF-1083-API-003', 'AC6 — Slashes'],
  ['@SF-1083-API-004', 'AC7 — Brackets'],
  ['@SF-1083-API-005', 'AC3 — Split / joined words'],
  ['@SF-1083-API-006', 'EXTRA — Letter case'],
  ['@SF-1083-API-007', 'NEGATIVE — Clearly different names should NOT alert'],
  ['@SF-1083-API-008', 'POG hard-prevent rule'],
  ['@SF-1083-API-009', 'AC2 — `&` vs `and` (gated, expected NOT deployed)'],
  ['@SF-1083-API-010', 'AC4 — Plural / singular (gated, expected NOT deployed)'],
];

interface ScenarioResult {
  scenarioName: string;
  tags: string[];
  acTag?: string;
  acLabel?: string;
  objectType?: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'undefined';
  firstFailingStep?: string;
  firstError?: string;
}

function detectAc(tags: string[]): { acTag?: string; acLabel?: string } {
  for (const [t, label] of AC_TAGS) {
    if (tags.includes(t)) return { acTag: t, acLabel: label };
  }
  return {};
}

function detectObject(name: string): string | undefined {
  for (const obj of REF_OBJECTS) {
    if (name.includes(obj)) return obj;
  }
  return undefined;
}

function detectObjectFromSteps(steps: CucumberStep[]): string | undefined {
  for (const s of steps) {
    const t = s.name || '';
    for (const obj of REF_OBJECTS) {
      if (t.includes(`"${obj}"`)) return obj;
    }
  }
  return undefined;
}

function classifyFailure(err: string | undefined, step: string | undefined): string {
  if (!err) return 'unknown';
  if (/Failed to create record:.*Use one of these records\?/i.test(err)) {
    return 'baseline-or-ack create blocked by duplicate rule';
  }
  if (step?.includes('reject the hard-duplicate create') && /Expected: false[\s\S]*Received: true/i.test(err)) {
    return 'hard-prevent rule did NOT block (HTTP 2xx returned)';
  }
  if (
    step?.includes('duplicates detected without saving') &&
    /Expected: true[\s\S]*Received: false/i.test(err)
  ) {
    return 'duplicate alert did NOT fire (no DUPLICATES_DETECTED)';
  }
  if (/Expected: true[\s\S]*Received: false/i.test(err)) return 'assertion: expected true got false';
  if (/Expected: false[\s\S]*Received: true/i.test(err)) return 'assertion: expected false got true';
  return 'other';
}

function summarizeError(err: string | undefined): string {
  if (!err) return '';
  const oneLine = err.replace(/\r\n|\n/g, ' ').replace(/\s+/g, ' ').trim();
  return oneLine.length > 240 ? oneLine.slice(0, 237) + '...' : oneLine;
}

function loadFeatures(p: string): CucumberFeature[] {
  const raw = fs.readFileSync(p, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('cucumber.json shape unexpected');
  return data;
}

function main() {
  const jsonPath = path.resolve('reports', 'sf-1083', 'cucumber.json');
  const features = loadFeatures(jsonPath);
  const results: ScenarioResult[] = [];

  for (const feat of features) {
    for (const el of feat.elements || []) {
      if (el.type === 'background') continue;
      const tags = (el.tags || []).map((t) => t.name || '').filter(Boolean);
      const objectType = detectObject(el.name || '') || detectObjectFromSteps(el.steps || []);
      const ac = detectAc(tags);

      let status: ScenarioResult['status'] = 'passed';
      let firstFailingStep: string | undefined;
      let firstError: string | undefined;
      for (const s of el.steps || []) {
        const st = s.result?.status as ScenarioResult['status'] | undefined;
        if (!st) continue;
        if (st === 'skipped' && status === 'passed') status = 'skipped';
        if (st === 'pending' && status === 'passed') status = 'pending';
        if (st === 'undefined') status = 'undefined';
        if (st === 'failed') {
          status = 'failed';
          if (!firstFailingStep) {
            firstFailingStep = `${(s.keyword || '').trim()} ${s.name || ''}`.trim();
            firstError = summarizeError(s.result?.error_message);
          }
        }
      }

      results.push({
        scenarioName: el.name || '',
        tags,
        acTag: ac.acTag,
        acLabel: ac.acLabel,
        objectType,
        status,
        firstFailingStep,
        firstError,
      });
    }
  }

  const total = results.length;
  const passed = results.filter((r) => r.status === 'passed').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const undef = results.filter((r) => r.status === 'undefined').length;

  console.log(`\nTotal: ${total}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}  Undefined: ${undef}\n`);

  console.log('===== Per-AC summary =====');
  const acRows: string[] = [];
  acRows.push('| AC | Pass | Fail | Skip | Total |');
  acRows.push('|---|---|---|---|---|');
  for (const [t, label] of AC_TAGS) {
    const subset = results.filter((r) => r.acTag === t);
    const p = subset.filter((r) => r.status === 'passed').length;
    const f = subset.filter((r) => r.status === 'failed').length;
    const s = subset.filter((r) => r.status === 'skipped').length;
    const tot = subset.length;
    console.log(`  ${label.padEnd(60)} pass=${p}/${tot}  fail=${f}  skip=${s}`);
    acRows.push(`| ${label} | ${p} | ${f} | ${s} | ${tot} |`);
  }

  console.log('\n===== Per-Object summary =====');
  const objRows: string[] = [];
  objRows.push('| Object | Pass | Fail | Skip | Total |');
  objRows.push('|---|---|---|---|---|');
  for (const obj of REF_OBJECTS) {
    const subset = results.filter((r) => r.objectType === obj);
    const p = subset.filter((r) => r.status === 'passed').length;
    const f = subset.filter((r) => r.status === 'failed').length;
    const s = subset.filter((r) => r.status === 'skipped').length;
    const tot = subset.length;
    console.log(`  ${obj.padEnd(36)} pass=${p}/${tot}  fail=${f}  skip=${s}`);
    objRows.push(`| ${obj} | ${p} | ${f} | ${s} | ${tot} |`);
  }

  console.log('\n===== Failure detail (first error per scenario) =====');
  const failureRows: string[] = [];
  failureRows.push('| AC | Object | Classification | Failing step |');
  failureRows.push('|---|---|---|---|');
  const failures = results.filter((r) => r.status === 'failed');
  const byClass: Record<string, ScenarioResult[]> = {};
  for (const r of failures) {
    const stepOut = (r.firstFailingStep || '').replace(/\|/g, '\\|');
    const cls = classifyFailure(r.firstError, r.firstFailingStep);
    (byClass[cls] ||= []).push(r);
    console.log(
      `  ${(r.acLabel || '?').padEnd(60)}  obj=${(r.objectType || '?').padEnd(36)}  cls=${cls}`
    );
    failureRows.push(`| ${r.acLabel || '?'} | ${r.objectType || '?'} | ${cls} | ${stepOut} |`);
  }

  console.log('\n===== Failure classification =====');
  const clsRows: string[] = ['| Classification | Count |', '|---|---|'];
  for (const [cls, list] of Object.entries(byClass).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${cls.padEnd(60)} ${list.length}`);
    clsRows.push(`| ${cls} | ${list.length} |`);
  }

  // Markdown report
  const md: string[] = [];
  md.push(`# SF-1083 — Reference Data Duplicate Detection — QAMerge run report\n`);
  md.push(`Run on: ${new Date().toISOString()}`);
  md.push(`Environment: \`qamerge\`  |  Pending ACs enabled: \`SF1083_ENABLE_PENDING=true\`  |  Feature: \`src/features/api/SF/SF-1083.feature\`\n`);
  md.push(`## Totals\n`);
  md.push(`| Total | Passed | Failed | Skipped |`);
  md.push(`|---|---|---|---|`);
  md.push(`| ${total} | ${passed} | ${failed} | ${skipped} |\n`);
  md.push(`## Pass / fail by AC\n`);
  md.push(...acRows);
  md.push('');
  md.push(`## Pass / fail by reference data object\n`);
  md.push(...objRows);
  md.push('');
  md.push(`## Failure classification\n`);
  md.push(...clsRows);
  md.push('');
  md.push(`## Failure detail (one row per failing scenario)\n`);
  md.push(...failureRows);
  fs.writeFileSync(path.resolve('reports', 'sf-1083', 'report.md'), md.join('\n') + '\n', 'utf-8');
  console.log(`\nMarkdown report written to reports/sf-1083/report.md`);
}

main();
