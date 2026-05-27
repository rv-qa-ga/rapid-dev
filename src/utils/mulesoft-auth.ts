/**
 * MuleSoft Anypoint Platform OAuth2 Client Credentials Authentication
 * Authenticates using client ID and client secret (Connected App credentials)
 * Similar to Dynamics authentication pattern
 */

import { logger } from './logger';
import { config } from '../config/config';

export interface MuleSoftAuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: number; // Calculated timestamp when token expires
}

/**
 * MuleSoft Anypoint Platform OAuth2 Client Credentials Authentication
 * Authenticates using Connected App credentials (client ID + secret)
 */
export class MuleSoftAuth {
  private static cachedToken: MuleSoftAuthResult | null = null;
  private static tokenExpiryTime: number = 0;

  /**
   * Authenticate using OAuth2 client credentials flow
   * Caches token until expiry for reuse within a test run
   */
  static async authenticate(): Promise<MuleSoftAuthResult> {
    // Check if we have a valid cached token
    if (this.isTokenValid()) {
      logger.debug('Using cached MuleSoft access token');
      return this.cachedToken!;
    }

    logger.info('Authenticating with MuleSoft Anypoint Platform using OAuth2 client credentials...');

    const mulesoftConfig = config.getMuleSoftConfig();
    const baseUrl = mulesoftConfig.baseUrl || 'https://anypoint.mulesoft.com';
    const clientId = process.env.MULESOFT_CLIENT_ID || mulesoftConfig.clientId;
    const clientSecret = process.env.MULESOFT_CLIENT_SECRET || mulesoftConfig.clientSecret;

    const envName = config.getEnvironment();
    const envFileHint = `src/config/env/.env.${envName}`;

    if (!clientId) {
      throw new Error(
        `MULESOFT_CLIENT_ID must be set in ${envFileHint} (or exported as environment variables) for MuleSoft authentication`
      );
    }

    if (!clientSecret) {
      throw new Error(
        `MULESOFT_CLIENT_SECRET must be set in ${envFileHint} (or exported as environment variables) for MuleSoft authentication`
      );
    }

    logger.info(`Using MuleSoft credentials - Client ID: ${clientId.substring(0, 10)}...`);

    // OAuth2 token endpoint for Anypoint Platform
    // Format: https://{baseUrl}/accounts/api/v2/oauth2/token
    const tokenUrl = `${baseUrl}/accounts/api/v2/oauth2/token`;

    try {
      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
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

      const authResult: MuleSoftAuthResult = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: expiresIn,
        expiresAt: expiresAt,
      };

      // Cache the token
      this.cachedToken = authResult;
      this.tokenExpiryTime = expiresAt;

      logger.info(`MuleSoft OAuth2 authentication successful (expires in ${expiresIn}s)`);
      return authResult;
    } catch (error: any) {
      logger.error(`MuleSoft authentication error: ${error.message}`);
      throw new Error(`MuleSoft OAuth2 authentication failed: ${error.message}`);
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
    return now < this.tokenExpiryTime;
  }

  /**
   * Clear cached token (useful for testing or forced re-authentication)
   */
  static clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiryTime = 0;
    logger.debug('MuleSoft token cache cleared');
  }
}
