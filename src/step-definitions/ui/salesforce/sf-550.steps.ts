/**
 * Step Definitions for SF-550 - Add TPA Group as an Account Type (UI)
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { AccountPage } from '../../../page-objects/salesforce/AccountPage';
import { FieldRegistry } from '../../../page-objects/salesforce/fields/FieldRegistry';
import { logger } from '../../../utils/logger';

/**
 * Helper to get AccountPage instance
 */
function getAccountPage(world: AutomationWorld): AccountPage {
  if (!world.page || world.page.isClosed()) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }
  return new AccountPage(world.page);
}

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
// FIELD EDIT OPERATIONS
// ============================================================================

/**
 * Click Edit on Account Type field (exact match for SF-550)
 */
When('I click Edit on the Account Type field', async function (this: AutomationWorld) {
  const fieldName = 'Account Type';
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  const accountPage = getAccountPage(this);
  
  // Look for the inline edit button next to the Type field
  const editButton = this.page.locator(`
    button[title*="Edit Type"],
    button[title*="Edit Account Type"],
    lightning-button-icon[title*="Edit Type"],
    .slds-form-element__control button[title*="Type"]
  `).first();
  
  try {
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();
    await this.page.waitForTimeout(500);
    logger.info(`✅ Clicked Edit on ${fieldName} field`);
  } catch (error: any) {
    // Fallback: Try clicking the field label or value to open edit mode
    logger.debug(`Edit button not found, trying alternative approach: ${error.message}`);
    const fieldLabel = this.page.locator(`label:has-text("Type"), label:has-text("Account Type"), span:has-text("Type")`).first();
    if (await fieldLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
      await fieldLabel.click();
      await this.page.waitForTimeout(500);
      logger.info(`✅ Clicked ${fieldName} field label to open edit mode`);
    } else {
      throw new Error(`Could not find Edit button or field label for "${fieldName}"`);
    }
  }
});

/**
 * Click Edit on a specific field (inline editing) - generic version
 */
When('I click Edit on the {string} field', async function (this: AutomationWorld, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  const accountPage = getAccountPage(this);
  
  // For Account Type field, use the inline edit button
  if (fieldName === 'Account Type' || fieldName === 'Type') {
    // Look for the inline edit button next to the Type field
    const editButton = this.page.locator(`
      button[title*="Edit Type"],
      button[title*="Edit Account Type"],
      lightning-button-icon[title*="Edit Type"],
      .slds-form-element__control button[title*="Type"]
    `).first();
    
    try {
      await editButton.waitFor({ state: 'visible', timeout: 5000 });
      await editButton.scrollIntoViewIfNeeded();
      await editButton.click();
      await this.page.waitForTimeout(500);
      logger.info(`✅ Clicked Edit on ${fieldName} field`);
    } catch (error: any) {
      // Fallback: Try clicking the field label or value to open edit mode
      logger.debug(`Edit button not found, trying alternative approach: ${error.message}`);
      const fieldLabel = this.page.locator(`label:has-text("${fieldName}"), span:has-text("${fieldName}")`).first();
      if (await fieldLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fieldLabel.click();
        await this.page.waitForTimeout(500);
        logger.info(`✅ Clicked ${fieldName} field label to open edit mode`);
      } else {
        throw new Error(`Could not find Edit button or field label for "${fieldName}"`);
      }
    }
  } else {
    // For other fields, use generic approach
    const editButton = this.page.locator(`
      button[title*="Edit ${fieldName}"],
      lightning-button-icon[title*="Edit ${fieldName}"]
    `).first();
    
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.scrollIntoViewIfNeeded();
    await editButton.click();
    await this.page.waitForTimeout(500);
    logger.info(`✅ Clicked Edit on ${fieldName} field`);
  }
});

// ============================================================================
// PICKLIST VERIFICATION
// ============================================================================

/**
 * Verify TPA Group exists in Account Type picklist (exact match for SF-550)
 */
Then('I should see {string} in the Account Type field picklist', async function (
  this: AutomationWorld,
  expectedValue: string
) {
  const fieldName = 'Account Type';
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Wait for edit mode to be active after clicking Edit
  await this.page.waitForLoadState('domcontentloaded');
  
  // OPTIMIZATION: Use FieldRegistry to set/get the field value, which handles all the complexity
  const fieldRegistry = getFieldRegistry(this);
  
  // Try multiple strategies to find and open the Type combobox
  let dropdownOpened = false;
  let comboboxFound = false;
  
  // Strategy 1: Use getByRole for combobox (most reliable in edit mode)
  try {
    const typeCombobox = this.page.getByRole('combobox', { name: /Type/i });
    if (await typeCombobox.count() > 0 && await typeCombobox.isVisible({ timeout: 3000 }).catch(() => false)) {
      await typeCombobox.scrollIntoViewIfNeeded();
      await typeCombobox.click();
      dropdownOpened = true;
      comboboxFound = true;
      logger.info('✅ Found Type combobox using getByRole and opened dropdown');
    }
  } catch (error: any) {
    logger.debug(`Strategy 1 (getByRole) failed: ${error.message}`);
  }
  
  // Strategy 2: Use label-based selector
  if (!comboboxFound) {
    try {
      const combobox = this.page.locator('lightning-combobox').filter({ hasText: /Type/i }).first();
      if (await combobox.count() > 0 && await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
        await combobox.scrollIntoViewIfNeeded();
        // Click the button inside the combobox
        const comboboxButton = combobox.locator('button[role="combobox"]').first();
        if (await comboboxButton.count() > 0) {
          await comboboxButton.click();
          dropdownOpened = true;
          comboboxFound = true;
          logger.info('✅ Found Type combobox using label filter and opened dropdown');
        }
      }
    } catch (error: any) {
      logger.debug(`Strategy 2 (label filter) failed: ${error.message}`);
    }
  }
  
  // Strategy 3: Use FieldRegistry's setComboboxField approach (click the field directly)
  if (!comboboxFound) {
    try {
      // Use FieldRegistry to find and click the field
      const fieldConfig = fieldRegistry.getFieldConfig('Type');
      if (fieldConfig) {
        const combobox = this.page.getByLabel(fieldConfig.label, { exact: false }).first();
        if (await combobox.count() > 0 && await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
          await combobox.scrollIntoViewIfNeeded();
          await combobox.click();
          dropdownOpened = true;
          comboboxFound = true;
          logger.info('✅ Found Type combobox using getByLabel and opened dropdown');
        }
      }
    } catch (error: any) {
      logger.debug(`Strategy 3 (getByLabel) failed: ${error.message}`);
    }
  }
  
  if (!comboboxFound) {
    throw new Error(`Could not find Type combobox after clicking Edit. The field may not be in edit mode.`);
  }
  
  // Wait for dropdown options to appear
  if (dropdownOpened) {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for dropdown options
    await this.page.waitForSelector('.slds-listbox__option, lightning-base-combobox-item, [role="option"]', { 
      timeout: 3000 
    }).catch(() => {
      logger.debug('Dropdown options selector not found, trying alternative...');
    });
  }
  
  // Check if the expected value exists in the picklist
  const optionSelectors = [
    `.slds-listbox__option:has-text("${expectedValue}")`,
    `lightning-base-combobox-item:has-text("${expectedValue}")`,
    `[role="option"]:has-text("${expectedValue}")`,
    this.page.getByRole('option', { name: expectedValue, exact: true })
  ];
  
  let valueFound = false;
  for (const selector of optionSelectors) {
    try {
      const option = typeof selector === 'string' 
        ? this.page.locator(selector).first()
        : selector.first();
      
      if (await option.count() > 0 && await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        valueFound = true;
        logger.info(`✅ Found "${expectedValue}" in picklist using selector`);
        break;
      }
    } catch {
      continue;
    }
  }
  
  // Close the picklist
  await this.page.keyboard.press('Escape');
  await this.page.waitForLoadState('domcontentloaded');
  
  if (!valueFound) {
    // Get all available options for debugging
    const allOptions = await this.page.locator(
      '.slds-listbox__option, lightning-base-combobox-item, [role="option"]'
    ).allTextContents().catch(() => []);
    
    throw new Error(
      `Expected value "${expectedValue}" not found in ${fieldName} picklist. ` +
      `Available options: ${allOptions.length > 0 ? allOptions.join(', ') : 'none found'}`
    );
  }
  
  logger.info(`✅ Verified "${expectedValue}" exists in ${fieldName} picklist`);
});

/**
 * Verify a specific value exists in a field's picklist - generic version
 */
Then('I should see {string} in the {string} field picklist', async function (
  this: AutomationWorld,
  expectedValue: string,
  fieldName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Normalize field name
  const normalizedFieldName = fieldName === 'Account Type' ? 'Type' : fieldName;
  
  // Open the picklist if not already open
  const fieldRegistry = getFieldRegistry(this);
  const fieldConfig = fieldRegistry.getFieldConfig(normalizedFieldName);
  
  if (!fieldConfig) {
    throw new Error(`Field "${fieldName}" not found in field registry`);
  }
  
  // Wait for the form to be ready first
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1000);
  
  // First check if picklist is already open (from previous step "I click on the Type picklist")
  const isAlreadyOpen = await this.page.locator('.slds-listbox__option, lightning-base-combobox-item, .slds-listbox').isVisible({ timeout: 2000 }).catch(() => false);
  
  if (!isAlreadyOpen) {
    // Picklist is not open, need to find and click it
    // Try multiple selectors for the combobox
    const comboboxSelectors = [
      `lightning-combobox[label*="${normalizedFieldName}"]`,
      `lightning-picklist[label*="${normalizedFieldName}"]`,
      `lightning-base-combobox[label*="${normalizedFieldName}"]`,
      `lightning-combobox[data-id*="${normalizedFieldName}"]`,
      `lightning-combobox[data-id*="Type"]`, // Fallback for Type field
      `lightning-combobox:has-text("${normalizedFieldName}")`,
      `label:has-text("${normalizedFieldName}") + lightning-combobox`,
    ];
    
    let combobox = null;
    for (const selector of comboboxSelectors) {
      try {
        const locator = this.page.locator(selector).first();
        if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
          combobox = locator;
          logger.info(`Found combobox using selector: ${selector}`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    if (!combobox) {
      // Try using FieldRegistry to find the field
      try {
        const fieldRegistry = getFieldRegistry(this);
        const fieldConfig = fieldRegistry.getFieldConfig(normalizedFieldName);
        if (fieldConfig) {
          // Try to find the field using the label from config
          const labelSelector = `lightning-combobox[label*="${fieldConfig.label}"]`;
          const labelLocator = this.page.locator(labelSelector).first();
          if (await labelLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
            combobox = labelLocator;
            logger.info(`Found combobox using FieldRegistry label`);
          }
        }
      } catch {
        // Continue
      }
    }
    
    if (!combobox) {
      throw new Error(`Could not find ${fieldName} combobox/picklist field`);
    }
    
    try {
      await combobox.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      
      // Click the combobox button to open dropdown
      const comboboxButton = combobox.locator('button').first();
      if (await comboboxButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await comboboxButton.click();
        await this.page.waitForTimeout(1000);
      } else {
        // Try clicking the combobox itself
        await combobox.click();
        await this.page.waitForTimeout(1000);
      }
    } catch (error: any) {
      logger.warn(`Could not open picklist: ${error.message}`);
      throw new Error(`Could not open ${fieldName} picklist: ${error.message}`);
    }
  } else {
    logger.info(`Picklist is already open, verifying value...`);
  }
  
  try {
    
    // Wait for options to appear with longer timeout and multiple attempts
    let optionsVisible = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.page.waitForSelector('.slds-listbox__option, lightning-base-combobox-item, [role="option"]', { timeout: 5000 });
        const optionCount = await this.page.locator('.slds-listbox__option, lightning-base-combobox-item, [role="option"]').count();
        if (optionCount > 0) {
          optionsVisible = true;
          logger.info(`✅ Picklist options visible (${optionCount} options found)`);
          break;
        }
      } catch {
        // Wait a bit and retry
        await this.page.waitForTimeout(1000);
      }
    }
    
    if (!optionsVisible) {
      throw new Error('Picklist options did not appear after multiple attempts');
    }
    
    // Additional wait for options to be fully rendered
    await this.page.waitForTimeout(500);
    
    // Check if the expected value exists in the picklist
    // Try multiple selectors for the option
    const optionSelectors = [
      `.slds-listbox__option:has-text("${expectedValue}")`,
      `lightning-base-combobox-item:has-text("${expectedValue}")`,
      `.slds-listbox__option span:has-text("${expectedValue}")`,
      `[role="option"]:has-text("${expectedValue}")`,
      `.slds-listbox__option[data-value*="${expectedValue}"]`,
    ];
    
    let isVisible = false;
    for (const selector of optionSelectors) {
      try {
        const option = this.page.locator(selector).first();
        if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
          isVisible = true;
          logger.info(`✅ Found option "${expectedValue}" using selector: ${selector}`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    // If not found by visibility, check by text content
    if (!isVisible) {
      const allOptions = await this.page.locator('.slds-listbox__option, lightning-base-combobox-item, [role="option"]').all();
      for (const opt of allOptions) {
        const text = await opt.textContent().catch(() => '');
        if (text && text.includes(expectedValue)) {
          isVisible = true;
          logger.info(`✅ Found option "${expectedValue}" by text content`);
          break;
        }
      }
    }
    
    // Close the picklist
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
    
    if (!isVisible) {
      // Get all available options for debugging
      const allOptions = await this.page.locator('.slds-listbox__option, lightning-base-combobox-item').allTextContents().catch(() => []);
      throw new Error(
        `Expected value "${expectedValue}" not found in ${fieldName} picklist. ` +
        `Available options: ${allOptions.length > 0 ? allOptions.join(', ') : 'none found'}`
      );
    }
    
    logger.info(`✅ Verified "${expectedValue}" exists in ${fieldName} picklist`);
  } catch (error: any) {
    // Try to close picklist if still open
    try {
      await this.page.keyboard.press('Escape');
    } catch {
      // Ignore
    }
    throw new Error(`Failed to verify picklist value: ${error.message}`);
  }
});

// ============================================================================
// PICKLIST SELECTION
// ============================================================================

/**
 * Select value from Account Type picklist (exact match for SF-550)
 */
When('I select {string} from the Account Type field picklist', async function (
  this: AutomationWorld,
  value: string
) {
  const fieldName = 'Account Type';
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Normalize field name
  const normalizedFieldName = 'Type';
  
  const fieldRegistry = getFieldRegistry(this);
  
  // Use FieldRegistry to set the value
  try {
    await fieldRegistry.setValue(normalizedFieldName, value);
    logger.info(`✅ Selected "${value}" from ${fieldName} picklist`);
  } catch (error: any) {
    // Fallback: Manual selection
    logger.debug(`FieldRegistry approach failed, trying manual selection: ${error.message}`);
    
    const combobox = this.page.locator(`
      lightning-combobox[label*="Type"],
      lightning-picklist[label*="Type"],
      lightning-base-combobox[label*="Type"]
    `).first();
    
    await combobox.waitFor({ state: 'visible', timeout: 5000 });
    await combobox.scrollIntoViewIfNeeded();
    
    // Click to open dropdown
    const comboboxButton = combobox.locator('button').first();
    await comboboxButton.click();
    await this.page.waitForTimeout(500);
    
    // Select the option
    const option = this.page.locator(`
      .slds-listbox__option:has-text("${value}"),
      lightning-base-combobox-item:has-text("${value}")
    `).first();
    
    await option.waitFor({ state: 'visible', timeout: 3000 });
    await option.click();
    await this.page.waitForTimeout(300);
    
    logger.info(`✅ Selected "${value}" from ${fieldName} picklist (manual)`);
  }
});

/**
 * Select a value from a field's picklist - generic version
 */
When('I select {string} from the {string} field picklist', async function (
  this: AutomationWorld,
  value: string,
  fieldName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Normalize field name
  const normalizedFieldName = fieldName === 'Account Type' ? 'Type' : fieldName;
  
  const fieldRegistry = getFieldRegistry(this);
  
  // Use FieldRegistry to set the value
  try {
    await fieldRegistry.setValue(normalizedFieldName, value);
    logger.info(`✅ Selected "${value}" from ${fieldName} picklist`);
  } catch (error: any) {
    // Fallback: Manual selection
    logger.debug(`FieldRegistry approach failed, trying manual selection: ${error.message}`);
    
    const combobox = this.page.locator(`
      lightning-combobox[label*="${normalizedFieldName}"],
      lightning-picklist[label*="${normalizedFieldName}"],
      lightning-base-combobox[label*="${normalizedFieldName}"]
    `).first();
    
    await combobox.waitFor({ state: 'visible', timeout: 5000 });
    await combobox.scrollIntoViewIfNeeded();
    
    // Click to open dropdown
    const comboboxButton = combobox.locator('button').first();
    await comboboxButton.click();
    await this.page.waitForTimeout(500);
    
    // Select the option
    const option = this.page.locator(`
      .slds-listbox__option:has-text("${value}"),
      lightning-base-combobox-item:has-text("${value}")
    `).first();
    
    await option.waitFor({ state: 'visible', timeout: 3000 });
    await option.click();
    await this.page.waitForTimeout(300);
    
    logger.info(`✅ Selected "${value}" from ${fieldName} picklist (manual)`);
  }
});

// ============================================================================
// ERROR MESSAGE VERIFICATION
// ============================================================================

/**
 * Verify error message that Account Type cannot be changed (exact match for SF-550)
 */
Then('I should get an error message that the Account Type cannot be changed', async function (
  this: AutomationWorld
) {
  const fieldName = 'Account Type';
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // OPTIMIZATION: Wait for page to be ready instead of arbitrary timeout
  await this.page.waitForLoadState('domcontentloaded');
  
  // Look for error messages - check multiple locations
  const errorSelectors = [
    '.slds-form-element__help',
    '.slds-text-color_error',
    '[role="alert"]',
    '.slds-notify',
    '.errorMessage',
    'lightning-formatted-text:has-text("cannot be changed")',
    'lightning-formatted-text:has-text("Cannot be changed")',
    'lightning-formatted-text:has-text("Account Type cannot be changed")',
    '.slds-form-element__help:has-text("cannot")',
    '[data-aura-class*="error"]',
  ];
  
  let errorFound = false;
  let errorText = '';
  
  for (const selector of errorSelectors) {
    try {
      const errorElement = this.page.locator(selector);
      const count = await errorElement.count();
      
      for (let i = 0; i < count; i++) {
        const text = await errorElement.nth(i).textContent();
        if (text && (
          text.toLowerCase().includes('cannot be changed') ||
          text.toLowerCase().includes('cannot change') ||
          text.toLowerCase().includes('not allowed') ||
          text.toLowerCase().includes('locked') ||
          text.toLowerCase().includes('account type cannot be changed') ||
          text.toLowerCase().includes('validation error')
        )) {
          errorFound = true;
          errorText = text;
          break;
        }
      }
      
      if (errorFound) break;
    } catch {
      continue;
    }
  }
  
  // Also check for validation errors in the page text
  if (!errorFound) {
    const pageText = await this.page.textContent('body') || '';
    if (
      pageText.toLowerCase().includes('cannot be changed') ||
      pageText.toLowerCase().includes('cannot change') ||
      pageText.toLowerCase().includes('account type cannot be changed') ||
      pageText.toLowerCase().includes('validation error')
    ) {
      errorFound = true;
      errorText = 'Error message found in page content';
    }
  }
  
  if (!errorFound) {
    // Take screenshot for debugging
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    throw new Error(
      `Expected error message about "${fieldName}" not being changeable, but no such message was found. ` +
      `Please check the screenshot for details.`
    );
  }
  
  logger.info(`✅ Verified error message: "${errorText}"`);
  
  // Take screenshot as evidence
  const screenshot = await this.page.screenshot({ fullPage: true });
  this.attach(screenshot, 'image/png');
});

/**
 * Verify error message that a field cannot be changed - generic version
 */
Then('I should get an error message that the {string} cannot be changed', async function (
  this: AutomationWorld,
  fieldName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Wait for error message to appear
  await this.page.waitForTimeout(1000);
  
  // Look for error messages
  const errorSelectors = [
    '.slds-form-element__help',
    '.slds-text-color_error',
    '[role="alert"]',
    '.slds-notify',
    '.errorMessage',
    'lightning-formatted-text:has-text("cannot be changed")',
    'lightning-formatted-text:has-text("Cannot be changed")',
  ];
  
  let errorFound = false;
  let errorText = '';
  
  for (const selector of errorSelectors) {
    try {
      const errorElement = this.page.locator(selector);
      const count = await errorElement.count();
      
      for (let i = 0; i < count; i++) {
        const text = await errorElement.nth(i).textContent();
        if (text && (
          text.toLowerCase().includes('cannot be changed') ||
          text.toLowerCase().includes('cannot change') ||
          text.toLowerCase().includes('not allowed') ||
          text.toLowerCase().includes('locked')
        )) {
          errorFound = true;
          errorText = text;
          break;
        }
      }
      
      if (errorFound) break;
    } catch {
      continue;
    }
  }
  
  // Also check for validation errors in the page text
  if (!errorFound) {
    const pageText = await this.page.textContent('body') || '';
    if (
      pageText.toLowerCase().includes('cannot be changed') ||
      pageText.toLowerCase().includes('cannot change') ||
      pageText.toLowerCase().includes(`${fieldName.toLowerCase()} cannot be changed`)
    ) {
      errorFound = true;
      errorText = 'Error message found in page content';
    }
  }
  
  if (!errorFound) {
    // Take screenshot for debugging
    const screenshot = await this.page.screenshot({ fullPage: true });
    this.attach(screenshot, 'image/png');
    throw new Error(
      `Expected error message about "${fieldName}" not being changeable, but no such message was found. ` +
      `Please check the screenshot for details.`
    );
  }
  
  logger.info(`✅ Verified error message: "${errorText}"`);
  
  // Take screenshot as evidence
  const screenshot = await this.page.screenshot({ fullPage: true });
  this.attach(screenshot, 'image/png');
});

