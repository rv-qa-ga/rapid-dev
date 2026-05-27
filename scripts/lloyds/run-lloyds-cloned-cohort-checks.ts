#!/usr/bin/env ts-node
/**
 * Read-only programme cohort sweep: ADP Snowflake latest summary per `LLOYDS_CLONED_REPOSITORY_IDS` (**seventeen** repos).
 *
 * Exit 0 if every repo has a summary row with non-empty `_ACCEL_UNIQUE_RUN_ID`.
 *
 * Usage:
 *   npm run lloyds:check:cloned-cohort
 */

import {
  connectFinOpsSnowflake,
  destroyConnection,
  loadFinOpsSnowflakeEnv,
} from '../../src/utils/fowd-agency-xml-compare';
import {
  fetchLatestSummaryRowsForRepo,
  getSnowflakeCell,
} from '../../src/integrations/lloyds/snowflakeSummaryClient';
import { LLOYDS_CLONED_REPOSITORY_IDS } from '../../src/integrations/lloyds/lloydsClonedRepoCohort';

async function main(): Promise<void> {
  loadFinOpsSnowflakeEnv();
  const conn = await connectFinOpsSnowflake();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  try {
    for (const repo of LLOYDS_CLONED_REPOSITORY_IDS) {
      const rows = await fetchLatestSummaryRowsForRepo(conn, repo, 1);
      if (!rows.length) {
        throw new Error(`No ADP summary row for "${repo}"`);
      }
      const run = String(getSnowflakeCell(rows[0], '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
      if (!uuidRe.test(run)) {
        throw new Error(`Repo "${repo}": invalid _ACCEL_UNIQUE_RUN_ID "${run}"`);
      }
      const rid = String(getSnowflakeCell(rows[0], '_ACCEL_REPOSITORY_ID') ?? '').trim();
      if (rid.toUpperCase() !== repo.toUpperCase()) {
        throw new Error(`Repo "${repo}": _ACCEL_REPOSITORY_ID mismatch "${rid}"`);
      }
      console.log(`OK  ${repo}  run=${run}`);
    }
    console.log(`\nAll ${LLOYDS_CLONED_REPOSITORY_IDS.length} cloned repos have ADP summary rows.`);
  } finally {
    await destroyConnection(conn);
  }
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
