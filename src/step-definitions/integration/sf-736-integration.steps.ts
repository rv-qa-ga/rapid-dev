/**
 * SF-736 MRD — Member/TPA mastered Account → Dynamics (near real-time).
 * Used by `mrd-sf736-member-tpa.feature` (step: "SF-736 integration assertions use...").
 * ST-191–parity mastered Account flows live in `SF-736.feature` (API) and `ui/SF/SF-736.feature`.
 * Bridges TestDataFactory / api-common flows (testContext.accountId, apiClient) to
 * mulesoft-integration steps that expect salesforceClient + createdAccountId.
 */

import { Given } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../utils/logger';

Given('SF-736 integration assertions use the active Salesforce API client and current Account', async function (this: AutomationWorld) {
  const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!api) {
    throw new Error('No Salesforce API client. Run a valid Salesforce API token step first.');
  }
  const id = this.testContext.accountId as string | undefined;
  if (!id) {
    throw new Error('No Account ID in context. Create an Account first (e.g. data-factory steps).');
  }
  this.testContext.salesforceClient = api;
  this.testContext.createdAccountId = id;
  this.testContext.salesforceAccountId = id;
  const name = (this.testContext.accountName as string | undefined) || '';
  const prev = (this.testContext.salesforceAccount as Record<string, unknown> | undefined) || {};
  this.testContext.salesforceAccount = { ...prev, Id: id, Name: name };
  logger.info(`SF-736: aliased apiClient → salesforceClient, Account Id=${id}`);
});
