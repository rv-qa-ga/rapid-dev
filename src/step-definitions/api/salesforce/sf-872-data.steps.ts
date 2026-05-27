/**
 * SF-872 — create reference test rows (record data) per object via REST API.
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import {
  ensureSf872Product2Id,
  buildSf872ReferenceRecordPayload,
} from '../../../utils/sf872-test-data-record';

When(
  'I create an SF-872 reference test record for Salesforce object {string}',
  async function (this: AutomationWorld, objectApiName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const product2Id = await ensureSf872Product2Id(apiClient);
    this.testContext.sf872Product2Id = product2Id;

    let solvencyIiId: string | undefined;
    if (objectApiName === 'Line_of_Business__c') {
      const solPayload = await buildSf872ReferenceRecordPayload(apiClient, 'Solvency_II__c', {
        product2Id,
      });
      logger.info(`SF-872: creating prerequisite Solvency_II__c for Line_of_Business__c`);
      const solRes = await apiClient.createRecord('Solvency_II__c', solPayload as Record<string, unknown>);
      if (!solRes.id) {
        throw new Error('Solvency_II__c prerequisite create returned no id');
      }
      solvencyIiId = solRes.id;
    }

    const payload = await buildSf872ReferenceRecordPayload(apiClient, objectApiName, {
      product2Id,
      solvencyIiId,
    });

    logger.info(`SF-872: creating ${objectApiName} with keys: ${Object.keys(payload).join(', ')}`);
    const result = await apiClient.createRecord(objectApiName, payload as Record<string, unknown>);

    if (!result.success || !result.id) {
      throw new Error(
        `SF-872 create failed for ${objectApiName}: ${JSON.stringify(result.errors || result, null, 2)}`
      );
    }

    this.testContext.sf872LastCreatedObject = objectApiName;
    this.testContext.sf872LastCreatedRecordId = result.id;

    if (typeof this.attach === 'function') {
      await this.attach(
        JSON.stringify(
          {
            evidenceType: 'sf872-record-create',
            objectApiName,
            recordId: result.id,
            payloadKeys: Object.keys(payload),
          },
          null,
          2
        ),
        'application/json'
      );
    }
  }
);

Then('the SF-872 reference test record should be created successfully', async function (this: AutomationWorld) {
  const id = this.testContext.sf872LastCreatedRecordId as string | undefined;
  const objectApiName = this.testContext.sf872LastCreatedObject as string | undefined;
  if (!id || !objectApiName) {
    throw new Error('Missing created record context. Run the SF-872 create step first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  const rec = await apiClient.getRecord(objectApiName, id);
  if (!rec.Id) {
    throw new Error(`Could not retrieve ${objectApiName} ${id} after create`);
  }
  logger.info(`SF-872: verified ${objectApiName} ${id} exists`);
});
