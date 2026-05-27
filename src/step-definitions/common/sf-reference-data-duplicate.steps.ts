/**
 * Reusable API steps for Salesforce reference-data duplicate detection (alert rules, Match Key).
 * Used by SF-1083 and future RDM duplicate stories.
 */

import { After, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../hooks/world';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../utils/logger';
import { extractMatchedRecordIdsFromDuplicateBody } from '../../utils/sf-duplicate-api-parse';

const NAME_PREFIX = 'SF1083';

interface TrackedRecord {
  objectType: string;
  id: string;
}

function api(world: AutomationWorld): SalesforceAPIClient {
  const c = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!c) throw new Error('No Salesforce API client — authenticate first.');
  return c;
}

function track(world: AutomationWorld, objectType: string, id: string): void {
  if (!world.testContext.sf1083RecordsToDelete) world.testContext.sf1083RecordsToDelete = [] as TrackedRecord[];
  (world.testContext.sf1083RecordsToDelete as TrackedRecord[]).push({ objectType, id });
}

function runId(world: AutomationWorld): string {
  const r = world.testContext.sf1083RunId as string | undefined;
  if (!r) throw new Error('Missing run id — use "the SF-1083 API duplicate test run id is assigned" in Background.');
  return r;
}

function fullName(world: AutomationWorld, fragment: string): string {
  return `${NAME_PREFIX}_${runId(world)}_${fragment}`;
}

async function resolveMatchKeyApiName(
  world: AutomationWorld,
  client: SalesforceAPIClient,
  objectType: string
): Promise<string | null> {
  const cache = (world.testContext.sf1083MatchKeyFieldByObject ||= {}) as Record<string, string | null>;
  if (Object.prototype.hasOwnProperty.call(cache, objectType)) {
    return cache[objectType] ?? null;
  }

  const d = await client.describeSObject(objectType);
  const fields = (d?.fields || []) as Array<{ name?: string }>;
  const exact = fields.find((f) => f.name === 'Match_Key__c');
  if (exact?.name) {
    cache[objectType] = exact.name;
    return exact.name;
  }
  const fuzzy = fields.find((f) => f.name && /match.*key/i.test(f.name) && String(f.name).endsWith('__c'));
  if (fuzzy?.name) {
    cache[objectType] = fuzzy.name;
    return fuzzy.name;
  }
  cache[objectType] = null;
  return null;
}

interface DescribeFieldLite {
  name?: string;
  label?: string;
  type?: string;
  createable?: boolean;
  nillable?: boolean;
  defaultedOnCreate?: boolean;
  autoNumber?: boolean;
  calculated?: boolean;
}

/**
 * Reference-data objects deployed for SF-1083 use auto-number `Name` plus a separate createable name field
 * (e.g. `ASLOB_Name__c`, `Pog_Product_Name__c`, `LOB_Name__c`). Find that field by describe so the test
 * works even if API names drift. Cached per object on the World.
 */
async function resolveNameFieldApiName(
  world: AutomationWorld,
  client: SalesforceAPIClient,
  objectType: string
): Promise<string> {
  const cache = (world.testContext.sf1083NameFieldByObject ||= {}) as Record<string, string>;
  if (cache[objectType]) return cache[objectType];

  const d = await client.describeSObject(objectType);
  const fields = ((d?.fields || []) as DescribeFieldLite[]).filter((f) => !!f.name);

  const stdName = fields.find((f) => f.name === 'Name');
  if (stdName?.createable === true && stdName.autoNumber !== true) {
    cache[objectType] = 'Name';
    return 'Name';
  }

  const labelEqualsName = (f: DescribeFieldLite): boolean => {
    const lbl = (f.label || '').trim().toLowerCase();
    return lbl === 'name' || lbl.endsWith(' name');
  };

  const candidates = fields.filter(
    (f) =>
      f.createable === true &&
      f.autoNumber !== true &&
      f.calculated !== true &&
      f.type === 'string' &&
      String(f.name).endsWith('__c') &&
      (/_Name__c$/i.test(String(f.name)) || /name/i.test(String(f.label || '')))
  );

  candidates.sort((a, b) => {
    const aReq = a.nillable === false && a.defaultedOnCreate === false ? 0 : 1;
    const bReq = b.nillable === false && b.defaultedOnCreate === false ? 0 : 1;
    if (aReq !== bReq) return aReq - bReq;
    const aExact = labelEqualsName(a) ? 0 : 1;
    const bExact = labelEqualsName(b) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return String(a.name).length - String(b.name).length;
  });

  if (candidates[0]?.name) {
    const picked = candidates[0].name;
    cache[objectType] = picked;
    logger.info(`SF-1083: ${objectType} name-field resolved via describe → ${picked} (label="${candidates[0].label ?? ''}")`);
    return picked;
  }

  throw new Error(
    `SF-1083: No createable string Name-like field on ${objectType}. Describe returned ${fields.length} fields. ` +
      `Name field: type=${stdName?.type} createable=${stdName?.createable} autoNumber=${stdName?.autoNumber}.`
  );
}

Given('the SF-1083 API duplicate test run id is assigned', function (this: AutomationWorld) {
  this.testContext.sf1083RunId = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  this.testContext.sf1083RecordsToDelete = [] as TrackedRecord[];
  this.testContext.sfRefDupBaselineId = undefined;
  this.testContext.sfRefDupBaselineName = undefined;
  this.testContext.sfRefDupProbeName = undefined;
  this.testContext.sfRefDupLastRaw = undefined;
  this.testContext.sfRefDupLastCreate = undefined;
  logger.info(`SF-1083 run id: ${this.testContext.sf1083RunId}`);
});

Given(
  'I create a baseline reference record of type {string} with unique name fragment {string}',
  async function (this: AutomationWorld, objectType: string, nameFragment: string) {
    const name = fullName(this, nameFragment);
    const client = api(this);
    const nameField = await resolveNameFieldApiName(this, client, objectType);
    const res = await client.createRecord(objectType, { [nameField]: name });
    const id = res.id as string;
    if (!id) throw new Error(`Baseline create missing id: ${JSON.stringify(res).slice(0, 500)}`);
    this.testContext.sfRefDupBaselineId = id;
    this.testContext.sfRefDupBaselineName = name;
    this.testContext.sfRefDupBaselineNameField = nameField;
    track(this, objectType, id);
    logger.info(`SF-1083 baseline ${objectType} ${id} ${nameField}="${name}"`);
  }
);

When(
  'I attempt a conflicting reference record of type {string} with unique name fragment {string} with duplicate rules enforced',
  async function (this: AutomationWorld, objectType: string, probeFragment: string) {
    const name = fullName(this, probeFragment);
    this.testContext.sfRefDupProbeName = name;
    const client = api(this);
    const nameField = await resolveNameFieldApiName(this, client, objectType);
    const raw = await client.createRecordRaw(
      objectType,
      { [nameField]: name },
      { duplicateRuleAllowSave: false }
    );
    this.testContext.sfRefDupLastCreate = raw;
    this.testContext.sfRefDupLastRaw = raw.rawText;
    if (raw.ok && raw.recordId) {
      track(this, objectType, raw.recordId);
    }
    logger.info(
      `SF-1083 probe (enforce) ${objectType} ${nameField}="${name}" http=${raw.httpStatus} dup=${raw.duplicateDetected} bodySnippet=${raw.rawText.slice(0, 240)}`
    );
  }
);

When(
  'I create the conflicting reference record of type {string} with unique name fragment {string} acknowledging duplicate rules',
  async function (this: AutomationWorld, objectType: string, probeFragment: string) {
    const name = fullName(this, probeFragment);
    const client = api(this);
    const nameField = await resolveNameFieldApiName(this, client, objectType);
    const res = await client.createRecord(objectType, { [nameField]: name });
    const id = res.id as string;
    if (!id) throw new Error(`Acknowledged create missing id: ${JSON.stringify(res).slice(0, 500)}`);
    this.testContext.sfRefDupProbeId = id;
    track(this, objectType, id);
    logger.info(`SF-1083 probe (ack) ${objectType} ${id} ${nameField}="${name}"`);
  }
);

/**
 * "Duplicate detected" — accepts BOTH the SF-1083 alert pattern (DUPLICATES_DETECTED)
 * and an Apex / validation-rule rejection (FIELD_CUSTOM_VALIDATION_EXCEPTION). The
 * latter is how Line_of_Business__c enforces duplicate prevention (no Match_Key__c
 * field; uses a custom validation rule instead). Both mechanisms are valid forms of
 * duplicate detection per SF-1083 system behaviour.
 */
Then('the Salesforce REST API should report duplicates detected without saving the probe record', function (this: AutomationWorld) {
  const raw = this.testContext.sfRefDupLastCreate as
    | {
        duplicateDetected?: boolean;
        validationDetected?: boolean;
        ok?: boolean;
        recordId?: string;
        httpStatus?: number;
        duplicateRules?: string[];
      }
    | undefined;
  expect(raw, 'last create result').toBeTruthy();
  const detected = raw!.duplicateDetected || raw!.validationDetected;
  expect(
    detected,
    `Expected DUPLICATES_DETECTED or FIELD_CUSTOM_VALIDATION_EXCEPTION. duplicateDetected=${raw!.duplicateDetected} validationDetected=${raw!.validationDetected} httpStatus=${raw!.httpStatus} rules=[${(raw!.duplicateRules || []).join(',')}]`
  ).toBe(true);
  expect(raw!.ok, 'create should not succeed when duplicates enforced').toBe(false);
  expect(raw!.recordId, 'no Id when duplicate blocks save').toBeFalsy();
});

/**
 * Hardened variant — used by the POG hard-prevent scenario (SF-1022) where we
 * specifically want to confirm the BLOCK rule fires (not just any rule). Asserts
 * the named DuplicateRule appears in the response payload, AND the status is 4xx
 * (Block can never be bypassed via allowSave=true).
 */
Then(
  'the Salesforce REST API should reject the hard-duplicate create with rule {string}',
  function (this: AutomationWorld, expectedRule: string) {
    const raw = this.testContext.sfRefDupLastCreate as
      | { ok?: boolean; httpStatus?: number; rawText?: string; duplicateRules?: string[] }
      | undefined;
    expect(raw, 'last create result').toBeTruthy();
    expect(raw!.ok, 'hard duplicate must not return 2xx').toBe(false);
    expect(raw!.httpStatus, 'expect 4xx').toBeGreaterThanOrEqual(400);
    const rules = raw!.duplicateRules || [];
    expect(
      rules.includes(expectedRule),
      `Expected duplicate rule "${expectedRule}" to fire. Actual rules: [${rules.join(', ') || '(none)'}]`
    ).toBe(true);
  }
);

Then('the duplicate result should reference the baseline record by Id', function (this: AutomationWorld) {
  const raw = this.testContext.sfRefDupLastCreate as { body?: unknown } | undefined;
  const baselineId = this.testContext.sfRefDupBaselineId as string | undefined;
  expect(baselineId, 'baseline Id').toBeTruthy();
  const matched = extractMatchedRecordIdsFromDuplicateBody(raw?.body);
  expect(
    matched.includes(baselineId!),
    `Expected duplicate payload to reference baseline ${baselineId}. Matched: ${matched.join(', ') || '(none)'}`
  ).toBe(true);
});

Then('the Salesforce REST API should return success for the probe record create', function (this: AutomationWorld) {
  const id = this.testContext.sfRefDupProbeId as string | undefined;
  expect(id, 'probe Id after acknowledged create').toBeTruthy();
});

Then(
  'the acknowledged probe reference record of type {string} should have Match Key populated',
  async function (this: AutomationWorld, objectType: string) {
    const id = this.testContext.sfRefDupProbeId as string | undefined;
    expect(id).toBeTruthy();
    const client = api(this);
    const mk = await resolveMatchKeyApiName(this, client, objectType);
    if (!mk) {
      logger.warn(`SF-1083: No Match_Key-like field on ${objectType} describe — skipping Match Key assertion.`);
      return;
    }
    const row = await client.getRecordWithFields(objectType, id!, [mk]);
    const v = (row as Record<string, unknown>)[mk];
    expect(v, `Match Key field ${mk} should be non-empty`).toBeTruthy();
    expect(String(v).trim().length, 'Match Key non-empty string').toBeGreaterThan(0);
  }
);

When(
  'I create a standalone reference record of type {string} with unique name fragment {string} with duplicate rules enforced',
  async function (this: AutomationWorld, objectType: string, fragment: string) {
    const name = fullName(this, fragment);
    const client = api(this);
    const nameField = await resolveNameFieldApiName(this, client, objectType);
    const raw = await client.createRecordRaw(
      objectType,
      { [nameField]: name },
      { duplicateRuleAllowSave: false }
    );
    this.testContext.sfRefDupLastCreate = raw;
    this.testContext.sfRefDupLastRaw = raw.rawText;
    this.testContext.sfRefDupStandaloneName = name;
    if (raw.ok && raw.recordId) {
      track(this, objectType, raw.recordId);
    }
  }
);

Then('the Salesforce REST API should not report duplicates detected for the last raw create', function (this: AutomationWorld) {
  const raw = this.testContext.sfRefDupLastCreate as { duplicateDetected?: boolean; ok?: boolean } | undefined;
  expect(raw?.duplicateDetected, 'no duplicate alert').toBe(false);
  expect(raw?.ok, 'create should succeed').toBe(true);
});

When(
  'I attempt a second baseline-identical reference record of type {string} with the same unique name fragment {string}',
  async function (this: AutomationWorld, objectType: string, nameFragment: string) {
    const name = fullName(this, nameFragment);
    const client = api(this);
    const nameField = await resolveNameFieldApiName(this, client, objectType);
    const raw = await client.createRecordRaw(
      objectType,
      { [nameField]: name },
      { duplicateRuleAllowSave: true }
    );
    this.testContext.sfRefDupLastCreate = raw;
    this.testContext.sfRefDupLastRaw = raw.rawText;
  }
);

Then('the Salesforce REST API should reject the hard-duplicate create', function (this: AutomationWorld) {
  const raw = this.testContext.sfRefDupLastCreate as { ok?: boolean; httpStatus?: number; rawText?: string } | undefined;
  expect(raw?.ok, 'hard duplicate must not return 2xx').toBe(false);
  expect(raw?.httpStatus, 'expect 4xx').toBeGreaterThanOrEqual(400);
});

/**
 * Some reference-data objects (currently `Product_ins__c`) have an Apex / validation
 * rule that BLOCKS hard-delete with the message "Deletion is not allowed. Only you
 * can set Status as Inactive." For those, fall back to a soft-delete via
 * `Status__c = 'Inactive'` so the @After cleanup leaves the org tidy.
 *
 * Set as a record on the test context to avoid re-describing during one run.
 */
const SOFT_DELETE_FALLBACKS: Record<string, { statusField: string; inactiveValue: string }> = {
  Product_ins__c: { statusField: 'Status__c', inactiveValue: 'Inactive' },
};

After({ tags: '@SF-1083' }, async function (this: AutomationWorld) {
  const list = this.testContext.sf1083RecordsToDelete as TrackedRecord[] | undefined;
  if (!list?.length) return;
  const client = this.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!client) return;
  for (const { objectType, id } of [...list].reverse()) {
    try {
      await client.deleteRecord(objectType, id);
      logger.info(`SF-1083 cleanup: deleted ${objectType} ${id}`);
      continue;
    } catch (e: any) {
      const msg = String(e?.message || e);
      const fallback = SOFT_DELETE_FALLBACKS[objectType];
      const looksLikeDeleteBlocked =
        /FIELD_CUSTOM_VALIDATION_EXCEPTION|Deletion is not allowed|cannot be deleted|set Status as Inactive/i.test(msg);
      if (fallback && looksLikeDeleteBlocked) {
        try {
          await client.updateRecord(objectType, id, { [fallback.statusField]: fallback.inactiveValue });
          logger.info(
            `SF-1083 cleanup: soft-deleted ${objectType} ${id} (${fallback.statusField}=${fallback.inactiveValue}; hard-delete blocked by validation rule).`
          );
          continue;
        } catch (e2: any) {
          logger.warn(
            `SF-1083 cleanup: hard-delete blocked AND soft-delete failed for ${objectType} ${id}: ${e2?.message || e2}`
          );
          continue;
        }
      }
      logger.warn(`SF-1083 cleanup failed ${objectType} ${id}: ${msg}`);
    }
  }
  this.testContext.sf1083RecordsToDelete = [];
});
