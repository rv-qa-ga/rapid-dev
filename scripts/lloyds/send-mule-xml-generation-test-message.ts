#!/usr/bin/env ts-node
/**
 * Send a `mule-xml-generation-*` message to the Lloyd's Service Bus (`mule-xml-generation`
 * queue) and (optionally) wait for the resulting `accelins_workflow` ("XML File") record to
 * appear in Dataverse. Reuses the framework's Service Bus + Dynamics helpers.
 *
 * Two modes:
 *
 *   1. Legacy smoke (no flags, or only `--dry-run` / `--failed`):
 *      Sends a synthetic payload with a random UUID correlation_id and a made-up file name.
 *      Exists only to prove Service Bus connectivity.
 *
 *   2. Sanity (via `--from-xlsx` or `--row-index` / `--row-name`):
 *      Picks one row from `docs/lloyds/XMLs/XML-URL.xlsx`, computes ADP totals from the
 *      local copy of the same XML, bumps the committed correlation-id counter in
 *      `src/features/lloyds/test-data/sanity-counter.json`, sends the message, and can
 *      optionally poll Dataverse for the created record.
 *
 * Prerequisites:
 *   - SPN with **Azure Service Bus Data Sender** on the Lloyd's namespace.
 *   - For `--wait-for-dataverse`: valid `D365_*` env vars pointing at
 *     `https://accelinsqatest.crm11.dynamics.com` (the Lloyd's Power Platform env).
 *
 * Usage examples:
 *   npx ts-node scripts/lloyds/send-mule-xml-generation-test-message.ts --dry-run
 *   npx ts-node scripts/lloyds/send-mule-xml-generation-test-message.ts
 *   npx ts-node scripts/lloyds/send-mule-xml-generation-test-message.ts --from-xlsx docs/lloyds/XMLs/XML-URL.xlsx
 *   npm run lloyds:sanity:send-xml -- --row-name "AEUM US-58338 202604091630.xml" --wait-for-dataverse
 *   npm run lloyds:sanity:send-xml -- --row-index 1 --dry-run
 *
 * Confluence (message contract & samples):
 *   https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages#Sample-messages
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import {
  buildMuleXmlGenerationFailedPayload,
  buildMuleXmlGenerationSuccessPayload,
  getServiceBusConfig,
  getServiceBusSpnCreds,
  sendMuleXmlGenerationMessage,
} from '../../src/integrations/lloyds/serviceBusSender';
import {
  computeAdpTotalsFromFile,
  totalsToServiceBusPayload,
} from '../../src/integrations/lloyds/xmlTotals';
import {
  DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH,
  ensureLocalXmlExists,
  loadSanityRows,
  pickRow,
  SanityRow,
} from '../../src/integrations/lloyds/sanityTestDataLoader';
import {
  bumpCounter,
  peekNextCorrelationId,
  readCounter,
  resolveCounterPath,
} from '../../src/integrations/lloyds/correlationIdCounter';
import {
  DEFAULT_LLOYDS_BLOB_CONTAINER_BASE_URL,
} from '../../src/integrations/lloyds/xmlFileName';
import {
  guessBlockedRowBlobUrl,
  pickBlockedRow,
  pickPlannedRow,
  readSanityPlan,
  resolvePlanPath,
  planAgeInDays,
  type BlockReason,
  type BlockedRow,
  type PlannedRow,
  type SanityPlan,
} from '../../src/integrations/lloyds/sanityPlanner';
import {
  buildFileName,
  parseFileName,
} from '../../src/integrations/lloyds/xmlFileName';
import {
  HAPPY_PATH_STATUSCODES,
  STATUSCODE_LABELS,
  XmlFileRecordClient,
} from '../../src/integrations/lloyds/xmlFileRecordClient';

// ---------------------------------------------------------------------------
// Env loading — same preference chain the framework uses elsewhere.
// ---------------------------------------------------------------------------

const envPaths = [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), envPath)}\n`);
    break;
  }
}

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

interface Args {
  dryRun: boolean;
  failed: boolean;
  fromXlsx?: string;
  fromPlan: boolean;       // explicit opt-in via --from-plan
  forceXlsx: boolean;      // explicit opt-in via --from-xlsx (disables auto-plan)
  rowIndex?: number;
  rowName?: string;
  correlationId?: string;
  noBump: boolean;
  noSend: boolean;
  waitForDataverse: boolean;
  dataverseTimeoutMs: number;
  containerBaseUrl?: string;
  planMaxAgeDays: number;
  // Negative-scenario selectors (mutually exclusive with the positive row selectors).
  blockedIndex?: number;
  blockedName?: string;
  blockedReason?: BlockReason;
  blobMissing: boolean;
  badFileName?: string;
  // Per-metric totals overrides (tolerance / currency-mismatch scenarios).
  // Absolute override (null = no override; value = use this exactly).
  adpPrm?: number;
  adpCom?: number;
  adpCoi?: number;
  adpTax?: number;
  adpOth?: number;
  // Delta override: apply (+/-)delta to whatever the local XML computes.
  adpPrmDelta?: number;
  adpComDelta?: number;
  adpCoiDelta?: number;
  adpTaxDelta?: number;
  adpOthDelta?: number;
  adpCurrency?: string;
  // Message-type override for failure-path scenarios.
  messageType?: string;
  asFailed: boolean;
  // Verify-side assertion flavour.
  expectNoRecord: boolean;
  noRecordPollSeconds: number;
  expectMatch?: string[];      // metrics that must have match=true
  expectMismatch?: string[];   // metrics that must have match=false
  expectOverallMatch?: boolean;
  expectFailedState: boolean;
  help: boolean;
}

/** Metrics recognised by the per-metric override + assertion flags. */
const METRIC_KEYS = ['prm', 'com', 'coi', 'tax', 'oth', 'currency'] as const;
type MetricKey = typeof METRIC_KEYS[number];
function parseMetricCsv(raw: string, flagName: string): MetricKey[] {
  const out: MetricKey[] = [];
  for (const p of raw.split(',').map((s) => s.trim().toLowerCase())) {
    if (!p) continue;
    if (!(METRIC_KEYS as readonly string[]).includes(p)) {
      throw new Error(`${flagName}: "${p}" is not a known metric. Allowed: ${METRIC_KEYS.join(', ')}`);
    }
    out.push(p as MetricKey);
  }
  return out;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    failed: false,
    fromPlan: false,
    forceXlsx: false,
    noBump: false,
    noSend: false,
    waitForDataverse: false,
    dataverseTimeoutMs: 120_000,
    planMaxAgeDays: 14,
    blobMissing: false,
    asFailed: false,
    expectNoRecord: false,
    noRecordPollSeconds: 60,
    expectFailedState: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run': args.dryRun = true; break;
      case '--failed': args.failed = true; break;
      case '--no-bump': args.noBump = true; break;
      case '--no-send':
      case '--poll-only':
        args.noSend = true; break;
      case '--wait-for-dataverse': args.waitForDataverse = true; break;
      case '--from-plan': args.fromPlan = true; break;
      case '--help':
      case '-h':
        args.help = true; break;
      case '--from-xlsx':
        // Flag with optional value. If next token is a path, consume it; otherwise flag-only.
        args.forceXlsx = true;
        if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.fromXlsx = argv[++i];
        break;
      case '--row-index': args.rowIndex = Number(argv[++i]); break;
      case '--row-name': args.rowName = argv[++i]; break;
      case '--correlation-id': args.correlationId = argv[++i]; break;
      case '--timeout-ms': args.dataverseTimeoutMs = Number(argv[++i]); break;
      case '--container-base-url': args.containerBaseUrl = argv[++i]; break;
      case '--plan-max-age-days': args.planMaxAgeDays = Number(argv[++i]); break;
      case '--blocked-index': args.blockedIndex = Number(argv[++i]); break;
      case '--blocked-name': args.blockedName = argv[++i]; break;
      case '--blocked-reason': {
        const v = argv[++i];
        if (
          v !== 'REPO_NOT_IN_MASTER' &&
          v !== 'LEDGER_NOT_IN_MASTER' &&
          v !== 'BAD_FILE_NAME' &&
          v !== 'NOT_IN_CLONED_COHORT'
        ) {
          throw new Error(
            `--blocked-reason must be REPO_NOT_IN_MASTER, LEDGER_NOT_IN_MASTER, BAD_FILE_NAME, or NOT_IN_CLONED_COHORT (got "${v}")`,
          );
        }
        args.blockedReason = v as BlockReason;
        break;
      }
      case '--blob-missing': args.blobMissing = true; break;
      case '--bad-file-name': args.badFileName = argv[++i]; break;
      case '--expect-no-record': args.expectNoRecord = true; break;
      case '--no-record-poll-seconds': args.noRecordPollSeconds = Number(argv[++i]); break;
      // --- per-metric totals overrides (absolute) ---
      case '--adp-prm': args.adpPrm = Number(argv[++i]); break;
      case '--adp-com': args.adpCom = Number(argv[++i]); break;
      case '--adp-coi': args.adpCoi = Number(argv[++i]); break;
      case '--adp-tax': args.adpTax = Number(argv[++i]); break;
      case '--adp-oth': args.adpOth = Number(argv[++i]); break;
      case '--adp-currency': args.adpCurrency = argv[++i]; break;
      // --- per-metric deltas (added to whatever the local XML computes) ---
      case '--adp-prm-delta': args.adpPrmDelta = Number(argv[++i]); break;
      case '--adp-com-delta': args.adpComDelta = Number(argv[++i]); break;
      case '--adp-coi-delta': args.adpCoiDelta = Number(argv[++i]); break;
      case '--adp-tax-delta': args.adpTaxDelta = Number(argv[++i]); break;
      case '--adp-oth-delta': args.adpOthDelta = Number(argv[++i]); break;
      // --- message-type override ---
      case '--message-type': args.messageType = argv[++i]; break;
      case '--as-failed': args.asFailed = true; break;
      // --- per-metric verify expectations ---
      case '--expect-match': args.expectMatch = parseMetricCsv(argv[++i], '--expect-match'); break;
      case '--expect-mismatch': args.expectMismatch = parseMetricCsv(argv[++i], '--expect-mismatch'); break;
      case '--expect-overall-match': {
        const v = argv[++i];
        if (v !== 'true' && v !== 'false') throw new Error(`--expect-overall-match must be true|false (got "${v}")`);
        args.expectOverallMatch = v === 'true';
        break;
      }
      case '--expect-failed-state': args.expectFailedState = true; break;
      default:
        if (a.startsWith('--')) {
          throw new Error(`Unknown flag: ${a}`);
        }
    }
  }

  // Cross-flag validation
  const absAndDeltaConflicts: Array<[string, unknown, unknown]> = [
    ['prm', args.adpPrm, args.adpPrmDelta],
    ['com', args.adpCom, args.adpComDelta],
    ['coi', args.adpCoi, args.adpCoiDelta],
    ['tax', args.adpTax, args.adpTaxDelta],
    ['oth', args.adpOth, args.adpOthDelta],
  ];
  for (const [m, abs, delta] of absAndDeltaConflicts) {
    if (abs !== undefined && delta !== undefined) {
      throw new Error(`Cannot combine --adp-${m} and --adp-${m}-delta; choose one.`);
    }
  }
  if (args.expectMatch && args.expectMismatch) {
    const overlap = args.expectMatch.filter((m) => args.expectMismatch!.includes(m));
    if (overlap.length > 0) {
      throw new Error(`--expect-match and --expect-mismatch overlap on: ${overlap.join(', ')}`);
    }
  }
  if (args.failed && (args.fromPlan || args.forceXlsx || args.rowIndex !== undefined || args.rowName)) {
    // Existing rule preserved elsewhere, but catch early here too if --as-failed is used.
  }
  return args;
}

/**
 * Apply per-metric overrides to the computed ADP totals. Absolute values replace; deltas
 * are added. Returns a new object (caller's computed totals unchanged).
 *
 * Returned flag `hasAnyOverride` is true when any value differs from the computed baseline
 * — useful in the CLI to show "OVERRIDDEN" in the log, and to widen the tolerance for
 * negative-path scenarios (no "WARNING: totals don't match XML" noise when the mismatch
 * is intentional).
 */
function applyTotalsOverrides(
  baseline: ReturnType<typeof totalsToServiceBusPayload>,
  args: Args,
): { totals: ReturnType<typeof totalsToServiceBusPayload>; hasAnyOverride: boolean; summary: string[] } {
  const out = { ...baseline };
  const summary: string[] = [];
  let has = false;

  const metrics: Array<[MetricKey, number, number | undefined, number | undefined]> = [
    ['prm', baseline.adp_prm, args.adpPrm, args.adpPrmDelta],
    ['com', baseline.adp_com, args.adpCom, args.adpComDelta],
    ['coi', baseline.adp_coi, args.adpCoi, args.adpCoiDelta],
    ['tax', baseline.adp_tax, args.adpTax, args.adpTaxDelta],
    ['oth', baseline.adp_oth, args.adpOth, args.adpOthDelta],
  ];
  for (const [m, base, abs, delta] of metrics) {
    if (abs !== undefined) {
      const rounded = round2(abs);
      out[`adp_${m}` as keyof typeof out] = rounded as never;
      summary.push(`${m}: ${base} → ${rounded}`);
      has = true;
    } else if (delta !== undefined) {
      const rounded = round2(base + delta);
      out[`adp_${m}` as keyof typeof out] = rounded as never;
      summary.push(`${m}: ${base} ${delta >= 0 ? '+' : ''}${delta} = ${rounded}`);
      has = true;
    }
  }
  if (args.adpCurrency !== undefined) {
    summary.push(`currency: ${baseline.adp_currency} → ${args.adpCurrency}`);
    out.adp_currency = args.adpCurrency;
    has = true;
  }
  return { totals: out, hasAnyOverride: has, summary };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

function printHelp(): void {
  console.log(`Send mule-xml-generation-* messages to the Lloyd's Service Bus.

Legacy smoke (no data binding, random UUID correlation id):
  npx ts-node scripts/lloyds/send-mule-xml-generation-test-message.ts [--dry-run] [--failed]

Sanity — recommended: plan-driven (auto-detects ${path.relative(process.cwd(), resolvePlanPath())}):
  --from-plan                      Explicitly use the committed snapshot (default when one exists)
  --from-xlsx [path]               Force fallback to the xlsx loader (defaults to ${DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH})
  --row-index <n>                  0-based index in the runnable list / xlsx rows (default 0)
  --row-name "<file name>"         Select a specific row by its Name
  --plan-max-age-days <n>          Warn if the snapshot is older than N days (default 14)
  --correlation-id <str>           Override the counter (e.g. to replay). Skips the counter bump.
  --no-bump                        Do not write the counter file back (useful for dry runs)
  --container-base-url <url>       Override the blob container base URL in the payload.
                                   Default: ${DEFAULT_LLOYDS_BLOB_CONTAINER_BASE_URL}
  --wait-for-dataverse             After sending, poll Dataverse for the created XML File record
  --timeout-ms <n>                 Dataverse poll timeout in ms (default 120000)
  --no-send  (alias --poll-only)   Do NOT call Service Bus. Useful when you plan to paste the
                                   message into Service Bus Explorer manually. Combine with
                                   --wait-for-dataverse to poll for the record after pasting.
  --dry-run                        Build and print the payload; do NOT send, bump, or poll.

Negative-scenario generators (send a message expected to dead-letter):
  --blocked-index <n>              Pick a row from plan.blocked (e.g. REPO_NOT_IN_MASTER)
  --blocked-name "<file name>"     Pick a blocked row by name
  --blocked-reason <REASON>        Filter blocked rows by REPO_NOT_IN_MASTER / LEDGER_NOT_IN_MASTER / BAD_FILE_NAME / NOT_IN_CLONED_COHORT
  --blob-missing                   Take the selected runnable row but redirect blob_id to a
                                   non-existent container so func-xml-totals hits "Blob not found"
  --bad-file-name "<name>"         Override file_name entirely (e.g. "NOT_A_VALID_NAME.xml") —
                                   produces a BAD_FILE_NAME DLQ. blob_id is derived from it.
  --expect-no-record               Verify step expects NO Dataverse record (negative assertion)
  --no-record-poll-seconds <n>     How long to wait for absence confirmation (default 60)

Per-metric totals overrides (for tolerance / currency scenarios — applied on top of the
local XML's computed totals before the payload is built):
  --adp-prm <n>                    Absolute value for adp_prm (replaces XML total)
  --adp-com <n>                    Same for adp_com
  --adp-coi <n>                    Same for adp_coi
  --adp-tax <n>                    Same for adp_tax
  --adp-oth <n>                    Same for adp_oth
  --adp-currency <str>             Override adp_currency (e.g. "USD" when XML says "CAD")
  --adp-prm-delta <+/-n>           Relative override: add delta to computed XML total
                                   (e.g. --adp-prm-delta 5.01 -> tolerance breach)
  --adp-com-delta <+/-n>           Same for adp_com
  --adp-coi-delta <+/-n>           Same for adp_coi
  --adp-tax-delta <+/-n>           Same for adp_tax
  --adp-oth-delta <+/-n>           Same for adp_oth

Message-type override (for failure-path scenarios):
  --as-failed                      Send "mule-xml-generation-failed" with stub error block
  --message-type <str>             Override the top-level "message" discriminator directly

Verify-side expectations:
  --expect-match <csv>             Metrics (prm,com,coi,tax,oth,currency) whose match toggle
                                   on the Dataverse record must be TRUE.
  --expect-mismatch <csv>          Metrics whose match toggle must be FALSE.
  --expect-overall-match true|false  Overall match toggle expectation.
  --expect-failed-state            Expect the record NOT to reach Approved (failure-path test)

  --help                           Show this help.
`);
}

// ---------------------------------------------------------------------------
// Payload builders per mode
// ---------------------------------------------------------------------------

/** Flavour of scenario we're about to drive. */
export type ScenarioFlavour =
  | 'positive-plan'
  | 'positive-plan-override'     // plan-driven, but totals/currency/message-type overridden
  | 'positive-xlsx'
  | 'negative-blocked'
  | 'negative-blob-missing'
  | 'negative-bad-file-name';

interface SanityPayloadBundle {
  /** Which data source drove the selection: committed plan snapshot, or xlsx loader. */
  source: 'plan' | 'xlsx';
  /** Positive vs negative flavour (drives verify-side expectation). */
  flavour: ScenarioFlavour;
  /** Summary reason when flavour is negative (for CLI output). */
  negativeReason?: string;
  /** Common view regardless of source. */
  rowName: string;
  rowLedger: string;
  rowRepoId: string;
  rowIndex: number;
  blobId: string;
  /** Absolute path to local XML if one exists (null for negatives where we synthesize). */
  localXmlPath: string | null;
  correlationId: string;
  payload: ReturnType<typeof buildMuleXmlGenerationSuccessPayload>;
  counterBumped: boolean;
  counterPath: string;
  totalsSummary: string;
  /** Populated only when `source === 'plan'`. */
  plannedRow?: PlannedRow;
  /** Populated only when `source === 'xlsx'`. */
  xlsxRow?: SanityRow;
  /** Populated for `negative-blocked`. */
  blockedRow?: BlockedRow;
  /** Staleness warning text (if any). */
  planStalenessWarning?: string;
}

async function buildSanityBundle(args: Args): Promise<SanityPayloadBundle> {
  // Decide source: --from-plan or --from-xlsx are explicit. Otherwise auto-detect:
  // use the snapshot if it exists, else fall back to xlsx.
  const planPath = resolvePlanPath();
  const plan: SanityPlan | null = !args.forceXlsx && fs.existsSync(planPath) ? readSanityPlan(planPath) : null;
  const usePlan = args.fromPlan || (!args.forceXlsx && plan !== null);

  // Negative flavours require the plan (we pick from plan.blocked for some, and fall
  // back to plan.runnable + synthesised fields for others).
  const isNegativeBlocked = args.blockedIndex !== undefined || args.blockedName !== undefined || args.blockedReason !== undefined;
  const isNegativeBlobMissing = args.blobMissing;
  const isNegativeBadFileName = Boolean(args.badFileName);

  if (isNegativeBlocked || isNegativeBlobMissing || isNegativeBadFileName) {
    if (!plan) {
      throw new Error(
        `Negative scenarios require the sanity plan. Run \`npm run lloyds:sanity:plan\` to generate ${path.relative(process.cwd(), planPath)} first.`,
      );
    }
    if (isNegativeBlocked) return buildNegativeFromBlockedRow(plan, args, planPath);
    if (isNegativeBlobMissing) return buildNegativeBlobMissing(plan, args, planPath);
    return buildNegativeBadFileName(plan, args, planPath);
  }

  if (usePlan) {
    if (!plan) {
      throw new Error(
        `--from-plan requested but ${path.relative(process.cwd(), planPath)} is missing. ` +
          `Run \`npm run lloyds:sanity:plan\` to generate it.`,
      );
    }
    return buildFromPlan(plan, args, planPath);
  }
  return buildFromXlsx(args);
}

/** Stub totals used by negative scenarios — real values are irrelevant; the message dead-letters before totals are used. */
const STUB_FINANCIAL_VALUES = {
  adp_currency: 'USD',
  adp_prm: 0,
  adp_com: 0,
  adp_coi: 0,
  adp_tax: 0,
  adp_oth: 0,
} as const;

function resolveCorrelationId(args: Args, rowName: string, rowIndex: number): { correlationId: string; counterBumped: boolean; counterPath: string } {
  const counterPath = resolveCounterPath();
  if (args.correlationId?.trim()) {
    return { correlationId: args.correlationId.trim(), counterBumped: false, counterPath };
  }
  if (args.noBump) {
    return { correlationId: readCounter(counterPath).lastCorrelationId, counterBumped: false, counterPath };
  }
  if (args.dryRun) {
    return { correlationId: peekNextCorrelationId(counterPath), counterBumped: false, counterPath };
  }
  const bump = bumpCounter({ xmlName: rowName, row: rowIndex, filePath: counterPath });
  return { correlationId: bump.correlationId, counterBumped: true, counterPath };
}

function buildNegativeFromBlockedRow(plan: SanityPlan, args: Args, _planPath: string): SanityPayloadBundle {
  const blocked = pickBlockedRow(plan, {
    index: args.blockedIndex,
    name: args.blockedName,
    reason: args.blockedReason,
  });
  const parsed = parseFileName(blocked.name);
  const ledger = parsed?.ledger ?? 'UNKNOWN';
  const repoId = parsed?.repoId ?? 'UNKNOWN';
  const blobId = guessBlockedRowBlobUrl(blocked);

  const { correlationId, counterBumped, counterPath } = resolveCorrelationId(args, blocked.name, -1);

  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId,
    fileName: blocked.name,
    blobId,
    financialValues: { ...STUB_FINANCIAL_VALUES },
  });

  return {
    source: 'plan',
    flavour: 'negative-blocked',
    negativeReason: `${blocked.reason} — ${blocked.detail}`,
    rowName: blocked.name,
    rowLedger: ledger,
    rowRepoId: repoId,
    rowIndex: -1,
    blobId,
    localXmlPath: null,
    correlationId,
    payload,
    counterBumped,
    counterPath,
    totalsSummary: `STUB totals (ignored on negative path) — ${STUB_FINANCIAL_VALUES.adp_currency}`,
    blockedRow: blocked,
  };
}

function buildNegativeBlobMissing(plan: SanityPlan, args: Args, _planPath: string): SanityPayloadBundle {
  // Take a real runnable row (so ledger + repo resolve) but point blob_id at a
  // container where the blob doesn't exist (mulesoft-xml by convention — func-xml-totals
  // will hit "Blob not found"). We reuse the original filename verbatim so the ledger+repo
  // lookups still succeed — the ONLY failure source is the missing blob.
  const baseRow = pickPlannedRow(plan, { index: args.rowIndex, name: args.rowName });
  const wrongContainerBase = (process.env.LLOYDS_NEGATIVE_BLOB_CONTAINER_URL
    || 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml').replace(/\/+$/, '');
  const blobId = `${wrongContainerBase}/${baseRow.name}`;

  const { correlationId, counterBumped, counterPath } = resolveCorrelationId(args, baseRow.name, baseRow.index);

  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId,
    fileName: baseRow.name,
    blobId,
    financialValues: { ...STUB_FINANCIAL_VALUES },
  });

  return {
    source: 'plan',
    flavour: 'negative-blob-missing',
    negativeReason: `BLOB_MISSING — blob_id points at "${wrongContainerBase}" where this file does not exist`,
    rowName: baseRow.name,
    rowLedger: baseRow.ledger,
    rowRepoId: baseRow.repoId,
    rowIndex: baseRow.index,
    blobId,
    localXmlPath: baseRow.localXmlPath,
    correlationId,
    payload,
    counterBumped,
    counterPath,
    totalsSummary: `STUB totals (ignored on negative path) — ${STUB_FINANCIAL_VALUES.adp_currency}`,
    plannedRow: baseRow,
  };
}

function buildNegativeBadFileName(_plan: SanityPlan, args: Args, _planPath: string): SanityPayloadBundle {
  const badName = args.badFileName ?? buildFileName({
    ledger: 'ZZZZ',
    repoId: 'XX-00000',
    at: new Date(),
  });
  // If the user gave something malformed on purpose, use it; otherwise ZZZZ is a valid-
  // shape name with an unknown ledger so it'll DLQ with LEDGER_NOT_IN_MASTER at minimum.
  const blobBase = (process.env.LLOYDS_BLOB_CONTAINER_URL
    || 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml').replace(/\/+$/, '');
  const blobId = `${blobBase}/${badName}`;

  const parsed = parseFileName(badName);
  const ledger = parsed?.ledger ?? 'UNPARSEABLE';
  const repoId = parsed?.repoId ?? 'UNPARSEABLE';

  const { correlationId, counterBumped, counterPath } = resolveCorrelationId(args, badName, -1);

  const payload = buildMuleXmlGenerationSuccessPayload({
    correlationId,
    fileName: badName,
    blobId,
    financialValues: { ...STUB_FINANCIAL_VALUES },
  });

  return {
    source: 'plan',
    flavour: 'negative-bad-file-name',
    negativeReason: `BAD_FILE_NAME — "${badName}" either fails the convention regex or resolves to ledger="${ledger}"/repo="${repoId}" which won't exist in master`,
    rowName: badName,
    rowLedger: ledger,
    rowRepoId: repoId,
    rowIndex: -1,
    blobId,
    localXmlPath: null,
    correlationId,
    payload,
    counterBumped,
    counterPath,
    totalsSummary: `STUB totals (ignored on negative path) — ${STUB_FINANCIAL_VALUES.adp_currency}`,
  };
}

function buildFromPlan(plan: SanityPlan, args: Args, planPath: string): SanityPayloadBundle {
  const row = pickPlannedRow(plan, { index: args.rowIndex, name: args.rowName });

  if (!row.localXmlPath) {
  throw new Error(
      `Planned row "${row.name}" has no local XML copy under docs/lloyds/XMLs/. ` +
        `Either commit the XML or extend the planner to download from blob.`,
    );
  }

  const totals = computeAdpTotalsFromFile(row.localXmlPath);
  if (totals.lineCount === 0) {
    throw new Error(`XML ${row.localXmlPath} has no <LEDGERJOURNALENTITY> lines`);
  }
  const baselineFinancials = totalsToServiceBusPayload(totals);
  const { totals: financialValues, hasAnyOverride, summary: overrideSummary } = applyTotalsOverrides(baselineFinancials, args);

  const { correlationId, counterBumped, counterPath } = resolveCorrelationId(args, row.name, row.index);

  const payload = buildPayloadWithOptionalFailure({
    correlationId,
    fileName: row.name,
    blobId: row.blobUrl,
    financialValues,
    args,
  });

  const ageDays = planAgeInDays(plan);
  const staleness = ageDays > args.planMaxAgeDays
    ? `Plan is ${ageDays.toFixed(1)} days old (> ${args.planMaxAgeDays}). Refresh with \`npm run lloyds:sanity:plan\`.`
    : undefined;

  return {
    source: 'plan',
    flavour: hasAnyOverride || args.asFailed || args.messageType ? 'positive-plan-override' : 'positive-plan',
    negativeReason: hasAnyOverride ? `Totals overridden (${overrideSummary.join('; ')})` : undefined,
    rowName: row.name,
    rowLedger: row.ledger,
    rowRepoId: row.repoId,
    rowIndex: row.index,
    blobId: row.blobUrl,
    localXmlPath: row.localXmlPath,
    correlationId,
    payload,
    counterBumped,
    counterPath,
    totalsSummary: totalsSummaryOf(financialValues) + (hasAnyOverride ? `   [overridden: ${overrideSummary.join('; ')}]` : ''),
    plannedRow: row,
    planStalenessWarning: staleness,
  };
}

async function buildFromXlsx(args: Args): Promise<SanityPayloadBundle> {
  const xlsxPath = args.fromXlsx
    ? path.resolve(process.cwd(), args.fromXlsx)
    : path.resolve(process.cwd(), DEFAULT_SANITY_XLSX_REPO_RELATIVE_PATH);

  const rows = await loadSanityRows({
    xlsxPath,
    // By default we pass the spreadsheet URL through verbatim — the curator picks the
    // container. Only rewrite if an override is explicitly set. (Getting this wrong means
    // func-xml-totals hits "Blob not found" and dead-letters the message.)
    containerBaseUrl: args.containerBaseUrl ?? process.env.LLOYDS_BLOB_CONTAINER_BASE_URL,
  });
  const row = pickRow(rows, { index: args.rowIndex, name: args.rowName });
  ensureLocalXmlExists(row);

  const totals = computeAdpTotalsFromFile(row.localXmlPath);
  if (totals.lineCount === 0) {
    throw new Error(`XML ${row.localXmlPath} has no <LEDGERJOURNALENTITY> lines`);
  }
  const baselineFinancials = totalsToServiceBusPayload(totals);
  const { totals: financialValues, hasAnyOverride, summary: overrideSummary } = applyTotalsOverrides(baselineFinancials, args);

  const { correlationId, counterBumped, counterPath } = resolveCorrelationId(args, row.name, row.index);

  const payload = buildPayloadWithOptionalFailure({
    correlationId,
    fileName: row.name,
    blobId: row.blobId,
    financialValues,
    args,
  });

  return {
    source: 'xlsx',
    flavour: 'positive-xlsx',
    negativeReason: hasAnyOverride ? `Totals overridden (${overrideSummary.join('; ')})` : undefined,
    rowName: row.name,
    rowLedger: row.ledger,
    rowRepoId: row.repoId,
    rowIndex: row.index,
    blobId: row.blobId,
    localXmlPath: row.localXmlPath,
    correlationId,
    payload,
    counterBumped,
    counterPath,
    totalsSummary: totalsSummaryOf(financialValues) + (hasAnyOverride ? `   [overridden: ${overrideSummary.join('; ')}]` : ''),
    xlsxRow: row,
  };
}

function totalsSummaryOf(f: ReturnType<typeof totalsToServiceBusPayload>): string {
  return `prm=${f.adp_prm} com=${f.adp_com} coi=${f.adp_coi} tax=${f.adp_tax} oth=${f.adp_oth} currency=${f.adp_currency}`;
}

/**
 * Build the Service Bus payload, honouring the `--as-failed` / `--message-type` overrides.
 *
 * - Default: canonical `mule-xml-generation-success` payload (with overridden financial values).
 * - `--as-failed`: switch to `mule-xml-generation-failed` shape with a stub `error` block;
 *   useful for testing how `func-xml-totals` responds to a failure-path message on the
 *   same Stage-1 queue (scenario E1).
 * - `--message-type <str>`: low-level override of just the top-level `message` field
 *   (e.g. "foo-bar" to see how unknown message types are handled). Preserves the
 *   success-shape body.
 */
function buildPayloadWithOptionalFailure(input: {
  correlationId: string;
  fileName: string;
  blobId: string;
  financialValues: ReturnType<typeof totalsToServiceBusPayload>;
  args: Args;
}): ReturnType<typeof buildMuleXmlGenerationSuccessPayload> | ReturnType<typeof buildMuleXmlGenerationFailedPayload> {
  if (input.args.asFailed) {
    return buildMuleXmlGenerationFailedPayload({
      correlationId: input.correlationId,
      fileName: input.fileName,
      stage: 'XML_GENERATING',
      errorSource: 'AUTOMATION (sanity --as-failed)',
      errorMessage: 'Synthetic failure payload for Stage-1 sanity testing (scenario E1).',
    });
  }
  const base = buildMuleXmlGenerationSuccessPayload({
    correlationId: input.correlationId,
    fileName: input.fileName,
    blobId: input.blobId,
    financialValues: input.financialValues,
  });
  if (input.args.messageType && input.args.messageType !== 'mule-xml-generation-success') {
    // Low-level override: keep the success-shape body (file_name, blob_id, financials)
    // but swap the top-level `message` discriminator. Cast back to the success type so
    // the caller keeps its TS narrowing; at runtime the field is just a string.
    return { ...base, message: input.args.messageType } as unknown as ReturnType<typeof buildMuleXmlGenerationSuccessPayload>;
  }
  return base;
}

function buildLegacySmokePayload(failed: boolean): ReturnType<typeof buildMuleXmlGenerationSuccessPayload> | ReturnType<typeof buildMuleXmlGenerationFailedPayload> {
  const correlationId = crypto.randomUUID();
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const fileName = failed ? `AUTOMATION-SMOKE-FAIL-${stamp}.xml` : `AUTOMATION-SMOKE-${stamp}.xml`;

  if (failed) {
    return buildMuleXmlGenerationFailedPayload({ correlationId, fileName });
  }
  return buildMuleXmlGenerationSuccessPayload({
    correlationId,
    fileName,
    blobId: crypto.randomUUID(),
    financialValues: { adp_currency: 'GBP', adp_prm: 100, adp_com: 5, adp_coi: 2, adp_tax: 10, adp_oth: 0 },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);
  if (args.help) { printHelp(); return; }

  const hasMetricOverride = (
    args.adpPrm !== undefined || args.adpCom !== undefined || args.adpCoi !== undefined ||
    args.adpTax !== undefined || args.adpOth !== undefined || args.adpCurrency !== undefined ||
    args.adpPrmDelta !== undefined || args.adpComDelta !== undefined || args.adpCoiDelta !== undefined ||
    args.adpTaxDelta !== undefined || args.adpOthDelta !== undefined
  );
  const sanityMode = Boolean(
    args.fromPlan
      || args.forceXlsx
      || args.rowIndex !== undefined
      || args.rowName
      || args.blockedIndex !== undefined
      || args.blockedName
      || args.blockedReason
      || args.blobMissing
      || args.badFileName
      || args.asFailed
      || args.messageType
      || hasMetricOverride,
  );
  if (args.failed && sanityMode) {
    throw new Error('--failed cannot be combined with --from-xlsx / --row-index / --row-name (sanity path is happy-path only).');
  }

  const sbConfig = getServiceBusConfig();

  if (sanityMode) {
    const bundle = await buildSanityBundle(args);
    console.log('Lloyd\'s Row-1 sanity send');
    console.log(`  Flavour:        ${bundle.flavour}${bundle.negativeReason ? ' — ' + bundle.negativeReason : ''}`);
    console.log(`  Source:         ${bundle.source} ${bundle.source === 'plan' ? `(${path.relative(process.cwd(), resolvePlanPath())})` : '(xlsx)'}`);
    if (bundle.planStalenessWarning) console.log(`  WARNING:        ${bundle.planStalenessWarning}`);
    console.log(`  FQNS:           ${sbConfig.fqns}`);
    console.log(`  Queue:          ${sbConfig.queueName}`);
    console.log(`  Row:            [${bundle.rowIndex}] ${bundle.rowName} (ledger=${bundle.rowLedger} repo=${bundle.rowRepoId})`);
    console.log(`  blob_id:        ${bundle.blobId}`);
    console.log(`  Local XML:      ${bundle.localXmlPath}`);
    console.log(`  ADP totals:     ${bundle.totalsSummary}`);
    const counterNote = bundle.counterBumped
      ? ` (counter bumped — ${path.relative(process.cwd(), bundle.counterPath)})`
      : args.correlationId
        ? ' (override)'
        : args.noBump
          ? ' (reused from committed counter — no bump)'
          : ' (dry-run peek; not persisted)';
    console.log(`  correlation_id: ${bundle.correlationId}${counterNote}`);
    console.log('  Payload:\n' + JSON.stringify(bundle.payload, null, 2) + '\n');

    if (args.dryRun) {
      console.log('--dry-run: nothing sent.');
      return;
    }

    const isNegativeFlavour = bundle.flavour.startsWith('negative-');
    const effectiveExpectNoRecord = args.expectNoRecord || isNegativeFlavour;

    if (args.noSend) {
      console.log('--no-send: skipping AMQP send. Paste the Payload above into Service Bus Explorer:');
      console.log(`  Namespace: ${sbConfig.fqns}`);
      console.log(`  Queue:     ${sbConfig.queueName}`);
      console.log(`  Content-Type: application/json`);
      if (args.waitForDataverse) {
        console.log('Then, when you have pasted the message, this command will run the verify step.');
        if (effectiveExpectNoRecord) {
          await expectNoRecordAndReport(bundle.correlationId, args.noRecordPollSeconds * 1000, bundle.flavour);
        } else {
          await waitAndReport(bundle.correlationId, bundle.rowLedger, bundle.rowRepoId, args.dataverseTimeoutMs, args);
        }
      } else {
        console.log('Add --wait-for-dataverse to have this command verify the resulting record.');
      }
      return;
    }

    const result = await sendMuleXmlGenerationMessage({
      payload: bundle.payload,
      config: sbConfig,
      creds: getServiceBusSpnCreds(),
      logger: (line) => console.log(`  [sb] ${line}`),
    });
    console.log(`OK: sent at ${result.sentAt} (credential source: ${result.credentialSource}).`);

    if (args.waitForDataverse) {
      if (effectiveExpectNoRecord) {
        await expectNoRecordAndReport(bundle.correlationId, args.noRecordPollSeconds * 1000, bundle.flavour);
      } else {
        await waitAndReport(bundle.correlationId, bundle.rowLedger, bundle.rowRepoId, args.dataverseTimeoutMs, args);
      }
    }
    return;
  }

  // --- Legacy smoke path (preserved verbatim in behaviour) ---
  const payload = buildLegacySmokePayload(args.failed);
  console.log('Lloyd\'s Service Bus smoke send');
  console.log(`  FQNS:  ${sbConfig.fqns}`);
  console.log(`  Queue: ${sbConfig.queueName}`);
  console.log(`  Message type: ${payload.message}`);
  console.log(`  correlation_id: ${payload.correlation_id}`);
  console.log('  Body:\n' + JSON.stringify(payload, null, 2) + '\n');

  if (args.dryRun) {
    console.log('--dry-run: nothing sent (no credentials required).');
    return;
  }

  const result = await sendMuleXmlGenerationMessage({
    payload,
    config: sbConfig,
    creds: getServiceBusSpnCreds(),
    logger: (line) => console.log(`  [sb] ${line}`),
  });
  console.log(`OK: sent at ${result.sentAt} (credential source: ${result.credentialSource}).`);
}

async function expectNoRecordAndReport(correlationId: string, timeoutMs: number, flavour: ScenarioFlavour): Promise<void> {
  console.log(`\nNegative verification: expect NO accelins_workflows record for correlation_id='${correlationId}' within ${timeoutMs}ms…`);
  const client = await XmlFileRecordClient.createStandalone();
  try {
    await client.waitForNoRecordByCorrelationId({
      correlationId,
      timeoutMs,
      pollIntervalMs: 5_000,
      onAttempt: (attempt, elapsed) => {
        if (attempt === 1 || attempt % 3 === 0) {
          console.log(`  [poll] attempt ${attempt} (elapsed ${elapsed}ms) — still absent`);
        }
      },
    });
    console.log(`\nNegative Sanity PASS: flavour=${flavour} produced no Dataverse record (message dead-lettered as expected).`);
    console.log('Tip: peek the $DeadLetterQueue for the matching error JSON to make this a stronger assertion once SB Receiver role lands.');
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\nNegative Sanity FAIL: ${msg}`);
    process.exitCode = 2;
  } finally {
    await client.dispose();
  }
}

async function waitAndReport(correlationId: string, ledger: string, repoId: string, timeoutMs: number, args: Args): Promise<void> {
  console.log(`\nWaiting up to ${timeoutMs}ms for accelins_workflows record with correlation_id='${correlationId}'…`);
  const client = await XmlFileRecordClient.createStandalone();
  try {
    const record = await client.waitForByCorrelationId({
      correlationId,
      timeoutMs,
      onAttempt: (attempt, elapsed) => {
        if (attempt === 1 || attempt % 5 === 0) {
          console.log(`  [poll] attempt ${attempt} (elapsed ${elapsed}ms)`);
        }
      },
    });
    console.log('\nDataverse record found:');
    console.log(`  workflowId:      ${record.workflowId}`);
    console.log(`  name:            ${record.name}`);
    const statusLabel = record.statuscode !== null ? STATUSCODE_LABELS[record.statuscode] : undefined;
    console.log(`  statuscode:      ${record.statuscode}${statusLabel ? ` (${statusLabel})` : ''}`);
    console.log(`  statecode:       ${record.statecode}`);
    console.log(`  repositoryFile:  ${record.repositoryFileId}`);
    console.log(`  legalEntity:     ${record.legalEntityId}`);
    console.log(`  processPath:     ${record.processPath}`);
    console.log(`  Workflow totals: currency=${record.odsCurrency} prm=${record.odsPrm} com=${record.odsCom} coi=${record.odsCoi} tax=${record.odsTax} oth=${record.odsOth}`);
    console.log(`  XML totals:      currency=${record.xmlCurrency} prm=${record.xmlPrm} com=${record.xmlCom} coi=${record.xmlCoi} tax=${record.xmlTax} oth=${record.xmlOth}`);
    console.log(`  Match toggles:   overall=${record.overallMatch}  currency=${record.matches.currency}  prm=${record.matches.prm}  com=${record.matches.com}  coi=${record.matches.coi}  tax=${record.matches.tax}  oth=${record.matches.oth}`);

    const issues: string[] = [];
    const hasPerMetricExpectations = Boolean(args.expectMatch?.length || args.expectMismatch?.length || args.expectOverallMatch !== undefined);

    // --- statuscode / state expectations ---
    if (args.expectFailedState) {
      if (record.statuscode !== null && HAPPY_PATH_STATUSCODES.includes(record.statuscode)) {
        issues.push(`--expect-failed-state: statuscode ${record.statuscode} (${STATUSCODE_LABELS[record.statuscode] ?? 'happy-path value'}) — record reached a happy-path state but we expected a failure flavour.`);
      }
    } else if (!hasPerMetricExpectations) {
      // Default positive sanity assertion (only enforced when no per-metric expectations were given).
      if (record.statuscode === null || !HAPPY_PATH_STATUSCODES.includes(record.statuscode)) {
        issues.push(
          `statuscode is ${record.statuscode}, expected one of [${HAPPY_PATH_STATUSCODES.map((s) => `${s} (${STATUSCODE_LABELS[s]})`).join(', ')}]`,
        );
      }
      if (record.overallMatch !== true) {
        issues.push(`overall_match is ${record.overallMatch}, expected true (ADP vs XML totals should all match on happy path)`);
      }
    }

    // --- --expect-overall-match <true|false> ---
    if (args.expectOverallMatch !== undefined) {
      if (record.overallMatch !== args.expectOverallMatch) {
        issues.push(`--expect-overall-match=${args.expectOverallMatch} but record shows overall_match=${record.overallMatch}`);
      }
    }

    // --- --expect-match <csv> ---
    if (args.expectMatch?.length) {
      for (const m of args.expectMatch) {
        const v = record.matches[m as keyof typeof record.matches];
        if (v !== true) {
          issues.push(`--expect-match ${m}: expected TRUE, got ${v} (Dataverse field ${m})`);
        }
      }
    }

    // --- --expect-mismatch <csv> ---
    if (args.expectMismatch?.length) {
      for (const m of args.expectMismatch) {
        const v = record.matches[m as keyof typeof record.matches];
        if (v !== false) {
          issues.push(`--expect-mismatch ${m}: expected FALSE, got ${v} (Dataverse field ${m})`);
        }
      }
    }

    // --- Lookup resolution is always required on happy path, but when we're explicitly ---
    // --- expecting a failed state (E1) the record may not have the lookup resolved; skip.
    if (!args.expectFailedState && !record.repositoryFileId) {
      issues.push(`${repoId} did not resolve to a Repository File lookup — check master data for ledger ${ledger}`);
    }

    if (issues.length > 0) {
      console.log('\nSanity WARNINGS:');
      issues.forEach((i) => console.log(`  - ${i}`));
      process.exitCode = 2;
    } else {
      console.log('\nSanity PASS.');
    }
  } finally {
    await client.dispose();
  }
}

// Helpful hint when invoked with no args at all — the counter state.
if (process.argv.length === 2) {
  try {
    const cur = readCounter();
    console.log(`(Hint: next sanity correlation id would be ${peekNextCorrelationId()} — current counter: ${cur.lastCorrelationId}. Use --from-xlsx or --row-index to drive a sanity run.)\n`);
  } catch {
    // non-fatal
  }
}

function logError(prefix: string, e: unknown): void {
  if (e instanceof Error) {
    console.error(`${prefix}: ${e.message || '(no message)'} [${e.name}]`);
    const extra: Record<string, unknown> = {};
    for (const k of ['code', 'statusCode', 'errno', 'condition', 'description']) {
      const v = (e as unknown as Record<string, unknown>)[k];
      if (v !== undefined) extra[k] = v;
    }
    if (Object.keys(extra).length > 0) console.error(`${prefix} detail:`, extra);
    const inner = (e as unknown as { errors?: unknown[] }).errors;
    if (Array.isArray(inner) && inner.length > 0) {
      inner.forEach((ie, i) => logError(`${prefix}.errors[${i}]`, ie));
    }
    const cause = (e as unknown as { cause?: unknown }).cause;
    if (cause) logError(`${prefix}.cause`, cause);
  } else {
    console.error(`${prefix} (non-Error):`, e);
  }
}

main().catch((e) => {
  logError('ERROR', e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
