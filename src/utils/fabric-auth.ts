/**
 * Microsoft Fabric REST API – Microsoft Entra ID (client credentials)
 * Scope: https://api.fabric.microsoft.com/.default
 *
 * For Fabric Warehouse/Lakehouse **SQL** endpoints, use SqlServerAuth with scope
 * https://database.windows.net/.default and the SQL hostname from Fabric.
 */

import { logger } from './logger';
import { config } from '../config/config';

export interface FabricAuthResult {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt?: number;
}

export class FabricAuth {
  private static cachedToken: FabricAuthResult | null = null;
  private static tokenExpiryTime = 0;

  /** Fabric REST API resource scope */
  static readonly FABRIC_SCOPE = 'https://api.fabric.microsoft.com/.default';

  static isTokenValid(): boolean {
    if (!this.cachedToken) return false;
    const bufferMs = 60_000;
    return Date.now() < this.tokenExpiryTime - bufferMs;
  }

  /**
   * OAuth2 client credentials for Fabric REST APIs (not SQL endpoint).
   */
  static async authenticate(): Promise<FabricAuthResult> {
    if (this.cachedToken && this.isTokenValid()) {
      logger.debug('Using cached Fabric REST API access token');
      return this.cachedToken;
    }

    logger.info('Authenticating with Microsoft Fabric REST API (Entra ID client credentials)...');

    const fc = config.getFabricConfig();
    const tenantId = fc.tenantId?.trim();
    const clientId = fc.clientId?.trim();
    const clientSecret = fc.clientSecret?.trim();
    const envName = config.getEnvironment();
    const envFileHint = `src/config/env/.env.${envName}`;

    if (!tenantId) {
      throw new Error(
        `FABRIC_TENANT_ID must be set in ${envFileHint} for Fabric REST API authentication`
      );
    }
    if (!clientId) {
      throw new Error(
        `FABRIC_CLIENT_ID must be set in ${envFileHint} for Fabric REST API authentication`
      );
    }
    if (!clientSecret) {
      throw new Error(
        `FABRIC_CLIENT_SECRET must be set in ${envFileHint} for Fabric REST API authentication`
      );
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: this.FABRIC_SCOPE,
      grant_type: 'client_credentials',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Fabric token request failed: ${response.status} ${errorText}`);
      throw new Error(
        `Fabric REST API authentication failed (${response.status}). Check FABRIC_* credentials and API permissions. ${errorText.slice(0, 200)}`
      );
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    const expiresIn = data.expires_in ?? 3600;
    const result: FabricAuthResult = {
      accessToken: data.access_token,
      tokenType: data.token_type || 'Bearer',
      expiresIn,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    this.cachedToken = result;
    this.tokenExpiryTime = result.expiresAt ?? Date.now() + expiresIn * 1000;
    logger.info(`Fabric REST API authentication successful (expires in ${expiresIn}s)`);
    return result;
  }

  static clearCache(): void {
    this.cachedToken = null;
    this.tokenExpiryTime = 0;
  }
}
