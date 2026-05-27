/**
 * Read-only **mssql** pool for Lloyd's Fabric warehouse SQL (`LLOYDS_FNOFABRIC_SQLSERVER_*`).
 * Does not use {@link SqlServerClient} / `SQLSERVER_HOST` so PROCESS_TRACKER and FNO Fabric can differ.
 *
 * Auth order (same idea as {@link ./lloydsTagetikTdsClient.ts}):
 * 1. **SPN** when AZURE_* / D365_* / SQLSERVER_* app secret triple is set — for Fabric hosts, prefer
 *    access token from that app (`https://database.windows.net/.default`) unless
 *    `LLOYDS_FNOFABRIC_SQL_USE_ACCESS_TOKEN=0`.
 * 2. If SPN is missing **or** `pool.connect()` fails, fall back to **tedious `azure-active-directory-default`**
 *    (Azure `DefaultAzureCredential` chain inside the driver — better Fabric TDS behaviour than passing a
 *    pre-fetched access token). Legacy token-injection: `LLOYDS_FNOFABRIC_SQL_SSO_USE_ACCESS_TOKEN=1`.
 *
 * Opt out of token-based SPN path: `LLOYDS_FNOFABRIC_SQL_USE_ACCESS_TOKEN=0` (legacy client-secret only).
 * Opt out of SSO retry: `LLOYDS_FNOFABRIC_SQL_DISABLE_SSO_FAILOVER=1` (fail fast after SPN error; CI).
 * **SSO only (skip SPN attempt):** `LLOYDS_FNOFABRIC_SQL_PREFER_SSO=1` — e.g. dev has SSMS user access but QA SPN on the warehouse is not ready yet.
 */

import { ClientSecretCredential, DefaultAzureCredential } from '@azure/identity';
import * as sql from 'mssql';

import { logger } from '../../utils/logger';
import {
  getLloydsFnOFabricSqlDatabase,
  getLloydsFnOFabricSqlPort,
  getLloydsFnOFabricSqlServerHost,
  isLloydsFnOFabricSqlConfigured,
  resolveLloydsFnOFabricSqlSpnOptional,
} from './lloydsFnOFabricSqlEnv';

const SQL_DATABASE_SCOPE = 'https://database.windows.net/.default';

function trustServerCertificate(env: NodeJS.ProcessEnv): boolean {
  const v = env.LLOYDS_FNOFABRIC_SQL_TRUST_SERVER_CERTIFICATE?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function fabricHostPrefersAccessToken(server: string, env: NodeJS.ProcessEnv): boolean {
  const off = env.LLOYDS_FNOFABRIC_SQL_USE_ACCESS_TOKEN?.trim().toLowerCase();
  if (off === '0' || off === 'false' || off === 'no') return false;
  return server.toLowerCase().includes('datawarehouse.fabric.microsoft.com');
}

function fabricBaseConfig(
  env: NodeJS.ProcessEnv,
  server: string,
  database: string,
  port: number,
): sql.config {
  // `mssql` / tedious typings lag runtime (encrypt + AAD auth + trustServerCertificate); cast at boundary.
  return {
    server,
    port,
    database,
    options: {
      encrypt: true,
      trustServerCertificate: trustServerCertificate(env),
      enableArithAbort: true,
      connectTimeout: 60_000,
      requestTimeout: 120_000,
    },
    pool: { max: 5, min: 0, idleTimeoutMillis: 30_000 },
  } as sql.config;
}

async function buildSpnSqlConfig(
  env: NodeJS.ProcessEnv,
  server: string,
  database: string,
  port: number,
  spn: { tenantId: string; clientId: string; clientSecret: string; source: string },
): Promise<sql.config> {
  const base = fabricBaseConfig(env, server, database, port);

  if (fabricHostPrefersAccessToken(server, env)) {
    const cred = new ClientSecretCredential(spn.tenantId, spn.clientId, spn.clientSecret);
    const tr = await cred.getToken(SQL_DATABASE_SCOPE);
    if (!tr?.token) {
      throw new Error(`Failed to acquire ${SQL_DATABASE_SCOPE} token for Fabric SQL (SPN)`);
    }
    return {
      ...base,
      authentication: {
        type: 'azure-active-directory-access-token' as const,
        options: { token: tr.token },
      },
    } as sql.config;
  }

  return {
    ...base,
    authentication: {
      type: 'azure-active-directory-service-principal-secret' as const,
      options: {
        clientId: spn.clientId,
        clientSecret: spn.clientSecret,
        tenantId: spn.tenantId,
      },
    },
  } as sql.config;
}

function buildSsoTediousDefaultAzureSqlConfig(
  env: NodeJS.ProcessEnv,
  server: string,
  database: string,
  port: number,
): sql.config {
  const base = fabricBaseConfig(env, server, database, port);
  return {
    ...base,
    authentication: {
      type: 'azure-active-directory-default' as const,
      options: {},
    },
  } as sql.config;
}

function buildSsoAccessTokenSqlConfig(
  env: NodeJS.ProcessEnv,
  server: string,
  database: string,
  port: number,
  token: string,
): sql.config {
  const base = fabricBaseConfig(env, server, database, port);
  return {
    ...base,
    authentication: {
      type: 'azure-active-directory-access-token' as const,
      options: { token },
    },
  } as sql.config;
}

async function fetchSsoAccessToken(): Promise<string> {
  const cred = new DefaultAzureCredential();
  const tr = await cred.getToken(SQL_DATABASE_SCOPE);
  if (!tr?.token) {
    throw new Error(
      `DefaultAzureCredential returned no token for ${SQL_DATABASE_SCOPE}. Use Azure CLI login or VS Code sign-in, or set SPN env vars.`,
    );
  }
  return tr.token;
}

/** Prefer legacy pre-fetched token auth (Fabric + tedious sometimes still fails either way). */
function fabricSsoUseLegacyAccessToken(env: NodeJS.ProcessEnv): boolean {
  const v = env.LLOYDS_FNOFABRIC_SQL_SSO_USE_ACCESS_TOKEN?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function ssoFailoverDisabled(env: NodeJS.ProcessEnv): boolean {
  const v = env.LLOYDS_FNOFABRIC_SQL_DISABLE_SSO_FAILOVER?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Skip SPN `pool.connect` entirely; use `DefaultAzureCredential` only (matches SSMS interactive user). */
function fabricPreferSsoOnly(env: NodeJS.ProcessEnv): boolean {
  const v = env.LLOYDS_FNOFABRIC_SQL_PREFER_SSO?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export class LloydsFnOFabricSqlClient {
  private pool: sql.ConnectionPool | null = null;

  /** True when host + database env vars are set (SPN may still be missing). */
  static isConfigured(): boolean {
    return isLloydsFnOFabricSqlConfigured();
  }

  async connect(env: NodeJS.ProcessEnv = process.env): Promise<void> {
    if (this.pool?.connected) return;

    const server = getLloydsFnOFabricSqlServerHost(env);
    const database = getLloydsFnOFabricSqlDatabase(env);
    const port = getLloydsFnOFabricSqlPort(env);
    const spn = resolveLloydsFnOFabricSqlSpnOptional(env);
    const useTok = fabricHostPrefersAccessToken(server, env);

    const tryPool = async (cfg: sql.config, logLine: string): Promise<void> => {
      logger.info(`Lloyd's FNO Fabric SQL: connecting ${server}:${port} / ${database} — ${logLine}`);
      const pool = new sql.ConnectionPool(cfg as sql.config);
      try {
        await pool.connect();
        this.pool = pool;
      } catch (err) {
        try {
          await pool.close();
        } catch {
          /* ignore */
        }
        throw err;
      }
    };

    if (fabricPreferSsoOnly(env)) {
      logger.info(
        "Lloyd's FNO Fabric SQL: LLOYDS_FNOFABRIC_SQL_PREFER_SSO=1 — skipping service principal connect; using interactive / dev credential chain.",
      );
      if (fabricSsoUseLegacyAccessToken(env)) {
        const token = await fetchSsoAccessToken();
        const ssoCfg = buildSsoAccessTokenSqlConfig(env, server, database, port, token);
        await tryPool(ssoCfg, 'DefaultAzureCredential access-token (legacy LLOYDS_FNOFABRIC_SQL_SSO_USE_ACCESS_TOKEN)');
      } else {
        const ssoCfg = buildSsoTediousDefaultAzureSqlConfig(env, server, database, port);
        await tryPool(ssoCfg, 'azure-active-directory-default (tedious + @azure/identity) — PREFER_SSO');
      }
      return;
    }

    if (spn) {
      try {
        const cfg = await buildSpnSqlConfig(env, server, database, port, spn);
        await tryPool(
          cfg,
          `Entra SPN (${spn.source}${useTok ? ', access-token' : ', client-secret'})`,
        );
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (ssoFailoverDisabled(env)) {
          throw new Error(`Lloyd's FNO Fabric SQL: SPN connect failed (${msg}). SSO failover disabled.`);
        }
        logger.warn(
          `Lloyd's FNO Fabric SQL: SPN path failed (${msg}) — falling back to DefaultAzureCredential (SSO / dev chain).`,
        );
      }
    } else if (!ssoFailoverDisabled(env)) {
      logger.info("Lloyd's FNO Fabric SQL: no Entra app secret triple — using DefaultAzureCredential for SQL token.");
    }

    if (ssoFailoverDisabled(env) && !spn) {
      throw new Error(
        'Lloyd\'s FNO Fabric SQL: no SPN triple (AZURE_* / D365_* / SQLSERVER_*) and SSO failover is disabled.',
      );
    }

    let ssoCfg: sql.config;
    if (fabricSsoUseLegacyAccessToken(env)) {
      const token = await fetchSsoAccessToken();
      ssoCfg = buildSsoAccessTokenSqlConfig(env, server, database, port, token);
    } else {
      ssoCfg = buildSsoTediousDefaultAzureSqlConfig(env, server, database, port);
    }
    try {
      await tryPool(
        ssoCfg,
        fabricSsoUseLegacyAccessToken(env)
          ? 'DefaultAzureCredential access-token (legacy)'
          : 'azure-active-directory-default (tedious SSO failover)',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(
        spn
          ? `Lloyd's FNO Fabric SQL: SPN failed earlier; SSO path also failed: ${msg}`
          : `Lloyd's FNO Fabric SQL: DefaultAzureCredential connect failed: ${msg}`,
      );
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
      } catch {
        /* ignore */
      }
      this.pool = null;
    }
  }

  async queryMany<T = Record<string, unknown>>(query: string, env?: NodeJS.ProcessEnv): Promise<T[]> {
    if (!this.pool?.connected) await this.connect(env);
    const result = await this.pool!.request().query(query);
    return (result.recordset ?? []) as T[];
  }

  /**
   * Parameterised query (nvarchar inputs only) — avoids string concatenation for user-derived tokens.
   */
  async queryManyWithNvarcharParams<T = Record<string, unknown>>(
    sqlText: string,
    nvarcharParams: Record<string, string>,
    env?: NodeJS.ProcessEnv,
  ): Promise<T[]> {
    if (!this.pool?.connected) await this.connect(env);
    const req = this.pool!.request();
    for (const [name, value] of Object.entries(nvarcharParams)) {
      req.input(name, sql.NVarChar(4000), value);
    }
    const result = await req.query(sqlText);
    return (result.recordset ?? []) as T[];
  }
}
