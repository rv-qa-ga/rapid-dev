/**
 * Create one sample record at each stage (S1, S2S3, S4S5).
 *
 * - Record 1 (Approval Ready_001): S1 only – created and populated, ready to submit.
 * - Record 2 (Approval Ready_002): S2+S3 – created, submitted, and approved.
 * - Record 3 (Approval Ready_003): S4+S5 – created, submitted, approved, post-approval updates applied, Opportunity Team added.
 *
 * Requires .env.qa with JWT, SF_QAMRDUSER_JWT_USERNAME, CONTRACTING_APPROVAL_PROCESS_NAME,
 * OPPORTUNITY_APPROVER_USERNAMES_* (US at minimum for record 2 and 3; legacy CONTRACTING_* OK), and CONTRACTING_TEAM_* for record 3.
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/create-contracting-samples-by-stage.ts
 *   npm run data:contracting-samples-by-stage
 */

import { spawnSync } from 'child_process';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

const env = process.env.ENV || 'qa';
const envFile = path.resolve(__dirname, '..', 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[OK] Loaded ${envFile} for contracting env vars\n`);
}

const scriptPath = path.resolve(__dirname, 'generate-contracting-test-data.ts');

function run(overrides: Record<string, string>): boolean {
  const envWithOverrides = { ...process.env, ENV: env, ...overrides };
  console.log('\n' + '='.repeat(60));
  console.log('  Running:', overrides.CONTRACTING_RUN_STAGE || 'create + optional submit', '| start=', overrides.CONTRACTING_DATA_START, 'count=', overrides.CONTRACTING_DATA_COUNT);
  console.log('='.repeat(60));
  const result = spawnSync('npx', ['ts-node', scriptPath], {
    env: envWithOverrides as NodeJS.ProcessEnv,
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    shell: true,
  });
  if (result.status !== 0 && result.error) {
    console.error('[ERROR]', result.error.message);
  }
  return result.status === 0;
}

async function main() {
  console.log('\nCreating one sample record per stage (S1, S2S3, S4S5)...\n');

  const base = {
    CONTRACTING_DATA_REGION: 'US',
    USE_QA_MRD_AS_OWNER: 'true',
    CONTRACTING_PARTY_CODE_PREFIX: 'QA',
  };

  if (!run({ ...base, CONTRACTING_DATA_START: '1', CONTRACTING_DATA_COUNT: '1', CONTRACTING_RUN_STAGE: 'S1' })) {
    console.error('\n[FAIL] S1 sample (WF_001) failed.');
    process.exit(1);
  }

  // 2. S2S3 sample: WF_002 (create then submit + approve)
  if (!run({ ...base, CONTRACTING_DATA_START: '2', CONTRACTING_DATA_COUNT: '1', CONTRACTING_RUN_STAGE: 'S1' })) {
    console.error('\n[FAIL] Create for S2S3 sample failed.');
    process.exit(1);
  }
  if (!run({ ...base, CONTRACTING_DATA_START: '2', CONTRACTING_DATA_COUNT: '1', CONTRACTING_RUN_STAGE: 'S2S3' })) {
    console.error('\n[FAIL] S2S3 sample (WF_002) submit+approve failed.');
    process.exit(1);
  }

  // 3. S4S5 sample: WF_003 (create, submit+approve, then post-approval + team)
  if (!run({ ...base, CONTRACTING_DATA_START: '3', CONTRACTING_DATA_COUNT: '1', CONTRACTING_RUN_STAGE: 'S1' })) {
    console.error('\n[FAIL] Create for S4S5 sample failed.');
    process.exit(1);
  }
  if (!run({ ...base, CONTRACTING_DATA_START: '3', CONTRACTING_DATA_COUNT: '1', CONTRACTING_RUN_STAGE: 'S2S3' })) {
    console.error('\n[FAIL] Submit+approve for S4S5 sample failed.');
    process.exit(1);
  }
  if (!run({ ...base, CONTRACTING_DATA_START: '3', CONTRACTING_DATA_COUNT: '1', CONTRACTING_RUN_STAGE: 'S4S5' })) {
    console.error('\n[FAIL] S4S5 sample (WF_003) post-approval + team failed.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Done. Three sample records created:');
  console.log('  - WF_001: at S1 (ready to submit)');
  console.log('  - WF_002: at S2+S3 (submitted & approved, if CONTRACTING_APPROVAL_PROCESS_NAME set)');
  console.log('  - WF_003: at S4+S5 (post-approval, team added, if Party Code / approvers set)');
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
