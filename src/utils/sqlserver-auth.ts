/**
 * SQL Server Azure AD (Microsoft Entra) Authentication
 * Uses OAuth2 client credentials flow for service principal authentication
 * Supports MFA-enabled SQL Server connections
 */

import { logger } from './logger';
import { config } from '../config/config';

export interface SqlServerAuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt?: number; // Calculated timestamp when token expires
}

/**
 * SQL Server Azure AD Authentication
 * Authenticates using service principal (SPN) credentials for SQL Server with Entra ID
 */
export class SqlServerAuth {
  private static cachedToken: SqlServerAuthResult | null = null;
  private static tokenExpiryTime: number = 0;

  /**
   * Authenticate using OAuth2 client credentials flow
   * Caches token until expiry for reuse within a test run
   */
  static async authenticate(): Promise<SqlServerAuthResult> {
    // Check if we have a valid cached token
    if (this.cachedToken && this.isTokenValid()) {
      logger.debug('Using cached SQL Server Azure AD access token');
      return this.cachedToken;
    }

    logger.info('Authenticating with SQL Server using Azure AD (Microsoft Entra)...');

    const sqlConfig = config.getSqlServerConfig();
    const tenantId = process.env.SQLSERVER_TENANT_ID || sqlConfig.tenantId;
    const clientId = process.env.SQLSERVER_CLIENT_ID || sqlConfig.clientId;
    const clientSecret = process.env.SQLSERVER_CLIENT_SECRET || sqlConfig.clientSecret;

    const envName = config.getEnvironment();
    const envFileHint = `src/config/env/.env.${envName}`;

    if (!tenantId) {
      throw new Error(
        `SQLSERVER_TENANT_ID must be set in ${envFileHint} (or exported as environment variable) for SQL Server Azure AD authentication`
      );
    }

    if (!clientId) {
      throw new Error(
        `SQLSERVER_CLIENT_ID must be set in ${envFileHint} (or exported as environment variable) for SQL Server Azure AD authentication`
      );
    }

    if (!clientSecret) {
      throw new Error(
        `SQLSERVER_CLIENT_SECRET must be set in ${envFileHint} (or exported as environment variable) for SQL Server Azure AD authentication`
      );
    }

    logger.info(
      `Using SQL Server Azure AD credentials - Tenant ID: ${tenantId.substring(0, 8)}..., Client ID: ${clientId.substring(0, 10)}...`
    );

    // OAuth2 token endpoint (v2.0) for SQL Server
    // Scope for SQL Server is https://database.windows.net/.default
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const scope = 'https://database.windows.net/.default';

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

      const data = (await response.json()) as {
        access_token: string;
        token_type: string;
        expires_in: number;
      };

      const expiresIn = data.expires_in || 3600; // Default to 1 hour if not provided
      const expiresAt = Date.now() + expiresIn * 1000 - 60000; // Subtract 1 minute buffer

      const authResult: SqlServerAuthResult = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: expiresIn,
        expiresAt: expiresAt,
      };

      // Cache the token
      this.cachedToken = authResult;
      this.tokenExpiryTime = expiresAt;

      logger.info(`SQL Server Azure AD authentication successful (expires in ${expiresIn}s)`);
      return authResult;
    } catch (error: any) {
      logger.error(`SQL Server Azure AD authentication error: ${error.message}`);
      throw new Error(`SQL Server Azure AD authentication failed: ${error.message}`);
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
      logger.debug('Cached SQL Server Azure AD token has expired');
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
    logger.debug('Cleared SQL Server Azure AD token cache');
  }
}

