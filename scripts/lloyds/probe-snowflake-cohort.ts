/**
 * Lloyd's ADP cohort probe (Snowflake).
 *
 * Why: the MuleSoft dev flow `accl-lloyds-financials-sync` silently returns 0 rows in
 * its `extractionOfSnowflakeData` step even though FOWC / FOWD / FOWD summary tables do
 * contain Lloyd's rows. This probe prints what the framework can *see* from Snowflake
 * so we can compare against Mule's visible input (and pick the correct
 * `_accel_unique_run_id` per repo, tie-broken by MAX `_accel_std_table_row_created_timestamp`).
 *
 * Reuses: `src/utils/fowd-agency-xml-compare/snowflake-fetch.ts` (`loadFinOpsSnowflakeEnv`,
 * `connectFinOpsSnowflake`, `destroyConnection`) — Entra OAuth (SPN) when
 * `SNOWFLAKE_CLIENT_ID` + `SNOWFLAKE_CLIENT_SECRET` are set, else browser SSO or password.
 *
 * Env (add to src/config/env/.env.qa, see env.sample LLOYD'S / FINOPS — SNOWFLAKE block):
 *   SNOWFLAKE_ACCOUNT=accelins-prod
 *   SNOWFLAKE_USER=<Snowflake login_name mapped to the Entra app>
 *   SNOWFLAKE_CLIENT_ID=...  +  SNOWFLAKE_CLIENT_SECRET=...   (SPN — preferred for CI)
 *   Optional: SNOWFLAKE_OAUTH_SCOPE, SNOWFLAKE_OAUTH_TOKEN_REQUEST_URL, SNOWFLAKE_TENANT_ID
 *   Browser SSO (local only): unset client id/secret, set SNOWFLAKE_AUTHENTICATOR=EXTERNALBROWSER
 *
 * Usage:
 *   npm run lloyds:snowflake:probe
 *   npm run lloyds:snowflake:probe:trace   (sets SNOWFLAKE_SDK_LOG_LEVEL=TRACE for Snowflake SDK — share with admin)
 *   npm run lloyds:snowflake:probe:no-explicit-role   (FINOPS_SNOWFLAKE_OMIT_CONNECTION_ROLE=1 — omit role on login)
 *     (default: **seventeen** programme repos — same list as ADP / blob XML; see `LLOYDS_AGENCY_COHORT_12`)
 *   npm run lloyds:snowflake:probe -- --cloned-only
 *     (same **`LLOYDS_CLONED_REPOSITORY_IDS`** list — identical cohort today)
 *   npm run lloyds:snowflake:probe -- --repo US-60464
 *   npm run lloyds:snowflake:probe -- --json-out reports/lloyds-snowflake-probe.json
 *
 * Exit codes:
 *   0  — probe ran, findings printed (no opinion on pass/fail)
 *   1  — connection or query error
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Connection } from 'snowflake-sdk';

import {
  connectFinOpsSnowflake,
  destroyConnection,
  formatFinOpsSnowflakeNetworkPolicyHelp,
  getFinOpsSnowflakeEnvLoadedPath,
  loadFinOpsSnowflakeEnv,
  useFinOpsSnowflakeOAuthClientCredentials,
} from '../../src/utils/fowd-agency-xml-compare';
import {
  LLOYDS_AGENCY_COHORT_12,
  LLOYDS_CLONED_REPOSITORY_IDS,
} from '../../src/integrations/lloyds/lloydsClonedRepoCohort';

const FOWC_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1';
const FOWD_DETAIL_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1';
const FOWD_SUMMARY_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1';


type CliArgs = {
  repo?: string;
  jsonOut?: string;
  /** Restrict cohort to `LLOYDS_CLONED_REPOSITORY_IDS` (same seventeen repos as the ADP list when `--cloned-only`). Default: full programme cohort. */
  clonedOnly?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--repo' || a === '-r') && argv[i + 1]) {
      out.repo = argv[++i];
    } else if (a.startsWith('--repo=')) {
      out.repo = a.slice('--repo='.length);
    } else if (a === '--json-out' && argv[i + 1]) {
      out.jsonOut = argv[++i];
    } else if (a.startsWith('--json-out=')) {
      out.jsonOut = a.slice('--json-out='.length);
    } else if (a === '--cloned-only') {
      out.clonedOnly = true;
    } else if (a === '--agency-12') {
      /* Deprecated no-op: twelve-repo cohort is the default. */
    } else if (a === '--help' || a === '-h') {
      printHelpAndExit();
    }
  }
  return out;
}

function printHelpAndExit(): never {
  console.log(`Lloyd's ADP cohort probe (Snowflake)

Options:
  --repo <id>         Restrict the per-repo summary to a single repository id (e.g. US-60464)
  --cloned-only       Use `LLOYDS_CLONED_REPOSITORY_IDS` only (default: full programme cohort from `LLOYDS_AGENCY_COHORT_12`)
  --json-out <path>   Also write a JSON report to the given path
  -h, --help          Show this help

Requires SNOWFLAKE_* env vars in src/config/env/.env.qa (see env.sample LLOYD'S / FINOPS — SNOWFLAKE).
`);
  process.exit(0);
}

function runQuery<T = Record<string, unknown>>(
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

function first<T>(rows: T[]): T | undefined {
  return rows.length > 0 ? rows[0] : undefined;
}

function formatRepoList(ids: string[]): string {
  return ids.map((id) => `'${id}'`).join(', ');
}

type TableCountRow = { N: number };

async function probeTableCounts(conn: Connection, cohort: string[]) {
  const inList = formatRepoList(cohort);

  const [fowcAll, fowdAll, summaryAll] = await Promise.all([
    runQuery<TableCountRow>(conn, `SELECT COUNT(*) AS N FROM ${FOWC_TABLE}`),
    runQuery<TableCountRow>(conn, `SELECT COUNT(*) AS N FROM ${FOWD_DETAIL_TABLE}`),
    runQuery<TableCountRow>(conn, `SELECT COUNT(*) AS N FROM ${FOWD_SUMMARY_TABLE}`),
  ]);

  const [fowcCohort, fowdCohort, summaryCohort] = await Promise.all([
    runQuery<TableCountRow>(
      conn,
      `SELECT COUNT(*) AS N FROM ${FOWC_TABLE} WHERE _accel_repository_id IN (${inList})`,
    ),
    runQuery<TableCountRow>(
      conn,
      `SELECT COUNT(*) AS N FROM ${FOWD_DETAIL_TABLE} WHERE _accel_repository_id IN (${inList})`,
    ),
    runQuery<TableCountRow>(
      conn,
      `SELECT COUNT(*) AS N FROM ${FOWD_SUMMARY_TABLE} WHERE _accel_repository_id IN (${inList})`,
    ),
  ]);

  return {
    FOWC__POLICY_CORE_V1: {
      total: first(fowcAll)?.N ?? 0,
      lloydsCohort: first(fowcCohort)?.N ?? 0,
    },
    FOWD__AGENCY_POLICY_FO_V1: {
      total: first(fowdAll)?.N ?? 0,
      lloydsCohort: first(fowdCohort)?.N ?? 0,
    },
    FOWD__AGENCY_POLICY_FO_SUMMARY_V1: {
      total: first(summaryAll)?.N ?? 0,
      lloydsCohort: first(summaryCohort)?.N ?? 0,
    },
  };
}

type DistinctRepoRow = { REPO_ID: string };

async function probeDistinctCohortInFowc(conn: Connection): Promise<string[]> {
  const rows = await runQuery<DistinctRepoRow>(
    conn,
    `SELECT DISTINCT _accel_repository_id AS REPO_ID
     FROM   ${FOWC_TABLE}
     ORDER  BY REPO_ID`,
  );
  return rows.map((r) => r.REPO_ID).filter((x): x is string => typeof x === 'string');
}

type SummaryColsRow = { COLUMN_NAME: string; DATA_TYPE: string };

async function probeSummaryColumns(conn: Connection): Promise<SummaryColsRow[]> {
  try {
    return await runQuery<SummaryColsRow>(
      conn,
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM   FINANCIAL_OPERATIONS.INFORMATION_SCHEMA.COLUMNS
       WHERE  TABLE_SCHEMA = 'FINOPS_WRITTEN_DYNAMICS_365_PUBLIC'
         AND  TABLE_NAME   = 'FOWD__AGENCY_POLICY_FO_SUMMARY_V1'
       ORDER  BY ORDINAL_POSITION`,
    );
  } catch (err) {
    console.warn(
      `  (could not read INFORMATION_SCHEMA.COLUMNS — probably role lacks permissions; continuing)`,
      (err as Error).message,
    );
    return [];
  }
}

type SummaryPerRepoRow = {
  REPO_ID: string;
  ROW_COUNT: number;
  LATEST_CREATED_TS: string | null;
  RUN_IDS_NEWEST_FIRST: string | null;
  CREATED_TS_NEWEST_FIRST: string | null;
};

async function probeSummaryPerRepo(
  conn: Connection,
  repoFilter: string | undefined,
  cohort: string[],
): Promise<SummaryPerRepoRow[]> {
  const whereRepo = repoFilter
    ? `WHERE _accel_repository_id = '${repoFilter.replace(/'/g, "''")}'`
    : `WHERE _accel_repository_id IN (${formatRepoList(cohort)})`;

  return runQuery<SummaryPerRepoRow>(
    conn,
    `SELECT _accel_repository_id                                    AS REPO_ID,
            COUNT(*)                                                AS ROW_COUNT,
            TO_VARCHAR(MAX(_accel_std_table_row_created_timestamp)) AS LATEST_CREATED_TS,
            ARRAY_TO_STRING(
              ARRAY_AGG(_accel_unique_run_id) WITHIN GROUP (ORDER BY _accel_std_table_row_created_timestamp DESC),
              ', '
            )                                                       AS RUN_IDS_NEWEST_FIRST,
            ARRAY_TO_STRING(
              ARRAY_AGG(TO_VARCHAR(_accel_std_table_row_created_timestamp))
                WITHIN GROUP (ORDER BY _accel_std_table_row_created_timestamp DESC),
              ', '
            )                                                       AS CREATED_TS_NEWEST_FIRST
     FROM   ${FOWD_SUMMARY_TABLE}
     ${whereRepo}
     GROUP  BY _accel_repository_id
     ORDER  BY REPO_ID`,
  );
}

function printHeader(title: string) {
  const bar = '─'.repeat(76);
  console.log(`\n${bar}\n ${title}\n${bar}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadFinOpsSnowflakeEnv();
  const envPath = getFinOpsSnowflakeEnvLoadedPath();
  if (envPath) {
    console.log(`FinOps dotenv file: ${envPath}`);
  } else {
    console.log(`FinOps dotenv file: (none matched src/config/env/.env.<ENV>, .env, .env.local, .env.qa)`);
  }

  const account = process.env.SNOWFLAKE_ACCOUNT?.trim();
  const user = process.env.SNOWFLAKE_USER?.trim();
  const authn = process.env.SNOWFLAKE_AUTHENTICATOR?.trim();
  const clientIdRaw = process.env.SNOWFLAKE_CLIENT_ID?.trim();
  const hasClientSecret = Boolean(process.env.SNOWFLAKE_CLIENT_SECRET?.trim());
  const oauthSpn = useFinOpsSnowflakeOAuthClientCredentials();

  console.log(`Lloyd's ADP cohort probe`);
  console.log(`  account       : ${account ?? '(missing)'}`);
  console.log(`  user          : ${user ?? '(missing)'}`);
  console.log(
    `  SPN env       : SNOWFLAKE_CLIENT_ID=${clientIdRaw ? `${clientIdRaw.slice(0, 8)}...` : 'MISSING'}, SNOWFLAKE_CLIENT_SECRET=${hasClientSecret ? 'set (value hidden)' : 'MISSING'}`,
  );
  console.log(
    `  auth mode     : ${oauthSpn ? 'OAUTH_CLIENT_CREDENTIALS (Entra SPN)' : (authn || '(not SPN — need CLIENT_ID+SECRET or set SNOWFLAKE_AUTHENTICATOR=OAUTH_CLIENT_CREDENTIALS)')}`,
  );
  if (oauthSpn) {
    const scope =
      process.env.SNOWFLAKE_OAUTH_SCOPE?.trim()
      || (process.env.SNOWFLAKE_OAUTH_RESOURCE?.trim()
        ? `${process.env.SNOWFLAKE_OAUTH_RESOURCE.trim()} → /.default (from SNOWFLAKE_OAUTH_RESOURCE)`
        : '(missing — set SNOWFLAKE_OAUTH_SCOPE)');
    console.log(`  oauth scope   : ${scope}`);
    console.log(
      `  SDK note      : Snowflake driver may log "password is not provided" for OAuth - that is expected; this run still uses Entra client credentials.`,
    );
  }
  const omitConnRole = process.env.FINOPS_SNOWFLAKE_OMIT_CONNECTION_ROLE === '1';
  const roleEnv = process.env.SNOWFLAKE_ROLE?.trim();
  console.log(
    `  connection role: ${omitConnRole ? 'OMITTED (FINOPS_SNOWFLAKE_OMIT_CONNECTION_ROLE=1; not sent on login)' : (roleEnv || '(unset, driver uses default e.g. PUBLIC)')}`,
  );

  const cohortForProbe = args.clonedOnly ? [...LLOYDS_CLONED_REPOSITORY_IDS] : [...LLOYDS_AGENCY_COHORT_12];
  console.log(
    `  cohort size   : ${cohortForProbe.length} repos${args.clonedOnly ? ' (--cloned-only)' : ' (full programme cohort)'}`,
  );
  if (args.repo) console.log(`  repo filter   : ${args.repo}`);
  if (!oauthSpn && authn === 'EXTERNALBROWSER') {
    console.log(`\n(SSO) Your browser will open for Accelerant SSO if no cached session.\n`);
  }

  let conn: Connection | undefined;
  try {
    conn = await connectFinOpsSnowflake();

    printHeader('1. Table row counts (total vs Lloyd\'s cohort)');
    const counts = await probeTableCounts(conn, cohortForProbe);
    for (const [tbl, v] of Object.entries(counts)) {
      console.log(`  ${tbl.padEnd(38)} total=${String(v.total).padStart(10)}  lloyds=${String(v.lloydsCohort).padStart(6)}`);
    }

    printHeader('2. Distinct repo ids in FOWC__POLICY_CORE_V1 (all, not cohort-filtered)');
    const distinctRepos = await probeDistinctCohortInFowc(conn);
    console.log(`  ${distinctRepos.length} distinct repos returned:`);
    console.log(`    ${distinctRepos.join(', ')}`);
    const missing = cohortForProbe.filter((id) => !distinctRepos.includes(id));
    const extra = distinctRepos.filter((id) => !cohortForProbe.includes(id));
    console.log(`  missing from expected cohort : ${missing.length === 0 ? 'none' : missing.join(', ')}`);
    console.log(`  extra (not in cohort)        : ${extra.length === 0 ? 'none' : extra.join(', ')}`);

    printHeader('3. FOWD__AGENCY_POLICY_FO_SUMMARY_V1 columns (for reference)');
    const cols = await probeSummaryColumns(conn);
    if (cols.length === 0) {
      console.log('  (no column metadata available)');
    } else {
      for (const c of cols.slice(0, 40)) {
        console.log(`  ${c.COLUMN_NAME.padEnd(50)} ${c.DATA_TYPE}`);
      }
      if (cols.length > 40) console.log(`  … (${cols.length - 40} more columns)`);
    }

    printHeader(
      `4. Per-repo summary: correlation-id candidate (MAX _accel_std_table_row_created_timestamp)`,
    );
    const perRepo = await probeSummaryPerRepo(conn, args.repo, cohortForProbe);
    if (perRepo.length === 0) {
      console.log('  (no rows returned for the requested repo(s))');
    } else {
      console.log(
        `  ${'REPO'.padEnd(10)} ${'ROWS'.padStart(4)}  ${'LATEST_CREATED_TS'.padEnd(26)}  PICKED _accel_unique_run_id (newest)`,
      );
      for (const r of perRepo) {
        const firstRunId =
          (r.RUN_IDS_NEWEST_FIRST?.split(',')[0] ?? '').trim() || '(null)';
        console.log(
          `  ${r.REPO_ID.padEnd(10)} ${String(r.ROW_COUNT).padStart(4)}  ${String(r.LATEST_CREATED_TS ?? '(null)').padEnd(26)}  ${firstRunId}`,
        );
        if (r.ROW_COUNT > 1) {
          console.log(`    all run ids: ${r.RUN_IDS_NEWEST_FIRST}`);
          console.log(`    all tstamps: ${r.CREATED_TS_NEWEST_FIRST}`);
        }
      }
    }

    if (args.jsonOut) {
      const report = {
        ranAt: new Date().toISOString(),
        account,
        user,
        authenticator: authn,
        cohort: cohortForProbe,
        repoFilter: args.repo,
        tableCounts: counts,
        distinctReposInFowc: distinctRepos,
        missingFromCohort: missing,
        extraBeyondCohort: extra,
        summaryColumns: cols,
        perRepoSummary: perRepo,
      };
      const outPath = path.resolve(args.jsonOut);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
      console.log(`\nJSON report written: ${path.relative(process.cwd(), outPath)}`);
    }

    printHeader('Done');
  } catch (err) {
    const e = err as Error;
    console.error('\nProbe failed:', e.message);
    const netHint = formatFinOpsSnowflakeNetworkPolicyHelp(err);
    if (netHint) console.error(netHint.trimEnd());
    if (e.stack && !netHint) console.error(e.stack);
    process.exitCode = 1;
  } finally {
    if (conn) {
      try {
        await destroyConnection(conn);
      } catch {
        /* ignore */
      }
    }
  }
}

void main();
