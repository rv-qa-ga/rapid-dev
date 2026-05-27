#!/usr/bin/env node
/**
 * Build a single Multiple Cucumber HTML Reporter dashboard from the four Cucumber JSON
 * files produced by `run-lloyds-module-xmlflow-by-pp.js` (PP-392 … PP-395).
 *
 * Prerequisite: a completed by-pp run (JSON under reports/json/).
 *
 * Usage (from repo root):
 *   node scripts/lloyds/generate-lloyds-module-xmlflow-by-pp-combined-html.js
 *   node scripts/lloyds/generate-lloyds-module-xmlflow-by-pp-combined-html.js --manifest reports/lloyds-module-xmlflow-pp-manifest-2026-04-28_21-38-18.json
 *
 * Output: reports/html/lloyds-module-xmlflow-PP-392-395-<runId>/index.html
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const report = require('multiple-cucumber-html-reporter');

const repoRoot = path.resolve(__dirname, '..', '..');
const reportsJson = path.join(repoRoot, 'reports', 'json');
const reportsHtml = path.join(repoRoot, 'reports', 'html');
const manifestDir = path.join(repoRoot, 'reports');

function parseArgs(argv) {
  let manifestPath = '';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--manifest' && argv[i + 1]) {
      manifestPath = path.resolve(repoRoot, argv[++i]);
    } else if (argv[i]?.startsWith('--manifest=')) {
      manifestPath = path.resolve(repoRoot, argv[i].slice('--manifest='.length));
    }
  }
  return { manifestPath };
}

function findLatestManifest() {
  if (!fs.existsSync(manifestDir)) return null;
  const files = fs
    .readdirSync(manifestDir)
    .filter((f) => f.startsWith('lloyds-module-xmlflow-pp-manifest-') && f.endsWith('.json'))
    .map((f) => {
      const p = path.join(manifestDir, f);
      return { p, m: fs.statSync(p).mtimeMs };
    })
    .sort((a, b) => b.m - a.m);
  return files.length ? files[0].p : null;
}

function loadManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const m = JSON.parse(raw);
  const wanted = ['PP-392', 'PP-393', 'PP-394', 'PP-395'];
  const byWi = new Map((m.runs || []).map((r) => [r.workItem, r]));
  const jsonPaths = [];
  for (const wi of wanted) {
    const run = byWi.get(wi);
    if (!run?.jsonReport) {
      throw new Error(`Manifest missing run for ${wi}: ${manifestPath}`);
    }
    const abs = path.join(repoRoot, run.jsonReport.replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) {
      throw new Error(`JSON not found for ${wi}: ${abs}`);
    }
    jsonPaths.push({ wi, abs });
  }
  return { runId: m.runId || path.basename(manifestPath, '.json').replace(/^lloyds-module-xmlflow-pp-manifest-/, ''), jsonPaths };
}

function main() {
  const { manifestPath: explicit } = parseArgs(process.argv.slice(2));
  const manifestPath = explicit || findLatestManifest();
  if (!manifestPath) {
    console.error('No manifest found. Run by-pp tests first, or pass --manifest <path>.');
    process.exit(1);
  }
  if (!fs.existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    process.exit(1);
  }

  const { runId, jsonPaths } = loadManifest(manifestPath);
  const outDir = path.join(reportsHtml, `lloyds-module-xmlflow-PP-392-395-${runId}`);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lloyds-xmlflow-pp-html-'));

  try {
    for (const { wi, abs } of jsonPaths) {
      const dest = path.join(tmpDir, `${wi}-${path.basename(abs)}`);
      fs.copyFileSync(abs, dest);
    }

    const reportTimestamp = new Date().toLocaleString();
    const envLabel = process.env.ENV || process.env.REPORT_ENV_LABEL || 'qa';

    report.generate({
      jsonDir: tmpDir,
      reportPath: outDir,
      metadata: {
        browser: { name: 'API / integration', version: 'n/a' },
        device: 'Local',
        platform: { name: process.platform, version: process.version },
      },
      customData: {
        title: `Lloyd's module XML flow — PP-392–395 — ${reportTimestamp}`,
        data: [
          { label: 'Manifest', value: path.relative(repoRoot, manifestPath) },
          { label: 'Environment', value: String(envLabel).toUpperCase() },
          { label: 'Run id', value: runId },
          { label: 'Slices', value: jsonPaths.map((j) => j.wi).join(', ') },
        ],
      },
      pageTitle: `Lloyd's module XML flow PP-392–395 (${runId})`,
      reportName: "Lloyd's module XML flow — combined PP-392–395",
      openReportInBrowser: false,
      displayDuration: true,
      displayReportTime: true,
      pageFooter: `<p><em>Combined from manifest · ${path.basename(manifestPath)}</em></p>`,
    });

    const indexHtml = path.join(outDir, 'index.html');
    console.log(`✅ Combined HTML report: ${indexHtml}`);
    console.log(`   (source manifest: ${manifestPath})`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
