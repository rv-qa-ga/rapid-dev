/**
 * QA Smoke Test Step Definitions
 * Handles smoke test-specific steps including name field formatting with date and timestamp
 */

import { Given, When } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { FieldRegistry } from '../../../page-objects/salesforce/fields/FieldRegistry';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';

/**
 * Helper to get FieldRegistry instance
 */
function getFieldRegistry(world: AutomationWorld): FieldRegistry {
  if (!world.page || world.page.isClosed()) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }
  return new FieldRegistry(world.page);
}

/**
 * Set a name field with smoke test format: "UAT Smoke - {date} - {objectType} {timestamp}"
 * Data is left in the environment (no cleanup at end of run).
 */
When('I set the {string} field to a smoke test name for {word}', async function (
  this: AutomationWorld,
  fieldName: string,
  objectType: string
) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  const fieldRegistry = getFieldRegistry(this);
  
  // Wait for form to be ready
  await this.page.waitForLoadState('domcontentloaded');
  
  // Wait longer for form to appear - especially for Account creation
  logger.info(`Waiting for ${objectType} form to be ready...`);
  
  // For Account: wait for skeleton placeholders to disappear (form loading indicator)
  if (objectType.toLowerCase() === 'account') {
    logger.info('Account form - waiting for skeleton placeholders to disappear...');
    try {
      await this.page.waitForSelector('.slds-skeleton', { state: 'hidden', timeout: 10000 }).catch(() => {});
    } catch { /* ignore */ }
    await this.page.waitForTimeout(2000);
  }
  
  // Wait for any modal or form to be visible
  const formSelectors = [
    'lightning-record-edit-form',
    'lightning-record-form',
    '.slds-modal__content',
    'div.modal-body',
    '[data-aura-class*="forceRecordEdit"]',
    'section[role="dialog"]',
    '[role="dialog"]',
  ];
  
  let formFound = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    for (const selector of formSelectors) {
      if (await this.page.locator(selector).first().isVisible({ timeout: 500 }).catch(() => false)) {
        formFound = true;
        logger.debug(`Form detected via: ${selector}`);
        break;
      }
    }
    if (formFound) break;
    await this.page.waitForTimeout(1000);
  }
  
  if (!formFound) {
    logger.warn('Form container not detected, waiting additional time...');
    await this.page.waitForTimeout(5000);
  }
  
  // Wait for specific field to be visible
  await this.page.waitForTimeout(2000);
  
  // For Account: also try to find the Account Name field specifically
  if (objectType.toLowerCase() === 'account') {
    const accountNameSelectors = [
      'input[placeholder*="Account Name"]',
      'input[aria-label*="Account Name"]',
      'lightning-input-field[field-name="Name"] input',
      'input[name="Name"]',
    ];
    
    for (const sel of accountNameSelectors) {
      if (await this.page.locator(sel).first().isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.info(`Account Name input found via: ${sel}`);
        break;
      }
    }
  }
  
  // Generate smoke test name: "UAT Smoke - {date} - {objectType} {timestamp}" (stays in env, no cleanup)
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = Date.now();
  const rawName = `UAT Smoke - ${dateStr} - ${objectType} ${timestamp}`;
  // eslint-disable-next-line no-control-regex -- strip control chars from generated smoke name
  const smokeTestName = String(rawName).replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 255);
  
  logger.info(`Setting ${fieldName} to: ${smokeTestName}`);
  
  // Try multiple approaches to set the field
  let fieldSet = false;
  
  // Approach 1: Use FieldRegistry
  try {
    await fieldRegistry.setValue(fieldName, smokeTestName);
    fieldSet = true;
    logger.info(`✅ Set ${fieldName} via FieldRegistry`);
  } catch (error: any) {
    logger.debug(`FieldRegistry failed: ${error.message}`);
  }
  
  // Approach 2: Direct field interaction - try multiple selectors
  if (!fieldSet) {
    const directSelectors = [
      `input[aria-label*="${fieldName}"]`,
      `input[placeholder*="${fieldName}"]`,
      'input[name="Name"]',
      'lightning-input-field[field-name="Name"] input',
      'lightning-input[label*="Name"] input',
      'input[data-field="Name"]',
    ];
    
    for (const sel of directSelectors) {
      try {
        const directField = this.page.locator(sel).first();
        if (await directField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await directField.fill(smokeTestName);
          fieldSet = true;
          logger.info(`✅ Set ${fieldName} via direct locator: ${sel}`);
          break;
        }
      } catch (error: any) {
        logger.debug(`Direct locator ${sel} failed: ${error.message}`);
      }
    }
  }
  
  if (!fieldSet) {
    throw new Error(`Could not set ${fieldName} field. Form may not be ready.`);
  }
  
  // Mark as smoke test and store record info
  this.testContext.isSmokeTest = true;
  if (!this.testContext.smokeTestRecords) {
    this.testContext.smokeTestRecords = [];
  }
  this.testContext.smokeTestRecords.push({
    objectType,
    fieldName,
    value: smokeTestName,
    timestamp,
    date: dateStr,
  });
});

/**
 * Create an Account via API for smoke test scenarios
 * Opens the Account in UI to ensure it's indexed for search
 */
Given('an Account exists via API for smoke test', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timestamp = Date.now();
  
  const accountName = `UAT Smoke - ${dateStr} - Account ${timestamp}`;
  
  logger.info(`Creating Account via API (UAT Smoke - will not be deleted): ${accountName}`);
  
  try {
    await testDataFactory.initialize();
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: 'Agency',
    });
    
    // Mark as persistent so AfterAll cleanup does NOT delete it (UAT smoke data stays in env)
    testDataFactory.markAsPersistent(account.id);
    
    this.testContext.smokeTestAccountId = account.id;
    this.testContext.smokeTestAccountName = account.name;
    this.testContext.accountId = account.id;
    this.testContext.accountName = account.name;
    this.testContext.isSmokeTest = true;
    
    logger.info(`✅ Created Account: ${account.id} (${account.name})`);
    
    // IMPORTANT: Open the Account in UI to ensure it's indexed for search
    // This triggers Salesforce to make the record searchable
    const baseUrl = process.env.SF_INSTANCE_URL || 'https://arx--qa.sandbox.lightning.force.com';
    const accountUrl = `${baseUrl}/lightning/r/Account/${account.id}/view`;
    
    logger.info(`Opening Account in UI to ensure indexing: ${accountUrl}`);
    await this.page.goto(accountUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Wait for the Account page to load
    await this.page.waitForTimeout(3000);
    
    // Verify Account page loaded
    const pageTitle = await this.page.title().catch(() => '');
    if (pageTitle.includes('Account') || pageTitle.includes(accountName.substring(0, 15))) {
      logger.info(`✅ Account page loaded successfully`);
    } else {
      logger.info(`Account page loaded (title: ${pageTitle})`);
    }
    
    // Brief additional wait for search indexing
    logger.info('Waiting 2 more seconds for search index...');
    await this.page.waitForTimeout(2000);
    
  } catch (error: any) {
    logger.error(`Failed to create Account: ${error.message}`);
    throw error;
  }
});

/**
 * Select the smoke test Account in a lookup field
 * Handles both dropdown and Advanced Search modal flows
 */
When('I select the smoke test Account in the Account lookup', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  const accountName = this.testContext.smokeTestAccountName || this.testContext.accountName;
  const accountId = this.testContext.smokeTestAccountId || this.testContext.accountId;
  
  if (!accountName) {
    throw new Error('No smoke test Account found. Run "an Account exists via API for smoke test" first.');
  }
  
  logger.info(`Selecting Account "${accountName}" (ID: ${accountId})`);
  
  // Wait for form to fully load - must wait for skeleton placeholders to disappear
  logger.info('Waiting for Opportunity form to fully load...');
  
  // First, wait for any loading indicators to complete
  try {
    // Wait for skeleton loading placeholders to disappear
    await this.page.waitForSelector('.slds-skeleton', { state: 'hidden', timeout: 10000 }).catch(() => {});
    logger.debug('Skeleton placeholders hidden');
  } catch {
    logger.debug('No skeleton placeholders found');
  }
  
  // Wait for form elements to appear
  const formSelectors = [
    'lightning-record-edit-form',
    '.slds-modal__content',
    '.modal-body',
    'records-record-edit-error-header', // Form header in modal
    'lightning-input-field',
  ];
  
  let formLoaded = false;
  for (const sel of formSelectors) {
    try {
      const formElement = this.page.locator(sel).first();
      if (await formElement.isVisible({ timeout: 5000 }).catch(() => false)) {
        formLoaded = true;
        logger.info(`Form detected via: ${sel}`);
        break;
      }
    } catch {
      continue;
    }
  }
  
  if (!formLoaded) {
    logger.warn('Form not detected by specific selectors - waiting additional time...');
    await this.page.waitForTimeout(5000);
  }
  
  // Additional wait for Lightning to finish rendering input fields
  await this.page.waitForTimeout(2000);
  
  // Find lookup field - expanded selectors for Lightning forms
  const lookupSelectors = [
    // Most specific: AccountId field in Lightning record edit form
    'lightning-input-field[field-name="AccountId"] input',
    'lightning-input-field[data-field-name="AccountId"] input',
    // Record picker patterns
    'lightning-record-picker[field-name="AccountId"] input',
    'lightning-record-picker input[placeholder*="Search"]',
    // Grouped combobox patterns
    'lightning-grouped-combobox[label="Account Name"] input',
    'lightning-grouped-combobox input[placeholder*="Search Account"]',
    'lightning-grouped-combobox input[placeholder*="Search"]',
    // Standard lookup input patterns
    'input[placeholder*="Search Accounts"]',
    'input[placeholder*="Search Account"]',
    // Aria label patterns
    'input[aria-label*="Account Name"]',
    'input[aria-label="Account Name"]',
    'input[aria-label*="Account"]',
    // Legacy patterns
    'lightning-lookup input',
    'input[name="Account Name"]',
    'input[data-id="combobox-input"]',
    // Field-based selectors
    '[data-field-name="AccountId"] input',
  ];
  
  let lookupField = null;
  logger.info('Searching for Account lookup field...');
  for (const selector of lookupSelectors) {
    try {
      const field = this.page.locator(selector).first();
      const isVis = await field.isVisible({ timeout: 2000 }).catch(() => false);
      logger.debug(`Lookup selector "${selector}": visible=${isVis}`);
      if (isVis) {
        lookupField = field;
        logger.info(`Found lookup via: ${selector}`);
        break;
      }
    } catch {
      continue;
    }
  }
  
  if (!lookupField) {
    // Take screenshot for debugging
    logger.error('Account lookup field not found - taking screenshot');
    await this.page.screenshot({ path: `reports/screenshots/account-lookup-not-found-${Date.now()}.png` });
    throw new Error('Account lookup field not found. Form may not have loaded.');
  }
  
  // Click on the lookup field to activate it
  logger.info('Clicking on Account lookup field...');
  await lookupField.click();
  await this.page.waitForTimeout(1000);
  
  // Clear any existing value and type the search term
  await lookupField.clear();
  
  // Wait 3 seconds before typing to ensure Account is indexed in search
  logger.info('Waiting 3 seconds before typing to ensure Account is searchable...');
  await this.page.waitForTimeout(3000);
  
  // Type the account name slowly to trigger search
  const searchTerm = accountName.substring(0, 25); // Use partial name
  logger.info(`Typing search term: ${searchTerm}`);
  await lookupField.fill(searchTerm);
  
  // Wait for dropdown/search results to appear (give Salesforce time to query)
  logger.info('Waiting 3 seconds for search results dropdown to appear...');
  await this.page.waitForTimeout(3000);
  
  // Take screenshot to see current state
  await this.page.screenshot({ path: `reports/screenshots/after-typing-search-${Date.now()}.png` });
  
  // PRIORITY 1: Try to select from the dropdown that appears BELOW the field
  // This is the simpler, faster approach - avoid Advanced Search if possible
  logger.info('Looking for dropdown search results below the field...');
  
  let dropdownSelected = false;
  
  // Strategy 1: Use getByText to find the account name in the dropdown
  // The dropdown shows "Smoke Test - 2026-02-01 - Account XXXXX" with phone number
  try {
    const partialName = accountName.substring(0, 30);
    logger.info(`Looking for text containing: "${partialName}"`);
    
    // Find an option containing our account name
    const optionByText = this.page.locator(`[role="option"]:has-text("${partialName}")`).first();
    if (await optionByText.isVisible({ timeout: 2000 }).catch(() => false)) {
      logger.info('Found option by text - clicking...');
      await optionByText.click({ force: true });
      dropdownSelected = true;
      logger.info(`✅ Selected Account from dropdown using text match`);
    }
  } catch (e) {
    logger.debug(`getByText approach failed: ${e}`);
  }
  
  // Strategy 2: Find the specific lightning-base-combobox-item with our account
  if (!dropdownSelected) {
    const dropdownSelectors = [
      // Lightning combobox items - most common in Salesforce
      `lightning-base-combobox-item[data-value*="001"]`, // Account IDs start with 001
      `lightning-base-combobox-item:has-text("UAT Smoke")`,
      `lightning-base-combobox-item:has-text("Smoke Test")`,
      // Role-based selectors
      `[role="option"]:has-text("UAT Smoke")`,
      `[role="option"]:has-text("Smoke Test")`,
      `li[role="option"]:has-text("UAT Smoke")`,
      // The actual combobox formatted text
      `span.slds-listbox__option-text:has-text("UAT Smoke")`,
      `span.slds-listbox__option-text:has-text("Smoke Test")`,
      // Any listbox option with our account
      `.slds-listbox__item:has-text("UAT Smoke")`,
      `.slds-listbox__item:has-text("Smoke Test")`,
    ];
    
    for (const sel of dropdownSelectors) {
      try {
        const option = this.page.locator(sel).first();
        const isVis = await option.isVisible({ timeout: 1500 }).catch(() => false);
        logger.debug(`Dropdown selector "${sel}": visible=${isVis}`);
        if (isVis) {
          await option.scrollIntoViewIfNeeded();
          await option.click({ force: true });
          dropdownSelected = true;
          logger.info(`✅ Selected Account from dropdown using: ${sel}`);
          break;
        }
      } catch {
        continue;
      }
    }
  }
  
  // Strategy 3: Use keyboard navigation - type and press Enter or Arrow Down + Enter
  if (!dropdownSelected) {
    logger.info('Trying keyboard navigation to select from dropdown...');
    try {
      // Press Down arrow to highlight first result, then Enter to select
      await this.page.keyboard.press('ArrowDown');
      await this.page.waitForTimeout(500);
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(1000);
      
      // Check if something was selected (field should now show account name)
      const fieldValue = await lookupField.inputValue().catch(() => '');
      if (fieldValue && (fieldValue.includes('UAT Smoke') || fieldValue.includes('Smoke Test'))) {
        dropdownSelected = true;
        logger.info('✅ Selected Account via keyboard navigation');
      }
    } catch (e) {
      logger.debug(`Keyboard navigation failed: ${e}`);
    }
  }
  
  if (dropdownSelected) {
    await this.page.waitForTimeout(1500);
    logger.info(`✅ Account selection complete via dropdown: ${accountName}`);
    return; // Done! No need for Advanced Search
  }
  
  // PRIORITY 2: Check if Advanced Search modal already opened (some orgs auto-open it)
  logger.info('Dropdown selection failed - checking for Advanced Search modal...');
  const modalSelector = 'lightning-modal, section[role="dialog"], .slds-modal__container';
  let isModal = await this.page.locator(modalSelector).first().isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isModal) {
    // Try clicking "Show more results" to open Advanced Search
    logger.info('No modal detected - trying to open Advanced Search via "Show more results"...');
    const showMoreSelectors = [
      'lightning-base-combobox-item:has-text("Show more results")',
      '[role="option"]:has-text("Show more")',
      'button:has-text("Show more")',
      '.slds-listbox__option:has-text("Show more")',
    ];
    
    for (const sel of showMoreSelectors) {
      try {
        const showMore = this.page.locator(sel).first();
        if (await showMore.isVisible({ timeout: 1500 }).catch(() => false)) {
          await showMore.click();
          logger.info(`Clicked "Show more results" using: ${sel}`);
          await this.page.waitForTimeout(2000);
          break;
        }
      } catch {
        continue;
      }
    }
    
    // Check again for modal after clicking show more
    isModal = await this.page.locator(modalSelector).first().isVisible({ timeout: 3000 }).catch(() => false);
  }
  
  if (!isModal) {
    logger.error('Could not open Advanced Search modal - taking screenshot');
    await this.page.screenshot({ path: `reports/screenshots/account-lookup-failed-${Date.now()}.png` });
    throw new Error('Account selection failed - could not select from dropdown or open Advanced Search');
  }
  
  // Handle Advanced Search modal
  logger.info('Advanced Search modal detected - selecting from modal');
  
  // Wait for search results table to fully load (NOT the search input area)
  logger.info('Waiting for results table to load...');
  const tableLoaded = await this.page.locator('lightning-datatable tbody tr, table tbody tr').first()
    .isVisible({ timeout: 5000 }).catch(() => false);
  if (!tableLoaded) {
    logger.warn('Results table not immediately visible - waiting longer...');
    await this.page.waitForTimeout(3000);
  }
  
  // Take a screenshot to see the current state
  logger.info('Taking screenshot of modal state...');
  await this.page.screenshot({ path: `reports/screenshots/modal-before-radio-${Date.now()}.png` });
  
  // STEP 1: Click the radio button for first result row
  // CRITICAL: Only target elements INSIDE the table body, NOT in any search area
  logger.info('Clicking radio button to select Account...');
  let radioClicked = false;
  
  // Be VERY specific: target radio/checkbox elements ONLY inside table rows
  const radioSelectors = [
    // Most specific: radio_faux inside the datatable first row
    'lightning-datatable table tbody tr:first-child td lightning-primitive-cell-checkbox span.slds-radio_faux',
    'lightning-datatable table tbody tr:first-child lightning-primitive-cell-checkbox span.slds-radio_faux',
    // The label in the first data row
    'lightning-datatable table tbody tr:first-child lightning-primitive-cell-checkbox label',
    // Fallback to any radio in the first table row
    'table tbody tr:first-child span.slds-radio_faux',
    'table tbody tr:first-child lightning-primitive-cell-checkbox',
    // Input radio specifically in tbody (NOT in search area)
    'table tbody tr:first-child input[type="radio"]',
  ];
  
  for (const sel of radioSelectors) {
    try {
      const element = this.page.locator(sel).first();
      const isVis = await element.isVisible({ timeout: 1500 }).catch(() => false);
      logger.debug(`Trying radio selector: ${sel} - visible: ${isVis}`);
      if (isVis) {
        await element.click({ force: true });
        radioClicked = true;
        logger.info(`✅ Clicked radio using: ${sel}`);
        await this.page.waitForTimeout(500);
        break;
      }
    } catch (e) {
      logger.debug(`Radio selector failed: ${sel}`);
      continue;
    }
  }
    
  if (!radioClicked) {
    // Last resort: Use JavaScript to click the first radio
    // CRITICAL: Target ONLY elements inside the data table, NOT search inputs
    try {
      logger.info('Using JavaScript to click radio button in table...');
      const clicked = await this.page.evaluate(() => {
        // Find the data table first, then look for radio elements INSIDE it
        const dataTable = document.querySelector('lightning-datatable table tbody') || 
                         document.querySelector('table.slds-table tbody');
        if (!dataTable) return null;
        
        // Look for radio faux in first row INSIDE the table
        const firstRow = dataTable.querySelector('tr');
        if (!firstRow) return null;
        
        // Try the radio_faux span
        const radioFaux = firstRow.querySelector('span.slds-radio_faux');
        if (radioFaux) {
          (radioFaux as HTMLElement).click();
          return 'radioFaux';
        }
        // Try the label
        const label = firstRow.querySelector('lightning-primitive-cell-checkbox label');
        if (label) {
          (label as HTMLElement).click();
          return 'label';
        }
        // Try the checkbox component
        const checkbox = firstRow.querySelector('lightning-primitive-cell-checkbox');
        if (checkbox) {
          (checkbox as HTMLElement).click();
          return 'checkbox';
        }
        // Try first cell (td)
        const cell = firstRow.querySelector('td:first-child');
        if (cell) {
          (cell as HTMLElement).click();
          return 'cell';
        }
        return null;
      });
      if (clicked) {
        radioClicked = true;
        logger.info(`✅ Clicked radio via JavaScript (${clicked})`);
      }
    } catch (e) {
      logger.error(`JavaScript radio click failed: ${e}`);
    }
  }
  
  // Wait for selection to register and Select button to enable
  logger.info('Waiting for selection to register...');
  await this.page.waitForTimeout(2000);
  
  // Take screenshot after radio click
  await this.page.screenshot({ path: `reports/screenshots/modal-after-radio-${Date.now()}.png` });
  
  // STEP 2: Click the Select button
  logger.info('Clicking Select button...');
  let selectClicked = false;
  
  // Wait for Select button to be enabled - use very specific selectors
  // CRITICAL: Do NOT match Search button - only match the Select button in footer
  const selectButtonSelectors = [
    // Footer-specific selectors (Select is always in the modal footer)
    '.slds-modal__footer button:has-text("Select"):not(:has-text("Search"))',
    'footer button:has-text("Select"):not(:has-text("Search"))',
    'lightning-modal-footer button:has-text("Select")',
    // Generic but excluding Search
    'button.slds-button_brand:has-text("Select"):not(:has-text("Search"))',
    'button[title="Select"]',
  ];
  
  for (const sel of selectButtonSelectors) {
    try {
      const btn = this.page.locator(sel).last();
      const isVis = await btn.isVisible({ timeout: 1500 }).catch(() => false);
      const isDisabled = await btn.isDisabled().catch(() => true);
      logger.debug(`Select button ${sel}: visible=${isVis}, disabled=${isDisabled}`);
      
      if (isVis && !isDisabled) {
        await btn.click({ timeout: 5000 });
        selectClicked = true;
        logger.info(`✅ Clicked Select button using: ${sel}`);
        break;
      }
    } catch (e) {
      logger.debug(`Select button selector failed: ${sel}`);
      continue;
    }
  }
  
  if (!selectClicked) {
    // Try finding by role with force click
    try {
      const selectBtn = this.page.getByRole('button', { name: 'Select', exact: true }).last();
      await selectBtn.click({ force: true, timeout: 5000 });
      selectClicked = true;
      logger.info('✅ Clicked Select button using getByRole (force)');
    } catch {
      /* ignore failed force-click */
    }
  }
  
  // CRITICAL: Wait for modal to close
  logger.info('Waiting for modal to close...');
  await this.page.waitForTimeout(2000);
  
  // Verify modal is closed
  const modalStillOpen = await this.page.locator(modalSelector).first().isVisible({ timeout: 2000 }).catch(() => false);
  
  if (modalStillOpen) {
    logger.warn('Modal still open - attempting to close...');
    
    // Try pressing Escape
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(1000);
    
    // Try clicking X button
    const closeBtn = this.page.locator('button[title="Close"], button.slds-modal__close, lightning-button-icon[title="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
      await this.page.waitForTimeout(1000);
    }
  }
  
  // Final check
  const finalModalCheck = await this.page.locator(modalSelector).first().isVisible({ timeout: 1000 }).catch(() => false);
  if (finalModalCheck) {
    logger.error('⚠️ Modal still open after attempts to close');
  } else {
    logger.info('✅ Modal closed successfully');
  }
  
  // Wait for selection to apply
  await this.page.waitForTimeout(1500);
  logger.info(`✅ Account selection complete: ${accountName}`);
});
