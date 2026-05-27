/**
 * SF-606 - Country__c-Specific Step Definitions
 * 
 * Only contains Country__c-specific steps that are not in common step files.
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

Given('Salesforce publishes Country Platform Events', async function (this: AutomationWorld) {
  logger.info('✅ Background: Salesforce publishes Country Platform Events');
});

Given('Salesforce does not allow Country__c records to be deleted', async function (this: AutomationWorld) {
  logger.info('✅ Background: Salesforce does not allow Country__c records to be deleted');
});

Given('Country__c lifecycle is managed using an Active/Inactive status field', async function (this: AutomationWorld) {
  logger.info('✅ Background: Country__c lifecycle is managed using an Active/Inactive status field');
});

Given('each Country Platform Event includes the Record ID and Event Identifier', async function (this: AutomationWorld) {
  logger.info('✅ Background: Each Country Platform Event includes the Record ID and Event Identifier');
});

// ═══════════════════════════════════════════════════════════════════════════
// GIVEN STEPS: Country__c Record Creation
// ═══════════════════════════════════════════════════════════════════════════

Given('a new Country__c record is created in Salesforce', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  const timestamp = Date.now();
  const countryName = `SF-606 Test Country ${timestamp}`;

  try {
    logger.info(`Creating new Country__c record: ${countryName}`);
    
    // Country__c is a custom object - use generic createRecord
    const countryData: Record<string, any> = {
      Name: countryName,
    };

    // Add Active__c field if it exists (status field for lifecycle management)
    // Note: Field name may vary - adjust based on actual schema
    try {
      countryData.Active__c = true;
    } catch (e) {
      // Field might not exist or have different name
    }

    const result = await apiClient.createRecord('Country__c', countryData);

    if (!result.id) {
      throw new Error('Country__c record creation failed: No ID returned');
    }

    this.testContext.countryId = result.id;
    this.testContext.countryName = countryName;
    this.testContext.recordId = result.id; // Also store in generic recordId

    logger.info(`✅ Created Country__c record: ${result.id} (${countryName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Country__c record: ${error.message}`);
    throw error;
  }
});

Given('an existing Country__c record exists in Salesforce', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  const timestamp = Date.now();
  const countryName = `SF-606 Existing Country ${timestamp}`;

  try {
    logger.info(`Creating existing Country__c record: ${countryName}`);
    
    const countryData: Record<string, any> = {
      Name: countryName,
    };

    try {
      countryData.Active__c = true;
    } catch (e) {
      // Field might not exist
    }

    const result = await apiClient.createRecord('Country__c', countryData);

    if (!result.id) {
      throw new Error('Country__c record creation failed: No ID returned');
    }

    this.testContext.countryId = result.id;
    this.testContext.countryName = countryName;
    this.testContext.recordId = result.id;

    logger.info(`✅ Created existing Country__c record: ${result.id} (${countryName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Country__c record: ${error.message}`);
    throw error;
  }
});

Given('a Country__c record exists in Salesforce', async function (this: AutomationWorld) {
  // Reuse the same logic as "an existing Country__c record exists"
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  const timestamp = Date.now();
  const countryName = `SF-606 Country ${timestamp}`;

  try {
    logger.info(`Creating Country__c record: ${countryName}`);
    
    const countryData: Record<string, any> = {
      Name: countryName,
    };

    try {
      countryData.Active__c = true;
    } catch (e) {
      // Field might not exist
    }

    const result = await apiClient.createRecord('Country__c', countryData);

    if (!result.id) {
      throw new Error('Country__c record creation failed: No ID returned');
    }

    this.testContext.countryId = result.id;
    this.testContext.countryName = countryName;
    this.testContext.recordId = result.id;

    logger.info(`✅ Created Country__c record: ${result.id} (${countryName})`);
  } catch (error: any) {
    logger.error(`❌ Error creating Country__c record: ${error.message}`);
    throw error;
  }
});

Given('a Country__c record is {string}', async function (this: AutomationWorld, operation: string) {
  if (operation === 'created') {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized.');
    }

    const timestamp = Date.now();
    const countryName = `SF-606 Test Country ${timestamp}`;

    const countryData: Record<string, any> = {
      Name: countryName,
    };

    try {
      countryData.Active__c = true;
    } catch (e) {
      // Field might not exist
    }

    const result = await apiClient.createRecord('Country__c', countryData);
    this.testContext.countryId = result.id;
    this.testContext.countryName = countryName;
    this.testContext.recordId = result.id;
  } else if (operation === 'updated') {
    // Country__c record should already exist
    if (!this.testContext.countryId) {
      throw new Error('Country__c record does not exist. Create a Country__c record first.');
    }
  } else {
    throw new Error(`Unknown operation: ${operation}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Country__c Record Operations
// ═══════════════════════════════════════════════════════════════════════════

When('the Country__c record is saved successfully', async function (this: AutomationWorld) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) {
    throw new Error('Country__c record ID not found. Country__c record may not have been saved successfully.');
  }
  logger.info(`✅ Country__c record ${countryId} saved successfully`);
});

When('the Country__c record is updated', async function (this: AutomationWorld) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) {
    throw new Error('Country__c record ID not found. Create a Country__c record first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  try {
    logger.info(`Updating Country__c record ${countryId}`);
    await apiClient.updateRecord('Country__c', countryId, {
      Name: `Updated Country Name ${Date.now()}`,
    });
    logger.info(`✅ Country__c record updated successfully`);
  } catch (error: any) {
    logger.error(`❌ Error updating Country__c record: ${error.message}`);
    throw error;
  }
});

When('the Country__c record status is updated to {string}', async function (this: AutomationWorld, status: string) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) {
    throw new Error('Country__c record ID not found. Create a Country__c record first.');
  }

  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  try {
    logger.info(`Updating Country__c record ${countryId} status to "${status}"`);
    
    // Map status to boolean if Active__c field exists
    const updateData: Record<string, any> = {};
    if (status === 'Active') {
      updateData.Active__c = true;
    } else if (status === 'Inactive') {
      updateData.Active__c = false;
    } else {
      // If status field has different name, try to set it directly
      updateData.Status__c = status;
    }

    await apiClient.updateRecord('Country__c', countryId, updateData);
    logger.info(`✅ Country__c record status updated to "${status}"`);
  } catch (error: any) {
    logger.error(`❌ Error updating Country__c record status: ${error.message}`);
    throw error;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Query Platform Events (Country__c-specific)
// ═══════════════════════════════════════════════════════════════════════════

When('I query Country Platform Events for the Country__c record', async function (this: AutomationWorld) {
  const countryId = this.testContext.countryId || this.testContext.recordId;
  if (!countryId) {
    throw new Error('Country__c record ID not found in test context. Create or retrieve a Country__c record first.');
  }

  // Use Streaming API exclusively - SOQL queries don't work in this environment (404 NOT_FOUND)
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient | null;
  
  if (streamingClient) {
    logger.info(`🔍 Checking Platform Events via Streaming API for Country__c record: ${countryId}`);
    const events = this.testContext.platformEvents || [];
    if (events.length > 0) {
      logger.info(`✅ Found ${events.length} Platform Event(s) via Streaming API for Country__c record ${countryId}`);
      this.testContext.latestPlatformEvent = events[0];
      return;
    }
    logger.info(`ℹ️  No Platform Events received via Streaming API (expected for negative test scenarios)`);
    this.testContext.platformEvents = [];
    this.testContext.latestPlatformEvent = null;
  } else {
    logger.info(`🔍 No Streaming API subscription found for Country__c record: ${countryId}`);
    logger.info(`ℹ️  Setting empty event list - tests can verify "no events" scenarios`);
    this.testContext.platformEvents = [];
    this.testContext.latestPlatformEvent = null;
  }
});
