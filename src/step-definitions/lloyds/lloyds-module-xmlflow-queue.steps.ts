/**
 * Lloyd's module tests: **WBX** Service Bus flows with optional **chained** `correlation_id`
 * (PP-391 … PP-395). Chained scenarios mirror the manual seven-hop pattern and sync
 * `world.testContext.lloydsSanity` so existing Dataverse `Then` steps in
 * `xml-generation.steps.ts` apply.
 *
 * Default `file_name` targets a real **mulesoft-xml** blob naming convention; override with
 * `LLOYDS_MODULE_XMLFLOW_FILE_NAME` if your tenant uses a different key.
 *
 * Contracts: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'node:crypto';

import { Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { sleep } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { computeAdpTotalsFromFile, totalsToServiceBusPayload } from '../../integrations/lloyds/xmlTotals';
import { applyModuleFieldViolation } from '../../integrations/lloyds/moduleMessageViolations';
import { buildBlobId, buildWbxFileName, parseFileName } from '../../integrations/lloyds/xmlFileName';
import { XmlFileRecordClient } from '../../integrations/lloyds/xmlFileRecordClient';
import {
  buildDvJournalPostingFailedPayload,
  buildDvJournalPostingSuccessPayload,
  mapAdpTotalsToDvJournalPostingFinancialValues,
  buildDvXmlApprovalFailedPayload,
  buildDvXmlApprovalSuccessPayload,
  buildMuleD365ImportStatusPayload,
  buildMuleXmlGenerationFailedPayload,
  buildMuleXmlGenerationSuccessPayload,
  buildMuleXmlSubmissionSuccessPayload,
  getServiceBusSpnCreds,
  sendLloydsServiceBusJsonMessage,
  type MuleXmlGenerationSuccessPayload,
} from '../../integrations/lloyds/serviceBusSender';

/** Stable dev default (must exist in `mulesoft-xml` for Dataverse + func-xml-totals). Override via env. */
const DEFAULT_WBX_FILE_NAME =
  'WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-28 12-35-02.516.xml';

const DEFAULT_TOTALS_XML = path.join(process.cwd(), 'docs/lloyds/XMLs/AEUM US-58338 202604091630.xml');

/** Fallback totals when no local XML (matches US-56464 WBX sample order of magnitude). */
const WBX_DEFAULT_FINANCIAL: MuleXmlGenerationSuccessPayload['financial_values'] = {
  adp_currency: 'USD',
  adp_prm: 68376,
  adp_com: -20512.8,
  adp_coi: 46153.84,
  adp_tax: 0,
  adp_oth: 0,
};

interface LloydsModuleXmlFlowContext {
  fileName: string;
  blobId: string;
  financialValues?: MuleXmlGenerationSuccessPayload['financial_values'];
  /** Single correlation id reused for all chained publishes in the scenario. */
  chainedCorrelationId?: string;
  lastCorrelationId?: string;
  lastSendCount?: number;
}

function moduleCtx(world: AutomationWorld): LloydsModuleXmlFlowContext {
  if (!world.testContext.lloydsModuleXmlFlow) {
    world.testContext.lloydsModuleXmlFlow = {} as LloydsModuleXmlFlowContext;
  }
  return world.testContext.lloydsModuleXmlFlow as LloydsModuleXmlFlowContext;
}

function resolveFinancialValues(bag: LloydsModuleXmlFlowContext): MuleXmlGenerationSuccessPayload['financial_values'] {
  if (bag.financialValues) return bag.financialValues;
  const xmlPath = process.env.LLOYDS_MODULE_XMLFLOW_TOTALS_XML?.trim() || DEFAULT_TOTALS_XML;
  if (fs.existsSync(xmlPath)) {
    const t = computeAdpTotalsFromFile(xmlPath);
    bag.financialValues = totalsToServiceBusPayload(t);
    logger.info(`Lloyd's module XML flow: financial_values from ${path.relative(process.cwd(), xmlPath)}`);
    return bag.financialValues;
  }
  bag.financialValues = { ...WBX_DEFAULT_FINANCIAL };
  logger.warn(
    `Lloyd's module XML flow: no XML at ${path.relative(process.cwd(), xmlPath)} — using WBX default totals. ` +
      'Set `LLOYDS_MODULE_XMLFLOW_TOTALS_XML` to a local WBX/classic XML for exact totals.',
  );
  return bag.financialValues;
}

/** Copy module chained context into `lloydsSanity` for shared Dataverse step definitions. */
function syncChainedModuleToSanity(world: AutomationWorld): void {
  const bag = moduleCtx(world);
  if (!bag.chainedCorrelationId) {
    throw new Error('Chained correlation id not set — use Given Lloyd\'s module XML flow chained trace starts first.');
  }
  const parsed = parseFileName(bag.fileName);
  if (!parsed) throw new Error(`Could not parse file_name "${bag.fileName}"`);
  const sanity = (world.testContext.lloydsSanity ??= {} as Record<string, unknown>);
  sanity.correlationId = bag.chainedCorrelationId;
  sanity.row = {
    name: bag.fileName,
    ledger: parsed.ledger,
    repoId: parsed.repoId,
    blobId: bag.blobId,
    localXmlPath: null,
  };
  sanity.adpTotals = resolveFinancialValues(bag);
  sanity.record = undefined;
}

const MESSAGE_EXPECTED_QUEUE: Record<string, string> = {
  'mule-xml-generation-success': 'mule-xml-generation',
  'mule-xml-generation-failed': 'mule-xml-generation',
  'dv-xml-approval-success': 'dv-xml-approval',
  'dv-xml-approval-failed': 'dv-xml-approval',
  'mule-xml-submission-success': 'mule-d365-import',
  'mule-xml-submission-failed': 'mule-d365-import',
  'mule-dmf-import-success': 'mule-d365-import',
  'mule-dmf-import-failed': 'mule-d365-import',
  'mule-dmf-processing-success': 'mule-d365-import',
  'mule-dmf-processing-failed': 'mule-d365-import',
  'dv-journal-posting-success': 'dv-d365-journalposting',
  'dv-journal-posting-failed': 'dv-d365-journalposting',
};

function assertQueueMatchesMessage(messageType: string, queueName: string): void {
  const expected = MESSAGE_EXPECTED_QUEUE[messageType];
  if (!expected) {
    throw new Error(
      `Unknown module message type "${messageType}". Expected one of: ${Object.keys(MESSAGE_EXPECTED_QUEUE).join(', ')}.`,
    );
  }
  if (queueName.trim() !== expected) {
    throw new Error(`Message "${messageType}" must be sent to queue "${expected}", not "${queueName}".`);
  }
}

function buildBody(
  messageType: string,
  bag: LloydsModuleXmlFlowContext,
  correlationId: string,
): Record<string, unknown> {
  const { fileName, blobId } = bag;
  switch (messageType) {
    case 'mule-xml-generation-success':
      return buildMuleXmlGenerationSuccessPayload({
        correlationId,
        fileName,
        blobId,
        financialValues: resolveFinancialValues(bag),
      });
    case 'mule-xml-generation-failed':
      return buildMuleXmlGenerationFailedPayload({
        correlationId,
        fileName,
        errorMessage: 'Module chained test: mule-xml-generation-failed',
      });
    case 'dv-xml-approval-success':
      return buildDvXmlApprovalSuccessPayload({ correlationId, fileName });
    case 'dv-xml-approval-failed':
      return buildDvXmlApprovalFailedPayload({
        correlationId,
        fileName,
        errorMessage: 'Module chained test: dv-xml-approval-failed',
      });
    case 'mule-xml-submission-success':
      return buildMuleXmlSubmissionSuccessPayload({ correlationId, fileName, blobId });
    case 'mule-xml-submission-failed':
    case 'mule-dmf-import-success':
    case 'mule-dmf-import-failed':
    case 'mule-dmf-processing-success':
    case 'mule-dmf-processing-failed':
      return buildMuleD365ImportStatusPayload({
        message: messageType as
          | 'mule-xml-submission-failed'
          | 'mule-dmf-import-success'
          | 'mule-dmf-import-failed'
          | 'mule-dmf-processing-success'
          | 'mule-dmf-processing-failed',
        correlationId,
        fileName,
        blobId,
        errorMessage: messageType.endsWith('-failed') ? `Module chained test: ${messageType}` : undefined,
      });
    case 'dv-journal-posting-success':
      return buildDvJournalPostingSuccessPayload({
        correlationId,
        fileName,
        blobId,
        financialValues: mapAdpTotalsToDvJournalPostingFinancialValues(resolveFinancialValues(bag)),
      });
    case 'dv-journal-posting-failed':
      return buildDvJournalPostingFailedPayload({
        correlationId,
        fileName,
        blobId,
        errorMessage: 'Module chained test: dv-journal-posting-failed',
        financialValues: mapAdpTotalsToDvJournalPostingFinancialValues(resolveFinancialValues(bag)),
      });
    default:
      throw new Error(`Unhandled message type "${messageType}"`);
  }
}

Given(
  /^Lloyd's module XML flow queue test uses WBX programme identity$/,
  function (this: AutomationWorld) {
    const envName = process.env.LLOYDS_MODULE_XMLFLOW_FILE_NAME?.trim();
    const envRepo = process.env.LLOYDS_MODULE_XMLFLOW_REPO_ID?.trim().toUpperCase();
    const fileName = envName || (envRepo ? buildWbxFileName({ repoId: envRepo }) : DEFAULT_WBX_FILE_NAME);
    const parsed = parseFileName(fileName);
    if (!parsed || parsed.ledger !== 'AEUM') {
      throw new Error(
        `WBX/classic file_name must parse with programme AEUM (WBX maps to AEUM); got "${fileName}".`,
      );
    }
    const bag = moduleCtx(this);
    bag.fileName = fileName;
    bag.blobId = buildBlobId(fileName);
    bag.financialValues = undefined;
    bag.chainedCorrelationId = undefined;
    bag.lastCorrelationId = undefined;
    bag.lastSendCount = undefined;
    logger.info(
      `Lloyd's module XML flow: WBX identity file_name=${bag.fileName} repo=${parsed.repoId}`,
    );
  },
);

Given(/^Lloyd's module XML flow chained trace starts with a fresh correlation id$/, function (this: AutomationWorld) {
  const bag = moduleCtx(this);
  if (!bag.fileName) {
    throw new Error('Run Background: Given Lloyd\'s module XML flow queue test uses WBX programme identity');
  }
  bag.chainedCorrelationId = randomUUID();
  resolveFinancialValues(bag);
  syncChainedModuleToSanity(this);
  logger.info(`Lloyd's module XML flow: chained correlation_id=${bag.chainedCorrelationId}`);
});

When(
  /^I publish the chained Lloyd's module XML flow message of type "([^"]+)" to queue "([^"]+)"$/,
  async function (this: AutomationWorld, messageType: string, queueName: string) {
    const bag = moduleCtx(this);
    if (!bag.fileName) {
      throw new Error('Run Background: WBX programme identity');
    }
    if (!bag.chainedCorrelationId) {
      throw new Error('Run: Given Lloyd\'s module XML flow chained trace starts with a fresh correlation id');
    }
    assertQueueMatchesMessage(messageType, queueName);
    getServiceBusSpnCreds();
    const body = buildBody(messageType, bag, bag.chainedCorrelationId);
    await sendLloydsServiceBusJsonMessage({ queueName: queueName.trim(), body });
    bag.lastCorrelationId = bag.chainedCorrelationId;
    bag.lastSendCount = 1;
    syncChainedModuleToSanity(this);
    logger.info(
      `Lloyd's module XML flow: chained send ${messageType} → ${queueName.trim()} correlation_id=${bag.chainedCorrelationId}`,
    );
  },
);

Then(/^Lloyd's module XML flow batch completed$/, function (this: AutomationWorld) {
  const bag = moduleCtx(this);
  logger.info(
    `Lloyd's module XML flow: batch completed (correlation_id=${bag.chainedCorrelationId ?? bag.lastCorrelationId ?? 'n/a'}, sends=${bag.lastSendCount ?? 'n/a'}).`,
  );
});

When(
  /^I publish the chained Lloyd's module XML flow field violation for message type "([^"]+)" with field slug "([^"]+)" to queue "([^"]+)"$/,
  async function (this: AutomationWorld, messageType: string, fieldSlug: string, queueName: string) {
    const bag = moduleCtx(this);
    if (!bag.fileName) throw new Error('Run Background: WBX programme identity');
    if (!bag.chainedCorrelationId) {
      throw new Error('Run: Given Lloyd\'s module XML flow chained trace starts with a fresh correlation id');
    }
    assertQueueMatchesMessage(messageType, queueName);
    getServiceBusSpnCreds();
    const spec = `${messageType.trim()}|${fieldSlug.trim()}`;
    const base = buildBody(messageType.trim(), bag, bag.chainedCorrelationId);
    const body = applyModuleFieldViolation(base, spec);
    await sendLloydsServiceBusJsonMessage({ queueName: queueName.trim(), body });
    bag.lastCorrelationId = bag.chainedCorrelationId;
    bag.lastSendCount = 1;
    syncChainedModuleToSanity(this);
    logger.info(`Lloyd's module XML flow: field violation ${spec} → ${queueName.trim()} correlation_id=${bag.chainedCorrelationId}`);
  },
);

Then(
  /^within (\d+) seconds Lloyd's module field violation outcome "([^"]+)"$/,
  async function (this: AutomationWorld, secondsRaw: string, outcome: string) {
    const bag = moduleCtx(this);
    const cid = bag.chainedCorrelationId;
    if (!cid) throw new Error('No chained correlation id.');
    if (!this.apiContext) throw new Error('world.apiContext is not initialised; API Before hook required for Dataverse outcomes.');
    const seconds = parseInt(secondsRaw, 10);
    const o = outcome.trim().toLowerCase();
    const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
    try {
      if (o === 'no_xml_file_record') {
        await client.waitForNoRecordByCorrelationId({
          correlationId: cid,
          timeoutMs: seconds * 1000,
          pollIntervalMs: 5_000,
          onAttempt: () => undefined,
        });
        logger.info(`Lloyd's module field violation outcome: no XML File row for ${cid}`);
        return;
      }
      if (o === 'xml_file_record_exists') {
        const record = await client.waitForByCorrelationId({
          correlationId: cid,
          timeoutMs: seconds * 1000,
          onAttempt: () => undefined,
        });
        const sanity = this.testContext.lloydsSanity as Record<string, unknown> | undefined;
        if (sanity) sanity.record = record;
        logger.info(`Lloyd's module field violation outcome: XML File exists (${record.workflowId})`);
        return;
      }
      if (o === 'xml_file_overall_match_false') {
        const deadline = Date.now() + seconds * 1000;
        let attempt = 0;
        while (Date.now() < deadline) {
          attempt += 1;
          const r = await client.findByCorrelationId(cid);
          if (r && r.overallMatch === false) {
            const sanity = this.testContext.lloydsSanity as Record<string, unknown> | undefined;
            if (sanity) sanity.record = r;
            logger.info(`Lloyd's module field violation outcome: overall_match=false after ${attempt} poll(s)`);
            return;
          }
          await sleep(5_000);
        }
        throw new Error(
          `Timed out after ${seconds}s waiting for accelins_overall_match=false on correlation_id=${cid}.`,
        );
      }
      throw new Error(
        `Unknown Lloyd's module field violation outcome "${outcome}". Use: no_xml_file_record | xml_file_record_exists | xml_file_overall_match_false`,
      );
    } finally {
      await client.dispose();
    }
  },
);
