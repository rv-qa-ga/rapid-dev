/**
 * Lloyd's **downstream stage readiness** — read-only checks that do not publish Service Bus traffic.
 *
 * - **Stage 3 (Mule SQL):** `dbo.PROCESS_TRACKER` via `SqlServerClient` when `SQLSERVER_*` is set.
 * - **Stage 5 (Tagetik slice):** optional Snowflake `FOWT__TAGETIK_V1` row presence — skipped only when
 *   there are **zero** Tagetik rows for the repo+run (not because Dataverse `statuscode` is still
 *   "Ready to Ship to Dynamics" after F&O — that UI lag is a separate programme fix).
 *
 * Canonical programme docs:
 *   - https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3081535490/ADP-+D365+F+O+revised
 *   - https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings
 */

import { Given, Then, When } from '@cucumber/cucumber';

import { config } from '../../config/config';
import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';
import { fetchLatestProcessTrackerForRepo } from '../../integrations/lloyds/muleProcessTrackerClient';
import {
  resolveLloydsSnowflakeTableFqn,
  runSnowflakeQuery,
} from '../../integrations/lloyds/snowflakeSummaryClient';

/** Reuse snowflake world bag from `lloyds-snowflake-adp.steps.ts`. */
function sfCtx(world: AutomationWorld): { connection?: import('snowflake-sdk').Connection; queryRows?: Record<string, unknown>[] } {
  if (!world.testContext.lloydsSnowflake) world.testContext.lloydsSnowflake = {};
  return world.testContext.lloydsSnowflake as { connection?: import('snowflake-sdk').Connection; queryRows?: Record<string, unknown>[] };
}

function stagesCtx(world: AutomationWorld): { tracker?: Awaited<ReturnType<typeof fetchLatestProcessTrackerForRepo>>; trackerRepo?: string } {
  if (!world.testContext.lloydsStages) world.testContext.lloydsStages = {};
  return world.testContext.lloydsStages as { tracker?: Awaited<ReturnType<typeof fetchLatestProcessTrackerForRepo>>; trackerRepo?: string };
}

/** True when merged config points at a real host (SQLSERVER_* or AZURE_SQL_DB_DEV_* via `config.ts`). */
function isMuleProcessTrackerSqlConfigured(): boolean {
  try {
    const h = (config.getSqlServerConfig().host || '').trim();
    return !!h && !h.includes('your-sql-server');
  } catch {
    return false;
  }
}

Given('SQL Server is configured for Lloyd\'s Mule PROCESS_TRACKER reads', function (this: AutomationWorld) {
  if (!isMuleProcessTrackerSqlConfigured()) {
    logger.warn(
      'Skipping Mule SQL checks: no SQL host (set SQLSERVER_HOST or AZURE_SQL_DB_DEV_SERVER + Entra or SQL auth).',
    );
    return 'skipped';
  }
});

When('I fetch the latest PROCESS_TRACKER row for repository {string}', async function (this: AutomationWorld, repo: string) {
  if (!isMuleProcessTrackerSqlConfigured()) {
    return 'skipped';
  }
  const row = await fetchLatestProcessTrackerForRepo(repo);
  stagesCtx(this).tracker = row;
  stagesCtx(this).trackerRepo = repo;
});

When('I fetch the latest PROCESS_TRACKER row for the current Lloyd\'s sanity repository', async function (this: AutomationWorld) {
  if (!isMuleProcessTrackerSqlConfigured()) {
    return 'skipped';
  }
  const raw = this.testContext.lloydsSanity as { row?: { repoId?: string } } | undefined;
  const repo = raw?.row?.repoId?.trim();
  if (!repo) {
    throw new Error('No Lloyd\'s sanity row on world — load plan and pick a runnable row first.');
  }
  const row = await fetchLatestProcessTrackerForRepo(repo);
  stagesCtx(this).tracker = row;
  stagesCtx(this).trackerRepo = repo;
});

Then('the PROCESS_TRACKER row should exist with a non-empty PROCESS_ID', function (this: AutomationWorld) {
  if (!isMuleProcessTrackerSqlConfigured()) {
    return 'skipped';
  }
  const t = stagesCtx(this).tracker;
  const repo = stagesCtx(this).trackerRepo ?? '(unknown)';
  if (!t?.PROCESS_ID?.trim()) {
    throw new Error(
      `No PROCESS_TRACKER row for repository "${repo}" ` +
        `(check dbo.PROCESS_TRACKER where REPO_ID = '${repo}'; host/db: SQLSERVER_* or AZURE_SQL_DB_DEV_* + default DB; Entra: SQLSERVER_* or D365_*).`,
    );
  }
});

When('I query Tagetik slice {string} for repository {string}', async function (this: AutomationWorld, shortTable: string, repo: string) {
  const conn = sfCtx(this).connection;
  if (!conn) throw new Error('No Snowflake connection.');
  const fqn = resolveLloydsSnowflakeTableFqn(shortTable);
  const sql = `
    SELECT *
    FROM   ${fqn}
    WHERE  REPOSITORY_ID = :1
    LIMIT  25
  `;
  sfCtx(this).queryRows = await runSnowflakeQuery<Record<string, unknown>>(conn, sql, [repo]);
});

/** Umbrella §F wording — forwards to the Tagetik slice query (REPOSITORY_ID filter). */
When(
  /^I query "([^"]+)" for "REPOSITORY_ID" equal to "([^"]+)"$/,
  async function (this: AutomationWorld, shortTable: string, repo: string) {
    const conn = sfCtx(this).connection;
    if (!conn) throw new Error('No Snowflake connection.');
    const fqn = resolveLloydsSnowflakeTableFqn(shortTable);
    const sql = `
      SELECT *
      FROM   ${fqn}
      WHERE  REPOSITORY_ID = :1
      LIMIT  25
    `;
    sfCtx(this).queryRows = await runSnowflakeQuery<Record<string, unknown>>(conn, sql, [repo]);
  },
);

Then('Tagetik slice rows exist for this repository or the scenario is skipped when not yet posted', function (this: AutomationWorld) {
  const rows = sfCtx(this).queryRows ?? [];
  if (rows.length === 0) {
    logger.warn('No Tagetik rows for this repo yet — skipping (Stage 5 / posting may not have completed).');
    return 'skipped';
  }
});
