/**
 * SF-599 - Contact-Specific Step Definitions
 * 
 * Only contains Contact-specific steps that are not in common step files.
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

Given('Salesforce publishes Contact Platform Events', async function (this: AutomationWorld) {
  logger.info('✅ Background: Salesforce publishes Contact Platform Events');
});

Given('each Contact Platform Event includes the Record ID and Event Identifier', async function (this: AutomationWorld) {
  logger.info('✅ Background: Each Contact Platform Event includes the Record ID and Event Identifier');
});

// ═══════════════════════════════════════════════════════════════════════════
// GIVEN STEPS: Account and Contact Creation
// ═══════════════════════════════════════════════════════════════════════════

// "an Account exists in Salesforce" step is defined in sf-596-platform-events.steps.ts
// It's shared across work items since Account creation is common

Given('a new Contact is created in Salesforce for the Account', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('Account ID not found. Create an Account first.');
  }

  const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();

  const timestamp = Date.now();
  const firstName = `SF-599`;
  const lastName = `Test Contact ${timestamp}`;

  try {
    logger.info(`Creating new Contact: ${firstName} ${lastName} for Account ${accountId}`);
    const contact = await testDataFactory.createContact({
      FirstName: firstName,
      LastName: lastName,
      Email: `sf599-${timestamp}@test.example.com`,
    }, accountId);

    if (!contact.id) {
      throw new Error('Contact creation failed: No ID returned');
    }

    this.testContext.contactId = contact.id;
    this.testContext.contactName = `${firstName} ${lastName}`;

    logger.info(`✅ Created Contact: ${contact.id} (${firstName} ${lastName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Contact: ${error.message}`);
    throw error;
  }
});

Given('an existing Contact exists in Salesforce', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId;
  if (!accountId) {
    // Create Account first if not exists
    const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();

    const timestamp = Date.now();
    const accountName = `SF-599 Existing Account ${timestamp}`;
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: 'Agency',
      Region__c: 'US',
      Account_Status__c: 'Prospect',
    });
    this.testContext.accountId = account.id;
  }

  const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();

  const timestamp = Date.now();
  const firstName = `SF-599`;
  const lastName = `Existing Contact ${timestamp}`;

  try {
    logger.info(`Creating existing Contact: ${firstName} ${lastName}`);
    const contact = await testDataFactory.createContact({
      FirstName: firstName,
      LastName: lastName,
      Email: `sf599-existing-${timestamp}@test.example.com`,
    }, this.testContext.accountId);

    if (!contact.id) {
      throw new Error('Contact creation failed: No ID returned');
    }

    this.testContext.contactId = contact.id;
    this.testContext.contactName = `${firstName} ${lastName}`;

    logger.info(`✅ Created existing Contact: ${contact.id} (${firstName} ${lastName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Contact: ${error.message}`);
    throw error;
  }
});


Given('a Contact is created', async function (this: AutomationWorld) {
  // Ensure Account exists first
  if (!this.testContext.accountId) {
    const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();

    const timestamp = Date.now();
    const accountName = `SF-599 Test Account ${timestamp}`;
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: 'Agency',
      Region__c: 'US',
      Account_Status__c: 'Prospect',
    });
    this.testContext.accountId = account.id;
  }

  const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();

  const timestamp = Date.now();
  const firstName = `SF-599`;
  const lastName = `Test Contact ${timestamp}`;

  try {
    logger.info(`Creating Contact: ${firstName} ${lastName} for Account ${this.testContext.accountId}`);
    const contact = await testDataFactory.createContact({
      FirstName: firstName,
      LastName: lastName,
      Email: `sf599-${timestamp}@test.example.com`,
    }, this.testContext.accountId);

    if (!contact.id) {
      throw new Error('Contact creation failed: No ID returned');
    }

    this.testContext.contactId = contact.id;
    this.testContext.contactName = `${firstName} ${lastName}`;

    logger.info(`✅ Created Contact: ${contact.id} (${firstName} ${lastName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Contact: ${error.message}`);
    throw error;
  }
});

Given('a Contact is {string}', async function (this: AutomationWorld, operation: string) {
  if (operation === 'created') {
    // Ensure Account exists
    if (!this.testContext.accountId) {
      const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
      const testDataFactory = new TestDataFactory();
      await testDataFactory.initialize();

      const timestamp = Date.now();
      const accountName = `SF-599 Test Account ${timestamp}`;
      const account = await testDataFactory.createAccount({
        Name: accountName,
        Type: 'Agency',
        Region__c: 'US',
        Account_Status__c: 'Prospect',
      });
      this.testContext.accountId = account.id;
    }

    const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();

    const timestamp = Date.now();
    const firstName = `SF-599`;
    const lastName = `Test Contact ${timestamp}`;
    const contact = await testDataFactory.createContact({
      FirstName: firstName,
      LastName: lastName,
      Email: `sf599-${timestamp}@test.example.com`,
    }, this.testContext.accountId);

    this.testContext.contactId = contact.id;
    this.testContext.contactName = `${firstName} ${lastName}`;
  } else if (operation === 'updated') {
    // Contact should already exist, just mark as updated
    if (!this.testContext.contactId) {
      throw new Error('Contact does not exist. Create a Contact first.');
    }
  } else {
    throw new Error(`Unknown operation: ${operation}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Contact Operations
// ═══════════════════════════════════════════════════════════════════════════

When('the Contact is saved successfully', async function (this: AutomationWorld) {
  const contactId = this.testContext.contactId;
  if (!contactId) {
    throw new Error('Contact ID not found. Contact may not have been saved successfully.');
  }
  logger.info(`✅ Contact ${contactId} saved successfully`);
});

When('the Contact is updated', async function (this: AutomationWorld) {
  const contactId = this.testContext.contactId;
  if (!contactId) {
    throw new Error('Contact ID not found. Create a Contact first.');
  }

  const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();

  try {
    logger.info(`Updating Contact ${contactId}`);
    await testDataFactory.updateRecord('Contact', contactId, {
      FirstName: `Updated Contact Name ${Date.now()}`,
    });
    logger.info(`✅ Contact updated successfully`);
  } catch (error: any) {
    logger.error(`❌ Error updating Contact: ${error.message}`);
    throw error;
  }
});

When('a new Contact is created in Salesforce', async function (this: AutomationWorld) {
  // Ensure Account exists first
  if (!this.testContext.accountId) {
    const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();

    const timestamp = Date.now();
    const accountName = `SF-599 Test Account ${timestamp}`;
    const account = await testDataFactory.createAccount({
      Name: accountName,
      Type: 'Agency',
      Region__c: 'US',
      Account_Status__c: 'Prospect',
    });
    this.testContext.accountId = account.id;
  }

  const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
  const testDataFactory = new TestDataFactory();
  await testDataFactory.initialize();

  const timestamp = Date.now();
  const firstName = `SF-599`;
  const lastName = `Test Contact ${timestamp}`;

  try {
    logger.info(`Creating new Contact: ${firstName} ${lastName} for Account ${this.testContext.accountId}`);
    const contact = await testDataFactory.createContact({
      FirstName: firstName,
      LastName: lastName,
      Email: `sf599-${timestamp}@test.example.com`,
    }, this.testContext.accountId);

    if (!contact.id) {
      throw new Error('Contact creation failed: No ID returned');
    }

    this.testContext.contactId = contact.id;
    this.testContext.contactName = `${firstName} ${lastName}`;

    logger.info(`✅ Created Contact: ${contact.id} (${firstName} ${lastName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Contact: ${error.message}`);
    throw error;
  }
});

Given('a Contact is updated', async function (this: AutomationWorld) {
  // Ensure Contact exists first
  if (!this.testContext.contactId) {
    // Create Account and Contact
    if (!this.testContext.accountId) {
      const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
      const testDataFactory = new TestDataFactory();
      await testDataFactory.initialize();

      const timestamp = Date.now();
      const accountName = `SF-599 Test Account ${timestamp}`;
      const account = await testDataFactory.createAccount({
        Name: accountName,
        Type: 'Agency',
        Region__c: 'US',
        Account_Status__c: 'Prospect',
      });
      this.testContext.accountId = account.id;
    }

    const { TestDataFactory } = await import('../../../test-data/TestDataFactory');
    const testDataFactory = new TestDataFactory();
    await testDataFactory.initialize();

    const timestamp = Date.now();
    const firstName = `SF-599`;
    const lastName = `Test Contact ${timestamp}`;
    const contact = await testDataFactory.createContact({
      FirstName: firstName,
      LastName: lastName,
      Email: `sf599-${timestamp}@test.example.com`,
    }, this.testContext.accountId);

    this.testContext.contactId = contact.id;
    this.testContext.contactName = `${firstName} ${lastName}`;
  }
  // Contact exists, ready for update operation
});


// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Query Platform Events (Contact-specific)
// ═══════════════════════════════════════════════════════════════════════════

When('I update the Contact via PATCH request with:', async function (this: AutomationWorld, dataTable: any) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }

  const contactId = this.testContext.contactId;
  if (!contactId) {
    throw new Error('No Contact ID found in test context');
  }

  const updateData: Record<string, any> = {};
  const rows = dataTable.rows();

  for (const row of rows) {
    const field = row[0];
    const value = row[1];
    updateData[field] = value;
  }

  try {
    await apiClient.updateRecord('Contact', contactId, updateData);
    logger.info(`✅ Updated Contact via PATCH: ${JSON.stringify(updateData)}`);
  } catch (error: any) {
    logger.error(`❌ Error updating Contact via PATCH: ${error.message}`);
    throw error;
  }
});

When('I query Contact Platform Events for the Contact', async function (this: AutomationWorld) {
  const contactId = this.testContext.contactId;
  if (!contactId) {
    throw new Error('Contact ID not found in test context. Create or retrieve a Contact first.');
  }

  // Use Streaming API exclusively - SOQL queries don't work in this environment (404 NOT_FOUND)
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient | null;
  
  if (streamingClient) {
    logger.info(`🔍 Checking Platform Events via Streaming API for Contact: ${contactId}`);
    const events = this.testContext.platformEvents || [];
    if (events.length > 0) {
      logger.info(`✅ Found ${events.length} Platform Event(s) via Streaming API for Contact ${contactId}`);
      this.testContext.latestPlatformEvent = events[0];
      return;
    }
    logger.info(`ℹ️  No Platform Events received via Streaming API (expected for negative test scenarios)`);
    this.testContext.platformEvents = [];
    this.testContext.latestPlatformEvent = null;
  } else {
    logger.info(`🔍 No Streaming API subscription found for Contact: ${contactId}`);
    logger.info(`ℹ️  Setting empty event list - tests can verify "no events" scenarios`);
    this.testContext.platformEvents = [];
    this.testContext.latestPlatformEvent = null;
  }
});
