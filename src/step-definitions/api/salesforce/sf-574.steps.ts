/**
 * SF-574 Step Definitions - API
 * Delete Member Qualification Action Plan field on the lead
 * 
 * NOTE: These steps are API-specific for field deletion verification
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';

// ============================================================================
// RESPONSE VERIFICATION STEPS
// ============================================================================

/**
 * Verify that the API response does not contain a specific field or value
 * 
 * Example:
 *   Then the response should not contain "Member_Qualification_Action_Plan__c"
 */
Then('the response should not contain {string}', async function (this: AutomationWorld, searchText: string) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found in test context');
  }
  
  const responseData = await response.json();
  const responseString = JSON.stringify(responseData);
  
  if (responseString.includes(searchText)) {
    throw new Error(`Response contains "${searchText}" but should not`);
  }
  
  logger.info(`✅ Verified response does not contain "${searchText}"`);
});

// ============================================================================
// LEAD STATUS VERIFICATION
// ============================================================================

/**
 * Verify Lead status via API
 * 
 * Example:
 *   Then the Lead status should be "Funnel"
 */
Then('the Lead status should be {string}', async function (this: AutomationWorld, expectedStatus: string) {
  const leadId = this.testContext.leadId;
  if (!leadId) {
    throw new Error('No Lead ID found in test context');
  }
  
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  const lead = await apiClient.getRecord('Lead', leadId);
  const actualStatus = lead.Status;
  
  if (actualStatus !== expectedStatus) {
    throw new Error(`Lead status mismatch. Expected: ${expectedStatus}, Got: ${actualStatus}`);
  }
  
  logger.info(`✅ Lead status is "${expectedStatus}"`);
});

// ============================================================================
// VALIDATION ERROR VERIFICATION
// ============================================================================

/**
 * Verify no validation errors occurred during API operation
 * 
 * Example:
 *   Then no validation errors should occur
 */
Then('no validation errors should occur', async function (this: AutomationWorld) {
  const apiError = this.testContext.apiError;
  
  if (apiError) {
    // Check if it's a validation error
    const errorMessage = apiError.message || JSON.stringify(apiError);
    if (errorMessage.includes('validation') || errorMessage.includes('FIELD_CUSTOM_VALIDATION_EXCEPTION')) {
      throw new Error(`Validation error occurred: ${errorMessage}`);
    }
    // If it's a different error, that's also a problem
    throw new Error(`API error occurred: ${errorMessage}`);
  }
  
  logger.info('✅ No validation errors occurred');
});

// ============================================================================
// LEAD CONVERSION VERIFICATION
// ============================================================================

/**
 * Verify Lead conversion was successful
 * 
 * Example:
 *   Then the Lead should be converted successfully
 */
Then('the Lead should be converted successfully', async function (this: AutomationWorld) {
  const leadId = this.testContext.leadId;
  if (!leadId) {
    throw new Error('No Lead ID found in test context');
  }
  
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  // Check if Lead is converted (IsConverted = true)
  const lead = await apiClient.getRecord('Lead', leadId);
  
  if (!lead.IsConverted) {
    throw new Error('Lead was not converted (IsConverted = false)');
  }
  
  // Verify Account was created
  if (!this.testContext.accountId) {
    throw new Error('Account ID not found after conversion - conversion may have failed');
  }
  
  logger.info(`✅ Lead converted successfully. Account ID: ${this.testContext.accountId}`);
});

// ============================================================================
// VALIDATION RULE VERIFICATION
// ============================================================================

/**
 * Describe Lead object validation rules via API
 * 
 * Example:
 *   When I describe the Lead object validation rules
 */
When('I describe the Lead object validation rules', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  
  try {
    // Use Tooling API to query validation rules
    const query = `SELECT Id, FullName, Metadata FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'Lead'`;
    const result = await apiClient.query(query);
    
    // Store validation rules in context
    this.testContext.validationRules = result.records || [];
    this.testContext.lastResponse = {
      status: () => 200,
      json: async () => result,
    };
    
    logger.info(`✅ Retrieved ${this.testContext.validationRules.length} validation rule(s) for Lead`);
  } catch (error: any) {
    logger.error(`Failed to retrieve validation rules: ${error.message}`);
    throw error;
  }
});

/**
 * Verify no validation rules reference a specific field API name
 * 
 * Example:
 *   Then no validation rules should reference "Member_Qualification_Action_Plan__c"
 */
Then('no validation rules should reference {string}', async function (this: AutomationWorld, fieldName: string) {
  const validationRules = this.testContext.validationRules;
  if (!validationRules || validationRules.length === 0) {
    logger.warn('No validation rules found - this may be expected if no rules exist');
    return;
  }
  
  const fieldApiName = fieldName.includes('__c') ? fieldName : `${fieldName}__c`;
  const referencingRules: any[] = [];
  
  for (const rule of validationRules) {
    const errorConditionFormula = rule.ErrorConditionFormula || '';
    const errorMessage = rule.ErrorMessage || '';
    const fullName = rule.FullName || '';
    
    // Check if rule references the field
    if (
      errorConditionFormula.includes(fieldName) ||
      errorConditionFormula.includes(fieldApiName) ||
      errorMessage.includes(fieldName) ||
      errorMessage.includes(fieldApiName) ||
      fullName.includes(fieldName) ||
      fullName.includes(fieldApiName)
    ) {
      referencingRules.push({
        name: fullName,
        errorMessage: errorMessage,
      });
    }
  }
  
  if (referencingRules.length > 0) {
    const ruleNames = referencingRules.map(r => r.name).join(', ');
    throw new Error(`Found ${referencingRules.length} validation rule(s) that reference "${fieldName}": ${ruleNames}`);
  }
  
  logger.info(`✅ No validation rules reference "${fieldName}"`);
});

/**
 * Verify no validation rules mention a specific field label
 * 
 * Example:
 *   Then no validation rules should mention "Member Qualification Action Plan"
 */
Then('no validation rules should mention {string}', async function (this: AutomationWorld, fieldLabel: string) {
  const validationRules = this.testContext.validationRules;
  if (!validationRules || validationRules.length === 0) {
    logger.warn('No validation rules found - this may be expected if no rules exist');
    return;
  }
  
  const mentioningRules: any[] = [];
  
  for (const rule of validationRules) {
    const errorConditionFormula = rule.ErrorConditionFormula || '';
    const errorMessage = rule.ErrorMessage || '';
    const fullName = rule.FullName || '';
    
    // Check if rule mentions the field label (case-insensitive)
    if (
      errorConditionFormula.toLowerCase().includes(fieldLabel.toLowerCase()) ||
      errorMessage.toLowerCase().includes(fieldLabel.toLowerCase()) ||
      fullName.toLowerCase().includes(fieldLabel.toLowerCase())
    ) {
      mentioningRules.push({
        name: fullName,
        errorMessage: errorMessage,
      });
    }
  }
  
  if (mentioningRules.length > 0) {
    const ruleNames = mentioningRules.map(r => r.name).join(', ');
    throw new Error(`Found ${mentioningRules.length} validation rule(s) that mention "${fieldLabel}": ${ruleNames}`);
  }
  
  logger.info(`✅ No validation rules mention "${fieldLabel}"`);
});
