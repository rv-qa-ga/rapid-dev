#!/usr/bin/env node
/**
 * Run SF-594 + SF-595 on qamerge, then upload results to Zephyr Sprint-105-QA
 * (Zephyr upload runs even if tests fail).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  const r = spawnSync(npm, ['run', script], { stdio: 'inherit', cwd: root, shell: true });
  return r.status ?? 1;
}

const testExit = run('test:sf594-595:qamerge');
const zephyr594 = run('zephyr:UploadResult:SF594:Sprint105');
const zephyr595 = run('zephyr:UploadResult:SF595:Sprint105');
const zephyrExit = zephyr594 !== 0 ? zephyr594 : zephyr595;
process.exit(testExit !== 0 ? testExit : zephyrExit);
