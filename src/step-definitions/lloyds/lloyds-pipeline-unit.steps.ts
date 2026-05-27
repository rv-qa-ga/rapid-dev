/**
 * Umbrella `lloyds-pipeline.feature` §I — thin behaviour checks for Lloyd's pure helpers.
 * Canonical assertions: `tests/unit/lloyds-*.test.ts` (Vitest).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { bumpCounter } from '../../integrations/lloyds/correlationIdCounter';
import { buildBlobId, parseFileName } from '../../integrations/lloyds/xmlFileName';
import { buildMuleXmlGenerationSuccessPayload, type MuleXmlGenerationSuccessPayload } from '../../integrations/lloyds/serviceBusSender';
import { type AdpTotals, computeAdpTotalsFromFile, totalsToServiceBusPayload } from '../../integrations/lloyds/xmlTotals';

interface LloydsUnitCtx {
  parseResult?: ReturnType<typeof parseFileName>;
  blobResult?: string;
  counterPath?: string;
  lastBumpCorrelationId?: string;
  xmlTotalsPath?: string;
  lastAdpTotals?: AdpTotals;
  lastMulePayload?: MuleXmlGenerationSuccessPayload;
}

function uCtx(world: AutomationWorld): LloydsUnitCtx {
  if (!world.testContext.lloydsUnit) world.testContext.lloydsUnit = {};
  return world.testContext.lloydsUnit as LloydsUnitCtx;
}

When("Lloyd's unit helper parseFileName is applied to {string}", function (this: AutomationWorld, fileName: string) {
  const r = parseFileName(fileName);
  if (!r) throw new Error(`parseFileName returned null for "${fileName}"`);
  uCtx(this).parseResult = r;
});

Then("Lloyd's parse result ledger should be {string}", function (this: AutomationWorld, expected: string) {
  const p = uCtx(this).parseResult;
  if (!p) throw new Error('No parse result — run parseFileName When step first.');
  if (p.ledger !== expected) throw new Error(`Expected ledger "${expected}", got "${p.ledger}"`);
});

Then("Lloyd's parse result repoId should be {string}", function (this: AutomationWorld, expected: string) {
  const p = uCtx(this).parseResult;
  if (!p) throw new Error('No parse result — run parseFileName When step first.');
  if (p.repoId !== expected) throw new Error(`Expected repoId "${expected}", got "${p.repoId}"`);
});

Then("Lloyd's parse result stamp should be {string}", function (this: AutomationWorld, expected: string) {
  const p = uCtx(this).parseResult;
  if (!p) throw new Error('No parse result — run parseFileName When step first.');
  if (p.stamp !== expected) throw new Error(`Expected stamp "${expected}", got "${p.stamp}"`);
});

When("Lloyd's unit helper buildBlobId is applied to file name {string}", function (this: AutomationWorld, fileName: string) {
  uCtx(this).blobResult = buildBlobId(fileName);
});

Then("Lloyd's buildBlobId result should end with {string}", function (this: AutomationWorld, suffix: string) {
  const b = uCtx(this).blobResult;
  if (!b) throw new Error('No buildBlobId result.');
  if (!b.endsWith(suffix)) throw new Error(`Expected URL to end with "${suffix}", got "${b}"`);
});

Given(
  "Lloyd's unit test counter file is initialised with lastCorrelationId {string}",
  function (this: AutomationWorld, lastId: string) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lloyds-unit-ctr-'));
    const p = path.join(dir, 'sanity-counter.json');
    const body = {
      lastCorrelationId: lastId.trim(),
      lastRunAt: null,
      lastXmlName: null,
      lastRow: null,
    };
    fs.writeFileSync(p, `${JSON.stringify(body, null, 2)}\n`, 'utf-8');
    uCtx(this).counterPath = p;
  },
);

When(
  "Lloyd's bumpCounter is invoked for that file with xmlName {string} and row {int}",
  function (this: AutomationWorld, xmlName: string, row: number) {
    const p = uCtx(this).counterPath;
    if (!p) throw new Error('No counter path — run the initialisation Given first.');
    const { correlationId } = bumpCounter({ xmlName, row, filePath: p });
    uCtx(this).lastBumpCorrelationId = correlationId;
  },
);

Then("Lloyd's counter file should record lastCorrelationId {string}", function (this: AutomationWorld, expected: string) {
  const p = uCtx(this).counterPath;
  if (!p) throw new Error('No counter path.');
  const raw = JSON.parse(fs.readFileSync(p, 'utf-8')) as { lastCorrelationId?: string };
  const got = raw.lastCorrelationId ?? '';
  if (got !== expected.trim()) {
    throw new Error(`Expected lastCorrelationId "${expected}", file has "${got}"`);
  }
});

Then("Lloyd's bumpCounter should have returned correlationId {string}", function (this: AutomationWorld, expected: string) {
  const got = uCtx(this).lastBumpCorrelationId ?? '';
  if (got !== expected.trim()) throw new Error(`Expected returned correlationId "${expected}", got "${got}"`);
});

Given("Lloyd's unit test XML path is {string}", function (this: AutomationWorld, rel: string) {
  uCtx(this).xmlTotalsPath = path.resolve(process.cwd(), rel.trim());
});

When("Lloyd's computeAdpTotalsFromFile runs on that path", function (this: AutomationWorld) {
  const p = uCtx(this).xmlTotalsPath;
  if (!p) throw new Error('No XML path.');
  if (!fs.existsSync(p)) throw new Error(`XML file not found: ${p}`);
  uCtx(this).lastAdpTotals = computeAdpTotalsFromFile(p);
});

Then("Lloyd's service-bus financial_values keys should be populated from those totals", function (this: AutomationWorld) {
  const totals = uCtx(this).lastAdpTotals;
  if (!totals) throw new Error('No totals — run computeAdpTotalsFromFile When step first.');
  const fv = totalsToServiceBusPayload(totals);
  for (const k of ['adp_prm', 'adp_com', 'adp_coi', 'adp_tax', 'adp_oth'] as const) {
    if (!Number.isFinite(fv[k])) throw new Error(`financial_values.${k} is not finite: ${String(fv[k])}`);
  }
  if (!fv.adp_currency || fv.adp_currency.trim().length < 3) {
    throw new Error(`Expected adp_currency from XML, got "${fv.adp_currency}"`);
  }
  if (totals.lineCount < 1) throw new Error('Expected at least one ledger line in sample XML.');
});

When("Lloyd's buildMuleXmlGenerationSuccessPayload is invoked with sample inputs", function (this: AutomationWorld) {
  uCtx(this).lastMulePayload = buildMuleXmlGenerationSuccessPayload({
    correlationId: '0000-0000-0000-09999',
    fileName: 'AEUM US-61273 202604161200.xml',
    blobId: 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/AEUM US-61273 202604161200.xml',
    financialValues: {
      adp_currency: 'USD',
      adp_prm: 100.1,
      adp_com: 200.2,
      adp_coi: 300.3,
      adp_tax: 400.4,
      adp_oth: 500.5,
    },
  });
});

Then("Lloyd's built payload should be a canonical mule-xml-generation-success shape", function (this: AutomationWorld) {
  const pl = uCtx(this).lastMulePayload;
  if (!pl) throw new Error('No payload — run the build When step first.');
  if (pl.message !== 'mule-xml-generation-success') {
    throw new Error(`Expected message mule-xml-generation-success, got "${pl.message}"`);
  }
  for (const k of ['correlation_id', 'file_name', 'blob_id', 'financial_values'] as const) {
    if (!(k in pl) || pl[k] === undefined) throw new Error(`Missing top-level key: ${k}`);
  }
  const fv = pl.financial_values;
  for (const fk of ['adp_currency', 'adp_prm', 'adp_com', 'adp_coi', 'adp_tax', 'adp_oth'] as const) {
    if (!(fk in fv)) throw new Error(`financial_values missing ${fk}`);
  }
  if (pl.correlation_id !== '0000-0000-0000-09999') throw new Error('Unexpected correlation_id');
});
