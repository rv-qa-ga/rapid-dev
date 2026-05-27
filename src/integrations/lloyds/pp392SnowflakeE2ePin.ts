/**
 * PP-392 **Snowflake-aligned end-to-end** — pin **`accelins_correlation_id`** and **`file_name`**
 * to the same values used between Snowflake (`_ACCEL_UNIQUE_RUN_ID`) and Dataverse XML File rows.
 *
 * Set **both** env vars when running `@PP-392-E2E-SNOWFLAKE` scenarios; omit both to keep the
 * default sanity-counter (`0000-0000-0000-NNNNN`) behaviour.
 */

import { parseFileName, extractUniqueRunIdFromWbxOrWrxFileName } from './xmlFileName';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Pp392SnowflakeE2ePin {
  /** Normalised lowercase UUID (no braces). */
  correlationId: string;
  /** Exact blob / `file_name` as in `mulesoft-xml` and Dataverse. */
  fileName: string;
}

function normaliseUuid(raw: string): string {
  return raw.replace(/[{}]/g, '').trim().toLowerCase();
}

/**
 * When both `LLOYDS_PP392_E2E_CORRELATION_ID` and `LLOYDS_PP392_E2E_FILE_NAME` are set, returns the pin.
 * When neither is set, returns `null` (caller uses sanity counter).
 * When only one is set, throws — misconfiguration.
 */
export function readPp392SnowflakeE2ePinFromEnv(env: NodeJS.ProcessEnv = process.env): Pp392SnowflakeE2ePin | null {
  const cidRaw = env.LLOYDS_PP392_E2E_CORRELATION_ID?.trim();
  const fn = env.LLOYDS_PP392_E2E_FILE_NAME?.trim();
  if (!cidRaw && !fn) return null;
  if (!cidRaw || !fn) {
    throw new Error(
      'Lloyd\'s PP-392 Snowflake E2E: set **both** LLOYDS_PP392_E2E_CORRELATION_ID and LLOYDS_PP392_E2E_FILE_NAME, ' +
        'or omit both for default sanity-counter behaviour.',
    );
  }
  const correlationId = normaliseUuid(cidRaw);
  if (!UUID_RE.test(correlationId)) {
    throw new Error(
      `Lloyd's PP-392 Snowflake E2E: LLOYDS_PP392_E2E_CORRELATION_ID must be a UUID (Snowflake _ACCEL_UNIQUE_RUN_ID), got "${cidRaw}"`,
    );
  }
  if (!parseFileName(fn)) {
    throw new Error(
      `Lloyd's PP-392 Snowflake E2E: LLOYDS_PP392_E2E_FILE_NAME must parse as Lloyd's classic or WBX/WRX XML name, got "${fn}"`,
    );
  }
  const runInName = extractUniqueRunIdFromWbxOrWrxFileName(fn);
  if (runInName && runInName !== correlationId) {
    throw new Error(
      `Lloyd's PP-392 Snowflake E2E: file name run id "${runInName}" does not match LLOYDS_PP392_E2E_CORRELATION_ID "${correlationId}".`,
    );
  }
  return { correlationId, fileName: fn };
}
