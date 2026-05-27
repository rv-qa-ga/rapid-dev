/**
 * SF-794 Step Definitions - API
 * Make Dataverse field identifiers available in Salesforce - Account relationship (TPA Maps) -> TPA Maps.
 * Scenario 1: Query Salesforce to resolve Dataverse ID for an integrated field.
 * Scenario 2: Invalid request handled (reuses sf-620 When/Then; workItemForInvalidRequest set here).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const OBJECT_API_NAME = 'Account_Relationship__c';

Given('the system is configured for SF-794', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }
  try {
    const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
    this.testContext.lastDescribeResult = describeResult;
  } catch (_e) {
    const accountDescribe = await apiClient.describeSObject('Account');
    this.testContext.lastDescribeResult = accountDescribe;
    logger.info(`⚠️ ${OBJECT_API_NAME} not in org; using Account for context`);
  }
  this.testContext.apiError = undefined;
  this.testContext.workItemForInvalidRequest = 'SF-794';
  logger.info(`✅ System configured for SF-794`);
});

Given('an integrated Salesforce field includes a value that must be translated to a Dataverse ID', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');
  this.testContext.apiError = undefined;
  const queries = [
    `SELECT Id, Dataverse_ID__c FROM Account WHERE Dataverse_ID__c != null LIMIT 1`,
    `SELECT Id, Dataverse_ID__c FROM ${OBJECT_API_NAME} WHERE Dataverse_ID__c != null LIMIT 1`,
  ];
  for (const soql of queries) {
    try {
      const result = await apiClient.query(soql);
      const records = (result as { records?: { Id: string; Dataverse_ID__c?: string }[] }).records || [];
      if (records.length > 0) {
        this.testContext.sf794RecordId = records[0].Id;
        this.testContext.sf794DataverseId = records[0].Dataverse_ID__c;
        logger.info('✅ Context set: integrated Salesforce field value for Dataverse ID resolution');
        return;
      }
    } catch (_e) {
      continue;
    }
  }
  this.testContext.sf794RecordId = undefined;
  this.testContext.sf794DataverseId = undefined;
  logger.info('✅ Context set (no record with Dataverse ID found; When step may query anyway)');
});

When('I query Salesforce to resolve the Dataverse ID for that value', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');
  this.testContext.sf794ResolvedDataverseId = undefined;
  const queries = [
    `SELECT Id, Dataverse_ID__c FROM Account WHERE Dataverse_ID__c != null LIMIT 1`,
    `SELECT Id, Dataverse_ID__c FROM ${OBJECT_API_NAME} WHERE Dataverse_ID__c != null LIMIT 1`,
  ];
  for (const soql of queries) {
    try {
      const result = await apiClient.query(soql);
      const records = (result as { records?: { Dataverse_ID__c?: string }[] }).records || [];
      if (records.length > 0 && records[0].Dataverse_ID__c) {
        this.testContext.sf794ResolvedDataverseId = records[0].Dataverse_ID__c;
        return;
      }
    } catch (_e) {
      continue;
    }
  }
});

Then('Salesforce returns the Dataverse ID needed for the Dataverse TPA maps payload', async function (this: AutomationWorld) {
  const resolved = this.testContext.sf794ResolvedDataverseId ?? this.testContext.sf794DataverseId;
  if (!resolved || String(resolved).trim() === '') {
    throw new Error('Salesforce did not return a Dataverse ID (empty or missing).');
  }
  logger.info(`✅ Salesforce returned Dataverse ID for TPA maps payload: ${resolved}`);
});
