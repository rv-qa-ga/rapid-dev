/**
 * SF-574 Step Definitions - UI
 * Delete Member Qualification Action Plan field on the lead
 * 
 * NOTE: These steps are UI-specific for field deletion verification
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { config } from '../../../config/config';

// ============================================================================
// NAVIGATION STEPS
// ============================================================================

/**
 * Navigate to Lead object setup page
 * 
 * Example:
 *   When I navigate to the Lead object setup page
 */
When('I navigate to the Lead object setup page', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }
  
  // Get instance URL - ensure it's in Lightning format
  let instanceUrl = this.testContext.instanceUrl || process.env.SF_INSTANCE_URL;
  if (!instanceUrl) {
    const sfConfig = config.getSalesforceConfig();
    instanceUrl = sfConfig.baseUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
  } else {
    instanceUrl = instanceUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
  }
  
  const setupUrl = `${instanceUrl}/lightning/setup/ObjectManager/Lead/FieldsAndRelationships/view`;
  logger.info(`Navigating to Lead object setup page: ${setupUrl}`);
  
  await this.page.goto(setupUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  
  logger.info('✅ Successfully navigated to Lead object setup page');
});

/**
 * Inspect the fields for an object
 * This step loads field metadata from the setup page
 * 
 * Example:
 *   And I inspect the fields for "Lead"
 */
When('I inspect the fields for {string}', async function (this: AutomationWorld, objectName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Wait for the fields list to load
  await this.page.waitForSelector('table.list, .slds-table, [data-aura-class="forceListManager"]', { timeout: 15000 }).catch(() => {
    logger.warn('Fields table not found - page may have loaded differently');
  });
  
  // Extract field names from the page
  const fieldNames: string[] = [];
  
  // Try multiple selectors for field names
  const fieldSelectors = [
    'a[href*="/FieldAndRelationships/view"]',
    'th a[href*="/FieldAndRelationships/view"]',
    '.slds-table tbody tr td:first-child a',
    'table.list tbody tr td:first-child a',
  ];
  
  for (const selector of fieldSelectors) {
    const fields = await this.page.locator(selector).all();
    if (fields.length > 0) {
      for (const field of fields) {
        const fieldText = await field.textContent().catch(() => '');
        if (fieldText) {
          fieldNames.push(fieldText.trim());
        }
      }
      break;
    }
  }
  
  // Also try to get API names from links
  const apiNames: string[] = [];
  const fieldLinks = await this.page.locator('a[href*="/FieldAndRelationships/view"]').all();
  for (const link of fieldLinks) {
    const href = await link.getAttribute('href').catch(() => '');
    if (href) {
      const match = href.match(/\/view\/([^/]+)/);
      if (match && match[1]) {
        apiNames.push(match[1]);
      }
    }
  }
  
  // Store in context for later steps
  this.testContext.fieldsMetadata = fieldNames.map((name, index) => ({
    name: apiNames[index] || name,
    label: name,
  }));
  
  logger.info(`✅ Inspected fields for ${objectName}: Found ${fieldNames.length} fields`);
  logger.debug(`Field names: ${fieldNames.slice(0, 10).join(', ')}${fieldNames.length > 10 ? '...' : ''}`);
});

// ============================================================================
// FIELD EXISTENCE VERIFICATION
// ============================================================================

/**
 * Verify that a field does not exist on the setup page (UI version)
 * 
 * Example:
 *   Then the "Member_Qualification_Action_Plan__c" field should not exist on the setup page
 */
Then('the {string} field should not exist on the setup page', async function (this: AutomationWorld, fieldName: string) {
  const fields = this.testContext.fieldsMetadata;
  if (!fields || fields.length === 0) {
    // If metadata not loaded, try to check the page directly
    logger.warn('Field metadata not in context - checking page directly');
    
    // Check if field name appears anywhere on the page
    const pageContent = await this.page!.textContent('body').catch(() => '');
    const fieldApiName = fieldName.includes('__c') ? fieldName : `${fieldName}__c`;
    
    if (pageContent && (pageContent.includes(fieldName) || pageContent.includes(fieldApiName))) {
      throw new Error(`Field "${fieldName}" appears on the setup page but should have been deleted`);
    }
    
    logger.info(`✅ Field "${fieldName}" correctly does not exist (not found on page)`);
    return;
  }
  
  // Check by API name or label
  const fieldExists = fields.some((f: any) => 
    f.name === fieldName || 
    f.name === fieldName.replace(/\s+/g, '_') + '__c' ||
    f.label === fieldName ||
    f.label.toLowerCase() === fieldName.toLowerCase()
  );
  
  if (fieldExists) {
    throw new Error(`Field "${fieldName}" exists but should have been deleted`);
  }
  
  logger.info(`✅ Field "${fieldName}" correctly does not exist (deleted)`);
});

// ============================================================================
// TEST DATA CREATION
// ============================================================================

/**
 * Create a Lead record with a specific status
 * 
 * Example:
 *   Given I have an existing Lead record with status "New"
 */
Given('I have an existing Lead record with status {string}', async function (this: AutomationWorld, status: string) {
  await testDataFactory.initialize();
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  const lead = await testDataFactory.createLead({ 
    FirstName: uniqueId,
    LastName: `Lead_${timestamp}`, 
    Company: `Test Company_${timestamp}`,
    Email: `${uniqueId.toLowerCase()}@test.example.com`,
    Phone: '+1-555-0100',
    Region__c: 'EU', // Required field
    Type__c: 'Member', // Required field - Lead Type
    Status: status, // Set the status
  });
  
  this.testContext.recordId = lead.id;
  this.testContext.recordType = 'Lead';
  this.testContext.leadId = lead.id;
  this.testContext.leadName = lead.name;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`✅ Created Lead record with status "${status}": ${lead.id}`);
});

// ============================================================================
// VALIDATION ERROR VERIFICATION
// ============================================================================

/**
 * Verify no validation errors are displayed
 * 
 * Example:
 *   Then no validation errors should be displayed
 */
Then('no validation errors should be displayed', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Check for validation error messages
  const errorSelectors = [
    '.slds-form-element__help',
    '.slds-text-color_error',
    '[data-aura-class="forcePageError"]',
    'div:has-text("error"):has-text("required")',
    'div:has-text("Error")',
    '.slds-notify--error',
    '.forceFormMessageDisplay',
  ];
  
  let errorFound = false;
  const errorTexts: string[] = [];
  
  for (const selector of errorSelectors) {
    const errorElements = await this.page.locator(selector).all();
    for (const element of errorElements) {
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        const errorText = await element.textContent().catch(() => '');
        if (errorText && errorText.trim()) {
          errorTexts.push(errorText.trim());
          errorFound = true;
        }
      }
    }
  }
  
  if (errorFound) {
    throw new Error(`Validation errors are displayed but should not be: ${errorTexts.join('; ')}`);
  }
  
  logger.info('✅ No validation errors displayed (as expected)');
});

/**
 * Verify no validation errors reference a specific field API name
 * 
 * Example:
 *   Then no validation errors should reference "Member_Qualification_Action_Plan__c"
 */
Then('no validation errors should reference {string}', async function (this: AutomationWorld, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Get page content
  const pageContent = await this.page.textContent('body').catch(() => '') || '';
  
  // Check for validation error messages
  const errorSelectors = [
    '.slds-form-element__help',
    '.slds-text-color_error',
    '[data-aura-class="forcePageError"]',
    '.slds-notify--error',
    '.forceFormMessageDisplay',
    '[role="alert"]',
  ];
  
  const errorTexts: string[] = [];
  
  for (const selector of errorSelectors) {
    const errorElements = await this.page.locator(selector).all();
    for (const element of errorElements) {
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        const errorText = await element.textContent().catch(() => '');
        if (errorText && errorText.trim()) {
          errorTexts.push(errorText.trim());
        }
      }
    }
  }
  
  // Check if any error text references the field
  const allErrorText = [...errorTexts, pageContent].join(' ');
  const fieldApiName = fieldName.includes('__c') ? fieldName : `${fieldName}__c`;
  
  if (allErrorText.includes(fieldName) || allErrorText.includes(fieldApiName)) {
    throw new Error(`Validation error references "${fieldName}": ${errorTexts.filter(t => t.includes(fieldName) || t.includes(fieldApiName)).join('; ')}`);
  }
  
  logger.info(`✅ No validation errors reference "${fieldName}" (as expected)`);
});

/**
 * Verify no validation errors mention a specific field label
 * 
 * Example:
 *   Then no validation errors should mention "Member Qualification Action Plan"
 */
Then('no validation errors should mention {string}', async function (this: AutomationWorld, fieldLabel: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  
  // Get page content
  const pageContent = await this.page.textContent('body').catch(() => '') || '';
  
  // Check for validation error messages
  const errorSelectors = [
    '.slds-form-element__help',
    '.slds-text-color_error',
    '[data-aura-class="forcePageError"]',
    '.slds-notify--error',
    '.forceFormMessageDisplay',
    '[role="alert"]',
  ];
  
  const errorTexts: string[] = [];
  
  for (const selector of errorSelectors) {
    const errorElements = await this.page.locator(selector).all();
    for (const element of errorElements) {
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      if (isVisible) {
        const errorText = await element.textContent().catch(() => '');
        if (errorText && errorText.trim()) {
          errorTexts.push(errorText.trim());
        }
      }
    }
  }
  
  // Check if any error text mentions the field label
  const allErrorText = [...errorTexts, pageContent].join(' ');
  
  if (allErrorText.toLowerCase().includes(fieldLabel.toLowerCase())) {
    throw new Error(`Validation error mentions "${fieldLabel}": ${errorTexts.filter(t => t.toLowerCase().includes(fieldLabel.toLowerCase())).join('; ')}`);
  }
  
  logger.info(`✅ No validation errors mention "${fieldLabel}" (as expected)`);
});
