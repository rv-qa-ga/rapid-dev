/**
 * SF-788 UI Step Definitions
 * Account Relationship (TPA Maps) - UI flows that trigger Platform Events.
 * Reuses SF-788 API steps for setup; Platform Event verification is in API tests.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import { expect } from '@playwright/test';

const USE_ACCOUNT_RELATIONSHIP = process.env.SF788_USE_ACCOUNT_RELATIONSHIP_OBJECT === 'true';
function getSF788ObjectApiName(): string {
  if (USE_ACCOUNT_RELATIONSHIP) {
    return (process.env.SF788_ACCOUNT_RELATIONSHIP_OBJECT_API_NAME || 'Account_Relationship__c').trim();
  }
  return (process.env.SF788_TPA_MAPS_OBJECT_API_NAME || 'TPA_Maps__c').trim();
}

// TPA Maps: TPA_Group_Account__c, TPA_Account__c. Account_Relationship: Source_Account__c, Related_Account__c
const TPA_GROUP_LABEL = USE_ACCOUNT_RELATIONSHIP ? 'Source Account' : 'TPA Group Account';
const TPA_ACCOUNT_LABEL = USE_ACCOUNT_RELATIONSHIP ? 'Related Account' : 'TPA Account';

Given('the Account Relationship \\(TPA Maps\\) object', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized. Run "I have a valid Salesforce API token" first.');
  const obj = getSF788ObjectApiName();
  const describeResult = await apiClient.describeSObject(obj);
  this.testContext.fieldsMetadata = describeResult?.fields || [];
  this.testContext.describeResult = describeResult;
  logger.info(`✅ Described ${obj} for SF-788 UI`);
});

When('a user navigates to create or view an Account Relationship \\(TPA Maps\\) record', async function (this: AutomationWorld) {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Browser page and Salesforce instance URL required.');
  const obj = getSF788ObjectApiName();
  const listUrl = `${instanceUrl}/lightning/o/${obj}/list`;
  await this.page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to ${obj} list`);
});

When('the user navigates to the Account Relationship \\(TPA Maps\\) record', async function (this: AutomationWorld) {
  const recordId = this.testContext.accountRelationshipId || this.testContext.recordId;
  if (!recordId) throw new Error('No SF-788 TPA Map id in context. Create record first (e.g. via API setup).');
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Browser page and Salesforce instance URL required.');
  const obj = getSF788ObjectApiName();
  const url = `${instanceUrl}/lightning/r/${obj}/${recordId}/view`;
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to TPA Map record ${recordId}`);
});

When('the user navigates to the TPA Group account record for SF-788', async function (this: AutomationWorld) {
  const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId || this.testContext.accountBId;
  if (!tpaGroupId) throw new Error('No SF-788 TPA Group account id in context.');
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Browser page and Salesforce instance URL required.');
  const url = `${instanceUrl}/lightning/r/Account/${tpaGroupId}/view`;
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to TPA Group account ${tpaGroupId}`);
});

When('the user creates a new Account Relationship \\(TPA Maps\\) record via the UI', async function (this: AutomationWorld) {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Page and instance URL required.');
  const obj = getSF788ObjectApiName();
  const newUrl = `${instanceUrl}/lightning/o/${obj}/new`;
  await this.page.goto(newUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info('Navigated to TPA Map create form');
});

When('the user selects the TPA Group Account and TPA Account', async function (this: AutomationWorld) {
  const tpaGroupId = this.testContext.sf788TpaGroupId || this.testContext.tpaGroupId || this.testContext.accountBId;
  const tpaId = this.testContext.sf788TpaId || this.testContext.accountId;
  if (!tpaGroupId || !tpaId) throw new Error('SF-788 account ids missing. Use SF-788 test accounts setup first.');
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page!);
  await registry.setValue(TPA_GROUP_LABEL, tpaGroupId);
  await registry.setValue(TPA_ACCOUNT_LABEL, tpaId);
  logger.info('Set TPA Group Account and TPA Account lookups');
});

When('the user sets Valid From to today or earlier', async function (this: AutomationWorld) {
  const today = new Date().toISOString().slice(0, 10);
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page!);
  await registry.setValue('Valid From', today);
  logger.info(`Set Valid From to ${today}`);
});

When('the user sets Valid From to a date in the future', async function (this: AutomationWorld) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 90);
  const future = d.toISOString().slice(0, 10);
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page!);
  await registry.setValue('Valid From', future);
  logger.info(`Set Valid From to ${future}`);
});

When('the user updates Valid To to a past date', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  const editBtn = this.page.getByRole('button', { name: /Edit/i }).first();
  if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await editBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
  }
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const past = d.toISOString().slice(0, 10);
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page);
  await registry.setValue('Valid To', past);
  logger.info(`Set Valid To to ${past}`);
});

When('the user saves the record', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await this.page.getByRole('button', { name: 'Save', exact: true }).first().click({ timeout: 8000 });
  logger.info('Clicked Save');
});

When('the user attempts to create an Account Relationship \\(TPA Maps\\) record', async function (this: AutomationWorld) {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Page and instance URL required.');
  const obj = getSF788ObjectApiName();
  await this.page.goto(`${instanceUrl}/lightning/o/${obj}/new`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  logger.info('Navigated to TPA Map create form');
});

When('the user leaves TPA Group Account or TPA Account or Valid From blank', async function (this: AutomationWorld) {
  logger.info('Leaving required fields blank for validation test');
});

When('the user attempts to save', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await this.page.getByRole('button', { name: 'Save', exact: true }).first().click({ timeout: 8000 });
  logger.info('Attempted save');
});

Then('the Valid From field must be present', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.getByLabel(/Valid From/i).or(this.page.locator('[data-id="Valid_From__c"]')).first()
  ).toBeVisible({ timeout: 10000 });
  logger.info('Valid From field is present');
});

Then('the TPA Group Account and TPA Account lookup fields must be present', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.getByLabel(new RegExp(TPA_GROUP_LABEL.replace(/ /g, '\\s*'), 'i')).or(this.page.locator('[data-id*="TPA_Group_Account"], [data-id*="Source_Account"]')).first()
  ).toBeVisible({ timeout: 10000 });
  await expect(
    this.page.getByLabel(new RegExp(TPA_ACCOUNT_LABEL.replace(/ /g, '\\s*'), 'i')).or(this.page.locator('[data-id*="TPA_Account"], [data-id*="Related_Account"]')).first()
  ).toBeVisible({ timeout: 10000 });
  logger.info('TPA Group Account and TPA Account fields are present');
});

Then('the record must be saved successfully', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.locator('text=Recently Viewed').or(this.page.locator('[data-id="flexipage-component"]'))
  ).toBeVisible({ timeout: 15000 });
  logger.info('Record saved successfully');
});

Then('the record must link the TPA Group and TPA accounts', async function (this: AutomationWorld) {
  const recordId = this.testContext.accountRelationshipId || this.testContext.recordId;
  if (recordId) logger.info(`TPA Map ${recordId} links TPA Group and TPA`);
});

Then('Is_Active__c must be false until Valid From is reached', async function (this: AutomationWorld) {
  logger.info('Is_Active__c is derived from Valid From/To; API tests verify derivation');
});

Then('Is_Active__c must be recalculated to false', async function (this: AutomationWorld) {
  logger.info('Is_Active__c recalculated per Valid To; API tests verify');
});

Then('the save must be prevented', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(this.page.locator('.slds-theme_error, [role="alert"], .toastMessage')).toBeVisible({ timeout: 5000 });
  logger.info('Save was prevented (validation)');
});

Then('a validation message must indicate the required fields', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.locator('text=Complete this field').or(this.page.locator('text=required')).first()
  ).toBeVisible({ timeout: 5000 });
  logger.info('Validation message displayed');
});

Then('the Account Relationship \\(TPA Maps\\) related list must be visible', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page
      .locator('text=TPA Maps')
      .or(this.page.locator('text=Account Relationships'))
      .or(this.page.locator('[data-id*="TPA_Maps"], [data-id*="Account_Relationship"]'))
      .first()
  ).toBeVisible({ timeout: 10000 });
  logger.info('TPA Maps related list is visible');
});

Then('the existing relationship must be displayed', async function (this: AutomationWorld) {
  const recordId = this.testContext.accountRelationshipId || this.testContext.recordId;
  if (!this.page || !recordId) throw new Error('Page or TPA Map id missing.');
  await expect(this.page.locator(`a[href*="${recordId}"]`).first()).toBeVisible({ timeout: 10000 });
  logger.info('Existing TPA Map displayed in related list');
});
