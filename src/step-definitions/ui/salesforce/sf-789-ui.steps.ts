/**
 * SF-789 UI Step Definitions - Member Legal Entity Group → Member Maps integration.
 * SF-789 UI tests: Custom Metadata validation only (no account/MLER creation).
 * SF-614 reuses: "a Member Legal Entity Relationship record exists", "I navigate to the Member Legal Entity Relationship record".
 */

import { Given, When } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { config } from '../../../config/config';
import { randomUUID } from 'crypto';

/** Get Lightning instance URL with config fallback (matches ui-common.steps pattern). */
function getInstanceUrl(world: AutomationWorld): string {
  let url = world.testContext.instanceUrl || process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!url) {
    const sfConfig = config.getSalesforceConfig();
    url = sfConfig.baseUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
  } else {
    url = (url as string).replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
  }
  return url;
}

const MLER_OBJECT = 'Member_Legal_Entity_Relationship__c';

function uniquePartyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

Given('a Member Legal Entity Relationship record exists', async function (this: AutomationWorld) {
  await testDataFactory.initialize();
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');

  const ts = Date.now();
  const member = await testDataFactory.createAccount(
    {
      Name: `SF789_UI_Mler_${ts}`,
      Type: 'Member',
      Account_Status__c: 'Onboarding',
      Party_Code__c: uniquePartyCode(),
      Functional_Currency__c: 'CAD',
      BillingCountry: 'Canada',
    },
    { checkExists: false, deleteIfExists: false }
  );
  const legal = await testDataFactory.createAccount(
    {
      Name: `SF789_UI_Legal2_${ts}`,
      Type: 'Legal Entity',
      Account_Status__c: 'Active',
      Functional_Currency__c: 'USD',
      BillingCountry: 'United States',
    },
    { checkExists: false, deleteIfExists: false }
  );

  await apiClient.updateRecord('Account', member.id, { Dataverse_ID__c: randomUUID() });
  await apiClient.updateRecord('Account', legal.id, { Dataverse_ID__c: randomUUID() });

  const desc = await apiClient.describeSObject(MLER_OBJECT);
  const reasonField = (desc.fields || []).find(
    (f: any) => f.createable && (/reason/i.test(f.name) || /reason/i.test(f.label || ''))
  );
  const reasonValue =
    reasonField?.type === 'picklist'
      ? (reasonField.picklistValues || []).find((p: any) => p.active)?.value || 'SF-789 UI'
      : 'SF-789 UI test';

  const today = new Date().toISOString().slice(0, 10);
  const payload: Record<string, string> = {
    Member__c: member.id,
    Legal_Entity__c: legal.id,
    Start_Date__c: today,
  };
  if (reasonField) payload[reasonField.name] = reasonValue;

  const res = await apiClient.createRecord(MLER_OBJECT, payload, { timeout: 60000 });
  const mlerId = (res as any).id || (res as any).Id;
  if (!mlerId) throw new Error('MLER create failed');

  this.testContext.sf789MlerId = mlerId;
  this.testContext.sf789MemberId = member.id;
  this.testContext.sf789LegalId = legal.id;
  this.testContext.sf789MemberAccountName = member.name;
  this.testContext.sf789LegalEntityAccountName = legal.name;
  logger.info(`✅ SF-789 UI: MLER ${mlerId} exists`);
});

When('I navigate to the Member Legal Entity Relationship record', async function (this: AutomationWorld) {
  const mlerId = this.testContext.sf789MlerId as string;
  if (!mlerId) throw new Error('No MLER id in context. Create MLER first.');

  if (!this.page) throw new Error('Browser page required.');
  const instanceUrl = getInstanceUrl(this);

  const url = `${instanceUrl}/lightning/r/${MLER_OBJECT}/${mlerId}/view`;
  await this.page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to MLER record ${mlerId}`);
});

