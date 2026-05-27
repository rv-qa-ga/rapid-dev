#!/usr/bin/env node
/**
 * Upload new SF-594/SF-595 E2E cases to Zephyr, run API-010 on qamerge + qatest2 RDM, upload Sprint-105-QA results.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  const r = spawnSync(npm, ['run', script], { stdio: 'inherit', cwd: root, shell: true });
  return r.status ?? 1;
}

const linkExit = run('zephyr:UploadAndLink:SF594-595');
const testExit = run('test:sf594-595:e2e:qamerge:rdm');
const z594 = run('zephyr:UploadResult:SF594:Sprint105');
const z595 = run('zephyr:UploadResult:SF595:Sprint105');
const zephyrExit = z594 !== 0 ? z594 : z595;
process.exit(linkExit !== 0 ? linkExit : testExit !== 0 ? testExit : zephyrExit);
