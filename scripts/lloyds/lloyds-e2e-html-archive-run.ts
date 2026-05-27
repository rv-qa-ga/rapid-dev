#!/usr/bin/env ts-node
/**
 * Write two timestamped Cucumber HTML report folders from the latest E2E JSON:
 *   - <iso-stamp>-full     — entire cucumber-report.json
 *   - <iso-stamp>-<REPO> — scenarios in lloyds E2E read-only features for that repo id (see --repo)
 *
 * Output: reports/html/lloyds-e2e-runs/<stamp>-full/index.html (and …-US-60464/…)
 *
 * Usage:
 *   npx ts-node scripts/lloyds/lloyds-e2e-html-archive-run.ts
 *   npx ts-node scripts/lloyds/lloyds-e2e-html-archive-run.ts --repo US-99999
 *   npx ts-node scripts/lloyds/lloyds-e2e-html-archive-run.ts --json path/to/cucumber-report.json
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { extractRepoFromName } from './repo-matrix-from-cucumber-json';
import { injectLloydsPipelineForReportDir } from './lloyds-e2e-pipeline-diagram';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const report = require('multiple-cucumber-html-reporter') as {
  generate: (opts: Record<string, unknown>) => void;
};

const DEFAULT_JSON = path.resolve(process.cwd(), 'reports/json/cucumber-report.json');
const RUN_ROOT = path.resolve(process.cwd(), 'reports/html/lloyds-e2e-runs');

function parseArgs(argv: string[]): { jsonPath: string; repoId: string } {
  let jsonPath = DEFAULT_JSON;
  let repoId = 'US-60464';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json' && argv[i + 1]) {
      jsonPath = path.resolve(process.cwd(), argv[++i]);
    } else if (argv[i] === '--repo' && argv[i + 1]) {
      repoId = argv[++i].trim();
    } else if (argv[i]?.startsWith('--json=')) {
      jsonPath = path.resolve(process.cwd(), argv[i].slice('--json='.length));
    } else if (argv[i]?.startsWith('--repo=')) {
      repoId = argv[i].slice('--repo='.length).trim();
    }
  }
  return { jsonPath, repoId };
}

function loadEnvironmentInfo() {
  const envLabel = process.env.REPORT_ENV_LABEL;
  const env = envLabel || process.env.ENV || 'qa';
  const baseUrl = process.env.SF_BASE_URL || 'Not configured';
  const username = process.env.SF_USERNAME || 'Not configured';
  return { env: env.toUpperCase(), baseUrl, username };
}

function countFailedScenarios(jsonData: unknown): number {
  if (!Array.isArray(jsonData)) return 0;
  let n = 0;
  for (const feature of jsonData) {
    for (const el of feature.elements || []) {
      const failed = (el.steps || []).some((s: { result?: { status?: string } }) => s.result?.status === 'FAILED');
      if (failed) n++;
    }
  }
  return n;
}

function filterE2eFeaturesByRepo(raw: unknown, repoId: string): unknown[] {
  if (!Array.isArray(raw)) return [];
  const out: unknown[] = [];
  for (const feature of raw) {
    const uri = String((feature as { uri?: string }).uri || '');
    const norm = uri.replace(/\\/g, '/');
    if (!norm.includes('lloyds-pipeline-e2e-readonly') && !norm.includes('lloyds-e2e-readonly-repo')) continue;
    const elements = ((feature as { elements?: unknown[] }).elements || []).filter((el: any) => {
      const name = String(el.name || '');
      if (name.includes(repoId)) return true;
      return extractRepoFromName(name) === repoId;
    });
    if (elements.length === 0) continue;
    out.push({ ...(feature as object), elements });
  }
  return out;
}

function writeReport(jsonDir: string, reportPath: string, label: string, jsonData: unknown): void {
  const envInfo = loadEnvironmentInfo();
  const reportTimestamp = new Date().toLocaleString();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const failures = countFailedScenarios(jsonData);

  fs.mkdirSync(reportPath, { recursive: true });

  report.generate({
    jsonDir,
    reportPath,
    metadata: {
      browser: { name: 'chrome', version: 'latest' },
      device: 'Local Test Machine',
      platform: { name: process.platform, version: process.version },
    },
    customData: {
      title: `Lloyd's E2E — ${label} — ${reportTimestamp}`,
      data: [
        { label: 'Slice', value: label },
        { label: 'Environment', value: envInfo.env },
        { label: 'Execution', value: reportTimestamp },
        { label: 'ISO stamp', value: stamp },
        { label: 'Failed scenarios', value: String(failures) },
      ],
    },
    pageTitle: `Lloyd's E2E (${label}) — ${envInfo.env} — ${reportTimestamp}`,
    reportName: `Lloyd's pipeline E2E — ${label}`,
    openReportInBrowser: false,
    displayDuration: true,
    displayReportTime: true,
    pageFooter: `<p><em>${label} · ${envInfo.env} · Generated ${reportTimestamp}</em></p>`,
  });
}

/**
 * Build timestamped HTML under reports/html/lloyds-e2e-runs/ from a Cucumber JSON file.
 * Safe to import from other scripts in the same Node process (no subprocess).
 */
export function generateLloydsE2eHtmlArchiveFromJson(jsonPath: string, repoId: string): void {
  if (!fs.existsSync(jsonPath)) {
    throw new Error(
      `Cucumber JSON not found: ${jsonPath}\nRun Lloyd's E2E first, then re-run the HTML step.`,
    );
  }

  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(RUN_ROOT, { recursive: true });

  const baseTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lloyds-e2e-html-'));

  try {
    const fullJsonDir = path.join(baseTmp, 'full');
    fs.mkdirSync(fullJsonDir, { recursive: true });
    fs.copyFileSync(jsonPath, path.join(fullJsonDir, 'cucumber-report.json'));
    const outFull = path.join(RUN_ROOT, `${stamp}-full`);
    writeReport(fullJsonDir, outFull, 'all repos (full JSON)', raw);
    console.log(`✅ Full report: ${path.join(outFull, 'index.html')}`);
    injectLloydsPipelineForReportDir(outFull, raw, repoId);

    const filtered = filterE2eFeaturesByRepo(raw, repoId);
    if (filtered.length === 0) {
      console.warn(`⚠️ No scenarios matched repo "${repoId}" in lloyds-pipeline-e2e-readonly — skipping filtered report.`);
    } else {
      const filtJsonDir = path.join(baseTmp, 'filtered');
      fs.mkdirSync(filtJsonDir, { recursive: true });
      fs.writeFileSync(path.join(filtJsonDir, 'cucumber-report.json'), JSON.stringify(filtered, null, 2), 'utf-8');
      const outRepo = path.join(RUN_ROOT, `${stamp}-${repoId}`);
      writeReport(filtJsonDir, outRepo, `repo ${repoId} only`, filtered);
      console.log(`✅ Repo slice: ${path.join(outRepo, 'index.html')} (${filtered.length} feature(s))`);
      injectLloydsPipelineForReportDir(outRepo, filtered, repoId);
    }
  } finally {
    fs.rmSync(baseTmp, { recursive: true, force: true });
  }

  console.log(`\nRun root: ${RUN_ROOT}`);
}

function main(): void {
  const { jsonPath, repoId } = parseArgs(process.argv.slice(2));
  try {
    generateLloydsE2eHtmlArchiveFromJson(jsonPath, repoId);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
