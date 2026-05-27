/**
 * Load the curated sanity test-data rows from `docs/lloyds/XMLs/XML-URL.xlsx`.
 *
 * The spreadsheet is the single source of truth for which Lloyd's XMLs the Row-1 sanity
 * test is allowed to use. Each row yields:
 *   - `name`       — the Lloyd's file-name (e.g. "AEUM US-58338 202604091630.xml")
 *   - `blobId`     — container-corrected blob URL for the Service Bus payload
 *   - `localXmlPath` — absolute path to the local copy of the same file, for totals computation
 *   - `ledger`     — 3–4 letter ledger code parsed from `name` (programme agency branch: **AEUM**)
 *   - `repoId`     — Repository ID parsed from `name` (e.g. "CA-7740")
 *   - `originalUrl` — the raw URL from the spreadsheet (kept for traceability / diagnostics)
 *
 * The spreadsheet URLs may point at a historical container; the `blobId` returned here
 * is re-anchored against `DEFAULT_LLOYDS_BLOB_CONTAINER_BASE_URL` (or the override) so the
 * Service Bus message points at the container `func-xml-totals` is configured to read
 * from (default: `mulesoft-xml`).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

import { buildBlobId, parseFileName } from './xmlFileName';

/** Default spreadsheet location relative to repo root. */
export const DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH = 'docs/lloyds/XMLs/XML-URL.xlsx';
/** Default directory holding the local copy of every XML referenced by the spreadsheet. */
export const DEFAULT_SANITY_XML_DIR_REPO_RELATIVE_PATH = 'docs/lloyds/XMLs';

export interface SanityRow {
  /** 0-based index in the spreadsheet (useful for deterministic CLI selection). */
  index: number;
  name: string;
  blobId: string;
  localXmlPath: string;
  ledger: string;
  repoId: string;
  stamp: string;
  originalUrl: string;
}

export interface LoadOptions {
  /** Absolute path to the xlsx (defaults to `<cwd>/docs/lloyds/XMLs/XML-URL.xlsx`). */
  xlsxPath?: string;
  /** Absolute path to the directory with local XMLs (defaults to same folder as xlsx). */
  xmlDir?: string;
  /**
   * Override the container base URL in the returned `blobId`.
   * Default: **undefined** — the spreadsheet's `URL` column is passed through verbatim.
   * Set this (or env `LLOYDS_BLOB_CONTAINER_BASE_URL`) only when you need to point
   * `func-xml-totals` at a *different* container than the one the curator chose in
   * the spreadsheet. Getting this wrong = `func-xml-totals` rejects the message with
   * "Blob not found" and dead-letters it.
   */
  containerBaseUrl?: string;
  /**
   * If true, throw when a row references a file that doesn't exist on disk.
   * Default: false — the loader returns all rows including ones with missing local XMLs,
   * and the caller (CLI / step-def) is expected to validate the specific row it picks via
   * `ensureLocalXmlExists`. This lets a single missing XML not block running other rows.
   */
  requireLocalFile?: boolean;
}

/** Load all rows. Throws on malformed names or (optionally) missing local XMLs. */
export async function loadSanityRows(opts: LoadOptions = {}): Promise<SanityRow[]> {
  const xlsxPath = opts.xlsxPath ?? path.resolve(process.cwd(), DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH);
  const xmlDir = opts.xmlDir ?? path.dirname(xlsxPath);
  const containerBaseUrl = opts.containerBaseUrl;  // undefined = pass URL through verbatim
  const requireLocalFile = opts.requireLocalFile ?? false;

  if (!fs.existsSync(xlsxPath)) {
    throw new Error(`Sanity spreadsheet not found: ${xlsxPath}`);
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);

  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`Sanity spreadsheet ${xlsxPath} has no worksheets`);

  const headerMap = readHeaderIndexMap(ws);
  const nameCol = pickColumn(headerMap, ['Name', 'FileName', 'File Name']);
  const urlCol = pickColumn(headerMap, ['URL', 'Url', 'BlobUrl', 'Blob Url']);
  if (!nameCol) throw new Error(`Sanity spreadsheet is missing a "Name" column. Headers: ${JSON.stringify(headerMap)}`);
  if (!urlCol) throw new Error(`Sanity spreadsheet is missing a "URL" column. Headers: ${JSON.stringify(headerMap)}`);

  const out: SanityRow[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = cellText(row.getCell(nameCol).value);
    const url = cellText(row.getCell(urlCol).value);
    if (!name && !url) continue;
    if (!name || !url) {
      throw new Error(`Row ${r} in ${xlsxPath} is missing Name or URL (Name="${name}", URL="${url}")`);
    }

    const parsed = parseFileName(name);
    if (!parsed) {
      throw new Error(
        `Row ${r}: file name "${name}" does not match Lloyd's classic <LEDGER> <REPO_ID> <YYYYMMDDHHMM>.xml or WBX_<REPO_ID>_<uuid>_…xml`,
      );
    }

    const localXmlPath = path.resolve(xmlDir, name);
    if (requireLocalFile && !fs.existsSync(localXmlPath)) {
      throw new Error(
        `Row ${r}: local XML not found at ${localXmlPath}. Either upload it to ${xmlDir} or set requireLocalFile=false.`,
      );
    }

    out.push({
      index: out.length,
      name,
      // Default: use the spreadsheet URL verbatim (the curator knows which container the
      // blob actually lives in). Only rewrite if the caller explicitly supplies an override.
      blobId: containerBaseUrl ? buildBlobId(name, containerBaseUrl) : url,
      localXmlPath,
      ledger: parsed.ledger,
      repoId: parsed.repoId,
      stamp: parsed.stamp,
      originalUrl: url,
    });
  }

  if (out.length === 0) {
    throw new Error(`Sanity spreadsheet ${xlsxPath} has no data rows`);
  }
  return out;
}

/**
 * Validate that the local XML for this row exists on disk. Throws with a helpful message
 * if not — use this right after `pickRow` in the CLI / step-def.
 */
export function ensureLocalXmlExists(row: SanityRow): void {
  if (!fs.existsSync(row.localXmlPath)) {
    throw new Error(
      `Local XML not found for row [${row.index}] "${row.name}" at ${row.localXmlPath}. `
        + `Either place the file there or pick a different --row-index / --row-name.`,
    );
  }
}

/** Pick one row by zero-based index or by file name (case-insensitive). */
export function pickRow(rows: SanityRow[], selector: { index?: number; name?: string }): SanityRow {
  if (selector.name) {
    const needle = selector.name.trim().toLowerCase();
    const hit = rows.find((r) => r.name.toLowerCase() === needle);
    if (!hit) {
      throw new Error(
        `No sanity row matches name "${selector.name}". Available: ${rows.map((r) => r.name).join(', ')}`,
      );
    }
    return hit;
  }
  const idx = selector.index ?? 0;
  if (idx < 0 || idx >= rows.length) {
    throw new Error(`Sanity row index ${idx} out of range [0, ${rows.length - 1}]`);
  }
  return rows[idx];
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function readHeaderIndexMap(ws: ExcelJS.Worksheet): Record<string, number> {
  const map: Record<string, number> = {};
  const hdr = ws.getRow(1);
  hdr.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellText(cell.value).trim();
    if (text) map[text] = colNumber;
  });
  return map;
}

function pickColumn(headerMap: Record<string, number>, candidates: string[]): number | null {
  for (const c of candidates) {
    if (headerMap[c] !== undefined) return headerMap[c];
  }
  return null;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const v = value as {
    text?: string;
    hyperlink?: string;
    result?: unknown;
    richText?: Array<{ text?: string }>;
  };
  if (typeof v.text === 'string') return v.text;
  if (typeof v.hyperlink === 'string') return v.hyperlink;
  if (Array.isArray(v.richText)) return v.richText.map((rt) => rt.text ?? '').join('');
  if (v.result !== undefined && v.result !== null) return String(v.result);
  return '';
}
