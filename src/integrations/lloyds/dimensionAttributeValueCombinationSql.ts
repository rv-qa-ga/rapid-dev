/**
 * Read-only checks against Fabric / warehouse `dbo.dimensionattributevaluecombination`
 * (Lloyd's FNO mirror — see TM Confluence QA access + `docs/lloyds/SKILL.md`).
 *
 * Match strategy (v1): **main account token** = first tilde segment of `OFFSETACCOUNTDISPLAYVALUE`
 * (trimmed). Compared case-insensitively to `mainaccountvalue` unless overridden by env.
 */

import { LloydsFnOFabricSqlClient } from './lloydsFnOFabricSqlClient';

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Bracket-quote a single SQL Server identifier segment (table/column). */
export function bracketIdent(name: string): string {
  const s = name.trim();
  if (!IDENT_RE.test(s)) {
    throw new Error(`Unsafe SQL identifier "${name}" — allowed pattern ${IDENT_RE}.`);
  }
  return `[${s.replace(/\]/g, ']]')}]`;
}

/**
 * First segment of OFFSET display (before `~`) is treated as the main-account display token
 * for existence checks against `dimensionattributevaluecombination`.
 */
export function extractOffsetMainAccountToken(offsetAccountDisplayValue: string): string | null {
  const s = offsetAccountDisplayValue.trim();
  if (!s) return null;
  const first = s.split('~')[0]?.trim();
  return first || null;
}

export function isLloydsFabricDimensionSqlReadEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.LLOYDS_FABRIC_DIMENSION_SQL_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function getMainAccountColumnName(env: NodeJS.ProcessEnv = process.env): string {
  const c = env.LLOYDS_FNOFABRIC_DAC_MAINACCOUNT_COLUMN?.trim() || 'mainaccountvalue';
  if (!IDENT_RE.test(c)) {
    throw new Error(`LLOYDS_FNOFABRIC_DAC_MAINACCOUNT_COLUMN must match ${IDENT_RE}; got "${c}"`);
  }
  return c;
}

export function getDimensionCombinationSchemaTable(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.LLOYDS_FNOFABRIC_DAC_TABLE?.trim() || 'dbo.dimensionattributevaluecombination';
  const parts = raw.split('.').map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(`LLOYDS_FNOFABRIC_DAC_TABLE must be schema.table (e.g. dbo.dimensionattributevaluecombination); got "${raw}"`);
  }
  return `${bracketIdent(parts[0]!)}.${bracketIdent(parts[1]!)}`;
}

/**
 * Returns row count for rows whose main-account column equals the token (case-insensitive).
 */
export async function countRowsByMainAccountToken(
  client: LloydsFnOFabricSqlClient,
  mainAccountToken: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const table = getDimensionCombinationSchemaTable(env);
  const col = bracketIdent(getMainAccountColumnName(env));
  const token = mainAccountToken.trim();
  if (!token) return 0;
  const sqlText = `
    SELECT COUNT_BIG(1) AS c
    FROM   ${table}
    WHERE  LOWER(CAST(${col} AS NVARCHAR(4000))) = LOWER(@tok)
  `;
  const rows = await client.queryManyWithNvarcharParams<{ c: string | number | bigint }>(sqlText, { tok: token }, env);
  const c = rows[0]?.c;
  if (typeof c === 'bigint') return Number(c);
  if (typeof c === 'number') return c;
  return parseInt(String(c ?? '0'), 10) || 0;
}
