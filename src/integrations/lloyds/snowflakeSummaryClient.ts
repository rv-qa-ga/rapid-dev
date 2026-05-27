/**
 * Read-only Snowflake helpers for Lloyd's ADP → D365 agency summary (`FOWD__AGENCY_POLICY_FO_SUMMARY_V1`).
 *
 * Reuses connection + env loading from `snowflake-fetch.ts` (same path as
 * `scripts/lloyds/probe-snowflake-cohort.ts`). Intended for Cucumber Phase 2
 * (`@phase-2 @snowflake`) and CLIs — no writes.
 */

import type { Connection } from 'snowflake-sdk';

import { assertSafeSnowflakeTableFqn } from '../../utils/fowd-agency-xml-compare';

/** Fully qualified summary table (Mule upstream / Phase 2 contract). */
export const LLOYDS_FOWD_SUMMARY_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1';

/** Dynamics-365 FO detail slice. */
export const LLOYDS_FOWD_DETAIL_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1';

/** Core public detail slice (alternate lineage). */
export const LLOYDS_FOWC_DETAIL_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1';

for (const fqn of [LLOYDS_FOWD_SUMMARY_TABLE, LLOYDS_FOWD_DETAIL_TABLE, LLOYDS_FOWC_DETAIL_TABLE]) {
  assertSafeSnowflakeTableFqn(fqn);
}

const SHORT_TABLE_MAP: Record<string, string> = {
  FOWD__AGENCY_POLICY_FO_SUMMARY_V1: LLOYDS_FOWD_SUMMARY_TABLE,
  FOWD__AGENCY_POLICY_FO_V1: LLOYDS_FOWD_DETAIL_TABLE,
  FOWC__POLICY_CORE_V1: LLOYDS_FOWC_DETAIL_TABLE,
  FOWT__TAGETIK_V1: 'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_TAGETIK_PUBLIC.FOWT__TAGETIK_V1',
};

/**
 * Resolve a short table name from Gherkin (`FOWD__AGENCY_POLICY_FO_SUMMARY_V1`) to a safe FQN.
 */
export function resolveLloydsSnowflakeTableFqn(shortName: string): string {
  const key = shortName.trim().toUpperCase();
  const hit = SHORT_TABLE_MAP[key];
  if (!hit) {
    throw new Error(
      `Unknown Lloyd's Snowflake table short name "${shortName}". ` +
        `Expected one of: ${Object.keys(SHORT_TABLE_MAP).join(', ')}.`,
    );
  }
  assertSafeSnowflakeTableFqn(hit);
  return hit;
}

export async function runSnowflakeQuery<T = Record<string, unknown>>(
  conn: Connection,
  sqlText: string,
  binds?: (string | number | null)[],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    conn.execute({
      sqlText,
      binds,
      complete: (err, _stmt, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve((rows ?? []) as T[]);
      },
    });
  });
}

/**
 * Latest summary row(s) for a repository, ordered by `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` DESC.
 * (Column confirmed on summary since 2026-04-23 — see `docs/lloyds/LLOYDS_TEST_STRATEGY.md` §2.)
 */
/**
 * All **detail** rows for a repository + ADP run id (same grain Mule uses before summary rollup).
 * Ordered by `LINE_NUMBER` ascending (nulls last).
 */
export async function fetchFowdDetailRowsForRun(
  conn: Connection,
  repositoryId: string,
  runId: string,
): Promise<Record<string, unknown>[]> {
  const sql = `
    SELECT *
    FROM   ${LLOYDS_FOWD_DETAIL_TABLE}
    WHERE  _ACCEL_REPOSITORY_ID = :1
      AND  _ACCEL_UNIQUE_RUN_ID = :2
    ORDER  BY LINE_NUMBER ASC NULLS LAST
  `;
  return runSnowflakeQuery<Record<string, unknown>>(conn, sql, [repositoryId, runId]);
}

/**
 * Latest Tagetik written slice rows for a repository + run id (may be empty until downstream lands).
 */
export async function fetchTagetikRowsForRepoRun(
  conn: Connection,
  repositoryId: string,
  runId: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const lim = Math.max(1, Math.min(500, Math.floor(limit)));
  const fqn = resolveLloydsSnowflakeTableFqn('FOWT__TAGETIK_V1');
  const sql = `
    SELECT *
    FROM   ${fqn}
    WHERE  REPOSITORY_ID = :1
      AND  _ACCEL_UNIQUE_RUN_ID = :2
    LIMIT  ${lim}
  `;
  return runSnowflakeQuery<Record<string, unknown>>(conn, sql, [repositoryId, runId]);
}

export async function fetchLatestSummaryRowsForRepo(
  conn: Connection,
  repositoryId: string,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const lim = Math.max(1, Math.min(500, Math.floor(limit)));
  const sql = `
    SELECT *
    FROM   ${LLOYDS_FOWD_SUMMARY_TABLE}
    WHERE  _ACCEL_REPOSITORY_ID = :1
    ORDER  BY _ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP DESC
    LIMIT  ${lim}
  `;
  return runSnowflakeQuery<Record<string, unknown>>(conn, sql, [repositoryId]);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Single summary row by `_ACCEL_UNIQUE_RUN_ID` (read-only contract checks, e.g. SNOW-004).
 */
export async function fetchSummaryRowByRunId(
  conn: Connection,
  runId: string,
): Promise<Record<string, unknown> | null> {
  const rid = runId.trim();
  if (!UUID_RE.test(rid)) {
    throw new Error(`Refusing summary lookup: run id "${runId}" is not a plausible UUID.`);
  }
  const sql = `
    SELECT *
    FROM   ${LLOYDS_FOWD_SUMMARY_TABLE}
    WHERE  _ACCEL_UNIQUE_RUN_ID = :1
    LIMIT  1
  `;
  const rows = await runSnowflakeQuery<Record<string, unknown>>(conn, sql, [rid]);
  return rows[0] ?? null;
}

/**
 * Snowflake `FOWD__AGENCY_POLICY_FO_SUMMARY_V1` agency vs insurer commission columns.
 * ADP publishes `TOTAL_AGENCY_COMMISSION_AMOUNT` / `TOTAL_COMMISSION_AMOUNT` (see programme SELECT);
 * legacy views used `TOTAL_MEMBER_COMMISSION_AMOUNT` / `TOTAL_INSURER_COMMISSION_AMOUNT`.
 */
export const LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS = [
  'TOTAL_AGENCY_COMMISSION_AMOUNT',
  'TOTAL_MEMBER_COMMISSION_AMOUNT',
] as const;

export const LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS = [
  'TOTAL_COMMISSION_AMOUNT',
  'TOTAL_INSURER_COMMISSION_AMOUNT',
] as const;

/** Case-insensitive lookup for Snowflake row keys (driver may preserve mixed case). */
export function getSnowflakeCell(row: Record<string, unknown>, column: string): unknown {
  const want = column.trim().toUpperCase();
  for (const [k, v] of Object.entries(row)) {
    if (k.toUpperCase() === want) return v;
  }
  return undefined;
}

/** First column in `columns` that exists on the row (value may be null); else `undefined`. */
export function getSnowflakeCellFirst(row: Record<string, unknown>, columns: readonly string[]): unknown {
  for (const c of columns) {
    const v = getSnowflakeCell(row, c);
    if (v !== undefined) return v;
  }
  return undefined;
}

/** Which summary column was used (for assertion errors). */
export function resolveSummaryColumnUsed(row: Record<string, unknown>, columns: readonly string[]): string | undefined {
  for (const c of columns) {
    if (getSnowflakeCell(row, c) !== undefined) return c;
  }
  return undefined;
}

export async function countDetailRowsForRun(
  conn: Connection,
  tableFqn: string,
  runId: string,
  repositoryId: string,
): Promise<number> {
  assertSafeSnowflakeTableFqn(tableFqn);
  const sql = `
    SELECT COUNT(*) AS C
    FROM   ${tableFqn}
    WHERE  _ACCEL_UNIQUE_RUN_ID = :1
      AND  _ACCEL_REPOSITORY_ID = :2
  `;
  const rows = await runSnowflakeQuery<{ C: number }>(conn, sql, [runId, repositoryId]);
  const n = rows[0]?.C;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

export type SummaryColumnMeta = { COLUMN_NAME: string; DATA_TYPE: string };

/**
 * INFORMATION_SCHEMA column list for the summary table (may be empty if the role cannot read metadata).
 */
export async function fetchSummaryInformationSchemaColumns(
  conn: Connection,
): Promise<SummaryColumnMeta[]> {
  const sql = `
    SELECT COLUMN_NAME, DATA_TYPE
    FROM   FINANCIAL_OPERATIONS.INFORMATION_SCHEMA.COLUMNS
    WHERE  TABLE_SCHEMA = 'FINOPS_WRITTEN_DYNAMICS_365_PUBLIC'
      AND  TABLE_NAME   = 'FOWD__AGENCY_POLICY_FO_SUMMARY_V1'
    ORDER  BY ORDINAL_POSITION
  `;
  return runSnowflakeQuery<SummaryColumnMeta>(conn, sql);
}
