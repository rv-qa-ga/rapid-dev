#!/usr/bin/env node
/**
 * Run SF-736 API-016 + API-017 on qamerge, snapshot Cucumber JSON, upload results to Zephyr Sprint-105-QA.
 *
 * Test cases are NOT re-synced by default (avoids Zephyr duplicates when label search misses existing cases).
 * Set ZEPHYR_UPLOAD_CASES=1 to also run zephyr:UploadAndLink:SF736 (e.g. first-time API-017 upload).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const srcJson = path.join(root, 'reports/json/cucumber-report.json');
const destJson = path.join(root, 'reports/json/sf736-cucumber-report.json');
const tags = '@SF-736-API-016 or @SF-736-API-017';

function run(script, extraEnv = {}) {
  const r = spawnSync(npm, ['run', script], {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  return r.status ?? 1;
}

function runNode(args, extraEnv = {}) {
  const r = spawnSync('node', args, {
    stdio: 'inherit',
    cwd: root,
    shell: true,
    env: { ...process.env, ENV: 'qamerge', D365_FIELD_SYNC_POLL_SECONDS: '90', ...extraEnv },
  });
  return r.status ?? 1;
}

let uploadCasesExit = 0;
if (process.env.ZEPHYR_UPLOAD_CASES === '1') {
  console.log('\n=== SF-736 API-016/017: upload test cases to Zephyr ===\n');
  uploadCasesExit = run('zephyr:UploadAndLink:SF736');
} else {
  console.log(
    '\n=== SF-736 API-016/017: skipping test case sync (set ZEPHYR_UPLOAD_CASES=1 to upload) ===\n'
  );
}

console.log('\n=== SF-736 API-016/017: run integration tests on qamerge ===\n');
const testExit = runNode([
  'scripts/run-tests-with-env.js',
  'src/features/api/SF/SF-736.feature',
  '--tags',
  tags,
]);

if (fs.existsSync(srcJson)) {
  fs.mkdirSync(path.dirname(destJson), { recursive: true });
  fs.copyFileSync(srcJson, destJson);
  console.log(`\nCopied ${srcJson} → ${destJson}\n`);
}

console.log('\n=== SF-736 API-016/017: upload results to Zephyr Sprint-105-QA ===\n');
const zephyrExit = run('zephyr:UploadResult:SF736:Sprint105');

const finalExit = testExit !== 0 ? testExit : uploadCasesExit !== 0 ? uploadCasesExit : zephyrExit;
process.exit(finalExit);
