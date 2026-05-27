/**
 * Compute ADP financial totals from a Lloyd's journal XML.
 *
 * The Lloyd's ADP → MuleSoft → D365 pipeline generates one XML per Repository ID. Each
 * `<LEDGERJOURNALENTITY>` element represents a single journal line. The `<TEXT>` element
 * is a pipe-delimited string whose 3rd segment identifies the line category:
 *
 *   "<repo> | <txType> | <category> | <lob> | <d1> | <d2>[ | <vendor>]"
 *
 * Where `<category>` is one of `PRM` (Premium), `COM` (Commission), `COI` (Insurer
 * Contribution / counter-payment), `TAX`, or `OTH`.
 *
 * For each line we compute `DEBITAMOUNT − CREDITAMOUNT` (debits positive, credits negative)
 * and accumulate per category. Currency is taken from the first `<CURRENCYCODE>` encountered.
 *
 * The resulting structure matches the `financial_values` block of the `mule-xml-generation-success`
 * Service Bus payload (see scripts/lloyds/send-mule-xml-generation-test-message.ts) and the
 * `accelins_ods_total_*` fields on the `accelins_workflow` Dataverse record (Power Apps XML File workflow) that the
 * `func-xml-totals` Azure Function creates/updates.
 */

import * as fs from 'fs';

/** Categories recognised in the TEXT pipe segment. */
export type AdpCategory = 'PRM' | 'COM' | 'COI' | 'TAX' | 'OTH';

/** Canonical ADP totals, shaped for the Service Bus payload and Dataverse workflow (`accelins_ods_*`) fields. */
export interface AdpTotals {
  /** Single currency per file. ISO code from first `<CURRENCYCODE>` (e.g. "USD", "CAD"). */
  currency: string;
  /** Premium total → `accelins_ods_total_premium_amount`. */
  prm: number;
  /** Commission total — usually negative → `accelins_ods_total_agency_commission_amount`. */
  com: number;
  /** Insurer contribution total → `accelins_ods_total_commission_amount`. */
  coi: number;
  /** Tax total → `accelins_ods_total_tax_amount`. */
  tax: number;
  /** Other contributions total → `accelins_ods_total_other_contributions_amount`. */
  oth: number;
  /** Number of `<LEDGERJOURNALENTITY>` lines scanned. */
  lineCount: number;
  /** Lines whose TEXT category didn't match any of the known values — for diagnostics. */
  skippedLines: number;
}

/** Shape the totals into the Service Bus `financial_values` block. */
export function totalsToServiceBusPayload(t: AdpTotals): {
  adp_currency: string;
  adp_prm: number;
  adp_com: number;
  adp_coi: number;
  adp_tax: number;
  adp_oth: number;
} {
  return {
    adp_currency: t.currency,
    adp_prm: round2(t.prm),
    adp_com: round2(t.com),
    adp_coi: round2(t.coi),
    adp_tax: round2(t.tax),
    adp_oth: round2(t.oth),
  };
}

/** Compute ADP totals from an XML string. Safe — never throws for unknown categories. */
export function computeAdpTotalsFromXml(xml: string): AdpTotals {
  const totals: AdpTotals = { currency: '', prm: 0, com: 0, coi: 0, tax: 0, oth: 0, lineCount: 0, skippedLines: 0 };

  // Iterate each <LEDGERJOURNALENTITY>…</LEDGERJOURNALENTITY> block (element form).
  const blockRe = /<LEDGERJOURNALENTITY\b[^>]*>([\s\S]*?)<\/LEDGERJOURNALENTITY>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    processBlock(m[1], totals);
  }

  // Some XMLs use the self-closing attribute form (see docs/lloyds/US-51304_…xml). Handle both.
  const selfClosingRe = /<LEDGERJOURNALENTITY\b([^>]*)\/>/g;
  while ((m = selfClosingRe.exec(xml)) !== null) {
    processAttributeForm(m[1], totals);
  }

  return totals;
}

/** Convenience: read the XML file from disk and compute totals. */
export function computeAdpTotalsFromFile(xmlPath: string): AdpTotals {
  const xml = fs.readFileSync(xmlPath, 'utf-8');
  return computeAdpTotalsFromXml(xml);
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function processBlock(inner: string, totals: AdpTotals): void {
  const text = getChildElement(inner, 'TEXT');
  const debit = toNumber(getChildElement(inner, 'DEBITAMOUNT'));
  const credit = toNumber(getChildElement(inner, 'CREDITAMOUNT'));
  const currency = getChildElement(inner, 'CURRENCYCODE');
  applyLine(totals, text, debit, credit, currency);
}

function processAttributeForm(attrs: string, totals: AdpTotals): void {
  const text = getAttribute(attrs, 'TEXT');
  const debit = toNumber(getAttribute(attrs, 'DEBITAMOUNT'));
  const credit = toNumber(getAttribute(attrs, 'CREDITAMOUNT'));
  const currency = getAttribute(attrs, 'CURRENCYCODE');
  applyLine(totals, text, debit, credit, currency);
}

function applyLine(totals: AdpTotals, text: string, debit: number, credit: number, currency: string): void {
  totals.lineCount += 1;
  if (!totals.currency && currency) totals.currency = currency;

  const category = extractCategory(text);
  const delta = debit - credit;
  switch (category) {
    case 'PRM': totals.prm += delta; break;
    case 'COM': totals.com += delta; break;
    case 'COI': totals.coi += delta; break;
    case 'TAX': totals.tax += delta; break;
    case 'OTH': totals.oth += delta; break;
    default: totals.skippedLines += 1;
  }
}

/** Extract category token from the 3rd pipe segment of a TEXT value. */
export function extractCategory(text: string): AdpCategory | null {
  if (!text) return null;
  const parts = text.split('|').map((p) => p.trim());
  const cat = parts[2]?.toUpperCase();
  if (cat === 'PRM' || cat === 'COM' || cat === 'COI' || cat === 'TAX' || cat === 'OTH') {
    return cat;
  }
  return null;
}

function getChildElement(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = xml.match(re);
  return match ? decodeEntities(match[1]).trim() : '';
}

function getAttribute(attrs: string, name: string): string {
  const re = new RegExp(`\\b${name}="([^"]*)"`, 'i');
  const match = attrs.match(re);
  return match ? decodeEntities(match[1]) : '';
}

function toNumber(v: string): number {
  if (!v) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
