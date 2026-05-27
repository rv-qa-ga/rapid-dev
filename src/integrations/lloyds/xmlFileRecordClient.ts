/**
 * Dataverse client facade for the Lloyd's "XML File" record (`accelins_workflow` entity,
 * entity-set `accelins_workflows`).
 *
 * **`accelins_correlation_id` source depends on the path:**
 *   - **Programme / Snowflake-driven files** — the UUID in the WBX/WRX file name (Snowflake
 *     **`_ACCEL_UNIQUE_RUN_ID`**) is what lands in **Correlation ID** in Power Apps and in
 *     this column; reconcile against Snowflake agency / financial views, not the sanity counter.
 *   - **Automation SB sends** — tests use `0000-0000-0000-NNNNN` from {@link correlationIdCounter};
 *     lookups try that literal plus a **canonical GUID** variant when Dataverse stores the
 *     counter in normalized form.
 *
 * Two capabilities:
 *   - `findXmlFileRecordByCorrelationId` — one-shot lookup by `accelins_correlation_id`.
 *   - `waitForXmlFileRecord` — polls until the record appears or the timeout expires.
 *
 * Field / entity-set constants live here so the rest of the framework only ever references
 * them via exported symbols — if Power Platform ever renames something we change one file.
 */

import { request, APIRequestContext } from '@playwright/test';

import { DynamicsAPIClient } from '../../api-clients/dynamics/DynamicsAPIClient';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { sleep } from '../../utils/helpers';

import { dataverseCanonicalGuidForSanityCorrelationId } from './correlationIdCounter';
import { dataverseScope, getDiscoveryCredential } from './credential';

/** OData entity set name (plural) for the `accelins_workflow` table. */
export const ACCELINS_WORKFLOWS_ENTITY_SET = 'accelins_workflows';

/** Logical names of the columns we assert on. */
export const ACCELINS_WORKFLOW_FIELDS = {
  primaryId: 'accelins_workflowid',
  name: 'accelins_name',
  correlationId: 'accelins_correlation_id',
  blobId: 'accelins_blob_id',
  fileType: 'accelins_file_type',
  xmlFileType: 'accelins_xml_file_type',
  processPath: 'accelins_process_path',
  statecode: 'statecode',
  statuscode: 'statuscode',
  repositoryFileLookup: '_accelins_repositoryfile_value',
  legalEntityLookup: '_accelins_legal_entity_value',
  odsCurrency: 'accelins_ods_currency',
  odsPrm: 'accelins_ods_total_premium_amount',
  odsCom: 'accelins_ods_total_agency_commission_amount',
  odsCoi: 'accelins_ods_total_commission_amount',
  odsTax: 'accelins_ods_total_tax_amount',
  odsOth: 'accelins_ods_total_other_contributions_amount',
  xmlCurrency: 'accelins_xml_currency',
  xmlPrm: 'accelins_xml_total_premium_amount',
  xmlCom: 'accelins_xml_total_agency_commission_amount',
  xmlCoi: 'accelins_xml_total_commission_amount',
  xmlTax: 'accelins_xml_total_tax_amount',
  xmlOth: 'accelins_xml_total_other_contributions_amount',
  overallMatch: 'accelins_overall_match',
} as const;

/** Post–func-xml-totals dimension validation metadata (PP-392 / PP-429). */
export const DIMENSION_VALIDATION_FIELDS = {
  status: 'accelins_dimensionvalidationstatus',
  error: 'accelins_dimensionvalidationerror',
} as const;

/**
 * Status-reason integers observed on the `accelins_workflow` form for Row-1 happy path.
 * The record transitions from `APPROVED` (write by func-xml-totals + func-dimension-validation)
 * to `READY_TO_SHIP_TO_DYNAMICS` (cascaded from downstream orchestration) within ~seconds.
 * Both are acceptable end states for Row-1 sanity.
 *
 * **Programme caveat (2026-04):** after DMF/F&O work completes, the UI may **remain** on
 * `READY_TO_SHIP_TO_DYNAMICS` until a separate status-sync fix ships — downstream systems
 * (F&O journals, Tagetik/TDS, `PROCESS_TRACKER`) can still be **SUCCESS**; E2E read-only
 * assertions must not assume `statuscode` alone reflects F&O/Tagetik state.
 */
export const STATUSCODE_APPROVED = 100000002;
export const STATUSCODE_READY_TO_SHIP_TO_DYNAMICS = 100000003;
/** Statuscode values that count as a successful Row-1 outcome. */
export const HAPPY_PATH_STATUSCODES: readonly number[] = [
  STATUSCODE_APPROVED,
  STATUSCODE_READY_TO_SHIP_TO_DYNAMICS,
];
/** Human-readable label per statuscode (matches the Status Reason column in the UI). */
export const STATUSCODE_LABELS: Record<number, string> = {
  [STATUSCODE_APPROVED]: 'Approved',
  [STATUSCODE_READY_TO_SHIP_TO_DYNAMICS]: 'Ready to Ship to Dynamics',
};

/** Flat, typed projection of the fields the sanity test reads. */
export interface XmlFileRecord {
  raw: Record<string, unknown>;
  workflowId: string;
  name: string | null;
  correlationId: string | null;
  blobId: string | null;
  fileType: string | null;
  processPath: boolean | null;
  statecode: number | null;
  statuscode: number | null;
  repositoryFileId: string | null;
  legalEntityId: string | null;
  odsCurrency: string | null;
  odsPrm: number | null;
  odsCom: number | null;
  odsCoi: number | null;
  odsTax: number | null;
  odsOth: number | null;
  xmlCurrency: string | null;
  xmlPrm: number | null;
  xmlCom: number | null;
  xmlCoi: number | null;
  xmlTax: number | null;
  xmlOth: number | null;
  overallMatch: boolean | null;
  /** Per-metric match toggles as computed by func-xml-totals (ADP vs XML comparison). */
  matches: {
    currency: boolean | null;
    prm: boolean | null;
    com: boolean | null;
    coi: boolean | null;
    tax: boolean | null;
    oth: boolean | null;
  };
  /** Option-set / numeric status from dimension validation (may be null if column absent in env). */
  dimensionValidationStatus: number | null;
  dimensionValidationError: string | null;
}

/** Logical names of the per-metric match toggles on accelins_workflow. */
export const MATCH_TOGGLE_FIELDS = {
  currency: 'accelins_currency_match',
  prm: 'accelins_total_premium_amount_match',
  com: 'accelins_total_agency_commission_amount_match',
  coi: 'accelins_total_commission_amount_match',
  tax: 'accelins_total_tax_amount_match',
  // Note programme typo: the field is literally "ontributions" (missing "c").
  oth: 'accelins_total_other_ontributions_amount_match',
} as const;
export type MatchMetricKey = keyof typeof MATCH_TOGGLE_FIELDS;

/** Default $select list used by the sanity test. Keeping it tight reduces payload size. */
export const DEFAULT_XML_FILE_SELECT = [
  ...Object.values(ACCELINS_WORKFLOW_FIELDS),
  ...Object.values(MATCH_TOGGLE_FIELDS),
  ...Object.values(DIMENSION_VALIDATION_FIELDS),
].join(',');

/**
 * Authenticated, standalone Dataverse client for the CLI (no Cucumber World required).
 *
 * Auth strategy:
 *   - By default: **interactive user identity** via DefaultAzureCredential (`az login`).
 *     This is required today because the QA SPN does not yet have an Application User
 *     in the Lloyd's Power Platform environment (`accelinsqatest`) — see
 *     docs/servicenow-ticket-lloyds-spn-permissions.md. Same credential chain the
 *     sanity planner uses for blob + Dataverse discovery.
 *   - When the SPN grants land, set `LLOYDS_USE_SPN=true` (or `D365_USE_SPN=true`) and
 *     this client will transparently use the SPN token instead. Call sites don't change.
 *
 * The Cucumber layer passes a pre-existing `AutomationWorld.apiContext` via
 * `createFromApiContext`; the standalone CLI owns its own context and disposes it.
 */
export class XmlFileRecordClient {
  private constructor(
    private readonly api: DynamicsAPIClient,
    private readonly credentialSource: string,
    private readonly ownedContext?: APIRequestContext,
  ) {}

  /** Which identity this client authenticated with — surfaced in CLI output. */
  getCredentialSource(): string { return this.credentialSource; }

  /** Build a fresh client with its own `APIRequestContext`. Caller must `dispose()` it. */
  static async createStandalone(): Promise<XmlFileRecordClient> {
    const ctx = await request.newContext();
    const { api, source } = await buildAuthenticatedClient(ctx);
    return new XmlFileRecordClient(api, source, ctx);
  }

  /** Build a client reusing an existing request context (e.g. Cucumber `world.apiContext`). */
  static async createFromApiContext(ctx: APIRequestContext): Promise<XmlFileRecordClient> {
    const { api, source } = await buildAuthenticatedClient(ctx);
    return new XmlFileRecordClient(api, source);
  }

  /** Tear down the owned request context. Safe to call even if none was created. */
  async dispose(): Promise<void> {
    if (this.ownedContext) {
      await this.ownedContext.dispose();
    }
  }

  /**
   * One-shot lookup by correlation id. Returns null if no record exists yet.
   * Always uses `$top=1` so the caller doesn't have to worry about duplicates.
   */
  async findByCorrelationId(correlationId: string, select: string = DEFAULT_XML_FILE_SELECT): Promise<XmlFileRecord | null> {
    const escaped = correlationId.replace(/'/g, "''");
    const filters: string[] = [`${ACCELINS_WORKFLOW_FIELDS.correlationId} eq '${escaped}'`];
    const canon = dataverseCanonicalGuidForSanityCorrelationId(correlationId);
    if (canon) {
      const g = canon.replace(/[{}]/g, '').toLowerCase();
      filters.push(`${ACCELINS_WORKFLOW_FIELDS.correlationId} eq ${g}`);
    }
    for (const $filter of filters) {
      try {
        const result = await this.api.queryEntitySet(ACCELINS_WORKFLOWS_ENTITY_SET, {
          $filter,
          $select: select,
          $top: '1',
        });
        const row = Array.isArray(result?.value) ? result.value[0] : undefined;
        if (row) return projectRecord(row);
      } catch (e) {
        logger.debug(
          `[xml-file-record-client] findByCorrelationId filter skipped (${$filter.slice(0, 80)}…): ${(e as Error).message}`,
        );
      }
    }
    return null;
  }

  /**
   * Latest `accelins_workflow` for a resolved repository file (lookup guid), by `modifiedon` DESC.
   * Used to compare ADP Snowflake summary vs persisted Dataverse workflow columns on `accelins_workflow`
   * (physical attribute names remain `accelins_ods_*` in the API — programme “workflow” / Power Apps XML File).
   */
  async findLatestByRepositoryFileId(
    repositoryFileGuid: string,
    select: string = DEFAULT_XML_FILE_SELECT,
  ): Promise<XmlFileRecord | null> {
    const clean = repositoryFileGuid.replace(/[{}]/g, '').trim().toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(clean)) {
      throw new Error(`Invalid repository file guid: "${repositoryFileGuid}"`);
    }
    // Dataverse Web API: lookup *_value fields use Edm.Guid — unquoted UUID (guid'…' is rejected as Edm.String in v9.2).
    const result = await this.api.queryEntitySet(ACCELINS_WORKFLOWS_ENTITY_SET, {
      $filter: `${ACCELINS_WORKFLOW_FIELDS.repositoryFileLookup} eq ${clean}`,
      $select: select,
      $orderby: 'modifiedon desc',
      $top: '1',
    });
    const row = Array.isArray(result?.value) ? result.value[0] : undefined;
    if (!row) return null;
    return projectRecord(row);
  }

  /**
   * Count how many records exist for a given correlation id. Useful for idempotency
   * assertions (`func-xml-totals` is keyed on `(correlationId, messageType)` — a second
   * send with the same pair should update in place, not duplicate).
   */
  async countByCorrelationId(correlationId: string): Promise<number> {
    const escaped = correlationId.replace(/'/g, "''");
    const filters: string[] = [`${ACCELINS_WORKFLOW_FIELDS.correlationId} eq '${escaped}'`];
    const canon = dataverseCanonicalGuidForSanityCorrelationId(correlationId);
    if (canon) {
      const g = canon.replace(/[{}]/g, '').toLowerCase();
      filters.push(`${ACCELINS_WORKFLOW_FIELDS.correlationId} eq ${g}`);
    }
    const ids = new Set<string>();
    for (const $filter of filters) {
      try {
        const result = await this.api.queryEntitySet(ACCELINS_WORKFLOWS_ENTITY_SET, {
          $filter,
          $select: ACCELINS_WORKFLOW_FIELDS.primaryId,
          $top: '50',
        });
        for (const row of Array.isArray(result?.value) ? result.value : []) {
          const id = (row as Record<string, unknown>)[ACCELINS_WORKFLOW_FIELDS.primaryId];
          if (typeof id === 'string') ids.add(id);
        }
      } catch {
        /* same as findByCorrelationId — attribute may be string-only in some envs */
      }
    }
    return ids.size;
  }

  /**
   * Wait for the absence of a record — passes if no record with `correlationId` exists
   * by the time the timeout elapses. Used by negative scenarios where we expect the
   * message to dead-letter and never create a record.
   *
   * Semantics: we poll the ENTIRE timeout window at a fixed cadence. If a record shows
   * up at any point we fail immediately. If the window closes without a record, pass.
   */
  async waitForNoRecordByCorrelationId(input: {
    correlationId: string;
    timeoutMs?: number;
    pollIntervalMs?: number;
    onAttempt?: (attempt: number, elapsedMs: number) => void;
  }): Promise<void> {
    const timeoutMs = input.timeoutMs ?? 60_000;
    const pollIntervalMs = Math.max(1000, input.pollIntervalMs ?? 5_000);
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    while (Date.now() < deadline) {
      attempt += 1;
      const elapsed = timeoutMs - Math.max(0, deadline - Date.now());
      input.onAttempt?.(attempt, elapsed);
      const hit = await this.findByCorrelationId(input.correlationId);
      if (hit) {
        throw new Error(
          `Expected NO accelins_workflows record for correlation_id='${input.correlationId}' but found one (${hit.workflowId}, name=${hit.name}).`,
        );
      }
      await sleep(pollIntervalMs);
    }
    logger.info(`No record appeared for correlation_id=${input.correlationId} within ${timeoutMs}ms (negative test PASS).`);
  }

  /**
   * Poll Dataverse until a record with the given correlation id appears or the timeout
   * elapses. Uses a gentle back-off so we don't hammer the tenant.
   */
  async waitForByCorrelationId(input: {
    correlationId: string;
    timeoutMs?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    select?: string;
    onAttempt?: (attempt: number, elapsedMs: number) => void;
  }): Promise<XmlFileRecord> {
    const timeoutMs = input.timeoutMs ?? 120_000;
    const maxDelayMs = input.maxDelayMs ?? 5_000;
    let delay = Math.max(500, input.initialDelayMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    // Loop condition is `Date.now() < deadline`; the successful return happens mid-body
    // when the record shows up. We exit via break (timeout) or return (record found).
    while (Date.now() < deadline) {
      attempt += 1;
      const elapsed = timeoutMs - Math.max(0, deadline - Date.now());
      input.onAttempt?.(attempt, elapsed);
      const hit = await this.findByCorrelationId(input.correlationId, input.select);
      if (hit) {
        logger.info(`XML File record for correlation_id=${input.correlationId} appeared after ${attempt} poll(s) (${elapsed}ms)`);
        return hit;
      }
      await sleep(delay);
      delay = Math.min(maxDelayMs, Math.round(delay * 1.5));
    }
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for accelins_workflows record with ${ACCELINS_WORKFLOW_FIELDS.correlationId}='${input.correlationId}' (attempts: ${attempt}).`,
    );
  }

  /**
   * After a record exists, poll until `statuscode` matches (e.g. **100000003** Ready to Ship).
   * Use when the consumer first writes **Approved** then transitions after dimension validation.
   */
  async waitUntilStatusCodeByCorrelationId(input: {
    correlationId: string;
    targetStatusCode: number;
    timeoutMs?: number;
    pollIntervalMs?: number;
    select?: string;
    onAttempt?: (attempt: number, elapsedMs: number, lastStatus: number | null) => void;
  }): Promise<XmlFileRecord> {
    const timeoutMs = input.timeoutMs ?? 300_000;
    const pollIntervalMs = Math.max(1_000, input.pollIntervalMs ?? 5_000);
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt += 1;
      const elapsed = timeoutMs - Math.max(0, deadline - Date.now());
      const row = await this.findByCorrelationId(input.correlationId, input.select);
      const sc = row?.statuscode ?? null;
      input.onAttempt?.(attempt, elapsed, sc);
      if (row && row.statuscode === input.targetStatusCode) {
        logger.info(
          `XML File correlation_id=${input.correlationId} reached statuscode=${input.targetStatusCode} after ${attempt} poll(s) (${elapsed}ms)`,
        );
        return row;
      }
      await sleep(pollIntervalMs);
    }

    const last = await this.findByCorrelationId(input.correlationId, input.select);
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for statuscode=${input.targetStatusCode} on correlation_id='${input.correlationId}'. ` +
        `Last seen statuscode=${last?.statuscode ?? 'no record'}.`,
    );
  }

  /**
   * Poll until `statuscode` matches **any** of the given codes (OR semantics).
   * Use after Stage-2 / straight-through flows where Dataverse may skip **Approved**
   * and land directly on **Ready to Ship to Dynamics** (see `HAPPY_PATH_STATUSCODES`).
   */
  async waitUntilAnyStatusCodeByCorrelationId(input: {
    correlationId: string;
    targetStatusCodes: readonly number[];
    timeoutMs?: number;
    pollIntervalMs?: number;
    select?: string;
    onAttempt?: (attempt: number, elapsedMs: number, lastStatus: number | null) => void;
  }): Promise<XmlFileRecord> {
    const targets = new Set(input.targetStatusCodes);
    if (targets.size === 0) {
      throw new Error('waitUntilAnyStatusCodeByCorrelationId: targetStatusCodes must be non-empty.');
    }
    const timeoutMs = input.timeoutMs ?? 300_000;
    const pollIntervalMs = Math.max(1_000, input.pollIntervalMs ?? 5_000);
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt += 1;
      const elapsed = timeoutMs - Math.max(0, deadline - Date.now());
      const row = await this.findByCorrelationId(input.correlationId, input.select);
      const sc = row?.statuscode ?? null;
      input.onAttempt?.(attempt, elapsed, sc);
      if (row && row.statuscode !== null && targets.has(row.statuscode)) {
        logger.info(
          `XML File correlation_id=${input.correlationId} reached statuscode=${row.statuscode} (one of [${[...targets].join(', ')}]) after ${attempt} poll(s) (${elapsed}ms)`,
        );
        return row;
      }
      await sleep(pollIntervalMs);
    }

    const last = await this.findByCorrelationId(input.correlationId, input.select);
    throw new Error(
      `Timed out after ${timeoutMs}ms waiting for any statuscode in [${[...targets].join(', ')}] on correlation_id='${input.correlationId}'. ` +
        `Last seen statuscode=${last?.statuscode ?? 'no record'}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Authenticate a `DynamicsAPIClient` via the credential chain in credential.ts.
 *
 * Flow:
 *   1. Resolve host from `D365_BASE_URL` / `D365_WEB_API_BASE_URL` / config.
 *   2. Get a token for `https://<host>/.default` using the chosen credential (SPN if
 *      forced, else DefaultAzureCredential).
 *   3. Inject the raw token into the client via `setAccessToken()` — we intentionally
 *      bypass `DynamicsAPIClient.authenticate()` (which hard-codes the SPN path through
 *      `DynamicsAuth`) so we can run as the user's `az login` identity today.
 */
async function buildAuthenticatedClient(ctx: APIRequestContext): Promise<{ api: DynamicsAPIClient; source: string }> {
  const d365 = config.getDynamicsConfig();
  const hostRaw = (process.env.LLOYDS_DATAVERSE_BASE_URL || d365.baseUrl || inferHostFromWebApi(d365.webApiBaseUrl) || '').replace(/\/+$/, '');
  if (!hostRaw) {
    throw new Error('Dataverse host not configured. Set D365_BASE_URL or LLOYDS_DATAVERSE_BASE_URL.');
  }
  const { credential, source } = getDiscoveryCredential();
  const token = await credential.getToken(dataverseScope(hostRaw));
  if (!token) {
    throw new Error(`Failed to acquire Dataverse token for ${hostRaw} (credential source: ${source}).`);
  }
  const api = new DynamicsAPIClient(ctx);
  api.setAccessToken(token.token);
  logger.info(`[xml-file-record-client] Authenticated against ${hostRaw} — source: ${source}`);
  return { api, source };
}

function inferHostFromWebApi(webApi?: string): string | undefined {
  if (!webApi) return undefined;
  try {
    const u = new URL(webApi);
    return `${u.protocol}//${u.host}`;
  } catch {
    return undefined;
  }
}

function projectRecord(row: Record<string, unknown>): XmlFileRecord {
  return {
    raw: row,
    workflowId: asString(row[ACCELINS_WORKFLOW_FIELDS.primaryId]) ?? '',
    name: asString(row[ACCELINS_WORKFLOW_FIELDS.name]),
    correlationId: asString(row[ACCELINS_WORKFLOW_FIELDS.correlationId]),
    blobId: asString(row[ACCELINS_WORKFLOW_FIELDS.blobId]),
    fileType: asString(row[ACCELINS_WORKFLOW_FIELDS.fileType]),
    processPath: asBool(row[ACCELINS_WORKFLOW_FIELDS.processPath]),
    statecode: asNumber(row[ACCELINS_WORKFLOW_FIELDS.statecode]),
    statuscode: asNumber(row[ACCELINS_WORKFLOW_FIELDS.statuscode]),
    repositoryFileId: asString(row[ACCELINS_WORKFLOW_FIELDS.repositoryFileLookup]),
    legalEntityId: asString(row[ACCELINS_WORKFLOW_FIELDS.legalEntityLookup]),
    odsCurrency: asString(row[ACCELINS_WORKFLOW_FIELDS.odsCurrency]),
    odsPrm: asNumber(row[ACCELINS_WORKFLOW_FIELDS.odsPrm]),
    odsCom: asNumber(row[ACCELINS_WORKFLOW_FIELDS.odsCom]),
    odsCoi: asNumber(row[ACCELINS_WORKFLOW_FIELDS.odsCoi]),
    odsTax: asNumber(row[ACCELINS_WORKFLOW_FIELDS.odsTax]),
    odsOth: asNumber(row[ACCELINS_WORKFLOW_FIELDS.odsOth]),
    xmlCurrency: asString(row[ACCELINS_WORKFLOW_FIELDS.xmlCurrency]),
    xmlPrm: asNumber(row[ACCELINS_WORKFLOW_FIELDS.xmlPrm]),
    xmlCom: asNumber(row[ACCELINS_WORKFLOW_FIELDS.xmlCom]),
    xmlCoi: asNumber(row[ACCELINS_WORKFLOW_FIELDS.xmlCoi]),
    xmlTax: asNumber(row[ACCELINS_WORKFLOW_FIELDS.xmlTax]),
    xmlOth: asNumber(row[ACCELINS_WORKFLOW_FIELDS.xmlOth]),
    overallMatch: asBool(row[ACCELINS_WORKFLOW_FIELDS.overallMatch]),
    matches: {
      currency: asBool(row[MATCH_TOGGLE_FIELDS.currency]),
      prm: asBool(row[MATCH_TOGGLE_FIELDS.prm]),
      com: asBool(row[MATCH_TOGGLE_FIELDS.com]),
      coi: asBool(row[MATCH_TOGGLE_FIELDS.coi]),
      tax: asBool(row[MATCH_TOGGLE_FIELDS.tax]),
      oth: asBool(row[MATCH_TOGGLE_FIELDS.oth]),
    },
    dimensionValidationStatus: asNumber(row[DIMENSION_VALIDATION_FIELDS.status]),
    dimensionValidationError: asString(row[DIMENSION_VALIDATION_FIELDS.error]),
  };
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.length > 0 && Number.isFinite(Number(v))) return Number(v);
  return null;
}
function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  return null;
}
