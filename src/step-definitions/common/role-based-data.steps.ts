/**
 * Role-Based Data Step Definitions
 * 
 * Step definitions for creating test data as specific user roles.
 * Integrates with RoleBasedDataFactory and TestDataFactory.
 * 
 * Usage in feature files:
 *   Given I have an Account created as "mrd" user
 *   Given I have a Lead created as "member-operations" user
 *   Given I have a Contact created as "mrd" user
 */

import { Given } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { testDataFactory } from '../../test-data/TestDataFactory';
import { getRoleBasedDataFactory } from '../../test-data/RoleBasedDataFactory';
import { getRoleDataManager } from '../../test-data/helpers/RoleDataManager';
import { logger } from '../../utils/logger';
import { getSFUserRoleFromJira } from '../../utils/user-role-mapping';

// ============================================================================
// ROLE-BASED ACCOUNT CREATION
// ============================================================================

/**
 * Create Account as a specific role
 * 
 * Examples:
 *   Given I have an Account created as "mrd" user
 *   Given I have an Account created as "MRD" user
 *   Given I have an Account created as "member-operations" user
 */
Given(
  /^I have an Account created as "([^"]+)" user$/,
  async function (this: AutomationWorld, roleMention: string) {
    logger.info(`📦 Creating Account as role: ${roleMention}`);

    // Map Jira mention to Salesforce role
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;
    logger.debug(`Mapped "${roleMention}" to Salesforce role: "${sfRole}"`);

    // Generate unique account name
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const accountName = `TestAccount_${uniqueId}_${timestamp}`;

    // Create account with role
    const account = await testDataFactory.createAccount(
      {
        Name: accountName,
        Type: 'Agency',
        Account_Status__c: 'Prospect',
        Functional_Currency__c: 'USD',
        Reporting_Region__c: 'US',
      },
      {
        role: sfRole,
        validateFLS: true,
        scenarioId: this.testContext.scenarioId || `scenario-${Date.now()}`,
      }
    );

    // Store in test context
    this.testContext.recordId = account.id;
    this.testContext.accountId = account.id;
    this.testContext.recordName = account.name;
    this.testContext.accountName = account.name; // Also set accountName for search step

    // Track scenario data
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(
      this.testContext.scenarioId || 'default',
      account.id,
      'Account',
      sfRole
    );

    logger.info(`✅ Created Account ${account.id} as role "${sfRole}"`);
  }
);

/**
 * Create Account as a specific role with custom data
 * 
 * Examples:
 *   Given I have an Account created as "mrd" user with:
 *     | Name              | Test Account MRD |
 *     | Type              | Agency           |
 *     | Account_Status__c | Active           |
 */
Given(
  /^I have an Account created as "([^"]+)" user with:$/,
  async function (this: AutomationWorld, roleMention: string, dataTable: any) {
    logger.info(`📦 Creating Account as role: ${roleMention} with custom data`);

    // Map Jira mention to Salesforce role
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    // Convert data table to object
    const data: Record<string, any> = {};
    for (const row of dataTable.rows()) {
      const [key, value] = row;
      data[key] = value;
    }

    // Ensure Name is set
    if (!data.Name) {
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      data.Name = `TestAccount_${uniqueId}_${timestamp}`;
    }

    // Ensure TestDataFactory is initialized (needed for fallback)
    await testDataFactory.initialize();
    
    // Pass API context if available (for role-based factory)
    if (this.apiContext) {
      testDataFactory.setAPIContext(this.apiContext);
    }

    // Create account with role
    // Note: validateFLS is set to false to allow creation even if user-roles.json is missing
    // FLS validation will still warn but won't block account creation
    const account = await testDataFactory.createAccount(data, {
      role: sfRole,
      validateFLS: false, // Changed to false - will warn but not throw error
      scenarioId: this.testContext.scenarioId || 'default',
    });

    // Store in test context
    this.testContext.recordId = account.id;
    this.testContext.accountId = account.id;
    this.testContext.recordName = account.name;
    this.testContext.accountName = account.name; // Also set accountName for search step

    // Track scenario data
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(
      this.testContext.scenarioId || 'default',
      account.id,
      'Account',
      sfRole
    );

    logger.info(`✅ Created Account ${account.id} as role "${sfRole}" with custom data`);
  }
);

// ============================================================================
// ROLE-BASED LEAD CREATION
// ============================================================================

/**
 * Create Lead as a specific role
 * 
 * Examples:
 *   Given I have a Lead created as "mrd" user
 *   Given I have a Lead created as "member-operations" user
 */
Given(
  /^I have a Lead created as "([^"]+)" user$/,
  async function (this: AutomationWorld, roleMention: string) {
    logger.info(`📦 Creating Lead as role: ${roleMention}`);

    // Map Jira mention to Salesforce role
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    // Generate unique lead name
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const lastName = `TestLead_${uniqueId}_${timestamp}`;

    // Create lead with role
    const lead = await testDataFactory.createLead(
      {
        FirstName: 'Test',
        LastName: lastName,
        Company: `Test Company ${timestamp}`,
      },
      {
        role: sfRole,
        validateFLS: true,
        scenarioId: this.testContext.scenarioId || `scenario-${Date.now()}`,
      }
    );

    // Store in test context
    this.testContext.recordId = lead.id;
    this.testContext.leadId = lead.id;
    this.testContext.recordName = lead.name;

    // Track scenario data
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(
      this.testContext.scenarioId || 'default',
      lead.id,
      'Lead',
      sfRole
    );

    logger.info(`✅ Created Lead ${lead.id} as role "${sfRole}"`);
  }
);

/**
 * Create Lead as a specific role with custom data
 */
Given(
  /^I have a Lead created as "([^"]+)" user with:$/,
  async function (this: AutomationWorld, roleMention: string, dataTable: any) {
    logger.info(`📦 Creating Lead as role: ${roleMention} with custom data`);

    // Map Jira mention to Salesforce role
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    // Convert data table to object
    const data: Record<string, any> = {};
    for (const row of dataTable.rows()) {
      const [key, value] = row;
      data[key] = value;
    }

    // Ensure LastName is set
    if (!data.LastName) {
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      data.LastName = `TestLead_${uniqueId}_${timestamp}`;
    }

    // Create lead with role
    const lead = await testDataFactory.createLead(data, {
      role: sfRole,
      validateFLS: true,
      scenarioId: this.testContext.scenarioId || 'default',
    });

    // Store in test context
    this.testContext.recordId = lead.id;
    this.testContext.leadId = lead.id;
    this.testContext.recordName = lead.name;

    // Track scenario data
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(
      this.testContext.scenarioId || 'default',
      lead.id,
      'Lead',
      sfRole
    );

    logger.info(`✅ Created Lead ${lead.id} as role "${sfRole}" with custom data`);
  }
);

// ============================================================================
// ROLE-BASED CONTACT CREATION
// ============================================================================

/**
 * Create Contact as a specific role
 * 
 * Examples:
 *   Given I have a Contact created as "mrd" user
 *   Given I have a Contact created as "member-operations" user
 */
Given(
  /^I have a Contact created as "([^"]+)" user$/,
  async function (this: AutomationWorld, roleMention: string) {
    logger.info(`📦 Creating Contact as role: ${roleMention}`);

    // Map Jira mention to Salesforce role
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    // Ensure we have an Account
    if (!this.testContext.accountId) {
      // Create a parent account first
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const accountName = `ContactParent_${uniqueId}_${timestamp}`;

      const account = await testDataFactory.createAccount(
        {
          Name: accountName,
          Type: 'Agency',
          Account_Status__c: 'Prospect',
          Functional_Currency__c: 'USD',
          Reporting_Region__c: 'US',
        },
        {
          role: sfRole,
          scenarioId: this.testContext.scenarioId || `scenario-${Date.now()}`,
        }
      );

      this.testContext.accountId = account.id;
      logger.info(`Created parent Account ${account.id} for Contact`);
    }

    // Generate unique contact name
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    const lastName = `TestContact_${uniqueId}_${timestamp}`;

    // Create contact with role
    const contact = await testDataFactory.createContact(
      {
        FirstName: 'Test',
        LastName: lastName,
      },
      this.testContext.accountId!,
      {
        role: sfRole,
        validateFLS: true,
        scenarioId: this.testContext.scenarioId || `scenario-${Date.now()}`,
      }
    );

    // Store in test context
    this.testContext.recordId = contact.id;
    this.testContext.contactId = contact.id;
    this.testContext.recordName = contact.name;

    // Track scenario data
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(
      this.testContext.scenarioId || 'default',
      contact.id,
      'Contact',
      sfRole
    );

    logger.info(`✅ Created Contact ${contact.id} as role "${sfRole}"`);
  }
);

/**
 * Create Contact as a specific role with custom data
 */
Given(
  /^I have a Contact created as "([^"]+)" user with:$/,
  async function (this: AutomationWorld, roleMention: string, dataTable: any) {
    logger.info(`📦 Creating Contact as role: ${roleMention} with custom data`);

    // Map Jira mention to Salesforce role
    const sfRole = getSFUserRoleFromJira(roleMention) || roleMention;

    // Ensure we have an Account
    if (!this.testContext.accountId) {
      // Create a parent account first
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const accountName = `ContactParent_${uniqueId}_${timestamp}`;

      const account = await testDataFactory.createAccount(
        {
          Name: accountName,
          Type: 'Agency',
          Account_Status__c: 'Prospect',
          Functional_Currency__c: 'USD',
          Reporting_Region__c: 'US',
        },
        {
          role: sfRole,
          scenarioId: this.testContext.scenarioId || `scenario-${Date.now()}`,
        }
      );

      this.testContext.accountId = account.id;
      logger.info(`Created parent Account ${account.id} for Contact`);
    }

    // Convert data table to object
    const data: Record<string, any> = {};
    for (const row of dataTable.rows()) {
      const [key, value] = row;
      data[key] = value;
    }

    // Ensure LastName is set
    if (!data.LastName) {
      const timestamp = Date.now();
      const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
      data.LastName = `TestContact_${uniqueId}_${timestamp}`;
    }

    // Create contact with role
    const contact = await testDataFactory.createContact(
      data,
      this.testContext.accountId!,
      {
        role: sfRole,
        validateFLS: true,
        scenarioId: this.testContext.scenarioId || `scenario-${Date.now()}`,
      }
    );

    // Store in test context
    this.testContext.recordId = contact.id;
    this.testContext.contactId = contact.id;
    this.testContext.recordName = contact.name;

    // Track scenario data
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(
      this.testContext.scenarioId || 'default',
      contact.id,
      'Contact',
      sfRole
    );

    logger.info(`✅ Created Contact ${contact.id} as role "${sfRole}" with custom data`);
  }
);

// ============================================================================
// SCENARIO DATA MANAGEMENT
// ============================================================================

/**
 * Mark scenario data as persistent (skip cleanup)
 * 
 * Examples:
 *   Given I mark scenario data as persistent
 */
Given(
  /^I mark scenario data as persistent$/,
  async function (this: AutomationWorld) {
    const scenarioId = this.testContext.scenarioId || `scenario-${Date.now()}`;
    const dataManager = getRoleDataManager();
    dataManager.markScenarioAsPersistent(scenarioId);
    logger.info(`Marked scenario ${scenarioId} data as persistent`);
  }
);

/**
 * Cleanup scenario data
 * 
 * Examples:
 *   Given I cleanup scenario data
 */
Given(
  /^I cleanup scenario data$/,
  async function (this: AutomationWorld) {
    const scenarioId = this.testContext.scenarioId || `scenario-${Date.now()}`;
    const dataManager = getRoleDataManager();
    await dataManager.cleanupScenarioData(scenarioId, this.testContext.apiContext);
    logger.info(`Cleaned up scenario ${scenarioId} data`);
  }
);

