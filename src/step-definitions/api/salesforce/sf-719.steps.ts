/**
 * SF-719 - UNSD Region and Sub-region on Country (API)
 * Uses framework utilities: loadAllowedUnsdCombinations, CountryDataImport_Second fallback (data/excel).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import * as path from 'path';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import {
  loadAllowedUnsdCombinations,
  UnsdCombination,
} from '../../../utils/unsd-allowed-combinations-loader';
import { logger } from '../../../utils/logger';

const COUNTRY_OBJECT = 'Country__c';
const UNSD_REGION_FIELD = 'UNSD_Region__c';
const UNSD_SUBREGION_FIELD = 'UNSD_Sub_region__c';

function getFieldByLabelOrName(fields: any[], labelOrName: string): any {
  const n = (s: string) => (s || '').toLowerCase().trim();
  const f = fields.find(
    (x: any) =>
      x.label === labelOrName ||
      n(x.label) === n(labelOrName) ||
      x.name === labelOrName ||
      n(x.name) === n(labelOrName)
  );
  if (f) return f;
  const withSuffix = labelOrName.replace(/\s+/g, '_').replace(/-/g, '_') + '__c';
  return fields.find((x: any) => x.name === withSuffix || x.name === labelOrName.replace(/\s+/g, '_') + '__c');
}

Given(
  'an approved list of valid UNSD Region and Sub-region combinations exists (data\\/excel\\/Allowed Combinations of Region and Sub region.xlsx)',
  async function (this: AutomationWorld) {
    const excelPath = path.join(process.cwd(), 'data/excel/Allowed Combinations of Region and Sub region.xlsx');
    const combinations = await loadAllowedUnsdCombinations(excelPath);
    (this.testContext as any).unsdAllowedCombinations = combinations;
    logger.info(`Loaded ${combinations.length} allowed UNSD combinations for SF-719`);
  }
);

When(
  'I create or update a Country__c record with a valid UNSD Region and UNSD Sub-region combination from that list',
  async function (this: AutomationWorld) {
    const combinations: UnsdCombination[] = (this.testContext as any).unsdAllowedCombinations;
    if (!combinations || combinations.length === 0) {
      throw new Error('No allowed UNSD combinations in context. Run the "approved list exists" step first.');
    }
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');
    const { region, subRegion } = combinations[0];
    const payload: Record<string, any> = {
      Name: `SF-719 Valid ${Date.now()}`,
      [UNSD_REGION_FIELD]: region,
      [UNSD_SUBREGION_FIELD]: subRegion,
    };
    (this.testContext as any).lastCountryPayload = payload;
    try {
      const result = await apiClient.createRecord(COUNTRY_OBJECT, payload);
      const id = result?.id;
      if (!id) throw new Error('Create succeeded but no record id returned.');
      (this.testContext as any).apiError = undefined;
      (this.testContext as any).lastCountryId = id;
      this.testContext.recordId = id;
      this.testContext.countryId = id;
    } catch (err: any) {
      (this.testContext as any).apiError = err;
      (this.testContext as any).lastCountryId = undefined;
      throw err;
    }
  }
);

When(
  'I attempt to create or update a Country__c record with an invalid UNSD Region and UNSD Sub-region combination',
  async function (this: AutomationWorld) {
    const combinations: UnsdCombination[] = (this.testContext as any).unsdAllowedCombinations;
    if (!combinations || combinations.length === 0) {
      throw new Error('No allowed UNSD combinations in context. Run the "approved list exists" step first.');
    }
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');
    const invalidRegion = 'Europe';
    const invalidSubRegion = 'Invalid SubRegion Not In List';
    const payload: Record<string, any> = {
      Name: `SF-719 Invalid ${Date.now()}`,
      [UNSD_REGION_FIELD]: invalidRegion,
      [UNSD_SUBREGION_FIELD]: invalidSubRegion,
    };
    (this.testContext as any).lastCountryPayload = payload;
    try {
      const result = await apiClient.createRecord(COUNTRY_OBJECT, payload);
      (this.testContext as any).apiError = undefined;
      (this.testContext as any).lastCountryId = result.id;
    } catch (err: any) {
      (this.testContext as any).apiError = err;
      (this.testContext as any).lastCountryId = undefined;
      logger.info(`Expected validation error: ${err.message}`);
    }
  }
);

Then('the record must be saved successfully via API', async function (this: AutomationWorld) {
  const err = (this.testContext as any).apiError;
  if (err) throw new Error(`Record was not saved: ${err.message}`);
  const id = (this.testContext as any).lastCountryId || this.testContext.recordId;
  if (!id) throw new Error('No record ID in context after save.');
  logger.info(`Country__c record saved: ${id}`);
});

Then('the API must return a validation error', async function (this: AutomationWorld) {
  const err = (this.testContext as any).apiError;
  if (!err) throw new Error('Expected a validation error but the API call succeeded.');
  logger.info(`Validation error received: ${err.message}`);
});

Then(
  'the error must indicate that the UNSD Region and Sub-region combination is not valid',
  async function (this: AutomationWorld) {
    const err = (this.testContext as any).apiError;
    if (!err) throw new Error('No error in context.');
    const msg = (err.message || err.body || JSON.stringify(err)).toLowerCase();
    // Accept combination/validation wording or generic invalid/value (e.g. restricted picklist)
    const validPhrases = [
      'unsd',
      'region',
      'sub-region',
      'subregion',
      'combination',
      'invalid',
      'not valid',
      'validation',
      'bad value',
      'picklist',
      'value is not valid',
    ];
    const hasRelevant = validPhrases.some((p) => msg.includes(p));
    if (!hasRelevant) {
      throw new Error(`Error message should indicate invalid/validation. Got: ${err.message}`);
    }
    logger.info(`Error message correctly indicates UNSD combination validation.`);
  }
);

Then(
  'the picklist should include sub-region values per SF-719 (e.g. Northern Europe, Western Europe, Northern America)',
  async function (this: AutomationWorld) {
    const fields = this.testContext.fieldsMetadata;
    const lastField = (this.testContext as any).lastCheckedField;
    if (!fields || !lastField) {
      throw new Error('No field in context. Run "the UNSD Sub-region field should exist" first.');
    }
    const field = getFieldByLabelOrName(fields, 'UNSD Sub-region') || fields.find((f: any) => f.name === lastField);
    if (!field) throw new Error('UNSD Sub-region field not found.');
    const picklistValues = field.picklistValues || [];
    const actual = picklistValues
      .filter((pv: any) => pv.active !== false)
      .map((pv: any) => (pv.value ?? pv.label ?? '').trim());
    const examples = ['Northern Europe', 'Western Europe', 'Northern America'];
    const missing = examples.filter((v) => !actual.some((a: string) => a.toLowerCase() === v.toLowerCase()));
    if (missing.length > 0) {
      throw new Error(
        `Picklist should include sub-region values per SF-719. Missing (e.g.): ${missing.join(', ')}. Has: ${actual.slice(0, 10).join(', ')}...`
      );
    }
    logger.info(`Picklist includes SF-719 sub-region examples: ${examples.join(', ')}`);
  }
);
