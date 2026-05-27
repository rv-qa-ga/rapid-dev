/**
 * Lloyd's Row-1 sanity planner — the brain that decides which XMLs are runnable today.
 *
 * Strategy (blob-first, Dataverse-filter; see docs/lloyds/SKILL.md §17):
 *   Programme context: **seventeen** repos in **`LLOYDS_PROGRAMME_REPOSITORY_IDS`** / **`LLOYDS_CLONED_REPOSITORY_IDS`**
 *   (same list — **2026-05-06** reload).
 *   1. List every `*.xml` in the `mulesoft-xml` blob container.
 *   2. Parse each file name via `parseFileName` (ledger + repoId + stamp).
 *   3. Pull every `accelins_legalentity` and `accelins_repositoryfile` master record
 *      from Dataverse and index them by code.
 *   4. For each blob file:
 *        - if the name doesn't match either supported convention → blocked
 *        - if the ledger isn't in master             → blocked
 *        - if the repo isn't in master               → blocked
 *        - if the repo isn't in the cloned cohort (`LLOYDS_CLONED_REPOSITORY_IDS`) → blocked
 *          (repo may still have blob + ADP data before Dynamics clone completes)
 *        - else                                       → runnable
 *   5. Persist everything in a single JSON snapshot under
 *      `src/features/lloyds/test-data/sanity-plan.json`.
 *
 * The snapshot becomes the source of truth for the send CLI and the Cucumber feature
 * — they do NOT repeat the live queries on every run. Refresh with
 * `npm run lloyds:sanity:plan`.
 */

import * as fs from 'fs';
import * as path from 'path';

import { logger } from '../../utils/logger';

import {
  DataverseMasterDataClient,
  type MasterRecord,
  type RepositoryMasterRecord,
} from './dataverseMasterDataClient';
import {
  LloydsBlobClient,
  type BlobContainerConfig,
  type XmlBlobEntry,
  getBlobContainerConfig,
} from './blobContainerClient';
import { LLOYDS_CLONED_REPOSITORY_IDS } from './lloydsClonedRepoCohort';
import { parseFileName } from './xmlFileName';

const CLONED_REPO_SET = new Set(LLOYDS_CLONED_REPOSITORY_IDS.map((id) => id.toUpperCase()));

export const SANITY_PLAN_REPO_RELATIVE_PATH = 'src/features/lloyds/test-data/sanity-plan.json';

export type BlockReason =
  | 'BAD_FILE_NAME'
  | 'LEDGER_NOT_IN_MASTER'
  | 'REPO_NOT_IN_MASTER'
  /** Parsed repo is in Dataverse but not one of the Dynamics-cloned agency repos. */
  | 'NOT_IN_CLONED_COHORT';

export interface PlannedRow {
  /** Zero-based index in the runnable list (stable across refreshes *within a refresh*). */
  index: number;
  /** Blob name (also used as the `file_name` in the SB payload). */
  name: string;
  /** Direct blob URL — the value to send as `blob_id`. */
  blobUrl: string;
  sizeBytes: number;
  lastModified: string | null;
  ledger: string;
  repoId: string;
  stamp: string;
  legalEntityId: string;
  repositoryFileId: string;
  legalEntityName: string | null;
  repositoryFileName: string | null;
  /** Optional local XML path if a committed copy exists under `docs/lloyds/XMLs/`. */
  localXmlPath: string | null;
}

export interface BlockedRow {
  name: string;
  reason: BlockReason;
  detail: string;
}

export interface SanityPlan {
  /** Schema version for future migrations. */
  schemaVersion: 1;
  generatedAt: string;
  dataverseHost: string;
  blobContainer: string;
  credentialSource: string;
  masterData: {
    /** 3–4 letter ledger codes (small set; always included in full). */
    legalEntities: { count: number; codes: string[] };
    /** Repository files are numerous (~100k in dev). Codes are truncated to keep
     *  the committed snapshot small; the `count` is the authoritative total. */
    repositoryFiles: { count: number; codes: string[]; codesTruncated: boolean; codesSampleSize: number };
  };
  blobs: { xmlCount: number };
  runnable: PlannedRow[];
  blocked: BlockedRow[];
}

/** Normalise Dataverse GUID strings for Map keys (strip `{}`, lower-case). */
export function normalizeDataverseGuidKey(raw: string): string {
  return raw.replace(/[{}]/g, '').toLowerCase();
}

export interface BuildPlanOptions {
  /** Override the DV client (used by tests). */
  dataverseClient?: DataverseMasterDataClient;
  /** Override the blob client. */
  blobClient?: LloydsBlobClient;
  /** Directory to look up optional local XML copies. Default: `docs/lloyds/XMLs`. */
  localXmlDir?: string;
  /** Limit the number of blob pages for smoke runs. */
  maxBlobs?: number;
  /**
   * When set, skip live Azure blob listing and use these entries instead (e.g. from
   * {@link buildSyntheticXmlBlobEntriesFromLocalDir}). Use when Storage Blob Data Reader
   * is unavailable but Dataverse master queries still work.
   */
  syntheticBlobEntries?: XmlBlobEntry[];
}

/**
 * Build a fresh sanity plan by calling Dataverse + Blob. Pure orchestration — all
 * network happens inside the clients injected via options (or created lazily).
 */
export async function buildSanityPlan(options: BuildPlanOptions = {}): Promise<SanityPlan> {
  const dv = options.dataverseClient ?? DataverseMasterDataClient.create();
  const blob = options.syntheticBlobEntries ? null : options.blobClient ?? LloydsBlobClient.create();
  const localXmlDir = options.localXmlDir ?? path.resolve(process.cwd(), 'docs/lloyds/XMLs');

  let blobs: XmlBlobEntry[];
  let blobContainer: string;
  let credentialSource: string;

  if (options.syntheticBlobEntries?.length) {
    logger.info(`[plan] Using ${options.syntheticBlobEntries.length} synthetic blob entr(y|ies) (no Azure list).`);
    blobs = options.syntheticBlobEntries;
    const cfg = getBlobContainerConfig();
    blobContainer = `${cfg.serviceUrl}/${cfg.containerName}`;
    credentialSource = `${dv.getCredentialSource()} (synthetic blob names from local dir)`;
  } else {
    if (!blob) {
      throw new Error('buildSanityPlan: internal error — blob client missing');
    }
    logger.info('[plan] Listing blobs…');
    blobs = await blob.listXmlBlobs();
    blobContainer = `${blob.getConfig().serviceUrl}/${blob.getConfig().containerName}`;
    credentialSource = `${dv.getCredentialSource()} + ${blob.getCredentialSource()}`;
  }
  // Prefer parseable names first so `--max-blobs N` does not take an alphabetical slice of unrelated *.xml files.
  const blobsSorted = [...blobs].sort((a, b) => {
    const ap = parseFileName(a.name) ? 0 : 1;
    const bp = parseFileName(b.name) ? 0 : 1;
    if (ap !== bp) return ap - bp;
    return a.name.localeCompare(b.name);
  });
  const considered = options.maxBlobs ? blobsSorted.slice(0, options.maxBlobs) : blobsSorted;
  logger.info(
    `[plan] Found ${blobs.length} XML blob(s) considered` +
      (blob ? ` in ${blob.getConfig().serviceUrl}/${blob.getConfig().containerName}` : ' (synthetic)'),
  );

  logger.info('[plan] Querying Dataverse master data…');
  const [legalEntities, repositoryFiles] = await Promise.all([
    dv.listLegalEntities(),
    dv.listRepositoryFiles(),
  ]);
  const ledgerIdx = DataverseMasterDataClient.asCodeIndex(legalEntities);
  const repoIdx = DataverseMasterDataClient.asRepositoryCodeIndex(repositoryFiles);
  const legalEntityById = new Map<string, MasterRecord>();
  for (const le of legalEntities) {
    legalEntityById.set(normalizeDataverseGuidKey(le.id), le);
  }
  logger.info(`[plan] Master data: ${legalEntities.length} legal entities, ${repositoryFiles.length} repository files`);

  const runnable: PlannedRow[] = [];
  const blocked: BlockedRow[] = [];

  for (const entry of considered) {
    const parsed = parseFileName(entry.name);
    if (!parsed) {
      blocked.push({
        name: entry.name,
        reason: 'BAD_FILE_NAME',
        detail:
          'does not match classic `<LEDGER> <REPO_ID> <YYYYMMDDHHMM>.xml` or WBX `WBX_<REPO_ID>_<uuid>_<YYYY-MM-DD> <HH-mm-ss.SSS>.xml`',
      });
      continue;
    }
    const repoHit = repoIdx.get(parsed.repoId.toUpperCase());
    if (!repoHit) {
      blocked.push({
        name: entry.name,
        reason: 'REPO_NOT_IN_MASTER',
        detail: `repo code "${parsed.repoId}" not found in accelins_repositoryfile master`,
      });
      continue;
    }

    let ledgerHit = ledgerIdx.get(parsed.ledger.toUpperCase());
    if (!ledgerHit && repoHit.linkedLegalEntityId) {
      const k = normalizeDataverseGuidKey(repoHit.linkedLegalEntityId);
      ledgerHit = legalEntityById.get(k);
      if (!ledgerHit) {
        const leRemote = await dv.findLegalEntityById(repoHit.linkedLegalEntityId);
        if (leRemote) ledgerHit = leRemote;
      }
    }
    if (!ledgerHit && parsed.ledger.toUpperCase() === 'AEUM') {
      const alias = process.env.LLOYDS_SANITY_LEDGER_ALIAS_AEUM?.trim();
      if (alias) ledgerHit = ledgerIdx.get(alias.toUpperCase());
    }
    if (!ledgerHit) {
      blocked.push({
        name: entry.name,
        reason: 'LEDGER_NOT_IN_MASTER',
        detail:
          `ledger code "${parsed.ledger}" not found in accelins_legalentity master` +
          (repoHit.linkedLegalEntityId
            ? ` (repository "${parsed.repoId}" links legal entity id ${repoHit.linkedLegalEntityId})`
            : ''),
      });
      continue;
    }
    if (!CLONED_REPO_SET.has(parsed.repoId.toUpperCase())) {
      blocked.push({
        name: entry.name,
        reason: 'NOT_IN_CLONED_COHORT',
        detail: `repo "${parsed.repoId}" is not in the Lloyd's cloned cohort (${LLOYDS_CLONED_REPOSITORY_IDS.join(', ')})`,
      });
      continue;
    }
    runnable.push({
      index: runnable.length,
      name: entry.name,
      blobUrl: entry.urlWithSpaces,
      sizeBytes: entry.sizeBytes,
      lastModified: entry.lastModified,
      ledger: ledgerHit.code,
      repoId: parsed.repoId,
      stamp: parsed.stamp,
      legalEntityId: ledgerHit.id,
      repositoryFileId: repoHit.id,
      legalEntityName: ledgerHit.name,
      repositoryFileName: repoHit.name,
      localXmlPath: (() => {
        const abs = path.join(localXmlDir, entry.name);
        if (!fs.existsSync(abs)) return null;
        const rel = path.relative(process.cwd(), abs).split(path.sep).join('/');
        return rel && !rel.startsWith('..') ? rel : abs.replace(/\\/g, '/');
      })(),
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    dataverseHost: dv.getDataverseHost(),
    blobContainer,
    credentialSource,
    masterData: {
      legalEntities: { count: legalEntities.length, codes: legalEntities.map((r) => r.code).sort() },
      repositoryFiles: buildRepositoryFilesSummary(repositoryFiles),
    },
    blobs: { xmlCount: considered.length },
    runnable,
    blocked,
  };
}

// ---------------------------------------------------------------------------
// Snapshot I/O
// ---------------------------------------------------------------------------

export function resolvePlanPath(): string {
  return path.resolve(process.cwd(), SANITY_PLAN_REPO_RELATIVE_PATH);
}

export function writeSanityPlan(plan: SanityPlan, filePath: string = resolvePlanPath()): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(plan, null, 2)}\n`, 'utf-8');
  fs.renameSync(tmp, filePath);
}

export function readSanityPlan(filePath: string = resolvePlanPath()): SanityPlan | null {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const plan = JSON.parse(raw) as SanityPlan;
  if (plan.schemaVersion !== 1) {
    throw new Error(`Unsupported sanity plan schema version ${plan.schemaVersion}; expected 1.`);
  }
  const cwd = process.cwd();
  for (const r of plan.runnable) {
    if (!r.localXmlPath) continue;
    if (!path.isAbsolute(r.localXmlPath)) {
      r.localXmlPath = path.resolve(cwd, r.localXmlPath);
    }
  }
  return plan;
}

/**
 * Returns the plan's age in days (based on `generatedAt`). Returns `Infinity` if the
 * plan is missing. Used by the send CLI to warn when the snapshot is stale.
 */
export function planAgeInDays(plan: SanityPlan | null, now: Date = new Date()): number {
  if (!plan) return Number.POSITIVE_INFINITY;
  const gen = new Date(plan.generatedAt);
  const ms = now.getTime() - gen.getTime();
  return ms / (24 * 60 * 60 * 1000);
}

/**
 * Pick a runnable row from an existing plan by index or name. Throws with a helpful
 * message if the selector misses (lists what's available).
 */
/**
 * Runnable rows for a repository id, newest file-name stamp first (same `stamp` sort as planner).
 * Use this instead of hard-coding `AEUM <repo> <YYYYMMDDHHMM>.xml` in features.
 */
export function pickLatestPlannedRowForRepo(plan: SanityPlan, repoId: string): PlannedRow {
  if (plan.runnable.length === 0) {
    throw new Error(
      'Sanity plan has 0 runnable rows. The planner marks runnable blobs whose names parse (classic ' +
        '`<LEDGER> <REPO_ID> <YYYYMMDDHHMM>.xml` or WBX `WBX_<REPO_ID>_<Snowflake-run-uuid>_…xml`) and whose ' +
        '`repoId` is in the Lloyd\'s cloned cohort (see `LLOYDS_CLONED_REPOSITORY_IDS`). ' +
        'Refresh after blobs + Dataverse master align, then run `npm run lloyds:sanity:plan`.',
    );
  }
  const needle = repoId.trim().toUpperCase();
  const matches = plan.runnable.filter((r) => r.repoId.toUpperCase() === needle);
  if (matches.length === 0) {
    throw new Error(
      `No runnable sanity-plan row for repository "${repoId}". ` +
        `Ensure the repo exists in Dataverse master and has an XML in blob storage, then run \`npm run lloyds:sanity:plan\`.`,
    );
  }
  matches.sort((a, b) => {
    if (a.stamp !== b.stamp) return a.stamp < b.stamp ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return matches[0];
}

export function pickPlannedRow(plan: SanityPlan, selector: { index?: number; name?: string }): PlannedRow {
  if (plan.runnable.length === 0) {
    throw new Error('Sanity plan has 0 runnable rows. Refresh with `npm run lloyds:sanity:plan`.');
  }
  if (selector.name) {
    const needle = selector.name.trim().toLowerCase();
    const hit = plan.runnable.find((r) => r.name.toLowerCase() === needle);
    if (!hit) {
      throw new Error(
        `No runnable row named "${selector.name}". Available: ${plan.runnable.map((r) => r.name).join(', ')}`,
      );
    }
    return hit;
  }
  const idx = selector.index ?? 0;
  if (idx < 0 || idx >= plan.runnable.length) {
    throw new Error(`Row index ${idx} out of range [0, ${plan.runnable.length - 1}]`);
  }
  return plan.runnable[idx];
}

/**
 * Pick a blocked row from the plan — used by negative scenarios. Optionally filter by
 * block reason so callers can target a specific failure class (e.g. `REPO_NOT_IN_MASTER`).
 */
export function pickBlockedRow(
  plan: SanityPlan,
  selector: { index?: number; name?: string; reason?: BlockReason },
): BlockedRow {
  const pool = selector.reason
    ? plan.blocked.filter((b) => b.reason === selector.reason)
    : plan.blocked;

  if (pool.length === 0) {
    const reasonSuffix = selector.reason ? ` with reason "${selector.reason}"` : '';
    throw new Error(`Sanity plan has 0 blocked rows${reasonSuffix}.`);
  }

  if (selector.name) {
    const needle = selector.name.trim().toLowerCase();
    const hit = pool.find((r) => r.name.toLowerCase() === needle);
    if (!hit) {
      throw new Error(
        `No blocked row named "${selector.name}"${selector.reason ? ` (reason ${selector.reason})` : ''}. ` +
          `First 10 available: ${pool.slice(0, 10).map((r) => r.name).join(', ')}${pool.length > 10 ? `, …(+${pool.length - 10} more)` : ''}`,
      );
    }
    return hit;
  }
  const idx = selector.index ?? 0;
  if (idx < 0 || idx >= pool.length) {
    throw new Error(`Blocked row index ${idx} out of range [0, ${pool.length - 1}]`);
  }
  return pool[idx];
}

/** How many repository-file codes to include in the snapshot (diagnostic only). */
const REPO_CODES_SAMPLE_SIZE = 50;

function buildRepositoryFilesSummary(repositoryFiles: MasterRecord[]): SanityPlan['masterData']['repositoryFiles'] {
  const codes = repositoryFiles.map((r) => r.code).sort();
  if (codes.length <= REPO_CODES_SAMPLE_SIZE) {
    return { count: codes.length, codes, codesTruncated: false, codesSampleSize: codes.length };
  }
  return {
    count: codes.length,
    codes: codes.slice(0, REPO_CODES_SAMPLE_SIZE),
    codesTruncated: true,
    codesSampleSize: REPO_CODES_SAMPLE_SIZE,
  };
}

/**
 * Best-effort blob URL for a blocked row. Returns the canonical mulesoft-xml URL (the
 * curator's container) even though we can't confirm the blob exists. This is the same
 * URL `func-xml-totals` would try to read, so it reproduces the happy-path URL
 * construction while leaving the lookup failure as the only reason for the DLQ.
 *
 * Overridable via `LLOYDS_BLOB_CONTAINER_URL` / `LLOYDS_BLOB_SERVICE_URL` +
 * `LLOYDS_BLOB_CONTAINER_NAME`.
 */
export function guessBlockedRowBlobUrl(blocked: BlockedRow, env: NodeJS.ProcessEnv = process.env): string {
  const override = env.LLOYDS_BLOB_CONTAINER_URL?.trim();
  const base = override
    || `${(env.LLOYDS_BLOB_SERVICE_URL || 'https://saaccdevukslyd.blob.core.windows.net').replace(/\/+$/, '')}/${env.LLOYDS_BLOB_CONTAINER_NAME || 'mulesoft-xml'}`;
  return `${base.replace(/\/+$/, '')}/${blocked.name}`;
}

/** Tiny no-op re-export so callers can import all master-data types from one place. */
export type { MasterRecord, XmlBlobEntry, BlobContainerConfig };
