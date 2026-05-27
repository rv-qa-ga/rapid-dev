/**
 * Lloyd's **TDS / Tagetik SQL Server** (`sql-dev-uks-01` style hosts) — separate from `SQLSERVER_HOST`
 * which targets Mule **`PROCESS_TRACKER`** (e.g. `sql-dev-uks-lyd`).
 *
 * Auth: prefer **Entra SPN** (`SQL_LLOYDS_*` or reused `SQLSERVER_*` when enabled), else
 * **`DefaultAzureCredential`** (Azure CLI / VS Code / managed identity — "SSO" for devs).
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertSafeSqlIdentifier(name: string, label: string): string {
  const s = name.trim();
  if (!IDENT.test(s)) {
    throw new Error(`Unsafe ${label} "${name}" — use letters, digits, underscore only.`);
  }
  return s;
}

export function isLloydsTagetikTdsSqlConfigured(): boolean {
  return Boolean(process.env.SQL_LLOYDS_SERVER?.trim());
}

export type LloydsTagetikTdsSpnCreds = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

/**
 * SPN for TDS SQL: explicit `SQL_LLOYDS_TENANT_ID` + `SQL_LLOYDS_CLIENT_ID` + `SQL_LLOYDS_CLIENT_SECRET`,
 * or reuse **`SQLSERVER_*`** when `SQL_LLOYDS_REUSE_SQLSERVER_SPN` is not `0` (default reuse).
 */
export function resolveLloydsTagetikTdsSpnCredentials(): LloydsTagetikTdsSpnCreds | null {
  const t = process.env.SQL_LLOYDS_TENANT_ID?.trim();
  const c = process.env.SQL_LLOYDS_CLIENT_ID?.trim();
  const s = process.env.SQL_LLOYDS_CLIENT_SECRET?.trim();
  if (t && c && s) return { tenantId: t, clientId: c, clientSecret: s };

  const reuse = process.env.SQL_LLOYDS_REUSE_SQLSERVER_SPN !== '0';
  if (!reuse) return null;

  const t2 = process.env.SQLSERVER_TENANT_ID?.trim();
  const c2 = process.env.SQLSERVER_CLIENT_ID?.trim();
  const s2 = process.env.SQLSERVER_CLIENT_SECRET?.trim();
  if (t2 && c2 && s2) return { tenantId: t2, clientId: c2, clientSecret: s2 };
  return null;
}

export function getLloydsTagetikTdsServer(): string {
  const h = process.env.SQL_LLOYDS_SERVER?.trim();
  if (!h) throw new Error('SQL_LLOYDS_SERVER is not set (Lloyd\'s TDS / Tagetik SQL host).');
  return h;
}

export function getLloydsTagetikTdsPort(): number {
  const p = parseInt(process.env.SQL_LLOYDS_SERVER_PORT || '1433', 10);
  if (!Number.isFinite(p) || p <= 0) return 1433;
  return p;
}

export function getLloydsTagetikDatabase(): string {
  return assertSafeSqlIdentifier(process.env.SQL_LLOYDS_DATABASE?.trim() || 'TDS', 'SQL_LLOYDS_DATABASE');
}

export function getLloydsTagetikSchema(): string {
  return assertSafeSqlIdentifier(process.env.SQL_LLOYDS_TAGETIK_SCHEMA?.trim() || 'tagetik', 'SQL_LLOYDS_TAGETIK_SCHEMA');
}

export function getLloydsTagetikTable(): string {
  return assertSafeSqlIdentifier(
    process.env.SQL_LLOYDS_TAGETIK_TABLE?.trim() || 'TagetikWrittenforDataLoaderADP',
    'SQL_LLOYDS_TAGETIK_TABLE',
  );
}

/** Repository filter column (SSMS may show `RepositoryID`). */
export function getLloydsTagetikRepositoryColumn(): string {
  return assertSafeSqlIdentifier(
    process.env.SQL_LLOYDS_TAGETIK_REPO_COLUMN?.trim() || 'RepositoryID',
    'SQL_LLOYDS_TAGETIK_REPO_COLUMN',
  );
}

/** Optional: e.g. `_ACCEL_UNIQUE_RUN_ID` — when set, AND filter is applied when run id is known. */
export function getLloydsTagetikRunColumn(): string | null {
  const raw = process.env.SQL_LLOYDS_TAGETIK_RUN_COLUMN?.trim();
  if (!raw) return null;
  return assertSafeSqlIdentifier(raw, 'SQL_LLOYDS_TAGETIK_RUN_COLUMN');
}
