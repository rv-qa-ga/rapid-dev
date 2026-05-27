/**
 * Map an ADP **`FOWD__AGENCY_POLICY_FO_SUMMARY_V1`** row to the `financial_values` block
 * of `mule-xml-generation-success` (same shape `func-xml-totals` expects on the Service Bus payload).
 *
 * **Authoritative programme mapping** (field-level D365 ↔ MuleSoft + end-to-end cases): Confluence
 * [D365 + MuleSoft Integration Field Mappings](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings),
 * [ADP + D365 F&O (revised)](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3081535490/ADP-+D365+F+O+revised).
 * Repo-local mirror of the **Snowflake summary → message** slice: `docs/lloyds/SKILL.md` §3.
 * Commission: prefers `TOTAL_AGENCY_COMMISSION_AMOUNT` / `TOTAL_COMMISSION_AMOUNT` on the summary view,
 * with fallbacks for legacy column names.
 */

import {
  getSnowflakeCell,
  getSnowflakeCellFirst,
  LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS,
  LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS,
} from './snowflakeSummaryClient';

export type MuleFinancialValues = {
  adp_currency: string;
  adp_prm: number;
  adp_com: number;
  adp_coi: number;
  adp_tax: number;
  adp_oth: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function coerceNumber(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return 0;
}

function coerceCurrency(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  return s.length <= 3 ? s.toUpperCase() : s;
}

/**
 * Build `financial_values` from a Snowflake summary row (any key casing).
 */
export function adpSummaryRowToMuleFinancialValues(row: Record<string, unknown>): MuleFinancialValues {
  return {
    adp_currency: coerceCurrency(getSnowflakeCell(row, 'POLICY_CURRENCY_CODE')),
    adp_prm: round2(coerceNumber(getSnowflakeCell(row, 'TOTAL_PREMIUM_AMOUNT'))),
    adp_com: round2(coerceNumber(getSnowflakeCellFirst(row, LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS))),
    adp_coi: round2(coerceNumber(getSnowflakeCellFirst(row, LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS))),
    adp_tax: round2(coerceNumber(getSnowflakeCell(row, 'TOTAL_TAX_AMOUNT'))),
    adp_oth: round2(coerceNumber(getSnowflakeCell(row, 'TOTAL_OTHER_CONTRIBUTIONS_AMOUNT'))),
  };
}
