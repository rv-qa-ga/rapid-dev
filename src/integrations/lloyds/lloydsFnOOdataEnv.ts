/**
 * Lloyd's — Dynamics 365 Finance (F&O) OData environment flags.
 *
 * Read-only probes use the same Entra credential chain as Dataverse discovery
 * (`getDiscoveryCredential` in `credential.ts`) with a **Finance** resource scope
 * derived from `LLOYDS_FNO_ODATA_BASE_URL`.
 *
 * Programme rule: Lloyd's runs only in legal entity **AEUM** — `LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE`
 * should keep `dataAreaId eq 'AEUM'` (and any fixed `AEUM` text such as journal description); only `{repo}` varies.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'y', 'on']);

export function isLloydsFnOOdataReadEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env.LLOYDS_FNO_ODATA_ENABLED ?? '').trim().toLowerCase();
  return TRUTHY.has(v);
}

/** Normalised OData root, e.g. `https://accelins-gc.sandbox.operations.dynamics.com/data` */
export function getLloydsFnOOdataBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = (env.LLOYDS_FNO_ODATA_BASE_URL ?? '').trim().replace(/\/+$/, '');
  return raw;
}

export function isLloydsFnOOdataConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(getLloydsFnOOdataBaseUrl(env));
}

/**
 * OData path/query **under** `LLOYDS_FNO_ODATA_BASE_URL` with literal `{repo}` replaced by the
 * repository id (e.g. `US-60507`). Single quotes in the id are doubled for OData string literals.
 *
 * Example:
 *   `AccelinsWBXJournalHeaders?$filter=accelins_repositoryid eq '{repo}'&$top=1`
 */
export function getLloydsFnoOdataRepoPathTemplate(env: NodeJS.ProcessEnv = process.env): string {
  return (env.LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE ?? '').trim();
}

export function isLloydsFnoOdataRepoProbeConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getLloydsFnoOdataRepoPathTemplate(env).includes('{repo}');
}

/** Substitute `{repo}`; escape `'` inside repo for OData filters that wrap the token in quotes. */
export function buildFnoOdataRelativePathForRepo(repoId: string, env: NodeJS.ProcessEnv = process.env): string {
  const t = getLloydsFnoOdataRepoPathTemplate(env);
  if (!t.includes('{repo}')) {
    throw new Error(
      'LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE must be set and contain the literal {repo} for per-repository F&O checks.',
    );
  }
  const safe = repoId.replace(/'/g, "''");
  return t.split('{repo}').join(safe);
}
