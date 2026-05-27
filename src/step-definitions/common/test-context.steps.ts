/**
 * Test Context Step Definitions
 * 
 * Steps for setting test context (object type, etc.)
 */

import { Given } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';

/**
 * Set the test context object type
 * 
 * Examples:
 *   And the test context object type is "Account"
 *   And the test context object type is "Lead"
 */
Given(
  /^the test context object type is "([^"]+)"$/,
  async function (this: AutomationWorld, objectType: string) {
    this.testContext.objectType = objectType;
    logger.info(`Test context object type set to: ${objectType}`);
  }
);

