/**
 * Dynamics 365 CRM (Dataverse) OAuth2 Client Credentials Authentication
 * Uses OAuth2 client_credentials grant type for service principal authentication
 */

import { logger } from './logger';
import { config } from '../config/config';

export interface DynamicsAuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt?: number; // Calculated timestamp when token expires
}

/**
 * Dynamics 365 OAuth2 Client Credentials Authentication
 * Authenticates using service principal (SPN) credentials
 */
export class DynamicsAuth {
  private static cachedToken: DynamicsAuthResult | null = null;
  private static tokenExpiryTime: number = 0;

  /**
   * Authenticate using OAuth2 client credentials flow
   * Caches token until expiry for reuse within a test run
   */
  static async authenticate(): Promise<DynamicsAuthResult> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.isTokenValid()) {
      logger.debug('Using cached Dynamics access token');
      return this.cachedToken;
    }

    logger.info('Authenticating with Dynamics 365 using OAuth2 client credentials...');

    const d365Config = config.getDynamicsConfig();
    const tenantId = (process.env.D365_TENANT_ID || d365Config.tenantId || '').trim();
    const clientId = (process.env.D365_CLIENT_ID || d365Config.clientId || '').trim();
    const clientSecret = (process.env.D365_CLIENT_SECRET || d365Config.clientSecret || '').trim();
    const scope = (process.env.D365_SCOPE || d365Config.scope || '').trim();

    const envName = config.getEnvironment();
    const envFileHint = `src/config/env/.env.${envName}`;

    if (!tenantId) {
      throw new Error(`D365_TENANT_ID must be set in ${envFileHint} (or exported as environment variables) for Dynamics authentication`);
    }

    if (!clientId) {
      throw new Error(`D365_CLIENT_ID must be set in ${envFileHint} (or exported as environment variables) for Dynamics authentication`);
    }

    if (!clientSecret) {
      throw new Error(`D365_CLIENT_SECRET must be set in ${envFileHint} (or exported as environment variables) for Dynamics authentication`);
    }

    if (!scope) {
      throw new Error(`D365_SCOPE must be set in ${envFileHint} (or exported as environment variables) for Dynamics authentication`);
    }

    logger.info(`Using Dynamics credentials - Tenant ID: ${tenantId.substring(0, 8)}..., Client ID: ${clientId.substring(0, 10)}...`);

    // OAuth2 token endpoint (v2.0)
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: scope,
        grant_type: 'client_credentials',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      const expiresIn = data.expires_in || 3600; // Default to 1 hour if not provided
      const expiresAt = Date.now() + (expiresIn * 1000) - 60000; // Subtract 1 minute buffer

      const authResult: DynamicsAuthResult = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: expiresIn,
        expiresAt: expiresAt,
      };

      // Cache the token
      this.cachedToken = authResult;
      this.tokenExpiryTime = expiresAt;

      logger.info(`Dynamics OAuth2 authentication successful (expires in ${expiresIn}s)`);
      return authResult;
    } catch (error: any) {
      logger.error(`Dynamics authentication error: ${error.message}`);
      throw new Error(`Dynamics OAuth2 authentication failed: ${error.message}`);
    }
  }

  /**
   * Check if cached token is still valid
   */
  private static isTokenValid(): boolean {
    if (!this.cachedToken || !this.tokenExpiryTime) {
      return false;
    }

    // Check if token has expired (with 1 minute buffer)
    const now = Date.now();
    if (now >= this.tokenExpiryTime) {
      logger.debug('Cached Dynamics token has expired');
      this.cachedToken = null;
      this.tokenExpiryTime = 0;
      return false;
    }

    return true;
  }

  /**
   * Get access token (authenticates if needed)
   */
  static async getAccessToken(): Promise<string> {
    const authResult = await this.authenticate();
    return authResult.accessToken;
  }

  /**
   * Clear cached token (useful for testing or forced re-authentication)
   */
  static clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiryTime = 0;
    logger.debug('Cleared Dynamics token cache');
  }
}

