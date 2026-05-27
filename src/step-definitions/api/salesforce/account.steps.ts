import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient, SalesforceAccount } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

Given('I have created a Salesforce Account with:', async function (this: AutomationWorld, dataTable: DataTable) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "Given I have a valid Salesforce API token" step is executed first.');
  }
  const row = dataTable.hashes()[0];
  if (!row) throw new Error('Salesforce Account table must have at least one data row.');
  const payload: Record<string, any> = {};
  if (row['Name'] != null) payload.Name = row['Name'];
  if (row['Type'] != null) payload.Type = row['Type'];
  if (row['Industry'] != null) payload.Industry = row['Industry'];
  if (!payload.Name) throw new Error('Salesforce Account table must include Name.');
  if (!payload.Type) payload.Type = 'Agency';
  const result = await apiClient.createAccount(payload as SalesforceAccount);
  this.testContext.accountId = result.id;
  this.testContext.accountName = payload.Name;
  this.testContext.salesforceAccount = { Id: result.id, Name: payload.Name, Type: payload.Type, Industry: payload.Industry };
  this.testContext.accountCreatedViaAPI = true;
  logger.info(`Salesforce Account created: ${result.id} (${payload.Name}, Type: ${payload.Type})`);
});

// Removed: 'I create an account with name ""' - covered by 'I create an account with name {string}'

When('I create an account using the loaded test data', async function (this: AutomationWorld) {
  const testData = this.testContext.testData;
  if (!testData || !testData.AccountName) {
    throw new Error('Test data not loaded. Use "Given I load test data for test case ..." step first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  try {
    // CRITICAL: Type is REQUIRED - always set it
    const accountData: any = { 
      Name: testData.AccountName,
      Type: 'Agency', // Type is REQUIRED - set default
    };
    if (testData.Email) accountData.Email__c = testData.Email;
    if (testData.Phone) accountData.Phone = testData.Phone;

    const result = await apiClient.createAccount(accountData);
    this.testContext.lastResponse = { status: () => 201, json: async () => result };
    this.testContext.accountId = result.id;
    logger.info(`Account created with ID: ${result.id}`);
  } catch (error: any) {
    this.testContext.lastError = error;
    throw error;
  }
});

// Note: Renamed to avoid ambiguity with generic step "the {word} should be created successfully"
Then('the API account should be created successfully', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account ID not found in test context');
  }

  logger.info(`Account created successfully with ID: ${accountId}`);
});

Then('the API should return error status {int}', async function (this: AutomationWorld, expectedStatus: number) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found in test context');
  }

  const actualStatus = response.status();
  if (actualStatus !== expectedStatus) {
    throw new Error(`Expected error status ${expectedStatus} but got ${actualStatus}`);
  }
  logger.info(`API returned error status ${expectedStatus}`);
});

Then('the response should contain account ID', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account ID not found in response');
  }

  logger.info(`Account ID: ${accountId}`);
});

Then('I should be able to retrieve the account by ID', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const accountId = this.testContext.accountId;

  if (!apiClient || !accountId) {
    throw new Error('API client or account ID not available');
  }

  const account = await apiClient.getAccount(accountId);
  if (!account || !account.Id) {
    throw new Error('Failed to retrieve account');
  }

  logger.info(`Account retrieved successfully: ${account.Name}`);
});

