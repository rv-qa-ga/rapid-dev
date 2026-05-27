/**
 * Lloyd's cross-system **amount** comparison helpers.
 *
 * Programme rule: for monetary totals, **magnitude** (absolute value) must align across
 * ADP, Dataverse, and journal XML — the **sign** may differ by convention (e.g. ADP=20512.8 vs XML=-20512.8).
 * Tolerance (ABS ±5 by default in Cucumber) applies to **|a|−|b|**.
 */

const EPS = 1e-9;

export function withinAbsMagnitude(a: number | null, b: number | null, tol: number): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(Math.abs(a) - Math.abs(b)) <= tol + EPS;
}

/** True if values match within `tol` on the number line (sign-sensitive). */
export function withinAbs(a: number | null, b: number | null, tol: number): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) <= tol + EPS;
}

export const LLOYDS_DEFAULT_TOTAL_TOLERANCE = 5;

export type AmountAxisLabel = 'PRM' | 'COM' | 'COI' | 'TAX' | 'OTH';

export type FieldFlowStatus = {
  field: AmountAxisLabel;
  adp: number | null;
  ods: number | null;
  /** Dataverse "XML" (parsed) column */
  xml: number | null;
  tds: number | null;
  tdsSource?: string;
  adpVsXmlMagOk: boolean;
  adpVsOdsMagOk: boolean;
  odsVsXmlMagOk: boolean;
  adpVsTdsMagOk: boolean | 'na';
  tolerance: number;
};

function nz(n: number | null | undefined): number | null {
  if (n === null || n === undefined) return null;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  return null;
}

/**
 * Build per-field R/Y/G flags for a single-repo snapshot (Dataverse ods vs xml; ADP from Snowflake pick).
 */
export function buildAmountFieldFlow(
  adp: Record<string, unknown> | null | undefined,
  odsPrm: number | null,
  odsCom: number | null,
  odsCoi: number | null,
  odsTax: number | null,
  odsOth: number | null,
  xmlPrm: number | null,
  xmlCom: number | null,
  xmlCoi: number | null,
  xmlTax: number | null,
  xmlOth: number | null,
  tdsByField: { prm?: number; com?: number; coi?: number; tax?: number; oth?: number } | null,
  tol: number
): FieldFlowStatus[] {
  const getAdp = (keys: string[]): number | null => {
    if (!adp) return null;
    for (const k of keys) {
      const v = adp[k];
      if (v === null || v === undefined) continue;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };

  const prm = getAdp(['TOTAL_PREMIUM_AMOUNT']);
  const com = getAdp(['TOTAL_MEMBER_COMMISSION_AMOUNT', 'TOTAL_AGENCY_COMMISSION_AMOUNT']);
  const coi = getAdp(['TOTAL_INSURER_COMMISSION_AMOUNT', 'TOTAL_COMMISSION_AMOUNT']);
  const tax = getAdp(['TOTAL_TAX_AMOUNT']);
  const oth = getAdp(['TOTAL_OTHER_CONTRIBUTIONS_AMOUNT']);

  const rows: Array<{
    field: AmountAxisLabel;
    ad: number | null;
    o: number | null;
    x: number | null;
    td: number | null;
  }> = [
    { field: 'PRM', ad: prm, o: nz(odsPrm), x: nz(xmlPrm), td: tdsByField?.prm ?? null },
    { field: 'COM', ad: com, o: nz(odsCom), x: nz(xmlCom), td: tdsByField?.com ?? null },
    { field: 'COI', ad: coi, o: nz(odsCoi), x: nz(xmlCoi), td: tdsByField?.coi ?? null },
    { field: 'TAX', ad: tax, o: nz(odsTax), x: nz(xmlTax), td: tdsByField?.tax ?? null },
    { field: 'OTH', ad: oth, o: nz(odsOth), x: nz(xmlOth), td: tdsByField?.oth ?? null },
  ];

  return rows.map(({ field, ad, o, x, td }) => {
    const adpVsXmlMagOk = withinAbsMagnitude(ad, x, tol);
    const adpVsOdsMagOk = withinAbsMagnitude(ad, o, tol);
    const odsVsXmlMagOk = withinAbsMagnitude(o, x, tol);
    let adpVsTdsMagOk: boolean | 'na' = 'na';
    if (td !== null && ad !== null) {
      adpVsTdsMagOk = withinAbsMagnitude(ad, td, tol);
    }
    return {
      field,
      adp: ad,
      ods: o,
      xml: x,
      tds: td,
      tdsSource: tdsByField ? 'TDS (aggregated or first row)' : undefined,
      adpVsXmlMagOk,
      adpVsOdsMagOk,
      odsVsXmlMagOk,
      adpVsTdsMagOk,
      tolerance: tol,
    };
  });
}
