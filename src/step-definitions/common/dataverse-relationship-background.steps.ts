/**
 * Shared JIRA background wording for Dataverse + relationship platform events (SF-612, SF-788, …).
 */

import { Given } from '@cucumber/cucumber';
import { logger } from '../../utils/logger';

Given(
  'relationship eligibility requires all related Accounts to have Dataverse_Id__c populated',
  async function () {
    logger.info('✅ Background: Eligibility requires related Accounts to have Dataverse_ID__c populated');
  }
);

Given(
  'Salesforce does not publish Platform Events for ineligible relationship records',
  async function () {
    logger.info('✅ Background: No platform events for ineligible relationship records');
  }
);
