import { randomUUID } from 'node:crypto';

/**
 * Lloyd's XML file-name helpers.
 *
 * **`mulesoft-xml` supports two shapes** (both accepted by `parseFileName`):
 *
 * 1. **Classic Mule** (space-separated):
 *      `<LEDGER> <REPO_ID> <YYYYMMDDHHMM>.xml`
 *    Example: `AEUM US-58338 202604091630.xml`
 *
 * 2. **WBX / WRX export** (underscore-separated — Snowflake run id in the name; **WRX** is the
 *    same shape as **WBX** in QA / Power Apps exports):
 *      `WBX_<REPO_ID>_<unique-run-id>_<YYYY-MM-DD> <HH-mm-ss.SSS>.xml`
 *    The middle segment is Snowflake **`_ACCEL_UNIQUE_RUN_ID`** (UUID from e.g. FDWD agency
 *    views); it becomes **Correlation ID** on the Dataverse XML File row. The trailing segment
 *    is a wall-clock timestamp. Example:
 *    `WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml`
 *
 * For **WBX** files, `parseFileName` returns **`ledger: 'AEUM'`** so Dataverse
 * `accelins_legalentity` lookup matches the Lloyd's agency branch (filename prefix `WBX` is
 * the blob/workbench convention; programme legal entity for these journals remains **AEUM**).
 * `stamp` is normalised to **`YYYYMMDDHHMM`** from the trailing timestamp (minute resolution).
 *
 * `<REPO_ID>` resolves to `accelins_repositoryfile`; classic `<LEDGER>` is 3–4 letters.
 */

/** Default blob container base URL for the Lloyd's dev environment (overridable). */
export const DEFAULT_LLOYDS_BLOB_CONTAINER_BASE_URL =
  'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/';

/** Parsed components of a Lloyd's XML file name. */
export interface ParsedXmlFileName {
  ledger: string;
  repoId: string;
  stamp: string;
}

const FILE_NAME_RE = /^(?<ledger>[A-Z]{3,4})\s(?<repoId>[A-Z]{2}-\d+)\s(?<stamp>\d{12})\.xml$/;

/** `WBX_` / `WRX_<repo>_<snowflake-uuid>_<date> <time>.xml` — UUID = `_ACCEL_UNIQUE_RUN_ID` from Snowflake / ADP. */
const WBX_FILE_NAME_RE =
  /^(?:WBX|WRX)_(?<repoId>[A-Z]{2}-\d+)_(?<runId>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2}) (?<h>\d{2})-(?<mi>\d{2})-(?<sec>\d{2}\.\d+)\.xml$/i;

const LLOYDS_AGENCY_LEDGER_FROM_WBX = 'AEUM';

function parseWbxFileName(fileName: string): ParsedXmlFileName | null {
  const m = fileName.match(WBX_FILE_NAME_RE);
  if (!m?.groups) return null;
  const { repoId, y, mo, d, h, mi } = m.groups;
  const stamp = `${y}${mo}${d}${h}${mi}`;
  if (stamp.length !== 12) return null;
  return {
    ledger: LLOYDS_AGENCY_LEDGER_FROM_WBX,
    repoId: repoId.toUpperCase(),
    stamp,
  };
}

/**
 * Parse a Lloyd's XML file name into its ledger / repoId / stamp components.
 *
 * Tries **classic** (`AEUM US-56464 202604171200.xml`) then **WBX / WRX** (`WBX_US-56464_<uuid>_…xml`).
 * Returns null on any shape mismatch rather than throwing, so callers can decide whether
 * a malformed name is fatal (CLI / test data) or just to be skipped (bulk scans).
 */
export function parseFileName(fileName: string): ParsedXmlFileName | null {
  const classic = fileName.match(FILE_NAME_RE);
  if (classic?.groups) {
    return {
      ledger: classic.groups.ledger,
      repoId: classic.groups.repoId,
      stamp: classic.groups.stamp,
    };
  }
  return parseWbxFileName(fileName);
}

/** Format a Date as `YYYYMMDDHHMM` in UTC (matches the pipeline convention). */
export function formatStamp(date: Date = new Date()): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const mo = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  const h = date.getUTCHours().toString().padStart(2, '0');
  const mi = date.getUTCMinutes().toString().padStart(2, '0');
  return `${y}${mo}${d}${h}${mi}`;
}

/** Build a canonical Lloyd's XML file name. `at` defaults to now (UTC). */
export function buildFileName(input: { ledger: string; repoId: string; at?: Date }): string {
  const { ledger, repoId, at } = input;
  if (!/^[A-Z]{3,4}$/.test(ledger)) {
    throw new Error(`Invalid ledger code (expected 3–4 upper-case letters): "${ledger}"`);
  }
  if (!/^[A-Z]{2}-\d+$/.test(repoId)) {
    throw new Error(`Invalid repoId (expected e.g. "CA-7740"): "${repoId}"`);
  }
  return `${ledger} ${repoId} ${formatStamp(at)}.xml`;
}

/**
 * Build a **WBX** blob / Service Bus `file_name` (`WBX_<REPO>_<run-uuid>_<date> <time>.xml`).
 * `runId` defaults to a new UUID (Snowflake `_ACCEL_UNIQUE_RUN_ID` shape in production).
 */
export function buildWbxFileName(input: { repoId: string; runId?: string; at?: Date }): string {
  const repo = input.repoId.trim().toUpperCase();
  if (!/^[A-Z]{2}-\d+$/.test(repo)) {
    throw new Error(`Invalid WBX repoId (expected e.g. "US-56464"): "${input.repoId}"`);
  }
  const runId = (input.runId ?? randomUUID()).toLowerCase();
  const d = input.at ?? new Date();
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const h = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const sec = String(d.getUTCSeconds()).padStart(2, '0');
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  return `WBX_${repo}_${runId}_${y}-${mo}-${day} ${h}-${mi}-${sec}.${ms}.xml`;
}

/**
 * Build a `blob_id` URL for the Service Bus payload.
 *
 * If `name` is already a full `https://.../<filename>.xml` URL, the container segment is
 * rewritten to match `containerBase` while preserving the file-name portion. This lets us
 * take a row from `docs/lloyds/XMLs/XML-URL.xlsx` (which may reference a historical
 * container) and retarget it at `mulesoft-xml` without losing the file-name.
 */
/**
 * Returns Snowflake **`_ACCEL_UNIQUE_RUN_ID`** (UUID) embedded in a **WBX/WRX** file name, or null
 * for classic names / non-matching shapes.
 */
export function extractUniqueRunIdFromWbxOrWrxFileName(fileName: string): string | null {
  const m = fileName.match(
    /^(?:WBX|WRX)_[A-Z]{2}-\d+_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_/i,
  );
  return m?.[1] ? m[1].toLowerCase() : null;
}

export function buildBlobId(name: string, containerBase: string = DEFAULT_LLOYDS_BLOB_CONTAINER_BASE_URL): string {
  const base = containerBase.endsWith('/') ? containerBase : `${containerBase}/`;
  try {
    const asUrl = new URL(name);
    const file = asUrl.pathname.split('/').filter(Boolean).pop() ?? '';
    if (!file) throw new Error(`Could not extract file-name from URL "${name}"`);
    return `${base}${decodeURIComponent(file)}`;
  } catch {
    return `${base}${name}`;
  }
}
