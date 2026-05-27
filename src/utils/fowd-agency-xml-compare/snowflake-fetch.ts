import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import snowflake, { type Connection, type ConnectionOptions, type RowStatement } from 'snowflake-sdk';

const SNOWFLAKE_SDK_LOG_LEVELS = new Set(['ERROR', 'WARNING', 'INFO', 'DEBUG', 'TRACE']);

/** When `SNOWFLAKE_SDK_LOG_LEVEL` is set (e.g. TRACE), configures the Snowflake Node driver logger before any connection. */
function configureSnowflakeSdkLoggingFromEnv(): void {
  const raw = process.env.SNOWFLAKE_SDK_LOG_LEVEL?.trim().toUpperCase();
  if (!raw || !SNOWFLAKE_SDK_LOG_LEVELS.has(raw)) return;
  const logFilePath = process.env.SNOWFLAKE_SDK_LOG_PATH?.trim() || 'STDOUT';
  const additionalLogToConsole = process.env.SNOWFLAKE_SDK_LOG_EXTRA_CONSOLE !== '0';
  snowflake.configure({
    logLevel: raw as 'TRACE',
    logFilePath,
    additionalLogToConsole,
  });
}

configureSnowflakeSdkLoggingFromEnv();

export const DEFAULT_FOWD_TABLE =
  'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1';

/** Options for {@link fetchFowdAgencyPolicyRows}. */
export type FetchFowdAgencyPolicyRowsOptions = {
  /**
   * Fully qualified Snowflake table (e.g. `DB.SCHEMA.TABLE`).
   * Defaults to {@link DEFAULT_FOWD_TABLE} or can be set via env `FOWD_COMPARE_TABLE` at the call site.
   */
  tableFqn?: string;
  /** When set, the query includes `AND DOCUMENT = :2`. */
  document?: string;
};

/**
 * Allow only dot-separated Snowflake identifiers (unquoted); blocks `;`, quotes, spaces, etc.
 * when the table name is embedded in SQL text.
 */
export function assertSafeSnowflakeTableFqn(fqn: string): void {
  const parts = fqn.split('.');
  if (parts.length < 1 || parts.length > 3) {
    throw new Error(
      `Invalid Snowflake table FQN "${fqn}": expected 1–3 dot-separated identifiers (e.g. DB.SCHEMA.TABLE).`,
    );
  }
  const id = /^[A-Za-z_][A-Za-z0-9_$]*$/;
  for (const p of parts) {
    if (!id.test(p)) {
      throw new Error(`Invalid Snowflake table FQN "${fqn}": segment "${p}" is not a safe identifier.`);
    }
  }
}

const DEFAULT_ROLE = 'PUBLIC';
const DEFAULT_WAREHOUSE = 'INSURANCE_SERVICES_WH';
const DEFAULT_DATABASE = 'FINANCIAL_OPERATIONS';

/** Entra token endpoint for Snowflake external OAuth (client credentials). */
export function resolveSnowflakeOAuthTokenRequestUrl(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = env.SNOWFLAKE_OAUTH_TOKEN_REQUEST_URL?.trim();
  if (explicit) return explicit;
  const tenant =
    env.SNOWFLAKE_TENANT_ID?.trim()
    || env.D365_TENANT_ID?.trim()
    || env.AZURE_TENANT_ID?.trim();
  if (!tenant) {
    throw new Error(
      'OAuth client credentials: set SNOWFLAKE_OAUTH_TOKEN_REQUEST_URL, or set one of '
        + 'SNOWFLAKE_TENANT_ID, D365_TENANT_ID, AZURE_TENANT_ID for the default '
        + 'https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token URL.',
    );
  }
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
}

/**
 * True when FinOps Snowflake should use Entra OAuth client credentials (SPN / app registration).
 * Active when both SNOWFLAKE_CLIENT_ID and SNOWFLAKE_CLIENT_SECRET are set, or when
 * SNOWFLAKE_AUTHENTICATOR=OAUTH_CLIENT_CREDENTIALS. Set SNOWFLAKE_PREFER_BROWSER_SSO=1 to force browser SSO.
 */
export function useFinOpsSnowflakeOAuthClientCredentials(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.SNOWFLAKE_PREFER_BROWSER_SSO === '1') return false;
  const auth = env.SNOWFLAKE_AUTHENTICATOR?.trim().toUpperCase();
  if (auth === 'OAUTH_CLIENT_CREDENTIALS') return true;
  const id = env.SNOWFLAKE_CLIENT_ID?.trim();
  const secret = env.SNOWFLAKE_CLIENT_SECRET?.trim();
  return Boolean(id && secret);
}

/**
 * Loads the first existing env file from the standard FinOps candidates list.
 * Uses `override: true` so values in `.env.qa` (etc.) win over stale machine-wide
 * `SNOWFLAKE_*` variables. Set `FINOPS_SNOWFLAKE_DOTENV_NO_OVERRIDE=1` if a pipeline
 * must keep process.env entries that are absent from the file.
 */
/** Set by {@link loadFinOpsSnowflakeEnv} — which env file was loaded (first match), if any. */
let finOpsSnowflakeEnvLoadedPath: string | null = null;

/** Path passed to `dotenv.config` by the last {@link loadFinOpsSnowflakeEnv} call, or null. */
export function getFinOpsSnowflakeEnvLoadedPath(): string | null {
  return finOpsSnowflakeEnvLoadedPath;
}

export function loadFinOpsSnowflakeEnv(): void {
  const root = process.cwd();
  const envName = process.env.ENV || 'qa';
  const candidates = [
    path.join(root, 'src', 'config', 'env', `.env.${envName}`),
    path.join(root, '.env'),
    path.join(root, '.env.local'),
    path.join(root, '.env.qa'),
  ];
  const override = process.env.FINOPS_SNOWFLAKE_DOTENV_NO_OVERRIDE !== '1';
  finOpsSnowflakeEnvLoadedPath = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      finOpsSnowflakeEnvLoadedPath = p;
      dotenv.config({ path: p, override });
      break;
    }
  }
}

function finOpsSnowflakeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const c = err.cause;
    return c instanceof Error ? `${err.message} ${c.message}` : err.message;
  }
  return String(err);
}

/** True when Snowflake rejected the session because the client IP is not on an account network policy. */
export function isSnowflakeNetworkPolicyDenial(err: unknown): boolean {
  const msg = finOpsSnowflakeErrorMessage(err);
  return /not allowed to access Snowflake/i.test(msg)
    || (/IP[/\s]Token/i.test(msg) && /not allowed/i.test(msg));
}

/**
 * Human-readable follow-up when {@link isSnowflakeNetworkPolicyDenial} is true; otherwise empty string.
 */
export function formatFinOpsSnowflakeNetworkPolicyHelp(err: unknown): string {
  if (!isSnowflakeNetworkPolicyDenial(err)) return '';
  const msg = finOpsSnowflakeErrorMessage(err);
  const ipMatch = msg.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
  const ipNote = ipMatch ? ` Blocked egress IP: ${ipMatch[0]}.` : '';
  return (
    `\nSnowflake network policy:${ipNote} OAuth can succeed and still fail on the first SQL `
      + `if this IP is not allowlisted. Ask your Snowflake account admin to add the IP, extend the policy, `
      + `or use VPN / a runner whose egress is already allowed.\n`
      + `https://community.snowflake.com/s/ip-xxxxxxxxxxxx-is-not-allowed-to-access\n`
  );
}

export function getFinOpsConnectionOptions(): ConnectionOptions {
  const account = process.env.SNOWFLAKE_ACCOUNT?.trim();
  const username = process.env.SNOWFLAKE_USER?.trim();
  const password = process.env.SNOWFLAKE_PASSWORD;

  if (!account || !username) {
    throw new Error(
      'Set SNOWFLAKE_ACCOUNT and SNOWFLAKE_USER. For password login, set SNOWFLAKE_PASSWORD; '
        + 'for browser SSO set SNOWFLAKE_AUTHENTICATOR=EXTERNALBROWSER; '
        + 'for Entra SPN use SNOWFLAKE_CLIENT_ID + SNOWFLAKE_CLIENT_SECRET (see env.sample).',
    );
  }

  /**
   * When `FINOPS_SNOWFLAKE_OMIT_CONNECTION_ROLE=1`, do not pass `role` into the driver so Snowflake
   * can apply default / EXTERNAL_OAUTH_ANY_ROLE_MODE behaviour (experiment for admin debugging).
   */
  const omitExplicitRole = process.env.FINOPS_SNOWFLAKE_OMIT_CONNECTION_ROLE === '1';
  const role = omitExplicitRole
    ? undefined
    : (process.env.SNOWFLAKE_ROLE?.trim() || DEFAULT_ROLE);

  if (useFinOpsSnowflakeOAuthClientCredentials()) {
    const oauthClientId = process.env.SNOWFLAKE_CLIENT_ID?.trim();
    const oauthClientSecret = process.env.SNOWFLAKE_CLIENT_SECRET?.trim();
    if (!oauthClientId || !oauthClientSecret) {
      throw new Error('OAuth mode requires SNOWFLAKE_CLIENT_ID and SNOWFLAKE_CLIENT_SECRET.');
    }
    const oauthScopeExplicit = process.env.SNOWFLAKE_OAUTH_SCOPE?.trim();
    const oauthResource = process.env.SNOWFLAKE_OAUTH_RESOURCE?.trim();
    let oauthScope = oauthScopeExplicit;
    if (!oauthScope && oauthResource) {
      const r = oauthResource.replace(/\/$/, '');
      oauthScope = /\/\.default$/i.test(r) ? r : `${r}/.default`;
    }
    if (!oauthScope) {
      throw new Error(
        'Entra OAuth client credentials: set SNOWFLAKE_OAUTH_SCOPE (full value, e.g. '
          + 'https://<your-resource-app-id-uri>/.default) or SNOWFLAKE_OAUTH_RESOURCE (URI only; '
          + '`/.default` is appended). Microsoft rejects bare `session:role:...` for client_credentials. '
          + 'Use the Application ID URI from the Snowflake OAuth **resource** app in Entra (Expose an API), '
          + 'or run `npm run lloyds:snowflake:entra-diagnose` after setting a candidate scope.',
      );
    }
    const oauthTokenRequestUrl = resolveSnowflakeOAuthTokenRequestUrl();
    const opts = {
      account,
      username,
      ...(role !== undefined ? { role } : {}),
      warehouse: process.env.SNOWFLAKE_WAREHOUSE?.trim() || DEFAULT_WAREHOUSE,
      database: process.env.SNOWFLAKE_DATABASE?.trim() || DEFAULT_DATABASE,
      authenticator: 'OAUTH_CLIENT_CREDENTIALS' as const,
      oauthClientId,
      oauthClientSecret,
      oauthTokenRequestUrl,
      oauthScope,
    };
    return opts as ConnectionOptions;
  }

  const authenticator = process.env.SNOWFLAKE_AUTHENTICATOR?.trim();
  const opts: ConnectionOptions = {
    account,
    username,
    ...(role !== undefined ? { role } : {}),
    warehouse: process.env.SNOWFLAKE_WAREHOUSE?.trim() || DEFAULT_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE?.trim() || DEFAULT_DATABASE,
  };

  if (authenticator) {
    opts.authenticator = authenticator;
    if (password !== undefined && password !== '') {
      opts.password = password;
    }
  } else {
    if (password === undefined || password === '') {
      throw new Error(
        'Set SNOWFLAKE_PASSWORD for standard login, or set SNOWFLAKE_AUTHENTICATOR=EXTERNALBROWSER for SSO.',
      );
    }
    opts.password = password;
  }

  return opts;
}

/** Ensures EXTERNALBROWSER / JWT auth finished — `connectAsync()` alone can resolve before SAML completes. */
function pingConnection(connection: Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: 'SELECT 1 AS X',
      complete: (err) => {
        if (err) reject(err);
        else resolve();
      },
    });
  });
}

function destroyConnectionPhysical(connection: Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.destroy((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Process-local shared Snowflake connection for `EXTERNALBROWSER` SSO.
 * Each `connectAsync()` otherwise opens another localhost browser tab — Cucumber runs
 * dozens of `@snowflake` scenarios, so we reuse one connection until ping fails or options change.
 *
 * Opt out: `SNOWFLAKE_REUSE_SHARED_CONNECTION=0`
 * Force-close shared: `disconnectFinOpsSnowflakeShared()` (e.g. long-running CLI after work).
 */
let sharedFinOpsConnection: Connection | null = null;
let sharedFinOpsOptionsKey = '';
/** Serializes acquire so two concurrent `connectFinOpsSnowflake` calls do not create two tabs. */
let sharedAcquireChain: Promise<unknown> = Promise.resolve();

function finOpsOptionsFingerprint(): string {
  try {
    const o = getFinOpsConnectionOptions();
    const auth = (o as { authenticator?: string }).authenticator ?? '';
    const r = (o as { role?: string }).role ?? '(no explicit role)';
    return `${o.account}|${o.username}|${String(auth)}|${r}|${o.warehouse}|${o.database}`;
  } catch {
    return '';
  }
}

export function shouldReuseFinOpsSnowflakeConnection(): boolean {
  if (process.env.SNOWFLAKE_REUSE_SHARED_CONNECTION === '0') return false;
  const a = process.env.SNOWFLAKE_AUTHENTICATOR?.trim().toUpperCase();
  return a === 'EXTERNALBROWSER';
}

function isSharedFinOpsConnection(connection: Connection): boolean {
  return Boolean(sharedFinOpsConnection && connection === sharedFinOpsConnection);
}

async function createFinOpsSnowflakeConnection(): Promise<Connection> {
  const options = getFinOpsConnectionOptions();
  const useKeepAlive =
    process.env.SNOWFLAKE_CLIENT_SESSION_KEEP_ALIVE !== '0' &&
    String(process.env.SNOWFLAKE_AUTHENTICATOR || '')
      .trim()
      .toUpperCase() === 'EXTERNALBROWSER';
  const connection = snowflake.createConnection({
    ...options,
    ...(useKeepAlive ? { clientSessionKeepAlive: true } : {}),
  } as ConnectionOptions);
  await connection.connectAsync();
  await pingConnection(connection);
  return connection;
}

async function acquireSharedFinOpsConnection(): Promise<Connection> {
  const key = finOpsOptionsFingerprint();
  if (sharedFinOpsConnection && sharedFinOpsOptionsKey === key) {
    try {
      await pingConnection(sharedFinOpsConnection);
      return sharedFinOpsConnection;
    } catch {
      await destroyConnectionPhysical(sharedFinOpsConnection).catch(() => {});
      sharedFinOpsConnection = null;
      sharedFinOpsOptionsKey = '';
    }
  } else if (sharedFinOpsConnection) {
    await disconnectFinOpsSnowflakeShared();
  }

  const c = await createFinOpsSnowflakeConnection();
  sharedFinOpsConnection = c;
  sharedFinOpsOptionsKey = finOpsOptionsFingerprint();
  return c;
}

export async function connectFinOpsSnowflake(): Promise<Connection> {
  if (!shouldReuseFinOpsSnowflakeConnection()) {
    return createFinOpsSnowflakeConnection();
  }
  const p = sharedAcquireChain.then(() => acquireSharedFinOpsConnection());
  sharedAcquireChain = p.then(
    () => undefined,
    () => undefined,
  );
  return p;
}

/** Closes the shared EXTERNALBROWSER connection (next `connectFinOpsSnowflake` opens a new tab). */
export async function disconnectFinOpsSnowflakeShared(): Promise<void> {
  if (!sharedFinOpsConnection) return;
  const c = sharedFinOpsConnection;
  sharedFinOpsConnection = null;
  sharedFinOpsOptionsKey = '';
  await destroyConnectionPhysical(c).catch(() => {});
}

/**
 * All rows from the configured FOWD table for the given DESCRIPTION (and optional DOCUMENT).
 * Pass {@link FetchFowdAgencyPolicyRowsOptions.tableFqn} to target a different table than the default.
 */
export function fetchFowdAgencyPolicyRows(
  connection: Connection,
  description: string,
  options?: FetchFowdAgencyPolicyRowsOptions,
): Promise<Record<string, unknown>[]> {
  const tableFqn = (options?.tableFqn?.trim() || DEFAULT_FOWD_TABLE).trim();
  assertSafeSnowflakeTableFqn(tableFqn);
  const docTrim = options?.document?.trim();
  // Snowflake Node.js driver binds use :1, :2, …
  const sqlText =
    docTrim !== undefined && docTrim !== ''
      ? `SELECT * FROM ${tableFqn} WHERE DESCRIPTION = :1 AND DOCUMENT = :2`
      : `SELECT * FROM ${tableFqn} WHERE DESCRIPTION = :1`;
  const binds =
    docTrim !== undefined && docTrim !== '' ? [description, docTrim] : [description];
  return new Promise((resolve, reject) => {
    const rows: Record<string, unknown>[] = [];
    connection.execute({
      sqlText,
      binds,
      streamResult: true,
      rowMode: 'object',
      complete: (err, stmt) => {
        if (err) {
          reject(err);
          return;
        }
        const rowStmt = stmt as RowStatement;
        if (typeof rowStmt.streamRows !== 'function') {
          reject(new Error('Snowflake statement does not support streamRows()'));
          return;
        }
        const stream = rowStmt.streamRows();
        stream.on('data', (row: Record<string, unknown>) => {
          rows.push(row);
        });
        stream.on('error', (e: Error) => reject(e));
        stream.on('end', () => resolve(rows));
      },
    });
  });
}

export function destroyConnection(connection: Connection): Promise<void> {
  if (isSharedFinOpsConnection(connection)) {
    return Promise.resolve();
  }
  return destroyConnectionPhysical(connection);
}
