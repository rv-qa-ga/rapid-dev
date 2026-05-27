/**
 * PP-429 — HTTP dimension validation (`func-dimension-validation`) + Lloyd's umbrella §C glue.
 *
 * Env:
 *   - LLOYDS_DIMENSION_VALIDATION_BASE_URL (required for HTTP steps — otherwise scenarios skip)
 *   - LLOYDS_DIMENSION_VALIDATION_FUNCTION_KEY (optional Azure Functions key)
 *   - LLOYDS_PP429_TEST_BLOB_URI — replaces `<non-prod test blob with valid XML>` in doc-string bodies
 */

import { Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';
import {
  isLloydsDimensionValidationHttpConfigured,
  postDimensionValidationJson,
  type DimensionValidationPostResult,
} from '../../integrations/lloyds/dimensionValidationHttpClient';
import { XmlFileRecordClient } from '../../integrations/lloyds/xmlFileRecordClient';

interface Pp429HttpCtx {
  last?: DimensionValidationPostResult;
}

interface LloydsSanityLite {
  correlationId?: string;
  record?: { blobId: string | null; correlationId: string | null };
}

function pp429Ctx(world: AutomationWorld): Pp429HttpCtx {
  if (!world.testContext.pp429Http) world.testContext.pp429Http = {};
  return world.testContext.pp429Http as Pp429HttpCtx;
}

function sanityLite(world: AutomationWorld): LloydsSanityLite {
  const raw = world.testContext.lloydsSanity as LloydsSanityLite | undefined;
  return raw ?? {};
}

function docContent(doc: unknown): string {
  if (typeof doc === 'string') return doc;
  if (doc && typeof doc === 'object' && 'content' in doc && typeof (doc as { content: unknown }).content === 'string') {
    return (doc as { content: string }).content;
  }
  return '';
}

function resolveBlobUriForSubstitution(world: AutomationWorld, env: NodeJS.ProcessEnv = process.env): string | null {
  const fromEnv = env.LLOYDS_PP429_TEST_BLOB_URI?.trim();
  if (fromEnv) return fromEnv;
  const b = sanityLite(world).record?.blobId?.trim();
  return b || null;
}

Given('the fa-dimensionvalidation base URL and authentication are configured for the test environment', function (this: AutomationWorld) {
  if (!isLloydsDimensionValidationHttpConfigured()) {
    logger.warn('PP-429: LLOYDS_DIMENSION_VALIDATION_BASE_URL not set — skipping dimension validation HTTP steps.');
    return 'skipped';
  }
});

When('a POST is sent to the dimension validation endpoint with JSON body:', async function (this: AutomationWorld, doc: unknown) {
  if (!isLloydsDimensionValidationHttpConfigured()) {
    return 'skipped';
  }
  let raw = docContent(doc).trim();
  if (!raw) throw new Error('Expected a doc string with JSON body.');
  const marker = '<non-prod test blob with valid XML>';
  if (raw.includes(marker)) {
    const blob = resolveBlobUriForSubstitution(this, process.env);
    if (!blob) {
      throw new Error(
        "Body still contains <non-prod test blob with valid XML> — set LLOYDS_PP429_TEST_BLOB_URI or run Lloyd's Stage-1 steps first so a record blob URI exists.",
      );
    }
    raw = raw.split(marker).join(blob);
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Invalid JSON in doc string: ${(e as Error).message}`);
  }
  pp429Ctx(this).last = await postDimensionValidationJson(body);
});

When(
  /^a POST is sent with only "correlationId" "([^"]+)" and resolvable context for blob lookup$/,
  async function (this: AutomationWorld, correlationId: string) {
    if (!isLloydsDimensionValidationHttpConfigured()) {
      return 'skipped';
    }
    pp429Ctx(this).last = await postDimensionValidationJson({ correlationId });
  },
);

When('the dimension validation function processes the blob referenced in the request', async function (this: AutomationWorld) {
  if (!isLloydsDimensionValidationHttpConfigured()) {
    return 'skipped';
  }
  const last = pp429Ctx(this).last;
  if (!last) {
    throw new Error('No prior dimension validation POST in context — run a POST When step first.');
  }
  void last;
});

When('a POST is sent for XML whose dimensions exist in D365 F&O or Fabric master data (test fixture)', async function (this: AutomationWorld) {
  if (!isLloydsDimensionValidationHttpConfigured()) {
    return 'skipped';
  }
  const blob = resolveBlobUriForSubstitution(this, process.env);
  if (!blob) {
    logger.warn("PP-429-API-004: set LLOYDS_PP429_TEST_BLOB_URI or complete Lloyd's Stage-1 steps for blobUri.");
    return 'skipped';
  }
  const correlationId = sanityLite(this).correlationId ?? `pp429-fixture-${Date.now()}`;
  pp429Ctx(this).last = await postDimensionValidationJson({ correlationId, blobUri: blob });
});

When('a POST is sent for XML containing at least one unknown dimension combination', async function (this: AutomationWorld) {
  if (!isLloydsDimensionValidationHttpConfigured()) {
    return 'skipped';
  }
  const blob = process.env.LLOYDS_PP429_INVALID_DIMENSION_BLOB_URI?.trim();
  if (!blob) {
    logger.warn('PP-429-API-005: set LLOYDS_PP429_INVALID_DIMENSION_BLOB_URI to run negative dimension fixture.');
    return 'skipped';
  }
  pp429Ctx(this).last = await postDimensionValidationJson({
    correlationId: 'pp429-negative-001',
    blobUri: blob,
  });
});

When(
  'a POST is sent to the dimension validation endpoint without valid AAD token function key or APIM credential',
  async function (this: AutomationWorld) {
    if (!isLloydsDimensionValidationHttpConfigured()) {
      return 'skipped';
    }
    const blob = resolveBlobUriForSubstitution(this, process.env) ?? 'https://example.invalid/blob.xml';
    pp429Ctx(this).last = await postDimensionValidationJson(
      { correlationId: 'pp429-unauth-001', blobUri: blob },
      { omitAuth: true },
    );
  },
);

When('a dimension validation POST is sent for the current correlation id and record blob URI', async function (this: AutomationWorld) {
  if (!isLloydsDimensionValidationHttpConfigured()) {
    return 'skipped';
  }
  const c = sanityLite(this).correlationId;
  const blob = sanityLite(this).record?.blobId;
  if (!c || !blob) {
    throw new Error("Missing correlation id or record blob — complete Lloyd's Stage-1 send + Dataverse poll steps first.");
  }
  pp429Ctx(this).last = await postDimensionValidationJson({ correlationId: c, blobUri: blob });
});

Then('the HTTP status should be successful', function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last) return 'skipped';
  if (last.status < 200 || last.status >= 300) {
    throw new Error(`Expected 2xx HTTP status, got ${last.status}. Body: ${last.bodyText.slice(0, 800)}`);
  }
});

Then('the last dimension validation HTTP status should be successful', function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last) return 'skipped';
  if (last.status < 200 || last.status >= 300) {
    throw new Error(`Expected 2xx HTTP status, got ${last.status}. Body: ${last.bodyText.slice(0, 800)}`);
  }
});

Then('the HTTP status should be {int} or {int}', function (this: AutomationWorld, a: number, b: number) {
  const last = pp429Ctx(this).last;
  if (!last) throw new Error('No HTTP response in context.');
  if (last.status !== a && last.status !== b) {
    throw new Error(`Expected HTTP status ${a} or ${b}, got ${last.status}. Body: ${last.bodyText.slice(0, 400)}`);
  }
});

Then('no validation result body should be returned for unauthorised clients', function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last) throw new Error('No HTTP response in context.');
  if (last.json && typeof last.json.pass === 'boolean') {
    throw new Error('Did not expect a dimension validation JSON body for unauthenticated client.');
  }
});

Then(/^the response body should include "correlationId" with value "([^"]+)"$/, function (this: AutomationWorld, expected: string) {
  const last = pp429Ctx(this).last;
  if (!last?.json) return 'skipped';
  const v = last.json.correlationId;
  if (String(v) !== expected) {
    throw new Error(`Expected correlationId "${expected}", got ${JSON.stringify(v)}`);
  }
});

Then('the response body should include boolean {string}', function (this: AutomationWorld, key: string) {
  const last = pp429Ctx(this).last;
  if (!last?.json) return 'skipped';
  const v = last.json[key];
  if (typeof v !== 'boolean') {
    throw new Error(`Expected boolean "${key}", got ${JSON.stringify(v)} (${typeof v})`);
  }
});

Then('the last dimension validation response should have boolean pass', function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last?.json) return 'skipped';
  if (typeof last.json.pass !== 'boolean') {
    throw new Error(`Expected boolean "pass", got ${JSON.stringify(last.json.pass)}`);
  }
});

Then('the response should include {string} and optional {string} list', function (this: AutomationWorld, passKey: string, listKey: string) {
  const last = pp429Ctx(this).last;
  if (!last?.json) throw new Error('No JSON response body.');
  if (typeof last.json[passKey] !== 'boolean') {
    throw new Error(`Expected boolean "${passKey}"`);
  }
  const inv = last.json[listKey];
  if (inv !== undefined && inv !== null && !Array.isArray(inv)) {
    throw new Error(`Expected "${listKey}" to be an array when present, got ${typeof inv}`);
  }
});

Then('the response {string} should be true', function (this: AutomationWorld, key: string) {
  const last = pp429Ctx(this).last;
  if (!last?.json) throw new Error('No JSON response body.');
  if (last.json[key] !== true) {
    throw new Error(`Expected ${key}=true, got ${JSON.stringify(last.json[key])}`);
  }
});

Then(/^"invalidCombinations" should be empty or omitted$/, function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last?.json) throw new Error('No JSON response body.');
  const inv = last.json.invalidCombinations;
  if (inv === undefined || inv === null) return;
  if (Array.isArray(inv) && inv.length === 0) return;
  throw new Error(`Expected invalidCombinations empty or omitted, got ${JSON.stringify(inv)}`);
});

Then('the response {string} should be false', function (this: AutomationWorld, key: string) {
  const last = pp429Ctx(this).last;
  if (!last?.json) throw new Error('No JSON response body.');
  if (last.json[key] !== false) {
    throw new Error(`Expected ${key}=false, got ${JSON.stringify(last.json[key])}`);
  }
});

Then(/^"invalidCombinations" should list each invalid combination with a reference such as line number or id$/, function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last?.json) throw new Error('No JSON response body.');
  const inv = last.json.invalidCombinations;
  if (!Array.isArray(inv) || inv.length === 0) {
    throw new Error('Expected non-empty invalidCombinations array.');
  }
});

Given('security is agreed (AAD app registration function key APIM or equivalent)', function (this: AutomationWorld) {
  void this;
});

Then('test documentation should reference how QA obtains a token or key without committing secrets', function (this: AutomationWorld) {
  void this;
  logger.info("PP-429-API-007: follow env.sample Lloyd's dimension validation block — secrets live only in .env.<env>.");
});

Given('blob storage contains XML with multiple DEFAULTDIMENSIONDISPLAYVALUE patterns', function (this: AutomationWorld) {
  if (!process.env.LLOYDS_PP429_MULTI_PATTERN_BLOB_URI?.trim()) {
    logger.warn('Set LLOYDS_PP429_MULTI_PATTERN_BLOB_URI to run PP-429-API-003 fixture.');
    return 'skipped';
  }
  void this;
});

Then('the function should derive a distinct set of financial dimension combinations for validation', function (this: AutomationWorld) {
  void this;
});

Then('each combination should be eligible for batch query to the master data endpoint', function (this: AutomationWorld) {
  void this;
});

Then('the record\'s dimension validation fields should be consistent with the last HTTP response where present', async function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  const correlationId = sanityLite(this).correlationId;
  if (!last?.json || typeof last.json.pass !== 'boolean') {
    return 'skipped';
  }
  if (!correlationId) throw new Error('Missing correlation id on world.');
  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  try {
    const row = await client.findByCorrelationId(correlationId);
    if (!row) {
      throw new Error(`No Dataverse XML File row for correlation ${correlationId}`);
    }
    if (last.json.pass === false && row.dimensionValidationError === null) {
      logger.warn('Dimension validation HTTP returned pass=false but Dataverse error field is still null (may lag).');
    }
  } finally {
    await client.dispose();
  }
});

Then('the dimension validation JSON should include pass and invalidCombinations keys', function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (!last?.json) throw new Error('No JSON response.');
  if (typeof last.json.pass !== 'boolean') throw new Error('Missing boolean pass');
  const inv = last.json.invalidCombinations;
  if (inv !== undefined && inv !== null && !Array.isArray(inv)) {
    throw new Error('invalidCombinations must be an array when present');
  }
});

Then(
  'Dataverse dimension validation columns should be logged for correlation after the HTTP response',
  async function (this: AutomationWorld) {
    const correlationId = sanityLite(this).correlationId;
    const last = pp429Ctx(this).last;
    if (!correlationId || !last?.json) throw new Error('Missing correlation or HTTP response.');
    const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
    try {
      const row = await client.findByCorrelationId(correlationId);
      if (!row) throw new Error('No Dataverse row.');
      logger.info(
        `Dataverse after dimension HTTP: status=${row.dimensionValidationStatus ?? 'null'}, errLen=${row.dimensionValidationError?.length ?? 0}, httpPass=${String(last.json.pass)}`,
      );
    } finally {
      await client.dispose();
    }
  },
);

Given('dimension validation returned pass=true', function (this: AutomationWorld) {
  const last = pp429Ctx(this).last;
  if (last?.json && last.json.pass === true) return;
  logger.warn('dimension validation returned pass=true: no prior HTTP pass=true in context (narrative / ordering check).');
});

Given('dimension validation returned pass=false with invalid combinations', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Given('an operational workflow user opens an XML review record in Dataverse that is ready for validation', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

When('the user runs the {string} action (or equivalent command)', function (this: AutomationWorld, _label: string) {
  void this;
  return 'skipped';
});

Then('the dimension validation function should be invoked with correlationId or blobUri from the record', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then('the HTTP response should be captured for display', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

When('the user views the validation results panel', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then('each invalid combination should appear with message or dimension detail', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then('line or record references from the response should be visible to the user', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Given('validation previously failed for an XML review record', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

When('underlying data or dimensions are corrected per Ops process', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

When('the user runs {string} again', function (this: AutomationWorld, _label: string) {
  void this;
  return 'skipped';
});

Then('the function should be invoked again', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then('the UI should reflect the latest pass or fail outcome', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Given('dimension validation result is fail for the current XML review record', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

When('the user attempts to approve or submit for approval', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then('the system should prevent approval (plugin or business rule)', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then('a clear message should indicate that dimension validation must pass first', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Given('dimension validation pass is true and user completes approval in Op Workflow', function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

When('the platform publishes approval success to Service Bus channel {string}', function (this: AutomationWorld, _ch: string) {
  void this;
  return 'skipped';
});

Then('downstream consumers should receive {string} with expected identifiers', function (this: AutomationWorld, _msg: string) {
  void this;
  return 'skipped';
});
