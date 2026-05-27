/**
 * Step Definitions for SF-546 - Remove other record type layouts (UI)
 * 
 * Tests verify that record type selection page is no longer displayed
 * when creating new Account records.
 */
/// <reference lib="dom" />

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { FieldRegistry } from '../../../page-objects/salesforce/fields/FieldRegistry';
import { config } from '../../../config/config';

/**
 * Helper to get FieldRegistry instance
 */
function getFieldRegistry(world: AutomationWorld): FieldRegistry {
  if (!world.page || world.page.isClosed()) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }
  return new FieldRegistry(world.page);
}

// ============================================================================
// RECORD TYPE SELECTION PAGE VERIFICATION
// ============================================================================

/**
 * Verify that the record type selection page is NOT displayed
 * 
 * The record type selection page typically shows radio buttons for:
 * - Agency
 * - Insurer
 * - Member
 * - Other
 * - Reinsurer
 * - TPA
 * 
 * After SF-546, users should be taken directly to the Account creation form
 * without seeing this selection page.
 */
Then('the record type selection page should not be displayed', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for page to stabilize
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);

  // Check for record type selection page indicators
  // The record type selection page typically has:
  // 1. Radio buttons for record types
  // 2. Text like "New Account" with record type descriptions
  // 3. A form with radio button options
  
  const recordTypeSelectors = [
    // Radio buttons for record types
    'input[type="radio"][value*="Agency"]',
    'input[type="radio"][value*="Insurer"]',
    'input[type="radio"][value*="Member"]',
    'input[type="radio"][value*="Other"]',
    'input[type="radio"][value*="Reinsurer"]',
    'input[type="radio"][value*="TPA"]',
    // Text indicating record type selection
    'text="For insurance agencies and their branches"',
    'text="For insurance companies and their branches"',
    'text="For insurance program members, captives, and groups"',
    'text="Third-Party Administrators"',
    // Lightning components that might show record type selection
    'lightning-radio-group',
    // Form with record type selection
    'form:has(input[type="radio"])',
  ];

  let foundRecordTypePage = false;
  for (const selector of recordTypeSelectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundRecordTypePage = true;
        logger.warn(`Found record type selection element: ${selector}`);
        break;
      }
    } catch {
      // Continue checking other selectors
    }
  }

  // Take evidence screenshot
  try {
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    logger.info('📸 Evidence screenshot captured: record type selection page check');
  } catch (screenshotError: any) {
    logger.warn(`Could not capture evidence screenshot: ${screenshotError.message}`);
  }

  if (foundRecordTypePage) {
    throw new Error('Record type selection page is displayed but should NOT be displayed. Users should be taken directly to Account creation form.');
  }

  logger.info('✅ Verified record type selection page is NOT displayed (as expected)');
});

/**
 * Verify that user is taken directly to the Account creation form
 */
Then('I should be taken directly to the Account creation form', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for page to stabilize
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);

  // Check for Account creation form indicators
  const formSelectors = [
    'lightning-record-edit-form',
    'lightning-record-form',
    'form[data-aura-class*="RecordEditForm"]',
  ];

  let formFound = false;
  for (const selector of formSelectors) {
    try {
      const form = this.page.locator(selector).first();
      if (await form.isVisible({ timeout: 5000 }).catch(() => false)) {
        formFound = true;
        logger.info(`✅ Found Account creation form: ${selector}`);
        break;
      }
    } catch {
      // Continue checking other selectors
    }
  }

  // Also check for Account Name field (should be present in creation form)
  const accountNameField = this.page.getByLabel('Account Name', { exact: false }).first();
  const nameFieldVisible = await accountNameField.isVisible({ timeout: 3000 }).catch(() => false);

  if (!formFound && !nameFieldVisible) {
    throw new Error('Account creation form is not visible. User may not have been taken directly to the form.');
  }

  logger.info('✅ Verified user is taken directly to Account creation form');
});

/**
 * Verify that a specific record type radio button is NOT visible
 * 
 * Examples:
 *   Then the "Agency" record type radio button should not be visible
 *   Then the "Member" record type radio button should not be visible
 */
Then('the {string} record type radio button should not be visible', async function (
  this: AutomationWorld,
  recordType: string
) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for page to stabilize
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);

  // Look for radio button with this record type
  // Could be by value, label, or associated text
  const radioSelectors = [
    `input[type="radio"][value*="${recordType}"]`,
    `input[type="radio"]:near(:text("${recordType}"))`,
    `radio-group:has-text("${recordType}")`,
    `lightning-radio-group:has-text("${recordType}")`,
  ];

  let found = false;
  for (const selector of radioSelectors) {
    try {
      const radio = this.page.locator(selector).first();
      if (await radio.isVisible({ timeout: 2000 }).catch(() => false)) {
        found = true;
        logger.warn(`Found ${recordType} record type radio button: ${selector}`);
        break;
      }
    } catch {
      // Continue checking other selectors
    }
  }

  // Also check for text associated with this record type
  const recordTypeDescriptions: Record<string, string[]> = {
    'Agency': ['For insurance agencies and their branches'],
    'Insurer': ['For insurance companies and their branches'],
    'Member': ['For insurance program members, captives, and groups'],
    'Other': ['For account types without subtypes', 'Acquisition Company', 'Distribution Partner', 'Placing Broker', 'Reinsurance Broker', 'Service Company'],
    'Reinsurer': ['For reinsurance companies and their branches'],
    'TPA': ['Third-Party Administrators'],
  };

  const descriptions = recordTypeDescriptions[recordType] || [];
  for (const description of descriptions) {
    try {
      const textElement = this.page.getByText(description, { exact: false }).first();
      if (await textElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        found = true;
        logger.warn(`Found ${recordType} record type description: "${description}"`);
        break;
      }
    } catch {
      // Continue checking
    }
  }

  if (found) {
    throw new Error(`"${recordType}" record type radio button is visible but should NOT be visible. Record type selection page should not be displayed.`);
  }

  logger.info(`✅ Verified "${recordType}" record type radio button is NOT visible (as expected)`);
});

/**
 * Verify that the Account creation form is visible
 */
Then('the Account creation form should be visible', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for page to stabilize
  await this.page.waitForLoadState('domcontentloaded');
  
  logger.info('Checking for Account creation form (using multiple detection methods)...');

  // Method 1: Check for form elements (primary method)
  const formSelectors = [
    'lightning-record-edit-form',
    'lightning-record-form',
    'form[data-aura-class*="RecordEditForm"]',
    '[data-aura-class*="forceRecordEdit"]',
  ];

  let formFound = false;
  for (const selector of formSelectors) {
    try {
      const form = this.page.locator(selector).first();
      if (await form.isVisible({ timeout: 5000 }).catch(() => false)) {
        formFound = true;
        logger.info(`✅ Account creation form is visible: ${selector}`);
        break;
      }
    } catch {
      // Continue checking other selectors
    }
  }

  // Method 2: If form not found, check for Account Name field (form is ready when field appears)
  if (!formFound) {
    logger.info('Form element not found, checking for Account Name field as alternative indicator...');
    const accountNameSelectors = [
      'label:has-text("Account Name")',
      'label:has-text("Name")',
      'input[aria-label*="Account Name"]',
      'input[aria-label*="Name"]',
      'input[name="Name"]',
      'lightning-input[label*="Account Name"]',
      'lightning-input[label*="Name"]',
    ];
    
    for (const selector of accountNameSelectors) {
      try {
        const field = this.page.locator(selector).first();
        if (await field.isVisible({ timeout: 5000 }).catch(() => false)) {
          formFound = true;
          logger.info(`✅ Form detected via Account Name field: ${selector}`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  // Method 3: Check for modal/dialog container (form might be in a modal)
  if (!formFound) {
    logger.info('Checking for modal/dialog container...');
    const modalSelectors = [
      'lightning-modal',
      '.slds-modal',
      '[role="dialog"]',
      'section[role="dialog"]',
    ];
    
    for (const selector of modalSelectors) {
      try {
        const modal = this.page.locator(selector).first();
        if (await modal.isVisible({ timeout: 3000 }).catch(() => false)) {
          // Check if modal contains form or Account Name field
          const formInModal = modal.locator('lightning-record-edit-form, lightning-record-form').first();
          const nameInModal = modal.locator('label:has-text("Account Name"), input[aria-label*="Account Name"]').first();
          
          if (await formInModal.isVisible({ timeout: 2000 }).catch(() => false) ||
              await nameInModal.isVisible({ timeout: 2000 }).catch(() => false)) {
            formFound = true;
            logger.info(`✅ Form detected in modal: ${selector}`);
            break;
          }
        }
      } catch {
        // Continue to next selector
      }
    }
  }

  // Method 4: Final wait and check (form appears in 2-3 seconds per user feedback)
  if (!formFound) {
    logger.info('Waiting additional 3 seconds for form to appear...');
    await this.page.waitForTimeout(3000);
    
    // Final check for Account Name field
    const finalCheck = this.page.locator('label:has-text("Account Name"), input[aria-label*="Account Name"]').first();
    if (await finalCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
      formFound = true;
      logger.info('✅ Form detected in final check');
    }
  }

  // Take evidence screenshot
  try {
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    logger.info('📸 Evidence screenshot captured: Account creation form visibility check');
  } catch (screenshotError: any) {
    logger.warn(`Could not capture evidence screenshot: ${screenshotError.message}`);
  }

  if (!formFound) {
    throw new Error('Account creation form is not visible. Tried multiple detection methods: form elements, Account Name field, and modal containers. Check screenshot for details.');
  }

  logger.info('✅ Verified Account creation form is visible');
});

/**
 * Verify that the form contains a specific field
 * 
 * Examples:
 *   Then the form should contain the "Account Name" field
 *   Then the form should contain the "Region" field
 */
Then('the form should contain the {string} field', async function (
  this: AutomationWorld,
  fieldName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for form to be ready
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);

  const fieldRegistry = getFieldRegistry(this);
  
  // Check if field is visible in the form
  const isVisible = await fieldRegistry.isFieldVisible(fieldName);

  // Take evidence screenshot
  try {
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    logger.info(`📸 Evidence screenshot captured: ${fieldName} field visibility check`);
  } catch (screenshotError: any) {
    logger.warn(`Could not capture evidence screenshot: ${screenshotError.message}`);
  }

  if (!isVisible) {
    throw new Error(`Field "${fieldName}" is not visible in the Account creation form. Expected to see this field.`);
  }

  logger.info(`✅ Verified form contains the "${fieldName}" field`);
});

// ============================================================================
// OBJECT MANAGER NAVIGATION
// ============================================================================

/**
 * Navigate to Object Manager for a specific object
 * 
 * Examples:
 *   When I navigate to Object Manager for Account
 *   When I navigate to Object Manager for Contact
 */
When('I navigate to Object Manager for {word}', async function (
  this: AutomationWorld,
  objectName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Get instance URL - convert to setup domain
  const sfConfig = config.getSalesforceConfig();
  let instanceUrl = sfConfig.baseUrl.replace(/\/$/, '');
  
  // Convert to setup domain: arx--qa.sandbox.my.salesforce.com -> arx--qa.sandbox.my.salesforce-setup.com
  instanceUrl = instanceUrl.replace('.my.salesforce.com', '.my.salesforce-setup.com');
  
  const objectApiName = objectName.replace(/\s+/g, '');
  const setupUrl = `${instanceUrl}/lightning/setup/ObjectManager/${objectApiName}/home`;
  
  logger.info(`Navigating to Object Manager for ${objectName}: ${setupUrl}`);
  
  await this.page.goto(setupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000); // Wait for page to fully load
  
  logger.info(`✅ Navigated to Object Manager for ${objectName}`);
});

/**
 * Navigate to Record Types section in Object Manager
 * 
 * Examples:
 *   When I navigate to Record Types section
 */
When('I navigate to Record Types section', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Get current URL to determine the object
  const currentUrl = this.page.url();
  const objectMatch = currentUrl.match(/ObjectManager\/(\w+)\//);
  if (!objectMatch) {
    throw new Error('Cannot determine object from current URL. Navigate to Object Manager first.');
  }
  
  const objectApiName = objectMatch[1];
  
  // Get instance URL - convert to setup domain
  const sfConfig = config.getSalesforceConfig();
  let instanceUrl = sfConfig.baseUrl.replace(/\/$/, '');
  instanceUrl = instanceUrl.replace('.my.salesforce.com', '.my.salesforce-setup.com');
  
  const recordTypesUrl = `${instanceUrl}/lightning/setup/ObjectManager/${objectApiName}/RecordTypes/view`;
  
  logger.info(`Navigating to Record Types section: ${recordTypesUrl}`);
  
  await this.page.goto(recordTypesUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000); // Wait for page to fully load
  
  logger.info(`✅ Navigated to Record Types section`);
});

/**
 * Verify that Record Types list shows a specific item count
 * 
 * Examples:
 *   Then the Record Types list should show "0 Items"
 *   Then the Record Types list should show "6 Items"
 */
Then('the Record Types list should show {string}', async function (
  this: AutomationWorld,
  expectedText: string
) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for page to stabilize
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);

  // Look for the items count text - could be in various formats
  // "0 Items, Sorted by Record Type Label" or "6 Items, Sorted by Record Type Label"
  const itemCountSelectors = [
    `text="${expectedText}"`,
    `text=/.*${expectedText}.*/i`,
    '.slds-text-body--regular:has-text("Items")',
    '[class*="slds-text"]:has-text("Items")',
  ];

  let found = false;
  for (const selector of itemCountSelectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = await element.textContent().catch(() => '');
        if (text && text.includes(expectedText)) {
          found = true;
          logger.info(`✅ Found Record Types count: "${text}"`);
          break;
        }
      }
    } catch {
      // Continue checking other selectors
    }
  }

  // Take evidence screenshot
  try {
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    logger.info('📸 Evidence screenshot captured: Record Types list count check');
  } catch (screenshotError: any) {
    logger.warn(`Could not capture evidence screenshot: ${screenshotError.message}`);
  }

  if (!found) {
    // Get page content for debugging
    const pageText = await this.page.textContent('body').catch(() => '');
    throw new Error(
      `Record Types list does not show "${expectedText}". ` +
      `Page may show different text. Check screenshot for details.`
    );
  }

  logger.info(`✅ Verified Record Types list shows "${expectedText}"`);
});

/**
 * Verify that "No items to display" message is visible
 * 
 * Examples:
 *   Then the "No items to display" message should be visible
 */
Then('the {string} message should be visible', async function (
  this: AutomationWorld,
  messageText: string
) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  // Wait for page to stabilize
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);

  // Look for the "No items to display" message
  const messageSelectors = [
    `text="${messageText}"`,
    `text=/.*${messageText}.*/i`,
    '.slds-text-body--regular:has-text("No items")',
    '[class*="emptyState"]:has-text("No items")',
    '[class*="empty"]:has-text("No items")',
  ];

  let found = false;
  for (const selector of messageSelectors) {
    try {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 5000 }).catch(() => false)) {
        const text = await element.textContent().catch(() => '');
        if (text && text.includes(messageText)) {
          found = true;
          logger.info(`✅ Found message: "${text}"`);
          break;
        }
      }
    } catch {
      // Continue checking other selectors
    }
  }

  // Take evidence screenshot
  try {
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    logger.info('📸 Evidence screenshot captured: No items message check');
  } catch (screenshotError: any) {
    logger.warn(`Could not capture evidence screenshot: ${screenshotError.message}`);
  }

  if (!found) {
    throw new Error(
      `Message "${messageText}" is not visible on the page. ` +
      `Record Types may still be listed. Check screenshot for details.`
    );
  }

  logger.info(`✅ Verified "${messageText}" message is visible`);
});

