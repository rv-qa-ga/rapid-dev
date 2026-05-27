#!/usr/bin/env node
/**
 * Run SF-736 on qamerge, snapshot isolated Cucumber JSON, upload to Zephyr Sprint-105-QA.
 * Upload runs even if tests fail.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const srcJson = path.join(root, 'reports/json/cucumber-report.json');
const destJson = path.join(root, 'reports/json/sf736-cucumber-report.json');

function run(script) {
  const r = spawnSync(npm, ['run', script], { stdio: 'inherit', cwd: root, shell: true });
  return r.status ?? 1;
}

const testExit = run('test:sf736:qamerge');
if (fs.existsSync(srcJson)) {
  fs.mkdirSync(path.dirname(destJson), { recursive: true });
  fs.copyFileSync(srcJson, destJson);
}
const zephyrExit = run('zephyr:UploadResult:SF736:Sprint105');
process.exit(testExit !== 0 ? testExit : zephyrExit);
