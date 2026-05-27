#!/usr/bin/env node
/**
 * Run SF-1159 on qamerge, then upload results to Zephyr Sprint-105-QA (upload runs even if tests fail).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  const r = spawnSync(npm, ['run', script], { stdio: 'inherit', cwd: root, shell: true });
  return r.status ?? 1;
}

const testExit = run('test:sf1159:qamerge');
const zephyrExit = run('zephyr:UploadResult:SF1159:Sprint105');
process.exit(testExit !== 0 ? testExit : zephyrExit);
