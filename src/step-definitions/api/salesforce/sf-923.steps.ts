/**
 * SF-923 — Product_Map__c Dataverse_ID__c (MuleSoft / Dataverse alignment).
 * Reuses: SalesforceAPIClient, AutomationWorld.testContext.
 */

import { randomUUID } from 'crypto';
import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const PRODUCT_MAP = 'Product_Map__c';
const DV_FIELD = 'Dataverse_ID__c';
/** Story error text (leading sentence is enough for API message matching). */
const SF923_SYSTEM_MANAGED_SNIPPET = 'Dataverse ID is system-managed';

function truncateForEvidence(obj: unknown, max = 6000): string {
  const s = JSON.stringify(obj, null, 2);
  if (s.length <= max) {
    return s;
  }
  return `${s.slice(0, max)}… (truncated)`;
}

async function attachSalesforceApiEvidence(world: AutomationWorld, doc: Record<string, unknown>): Promise<void> {
  const payload = { evidenceType: 'salesforce-rest', ...doc, capturedAt: new Date().toISOString() };
  const text = JSON.stringify(payload, null, 2);
  if (typeof world.attach === 'function') {
    await world.attach(text, 'application/json');
  }
}

function requireApiClient(world: AutomationWorld): SalesforceAPIClient {
  const api = world.testContext.apiClient as SalesforceAPIClient;
  if (!api) {
    throw new Error('API client not initialized. Run "I have a valid Salesforce API token" first.');
  }
  return api;
}

async function resolveBlankProductMap(world: AutomationWorld, api: SalesforceAPIClient): Promise<void> {
  const q = await api.query(
    `SELECT Id FROM ${PRODUCT_MAP} WHERE (${DV_FIELD} = null OR ${DV_FIELD} = '') ORDER BY CreatedDate DESC LIMIT 1`
  );
  if (q.records && q.records.length > 0) {
    world.testContext.sf923ProductMapId = (q.records[0] as { Id: string }).Id;
    logger.info(`SF-923: using existing blank Product_Map__c ${world.testContext.sf923ProductMapId}`);
    return;
  }
  const name = `SF923-Auto-${Date.now()}`;
  const res = await api.createRecord(PRODUCT_MAP, { Name: name });
  const id = (res as { id?: string }).id;
  if (!id) {
    throw new Error(
      `SF-923: create Product_Map__c failed or returned no id. Add required fields for your org. Response: ${JSON.stringify(res)}`
    );
  }
  world.testContext.sf923ProductMapId = id;
  logger.info(`SF-923: created blank Product_Map__c ${id}`);
}

// ─── Manual RBT (metadata / Setup) ───────────────────────────────────────────

Then(
  'the Product_Map__c field {string} should be readable and updateable for the integration user via describe',
  async function (this: AutomationWorld, apiName: string) {
    const api = requireApiClient(this);
    const fields = this.testContext.fieldsMetadata as { name: string; updateable?: boolean }[] | undefined;
    if (!fields) {
      throw new Error('No field metadata. Run \'When I describe the "Product_Map__c" object\' first.');
    }
    const f = fields.find((x) => x.name === apiName);
    if (!f) {
      throw new Error(
        `Field "${apiName}" is not in the describe result for this user — Read FLS is likely missing (Setup → Field Accessibility / permission sets).`
      );
    }
    if (f.updateable !== true) {
      throw new Error(
        `SF-923 FLS: "${apiName}" must be updateable=true for the MuleSoft integration user; describe returned updateable=${f.updateable}. Grant Edit via permission set if the field is Hidden on profiles.`
      );
    }
    await attachSalesforceApiEvidence(this, {
      label: 'SF-923 GET SObject describe (integration user, Product_Map__c)',
      method: 'GET',
      uri: api.getSObjectDescribeUri('Product_Map__c'),
      responseNote: `Field "${apiName}" updateable=${f.updateable}. Full describe JSON omitted for size.`,
    });
    logger.info(`✅ SF-923 FLS/describe: ${apiName} is present and updateable for integration user`);
  }
);

When('I query Product_Map__c with Dataverse_ID__c column via API for SF-923', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  const id = this.testContext.sf923ProductMapId as string | undefined;
  const soql = id
    ? `SELECT Id, ${DV_FIELD} FROM ${PRODUCT_MAP} WHERE Id = '${id}'`
    : `SELECT Id, ${DV_FIELD} FROM ${PRODUCT_MAP} LIMIT 1`;
  const r = await api.query(soql);
  this.testContext.sf923MuleFlsSoql = r;
});

Then(
  'the Product_Map__c SOQL query for SF-923 should succeed with Dataverse_ID__c in the select list',
  async function (this: AutomationWorld) {
    const r = this.testContext.sf923MuleFlsSoql as { done?: boolean; records?: Record<string, unknown>[] } | undefined;
    if (!r) {
      throw new Error('No SOQL result. Run "I query Product_Map__c with Dataverse_ID__c column via API for SF-923" first.');
    }
    if (r.done !== true) {
      throw new Error(`Expected SOQL done=true, got ${JSON.stringify(r.done)}`);
    }
    if (!Array.isArray(r.records)) {
      throw new Error('SOQL response missing records array');
    }
    if (r.records.length > 0 && !(DV_FIELD in r.records[0])) {
      throw new Error(`SOQL row missing "${DV_FIELD}" — read FLS may block returning this column.`);
    }
    logger.info('✅ SF-923: SOQL SELECT Id, Dataverse_ID__c succeeded for integration user');
  }
);

Then('RBT SF-923 checklist - Dataverse_ID__c excluded from all Product_Map__c page layouts', async function (this: AutomationWorld) {
  const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
  const name = this.testContext.describedObjectName as string | undefined;
  if (api && name === 'Product_Map__c') {
    await attachSalesforceApiEvidence(this, {
      label: 'SF-923 API-001 GET SObject describe (Product_Map__c)',
      method: 'GET',
      uri: api.getSObjectDescribeUri('Product_Map__c'),
      responseNote: `Describe returned ${(this.testContext.fieldsMetadata as unknown[])?.length ?? 0} fields (full JSON omitted for size).`,
    });
  }
  logger.info(
    'MANUAL RBT (SF-923): Setup → Object Manager → Product Map → Page Layouts — ensure Dataverse_ID__c is not on any layout.'
  );
});

Then('RBT SF-923 checklist - Dataverse_ID__c hidden from standard user profiles in the UI', async function () {
  logger.info(
    'MANUAL RBT (SF-923): Field-Level Security — standard profiles must not have Read/Edit on Dataverse_ID__c for UI.'
  );
});

Then('RBT SF-923 checklist - only the MuleSoft integration identity can set the field via API', async function () {
  logger.info(
    'MANUAL RBT (SF-923): Confirm integration profile (or permission set) grants API Edit on Dataverse_ID__c only for the MuleSoft user.'
  );
});

// ─── Scenario 2 ──────────────────────────────────────────────────────────────

Given('a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  await resolveBlankProductMap(this, api);
});

When('I query the SF-923 Product_Map__c record including Dataverse_ID__c', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  const id = this.testContext.sf923ProductMapId as string;
  if (!id) {
    throw new Error('No sf923ProductMapId. Run "a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c" first.');
  }
  const soql = `SELECT Id, ${DV_FIELD} FROM ${PRODUCT_MAP} WHERE Id = '${id}'`;
  const r = await api.query(soql);
  this.testContext.sf923LastQuery = r;
  await attachSalesforceApiEvidence(this, {
    label: 'SF-923 GET query (default API user SOQL)',
    method: 'GET',
    uri: api.getSoqlQueryUri(soql),
    soql,
    httpStatus: 200,
    responseBody: truncateForEvidence(r),
  });
});

Then('the SF-923 Product_Map__c Dataverse_ID__c should be blank', async function (this: AutomationWorld) {
  const r = this.testContext.sf923LastQuery as { records?: { Dataverse_ID__c?: string | null }[] };
  if (!r?.records?.length) {
    throw new Error('No query result. Run the SF-923 query step first.');
  }
  const v = r.records[0].Dataverse_ID__c;
  if (v != null && String(v).trim() !== '') {
    throw new Error(`Expected ${DV_FIELD} blank, got: ${JSON.stringify(v)}`);
  }
  logger.info(`✅ SF-923: ${DV_FIELD} is blank on Product_Map__c`);
});

// ─── Scenario 3 ──────────────────────────────────────────────────────────────

When('the MuleSoft integration user sets Dataverse_ID__c on the SF-923 Product_Map__c via API', async function (this: AutomationWorld) {
  const muleUser = process.env.SF_MULESOFT_INTEGRATION_JWT_USERNAME?.trim();
  if (!muleUser) {
    throw new Error(
      'SF-923 API-003: Set SF_MULESOFT_INTEGRATION_JWT_USERNAME in .env (MuleSoft integration JWT username, same connected app as other JWT users unless documented otherwise).'
    );
  }
  const id = this.testContext.sf923ProductMapId as string;
  if (!id) {
    throw new Error('No sf923ProductMapId. Run the blank Product_Map__c Given step first.');
  }
  const guid = randomUUID();
  this.testContext.sf923IntegrationGuid = guid;

  const muleClient = new SalesforceAPIClient(this.apiContext);
  await muleClient.authenticate(muleUser);
  const raw = await muleClient.patchSObjectRaw(PRODUCT_MAP, id, { [DV_FIELD]: guid });
  await attachSalesforceApiEvidence(this, {
    label: 'SF-923 PATCH Dataverse_ID__c (MuleSoft integration user)',
    method: 'PATCH',
    uri: raw.uri,
    requestBody: { [DV_FIELD]: guid },
    httpStatus: raw.httpStatus,
    responseBody: raw.responseBody,
  });
  if (!raw.ok) {
    throw new Error(`Failed to update record: ${raw.responseBody}`);
  }
  logger.info(`SF-923: MuleSoft JWT user set ${DV_FIELD} on ${id}`);
});

Then('the SF-923 Product_Map__c Dataverse_ID__c should match the value set by integration', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  const id = this.testContext.sf923ProductMapId as string;
  const expected = this.testContext.sf923IntegrationGuid as string;
  if (!expected) {
    throw new Error('No sf923IntegrationGuid. Run the MuleSoft integration When step first.');
  }
  const r = await api.query(`SELECT Id, ${DV_FIELD} FROM ${PRODUCT_MAP} WHERE Id = '${id}'`);
  const row = r.records?.[0] as { Dataverse_ID__c?: string } | undefined;
  const actual = row?.Dataverse_ID__c;
  if (actual !== expected) {
    throw new Error(`Expected ${DV_FIELD}="${expected}", got ${JSON.stringify(actual)}`);
  }
  logger.info('✅ SF-923: Dataverse_ID__c matches integration value');
});

When(
  'the MuleSoft integration user attempts to patch Dataverse_ID__c again on the SF-923 Product_Map__c via API',
  async function (this: AutomationWorld) {
    const muleUser = process.env.SF_MULESOFT_INTEGRATION_JWT_USERNAME?.trim();
    if (!muleUser) {
      throw new Error(
        'SF-923 API-007: Set SF_MULESOFT_INTEGRATION_JWT_USERNAME in .env (MuleSoft integration JWT username).'
      );
    }
    const id = this.testContext.sf923ProductMapId as string;
    if (!id) {
      throw new Error('No sf923ProductMapId. Complete the first MuleSoft PATCH step first.');
    }
    this.testContext.sf923MuleSecondPatchError = undefined;
    const muleClient = new SalesforceAPIClient(this.apiContext);
    await muleClient.authenticate(muleUser);
    const nextGuid = randomUUID();
    const raw = await muleClient.patchSObjectRaw(PRODUCT_MAP, id, { [DV_FIELD]: nextGuid });
    await attachSalesforceApiEvidence(this, {
      label: 'SF-923 PATCH Dataverse_ID__c second attempt (MuleSoft; expect validation failure)',
      method: 'PATCH',
      uri: raw.uri,
      requestBody: { [DV_FIELD]: nextGuid },
      httpStatus: raw.httpStatus,
      responseBody: raw.responseBody,
    });
    if (raw.ok) {
      this.testContext.sf923MuleSecondPatchError = null;
    } else {
      this.testContext.sf923MuleSecondPatchError = new Error(`Failed to update record: ${raw.responseBody}`);
      logger.info(
        `SF-923 API-007: second PATCH rejected as expected: ${this.testContext.sf923MuleSecondPatchError.message}`
      );
    }
  }
);

Then(
  'the SF-923 MuleSoft second Dataverse_ID__c patch should fail with the system-managed error',
  async function (this: AutomationWorld) {
    const err = this.testContext.sf923MuleSecondPatchError;
    if (err === undefined) {
      throw new Error(
        'No captured second-patch result. Run "the MuleSoft integration user attempts to patch Dataverse_ID__c again..." first.'
      );
    }
    if (err === null) {
      throw new Error(
        `Expected second PATCH to be blocked with "${SF923_SYSTEM_MANAGED_SNIPPET}" but the API call succeeded.`
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes(SF923_SYSTEM_MANAGED_SNIPPET)) {
      throw new Error(
        `Expected second PATCH error to include "${SF923_SYSTEM_MANAGED_SNIPPET}". Actual message: ${msg}`
      );
    }
    logger.info('✅ SF-923 API-007: MuleSoft second PATCH returned system-managed Dataverse ID error');
  }
);

// ─── Scenarios 4 & 5 ─────────────────────────────────────────────────────────

When('the default API user attempts to set Dataverse_ID__c on the SF-923 Product_Map__c', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  const id = this.testContext.sf923ProductMapId as string;
  if (!id) {
    throw new Error('No sf923ProductMapId.');
  }
  this.testContext.sf923ApiCapturedError = undefined;
  const body = { [DV_FIELD]: randomUUID() };
  const raw = await api.patchSObjectRaw(PRODUCT_MAP, id, body);
  await attachSalesforceApiEvidence(this, {
    label: 'SF-923 PATCH Dataverse_ID__c (default API user; expect failure)',
    method: 'PATCH',
    uri: raw.uri,
    requestBody: body,
    httpStatus: raw.httpStatus,
    responseBody: raw.responseBody,
  });
  this.testContext.sf923ApiCapturedError = raw.ok ? null : new Error(`Failed to update record: ${raw.responseBody}`);
});

When('the default API user attempts to clear Dataverse_ID__c on the SF-923 Product_Map__c', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  const id = this.testContext.sf923ProductMapId as string;
  if (!id) {
    throw new Error('No sf923ProductMapId.');
  }
  this.testContext.sf923ApiCapturedError = undefined;
  const body = { [DV_FIELD]: '' };
  const raw = await api.patchSObjectRaw(PRODUCT_MAP, id, body);
  await attachSalesforceApiEvidence(this, {
    label: 'SF-923 PATCH clear Dataverse_ID__c (default API user; expect failure)',
    method: 'PATCH',
    uri: raw.uri,
    requestBody: body,
    httpStatus: raw.httpStatus,
    responseBody: raw.responseBody,
  });
  this.testContext.sf923ApiCapturedError = raw.ok ? null : new Error(`Failed to update record: ${raw.responseBody}`);
});

Then('the SF-923 API response should indicate Dataverse ID is system-managed', async function (this: AutomationWorld) {
  const err = this.testContext.sf923ApiCapturedError;
  if (err === undefined) {
    throw new Error('No captured error. Run the preceding SF-923 When step first.');
  }
  if (err === null) {
    throw new Error(`Expected update to be blocked with "${SF923_SYSTEM_MANAGED_SNIPPET}" but the API call succeeded.`);
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes(SF923_SYSTEM_MANAGED_SNIPPET)) {
    throw new Error(
      `Expected API error to include "${SF923_SYSTEM_MANAGED_SNIPPET}". Actual message: ${msg}`
    );
  }
  logger.info('✅ SF-923: API returned system-managed Dataverse ID error as expected');
});

Given('a Product_Map__c record exists for SF-923 with populated Dataverse_ID__c', async function (this: AutomationWorld) {
  const api = requireApiClient(this);
  const q = await api.query(
    `SELECT Id, ${DV_FIELD} FROM ${PRODUCT_MAP} WHERE ${DV_FIELD} != null AND ${DV_FIELD} != '' ORDER BY LastModifiedDate DESC LIMIT 1`
  );
  if (q.records && q.records.length > 0) {
    this.testContext.sf923ProductMapId = (q.records[0] as { Id: string }).Id;
    logger.info(`SF-923: using existing Product_Map__c with ${DV_FIELD} set: ${this.testContext.sf923ProductMapId}`);
    return;
  }
  const muleUser = process.env.SF_MULESOFT_INTEGRATION_JWT_USERNAME?.trim();
  if (!muleUser) {
    throw new Error(
      `No ${PRODUCT_MAP} with ${DV_FIELD} populated. Run SF-923-API-003 first, seed data, or set SF_MULESOFT_INTEGRATION_JWT_USERNAME so this step can bootstrap.`
    );
  }
  await resolveBlankProductMap(this, api);
  const id = this.testContext.sf923ProductMapId as string;
  const guid = randomUUID();
  const muleClient = new SalesforceAPIClient(this.apiContext);
  await muleClient.authenticate(muleUser);
  const raw = await muleClient.patchSObjectRaw(PRODUCT_MAP, id, { [DV_FIELD]: guid });
  await attachSalesforceApiEvidence(this, {
    label: 'SF-923 bootstrap PATCH Dataverse_ID__c (integration user)',
    method: 'PATCH',
    uri: raw.uri,
    requestBody: { [DV_FIELD]: guid },
    httpStatus: raw.httpStatus,
    responseBody: raw.responseBody,
  });
  if (!raw.ok) {
    throw new Error(`Failed to update record: ${raw.responseBody}`);
  }
  this.testContext.sf923IntegrationGuid = guid;
  logger.info(`SF-923: bootstrapped populated ${DV_FIELD} on ${id} via integration user`);
});
