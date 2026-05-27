/**
 * Reusable helpers for sending `mule-xml-generation-*` messages to the Lloyd's Service Bus.
 *
 * Both the `scripts/lloyds/send-mule-xml-generation-test-message.ts` CLI and the
 * `@PP-391-API-001` Cucumber scenario use these helpers so payload shape and auth wiring
 * stay in one place.
 *
 * Auth preference (first match wins): `LLOYDS_SERVICE_BUS_*` → `AZURE_*` → `D365_*` (the
 * last option only works if the D365 SPN happens to have Service Bus Data Sender on the
 * Lloyd's namespace).
 *
 * Message-contract reference (sample payloads & field list):
 *   https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages
 */

import { ServiceBusClient } from '@azure/service-bus';
import { ClientSecretCredential } from '@azure/identity';

/** Happy-path payload for `mule-xml-generation-success`. */
export interface MuleXmlGenerationSuccessPayload {
  message: 'mule-xml-generation-success';
  correlation_id: string;
  file_name: string;
  blob_id: string;
  financial_values: {
    adp_currency: string;
    adp_prm: number;
    adp_com: number;
    adp_coi: number;
    adp_tax: number;
    adp_oth: number;
  };
}

/** Failure-path payload for `mule-xml-generation-failed`. */
export interface MuleXmlGenerationFailedPayload {
  message: 'mule-xml-generation-failed';
  correlation_id: string;
  file_name: string;
  error: {
    process_name: string;
    failed_stage: string;
    error_message: string;
    error_source: string;
    error_timestamp: string;
  };
}

export interface ServiceBusConfig {
  /** Fully-qualified namespace, e.g. `sb-dev-uks-lyd.servicebus.windows.net`. */
  fqns: string;
  /** Queue name (defaults to `mule-xml-generation`). */
  queueName: string;
  /** AMQP try-timeout in ms. */
  tryTimeoutMs: number;
}

export interface SpnCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Human-readable label of which env-var block we resolved from. */
  source: string;
}

export const DEFAULT_LLOYDS_SB_FQNS = 'sb-dev-uks-lyd.servicebus.windows.net';
export const DEFAULT_LLOYDS_SB_QUEUE = 'mule-xml-generation';
export const DEFAULT_SB_SEND_TIMEOUT_MS = 90_000;

/** Read Service Bus config from env with sensible defaults. */
export function getServiceBusConfig(env: NodeJS.ProcessEnv = process.env): ServiceBusConfig {
  const fqns = env.LLOYDS_SERVICE_BUS_FQNS?.trim() || DEFAULT_LLOYDS_SB_FQNS;
  const queueName = env.LLOYDS_SERVICE_BUS_QUEUE?.trim() || DEFAULT_LLOYDS_SB_QUEUE;
  const rawTimeout = parseInt(env.LLOYDS_SERVICE_BUS_SEND_TIMEOUT_MS || '', 10);
  const tryTimeoutMs = Math.min(
    180_000,
    Math.max(5_000, Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : DEFAULT_SB_SEND_TIMEOUT_MS),
  );
  return { fqns, queueName, tryTimeoutMs };
}

/** Resolve SPN credentials using the first complete triple from the preference chain. */
export function getServiceBusSpnCreds(env: NodeJS.ProcessEnv = process.env): SpnCredentials {
  const pairs: Array<{ t?: string; c?: string; s?: string; source: string }> = [
    {
      t: env.LLOYDS_SERVICE_BUS_TENANT_ID,
      c: env.LLOYDS_SERVICE_BUS_CLIENT_ID,
      s: env.LLOYDS_SERVICE_BUS_CLIENT_SECRET,
      source: 'LLOYDS_SERVICE_BUS_*',
    },
    {
      t: env.AZURE_TENANT_ID,
      c: env.AZURE_CLIENT_ID,
      s: env.AZURE_CLIENT_SECRET,
      source: 'AZURE_*',
    },
    {
      t: env.D365_TENANT_ID,
      c: env.D365_CLIENT_ID,
      s: env.D365_CLIENT_SECRET,
      source: 'D365_* (ensure this SPN has Service Bus Data Sender on the Lloyd namespace)',
    },
  ];
  for (const p of pairs) {
    if (p.t && p.c && p.s) {
      return { tenantId: p.t, clientId: p.c, clientSecret: p.s, source: p.source };
    }
  }
  throw new Error(
    'Missing SPN credentials. Set LLOYDS_SERVICE_BUS_TENANT_ID / LLOYDS_SERVICE_BUS_CLIENT_ID / LLOYDS_SERVICE_BUS_CLIENT_SECRET '
      + '(recommended), or AZURE_TENANT_ID / AZURE_CLIENT_ID / AZURE_CLIENT_SECRET, or D365_* if the D365 SPN has SB sender rights.',
  );
}

/** Build the canonical success payload for a given Lloyd's XML. */
export function buildMuleXmlGenerationSuccessPayload(input: {
  correlationId: string;
  fileName: string;
  blobId: string;
  financialValues: MuleXmlGenerationSuccessPayload['financial_values'];
}): MuleXmlGenerationSuccessPayload {
  return {
    message: 'mule-xml-generation-success',
    correlation_id: input.correlationId,
    file_name: input.fileName,
    blob_id: input.blobId,
    financial_values: input.financialValues,
  };
}

/** Build the canonical failure payload. `stage` defaults to `XML_GENERATING` per programme contract. */
export function buildMuleXmlGenerationFailedPayload(input: {
  correlationId: string;
  fileName: string;
  stage?: string;
  errorMessage?: string;
  errorSource?: string;
  processName?: string;
}): MuleXmlGenerationFailedPayload {
  return {
    message: 'mule-xml-generation-failed',
    correlation_id: input.correlationId,
    file_name: input.fileName,
    error: {
      process_name: input.processName ?? 'automation-sanity',
      failed_stage: input.stage ?? 'XML_GENERATING',
      error_message: input.errorMessage ?? 'Synthetic failure from Lloyd\'s sanity automation',
      error_source: input.errorSource ?? 'AUTOMATION',
      error_timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    },
  };
}

export interface SendResult {
  /** The `correlation_id` of the message that was sent. */
  correlationId: string;
  /** FQNS the message was sent to. */
  fqns: string;
  /** Queue the message was sent to. */
  queueName: string;
  /** ISO timestamp at which `sendMessages` resolved. */
  sentAt: string;
  /** Human-readable source of the SPN credentials that were used. */
  credentialSource: string;
}

/**
 * Send a `mule-xml-generation-success` or `mule-xml-generation-failed` message.
 *
 * The caller is responsible for constructing the payload (use one of the `build*Payload`
 * helpers above). This function owns the Service Bus client lifecycle: connect → send → close.
 */
/** Stage 2 — Dataverse approval outcome (see `docs/lloyds/SKILL.md` §10). */
export function buildDvXmlApprovalSuccessPayload(input: { correlationId: string; fileName: string }): Record<string, unknown> {
  return {
    message: 'dv-xml-approval-success',
    correlation_id: input.correlationId,
    file_name: input.fileName,
  };
}

/** Stage 2 — Dataverse rejection / failure path (see ISDE Service Bus Messages). */
export function buildDvXmlApprovalFailedPayload(input: {
  correlationId: string;
  fileName: string;
  errorMessage?: string;
}): Record<string, unknown> {
  return {
    message: 'dv-xml-approval-failed',
    correlation_id: input.correlationId,
    file_name: input.fileName,
    error: {
      error_message: input.errorMessage ?? 'Synthetic Dataverse XML approval failure from Lloyd\'s module automation',
      error_timestamp: new Date().toISOString(),
    },
  };
}

/** Stage 3 — Mule DMF hand-off (see `docs/lloyds/SKILL.md` §10). */
export function buildMuleXmlSubmissionSuccessPayload(input: {
  correlationId: string;
  fileName: string;
  blobId?: string;
}): Record<string, unknown> {
  return {
    message: 'mule-xml-submission-success',
    correlation_id: input.correlationId,
    file_name: input.fileName,
    blob_id: input.blobId ?? input.fileName,
  };
}

/** Stage 3/4 — Mule import-status events on `mule-d365-import` (submission/import/processing). */
export function buildMuleD365ImportStatusPayload(input: {
  message:
    | 'mule-xml-submission-success'
    | 'mule-xml-submission-failed'
    | 'mule-dmf-import-success'
    | 'mule-dmf-import-failed'
    | 'mule-dmf-processing-success'
    | 'mule-dmf-processing-failed';
  correlationId: string;
  fileName: string;
  blobId?: string;
  errorMessage?: string;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    message: input.message,
    correlation_id: input.correlationId,
    file_name: input.fileName,
    blob_id: input.blobId ?? input.fileName,
  };
  if (input.message.endsWith('-failed')) {
    payload.error = {
      error_message: input.errorMessage ?? 'Synthetic failure from Lloyd\'s DMF automation',
      error_timestamp: new Date().toISOString(),
    };
  }
  return payload;
}

/** D365 journal totals on `dv-journal-posting-*` (ISDE Service Bus sample shape). */
export interface DvJournalPostingFinancialValues {
  d365_prm: number;
  d365_com: number;
  d365_coi: number;
  d365_tax: number;
  d365_oth: number;
  d365_currency: string;
}

/** Map Stage-1 ADP-style totals to journal-posting `financial_values` when both legs use the same numbers. */
export function mapAdpTotalsToDvJournalPostingFinancialValues(
  fv: MuleXmlGenerationSuccessPayload['financial_values'],
): DvJournalPostingFinancialValues {
  return {
    d365_prm: fv.adp_prm,
    d365_com: fv.adp_com,
    d365_coi: fv.adp_coi,
    d365_tax: fv.adp_tax,
    d365_oth: fv.adp_oth,
    d365_currency: fv.adp_currency,
  };
}

/** Stage 4 — journal posted in D365; Mule consumes and drives POSTED / Tagetik leg (see `docs/lloyds/SKILL.md`). */
export function buildDvJournalPostingSuccessPayload(input: {
  correlationId: string;
  fileName: string;
  blobId?: string;
  /** When omitted, `financial_values` is omitted (legacy). Prefer passing mapped D365 totals per programme contract. */
  financialValues?: DvJournalPostingFinancialValues;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    message: 'dv-journal-posting-success',
    correlation_id: input.correlationId,
    file_name: input.fileName,
    blob_id: input.blobId ?? input.fileName,
  };
  if (input.financialValues) {
    payload.financial_values = { ...input.financialValues };
  }
  return payload;
}

export function buildDvJournalPostingFailedPayload(input: {
  correlationId: string;
  fileName: string;
  blobId?: string;
  errorMessage?: string;
  financialValues?: DvJournalPostingFinancialValues;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    message: 'dv-journal-posting-failed',
    correlation_id: input.correlationId,
    file_name: input.fileName,
    blob_id: input.blobId ?? input.fileName,
    error: {
      error_message: input.errorMessage ?? 'Synthetic journal posting failure from Lloyd\'s module automation',
      error_timestamp: new Date().toISOString(),
    },
  };
  if (input.financialValues) {
    payload.financial_values = { ...input.financialValues };
  }
  return payload;
}

/**
 * Send arbitrary JSON to a Lloyd's Service Bus queue (same namespace + SPN as Stage 1).
 */
export async function sendLloydsServiceBusJsonMessage(input: {
  queueName: string;
  body: Record<string, unknown>;
  config?: ServiceBusConfig;
  creds?: SpnCredentials;
  logger?: (line: string) => void;
}): Promise<SendResult> {
  const base = input.config ?? getServiceBusConfig();
  const config: ServiceBusConfig = { ...base, queueName: input.queueName.trim() };
  const creds = input.creds ?? getServiceBusSpnCreds();
  const log = input.logger ?? (() => undefined);
  const body = JSON.stringify(input.body, null, 2);
  const cid = String((input.body as { correlation_id?: string }).correlation_id ?? '').trim() || 'unknown';
  log(`Service Bus send → fqns=${config.fqns} queue=${config.queueName} body keys=${Object.keys(input.body).join(',')}`);
  log(`Credential source: ${creds.source}`);

  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const client = new ServiceBusClient(config.fqns, credential, {
    retryOptions: { maxRetries: 2, timeoutInMs: config.tryTimeoutMs },
  });
  const sender = client.createSender(config.queueName);

  try {
    await sender.sendMessages(
      { body: Buffer.from(body, 'utf-8'), contentType: 'application/json' },
      { abortSignal: AbortSignal.timeout(config.tryTimeoutMs) },
    );
    const sentAt = new Date().toISOString();
    return {
      correlationId: cid,
      fqns: config.fqns,
      queueName: config.queueName,
      sentAt,
      credentialSource: creds.source,
    };
  } finally {
    await sender.close();
    await client.close();
  }
}

export async function sendMuleXmlGenerationMessage(input: {
  payload: MuleXmlGenerationSuccessPayload | MuleXmlGenerationFailedPayload;
  config?: ServiceBusConfig;
  creds?: SpnCredentials;
  /** Hook for console logging. Defaults to a no-op. */
  logger?: (line: string) => void;
}): Promise<SendResult> {
  const config = input.config ?? getServiceBusConfig();
  const creds = input.creds ?? getServiceBusSpnCreds();
  const log = input.logger ?? (() => undefined);

  const body = JSON.stringify(input.payload, null, 2);
  log(`Service Bus send → fqns=${config.fqns} queue=${config.queueName} message=${input.payload.message} correlation_id=${input.payload.correlation_id}`);
  log(`Credential source: ${creds.source}`);

  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const client = new ServiceBusClient(config.fqns, credential, {
    retryOptions: { maxRetries: 2, timeoutInMs: config.tryTimeoutMs },
  });
  const sender = client.createSender(config.queueName);

  try {
    log(`Connecting (AMQP) with send timeout ${config.tryTimeoutMs}ms…`);
    await sender.sendMessages(
      { body: Buffer.from(body, 'utf-8'), contentType: 'application/json' },
      { abortSignal: AbortSignal.timeout(config.tryTimeoutMs) },
    );
    const sentAt = new Date().toISOString();
    log(`OK: message sent at ${sentAt}.`);
    return {
      correlationId: input.payload.correlation_id,
      fqns: config.fqns,
      queueName: config.queueName,
      sentAt,
      credentialSource: creds.source,
    };
  } finally {
    await sender.close();
    await client.close();
  }
}
