/**
 * Field-Level Security (FLS) Validation Step Definitions
 * 
 * Step definitions for validating field-level security permissions.
 * 
 * Usage in feature files:
 *   Then the "AnnualRevenue" field should be visible for "mrd" user
 *   Then the "AnnualRevenue" field should NOT be visible for "standard" user
 *   Then the "AnnualRevenue" field should be editable for "mrd" user
 *   Then the "AnnualRevenue" field should NOT be editable for "standard" user
 */

import { Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { getFLSValidator } from '../../utils/fls-validator';
import { logger } from '../../utils/logger';
import { getSFUserRoleFromJira } from '../../utils/user-role-mapping';

// ============================================================================
// FIELD VISIBILITY VALIDATION
// ============================================================================

/**
 * Validate that field is visible for a role
 * 
 * Examples:
 *   Then the "AnnualRevenue" field should be visible for "mrd" user
 *   Then the "Phone" field should be visible for "member-operations" user
 */
Then(
  /^the "([^"]+)" field should be visible for "([^"]+)" user$/,
  async function (this: AutomationWorld, fieldName: string, roleMention: string) {
    const objectName = this.testContext.objectType || 'Account';
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    logger.info(`Validating field visibility: ${objectName}.${fieldName} for role "${sfRole}"`);

    const flsValidator = getFLSValidator();
    const isVisible = flsValidator.isFieldVisible(sfRole, objectName, fieldName);

    if (!isVisible) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should be visible for role "${sfRole}", but FLS check shows it is not.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is visible for role "${sfRole}"`);
  }
);

/**
 * Validate that field is NOT visible for a role
 * 
 * Examples:
 *   Then the "AnnualRevenue" field should NOT be visible for "standard" user
 *   Then the "Phone" field should NOT be visible for "read-only" user
 */
Then(
  /^the "([^"]+)" field should NOT be visible for "([^"]+)" user$/,
  async function (this: AutomationWorld, fieldName: string, roleMention: string) {
    const objectName = this.testContext.objectType || 'Account';
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    logger.info(`Validating field NOT visible: ${objectName}.${fieldName} for role "${sfRole}"`);

    const flsValidator = getFLSValidator();
    const isVisible = flsValidator.isFieldVisible(sfRole, objectName, fieldName);

    if (isVisible) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should NOT be visible for role "${sfRole}", but FLS check shows it is visible.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is NOT visible for role "${sfRole}" (as expected)`);
  }
);

// ============================================================================
// FIELD EDITABILITY VALIDATION
// ============================================================================

/**
 * Validate that field is editable for a role
 * 
 * Examples:
 *   Then the "Name" field should be editable for "mrd" user
 *   Then the "Phone" field should be editable for "member-operations" user
 */
Then(
  /^the "([^"]+)" field should be editable for "([^"]+)" user$/,
  async function (this: AutomationWorld, fieldName: string, roleMention: string) {
    const objectName = this.testContext.objectType || 'Account';
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    logger.info(`Validating field editability: ${objectName}.${fieldName} for role "${sfRole}"`);

    const flsValidator = getFLSValidator();
    const isEditable = flsValidator.isFieldEditable(sfRole, objectName, fieldName);

    if (!isEditable) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should be editable for role "${sfRole}", but FLS check shows it is not.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is editable for role "${sfRole}"`);
  }
);

/**
 * Validate that field is NOT editable for a role
 * 
 * Examples:
 *   Then the "AnnualRevenue" field should NOT be editable for "standard" user
 *   Then the "Phone" field should NOT be editable for "read-only" user
 */
Then(
  /^the "([^"]+)" field should NOT be editable for "([^"]+)" user$/,
  async function (this: AutomationWorld, fieldName: string, roleMention: string) {
    const objectName = this.testContext.objectType || 'Account';
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    logger.info(`Validating field NOT editable: ${objectName}.${fieldName} for role "${sfRole}"`);

    const flsValidator = getFLSValidator();
    const isEditable = flsValidator.isFieldEditable(sfRole, objectName, fieldName);

    if (isEditable) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should NOT be editable for role "${sfRole}", but FLS check shows it is editable.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is NOT editable for role "${sfRole}" (as expected)`);
  }
);

// ============================================================================
// FIELD REQUIRED VALIDATION
// ============================================================================

/**
 * Validate that field is required for a role
 * 
 * Examples:
 *   Then the "Name" field should be required for "mrd" user
 */
Then(
  /^the "([^"]+)" field should be required for "([^"]+)" user$/,
  async function (this: AutomationWorld, fieldName: string, roleMention: string) {
    const objectName = this.testContext.objectType || 'Account';
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    logger.info(`Validating field required: ${objectName}.${fieldName} for role "${sfRole}"`);

    const flsValidator = getFLSValidator();
    const isRequired = flsValidator.isFieldRequired(sfRole, objectName, fieldName);

    if (!isRequired) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should be required for role "${sfRole}", but FLS check shows it is not.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is required for role "${sfRole}"`);
  }
);

// ============================================================================
// SENSITIVE DATA CLASSIFICATION VALIDATION
// ============================================================================

/**
 * Validate that field has sensitive data classification
 * 
 * Examples:
 *   Then the "SSN" field should be classified as "PII"
 *   Then the "AnnualRevenue" field should be classified as "Financial"
 */
Then(
  /^the "([^"]+)" field should be classified as "([^"]+)"$/,
  async function (this: AutomationWorld, fieldName: string, classification: string) {
    const objectName = this.testContext.objectType || 'Account';

    logger.info(`Validating sensitive data classification: ${objectName}.${fieldName} as "${classification}"`);

    const flsValidator = getFLSValidator();
    const classifications = flsValidator.getSensitiveDataClassification(objectName, fieldName);

    if (!classifications.includes(classification)) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should be classified as "${classification}", ` +
        `but found classifications: ${classifications.join(', ') || 'none'}`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is classified as "${classification}"`);
  }
);

// ============================================================================
// CURRENT USER CONTEXT VALIDATION
// ============================================================================

/**
 * Validate that field is visible for current user (FLS validation)
 * 
 * NOTE: This step definition is commented out to avoid ambiguity with the generic
 * visibility check in sf-520.steps.ts. The generic step in sf-520.steps.ts now
 * handles both general visibility checks and FLS validation (when a role is present).
 * 
 * For FLS validation, ensure a role is set in the test context first:
 *   Given I am logged in as a "role" user
 *   Then the "Account_Status__c" field should be visible
 * 
 * The generic step will automatically perform FLS validation if a role is present.
 */
// Then(
//   /^the "([^"]+)" field should be visible$/,
//   async function (this: AutomationWorld, fieldName: string) {
//     const objectName = this.testContext.objectType || 'Account';
//     const roleId = this.testContext.userRole || this.testContext.requestedRole;
//
//     if (!roleId) {
//       throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
//     }
//
//     logger.info(`Validating field visibility: ${objectName}.${fieldName} for current role "${roleId}"`);
//
//     const flsValidator = getFLSValidator();
//     const isVisible = flsValidator.isFieldVisible(roleId, objectName, fieldName);
//
//     if (!isVisible) {
//       throw new Error(
//         `Field "${fieldName}" on ${objectName} should be visible for role "${roleId}", but FLS check shows it is not.`
//       );
//     }
//
//     logger.info(`✅ Field "${fieldName}" on ${objectName} is visible for role "${roleId}"`);
//   }
// );

/**
 * Validate that field is NOT visible for current user
 * 
 * Examples:
 *   Then the "AnnualRevenue" field should NOT be visible
 */
Then(
  /^the "([^"]+)" field should NOT be visible$/,
  async function (this: AutomationWorld, fieldName: string) {
    const objectName = this.testContext.objectType || 'Account';
    const roleId = this.testContext.userRole || this.testContext.requestedRole;

    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating field NOT visible: ${objectName}.${fieldName} for current role "${roleId}"`);

    const flsValidator = getFLSValidator();
    const isVisible = flsValidator.isFieldVisible(roleId, objectName, fieldName);

    if (isVisible) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should NOT be visible for role "${roleId}", but FLS check shows it is visible.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is NOT visible for role "${roleId}" (as expected)`);
  }
);

/**
 * Validate that field is editable for current user
 * 
 * Examples:
 *   Then the "Name" field should be editable
 */
Then(
  /^the "([^"]+)" field should be editable$/,
  async function (this: AutomationWorld, fieldName: string) {
    const objectName = this.testContext.objectType || 'Account';
    const roleId = this.testContext.userRole || this.testContext.requestedRole;

    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating field editability: ${objectName}.${fieldName} for current role "${roleId}"`);

    const flsValidator = getFLSValidator();
    const isEditable = flsValidator.isFieldEditable(roleId, objectName, fieldName);

    if (!isEditable) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should be editable for role "${roleId}", but FLS check shows it is not.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is editable for role "${roleId}"`);
  }
);

/**
 * Validate that field is NOT editable for current user
 * 
 * Examples:
 *   Then the "AnnualRevenue" field should NOT be editable
 */
Then(
  /^the "([^"]+)" field should NOT be editable$/,
  async function (this: AutomationWorld, fieldName: string) {
    const objectName = this.testContext.objectType || 'Account';
    const roleId = this.testContext.userRole || this.testContext.requestedRole;

    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating field NOT editable: ${objectName}.${fieldName} for current role "${roleId}"`);

    const flsValidator = getFLSValidator();
    const isEditable = flsValidator.isFieldEditable(roleId, objectName, fieldName);

    if (isEditable) {
      throw new Error(
        `Field "${fieldName}" on ${objectName} should NOT be editable for role "${roleId}", but FLS check shows it is editable.`
      );
    }

    logger.info(`✅ Field "${fieldName}" on ${objectName} is NOT editable for role "${roleId}" (as expected)`);
  }
);

