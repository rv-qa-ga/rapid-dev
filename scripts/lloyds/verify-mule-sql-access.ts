#!/usr/bin/env ts-node
/**
 * Spike: verify the QA SPN has read access to `sqldb-dev-uks-lyd` (Mule's control DB).
 *
 * Runs a tiny sequence of read-only queries:
 *   1. Access / identity check (DB name + login)
 *   2. Table list (sanity that we're on the right database)
 *   3. PROCESS_TRACKER row count + latest row
 *   4. `PROCESS_NAME` distribution
 *   5. Count of COMPLETED/SUCCESS rows + one sample (golden-run reference)
 *
 * Uses the same QA SPN the Dataverse + Service Bus halves use. Prefers
 * `LLOYDS_MULE_SQL_*` env vars, falls back to `D365_*` (the QA SPN) so that adding
 * one extra env-var set is optional — you only need it if you want to point at a
 * different SQL instance than the D365 SPN already covers.
 *
 * Usage:
 *   npx ts-node scripts/lloyds/verify-mule-sql-access.ts
 *   npx ts-node scripts/lloyds/verify-mule-sql-access.ts --dry-run    (print config only)
 *
 * Exit code:
 *   0 = access OK, all queries returned data.
 *   1 = auth/config failure.
 *   2 = connected but queries returned unexpected shape.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ClientSecretCredential } from '@azure/identity';
import * as sql from 'mssql';

const envPaths = [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), envPath)}\n`);
    break;
  }
}

const DEFAULT_SERVER = 'sql-dev-uks-lyd.database.windows.net';
const DEFAULT_DATABASE = 'sqldb-dev-uks-lyd';
const DB_SCOPE = 'https://database.windows.net/.default';

function getConfig() {
  const pick = (a?: string, b?: string) => (a?.trim() || b?.trim() || '');
  const tenantId = pick(process.env.LLOYDS_MULE_SQL_TENANT_ID, process.env.D365_TENANT_ID);
  const clientId = pick(process.env.LLOYDS_MULE_SQL_CLIENT_ID, process.env.D365_CLIENT_ID);
  const clientSecret = pick(process.env.LLOYDS_MULE_SQL_CLIENT_SECRET, process.env.D365_CLIENT_SECRET);
  const server = (
    process.env.LLOYDS_MULE_SQL_SERVER?.trim() ||
    process.env.AZURE_SQL_DB_DEV_SERVER?.trim() ||
    process.env.SQLSERVER_HOST?.trim() ||
    DEFAULT_SERVER
  ).trim();
  const database = (
    process.env.LLOYDS_MULE_SQL_DATABASE?.trim() ||
    process.env.AZURE_SQL_DB_DEV_DATABASE?.trim() ||
    process.env.SQLSERVER_DEFAULT_DB?.trim() ||
    DEFAULT_DATABASE
  ).trim();
  const source = process.env.LLOYDS_MULE_SQL_CLIENT_ID
    ? 'LLOYDS_MULE_SQL_*'
    : process.env.AZURE_SQL_DB_DEV_SERVER
      ? 'D365_* + AZURE_SQL_DB_DEV_* (same as Cucumber SqlServerClient)'
      : 'D365_* (QA SPN fallback)';
  return { tenantId, clientId, clientSecret, server, database, source };
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const c = getConfig();

  console.log('Lloyd\'s Mule control-DB access check');
  console.log(`  Server:   ${c.server}`);
  console.log(`  Database: ${c.database}`);
  console.log(`  SPN:      ${c.clientId ? `${c.clientId.slice(0, 10)}…` : '(missing)'} (${c.source})`);
  console.log(`  Tenant:   ${c.tenantId ? `${c.tenantId.slice(0, 8)}…` : '(missing)'}`);

  if (!c.tenantId || !c.clientId || !c.clientSecret) {
    console.error('\nMissing SPN credentials. Set LLOYDS_MULE_SQL_TENANT_ID/CLIENT_ID/CLIENT_SECRET or reuse D365_*.');
    process.exit(1);
  }
  if (dryRun) {
    console.log('\n--dry-run: config looks valid; not connecting.');
    return;
  }

  console.log('\nAcquiring AAD token for https://database.windows.net/.default …');
  const credential = new ClientSecretCredential(c.tenantId, c.clientId, c.clientSecret);
  const token = await credential.getToken(DB_SCOPE);
  if (!token?.token) {
    throw new Error('Failed to acquire AAD token for SQL Server.');
  }
  console.log(`  Token acquired (expires in ${Math.round((token.expiresOnTimestamp - Date.now()) / 1000)}s)`);

  const poolConfig: sql.config = {
    server: c.server,
    database: c.database,
    options: { encrypt: true, trustServerCertificate: false },
    authentication: {
      type: 'azure-active-directory-access-token',
      options: { token: token.token },
    },
    // Keep pool small — this is a one-off spike, not a pool we keep alive.
    pool: { max: 1, min: 0, idleTimeoutMillis: 2_000 },
    requestTimeout: 30_000,
  };

  console.log('\nConnecting…');
  const pool = await sql.connect(poolConfig);
  try {
    // --- 1. Access / identity ---
    console.log('\n[1] Access / identity check');
    const idResult = await pool.request().query<{
      current_database: string;
      effective_login: string;
      effective_user: string;
      server_name: string;
      server_utc_now: Date;
    }>(`
      SELECT DB_NAME() AS current_database,
             SUSER_SNAME() AS effective_login,
             USER_NAME() AS effective_user,
             @@SERVERNAME AS server_name,
             SYSUTCDATETIME() AS server_utc_now
    `);
    console.table(idResult.recordset);

    // --- 2. Table list ---
    console.log('\n[2] User tables');
    const tables = await pool.request().query<{
      schema_name: string;
      table_name: string;
      row_count_approx: number;
    }>(`
      SELECT s.name AS schema_name, t.name AS table_name, p.rows AS row_count_approx
      FROM sys.tables t
      JOIN sys.schemas s    ON t.schema_id = s.schema_id
      JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
      ORDER BY s.name, t.name
    `);
    console.table(tables.recordset);

    // --- 3. PROCESS_TRACKER row count + most recent ---
    console.log('\n[3] PROCESS_TRACKER row count + most recent row');
    const ptCount = await pool.request().query<{ n: number }>(
      'SELECT COUNT(*) AS n FROM dbo.PROCESS_TRACKER',
    );
    console.log(`  Total rows: ${ptCount.recordset[0].n}`);
    const ptRecent = await pool.request().query(`
      SELECT TOP 1
        PROCESS_ID, PROCESS_NAME, REPO_ID, CURRENT_STAGE, PROCESS_STATUS,
        SOURCE_ROW_COUNT, XML_FILE_NAME, INITIATED_BY, UPDATED, WATERMARK
      FROM dbo.PROCESS_TRACKER
      ORDER BY UPDATED DESC
    `);
    console.table(ptRecent.recordset);

    // --- 4. PROCESS_NAME distribution ---
    console.log('\n[4] PROCESS_NAME distribution');
    const byName = await pool.request().query<{ PROCESS_NAME: string; run_count: number }>(`
      SELECT PROCESS_NAME, COUNT(*) AS run_count
      FROM dbo.PROCESS_TRACKER
      GROUP BY PROCESS_NAME
      ORDER BY run_count DESC
    `);
    console.table(byName.recordset);

    // --- 5. State distribution (top 8) ---
    console.log('\n[5] CURRENT_STAGE x PROCESS_STATUS distribution (top 8)');
    const byStage = await pool.request().query<{
      CURRENT_STAGE: string;
      PROCESS_STATUS: string;
      run_count: number;
    }>(`
      SELECT TOP 8 CURRENT_STAGE, PROCESS_STATUS, COUNT(*) AS run_count
      FROM dbo.PROCESS_TRACKER
      GROUP BY CURRENT_STAGE, PROCESS_STATUS
      ORDER BY run_count DESC
    `);
    console.table(byStage.recordset);

    // --- 6. ERROR_LOG sanity (count + recent error_stage breakdown) ---
    console.log('\n[6] ERROR_LOG summary (last 30 days)');
    const errSummary = await pool.request().query<{
      FAILED_STAGE: string;
      failure_count: number;
    }>(`
      SELECT FAILED_STAGE, COUNT(*) AS failure_count
      FROM dbo.ERROR_LOG
      WHERE ERROR_TIMESTAMP >= DATEADD(day, -30, SYSUTCDATETIME())
      GROUP BY FAILED_STAGE
      ORDER BY failure_count DESC
    `);
    console.table(errSummary.recordset);

    console.log('\nOK — SPN has read access to `sqldb-dev-uks-lyd`, PROCESS_TRACKER + ERROR_LOG both queryable.');
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  if (err instanceof Error) {
    console.error('\nERROR:', err.message);
    if (err.stack) console.error(err.stack);
    const inner = (err as unknown as { originalError?: unknown }).originalError;
    if (inner) console.error('originalError:', inner);
  } else {
    console.error('\nERROR (non-Error):', err);
  }
  process.exit(1);
});
