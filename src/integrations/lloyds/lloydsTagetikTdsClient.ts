/**
 * Read-only queries against **`TDS.tagetik.TagetikWrittenforDataLoaderADP`** (or overrides via env)
 * on **`SQL_LLOYDS_SERVER`**.
 *
 * Auth order:
 * 1. Try **service principal** (`SQL_LLOYDS_*` or reused `SQLSERVER_*` — see `lloydsTagetikTdsEnv.ts`).
 * 2. If SPN is not configured **or** SPN connection fails, fall back to **`DefaultAzureCredential`**
 *    access token (`https://database.windows.net/.default`) for interactive / dev SSO.
 */

import * as sql from 'mssql';
import { DefaultAzureCredential } from '@azure/identity';

import { logger } from '../../utils/logger';
import {
  getLloydsTagetikDatabase,
  getLloydsTagetikRepositoryColumn,
  getLloydsTagetikRunColumn,
  getLloydsTagetikSchema,
  getLloydsTagetikTable,
  getLloydsTagetikTdsPort,
  getLloydsTagetikTdsServer,
  type LloydsTagetikTdsSpnCreds,
  resolveLloydsTagetikTdsSpnCredentials,
} from './lloydsTagetikTdsEnv';

const SQL_SCOPE = 'https://database.windows.net/.default';

async function fetchSpnAccessToken(tenantId: string, clientId: string, clientSecret: string): Promise<string> {
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: SQL_SCOPE,
    grant_type: 'client_credentials',
  });
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tagetik TDS SPN token failed: ${response.status} ${response.statusText} — ${text}`);
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Tagetik TDS SPN token response missing access_token.');
  return data.access_token;
}

async function fetchDefaultCredentialToken(): Promise<string> {
  const cred = new DefaultAzureCredential();
  const token = await cred.getToken(SQL_SCOPE);
  if (!token?.token) {
    throw new Error(
      'DefaultAzureCredential returned no token for database.windows.net. ' +
        'Sign in with `az login` or set SQL_LLOYDS_* / SQLSERVER_* SPN variables.',
    );
  }
  return token.token;
}

type AuthMode = 'spn-secret' | 'access-token';

function basePoolConfig(): {
  server: string;
  port: number;
  database: string;
  options: { encrypt: boolean; trustServerCertificate: boolean; enableArithAbort: boolean };
  pool: { max: number; min: number; idleTimeoutMillis: number };
  connectionTimeout: number;
  requestTimeout: number;
} {
  return {
    server: getLloydsTagetikTdsServer(),
    port: getLloydsTagetikTdsPort(),
    database: getLloydsTagetikDatabase(),
    options: {
      encrypt: process.env.SQL_LLOYDS_ENCRYPT === '0' ? false : true,
      trustServerCertificate: process.env.SQL_LLOYDS_TRUST_SERVER_CERTIFICATE === '1',
      enableArithAbort: true,
    },
    pool: { max: 1, min: 0, idleTimeoutMillis: 10000 },
    connectionTimeout: 90000,
    requestTimeout: 120000,
  };
}

async function connectPool(mode: AuthMode, tokenOrSpn: { token: string } | LloydsTagetikTdsSpnCreds): Promise<sql.ConnectionPool> {
  const base = basePoolConfig();
  let pool: sql.ConnectionPool;
  if (mode === 'spn-secret') {
    const spn = tokenOrSpn as LloydsTagetikTdsSpnCreds;
    pool = new sql.ConnectionPool({
      ...base,
      authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: spn.clientId,
          clientSecret: spn.clientSecret,
          tenantId: spn.tenantId,
        },
      },
    } as any);
  } else {
    const { token } = tokenOrSpn as { token: string };
    pool = new sql.ConnectionPool({
      ...base,
      authentication: {
        type: 'azure-active-directory-access-token',
        options: { token },
      },
    } as any);
  }
  await pool.connect();
  return pool;
}

/**
 * Query `[schema].[table]` filtered by repository (and optional run column).
 */
export async function fetchTagetikWrittenForDataLoaderAdpRows(
  repositoryId: string,
  runId: string | undefined,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const schema = getLloydsTagetikSchema();
  const table = getLloydsTagetikTable();
  const repoCol = getLloydsTagetikRepositoryColumn();
  const runCol = getLloydsTagetikRunColumn();

  let sqlText = `
    SELECT TOP (@lim) *
    FROM   [${schema}].[${table}]
    WHERE  [${repoCol}] = @repo
  `;
  const params: Record<string, unknown> = { repo: repositoryId, lim: Math.min(Math.max(limit, 1), 500) };

  if (runId && runCol) {
    sqlText += ` AND [${runCol}] = @run`;
    params.run = runId;
  }

  const spn = resolveLloydsTagetikTdsSpnCredentials();
  let pool: sql.ConnectionPool | null = null;

  const tryClose = async () => {
    if (pool?.connected) {
      try {
        await pool.close();
      } catch {
        /* ignore */
      }
    }
    pool = null;
  };

  if (spn) {
    try {
      logger.info("Lloyd's Tagetik TDS: connecting with Entra service principal (client credentials).");
      pool = await connectPool('spn-secret', spn);
      const req = pool.request();
      req.input('repo', sql.NVarChar, params.repo as string);
      req.input('lim', sql.Int, params.lim as number);
      if (params.run !== undefined) req.input('run', sql.NVarChar, params.run as string);
      const result = await req.query(sqlText);
      await tryClose();
      return (result.recordset ?? []) as Record<string, unknown>[];
    } catch (e) {
      await tryClose();
      logger.warn(
        `Lloyd's Tagetik TDS: SPN connection/query failed (${(e as Error).message}) — falling back to DefaultAzureCredential.`,
      );
    }
  } else {
    logger.info("Lloyd's Tagetik TDS: no SPN triple configured — using DefaultAzureCredential for SQL token.");
  }

  const token = await fetchDefaultCredentialToken();
  pool = await connectPool('access-token', { token });
  try {
    const req = pool.request();
    req.input('repo', sql.NVarChar, params.repo as string);
    req.input('lim', sql.Int, params.lim as number);
    if (params.run !== undefined) req.input('run', sql.NVarChar, params.run as string);
    const result = await req.query(sqlText);
    return (result.recordset ?? []) as Record<string, unknown>[];
  } finally {
    await tryClose();
  }
}
