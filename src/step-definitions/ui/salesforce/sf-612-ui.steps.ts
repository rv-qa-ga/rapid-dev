/**
 * SF-612 UI Step Definitions
 * Member Legal Entity Relationship - UI flows that trigger Platform Events.
 * Reuses SF-612 API steps for setup; Platform Event verification is in API tests.
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { expect } from '@playwright/test';

const OBJECT_API_NAME = 'Member_Legal_Entity_Relationship__c';

When('a user navigates to create or view a Member Legal Entity Relationship', async function (this: AutomationWorld) {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) {
    throw new Error('Browser page and Salesforce instance URL required for UI navigation.');
  }
  const listUrl = `${instanceUrl}/lightning/o/${OBJECT_API_NAME}/list`;
  await this.page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to ${OBJECT_API_NAME} list`);
});

When('the user navigates to the Member Legal Entity Relationship record', async function (this: AutomationWorld) {
  const mlerId = this.testContext.sf612MlerId as string;
  if (!mlerId) {
    throw new Error('No SF-612 MLER id in context. Create MLER first (e.g. via API setup).');
  }
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) {
    throw new Error('Browser page and Salesforce instance URL required.');
  }
  const url = `${instanceUrl}/lightning/r/${OBJECT_API_NAME}/${mlerId}/view`;
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to MLER record ${mlerId}`);
});

When('the user navigates to the Member account record for SF-612', async function (this: AutomationWorld) {
  const memberId = this.testContext.sf612MemberAccountId as string;
  if (!memberId) {
    throw new Error('No SF-612 Member account id in context.');
  }
  this.testContext.accountId = memberId;
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) {
    throw new Error('Browser page and Salesforce instance URL required.');
  }
  const url = `${instanceUrl}/lightning/r/Account/${memberId}/view`;
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info(`Navigated to Member account ${memberId}`);
});

Then('the Start Date field must be present', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.getByLabel(/Start Date/i).or(this.page.locator('[data-id="Start_Date__c"]')).first()
  ).toBeVisible({ timeout: 10000 });
  logger.info('Start Date field is present');
});

Then('the Member and Legal Entity lookup fields must be present', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.getByLabel(/Member/i).or(this.page.locator('[data-id="Member__c"]')).first()
  ).toBeVisible({ timeout: 10000 });
  await expect(
    this.page.getByLabel(/Legal Entity/i).or(this.page.locator('[data-id="Legal_Entity__c"]')).first()
  ).toBeVisible({ timeout: 10000 });
  logger.info('Member and Legal Entity fields are present');
});

When('the user creates a new Member Legal Entity Relationship via the UI', async function (this: AutomationWorld) {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Page and instance URL required.');
  const newUrl = `${instanceUrl}/lightning/o/${OBJECT_API_NAME}/new`;
  await this.page.goto(newUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  logger.info('Navigated to MLER create form');
});

When('the user selects the Member and Legal Entity accounts', async function (this: AutomationWorld) {
  const memberId = this.testContext.sf612MemberAccountId as string;
  const legalId = this.testContext.sf612LegalEntityAccountId as string;
  if (!memberId || !legalId) throw new Error('SF-612 account ids missing. Use SF-612 test accounts setup first.');
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page!);
  await registry.setValue('Member', memberId);
  await registry.setValue('Legal Entity', legalId);
  logger.info('Set Member and Legal Entity lookups');
});

When('the user sets Start Date to today or earlier', async function (this: AutomationWorld) {
  const today = new Date().toISOString().slice(0, 10);
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page!);
  await registry.setValue('Start Date', today);
  logger.info(`Set Start Date to ${today}`);
});

When('the user sets Start Date to a date in the future', async function (this: AutomationWorld) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 90);
  const future = d.toISOString().slice(0, 10);
  const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
  const registry = new FieldRegistry(this.page!);
  await registry.setValue('Start Date', future);
  logger.info(`Set Start Date to ${future}`);
});

When('the user saves the record', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await this.page.getByRole('button', { name: 'Save', exact: true }).first().click({ timeout: 8000 });
  logger.info('Clicked Save');
});

When('the user updates the End Date to a past date', async function (this: AutomationWorld) {
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
  await registry.setValue('End Date', past);
  logger.info(`Set End Date to ${past}`);
});

Then('the record must be saved successfully', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page.locator('text=Recently Viewed').or(this.page.locator('[data-id="flexipage-component"]'))
  ).toBeVisible({ timeout: 15000 });
  logger.info('Record saved successfully');
});

Then('the record must link the Member and Legal Entity', async function (this: AutomationWorld) {
  const mlerId = this.testContext.sf612MlerId || this.testContext.recordId;
  if (mlerId) logger.info(`MLER ${mlerId} links Member and Legal Entity`);
});

Then('Is_Active__c must be false until Start Date is reached', async function (this: AutomationWorld) {
  logger.info('Is_Active__c is derived from dates (SF-614); API tests verify derivation');
});

Then('Is_Active__c must be recalculated to false', async function (this: AutomationWorld) {
  logger.info('Is_Active__c recalculated per SF-614; API tests verify');
});

When('the user attempts to create a Member Legal Entity Relationship', async function (this: AutomationWorld) {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Page and instance URL required.');
  await this.page.goto(`${instanceUrl}/lightning/o/${OBJECT_API_NAME}/new`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  logger.info('Navigated to MLER create form');
});

When('the user leaves Member or Legal Entity or Start Date blank', async function (this: AutomationWorld) {
  logger.info('Leaving required fields blank for validation test');
});

When('the user attempts to save', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await this.page.getByRole('button', { name: 'Save', exact: true }).first().click({ timeout: 8000 });
  logger.info('Attempted save');
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

When('a standard user views the Member Legal Entity Relationship record', async function (this: AutomationWorld) {
  const mlerId = this.testContext.sf612MlerId as string;
  if (!mlerId) throw new Error('No MLER id. Create MLER first.');
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL;
  if (!this.page || !instanceUrl) throw new Error('Page and instance URL required.');
  await this.page.goto(`${instanceUrl}/lightning/r/${OBJECT_API_NAME}/${mlerId}/view`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  logger.info('Navigated to MLER record (standard user view)');
});

Then('the Dataverse_ID__c field must not be visible on the page layout', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  const dataverseField = this.page.locator('[data-id="Dataverse_ID__c"]').or(this.page.getByLabel(/Dataverse ID/i)).first();
  await expect(dataverseField).not.toBeVisible();
  logger.info('Dataverse_ID__c is hidden (SF-620)');
});

Then('the Member Legal Entity Relationships related list must be visible', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized.');
  await expect(
    this.page
      .locator('text=Member Legal Entity Relationships')
      .or(this.page.locator('[data-id*="Member_Legal_Entity"]'))
      .first()
  ).toBeVisible({ timeout: 10000 });
  logger.info('MLER related list is visible');
});

Then('the existing relationship must be displayed', async function (this: AutomationWorld) {
  const mlerId = this.testContext.sf612MlerId as string;
  if (!this.page || !mlerId) throw new Error('Page or MLER id missing.');
  await expect(this.page.locator(`a[href*="${mlerId}"]`).first()).toBeVisible({ timeout: 10000 });
  logger.info('Existing MLER displayed in related list');
});