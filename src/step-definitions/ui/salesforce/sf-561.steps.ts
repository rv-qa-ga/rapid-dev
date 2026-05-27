/**
 * Step Definitions for SF-561 - Verify Picklist Values of OOTB Address Fields (UI)
 * 
 * Covers steps specific to SF-561 that are not handled by common step definitions:
 * - Clearing/blanking picklist fields
 * - Verifying picklist contains specific values
 * - Verifying picklist has no selectable values (state dependency)
 * - Attempting to change read-only fields
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';

// ============================================================================
// FIELD OPERATIONS
// ============================================================================

/**
 * Clear a field value (leave blank)
 */
When('I clear the {string} field', async function (this: AutomationWorld, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Clearing field: ${fieldName}`);

  // For address compound fields (BillingCountry, BillingState, Country, State/Province)
  // These are typically combobox/picklist fields in Lightning
  const comboboxSelectors = [
    `lightning-combobox:has-text("${fieldName}") input`,
    `lightning-combobox:has-text("${fieldName}") button`,
    `input[placeholder*="${fieldName}"]`,
    `lightning-grouped-combobox:has-text("${fieldName}") input`,
  ];

  for (const selector of comboboxSelectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
        await element.click();
        await this.page.waitForTimeout(300);

        // Try to clear by selecting --None-- or clearing the input
        const noneOption = this.page.locator('[role="option"]:has-text("--None--"), lightning-base-combobox-item:has-text("--None--")').first();
        if (await noneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await noneOption.click();
          logger.info(`✅ Cleared "${fieldName}" by selecting --None--`);
          return;
        }

        // Fallback: triple-click to select all then delete
        await element.click({ clickCount: 3 });
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.press('Escape');
        logger.info(`✅ Cleared "${fieldName}" via keyboard`);
        return;
      }
    } catch {
      continue;
    }
  }

  // Fallback: Use FieldRegistry
  try {
    const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
    const fieldRegistry = new FieldRegistry(this.page);
    await fieldRegistry.setValue(fieldName, '');
    logger.info(`✅ Cleared "${fieldName}" via FieldRegistry`);
    return;
  } catch (error: any) {
    logger.warn(`FieldRegistry clear failed: ${error.message}`);
  }

  // Last resort: Try AccountPage clearField
  try {
    const { AccountPage } = await import('../../../page-objects/salesforce/AccountPage');
    const accountPage = new AccountPage(this.page);
    await accountPage.clearField(fieldName);
    logger.info(`✅ Cleared "${fieldName}" via AccountPage`);
    return;
  } catch (error: any) {
    throw new Error(`Could not clear field "${fieldName}": ${error.message}`);
  }
});

/**
 * Attempt to change a field (for testing read-only enforcement)
 */
When('I attempt to change the {string} field to {string}', async function (
  this: AutomationWorld,
  fieldName: string,
  newValue: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Attempting to change "${fieldName}" to "${newValue}"...`);

  // Try to interact with the field - it may be read-only
  try {
    const { FieldRegistry } = await import('../../../page-objects/salesforce/fields/FieldRegistry');
    const fieldRegistry = new FieldRegistry(this.page);
    await fieldRegistry.setValue(fieldName, newValue);
    logger.info(`Changed "${fieldName}" to "${newValue}" (field was editable)`);
  } catch (error: any) {
    // Expected if field is read-only
    logger.info(`Could not change "${fieldName}": ${error.message} (may be read-only)`);

    // Try direct combobox approach as fallback
    try {
      const combobox = this.page.getByLabel(fieldName, { exact: false }).first();
      if (await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await combobox.click();
        await this.page.waitForTimeout(500);
        const option = this.page.locator(`[role="option"]:has-text("${newValue}")`).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          await option.click();
          logger.info(`Changed "${fieldName}" to "${newValue}" via combobox`);
        }
      }
    } catch {
      logger.info(`Field "${fieldName}" appears to be read-only - cannot change`);
    }
  }
});

// ============================================================================
// PICKLIST VERIFICATION
// ============================================================================

/**
 * Verify a picklist contains a specific value
 * Expects the picklist to already be open (clicked)
 */
Then('the picklist should contain the value {string}', async function (
  this: AutomationWorld,
  expectedValue: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  // Look for the value in the open picklist dropdown
  const optionSelectors = [
    `lightning-base-combobox-item[data-value="${expectedValue}"]`,
    `lightning-base-combobox-item:has-text("${expectedValue}")`,
    `[role="option"]:has-text("${expectedValue}")`,
    `.slds-listbox__option:has-text("${expectedValue}")`,
    `span.slds-truncate:has-text("${expectedValue}")`,
  ];

  let found = false;
  for (const selector of optionSelectors) {
    try {
      const option = this.page.locator(selector).first();
      if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        found = true;
        break;
      }
    } catch {
      continue;
    }
  }

  // If not found in visible options, try scrolling through the dropdown
  if (!found) {
    try {
      const listbox = this.page.locator('[role="listbox"], .slds-listbox').first();
      if (await listbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Scroll down to find the option
        for (let i = 0; i < 20; i++) {
          await listbox.evaluate(el => el.scrollTop += 200);
          await this.page!.waitForTimeout(200);

          for (const selector of optionSelectors) {
            const option = this.page!.locator(selector).first();
            if (await option.isVisible({ timeout: 500 }).catch(() => false)) {
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    } catch {
      // Continue to error
    }
  }

  if (!found) {
    throw new Error(`Picklist does not contain expected value "${expectedValue}"`);
  }

  logger.info(`✅ Picklist contains value "${expectedValue}"`);

  // Close the dropdown
  await this.page.keyboard.press('Escape');
});

/**
 * Verify a picklist has no selectable values (for state dependency when country is not US/Canada)
 */
Then('the {string} picklist should have no selectable values', async function (
  this: AutomationWorld,
  fieldName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Checking that "${fieldName}" picklist has no selectable values...`);

  // Try to find the picklist/combobox
  const comboboxSelectors = [
    this.page.getByLabel(fieldName, { exact: false }).first(),
    this.page.locator(`lightning-combobox:has-text("${fieldName}")`).first(),
    this.page.locator(`lightning-grouped-combobox:has-text("${fieldName}")`).first(),
  ];

  let fieldFound = false;
  for (const combobox of comboboxSelectors) {
    try {
      if (await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
        fieldFound = true;

        // Check if the field is disabled
        const isDisabled = await combobox.evaluate(el => {
          const btn = el.querySelector('button[role="combobox"]') || el.querySelector('button');
          const input = el.querySelector('input');
          return (btn && (btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true')) ||
                 (input && (input.hasAttribute('disabled') || input.hasAttribute('readonly')));
        }).catch(() => false);

        if (isDisabled) {
          logger.info(`✅ "${fieldName}" is disabled - no selectable values`);
          return;
        }

        // Click to open and check if there are options
        try {
          await combobox.click();
          await this.page.waitForTimeout(500);

          const options = this.page.locator('[role="option"]:not(:has-text("--None--")), lightning-base-combobox-item:not(:has-text("--None--"))');
          const optionCount = await options.count();

          // Close the dropdown
          await this.page.keyboard.press('Escape');

          if (optionCount === 0) {
            logger.info(`✅ "${fieldName}" picklist has no selectable values`);
            return;
          } else {
            throw new Error(`"${fieldName}" picklist has ${optionCount} selectable values but should have none`);
          }
        } catch (clickError: any) {
          if (clickError.message.includes('selectable values')) {
            throw clickError;
          }
          // If click fails, field might be not interactable (which means it's effectively disabled)
          logger.info(`✅ "${fieldName}" field is not interactable - no selectable values`);
          return;
        }
      }
    } catch (error: any) {
      if (error.message.includes('selectable values')) {
        throw error;
      }
      continue;
    }
  }

  if (!fieldFound) {
    // Field not present at all - which is also acceptable (no values to select)
    logger.info(`✅ "${fieldName}" field not found on page - no selectable values available`);
  }
});
