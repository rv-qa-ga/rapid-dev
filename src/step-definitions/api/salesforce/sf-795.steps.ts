/**
 * Step definitions for SF-795 - Dataverse ID field on Account Relationship (TPA Maps)
 * Object: Account_Relationship__c. Field: Dataverse_ID__c (Text 36).
 */

import { When, Then, Given } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';

const OBJECT_API_NAME = 'Account_Relationship__c';

/**
 * Create an Account_Relationship__c record via API with only required fields (no Dataverse_ID__c).
 * Used by: API-003 - New record has blank Dataverse_ID__c
 */
When('I create an Account_Relationship__c record via API with required fields only', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  await testDataFactory.initialize();

  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `AR_${uniqueId}_${timestamp}`;

  let sourceAccountId = this.testContext.accountId;
  if (!sourceAccountId) {
    const srcAccount = await testDataFactory.createAccount({
      Name: `AR_Src_${uniqueName}`,
      Type: 'Agency',
      Functional_Currency__c: 'USD',
      Region__c: 'EU',
      BillingCountry: 'Germany',
    });
    sourceAccountId = srcAccount.id;
    this.testContext.accountId = sourceAccountId;
  }

  const relatedAccount = await testDataFactory.createAccount({
    Name: `AR_Rel_${uniqueName}`,
    Type: 'Agency',
    Functional_Currency__c: 'USD',
    Region__c: 'EU',
    BillingCountry: 'Germany',
  });

  const validFrom = new Date().toISOString().split('T')[0];
  const payload: Record<string, any> = {
    Source_Account__c: sourceAccountId,
    Related_Account__c: relatedAccount.id,
    Valid_From__c: validFrom,
    Is_Active__c: true,
  };

  const result = await apiClient.createRecord(OBJECT_API_NAME, payload);
  const recordId = result.id;
  if (!recordId) {
    throw new Error('createRecord did not return an id for Account_Relationship__c');
  }
  this.testContext.recordId = recordId;
  this.testContext.accountRelationshipId = recordId;
  this.testContext.lastCreatedId = recordId;
  this.testContext.lastCreatedRecordId = recordId;
  this.testContext.lastResponse = { status: () => 201, json: async () => result };
  this.testContext.apiError = null;

  testDataFactory.registerRecord(recordId, OBJECT_API_NAME, `AR_${recordId}`);
  logger.info(`✅ Created ${OBJECT_API_NAME} with required fields only: ${recordId}`);
});

/**
 * Assert that a field on the last-created record (Account_Relationship__c) is blank.
 * Used by: API-003
 */
Then('the {string} field on the created record should be blank', async function (this: AutomationWorld, fieldName: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const recordId = this.testContext.lastCreatedId || this.testContext.recordId || this.testContext.accountRelationshipId;

  if (!apiClient) {
    throw new Error('API client not initialized.');
  }
  if (!recordId) {
    throw new Error('No created record ID in context. Run "I create an Account_Relationship__c record via API with required fields only" first.');
  }

  const apiFieldName = fieldName.includes('__c') ? fieldName : fieldName.replace(/\s+/g, '_') + '__c';
  const record = await apiClient.getRecord(OBJECT_API_NAME, recordId);
  const value = record[apiFieldName];

  if (value !== null && value !== undefined && value !== '') {
    throw new Error(`Field "${fieldName}" (${apiFieldName}) on the created record should be blank but got: "${value}"`);
  }

  logger.info(`✅ Field "${fieldName}" on created record is blank`);
});

/**
 * Provide an Account_Relationship__c record that already has the given field populated.
 * Creates a record then updates the field via API (if the current user is allowed to set it, e.g. integration user).
 * Used by: API-005 - Cannot change or clear Dataverse_ID__c once populated
 */
Given('I have an Account_Relationship__c record with {string} already populated', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  await testDataFactory.initialize();

  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `AR_${uniqueId}_${timestamp}`;

  let sourceAccountId = this.testContext.accountId;
  if (!sourceAccountId) {
    const srcAccount = await testDataFactory.createAccount({
      Name: `AR_Src_${uniqueName}`,
      Type: 'Agency',
      Functional_Currency__c: 'USD',
      Region__c: 'EU',
      BillingCountry: 'Germany',
    });
    sourceAccountId = srcAccount.id;
    this.testContext.accountId = sourceAccountId;
  }

  const relatedAccount = await testDataFactory.createAccount({
    Name: `AR_Rel_${uniqueName}`,
    Type: 'Agency',
    Functional_Currency__c: 'USD',
    Region__c: 'EU',
    BillingCountry: 'Germany',
  });

  const validFrom = new Date().toISOString().split('T')[0];
  const payload: Record<string, any> = {
    Source_Account__c: sourceAccountId,
    Related_Account__c: relatedAccount.id,
    Valid_From__c: validFrom,
    Is_Active__c: true,
  };

  const result = await apiClient.createRecord(OBJECT_API_NAME, payload);
  const recordId = result.id;
  if (!recordId) {
    throw new Error('createRecord did not return an id for Account_Relationship__c');
  }
  this.testContext.recordId = recordId;
  this.testContext.accountRelationshipId = recordId;

  testDataFactory.registerRecord(recordId, OBJECT_API_NAME, `AR_${recordId}`);

  const apiFieldName = fieldName.includes('__c') ? fieldName : fieldName.replace(/\s+/g, '_') + '__c';
  const testValue = apiFieldName === 'Dataverse_ID__c' ? `test-dataverse-guid-${uniqueId.toLowerCase()}-${timestamp}` : `test-value-${timestamp}`;

  try {
    await apiClient.updateRecord(OBJECT_API_NAME, recordId, { [apiFieldName]: testValue });
    logger.info(`✅ Account_Relationship__c ${recordId} updated with ${apiFieldName} (already populated)`);
  } catch (error: any) {
    logger.warn(
      `Could not set ${apiFieldName} on Account_Relationship__c (org may restrict to MuleSoft user). ` +
      `For API-005, use an integration user or pre-seeded data. Error: ${error.message}`
    );
    throw new Error(
      `SF-795 API-005 requires a record with ${apiFieldName} populated. ` +
      `Only the MuleSoft integration user can set this field. Configure an integration user or use pre-seeded test data.`
    );
  }
});
