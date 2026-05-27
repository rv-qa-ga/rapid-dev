/**
 * SF-788 - Account Relationship (TPA Maps) Platform Events — API / Streaming.
 * JIRA: eligibility requires Dataverse_ID__c on related Accounts; Valid From/To drive Is_Active__c.
 *
 * TPA Map model: TPA (Third Party Administrator) + TPA Group (ParentId = TPA).
 * TPA_Maps__c: TPA_Group_Account__c = TPA Group, TPA_Account__c = TPA, Valid_From__c.
 *
 * Shared Dataverse helpers: src/integrations/salesforce/dataverse-relationship-testkit.ts
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceStreamingClient } from '../../../utils/salesforce-streaming-client';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import {
  stampAccountDataverseIdStrict,
  assertAccountDataverseBlank,
  assertAccountDataversePopulated,
  clearAccountDataverseIdStrict,
} from '../../../integrations/salesforce/dataverse-relationship-testkit';

/** Use Account_Relationship__c (Source_Account__c, Related_Account__c) when SF788_USE_ACCOUNT_RELATIONSHIP_OBJECT=true. */
const USE_ACCOUNT_RELATIONSHIP = process.env.SF788_USE_ACCOUNT_RELATIONSHIP_OBJECT === 'true';

function getSF788ObjectApiName(): string {
  if (USE_ACCOUNT_RELATIONSHIP) {
    return (process.env.SF788_ACCOUNT_RELATIONSHIP_OBJECT_API_NAME || 'Account_Relationship__c').trim();
  }
  return (process.env.SF788_TPA_MAPS_OBJECT_API_NAME || 'TPA_Maps__c').trim();
}

/** TPA Group lookup field: Source_Account__c (Account_Relationship) or TPA_Group_Account__c (TPA_Maps). */
function getSF788GroupFieldName(): string {
  return USE_ACCOUNT_RELATIONSHIP ? 'Source_Account__c' : 'TPA_Group_Account__c';
}

/** TPA lookup field: Related_Account__c (Account_Relationship) or TPA_Account__c (TPA_Maps). */
function getSF788TpaFieldName(): string {
  return USE_ACCOUNT_RELATIONSHIP ? 'Related_Account__c' : 'TPA_Account__c';
}

const AR_EVENT_API = 'Account_Relationship_Event__e';

const TPA_ACCOUNT_TYPE = 'Third Party Administrator';
const TPA_GROUP_TYPE = 'TPA Group';

async function createTpaAccount(this: AutomationWorld, nameSuffix: string): Promise<{ id: string }> {
  await testDataFactory.initialize();
  const ts = Date.now();
  return testDataFactory.createAccount(
    {
      Name: `SF788_TPA_${nameSuffix}_${ts}`,
      Type: TPA_ACCOUNT_TYPE,
      Functional_Currency__c: 'USD',
      Region__c: 'EU',
      BillingCountry: 'Germany',
    },
    { checkExists: false, deleteIfExists: false }
  );
}

/**
 * Create TPA Group without ParentId on insert, then PATCH ParentId.
 * Inserting with ParentId can trigger the org "Account Relationship" autolaunched flow which
 * creates TPA_Maps__c with manual Is_Active__c and fails (Is Active is date-derived).
 */
async function createTpaGroupAccount(this: AutomationWorld, parentTpaId: string, nameSuffix: string): Promise<{ id: string }> {
  await testDataFactory.initialize();
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');
  const ts = Date.now();

  const tpaGroup = await testDataFactory.createAccount(
    {
      Name: `SF788_TPAGroup_${nameSuffix}_${ts}`,
      Type: TPA_GROUP_TYPE,
      Functional_Currency__c: 'USD',
      Region__c: 'EU',
      BillingCountry: 'Germany',
    },
    { checkExists: false, deleteIfExists: false }
  );

  await apiClient.updateRecord('Account', tpaGroup.id, { ParentId: parentTpaId });
  logger.info(`✅ TPA Group ${tpaGroup.id}: ParentId=${parentTpaId} set via update (avoid insert-time Account Relationship flow)`);
  return tpaGroup;
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND (SF-788-specific)
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'Salesforce publishes Account Relationship \\(TPA Maps\\) Platform Events for downstream integration',
  async function () {
    logger.info('✅ Background (SF-788): Account Relationship (TPA Maps) Platform Events for Dataverse');
  }
);

Given('each relationship Platform Event includes the Record ID and Event Identifier', async function () {
  logger.info('✅ Background (SF-788): Record ID + Event Identifier on each event');
});

// ═══════════════════════════════════════════════════════════════════════════
// Smoke / describe
// ═══════════════════════════════════════════════════════════════════════════

Given('the system is configured for SF-788', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Run "I have a valid Salesforce API token" first.');
  }
  const obj = getSF788ObjectApiName();
  const describeResult = await apiClient.describeSObject(obj);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  logger.info(`✅ System configured for SF-788: ${obj} described`);
});

When(
  'Account Relationship \\(TPA Maps\\) records are eligible for downstream synchronisation with Dataverse',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');
    this.testContext.apiError = undefined;
    try {
      const soql = `SELECT Id, Dataverse_ID__c FROM ${getSF788ObjectApiName()} WHERE Dataverse_ID__c != null LIMIT 1`;
      const result = await apiClient.query(soql);
      this.testContext.sf788QueryResult = result;
    } catch (e: any) {
      try {
        const fallback = `SELECT Id FROM ${getSF788ObjectApiName()} LIMIT 1`;
        this.testContext.sf788QueryResult = await apiClient.query(fallback);
      } catch (e2: any) {
        this.testContext.apiError = e2;
      }
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Test data: strict Dataverse_ID__c (fail if not populated when required)
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    const tpa = await createTpaAccount.call(this, 'ELIG');
    const tpaGroup = await createTpaGroupAccount.call(this, tpa.id, 'ELIG');

    await stampAccountDataverseIdStrict(apiClient, tpa.id, 'TPA (TPA_Account__c)');
    await stampAccountDataverseIdStrict(apiClient, tpaGroup.id, 'TPA Group (TPA_Group_Account__c)');

    this.testContext.sf788TpaId = tpa.id;
    this.testContext.sf788TpaGroupId = tpaGroup.id;
    this.testContext.accountId = tpa.id;
    this.testContext.accountBId = tpaGroup.id;
    this.testContext.tpaGroupId = tpaGroup.id;
    logger.info(`✅ SF-788 eligible accounts TPA=${tpa.id} TPA_Group=${tpaGroup.id}`);
  }
);

Given(
  'SF-788 test accounts exist: TPA without Dataverse_ID__c and TPA Group with Dataverse_ID__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    const tpa = await createTpaAccount.call(this, 'NODV');
    const tpaGroup = await createTpaGroupAccount.call(this, tpa.id, 'NODV');

    await assertAccountDataverseBlank(apiClient, tpa.id, 'TPA');
    await stampAccountDataverseIdStrict(apiClient, tpaGroup.id, 'TPA Group');

    this.testContext.sf788TpaId = tpa.id;
    this.testContext.sf788TpaGroupId = tpaGroup.id;
    this.testContext.accountId = tpa.id;
    this.testContext.accountBId = tpaGroup.id;
    this.testContext.tpaGroupId = tpaGroup.id;
    logger.info(`✅ SF-788 ineligible: TPA ${tpa.id} has no Dataverse_ID__c`);
  }
);

Given(
  'SF-788 test accounts exist: TPA with Dataverse_ID__c and TPA Group without Dataverse_ID__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    const tpa = await createTpaAccount.call(this, 'TPADV');
    const tpaGroup = await createTpaGroupAccount.call(this, tpa.id, 'NODVGRP');

    await stampAccountDataverseIdStrict(apiClient, tpa.id, 'TPA');
    await assertAccountDataverseBlank(apiClient, tpaGroup.id, 'TPA Group');

    this.testContext.sf788TpaId = tpa.id;
    this.testContext.sf788TpaGroupId = tpaGroup.id;
    this.testContext.accountId = tpa.id;
    this.testContext.accountBId = tpaGroup.id;
    this.testContext.tpaGroupId = tpaGroup.id;
    logger.info(`✅ SF-788 ineligible: TPA Group ${tpaGroup.id} has no Dataverse_ID__c`);
  }
);

Given(
  'a second TPA account exists in Salesforce with Dataverse_ID__c populated for SF-788',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');
    const second = await createTpaAccount.call(this, 'SEC');
    await stampAccountDataverseIdStrict(apiClient, second.id, 'Second TPA');
    this.testContext.secondTpaId = second.id;
    logger.info(`✅ Second TPA for SF-788: ${second.id}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Create / update TPA Map (TPA_Maps__c)
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'a new Account Relationship \\(TPA Maps\\) record is created via API linking the TPA Group and the TPA',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId || this.testContext.accountBId;
    const tpaId = this.testContext.sf788TpaId || this.testContext.accountId;
    if (!apiClient || !tpaGroupId || !tpaId) {
      throw new Error('API client, TPA Group, and TPA must exist. Run SF-788 account setup first.');
    }

    // Is_Active__c is derived from Valid From / Valid To — do not set manually (flow/VR will fail).
    const payload: Record<string, any> = {
      [getSF788GroupFieldName()]: tpaGroupId,
      [getSF788TpaFieldName()]: tpaId,
      Valid_From__c: todayYmd(),
    };

    const result = await apiClient.createRecord(getSF788ObjectApiName(), payload, { timeout: 120000 });
    const id = (result as any).id || (result as any).Id;
    if (!id) throw new Error(`TPA Map create returned no id: ${JSON.stringify(result)}`);

    this.testContext.accountRelationshipId = id;
    this.testContext.recordId = id;
    this.testContext.lastCreatedId = id;
    testDataFactory.registerRecord(id, getSF788ObjectApiName(), `SF788_AR_${id}`);
    logger.info(`✅ Created ${getSF788ObjectApiName()} ${id}`);
    await new Promise((r) => setTimeout(r, 500));
  }
);

When(
  'a new Account Relationship \\(TPA Maps\\) record is created via API with inactive date window for SF-788',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId || this.testContext.accountBId;
    const tpaId = this.testContext.sf788TpaId || this.testContext.accountId;
    if (!apiClient || !tpaGroupId || !tpaId) {
      throw new Error('API client, TPA Group, and TPA must exist.');
    }

    const payload: Record<string, any> = {
      [getSF788GroupFieldName()]: tpaGroupId,
      [getSF788TpaFieldName()]: tpaId,
      Valid_From__c: '2020-01-01',
      Valid_To__c: '2020-12-31',
    };

    const result = await apiClient.createRecord(getSF788ObjectApiName(), payload, { timeout: 120000 });
    const id = (result as any).id || (result as any).Id;
    if (!id) throw new Error(`TPA Map create returned no id: ${JSON.stringify(result)}`);

    this.testContext.accountRelationshipId = id;
    this.testContext.recordId = id;
    this.testContext.lastCreatedId = id;
    testDataFactory.registerRecord(id, getSF788ObjectApiName(), `SF788_AR_INACTIVE_${id}`);
    logger.info(`✅ Created inactive-window TPA Map ${id}`);
    await new Promise((r) => setTimeout(r, 500));
  }
);

Given(
  'an Account Relationship \\(TPA Maps\\) record is created via API linking the same TPA Group and the second TPA',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId || this.testContext.accountBId;
    const secondTpaId = this.testContext.secondTpaId;
    if (!apiClient || !tpaGroupId || !secondTpaId) {
      throw new Error('API client, TPA Group, and second TPA must exist.');
    }

    const payload: Record<string, any> = {
      [getSF788GroupFieldName()]: tpaGroupId,
      [getSF788TpaFieldName()]: secondTpaId,
      Valid_From__c: todayYmd(),
    };

    const result = await apiClient.createRecord(getSF788ObjectApiName(), payload, { timeout: 120000 });
    const id = (result as any).id || (result as any).Id;
    if (!id) throw new Error(`Second TPA Map create returned no id: ${JSON.stringify(result)}`);

    this.testContext.accountRelationshipId = id;
    this.testContext.recordId = id;
    testDataFactory.registerRecord(id, getSF788ObjectApiName(), `SF788_AR2_${id}`);
    logger.info(`✅ Created second TPA Map ${id} for same TPA Group`);
    await new Promise((r) => setTimeout(r, 500));
  }
);

When('the relationship record is saved successfully', async function (this: AutomationWorld) {
  const id = this.testContext.accountRelationshipId || this.testContext.recordId;
  if (!id) throw new Error('No TPA Map relationship ID in context.');
  logger.info(`✅ TPA Map ${id} saved successfully`);
});

// SF-788: Update the SAME TPA Map record (accountRelationshipId) - not create new.
// End date (Valid_To__c) is a simple benign change that triggers the Update event.
When(
  /^the (?:same )?SF-788 (?:Account Relationship|TPA Map) end date \(Valid_To__c\) is updated for a benign change$/,
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.accountRelationshipId || this.testContext.recordId;
    if (!apiClient || !id) {
      throw new Error(
        'API client or TPA Map id missing. Ensure "a new Account Relationship (TPA Maps) record is created" runs first so we update that same record.'
      );
    }

    const row = await apiClient.query(
      `SELECT Valid_To__c FROM ${getSF788ObjectApiName()} WHERE Id = '${id}' LIMIT 1`
    );
    if (!row.records?.[0]) {
      throw new Error(`TPA Map ${id} not found. Cannot update - ensure we are updating the same record we created.`);
    }
    const current = (row.records?.[0] as any)?.Valid_To__c as string | undefined;
    const base = new Date();
    base.setUTCFullYear(base.getUTCFullYear() + 1);
    const next = base.toISOString().slice(0, 10);
    await apiClient.updateRecord(getSF788ObjectApiName(), id, { Valid_To__c: next });
    logger.info(`✅ Updated same TPA Map ${id} Valid_To__c ${current ?? 'null'} -> ${next}`);
  }
);

// SF-788: Update Valid_From__c (start date) for the same TPA Map — triggers Update event.
When(
  /^the (?:same )?SF-788 (?:Account Relationship|TPA Map) start date \(Valid_From__c\) is updated for a benign change$/,
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.accountRelationshipId || this.testContext.recordId;
    if (!apiClient || !id) {
      throw new Error(
        'API client or TPA Map id missing. Ensure "a new Account Relationship (TPA Maps) record is created" runs first so we update that same record.'
      );
    }

    const row = await apiClient.query(
      `SELECT Valid_From__c FROM ${getSF788ObjectApiName()} WHERE Id = '${id}' LIMIT 1`
    );
    if (!row.records?.[0]) {
      throw new Error(`TPA Map ${id} not found. Cannot update - ensure we are updating the same record we created.`);
    }
    const current = (row.records?.[0] as any)?.Valid_From__c as string | undefined;
    const base = current ? new Date(current + 'T12:00:00.000Z') : new Date();
    base.setUTCDate(base.getUTCDate() + 1);
    const next = base.toISOString().slice(0, 10);
    await apiClient.updateRecord(getSF788ObjectApiName(), id, { Valid_From__c: next });
    logger.info(`✅ Updated same TPA Map ${id} Valid_From__c ${current ?? 'null'} -> ${next}`);
  }
);

When(
  'Dataverse_ID__c is cleared on the SF-788 TPA Group Account via API',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId;
    if (!apiClient || !tpaGroupId) throw new Error('API client or TPA Group id missing.');
    await clearAccountDataverseIdStrict(apiClient, tpaGroupId, 'TPA Group (TPA_Group_Account__c)');
  }
);

When(
  'I attempt to create an Account Relationship \\(TPA Maps\\) via API with invalid payload expecting failure',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId;
    if (!apiClient || !tpaGroupId) throw new Error('API client or TPA Group id missing.');

    this.testContext.sf788LastApiFailed = false;
    const groupField = getSF788GroupFieldName();
    try {
      await apiClient.createRecord(
        getSF788ObjectApiName(),
        { [groupField]: tpaGroupId },
        { timeout: 60000 }
      );
    } catch (e: any) {
      this.testContext.sf788LastApiFailed = true;
      this.testContext.sf788LastApiError = e.message;
      logger.info(`✅ Expected API failure: ${e.message}`);
      return;
    }
    throw new Error(
      `SF-788: Expected create to fail (invalid payload: missing ${getSF788TpaFieldName()} / Valid_From__c), but API succeeded.`
    );
  }
);

When('I retrieve the created Account Relationship \\(TPA Maps\\) record via API', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.accountRelationshipId || this.testContext.lastCreatedId || this.testContext.recordId;
  if (!apiClient || !id) throw new Error('API client or TPA Map record ID not found.');

  const record = await apiClient.getRecord(getSF788ObjectApiName(), id);
  this.testContext.lastRetrievedRecord = record;
  logger.info(`✅ Retrieved TPA Map ${id}`);
});

// ═══════════════════════════════════════════════════════════════════════════
// THEN assertions
// ═══════════════════════════════════════════════════════════════════════════

Then('the TPA Map should link the TPA Group and TPA accounts', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.accountRelationshipId as string;
  const tpaId = this.testContext.sf788TpaId as string;
  const groupId = this.testContext.sf788TpaGroupId as string;
  if (!apiClient || !id) throw new Error('Missing API client or TPA Map id.');

  const groupField = getSF788GroupFieldName();
  const tpaField = getSF788TpaFieldName();
  const q = await apiClient.query(
    `SELECT Id, ${groupField}, ${tpaField} FROM ${getSF788ObjectApiName()} WHERE Id = '${id}' LIMIT 1`
  );
  const row = q.records?.[0] as any;
  if (!row) throw new Error(`TPA Map ${id} not found`);
  if (row[groupField] !== groupId) {
    throw new Error(`Expected ${groupField}=${groupId}, got ${row[groupField]}`);
  }
  if (row[tpaField] !== tpaId) {
    throw new Error(`Expected ${tpaField}=${tpaId}, got ${row[tpaField]}`);
  }
  logger.info('✅ TPA Map links TPA Group and TPA as expected');
});

Then('both TPA-related accounts should still have Dataverse_ID__c populated', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const tpaId = this.testContext.sf788TpaId as string;
  const groupId = this.testContext.sf788TpaGroupId as string;
  if (!apiClient) throw new Error('No API client');

  await assertAccountDataversePopulated(apiClient, tpaId, 'TPA');
  await assertAccountDataversePopulated(apiClient, groupId, 'TPA Group');
  logger.info('✅ Both TPA-related accounts still have Dataverse_ID__c');
});

Then('the retrieved TPA Map should expose Is_Active__c for integration payloads', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.accountRelationshipId || this.testContext.recordId;
  if (!apiClient || !id) throw new Error('API client or TPA Map id missing.');
  const q = await apiClient.query(
    `SELECT Id, Is_Active__c FROM ${getSF788ObjectApiName()} WHERE Id = '${id}' LIMIT 1`
  );
  const row = q.records?.[0] as Record<string, unknown> | undefined;
  if (!row || !Object.prototype.hasOwnProperty.call(row, 'Is_Active__c')) {
    throw new Error(
      'SF-788: SOQL must return Is_Active__c on TPA Map (story: MuleSoft uses it for Dataverse state). Check FLS.'
    );
  }
  logger.info(`✅ Is_Active__c queryable on TPA Map ${id}: ${row.Is_Active__c}`);
});

Then('the record should have Valid_From__c populated', async function (this: AutomationWorld) {
  const record = this.testContext.lastRetrievedRecord as Record<string, unknown>;
  if (!record) throw new Error('No retrieved record in context.');

  const validFrom = record.Valid_From__c;
  if (validFrom === null || validFrom === undefined || String(validFrom).trim() === '') {
    throw new Error(`TPA Map should have Valid_From__c populated, got: ${validFrom}`);
  }
  logger.info(`✅ Valid_From__c populated: ${validFrom}`);
});

Then(/^the SF-788 TPA Map Is_Active__c should be (true|false)$/, async function (this: AutomationWorld, word: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.accountRelationshipId || this.testContext.recordId;
  if (!apiClient || !id) throw new Error('API client or TPA Map id missing.');

  const q = await apiClient.query(`SELECT Is_Active__c FROM ${getSF788ObjectApiName()} WHERE Id = '${id}' LIMIT 1`);
  const v = (q.records?.[0] as { Is_Active__c?: boolean })?.Is_Active__c;
  const expected = word === 'true';
  if (Boolean(v) !== expected) {
    throw new Error(
      `SF-788: Expected TPA Map Is_Active__c=${expected} for inactive date window scenario, got ${JSON.stringify(v)}`
    );
  }
  logger.info(`✅ TPA Map Is_Active__c is ${expected}`);
});

Then('the last Salesforce API operation should have failed', async function (this: AutomationWorld) {
  if (!this.testContext.sf788LastApiFailed) {
    throw new Error(
      `Expected last API operation to fail. Error was: ${this.testContext.sf788LastApiError || 'none recorded'}`
    );
  }
  logger.info('✅ Last Salesforce API operation failed as expected');
});

Then(
  /^no Account_Relationship_Event__e Platform Event is received within (\d+) seconds after the failure$/,
  async function (this: AutomationWorld, secondsStr: string) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    if (!streamingClient) throw new Error('Subscribe to Account Relationship (TPA Maps) Platform Events first.');
    const sec = parseInt(secondsStr, 10);
    await streamingClient.assertNoNewEventsForApiNameDuring(AR_EVENT_API, sec * 1000);
  }
);

Then(
  'no Account Relationship \\(TPA Maps\\) Platform Event is received for the SF-788 relationship within {int} seconds',
  async function (this: AutomationWorld, timeoutSec: number) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    const recordId = this.testContext.accountRelationshipId || this.testContext.recordId;
    if (!streamingClient) {
      throw new Error('Subscribe to Account Relationship (TPA Maps) Platform Events first.');
    }
    if (!recordId) {
      throw new Error('No SF-788 TPA Map id in context.');
    }
    try {
      await streamingClient.waitForEvent({ recordId }, timeoutSec * 1000);
      throw new Error(
        `SF-788: An Account Relationship Platform Event was received for ${recordId}, but this scenario expects no event ` +
          `(ineligible parents or inactive relationship per story).`
      );
    } catch (e: any) {
      if (e.message && e.message.startsWith('SF-788: An Account')) {
        throw e;
      }
      streamingClient.clearEvents();
      logger.info(`✅ No TPA Map platform event for ${recordId} within ${timeoutSec}s (expected)`);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SF-788 API-014: MuleSoft/Dataverse integration (JIRA Scenario 4)
// Placeholder steps — MuleSoft sets Dataverse Active/Inactive from Is_Active__c.
// Not executable from Salesforce API; manual or MuleSoft E2E tests verify.
// ═══════════════════════════════════════════════════════════════════════════

Given('an Account Relationship \\(TPA Maps\\) Platform Event is published', async function (this: AutomationWorld) {
  logger.info('📋 SF-788 API-014: Assume Platform Event published (integration scenario placeholder)');
});

When('the event is processed by downstream integration \\(MuleSoft\\)', async function () {
  logger.info('📋 SF-788 API-014: MuleSoft processing — integration scope; verify via MuleSoft/Dataverse tests');
});

Then(
  'the corresponding relationship record in Dataverse is set to "Active" when Is_Active__c is true',
  async function () {
    logger.info('📋 SF-788 API-014: Dataverse Active — integration scope; manual verify when Is_Active__c=true');
  }
);

Then(
  'the corresponding relationship record in Dataverse is set to "Inactive" when Is_Active__c is false',
  async function () {
    logger.info('📋 SF-788 API-014: Dataverse Inactive — integration scope; manual verify when Is_Active__c=false');
  }
);
