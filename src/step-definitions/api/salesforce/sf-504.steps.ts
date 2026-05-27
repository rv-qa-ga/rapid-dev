/**
 * SF-504 Step Definitions - API
 * AccountTeamMember object consolidation.
 * Minimal RBT: verify API can describe/invoke AccountTeamMember.
 */

import { Given, When } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const OBJECT_API_NAME = 'AccountTeamMember';

Given('the system is configured for SF-504', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }
  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  logger.info(`✅ System configured for SF-504: ${OBJECT_API_NAME} described`);
});

When('the API is invoked for SF-504', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');
  this.testContext.apiError = undefined;
  try {
    const result = await apiClient.query(`SELECT Id, AccountId, UserId FROM ${OBJECT_API_NAME} LIMIT 1`);
    this.testContext.sf504QueryResult = result;
  } catch (e: any) {
    this.testContext.apiError = e;
  }
});

// Then step is in common/api-common.steps.ts: the API must return success or the expected outcome
