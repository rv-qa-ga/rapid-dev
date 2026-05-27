/**
 * Account Step Definitions
 * Generic account-related steps for UI tests
 * 
 * Uses Page Object Model pattern
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { AccountPage } from '../../../page-objects/salesforce/AccountPage';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';

/**
 * Helper to get AccountPage instance
 */
function getAccountPage(world: AutomationWorld): AccountPage {
  if (!world.page || world.page.isClosed()) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }
  return new AccountPage(world.page);
}

Given('I am on the Accounts page', async function (this: AutomationWorld) {
  const accountPage = getAccountPage(this);
  await accountPage.navigateToListView();
});

When('I create a new account with name {string}', async function (this: AutomationWorld, accountName: string) {
  const accountPage = getAccountPage(this);
  await accountPage.createAccount({ name: accountName });
  this.testContext.accountName = accountName;
});

When('I create a new account with name {string} marked as active', async function (this: AutomationWorld, accountName: string) {
  const accountPage = getAccountPage(this);
  await accountPage.createAccount({ name: accountName, status: 'Active' });
  this.testContext.accountName = accountName;
});

When('I create a new Member account with name {string} marked as active and billing address', async function (this: AutomationWorld, accountName: string) {
  const accountPage = getAccountPage(this);
  await accountPage.createAccount({
    name: accountName,
    type: 'Member',
    status: 'Active',
    addressDrivesRegion: true,
    billingAddress: {
      street: '350 5th Avenue',
      city: 'New York',
      state: 'New York',
      postalCode: '10118',
      country: 'United States',
    },
  });
  this.testContext.accountName = accountName;
});

When('I create a new Member account with name {string} marked as {string} and fill all mandatory fields', async function (
  this: AutomationWorld,
  accountName: string,
  status: string
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const uniqueName = `${accountName} ${timestamp}`;
  const accountPage = getAccountPage(this);
  await accountPage.createMemberWithMandatoryFieldsOnly(uniqueName, status);
  this.testContext.accountName = uniqueName;
});

When('I create a new Member account with name {string} marked as {string} via API', async function (
  this: AutomationWorld,
  accountName: string,
  status: string
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const uniqueName = `${accountName} ${timestamp}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let partyCode = '';
  for (let i = 0; i < 4; i++) {
    partyCode += chars[Math.floor(Math.random() * chars.length)];
  }
  await testDataFactory.initialize();
  const account = await testDataFactory.createAccount(
    {
      Name: uniqueName,
      Type: 'Member',
      Account_Status__c: status,
      Party_Code__c: partyCode,
      Affiliate_Non_Affiliate__c: 'AFL',
      Ownership: 'Mission',
    },
    { checkExists: false, deleteIfExists: false }
  );
  this.testContext.accountId = account.id;
  this.testContext.accountName = uniqueName;
  this.testContext.accountCreatedViaAPI = true;
  logger.info(`Created Member account via API: ${account.id} (${uniqueName}), Party Code: ${partyCode}`);
});

When('I ensure the Member is related to a Legal Entity', async function (this: AutomationWorld) {
  const memberAccountId = this.testContext.accountId as string;
  if (!memberAccountId) {
    throw new Error('No Member account ID in context. Create a Member account via API first.');
  }
  await testDataFactory.initialize();
  const legalEntityName = `E2E Legal Entity ${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
  const legalEntity = await testDataFactory.createAccount(
    {
      Name: legalEntityName,
      Type: 'Legal Entity',
      Account_Status__c: 'Active',
    },
    { checkExists: false, deleteIfExists: false }
  );
  let apiClient = this.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!apiClient) {
    apiClient = new SalesforceAPIClient(this.apiContext!);
    await apiClient.authenticate();
    this.testContext.apiClient = apiClient;
  }
  const relPayload: Record<string, string> = {
    Member__c: memberAccountId,
    Legal_Entity__c: legalEntity.id,
    Start_Date__c: new Date().toISOString().slice(0, 10), // Required; format YYYY-MM-DD
  };
  await apiClient.createRecord('Member_Legal_Entity_Relationship__c', relPayload);
  logger.info(`Linked Member ${memberAccountId} to Legal Entity ${legalEntity.id} (${legalEntityName}), Start Date set`);
});

When('I create a new Member account with name {string} marked as {string} and billing address', async function (
  this: AutomationWorld,
  accountName: string,
  status: string
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const uniqueName = `${accountName} ${timestamp}`;
  const accountPage = getAccountPage(this);
  await accountPage.createAccount({
    name: uniqueName,
    type: 'Member',
    status,
    addressDrivesRegion: true,
    billingAddress: {
      street: '350 5th Avenue',
      city: 'New York',
      state: 'New York',
      postalCode: '10118',
      country: 'United States',
    },
  });
  this.testContext.accountName = uniqueName;
});

When('I click the New button', async function (this: AutomationWorld) {
  const accountPage = getAccountPage(this);
  await accountPage.clickNew();
});

When('I enter account name {string}', async function (this: AutomationWorld, accountName: string) {
  const accountPage = getAccountPage(this);
  await accountPage.setTextField('Account Name', accountName);
  this.testContext.accountName = accountName;
});

// Removed: 'I enter account name ""' - covered by 'I enter account name {string}'

When('I click the Save button', async function (this: AutomationWorld) {
  const accountPage = getAccountPage(this);
  await accountPage.save();
});

When('I set Account Status to {string}', async function (this: AutomationWorld, status: string) {
  const accountPage = getAccountPage(this);
  await accountPage.setAccountStatus(status);
});

When('I update the Account Status to {string} to trigger integration via the UI', async function (this: AutomationWorld, status: string) {
  const accountPage = getAccountPage(this);
  await accountPage.clickEdit();
  await accountPage.setAccountStatus(status);
  await accountPage.save();
  logger.info(`Updated Account Status to "${status}" to trigger integration (via UI)`);
});

When('I capture the current Account Id from the page', async function (this: AutomationWorld) {
  const url = this.page?.url() || '';
  const match = url.match(/\/Account\/([a-zA-Z0-9]{18})\//) || url.match(/\/Account\/([a-zA-Z0-9]{15})\//) || url.match(/\/r\/Account\/([a-zA-Z0-9]{15,18})/);
  if (match && match[1]) {
    this.testContext.accountId = match[1];
    logger.info(`Captured Account Id from page: ${match[1]}`);
    return;
  }
  if (this.testContext.accountId) {
    logger.info(`Using existing Account Id from context: ${this.testContext.accountId} (URL did not contain record id: ${url.slice(0, 80)}...)`);
    return;
  }
  throw new Error(`Could not capture Account Id from URL and none in context. Current URL: ${url}`);
});

// Move to common/ui-common.steps.ts for reuse - renamed to avoid conflict with API version
Then('the account should be created successfully via UI', async function (this: AutomationWorld) {
  const accountPage = getAccountPage(this);
  const isSuccess = await accountPage.isSuccessMessageVisible();

  if (!isSuccess) {
    // Check if we're on the account detail page (alternative success indicator)
    const accountName = await accountPage.getAccountName();
    if (!accountName || accountName.length === 0) {
      throw new Error('Account creation was not successful');
    }
  }
  logger.info('✅ Account created successfully');
});

Then('I should see the account name {string}', async function (this: AutomationWorld, expectedName: string) {
  const accountPage = getAccountPage(this);
  const actualName = await accountPage.getAccountName();

  if (!actualName.includes(expectedName)) {
    throw new Error(`Expected account name "${expectedName}" but got "${actualName}"`);
  }
  logger.info(`✅ Account name "${expectedName}" is displayed`);
});

Then('I should see an error message', async function (this: AutomationWorld) {
  const accountPage = getAccountPage(this);
  const hasError = await accountPage.hasValidationError();
  
  if (!hasError) {
    throw new Error('Error message not displayed');
  }
  logger.info('✅ Error message displayed');
});
