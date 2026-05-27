/**
 * Dynamics 365 CRM (Dataverse) API Client
 * Extends BaseAPIClient to provide Dynamics-specific API methods
 * Uses OData Web API v9.2
 */

import { APIRequestContext } from '@playwright/test';
import { BaseAPIClient } from '../base/BaseAPIClient';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { DynamicsAuth } from '../../utils/dynamics-auth';

export interface DynamicsAccount {
  name: string;
  accountnumber?: string;
  telephone1?: string;
  websiteurl?: string;
  address1_line1?: string;
  address1_city?: string;
  address1_stateorprovince?: string;
  address1_postalcode?: string;
  address1_country?: string;
  [key: string]: any;
}

export interface DynamicsResponse {
  [key: string]: any;
}

export interface WhoAmIResponse {
  BusinessUnitId: string;
  UserId: string;
  OrganizationId: string;
}

/** HTTP metadata for WhoAmI — useful to correlate with Dataverse / support logs. */
export interface WhoAmIDiagnostics {
  body: WhoAmIResponse;
  /** e.g. `x-ms-request-id` */
  requestId?: string;
  /** e.g. `x-ms-correlation-request-id` */
  correlationRequestId?: string;
}

/**
 * Dynamics 365 API Client
 * Handles all API interactions with Dynamics 365 CRM (Dataverse)
 */
export class DynamicsAPIClient extends BaseAPIClient {
  private apiVersion: string;

  constructor(apiContext: APIRequestContext) {
    const d365Config = config.getDynamicsConfig();
    // Use Web API base URL (e.g., https://accelinsqatest.crm11.dynamics.com/api/data/v9.2/)
    // Strip trailing slashes so `${baseURL}${endpoint}` in BaseAPIClient does not produce //entity
    const rawBase = d365Config.webApiBaseUrl || `${d365Config.baseUrl}/api/data/v9.2/`;
    const baseUrl = rawBase.replace(/\/+$/, '');
    super(apiContext, baseUrl);
    this.apiVersion = d365Config.apiVersion || 'v9.2';
  }

  /**
   * Authenticate and get access token using OAuth2 client credentials
   */
  async authenticate(): Promise<string> {
    logger.info('Authenticating with Dynamics 365 using OAuth2 client credentials...');

    try {
      const authResult = await DynamicsAuth.authenticate();
      this.setAccessToken(authResult.accessToken);

      logger.info('Dynamics OAuth2 authentication successful');
      return authResult.accessToken;
    } catch (error: any) {
      logger.error(`Dynamics authentication error: ${error.message}`);
      const envName = config.getEnvironment();
      throw new Error(
        `Dynamics OAuth2 authentication failed. Please configure OAuth2 credentials in src/config/env/.env.${envName}. Error: ${error.message}`
      );
    }
  }

  /**
   * Override getDefaultHeaders to exclude Salesforce-specific headers
   * Dynamics uses standard OAuth2 Bearer token authentication
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      'Prefer': 'return=representation', // Return created/updated entity in response
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Get API endpoint URL (Dynamics uses OData entity set names)
   * Note: Dynamics entity set names are typically plural and lowercase (e.g., 'accounts', 'contacts')
   */
  private getEntityEndpoint(entitySetName: string, recordId?: string): string {
    if (recordId) {
      // OData format: /accounts(<guid>)
      return `/${entitySetName}(${recordId})`;
    }
    return `/${entitySetName}`;
  }

  /**
   * WhoAmI endpoint - Returns information about the current user
   * GET /api/data/v9.2/WhoAmI
   */
  async whoAmI(): Promise<WhoAmIResponse> {
    return (await this.whoAmIWithDiagnostics()).body;
  }

  /**
   * WhoAmI plus Dataverse tracing headers (when present).
   */
  async whoAmIWithDiagnostics(): Promise<WhoAmIDiagnostics> {
    const endpoint = '/WhoAmI';
    logger.info('Calling WhoAmI endpoint');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`WhoAmI request failed: ${errorText}`);
    }

    const body = await this.parseJSON<WhoAmIResponse>(response);
    const h = response.headers();
    const requestId =
      (h['x-ms-request-id'] as string | undefined) ||
      (h['x-ms-requestid'] as string | undefined) ||
      (h['request-id'] as string | undefined);
    const correlationRequestId =
      (h['x-ms-correlation-request-id'] as string | undefined) ||
      (h['x-ms-correlation-requestid'] as string | undefined);

    return {
      body,
      requestId: requestId?.trim() || undefined,
      correlationRequestId: correlationRequestId?.trim() || undefined,
    };
  }

  /**
   * Create a record (POST)
   * Dynamics uses entity set names (e.g., 'accounts' for Account entity)
   */
  async createRecord(entitySetName: string, record: Record<string, any>): Promise<DynamicsResponse> {
    const endpoint = this.getEntityEndpoint(entitySetName);
    logger.info(`Creating ${entitySetName} record`);
    logger.debug(`Request payload: ${JSON.stringify(record, null, 2)}`);

    const response = await this.post(endpoint, record);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorData = JSON.parse(errorText);
        // Dynamics returns error object with 'error' property
        if (errorData.error) {
          if (errorData.error.message) {
            errorMessage = errorData.error.message;
          } else if (errorData.error.code) {
            errorMessage = `${errorData.error.code}: ${JSON.stringify(errorData.error)}`;
          } else {
            errorMessage = JSON.stringify(errorData.error);
          }
        }
      } catch {
        // Keep original text if not JSON
      }
      throw new Error(`Failed to create record: ${errorMessage}`);
    }

    // Dynamics returns the created record with @odata.context and entity data
    const result = await this.parseJSON<DynamicsResponse>(response);
    
    // Extract the record ID from response headers or response body
    // Dynamics typically returns the ID in the response body or in the Location header
    const locationHeader = response.headers()['odata-entityid'] || response.headers()['location'];
    if (locationHeader) {
      // Extract GUID from URL like: https://...api/data/v9.2/accounts(<guid>)
      const match = locationHeader.match(/\(([a-f0-9-]{36})\)/i);
      if (match) {
        result.id = match[1];
      }
    }

    return result;
  }

  /**
   * Get a record by ID (GET)
   */
  async getRecord(entitySetName: string, recordId: string, fields?: string[]): Promise<DynamicsResponse> {
    let endpoint = this.getEntityEndpoint(entitySetName, recordId);
    
    // Add $select parameter if specific fields requested
    if (fields && fields.length > 0) {
      const selectParam = fields.join(',');
      endpoint += `?$select=${encodeURIComponent(selectParam)}`;
    }

    logger.info(`Getting ${entitySetName} record: ${recordId}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get record: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Update a record (PATCH)
   */
  async updateRecord(
    entitySetName: string,
    recordId: string,
    record: Record<string, any>
  ): Promise<void> {
    const endpoint = this.getEntityEndpoint(entitySetName, recordId);
    logger.info(`Updating ${entitySetName} record: ${recordId}`);

    const response = await this.patch(endpoint, record);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to update record: ${errorText}`);
    }
  }

  /**
   * Delete a record (DELETE)
   */
  async deleteRecord(entitySetName: string, recordId: string): Promise<void> {
    const endpoint = this.getEntityEndpoint(entitySetName, recordId);
    logger.info(`Deleting ${entitySetName} record: ${recordId}`);

    const response = await this.delete(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to delete record: ${errorText}`);
    }
  }

  /**
   * Query records using OData query syntax
   * Example: $filter=name eq 'Test Account'&$select=accountid,name
   */
  async query(
    entitySetName: string,
    queryParams?: Record<string, string>,
    options?: { headers?: Record<string, string> }
  ): Promise<DynamicsResponse> {
    let endpoint = `/${entitySetName}`;
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value);
      });
      endpoint += `?${params.toString()}`;
    }

    logger.info(`Querying ${entitySetName} with params: ${JSON.stringify(queryParams || {})}`);

    const response = await this.get(endpoint, { headers: options?.headers });

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Query failed: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * OData $count — returns number of rows (optional $filter).
   */
  async countRecords(
    entitySetName: string,
    queryParams?: Record<string, string>
  ): Promise<number> {
    let endpoint = `/${entitySetName}/$count`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value);
      });
      endpoint += `?${params.toString()}`;
    }

    logger.info(`Counting ${entitySetName}: ${endpoint}`);

    const response = await this.get(endpoint);
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Count failed: ${errorText}`);
    }

    const text = (await response.text()).trim();
    const count = parseInt(text, 10);
    if (!Number.isFinite(count)) {
      throw new Error(`Invalid $count response for ${entitySetName}: ${text.slice(0, 200)}`);
    }
    return count;
  }

  /**
   * Follow @odata.nextLink from a previous query (absolute URL from Dataverse).
   */
  async queryByNextLink(nextLink: string): Promise<DynamicsResponse> {
    logger.info(`Querying next page: ${nextLink.slice(0, 120)}...`);
    const response = await this.apiContext.get(nextLink, {
      headers: this.getMinimalHeaders(),
      timeout: this.timeouts.api,
    });
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Query (nextLink) failed: ${errorText}`);
    }
    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * PATCH request (for updates) - Dynamics uses PATCH for updates
   */
  private async patch(
    endpoint: string,
    data?: any,
    options: any = {}
  ): Promise<any> {
    const url = `${this.baseURL}${endpoint}`;
    logger.info(`PATCH ${url}`);

    const response = await this.apiContext.fetch(url, {
      method: 'PATCH',
      headers: { ...this.getDefaultHeaders(), ...options.headers },
      data,
      timeout: options.timeout || this.timeouts.api,
    });

    logger.debug(`Response status: ${response.status}`);
    return response;
  }

  // ============================================================================
  // Account-specific methods (following Salesforce pattern)
  // ============================================================================

  /**
   * Create an Account
   * Note: Dynamics entity set name for Account is typically 'accounts'
   */
  async createAccount(account: DynamicsAccount): Promise<DynamicsResponse> {
    return await this.createRecord('accounts', account);
  }

  /**
   * Get Account by ID
   */
  async getAccount(accountId: string, fields?: string[]): Promise<DynamicsResponse> {
    return await this.getRecord('accounts', accountId, fields);
  }

  /**
   * Find Account by Name using OData $filter
   */
  async findAccountByName(accountName: string): Promise<DynamicsResponse | null> {
    // OData filter: $filter=name eq 'Account Name'
    const encodedName = accountName.replace(/'/g, "''"); // Escape single quotes in OData
    const queryParams = {
      '$filter': `name eq '${encodedName}'`,
      '$select': 'accountid,name',
      '$top': '1'
    };
    
    const result = await this.query('accounts', queryParams);

    // Dynamics returns results in 'value' array
    if (result.value && result.value.length > 0) {
      return result.value[0];
    }

    return null;
  }

  /**
   * Update Account
   */
  async updateAccount(accountId: string, account: Partial<DynamicsAccount>): Promise<void> {
    return await this.updateRecord('accounts', accountId, account);
  }

  /**
   * Delete Account by ID
   */
  async deleteAccount(accountId: string): Promise<void> {
    return await this.deleteRecord('accounts', accountId);
  }

  /**
   * Delete Account by Name (idempotent)
   */
  async deleteAccountByName(accountName: string): Promise<void> {
    const account = await this.findAccountByName(accountName);
    if (account && account.accountid) {
      await this.deleteRecord('accounts', account.accountid);
      logger.info(`Deleted existing account: ${accountName}`);
    }
  }

  // ============================================================================
  // API DISCOVERY METHODS
  // ============================================================================

  /**
   * Get service document (root endpoint)
   * Returns metadata about available entity sets, functions, and actions
   * GET /api/data/v9.2/
   */
  async getServiceDocument(): Promise<DynamicsResponse> {
    const endpoint = '/';
    logger.info('Retrieving Dynamics service document');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get service document: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Get OData metadata document
   * Returns complete metadata about all entities, properties, relationships
   * GET /api/data/v9.2/$metadata
   */
  async getMetadata(): Promise<string> {
    const endpoint = '/$metadata';
    logger.info('Retrieving Dynamics metadata document');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get metadata: ${errorText}`);
    }

    return await response.text();
  }

  /**
   * Get entity definition metadata
   * Returns metadata about a specific entity type
   * GET /api/data/v9.2/EntityDefinitions(LogicalName='account')
   */
  async getEntityDefinition(entityLogicalName: string): Promise<DynamicsResponse> {
    const endpoint = `/EntityDefinitions(LogicalName='${entityLogicalName}')`;
    logger.info(`Retrieving entity definition for: ${entityLogicalName}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get entity definition: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Get all entity definitions
   * Returns metadata about all available entities
   * GET /api/data/v9.2/EntityDefinitions
   */
  async getAllEntityDefinitions(): Promise<DynamicsResponse> {
    const endpoint = '/EntityDefinitions';
    logger.info('Retrieving all entity definitions');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get entity definitions: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Get entity properties
   * Returns all properties for a specific entity
   * GET /api/data/v9.2/EntityDefinitions(LogicalName='account')/Attributes
   */
  async getEntityProperties(entityLogicalName: string): Promise<DynamicsResponse> {
    const endpoint = `/EntityDefinitions(LogicalName='${entityLogicalName}')/Attributes`;
    logger.info(`Retrieving properties for entity: ${entityLogicalName}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get entity properties: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Get entity relationships
   * Returns all relationships for a specific entity
   * GET /api/data/v9.2/EntityDefinitions(LogicalName='account')/OneToManyRelationships
   */
  async getEntityRelationships(entityLogicalName: string): Promise<DynamicsResponse> {
    const endpoint = `/EntityDefinitions(LogicalName='${entityLogicalName}')/OneToManyRelationships`;
    logger.info(`Retrieving relationships for entity: ${entityLogicalName}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get entity relationships: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Get available functions
   * Returns all available OData functions
   * GET /api/data/v9.2/FunctionDefinitions
   */
  async getFunctions(): Promise<DynamicsResponse> {
    const endpoint = '/FunctionDefinitions';
    logger.info('Retrieving available functions');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get functions: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Get available actions
   * Returns all available OData actions
   * GET /api/data/v9.2/ActionDefinitions
   */
  async getActions(): Promise<DynamicsResponse> {
    const endpoint = '/ActionDefinitions';
    logger.info('Retrieving available actions');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get actions: ${errorText}`);
    }

    return await this.parseJSON<DynamicsResponse>(response);
  }

  /**
   * Query entity set with custom query parameters
   * More flexible than the base query method
   */
  async queryEntitySet(entitySetName: string, queryParams?: Record<string, string>): Promise<DynamicsResponse> {
    return await this.query(entitySetName, queryParams);
  }
}

