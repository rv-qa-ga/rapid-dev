/**
 * Shared **read-only** Lloyd's cross-system snapshot builder (ADP → Mule Azure SQL → Blob → Dataverse → F&O OData → TDS).
 * Used by CLI reports and HTML cohort data-flow output.
 */

import { BlobServiceClient } from '@azure/storage-blob';
import { chromium } from '@playwright/test';

import { config } from '../../config/config';
import {
  connectFinOpsSnowflake,
  destroyConnection,
  loadFinOpsSnowflakeEnv,
} from '../../utils/fowd-agency-xml-compare';
import {
  fetchLatestSummaryRowsForRepo,
  fetchTagetikRowsForRepoRun,
  getSnowflakeCell,
} from './snowflakeSummaryClient';
import { DataverseMasterDataClient } from './dataverseMasterDataClient';
import { XmlFileRecordClient } from './xmlFileRecordClient';
import { fetchLatestProcessTrackerForRepo } from './muleProcessTrackerClient';
import { getBlobContainerConfig } from './blobContainerClient';
import { getDiscoveryCredential } from './credential';
import { fetchTagetikWrittenForDataLoaderAdpRows } from './lloydsTagetikTdsClient';
import { isLloydsTagetikTdsSqlConfigured } from './lloydsTagetikTdsEnv';
import { probeFnoOdata } from './lloydsFnOOdataClient';
import {
  buildFnoOdataRelativePathForRepo,
  isLloydsFnOOdataReadEnabled,
  isLloydsFnoOdataRepoProbeConfigured,
} from './lloydsFnOOdataEnv';

export type SnapshotSection<T> = { ok: true; data: T } | { ok: false; error: string };

function pick<T extends Record<string, unknown>>(row: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in row) out[k] = row[k as keyof T];
  }
  return out;
}

function blobNameFromAccelinsBlobId(blobId: string | null | undefined): string | null {
  if (!blobId?.trim()) return null;
  const t = blobId.trim();
  try {
    const u = new URL(t);
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return decodeURIComponent(parts.slice(1).join('/'));
    }
  } catch {
    /* not a full URL */
  }
  if (t.toLowerCase().includes('.xml')) {
    const last = t.split(/[/\\]/).pop();
    if (last) return decodeURIComponent(last);
  }
  return null;
}

export async function tryBlobProps(blobName: string): Promise<SnapshotSection<Record<string, unknown>>> {
  try {
    const { serviceUrl, containerName } = getBlobContainerConfig();
    const { credential } = getDiscoveryCredential();
    const service = new BlobServiceClient(serviceUrl, credential);
    const blob = service.getContainerClient(containerName).getBlobClient(blobName);
    const p = await blob.getProperties();
    return {
      ok: true,
      data: {
        container: containerName,
        blobName,
        contentLength: p.contentLength ?? null,
        contentType: p.contentType ?? null,
        lastModified: p.lastModified?.toISOString() ?? null,
        etag: p.etag ?? null,
      },
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

const SUMMARY_KEYS = [
  '_ACCEL_REPOSITORY_ID',
  '_ACCEL_UNIQUE_RUN_ID',
  '_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP',
  'POLICY_CURRENCY_CODE',
  'TOTAL_PREMIUM_AMOUNT',
  'TOTAL_AGENCY_COMMISSION_AMOUNT',
  'TOTAL_MEMBER_COMMISSION_AMOUNT',
  'TOTAL_COMMISSION_AMOUNT',
  'TOTAL_INSURER_COMMISSION_AMOUNT',
  'TOTAL_TAX_AMOUNT',
  'TOTAL_OTHER_CONTRIBUTIONS_AMOUNT',
];

/**
 * One repo: same shape as `lloyds-repo-cross-system-data-report` JSON.
 */
export async function buildLloydsRepoDataSnapshot(repo: string): Promise<Record<string, unknown>> {
  const report: Record<string, unknown> = {
    repositoryId: repo,
    environment: config.getEnvironment(),
    generatedAt: new Date().toISOString(),
  };

  let runId = '';

  try {
    loadFinOpsSnowflakeEnv();
    const conn = await connectFinOpsSnowflake();
    try {
      const summaryRows = await fetchLatestSummaryRowsForRepo(conn, repo, 1);
      if (!summaryRows.length) {
        report.adpSnowflake = { ok: false, error: `No summary rows for ${repo}` } as const;
      } else {
        const s = summaryRows[0] as Record<string, unknown>;
        runId = String(getSnowflakeCell(s, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
        report.adpSnowflake = { ok: true, data: pick(s, SUMMARY_KEYS) } as const;
      }

      if (runId) {
        try {
          const tagRows = await fetchTagetikRowsForRepoRun(conn, repo, runId, 25);
          report.snowflakeTagetikSlice = {
            ok: true,
            data: { rowCount: tagRows.length, sample: tagRows.slice(0, 10) },
          } as const;
        } catch (e) {
          report.snowflakeTagetikSlice = { ok: false, error: (e as Error).message } as const;
        }
      } else {
        report.snowflakeTagetikSlice = { ok: false, error: 'No run id from summary' } as const;
      }
    } finally {
      await destroyConnection(conn);
    }
  } catch (e) {
    report.adpSnowflake = { ok: false, error: (e as Error).message } as const;
    report.snowflakeTagetikSlice = { ok: false, error: 'Snowflake not available' } as const;
  }

  try {
    const row = await fetchLatestProcessTrackerForRepo(repo);
    if (row) {
      report.muleProcessTracker = { ok: true, data: row } as const;
    } else {
      report.muleProcessTracker = {
        ok: false,
        error: 'No PROCESS_TRACKER row (or SQL not configured / query returned empty).',
      } as const;
    }
  } catch (e) {
    report.muleProcessTracker = { ok: false, error: (e as Error).message } as const;
  }

  let blobNameHint: string | null = null;
  try {
    const master = DataverseMasterDataClient.create();
    const repoRec = await master.findRepositoryByCode(repo);
    if (!repoRec) {
      report.dataverseXmlFile = { ok: false, error: `Repository ${repo} not in accelins_repositoryfiles` } as const;
    } else {
      const dv = await XmlFileRecordClient.createStandalone();
      try {
        const xml = await dv.findLatestByRepositoryFileId(repoRec.id);
        if (!xml) {
          report.dataverseXmlFile = { ok: false, error: 'No accelins_workflows row' } as const;
        } else {
          blobNameHint = blobNameFromAccelinsBlobId(xml.blobId);
          report.dataverseXmlFile = {
            ok: true,
            data: {
              credentialSource: dv.getCredentialSource(),
              repositoryFileId: repoRec.id,
              workflowId: xml.workflowId,
              name: xml.name,
              correlationId: xml.correlationId,
              blobId: xml.blobId,
              inferredBlobName: blobNameHint,
              statuscode: xml.statuscode,
              statecode: xml.statecode,
              odsCurrency: xml.odsCurrency,
              odsPrm: xml.odsPrm,
              odsCom: xml.odsCom,
              odsCoi: xml.odsCoi,
              odsTax: xml.odsTax,
              odsOth: xml.odsOth,
              xmlCurrency: xml.xmlCurrency,
              xmlPrm: xml.xmlPrm,
              xmlCom: xml.xmlCom,
              xmlCoi: xml.xmlCoi,
              xmlTax: xml.xmlTax,
              xmlOth: xml.xmlOth,
              overallMatch: xml.overallMatch,
            },
          } as const;
        }
      } finally {
        await dv.dispose();
      }
    }
  } catch (e) {
    report.dataverseXmlFile = { ok: false, error: (e as Error).message } as const;
  }

  if (blobNameHint) {
    report.azureBlob = await tryBlobProps(blobNameHint);
  } else {
    report.azureBlob = {
      ok: false,
      error: 'No blob name inferred from Dataverse accelins_blob_id — cannot load blob metadata.',
    } as const;
  }

  if (isLloydsFnOOdataReadEnabled() && isLloydsFnoOdataRepoProbeConfigured()) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    try {
      const rel = buildFnoOdataRelativePathForRepo(repo);
      const probe = await probeFnoOdata(context.request, rel);
      report.dynamicsFnoOdata = {
        ok: true,
        data: { url: probe.url, status: probe.status, statusText: probe.statusText },
      } as const;
    } catch (e) {
      report.dynamicsFnoOdata = { ok: false, error: (e as Error).message } as const;
    } finally {
      await context.close();
      await browser.close();
    }
  } else {
    report.dynamicsFnoOdata = {
      ok: false,
      error:
        'F&O OData not enabled for repo probe (set LLOYDS_FNO_ODATA_ENABLED=1, LLOYDS_FNO_ODATA_BASE_URL, LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE with {repo}).',
    } as const;
  }

  if (isLloydsTagetikTdsSqlConfigured()) {
    try {
      const rows = await fetchTagetikWrittenForDataLoaderAdpRows(repo, runId || undefined, 25);
      report.tdsTagetikWritten = { ok: true, data: { rowCount: rows.length, rows: rows.slice(0, 15) } } as const;
    } catch (e) {
      report.tdsTagetikWritten = { ok: false, error: (e as Error).message } as const;
    }
  } else {
    report.tdsTagetikWritten = {
      ok: false,
      error: 'TDS SQL not configured (set SQL_LLOYDS_SERVER and related SQL_LLOYDS_* / reuse SPN).',
    } as const;
  }

  return report;
}
