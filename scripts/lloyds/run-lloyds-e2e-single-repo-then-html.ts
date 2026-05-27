#!/usr/bin/env ts-node
/**
 * Generate a one-repo Lloyd's E2E read-only feature from the template, run Cucumber via
 * `scripts/run-tests-with-env.js`, then write timestamped HTML (full JSON + repo slice)
 * using `lloyds-e2e-html-archive-run.ts`.
 *
 * Usage:
 *   npm run lloyds:e2e-single-repo-then-html -- --repo US-57244
 *   npx ts-node scripts/lloyds/run-lloyds-e2e-single-repo-then-html.ts --repo US-60464
 *
 * Requires: ENV (e.g. cross-env ENV=qa), LLOYDS_E2E_READINESS_ACK=1 for non-interactive runs.
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

import { generateLloydsE2eHtmlArchiveFromJson } from './lloyds-e2e-html-archive-run';

const TEMPLATE = path.resolve(
  __dirname,
  'templates/lloyds-pipeline-e2e-readonly-single-repo.feature.template',
);
const REPO_RE = /^US-\d+$/i;

function printHelp(): void {
  console.log(`
Lloyd's — single-repository E2E read-only + HTML archives

Usage:
  npm run lloyds:e2e-single-repo-then-html -- --repo <REPOSITORY_ID>
  npx ts-node scripts/lloyds/run-lloyds-e2e-single-repo-then-html.ts --repo US-57244

Options:
  --repo <id>   Required. Lloyd's Agency repository id (e.g. US-60464, US-61822).
  --help        Show this message.

Environment:
  ENV=qa                         Loaded by run-tests-with-env.js (use cross-env on Windows).
  LLOYDS_E2E_READINESS_ACK=1     Skip interactive readiness prompt (CI / piped runs).

Outputs:
  reports/tmp/lloyds-e2e-readonly-repo-<REPO>.feature   Generated feature (gitignored under reports/tmp).
  reports/json/cucumber-report.json                     Overwritten by the Cucumber run.
  reports/html/lloyds-e2e-runs/<iso>-full/              Full HTML report
  reports/html/lloyds-e2e-runs/<iso>-<REPO>/           Repo-filtered HTML report
`);
}

function parseRepo(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--repo' && argv[i + 1]) return argv[++i].trim();
    if (argv[i]?.startsWith('--repo=')) return argv[i].slice('--repo='.length).trim();
  }
  return null;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const raw = parseRepo(argv);
  if (!raw) {
    console.error('Missing --repo <REPOSITORY_ID>. Example: npm run lloyds:e2e-single-repo-then-html -- --repo US-57244');
    printHelp();
    process.exit(1);
  }

  const repo = raw.toUpperCase();
  if (!REPO_RE.test(repo)) {
    console.error(`Invalid repository id "${raw}". Expected pattern US-<digits> (e.g. US-60464).`);
    process.exit(1);
  }

  if (!fs.existsSync(TEMPLATE)) {
    console.error(`Template not found: ${TEMPLATE}`);
    process.exit(1);
  }

  const cwd = process.cwd();
  const outDir = path.join(cwd, 'reports', 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const featurePath = path.join(outDir, `lloyds-e2e-readonly-repo-${repo}.feature`);
  const body = fs.readFileSync(TEMPLATE, 'utf-8').replace(/\{\{REPO_ID\}\}/g, repo);
  fs.writeFileSync(featurePath, body, 'utf-8');
  console.log(`\n📝 Wrote ${path.relative(cwd, featurePath)}\n`);

  const relFeature = path.relative(cwd, featurePath);
  const run = spawnSync(
    process.execPath,
    ['scripts/run-tests-with-env.js', relFeature, '--tags', '@lloyds-e2e-readonly and not @wip'],
    { stdio: 'inherit', cwd, env: process.env },
  );
  if (run.error) {
    console.error(run.error);
    process.exit(1);
  }
  if (run.status !== 0) {
    console.warn(`\n⚠️ Cucumber exited with code ${run.status} — still generating HTML from cucumber-report.json.\n`);
  }

  const runRoot = path.join(cwd, 'reports', 'html', 'lloyds-e2e-runs');
  const jsonPath = path.join(cwd, 'reports', 'json', 'cucumber-report.json');
  console.log(
    `\n📊 Generating Lloyd's HTML (full JSON + repo slice) → ${runRoot}\n` +
      `   (reads ${path.relative(cwd, jsonPath)})\n`,
  );

  try {
    generateLloydsE2eHtmlArchiveFromJson(jsonPath, repo);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  console.log('\n✅ Lloyd\'s E2E + HTML pipeline finished.\n');
}

main();
