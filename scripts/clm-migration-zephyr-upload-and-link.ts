#!/usr/bin/env ts-node
/**
 * Upload CLM migration integration test cases to Zephyr and link to Jira work items.
 *
 * Prerequisites:
 *   - CLM-MIGRATION-VALIDATION.feature tagged with @migration-intg-regression and @SF-xxx-MIG-nnn
 *   - .env.qa (or ENV) with Jira + Zephyr credentials
 *
 * Usage:
 *   npm run zephyr:UploadAndLink:SF1235
 *   npm run zephyr:UploadAndLink:CLM-Migration
 *   npx ts-node scripts/clm-migration-zephyr-upload-and-link.ts --list-only
 *   npx ts-node scripts/clm-migration-zephyr-upload-and-link.ts --work-item SF-736
 */
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const WORK_ITEMS_FILE = path.join(process.cwd(), 'inputs', 'clm-migration-jira-work-items.txt');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function loadWorkItems(): string[] {
  if (!fs.existsSync(WORK_ITEMS_FILE)) {
    throw new Error(`Work items file not found: ${WORK_ITEMS_FILE}`);
  }
  return fs
    .readFileSync(WORK_ITEMS_FILE, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && /^[A-Z]+-\d+$/.test(line));
}

function runUploadAndLink(workItems: string[]): number {
  const args = ['run', 'zephyr:UploadAndLink', '--', ...workItems.flatMap((wi) => ['--work-item', wi])];
  const r = spawnSync(npm, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      ZEPHYR_NON_INTERACTIVE: process.env.ZEPHYR_NON_INTERACTIVE || 'true',
      ZEPHYR_DUPLICATE_ACTION: process.env.ZEPHYR_DUPLICATE_ACTION || 'update',
    },
  });
  return r.status ?? 1;
}

function main(): void {
  const listOnly = process.argv.includes('--list-only');
  const wiArgIdx = process.argv.indexOf('--work-item');
  const single =
    wiArgIdx >= 0 && process.argv[wiArgIdx + 1] ? [process.argv[wiArgIdx + 1].trim()] : null;
  const workItems = single ?? loadWorkItems();

  console.log(`CLM migration Zephyr upload: ${workItems.length} work item(s)`);
  workItems.forEach((wi) => console.log(`  - ${wi}`));

  if (listOnly) {
    process.exit(0);
  }

  process.exit(runUploadAndLink(workItems));
}

main();
