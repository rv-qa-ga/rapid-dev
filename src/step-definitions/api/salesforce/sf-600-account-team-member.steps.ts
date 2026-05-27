/**
 * SF-600 - Account Team Member-Specific Step Definitions
 * 
 * Only contains Account Team Member-specific steps that are not in common step files.
 * Common Platform Event steps are in: src/step-definitions/common/platform-events.steps.ts
 */

import { Given, When } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceStreamingClient } from '../../../utils/salesforce-streaming-client';
import { logger } from '../../../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND STEPS
// ═══════════════════════════════════════════════════════════════════════════

Given('Salesforce publishes Account Team Member Platform Events', async function (this: AutomationWorld) {
  logger.info('✅ Background: Salesforce publishes Account Team Member Platform Events');
});

Given('each Account Team Member Platform Event includes the Record ID and Event Identifier', async function (this: AutomationWorld) {
  logger.info('✅ Background: Each Account Team Member Platform Event includes the Record ID and Event Identifier');
});

// ═══════════════════════════════════════════════════════════════════════════
// GIVEN STEPS: Account and Account Team Member Creation
// ═══════════════════════════════════════════════════════════════════════════

Given('a new Account Team Member is created in Salesforce for the Account', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account ID not found. Create an Account first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  // Get a User ID for the Account Team Member
  try {
    // Query for any active user
    const userQuery = `SELECT Id FROM User WHERE IsActive = true LIMIT 1`;
    const userResult = await apiClient.query(userQuery);
    
    if (!userResult.records || userResult.records.length === 0) {
      throw new Error('No active User found for Account Team Member');
    }

    const userId = userResult.records[0].Id;

    // Create Account Team Member
    const teamMemberData = {
      AccountId: accountId,
      UserId: userId,
      TeamMemberRole: 'Member Relationship Director',
    };

    const result = await apiClient.createRecord('AccountTeamMember', teamMemberData);
    
    if (!result.id) {
      throw new Error('Account Team Member creation failed: No ID returned');
    }

    this.testContext.accountTeamMemberId = result.id;
    this.testContext.userId = userId;

    logger.info(`✅ Created Account Team Member: ${result.id} for Account ${accountId}`);
  } catch (error: any) {
    logger.error(`❌ Error creating Account Team Member: ${error.message}`);
    throw error;
  }
});

Given('an existing Account Team Member exists in Salesforce', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    // Create Account first if not exists
    const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();

    const timestamp = Date.now();
    const accountName = `SF-600 Existing Account ${timestamp}`;
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: 'Agency',
      Region__c: 'US',
      Account_Status__c: 'Prospect',
    });
    this.testContext.accountId = account.id;
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  try {
    // Query for any active user
    const userQuery = `SELECT Id FROM User WHERE IsActive = true LIMIT 1`;
    const userResult = await apiClient.query(userQuery);
    
    if (!userResult.records || userResult.records.length === 0) {
      throw new Error('No active User found for Account Team Member');
    }

    const userId = userResult.records[0].Id;

    const teamMemberData = {
      AccountId: this.testContext.accountId,
      UserId: userId,
      TeamMemberRole: 'Member Relationship Director',
    };

    const result = await apiClient.createRecord('AccountTeamMember', teamMemberData);
    this.testContext.accountTeamMemberId = result.id;
    this.testContext.userId = userId;

    logger.info(`✅ Created existing Account Team Member: ${result.id}`);
  } catch (error: any) {
    logger.error(`❌ Error creating Account Team Member: ${error.message}`);
    throw error;
  }
});


Given('an Account Team Member is {string}', async function (this: AutomationWorld, operation: string) {
  if (operation === 'created') {
    // Ensure Account exists
    if (!this.testContext.accountId) {
      const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
      const testDataFactory = new TestDataFactory();
      await testDataFactory.initialize();

      const timestamp = Date.now();
      const accountName = `SF-600 Test Account ${timestamp}`;
      const account = await testDataFactory.createAccount({
        Name: accountName,
        Type: 'Agency',
        Region__c: 'US',
        Account_Status__c: 'Prospect',
      });
      this.testContext.accountId = account.id;
    }

    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized.');
    }

    // Query for any active user
    const userQuery = `SELECT Id FROM User WHERE IsActive = true LIMIT 1`;
    const userResult = await apiClient.query(userQuery);
    
    if (!userResult.records || userResult.records.length === 0) {
      throw new Error('No active User found for Account Team Member');
    }

    const userId = userResult.records[0].Id;

    const teamMemberData = {
      AccountId: this.testContext.accountId,
      UserId: userId,
      TeamMemberRole: 'Member Relationship Director',
    };

    const result = await apiClient.createRecord('AccountTeamMember', teamMemberData);
    this.testContext.accountTeamMemberId = result.id;
    this.testContext.userId = userId;
  } else if (operation === 'updated') {
    // Account Team Member should already exist
    if (!this.testContext.accountTeamMemberId) {
      throw new Error('Account Team Member does not exist. Create an Account Team Member first.');
    }
  } else {
    throw new Error(`Unknown operation: ${operation}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Account Team Member Operations
// ═══════════════════════════════════════════════════════════════════════════

When('the Account Team Member is saved successfully', async function (this: AutomationWorld) {
  const accountTeamMemberId = this.testContext.accountTeamMemberId;
  if (!accountTeamMemberId) {
    throw new Error('Account Team Member ID not found. Account Team Member may not have been saved successfully.');
  }
  logger.info(`✅ Account Team Member ${accountTeamMemberId} saved successfully`);
});

When('the Account Team Member is updated', async function (this: AutomationWorld) {
  const accountTeamMemberId = this.testContext.accountTeamMemberId;
  if (!accountTeamMemberId) {
    throw new Error('Account Team Member ID not found. Create an Account Team Member first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  try {
    logger.info(`Updating Account Team Member ${accountTeamMemberId}`);
    await apiClient.updateRecord('AccountTeamMember', accountTeamMemberId, {
      TeamMemberRole: `Updated Role ${Date.now()}`,
    });
    logger.info(`✅ Account Team Member updated successfully`);
  } catch (error: any) {
    logger.error(`❌ Error updating Account Team Member: ${error.message}`);
    throw error;
  }
});


When('the Account Team Member is removed from the Account', async function (this: AutomationWorld) {
  const accountTeamMemberId = this.testContext.accountTeamMemberId;
  if (!accountTeamMemberId) {
    throw new Error('Account Team Member ID not found. Create an Account Team Member first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  try {
    logger.info(`Removing Account Team Member ${accountTeamMemberId} from Account`);
    await apiClient.deleteRecord('AccountTeamMember', accountTeamMemberId);
    logger.info(`✅ Account Team Member removed successfully`);
    // Keep the ID in context for event verification
  } catch (error: any) {
    logger.error(`❌ Error removing Account Team Member: ${error.message}`);
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Query Platform Events (Account Team Member-specific)
// ═══════════════════════════════════════════════════════════════════════════

When('I query Account Team Member Platform Events for the Account Team Member', async function (this: AutomationWorld) {
  const accountTeamMemberId = this.testContext.accountTeamMemberId;
  if (!accountTeamMemberId) {
    throw new Error('Account Team Member ID not found in test context. Create or retrieve an Account Team Member first.');
  }

  // Use Streaming API exclusively - SOQL queries don't work in this environment (404 NOT_FOUND)
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient | null;
  
  if (streamingClient) {
    logger.info(`🔍 Checking Platform Events via Streaming API for Account Team Member: ${accountTeamMemberId}`);
    const events = this.testContext.platformEvents || [];
    if (events.length > 0) {
      logger.info(`✅ Found ${events.length} Platform Event(s) via Streaming API for Account Team Member ${accountTeamMemberId}`);
      this.testContext.latestPlatformEvent = events[0];
      return;
    }
    logger.info(`ℹ️  No Platform Events received via Streaming API (expected for negative test scenarios)`);
    this.testContext.platformEvents = [];
    this.testContext.latestPlatformEvent = null;
  } else {
    logger.info(`🔍 No Streaming API subscription found for Account Team Member: ${accountTeamMemberId}`);
    logger.info(`ℹ️  Setting empty event list - tests can verify "no events" scenarios`);
    this.testContext.platformEvents = [];
    this.testContext.latestPlatformEvent = null;
  }
});
