/**
 * Lloyd's **F&O / Dataverse mirrored Fabric warehouse** SQL (TDS endpoint).
 *
 * **Separate from `SQLSERVER_*`**, which targets other hosts (e.g. Mule `PROCESS_TRACKER`,
 * ODS/TDS servers). Use dedicated env vars so multiple SQL endpoints can coexist in `.env.qa`.
 *
 * Source: TM Confluence — *Lloyds QA Environment Access and Blocker Management* (page 3069050881),
 * **Lloyds Integrated QA env** column (SQL Analytics Endpoint + connection string host).
 */

export type LloydsFnOFabricSqlSpnSource = 'AZURE' | 'D365' | 'SQLSERVER';

export interface LloydsFnOFabricSqlSpn {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  source: LloydsFnOFabricSqlSpnSource;
}

export function isLloydsFnOFabricSqlConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(
    env.LLOYDS_FNOFABRIC_SQLSERVER_HOST?.trim() && env.LLOYDS_FNOFABRIC_SQLSERVER_DATABASE?.trim()
  );
}

export function getLloydsFnOFabricSqlServerHost(env: NodeJS.ProcessEnv = process.env): string {
  const h = env.LLOYDS_FNOFABRIC_SQLSERVER_HOST?.trim();
  if (!h) {
    throw new Error('LLOYDS_FNOFABRIC_SQLSERVER_HOST is not set (Lloyd\'s Fabric warehouse TDS host).');
  }
  return h;
}

export function getLloydsFnOFabricSqlDatabase(env: NodeJS.ProcessEnv = process.env): string {
  const d = env.LLOYDS_FNOFABRIC_SQLSERVER_DATABASE?.trim();
  if (!d) {
    throw new Error(
      'LLOYDS_FNOFABRIC_SQLSERVER_DATABASE is not set (exact warehouse / SQL endpoint database name).',
    );
  }
  return d;
}

export function getLloydsFnOFabricSqlPort(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.LLOYDS_FNOFABRIC_SQLSERVER_PORT?.trim();
  const n = raw ? parseInt(raw, 10) : 1433;
  if (!Number.isFinite(n) || n < 1 || n > 65535) return 1433;
  return n;
}

/**
 * Entra service principal for Fabric warehouse SQL.
 * Preference: **AZURE_*** → **D365_*** → **SQLSERVER_*** (fallback if the first two are unset).
 */
export function resolveLloydsFnOFabricSqlSpnOptional(env: NodeJS.ProcessEnv = process.env): LloydsFnOFabricSqlSpn | null {
  const tA = env.AZURE_TENANT_ID?.trim();
  const cA = env.AZURE_CLIENT_ID?.trim();
  const sA = env.AZURE_CLIENT_SECRET?.trim();
  if (tA && cA && sA) {
    return { tenantId: tA, clientId: cA, clientSecret: sA, source: 'AZURE' };
  }
  const tD = env.D365_TENANT_ID?.trim();
  const cD = env.D365_CLIENT_ID?.trim();
  const sD = env.D365_CLIENT_SECRET?.trim();
  if (tD && cD && sD) {
    return { tenantId: tD, clientId: cD, clientSecret: sD, source: 'D365' };
  }
  const tS = env.SQLSERVER_TENANT_ID?.trim();
  const cS = env.SQLSERVER_CLIENT_ID?.trim();
  const sS = env.SQLSERVER_CLIENT_SECRET?.trim();
  if (tS && cS && sS) {
    return { tenantId: tS, clientId: cS, clientSecret: sS, source: 'SQLSERVER' };
  }
  return null;
}

/**
 * Same as {@link resolveLloydsFnOFabricSqlSpnOptional} but throws if no app registration triple is set.
 * Prefer the optional resolver in {@link LloydsFnOFabricSqlClient} so **SSO** (`DefaultAzureCredential`) can run when SPN is absent.
 */
export function resolveLloydsFnOFabricSqlSpn(env: NodeJS.ProcessEnv = process.env): LloydsFnOFabricSqlSpn {
  const spn = resolveLloydsFnOFabricSqlSpnOptional(env);
  if (spn) return spn;
  throw new Error(
    'Lloyd\'s FNO Fabric SQL needs Entra SPN credentials: set AZURE_TENANT_ID + AZURE_CLIENT_ID + AZURE_CLIENT_SECRET '
      + '(preferred), or D365_* , or SQLSERVER_* as a last resort — or omit them and sign in with `az login` / VS Code for SSO.',
  );
}
