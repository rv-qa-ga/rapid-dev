/**
 * SF-977 — Product Maps lifecycle: minimal UI smoke (Accelerant Console → Product Maps → New).
 * QA Actuary persona: Name + Product__c only ("test" until catalog expands). SubProduct is not asserted here
 * (may be hidden for Actuary while visible for Admin/MRD — follow up with Dev separately).
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { HomePage } from '../../../page-objects/salesforce/HomePage';
import {
  ProductMapAccelerantPage,
  sf977ExpansionDraftStatusFromEnv,
  uiAllowedProductFromEnv,
} from '../../../page-objects/salesforce/ProductMapAccelerantPage';
import { logger } from '../../../utils/logger';

When(
  'the Actuary opens Product Maps from Accelerant Console and starts a new Product Map for SF-977',
  async function (this: AutomationWorld) {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Browser page not initialized. Log in with a UI-capable user first.');
    }
    const home = new HomePage(this.page);
    const pm = new ProductMapAccelerantPage(this.page);
    await pm.navigateToProductMapsListViaAccelerantConsole(home);
    await pm.clickNewButton();
    this.testContext.sf977UiNewFormOpened = true;
    logger.info('SF-977 UI: opened New Product Map from Accelerant Console');
  }
);

Then('the New Product Map form should be visible for SF-977', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized.');
  }
  const pm = new ProductMapAccelerantPage(this.page);
  await pm.expectNewProductMapFormVisible();
});

When('the Actuary completes mandatory Product Map fields with QA-allowed Product', async function (this: AutomationWorld) {
  if (!this.page || this.page.isClosed()) {
    throw new Error('Browser page not initialized.');
  }
  const pm = new ProductMapAccelerantPage(this.page);
  await pm.fillNewProductMapMandatoryFieldsForQa();
  logger.info(`SF-977 UI: filled Name + Product (${uiAllowedProductFromEnv()})`);
});

Then(
  'the SF-977 new Product Map form should show the QA-allowed Product in the Product field',
  async function (this: AutomationWorld) {
    if (!this.page) {
      throw new Error('Page not initialized.');
    }
    const pm = new ProductMapAccelerantPage(this.page);
    await pm.expectProductFieldShowsQaValue(uiAllowedProductFromEnv());
  }
);

When(
  'the Actuary completes mandatory Product Map fields and links the SF-977 Expansion Opportunity for UI',
  async function (this: AutomationWorld) {
    if (!this.page || this.page.isClosed()) {
      throw new Error('Browser page not initialized.');
    }
    const oppName = this.testContext.sf977OpportunityName as string | undefined;
    if (!oppName?.trim()) {
      throw new Error(
        'No sf977OpportunityName. Run API seed steps first: Active Account + Expansion Opportunity for SF-977.'
      );
    }
    const pm = new ProductMapAccelerantPage(this.page);
    await pm.fillNewProductMapMandatoryFieldsWithExpansionOpportunity(oppName.trim());
    logger.info(`SF-977 UI: filled Name, Product, Opportunity "${oppName}"`);
  }
);

When('the Actuary saves the new SF-977 Product Map from the modal', async function (this: AutomationWorld) {
  if (!this.page || this.page.isClosed()) {
    throw new Error('Browser page not initialized.');
  }
  const pm = new ProductMapAccelerantPage(this.page);
  await pm.saveNewProductMapModal();
});

Then(
  'the SF-977 Product Map record should show Status Draft - Product Expansion',
  async function (this: AutomationWorld) {
    if (!this.page) {
      throw new Error('Page not initialized.');
    }
    const pm = new ProductMapAccelerantPage(this.page);
    await pm.expectProductMapRecordPageShowsStatus(sf977ExpansionDraftStatusFromEnv());
  }
);
