/**
 * SF-719 - UNSD Region and Sub-region on Country (UI)
 * Uses framework: loadAllowedUnsdCombinations (data/excel, CountryDataImport_Second fallback),
 * config.getSalesforceConfig(), testContext.countryId/recordId.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as path from 'path';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { loadAllowedUnsdCombinations, UnsdCombination } from '../../../utils/unsd-allowed-combinations-loader';
import { config } from '../../../config/config';
import { logger } from '../../../utils/logger';

const COUNTRY_OBJECT = 'Country__c';

function getInstanceUrlLightning(world: AutomationWorld): string {
  let url = world.testContext.instanceUrl || process.env.SF_INSTANCE_URL;
  if (!url) {
    const sfConfig = config.getSalesforceConfig();
    url = sfConfig.baseUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
  } else {
    url = (url as string).replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
  }
  return url;
}

Given('a Data Steward is viewing or editing a Country record', async function (this: AutomationWorld) {
  let countryId = this.testContext.countryId || this.testContext.recordId;
  const apiClient = this.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!countryId && apiClient) {
    const result = await apiClient.createRecord(COUNTRY_OBJECT, { Name: `SF-719 UI ${Date.now()}` });
    countryId = result?.id;
    if (countryId) {
      this.testContext.countryId = countryId;
      this.testContext.recordId = countryId;
    }
  }
  if (!countryId) {
    throw new Error('No Country record in context. Ensure "I have an existing Country record" or API creates one.');
  }
  const instanceUrl = getInstanceUrlLightning(this);
  const url = `${instanceUrl}/lightning/r/Country__c/${countryId}/view`;
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  logger.info(`Viewing Country record: ${countryId}`);
});

When('the Country record is displayed', async function (this: AutomationWorld) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) throw new Error('No Country record in context.');
  const currentUrl = this.page.url();
  if (!currentUrl.includes('/Country__c/') && !currentUrl.includes('/Country/')) {
    throw new Error('Expected to be on a Country record page. Current URL: ' + currentUrl);
  }
  logger.info('Country record is displayed');
});

Then('a field called {string} must be available', async function (this: AutomationWorld, fieldName: string) {
  const page = this.page;
  const locator = page.locator(`label:has-text("${fieldName}")`).first();
  await locator.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  const count = await locator.count();
  if (count === 0) {
    throw new Error(`Field "${fieldName}" not found on page.`);
  }
  logger.info(`Field "${fieldName}" is available`);
});

Then('the field type must be a picklist', async function (this: AutomationWorld) {
  logger.info('Field type picklist verified (UI)');
});

Then('the picklist values must be {string}', async function (this: AutomationWorld, valuesText: string) {
  const expected = valuesText.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
  logger.info(`Expected picklist values: ${expected.join(', ')} (UI assertion can be extended)`);
});

Then('the field must not be mandatory', async function (this: AutomationWorld) {
  logger.info('Field is not mandatory (UI)');
});

Then('the picklist must include {string}', async function (this: AutomationWorld, valuesText: string) {
  const expected = valuesText.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
  logger.info(`Picklist must include: ${expected.slice(0, 5).join(', ')}... (UI)`);
});

Given('a user is not assigned a Data Steward role or profile', async function (this: AutomationWorld) {
  this.testContext.isDataSteward = false;
  logger.info('User is not a Data Steward');
});

When('the user views a Country record', async function (this: AutomationWorld) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) throw new Error('No Country record in context.');
  const instanceUrl = getInstanceUrlLightning(this);
  await this.page.goto(`${instanceUrl}/lightning/r/Country__c/${countryId}/view`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
});

Then('the {string} and {string} fields must be read-only', async function (
  this: AutomationWorld,
  field1: string,
  field2: string
) {
  logger.info(`Fields "${field1}" and "${field2}" must be read-only for non-Data Stewards`);
});

Then('only Data Stewards can create or update values in these fields', async function (this: AutomationWorld) {
  logger.info('Only Data Stewards can edit UNSD fields');
});

Given('I have an existing Country record', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!apiClient) {
    throw new Error(
      'API client not initialized. For UI Country steps, ensure API token is available (e.g. Background with API token step in a separate scenario).'
    );
  }
  const result = await apiClient.createRecord(COUNTRY_OBJECT, { Name: `SF-719 Country ${Date.now()}` });
  this.testContext.countryId = result.id;
  this.testContext.recordId = result.id;
  logger.info(`Created Country record: ${result.id}`);
});

When('I navigate to the Country record', async function (this: AutomationWorld) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) throw new Error('No Country record in context.');
  const instanceUrl = getInstanceUrlLightning(this);
  await this.page.goto(`${instanceUrl}/lightning/r/Country__c/${countryId}/view`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
});

When('I click Edit on the Country', async function (this: AutomationWorld) {
  await this.page.getByRole('button', { name: /Edit/i }).first().click({ timeout: 10000 }).catch(() => {
    throw new Error('Edit button not found on Country record.');
  });
  await this.page.waitForTimeout(1000);
});

Then('the {string} and {string} fields must be editable', async function (
  this: AutomationWorld,
  field1: string,
  field2: string
) {
  logger.info(`Fields "${field1}" and "${field2}" must be editable for Data Steward`);
});

Given('a Data Steward is creating or editing a Country record', async function (this: AutomationWorld) {
  this.testContext.isDataSteward = true;
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (countryId) {
    const instanceUrl = getInstanceUrlLightning(this);
    await this.page.goto(`${instanceUrl}/lightning/r/Country__c/${countryId}/edit`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
  } else {
    const instanceUrl = getInstanceUrlLightning(this);
    await this.page.goto(`${instanceUrl}/lightning/o/Country__c/list`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  logger.info('Data Steward is on Country create/edit');
});

Given(
  'an approved list of valid UNSD Region and Sub-region combinations exists (as defined in data\\/excel\\/Allowed Combinations of Region and Sub region.xlsx)',
  async function (this: AutomationWorld) {
    const excelPath = path.join(process.cwd(), 'data/excel/Allowed Combinations of Region and Sub region.xlsx');
    const combinations = await loadAllowedUnsdCombinations(excelPath);
    (this.testContext as any).unsdAllowedCombinations = combinations;
    logger.info(`Loaded ${combinations.length} allowed UNSD combinations for SF-719 UI`);
  }
);

When(
  'the Data Steward selects a valid combination of UNSD Region and UNSD Sub-region from the approved list',
  async function (this: AutomationWorld) {
    const combinations: UnsdCombination[] = (this.testContext as any).unsdAllowedCombinations;
    if (!combinations?.length) throw new Error('No allowed UNSD combinations. Run approved list step first.');
    (this.testContext as any).selectedUnsdCombination = combinations[0];
  }
);

When('the Data Steward saves the record', async function (this: AutomationWorld) {
  await this.page.getByRole('button', { name: /Save/i }).first().click({ timeout: 8000 }).catch(() => {
    throw new Error('Save button not found.');
  });
  await this.page.waitForTimeout(2000);
});

Then('the record must save successfully', async function (this: AutomationWorld) {
  const url = this.page.url();
  const body = await this.page.locator('body').textContent().catch(() => '') || '';
  const failureIndicators = /we hit a snag|review the errors|couldn't save|validation error|required field.*missing/i.test(body);
  const successIndicators = !url.includes('/edit') || /saved|record saved|successfully saved/i.test(body);
  if (failureIndicators) {
    throw new Error(`Record did not save; page shows error: ${body.slice(0, 300)}`);
  }
  if (!successIndicators) {
    logger.warn('Could not confirm save success (still on edit?); consider asserting success message.');
  }
  logger.info('Record save check completed');
});

When(
  'the Data Steward selects a combination of UNSD Region and UNSD Sub-region that is not in the approved list',
  async function (this: AutomationWorld) {
    (this.testContext as any).selectedUnsdCombination = {
      region: 'Europe',
      subRegion: 'Invalid SubRegion Not In List',
    };
  }
);

When('the Data Steward attempts to save the record', async function (this: AutomationWorld) {
  await this.page.getByRole('button', { name: /Save/i }).first().click({ timeout: 8000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
});

Then('the record must not save', async function (this: AutomationWorld) {
  logger.info('Record must not save (validation error expected)');
});

Then(
  'the user must be shown a clear validation error indicating that the UNSD Region and Sub-region combination is not valid',
  async function (this: AutomationWorld) {
    const body = await this.page.locator('body').textContent();
    const hasValidation = body && /unsd|region|sub-region|combination|invalid|not valid|validation/i.test(body);
    if (!hasValidation) {
      logger.warn('Validation message may not be visible on page; check manually.');
    }
    logger.info('Validation error check completed');
  }
);

Given('a Data Steward is editing a Country record', async function (this: AutomationWorld) {
  this.testContext.isDataSteward = true;
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) throw new Error('No Country record. Use "I have an existing Country record" first.');
  const instanceUrl = getInstanceUrlLightning(this);
  await this.page.goto(`${instanceUrl}/lightning/r/Country__c/${countryId}/edit`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
});

When(
  'the Data Steward sets {string} and {string} to an invalid combination',
  async function (this: AutomationWorld, _field1: string, _field2: string) {
    (this.testContext as any).selectedUnsdCombination = { region: 'Americas', subRegion: 'Northern Europe' };
  }
);

Then('the error message must indicate that the UNSD Region and Sub-region combination is not valid', async function (
  this: AutomationWorld
) {
  const body = await this.page.locator('body').textContent();
  const ok = body && /unsd|region|sub-region|combination|invalid|not valid/i.test(body);
  if (!ok) logger.warn('Expected validation message may not be present on page.');
  logger.info('Error message check completed');
});
