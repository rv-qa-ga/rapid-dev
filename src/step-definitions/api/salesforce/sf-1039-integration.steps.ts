/**
 * SF-1039 — Integration build updates (Geography removal + PTY Code lookups + Master ID updates).
 *
 * Reuses CMDT query steps from sf-575 / sf-593-1081-integration.
 * E2E PTY Code / master-id steps live in mulesoft-integration.steps.ts.
 */
import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';

type DvRow = {
  Dataverse_Field__c?: string;
  [k: string]: unknown;
};

Then('the Custom Metadata query should return no records', async function (this: AutomationWorld) {
  const records = this.testContext.customMetadataRecords as DvRow[] | undefined;
  const count = records?.length ?? 0;
  expect(count, `SF-1039: Expected 0 Custom Metadata rows, got ${count}.`).toBe(0);
  logger.info('SF-1039: Custom Metadata query returned no records (as expected).');
});
