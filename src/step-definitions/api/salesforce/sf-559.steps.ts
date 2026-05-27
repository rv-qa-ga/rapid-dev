/**
 * SF-559 Step Definitions - API
 * Add Dataverse_ID__c field to Contact object.
 * Verifies: Contact has field Dataverse_ID__c of type Text(36).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const OBJECT_API_NAME = 'Contact';
/** API name in feature; org may have Dataverse_Id__c (capital I, lowercase d). Match case-insensitively. */
const FIELD_API_NAME = 'Dataverse_ID__c';

// ============================================================================
// SCENARIO 1: API smoke - field exists and is Text(36)
// ============================================================================

/**
 * Given the Contact object
 * Describes the Contact object via API and stores field metadata.
 */
Given('the Contact object', async function (this: AutomationWorld) {
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
 * When the field "Dataverse_ID__c" is created
 * Asserts that the field exists on Contact and stores it for the next assertion.
 */
When('the field "Dataverse_ID__c" is created', async function (this: AutomationWorld) {
  const fields = this.testContext.fieldsMetadata || this.testContext.lastDescribeResult?.fields;
  if (!fields || !Array.isArray(fields)) {
    throw new Error(
      'No field metadata in context. Run "Given the Contact object" first.'
    );
  }

  const field = (fields as { name: string }[]).find(
    (f) => f.name.toLowerCase() === FIELD_API_NAME.toLowerCase()
  );
  if (!field) {
    const available = (fields as { name: string }[]).map((f) => f.name).slice(0, 30).join(', ');
    throw new Error(
      `Field "${FIELD_API_NAME}" not found on ${OBJECT_API_NAME}. Available (first 30): ${available}...`
    );
  }

  this.testContext.lastCheckedField = field;
  logger.info(`✅ Field "${field.name}" (Dataverse Id) exists on ${OBJECT_API_NAME}`);
});

/**
 * Then it must be of type Text(36)
 * Asserts the last checked field (Dataverse_ID__c) is string type with length 36.
 */
Then(/^it must be of type Text\(36\)$/, async function (this: AutomationWorld) {
  const field = this.testContext.lastCheckedField;
  if (!field) {
    throw new Error(
      `No field in context. Run When the field "Dataverse_ID__c" is created first.`
    );
  }

  const typeOk = (field.type || '').toLowerCase() === 'string';
  const lengthOk = field.length === 36;

  if (!typeOk) {
    throw new Error(
      `Field "${FIELD_API_NAME}" type is "${field.type}", expected "string" (Text).`
    );
  }
  if (!lengthOk) {
    throw new Error(
      `Field "${FIELD_API_NAME}" length is ${field.length}, expected 36 (Text(36)).`
    );
  }

  logger.info(`✅ Field "${FIELD_API_NAME}" is Text(36) (type: ${field.type}, length: ${field.length})`);
});

// ============================================================================
// SCENARIO 2: Alternative or negative path
// ============================================================================

/**
 * Given the system is configured for SF-559
 * Ensures API context and sets flag so the shared "When an alternative or invalid request is made" uses SF-559 behaviour.
 */
Given('the system is configured for SF-559', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  this.testContext.workItemForInvalidRequest = 'SF-559';
  logger.info(`✅ System configured for SF-559: ${OBJECT_API_NAME} described`);
});
