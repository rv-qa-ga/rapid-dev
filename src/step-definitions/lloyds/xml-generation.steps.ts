/**
 * Lloyd's pipeline step definitions (Stage 1 hop slice — `lloyds-pipeline-hops.feature`).
 *
 * Backs the `@stage-1 @phase-1` scenarios in
 * `src/features/lloyds/lloyds-pipeline.feature` (the consolidated Lloyd's feature).
 * Phase 2 (Snowflake read-side) is in `lloyds-snowflake-adp.steps.ts`. Tagetik, DMF,
 * posting, regression, E2E and unit sections remain `@wip` until those contracts land.
 *
 * Composes framework helpers rather than adding any new capability:
 *   - Test-data: `sanity-plan.json` (per-repo latest runnable blob) + optional XLSX via sanityTestDataLoader.
 *   - ADP totals for Stage 1 positives: Snowflake `FOWD__AGENCY_POLICY_FO_SUMMARY_V1` → `adpSummaryToMuleFinancialValues.ts`.
 *   - Correlation id: bumped from `src/features/lloyds/test-data/sanity-counter.json`, **or**
 *     pinned from Snowflake (`LLOYDS_PP392_E2E_*` — see `pp392SnowflakeE2ePin.ts` and `@PP-392-E2E-SNOWFLAKE`).
 *   - Service Bus send: `src/integrations/lloyds/serviceBusSender.ts`.
 *   - Dataverse poll: `src/integrations/lloyds/xmlFileRecordClient.ts`.
 *
 * Why a separate step file under `src/step-definitions/lloyds/`?
 *   The sanity scenario is a pipeline-specific integration check, not a pure D365 API test
 *   nor a pure MuleSoft test. Keeping it co-located with the Lloyd's feature file matches
 *   the `src/features/lloyds/` / `@lloyds` tagging convention spelled out in
 *   `src/features/lloyds/README.md`.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Given, When, Then } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { sleep } from '../../utils/helpers';
import { logger } from '../../utils/logger';

import { adpSummaryRowToMuleFinancialValues } from '../../integrations/lloyds/adpSummaryToMuleFinancialValues';
import { LloydsBlobClient } from '../../integrations/lloyds/blobContainerClient';
import {
  computeAdpTotalsFromFile,
  totalsToServiceBusPayload,
  type AdpTotals,
} from '../../integrations/lloyds/xmlTotals';
import {
  DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH,
  ensureLocalXmlExists,
  loadSanityRows,
  pickRow,
  SanityRow,
} from '../../integrations/lloyds/sanityTestDataLoader';
import { resolveLloydsTestRepoId } from '../../integrations/lloyds/lloydsClonedRepoCohort';
import {
  guessBlockedRowBlobUrl,
  pickBlockedRow,
  pickLatestPlannedRowForRepo,
  pickPlannedRow,
  readSanityPlan,
  resolvePlanPath,
  type BlockedRow,
  type BlockReason,
  type PlannedRow,
  type SanityPlan,
} from '../../integrations/lloyds/sanityPlanner';
import { readPp392SnowflakeE2ePinFromEnv } from '../../integrations/lloyds/pp392SnowflakeE2ePin';
import { buildBlobId, parseFileName } from '../../integrations/lloyds/xmlFileName';
import {
  bumpCounter,
  resolveCounterPath,
} from '../../integrations/lloyds/correlationIdCounter';
import {
  buildMuleD365ImportStatusPayload,
  buildDvXmlApprovalSuccessPayload,
  buildMuleXmlGenerationFailedPayload,
  buildMuleXmlGenerationSuccessPayload,
  buildMuleXmlSubmissionSuccessPayload,
  getServiceBusConfig,
  getServiceBusSpnCreds,
  sendLloydsServiceBusJsonMessage,
  sendMuleXmlGenerationMessage,
  type MuleXmlGenerationFailedPayload,
  type MuleXmlGenerationSuccessPayload,
} from '../../integrations/lloyds/serviceBusSender';
import { fetchLatestSummaryRowsForRepo } from '../../integrations/lloyds/snowflakeSummaryClient';
import {
  connectFinOpsSnowflake,
  destroyConnection,
  loadFinOpsSnowflakeEnv,
} from '../../utils/fowd-agency-xml-compare';
import {
  HAPPY_PATH_STATUSCODES,
  STATUSCODE_LABELS,
  STATUSCODE_READY_TO_SHIP_TO_DYNAMICS,
  STATUSCODE_APPROVED,
  XmlFileRecord,
  XmlFileRecordClient,
} from '../../integrations/lloyds/xmlFileRecordClient';

/** Shape stashed on `world.testContext` between steps. Keyed under `lloydsSanity`. */
interface LloydsSanityContext {
  plan?: SanityPlan;
  rows?: SanityRow[];
  pickedPlannedRow?: PlannedRow;
  pickedXlsxRow?: SanityRow;
  pickedBlockedRow?: BlockedRow;
  badFileName?: string;
  /** Normalised view: the step-defs don't care whether we came via plan or xlsx. */
  row?: { name: string; ledger: string; repoId: string; blobId: string; localXmlPath: string | null };
  /** Flavour of the scenario currently running — drives verify-side expectation. */
  flavour?: 'positive-plan' | 'positive-xlsx' | 'negative-blocked' | 'negative-blob-missing' | 'negative-bad-file-name' | 'negative-mule-failed' | 'negative-adp-mismatch';
  correlationId?: string;
  /** The last success payload (idempotency resend). */
  lastPayload?: ReturnType<typeof buildMuleXmlGenerationSuccessPayload>;
  lastFailedPayload?: MuleXmlGenerationFailedPayload;
  adpTotals?: ReturnType<typeof totalsToServiceBusPayload>;
  record?: XmlFileRecord;
}

function ctx(world: AutomationWorld): LloydsSanityContext {
  if (!world.testContext.lloydsSanity) world.testContext.lloydsSanity = {} as LloydsSanityContext;
  return world.testContext.lloydsSanity as LloydsSanityContext;
}

// ---------------------------------------------------------------------------
// Background / test-data
// ---------------------------------------------------------------------------

Given('the Lloyd\'s sanity plan is loaded', function (this: AutomationWorld) {
  const planPath = resolvePlanPath();
  const plan = readSanityPlan(planPath);
  if (!plan) {
    throw new Error(
      `No sanity plan at ${path.relative(process.cwd(), planPath)}. Run \`npm run lloyds:sanity:plan\` first.`,
    );
  }
  ctx(this).plan = plan;
  logger.info(
    `Lloyd's sanity: plan loaded (generated ${plan.generatedAt}) — ${plan.runnable.length} runnable, ${plan.blocked.length} blocked.`,
  );
});

Given('the Lloyd\'s sanity spreadsheet is loaded from {string}', async function (this: AutomationWorld, xlsxRelPath: string) {
  const xlsxPath = path.resolve(process.cwd(), xlsxRelPath || DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH);
  // Prefer the spreadsheet URLs verbatim. Only override if env var is explicitly set
  // (otherwise func-xml-totals dead-letters with "Blob not found" when we point at the
  // wrong container).
  const containerBaseUrl = process.env.LLOYDS_BLOB_CONTAINER_BASE_URL || undefined;
  const rows = await loadSanityRows({ xlsxPath, containerBaseUrl });
  ctx(this).rows = rows;
  logger.info(`Lloyd's sanity: loaded ${rows.length} row(s) from ${xlsxPath}`);
});

Given('the Lloyd\'s sanity row {string}', function (this: AutomationWorld, rowName: string) {
  const c = ctx(this);

  // Prefer plan-driven selection when a plan has been loaded in Background.
  if (c.plan) {
    const planned = pickPlannedRow(c.plan, { name: rowName });
    if (!planned.localXmlPath) {
      throw new Error(
        `Planned row "${planned.name}" has no local XML under docs/lloyds/XMLs/. ` +
          `Commit the XML or extend the planner to download it.`,
      );
    }
    c.pickedPlannedRow = planned;
    c.flavour = 'positive-plan';
    c.row = {
      name: planned.name,
      ledger: planned.ledger,
      repoId: planned.repoId,
      blobId: planned.blobUrl,
      localXmlPath: planned.localXmlPath,
    };
    logger.info(`Lloyd's sanity: selected plan row [${planned.index}] ${planned.name} (ledger=${planned.ledger} repo=${planned.repoId})`);
    return;
  }

  // Fallback: xlsx-loaded rows (legacy path).
  const rows = c.rows;
  if (!rows) throw new Error('Neither the sanity plan nor the sanity spreadsheet have been loaded.');
  const row = pickRow(rows, { name: rowName });
  ensureLocalXmlExists(row);
  c.pickedXlsxRow = row;
  c.flavour = 'positive-xlsx';
  c.row = { name: row.name, ledger: row.ledger, repoId: row.repoId, blobId: row.blobId, localXmlPath: row.localXmlPath };
  logger.info(`Lloyd's sanity: selected xlsx row [${row.index}] ${row.name} (ledger=${row.ledger} repo=${row.repoId})`);
});

/**
 * Prefer committed XML under `docs/lloyds/XMLs/`; otherwise download the blob once into
 * `%TEMP%/lloyds-cucumber-xml/` so `computeAdpTotalsFromFile` / mismatch scenarios work.
 */
async function resolveLocalOrDownloadedXml(planned: PlannedRow): Promise<string> {
  if (planned.localXmlPath && fs.existsSync(planned.localXmlPath)) {
    return planned.localXmlPath;
  }
  const client = LloydsBlobClient.create();
  const dir = path.join(os.tmpdir(), 'lloyds-cucumber-xml');
  fs.mkdirSync(dir, { recursive: true });
  const safe = planned.name.replace(/[/\\?%*:|"<>]/g, '_');
  const target = path.join(dir, safe);
  const body = await client.downloadXmlBlob(planned.name);
  fs.writeFileSync(target, body, 'utf-8');
  logger.info(`Lloyd's sanity: downloaded blob XML to temp ${target} (${planned.name})`);
  return target;
}

/** Local `docs/lloyds/XMLs/<name>` or one-off download from `mulesoft-xml` for E2E-pinned file names. */
async function resolveLocalOrDownloadedXmlByFileName(fileName: string): Promise<string> {
  const docs = path.resolve(process.cwd(), 'docs/lloyds/XMLs', fileName);
  if (fs.existsSync(docs)) return docs;
  const client = LloydsBlobClient.create();
  const dir = path.join(os.tmpdir(), 'lloyds-cucumber-xml');
  fs.mkdirSync(dir, { recursive: true });
  const safe = fileName.replace(/[/\\?%*:|"<>]/g, '_');
  const target = path.join(dir, safe);
  const body = await client.downloadXmlBlob(fileName);
  fs.writeFileSync(target, body, 'utf-8');
  logger.info(`Lloyd's PP-392 E2E: downloaded blob XML to temp ${target} (${fileName})`);
  return target;
}

Given('the Lloyd\'s latest runnable blob for repository {string} from the sanity plan', async function (this: AutomationWorld, repoId: string) {
  const c = ctx(this);
  if (!c.plan) throw new Error('Sanity plan not loaded (Background step missing).');
  const planned = pickLatestPlannedRowForRepo(c.plan, repoId);
  const localXmlPath = await resolveLocalOrDownloadedXml(planned);
  c.pickedPlannedRow = planned;
  c.flavour = 'positive-plan';
  c.row = {
    name: planned.name,
    ledger: planned.ledger,
    repoId: planned.repoId,
    blobId: planned.blobUrl,
    localXmlPath,
  };
  logger.info(`Lloyd's sanity: repository ${repoId} → latest runnable blob ${planned.name}`);
});

/** Uses `LLOYDS_TEST_REPO_ID` / `LLOYDS_E2E_REPO_ID`, else US-60464 — id must be in the programme cohort (`lloydsClonedRepoCohort`). */
Given('the Lloyd\'s latest runnable blob for the configured test repository from the sanity plan', async function (this: AutomationWorld) {
  const repoId = resolveLloydsTestRepoId(process.env);
  const c = ctx(this);
  if (!c.plan) throw new Error('Sanity plan not loaded (Background step missing).');
  const planned = pickLatestPlannedRowForRepo(c.plan, repoId);
  const localXmlPath = await resolveLocalOrDownloadedXml(planned);
  c.pickedPlannedRow = planned;
  c.flavour = 'positive-plan';
  c.row = {
    name: planned.name,
    ledger: planned.ledger,
    repoId: planned.repoId,
    blobId: planned.blobUrl,
    localXmlPath,
  };
  logger.info(`Lloyd's sanity: configured test repository ${repoId} → latest runnable blob ${planned.name}`);
});

/** PP-392 / portable checks: use `sanity-plan.json` runnable[0] so tests survive plan refresh (no hard-coded repo). */
Given('the Lloyd\'s first runnable blob from the sanity plan', async function (this: AutomationWorld) {
  const c = ctx(this);
  if (!c.plan) throw new Error('Sanity plan not loaded (Background step missing).');
  const planned = pickPlannedRow(c.plan, { index: 0 });
  const localXmlPath = await resolveLocalOrDownloadedXml(planned);
  c.pickedPlannedRow = planned;
  c.flavour = 'positive-plan';
  c.row = {
    name: planned.name,
    ledger: planned.ledger,
    repoId: planned.repoId,
    blobId: planned.blobUrl,
    localXmlPath,
  };
  logger.info(`Lloyd's sanity: first runnable blob ${planned.name} (repo=${planned.repoId}, index=${planned.index})`);
});

Given('a Lloyd\'s blocked row with reason {string}', function (this: AutomationWorld, reason: string) {
  const c = ctx(this);
  if (!c.plan) throw new Error('Sanity plan not loaded (Background step missing).');
  if (
    reason !== 'REPO_NOT_IN_MASTER' &&
    reason !== 'LEDGER_NOT_IN_MASTER' &&
    reason !== 'BAD_FILE_NAME' &&
    reason !== 'NOT_IN_CLONED_COHORT'
  ) {
    throw new Error(
      `Unknown block reason "${reason}". Expected REPO_NOT_IN_MASTER | LEDGER_NOT_IN_MASTER | BAD_FILE_NAME | NOT_IN_CLONED_COHORT.`,
    );
  }
  const blocked = pickBlockedRow(c.plan, { reason: reason as BlockReason });
  const parsed = parseFileName(blocked.name);
  c.pickedBlockedRow = blocked;
  c.flavour = 'negative-blocked';
  c.row = {
    name: blocked.name,
    ledger: parsed?.ledger ?? 'UNKNOWN',
    repoId: parsed?.repoId ?? 'UNKNOWN',
    blobId: guessBlockedRowBlobUrl(blocked),
    localXmlPath: null,
  };
  logger.info(`Lloyd's sanity: selected blocked row "${blocked.name}" (${blocked.reason})`);
});

Given('a synthesised bad file name {string}', function (this: AutomationWorld, badName: string) {
  const c = ctx(this);
  c.badFileName = badName;
  c.flavour = 'negative-bad-file-name';
  const parsed = parseFileName(badName);
  const container = (process.env.LLOYDS_BLOB_CONTAINER_URL || 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml').replace(/\/+$/, '');
  c.row = {
    name: badName,
    ledger: parsed?.ledger ?? 'UNPARSEABLE',
    repoId: parsed?.repoId ?? 'UNPARSEABLE',
    blobId: `${container}/${badName}`,
    localXmlPath: null,
  };
  logger.info(`Lloyd's sanity: synthesised bad file name "${badName}"`);
});

Given('a fresh correlation id from the sanity counter', function (this: AutomationWorld) {
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected — run "the Lloyd\'s sanity row" step first.');
  const rowIndex = c.pickedPlannedRow?.index ?? c.pickedXlsxRow?.index ?? -1;
  const bump = bumpCounter({ xmlName: c.row.name, row: rowIndex, filePath: resolveCounterPath() });
  c.correlationId = bump.correlationId;
  logger.info(`Lloyd's sanity: correlation_id=${bump.correlationId} (counter file ${path.relative(process.cwd(), bump.filePath)})`);
});

/**
 * Snowflake E2E: use `_ACCEL_UNIQUE_RUN_ID` + WBX/WRX `file_name` from env (see `readPp392SnowflakeE2ePinFromEnv`).
 * Does **not** bump `sanity-counter.json`. Requires `LLOYDS_PP392_E2E_CORRELATION_ID` and `LLOYDS_PP392_E2E_FILE_NAME`.
 */
Given(
  'the Lloyd\'s PP-392 Snowflake E2E correlation and file name are pinned from the environment',
  async function (this: AutomationWorld) {
    const pin = readPp392SnowflakeE2ePinFromEnv();
    if (!pin) {
      throw new Error(
        'Snowflake E2E pin not configured. Set LLOYDS_PP392_E2E_CORRELATION_ID and LLOYDS_PP392_E2E_FILE_NAME ' +
          '(Snowflake _ACCEL_UNIQUE_RUN_ID + exact blob file name), or run scenarios without this step.',
      );
    }
    const parsed = parseFileName(pin.fileName);
    if (!parsed) throw new Error(`Internal: parseFileName failed for "${pin.fileName}"`);
    const c = ctx(this);
    const localXmlPath = await resolveLocalOrDownloadedXmlByFileName(pin.fileName);
    const blobId = buildBlobId(pin.fileName);
    c.correlationId = pin.correlationId;
    c.flavour = 'positive-plan';
    c.row = {
      name: pin.fileName,
      ledger: parsed.ledger,
      repoId: parsed.repoId,
      blobId,
      localXmlPath,
    };
    logger.info(
      `Lloyd's PP-392 Snowflake E2E: pinned correlation_id=${pin.correlationId} file_name=${pin.fileName} repo=${parsed.repoId}`,
    );
  },
);

// ---------------------------------------------------------------------------
// Send
// ---------------------------------------------------------------------------

const STUB_FINANCIAL_VALUES = {
  adp_currency: 'USD',
  adp_prm: 0,
  adp_com: 0,
  adp_coi: 0,
  adp_tax: 0,
  adp_oth: 0,
} as const;

async function sendMulePayloadViaSb(
  payload: MuleXmlGenerationSuccessPayload | MuleXmlGenerationFailedPayload,
  c: LloydsSanityContext,
): Promise<void> {
  const result = await sendMuleXmlGenerationMessage({
    payload,
    config: getServiceBusConfig(),
    creds: getServiceBusSpnCreds(),
    logger: (line) => logger.info(`[sb] ${line}`),
  });
  if (payload.message === 'mule-xml-generation-success') {
    c.lastPayload = payload;
  } else {
    c.lastFailedPayload = payload;
  }
  logger.info(`Lloyd's sanity: sent ${payload.message} correlation_id=${payload.correlation_id} at ${result.sentAt} (credential source: ${result.credentialSource})`);
}

When('I send {string} with deliberately mismatched ADP totals versus the blob XML', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') {
    throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  }
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  if (!c.row.localXmlPath) throw new Error('Selected row has no local XML — pick a plan row with committed XML.');
  c.flavour = 'negative-adp-mismatch';
  c.adpTotals = { ...STUB_FINANCIAL_VALUES };
  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: c.row.blobId,
    financialValues: c.adpTotals,
  });
  await sendMulePayloadViaSb(payload, c);
});

When('I send {string} with ADP totals from Snowflake summary per ISDE mapping', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') {
    throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  }
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  loadFinOpsSnowflakeEnv();
  const conn = await connectFinOpsSnowflake();
  try {
    const rows = await fetchLatestSummaryRowsForRepo(conn, c.row.repoId, 1);
    if (!rows.length) {
      throw new Error(
        `No ADP summary row in FOWD__AGENCY_POLICY_FO_SUMMARY_V1 for repository "${c.row.repoId}". ` +
          'Confirm SNOWFLAKE_* env and cohort membership (`docs/lloyds/ADP.sql`).',
      );
    }
    c.adpTotals = adpSummaryRowToMuleFinancialValues(rows[0]);
  } finally {
    await destroyConnection(conn);
  }
  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: c.row.blobId,
    financialValues: c.adpTotals,
  });
  await sendMulePayloadViaSb(payload, c);
});

When('I send {string} with ADP totals computed from the local XML', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') {
    throw new Error(`Row-1 sanity only supports "mule-xml-generation-success", got "${messageType}"`);
  }
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  if (!c.row.localXmlPath) throw new Error('Selected row has no local XML — can\'t compute ADP totals.');

  const totals = computeAdpTotalsFromFile(c.row.localXmlPath);
  if (totals.lineCount === 0) {
    throw new Error(`XML ${c.row.localXmlPath} has no <LEDGERJOURNALENTITY> lines`);
  }
  c.adpTotals = totalsToServiceBusPayload(totals);

  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: c.row.blobId,
    financialValues: c.adpTotals,
  });
  await sendMulePayloadViaSb(payload, c);
});

/**
 * PP-611 / Dev: `file_name` in the Service Bus JSON is not cross-checked against the blob; processing uses
 * `blob_id` to load XML. This step sends a **synthetic** `file_name` while keeping the real `blob_id` + ADP from XML.
 */
When(
  'I send {string} with ADP totals computed from the local XML but a deliberately wrong message file_name',
  async function (this: AutomationWorld, messageType: string) {
    if (messageType !== 'mule-xml-generation-success') {
      throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
    }
    const c = ctx(this);
    if (!c.row?.localXmlPath) throw new Error('No sanity row with local XML.');
    if (!c.correlationId) throw new Error('No correlation id set.');
    const totals = computeAdpTotalsFromFile(c.row.localXmlPath);
    if (totals.lineCount === 0) {
      throw new Error(`XML ${c.row.localXmlPath} has no <LEDGERJOURNALENTITY> lines`);
    }
    c.adpTotals = totalsToServiceBusPayload(totals);
    c.flavour = 'contract-pp611-mismatched-file-name';
    const syntheticFileName = `PP611_CONTRACT_WRONG_NAME_${Date.now()}.xml`;
    const payload = buildMuleXmlGenerationSuccessPayload({
      correlationId: c.correlationId,
      fileName: syntheticFileName,
      blobId: c.row.blobId,
      financialValues: c.adpTotals,
    });
    await sendMulePayloadViaSb(payload, c);
  },
);

When('I send {string} for the current row', async function (this: AutomationWorld, messageType: string) {
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  if (messageType === 'mule-xml-generation-failed') {
    c.flavour = 'negative-mule-failed';
    const payload = buildMuleXmlGenerationFailedPayload({
      correlationId: c.correlationId,
      fileName: c.row.name,
    });
    await sendMulePayloadViaSb(payload, c);
    return;
  }
  throw new Error(`Unsupported message type for this step: "${messageType}" (expected mule-xml-generation-failed)`);
});

When('I send {string} for that blocked row with stub totals', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') {
    throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  }
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: c.row.blobId,
    financialValues: { ...STUB_FINANCIAL_VALUES },
  });
  await sendMulePayloadViaSb(payload, c);
});

When('I send {string} with a blob_id pointing at the wrong container', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  const c = ctx(this);
  if (!c.row) throw new Error('No sanity row selected.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  const wrongContainerBase = (process.env.LLOYDS_NEGATIVE_BLOB_CONTAINER_URL
    || 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml').replace(/\/+$/, '');
  c.flavour = 'negative-blob-missing';
  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: `${wrongContainerBase}/${c.row.name}`,
    financialValues: { ...STUB_FINANCIAL_VALUES },
  });
  await sendMulePayloadViaSb(payload, c);
});

When('I send {string} with that bad file name', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  const c = ctx(this);
  if (!c.row) throw new Error('No bad file name context.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: c.row.blobId,
    financialValues: { ...STUB_FINANCIAL_VALUES },
  });
  await sendMulePayloadViaSb(payload, c);
});

When('I send the same {string} payload again with the same correlation id', async function (this: AutomationWorld, messageType: string) {
  if (messageType !== 'mule-xml-generation-success') throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  const c = ctx(this);
  if (!c.lastPayload) throw new Error('No previous payload captured; idempotency step must follow a send step.');
  await sendMulePayloadViaSb(c.lastPayload, c);
});

// ---------------------------------------------------------------------------
// Assert
// ---------------------------------------------------------------------------

Then('within {int} seconds the Lloyd\'s XML File record should exist for that correlation id', async function (this: AutomationWorld, seconds: number) {
  const c = ctx(this);
  if (!c.correlationId) throw new Error('No correlation id to poll for.');
  if (!this.apiContext) throw new Error('world.apiContext is not initialised; ensure the API Before hook has run.');

  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  try {
    const record = await client.waitForByCorrelationId({
      correlationId: c.correlationId,
      timeoutMs: seconds * 1000,
      onAttempt: (attempt, elapsed) => {
        if (attempt === 1 || attempt % 5 === 0) {
          logger.info(`[poll] attempt ${attempt} (elapsed ${elapsed}ms)`);
        }
      },
    });
    c.record = record;
    logger.info(`Lloyd's sanity: record ${record.workflowId} (${record.name}) found`);
  } finally {
    await client.dispose();
  }
});

Then('within {int} seconds the record should reach Dataverse statuscode {int}', async function (this: AutomationWorld, seconds: number, code: number) {
  const c = ctx(this);
  if (!c.correlationId) throw new Error('No correlation id to poll for.');
  if (!this.apiContext) throw new Error('world.apiContext is not initialised; ensure the API Before hook has run.');

  const label =
    code === STATUSCODE_READY_TO_SHIP_TO_DYNAMICS
      ? 'Ready to Ship to Dynamics'
      : (STATUSCODE_LABELS[code] ?? String(code));
  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  try {
    const record = await client.waitUntilStatusCodeByCorrelationId({
      correlationId: c.correlationId,
      targetStatusCode: code,
      timeoutMs: seconds * 1000,
      pollIntervalMs: 5_000,
      onAttempt: (attempt, elapsed, lastStatus) => {
        if (attempt === 1 || attempt % 4 === 0) {
          logger.info(
            `[status poll] attempt ${attempt} (elapsed ${elapsed}ms) last statuscode=${lastStatus ?? 'none'} → target ${code} (${label})`,
          );
        }
      },
    });
    c.record = record;
    logger.info(`Lloyd's sanity: statuscode=${record.statuscode} (${label}) for ${record.workflowId}`);
  } finally {
    await client.dispose();
  }
});

Then('the record\'s statuscode should be {int}', function (this: AutomationWorld, expected: number) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  if (r.statuscode !== expected) {
    throw new Error(
      `Expected statuscode ${expected} (${STATUSCODE_LABELS[expected] ?? 'unknown'}) but got ${r.statuscode} (${r.statuscode !== null ? STATUSCODE_LABELS[r.statuscode] ?? 'unknown' : 'null'}).`,
    );
  }
});

Then('the record\'s statuscode should be a happy-path value', function (this: AutomationWorld) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  if (r.statuscode === null || !HAPPY_PATH_STATUSCODES.includes(r.statuscode)) {
    const allowed = HAPPY_PATH_STATUSCODES.map((s) => `${s} (${STATUSCODE_LABELS[s]})`).join(' or ');
    throw new Error(`Expected statuscode in {${allowed}} but got ${r.statuscode}.`);
  }
});

Then('the record\'s overall_match should be true', function (this: AutomationWorld) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  if (r.overallMatch !== true) {
    throw new Error(`Expected accelins_overall_match=true but got ${r.overallMatch} — func-xml-totals compared ADP vs XML totals and found a mismatch.`);
  }
});

Then('within {int} seconds the record\'s overall_match should become false', async function (this: AutomationWorld, seconds: number) {
  const c = ctx(this);
  if (!c.correlationId) throw new Error('No correlation id set.');
  if (!this.apiContext) throw new Error('world.apiContext is not initialised.');
  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  const deadline = Date.now() + seconds * 1000;
  const pollMs = 5_000;
  let attempt = 0;
  try {
    while (Date.now() < deadline) {
      attempt += 1;
      const r = await client.findByCorrelationId(c.correlationId);
      if (r && r.overallMatch === false) {
        c.record = r;
        logger.info(`Lloyd's sanity: overall_match=false after ${attempt} poll(s) for ${c.correlationId}`);
        return;
      }
      if (attempt === 1 || attempt % 3 === 0) {
        logger.info(
          `[overall_match poll] attempt ${attempt} record=${r ? 'yes' : 'no'} overall_match=${r?.overallMatch ?? 'n/a'}`,
        );
      }
      await sleep(pollMs);
    }
    const last = await client.findByCorrelationId(c.correlationId);
    throw new Error(
      `Timed out after ${seconds}s waiting for accelins_overall_match=false on correlation_id=${c.correlationId}. ` +
        `Last state: record=${last ? 'exists' : 'missing'}, overall_match=${last?.overallMatch ?? 'n/a'}.`,
    );
  } finally {
    await client.dispose();
  }
});

Then('the record should have a Repository File lookup resolved', function (this: AutomationWorld) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  if (!r.repositoryFileId) {
    throw new Error(
      `Repository File lookup was not resolved (null). fa-xmltotals could not match the file_name prefix '${ctx(this).row?.repoId}' to an accelins_repositoryfile master record.`,
    );
  }
});

Then('within {int} seconds no Lloyd\'s XML File record should exist for that correlation id', async function (this: AutomationWorld, seconds: number) {
  const c = ctx(this);
  if (!c.correlationId) throw new Error('No correlation id to poll for.');
  if (!this.apiContext) throw new Error('world.apiContext is not initialised; ensure the API Before hook has run.');
  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  try {
    await client.waitForNoRecordByCorrelationId({
      correlationId: c.correlationId,
      timeoutMs: seconds * 1000,
      pollIntervalMs: 5_000,
      onAttempt: (attempt, elapsed) => {
        if (attempt === 1 || attempt % 3 === 0) {
          logger.info(`[poll] attempt ${attempt} (elapsed ${elapsed}ms) — still absent`);
        }
      },
    });
    logger.info(`Lloyd's sanity negative: no record appeared for correlation_id=${c.correlationId} (PASS).`);
  } finally {
    await client.dispose();
  }
});

Then('exactly {int} Lloyd\'s XML File record should exist for that correlation id', async function (this: AutomationWorld, expected: number) {
  const c = ctx(this);
  if (!c.correlationId) throw new Error('No correlation id set.');
  if (!this.apiContext) throw new Error('world.apiContext is not initialised.');
  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  try {
    const count = await client.countByCorrelationId(c.correlationId);
    if (count !== expected) {
      throw new Error(
        `Expected exactly ${expected} record(s) for correlation_id=${c.correlationId} but found ${count}. ` +
          `func-xml-totals was expected to be idempotent on (correlationId, messageType).`,
      );
    }
    logger.info(`Idempotency assertion: ${count} record(s) for ${c.correlationId} (expected ${expected}).`);
  } finally {
    await client.dispose();
  }
});

Then('the record\'s workflow totals should match the payload within ABS tolerance {int}', function (this: AutomationWorld, tolerance: number) {
  const c = ctx(this);
  const r = c.record;
  const sent = c.adpTotals;
  if (!r || !sent) throw new Error('Missing record or sent-payload context.');
  const checks: Array<{ label: string; expected: number; actual: number | null }> = [
    { label: 'prm', expected: sent.adp_prm, actual: r.odsPrm },
    { label: 'com', expected: sent.adp_com, actual: r.odsCom },
    { label: 'coi', expected: sent.adp_coi, actual: r.odsCoi },
    { label: 'tax', expected: sent.adp_tax, actual: r.odsTax },
    { label: 'oth', expected: sent.adp_oth, actual: r.odsOth },
  ];
  const diffs: string[] = [];
  for (const c2 of checks) {
    if (c2.actual === null) {
      diffs.push(`${c2.label}: record value was null`);
      continue;
    }
    const delta = Math.abs(c2.expected - c2.actual);
    if (delta > tolerance) {
      diffs.push(`${c2.label}: expected ${c2.expected}, got ${c2.actual} (|Δ|=${delta} > ${tolerance})`);
    }
  }
  if (r.odsCurrency !== sent.adp_currency) {
    diffs.push(`currency: expected ${sent.adp_currency}, got ${r.odsCurrency}`);
  }
  if (diffs.length > 0) {
    throw new Error(`Dataverse workflow totals mismatch:\n  - ${diffs.join('\n  - ')}`);
  }
});

When('I send {string} with ADP totals offset from the local XML by {int} on each metric', async function (this: AutomationWorld, messageType: string, delta: number) {
  if (messageType !== 'mule-xml-generation-success') {
    throw new Error(`Expected mule-xml-generation-success, got "${messageType}"`);
  }
  const c = ctx(this);
  if (!c.row?.localXmlPath) throw new Error('No sanity row with local XML.');
  if (!c.correlationId) throw new Error('No correlation id set.');
  const base = computeAdpTotalsFromFile(c.row.localXmlPath);
  const bumped: AdpTotals = {
    ...base,
    prm: base.prm + delta,
    com: base.com + delta,
    coi: base.coi + delta,
    tax: base.tax + delta,
    oth: base.oth + delta,
  };
  c.adpTotals = totalsToServiceBusPayload(bumped);
  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId: c.correlationId,
    fileName: c.row.name,
    blobId: c.row.blobId,
    financialValues: c.adpTotals,
  });
  await sendMulePayloadViaSb(payload, c);
});

function normaliseCorrelationIdForCompare(value: string | null | undefined): string {
  return (value ?? '').replace(/[{}]/g, '').trim().toLowerCase();
}

Then('the record\'s correlation id should match the sent correlation id', function (this: AutomationWorld) {
  const c = ctx(this);
  const r = c.record;
  if (!r || !c.correlationId) throw new Error('Missing record or correlation id.');
  const want = normaliseCorrelationIdForCompare(c.correlationId);
  const got = normaliseCorrelationIdForCompare(r.correlationId);
  if (got !== want) {
    throw new Error(`Expected correlation_id ${want}, got ${got} (raw: ${r.correlationId})`);
  }
});

Then('the record\'s blob id should include the sanity row file name', function (this: AutomationWorld) {
  const c = ctx(this);
  const r = c.record;
  if (!r || !c.row) throw new Error('Missing record or row context.');
  if (!r.blobId || !r.blobId.includes(c.row.name)) {
    throw new Error(`Expected blob_id to include file name "${c.row.name}", got ${r.blobId}`);
  }
});

Then('the record\'s XML financial summary fields should be populated', function (this: AutomationWorld) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  const fields: Array<{ label: string; v: number | null }> = [
    { label: 'xmlPrm', v: r.xmlPrm },
    { label: 'xmlCom', v: r.xmlCom },
    { label: 'xmlCoi', v: r.xmlCoi },
    { label: 'xmlTax', v: r.xmlTax },
    { label: 'xmlOth', v: r.xmlOth },
  ];
  const missing = fields.filter((f) => f.v === null).map((f) => f.label);
  if (!r.xmlCurrency) missing.push('xmlCurrency');
  if (missing.length > 0) {
    throw new Error(`XML summary fields not populated: ${missing.join(', ')}`);
  }
});

Then('the record\'s process path should indicate ADP', function (this: AutomationWorld) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  if (r.processPath !== true) {
    throw new Error(`Expected accelins_process_path (ADP) to be true, got ${r.processPath}`);
  }
});

Then('all per-metric match toggles on the record should be true', function (this: AutomationWorld) {
  const m = ctx(this).record?.matches;
  if (!m) throw new Error('No record or match toggles.');
  const pairs: Array<[string, boolean | null]> = [
    ['currency', m.currency],
    ['prm', m.prm],
    ['com', m.com],
    ['coi', m.coi],
    ['tax', m.tax],
    ['oth', m.oth],
  ];
  const bad = pairs.filter(([, v]) => v !== true).map(([k]) => k);
  if (bad.length > 0) {
    throw new Error(`Expected all match toggles true; false or null: ${bad.join(', ')}`);
  }
});

Then(
  'the record\'s XML totals should match ADP totals computed from the local XML within ABS tolerance {int}',
  function (this: AutomationWorld, tolerance: number) {
    const c = ctx(this);
    const r = c.record;
    if (!r || !c.row?.localXmlPath) throw new Error('Missing record or local XML path.');
    const t = computeAdpTotalsFromFile(c.row.localXmlPath);
    const checks: Array<{ label: string; expected: number; actual: number | null }> = [
      { label: 'prm', expected: t.prm, actual: r.xmlPrm },
      { label: 'com', expected: t.com, actual: r.xmlCom },
      { label: 'coi', expected: t.coi, actual: r.xmlCoi },
      { label: 'tax', expected: t.tax, actual: r.xmlTax },
      { label: 'oth', expected: t.oth, actual: r.xmlOth },
    ];
    const diffs: string[] = [];
    for (const row of checks) {
      if (row.actual === null) {
        diffs.push(`${row.label}: xml field was null`);
        continue;
      }
      if (Math.abs(row.expected - row.actual) > tolerance) {
        diffs.push(
          `${row.label}: XML from blob ${row.actual} vs local compute ${row.expected} (|Δ| > ${tolerance})`,
        );
      }
    }
    if (r.xmlCurrency !== t.currency) {
      diffs.push(`currency: expected ${t.currency}, got ${r.xmlCurrency}`);
    }
    if (diffs.length > 0) {
      throw new Error(`XML totals vs local XML compute:\n  - ${diffs.join('\n  - ')}`);
    }
  },
);

Then(
  'the record\'s XML totals should match workflow totals on the record within ABS tolerance {int}',
  function (this: AutomationWorld, tolerance: number) {
    const r = ctx(this).record;
    if (!r) throw new Error('No record retrieved.');
    const checks: Array<{ label: string; a: number | null; b: number | null }> = [
      { label: 'prm', a: r.xmlPrm, b: r.odsPrm },
      { label: 'com', a: r.xmlCom, b: r.odsCom },
      { label: 'coi', a: r.xmlCoi, b: r.odsCoi },
      { label: 'tax', a: r.xmlTax, b: r.odsTax },
      { label: 'oth', a: r.xmlOth, b: r.odsOth },
    ];
    const diffs: string[] = [];
    for (const row of checks) {
      if (row.a === null || row.b === null) {
        diffs.push(`${row.label}: null xml=${row.a} workflow=${row.b}`);
        continue;
      }
      if (Math.abs(row.a - row.b) > tolerance) {
        diffs.push(`${row.label}: xml ${row.a} vs workflow ${row.b} (|Δ| > ${tolerance})`);
      }
    }
    if (diffs.length > 0) {
      throw new Error(`XML vs workflow on record:\n  - ${diffs.join('\n  - ')}`);
    }
  },
);

Then('the record\'s dimension validation error should be null or empty', function (this: AutomationWorld) {
  const r = ctx(this).record;
  if (!r) throw new Error('No record retrieved.');
  const err = r.dimensionValidationError;
  if (err !== null && err.length > 0) {
    throw new Error(`Expected empty dimension validation error, got "${err.slice(0, 500)}"`);
  }
});

/**
 * PP-392 — Dataverse columns the XML File / Ops UI binds to (totals reconciliation + status),
 * without Playwright. Used when straight-through must **not** advance to Ready to Ship.
 */
Then(
  'within {int} seconds the record should not reach Dataverse statuscode {int}',
  async function (this: AutomationWorld, seconds: number, forbiddenCode: number) {
    const c = ctx(this);
    if (!c.correlationId) throw new Error('No correlation id set.');
    if (!this.apiContext) throw new Error('world.apiContext is not initialised.');
    const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
    const deadline = Date.now() + seconds * 1000;
    const pollMs = 5_000;
    let attempt = 0;
    try {
      while (Date.now() < deadline) {
        attempt += 1;
        const r = await client.findByCorrelationId(c.correlationId);
        if (r?.statuscode === forbiddenCode) {
          const label = STATUSCODE_LABELS[forbiddenCode] ?? String(forbiddenCode);
          throw new Error(
            `Expected record NOT to reach statuscode ${forbiddenCode} (${label}) for this blocked scenario, but it did (workflowId=${r.workflowId}).`,
          );
        }
        if (attempt === 1 || attempt % 4 === 0) {
          logger.info(
            `[PP-392 status guard] attempt ${attempt} last statuscode=${r?.statuscode ?? 'no record'} (must never become ${forbiddenCode})`,
          );
        }
        await sleep(pollMs);
      }
      logger.info(
        `PP-392: correlation_id=${c.correlationId} did not reach forbidden statuscode=${forbiddenCode} within ${seconds}s (PASS).`,
      );
    } finally {
      await client.dispose();
    }
  },
);

Then('at least one per-metric match toggle on the record should be false', function (this: AutomationWorld) {
  const m = ctx(this).record?.matches;
  if (!m) throw new Error('No record or match toggles on world.');
  const pairs: Array<[string, boolean | null]> = [
    ['currency', m.currency],
    ['prm', m.prm],
    ['com', m.com],
    ['coi', m.coi],
    ['tax', m.tax],
    ['oth', m.oth],
  ];
  if (!pairs.some(([, v]) => v === false)) {
    throw new Error(`Expected at least one false match toggle; got ${JSON.stringify(Object.fromEntries(pairs))}`);
  }
});

Then('all per-metric match toggles on the record should be false', function (this: AutomationWorld) {
  const m = ctx(this).record?.matches;
  if (!m) throw new Error('No record or match toggles on world.');
  const pairs: Array<[string, boolean | null]> = [
    ['currency', m.currency],
    ['prm', m.prm],
    ['com', m.com],
    ['coi', m.coi],
    ['tax', m.tax],
    ['oth', m.oth],
  ];
  const bad = pairs.filter(([, v]) => v !== false).map(([k, v]) => `${k}=${v}`);
  if (bad.length > 0) {
    throw new Error(`Expected every match toggle false; non-false: ${bad.join(', ')}`);
  }
});

/** Stubs often keep currency aligned while monetary ADP fields disagree with XML. */
Then('all monetary per-metric match toggles on the record should be false', function (this: AutomationWorld) {
  const m = ctx(this).record?.matches;
  if (!m) throw new Error('No record or match toggles on world.');
  const pairs: Array<[string, boolean | null]> = [
    ['prm', m.prm],
    ['com', m.com],
    ['coi', m.coi],
    ['tax', m.tax],
    ['oth', m.oth],
  ];
  const bad = pairs.filter(([, v]) => v !== false).map(([k, v]) => `${k}=${v}`);
  if (bad.length > 0) {
    throw new Error(`Expected prm/com/coi/tax/oth match toggles all false; non-false: ${bad.join(', ')}`);
  }
});

Then('the PP-392 observability evidence step is satisfied', function (this: AutomationWorld) {
  void this;
  logger.info(
    'PP-392: observability evidence — assertions used Dataverse XML File columns (same source as Ops / Power Apps form).',
  );
});

function isLloydsHopPostStage1Enabled(): boolean {
  const v = process.env.LLOYDS_HOP_POST_STAGE1_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function resolveLloydsStatusCodeByLabel(labelRaw: string): number {
  const label = labelRaw.trim().toLowerCase();
  const direct: Record<string, number> = {
    'approved': STATUSCODE_APPROVED,
    'ready to ship to dynamics': STATUSCODE_READY_TO_SHIP_TO_DYNAMICS,
  };
  if (direct[label] !== undefined) return direct[label];

  const envMap: Record<string, string | undefined> = {
    'shipped to dynamics': process.env.LLOYDS_STATUSCODE_SHIPPED_TO_DYNAMICS,
    'ready to post to dynamics': process.env.LLOYDS_STATUSCODE_READY_TO_POST_TO_DYNAMICS,
    'failed to ship to dynamics': process.env.LLOYDS_STATUSCODE_FAILED_TO_SHIP_TO_DYNAMICS,
    'failed to import to dynamics': process.env.LLOYDS_STATUSCODE_FAILED_TO_IMPORT_TO_DYNAMICS,
    'posted to dynamics': process.env.LLOYDS_STATUSCODE_POSTED_TO_DYNAMICS,
    'journal posted': process.env.LLOYDS_STATUSCODE_POSTED_TO_DYNAMICS,
  };
  const envVal = envMap[label];
  if (!envVal) {
    throw new Error(
      `No statuscode mapping for "${labelRaw}". Set a Lloyd's statuscode env var (for example ` +
        '`LLOYDS_STATUSCODE_SHIPPED_TO_DYNAMICS`, `LLOYDS_STATUSCODE_READY_TO_POST_TO_DYNAMICS`, ' +
        '`LLOYDS_STATUSCODE_FAILED_TO_SHIP_TO_DYNAMICS`, `LLOYDS_STATUSCODE_FAILED_TO_IMPORT_TO_DYNAMICS`, ' +
        '`LLOYDS_STATUSCODE_POSTED_TO_DYNAMICS`).',
    );
  }
  const parsed = Number(envVal);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric statuscode env value for "${labelRaw}": ${envVal}`);
  }
  return parsed;
}

When(
  'I publish dv-xml-approval-success to Lloyd\'s Service Bus queue {string} for the current correlation and file name',
  async function (this: AutomationWorld, queue: string) {
    if (!isLloydsHopPostStage1Enabled()) {
      logger.warn('Skipping Stage 2 SB publish — set LLOYDS_HOP_POST_STAGE1_ENABLED=1 to enable.');
      return 'skipped';
    }
    const c = ctx(this);
    if (!c.correlationId || !c.row?.name) {
      throw new Error('Missing correlation_id or file_name — complete Stage 1 send steps first.');
    }
    const body = buildDvXmlApprovalSuccessPayload({ correlationId: c.correlationId, fileName: c.row.name });
    await sendLloydsServiceBusJsonMessage({ queueName: queue.trim(), body });
    logger.info(`Lloyd's hop: dv-xml-approval-success → queue "${queue}" correlation=${c.correlationId}`);
  },
);

When(
  'I publish mule-xml-submission-success to Lloyd\'s Service Bus queue {string} for the current correlation and file name',
  async function (this: AutomationWorld, queue: string) {
    if (!isLloydsHopPostStage1Enabled()) {
      logger.warn('Skipping Stage 3 SB publish — set LLOYDS_HOP_POST_STAGE1_ENABLED=1 to enable.');
      return 'skipped';
    }
    const c = ctx(this);
    if (!c.correlationId || !c.row?.name) {
      throw new Error('Missing correlation_id or file_name — complete Stage 1 send steps first.');
    }
    const body = buildMuleXmlSubmissionSuccessPayload({
      correlationId: c.correlationId,
      fileName: c.row.name,
      blobId: c.row.blobId,
    });
    await sendLloydsServiceBusJsonMessage({ queueName: queue.trim(), body });
    logger.info(`Lloyd's hop: mule-xml-submission-success → queue "${queue}" correlation=${c.correlationId}`);
  },
);

When(
  'I publish Lloyd\'s mule-d365-import message {string} for the current correlation and file name',
  async function (this: AutomationWorld, messageType: string) {
    const c = ctx(this);
    if (!c.correlationId || !c.row?.name) {
      throw new Error('Missing correlation_id or file_name — complete Stage 1 send steps first.');
    }
    const allowed = new Set([
      'mule-xml-submission-success',
      'mule-xml-submission-failed',
      'mule-dmf-import-success',
      'mule-dmf-import-failed',
      'mule-dmf-processing-success',
      'mule-dmf-processing-failed',
    ]);
    const message = messageType.trim();
    if (!allowed.has(message)) {
      throw new Error(`Unsupported mule-d365-import message "${messageType}".`);
    }
    const body = buildMuleD365ImportStatusPayload({
      message: message as
        | 'mule-xml-submission-success'
        | 'mule-xml-submission-failed'
        | 'mule-dmf-import-success'
        | 'mule-dmf-import-failed'
        | 'mule-dmf-processing-success'
        | 'mule-dmf-processing-failed',
      correlationId: c.correlationId,
      fileName: c.row.name,
      blobId: c.row.blobId,
    });
    await sendLloydsServiceBusJsonMessage({ queueName: 'mule-d365-import', body });
    logger.info(`Lloyd's hop: ${message} → queue "mule-d365-import" correlation=${c.correlationId}`);
  },
);

Then(
  'within {int} seconds the record should reach Dataverse statuscode for Lloyd\'s label {string}',
  async function (this: AutomationWorld, seconds: number, label: string) {
    const code = resolveLloydsStatusCodeByLabel(label);
    const c = ctx(this);
    if (!c.correlationId) throw new Error('No correlation id to poll for.');
    if (!this.apiContext) throw new Error('world.apiContext is not initialised; ensure the API Before hook has run.');
    const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
    try {
      const record = await client.waitUntilStatusCodeByCorrelationId({
        correlationId: c.correlationId,
        targetStatusCode: code,
        timeoutMs: seconds * 1000,
        pollIntervalMs: 5_000,
      });
      c.record = record;
      logger.info(`Lloyd's status assertion: "${label}" → ${code} reached for ${record.workflowId}`);
    } finally {
      await client.dispose();
    }
  },
);

Then(
  'within {int} seconds the record should reach any Lloyd\'s Dataverse status labels {string}',
  async function (this: AutomationWorld, seconds: number, labelsCsv: string) {
    const parts = labelsCsv
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Provide at least one status label (comma-separated), e.g. Approved, Ready to Ship to Dynamics.');
    }
    const codes = [...new Set(parts.map((p) => resolveLloydsStatusCodeByLabel(p)))];
    const c = ctx(this);
    if (!c.correlationId) throw new Error('No correlation id to poll for.');
    if (!this.apiContext) throw new Error('world.apiContext is not initialised; ensure the API Before hook has run.');
    const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
    try {
      const record = await client.waitUntilAnyStatusCodeByCorrelationId({
        correlationId: c.correlationId,
        targetStatusCodes: codes,
        timeoutMs: seconds * 1000,
        pollIntervalMs: 5_000,
      });
      c.record = record;
      logger.info(
        `Lloyd's status assertion (any of): [${parts.join(' | ')}] → codes [${codes.join(', ')}] reached for ${record.workflowId}`,
      );
    } finally {
      await client.dispose();
    }
  },
);

Then(
  'within {int} seconds the record should not reach Dataverse statuscode for Lloyd\'s label {string}',
  async function (this: AutomationWorld, seconds: number, label: string) {
    const code = resolveLloydsStatusCodeByLabel(label);
    const c = ctx(this);
    if (!c.correlationId) throw new Error('No correlation id set.');
    if (!this.apiContext) throw new Error('world.apiContext is not initialised.');
    const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
    const deadline = Date.now() + seconds * 1000;
    try {
      while (Date.now() < deadline) {
        const row = await client.findByCorrelationId(c.correlationId);
        if (row?.statuscode === code) {
          throw new Error(`Unexpected statuscode ${code} ("${label}") for correlation_id=${c.correlationId}.`);
        }
        await sleep(5_000);
      }
      logger.info(`Lloyd's status guard: "${label}" (${code}) was not reached within ${seconds}s.`);
    } finally {
      await client.dispose();
    }
  },
);
