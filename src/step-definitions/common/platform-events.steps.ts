/**
 * Common Platform Event Step Definitions
 * Shared steps for Platform Event tests across different work items (SF-596, SF-599, SF-600, SF-606)
 * 
 * These steps are generic and work with any Platform Event type (Account__e, Contact__e, etc.)
 * Work item-specific steps should be in their respective files (sf-596-platform-events.steps.ts, etc.)
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import {
  SalesforceStreamingClient,
  getPlatformEventRecordId,
  getPlatformEventPayloadIsActive,
} from '../../utils/salesforce-streaming-client';
import { logger } from '../../utils/logger';

/** Prefer relationship / MLER ids over Account id so SF-788 / SF-612 streaming assertions match the platform event Record_Id. */
function resolvePlatformEventRecordId(ctx: AutomationWorld['testContext']): string | undefined {
  return (
    ctx.accountRelationshipId ||
    ctx.sf769RelationshipId ||
    ctx.sf612MlerId ||
    ctx.accountId ||
    ctx.salesforceAccountId ||
    ctx.createdAccountId ||
    ctx.contactId ||
    ctx.accountTeamMemberId ||
    ctx.countryId ||
    ctx.recordId
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE: Generic Platform Event Structure
// ═══════════════════════════════════════════════════════════════════════════

export interface PlatformEvent {
  Id: string;
  CreatedDate: string;
  CreatedById: string;
  RecordId__c: string;
  Identifier__c: string;
  EventUuid: string;
  ReplayId: string;
  EventApiName: string;
  /** Present on Account_Relationship_Event__e payload (load) */
  Is_Active__c?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING API STEPS: Real-time Platform Event Subscription (Generic)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic Platform Event subscription step
 * Usage: Given I subscribe to {eventType} Platform Events
 * Example: Given I subscribe to Account Platform Events
 *          Given I subscribe to Contact Platform Events
 */
Given(/^I subscribe to (.+) Platform Events$/, async function (this: AutomationWorld, eventType: string) {
  const apiClient = (this.testContext.apiClient ?? this.testContext.salesforceClient) as SalesforceAPIClient | undefined;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  // Map event type to channel name
  const eventChannelMap: Record<string, string> = {
    'Account':
      process.env.E2E_ACCOUNT_PLATFORM_EVENT_CHANNEL?.trim() ||
      process.env.ACCOUNT_PLATFORM_EVENT_CHANNEL?.trim() ||
      '/event/Account__e',
    'Contact': '/event/Contact__e',
    'Account Team Member': '/event/AccountTeamMember__e',
    'Country': '/event/Country__e',
    'Account Relationship (TPA Maps)':
      process.env.SF788_PLATFORM_EVENT_CHANNEL || '/event/Account_Relationship_Event__e',
    // SF-612: override with env SF612_MLER_PLATFORM_EVENT_CHANNEL if org uses a different API name
    'Member Legal Entity Relationship':
      process.env.SF612_MLER_PLATFORM_EVENT_CHANNEL || '/event/Member_Legal_Entity_Relationship_Event__e',
    // SF-769: same MLER object/events as SF-612 unless org exposes a separate channel (set SF769_PLATFORM_EVENT_CHANNEL)
    'Member Legal Entity Group Relationship':
      process.env.SF769_PLATFORM_EVENT_CHANNEL ||
      process.env.SF612_MLER_PLATFORM_EVENT_CHANNEL ||
      '/event/Member_Legal_Entity_Relationship_Event__e',
  };

  const channel = eventChannelMap[eventType] || `/event/${eventType.replace(/\s+/g, '')}__e`;
  
  // Prefer token + host from the active API client (same session as integration steps); fall back to JWT.
  try {
    let accessToken = apiClient.getAccessToken();
    let instanceUrl = apiClient.getInstanceUrl();

    if (!accessToken || !instanceUrl) {
      const { SalesforceJWTAuth } = await import('../../utils/jwt-auth');
      const authResult = await SalesforceJWTAuth.authenticate();
      accessToken = authResult.accessToken;
      instanceUrl = authResult.instanceUrl;
    }

    if (!accessToken || !instanceUrl) {
      throw new Error('Failed to get access token or instance URL from authentication.');
    }

    try {
      // Create streaming client
      const streamingClient = new SalesforceStreamingClient(apiClient, accessToken, instanceUrl);
      
      // Connect and subscribe
      await streamingClient.connect();
      await streamingClient.subscribe(channel);
      streamingClient.clearEvents();

      // Store in test context
      this.testContext.streamingClient = streamingClient;
      this.testContext.platformEventType = eventType;

      logger.info(`✅ Subscribed to ${eventType} Platform Events via Streaming API`);
    } catch (error: any) {
      logger.error(`❌ Failed to subscribe to Platform Events: ${error.message}`);
      // Clean up on error
      if (this.testContext.streamingClient) {
        try {
          await (this.testContext.streamingClient as SalesforceStreamingClient).disconnect();
        } catch (cleanupError: any) {
          logger.warn(`Failed to cleanup streaming client: ${cleanupError.message}`);
        }
        this.testContext.streamingClient = null;
      }
      throw error;
    }
  } catch (error: any) {
    logger.error(`❌ Failed to authenticate for Streaming API: ${error.message}`);
    throw error;
  }
});

/**
 * Generic Platform Event unsubscription step
 * Usage: Given I unsubscribe from {eventType} Platform Events
 */
Given(/^I unsubscribe from (.+) Platform Events$/, async function (this: AutomationWorld, eventType: string) {
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
  if (streamingClient) {
    try {
      await streamingClient.disconnect();
      logger.info(`✅ Unsubscribed from ${eventType} Platform Events`);
    } catch (error: any) {
      logger.warn(`⚠️  Error disconnecting streaming client: ${error.message}`);
    }
    this.testContext.streamingClient = null;
    this.testContext.platformEventType = null;
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// WHEN STEPS: Wait for Platform Events (Generic)
// ═══════════════════════════════════════════════════════════════════════════

When('I wait {int} seconds for Platform Event to be published', async function (
  this: AutomationWorld,
  waitSeconds: number
) {
  const waitTime = waitSeconds * 1000;
  logger.info(`⏳ Waiting ${waitSeconds} seconds for Platform Event to be published...`);
  await new Promise(resolve => setTimeout(resolve, waitTime));
  logger.info(`✅ Wait complete`);
});

// ═══════════════════════════════════════════════════════════════════════════
// THEN STEPS: Verify Platform Events (Generic)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic step to receive Platform Event within timeout
 * Usage: Then I should receive a/an {eventType} Platform Event within {int} seconds
 * Matches both "a Account" and "an Account" patterns
 */
Then(/^I should receive (?:a|an) (.+) Platform Event within (\d+) seconds$/, async function (
  this: AutomationWorld,
  eventType: string,
  timeoutSeconds: string
) {
  let timeoutMs = parseInt(timeoutSeconds, 10) * 1000;
  // SF-788: allow longer timeout for slow sandboxes (Platform Events can be delayed)
  if (eventType === 'Account Relationship (TPA Maps)' && process.env.SF788_PLATFORM_EVENT_TIMEOUT_MS) {
    const override = parseInt(process.env.SF788_PLATFORM_EVENT_TIMEOUT_MS, 10);
    if (!Number.isNaN(override) && override > timeoutMs) timeoutMs = override;
  }
  if (eventType === 'Member Legal Entity Group Relationship' && process.env.SF769_PLATFORM_EVENT_TIMEOUT_MS) {
    const override = parseInt(process.env.SF769_PLATFORM_EVENT_TIMEOUT_MS, 10);
    if (!Number.isNaN(override) && override > timeoutMs) timeoutMs = override;
  }
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
  if (!streamingClient) {
    throw new Error('Streaming client not initialized.');
  }

  const recordId = resolvePlatformEventRecordId(this.testContext);

  if (!recordId) {
    throw new Error(`${eventType} ID not found in test context.`);
  }

  try {
    logger.info(`⏳ Waiting for Platform Event for ${eventType} ${recordId} (timeout: ${timeoutMs}ms)...`);

    const event = await streamingClient.waitForEvent(
      {
        recordId: recordId,
      },
      timeoutMs
    );

    // Convert to PlatformEvent format
    const platformEvent: PlatformEvent = {
      Id: event.event.EventUuid,
      CreatedDate: event.payload.CreatedDate,
      CreatedById: event.payload.CreatedById,
      RecordId__c: getPlatformEventRecordId(event.payload) || event.payload.RecordId__c,
      Identifier__c: event.payload.Identifier__c,
      EventUuid: event.event.EventUuid,
      ReplayId: event.event.replayId.toString(),
      EventApiName: event.event.EventApiName,
      Is_Active__c: getPlatformEventPayloadIsActive(event.payload),
    };

    this.testContext.platformEvents = [platformEvent];
    this.testContext.latestPlatformEvent = platformEvent;

    logger.info(`✅ Received Platform Event via Streaming API`);
  } catch (error: any) {
    logger.error(`❌ Failed to receive Platform Event: ${error.message}`);
    throw error;
  }
});

/**
 * Generic step to receive Platform Event with specific Identifier__c
 * Usage: Then I should receive a/an {eventType} Platform Event within {int} seconds with Identifier__c = {string}
 * Matches both "a Account" and "an Account" patterns
 */
Then(/^I should receive (?:a|an) (.+) Platform Event within (\d+) seconds with Identifier__c = "(.+)"$/, async function (
  this: AutomationWorld,
  eventType: string,
  timeoutSeconds: string,
  expectedIdentifier: string
) {
  let timeoutMs = parseInt(timeoutSeconds, 10) * 1000;
  if (eventType === 'Account Relationship (TPA Maps)' && process.env.SF788_PLATFORM_EVENT_TIMEOUT_MS) {
    const override = parseInt(process.env.SF788_PLATFORM_EVENT_TIMEOUT_MS, 10);
    if (!Number.isNaN(override) && override > timeoutMs) timeoutMs = override;
  }
  if (eventType === 'Member Legal Entity Group Relationship' && process.env.SF769_PLATFORM_EVENT_TIMEOUT_MS) {
    const override = parseInt(process.env.SF769_PLATFORM_EVENT_TIMEOUT_MS, 10);
    if (!Number.isNaN(override) && override > timeoutMs) timeoutMs = override;
  }
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
  if (!streamingClient) {
    throw new Error('Streaming client not initialized. Subscribe to events first.');
  }

  const recordId = resolvePlatformEventRecordId(this.testContext);

  if (!recordId) {
    throw new Error(`${eventType} ID not found in test context.`);
  }

  // Map event type to EventApiName
  const eventApiNameMap: Record<string, string> = {
    'Account': 'Account__e',
    'Contact': 'Contact__e',
    'Account Team Member': 'AccountTeamMember__e',
    'Country': 'Country__e',
    'Account Relationship (TPA Maps)': 'Account_Relationship_Event__e',
    'Member Legal Entity Relationship':
      process.env.SF612_MLER_PLATFORM_EVENT_API_NAME || 'Member_Legal_Entity_Relationship_Event__e',
    'Member Legal Entity Group Relationship':
      process.env.SF769_PLATFORM_EVENT_API_NAME ||
      process.env.SF612_MLER_PLATFORM_EVENT_API_NAME ||
      'Member_Legal_Entity_Relationship_Event__e',
  };

  const eventApiName = eventApiNameMap[eventType] || `${eventType.replace(/\s+/g, '')}__e`;

  logger.info(`⏳ Waiting for ${eventType} Platform Event with Identifier__c="${expectedIdentifier}" for ${eventType} ID: ${recordId} via Streaming API (timeout: ${timeoutMs}ms)`);

  try {
    // SF-612 / SF-769: org may use a custom event API name — only filter by EventApiName when env is set
    const filter: { recordId: string; identifier: string; eventApiName?: string } = {
      recordId,
      identifier: expectedIdentifier,
    };
    if (eventType === 'Member Legal Entity Relationship') {
      if (process.env.SF612_MLER_PLATFORM_EVENT_API_NAME) {
        filter.eventApiName = process.env.SF612_MLER_PLATFORM_EVENT_API_NAME;
      }
    } else if (eventType === 'Member Legal Entity Group Relationship') {
      if (process.env.SF769_PLATFORM_EVENT_API_NAME || process.env.SF612_MLER_PLATFORM_EVENT_API_NAME) {
        filter.eventApiName =
          process.env.SF769_PLATFORM_EVENT_API_NAME || process.env.SF612_MLER_PLATFORM_EVENT_API_NAME;
      }
    } else {
      filter.eventApiName = eventApiName;
    }

    const event = await streamingClient.waitForEvent(filter, timeoutMs);

    // Convert to PlatformEvent format
    const platformEvent: PlatformEvent = {
      Id: event.event.EventUuid,
      CreatedDate: event.payload.CreatedDate,
      CreatedById: event.payload.CreatedById,
      RecordId__c: getPlatformEventRecordId(event.payload) || event.payload.RecordId__c,
      Identifier__c: event.payload.Identifier__c,
      EventUuid: event.event.EventUuid,
      ReplayId: event.event.replayId.toString(),
      EventApiName: event.event.EventApiName,
      Is_Active__c: getPlatformEventPayloadIsActive(event.payload),
    };

    this.testContext.platformEvents = [platformEvent];
    this.testContext.latestPlatformEvent = platformEvent;

    logger.info(`✅ Received matching Platform Event for ${eventType} ID: ${recordId} with Identifier__c="${expectedIdentifier}"`);
    logger.info(`   EventUuid: ${event.event.EventUuid}`);
    logger.info(`   ReplayId: ${event.event.replayId}`);
  } catch (error: any) {
    logger.error(`❌ Failed to receive Platform Event with Identifier__c="${expectedIdentifier}": ${error.message}`);
    throw error;
  }
});

/**
 * Generic step to verify Platform Event action
 * Usage: Then the event action is {string}
 */
Then('the event action is {string}', async function (this: AutomationWorld, expectedAction: string) {
  const events = this.testContext.platformEvents || [];
  if (events.length === 0) {
    throw new Error(`❌ No Platform Event found. Expected event with Identifier__c = "${expectedAction}".`);
  }

  const latestEvent = events[0] as PlatformEvent;
  const actualAction = latestEvent.Identifier__c?.toLowerCase();
  const expectedActionLower = expectedAction.toLowerCase();

  if (actualAction !== expectedActionLower) {
    throw new Error(
      `❌ Platform Event action mismatch. Expected "${expectedAction}", but got "${latestEvent.Identifier__c}"`
    );
  }

  logger.info(`✅ Platform Event action matches: "${expectedAction}"`);
});

/**
 * Generic step to verify Platform Event includes Record ID
 * Usage: Then the event includes the Record ID
 */
Then('the event includes the Record ID', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  // Prefer relationship/MLER IDs over Account so SF-788/612 events (Record_Id = relationship) match
  const recordId = resolvePlatformEventRecordId(this.testContext);

  if (!recordId) {
    throw new Error('Record ID not found in test context.');
  }

  if (latestEvent.RecordId__c !== recordId) {
    throw new Error(
      `❌ Platform Event RecordId__c mismatch. Expected "${recordId}", but got "${latestEvent.RecordId__c}"`
    );
  }

  logger.info(`✅ Platform Event includes Record ID: ${latestEvent.RecordId__c}`);
});

/**
 * Generic step to verify Platform Event includes unique event identifier
 * Usage: Then the event includes a unique event identifier
 */
Then('the event includes a unique event identifier', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (!latestEvent.EventUuid || latestEvent.EventUuid.trim() === '') {
    throw new Error('❌ Platform Event missing unique event identifier (EventUuid).');
  }

  logger.info(`✅ Platform Event includes unique event identifier: ${latestEvent.EventUuid}`);
});

/** JIRA SF-612 wording: Event Identifier maps to Identifier__c on the platform event payload */
Then('the event includes the Event Identifier', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Receive or query Platform Events first.');
  }
  if (!latestEvent.Identifier__c || String(latestEvent.Identifier__c).trim() === '') {
    throw new Error('❌ Platform Event missing Event Identifier (Identifier__c).');
  }
  logger.info(`✅ Platform Event includes Event Identifier (Identifier__c): ${latestEvent.Identifier__c}`);
});

/**
 * Per SF-612 / SF-788: downstream needs Is_Active__c on the event. If the field is missing on
 * Member_Legal_Entity_Relationship_Event__e, that is a product defect (metadata), not something tests should waive.
 */
Then('the event includes Is_Active__c', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }
  if (latestEvent.Is_Active__c === undefined) {
    const api = latestEvent.EventApiName || '';
    if (api === 'Member_Legal_Entity_Relationship_Event__e') {
      throw new Error(
        '❌ SF-612 defect: Member_Legal_Entity_Relationship_Event__e payload is missing Is_Active__c. ' +
          'Story requires Create/Update events to include Is_Active__c for Dataverse/MuleSoft (active vs inactive). ' +
          'Add Is_Active__c to the custom platform event (same pattern as Account_Relationship_Event__e).'
      );
    }
    throw new Error(
      '❌ Platform Event payload does not include Is_Active__c (boolean expected on event payload).'
    );
  }
  logger.info(`✅ Platform Event includes Is_Active__c: ${latestEvent.Is_Active__c}`);
});

Then('the event should include a unique EventUuid', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (!latestEvent.EventUuid || latestEvent.EventUuid.trim() === '') {
    throw new Error('❌ Platform Event missing EventUuid field.');
  }

  logger.info(`✅ Platform Event includes EventUuid: ${latestEvent.EventUuid}`);
});

Then('the event should include a CreatedDate timestamp', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (!latestEvent.CreatedDate) {
    throw new Error('❌ Platform Event missing CreatedDate field.');
  }

  // Verify timestamp is recent (within last 10 minutes)
  const eventTime = new Date(latestEvent.CreatedDate);
  const now = new Date();
  const diffMinutes = (now.getTime() - eventTime.getTime()) / 1000 / 60;

  if (diffMinutes > 10) {
    throw new Error(
      `❌ Platform Event timestamp is too old: ${diffMinutes.toFixed(2)} minutes ago. ` +
      `Expected event within last 10 minutes.`
    );
  }

  logger.info(`✅ Platform Event includes valid CreatedDate: ${latestEvent.CreatedDate} (${diffMinutes.toFixed(2)} minutes ago)`);
});

Then('the event should include ReplayId', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (!latestEvent.ReplayId) {
    throw new Error('❌ Platform Event missing ReplayId field.');
  }

  logger.info(`✅ Platform Event includes ReplayId: ${latestEvent.ReplayId}`);
});

Then('the event includes an event timestamp', async function (this: AutomationWorld) {
  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (!latestEvent.CreatedDate || latestEvent.CreatedDate.trim() === '') {
    throw new Error('❌ Platform Event missing CreatedDate timestamp.');
  }

  logger.info(`✅ Platform Event includes event timestamp: ${latestEvent.CreatedDate}`);
});

Then('the event action is populated', async function (this: AutomationWorld) {
  const events = this.testContext.platformEvents || [];
  if (events.length === 0) {
    throw new Error('No Platform Event found');
  }

  const latestEvent = events[0] as PlatformEvent;
  if (!latestEvent.Identifier__c || latestEvent.Identifier__c.trim() === '') {
    throw new Error('❌ Event action (Identifier__c) is not populated');
  }

  logger.info(`✅ Event action is populated: "${latestEvent.Identifier__c}"`);
});

/**
 * Generic step to verify no Platform Event is published
 * Usage: Then no {eventType} Platform Event is published
 */
/**
 * Generic step to verify a Platform Event is published
 * Usage: Then a/an {eventType} Platform Event is published
 * Matches both "a Account" and "an Account" patterns
 */
// Exclude "Account Relationship (TPA Maps)" — sf-788 has its own Given step for API-014
Then(/^(?:a|an) ((?!Account Relationship \(TPA Maps\)).+) Platform Event is published$/, async function (this: AutomationWorld, eventType: string) {
  // Use events already received via Streaming API (if available)
  let events = this.testContext.platformEvents || [];
  let latestEvent = this.testContext.latestPlatformEvent;

  // If no events from previous step, and we have a streaming client, try waiting for event
  if (events.length === 0 && this.testContext.streamingClient) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    
    // Get record ID from context (could be accountId, contactId, accountTeamMemberId, etc.)
    const recordId = resolvePlatformEventRecordId(this.testContext);

    if (recordId) {
      try {
        logger.info(`⏳ Waiting for ${eventType} Platform Event via Streaming API (timeout: 10s)...`);
        const event = await streamingClient.waitForEvent(
          { recordId: recordId },
          120000 // slow sandboxes / delayed platform events
        );

        // Convert to PlatformEvent format
        const platformEvent: PlatformEvent = {
          Id: event.event.EventUuid,
          CreatedDate: event.payload.CreatedDate,
          CreatedById: event.payload.CreatedById,
          RecordId__c: getPlatformEventRecordId(event.payload) || event.payload.RecordId__c,
          Identifier__c: event.payload.Identifier__c,
          EventUuid: event.event.EventUuid,
          ReplayId: event.event.replayId.toString(),
          EventApiName: event.event.EventApiName,
          Is_Active__c: getPlatformEventPayloadIsActive(event.payload),
        };

        events = [platformEvent];
        latestEvent = platformEvent;
        this.testContext.platformEvents = events;
        this.testContext.latestPlatformEvent = latestEvent;
      } catch (streamingError: any) {
        logger.warn(`⚠️  Streaming API failed: ${streamingError.message}`);
      }
    }
  }

  if (events.length === 0) {
    // Streaming API is the only way to verify events in this environment
    logger.warn(`⚠️  No ${eventType} Platform Events found via Streaming API.`);
    logger.warn(`   To verify events, subscribe to Streaming API BEFORE the event is published.`);
    throw new Error(
      `No ${eventType} Platform Event found. Platform Events must be verified via Streaming API ` +
      '(subscribe BEFORE the event is published).'
    );
  }

  logger.info(`✅ ${eventType} Platform Event is published (${events.length} event(s) found)`);
  if (latestEvent) {
    logger.info(`   Event ID: ${latestEvent.Id}`);
    logger.info(`   RecordId__c: ${latestEvent.RecordId__c}`);
    logger.info(`   Identifier__c: ${latestEvent.Identifier__c}`);
    logger.info(`   CreatedDate: ${latestEvent.CreatedDate}`);
  }
});

Then(/^no (.+) Platform Event is published$/, async function (this: AutomationWorld, eventType: string) {
  const events = this.testContext.platformEvents || [];
  if (events.length > 0) {
    throw new Error(`❌ Found ${events.length} Platform Event(s), but expected none.`);
  }
  logger.info(`✅ No ${eventType} Platform Event published (as expected)`);
});

Then(/^no (.+) Platform Event should be published$/, async function (this: AutomationWorld, eventType: string) {
  const events = this.testContext.platformEvents || [];
  
  if (events.length > 0) {
    const latestEvent = events[0] as PlatformEvent;
    throw new Error(
      `❌ Unexpected Platform Event found. Expected no events, but found ${events.length} event(s). ` +
      `Latest event: ${latestEvent.Identifier__c} at ${latestEvent.CreatedDate}`
    );
  }

  logger.info(`✅ Verified: No ${eventType} Platform Event published (as expected)`);
});

Then(/^a (.+) Platform Event should be published$/, async function (this: AutomationWorld, eventType: string) {
  const events = this.testContext.platformEvents || [];
  
  if (events.length === 0) {
    throw new Error(`❌ No ${eventType} Platform Event found. Expected at least one event to be published.`);
  }

  const latestEvent = events[0] as PlatformEvent;
  logger.info(`✅ ${eventType} Platform Event verified:`);
  logger.info(`   Event ID: ${latestEvent.Id}`);
  logger.info(`   RecordId__c: ${latestEvent.RecordId__c}`);
  logger.info(`   Identifier__c: ${latestEvent.Identifier__c}`);
  logger.info(`   CreatedDate: ${latestEvent.CreatedDate}`);
});

Then(/^(?:a|an) (.+) Platform Event should be published with Identifier__c = "(.+)"$/, async function (
  this: AutomationWorld,
  eventType: string,
  expectedAction: string
) {
  const events = this.testContext.platformEvents || [];
  
  if (events.length === 0) {
    throw new Error(`❌ No ${eventType} Platform Event found. Expected event with Identifier__c = "${expectedAction}".`);
  }

  const latestEvent = events[0] as PlatformEvent;
  const actualAction = latestEvent.Identifier__c?.toLowerCase();
  const expectedActionLower = expectedAction.toLowerCase();

  if (actualAction !== expectedActionLower) {
    throw new Error(
      `❌ Platform Event action mismatch. Expected "${expectedAction}", but got "${latestEvent.Identifier__c}"`
    );
  }

  logger.info(`✅ ${eventType} Platform Event verified with Identifier__c = "${expectedAction}"`);
  logger.info(`   Event ID: ${latestEvent.Id}`);
  logger.info(`   RecordId__c: ${latestEvent.RecordId__c}`);
  logger.info(`   CreatedDate: ${latestEvent.CreatedDate}`);
});

Then(/^the event RecordId__c should match the (.+) Id$/, async function (this: AutomationWorld, entityType: string) {
  // Get record ID from context based on entity type
  let recordId: string | undefined;
  if (entityType === 'Account') {
    recordId = this.testContext.accountId || this.testContext.salesforceAccountId || this.testContext.createdAccountId;
  } else if (entityType === 'Contact') {
    recordId = this.testContext.contactId;
  } else if (entityType === 'Account Team Member') {
    recordId = this.testContext.accountTeamMemberId;
  } else if (entityType === 'Country') {
    recordId = this.testContext.countryId || this.testContext.recordId;
  } else if (entityType === 'Account Relationship (TPA Maps)' || entityType === 'relationship') {
    recordId = this.testContext.accountRelationshipId || this.testContext.recordId;
  } else if (entityType === 'Member Legal Entity Relationship') {
    recordId = this.testContext.sf612MlerId || this.testContext.recordId;
  } else if (entityType === 'Member Legal Entity Group Relationship') {
    recordId = this.testContext.sf769RelationshipId || this.testContext.recordId;
  } else {
    recordId = this.testContext.recordId;
  }

  if (!recordId) {
    throw new Error(`${entityType} ID not found in test context.`);
  }

  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (latestEvent.RecordId__c !== recordId) {
    throw new Error(
      `❌ Platform Event RecordId__c mismatch. Expected "${recordId}", but got "${latestEvent.RecordId__c}"`
    );
  }

  logger.info(`✅ Platform Event RecordId__c matches ${entityType} Id: ${recordId}`);
});

Then(/^the event includes the Salesforce (.+) Id$/, async function (this: AutomationWorld, entityType: string) {
  // Get record ID from context based on entity type
  let recordId: string | undefined;
  if (entityType === 'Account') {
    recordId = this.testContext.accountId || this.testContext.salesforceAccountId || this.testContext.createdAccountId;
  } else if (entityType === 'Contact') {
    recordId = this.testContext.contactId;
  } else if (entityType === 'Account Team Member') {
    recordId = this.testContext.accountTeamMemberId;
  } else if (entityType === 'Country') {
    recordId = this.testContext.countryId || this.testContext.recordId;
  } else if (entityType === 'Account Relationship (TPA Maps)' || entityType === 'relationship') {
    recordId = this.testContext.accountRelationshipId || this.testContext.recordId;
  } else if (entityType === 'Member Legal Entity Relationship') {
    recordId = this.testContext.sf612MlerId || this.testContext.recordId;
  } else if (entityType === 'Member Legal Entity Group Relationship') {
    recordId = this.testContext.sf769RelationshipId || this.testContext.recordId;
  } else {
    recordId = this.testContext.recordId;
  }

  if (!recordId) {
    throw new Error(`${entityType} ID not found in test context.`);
  }

  const latestEvent = this.testContext.latestPlatformEvent as PlatformEvent;
  if (!latestEvent) {
    throw new Error('No Platform Event found. Query Platform Events first.');
  }

  if (latestEvent.RecordId__c !== recordId) {
    throw new Error(
      `❌ Platform Event RecordId__c mismatch. Expected "${recordId}", but got "${latestEvent.RecordId__c}"`
    );
  }

  logger.info(`✅ Platform Event includes Salesforce ${entityType} Id: ${latestEvent.RecordId__c}`);
});

Then('no delete event is published', async function (this: AutomationWorld) {
  // Check events from test context (received via Streaming API)
  const events = this.testContext.platformEvents || [];
  const deleteEvents = events.filter((e: any) => e.Identifier__c?.toLowerCase() === 'delete');
  
  if (deleteEvents.length > 0) {
    throw new Error(`❌ Found ${deleteEvents.length} delete event(s), but none should be published`);
  }
  logger.info(`✅ No delete events found (as expected)`);
});
