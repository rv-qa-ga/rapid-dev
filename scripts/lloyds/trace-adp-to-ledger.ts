#!/usr/bin/env ts-node
/**
 * Read-only trace: **ADP Snowflake summary** → **Dataverse `accelins_workflow` ODS columns**
 * → optional **Fabric / F&O SQL** probe when `LLOYDS_LEDGER_TRACE_SQL` is set.
 *
 * Fabric / D365 F&O ledger object names vary by programme and tier — this script does not
 * hard-code warehouse views. Supply a SELECT in `LLOYDS_LEDGER_TRACE_SQL` with optional
 * placeholders `{REPO}`, `{RUN_ID}`, `{CURRENCY}` replaced from the ADP summary row.
 *
 * Env: same Snowflake block as `npm run lloyds:snowflake:probe`; Dataverse via `LLOYDS_DATAVERSE_*` /
 * `D365_*`; optional SQL via `SQLSERVER_*` + `SQLSERVER_DEFAULT_DB` / `FABRIC_SQL_DATABASE`
 * (see `docs/setup/FABRIC_CONNECTIVITY_SETUP.md`).
 *
 * Usage:
 *   npm run lloyds:trace:adp-ledger
 *     (omit `--repo` → uses `LLOYDS_TEST_REPO_ID` / `LLOYDS_E2E_REPO_ID`, else **US-60464**; see `lloydsClonedRepoCohort.ts`)
 *   npm run lloyds:trace:adp-ledger -- --repo US-60507
 *   npm run lloyds:trace:adp-ledger -- --repo US-60507 --json-out reports/lloyds-adp-trace.json
 */

import * as fs from 'fs';
import * as path from 'path';

/** Side effect: loads `src/config/env/.env.${ENV}` the same way Cucumber does. */
import '../../src/config/config';

import {
  connectFinOpsSnowflake,
  destroyConnection,
  loadFinOpsSnowflakeEnv,
} from '../../src/utils/fowd-agency-xml-compare';
import {
  fetchLatestSummaryRowsForRepo,
  getSnowflakeCell,
} from '../../src/integrations/lloyds/snowflakeSummaryClient';
import { DataverseMasterDataClient } from '../../src/integrations/lloyds/dataverseMasterDataClient';
import { XmlFileRecordClient } from '../../src/integrations/lloyds/xmlFileRecordClient';
import { SqlServerClient } from '../../src/sqlserver/client/SqlServerClient';
import { resolveLloydsTestRepoId } from '../../src/integrations/lloyds/lloydsClonedRepoCohort';

type Args = { repo?: string; jsonOut?: string };

function parseArgs(argv: string[]): Args {
  const out: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '--repo' || a === '-r') && argv[i + 1]) out.repo = argv[++i];
    else if (a.startsWith('--repo=')) out.repo = a.slice('--repo='.length);
    else if (a === '--json-out' && argv[i + 1]) out.jsonOut = argv[++i];
    else if (a.startsWith('--json-out=')) out.jsonOut = a.slice('--json-out='.length);
  }
  return out;
}

function substituteLedgerSql(
  template: string,
  ctx: { repo: string; runId: string; currency: string },
): string {
  return template
    .replaceAll('{REPO}', ctx.repo.replace(/'/g, "''"))
    .replaceAll('{RUN_ID}', ctx.runId.replace(/'/g, "''"))
    .replaceAll('{CURRENCY}', ctx.currency.replace(/'/g, "''"));
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repo = (args.repo || '').trim() || resolveLloydsTestRepoId(process.env);

  loadFinOpsSnowflakeEnv();
  const conn = await connectFinOpsSnowflake();
  const summaryRows = await fetchLatestSummaryRowsForRepo(conn, repo, 1);
  await destroyConnection(conn);

  if (!summaryRows.length) {
    console.error(`No ADP summary rows for repository "${repo}".`);
    process.exit(1);
  }
  const s = summaryRows[0];
  const runId = String(getSnowflakeCell(s, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
  const currency = String(getSnowflakeCell(s, 'POLICY_CURRENCY_CODE') ?? '').trim();

  const master = DataverseMasterDataClient.create();
  const repoRec = await master.findRepositoryByCode(repo);
  if (!repoRec) {
    console.error(`Repository "${repo}" not found in Dataverse accelins_repositoryfiles.`);
    process.exit(1);
  }

  const dv = await XmlFileRecordClient.createStandalone();
  let xml = null;
  try {
    xml = await dv.findLatestByRepositoryFileId(repoRec.id);
  } finally {
    await dv.dispose();
  }
  if (!xml) {
    console.error(`No accelins_workflows row for repository "${repo}" (lookup ${repoRec.id}).`);
    process.exit(1);
  }

  const report = {
    repositoryId: repo,
    dataverseRepositoryMasterId: repoRec.id,
    snowflake: {
      _ACCEL_UNIQUE_RUN_ID: runId,
      POLICY_CURRENCY_CODE: currency,
      TOTAL_PREMIUM_AMOUNT: getSnowflakeCell(s, 'TOTAL_PREMIUM_AMOUNT'),
      TOTAL_MEMBER_COMMISSION_AMOUNT: getSnowflakeCell(s, 'TOTAL_MEMBER_COMMISSION_AMOUNT'),
      TOTAL_INSURER_COMMISSION_AMOUNT: getSnowflakeCell(s, 'TOTAL_INSURER_COMMISSION_AMOUNT'),
      TOTAL_TAX_AMOUNT: getSnowflakeCell(s, 'TOTAL_TAX_AMOUNT'),
      TOTAL_OTHER_CONTRIBUTIONS_AMOUNT: getSnowflakeCell(s, 'TOTAL_OTHER_CONTRIBUTIONS_AMOUNT'),
    },
    dataverseOds: {
      odsCurrency: xml.odsCurrency,
      odsPrm: xml.odsPrm,
      odsCom: xml.odsCom,
      odsCoi: xml.odsCoi,
      odsTax: xml.odsTax,
      odsOth: xml.odsOth,
      correlationId: xml.correlationId,
      workflowId: xml.workflowId,
    },
    fabricOrLedgerSql: null as null | { rowCount: number; sample: unknown[] },
  };

  const traceSql = process.env.LLOYDS_LEDGER_TRACE_SQL?.trim();
  if (traceSql) {
    const sql = substituteLedgerSql(traceSql, { repo, runId, currency });
    const sqlClient = new SqlServerClient();
    try {
      const db = process.env.FABRIC_SQL_DATABASE?.trim() || process.env.SQLSERVER_DEFAULT_DB?.trim();
      const res = await sqlClient.queryMany<Record<string, unknown>>(
        sql,
        undefined,
        db ? { database: db } : undefined,
      );
      report.fabricOrLedgerSql = {
        rowCount: res.recordset.length,
        sample: res.recordset.slice(0, 10),
      };
    } finally {
      await sqlClient.close();
    }
  }

  console.log(JSON.stringify(report, null, 2));
  if (args.jsonOut) {
    const outPath = path.resolve(process.cwd(), args.jsonOut);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
    console.error(`Wrote ${outPath}`);
  }
}

main().catch((e) => {
  console.error((e as Error).stack || (e as Error).message);
  process.exit(1);
});
