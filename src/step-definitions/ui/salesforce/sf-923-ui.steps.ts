/**
 * SF-923 — Product_Map__c Dataverse ID layout visibility (UI RBT).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { config } from '../../../config/config';
import { logger } from '../../../utils/logger';

const PRODUCT_MAP = 'Product_Map__c';

Given('a Product_Map__c record Id is resolved for SF-923 UI', async function (this: AutomationWorld) {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  if (!api) {
    throw new Error('Run "I have a valid Salesforce API token" before resolving Product_Map__c Id.');
  }
  const q = await api.query(`SELECT Id FROM ${PRODUCT_MAP} ORDER BY LastModifiedDate DESC LIMIT 1`);
  if (!q.records?.length) {
    throw new Error(`No ${PRODUCT_MAP} rows in org. Create one before SF-923 UI tests.`);
  }
  this.testContext.sf923ProductMapId = (q.records[0] as { Id: string }).Id;
  logger.info(`SF-923 UI: using ${PRODUCT_MAP} ${this.testContext.sf923ProductMapId}`);
});

When('I open the Product_Map__c record in Lightning for SF-923', async function (this: AutomationWorld) {
  if (!this.page || this.page.isClosed()) {
    throw new Error('Browser page not initialized. UI login step should run first or use a UI-capable hook.');
  }
  const id = this.testContext.sf923ProductMapId as string;
  if (!id) {
    throw new Error('No sf923ProductMapId. Run "a Product_Map__c record Id is resolved for SF-923 UI" first.');
  }
  const base = config.getSalesforceConfig().baseUrl.replace(/\/$/, '');
  const url = `${base}/lightning/r/${PRODUCT_MAP}/${id}/view`;
  await this.page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await this.page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  // Record home can be slow; wait for common LEX shells before assertions/screenshots
  await this.page
    .locator('.slds-page-header, records-record-layout-item, flexipage-component2')
    .first()
    .waitFor({ state: 'visible', timeout: 45000 })
    .catch(() => {});
  logger.info(`SF-923 UI: opened ${url}`);
});

Then('the Dataverse ID field must not be visible on the Product Map record page for SF-923', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized.');
  }
  const dataverseField = this.page
    .locator('[data-id="Dataverse_ID__c"]')
    .or(this.page.getByLabel(/^Dataverse ID$/i))
    .first();
  await expect(dataverseField).not.toBeVisible();
  logger.info('SF-923 UI: Dataverse ID is not visible on Product Map record page');
});

Given('RBT SF-923 UI documentation is recorded', async function () {
  logger.info(
    'SF-923 UI RBT: Track layout/FLS in Setup; see API feature SF-923 checklist steps and Jira AC for Scenario 1.'
  );
});

Then('Dataverse_ID__c must be excluded from all Product_Map__c page layouts per SF-923', async function () {
  logger.info(
    'MANUAL (SF-923): Object Manager → Product Map → Page Layouts — Dataverse_ID__c removed from all layouts.'
  );
});

Then('Dataverse_ID__c must be hidden from standard profiles per SF-923', async function () {
  logger.info('MANUAL (SF-923): Profiles / Permission Sets — standard users have no Read/Edit on Dataverse_ID__c in UI.');
});

Then('RBT SF-923 manual UI checklist evidence is attached', async function (this: AutomationWorld) {
  const payload = {
    evidenceType: 'sf923-manual-rbt',
    summary:
      'Manual RBT: confirm in Setup that Dataverse_ID__c is removed from all Product_Map__c page layouts and that standard profiles do not grant Read/Edit on this field in the UI. Automated UI scenarios SF-923-UI-001/002 cover record-page visibility for standard and MRD users.',
    jira: 'SF-923',
    capturedAt: new Date().toISOString(),
  };
  const text = JSON.stringify(payload, null, 2);
  if (typeof this.attach === 'function') {
    await this.attach(text, 'application/json');
  }
  logger.info('SF-923 UI RBT: attached manual checklist JSON evidence (no viewport screenshot for @manual).');
});
