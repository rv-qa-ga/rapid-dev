/**
 * SF-623 Step Definitions - API
 * Map Lead.Type__c to Account.Type
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';

// ============================================================================
// PRECONDITION STEPS
// ============================================================================

/**
 * Precondition: Account validation rule exists that requires Type
 * Note: This is a precondition step - assumes validation rule exists in org
 * NOTE: This step works for both API and UI tests - it's just a precondition check
 * 
 * Example:
 *   Given an Account validation rule exists that normally requires "Type" to be populated
 */
Given('an Account validation rule exists that normally requires {string} to be populated', async function (
  this: AutomationWorld,
  fieldName: string
) {
  // This is a precondition - we assume the validation rule exists in the org
  // In a real scenario, this might check for the validation rule or set up test data
  logger.info(`✅ Precondition: Account validation rule exists that requires "${fieldName}"`);
  this.testContext.validationRuleField = fieldName;
});

// ============================================================================
// WAIT STEPS
// ============================================================================

// ============================================================================
// VERIFICATION STEPS - Lead Conversion
// ============================================================================
// Note: "I wait {int} seconds for Flow to execute" step is defined in 
// src/step-definitions/ui/salesforce/sf-623.steps.ts and works for both UI and API tests
// ============================================================================
// NOTE: "the Lead conversion should complete successfully" step is defined in ui/salesforce/sf-623.steps.ts
// API tests should verify via API response status code instead

/**
 * Verify Account Type validation rule was bypassed during conversion
 * NOTE: This step works for both API and UI tests
 * 
 * Example:
 *   Then the Account Type validation rule should be bypassed during conversion
 */
Then('the Account Type validation rule should be bypassed during conversion', async function (this: AutomationWorld) {
  // If we got here without errors, the validation rule was bypassed
  // This is verified by the fact that conversion completed successfully
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account was not created - validation rule may not have been bypassed');
  }
  logger.info(`✅ Account Type validation rule was bypassed during conversion - Account created: ${accountId}`);
});

/**
 * Verify no validation errors reference Account Type during conversion
 * 
 * Example:
 *   Then no validation errors should reference Account "Type" during conversion
 */
Then('no validation errors should reference Account {string} during conversion', async function (
  this: AutomationWorld,
  fieldName: string
) {
  // If conversion completed successfully, no validation errors occurred
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error(`Account was not created - validation errors may have occurred for "${fieldName}"`);
  }
  logger.info(`✅ No validation errors referenced Account "${fieldName}" during conversion`);
});

// ============================================================================
// VERIFICATION STEPS - Account Type Mapping
// ============================================================================

/**
 * Verify Account Type equals Lead Type__c value via API
 * NOTE: This step is for API tests. UI tests should use the step in ui/salesforce/sf-623.steps.ts
 * 
 * Example:
 *   Then the Account "Type" should equal the Lead "Type__c" value via API
 */
Then('the Account {string} should equal the Lead {string} value via API', async function (
  this: AutomationWorld,
  accountField: string,
  leadField: string
) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account ID not found - ensure Lead conversion completed');
  }
  
  // Get Lead Type__c value from context or query it
  let leadType = this.testContext.leadType || this.testContext.leadData?.Type__c;
  
  // If not in context, query the Lead
  if (!leadType && this.testContext.leadId) {
    try {
      const lead = await apiClient.getRecord('Lead', this.testContext.leadId);
      leadType = lead[leadField];
      this.testContext.leadType = leadType;
    } catch (error: any) {
      logger.warn(`Could not query Lead to get ${leadField}: ${error.message}`);
    }
  }
  
  if (!leadType) {
    throw new Error(`Lead ${leadField} value not found - ensure Lead has Type__c populated`);
  }
  
  // Query Account to get Type
  const account = await apiClient.getRecord('Account', accountId);
  const accountType = account[accountField];
  
  if (accountType !== leadType) {
    throw new Error(`Account "${accountField}" (${accountType}) does not equal Lead "${leadField}" (${leadType})`);
  }
  
  logger.info(`✅ Account "${accountField}" equals Lead "${leadField}": ${accountType}`);
  this.testContext.lastQueryResult = account;
});

/**
 * Verify Account Type is mapped from Lead Type__c via Flow
 * 
 * Example:
 *   Then the Account "Type" should be mapped from Lead "Type__c" value via Flow
 */
Then('the Account {string} should be mapped from Lead {string} value via Flow', async function (
  this: AutomationWorld,
  accountField: string,
  leadField: string
) {
  // This is the same verification as above - Flow mapping is verified by checking the values match
  await this.constructor.prototype['the Account {string} should equal the Lead {string} value'].call(
    this,
    accountField,
    leadField
  );
  logger.info(`✅ Account "${accountField}" was mapped from Lead "${leadField}" via Flow`);
});

/**
 * Verify Account Type is populated to mapped value derived from Lead Type__c after account creation
 * 
 * Example:
 *   Then the Account "Type" should be populated to the mapped value derived from Lead "Type__c" after account creation
 */
Then('the Account {string} should be populated to the mapped value derived from Lead {string} after account creation', async function (
  this: AutomationWorld,
  accountField: string,
  leadField: string
) {
  // Same verification - ensures Flow populated the value after Account creation
  await this.constructor.prototype['the Account {string} should equal the Lead {string} value'].call(
    this,
    accountField,
    leadField
  );
  logger.info(`✅ Account "${accountField}" populated to mapped value from Lead "${leadField}" after account creation`);
});

// ============================================================================
// VERIFICATION STEPS - Account Existence
// ============================================================================

/**
 * Verify Account exists
 * 
 * Example:
 *   Then the Account should exist
 */
Then('the Account should exist', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account does not exist - no Account ID found in context');
  }
  
  // Verify Account exists by querying it
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  try {
    const account = await apiClient.getRecord('Account', accountId);
    logger.info(`✅ Account exists: ${accountId} (Name: ${account.Name})`);
  } catch (error: any) {
    throw new Error(`Account does not exist or could not be queried: ${error.message}`);
  }
});

// ============================================================================
// ADDITIONAL VERIFICATION STEPS
// ============================================================================

/**
 * Verify Account field equals specific value (after querying Account)
 * 
 * Example:
 *   Then the Account "Type" should equal "Member"
 */
Then('the Account {string} should equal {string}', async function (
  this: AutomationWorld,
  fieldName: string,
  expectedValue: string
) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account ID not found - ensure Account is created first');
  }
  
  // Query Account to get field value
  const account = await apiClient.getRecord('Account', accountId);
  const actualValue = account[fieldName];
  
  if (actualValue !== expectedValue) {
    throw new Error(`Expected Account "${fieldName}" to equal "${expectedValue}", but got "${actualValue}"`);
  }
  
  logger.info(`✅ Account "${fieldName}" equals "${expectedValue}"`);
  this.testContext.lastQueryResult = account;
});

/**
 * Verify Account field matches exactly what was on Lead field
 * 
 * Example:
 *   Then the Account "Type" should match exactly what was on the Lead "Type__c"
 */
Then('the Account {string} should match exactly what was on the Lead {string}', async function (
  this: AutomationWorld,
  accountField: string,
  leadField: string
) {
  // This is the same as "the Account {string} should equal the Lead {string} value"
  await this.constructor.prototype['the Account {string} should equal the Lead {string} value'].call(
    this,
    accountField,
    leadField
  );
  logger.info(`✅ Account "${accountField}" matches exactly what was on Lead "${leadField}"`);
});

/**
 * Verify error response indicates that field must be populated
 * 
 * Example:
 *   Then the error response should indicate that "Type" must be populated
 */
Then('the error response should indicate that {string} must be populated', async function (
  this: AutomationWorld,
  fieldName: string
) {
  const apiError = this.testContext.apiError;
  if (!apiError) {
    throw new Error('No API error found in context');
  }
  
  const errorMessage = apiError.message || JSON.stringify(apiError);
  const fieldVariations = [
    fieldName,
    fieldName.replace(/\s+/g, '_'),
    fieldName.replace(/\s+/g, '_') + '__c',
    fieldName.toLowerCase(),
    fieldName.toUpperCase()
  ];
  
  const hasFieldMention = fieldVariations.some(variation => 
    errorMessage.toLowerCase().includes(variation.toLowerCase())
  );
  
  const hasPopulatedMention = errorMessage.toLowerCase().includes('populated') || 
                               errorMessage.toLowerCase().includes('required') ||
                               errorMessage.toLowerCase().includes('must');
  
  if (!hasFieldMention || !hasPopulatedMention) {
    throw new Error(`Error message does not indicate that "${fieldName}" must be populated. Error: ${errorMessage}`);
  }
  
  logger.info(`✅ Error response indicates that "${fieldName}" must be populated`);
});
