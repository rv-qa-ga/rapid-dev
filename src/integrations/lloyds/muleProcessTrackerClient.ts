/**
 * Read-only peek at Mule's **`dbo.PROCESS_TRACKER`** (Azure SQL) per repository id.
 *
 * Used for Lloyd's **Stage 3+** readiness when merged SQL config targets the Mule DB
 * (`SQLSERVER_HOST` / `SQLSERVER_DEFAULT_DB`, or `AZURE_SQL_DB_DEV_SERVER` / `AZURE_SQL_DB_DEV_DATABASE`; see `config.ts`).
 */

import { SqlServerClient } from '../../sqlserver/client/SqlServerClient';
import { logger } from '../../utils/logger';

export type ProcessTrackerLatestRow = {
  PROCESS_ID: string;
  CURRENT_STAGE: string;
  PROCESS_STATUS: string;
  BLOB_STORAGE_PATH: string | null;
  WATERMARK: Date | null;
};

/**
 * Latest tracker row for a repo, or `null` if none / SQL not configured / query error.
 */
export async function fetchLatestProcessTrackerForRepo(repoId: string): Promise<ProcessTrackerLatestRow | null> {
  let client: SqlServerClient;
  try {
    client = new SqlServerClient();
  } catch (e) {
    logger.warn(`[process-tracker] SqlServerClient not available: ${(e as Error).message}`);
    return null;
  }
  try {
    const res = await client.queryMany<ProcessTrackerLatestRow>(
      `
        SELECT TOP 1 PROCESS_ID, CURRENT_STAGE, PROCESS_STATUS, BLOB_STORAGE_PATH, WATERMARK
        FROM   dbo.PROCESS_TRACKER
        WHERE  REPO_ID = @repoId
        ORDER  BY UPDATED DESC
      `,
      { repoId },
    );
    return res.recordset[0] ?? null;
  } catch (e) {
    logger.warn(`[process-tracker] query failed for ${repoId}: ${(e as Error).message}`);
    return null;
  } finally {
    await client.close();
  }
}
