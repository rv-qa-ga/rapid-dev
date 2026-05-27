/**
 * SF-973 — Product Map field history via REST (partial story scope).
 * Reuses: SalesforceAPIClient (JWT / integration API user from env), AutomationWorld.testContext.
 *
 * History sObject for Product_Map__c is Product_Map__History (standard field-history naming).
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const PRODUCT_MAP_HISTORY = 'Product_Map__History';

/** Allow only valid Salesforce field API names in SOQL filter (no injection). */
function assertSafeFieldApiName(name: string): string {
  const t = name.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(t)) {
    throw new Error(`Invalid field API name for SOQL filter: ${name}`);
  }
  return t;
}

When(
  'I query Product Map field history via REST API with audit columns',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Run "I have a valid Salesforce API token" first.');
    }

    const soql = [
      'SELECT Id, ParentId, Field, OldValue, NewValue, CreatedById, CreatedDate',
      `FROM ${PRODUCT_MAP_HISTORY}`,
      'LIMIT 1',
    ].join(' ');

    const result = await apiClient.query(soql);
    this.testContext.productMapHistoryQueryResult = result;
    logger.info(
      `Product Map history SOQL ok: totalSize=${result?.totalSize ?? 'n/a'}, done=${result?.done}`
    );
  }
);

When(
  'I query Product Map field history via REST API with audit columns for field {string}',
  async function (this: AutomationWorld, fieldApiName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Run "I have a valid Salesforce API token" first.');
    }
    const field = assertSafeFieldApiName(fieldApiName);
    const soql = [
      'SELECT Id, ParentId, Field, OldValue, NewValue, CreatedById, CreatedDate',
      `FROM ${PRODUCT_MAP_HISTORY}`,
      `WHERE Field = '${field}'`,
      'LIMIT 10',
    ].join(' ');

    const result = await apiClient.query(soql);
    this.testContext.productMapHistoryQueryResult = result;
    logger.info(
      `Product Map history SOQL (Field=${field}) ok: totalSize=${result?.totalSize ?? 'n/a'}, done=${result?.done}`
    );
  }
);

Then('the Product Map field history query response should be successful', async function (this: AutomationWorld) {
  const result = this.testContext.productMapHistoryQueryResult;
  if (!result) {
    throw new Error('No query result. Run "I query Product Map field history via REST API with audit columns" first.');
  }
  if (result.done !== true) {
    throw new Error(`Expected query done=true, got ${JSON.stringify(result.done)}`);
  }
  if (!Array.isArray(result.records)) {
    throw new Error('Query response missing records array');
  }
  logger.info('✅ Product_Map__History SOQL returned a valid query envelope (integration API read access)');
});
