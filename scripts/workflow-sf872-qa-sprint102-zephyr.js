'use strict';
/**
 * Run SF-872 QA tests, then upload Cucumber results to Zephyr (always runs upload,
 * even when tests fail) so Sprint cycles get Pass/Fail for every scenario.
 * Exit code: test failure takes precedence over upload failure.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');

function npmRun(script) {
  const r = spawnSync('npm', ['run', script], {
    stdio: 'inherit',
    shell: true,
    env: process.env,
    cwd: root,
  });
  return r.status === 0 ? 0 : r.status ?? 1;
}

const testExit = npmRun('test:sf872:qa');
const uploadExit = npmRun('zephyr:UploadResult:SF872:Sprint102');
process.exit(testExit !== 0 ? testExit : uploadExit);
