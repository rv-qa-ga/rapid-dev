/**
 * Read / bump the committed correlation-ID counter for Lloyd's Row-1 **automation** runs.
 *
 * **Not the same as programme production:** XML File rows created by the normal Mule / ADP
 * pipeline use **`_ACCEL_UNIQUE_RUN_ID`** from **Snowflake** (UUID in the WBX/WRX file name’s
 * second segment). That value is what you reconcile in `FINANCIAL_OPERATIONS…FDWD__AGENCY_*`
 * and what appears as **Correlation ID** in Power Apps for those files.
 *
 * This module’s **`0000-0000-0000-NNNNN`** format is only for **Cucumber / SB test messages**
 * (`mule-xml-generation-success`, etc.) so runs stay deterministic and traceable in isolation.
 *
 * Format: `0000-0000-0000-NNNNN` where NNNNN is a 5-digit zero-padded integer.
 * Range 03000–99999 (avoids 00000–02999 reserved for manual tests). `03000` is the seed
 * value and is never sent — the first automated send uses `03001`.
 *
 * The counter lives at `src/features/lloyds/test-data/sanity-counter.json` and is committed
 * to git so the whole team sees the same starting point. Concurrency is not guarded — two
 * simultaneous runs will both pick the same number. Acceptable for a dev-only sanity test.
 */

import * as fs from 'fs';
import * as path from 'path';

export const COUNTER_FILE_REPO_RELATIVE_PATH = 'src/features/lloyds/test-data/sanity-counter.json';
export const CORRELATION_ID_PREFIX = '0000-0000-0000-';
export const SEED_COUNTER = 3000;
export const MAX_COUNTER = 99999;

/** Matches committed sanity correlation ids `0000-0000-0000-NNNNN` (five-digit decimal suffix). */
const SANITY_CORRELATION_LITERAL_RE = /^0000-0000-0000-(\d{5})$/;

/**
 * Dataverse / upstream sometimes persist the sanity counter as a **canonical GUID** whose last
 * segment is the **hex** encoding of the decimal counter (e.g. `0000-0000-0000-03034` →
 * `00000000-0000-0000-0000-000000000bda`). Web API `$filter` on `Uniqueidentifier` columns may
 * only match the canonical form — use this in addition to the literal string when polling
 * `accelins_workflows`.
 */
export function dataverseCanonicalGuidForSanityCorrelationId(correlationId: string): string | null {
  const m = correlationId.trim().match(SANITY_CORRELATION_LITERAL_RE);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 0 || n > MAX_COUNTER) return null;
  const last12 = n.toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${last12}`;
}

export interface SanityCounterFile {
  _comment?: string;
  lastCorrelationId: string;
  lastRunAt: string | null;
  lastXmlName: string | null;
  lastRow: number | null;
}

/** Resolve the absolute path of the counter file. */
export function resolveCounterPath(): string {
  return path.resolve(process.cwd(), COUNTER_FILE_REPO_RELATIVE_PATH);
}

/** Parse the 5-digit numeric suffix out of a `0000-0000-0000-NNNNN` id. */
export function extractCounter(correlationId: string): number {
  const m = correlationId.match(/-(\d{5})$/);
  if (!m) throw new Error(`Correlation id "${correlationId}" does not match format 0000-0000-0000-NNNNN`);
  return Number(m[1]);
}

/** Build a correlation id string from a numeric counter. */
export function formatCorrelationId(counter: number): string {
  if (!Number.isInteger(counter) || counter < 0 || counter > MAX_COUNTER) {
    throw new Error(`Counter ${counter} out of range [0, ${MAX_COUNTER}]`);
  }
  return `${CORRELATION_ID_PREFIX}${counter.toString().padStart(5, '0')}`;
}

/** Read the counter file. Returns the seed record if the file doesn't exist. */
export function readCounter(filePath: string = resolveCounterPath()): SanityCounterFile {
  if (!fs.existsSync(filePath)) {
    return {
      lastCorrelationId: formatCorrelationId(SEED_COUNTER),
      lastRunAt: null,
      lastXmlName: null,
      lastRow: null,
    };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as SanityCounterFile;
  if (!parsed.lastCorrelationId) {
    throw new Error(`Counter file ${filePath} is missing 'lastCorrelationId'`);
  }
  return parsed;
}

/** Compute the next correlation id without writing to disk. */
export function peekNextCorrelationId(filePath: string = resolveCounterPath()): string {
  const current = readCounter(filePath);
  const next = extractCounter(current.lastCorrelationId) + 1;
  if (next > MAX_COUNTER) {
    throw new Error(
      `Counter exhausted at ${current.lastCorrelationId}. Extend MAX_COUNTER or rotate the range.`,
    );
  }
  return formatCorrelationId(next);
}

/**
 * Bump the counter and persist to disk. Returns the new correlation id.
 *
 * Writes atomically via a tmp-file + rename so a mid-write crash never leaves a partial file.
 */
export function bumpCounter(input: {
  xmlName?: string;
  row?: number;
  filePath?: string;
  now?: Date;
}): { correlationId: string; filePath: string } {
  const filePath = input.filePath ?? resolveCounterPath();
  const current = readCounter(filePath);
  const nextNum = extractCounter(current.lastCorrelationId) + 1;
  if (nextNum > MAX_COUNTER) {
    throw new Error(
      `Counter exhausted at ${current.lastCorrelationId}. Extend MAX_COUNTER or rotate the range.`,
    );
  }
  const nextId = formatCorrelationId(nextNum);

  const updated: SanityCounterFile = {
    _comment: current._comment,
    lastCorrelationId: nextId,
    lastRunAt: (input.now ?? new Date()).toISOString(),
    lastXmlName: input.xmlName ?? null,
    lastRow: input.row ?? null,
  };

  const tmp = `${filePath}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, `${JSON.stringify(updated, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmp, filePath);
  return { correlationId: nextId, filePath };
}
