/**
 * Read-only checks on Snowflake **FOWT__TAGETIK_V1** rows and optional TDS loader rows
 * (field presence + optional magnitude compare to ADP summary when the same column exists on both sides).
 */

import {
  getSnowflakeCell,
  getSnowflakeCellFirst,
  LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS,
  LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS,
} from './snowflakeSummaryClient';
import { withinAbsMagnitude } from './lloydsAmountCompare';

export function pickCellCaseInsensitive(row: Record<string, unknown>, names: string[]): unknown {
  if (!row || typeof row !== 'object') return undefined;
  const map = new Map(Object.keys(row).map((k) => [k.toUpperCase(), row[k as keyof typeof row]]));
  for (const n of names) {
    const v = map.get(n.toUpperCase());
    if (v !== undefined) return v;
  }
  return undefined;
}

function coerceFiniteNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Prefer a row whose repo + run id match; else first row.
 */
export function pickTagetikRowForRun(
  rows: Record<string, unknown>[],
  repoUpper: string,
  runIdLower: string,
): Record<string, unknown> | null {
  if (!rows.length) return null;
  for (const r of rows) {
    const rid = String(pickCellCaseInsensitive(r, ['REPOSITORY_ID', 'repository_id']) ?? '')
      .trim()
      .toUpperCase();
    const uid = String(pickCellCaseInsensitive(r, ['_ACCEL_UNIQUE_RUN_ID', '_accel_unique_run_id']) ?? '')
      .trim()
      .toLowerCase();
    if (rid === repoUpper && uid === runIdLower) return r;
  }
  return rows[0] ?? null;
}

export type TagetikLineFieldReport = {
  debit: number | null;
  credit: number | null;
  currency: string;
};

export function readTagetikJournalLineFields(row: Record<string, unknown>): TagetikLineFieldReport {
  const debit = coerceFiniteNumber(pickCellCaseInsensitive(row, ['DEBIT_AMOUNT', 'DebitAmount', 'DEBIT']));
  const credit = coerceFiniteNumber(pickCellCaseInsensitive(row, ['CREDIT_AMOUNT', 'CreditAmount', 'CREDIT']));
  const curRaw = pickCellCaseInsensitive(row, ['CURRENCY_CODE', 'POLICY_CURRENCY_CODE', 'CURRENCY', 'CurrencyCode']);
  const currency = curRaw === null || curRaw === undefined ? '' : String(curRaw).trim().toUpperCase();
  return { debit, credit, currency };
}

/** Returns human-readable issues (empty = OK). */
export function validateTagetikJournalLineFieldsPresent(row: Record<string, unknown>): string[] {
  const { debit, credit } = readTagetikJournalLineFields(row);
  const errs: string[] = [];
  if (debit === null && credit === null) {
    errs.push('Tagetik row: expected numeric DEBIT_AMOUNT and/or CREDIT_AMOUNT (case-insensitive column names).');
  }
  return errs;
}

/**
 * When Tagetik row exposes the same measure as ADP summary (column name overlap), assert |·| within tolerance.
 * Pairs: [ADP summary column, candidate Tagetik column names].
 */
export function validateTagetikNumericOverlapWithAdpSummary(
  summary: Record<string, unknown>,
  tagRow: Record<string, unknown>,
  tolerance: number,
): string[] {
  const adpPrm = coerceFiniteNumber(getSnowflakeCell(summary, 'TOTAL_PREMIUM_AMOUNT'));
  const adpCom = coerceFiniteNumber(getSnowflakeCellFirst(summary, [...LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS]));
  const adpCoi = coerceFiniteNumber(getSnowflakeCellFirst(summary, [...LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS]));
  const adpTax = coerceFiniteNumber(getSnowflakeCell(summary, 'TOTAL_TAX_AMOUNT'));
  const adpOth = coerceFiniteNumber(getSnowflakeCell(summary, 'TOTAL_OTHER_CONTRIBUTIONS_AMOUNT'));

  const pairs: [number | null, string[]][] = [
    [adpPrm, ['TOTAL_PREMIUM_AMOUNT', 'TOTAL_PRM', 'PRM_AMOUNT', 'ADP_PRM']],
    [adpCom, ['TOTAL_MEMBER_COMMISSION_AMOUNT', 'TOTAL_AGENCY_COMMISSION_AMOUNT', 'COM_AMOUNT', 'ADP_COM']],
    [adpCoi, ['TOTAL_INSURER_COMMISSION_AMOUNT', 'TOTAL_COMMISSION_AMOUNT', 'COI_AMOUNT', 'ADP_COI']],
    [adpTax, ['TOTAL_TAX_AMOUNT', 'TAX_AMOUNT', 'ADP_TAX']],
    [adpOth, ['TOTAL_OTHER_CONTRIBUTIONS_AMOUNT', 'OTH_AMOUNT', 'ADP_OTH']],
  ];
  const errs: string[] = [];
  for (const [adp, tgNames] of pairs) {
    const tgRaw = pickCellCaseInsensitive(tagRow, tgNames);
    const tg = coerceFiniteNumber(tgRaw);
    if (adp === null || tg === null) continue;
    if (!withinAbsMagnitude(adp, tg, tolerance)) {
      errs.push(`ADP=${adp} vs Tagetik (${tgNames.join('|')})=${tg} outside ABS±${tolerance} on magnitudes`);
    }
  }
  return errs;
}
