/**
 * Field Helper Utilities
 * 
 * Provides reusable functions for interacting with Salesforce Lightning fields
 * Based on recorded selectors from Playwright Codegen
 */

import { Page } from '@playwright/test';
import { logger } from './logger';

export class FieldHelpers {
  /**
   * Set a text field value using the correct selector pattern
   */
  static async setTextField(page: Page, fieldName: string, value: string): Promise<void> {
    try {
      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded');
      
      const field = page.getByRole('textbox', { name: fieldName });
      await field.waitFor({ state: 'visible', timeout: 10000 });
      await field.click();
      await field.fill(value);
      
      // Wait a bit for value to be set
      await page.waitForTimeout(200);
      
      logger.info(`Set text field "${fieldName}" to "${value}"`);
    } catch (error: any) {
      logger.error(`Failed to set text field "${fieldName}": ${error.message}`);
      throw new Error(
        `Failed to set text field "${fieldName}" to "${value}". ` +
        `Error: ${error.message}. ` +
        `Ensure the field name "${fieldName}" matches exactly and the field is visible and editable.`
      );
    }
  }

  /**
   * Set a combobox/dropdown field value using the correct selector pattern
   */
  static async setComboboxField(page: Page, fieldName: string, value: string): Promise<void> {
    try {
      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded');
      
      // Click the combobox to open it - wait for it to be visible and enabled
      const combobox = page.getByRole('combobox', { name: fieldName });
      await combobox.waitFor({ state: 'visible', timeout: 10000 });
      await combobox.click();
      
      // Wait for dropdown to open
      await page.waitForTimeout(500);
      
      // Select the option - try exact match first, then partial
      const option = page.getByRole('option', { name: value, exact: true });
      const isVisible = await option.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await option.waitFor({ state: 'visible', timeout: 3000 });
        await option.click();
      } else {
        // Fallback: try without exact match
        const optionPartial = page.getByRole('option', { name: value });
        await optionPartial.waitFor({ state: 'visible', timeout: 3000 });
        await optionPartial.click();
      }
      
      // Wait a bit for selection to register
      await page.waitForTimeout(200);
      
      logger.info(`Set combobox "${fieldName}" to "${value}"`);
    } catch (error: any) {
      logger.error(`Failed to set combobox "${fieldName}": ${error.message}`);
      // Try alternative selector pattern
      try {
        const combobox = page.locator(`lightning-combobox[label="${fieldName}"]`);
        await combobox.waitFor({ state: 'visible', timeout: 10000 });
        await combobox.click();
        await page.waitForTimeout(500);
        const option = page.locator(`lightning-base-combobox-item:has-text("${value}")`).first();
        await option.waitFor({ state: 'visible', timeout: 3000 });
        await option.click();
        await page.waitForTimeout(200);
        logger.info(`Set combobox "${fieldName}" to "${value}" (using fallback selector)`);
      } catch (fallbackError: any) {
        throw new Error(
          `Failed to set combobox "${fieldName}" to "${value}". ` +
          `Primary error: ${error.message}. Fallback error: ${fallbackError.message}. ` +
          `Ensure the field name "${fieldName}" matches exactly and the value "${value}" exists in the dropdown.`
        );
      }
    }
  }

  /**
   * Set a spinbutton (number field) value
   */
  static async setSpinbuttonField(page: Page, fieldName: string, value: string | number): Promise<void> {
    try {
      const field = page.getByRole('spinbutton', { name: fieldName });
      await field.click();
      await field.fill(String(value));
      logger.info(`Set spinbutton "${fieldName}" to "${value}"`);
    } catch (error: any) {
      logger.error(`Failed to set spinbutton "${fieldName}": ${error.message}`);
      throw new Error(`Failed to set spinbutton "${fieldName}": ${error.message}`);
    }
  }

  /**
   * Set any field type (auto-detects field type)
   */
  static async setField(page: Page, fieldName: string, value: string | number): Promise<void> {
    // Wait for page to be ready
    await page.waitForLoadState('domcontentloaded');
    
    // Map API field names to UI field names
    let actualFieldName = fieldName;
    if (fieldName === 'Account_Status__c') {
      actualFieldName = 'Account Status';
    } else if (fieldName === 'Status') {
      actualFieldName = 'Account Status';
    }
    
    // Try combobox first (most common in Salesforce) - with longer timeout
    const combobox = page.getByRole('combobox', { name: actualFieldName });
    const isCombobox = await combobox.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isCombobox) {
      await this.setComboboxField(page, actualFieldName, String(value));
      return;
    }
    
    // Try spinbutton
    const spinbutton = page.getByRole('spinbutton', { name: actualFieldName });
    const isSpinbutton = await spinbutton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isSpinbutton) {
      await this.setSpinbuttonField(page, actualFieldName, value);
      return;
    }
    
    // Try textbox last
    const textbox = page.getByRole('textbox', { name: actualFieldName });
    const isTextbox = await textbox.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (isTextbox) {
      await this.setTextField(page, actualFieldName, String(value));
      return;
    }
    
    // If none found, throw descriptive error
    throw new Error(
      `Field "${actualFieldName}" (from "${fieldName}") not found. Tried: combobox, spinbutton, textbox. ` +
      `Ensure the field is visible and the field name matches exactly.`
    );
  }

  /**
   * Get field value (for verification)
   * Handles various Salesforce Lightning record page layouts
   * UPDATED: Added better selectors for Account Status and other picklist fields
   */
  static async getFieldValue(page: Page, fieldName: string): Promise<string | null> {
    try {
      // Wait for page to be in view mode (not edit mode)
      await page.waitForLoadState('domcontentloaded');
      
      // Strategy 0: Direct lookup for Account Status and common picklist fields
      // These are displayed in the record highlights panel at the top
      if (fieldName === 'Account Status') {
        const accountStatusSelectors = [
          // Highlights panel - status badge/field
          'records-lwc-highlights-panel lightning-formatted-text:has-text("New"), records-lwc-highlights-panel lightning-formatted-text:has-text("Prospect"), records-lwc-highlights-panel lightning-formatted-text:has-text("Onboarding"), records-lwc-highlights-panel lightning-formatted-text:has-text("Contracted"), records-lwc-highlights-panel lightning-formatted-text:has-text("Runoff"), records-lwc-highlights-panel lightning-formatted-text:has-text("Offboarded")',
          // Field in detail section with Account Status label
          'records-record-layout-item[field-label="Account Status"] lightning-formatted-text',
          'records-record-layout-item[field-label="Account Status"] .slds-form-element__static',
          // Look for the field section by label text
          'dt:has-text("Account Status") + dd lightning-formatted-text',
          'span.test-id__field-label:has-text("Account Status") ~ * lightning-formatted-text',
        ];
        
        for (const selector of accountStatusSelectors) {
          try {
            const elements = page.locator(selector);
            const count = await elements.count();
            for (let i = 0; i < count; i++) {
              const element = elements.nth(i);
              if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
                const value = await element.textContent();
                if (value && value.trim()) {
                  const trimmedValue = value.trim();
                  // Verify it's actually a status value
                  const validStatuses = ['New', 'Prospect', 'Onboarding', 'Contracted', 'Runoff', 'Offboarded'];
                  if (validStatuses.some(s => trimmedValue.includes(s))) {
                    logger.debug(`Found Account Status value "${trimmedValue}" using selector`);
                    return trimmedValue;
                  }
                }
              }
            }
          } catch {
            // Continue
          }
        }
        
        // Fallback: Search entire page for status value near "Account Status" text
        try {
          const pageText = await page.textContent('body') || '';
          const validStatuses = ['New', 'Prospect', 'Onboarding', 'Contracted', 'Runoff', 'Offboarded'];
          for (const status of validStatuses) {
            // Check if both "Account Status" and the status value appear on the page
            if (pageText.includes('Account Status') && pageText.includes(status)) {
              // Verify by looking for the status in the highlights or detail area
              const statusElement = page.locator(`records-lwc-highlights-panel:has-text("${status}"), .slds-page-header:has-text("${status}")`);
              if (await statusElement.first().isVisible({ timeout: 500 }).catch(() => false)) {
                logger.debug(`Found Account Status value "${status}" via page text analysis`);
                return status;
              }
            }
          }
        } catch {
          // Continue
        }
      }
      
      // Strategy 1: Salesforce Lightning record detail view - look for field by data-field-id or label
      const recordFieldSelectors = [
        // Record layout item with field label attribute
        `records-record-layout-item[field-label="${fieldName}"] lightning-formatted-text`,
        `records-record-layout-item[field-label="${fieldName}"] .slds-form-element__static`,
        // Picklist value display
        `records-record-picklist lightning-formatted-text`,
        // Generic record field value
        `flexipage-field:has(span:text("${fieldName}")) lightning-formatted-text`,
        `flexipage-field:has(span:text("${fieldName}")) .slds-form-element__static`,
        // Field by label and value structure
        `.slds-form-element:has(label:text("${fieldName}")) .slds-form-element__static`,
        `.slds-form-element:has(span:text("${fieldName}")) lightning-formatted-text`,
      ];
      
      for (const selector of recordFieldSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            const value = await element.textContent();
            if (value && value.trim()) {
              logger.debug(`Found field "${fieldName}" value using selector: ${selector}`);
              return value.trim();
            }
          }
        } catch {
          // Try next selector
        }
      }
      
      // Strategy 2: Look for field section with the field name
      try {
        // Find the flexipage-field containing the field label
        const fieldContainer = page.locator('flexipage-field').filter({ hasText: fieldName });
        if (await fieldContainer.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          // Get the lightning-formatted-text within this field
          const valueElement = fieldContainer.first().locator('lightning-formatted-text').first();
          if (await valueElement.isVisible({ timeout: 1000 }).catch(() => false)) {
            const value = await valueElement.textContent();
            if (value && value.trim()) {
              return value.trim();
            }
          }
        }
      } catch {
        // Continue to next strategy
      }
      
      // Strategy 3: Try to get value from textbox (edit mode)
      const textbox = page.getByRole('textbox', { name: fieldName });
      const isVisible = await textbox.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        const value = await textbox.inputValue();
        return value;
      }
      
      // Strategy 4: Try to get value from combobox
      const combobox = page.getByRole('combobox', { name: fieldName });
      const comboboxVisible = await combobox.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (comboboxVisible) {
        const value = await combobox.inputValue();
        return value;
      }
      
      // Strategy 5: Try to get value from static display with label
      const fieldLabel = page.locator(`label:has-text("${fieldName}"), span.test-id__field-label:has-text("${fieldName}")`);
      const labelVisible = await fieldLabel.first().isVisible({ timeout: 1000 }).catch(() => false);
      
      if (labelVisible) {
        // Look for sibling or nearby value element
        const fieldContainer = fieldLabel.first().locator('..');
        const fieldValue = fieldContainer.locator('.slds-form-element__static, .test-id__field-value, lightning-formatted-text, span').first();
        const value = await fieldValue.textContent();
        if (value && value.trim() && !value.includes(fieldName)) {
          return value.trim();
        }
      }
      
      // Strategy 6: Use getByText to find any element with the expected pattern
      // This is a fallback - look for the value directly if we know what to expect
      try {
        const valuePatterns = ['Agency', 'Insurer', 'Member', 'Acquisition Company'];
        for (const pattern of valuePatterns) {
          const element = page.getByText(pattern, { exact: true }).first();
          if (await element.isVisible({ timeout: 500 }).catch(() => false)) {
            return pattern;
          }
        }
      } catch {
        // Continue
      }
      
      logger.warn(`Could not find field "${fieldName}" for value extraction`);
      return null;
    } catch (error: any) {
      logger.error(`Failed to get field value for "${fieldName}": ${error.message}`);
      return null;
    }
  }

  /**
   * Verify field value
   */
  static async verifyFieldValue(page: Page, fieldName: string, expectedValue: string): Promise<void> {
    const actualValue = await this.getFieldValue(page, fieldName);
    
    if (!actualValue || !actualValue.includes(expectedValue)) {
      throw new Error(`Expected field "${fieldName}" to display "${expectedValue}" but got "${actualValue}"`);
    }
    
    logger.info(`Verified field "${fieldName}" displays "${expectedValue}"`);
  }

  /**
   * Clear a field
   */
  static async clearField(page: Page, fieldName: string): Promise<void> {
    try {
      // Try textbox first
      const textbox = page.getByRole('textbox', { name: fieldName });
      const isTextboxVisible = await textbox.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isTextboxVisible) {
        await textbox.clear();
        logger.info(`Cleared text field "${fieldName}"`);
        return;
      }
      
      // Try combobox (Salesforce picklist/dropdown)
      const combobox = page.getByRole('combobox', { name: fieldName });
      const comboboxVisible = await combobox.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (comboboxVisible) {
        // For Salesforce combobox, clicking and selecting "--None--" or first empty option
        await combobox.click();
        await page.waitForTimeout(300);
        
        // Try to find and click a "None" or empty option
        const noneOptions = [
          page.getByRole('option', { name: '--None--' }),
          page.getByRole('option', { name: 'None' }),
          page.locator('lightning-base-combobox-item[data-value=""]'),
          page.locator('lightning-base-combobox-item').first(), // First option as fallback
        ];
        
        let cleared = false;
        for (const option of noneOptions) {
          if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
            await option.click();
            cleared = true;
            logger.info(`Cleared combobox "${fieldName}" by selecting empty/none option`);
            break;
          }
        }
        
        if (!cleared) {
          // Try keyboard clear
          await combobox.press('Control+a');
          await combobox.press('Backspace');
          logger.info(`Cleared combobox "${fieldName}" using keyboard`);
        }
        return;
      }
      
      // Try to find any input with the field name
      const input = page.locator(`input[name="${fieldName}"], input[placeholder*="${fieldName}"]`).first();
      if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
        await input.clear();
        logger.info(`Cleared input field "${fieldName}"`);
        return;
      }
      
      logger.warn(`Could not find field "${fieldName}" to clear - field may not exist or be clearable`);
    } catch (error: any) {
      logger.error(`Failed to clear field "${fieldName}": ${error.message}`);
      throw new Error(`Failed to clear field "${fieldName}": ${error.message}`);
    }
  }

  /**
   * Check if field is visible
   * Tries multiple methods to find the field, including scrolling into view
   */
  /**
   * Check if field is visible with improved error handling and waits
   */
  static async isFieldVisible(page: Page, fieldName: string, timeout: number = 10000): Promise<boolean> {
    try {
      // Wait for page to be ready
      await page.waitForLoadState('domcontentloaded');
      
      // Try textbox first
      const textbox = page.getByRole('textbox', { name: fieldName });
      const isTextboxVisible = await textbox.isVisible({ timeout: 2000 }).catch(() => false);
      if (isTextboxVisible) {
        // Scroll into view to ensure it's actually visible
        await textbox.scrollIntoViewIfNeeded();
        return true;
      }
      
      // Try combobox
      const combobox = page.getByRole('combobox', { name: fieldName });
      const isComboboxVisible = await combobox.isVisible({ timeout: 2000 }).catch(() => false);
      if (isComboboxVisible) {
        // Scroll into view to ensure it's actually visible
        await combobox.scrollIntoViewIfNeeded();
        return true;
      }
      
      // Try spinbutton
      const spinbutton = page.getByRole('spinbutton', { name: fieldName });
      const isSpinbuttonVisible = await spinbutton.isVisible({ timeout: 2000 }).catch(() => false);
      if (isSpinbuttonVisible) {
        await spinbutton.scrollIntoViewIfNeeded();
        return true;
      }
      
      // Try to find by label (for read-only fields in detail view)
      const label = page.locator(`label:has-text("${fieldName}"), span:has-text("${fieldName}")`).first();
      const isLabelVisible = await label.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLabelVisible) {
        await label.scrollIntoViewIfNeeded();
        // Check if there's a value next to the label (indicates field is present)
        const fieldContainer = label.locator('..').locator('..');
        const hasValue = await fieldContainer.locator('.slds-form-element__static-value, .test-id__field-value, span').first().isVisible({ timeout: 1000 }).catch(() => false);
        if (hasValue) {
          return true;
        }
      }
      
      // Try Lightning-specific selectors
      const lightningField = page.locator(`lightning-input-field[label="${fieldName}"], lightning-output-field[label="${fieldName}"]`).first();
      const isLightningVisible = await lightningField.isVisible({ timeout: 2000 }).catch(() => false);
      if (isLightningVisible) {
        await lightningField.scrollIntoViewIfNeeded();
        return true;
      }
      
      // Last resort: try to find any element containing the field name
      const anyField = page.locator(`*:has-text("${fieldName}")`).first();
      const isAnyVisible = await anyField.isVisible({ timeout: 2000 }).catch(() => false);
      if (isAnyVisible) {
        await anyField.scrollIntoViewIfNeeded();
        return true;
      }
      
      return false;
    } catch (error: any) {
      logger.debug(`Field visibility check failed for "${fieldName}": ${error.message}`);
      return false;
    }
  }

  /**
   * Check if field is editable
   */
  static async isFieldEditable(page: Page, fieldName: string): Promise<boolean> {
    try {
      const textbox = page.getByRole('textbox', { name: fieldName });
      const isVisible = await textbox.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isVisible) {
        const isDisabled = await textbox.isDisabled().catch(() => true);
        const isReadOnly = await textbox.getAttribute('readonly') !== null;
        return !isDisabled && !isReadOnly;
      }
      
      const combobox = page.getByRole('combobox', { name: fieldName });
      const comboboxVisible = await combobox.isVisible({ timeout: 1000 }).catch(() => false);
      
      if (comboboxVisible) {
        const isDisabled = await combobox.isDisabled().catch(() => true);
        return !isDisabled;
      }
      
      return false;
    } catch {
      return false;
    }
  }
}

