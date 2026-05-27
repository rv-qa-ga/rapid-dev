import { APIRequestContext } from '@playwright/test';
import { BaseAPIClient } from '../base/BaseAPIClient';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { JWTAuthResult, SalesforceJWTAuth } from '../../utils/jwt-auth';
import {
  bodyIndicatesDuplicatesDetected,
  bodyIndicatesValidationException,
  extractDuplicateRuleNames,
} from '../../utils/sf-duplicate-api-parse';

export interface SalesforceAccount {
  Name: string;
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  [key: string]: any;
}

export interface SalesforceResponse {
  id?: string;
  success?: boolean;
  errors?: Array<{ message: string; statusCode: string }>;
  [key: string]: any;
}

export class SalesforceAPIClient extends BaseAPIClient {
  private apiVersion: string;

  constructor(apiContext: APIRequestContext) {
    const sfConfig = config.getSalesforceConfig();
    super(apiContext, sfConfig.baseUrl);
    this.apiVersion = sfConfig.apiVersion;
  }

  /**
   * Authenticate and get access token using JWT
   * @param explicitJwtUsername - If set (e.g. SF-883 as QA MRD), used for JWT sub; wins over env.
   * Otherwise: SF_API_JWT_USERNAME, or SF_USE_QA_MRD_FOR_API + SF_QAMRDUSER_JWT_USERNAME, then default JWT user.
   */
  async authenticate(explicitJwtUsername?: string): Promise<string> {
    logger.info('Authenticating with Salesforce using JWT...');

    let usernameOverride: string | undefined = explicitJwtUsername?.trim() || undefined;
    if (usernameOverride) {
      logger.info(`Using explicit JWT username for API: ${usernameOverride}`);
    } else if (process.env.SF_API_JWT_USERNAME) {
      usernameOverride = process.env.SF_API_JWT_USERNAME;
      logger.info(`Using API user override: ${usernameOverride}`);
    } else if (process.env.SF_USE_QA_MRD_FOR_API === 'true' && process.env.SF_QAMRDUSER_JWT_USERNAME) {
      usernameOverride = process.env.SF_QAMRDUSER_JWT_USERNAME;
      logger.info(`Using QA MRD User for API (SF_USE_QA_MRD_FOR_API): ${usernameOverride}`);
    }

    try {
      const authResult = await SalesforceJWTAuth.authenticate(usernameOverride);
      
      this.setAccessToken(authResult.accessToken);
      // Ensure baseURL doesn't have trailing slash
      this.baseURL = authResult.instanceUrl.replace(/\/$/, '');
      logger.info(`Using Salesforce instance URL: ${this.baseURL}`);
      logger.info(`API Version: ${this.apiVersion}`);

      logger.info('JWT authentication successful');
      return authResult.accessToken;
    } catch (error: any) {
      logger.error(`JWT authentication error: ${error.message}`);
      const envName = config.getEnvironment();
      throw new Error(
        `JWT authentication failed. Please configure JWT credentials in src/config/env/.env.${envName}. Error: ${error.message}`
      );
    }
  }

  /**
   * Apply an existing JWT exchange result (token + instance URL), e.g. for a second org on the same Playwright API context.
   */
  applyJwtAuthResult(auth: JWTAuthResult): void {
    this.setAccessToken(auth.accessToken);
    this.baseURL = auth.instanceUrl.replace(/\/$/, '');
    logger.info(`Salesforce client instance URL set to: ${this.baseURL}`);
  }

  /** Current REST host (instance URL without trailing slash). */
  getInstanceUrl(): string {
    return this.baseURL.replace(/\/$/, '');
  }

  /**
   * Get API endpoint URL
   */
  private getAPIEndpoint(path: string): string {
    // Keep 'v' prefix if present (Salesforce accepts both v60.0 and 60.0, but v60.0 is more standard)
    const apiVersion = this.apiVersion.startsWith('v') ? this.apiVersion : `v${this.apiVersion}`;
    return `/services/data/${apiVersion}${path}`;
  }

  /**
   * Try alternative API versions if the default fails
   */
  private async tryAlternativeApiVersions(endpointPath: string): Promise<any> {
    const alternativeVersions = ['58.0', '59.0', '57.0', '56.0'];
    const currentVersion = this.apiVersion.startsWith('v') ? this.apiVersion.substring(1) : this.apiVersion;
    
    // Try alternatives (skip current since it already failed)
    const versionsToTry = alternativeVersions.filter(v => v !== currentVersion);
    
    for (const version of versionsToTry) {
      try {
        const testEndpoint = `/services/data/${version}${endpointPath}`;
        logger.debug(`Trying API version ${version}...`);
        const response = await this.get(testEndpoint);
        if (this.isSuccess(response)) {
          logger.info(`✅ API version ${version} works! Using this version for future calls.`);
          // Update API version for future calls
          this.apiVersion = `v${version}`;
          return await this.parseJSON<SalesforceResponse>(response);
        }
      } catch (error: any) {
        logger.debug(`API version ${version} failed: ${error.message}`);
        continue;
      }
    }
    
    throw new Error(`All API versions failed. Tried: ${currentVersion}, ${versionsToTry.join(', ')}`);
  }


  /**
   * Create a record
   * @param options.timeout - Override default API timeout (ms); use for heavy-trigger objects (e.g. MLER + platform events)
   */
  async createRecord(
    sobjectType: string,
    record: Record<string, any>,
    options?: { timeout?: number }
  ): Promise<SalesforceResponse> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/`);
    logger.info(`Creating ${sobjectType} record`);
    logger.debug(`Request payload: ${JSON.stringify(record, null, 2)}`);

    const response = await this.post(endpoint, record, {
      timeout: options?.timeout,
    });

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorData = JSON.parse(errorText);
        // Salesforce returns array of errors
        if (Array.isArray(errorData)) {
          errorMessage = errorData.map((e: any) => e.message || JSON.stringify(e)).join('; ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          errorMessage = JSON.stringify(errorData.errors);
        }
      } catch {
        // Keep original text if not JSON
      }
      throw new Error(`Failed to create record: ${errorMessage}`);
    }

    return await this.parseJSON<SalesforceResponse>(response);
  }

  /**
   * POST sobject create without throwing; for duplicate-rule testing.
   * Default request headers include `Sforce-Duplicate-Rule-Header: allowSave=true` (BaseAPIClient).
   * Set `duplicateRuleAllowSave: false` to send `allowSave=false` so Alert duplicate rules surface
   * `DUPLICATES_DETECTED` without persisting the row until a follow-up create with allowSave=true.
   */
  async createRecordRaw(
    sobjectType: string,
    record: Record<string, any>,
    options?: { timeout?: number; duplicateRuleAllowSave?: boolean }
  ): Promise<{
    ok: boolean;
    httpStatus: number;
    body: unknown;
    rawText: string;
    recordId?: string;
    /** Salesforce returned `errorCode: DUPLICATES_DETECTED` (SF-1083 alert / Block rule path). */
    duplicateDetected: boolean;
    /** Salesforce returned `FIELD_CUSTOM_VALIDATION_EXCEPTION` (Apex / validation rule path — e.g. LOB). */
    validationDetected: boolean;
    /** Names of all DuplicateRules that fired (empty if none). */
    duplicateRules: string[];
  }> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/`);
    logger.info(`Creating ${sobjectType} record (raw, no throw)`);
    logger.debug(`Request payload: ${JSON.stringify(record, null, 2)}`);

    const headers: Record<string, string> = {};
    if (options?.duplicateRuleAllowSave === false) {
      headers['Sforce-Duplicate-Rule-Header'] = 'allowSave=false';
    } else if (options?.duplicateRuleAllowSave === true) {
      headers['Sforce-Duplicate-Rule-Header'] = 'allowSave=true';
    }

    const response = await this.post(endpoint, record, {
      headers,
      timeout: options?.timeout,
    });
    const httpStatus = response.status();
    let rawText: string;
    try {
      rawText = (await response.text()) || '';
    } catch {
      rawText = '';
    }
    let body: unknown;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = { _parseError: true, rawSnippet: rawText.slice(0, 8000) };
    }

    let recordId: string | undefined;
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const o = body as Record<string, unknown>;
      if (typeof o.id === 'string') recordId = o.id;
    }

    const duplicateDetected = bodyIndicatesDuplicatesDetected(body, rawText) && httpStatus >= 400;
    const validationDetected = bodyIndicatesValidationException(body) && httpStatus >= 400;
    const duplicateRules = extractDuplicateRuleNames(body);

    return {
      ok: httpStatus >= 200 && httpStatus < 300,
      httpStatus,
      body,
      rawText,
      recordId,
      duplicateDetected,
      validationDetected,
      duplicateRules,
    };
  }

  /**
   * Get a record by ID
   */
  async getRecord(sobjectType: string, recordId: string): Promise<SalesforceResponse> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/${recordId}`);
    logger.info(`Getting ${sobjectType} record: ${recordId}`);
    logger.debug(`Full URL will be: ${this.baseURL}${endpoint}`);

    try {
      const response = await this.get(endpoint);

      if (!this.isSuccess(response)) {
        // If 404, try alternative API versions
        if (response.status() === 404) {
          logger.warn(`API version ${this.apiVersion} returned 404, trying alternative versions...`);
          return await this.tryAlternativeApiVersions(`/sobjects/${sobjectType}/${recordId}`);
        }
        const errorText = await response.text();
        throw new Error(`Failed to get record: ${errorText}`);
      }

      return await this.parseJSON<SalesforceResponse>(response);
    } catch (error: any) {
      // If error contains NOT_FOUND, try alternative API versions
      if (error.message.includes('NOT_FOUND') || error.message.includes('404')) {
        logger.warn(`getRecord failed with 404, trying alternative API versions...`);
        return await this.tryAlternativeApiVersions(`/sobjects/${sobjectType}/${recordId}`);
      }
      throw error;
    }
  }

  /**
   * Update a record
   */
  async updateRecord(
    sobjectType: string,
    recordId: string,
    record: Record<string, any>
  ): Promise<void> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/${recordId}`);
    logger.info(`Updating ${sobjectType} record: ${recordId}`);

    const response = await this.patch(endpoint, record);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to update record: ${errorText}`);
    }
  }

  /**
   * Full HTTPS URI for SObject describe (audit / Zephyr evidence).
   */
  getSObjectDescribeUri(sobjectType: string): string {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/describe`);
    return `${this.baseURL.replace(/\/$/, '')}${endpoint}`;
  }

  /**
   * Full HTTPS URI for a SOQL query (audit / Zephyr evidence).
   */
  getSoqlQueryUri(soql: string): string {
    const encoded = encodeURIComponent(soql.replace(/\s+/g, ' ').trim());
    const endpoint = `${this.getAPIEndpoint(`/query/`)}?q=${encoded}`;
    return `${this.baseURL.replace(/\/$/, '')}${endpoint}`;
  }

  /**
   * Full HTTPS URI for REST PATCH on a record (audit / Zephyr evidence).
   */
  getRecordPatchUri(sobjectType: string, recordId: string): string {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/${recordId}`);
    return `${this.baseURL.replace(/\/$/, '')}${endpoint}`;
  }

  /**
   * PATCH sobject; returns HTTP status and body without throwing (negative tests + evidence).
   */
  async patchSObjectRaw(
    sobjectType: string,
    recordId: string,
    record: Record<string, unknown>
  ): Promise<{ ok: boolean; uri: string; httpStatus: number; responseBody: string }> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/${recordId}`);
    const url = `${this.baseURL.replace(/\/$/, '')}${endpoint}`;
    logger.info(`PATCH ${url}`);

    const response = await this.apiContext.fetch(url, {
      method: 'PATCH',
      headers: { ...this.getDefaultHeaders() },
      data: record,
      timeout: this.timeouts.api,
    });

    const httpStatus = response.status();
    let responseBody: string;
    try {
      responseBody = (await response.text()) || '(empty)';
    } catch {
      responseBody = '(unreadable)';
    }

    return {
      ok: httpStatus >= 200 && httpStatus < 300,
      uri: url,
      httpStatus,
      responseBody,
    };
  }

  /**
   * Delete a record
   */
  async deleteRecord(sobjectType: string, recordId: string): Promise<void> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/${recordId}`);
    logger.info(`Deleting ${sobjectType} record: ${recordId}`);

    const response = await this.delete(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to delete record: ${errorText}`);
    }
  }

  /**
   * Query records using SOQL
   */
  async query(soql: string): Promise<SalesforceResponse> {
    logger.info(`Executing SOQL query: ${soql.replace(/\s+/g, ' ').trim()}`);

    // URL encode the SOQL query properly
    const encodedSoql = encodeURIComponent(soql.replace(/\s+/g, ' ').trim());
    
    // Build full URL with query parameter (like test script does)
    const endpoint = `${this.getAPIEndpoint(`/query/`)}?q=${encodedSoql}`;

    try {
      const response = await this.get(endpoint);

      if (!this.isSuccess(response)) {
        // If 404, try alternative API versions
        if (response.status() === 404) {
          logger.warn(`API version ${this.apiVersion} returned 404, trying alternative versions...`);
          return await this.tryAlternativeApiVersions(`/query/?q=${encodedSoql}`);
        }
        const errorText = await response.text();
        throw new Error(`Query failed: ${errorText}`);
      }

      return await this.parseJSON<SalesforceResponse>(response);
    } catch (error: any) {
      // If error contains NOT_FOUND, try alternative API versions
      if (error.message.includes('NOT_FOUND') || error.message.includes('404')) {
        logger.warn(`Query failed with 404, trying alternative API versions...`);
        return await this.tryAlternativeApiVersions(`/query/?q=${encodedSoql}`);
      }
      throw error;
    }
  }

  /**
   * PATCH request (for updates)
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

  /**
   * Create an Account
   */
  async createAccount(account: SalesforceAccount): Promise<SalesforceResponse> {
    return await this.createRecord('Account', account);
  }

  /**
   * Get Account by ID
   */
  async getAccount(accountId: string): Promise<SalesforceResponse> {
    return await this.getRecord('Account', accountId);
  }

  /**
   * Find Account by Name
   */
  async findAccountByName(accountName: string): Promise<SalesforceResponse | null> {
    const soql = `SELECT Id, Name FROM Account WHERE Name = '${accountName}' LIMIT 1`;
    const result = await this.query(soql);

    if (result.records && result.records.length > 0) {
      return result.records[0];
    }

    return null;
  }

  /**
   * Delete Account by Name (idempotent)
   */
  async deleteAccountByName(accountName: string): Promise<void> {
    const account = await this.findAccountByName(accountName);
    if (account && account.Id) {
      await this.deleteRecord('Account', account.Id);
      logger.info(`Deleted existing account: ${accountName}`);
    }
  }

  /**
   * REST describeGlobal — list all sObjects (name, custom flag, etc.).
   * @see https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/resources_describeGlobal.htm
   */
  async describeGlobal(): Promise<{
    sobjects: Array<{ name: string; custom: boolean; label?: string; createable?: boolean }>;
  }> {
    const endpoint = this.getAPIEndpoint('/sobjects/');
    logger.info('Fetching describeGlobal (sobjects list)');
    const response = await this.get(endpoint);
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`describeGlobal failed (${response.status()}): ${errorText.slice(0, 800)}`);
    }
    const body = await response.json();
    if (!body || !Array.isArray(body.sobjects)) {
      throw new Error('describeGlobal: unexpected response shape (missing sobjects array)');
    }
    return body as {
      sobjects: Array<{ name: string; custom: boolean; label?: string; createable?: boolean }>;
    };
  }

  /**
   * Run Tooling SOQL with pagination until done (aggregates all records).
   */
  async toolingQueryAllRecords(soql: string): Promise<unknown[]> {
    const apiVersion = this.apiVersion.startsWith('v') ? this.apiVersion : `v${this.apiVersion}`;
    const encoded = encodeURIComponent(soql.replace(/\s+/g, ' ').trim());
    let endpoint: string = `/services/data/${apiVersion}/tooling/query?q=${encoded}`;
    const all: unknown[] = [];

    for (;;) {
      logger.info('Tooling query page (truncated SOQL):', soql.slice(0, 120));
      const response = await this.get(endpoint);
      if (!this.isSuccess(response)) {
        const errorText = await response.text();
        throw new Error(`Tooling query failed (${response.status()}): ${errorText.slice(0, 800)}`);
      }
      const data = (await response.json()) as {
        records?: unknown[];
        done?: boolean;
        nextRecordsUrl?: string;
        totalSize?: number;
      };
      if (Array.isArray(data.records)) {
        all.push(...data.records);
      }
      if (data.done !== false && !data.nextRecordsUrl) {
        break;
      }
      if (!data.nextRecordsUrl) {
        if (data.done === false) {
          throw new Error('Tooling query pagination incomplete: done=false but nextRecordsUrl missing');
        }
        break;
      }
      const next = data.nextRecordsUrl;
      endpoint = next.startsWith('http') ? new URL(next).pathname + new URL(next).search : next;
    }

    return all;
  }

  /**
   * Describe an SObject to get field metadata
   * Used for verifying field existence and FLS
   */
  async describeSObject(sobjectType: string): Promise<any> {
    const audit = await this.fetchSObjectDescribeAudit(sobjectType);
    if (
      audit.ok &&
      audit.body &&
      typeof audit.body === 'object' &&
      Array.isArray((audit.body as { fields?: unknown }).fields)
    ) {
      return audit.body;
    }
    const msg =
      typeof audit.body === 'object' && audit.body !== null
        ? JSON.stringify(audit.body).slice(0, 800)
        : String(audit.body);
    throw new Error(`Failed to describe ${sobjectType} (${audit.status}): ${msg}`);
  }

  /**
   * GET sobject describe with full HTTP metadata for test evidence (Zephyr / Cucumber attachments).
   * Does not throw on non-2xx — callers attach status + body for audits.
   */
  async fetchSObjectDescribeAudit(sobjectType: string): Promise<{
    requestUrl: string;
    ok: boolean;
    status: number;
    body: unknown;
  }> {
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/describe`);
    const requestUrl = `${this.baseURL}${endpoint}`;
    logger.info(`Describing SObject (audit): ${sobjectType}`);

    const response = await this.get(endpoint);
    const status = response.status();
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { _parseError: true, rawSnippet: text.slice(0, 8000) };
    }
    return { requestUrl, ok: this.isSuccess(response), status, body };
  }

  /**
   * Get a record by ID with specific fields
   */
  async getRecordWithFields(
    sobjectType: string, 
    recordId: string, 
    fields: string[]
  ): Promise<SalesforceResponse> {
    const fieldsParam = fields.join(',');
    const endpoint = this.getAPIEndpoint(`/sobjects/${sobjectType}/${recordId}?fields=${fieldsParam}`);
    logger.info(`Getting ${sobjectType} record ${recordId} with fields: ${fieldsParam}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get record: ${errorText}`);
    }

    return await this.parseJSON<SalesforceResponse>(response);
  }

  /**
   * Convert a Lead to Opportunity, Account, and Contact
   * @param leadId The ID of the Lead to convert
   * @param options Conversion options
   * @returns Conversion result with opportunityId, accountId, contactId
   */
  async convertLead(
    leadId: string,
    options: {
      convertedStatus?: string;
      doNotCreateOpportunity?: boolean;
      opportunityName?: string;
      overwriteLeadSource?: boolean;
      accountId?: string;
      contactId?: string;
      ownerId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    opportunityId?: string;
    accountId?: string;
    contactId?: string;
    errors?: Array<{ message: string; statusCode: string }>;
  }> {
    // Verify Lead exists using SOQL (more reliable than getRecord)
    try {
      const soql = `SELECT Id, Status, IsConverted FROM Lead WHERE Id = '${leadId}' LIMIT 1`;
      const queryResult = await this.query(soql);
      if (queryResult.records && queryResult.records.length > 0) {
        const lead = queryResult.records[0];
        logger.debug(`Lead verified: Status=${lead.Status}, IsConverted=${lead.IsConverted}`);
        if (lead.IsConverted) {
          throw new Error(`Lead ${leadId} is already converted`);
        }
      } else {
        logger.warn(`Lead ${leadId} not found via SOQL query`);
      }
    } catch (error: any) {
      if (error.message?.includes('already converted')) {
        throw error;
      }
      logger.warn(`Could not verify Lead ${leadId} before conversion: ${error.message}`);
    }

    // Use API version 58.0 for Lead conversion (same as TestDataFactory uses)
    // API version 60.0 may not support Lead conversion endpoint
    const convertApiVersion = '58.0';
    const endpoint = `/services/data/${convertApiVersion}/sobjects/Lead/${leadId}/convert`;
    logger.info(`Converting Lead ${leadId} to Opportunity`);
    logger.debug(`Using endpoint: ${endpoint} (API version ${convertApiVersion})`);

    const payload = {
      convertedStatus: options.convertedStatus || 'Qualified',
      doNotCreateOpportunity: options.doNotCreateOpportunity || false,
      opportunityName: options.opportunityName || `Test Opportunity ${Date.now()}`,
      overwriteLeadSource: options.overwriteLeadSource || false,
      ...(options.accountId && { accountId: options.accountId }),
      ...(options.contactId && { contactId: options.contactId }),
      ...(options.ownerId && { ownerId: options.ownerId }),
    };

    logger.debug(`Conversion payload: ${JSON.stringify(payload, null, 2)}`);

    const response = await this.post(endpoint, payload);

    if (!this.isSuccess(response)) {
      const status = response.status();
      const errorText = await response.text();
      let errorMessage = errorText;
      
      try {
        const errorData = JSON.parse(errorText);
        if (Array.isArray(errorData)) {
          errorMessage = errorData.map((e: any) => e.message || JSON.stringify(e)).join('; ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          errorMessage = JSON.stringify(errorData.errors);
        }
      } catch {
        // Keep original text if not JSON
      }
      
      // Provide more helpful error message for 404
      if (status === 404) {
        throw new Error(
          `Failed to convert Lead: The convert endpoint returned 404. ` +
          `Possible causes: (1) API user lacks "Convert Leads" permission, ` +
          `(2) Lead conversion via API is disabled in org settings, ` +
          `(3) The Lead ${leadId} does not exist or is not accessible, ` +
          `(4) API version ${convertApiVersion} endpoint format issue. ` +
          `Original error: ${errorMessage}. ` +
          `Please verify: User has "Convert Leads" permission and Lead conversion is enabled for API.`
        );
      }
      
      throw new Error(`Failed to convert Lead: ${errorMessage}`);
    }

    const result = await this.parseJSON<{
      success: boolean;
      opportunityId?: string;
      accountId?: string;
      contactId?: string;
      errors?: Array<{ message: string; statusCode: string }>;
    }>(response);

    logger.info(`✅ Lead converted successfully. Opportunity: ${result.opportunityId}, Account: ${result.accountId}, Contact: ${result.contactId}`);
    return result;
  }

  /**
   * Run a Tooling API SOQL query (e.g. FieldDefinition for history tracking).
   */
  async toolingQuery<T extends { records?: unknown[]; totalSize?: number }>(soql: string): Promise<T> {
    const apiVersion = this.apiVersion.startsWith('v') ? this.apiVersion : `v${this.apiVersion}`;
    const encoded = encodeURIComponent(soql.replace(/\s+/g, ' ').trim());
    const endpoint = `/services/data/${apiVersion}/tooling/query?q=${encoded}`;
    logger.info('Executing Tooling SOQL query (truncated):', soql.slice(0, 200));

    const response = await this.get(endpoint);
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Tooling query failed (${response.status()}): ${errorText.slice(0, 800)}`);
    }
    return await this.parseJSON<T>(response);
  }
}

