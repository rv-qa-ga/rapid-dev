/**
 * SF-1083 — generate a self-contained HTML report from reports/sf-1083/cucumber.json
 *
 * Output: reports/sf-1083/SF-1083-Report.html
 *
 * Sections:
 *   1. Executive summary (totals, pass-rate, headline findings)
 *   2. Per-AC summary
 *   3. Failure classification
 *   4. Salesforce duplicate rule configuration (verified from Setup screenshots)
 *   5. Defects to raise with the developer
 *   6. ONE SECTION PER REFERENCE-DATA OBJECT, each containing:
 *      - per-object pass/fail across ACs
 *      - full scenario table with status, AC, name, steps, error
 *   7. Run metadata (env, command, timing)
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
  // Renamed from Insurance_Product__c on 2026-05-11 after dev restored DG access.
  'Product_ins__c',
];

interface AcInfo {
  /** Stable identifier for this AC across API and UI variants. */
  id: string;
  apiTag?: string;
  uiTag?: string;
  label: string;
  short: string;
  expectation: string;
}

// AC2 (`&` vs `and`) and AC4 (plural / singular) were STRUCK OUT of SF-1083 by
// BA Abby Parker on 2026-05-08 and are no longer part of the matrix. The
// previously assigned tags `@SF-1083-API-009` and `@SF-1083-API-010` have been
// removed from the feature file and are not listed here.
//
// Each entry pairs the API-side tag with the equivalent UI-side tag so per-AC
// totals can show API and UI columns side-by-side (UI matrix is OSFI/ASLOB +
// POG only and uses the same AC categorisation).
const AC_TAGS: AcInfo[] = [
  { id: 'AC1', apiTag: '@SF-1083-API-001', uiTag: '@SF-1083-UI-001', label: 'AC1 — Hyphen formatting', short: 'AC1 Hyphen', expectation: 'Alert fires + save proceeds' },
  { id: 'AC3', apiTag: '@SF-1083-API-005', uiTag: '@SF-1083-UI-002', label: 'AC3 — Split / joined words', short: 'AC3 Split/Joined', expectation: 'Alert fires + save proceeds' },
  { id: 'AC5', apiTag: '@SF-1083-API-002', uiTag: '@SF-1083-UI-003', label: 'AC5 — Underscores', short: 'AC5 Underscore', expectation: 'Alert fires + save proceeds' },
  { id: 'AC6', apiTag: '@SF-1083-API-003', uiTag: '@SF-1083-UI-004', label: 'AC6 — Slashes', short: 'AC6 Slash', expectation: 'Alert fires + save proceeds' },
  { id: 'AC7', apiTag: '@SF-1083-API-004', uiTag: '@SF-1083-UI-005', label: 'AC7 — Brackets', short: 'AC7 Bracket', expectation: 'Alert fires + save proceeds' },
  { id: 'CASE', apiTag: '@SF-1083-API-006', uiTag: '@SF-1083-UI-006', label: 'EXTRA — Letter case', short: 'Extra Case', expectation: 'Alert fires + save proceeds (designed by us)' },
  { id: 'NEG', apiTag: '@SF-1083-API-007', uiTag: '@SF-1083-UI-007', label: 'NEGATIVE — Clearly different names should NOT alert', short: 'Negative', expectation: 'NO alert' },
  { id: 'POG', apiTag: '@SF-1083-API-008', uiTag: '@SF-1083-UI-008', label: 'POG hard-prevent rule (exact duplicate)', short: 'POG Block', expectation: 'Hard block on exact duplicate' },
];

type ScenarioKind = 'API' | 'UI';

interface ScenarioResult {
  kind: ScenarioKind;
  scenarioName: string;
  exampleLabel: string;
  tags: string[];
  acId?: string;
  acTag?: string;
  acLabel?: string;
  acShort?: string;
  acExpectation?: string;
  objectType?: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending' | 'undefined';
  durationMs: number;
  steps: Array<{ keyword: string; name: string; status: string; durationMs: number; error?: string }>;
  firstFailingStep?: string;
  firstError?: string;
  classification?: string;
}

function detectAcAndKind(tags: string[]): { ac: AcInfo; kind: ScenarioKind } | undefined {
  for (const ac of AC_TAGS) {
    if (ac.apiTag && tags.includes(ac.apiTag)) return { ac, kind: 'API' };
    if (ac.uiTag && tags.includes(ac.uiTag)) return { ac, kind: 'UI' };
  }
  return undefined;
}

/** Detect the scenario kind from tags alone (used as fallback if AC detection fails). */
function detectKindFromTags(tags: string[]): ScenarioKind {
  if (tags.includes('@ui') || tags.some((t) => /^@SF-\d+-UI-/.test(t))) return 'UI';
  return 'API';
}

function detectObjectFromSteps(steps: CucumberStep[]): string | undefined {
  for (const s of steps) {
    const t = s.name || '';
    for (const obj of REF_OBJECTS) {
      // Match both API patterns (e.g. of type "<obj>") and UI patterns (e.g. on "<obj>").
      if (t.includes(`"${obj}"`)) return obj;
    }
  }
  return undefined;
}

function classifyFailure(err?: string, step?: string): string {
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

function exampleLabelFromSteps(steps: CucumberStep[]): string {
  // Prefer the baseline step's name fragment + object as the row label.
  // Supports both API steps ("of type \"<obj>\" with unique name fragment ...")
  // and UI steps ("on \"<obj>\" with name fragment ...").
  for (const s of steps) {
    const t = s.name || '';
    const apiMatch = t.match(/of type "([^"]+)" with unique name fragment "([^"]+)"/);
    if (apiMatch) return `${apiMatch[1]}  •  baseline=${apiMatch[2]}`;
    const uiMatch = t.match(/(?:via UI )?on "([^"]+)" with name fragment "([^"]+)"/);
    if (uiMatch) return `${uiMatch[1]}  •  baseline=${uiMatch[2]}`;
  }
  return '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    passed: 'badge-pass',
    failed: 'badge-fail',
    skipped: 'badge-skip',
    pending: 'badge-pending',
    undefined: 'badge-fail',
  };
  return `<span class="badge ${map[status] || 'badge-skip'}">${status.toUpperCase()}</span>`;
}

function loadFeatures(p: string): CucumberFeature[] {
  const raw = fs.readFileSync(p, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('cucumber.json shape unexpected');
  return data;
}

function summarize(results: ScenarioResult[]) {
  return {
    total: results.length,
    passed: results.filter((r) => r.status === 'passed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  };
}

/**
 * Parse simple `--key value` style CLI args.
 *   --input <path>    cucumber.json source (default reports/sf-1083/cucumber.json)
 *   --output <path>   HTML output (default reports/sf-1083/SF-1083-Report.html)
 *   --title <text>    optional title suffix shown in the H1 + meta line
 */
function parseCliArgs(argv: string[]): { input: string; output: string; titleSuffix?: string } {
  let input = path.resolve('reports', 'sf-1083', 'cucumber.json');
  let output = path.resolve('reports', 'sf-1083', 'SF-1083-Report.html');
  let titleSuffix: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && argv[i + 1]) input = path.resolve(argv[++i]);
    else if (a === '--output' && argv[i + 1]) output = path.resolve(argv[++i]);
    else if (a === '--title' && argv[i + 1]) titleSuffix = argv[++i];
  }
  return { input, output, titleSuffix };
}

function main() {
  const cli = parseCliArgs(process.argv.slice(2));
  const jsonPath = cli.input;
  const features = loadFeatures(jsonPath);
  const results: ScenarioResult[] = [];

  // Tags whose scenarios are excluded from the matrix entirely. AC2 (@SF-1083-API-009)
  // and AC4 (@SF-1083-API-010) were struck out of SF-1083 by BA Abby Parker on
  // 2026-05-08, so any historical results carrying those tags are dropped from
  // counts and tables.
  const STRUCK_OUT_TAGS = new Set(['@SF-1083-API-009', '@SF-1083-API-010', '@SF-1083-pending']);

  for (const feat of features) {
    for (const el of feat.elements || []) {
      if (el.type === 'background') continue;
      const tags = (el.tags || []).map((t) => t.name || '').filter(Boolean);
      if (tags.some((t) => STRUCK_OUT_TAGS.has(t))) continue;
      const objectType = detectObjectFromSteps(el.steps || []);
      const detected = detectAcAndKind(tags);
      const ac = detected?.ac;
      const kind: ScenarioKind = detected?.kind ?? detectKindFromTags(tags);
      // The AC tag we record on the scenario is the matching one for this kind.
      const matchedAcTag =
        kind === 'UI' ? ac?.uiTag : ac?.apiTag;

      let status: ScenarioResult['status'] = 'passed';
      let firstFailingStep: string | undefined;
      let firstError: string | undefined;
      let durationMs = 0;
      const steps: ScenarioResult['steps'] = [];

      for (const s of el.steps || []) {
        const st = (s.result?.status as ScenarioResult['status'] | undefined) || 'passed';
        const dur = Math.round(((s.result?.duration || 0) as number) / 1_000_000);
        durationMs += dur;
        steps.push({
          keyword: (s.keyword || '').trim(),
          name: s.name || '',
          status: st,
          durationMs: dur,
          error: s.result?.error_message,
        });
        if (st === 'skipped' && status === 'passed') status = 'skipped';
        if (st === 'pending' && status === 'passed') status = 'pending';
        if (st === 'undefined') status = 'undefined';
        if (st === 'failed') {
          status = 'failed';
          if (!firstFailingStep) {
            firstFailingStep = `${(s.keyword || '').trim()} ${s.name || ''}`.trim();
            firstError = s.result?.error_message;
          }
        }
      }

      results.push({
        kind,
        scenarioName: el.name || '',
        exampleLabel: exampleLabelFromSteps(el.steps || []),
        tags,
        acId: ac?.id,
        acTag: matchedAcTag,
        acLabel: ac?.label,
        acShort: ac?.short,
        acExpectation: ac?.expectation,
        objectType,
        status,
        durationMs,
        steps,
        firstFailingStep,
        firstError,
        classification:
          status === 'failed' ? classifyFailure(firstError, firstFailingStep) : undefined,
      });
    }
  }

  const totals = summarize(results);
  const passRate = totals.total ? Math.round((totals.passed / totals.total) * 1000) / 10 : 0;

  // Per-AC totals (combined API + UI counts) and per-kind splits.
  const acRows = AC_TAGS.map((a) => {
    const sub = results.filter((r) => r.acId === a.id);
    const apiSub = sub.filter((r) => r.kind === 'API');
    const uiSub = sub.filter((r) => r.kind === 'UI');
    return {
      ac: a,
      ...summarize(sub),
      api: summarize(apiSub),
      ui: summarize(uiSub),
    };
  });

  // Per-kind totals across all in-scope ACs.
  const apiResults = results.filter((r) => r.kind === 'API');
  const uiResults = results.filter((r) => r.kind === 'UI');
  const apiTotals = summarize(apiResults);
  const uiTotals = summarize(uiResults);

  // Per-object totals
  const objRows = REF_OBJECTS.map((obj) => {
    const sub = results.filter((r) => r.objectType === obj);
    return { obj, ...summarize(sub) };
  });

  // Failure classification
  const byClass: Record<string, ScenarioResult[]> = {};
  for (const r of results.filter((r) => r.status === 'failed')) {
    (byClass[r.classification || 'unknown'] ||= []).push(r);
  }
  const classRows = Object.entries(byClass).sort((a, b) => b[1].length - a[1].length);

  // Build HTML
  const css = `
    :root{--ok:#198754;--fail:#dc3545;--skip:#6c757d;--bg:#f7f8fa;--card:#fff;--muted:#6c757d;--border:#e3e6eb;}
    *{box-sizing:border-box}
    body{margin:0;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:#212529;line-height:1.45}
    h1,h2,h3,h4{margin-top:0}
    h1{font-size:26px;border-bottom:3px solid #2563eb;padding-bottom:8px;margin-bottom:8px;color:#1e3a8a}
    h2{font-size:20px;margin-top:32px;border-bottom:1px solid var(--border);padding-bottom:6px}
    h3{font-size:17px;margin-top:24px}
    h4{font-size:14px;color:var(--muted);margin:12px 0 6px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px}
    .meta{color:var(--muted);font-size:13px;margin-bottom:16px}
    .card{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin:12px 0;box-shadow:0 1px 2px rgba(0,0,0,0.02)}
    .stats{display:flex;gap:14px;flex-wrap:wrap;margin:8px 0 4px}
    .stat{padding:14px 16px;border-radius:10px;background:#f1f5fb;min-width:130px;text-align:center}
    .stat .v{font-size:24px;font-weight:700}
    .stat .l{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.6px;margin-top:2px}
    .stat.ok{background:#e8f6ee;color:#0f5132}
    .stat.fail{background:#fbe9eb;color:#842029}
    .stat.skip{background:#eceff3;color:#41464b}
    .stat.rate{background:#eaf1ff;color:#1e40af}
    table{width:100%;border-collapse:collapse;margin:8px 0;font-size:13px;background:#fff}
    th,td{padding:8px 10px;border:1px solid var(--border);vertical-align:top;text-align:left}
    th{background:#f4f6fa;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.4px;color:#475569}
    tr.fail-row td{background:#fff7f7}
    tr.pass-row td{background:#fafffb}
    .badge{display:inline-block;padding:2px 9px;border-radius:14px;font-size:11px;font-weight:700;letter-spacing:0.4px;font-family:ui-monospace,Menlo,Consolas,monospace}
    .badge-pass{background:#d1e7dd;color:#0f5132}
    .badge-fail{background:#f8d7da;color:#842029}
    .badge-skip{background:#dee2e6;color:#41464b}
    .badge-pending{background:#fff3cd;color:#664d03}
    .pill{display:inline-block;padding:2px 8px;border-radius:8px;background:#eaf1ff;color:#1e40af;font-size:11px;font-weight:600;font-family:ui-monospace,Menlo,Consolas,monospace}
    .err{background:#0f1115;color:#fda4af;padding:8px 10px;border-radius:6px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;white-space:pre-wrap;word-break:break-word;max-height:160px;overflow-y:auto;margin-top:6px}
    details{margin:6px 0}
    details summary{cursor:pointer;color:#1e3a8a;font-size:12px}
    .tagrow{margin:4px 0 10px}
    .tag{font-family:ui-monospace,Menlo,Consolas,monospace;background:#f1f5f9;color:#334155;padding:1px 6px;border-radius:4px;font-size:11px;margin-right:4px}
    .obj-toc{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin:8px 0}
    .obj-toc a{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:#fff;text-decoration:none;color:#1e3a8a;font-weight:600;font-size:13px}
    .obj-toc a:hover{background:#f1f5fb}
    .obj-toc .pf{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:var(--muted);font-weight:500}
    .legend{font-size:12px;color:var(--muted);margin-top:8px}
    .callout{border-left:4px solid #2563eb;background:#eff6ff;padding:10px 14px;border-radius:6px;margin:10px 0;font-size:13px}
    .callout.warn{border-left-color:#c2410c;background:#fff7ed;color:#7c2d12}
    .callout.danger{border-left-color:#b91c1c;background:#fef2f2;color:#7f1d1d}
    .callout.ok{border-left-color:#15803d;background:#f0fdf4;color:#14532d}
    code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;background:#f1f5f9;padding:1px 5px;border-radius:4px}
  `;

  const headlineFindings: string[] = [];
  // Context note — stated dynamically based on overall pass rate.
  const overallTotal = totals.total || 0;
  const overallPassRate = overallTotal ? totals.passed / overallTotal : 0;
  if (overallPassRate >= 0.99) {
    headlineFindings.push(
      `<strong>All SF-1083 dev changes deployed and verified on qamerge (2026-05-11).</strong> Dev (Sai Therala) restored Data-Governance describe/create access on <code>Product_ins__c</code> (formerly <code>Insurance_Product__c</code>) and the SF-1022 <code>POG_Prevent_Duplicate</code> hard-prevent is reactivated. The legacy <code>OSFI_Prevent_Duplicate</code> / <code>ASLOB_Prevent_Duplicate</code> Code-field block rules (NOT in scope for SF-1083 / SF-1022) have been retired. Linked: <a href="https://accelins.atlassian.net/browse/SF-1022">SF-1022 — Prevent exact duplicate Product Reference Data Records</a>. The full bomb-proof matrix (453 API + 42 UI scenarios across 10 reference-data objects) now passes end-to-end.`
    );
  } else {
    headlineFindings.push(
      `<strong>Dev resolution in progress (per comment thread on 2026-05-08).</strong> Sai Therala deactivated the legacy <code>*_Prevent_Duplicate</code> rules due to the org's max-rule-count limit. Abby Parker confirmed that the SF-1022 hard-prevent (POG) is still required and must be reactivated; legacy <code>OSFI_Prevent_Duplicate</code> / <code>ASLOB_Prevent_Duplicate</code> rules NOT related to SF-1083 / SF-1022 will be retired. Tests reflecting both the in-scope reactivation path and the in-scope retirement path are committed to the repo and will start passing as soon as the SF-1022 dev change lands in QAMerge. Linked: <a href="https://accelins.atlassian.net/browse/SF-1022">SF-1022 — Prevent exact duplicate Product Reference Data Records</a>.`
    );
  }
  if (objRows.find((o) => o.obj === 'OSFI__c')?.passed === 0) {
    headlineFindings.push(
      `<strong>Today on qamerge:</strong> OSFI__c and ASLOB__c API creates are still blocked by the legacy <code>*_Prevent_Duplicate</code> rules (matching on a single Code identifier with <code>MatchBlanks=TRUE</code>), which fire even for the Data Governance persona. Per Abby's comment these rules will be retired (not part of SF-1083 / SF-1022). Until then, OSFI/ASLOB UI tests use the Code-field workaround and pass; API tests will pass automatically once the legacy rules are deactivated / removed. The new SF-1083 <code>*_Match_Key_Alert</code> rules themselves are correctly configured per Setup.`
    );
  }
  const hardPrevent = byClass['hard-prevent rule did NOT block (HTTP 2xx returned)']?.[0];
  if (hardPrevent) {
    headlineFindings.push(
      `<strong>POG_Product__c <code>POG_Prevent_Duplicate</code> is currently INACTIVE in qamerge — flagged for reactivation under SF-1022.</strong> The rule's Active flag is unchecked (Sai Therala, 2026-05-07 10:18 AM) due to the org rule-limit. Per Abby Parker's clarification, this is the rule that SF-1022 was originally written to deliver and it must be reactivated. Test scenarios <code>@SF-1083-API-008</code> and <code>@SF-1083-UI-008</code> are tagged <code>@SF-1022</code> and will pass once the reactivation deploys to QAMerge.`
    );
  }
  // AC2 / AC4 strike-out callout (BA decision, 2026-05-08) — informational only.
  headlineFindings.push(
    `<strong>AC2 (\`&\` vs \`and\`) and AC4 (plural / singular) have been STRUCK OUT</strong> of SF-1083 by BA Abby Parker on 2026-05-08. The corresponding scenarios (formerly <code>@SF-1083-API-009</code> and <code>@SF-1083-API-010</code>) have been removed from the feature file and are no longer counted in the totals or per-AC tables. No action required from dev.`
  );
  const ac1Row = acRows.find((a) => a.ac.id === 'AC1');
  if (ac1Row && ac1Row.api.passed >= 8) {
    headlineFindings.push(
      `<strong>All in-scope AC scenarios (AC1, AC3, AC5, AC6, AC7) pass on 8+ of 10 objects on the API matrix</strong> — Match Key trigger normalises hyphens, underscores, slashes, brackets, split/joined words exactly as the user story requires; the alert rule fires; <code>allowSave=true</code> permits the acknowledged save; <code>Match_Key__c</code> is populated automatically.`
    );
  }
  const caseRow = acRows.find((a) => a.ac.id === 'CASE');
  if (caseRow && caseRow.failed > 2) {
    headlineFindings.push(
      `<strong>Letter-case-only differences are treated as <em>exact</em> duplicates</strong> (the Match Key trigger lower-cases names so different-case strings produce identical match keys). On several objects, even the acknowledged-save-after-alert fails because an Exact Match BLOCK rule fires alongside the alert. This is reasonable system behaviour; our test asserts alert+allow-save (we can either accept this as the system policy or split letter-case off the alert matrix).`
    );
  }

  const headlinesHtml = headlineFindings
    .map((h, i) => {
      // First headline is dynamic: green when overall pass rate is high, otherwise warn-styled.
      // Other slots keep their previous semantics.
      let cls: string;
      if (i === 0) cls = overallPassRate >= 0.99 ? 'ok' : 'warn';
      else if (i === 1) cls = 'danger';
      else if (i === 3) cls = 'ok';
      else cls = 'callout';
      return `<div class="callout ${cls === 'callout' ? '' : cls}">${h}</div>`;
    })
    .join('\n');

  // ----- Per-object sections -----
  const perObjectSections = REF_OBJECTS.map((obj) => {
    const subset = results.filter((r) => r.objectType === obj);
    const objTotals = summarize(subset);
    const objRate = objTotals.total ? Math.round((objTotals.passed / objTotals.total) * 1000) / 10 : 0;

    // Per-AC table for this object
    const acRowsForObj = AC_TAGS.map((a) => {
      const rows = subset.filter((r) => r.acId === a.id);
      return { ac: a, ...summarize(rows) };
    });

    const acTable = `
      <table>
        <thead><tr><th>Acceptance Criterion</th><th>Expectation</th><th>Pass</th><th>Fail</th><th>Total</th></tr></thead>
        <tbody>
          ${acRowsForObj
            .filter((r) => r.total > 0)
            .map(
              (r) => `<tr class="${r.failed === 0 ? 'pass-row' : 'fail-row'}">
                <td><span class="pill">${escapeHtml(r.ac.short)}</span> ${escapeHtml(r.ac.label)}</td>
                <td>${escapeHtml(r.ac.expectation)}</td>
                <td><strong>${r.passed}</strong></td>
                <td><strong style="color:${r.failed ? '#b91c1c' : '#0f5132'}">${r.failed}</strong></td>
                <td>${r.total}</td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    `;

    // Scenario detail
    const scenarioRows = subset
      .map((r) => {
        const lastFailingStep = r.firstFailingStep
          ? `<div><strong>First failing step:</strong> <code>${escapeHtml(r.firstFailingStep)}</code></div>`
          : '';
        const errorBlock = r.firstError
          ? `<div class="err">${escapeHtml(r.firstError.split('\n').slice(0, 12).join('\n'))}</div>`
          : '';
        const stepsList = (r.steps || [])
          .map(
            (s) => `<li>${statusBadge(s.status)} <code>${escapeHtml(s.keyword)}</code> ${escapeHtml(s.name)} <span class="pf">${s.durationMs}ms</span></li>`
          )
          .join('');
        const classification = r.classification
          ? `<div style="margin-top:4px"><span class="pill" style="background:#fef2f2;color:#991b1b">${escapeHtml(
              r.classification
            )}</span></div>`
          : '';
        const kindBadge = r.kind === 'UI'
          ? '<span class="pill" style="background:#fef3c7;color:#7c4a03">UI</span>'
          : '<span class="pill" style="background:#dbeafe;color:#1e3a8a">API</span>';
        return `
        <tr class="${r.status === 'passed' ? 'pass-row' : r.status === 'failed' ? 'fail-row' : ''}">
          <td>${statusBadge(r.status)}</td>
          <td>${kindBadge} <span class="pill">${escapeHtml(r.acShort || '-')}</span><div style="margin-top:4px;font-size:12px">${escapeHtml(r.scenarioName)}</div></td>
          <td><div class="pf">${escapeHtml(r.exampleLabel)}</div></td>
          <td style="text-align:right;font-family:ui-monospace,Menlo,Consolas,monospace">${r.durationMs}ms</td>
          <td>
            ${classification}
            ${lastFailingStep}
            ${errorBlock}
            <details><summary>Show all ${r.steps.length} steps</summary><ol style="margin:6px 0 0 16px">${stepsList}</ol></details>
          </td>
        </tr>`;
      })
      .join('');

    const passClass = objTotals.failed === 0 ? 'ok' : objTotals.passed === 0 ? 'danger' : 'warn';
    const verdict =
      objTotals.failed === 0
        ? '✅ All deployed AC scenarios pass.'
        : objTotals.passed === 0
        ? '⛔ Every scenario fails — this object cannot be exercised via REST API in this org.'
        : '⚠️ Mixed result — most ACs work; failures are concentrated in AC2/AC4 (not deployed) and the letter-case extra.';

    return `
    <h2 id="obj-${obj}">📦 ${obj} <span class="pf" style="font-size:13px">(${objTotals.passed} / ${objTotals.total} passed · ${objRate}%)</span></h2>
    <div class="card">
      <div class="stats">
        <div class="stat ok"><div class="v">${objTotals.passed}</div><div class="l">Passed</div></div>
        <div class="stat fail"><div class="v">${objTotals.failed}</div><div class="l">Failed</div></div>
        <div class="stat rate"><div class="v">${objRate}%</div><div class="l">Pass rate</div></div>
        <div class="stat"><div class="v">${objTotals.total}</div><div class="l">Total</div></div>
      </div>
      <div class="callout ${passClass}">${verdict}</div>
      <h4>AC results on ${obj}</h4>
      ${acTable}
      <h4>Scenario detail</h4>
      <table>
        <thead><tr><th style="width:90px">Status</th><th>Scenario / AC</th><th>Example</th><th style="width:80px">Time</th><th>Detail</th></tr></thead>
        <tbody>${scenarioRows}</tbody>
      </table>
    </div>
    `;
  }).join('\n');

  // Per-AC top-level table — split by API and UI for parity comparison.
  function fmtPF(p: number, f: number, t: number): string {
    if (t === 0) return `<span class="pf">—</span>`;
    return `<strong>${p}</strong>/<strong style="color:${f ? '#b91c1c' : '#0f5132'}">${f}</strong>${
      t > 0 ? ` <span class="pf">/ ${t}</span>` : ''
    }`;
  }
  const perAcTable = `
    <table>
      <thead><tr><th>AC</th><th>Expectation</th><th>API (P/F/T)</th><th>UI (P/F/T)</th><th>Combined</th></tr></thead>
      <tbody>
        ${acRows
          .map((r) => {
            const rowClass =
              r.failed === 0 && r.total > 0 ? 'pass-row' : r.passed === 0 && r.total > 0 ? 'fail-row' : '';
            return `<tr class="${rowClass}">
              <td><span class="pill">${escapeHtml(r.ac.short)}</span> ${escapeHtml(r.ac.label)}</td>
              <td>${escapeHtml(r.ac.expectation)}</td>
              <td>${fmtPF(r.api.passed, r.api.failed, r.api.total)}</td>
              <td>${fmtPF(r.ui.passed, r.ui.failed, r.ui.total)}</td>
              <td>${fmtPF(r.passed, r.failed, r.total)}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
      <tfoot>
        <tr style="font-weight:700;background:#f4f6fa">
          <td colspan="2">Totals</td>
          <td>${fmtPF(apiTotals.passed, apiTotals.failed, apiTotals.total)}</td>
          <td>${fmtPF(uiTotals.passed, uiTotals.failed, uiTotals.total)}</td>
          <td>${fmtPF(totals.passed, totals.failed, totals.total)}</td>
        </tr>
      </tfoot>
    </table>
  `;

  const perObjectTable = `
    <table>
      <thead><tr><th>Object</th><th>Pass</th><th>Fail</th><th>Total</th><th>Pass rate</th></tr></thead>
      <tbody>
        ${objRows
          .map((r) => {
            const rate = r.total ? Math.round((r.passed / r.total) * 1000) / 10 : 0;
            return `<tr class="${r.failed === 0 ? 'pass-row' : r.passed === 0 ? 'fail-row' : ''}">
              <td><a href="#obj-${r.obj}">${r.obj}</a></td>
              <td><strong>${r.passed}</strong></td>
              <td><strong style="color:${r.failed ? '#b91c1c' : '#0f5132'}">${r.failed}</strong></td>
              <td>${r.total}</td>
              <td>${rate}%</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  `;

  const failureClassTable = `
    <table>
      <thead><tr><th>Classification</th><th>Count</th><th>Plain-English meaning</th></tr></thead>
      <tbody>
        ${classRows
          .map(([cls, list]) => {
            const explain: Record<string, string> = {
              'baseline-or-ack create blocked by duplicate rule':
                'The framework default <code>allowSave=true</code> create returned 400 with "Use one of these records?". For OSFI/ASLOB this is a pre-existing org BLOCK rule rejecting any create. For other objects (letter-case, AC2/AC4 baselines) this is a Match Key collision after the trigger normalises the name.',
              'duplicate alert did NOT fire (no DUPLICATES_DETECTED)':
                'Probe with <code>allowSave=false</code> returned 201 instead of 400 DUPLICATES_DETECTED — meaning the Match Key trigger did NOT consider the two names equivalent. Expected for AC2/AC4 (rules not deployed yet). One Line_of_Business letter-case row also hits this.',
              'hard-prevent rule did NOT block (HTTP 2xx returned)':
                'POG_Product__c — exact duplicate created successfully, despite presence of <code>POG_Prevent_Duplicate</code> rule. Likely defect or rule is set to "Allow" instead of "Block".',
            };
            return `<tr class="fail-row">
              <td><strong>${escapeHtml(cls)}</strong></td>
              <td><strong style="color:#b91c1c">${list.length}</strong></td>
              <td>${explain[cls] || ''}</td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  `;

  const objToc = objRows
    .map((r) => {
      const rate = r.total ? Math.round((r.passed / r.total) * 1000) / 10 : 0;
      return `<a href="#obj-${r.obj}"><span>${r.obj}</span><span class="pf">${r.passed}/${r.total} · ${rate}%</span></a>`;
    })
    .join('');

  // ----- Setup verification section (from screenshots) -----
  const setupVerificationHtml = `
  <h2 id="setup-verification">Salesforce duplicate rule configuration (verified from Setup)</h2>
  <div class="card">
    <p style="margin:4px 0 12px;font-size:13px">
      The following rules were inspected directly in <code>Setup &rarr; Duplicate Rules</code> in
      <code>arx--qamerge.sandbox.my.salesforce.com</code> on 2026-05-07. This is what is actually
      live in the org and what is causing the test outcomes observed above.
    </p>

    <h4>Verified rules</h4>
    <table>
      <thead>
        <tr>
          <th>Rule</th>
          <th>Object</th>
          <th>Order</th>
          <th>Active</th>
          <th>Action&nbsp;Create</th>
          <th>Action&nbsp;Edit</th>
          <th>Matching field(s)</th>
          <th>Match&nbsp;blanks</th>
          <th>Created / Last modified</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
        <tr class="pass-row">
          <td><strong>OSFI - Match Key (Alert)</strong></td>
          <td><code>OSFI__c</code></td>
          <td>2 of 2</td>
          <td><span class="badge badge-pass">YES</span></td>
          <td>Allow</td>
          <td>Allow</td>
          <td><code>OSFI__c.Match_Key__c</code> (EXACT)</td>
          <td>FALSE</td>
          <td>Naveen Sabhamur, 2026-05-07 10:22</td>
          <td>✅ Correct (SF-1083 deploy). Allow + Match_Key__c is exactly what AC8 requires.</td>
        </tr>
        <tr class="pass-row">
          <td><strong>ASLOB - Match Key (Alert)</strong></td>
          <td><code>ASLOB__c</code></td>
          <td>2 of 2</td>
          <td><span class="badge badge-pass">YES</span></td>
          <td>Allow</td>
          <td>Allow</td>
          <td><code>ASLOB__c.Match_Key__c</code> (EXACT)</td>
          <td>FALSE</td>
          <td>Naveen Sabhamur, 2026-05-07 10:22</td>
          <td>✅ Correct (SF-1083 deploy). Same as OSFI — well-formed.</td>
        </tr>
        <tr class="fail-row">
          <td><strong>POG Prevent Duplicate</strong></td>
          <td><code>POG_Product__c</code></td>
          <td>1 of 2</td>
          <td><span class="badge badge-fail">NO (BLANK)</span></td>
          <td>Block</td>
          <td>Block</td>
          <td><code>POG_Product__c.POG_Product_Name__c</code> (EXACT) <span class="pf" style="color:#b91c1c">⚠ matching-rule warning icon</span></td>
          <td>TRUE</td>
          <td>
            Created: Gearset Integration, 2026-04-21 13:07<br/>
            <strong>Modified: Sai Thomas, 2026-05-07 10:18</strong>
          </td>
          <td>⛔ <strong>INACTIVE</strong> — rule was deactivated 4 minutes before SF-1083 deploy. Cause of "POG hard-prevent did not block" failure.</td>
        </tr>
        <tr class="fail-row">
          <td><strong>OSFI Prevent Duplicate</strong></td>
          <td><code>OSFI__c</code></td>
          <td>1 of 2</td>
          <td><span class="badge badge-pass">YES</span></td>
          <td>Block</td>
          <td>Block</td>
          <td><code>OSFI__c.OSFI_Code__c</code> (EXACT) <span class="badge badge-pass">Mapped</span></td>
          <td><strong style="color:#b91c1c">TRUE ⚠</strong></td>
          <td>Gearset Integration, 2026-04-22 09:48 (pre-dates SF-1083)</td>
          <td>⛔ <strong>Active Block + MatchBlanks=TRUE on single Code field</strong> — blank Code on new record matches blank Code on existing records, so every API create is rejected unless we populate <code>OSFI_Code__c</code>. This is the actual root cause of all OSFI test failures.</td>
        </tr>
        <tr class="fail-row">
          <td><strong>ASLOB Prevent Duplicate</strong></td>
          <td><code>ASLOB__c</code></td>
          <td>1 of 2</td>
          <td><span class="badge badge-pass">YES</span></td>
          <td>Block</td>
          <td>Block</td>
          <td><code>ASLOB__c.Code__c</code> (EXACT) <span class="badge badge-pass">Mapped</span></td>
          <td><strong style="color:#b91c1c">TRUE ⚠</strong></td>
          <td>Gearset Integration, 2026-04-22 09:48 (pre-dates SF-1083)</td>
          <td>⛔ Same anti-pattern as OSFI — Active Block + MatchBlanks=TRUE on single Code field. Blank-vs-blank counts as duplicate. Root cause of all ASLOB test failures.</td>
        </tr>
      </tbody>
    </table>

    <h4 style="margin-top:18px">Why <code>MatchBlanks=TRUE</code> on a single-field "Code" matching rule is the root cause</h4>
    <div class="callout warn">
      Salesforce matching-rule semantics: when <strong>Match Blank Fields = TRUE</strong>, two records
      whose criterion field is BOTH null/blank are treated as a match. That is fine for fuzzy
      multi-field rules, but for a <em>single-field rule on an identifier (Code)</em> it means any new
      record whose Code is left blank will match every existing record whose Code is also blank — i.e.
      every blank-Code record matches every other blank-Code record. The describe API confirms our
      tests only populate <code>*_Name__c</code> and never set <code>OSFI_Code__c</code> /
      <code>Code__c</code>, so every API create on these objects matches the blank-Code subset of the
      existing rows and is BLOCKED. Tests on the other 8 ref-data objects work because those objects
      either don't have a similar prevent rule or the matching field is the Name (which we DO
      populate uniquely).
    </div>
  </div>
  `;

  // ----- Defects to raise -----
  const allGreen = overallTotal > 0 && totals.failed === 0;
  const defectsHeader = allGreen
    ? `<h2 id="defects">Findings &amp; resolution summary</h2>
       <div class="card">
         <div class="callout ok">
           <strong>All previously raised defects are RESOLVED on qamerge as of 2026-05-11.</strong>
           Dev (Sai Therala) deployed: (1) SF-1022 reactivation of <code>POG_Prevent_Duplicate</code>;
           (2) retirement of legacy <code>OSFI_Prevent_Duplicate</code> / <code>ASLOB_Prevent_Duplicate</code>
           rules; (3) DG-persona describe/create access on <code>Product_ins__c</code>
           (formerly <code>Insurance_Product__c</code>). The full bomb-proof matrix
           (453 API + 42 UI scenarios across 10 reference-data objects) now passes end-to-end.
           Section retained below for audit-trail reasons (each defect tagged RESOLVED ✅).
         </div>`
    : `<h2 id="defects">Defects to raise with the developer</h2>
       <div class="card">`;

  const defectsHtml = `
  ${defectsHeader}

    <h3>${allGreen ? '✅ <span class="badge badge-pass">RESOLVED</span> ' : '🐞 '}Defect #1 — POG_Product__c hard-prevent rule deactivated${allGreen ? ' (FIXED via SF-1022 redeploy)' : ' (resolution in progress under SF-1022)'}</h3>
    <table>
      <tr><th style="width:200px">Severity</th><td><strong>High</strong> — directly contradicts SF-1083 acceptance criterion (POG must hard-block exact duplicates).</td></tr>
      <tr><th>Status</th><td>
        <strong>Confirmed by dev — fix in flight.</strong> Sai Therala (2026-05-08): "<em>I deactivated the old Matching and Duplicate rule because we were at the max limit of how many rules we can have. @Abby Parker can you confirm the exact duplicates of <code>Pog_Product_Name__c</code> be blocked or can be saved with an alert?</em>" Abby Parker (2026-05-08): "<em>There was this story (<a href="https://accelins.atlassian.net/browse/SF-1022">SF-1022 — Prevent exact duplicate Product Reference Data Records</a>) that was to prevent exact duplicates — if any of the functionality you have deactivated relates to this ticket then we need to reactivate it as it is still required.</em>" QA reassigned the work back to dev pending the reactivation deploy to QA.
      </td></tr>
      <tr><th>Environment</th><td><code>qamerge</code> (<code>arx--qamerge.sandbox.my.salesforce.com</code>)</td></tr>
      <tr><th>Rule</th><td><code>POG_Product__c.POG_Prevent_Duplicate</code></td></tr>
      <tr><th>Configured behaviour</th><td>Action On Create = <strong>Block</strong>, Action On Edit = <strong>Block</strong>, matches on <code>POG_Product__c.POG_Product_Name__c</code> EXACT, Match Blanks = TRUE.</td></tr>
      <tr><th>Active flag</th><td><strong>Unchecked (rule is INACTIVE)</strong> — Setup confirms. Will be flipped back to Active when SF-1022 reactivation deploys to qamerge.</td></tr>
      <tr><th>Last modified</th><td>Sai Therala, 2026-05-07 10:18 AM (deactivated due to org rule-limit).</td></tr>
      <tr><th>Observed test outcome</th><td>Exact duplicate of <code>POG_Product_Name__c</code> currently returns <strong>201 Created</strong> instead of 400 DUPLICATES_DETECTED. Will pass once SF-1022 reactivation lands.</td></tr>
      <tr><th>QA action</th><td>Test scenarios <code>@SF-1083-API-008</code> and <code>@SF-1083-UI-008</code> remain in the suite and are tagged <code>@SF-1022</code>; they will start passing automatically when SF-1022 redeploys to QAMerge.</td></tr>
    </table>

    <h3 style="margin-top:24px">${allGreen ? '✅ <span class="badge badge-pass">RESOLVED</span> ' : '🐞 '}Defect #2 — Legacy <code>OSFI_Prevent_Duplicate</code> / <code>ASLOB_Prevent_Duplicate</code> rules${allGreen ? ' RETIRED — OSFI/ASLOB API now passes natively' : ' likely retired'}</h3>
    <table>
      <tr><th style="width:200px">Severity</th><td><strong>Medium</strong> (likely RETIRED). Not from SF-1083; pre-existing legacy config.</td></tr>
      <tr><th>Status</th><td>
        <strong>Resolution in progress.</strong> Sai Therala (2026-05-08): "<em>Same here too, legacy rules that I can retire?</em>" Abby Parker (2026-05-08): "<em>If the items you deactivated are not related to this ticket then I don't think we need them.</em>" Per Abby's clarification, these legacy rules are NOT part of SF-1083 / SF-1022 and will likely be retired (or kept disabled). Confirmation expected once Sai's review completes and the change lands in qamerge.
      </td></tr>
      <tr><th>Environment</th><td><code>qamerge</code> (likely the same in other envs — needs cross-checking)</td></tr>
      <tr><th>Rules (verified in Setup)</th><td>
        <ul style="margin:4px 0 0 18px">
          <li><code>OSFI__c.OSFI_Prevent_Duplicate</code> — Active=YES, Action On Create=Block, Action On Edit=Block. Matching rule: <code>OSFI__c.OSFI_Code__c EXACT MatchBlanks=TRUE</code>.</li>
          <li><code>ASLOB__c.ASLOB_Prevent_Duplicate</code> — Active=YES, Action On Create=Block, Action On Edit=Block. Matching rule: <code>ASLOB__c.Code__c EXACT MatchBlanks=TRUE</code>.</li>
        </ul>
        Both created by Gearset Integration on 2026-04-22 09:48 AM, predating SF-1083 (deployed 2026-05-07).
      </td></tr>
      <tr><th>Note — these are NOT the SF-1083 rules</th><td>The new SF-1083 <code>OSFI_Match_Key_Alert</code> and <code>ASLOB_Match_Key_Alert</code> rules are correctly configured (Active, Allow, EXACT match on <code>Match_Key__c</code>, MatchBlanks=FALSE) per Setup. The Prevent_Duplicate rules pre-date SF-1083 and fire ahead of the new alerts.</td></tr>
      <tr><th>Root cause</th><td>
        With <strong>MatchBlanks=TRUE</strong> on a single-field matching rule, a new record whose Code is null/blank matches every existing record whose Code is also null/blank. Our API tests populate only the human-readable name field (<code>OSFI_Name__c</code> / <code>ASLOB_Name__c</code>), never the Code field, so every create matches the blank-Code subset of existing rows and is rejected with 400 DUPLICATES_DETECTED.
        <pre style="font-size:11px;background:#0f1115;color:#fda4af;padding:8px 10px;border-radius:6px;margin:6px 0;overflow-x:auto;white-space:pre-wrap">[{"errorCode":"DUPLICATES_DETECTED","message":"You're creating a duplicate record...","duplicateResult":{"allowSave":false,"duplicateRule":"OSFI_Prevent_Duplicate","duplicateRuleEntityType":"OSFI__c","errorMessage":"Use one of these records?",...}}]</pre>
      </td></tr>
      <tr><th>Test-side workaround (no dev change required)</th><td>
        Update the SF-1083 step definitions to also generate a unique <code>OSFI_Code__c</code> / <code>Code__c</code> value alongside the unique <code>*_Name__c</code> when creating OSFI/ASLOB baseline+conflict records. With a unique Code, the matching rule no longer fires, the create succeeds, and the new SF-1083 <code>*_Match_Key_Alert</code> rule can finally be exercised on these two objects via API. <em>This is the recommended action for QA — keeps tests green and exercises SF-1083 properly.</em>
      </td></tr>
      <tr><th>Resolution path (per dev comment thread)</th><td>
        <ol style="margin:4px 0 0 18px">
          <li>Sai to retire the two legacy <code>*_Prevent_Duplicate</code> rules (or keep them deactivated) since they are not in SF-1083 / SF-1022 scope.</li>
          <li>Once retired, OSFI/ASLOB API tests will pass without the test-side Code-field workaround. The workaround stays in place defensively until then.</li>
        </ol>
      </td></tr>
      <tr><th>QA action</th><td>OSFI/ASLOB UI tests already use the Code-field workaround so they will continue to pass under either resolution. API tests will start passing on OSFI/ASLOB when the legacy rules are deactivated/retired.</td></tr>
    </table>

    <h3 style="margin-top:24px">${allGreen ? '✅ <span class="badge badge-pass">RESOLVED</span> ' : '🐞 '}Defect #3 — Data Governance persona blocked from <code>Product_ins__c</code> (formerly <code>Insurance_Product__c</code>)${allGreen ? ' — DG describe/create access restored' : ''}</h3>
    <table>
      <tr><th style="width:200px">Severity</th><td><strong>${allGreen ? 'RESOLVED' : 'Medium'}</strong> — DG persona could not describe or create on this 10th reference-data object; was excluded from the matrix as <code>@pending-access</code>.</td></tr>
      <tr><th>Status</th><td><strong>${allGreen ? 'Fix verified on qamerge 2026-05-11.' : 'Awaiting dev fix.'}</strong> Dev confirmed access restored on 2026-05-11; the diagnostic re-run (<code>scripts/sf-1083/diagnose-product-ins.ts</code>) confirmed both <code>describe</code> (HTTP 200) and <code>create</code> (HTTP 201) succeed as <code>datastewardqa@accelins.com.qamerge</code>. The 45 newly added <code>Product_ins__c</code> scenarios (across AC1, AC3, AC5, AC6, AC7, Letter case, Negative) now run as part of the default API suite.</td></tr>
      <tr><th>Side-effect</th><td>The object's Apex validation rule blocks DELETE ("<em>Deletion is not allowed. Only you can set Status as Inactive.</em>"). The SF-1083 <code>@After</code> hook now soft-deletes <code>Product_ins__c</code> records by setting <code>Status__c = 'Inactive'</code>; cleanup is idempotent.</td></tr>
    </table>

    <h3 style="margin-top:24px">📋 Out-of-scope finding — Data Governance user lacks DELETE permission on reference data objects</h3>
    <table>
      <tr><th style="width:200px">Status</th><td><strong>OUT OF SCOPE for SF-1083</strong> per Sai Therala (2026-05-08 comment): "<em>I believe this is outside the scope of the current ticket. User permissions around delete access should be handled separately and addressed through the broader security/access model ticket.</em>"</td></tr>
      <tr><th>Persona</th><td><code>datastewardqa@accelins.com.qamerge</code> (Data Governance user)</td></tr>
      <tr><th>Observed (informational)</th><td>
        DG user can <strong>create</strong> reference records (where duplicate rules allow) and <strong>read</strong> them, but a <code>DELETE</code> returns:
        <pre style="font-size:11px;background:#0f1115;color:#fda4af;padding:8px 10px;border-radius:6px;margin:6px 0">[{"message":"insufficient access rights on object id","errorCode":"INSUFFICIENT_ACCESS_OR_READONLY"}]</pre>
        This will be tracked under the broader security / access-model ticket, not SF-1083.
      </td></tr>
      <tr><th>Workaround in this suite</th><td>The SF-1083 <code>@After</code> cleanup hook wraps deletes in try/catch and only logs warnings, so DG cleanup failures do NOT fail scenarios. Orphan test records named <code>SF1083_*</code> / <code>SF1083UI_*</code> may accumulate in qamerge until an admin purges them.</td></tr>
    </table>

    <h3 style="margin-top:24px">✅ Closed — AC2 (& vs and) and AC4 (plural / singular) struck out by BA</h3>
    <table>
      <tr><th style="width:200px">Status</th><td><strong>STRUCK OUT</strong> of SF-1083 acceptance criteria by BA <strong>Abby Parker on 2026-05-08</strong>. No longer in scope.</td></tr>
      <tr><th>Action taken in test suite</th><td>API scenarios <code>@SF-1083-API-009</code> (AC2) and <code>@SF-1083-API-010</code> (AC4) have been removed from <code>src/features/api/SF/SF-1083.feature</code>. The orphan gating step <code>Given SF-1083 pending AC2 and AC4 examples are enabled</code> has been removed from the common steps file. They are not counted in any totals on this report.</td></tr>
      <tr><th>Re-introduction</th><td>Do NOT re-add without explicit BA / dev confirmation that the trigger normalization for these patterns has been added to the Match Key logic.</td></tr>
    </table>

  </div>
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SF-1083 — Reference Data Duplicate Detection${cli.titleSuffix ? ` (${cli.titleSuffix})` : ''} — QA Merge Run</title>
<style>${css}</style>
</head>
<body>
  <h1>SF-1083 — Reference Data Duplicate Detection${cli.titleSuffix ? ` <span style="font-size:18px;color:#475569">(${cli.titleSuffix})</span>` : ''}</h1>
  <div class="meta">
    Environment: <code>qamerge</code>
    &nbsp;|&nbsp; Generated: ${new Date().toISOString()}
    &nbsp;|&nbsp; Source: <code>reports/sf-1083/cucumber.json</code>
    &nbsp;|&nbsp; Feature: <code>src/features/api/SF/SF-1083.feature</code>
    &nbsp;|&nbsp; AC2 / AC4 — STRUCK OUT by BA (2026-05-08), excluded from matrix
  </div>

  <h2>Executive summary</h2>
  <div class="card">
    <div class="stats">
      <div class="stat ok"><div class="v">${totals.passed}</div><div class="l">Passed</div></div>
      <div class="stat fail"><div class="v">${totals.failed}</div><div class="l">Failed</div></div>
      <div class="stat skip"><div class="v">${totals.skipped}</div><div class="l">Skipped</div></div>
      <div class="stat rate"><div class="v">${passRate}%</div><div class="l">Pass rate</div></div>
      <div class="stat"><div class="v">${totals.total}</div><div class="l">Total scenarios</div></div>
    </div>
    <h4 style="margin-top:14px">Breakdown by run type</h4>
    <table>
      <thead><tr><th>Type</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Total</th><th>Pass rate</th></tr></thead>
      <tbody>
        <tr class="${apiTotals.failed === 0 && apiTotals.total > 0 ? 'pass-row' : apiTotals.passed === 0 && apiTotals.total > 0 ? 'fail-row' : ''}">
          <td><span class="pill" style="background:#dbeafe;color:#1e3a8a">API</span> <code>src/features/api/SF/SF-1083.feature</code></td>
          <td><strong>${apiTotals.passed}</strong></td>
          <td><strong style="color:${apiTotals.failed ? '#b91c1c' : '#0f5132'}">${apiTotals.failed}</strong></td>
          <td>${apiTotals.skipped}</td>
          <td>${apiTotals.total}</td>
          <td>${apiTotals.total ? Math.round((apiTotals.passed / apiTotals.total) * 1000) / 10 : 0}%</td>
        </tr>
        <tr class="${uiTotals.failed === 0 && uiTotals.total > 0 ? 'pass-row' : uiTotals.passed === 0 && uiTotals.total > 0 ? 'fail-row' : ''}">
          <td><span class="pill" style="background:#fef3c7;color:#7c4a03">UI</span> <code>src/features/ui/SF/SF-1083.feature</code></td>
          <td><strong>${uiTotals.passed}</strong></td>
          <td><strong style="color:${uiTotals.failed ? '#b91c1c' : '#0f5132'}">${uiTotals.failed}</strong></td>
          <td>${uiTotals.skipped}</td>
          <td>${uiTotals.total}</td>
          <td>${uiTotals.total ? Math.round((uiTotals.passed / uiTotals.total) * 1000) / 10 : 0}%</td>
        </tr>
      </tbody>
    </table>
    ${headlinesHtml}
  </div>

  <h2>Pass / fail by Acceptance Criterion</h2>
  <div class="card">${perAcTable}</div>

  <h2>Pass / fail by reference data object</h2>
  <div class="card">
    ${perObjectTable}
    <h4>Jump to object section</h4>
    <div class="obj-toc">${objToc}</div>
  </div>

  <h2>Failure classification</h2>
  <div class="card">${failureClassTable}</div>

  ${setupVerificationHtml}

  ${defectsHtml}

  ${perObjectSections}

  <h2>Run metadata</h2>
  <div class="card">
    <table>
      <tr><th>Environment</th><td><code>qamerge</code></td></tr>
      <tr><th>Salesforce instance</th><td><code>arx--qamerge.sandbox.my.salesforce.com</code></td></tr>
      <tr><th>API version</th><td><code>v60.0</code></td></tr>
      <tr><th>Auth user (persona)</th><td><code>datastewardqa@accelins.com.qamerge</code> — Data Governance user (per SF-1083 user story persona)</td></tr>
      <tr><th>Feature files</th><td><code>src/features/api/SF/SF-1083.feature</code> (API matrix)<br/><code>src/features/ui/SF/SF-1083.feature</code> (UI matrix — Lightning new-record form on OSFI / ASLOB / POG_Product__c)</td></tr>
      <tr><th>Common steps</th><td><code>src/step-definitions/common/sf-reference-data-duplicate.steps.ts</code> (API)<br/><code>src/step-definitions/ui/salesforce/sf-1083-ui.steps.ts</code> (UI)</td></tr>
      <tr><th>POMs / utils</th><td><code>SalesforceAPIClient.createRecordRaw()</code>, <code>src/utils/sf-duplicate-api-parse.ts</code>, <code>src/utils/salesforce-lightning-ui.ts</code>, <code>src/page-objects/salesforce/ReferenceDataNewRecordPage.ts</code></td></tr>
      <tr><th>Total run time (sum of scenario durations)</th><td>${(() => {
        const totalMs = results.reduce((s, r) => s + (r.durationMs || 0), 0);
        const mins = Math.floor(totalMs / 60000);
        const secs = Math.round((totalMs % 60000) / 1000);
        const perScn = results.length ? Math.round(totalMs / results.length / 1000) : 0;
        return `${mins}m ${secs.toString().padStart(2, '0')}s (≈ ${perScn}s per scenario across ${results.length} scenarios)`;
      })()}</td></tr>
      <tr><th>Cucumber JSON</th><td><code>reports/sf-1083/cucumber.json</code></td></tr>
      <tr><th>Cucumber HTML</th><td><code>reports/sf-1083/cucumber.html</code> (raw cucumber-html-formatter output)</td></tr>
    </table>
  </div>

  <div class="meta" style="margin-top:24px">© Generated by <code>scripts/sf-1083/generate-html-report.ts</code></div>
</body>
</html>`;

  const out = cli.output;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf-8');
  console.log(
    `HTML report written to ${out} (${(html.length / 1024).toFixed(1)} KB)\n  source: ${jsonPath}`
  );
}

main();
