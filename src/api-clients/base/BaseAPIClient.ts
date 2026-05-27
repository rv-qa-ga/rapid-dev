import { APIRequestContext, APIResponse } from '@playwright/test';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

export interface APIRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number>;
  timeout?: number;
}

export abstract class BaseAPIClient {
  protected apiContext: APIRequestContext;
  protected baseURL: string;
  protected accessToken?: string;
  protected timeouts = config.getTimeouts();

  constructor(apiContext: APIRequestContext, baseURL: string) {
    this.apiContext = apiContext;
    this.baseURL = baseURL;
  }

  /**
   * Set access token for authentication
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    logger.debug('Access token set');
  }

  /** Current bearer token after authenticate(), if any (e.g. CometD / Streaming). */
  getAccessToken(): string | undefined {
    return this.accessToken;
  }

  /**
   * Get default headers
   * Note: Subclasses should override this to add system-specific headers
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Bypass Salesforce duplicate detection rules for test data creation
      // This header is Salesforce-specific but harmless for other APIs
      'Sforce-Duplicate-Rule-Header': 'allowSave=true',
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
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

    return headers;
  }

  /**
   * GET request
   */
  async get(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    logger.info(`GET ${url}`);

    // Use minimal headers for GET requests (no Content-Type needed)
    const headers = options.headers 
      ? { ...this.getMinimalHeaders(), ...options.headers }
      : this.getMinimalHeaders();

    const response = await this.apiContext.get(url, {
      headers,
      params: options.params,
      timeout: options.timeout || this.timeouts.api,
    });

    logger.debug(`Response status: ${response.status()}`);
    return response;
  }

  /**
   * POST request
   */
  async post(
    endpoint: string,
    data?: any,
    options: APIRequestOptions = {}
  ): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    logger.info(`POST ${url}`);

    const response = await this.apiContext.post(url, {
      headers: { ...this.getDefaultHeaders(), ...options.headers },
      params: options.params,
      data,
      timeout: options.timeout || this.timeouts.api,
    });

    logger.debug(`Response status: ${response.status()}`);
    return response;
  }

  /**
   * PUT request
   */
  async put(
    endpoint: string,
    data?: any,
    options: APIRequestOptions = {}
  ): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    logger.info(`PUT ${url}`);

    const response = await this.apiContext.put(url, {
      headers: { ...this.getDefaultHeaders(), ...options.headers },
      params: options.params,
      data,
      timeout: options.timeout || this.timeouts.api,
    });

    logger.debug(`Response status: ${response.status()}`);
    return response;
  }

  /**
   * DELETE request
   */
  async delete(
    endpoint: string,
    options: APIRequestOptions = {}
  ): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    logger.info(`DELETE ${url}`);

    const response = await this.apiContext.delete(url, {
      headers: { ...this.getDefaultHeaders(), ...options.headers },
      params: options.params,
      timeout: options.timeout || this.timeouts.api,
    });

    logger.debug(`Response status: ${response.status()}`);
    return response;
  }

  /**
   * Parse JSON response
   */
  async parseJSON<T>(response: APIResponse): Promise<T> {
    return await response.json();
  }

  /**
   * Check if response is successful
   */
  isSuccess(response: APIResponse): boolean {
    const status = response.status();
    return status >= 200 && status < 300;
  }
}

