/**
 * Lloyd's **TDS SQL** — `TagetikWrittenforDataLoaderADP` on `SQL_LLOYDS_SERVER`
 * (SPN first, then `DefaultAzureCredential` — see `lloydsTagetikTdsClient.ts`).
 */

import { Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { getSnowflakeCell } from '../../integrations/lloyds/snowflakeSummaryClient';
import { fetchTagetikWrittenForDataLoaderAdpRows } from '../../integrations/lloyds/lloydsTagetikTdsClient';
import {
  getLloydsTagetikRepositoryColumn,
  getLloydsTagetikRunColumn,
  isLloydsTagetikTdsSqlConfigured,
} from '../../integrations/lloyds/lloydsTagetikTdsEnv';
import { pickCellCaseInsensitive } from '../../integrations/lloyds/lloydsTagetikFieldAssertions';
import { logger } from '../../utils/logger';

function tdsCtx(world: AutomationWorld): { rows?: Record<string, unknown>[]; repo?: string } {
  if (!world.testContext.lloydsTagetikTdsSql) world.testContext.lloydsTagetikTdsSql = {};
  return world.testContext.lloydsTagetikTdsSql as { rows?: Record<string, unknown>[]; repo?: string };
}

/** Reuse Snowflake context bag from `lloyds-snowflake-adp.steps.ts`. */
function sfBag(world: AutomationWorld): { latestSummaryRow?: Record<string, unknown> } {
  if (!world.testContext.lloydsSnowflake) world.testContext.lloydsSnowflake = {};
  return world.testContext.lloydsSnowflake as { latestSummaryRow?: Record<string, unknown> };
}

Given("Lloyd's TDS SQL is configured for TagetikWrittenforDataLoaderADP reads", function (this: AutomationWorld) {
  if (!isLloydsTagetikTdsSqlConfigured()) {
    logger.warn('Skipping TDS SQL: SQL_LLOYDS_SERVER not set.');
    return 'skipped';
  }
});

When('I query TDS TagetikWrittenforDataLoaderADP for repository {string}', async function (this: AutomationWorld, repo: string) {
  if (!isLloydsTagetikTdsSqlConfigured()) {
    return 'skipped';
  }
  const summary = sfBag(this).latestSummaryRow;
  const runRaw = summary ? getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') : null;
  const runId = runRaw === null || runRaw === undefined ? '' : String(runRaw).trim();
  const rows = await fetchTagetikWrittenForDataLoaderAdpRows(repo, runId || undefined, 100);
  tdsCtx(this).rows = rows;
  tdsCtx(this).repo = repo.trim();
  logger.info(`[tds.tagetik] ${repo}: ${rows.length} row(s) from TagetikWrittenforDataLoaderADP`);
});

Then('TDS TagetikWrittenforDataLoaderADP should have at least one row for this repository', function (this: AutomationWorld) {
  if (!isLloydsTagetikTdsSqlConfigured()) {
    return 'skipped';
  }
  const rows = tdsCtx(this).rows ?? [];
  const repo = tdsCtx(this).repo ?? '(unknown)';
  if (rows.length === 0) {
    throw new Error(
      `No rows in TDS.tagetik.TagetikWrittenforDataLoaderADP for repository "${repo}" ` +
        '(check SQL_LLOYDS_* host/database, auth, and column SQL_LLOYDS_TAGETIK_REPO_COLUMN).',
    );
  }
});

Then('the first TDS TagetikWritten row should align with ADP repository and run when key columns are populated', function (this: AutomationWorld) {
  if (!isLloydsTagetikTdsSqlConfigured()) {
    return 'skipped';
  }
  const rows = tdsCtx(this).rows ?? [];
  if (!rows.length) {
    throw new Error('No TDS rows in context.');
  }
  const summary = sfBag(this).latestSummaryRow;
  if (!summary) throw new Error('Missing ADP summary row — run Snowflake summary steps first.');
  const expectRepo = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim().toUpperCase();
  const expectRun = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
  const first = rows[0] as Record<string, unknown>;
  const repoCol = getLloydsTagetikRepositoryColumn();
  const runCol = getLloydsTagetikRunColumn();
  const rv = pickCellCaseInsensitive(first, [repoCol, 'RepositoryID', 'REPOSITORY_ID']);
  if (rv !== undefined && rv !== null && String(rv).trim() !== '') {
    const got = String(rv).trim().toUpperCase();
    if (got !== expectRepo) {
      throw new Error(`TDS row ${repoCol}="${got}" does not match ADP _ACCEL_REPOSITORY_ID="${expectRepo}".`);
    }
  }
  if (runCol) {
    const uv = pickCellCaseInsensitive(first, [runCol, '_ACCEL_UNIQUE_RUN_ID', 'UniqueRunId']);
    if (uv !== undefined && uv !== null && String(uv).trim() !== '' && expectRun) {
      const got = String(uv).trim().toLowerCase();
      if (got !== expectRun.toLowerCase()) {
        throw new Error(`TDS row ${runCol}="${got}" does not match ADP _ACCEL_UNIQUE_RUN_ID="${expectRun}".`);
      }
    }
  }
});
