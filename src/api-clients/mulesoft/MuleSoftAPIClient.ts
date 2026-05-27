/**
 * MuleSoft Anypoint Platform API Client
 * Extends BaseAPIClient to provide MuleSoft-specific API methods
 * Focuses on CloudHub Management API for application logs
 */

import { APIRequestContext, APIResponse } from '@playwright/test';
import { BaseAPIClient } from '../base/BaseAPIClient';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { MuleSoftAuth } from '../../utils/mulesoft-auth';

export interface MuleSoftApplication {
  id: string;
  name: string;
  domain: string;
  status: string;
  targetId: string;
  targetName: string;
  targetType: string;
  [key: string]: any;
}

export interface MuleSoftLogEntry {
  timestamp: string;
  level: string;
  message: string;
  logger: string;
  thread: string;
  [key: string]: any;
}

export interface MuleSoftLogResponse {
  data: MuleSoftLogEntry[];
  total: number;
  [key: string]: any;
}

export interface MuleSoftDeployment {
  id: string;
  applicationId: string;
  applicationName: string;
  status: string;
  [key: string]: any;
}

/**
 * MuleSoft Anypoint Platform API Client
 * Handles API interactions with MuleSoft Anypoint Platform
 * Primary focus: CloudHub Management API for application logs
 */
export class MuleSoftAPIClient extends BaseAPIClient {
  private organizationId?: string;
  private environmentId?: string;

  /** applicationName → deploymentId + specId (CloudHub 2 / Runtime Fabric style deployments) */
  private readonly ch2AppResolutionCache = new Map<string, { deploymentId: string; specId: string }>();
  /** deploymentId → specId */
  private readonly ch2DeploymentSpecCache = new Map<string, string>();

  constructor(apiContext: APIRequestContext) {
    const mulesoftConfig = config.getMuleSoftConfig();
    // Application Manager API base URL (for CloudHub 2.0 Private Spaces)
    // Format: https://anypoint.mulesoft.com/amc/application-manager/api/v2
    // This is the correct endpoint for CloudHub 2.0 deployments
    // Endpoint structure: /organizations/{orgId}/environments/{envId}/deployments/{deploymentId}
    const rawApiBase = mulesoftConfig.apiBaseUrl || `${mulesoftConfig.baseUrl}/amc/application-manager/api/v2`;
    const baseUrl = rawApiBase.replace(/\/+$/, '');
    super(apiContext, baseUrl);
    
    // Organization and environment IDs can be set via config or environment variables
    this.organizationId =
      process.env.MULESOFT_ORGANIZATION_ID ||
      process.env.MULESOFT_ORG_ID ||
      mulesoftConfig.organizationId;
    this.environmentId =
      process.env.MULESOFT_ENVIRONMENT_ID ||
      process.env.MULESOFT_ENV_ID ||
      mulesoftConfig.environmentId;
  }

  /** EU/US control-plane origin (no path) — used for Accounts API (list environments). */
  private getControlPlaneOrigin(): string {
    const mulesoftConfig = config.getMuleSoftConfig();
    const raw = (
      process.env.MULESOFT_BASE_URL ||
      mulesoftConfig.baseUrl ||
      'https://anypoint.mulesoft.com'
    ).replace(/\/+$/, '');
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      return `${u.protocol}//${u.host}`;
    } catch {
      return 'https://anypoint.mulesoft.com';
    }
  }

  private isOrgEnvConfigured(): boolean {
    return Boolean(this.organizationId && this.environmentId);
  }

  private extractDeploymentsArray(body: unknown): any[] {
    if (!body) return [];
    if (Array.isArray(body)) return body;
    if (typeof body === 'object' && body !== null) {
      const o = body as Record<string, unknown>;
      if (Array.isArray(o.items)) return o.items;
      if (Array.isArray(o.data)) return o.data;
      if (Array.isArray(o.deployments)) return o.deployments;
      if (Array.isArray(o.applications)) return o.applications;
    }
    return [];
  }

  private deploymentNameMatches(deployment: any, applicationName: string): boolean {
    if (!deployment || !applicationName) return false;
    const target = applicationName.trim().toLowerCase();
    const candidates: string[] = [];
    const push = (v: unknown) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (s) candidates.push(s.toLowerCase());
    };
    push(deployment.name);
    push(deployment.domainName);
    push(deployment.domain);
    push(deployment.applicationName);
    push(deployment.artifact?.name);
    push(deployment.artifactName);
    push(deployment.target?.name);
    push(deployment.deploymentSettings?.name);
    if (deployment.mule?.name) push(deployment.mule.name);
    return candidates.some((c) => c === target || c.includes(target) || target.includes(c));
  }

  private mapDeploymentToApplication(d: any): MuleSoftApplication {
    const name =
      d.name ||
      d.domainName ||
      d.applicationName ||
      d.artifact?.name ||
      d.id ||
      'unknown';
    const domain = d.domainName || d.domain || d.name || '';
    const status =
      d.status || d.applicationStatus || d.deploymentStatus || d.runtime?.status || 'Unknown';
    return {
      id: d.id || '',
      name,
      domain,
      status,
      targetId: d.targetId || d.target?.id || '',
      targetName: d.targetName || d.target?.name || '',
      targetType: d.targetType || d.target?.type || '',
      ...d,
    };
  }

  private parseSpecIdFromDeploymentBody(body: any): string | null {
    if (!body) return null;
    if (typeof body.specId === 'string' && body.specId) return body.specId;
    const replicas = body.replicas || body.runtime?.replicas || body.deployment?.replicas;
    if (!Array.isArray(replicas) || replicas.length === 0) return null;
    const r0 = replicas[0];
    const specId =
      r0?.specId ||
      (typeof r0?.spec === 'string' ? r0.spec : r0?.spec?.id) ||
      r0?.spec?.specId;
    return typeof specId === 'string' && specId ? specId : null;
  }

  private legacyLogOptionsToCloudHub2Query(options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
    level?: string;
    searchText?: string;
  }): { qs: string; searchText?: string } {
    const now = Date.now();
    let endTimeMs = now;
    if (options?.endDate) {
      const p = Date.parse(options.endDate);
      if (!Number.isNaN(p)) endTimeMs = p;
    }
    let startTimeMs = endTimeMs - 60 * 60 * 1000;
    if (options?.startDate) {
      const p = Date.parse(options.startDate);
      if (!Number.isNaN(p)) startTimeMs = p;
    }
    if (startTimeMs > endTimeMs) {
      const t = startTimeMs;
      startTimeMs = endTimeMs;
      endTimeMs = t;
    }
    const length = Math.min(Math.max(options?.limit ?? 1000, 1), 1000);
    const params = new URLSearchParams();
    params.set('length', String(length));
    params.set('startTime', String(startTimeMs));
    params.set('endTime', String(endTimeMs));
    params.set('descending', 'false');
    if (options?.level) {
      params.append('logLevel', String(options.level).toUpperCase());
    } else {
      params.append('logLevel', 'INFO');
      params.append('logLevel', 'WARN');
      params.append('logLevel', 'ERROR');
    }
    if (options?.offset && options.offset > 0) {
      logger.warn(
        'MuleSoft CloudHub 2 log search ignores offset; narrow startDate/endDate or use pagination (afterDocId) if needed.'
      );
    }
    return { qs: `?${params.toString()}`, searchText: options?.searchText };
  }

  private normalizeLogSearchResponse(body: unknown): MuleSoftLogResponse {
    let rows: MuleSoftLogEntry[] = [];
    if (Array.isArray(body)) {
      rows = body as MuleSoftLogEntry[];
    } else if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      if (Array.isArray(o.data)) rows = o.data as MuleSoftLogEntry[];
      else if (Array.isArray(o.items)) rows = o.items as MuleSoftLogEntry[];
    }
    const o = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const total =
      typeof o.total === 'number' ? o.total : typeof o.totalSize === 'number' ? o.totalSize : rows.length;
    return { data: rows, total, ...o };
  }

  private async fetchDeploymentsRaw(): Promise<any[]> {
    if (!this.isOrgEnvConfigured()) {
      return [];
    }
    const endpoint = `/organizations/${encodeURIComponent(this.organizationId!)}` +
      `/environments/${encodeURIComponent(this.environmentId!)}/deployments`;
    const response = await this.get(endpoint);
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to list deployments: ${errorText}`);
    }
    const body = await response.json();
    return this.extractDeploymentsArray(body);
  }

  /**
   * List environments in the org (Accounts API — Postman "2 - List environments").
   */
  async listEnvironments(): Promise<any[]> {
    if (!this.organizationId) {
      throw new Error('MULESOFT_ORGANIZATION_ID must be set to list environments');
    }
    const url = `${this.getControlPlaneOrigin()}/accounts/api/organizations/${encodeURIComponent(
      this.organizationId
    )}/environments`;
    logger.info(`Listing MuleSoft environments: GET ${url}`);
    const response = await this.apiContext.get(url, {
      headers: this.getMinimalHeaders(),
      timeout: this.timeouts.api,
    });
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to list environments: ${errorText}`);
    }
    const body = await response.json();
    if (Array.isArray(body)) return body;
    if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)) {
      return (body as { data: any[] }).data;
    }
    return [];
  }

  /**
   * Some tenants return 409 on GET .../deployments/{id} ("Unable to fetch the target...") while
   * GET .../deployments/{id}/specs still returns spec ids for log search.
   */
  private parseSpecIdFromSpecsListBody(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
      return null;
    }
    if (typeof (body as { id?: unknown }).id === 'string' && (body as { id: string }).id.trim()) {
      return (body as { id: string }).id.trim();
    }

    let items: any[] = [];
    const o = body as Record<string, unknown>;
    const pushArray = (arr: unknown) => {
      if (Array.isArray(arr)) items = items.concat(arr);
    };
    pushArray(o.items);
    pushArray(o.data);
    pushArray(o.specs);
    pushArray(o.content);
    pushArray(o.values);
    pushArray(o.results);
    if (Array.isArray(body)) {
      items = body as any[];
    }
    if (items.length === 0) {
      for (const v of Object.values(o)) {
        if (Array.isArray(v) && v.length > 0) {
          items = v as any[];
          break;
        }
      }
    }

    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const sid =
        (item as any).id ??
        (item as any).specId ??
        (item as any).spec?.id ??
        (item as any).spec?.specId ??
        (item as any).deploymentSpecId;
      if (typeof sid === 'string' && sid.trim()) {
        return sid.trim();
      }
    }
    return null;
  }

  private async tryResolveSpecIdFromSpecsList(deploymentId: string): Promise<string | null> {
    const path =
      `/organizations/${encodeURIComponent(this.organizationId!)}` +
      `/environments/${encodeURIComponent(this.environmentId!)}` +
      `/deployments/${encodeURIComponent(deploymentId)}/specs`;
    const response = await this.get(path);
    if (!this.isSuccess(response)) {
      const errText = await response.text().catch(() => '');
      logger.debug(
        `MuleSoft GET .../deployments/${deploymentId}/specs → ${response.status()}: ${errText.slice(0, 200)}`
      );
      return null;
    }
    const body = await response.json();
    const parsed = this.parseSpecIdFromSpecsListBody(body);
    if (!parsed) {
      logger.warn(
        `MuleSoft: could not parse spec id from GET .../deployments/${deploymentId}/specs. ` +
          `Body preview: ${JSON.stringify(body).slice(0, 500)}`
      );
    }
    return parsed;
  }

  private async resolveSpecIdForDeploymentId(deploymentId: string): Promise<string> {
    const cached = this.ch2DeploymentSpecCache.get(deploymentId);
    if (cached) return cached;

    const fromSpecsList = await this.tryResolveSpecIdFromSpecsList(deploymentId);
    if (fromSpecsList) {
      this.ch2DeploymentSpecCache.set(deploymentId, fromSpecsList);
      return fromSpecsList;
    }

    const detailEndpoint =
      `/organizations/${encodeURIComponent(this.organizationId!)}` +
      `/environments/${encodeURIComponent(this.environmentId!)}` +
      `/deployments/${encodeURIComponent(deploymentId)}`;
    const detailRes = await this.get(detailEndpoint);
    if (!this.isSuccess(detailRes)) {
      const errorText = await detailRes.text();
      throw new Error(`Failed to load deployment ${deploymentId}: ${errorText}`);
    }
    const detailBody = await detailRes.json();
    const specId = this.parseSpecIdFromDeploymentBody(detailBody);
    if (!specId) {
      throw new Error(
        `Could not resolve specId for deployment ${deploymentId}. ` +
          `Inspect deployment JSON for replicas[].specId (Anypoint / Postman step 4).`
      );
    }
    this.ch2DeploymentSpecCache.set(deploymentId, specId);
    return specId;
  }

  private async resolveDeploymentSpecByApplicationName(applicationName: string): Promise<{
    deploymentId: string;
    specId: string;
  }> {
    const key = applicationName.trim();
    const hit = this.ch2AppResolutionCache.get(key);
    if (hit) return hit;

    const deployments = await this.fetchDeploymentsRaw();
    const deployment = deployments.find((d) => this.deploymentNameMatches(d, key));
    if (!deployment?.id) {
      throw new Error(
        `No deployment found matching application name "${applicationName}". ` +
          `Verify MULESOFT_ORGANIZATION_ID / MULESOFT_ENVIRONMENT_ID and that the app is deployed in that environment.`
      );
    }
    // List deployments often includes replicas[].specId; prefer that over GET deployment
    // (some orgs return 409 "Unable to fetch the target associated with this deployment" on detail).
    let specId = this.parseSpecIdFromDeploymentBody(deployment);
    if (!specId) {
      specId = await this.resolveSpecIdForDeploymentId(deployment.id);
    }
    const resolved = { deploymentId: deployment.id, specId };
    this.ch2AppResolutionCache.set(key, resolved);
    return resolved;
  }

  private deploymentSpecsLogsPath(deploymentId: string, specId: string, file: boolean): string {
    if (!this.organizationId || !this.environmentId) {
      throw new Error('Organization ID and Environment ID must be set');
    }
    const prefix =
      `/organizations/${encodeURIComponent(this.organizationId)}` +
      `/environments/${encodeURIComponent(this.environmentId)}` +
      `/deployments/${encodeURIComponent(deploymentId)}` +
      `/specs/${encodeURIComponent(specId)}/logs`;
    return file ? `${prefix}/file` : prefix;
  }

  /**
   * Authenticate and get access token using OAuth2 client credentials
   */
  async authenticate(): Promise<string> {
    logger.info('Authenticating with MuleSoft Anypoint Platform using OAuth2 client credentials...');

    try {
      const authResult = await MuleSoftAuth.authenticate();
      this.setAccessToken(authResult.accessToken);

      logger.info('MuleSoft OAuth2 authentication successful');
      return authResult.accessToken;
    } catch (error: any) {
      logger.error(`MuleSoft authentication error: ${error.message}`);
      const envName = config.getEnvironment();
      throw new Error(
        `MuleSoft OAuth2 authentication failed. Please configure OAuth2 credentials in src/config/env/.env.${envName}. Error: ${error.message}`
      );
    }
  }

  /**
   * Override getDefaultHeaders to use MuleSoft-specific headers
   * Removes Salesforce-specific headers from base class
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Note: We don't include 'Sforce-Duplicate-Rule-Header' from base class
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Add organization ID header if available (required for some endpoints)
    if (this.organizationId) {
      headers['X-ANYPNT-ORG-ID'] = this.organizationId;
    }

    // Add environment ID header if available (required for some endpoints)
    if (this.environmentId) {
      headers['X-ANYPNT-ENV-ID'] = this.environmentId;
    }

    return headers;
  }

  /**
   * Get minimal headers (for GET requests that don't need Content-Type)
   */
  protected getMinimalHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.organizationId) {
      headers['X-ANYPNT-ORG-ID'] = this.organizationId;
    }

    if (this.environmentId) {
      headers['X-ANYPNT-ENV-ID'] = this.environmentId;
    }

    return headers;
  }

  /**
   * Set organization ID (can be called after authentication if needed)
   */
  setOrganizationId(orgId: string): void {
    this.organizationId = orgId;
    logger.debug(`Organization ID set: ${orgId}`);
  }

  /**
   * Set environment ID (can be called after authentication if needed)
   */
  setEnvironmentId(envId: string): void {
    this.environmentId = envId;
    logger.debug(`Environment ID set: ${envId}`);
  }

  // ============================================================================
  // APPLICATION MANAGEMENT
  // ============================================================================

  /**
   * List all applications
   * When MULESOFT_ORGANIZATION_ID + MULESOFT_ENVIRONMENT_ID are set, lists deployments in that
   * environment (CloudHub 2 / RTF — same as Postman "3 - List deployments"). Otherwise uses legacy GET /applications.
   */
  async listApplications(): Promise<MuleSoftApplication[]> {
    if (this.isOrgEnvConfigured()) {
      logger.info('Listing MuleSoft deployments (org + env configured)');
      const deployments = await this.fetchDeploymentsRaw();
      const apps = deployments.map((d) => this.mapDeploymentToApplication(d));
      logger.info(`Found ${apps.length} deployment(s) in environment`);
      return apps;
    }

    const endpoint = '/applications';
    logger.info('Listing all MuleSoft applications (legacy /applications)');

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to list applications: ${errorText}`);
    }

    const result = await this.parseJSON<MuleSoftApplication[]>(response);
    logger.info(`Found ${Array.isArray(result) ? result.length : 0} applications`);
    return Array.isArray(result) ? result : [];
  }

  /**
   * Get application by name
   * When org+env are set, resolves a deployment whose name/domain matches applicationName.
   * Otherwise uses legacy GET /applications/{applicationName}.
   */
  async getApplication(applicationName: string): Promise<MuleSoftApplication> {
    if (this.isOrgEnvConfigured()) {
      const deployments = await this.fetchDeploymentsRaw();
      const deployment = deployments.find((d) => this.deploymentNameMatches(d, applicationName.trim()));
      if (!deployment) {
        throw new Error(`Application/deployment not found: ${applicationName}`);
      }
      const app = this.mapDeploymentToApplication(deployment);
      logger.info(`Resolved MuleSoft deployment as application: ${applicationName}`);
      return app;
    }

    const endpoint = `/applications/${encodeURIComponent(applicationName)}`;
    logger.info(`Getting MuleSoft application: ${applicationName}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get application ${applicationName}: ${errorText}`);
    }

    return await this.parseJSON<MuleSoftApplication>(response);
  }

  /**
   * Find application by name (returns null if not found)
   */
  async findApplication(applicationName: string): Promise<MuleSoftApplication | null> {
    try {
      return await this.getApplication(applicationName);
    } catch (error: any) {
      if (error.message.includes('404') || error.message.includes('Not Found')) {
        logger.debug(`Application ${applicationName} not found`);
        return null;
      }
      throw error;
    }
  }

  // ============================================================================
  // LOG RETRIEVAL
  // ============================================================================

  /**
   * Get deployment logs (CloudHub 2.0)
   * When org+env are set, uses spec-based log search (Postman "5 - Search logs"):
   * .../deployments/{deploymentId}/specs/{specId}/logs?startTime&endTime&length&logLevel...
   * Legacy path without spec: .../deployments/{deploymentId}/logs (older query params)
   */
  async getDeploymentLogs(
    deploymentId: string,
    options?: {
      startDate?: string; // ISO 8601 format
      endDate?: string; // ISO 8601 format
      limit?: number;
      offset?: number;
      level?: string; // ERROR, WARN, INFO, DEBUG, etc.
      searchText?: string; // Search for specific text in logs
    }
  ): Promise<MuleSoftLogResponse> {
    if (!this.organizationId || !this.environmentId) {
      throw new Error('Organization ID and Environment ID must be set to access deployment logs');
    }

    const specId = await this.resolveSpecIdForDeploymentId(deploymentId);
    const { qs, searchText } = this.legacyLogOptionsToCloudHub2Query(options);
    const path = `${this.deploymentSpecsLogsPath(deploymentId, specId, false)}${qs}`;
    logger.info(`Getting CloudHub 2 spec logs for deployment: ${deploymentId}`);
    const response = await this.get(path);
    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get logs for deployment ${deploymentId}: ${errorText}`);
    }
    const body = await response.json();
    let normalized = this.normalizeLogSearchResponse(body);
    if (searchText && normalized.data?.length) {
      const st = searchText.toLowerCase();
      const filtered = normalized.data.filter((row: any) => {
        const msg = String(row.message ?? row.msg ?? '').toLowerCase();
        const loggerName = String(row.logger ?? '').toLowerCase();
        return msg.includes(st) || loggerName.includes(st);
      });
      normalized = { ...normalized, data: filtered, total: filtered.length };
    }
    return normalized;
  }

  /**
   * Get application logs
   * When MULESOFT_ORGANIZATION_ID + MULESOFT_ENVIRONMENT_ID are set, resolves deployment + specId
   * and calls the CloudHub 2 log search API (Anypoint Postman collection).
   * Otherwise uses legacy GET /applications/{applicationName}/logs.
   */
  async getApplicationLogs(
    applicationName: string,
    options?: {
      startDate?: string; // ISO 8601 format
      endDate?: string; // ISO 8601 format
      limit?: number;
      offset?: number;
      level?: string; // ERROR, WARN, INFO, DEBUG, etc.
      searchText?: string; // Search for specific text in logs
    }
  ): Promise<MuleSoftLogResponse> {
    if (this.isOrgEnvConfigured()) {
      const { deploymentId, specId } = await this.resolveDeploymentSpecByApplicationName(applicationName);
      const { qs, searchText } = this.legacyLogOptionsToCloudHub2Query(options);
      const path = `${this.deploymentSpecsLogsPath(deploymentId, specId, false)}${qs}`;
      logger.info(`Getting CloudHub 2 spec logs for application: ${applicationName}`);
      const response = await this.get(path);
      if (!this.isSuccess(response)) {
        const errorText = await response.text();
        throw new Error(`Failed to get logs for application ${applicationName}: ${errorText}`);
      }
      const body = await response.json();
      let normalized = this.normalizeLogSearchResponse(body);
      if (searchText && normalized.data?.length) {
        const st = searchText.toLowerCase();
        const filtered = normalized.data.filter((row: any) => {
          const msg = String(row.message ?? row.msg ?? '').toLowerCase();
          const loggerName = String(row.logger ?? '').toLowerCase();
          return msg.includes(st) || loggerName.includes(st);
        });
        normalized = { ...normalized, data: filtered, total: filtered.length };
      }
      return normalized;
    }

    let endpoint = `/applications/${encodeURIComponent(applicationName)}/logs`;
    
    // Build query parameters
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`startDate=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`endDate=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.limit) {
      params.push(`limit=${options.limit}`);
    }
    if (options?.offset) {
      params.push(`offset=${options.offset}`);
    }
    if (options?.level) {
      params.push(`level=${encodeURIComponent(options.level)}`);
    }
    if (options?.searchText) {
      params.push(`searchText=${encodeURIComponent(options.searchText)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    logger.info(`Getting logs for application: ${applicationName}`);
    if (options) {
      logger.debug(`Log options: ${JSON.stringify(options)}`);
    }

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get logs for application ${applicationName}: ${errorText}`);
    }

    return await this.parseJSON<MuleSoftLogResponse>(response);
  }

  /**
   * Get logs for a specific application instance
   * GET /applications/{applicationName}/instances/{instanceId}/logs
   */
  async getInstanceLogs(
    applicationName: string,
    instanceId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
      level?: string;
      searchText?: string;
    }
  ): Promise<MuleSoftLogResponse> {
    let endpoint = `/applications/${encodeURIComponent(applicationName)}/instances/${encodeURIComponent(instanceId)}/logs`;
    
    // Build query parameters
    const params: string[] = [];
    if (options?.startDate) {
      params.push(`startDate=${encodeURIComponent(options.startDate)}`);
    }
    if (options?.endDate) {
      params.push(`endDate=${encodeURIComponent(options.endDate)}`);
    }
    if (options?.limit) {
      params.push(`limit=${options.limit}`);
    }
    if (options?.offset) {
      params.push(`offset=${options.offset}`);
    }
    if (options?.level) {
      params.push(`level=${encodeURIComponent(options.level)}`);
    }
    if (options?.searchText) {
      params.push(`searchText=${encodeURIComponent(options.searchText)}`);
    }
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }

    logger.info(`Getting logs for application instance: ${applicationName}/${instanceId}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to get logs for instance ${instanceId}: ${errorText}`);
    }

    return await this.parseJSON<MuleSoftLogResponse>(response);
  }

  /**
   * Download log file for an application
   * When org+env are set: GET .../specs/{specId}/logs/file (Postman "7 - Download raw log file").
   * Otherwise legacy GET /applications/{applicationName}/log-file
   */
  async downloadApplicationLogFile(applicationName: string): Promise<string> {
    if (this.isOrgEnvConfigured()) {
      const { deploymentId, specId } = await this.resolveDeploymentSpecByApplicationName(applicationName);
      const path = this.deploymentSpecsLogsPath(deploymentId, specId, true);
      logger.info(`Downloading CloudHub 2 raw log file for application: ${applicationName}`);
      const response = await this.get(path);
      if (!this.isSuccess(response)) {
        const errorText = await response.text();
        throw new Error(`Failed to download log file for application ${applicationName}: ${errorText}`);
      }
      return await response.text();
    }

    const endpoint = `/applications/${encodeURIComponent(applicationName)}/log-file`;
    logger.info(`Downloading log file for application: ${applicationName}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to download log file for application ${applicationName}: ${errorText}`);
    }

    return await response.text();
  }

  /**
   * Download log file for a specific instance
   * GET /applications/{applicationName}/instances/{instanceId}/log-file
   */
  async downloadInstanceLogFile(applicationName: string, instanceId: string): Promise<string> {
    const endpoint = `/applications/${encodeURIComponent(applicationName)}/instances/${encodeURIComponent(instanceId)}/log-file`;
    logger.info(`Downloading log file for instance: ${applicationName}/${instanceId}`);

    const response = await this.get(endpoint);

    if (!this.isSuccess(response)) {
      const errorText = await response.text();
      throw new Error(`Failed to download log file for instance ${instanceId}: ${errorText}`);
    }

    return await response.text();
  }

  // ============================================================================
  // LOG ANALYSIS HELPERS
  // ============================================================================

  /**
   * Search for errors in application logs
   * Returns log entries with ERROR level or containing error keywords
   */
  async searchErrors(
    applicationName: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<MuleSoftLogEntry[]> {
    logger.info(`Searching for errors in application: ${applicationName}`);
    
    const logResponse = await this.getApplicationLogs(applicationName, {
      ...options,
      level: 'ERROR',
    });

    return logResponse.data || [];
  }

  /**
   * Search for specific text in application logs
   */
  async searchLogs(
    applicationName: string,
    searchText: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      level?: string;
    }
  ): Promise<MuleSoftLogEntry[]> {
    logger.info(`Searching logs for "${searchText}" in application: ${applicationName}`);
    
    const logResponse = await this.getApplicationLogs(applicationName, {
      ...options,
      searchText: searchText,
    });

    return logResponse.data || [];
  }

  /**
   * Check if application has errors in recent logs
   * Returns true if any ERROR level logs found within the specified time range
   */
  async hasErrors(
    applicationName: string,
    options?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<boolean> {
    const errors = await this.searchErrors(applicationName, options);
    return errors.length > 0;
  }

  /**
   * Get log entries by correlation ID
   * Useful for tracing a specific request/transaction through the logs
   */
  async getLogsByCorrelationId(
    applicationName: string,
    correlationId: string,
    options?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
    }
  ): Promise<MuleSoftLogEntry[]> {
    return await this.searchLogs(applicationName, correlationId, options);
  }
}
