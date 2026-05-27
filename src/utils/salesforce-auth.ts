import { Page } from '@playwright/test';
import { SalesforceJWTAuth, JWTAuthResult } from './jwt-auth';
import { logger } from './logger';
import { config } from '../config/config';

/**
 * Options for JWT authentication
 */
export interface JWTAuthOptions {
  /** Optional username override (for different users like standard user) */
  username?: string;
}

/**
 * Options for password authentication
 */
export interface PasswordAuthOptions {
  username: string;
  password: string;
  securityToken?: string;
}

/**
 * Salesforce Authentication Helper for UI
 * Uses JWT to bypass email/phone verification
 */
export class SalesforceUIAuth {
  /**
   * Authenticate and set cookies in browser context
   * @param page - Playwright page instance
   * @param options - Optional auth options (username override for different users)
   */
  static async authenticateWithJWT(page: Page, options?: JWTAuthOptions): Promise<JWTAuthResult> {
    const targetUser = options?.username || process.env.SF_JWT_USERNAME || process.env.SF_USERNAME;
    logger.info(`Authenticating with Salesforce using JWT for UI (user: ${targetUser})...`);

    try {
      // Ensure page is not closed
      if (page.isClosed()) {
        throw new Error('Page is closed - cannot authenticate');
      }

      // Get access token using JWT (with optional username override)
      const authResult = await SalesforceJWTAuth.authenticate(options?.username);
      const instanceUrl = authResult.instanceUrl;
      
      // CRITICAL: Use API to establish session first, then set cookies
      // This ensures we have a valid session before trying to navigate
      logger.info('Establishing session via API...');
      await this.establishSessionViaAPI(page, authResult, instanceUrl);
      
      // Now set cookies for both domains
      await this.setAuthCookies(page, authResult, instanceUrl);

      // Navigate to Lightning domain home page to establish session there
      // This is important because UI tests navigate to .lightning.force.com
      const lightningBaseUrl = instanceUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
      const homeUrl = `${lightningBaseUrl}/lightning/page/home`;
      logger.info(`Navigating to Lightning home: ${homeUrl}`);

      // Use try-catch for navigation with retry logic
      // Set referrer to prevent redirect popups
      let navigationSuccess = false;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!navigationSuccess && attempts < maxAttempts) {
        attempts++;
        try {
          await page.goto(homeUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000,
            referer: instanceUrl // Set referrer to prevent popups
          });
          
          // Wait a moment for any redirects
          await page.waitForTimeout(2000);
          
          // Verify we're not on login page
          const currentUrl = page.url();
          if (currentUrl.includes('/login') || currentUrl.includes('login.salesforce.com')) {
            if (attempts < maxAttempts) {
              logger.warn(`Attempt ${attempts}: Still on login page, retrying cookie setup...`);
              // Re-set cookies and try again
              await this.setAuthCookies(page, authResult, instanceUrl);
              continue;
            } else {
              throw new Error('Authentication failed - still on login page after multiple attempts');
            }
          }
          
          navigationSuccess = true;
        } catch (navError: any) {
          // If navigation fails, try navigating to base URL first
          if (navError.message.includes('closed') || navError.message.includes('detached')) {
            logger.warn('Initial navigation failed, retrying with base URL first...');
            await page.goto(instanceUrl, { 
              waitUntil: 'domcontentloaded', 
              timeout: 30000,
              referer: instanceUrl
            });
            await page.goto(homeUrl, { 
              waitUntil: 'domcontentloaded', 
              timeout: 60000,
              referer: instanceUrl
            });
            navigationSuccess = true;
          } else if (attempts < maxAttempts) {
            logger.warn(`Navigation attempt ${attempts} failed: ${navError.message}, retrying...`);
            await page.waitForTimeout(2000);
            continue;
          } else {
            throw navError;
          }
        }
      }
      
      if (!navigationSuccess) {
        throw new Error('Failed to navigate to home page after multiple attempts');
      }

      // Wait for the App Launcher (waffle icon) to confirm page is ready
      // Use a more flexible selector and check for login page
      try {
        // First check if we're stuck on login page
        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('login.salesforce.com')) {
          logger.error('Still on login page after authentication - cookies may not have been set correctly');
          throw new Error('Authentication failed - still on login page. Check JWT credentials and cookie settings.');
        }
        
        // Wait for App Launcher or home page indicators
        await page.waitForSelector('.slds-icon-waffle, [data-key="home"], .slds-page-header, lightning-app-header', { timeout: 30000 });
        logger.info('✅ Successfully authenticated - App Launcher/home page detected');
      } catch (selectorError: any) {
        // If selector not found, check if we're on a Salesforce page
        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('login.salesforce.com')) {
          logger.error('Still on login page after authentication');
          throw new Error('Authentication failed - still on login page. Check JWT credentials.');
        }
        if (!currentUrl.includes('salesforce.com') && !currentUrl.includes('force.com')) {
          throw new Error('Navigation failed - not on Salesforce domain');
        }
        logger.warn('App Launcher selector not found, but page appears loaded');
      }

      logger.info('JWT authentication completed - user should be logged in');
      return authResult;
    } catch (error: any) {
      logger.error(`JWT authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Establish session via API call first
   * This ensures we have a valid session before setting cookies
   */
  private static async establishSessionViaAPI(
    page: Page,
    authResult: JWTAuthResult,
    instanceUrl: string
  ): Promise<void> {
    try {
      // Make an API call using the access token to establish session
      const apiUrl = `${instanceUrl}/services/data/v58.0/`;
      const response = await page.request.get(apiUrl, {
        headers: {
          'Authorization': `Bearer ${authResult.accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.status() === 200 || response.status() === 401) {
        // Even if 401, the session attempt helps establish context
        logger.debug('Session establishment API call completed');
      }
    } catch (error: any) {
      logger.warn(`Session establishment API call failed: ${error.message} - continuing anyway`);
    }
  }

  /**
   * Set authentication cookies in browser
   * Sets cookies for BOTH .my.salesforce.com AND .lightning.force.com domains
   * This is critical because Salesforce Lightning UI uses a different domain
   * IMPORTANT: Must navigate to each domain before setting cookies for that domain
   */
  private static async setAuthCookies(
    page: Page,
    authResult: JWTAuthResult,
    instanceUrl: string
  ): Promise<void> {
    const domain = new URL(instanceUrl).hostname;
    // Generate the Lightning domain (e.g., arx--qa.sandbox.lightning.force.com)
    const lightningDomain = domain.replace('.my.salesforce.com', '.lightning.force.com');
    
    // Cookies for .my.salesforce.com domain (API/Classic)
    const mainDomainCookies = [
      {
        name: 'sid',
        value: authResult.accessToken,
        domain: domain,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const,
      },
      {
        name: 'oid',
        value: authResult.id.split('/').pop() || '',
        domain: domain,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const,
      },
    ];
    
    // Set cookies for main domain
    // CRITICAL: Set cookies BEFORE navigating - navigate to about:blank first
    try {
      logger.debug(`Setting cookies for main domain: ${domain}`);
      
      // Navigate to about:blank to set cookies in a neutral context
      await page.goto('about:blank');
      
      // Set cookies for main domain
      await page.context().addCookies(mainDomainCookies);
      logger.debug(`✅ Set cookies for main domain: ${domain}`);
      
      // Now navigate to the domain - cookies should be sent with the request
      const mainDomainUrl = `https://${domain}`;
      logger.debug(`Navigating to main domain: ${mainDomainUrl}`);
      await page.goto(mainDomainUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for any redirects
      await page.waitForTimeout(2000);
      
      // Check if we're on login page - if so, cookies didn't work
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('login.salesforce.com')) {
        logger.warn(`⚠️  Still on login page after setting cookies - trying alternative approach`);
        // Try setting cookies again after navigation
        await page.context().addCookies(mainDomainCookies);
        await page.waitForTimeout(1000);
        await page.reload({ waitUntil: 'domcontentloaded' });
      }
      
      // Verify cookies were set
      const cookiesAfter = await page.context().cookies();
      const sidCookie = cookiesAfter.find(c => c.name === 'sid' && (c.domain === domain || c.domain === `.${domain}`));
      if (!sidCookie) {
        logger.warn(`⚠️  Warning: sid cookie not found after setting for ${domain}`);
      } else {
        logger.debug(`✅ Verified sid cookie set for ${domain}`);
      }
    } catch (error: any) {
      logger.error(`❌ Error setting cookies for main domain: ${error.message}`);
      throw new Error(`Failed to set authentication cookies: ${error.message}`);
    }
    
    // Set cookies for Lightning domain if different
    if (lightningDomain !== domain) {
      const lightningCookies = [
        {
          name: 'sid',
          value: authResult.accessToken,
          domain: lightningDomain,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
        },
        {
          name: 'oid',
          value: authResult.id.split('/').pop() || '',
          domain: lightningDomain,
          path: '/',
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const,
        }
      ];
      
      try {
        const lightningUrl = `https://${lightningDomain}`;
        logger.debug(`Navigating to Lightning domain to set cookies: ${lightningUrl}`);
        await page.goto(lightningUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait a moment for page to load
        await page.waitForTimeout(1000);
        
        // Set cookies for Lightning domain
        await page.context().addCookies(lightningCookies);
        logger.debug(`✅ Set cookies for Lightning domain: ${lightningDomain}`);
        
        // Verify cookies were set
        const cookiesAfter = await page.context().cookies();
        const sidCookie = cookiesAfter.find(c => c.name === 'sid' && c.domain === lightningDomain);
        if (!sidCookie) {
          logger.warn(`⚠️  Warning: sid cookie not found after setting for ${lightningDomain}`);
        } else {
          logger.debug(`✅ Verified sid cookie set for ${lightningDomain}`);
        }
      } catch (error: any) {
        logger.error(`❌ Error setting cookies for Lightning domain: ${error.message}`);
        throw new Error(`Failed to set authentication cookies for Lightning domain: ${error.message}`);
      }
    }

    logger.debug(`Authentication cookies set for both domains`);
  }

  /**
   * Alternative: Use OAuth redirect flow (if JWT not available)
   */
  static async authenticateWithOAuth(page: Page): Promise<void> {
    logger.info('Authenticating with Salesforce using OAuth redirect...');

    const username = process.env.SF_USERNAME;
    const password = process.env.SF_PASSWORD;
    const securityToken = process.env.SF_SECURITY_TOKEN;
    const loginUrl = config.getSalesforceConfig().loginUrl;

    if (!username || !password) {
      throw new Error('SF_USERNAME and SF_PASSWORD must be set for OAuth flow');
    }

    // Navigate to login page
    const sfConfig = config.getSalesforceConfig();
    await page.goto(loginUrl || sfConfig.baseUrl || 'https://login.salesforce.com', { waitUntil: 'networkidle' });

    // Enter credentials
    await page.fill('#username', username);
    await page.fill('#password', password + (securityToken || ''));
    await page.click('#Login');

    // Wait for navigation
    await page.waitForLoadState('networkidle');

    // Handle verification if needed (can be bypassed with JWT)
    const currentUrl = page.url();
    if (currentUrl.includes('verification') || currentUrl.includes('challenge')) {
      logger.warn('Verification page detected - JWT auth recommended to bypass');
      // Could implement verification bypass here if needed
    }

    logger.info('OAuth authentication completed');
  }

  /**
   * Authenticate using username/password (for users without JWT access)
   * Note: This may trigger email/phone verification - JWT is recommended
   * @param page - Playwright page instance
   * @param options - Password auth options (username, password, securityToken)
   * @returns Partial auth result (without API access token)
   */
  static async authenticateWithPassword(
    page: Page,
    options: PasswordAuthOptions
  ): Promise<Partial<JWTAuthResult>> {
    logger.info(`Authenticating with password for user: ${options.username}...`);

    const loginUrl = config.getSalesforceConfig().loginUrl || config.getSalesforceConfig().baseUrl;

    if (!options.username || !options.password) {
      throw new Error('Username and password are required for password authentication');
    }

    // Navigate to login page
    await page.goto(loginUrl || 'https://login.salesforce.com', { waitUntil: 'networkidle' });

    // Enter credentials
    await page.fill('#username', options.username);
    await page.fill('#password', options.password + (options.securityToken || ''));
    await page.click('#Login');

    // Wait for navigation with timeout
    try {
      await page.waitForURL(/.*\.salesforce\.com.*|.*\.force\.com.*/, { timeout: 30000 });
    } catch (error) {
      // Check if we're on a verification page
      const currentUrl = page.url();
      if (currentUrl.includes('verification') || currentUrl.includes('challenge')) {
        throw new Error(
          'Email/phone verification required. Use JWT authentication for this user, ' +
          'or complete verification manually and retry.'
        );
      }
      throw error;
    }

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify we're logged in by checking for Lightning elements
    const isLoggedIn = await page.locator('.slds-icon-waffle, [data-key="home"], .slds-page-header').isVisible({ timeout: 10000 }).catch(() => false);
    
    if (!isLoggedIn) {
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        throw new Error('Login failed - still on login page. Check credentials.');
      }
    }

    logger.info('✅ Password authentication successful');
    
    // Return partial result (we don't have access token with password auth)
    return {
      instanceUrl: page.url().split('/lightning')[0] || page.url().split('.com')[0] + '.com',
      accessToken: '', // Not available with password auth
      id: '',
      tokenType: 'password',
    };
  }
}

