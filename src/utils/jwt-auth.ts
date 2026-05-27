import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { config } from '../config/config';

export interface JWTAuthResult {
  accessToken: string;
  instanceUrl: string;
  id: string;
  tokenType: string;
}

/**
 * Salesforce JWT OAuth Authentication
 * Bypasses email/phone verification by using JWT Bearer Token flow
 */
export class SalesforceJWTAuth {
  /**
   * Authenticate using JWT Bearer Token flow
   * @param usernameOverride - Optional username to use instead of environment variable
   *                          Useful for authenticating different users (admin, standard, etc.)
   */
  static async authenticate(usernameOverride?: string): Promise<JWTAuthResult> {
    logger.info('Authenticating with Salesforce using JWT...');

    // Support both SF_CLIENT_ID and SF_JWT_CLIENT_ID
    const clientId = process.env.SF_JWT_CLIENT_ID || process.env.SF_CLIENT_ID;
    // Use override username if provided, otherwise fallback to environment variables
    const username = usernameOverride || process.env.SF_JWT_USERNAME || process.env.SF_USERNAME;
    const certPath = process.env.SF_CERT_PATH || 'certs/server.key';
    const loginUrl = config.getSalesforceConfig().loginUrl || config.getSalesforceConfig().baseUrl;

    const envName = config.getEnvironment();
    const envFileHint = `src/config/env/.env.${envName}`;

    if (!clientId) {
      throw new Error(`SF_JWT_CLIENT_ID or SF_CLIENT_ID must be set in ${envFileHint} (or exported as environment variables) for JWT authentication`);
    }

    if (!username) {
      throw new Error(`SF_JWT_USERNAME or SF_USERNAME must be set in ${envFileHint} (or exported as environment variables) for JWT authentication`);
    }
    
    const isOverride = usernameOverride ? ' (override)' : '';
    logger.info(`Using JWT credentials - Client ID: ${clientId.substring(0, 10)}..., Username: ${username}${isOverride}`);

    // Read private key
    const privateKey = this.getPrivateKey(certPath);

    // Use login URL or default to login.salesforce.com
    const finalLoginUrl = loginUrl || 'https://login.salesforce.com';
    logger.info(`Using login URL: ${finalLoginUrl}`);

    // JWT "aud" (audience) must be the login host: for sandbox use test.salesforce.com,
    // otherwise Salesforce returns "audience is invalid". Token request still uses finalLoginUrl.
    const jwtAudience = this.getJWTAudience(finalLoginUrl);

    // Create JWT assertion
    const assertion = this.createJWTAssertion(clientId, username, jwtAudience, privateKey);

    // Exchange JWT for access token (token endpoint: use login host for sandbox)
    const tokenUrl = `${this.getTokenEndpointLoginUrl(finalLoginUrl)}/services/oauth2/token`;
    const tokenResponse = await this.exchangeJWTForToken(tokenUrl, assertion, clientId);

    logger.info('JWT authentication successful');
    return tokenResponse;
  }

  /**
   * Get JWT audience (aud claim). Sandbox must use test.salesforce.com or Salesforce returns "audience is invalid".
   */
  private static getJWTAudience(loginUrl: string): string {
    const u = (loginUrl || '').toLowerCase();
    if (u.includes('sandbox') || u.includes('test.salesforce.com')) {
      return 'https://test.salesforce.com';
    }
    return 'https://login.salesforce.com';
  }

  /**
   * Get token endpoint host URL. Sandbox token exchange uses test.salesforce.com.
   */
  private static getTokenEndpointLoginUrl(loginUrl: string): string {
    const u = (loginUrl || '').toLowerCase();
    if (u.includes('sandbox') || u.includes('test.salesforce.com')) {
      return 'https://test.salesforce.com';
    }
    return 'https://login.salesforce.com';
  }

  /**
   * Get private key from file or environment variable
   */
  private static getPrivateKey(certPath: string): string {
    // Try to read from file first
    const fullPath = path.resolve(process.cwd(), certPath);
    if (fs.existsSync(fullPath)) {
      logger.debug(`Reading private key from: ${fullPath}`);
      return fs.readFileSync(fullPath, 'utf-8');
    }

    // Try environment variable
    const keyFromEnv = process.env.SF_PRIVATE_KEY;
    if (keyFromEnv) {
      logger.debug('Using private key from environment variable');
      return keyFromEnv.replace(/\\n/g, '\n');
    }

    const envName = config.getEnvironment();
    const envFileHint = `src/config/env/.env.${envName}`;
    throw new Error(
      `Private key not found. Set SF_CERT_PATH or SF_PRIVATE_KEY in ${envFileHint}. Expected path: ${fullPath}`
    );
  }

  /**
   * Create JWT assertion
   */
  private static createJWTAssertion(
    clientId: string,
    username: string,
    loginUrl: string,
    privateKey: string
  ): string {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: clientId, // Issuer (Consumer Key)
      sub: username, // Subject (Username)
      aud: loginUrl, // Audience (Login URL)
      exp: now + 300, // Expiration (5 minutes)
      iat: now, // Issued at
    };

    try {
      const assertion = jwt.sign(payload, privateKey, {
        algorithm: 'RS256',
      });

      logger.debug('JWT assertion created successfully');
      return assertion;
    } catch (error: any) {
      logger.error(`Failed to create JWT assertion: ${error.message}`);
      throw new Error(`JWT assertion creation failed: ${error.message}`);
    }
  }

  /**
   * Exchange JWT assertion for access token
   */
  private static async exchangeJWTForToken(
    tokenUrl: string,
    assertion: string,
    clientId: string
  ): Promise<JWTAuthResult> {
    const params = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
    });

    const maxAttempts = parseInt(process.env.SF_JWT_TOKEN_RETRY_ATTEMPTS || '4', 10) || 4;
    const delayMs = parseInt(process.env.SF_JWT_TOKEN_RETRY_DELAY_MS || '2000', 10) || 2000;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          const retryable =
            /system_down|server unavailable|503|429|rate limit/i.test(errorText) &&
            attempt < maxAttempts;
          if (retryable) {
            logger.warn(
              `JWT token exchange attempt ${attempt}/${maxAttempts} failed (retryable): ${errorText.slice(0, 120)}`
            );
            await new Promise((r) => setTimeout(r, delayMs * attempt));
            continue;
          }
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const data = await response.json() as {
          access_token: string;
          instance_url: string;
          id: string;
          token_type: string;
        };

        return {
          accessToken: data.access_token,
          instanceUrl: data.instance_url,
          id: data.id,
          tokenType: data.token_type,
        };
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        lastError = err;
        const retryable =
          /system_down|server unavailable|fetch failed|ECONNRESET|ETIMEDOUT/i.test(err.message) &&
          attempt < maxAttempts;
        if (retryable) {
          logger.warn(`JWT token exchange attempt ${attempt}/${maxAttempts} error: ${err.message}`);
          await new Promise((r) => setTimeout(r, delayMs * attempt));
          continue;
        }
        logger.error(`Token exchange error: ${err.message}`);
        throw err;
      }
    }

    throw lastError ?? new Error('JWT token exchange failed after retries');
  }
}

