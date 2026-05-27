/**
 * Salesforce Streaming API Client
 * 
 * Provides real-time subscription to Platform Events using CometD/Bayeux protocol.
 * This is the programmatic equivalent of the Chrome extension Event Monitor.
 * 
 * Environment-aware: Works across QA, UAT, and other environments.
 */

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment -- Faye is CommonJS without typings; internal _dispatcher APIs are untyped */
const Faye = require('faye');

// Type declarations for Faye (since it doesn't have proper TypeScript definitions)
interface FayeClient {
  handshake(callback: (response: any) => void): any;
  subscribe(channel: string, callback: (message: any) => void): FayeSubscription;
  disconnect(): void;
  addExtension(extension: any): void;
  on(event: string, callback: () => void): void;
  /** Faye internals (used to force long-polling / headers) */
  _dispatcher?: {
    _transports?: string[];
    _endpoint?: { headers?: Record<string, string> };
  };
  setHeader?(name: string, value: string): void;
}

interface FayeSubscription {
  callback(callback: () => void): void;
  cancel(): void;
}
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { config } from '../config/config';
import { logger } from './logger';

export interface PlatformEvent {
  schema: string;
  payload: {
    CreatedById: string;
    RecordId__c: string;
    CreatedDate: string;
    Identifier__c: string;
    [key: string]: any;
  };
  event: {
    EventUuid: string;
    replayId: string;
    EventApiName: string;
  };
}

export interface EventFilter {
  recordId?: string;
  identifier?: string;
  eventApiName?: string;
}

/**
 * Platform Event payloads vary by metadata: some use RecordId__c, SF-612 MLER uses Record_Id__c.
 */
export function getPlatformEventRecordId(payload: Record<string, any> | undefined): string | undefined {
  if (!payload) return undefined;
  const v = payload.Record_Id__c ?? payload.RecordId__c;
  if (v == null || String(v).trim() === '') return undefined;
  return String(v);
}

/**
 * Compare two Salesforce record IDs. Handles 15-char vs 18-char format (same record).
 * Platform Events may send 15-char while automation uses 18-char from REST API.
 */
export function salesforceIdsMatch(id1: string | undefined, id2: string | undefined): boolean {
  if (!id1 || !id2) return false;
  const a = String(id1).trim();
  const b = String(id2).trim();
  if (a === b) return true;
  if (a.length < 15 || b.length < 15) return false;
  return a.substring(0, 15) === b.substring(0, 15);
}

/** Normalize payload so RecordId__c is always set when either API name is present */
function normalizePlatformEventPayload(payload: Record<string, any>): Record<string, any> {
  const id = getPlatformEventRecordId(payload);
  if (id) {
    if (payload.RecordId__c == null) payload.RecordId__c = id;
    if (payload.Record_Id__c == null) payload.Record_Id__c = id;
  }
  return payload;
}

/** Is_Active__c may be boolean or string from Streaming JSON */
export function getPlatformEventPayloadIsActive(payload: Record<string, any> | undefined): boolean | undefined {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'Is_Active__c')) {
    return undefined;
  }
  const v = payload.Is_Active__c;
  if (v === true || v === false) return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

export interface SubscriptionOptions {
  timeout?: number; // Timeout in milliseconds (default: 30000)
  filter?: EventFilter;
}

/**
 * CometD handshake often exceeds 10s on VPN / busy sandboxes. Platform events can arrive 10–90s after DML.
 * Override: SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS (min 15000).
 */
export function getStreamingHandshakeTimeoutMs(): number {
  const raw = process.env.SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS;
  if (raw) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n) && n >= 15000) return n;
  }
  return 120000;
}

export class SalesforceStreamingClient {
  private client: FayeClient | null = null;
  private subscriptions: Map<string, FayeSubscription> = new Map();
  private receivedEvents: PlatformEvent[] = [];
  private isConnected: boolean = false;
  private apiClient: SalesforceAPIClient;
  private accessToken: string;
  private instanceUrl: string;
  private apiVersion: string;
  private eventListeners: Array<(event: PlatformEvent) => void> = [];
  private handshakeResolve?: () => void;
  private handshakeReject?: (error: Error) => void;
  private handshakeTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  private clearHandshakeTimeout(): void {
    if (this.handshakeTimeoutHandle) {
      clearTimeout(this.handshakeTimeoutHandle);
      this.handshakeTimeoutHandle = null;
    }
  }

  constructor(apiClient: SalesforceAPIClient, accessToken: string, instanceUrl: string) {
    this.apiClient = apiClient;
    this.accessToken = accessToken;
    this.instanceUrl = instanceUrl;
    this.apiVersion = config.getSalesforceConfig().apiVersion;
  }

  /**
   * Connect to Salesforce Streaming API
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      logger.info('Streaming client already connected');
      return;
    }

    try {
      // Construct Streaming API endpoint
      // Format: https://{instance}/cometd/{apiVersion}/
      // Note: API version must NOT have 'v' prefix (e.g., '60.0' not 'v60.0')
      // Salesforce CometD endpoint format: /cometd/{version}/ (not /conduit/cometd/)
      const apiVersion = this.apiVersion.startsWith('v') ? this.apiVersion.substring(1) : this.apiVersion;
      // Remove trailing slash from instanceUrl if present
      const baseUrl = this.instanceUrl.endsWith('/') ? this.instanceUrl.slice(0, -1) : this.instanceUrl;
      const streamingUrl = `${baseUrl}/cometd/${apiVersion}/`;
      
      logger.info(`🔌 Connecting to Salesforce Streaming API: ${streamingUrl}`);

      // Create Faye client with authentication
      // Force long-polling transport (uses POST) instead of WebSocket (uses GET)
      // Salesforce CometD requires POST for all requests
      const handshakeMs = getStreamingHandshakeTimeoutMs();
      const fayeTimeoutSec = Math.min(600, Math.max(120, Math.ceil(handshakeMs / 1000) + 90));
      logger.info(
        `   Handshake wait: ${handshakeMs}ms (env SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS), Faye HTTP timeout: ${fayeTimeoutSec}s`
      );

      this.client = new Faye.Client(streamingUrl, {
        timeout: fayeTimeoutSec,
        retry: 0, // Disable automatic retry - we'll handle reconnection
      }) as FayeClient;

      // Force long-polling transport (POST) instead of WebSocket (GET)
      // This ensures all requests use POST as required by Salesforce
      if (this.client._dispatcher) {
        this.client._dispatcher._transports = ['long-polling'];
      }

      // Set authentication extension for Salesforce Streaming API
      // Salesforce requires OAuth token in the extension for ALL messages including handshake
      // Format: message.ext.authorization.bearer = accessToken
      this.client.addExtension({
        outgoing: (message: any, callback: (message: any) => void) => {
          // Add OAuth token to ALL messages (including handshake)
          if (!message.ext) {
            message.ext = {};
          }
          // Salesforce expects the token in this exact format
          message.ext.authorization = {
            bearer: this.accessToken,
          };
          logger.debug(`Outgoing message channel: ${message.channel}, has auth: ${!!message.ext.authorization}`);
          callback(message);
        },
        incoming: (message: any, callback: (message: any) => void) => {
          // Log ALL incoming messages for debugging
          logger.debug(`📥 Incoming message: ${JSON.stringify(message)}`);
          
          // Handle handshake response in incoming extension
          // Faye's handshake callback may not work reliably, so we detect success here
          if (message.channel === '/meta/handshake') {
            logger.debug(`Handshake response: ${JSON.stringify(message)}`);
            
            if (message.successful === true) {
              logger.info('✅ Streaming API handshake successful (detected in incoming extension)');
              logger.debug(`   Client ID: ${message.clientId || 'unknown'}`);
              logger.debug(`   Supported transports: ${JSON.stringify(message.supportedConnectionTypes || [])}`);

              this.clearHandshakeTimeout();

              // Resolve handshake promise if waiting
              if (this.handshakeResolve) {
                this.isConnected = true;
                this.handshakeResolve();
                this.handshakeResolve = undefined;
                this.handshakeReject = undefined;
              }
            } else if (message.error) {
              logger.error(`Handshake error: ${message.error}`);
              if (message.ext && message.ext.sfdc) {
                logger.error(`Salesforce failure reason: ${message.ext.sfdc.failureReason}`);
              }

              this.clearHandshakeTimeout();

              // Reject handshake promise if waiting
              if (this.handshakeReject) {
                const errorMsg = message.error || 'Handshake failed';
                const failureReason = message.ext?.sfdc?.failureReason || '';
                const fullError = failureReason ? `${errorMsg} (${failureReason})` : errorMsg;
                this.handshakeReject(new Error(`Streaming API handshake failed: ${fullError}`));
                this.handshakeResolve = undefined;
                this.handshakeReject = undefined;
              }
            }
          }
          
          // Log subscribe responses to verify subscription is active
          if (message.channel === '/meta/subscribe') {
            logger.debug(`Subscribe response: ${JSON.stringify(message)}`);
            if (message.successful === true) {
              logger.info(`✅ Subscription confirmed for channel: ${message.subscription || 'unknown'}`);
            } else if (message.error) {
              logger.error(`❌ Subscription failed: ${message.error}`);
            }
          }
          
          callback(message);
        },
      });

      // Set HTTP headers for all requests (Salesforce may require both extension AND headers)
      if (this.client._dispatcher) {
        if (this.client._dispatcher._endpoint) {
          this.client._dispatcher._endpoint.headers = {
            'Authorization': `OAuth ${this.accessToken}`,
            'Content-Type': 'application/json',
          };
          logger.debug(`Set HTTP headers with Authorization token (length: ${this.accessToken.length})`);
        }
        if (this.client.setHeader) {
          this.client.setHeader('Authorization', `OAuth ${this.accessToken}`);
          this.client.setHeader('Content-Type', 'application/json');
        }
      }

      // Handle connection events (but don't log every up/down to reduce noise)
      let lastTransportState = 'unknown';
      this.client.on('transport:down', () => {
        if (lastTransportState !== 'down') {
          logger.warn('⚠️  Streaming API transport down');
          lastTransportState = 'down';
        }
        this.isConnected = false;
      });

      this.client.on('transport:up', () => {
        if (lastTransportState !== 'up') {
          logger.info('✅ Streaming API transport up');
          lastTransportState = 'up';
        }
        this.isConnected = true;
      });

      // Perform handshake
      // Use incoming extension to detect handshake success (more reliable than callback)
      const handshakeTimeoutMs = getStreamingHandshakeTimeoutMs();

      await new Promise<void>((resolve, reject) => {
        // Store resolve/reject for incoming extension to use
        this.handshakeResolve = resolve;
        this.handshakeReject = reject;

        this.clearHandshakeTimeout();
        this.handshakeTimeoutHandle = setTimeout(() => {
          this.handshakeTimeoutHandle = null;
          if (this.handshakeResolve || this.handshakeReject) {
            logger.error(`❌ Streaming API handshake timeout (${handshakeTimeoutMs}ms)`);
            this.handshakeResolve = undefined;
            this.handshakeReject = undefined;
            reject(
              new Error(
                `Streaming API handshake timeout after ${Math.round(handshakeTimeoutMs / 1000)} seconds ` +
                  `(set SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS to increase)`
              )
            );
          }
        }, handshakeTimeoutMs);

        try {
          // The callback may not receive the response, so we rely on incoming extension
          const handshake = this.client!.handshake((response: any) => {
            // This callback may receive undefined or be called before response arrives
            // We handle success/failure in the incoming extension instead
            logger.debug(`Handshake callback received: ${JSON.stringify(response)}`);

            // If we get a response here and it's successful, use it
            if (response && response.successful === true && this.handshakeResolve) {
              this.clearHandshakeTimeout();
              this.isConnected = true;
              this.handshakeResolve();
              this.handshakeResolve = undefined;
              this.handshakeReject = undefined;
            }
          });

          // If handshake returns a promise, handle it as backup
          if (handshake && typeof handshake.then === 'function') {
            handshake
              .then(() => {
                if (this.handshakeResolve) {
                  this.clearHandshakeTimeout();
                  logger.info('✅ Streaming API handshake successful (promise)');
                  this.isConnected = true;
                  this.handshakeResolve();
                  this.handshakeResolve = undefined;
                  this.handshakeReject = undefined;
                }
              })
              .catch((error: any) => {
                if (this.handshakeReject) {
                  this.clearHandshakeTimeout();
                  logger.error(`❌ Streaming API handshake failed: ${error.message || error}`);
                  this.handshakeReject(error);
                  this.handshakeResolve = undefined;
                  this.handshakeReject = undefined;
                }
              });
          }
        } catch (error: any) {
          this.clearHandshakeTimeout();
          this.handshakeResolve = undefined;
          this.handshakeReject = undefined;
          logger.error(`❌ Streaming API handshake error: ${error.message || error}`);
          reject(error);
        }
      });
    } catch (error: any) {
      logger.error(`❌ Failed to connect to Streaming API: ${error.message}`);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Subscribe to a Platform Event channel
   * 
   * @param channel Channel name (e.g., '/event/Account__e')
   * @param options Subscription options
   * @returns Promise that resolves when subscription is active
   */
  async subscribe(
    channel: string,
    options: SubscriptionOptions = {}
  ): Promise<void> {
    if (!this.client || !this.isConnected) {
      await this.connect();
    }

    if (this.subscriptions.has(channel)) {
      logger.info(`Already subscribed to channel: ${channel}`);
      return;
    }

    try {
      if (!this.client) {
        throw new Error('Streaming client not connected. Call connect() first.');
      }

      logger.info(`📡 Subscribing to channel: ${channel}`);

      const subscription = this.client.subscribe(channel, (message: any) => {
        // Skip meta messages (handshake, connect, subscribe responses)
        if (message.channel && message.channel.startsWith('/meta/')) {
          logger.debug(`Skipping meta message: ${message.channel}`);
          return;
        }
        
        // Log ALL incoming Platform Event messages for debugging
        logger.info(`📨 Raw message received on ${channel}: ${JSON.stringify(message, null, 2)}`);
        
        // CometD/Bayeux delivery wraps payload in message.data: { schema, payload, event }
        const msg = message.data && typeof message.data === 'object' ? message.data : message;

        // Salesforce Platform Events format (based on Chrome extension screenshot):
        // { "schema": "...", "payload": { "Record_Id__c" or "RecordId__c", ... }, "event": { ... } }
        let payload: any = {};
        let eventData: any = {};
        
        if (msg.payload) {
          // Standard format: msg.payload contains the event data
          payload = msg.payload;
          eventData = {
            EventUuid: msg.event?.EventUuid || msg.EventUuid || '',
            replayId: msg.event?.replayId ?? msg.replayId ?? msg.ReplayId ?? '',
            EventApiName: msg.event?.EventApiName || msg.EventApiName || 'Account__e',
          };
        } else if (msg.event && msg.event.payload) {
          // Nested format
          payload = msg.event.payload;
          eventData = {
            EventUuid: msg.event.EventUuid || '',
            replayId: msg.event.replayId || '',
            EventApiName: msg.event.EventApiName || 'Account__e',
          };
        } else if (msg.RecordId__c || msg.Record_Id__c || msg.Identifier__c) {
          // Direct fields format (fields at root level)
          payload = msg;
          eventData = {
            EventUuid: msg.EventUuid || '',
            replayId: msg.ReplayId || msg.replayId || '',
            EventApiName: msg.EventApiName || 'Account__e',
          };
        } else {
          // Unknown format - log and skip
          logger.warn(`⚠️  Unknown message format on ${channel}, skipping: ${JSON.stringify(message)}`);
          return;
        }

        normalizePlatformEventPayload(payload);

        const event: PlatformEvent = {
          schema: msg.schema || '',
          payload: payload,
          event: eventData,
        };

        // Apply filters if provided
        if (options.filter) {
          const payloadRid = getPlatformEventRecordId(event.payload);
          if (options.filter.recordId && !salesforceIdsMatch(payloadRid, options.filter.recordId)) {
            return; // Skip this event
          }
          if (
            options.filter.identifier &&
            String(event.payload.Identifier__c || '').toLowerCase() !== options.filter.identifier.toLowerCase()
          ) {
            return; // Skip this event
          }
          if (options.filter.eventApiName && event.event.EventApiName !== options.filter.eventApiName) {
            return; // Skip this event
          }
        }

        // Store event
        this.receivedEvents.push(event);
        
        logger.info(`📨 Received Platform Event:`);
        logger.info(`   Channel: ${channel}`);
        logger.info(`   Record id: ${getPlatformEventRecordId(event.payload) || '(none)'}`);
        logger.info(`   Identifier__c: ${event.payload.Identifier__c}`);
        logger.info(`   Is_Active__c: ${JSON.stringify(getPlatformEventPayloadIsActive(event.payload))}`);
        logger.info(`   EventUuid: ${event.event.EventUuid}`);
        logger.info(`   ReplayId: ${event.event.replayId}`);

        // Notify any waiting listeners immediately
        if (this.eventListeners && this.eventListeners.length > 0) {
          this.eventListeners.forEach(listener => {
            try {
              listener(event);
            } catch (error: any) {
              logger.warn(`Error in event listener: ${error.message}`);
            }
          });
        }
      });

      this.subscriptions.set(channel, subscription);

      // Faye subscription returns a promise that resolves when subscribed
      // Wait for subscription confirmation
      try {
        await subscription;
        logger.info(`✅ Successfully subscribed to channel: ${channel}`);
      } catch (error: any) {
        logger.error(`❌ Subscription failed for channel ${channel}: ${error.message}`);
        throw new Error(`Failed to subscribe to ${channel}: ${error.message}`);
      }
    } catch (error: any) {
      logger.error(`❌ Failed to subscribe to channel ${channel}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    const subscription = this.subscriptions.get(channel);
    if (subscription) {
      try {
        subscription.cancel();
      } catch (error: any) {
        logger.warn(`Warning: Error canceling subscription: ${error.message}`);
      }
      this.subscriptions.delete(channel);
      logger.info(`🔌 Unsubscribed from channel: ${channel}`);
    }
  }

  /**
   * Wait for an event matching the filter
   * 
   * @param filter Event filter criteria
   * @param timeout Timeout in milliseconds (default: 30000)
   * @returns Promise that resolves with the matching event
   */
  async waitForEvent(
    filter: EventFilter,
    timeout: number = 30000
  ): Promise<PlatformEvent> {
    const startTime = Date.now();

    return new Promise<PlatformEvent>((resolve, reject) => {
      // First, check existing events immediately (no delay)
      for (const event of this.receivedEvents) {
        let matches = true;

        if (filter.recordId && !salesforceIdsMatch(getPlatformEventRecordId(event.payload), filter.recordId)) {
          matches = false;
        }
        if (
          filter.identifier &&
          String(event.payload.Identifier__c || '').toLowerCase() !== filter.identifier.toLowerCase()
        ) {
          matches = false;
        }
        if (filter.eventApiName && event.event.EventApiName !== filter.eventApiName) {
          matches = false;
        }

        if (matches) {
          logger.info(`✅ Found matching event in cache (${Date.now() - startTime}ms)`);
          resolve(event);
          return;
        }
      }

      // If not found, set up listener for new events
      const eventListener = (event: PlatformEvent) => {
        let matches = true;

        if (filter.recordId && !salesforceIdsMatch(getPlatformEventRecordId(event.payload), filter.recordId)) {
          matches = false;
        }
        if (
          filter.identifier &&
          String(event.payload.Identifier__c || '').toLowerCase() !== filter.identifier.toLowerCase()
        ) {
          matches = false;
        }
        if (filter.eventApiName && event.event.EventApiName !== filter.eventApiName) {
          matches = false;
        }

        if (matches) {
          // Find and clear intervals/timeouts
          // Note: We can't directly access them here, so we'll use a flag
          logger.info(`✅ Received matching event via listener (${Date.now() - startTime}ms)`);
          // Remove listener
          this.eventListeners = this.eventListeners.filter(l => l !== eventListener);
          resolve(event);
        }
      };

      // Store listener for cleanup
      this.eventListeners.push(eventListener);

      // Set up timeout
      const timeoutInterval = setTimeout(() => {
        clearInterval(checkInterval);
        this.eventListeners = this.eventListeners.filter(l => l !== eventListener);
        reject(
          new Error(
            `Timeout waiting for Platform Event (${timeout}ms). Filter: ${JSON.stringify(filter)}. ` +
            `Received ${this.receivedEvents.length} events total.`
          )
        );
      }, timeout);

      // Also poll periodically as fallback (in case events are missed)
      const checkInterval = setInterval(() => {
        // Check existing events
        for (const event of this.receivedEvents) {
          let matches = true;

          if (filter.recordId && !salesforceIdsMatch(getPlatformEventRecordId(event.payload), filter.recordId)) {
            matches = false;
          }
          if (
            filter.identifier &&
            String(event.payload.Identifier__c || '').toLowerCase() !== filter.identifier.toLowerCase()
          ) {
            matches = false;
          }
          if (filter.eventApiName && event.event.EventApiName !== filter.eventApiName) {
            matches = false;
          }

          if (matches) {
            clearInterval(checkInterval);
            clearTimeout(timeoutInterval);
            this.eventListeners = this.eventListeners.filter(l => l !== eventListener);
            resolve(event);
            return;
          }
        }

        // Check timeout
        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          clearTimeout(timeoutInterval);
          this.eventListeners = this.eventListeners.filter(l => l !== eventListener);
          reject(
            new Error(
              `Timeout waiting for Platform Event. Filter: ${JSON.stringify(filter)}. ` +
              `Received ${this.receivedEvents.length} events total.`
            )
          );
        }
      }, 100); // Check every 100ms for faster response
    });
  }

  /**
   * Get all received events
   */
  getEvents(): PlatformEvent[] {
    return [...this.receivedEvents];
  }

  /**
   * Clear received events
   */
  clearEvents(): void {
    this.receivedEvents = [];
    logger.info('🧹 Cleared received events');
  }

  /** Events received on the subscription matching this platform event API name (e.g. Account_Relationship_Event__e). */
  getEventsForApiName(eventApiName: string): PlatformEvent[] {
    return this.receivedEvents.filter((e) => e.event.EventApiName === eventApiName);
  }

  /**
   * After {@link clearEvents}, poll until durationMs elapses. Throws if any matching platform events arrive.
   * Used when no relationship Id exists (failed save) but the channel must stay quiet.
   */
  async assertNoNewEventsForApiNameDuring(eventApiName: string, durationMs: number): Promise<void> {
    const deadline = Date.now() + durationMs;
    while (Date.now() < deadline) {
      const found = this.getEventsForApiName(eventApiName);
      if (found.length > 0) {
        const pl = found[0].payload;
        throw new Error(
          `Expected no ${eventApiName} platform events after clear, but received ${found.length} ` +
            `(e.g. Record_Id__c=${pl?.Record_Id__c ?? pl?.RecordId__c}, Identifier__c=${pl?.Identifier__c}).`
        );
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    logger.info(`✅ No ${eventApiName} events during ${durationMs}ms`);
  }

  /**
   * Disconnect from Streaming API
   */
  async disconnect(): Promise<void> {
    // Unsubscribe from all channels
    for (const [channel] of this.subscriptions) {
      await this.unsubscribe(channel);
    }

    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.isConnected = false;
      logger.info('🔌 Disconnected from Streaming API');
    }
  }

  /**
   * Check if connected
   */
  isClientConnected(): boolean {
    return this.isConnected;
  }
}
