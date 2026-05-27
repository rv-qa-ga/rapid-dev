/**
 * Step Definitions for SF-520 - Account Status Field (API)
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { TestDataFactory } from '../../../test-data/TestDataFactory';
import { logger } from '../../../utils/logger';

// Create account with specific status for query tests
Given('I have an Account with Status {string}', async function (this: AutomationWorld, status: string) {
  // CRITICAL: Always use TestDataFactory (not SalesforceAPIClient) to ensure required fields are set
  // TestDataFactory.buildAccountPayload ensures Region__c and State_Province__c are always set
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();
  
  const timestamp = Date.now();
  const accountName = `Test Account Status ${status} ${timestamp}`;
  
  // Create account with the specific status
  // CRITICAL: Type, Region__c, and State_Province__c are REQUIRED
  // TestDataFactory.buildAccountPayload will add all required fields automatically
  const account = await testDataFactory.createAccount({
    Name: accountName,
    Type: 'Agency', // Type is REQUIRED - set default if not specified
    Account_Status__c: status,
    // Region__c and State_Province__c will be added by buildAccountPayload from DEFAULT_ACCOUNT_DATA
  });
  
  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.recordId = account.id;
  this.testContext.accountCreatedViaAPI = true; // Mark as API-created - Type cannot be changed
  
  logger.info(`✅ Created Account with Status "${status}": ${account.id} (${account.name})`);
  logger.info(`⚠️  Note: Type cannot be changed on API-created accounts`);
});

// Query operations - Scenario Outline <value> gets replaced, so we match with {string}
When('I query Account where Status equals {string}', async function (this: AutomationWorld, value: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const apiFieldName = 'Account_Status__c';
  const soql = `SELECT Id, Name, ${apiFieldName} FROM Account WHERE ${apiFieldName} = '${value}' LIMIT 10`;
  
  const result = await apiClient.query(soql);
  
  // Store result in multiple places for compatibility with different assertion steps
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => result
  };
  this.testContext.queryResults = result.records;
  this.testContext.lastQueryResult = result; // Required for "the response should contain Account records" step
  this.testContext.queryResult = result; // Alternative name used by some steps
  
  logger.info(`Queried ${result.records?.length || 0} Account records with Status = ${value}`);
});

When('I query Account where Status equals "{string}"', async function (this: AutomationWorld, value: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  // Convert field name to API name
  const apiFieldName = 'Account_Status__c'; // Adjust based on your org
  const soql = `SELECT Id, Name, ${apiFieldName} FROM Account WHERE ${apiFieldName} = '${value}' LIMIT 10`;
  
  const result = await apiClient.query(soql);
  
  // Store result in multiple places for compatibility with different assertion steps
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => result
  };
  this.testContext.queryResults = result.records;
  this.testContext.lastQueryResult = result; // Required for "the response should contain Account records" step
  this.testContext.queryResult = result; // Alternative name used by some steps
  
  logger.info(`Queried ${result.records?.length || 0} Account records with Status = ${value}`);
});

// Account-specific query step - must match exactly "I query all Account records via API"
// This takes precedence over the generic "I query all {word} records via API" step
When(/^I query all Account records via API$/, async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  // Include Type field for SF-529 tests
  const soql = 'SELECT Id, Name, Type, Account_Status__c FROM Account LIMIT 10';
  const result = await apiClient.query(soql);
  
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => result
  };
  // Set both queryResult (singular) and queryResults (plural) for compatibility
  this.testContext.queryResult = result;
  this.testContext.queryResults = result.records;
  
  logger.info(`Queried ${result.records.length} Account records`);
});

// Update operations - Scenario Outline <value> gets replaced, so we match with {string}
When('I update the Status to {string} via PATCH request', async function (this: AutomationWorld, value: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No record ID found in test context');
  }
  
  const apiFieldName = 'Account_Status__c';
  const updateData: Record<string, any> = {};
  updateData[apiFieldName] = value;
  
  try {
    await apiClient.updateRecord('Account', recordId, updateData);
    
    this.testContext.lastResponse = {
      status: () => 204,
      json: async () => ({ success: true })
    };
    
    logger.info(`✅ Updated Status to "${value}" via API`);
  } catch (error: any) {
    // For negative tests (SF-520-API-004), we EXPECT an error for invalid values
    // Capture the error response without throwing, so verification steps can check it
    const errorMessage = error.message || '';
    const isExpectedInvalidValueError = errorMessage.includes('INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST') ||
                                        errorMessage.includes('bad value for restricted picklist');
    
    this.testContext.lastResponse = {
      status: () => error.status || 400,
      json: async () => ({ 
        error: errorMessage,
        message: errorMessage,
        errorCode: isExpectedInvalidValueError ? 'INVALID_OR_NULL_FOR_RESTRICTED_PICKLIST' : 'UNKNOWN'
      })
    };
    this.testContext.lastError = error;
    
    if (isExpectedInvalidValueError) {
      // This is expected for negative tests - don't throw
      logger.info(`✅ Got expected error for invalid Status value "${value}": ${errorMessage}`);
    } else {
      // Unexpected error - throw it
      throw error;
    }
  }
});

// Note: "I create a new Account via POST with:" is now in common/api-common.steps.ts

// Bulk operations
When('I bulk update the Status via composite API', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const accountIds = this.testContext.accountIds || [];
  if (accountIds.length === 0) {
    throw new Error('No account IDs found for bulk update');
  }
  
  const apiFieldName = 'Account_Status__c';
  const updateValue = 'Active'; // Default value
  
  // Update each record
  const updates: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const accountId of accountIds) {
    try {
      await apiClient.updateRecord('Account', accountId, { [apiFieldName]: updateValue });
      updates.push({ id: accountId, success: true });
    } catch (error: any) {
      updates.push({ id: accountId, success: false, error: error.message });
    }
  }
  
  this.testContext.lastResponse = {
    status: () => 200,
    json: async () => ({ updates })
  };
  
  logger.info(`Bulk updated ${updates.filter(u => u.success).length} accounts`);
});

// Verification - Scenario Outline <value> gets replaced, so we match with {string}
Then('querying the Account should show Status as {string}', async function (this: AutomationWorld, expectedValue: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No record ID found');
  }
  
  const account = await apiClient.getAccount(recordId);
  const apiFieldName = 'Account_Status__c';
  const actualValue = account[apiFieldName];
  
  if (actualValue !== expectedValue) {
    throw new Error(`Expected Status to be "${expectedValue}" but got "${actualValue}"`);
  }
  
  logger.info(`Verified Status is ${expectedValue}`);
});

Then('querying the Account should show Status as "{string}"', async function (this: AutomationWorld, expectedValue: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No record ID found');
  }
  
  const account = await apiClient.getAccount(recordId);
  const apiFieldName = 'Account_Status__c';
  const actualValue = account[apiFieldName];
  
  if (actualValue !== expectedValue) {
    throw new Error(`Expected Status to be "${expectedValue}" but got "${actualValue}"`);
  }
  
  logger.info(`Verified Status is ${expectedValue}`);
});

Then('the response should include the Status field', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  
  const body = await response.json();
  const records = body.records || [body];
  
  if (records.length === 0) {
    throw new Error('No records in response');
  }
  
  const hasStatusField = records.some((r: any) => r.Account_Status__c !== undefined);
  if (!hasStatusField) {
    throw new Error('Response does not include Status field');
  }
  
  logger.info('Response includes Status field');
});

Then('all records should be updated successfully', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  
  const body = await response.json();
  const updates: Array<{ id: string; success: boolean; error?: string }> = body.updates || [];
  
  const failed = updates.filter((u) => !u.success);
  if (failed.length > 0) {
    throw new Error(`${failed.length} records failed to update: ${JSON.stringify(failed)}`);
  }
  
  logger.info(`All ${updates.length} records updated successfully`);
});

// Note: Common API response verification is in common/api-common.steps.ts

// Removed: 'the response should contain Account records' - use generic in common/api-common.steps.ts

// Note: "the error response should contain a validation message" is now in common/api-common.steps.ts

// Note: 'I have {int} Account records' is defined in common/data-factory.steps.ts

