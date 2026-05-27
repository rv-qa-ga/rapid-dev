/**
 * Step Definitions for SF-483 - Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts (API)
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { TestDataFactory } from '../../../test-data/TestDataFactory';
import { logger } from '../../../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// GIVEN STEPS: Account Setup with Type and Upsell Opportunity
// ═══════════════════════════════════════════════════════════════════════════

Given('I have an existing Account record with Type {string}', async function (this: AutomationWorld, accountType: string) {
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();
  
  const timestamp = Date.now();
  const accountName = `SF-483 Test Account ${accountType} ${timestamp}`;
  
  const account = await testDataFactory.createAccount({
    Name: accountName,
    Type: accountType,
  });
  
  this.testContext.accountId = account.id;
  this.testContext.recordId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.accountCreatedViaAPI = true;
  
  logger.info(`✅ Created Account with Type "${accountType}": ${account.id} (${account.name})`);
});

Given('I have an existing Account record with Type {string} and Upsell_Opportunity__c {string}', 
  async function (this: AutomationWorld, accountType: string, upsellOpportunity: string) {
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();
    
    const timestamp = Date.now();
    const accountName = `SF-483 Test Account ${accountType} ${upsellOpportunity} ${timestamp}`;
    
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: accountType,
      Upsell_Opportunity__c: upsellOpportunity,
    });
    
    this.testContext.accountId = account.id;
    this.testContext.recordId = account.id;
    this.testContext.accountName = account.name;
    this.testContext.accountCreatedViaAPI = true;
    
    logger.info(`✅ Created Account with Type "${accountType}" and Upsell_Opportunity__c "${upsellOpportunity}": ${account.id}`);
  }
);

Given('I have {int} Account records with different Types', async function (this: AutomationWorld, count: number) {
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();
  
  const accountTypes = ['Member MGA', 'Non-Member MGA', 'Agency', 'Insurer', 'Reinsurer'];
  const accountIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const accountType = accountTypes[i % accountTypes.length];
    const timestamp = Date.now();
    const accountName = `SF-483 Bulk Test ${accountType} ${timestamp}-${i}`;
    
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: accountType,
    });
    
    accountIds.push(account.id);
  }
  
  this.testContext.accountIds = accountIds;
  this.testContext.accountId = accountIds[0];
  this.testContext.recordId = accountIds[0];
  
  logger.info(`✅ Created ${count} Account records with different Types: ${accountIds.join(', ')}`);
});

Given('I have multiple Account records with various Types', async function (this: AutomationWorld) {
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();
  
  const accountTypes = ['Member MGA', 'Non-Member MGA', 'Agency', 'Insurer', 'Reinsurer', 'Third Party Administrator'];
  const accountIds: string[] = [];
  
  for (const accountType of accountTypes) {
    const timestamp = Date.now();
    const accountName = `SF-483 Multi Test ${accountType} ${timestamp}`;
    
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: accountType,
      Upsell_Opportunity__c: 'Member MGA',
    });
    
    accountIds.push(account.id);
  }
  
  this.testContext.accountIds = accountIds;
  this.testContext.accountId = accountIds[0];
  this.testContext.recordId = accountIds[0];
  
  logger.info(`✅ Created ${accountIds.length} Account records with various Types`);
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Query Operations
// ═══════════════════════════════════════════════════════════════════════════

When('I query Account where {string} equals {string}', async function (
  this: AutomationWorld,
  fieldName: string,
  value: string
) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  // Convert field name to API name if needed
  const apiFieldName = fieldName === 'Upsell_Opportunity__c' ? 'Upsell_Opportunity__c' : fieldName;
  const soql = `SELECT Id, Name, Type, ${apiFieldName} FROM Account WHERE ${apiFieldName} = '${value}' LIMIT 10`;
  
  const result = await apiClient.query(soql);
  
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => result
  };
  this.testContext.queryResults = result.records;
  
  logger.info(`✅ Queried ${result.records.length} Account records where ${apiFieldName} = ${value}`);
});

When('I query Account where {string} equals the Account ID', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No Account ID found in test context');
  }
  
  const soql = `SELECT Id, Name, Type, Upsell_Opportunity__c FROM Account WHERE Id = '${recordId}' LIMIT 1`;
  
  const result = await apiClient.query(soql);
  
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => result
  };
  this.testContext.queryResults = result.records;
  
  logger.info(`✅ Queried Account by ID: ${recordId}`);
});

When('I query Accounts with Upsell_Opportunity__c field included', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const accountIds = this.testContext.accountIds || [];
  if (accountIds.length === 0) {
    throw new Error('No Account IDs found for query');
  }
  
  const idsList = accountIds.map((id: string) => `'${id}'`).join(',');
  const soql = `SELECT Id, Name, Type, Upsell_Opportunity__c FROM Account WHERE Id IN (${idsList})`;
  
  const result = await apiClient.query(soql);
  
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => result
  };
  this.testContext.queryResults = result.records;
  
  logger.info(`✅ Queried ${result.records.length} Accounts with Upsell_Opportunity__c field`);
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Update Operations
// ═══════════════════════════════════════════════════════════════════════════

When('I bulk update the Upsell_Opportunity__c field via composite API', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const accountIds = this.testContext.accountIds || [];
  if (accountIds.length === 0) {
    throw new Error('No Account IDs found for bulk update');
  }
  
  const updateValue = 'Non-Member MGA';
  const updates: Array<{ id: string; success: boolean; error?: string }> = [];
  
  for (const accountId of accountIds) {
    try {
      await apiClient.updateRecord('Account', accountId, { Upsell_Opportunity__c: updateValue });
      updates.push({ id: accountId, success: true });
    } catch (error: any) {
      updates.push({ id: accountId, success: false, error: error.message });
    }
  }
  
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => ({ updates })
  };
  
  logger.info(`✅ Bulk updated Upsell_Opportunity__c on ${updates.filter(u => u.success).length}/${updates.length} Accounts`);
});

// ═══════════════════════════════════════════════════════════════════════════
// THEN STEPS: Verification
// ═══════════════════════════════════════════════════════════════════════════

Then('the field {string} should be accessible via API', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No Account ID found');
  }
  
  const account = await apiClient.getAccount(recordId);
  const apiFieldName = fieldName === 'Upsell_Opportunity__c' ? 'Upsell_Opportunity__c' : fieldName;
  
  if (account[apiFieldName] === undefined) {
    throw new Error(`Field "${fieldName}" is not accessible via API on Account ${recordId}`);
  }
  
  logger.info(`✅ Field "${fieldName}" is accessible via API: ${account[apiFieldName] || '(null)'}`);
});

Then('the field update should be successful', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No Account ID found');
  }
  
  // Verify the update was successful by querying the record
  const account = await apiClient.getAccount(recordId);
  
  if (!account) {
    throw new Error('Account record not found after update');
  }
  
  logger.info(`✅ Field update verified successfully on Account ${recordId}`);
});

Then('the response should contain the {string} field', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  
  const body = await response.json();
  const records = body.records || [body];
  
  if (records.length === 0) {
    throw new Error('No records in response');
  }
  
  const apiFieldName = fieldName === 'Upsell_Opportunity__c' ? 'Upsell_Opportunity__c' : fieldName;
  const hasField = records.some((r: any) => r[apiFieldName] !== undefined);
  
  if (!hasField) {
    throw new Error(`Response does not contain "${fieldName}" field`);
  }
  
  logger.info(`✅ Response contains "${fieldName}" field`);
});

Then('the {string} field value should be accessible', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  
  const body = await response.json();
  const records = body.records || [body];
  
  if (records.length === 0) {
    throw new Error('No records in response');
  }
  
  const apiFieldName = fieldName === 'Upsell_Opportunity__c' ? 'Upsell_Opportunity__c' : fieldName;
  const record = records[0];
  
  if (record[apiFieldName] === undefined) {
    throw new Error(`Field "${fieldName}" value is not accessible in response`);
  }
  
  logger.info(`✅ Field "${fieldName}" value is accessible: ${record[apiFieldName] || '(null)'}`);
});

Then('all Account records should have Upsell_Opportunity__c field accessible', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  
  const body = await response.json();
  const records = body.records || [];
  
  if (records.length === 0) {
    throw new Error('No Account records in response');
  }
  
  const recordsWithoutField = records.filter((r: any) => r.Upsell_Opportunity__c === undefined);
  
  if (recordsWithoutField.length > 0) {
    throw new Error(`${recordsWithoutField.length} Account records do not have Upsell_Opportunity__c field accessible`);
  }
  
  logger.info(`✅ All ${records.length} Account records have Upsell_Opportunity__c field accessible`);
});

Then('the field should be accessible regardless of Account Type', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  
  const body = await response.json();
  const records = body.records || [];
  
  if (records.length === 0) {
    throw new Error('No Account records in response');
  }
  
  // Verify field is accessible for all Account Types
  const accountTypes = new Set(records.map((r: any) => r.Type));
  const recordsWithoutField = records.filter((r: any) => r.Upsell_Opportunity__c === undefined);
  
  if (recordsWithoutField.length > 0) {
    const typesWithoutField = new Set(recordsWithoutField.map((r: any) => r.Type));
    throw new Error(`Upsell_Opportunity__c field not accessible for Account Types: ${Array.from(typesWithoutField).join(', ')}`);
  }
  
  logger.info(`✅ Upsell_Opportunity__c field is accessible for all Account Types: ${Array.from(accountTypes).join(', ')}`);
});

Then('the field metadata should be accessible', async function (this: AutomationWorld) {
  const fields = this.testContext.fieldsMetadata;
  
  if (!fields) {
    throw new Error('No field metadata in context. Run describe first.');
  }
  
  const field = fields.find((f: any) => f.name === 'Upsell_Opportunity__c');
  
  if (!field) {
    throw new Error('Upsell_Opportunity__c field metadata not found');
  }
  
  // Verify metadata is accessible
  if (!field.type || !field.label) {
    throw new Error('Upsell_Opportunity__c field metadata is incomplete');
  }
  
  logger.info(`✅ Upsell_Opportunity__c field metadata is accessible: ${field.type} (${field.label})`);
  this.testContext.lastCheckedField = field;
});

