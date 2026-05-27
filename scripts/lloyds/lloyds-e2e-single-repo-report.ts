#!/usr/bin/env ts-node
/**
 * Run Lloyd's **single-repo** E2E feature (`lloyds-pipeline-e2e-readonly-repo-US-60464.feature` by default),
 * write a dedicated Cucumber JSON file, then emit a **Markdown** report listing every step,
 * status, duration, step-definition location, and a short **“What was validated”** narrative.
 *
 * Usage:
 *   npm run lloyds:e2e-repo-report
 *   cross-env ENV=qa LLOYDS_E2E_READINESS_ACK=1 ts-node scripts/lloyds/lloyds-e2e-single-repo-report.ts
 *   ts-node scripts/lloyds/lloyds-e2e-single-repo-report.ts --repo US-60464 --skip-cucumber --json-in reports/lloyds/repo-report.json
 *
 * Requires: same env as `npm run test:lloyds:e2e-readonly` (Snowflake, Dataverse, optional SQL_LLOYDS_*, SQLSERVER_*, F&O OData flags).
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import '../../src/config/config';

/** Human-readable “what this step checks” — first regex match wins. */
const VALIDATION_HINTS: Array<{ re: RegExp; validated: string }> = [
  {
    re: /sanity plan is loaded/i,
    validated:
      'Loads `sanity-plan.json` / cohort planner so Lloyd’s repo list and runnable rows are known to the scenario.',
  },
  {
    re: /E2E read-only readiness gate/i,
    validated:
      'Operator readiness gate (`LLOYDS_E2E_READINESS_ACK` or TTY prompt) — confirms intentional post-cleanup run.',
  },
  {
    re: /Snowflake connection.*FINANCIAL_OPERATIONS/i,
    validated:
      'Opens read-only ADP Snowflake session (`FINANCIAL_OPERATIONS` / FOWD summary path) — Entra OAuth (CLIENT_ID+SECRET), EXTERNALBROWSER, or password per env.',
  },
  {
    re: /loaded the latest ADP summary row/i,
    validated:
      'Selects latest `FOWD__AGENCY_POLICY_FO_SUMMARY_V1` row for the repository (`_ACCEL_REPOSITORY_ID`, `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` ordering).',
  },
  {
    re: /fetch the latest Lloyd's XML File record/i,
    validated:
      'Reads Dataverse `accelins_workflows` (XML File / workflow) for the repository file master id — correlation, ODS/XML totals, blob id.',
  },
  {
    re: /Dataverse workflow totals should match the ADP summary/i,
    validated:
      'Compares Dataverse **workflow (ODS)** currency + PRM/COM/COI/TAX/OTH to ADP Snowflake summary within tolerance.',
  },
  {
    re: /Dataverse XML totals should match the ADP summary/i,
    validated:
      'Compares Dataverse **XML** total columns to ADP Snowflake summary (same monetary bands).',
  },
  {
    re: /Dataverse XML totals should match the Dataverse workflow totals/i,
    validated:
      'Internal consistency: persisted **XML** totals vs **workflow (ODS)** totals on the same Dataverse row.',
  },
  {
    re: /download the Mule XML blob/i,
    validated:
      'Downloads generated journal XML from Azure **`mulesoft-xml`** using blob id / file name from Dataverse.',
  },
  {
    re: /totals parsed from the downloaded journal XML should match the ADP summary/i,
    validated:
      'Parses blob XML journal lines and compares decoded totals to ADP summary (cross-system ADP ↔ Mule artifact).',
  },
  {
    re: /load FOWD detail rows/i,
    validated:
      'Loads Snowflake `FOWD__AGENCY_POLICY_FO_V1` detail rows for repository + `_ACCEL_UNIQUE_RUN_ID` from the summary row.',
  },
  {
    re: /FOWD detail rows should match the downloaded journal XML/i,
    validated:
      'Line-level programme mapping: FOWD agency rows vs blob XML per `defaultAdpXmlMapping` / convention pairs.',
  },
  {
    re: /query Tagetik rows for repository.*loaded ADP run id/i,
    validated:
      'Queries Snowflake `FOWT__TAGETIK_V1` for `REPOSITORY_ID` + run id (Tagetik slice in FinOps warehouse).',
  },
  {
    re: /Tagetik slice rows for this run should exist/i,
    validated:
      'Asserts at least one Tagetik slice row matches repo + `_ACCEL_UNIQUE_RUN_ID` (or skips if not yet posted).',
  },
  {
    re: /TDS SQL is configured for TagetikWrittenforDataLoaderADP/i,
    validated:
      'Gate: `SQL_LLOYDS_SERVER` set — else step skips (TDS SQL host for `tagetik.TagetikWrittenforDataLoaderADP`).',
  },
  {
    re: /query TDS TagetikWrittenforDataLoaderADP/i,
    validated:
      'SQL query on `[TDS].[tagetik].[TagetikWrittenforDataLoaderADP]` (SPN or DefaultAzureCredential) filtered by repository (+ optional run column).',
  },
  {
    re: /TDS TagetikWrittenforDataLoaderADP should have at least one row/i,
    validated:
      'Asserts reporting load landed in TDS Tagetik table for this repository (non-empty result set).',
  },
  {
    re: /SQL Server is configured for Lloyd's Mule PROCESS_TRACKER/i,
    validated:
      'Gate: merged SQL host (`SQLSERVER_HOST` or `AZURE_SQL_DB_DEV_SERVER`) + Entra (`SQLSERVER_*` or `D365_*`) or SQL auth — else skips.',
  },
  {
    re: /fetch the latest PROCESS_TRACKER row/i,
    validated:
      'Reads `dbo.PROCESS_TRACKER` latest row for `REPO_ID` (Mule process id, stage, status, blob path).',
  },
  {
    re: /PROCESS_TRACKER row should exist with a non-empty PROCESS_ID/i,
    validated:
      'Asserts Mule integration tracker has a row with non-empty `PROCESS_ID` for the repository.',
  },
  {
    re: /Dataverse XML File record from the last fetch should exist/i,
    validated:
      'Asserts the fetched `accelins_workflows` projection has a primary id (record exists in Dataverse).',
  },
  {
    re: /query Tagetik slice "FOWT__TAGETIK_V1"/i,
    validated:
      'Snowflake `FOWT__TAGETIK_V1` rows for `REPOSITORY_ID` (repo-level Tagetik readiness).',
  },
  {
    re: /Tagetik slice rows exist for this repository or the scenario is skipped/i,
    validated:
      'Non-empty Tagetik slice for repo or skip when Stage 5 not populated yet.',
  },
  {
    re: /Lloyd's F&O OData per-repository read is configured/i,
    validated:
      'Gate: `LLOYDS_FNO_ODATA_ENABLED` + base URL + `LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE` — else skips.',
  },
  {
    re: /request F&O OData for repository/i,
    validated:
      'HTTP GET to Dynamics F&O OData API for AEUM-scoped path with `{repo}` substituted.',
  },
  {
    re: /F&O OData HTTP status should be 200/i,
    validated:
      'Asserts F&O OData response is HTTP 200 (entity exists / filter matched for this repo).',
  },
];

function hintForStep(stepName: string): string {
  const s = stepName.replace(/\n/g, ' ').trim();
  for (const { re, validated } of VALIDATION_HINTS) {
    if (re.test(s)) return validated;
  }
  return 'Automation executed this step; see Gherkin text and `match.location` for the exact binding.';
}

function formatDurationNs(ns: number | undefined): string {
  if (ns === undefined || ns === null || !Number.isFinite(ns)) return '—';
  const ms = ns / 1e6;
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function statusEmoji(status: string | undefined): string {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'pending':
      return 'pending';
    default:
      return status ?? 'unknown';
  }
}

type CucumberStep = {
  keyword?: string;
  name?: string;
  hidden?: boolean;
  match?: { location?: string };
  result?: { status?: string; duration?: number; error_message?: string };
};

type CucumberElement = {
  type?: string;
  keyword?: string;
  name?: string;
  line?: number;
  steps?: CucumberStep[];
};

function isScenarioElement(el: CucumberElement): boolean {
  if (el.type === 'background') return false;
  const k = (el.keyword || '').trim();
  return k === 'Scenario' || k === 'Scenario Outline' || el.type === 'scenario';
}

/** When set, only scenarios whose title references this repo id (e.g. US-60464) appear in the report. */
function scenarioMatchesRepo(el: CucumberElement, repo: string | undefined): boolean {
  if (!repo) return true;
  const name = el.name || '';
  return name.includes(repo);
}

type CucumberFeature = {
  uri?: string;
  name?: string;
  elements?: CucumberElement[];
};

function buildMarkdownReport(opts: {
  repo: string;
  jsonPath: string;
  cucumberExitCode: number;
  finishedAt: string;
}): string {
  const raw = fs.readFileSync(opts.jsonPath, 'utf-8');
  const features = JSON.parse(raw) as CucumberFeature[];
  const lines: string[] = [];

  lines.push(`# Lloyd's E2E single-repo report — **${opts.repo}**`);
  lines.push('');
  lines.push(
    `- **Scope:** scenarios whose title references repository **${opts.repo}** (multi-repo JSON inputs are filtered to this repo only).`,
  );
  lines.push(`- **Generated:** ${opts.finishedAt}`);
  lines.push(`- **Cucumber JSON:** \`${path.relative(process.cwd(), opts.jsonPath).replace(/\\/g, '/')}\``);
  lines.push(
    `- **Cucumber exit code:** ${opts.cucumberExitCode} (${opts.cucumberExitCode === 0 ? 'success' : 'failures present — see errors below'})`,
  );
  lines.push('');
  lines.push('## Executive summary');
  lines.push('');
  let total = 0;
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const scenarioRows: string[] = [];

  for (const feature of features || []) {
    for (const el of feature.elements || []) {
      if (!isScenarioElement(el) || !scenarioMatchesRepo(el, opts.repo)) continue;
      const steps = (el.steps || []).filter((s) => !s.hidden);
      const st = steps.map((s) => s.result?.status);
      total += 1;
      const hasFail = st.includes('failed');
      const allSkipped = st.length > 0 && st.every((x) => x === 'skipped');
      if (hasFail) failed += 1;
      else if (allSkipped) skipped += 1;
      else passed += 1;
      const status = hasFail ? 'FAILED' : allSkipped ? 'ALL STEPS SKIPPED' : 'PASSED';
      scenarioRows.push(`| ${(el.name || '(unnamed)').replace(/\|/g, '\\|')} | ${status} |`);
    }
  }

  lines.push(`| Metric | Count |`);
  lines.push(`|--------|------:|`);
  lines.push(`| Scenarios (executed) | ${total} |`);
  lines.push(`| Passed (no failed step) | ${passed} |`);
  lines.push(`| Failed | ${failed} |`);
  lines.push(`| All steps skipped | ${skipped} |`);
  lines.push('');
  lines.push('### Scenario outcomes');
  lines.push('');
  lines.push('| Scenario | Outcome |');
  lines.push('|----------|---------|');
  lines.push(...scenarioRows);
  lines.push('');

  lines.push('## Per-scenario detail (every step)');
  lines.push('');

  for (const feature of features || []) {
    for (const el of feature.elements || []) {
      if (!isScenarioElement(el) || !scenarioMatchesRepo(el, opts.repo)) continue;
      lines.push(`### ${el.name || 'Scenario'}`);
      lines.push('');
      lines.push(`| # | Result | Duration | Step | What was validated | Step definition |`);
      lines.push('|---:|--------|----------|------|--------------------|-----------------|');
      let n = 0;
      for (const step of el.steps || []) {
        if (step.hidden) continue;
        n += 1;
        const kw = (step.keyword || '').trim();
        const nm = (step.name || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
        const loc = (step.match?.location || '—').replace(/\|/g, '\\|');
        const st = statusEmoji(step.result?.status);
        const dur = formatDurationNs(step.result?.duration);
        const val = hintForStep(nm).replace(/\|/g, '\\|');
        lines.push(`| ${n} | ${st} | ${dur} | ${kw} ${nm} | ${val} | \`${loc}\` |`);
        const err = step.result?.error_message;
        if (err && st === 'failed') {
          lines.push('');
          lines.push(`**Error (step ${n}):**`);
          lines.push('');
          lines.push('```');
          lines.push(String(err).trim());
          lines.push('```');
          lines.push('');
        }
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('');
  lines.push(
    '_Narrative hints are generated by `scripts/lloyds/lloyds-e2e-single-repo-report.ts` for Lloyd’s steps; extend `VALIDATION_HINTS` for finer wording._',
  );

  return lines.join('\n');
}

function parseArgs(argv: string[]): {
  repo: string;
  feature: string;
  jsonOut: string;
  mdOut: string;
  skipCucumber: boolean;
  jsonIn?: string;
} {
  let repo = 'US-60464';
  let feature = path.resolve(process.cwd(), 'src/features/lloyds/lloyds-pipeline-e2e-readonly-repo-US-60464.feature');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  let jsonOut = path.resolve(process.cwd(), `reports/lloyds-e2e-${repo}-cucumber-${ts}.json`);
  let mdOut = path.resolve(process.cwd(), `reports/lloyds-e2e-${repo}-report-${ts}.md`);
  let skipCucumber = false;
  let jsonIn: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--repo' || a === '-r') && argv[i + 1]) repo = argv[++i];
    else if (a.startsWith('--repo=')) repo = a.slice('--repo='.length);
    else if ((a === '--feature' || a === '-f') && argv[i + 1]) feature = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--feature=')) feature = path.resolve(process.cwd(), a.slice('--feature='.length));
    else if ((a === '--json-out' || a === '-j') && argv[i + 1]) jsonOut = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--json-out=')) jsonOut = path.resolve(process.cwd(), a.slice('--json-out='.length));
    else if ((a === '--md-out' || a === '-m') && argv[i + 1]) mdOut = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--md-out=')) mdOut = path.resolve(process.cwd(), a.slice('--md-out='.length));
    else if (a === '--skip-cucumber') skipCucumber = true;
    else if ((a === '--json-in') && argv[i + 1]) jsonIn = path.resolve(process.cwd(), argv[++i]);
    else if (a.startsWith('--json-in=')) jsonIn = path.resolve(process.cwd(), a.slice('--json-in='.length));
  }

  if (repo !== 'US-60464') {
    console.warn(
      `[warn] Only committed single-repo feature is for US-60464; you passed --repo ${repo}. ` +
        `Use --feature path/to.feature with Examples for ${repo}, or extend the repo-specific feature file.`,
    );
  }

  return { repo, feature, jsonOut, mdOut, skipCucumber, jsonIn };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  let cucumberExitCode = 0;

  if (!args.skipCucumber) {
    if (!fs.existsSync(args.feature)) {
      console.error(`Feature not found: ${args.feature}`);
      process.exit(1);
    }
    fs.mkdirSync(path.dirname(args.jsonOut), { recursive: true });
    const jsonOutFs = args.jsonOut;
    const jsonOutArg = jsonOutFs.replace(/\\/g, '/');
    const jsonFormat = `json:"${jsonOutArg}"`;
    const featureQ = args.feature.replace(/"/g, '\\"');
    const tags = '@lloyds-e2e-single-repo and not @wip';
    const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const cmd = [
      npx,
      'cucumber-js',
      `"${featureQ}"`,
      '--config',
      'cucumber.config.no-paths.js',
      '--tags',
      `"${tags}"`,
      '--format',
      jsonFormat,
      '--format',
      'progress',
    ].join(' ');
    console.log(`\n▶ ${cmd}\n`);
    try {
      execSync(cmd, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          ENV: process.env.ENV || 'qa',
          LLOYDS_E2E_READINESS_ACK: process.env.LLOYDS_E2E_READINESS_ACK || '1',
        },
        shell: true,
      });
      cucumberExitCode = 0;
    } catch (e: unknown) {
      cucumberExitCode = (e as { status?: number })?.status ?? 1;
      console.error(
        `\nCucumber exited with code ${cucumberExitCode} — still writing report from JSON if present.\n`,
      );
    }
  }

  const jsonPath = args.jsonIn ?? args.jsonOut;
  if (!fs.existsSync(jsonPath)) {
    console.error(`No Cucumber JSON at ${jsonPath}. Nothing to report.`);
    process.exit(1);
  }

  const finishedAt = new Date().toISOString();
  const md = buildMarkdownReport({
    repo: args.repo,
    jsonPath,
    cucumberExitCode: args.skipCucumber ? 0 : cucumberExitCode,
    finishedAt,
  });

  fs.mkdirSync(path.dirname(args.mdOut), { recursive: true });
  fs.writeFileSync(args.mdOut, md, 'utf-8');
  const latest = path.resolve(process.cwd(), 'reports/lloyds-e2e-latest-single-repo-report.md');
  fs.mkdirSync(path.dirname(latest), { recursive: true });
  fs.writeFileSync(latest, md, 'utf-8');
  console.log(`\n✅ Wrote Markdown report: ${args.mdOut}`);
  console.log(`✅ Latest copy: ${latest}\n`);
  if (!args.skipCucumber && cucumberExitCode !== 0) {
    process.exit(cucumberExitCode);
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
