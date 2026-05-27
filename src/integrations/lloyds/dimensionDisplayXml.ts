/**
 * Lloyd's journal XML — financial dimension display tokens on each ledger line.
 *
 * QA reference: PP-392-UI-008 / Fabric `dbo.dimensionattributevaluecombination`
 * (OFFSETACCOUNTDISPLAYVALUE vs DEFAULTDIMENSIONDISPLAYVALUE vs OFFSETDEFAULTDIMENSIONDISPLAYVALUE).
 */

import * as fs from 'fs';

/** One `<LEDGERJOURNALENTITY>` row's three display strings (trimmed, may be empty). */
export interface LedgerDimensionDisplayRow {
  offsetAccountDisplayValue: string;
  defaultDimensionDisplayValue: string;
  offsetDefaultDimensionDisplayValue: string;
}

function readInnerTag(inner: string, tag: string): string {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const m = inner.match(re);
  return (m?.[1] ?? '').trim();
}

function readSelfClosingAttr(inner: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}\\b([^>]*)/>`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    const attrs = m[1];
    const am = attrs.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
    if (am) return (am[1] ?? '').trim();
  }
  return '';
}

/**
 * Extract OFFSET/DEFAULT/OFFSET-DEFAULT display values for every element-style ledger line.
 */
export function extractLedgerDimensionDisplayRowsFromXml(xml: string): LedgerDimensionDisplayRow[] {
  const rows: LedgerDimensionDisplayRow[] = [];
  const blockRe = /<LEDGERJOURNALENTITY\b[^>]*>([\s\S]*?)<\/LEDGERJOURNALENTITY>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const inner = m[1];
    rows.push({
      offsetAccountDisplayValue: readInnerTag(inner, 'OFFSETACCOUNTDISPLAYVALUE'),
      defaultDimensionDisplayValue: readInnerTag(inner, 'DEFAULTDIMENSIONDISPLAYVALUE'),
      offsetDefaultDimensionDisplayValue: readInnerTag(inner, 'OFFSETDEFAULTDIMENSIONDISPLAYVALUE'),
    });
  }
  return rows;
}

export function extractLedgerDimensionDisplayRowsFromFile(xmlPath: string): LedgerDimensionDisplayRow[] {
  const xml = fs.readFileSync(xmlPath, 'utf-8');
  const fromBlocks = extractLedgerDimensionDisplayRowsFromXml(xml);
  if (fromBlocks.length > 0) return fromBlocks;

  // Self-closing attribute form (no inner tags): best-effort — dimension display often absent there.
  const selfClosingRe = /<LEDGERJOURNALENTITY\b([^>]*)\/>/gi;
  const attrRows: LedgerDimensionDisplayRow[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = selfClosingRe.exec(xml)) !== null) {
    const attrs = sm[1];
    attrRows.push({
      offsetAccountDisplayValue: readAttr(attrs, 'OFFSETACCOUNTDISPLAYVALUE'),
      defaultDimensionDisplayValue: readAttr(attrs, 'DEFAULTDIMENSIONDISPLAYVALUE'),
      offsetDefaultDimensionDisplayValue: readAttr(attrs, 'OFFSETDEFAULTDIMENSIONDISPLAYVALUE'),
    });
  }
  return attrRows;
}

function readAttr(attrs: string, name: string): string {
  const am = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return (am?.[1] ?? '').trim();
}

/**
 * Rules derived from QA doc + committed samples under `docs/lloyds/XMLs/`:
 * - OFFSETACCOUNTDISPLAYVALUE: first `~`-segment is the main account token; when multi-segment, LOB follows.
 * - DEFAULTDIMENSIONDISPLAYVALUE: when non-empty, starts with `LOB-` in programme data.
 * - OFFSETDEFAULTDIMENSIONDISPLAYVALUE: empty, or `DEFAULTDIMENSIONDISPLAYVALUE:` prefix, or same LOB-leading pattern as default.
 */
export function assertLedgerDimensionDisplayRows(rows: LedgerDimensionDisplayRow[]): void {
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const o = r.offsetAccountDisplayValue;
    const d = r.defaultDimensionDisplayValue;
    const od = r.offsetDefaultDimensionDisplayValue;

    if (o) {
      if (o.includes('~')) {
        const parts = o.split('~');
        if (parts.length < 2) {
          errors.push(`Row ${i}: OFFSETACCOUNTDISPLAYVALUE with tildes should have multiple segments (got "${o}")`);
        }
      }
    }
    if (d && !d.startsWith('LOB-')) {
      errors.push(`Row ${i}: DEFAULTDIMENSIONDISPLAYVALUE should start with LOB- when non-empty (got "${d}")`);
    }
    if (od) {
      const ok =
        od.startsWith('DEFAULTDIMENSIONDISPLAYVALUE:')
        || od.startsWith('LOB-')
        || /^[\dA-Za-z]+~/.test(od);
      if (!ok) {
        errors.push(
          `Row ${i}: OFFSETDEFAULTDIMENSIONDISPLAYVALUE unexpected shape (got "${od.slice(0, 80)}…")`,
        );
      }
    }
  });
  if (errors.length > 0) {
    throw new Error(`Dimension display validation failed:\n  - ${errors.join('\n  - ')}`);
  }
}
