/**
 * Normalize Snowflake and XML values for equality checks.
 */

export function normalizeDisplay(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return String(value).trim();
}

/**
 * Lenient equality: trim, numeric coercion, date prefix (YYYY-MM-DD) when both look like datetimes.
 */
export function valuesEqual(a: string, b: string): boolean {
  if (a === b) return true;
  const t1 = a.trim();
  const t2 = b.trim();
  if (t1 === '' && t2 === '') return true;

  const d1 = t1.slice(0, 10);
  const d2 = t2.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d1) && d1 === d2 && (t1.length > 10 || t2.length > 10)) {
    return true;
  }

  const n1 = Number(t1);
  const n2 = Number(t2);
  if (t1 !== '' && t2 !== '' && !Number.isNaN(n1) && !Number.isNaN(n2)) {
    if (n1 === n2) return true;
    // Programme: journal / ADP vs XML may use opposite sign for the same economic amount.
    if (Math.abs(Math.abs(n1) - Math.abs(n2)) < 1e-9) return true;
  }

  return false;
}

/**
 * Programme nuance: `FOWD__AGENCY_POLICY_FO_V1.EXCHANGE_RATE` is often `0` in Snowflake while the
 * Mule-generated journal XML may **omit** `EXCHANGERATE` (empty). Treat empty and numeric zero as
 * equivalent for this pair only — other columns still use {@link valuesEqual}.
 */
export function fowdMappingPairValuesEqual(
  snowflakeColumn: string,
  xmlAttribute: string,
  s: string,
  x: string,
): boolean {
  if (valuesEqual(s, x)) return true;
  const sc = snowflakeColumn.toUpperCase();
  const xa = xmlAttribute.toUpperCase();
  if (sc !== 'EXCHANGE_RATE' || xa !== 'EXCHANGERATE') return false;
  const emptyOrZero = (t: string) => {
    const v = t.trim();
    if (v === '') return true;
    const n = Number(v);
    return !Number.isNaN(n) && n === 0;
  };
  return emptyOrZero(s) && emptyOrZero(x);
}
