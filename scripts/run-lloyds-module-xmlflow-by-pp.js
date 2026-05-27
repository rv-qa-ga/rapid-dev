#!/usr/bin/env node
/**
 * Run ModuleTesting-FeatureFile-UI-API-Lloyds-XMLFlow.feature once per work item (PP-391 … PP-395),
 * with a separate timestamped JSON + HTML Cucumber report for each run.
 *
 * Usage:
 *   cross-env ENV=qa node scripts/run-lloyds-module-xmlflow-by-pp.js
 *   cross-env ENV=qa node scripts/run-lloyds-module-xmlflow-by-pp.js --dry-run
 *
 * Optional: LLOYDS_PP_WORK_ITEMS=PP-391,PP-392  (subset, order preserved)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const featureRel = 'src/features/lloyds/ModuleTesting-FeatureFile-UI-API-Lloyds-XMLFlow.feature';

function formatTimestamp() {
  return new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
}

function loadEnvFile(envName) {
  const envFile = path.join(repoRoot, 'src', 'config', 'env', `.env.${envName}`);
  if (fs.existsSync(envFile)) {
    console.log(`[LOAD] ${envFile}`);
    require('dotenv').config({ path: envFile, override: true });
  } else {
    console.warn(`[WARN] Missing ${envFile}`);
  }
}

function parseWorkItems() {
  const raw = process.env.LLOYDS_PP_WORK_ITEMS;
  if (raw && raw.trim()) {
    return raw.split(',').map((s) => s.trim().replace(/^@/, ''));
  }
  return ['PP-391', 'PP-392', 'PP-393', 'PP-394', 'PP-395'];
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  let env = process.env.ENV;
  if (!env) {
    env = 'qa';
    process.env.ENV = env;
  } else {
    env = env.toLowerCase();
    process.env.ENV = env;
  }
  console.log(`[OK] ENV=${env.toUpperCase()}${dryRun ? ' (dry-run)' : ''}\n`);

  loadEnvFile(env);

  const jsonDir = path.join(repoRoot, 'reports', 'json');
  const htmlDir = path.join(repoRoot, 'reports', 'html');
  fs.mkdirSync(jsonDir, { recursive: true });
  fs.mkdirSync(htmlDir, { recursive: true });

  const workItems = parseWorkItems();
  const runId = formatTimestamp();
  const manifest = {
    feature: featureRel,
    env,
    dryRun,
    runId,
    startedAt: new Date().toISOString(),
    runs: [],
  };

  const isWindows = process.platform === 'win32';
  const featurePath = path.join(repoRoot, featureRel);

  let anyFailed = false;

  for (const wi of workItems) {
    const ts = formatTimestamp();
    const baseName = `lloyds-module-xmlflow-${wi}-${ts}`;
    const jsonRel = path.join('reports', 'json', `${baseName}.json`).replace(/\\/g, '/');
    const htmlRel = path.join('reports', 'html', `${baseName}.html`).replace(/\\/g, '/');

    const tagExpr = `@lloyds-module-xmlflow and @${wi}`;
    console.log('\n' + '='.repeat(80));
    console.log(`[RUN] ${wi}  |  tags: ${tagExpr}`);
    console.log(`[RUN] JSON: ${path.join(repoRoot, jsonRel)}`);
    console.log(`[RUN] HTML: ${path.join(repoRoot, htmlRel)}`);
    console.log('='.repeat(80) + '\n');

    const cucumberArgs = [
      'cucumber-js',
      featurePath,
      '--tags',
      tagExpr,
      // Relative to cwd (repo root); absolute paths are resolved incorrectly by cucumber-js on Windows.
      '--config',
      'cucumber.config.lloyds-module-pp-timestamped.js',
    ];
    if (dryRun) {
      cucumberArgs.push('--dry-run');
    }

    const childEnv = {
      ...process.env,
      ENV: env,
      LLOYDS_MODULE_CUCUMBER_JSON_REL: jsonRel,
      LLOYDS_MODULE_CUCUMBER_HTML_REL: htmlRel,
    };

    let status;
    if (isWindows) {
      const escaped = cucumberArgs.map((arg) => {
        if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
          return `"${String(arg).replace(/"/g, '\\"')}"`;
        }
        return arg;
      });
      const cmd = `npx ${escaped.join(' ')}`;
      const r = spawnSync(cmd, [], {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: true,
        env: childEnv,
      });
      status = r.status === null ? 1 : r.status;
    } else {
      const r = spawnSync('npx', cucumberArgs, {
        cwd: repoRoot,
        stdio: 'inherit',
        shell: false,
        env: childEnv,
      });
      status = r.status === null ? 1 : r.status;
    }

    if (status !== 0) {
      anyFailed = true;
    }

    manifest.runs.push({
      workItem: wi,
      tags: tagExpr,
      exitCode: status,
      jsonReport: jsonRel,
      htmlReport: htmlRel,
      finishedAt: new Date().toISOString(),
    });
  }

  manifest.finishedAt = new Date().toISOString();
  manifest.anyFailed = anyFailed;

  const manifestPath = path.join(repoRoot, 'reports', `lloyds-module-xmlflow-pp-manifest-${runId}.json`);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n[DONE] Manifest: ${manifestPath}`);
  console.log(
    manifest.runs.map((r) => `  ${r.workItem}: exit ${r.exitCode} → ${r.jsonReport}`).join('\n'),
  );

  process.exit(anyFailed ? 1 : 0);
}

main();
