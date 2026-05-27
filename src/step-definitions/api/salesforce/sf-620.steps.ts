/**
 * SF-620 Step Definitions - API
 * Add Dataverse_Id__c field on the Member Legal Entity Relationship object.
 * Verifies: object exists, Dataverse_ID__c field exists, Source_Relationship_Id__c removed.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const OBJECT_API_NAME = 'Member_Legal_Entity_Relationship__c';
const NEW_FIELD = 'Dataverse_ID__c';
const REMOVED_FIELD = 'Source_Relationship_Id__c';

// ============================================================================
// SCENARIO 1: API smoke - field created, old field deleted
// ============================================================================

/**
 * Given the Member_Legal_Entity_Relationship__c object
 * Describes the object via API and stores metadata so we can assert on fields.
 */
Given('the Member_Legal_Entity_Relationship__c object', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.describeResult = describeResult;
  this.testContext.fieldsMetadata = describeResult.fields || [];
  this.testContext.describedObjectName = describeResult.name || OBJECT_API_NAME;

  logger.info(`✅ Described ${OBJECT_API_NAME}: ${(describeResult.fields || []).length} fields`);
});

/**
 * When the field Dataverse_ID__c is created
 * Asserts that the new field exists on the object (post-deployment).
 */
When('the field Dataverse_ID__c is created', async function (this: AutomationWorld) {
  const fields = this.testContext.fieldsMetadata || this.testContext.lastDescribeResult?.fields;
  if (!fields || !Array.isArray(fields)) {
    throw new Error(
      'No field metadata in context. Run "Given the Member_Legal_Entity_Relationship__c object" first.'
    );
  }

  const field = fields.find((f: { name: string }) => f.name === NEW_FIELD);
  if (!field) {
    const available = (fields as { name: string }[]).map((f) => f.name).slice(0, 30).join(', ');
    throw new Error(
      `Field "${NEW_FIELD}" not found on ${OBJECT_API_NAME}. Available (first 30): ${available}...`
    );
  }

  logger.info(`✅ Field "${NEW_FIELD}" exists on ${OBJECT_API_NAME}`);
});

/**
 * Then Source_Relationship_Id__c must be deleted from the object
 * Asserts that the deprecated field is no longer on the object.
 */
Then('Source_Relationship_Id__c must be deleted from the object', async function (this: AutomationWorld) {
  const fields = this.testContext.fieldsMetadata || this.testContext.lastDescribeResult?.fields;
  if (!fields || !Array.isArray(fields)) {
    throw new Error(
      'No field metadata in context. Run "Given the Member_Legal_Entity_Relationship__c object" first.'
    );
  }

  const field = fields.find((f: { name: string }) => f.name === REMOVED_FIELD);
  if (field) {
    throw new Error(
      `Field "${REMOVED_FIELD}" should have been deleted from ${OBJECT_API_NAME} but still exists.`
    );
  }

  logger.info(`✅ Field "${REMOVED_FIELD}" is deleted from ${OBJECT_API_NAME}`);
});

// ============================================================================
// SCENARIO 2: Alternative or negative path - invalid request
// ============================================================================

/**
 * Given the system is configured for SF-620
 * Ensures we have API client and object context for the negative-path scenario.
 */
Given('the system is configured for SF-620', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  // Describe the object so we know it exists; clear any previous error
  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  this.testContext.workItemForInvalidRequest = 'SF-620';
  logger.info(`✅ System configured for SF-620: ${OBJECT_API_NAME} described`);
});

/**
 * When an alternative or invalid request is made
 * Makes a request that should fail: SOQL using the removed field.
 */
When('an alternative or invalid request is made', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  this.testContext.apiError = undefined;
  const workItem = this.testContext.workItemForInvalidRequest;

  let soql: string;
  if (workItem === 'SF-559') {
    soql = `SELECT Id, NonExistent_Field__c FROM Contact LIMIT 1`;
  } else if (workItem === 'SF-361') {
    soql = `SELECT Id, NonExistent_Operations_Field__c FROM Opportunity LIMIT 1`;
  } else if (workItem === 'SF-794') {
    soql = `SELECT Id, NonExistent_Dataverse_Field__c FROM Account_Relationship__c LIMIT 1`;
  } else if (workItem === 'SF-883') {
    soql = `SELECT Id, NonExistent_SF883_Field__c FROM Opportunity LIMIT 1`;
  } else {
    soql = `SELECT Id, ${REMOVED_FIELD} FROM ${OBJECT_API_NAME} LIMIT 1`;
  }

  try {
    await apiClient.query(soql);
    this.testContext.apiError = null;
  } catch (error: any) {
    this.testContext.apiError = error;
    logger.info(`Expected error from invalid request: ${error.message}`);
  }
});

/**
 * Then the API must respond appropriately
 * Asserts that the API rejected the invalid request (e.g. no such column).
 */
Then('the API must respond appropriately', async function (this: AutomationWorld) {
  const apiError = this.testContext.apiError;

  if (apiError === undefined) {
    throw new Error('No request was made. Run "When an alternative or invalid request is made" first.');
  }

  if (apiError === null) {
    throw new Error(
      'API should have rejected the invalid request (e.g. SOQL with removed field) but the request succeeded.'
    );
  }

  const message = (apiError as Error).message || String(apiError);
  const indicatesInvalid =
    message.includes('No such column') ||
    message.includes('Source_Relationship_Id__c') ||
    message.includes('NonExistent_Field__c') ||
    message.includes('NonExistent_Operations_Field__c') ||
    message.includes('NonExistent_Dataverse_Field__c') ||
    message.includes('NonExistent_SF883_Field__c') ||
    message.includes('did not find') ||
    message.includes('invalid') ||
    message.includes('INVALID_FIELD') ||
    message.includes('Query failed') ||
    message.includes('NOT_FOUND') ||
    message.includes('does not exist') ||
    message.includes('requested resource');

  if (!indicatesInvalid) {
    throw new Error(
      `API error should indicate invalid request (e.g. "No such column"). Got: ${message}`
    );
  }

  logger.info(`✅ API responded appropriately to invalid request`);
});
