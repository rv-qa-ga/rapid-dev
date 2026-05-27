/**
 * SF-796 — Product_Map__c → Dataverse Product Map (Dataverse_Mapping__mdt).
 * Creates Product_Map__c records for AC3/AC4 resolve flows.
 * CMDT query/assertions reuse sf-575 + sf-593-1081-integration.steps.ts.
 */

import { Given, When } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { logger } from '../../../utils/logger';

const PRODUCT_MAP = 'Product_Map__c';

function requireApi(world: AutomationWorld): SalesforceAPIClient {
  const api = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!api) {
    throw new Error(
      'SF796: API client not initialized. Run Background: "I have a valid Salesforce API token" first.'
    );
  }
  return api;
}

function statusFieldApi(): string {
  return process.env.SF796_PRODUCT_MAP_STATUS_FIELD?.trim() || 'Status__c';
}

function accountLookupField(): string {
  return process.env.SF796_PRODUCT_MAP_ACCOUNT_LOOKUP?.trim() || 'Account__c';
}

function nonRenewableFieldApi(): string {
  return process.env.SF796_PRODUCT_MAP_NON_RENEWABLE_FIELD?.trim() || 'Non_Renewable__c';
}

function accountType(): string {
  return process.env.SF796_ACCOUNT_TYPE?.trim() || 'Member';
}

async function ensureActiveAccount(world: AutomationWorld): Promise<string> {
  const existing = world.testContext.sf796AccountId as string | undefined;
  if (existing) return existing;

  await testDataFactory.initialize();
  const ts = Date.now();
  const acc = await testDataFactory.createAccount({
    Name: `SF796_Account_${ts}`,
    Type: accountType(),
    Functional_Currency__c: 'USD',
    Account_Status__c: 'Active',
    BillingCountry: 'United States',
    BillingState: 'New York',
    BillingCity: 'Boston',
    BillingPostalCode: '02101',
    BillingStreet: '1 Test St',
  });
  world.testContext.sf796AccountId = acc.id;
  logger.info(`SF796: Active Account ${acc.id}`);
  return acc.id;
}

async function createProductMap(
  world: AutomationWorld,
  extra: Record<string, unknown>
): Promise<string> {
  const api = requireApi(world);
  const accountId = await ensureActiveAccount(world);
  const accField = accountLookupField();
  const name = `SF796_PM_${Date.now()}`;
  const payload: Record<string, unknown> = {
    Name: name,
    [accField]: accountId,
    ...extra,
  };
  const res = await api.createRecord(PRODUCT_MAP, payload);
  const id = (res as { id?: string }).id;
  if (!id) {
    throw new Error(`SF796: create ${PRODUCT_MAP} returned no id: ${JSON.stringify(res)}`);
  }
  world.testContext.sf796ProductMapId = id;
  testDataFactory.registerRecord(id, PRODUCT_MAP, name);
  logger.info(`SF796: Created ${PRODUCT_MAP} ${id} payload=${JSON.stringify(extra)}`);
  return id;
}

Given('I have a Product_Map with Status {string}', async function (this: AutomationWorld, status: string) {
  const sf = statusFieldApi();
  await createProductMap(this, { [sf]: status });
});

Given(
  'I have a Product_Map with Non_Renewable {string}',
  async function (this: AutomationWorld, value: string) {
    const field = nonRenewableFieldApi();
    const normalized = value.trim().toLowerCase();
    let boolVal: boolean;
    if (normalized === 'true') boolVal = true;
    else if (normalized === 'false') boolVal = false;
    else {
      throw new Error(`SF796: Non_Renewable must be "true" or "false". Got: "${value}"`);
    }
    const sf = statusFieldApi();
    await createProductMap(this, {
      [field]: boolVal,
      [sf]: process.env.SF796_DEFAULT_STATUS_FOR_NON_RENEWABLE?.trim() || 'Draft',
    });
  }
);

When(
  'I update the created Product_Map\'s Status__c to {string}',
  async function (this: AutomationWorld, newStatus: string) {
    const api = requireApi(this);
    const pmId = this.testContext.sf796ProductMapId as string | undefined;
    if (!pmId) {
      throw new Error('SF796: No sf796ProductMapId — create a Product_Map first.');
    }
    const sf = statusFieldApi();
    await api.updateRecord(PRODUCT_MAP, pmId, { [sf]: newStatus });
    this.testContext.sf796PendingProductMapStatus = newStatus;
    logger.info(`SF796: Updated ${PRODUCT_MAP} ${pmId} ${sf} → "${newStatus}"`);
  }
);
