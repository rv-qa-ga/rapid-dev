import { setWorldConstructor, World, setDefaultTimeout } from '@cucumber/cucumber';
import { chromium, Browser, BrowserContext, Page, APIRequestContext } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { config, loadEnvFileWithShellPreserved } from '../config/config';
import { logger } from '../utils/logger';

// Set default timeout to 3 minutes
// Streaming / platform-event scenarios may need handshake (up to 120s) + event wait (up to 120s) in separate steps
setDefaultTimeout(420 * 1000);

// Determine environment first
const env = (process.env.ENV || 'qa').toLowerCase();

// Environment should already be loaded by config.ts, but ensure it's set
// Load environment-specific .env file - check multiple locations in order:
// 1. src/config/env/.env.{env} (preferred location)
// 2. src/config/.env.{env}
// 3. Root directory .env.{env}

const configDir = path.resolve(__dirname, '../config');
const envConfigPath = path.resolve(configDir, 'env', `.env.${env}`);
const configEnvPath = path.resolve(configDir, `.env.${env}`);
const rootEnvPath = path.resolve(process.cwd(), `.env.${env}`);
const baseEnvPath = path.resolve(process.cwd(), '.env');

const envPathMap: Array<{ path: string; label: string }> = [
  { path: envConfigPath, label: `src/config/env/.env.${env}` },
  { path: configEnvPath, label: `src/config/.env.${env}` },
  { path: rootEnvPath, label: `.env.${env}` },
];

let envLoaded = false;
for (const envPath of envPathMap) {
  if (fs.existsSync(envPath.path)) {
    loadEnvFileWithShellPreserved(envPath.path);
    logger.info(`✅ Environment config loaded from ${envPath.label}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  if (fs.existsSync(baseEnvPath)) {
    dotenv.config({ path: baseEnvPath });
    logger.warn('⚠️  Environment-specific file not found. Loaded base .env instead.');
  } else {
    logger.warn(`⚠️  Environment file .env.${env} not found and no base .env detected.`);
  }
}

const authFile = path.join(process.cwd(), 'playwright/.auth/user.json');

export interface TestContext {
  [key: string]: any;
}

export class AutomationWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  apiContext!: APIRequestContext;
  testContext: TestContext = {};
  screenshots: string[] = [];
  attachments: Array<{ name: string; path: string; type: string }> = [];
  private mainPage: Page | null = null; // Track main page to avoid closing it

  /**
   * Initialize browser context from shared browser (PERFORMANCE OPTIMIZED)
   * Creates a new isolated context per scenario while reusing the browser instance
   */
  async initBrowserContext(sharedBrowser: Browser) {
    const sfConfig = config.getSalesforceConfig();
    
    logger.debug('Creating new browser context (reusing shared browser)...');
    
    // Check if shared browser is still open
    if (!sharedBrowser.isConnected()) {
      throw new Error('Shared browser has been closed');
    }
    
    // Store reference to shared browser
    this.browser = sharedBrowser;
    // Mark browser as shared to prevent premature closing
    (this.browser as any)._isShared = true;

    // Use viewport: null so the browser window size is used (maximized with --start-maximized).
    // In CI, use a fixed viewport for consistency.
    const isCI = !!process.env.CI;
    const contextOptions: any = {
      viewport: isCI ? { width: 1920, height: 1080 } : null,
      baseURL: sfConfig.baseUrl,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    // Use saved authentication state if available
    if (fs.existsSync(authFile)) {
      try {
        const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
        if (authData.cookies && authData.cookies.length > 0) {
          contextOptions.storageState = authFile;
          logger.info('Using saved authentication state');
        }
      } catch (error) {
        logger.warn('Saved auth state file is invalid, will re-authenticate');
        if (fs.existsSync(authFile)) {
          fs.unlinkSync(authFile);
        }
      }
    }

    this.context = await this.browser.newContext(contextOptions);

    // Reset main page tracking for this context
    this.mainPage = null;

    // Aggressive popup handler - set up BEFORE creating any pages
    this.context.on('page', async (newPage) => {
      // Wait a tiny bit to see if this is the main page we're about to create
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If we don't have a main page yet, this is it (first page created)
      if (!this.mainPage) {
        this.mainPage = newPage;
        logger.debug(`Main page registered: ${newPage.url()}`);
        return;
      }

      // If this is the main page (same reference), don't close it
      if (newPage === this.mainPage) {
        logger.debug(`Main page event (ignored): ${newPage.url()}`);
        return;
      }

      // Ignore about:blank pages (they're not real popups)
      const popupUrl = newPage.url();
      if (popupUrl === 'about:blank' || popupUrl.startsWith('about:')) {
        logger.debug(`Ignoring about:blank page`);
        return;
      }

      // This is a popup - close it immediately
      logger.debug(`Popup detected: ${popupUrl} - closing immediately`);
      
      try {
        // Close immediately without any waits
        if (!newPage.isClosed()) {
          await newPage.close({ runBeforeUnload: false });
          logger.debug(`Closed popup: ${popupUrl}`);
        }
      } catch (error: any) {
        // Page might already be closed - that's fine
        logger.debug(`Popup close attempt: ${error.message || 'already closed'}`);
      }
    });

    // Periodic cleanup: close any extra pages that might have been created
    // PERFORMANCE OPTIMIZED: Increased interval from 2s to 5s to reduce overhead
    const cleanupInterval = setInterval(async () => {
      try {
        if (!this.context || this.context.browser()?.isConnected() === false) {
          clearInterval(cleanupInterval);
          return;
        }
        
        const allPages = this.context.pages();
        if (allPages.length > 1 && this.mainPage && !this.mainPage.isClosed()) {
          for (const page of allPages) {
            if (page !== this.mainPage && !page.isClosed()) {
              const pageUrl = page.url();
              // Ignore about:blank pages
              if (pageUrl === 'about:blank' || pageUrl.startsWith('about:')) {
                continue;
              }
              logger.debug(`Cleanup: Closing extra page: ${pageUrl}`);
              try {
                await page.close({ runBeforeUnload: false });
              } catch (error: any) {
                logger.debug(`Cleanup close error: ${error.message || 'already closed'}`);
              }
            }
          }
        }
      } catch (error: any) {
        // Context might be closed - clear interval
        if (error.message?.includes('closed') || error.message?.includes('Target closed') || error.message?.includes('Browser has been closed')) {
          clearInterval(cleanupInterval);
        }
      }
    }, 5000); // PERFORMANCE: Check every 5 seconds (was 2 seconds)

    // Store cleanup interval for later cleanup
    (this.context as any)._cleanupInterval = cleanupInterval;

    // Add stealth script
    await this.context.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      window.chrome = { runtime: {} };
    `);

    // Apply 80% zoom so full page content is visible (when not in CI). Override with BROWSER_ZOOM=0.8 env.
    if (!process.env.CI) {
      const zoomLevel = process.env.BROWSER_ZOOM ? parseFloat(process.env.BROWSER_ZOOM) : 0.8;
      if (zoomLevel > 0 && zoomLevel <= 2) {
        await this.context.addInitScript((zoom: number) => {
          const apply = () => {
            document.documentElement.style.zoom = String(zoom);
            if (document.body) document.body.style.zoom = String(zoom);
          };
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', apply);
          } else {
            apply();
          }
        }, zoomLevel);
        logger.debug(`Browser zoom set to ${Math.round(zoomLevel * 100)}%`);
      }
    }

    // Create the main page and immediately set it as the tracked main page
    this.page = await this.context.newPage();
    this.mainPage = this.page; // Set immediately after creation
    
    // Handle page-level popup blocking
    // Suppress all popups in both headless and headed mode to prevent unwanted windows
    this.page.on('popup', async (popup) => {
      const popupUrl = popup.url();
      logger.debug(`Page popup detected: ${popupUrl}`);
      try {
        // Close immediately to prevent window from appearing
        await popup.close();
        logger.debug('Closed page popup');
      } catch (error: any) {
        // Popup might already be closed
        logger.debug(`Page popup close attempt: ${error.message || 'already closed'}`);
      }
    });
    
    // Also block dialog/prompt/confirm dialogs that might create windows
    this.page.on('dialog', async (dialog) => {
      logger.debug(`Dialog detected: ${dialog.type()} - ${dialog.message()}`);
      await dialog.dismiss().catch(() => {});
    });
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded').catch(() => {
      // Page might already be loaded, that's fine
    });
    
    logger.debug('Browser context initialized successfully');
  }

  /**
   * Legacy method - kept for backward compatibility
   * Now delegates to initBrowserContext if shared browser is available
   */
  async initBrowser() {
    // This method is kept for backward compatibility
    // In optimized mode, initBrowserContext should be used instead
    const sfConfig = config.getSalesforceConfig();
    const timeouts = config.getTimeouts();

    // Determine headless mode - default to true unless explicitly set to 'false'
    const headlessEnv = process.env.HEADLESS?.toLowerCase();
    const headedMode = headlessEnv === 'false' || headlessEnv === '0' || headlessEnv === 'off' || headlessEnv === 'no';
    const isHeadless = !headedMode;
    
    logger.info(`Initializing browser (legacy mode - not optimized)... (headless: ${isHeadless})`);

    this.browser = await chromium.launch({
      channel: 'chrome',
      headless: isHeadless,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-popup-blocking',
        '--disable-notifications',
        '--disable-infobars',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
      ],
    });

    const isCI = !!process.env.CI;
    const contextOptions: any = {
      viewport: isCI ? { width: 1920, height: 1080 } : null,
      baseURL: sfConfig.baseUrl,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    };

    // Use saved authentication state if available
    if (fs.existsSync(authFile)) {
      try {
        const authData = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
        if (authData.cookies && authData.cookies.length > 0) {
          contextOptions.storageState = authFile;
          logger.info('Using saved authentication state');
        }
      } catch (error) {
        logger.warn('Saved auth state file is invalid, will re-authenticate');
        if (fs.existsSync(authFile)) {
          fs.unlinkSync(authFile);
        }
      }
    }

    this.context = await this.browser.newContext(contextOptions);

    // Reset main page tracking for this context
    this.mainPage = null;

    // Aggressive popup handler - set up BEFORE creating any pages
    this.context.on('page', async (newPage) => {
      // Wait a tiny bit to see if this is the main page we're about to create
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If we don't have a main page yet, this is it (first page created)
      if (!this.mainPage) {
        this.mainPage = newPage;
        logger.debug(`Main page registered: ${newPage.url()}`);
        return;
      }

      // If this is the main page (same reference), don't close it
      if (newPage === this.mainPage) {
        logger.debug(`Main page event (ignored): ${newPage.url()}`);
        return;
      }

      // Ignore about:blank pages (they're not real popups)
      const popupUrl = newPage.url();
      if (popupUrl === 'about:blank' || popupUrl.startsWith('about:')) {
        logger.debug(`Ignoring about:blank page`);
        return;
      }

      // This is a popup - close it immediately
      logger.debug(`Popup detected: ${popupUrl} - closing immediately`);
      
      try {
        if (!newPage.isClosed()) {
          await newPage.close({ runBeforeUnload: false });
          logger.debug(`Closed popup: ${popupUrl}`);
        }
      } catch (error: any) {
        logger.debug(`Popup close attempt: ${error.message || 'already closed'}`);
      }
    });

    // Periodic cleanup: close any extra pages that might have been created
    const cleanupInterval = setInterval(async () => {
      try {
        if (!this.context || this.context.browser()?.isConnected() === false) {
          clearInterval(cleanupInterval);
          return;
        }
        
        const allPages = this.context.pages();
        if (allPages.length > 1 && this.mainPage && !this.mainPage.isClosed()) {
          for (const page of allPages) {
            if (page !== this.mainPage && !page.isClosed()) {
              const pageUrl = page.url();
              // Ignore about:blank pages
              if (pageUrl === 'about:blank' || pageUrl.startsWith('about:')) {
                continue;
              }
              logger.debug(`Cleanup: Closing extra page: ${pageUrl}`);
              try {
                await page.close({ runBeforeUnload: false });
              } catch (error: any) {
                logger.debug(`Cleanup close error: ${error.message || 'already closed'}`);
              }
            }
          }
        }
      } catch (error: any) {
        if (error.message?.includes('closed') || error.message?.includes('Target closed') || error.message?.includes('Browser has been closed')) {
          clearInterval(cleanupInterval);
        }
      }
    }, 5000);

    (this.context as any)._cleanupInterval = cleanupInterval;

    // Add stealth script
    await this.context.addInitScript(`
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });
      window.chrome = { runtime: {} };
    `);

    if (!process.env.CI) {
      const zoomLevel = process.env.BROWSER_ZOOM ? parseFloat(process.env.BROWSER_ZOOM) : 0.8;
      if (zoomLevel > 0 && zoomLevel <= 2) {
        await this.context.addInitScript((zoom: number) => {
          const apply = () => {
            document.documentElement.style.zoom = String(zoom);
            if (document.body) document.body.style.zoom = String(zoom);
          };
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', apply);
          } else {
            apply();
          }
        }, zoomLevel);
      }
    }

    // Create the main page and immediately set it as the tracked main page
    this.page = await this.context.newPage();
    this.mainPage = this.page; // Set immediately after creation
    
    this.page.on('popup', async (popup) => {
      const popupUrl = popup.url();
      logger.debug(`Page popup detected: ${popupUrl}`);
      try {
        await popup.close();
        logger.debug('Closed page popup');
      } catch (error: any) {
        logger.debug(`Page popup close attempt: ${error.message || 'already closed'}`);
      }
    });
    
    this.page.on('dialog', async (dialog) => {
      logger.debug(`Dialog detected: ${dialog.type()} - ${dialog.message()}`);
      await dialog.dismiss().catch(() => {});
    });
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded').catch(() => {
      // Page might already be loaded, that's fine
    });
    
    logger.info('Browser initialized successfully');
  }

  async initAPI() {
    const rawTags: string[] = Array.isArray(this.testContext.scenarioTags)
      ? (this.testContext.scenarioTags as string[])
      : [];
    const tags = rawTags.map((t) => {
      const s = String(t).trim();
      return s.startsWith('@') ? s : `@${s}`;
    });
    const hasUi = tags.includes('@ui');
    /** Any @lloyds or @lloyds-* tag (pickle tag names may omit @ from some formatters). */
    const hasLloyds =
      tags.includes('@lloyds') || tags.some((t) => /^@lloyds[-_]/i.test(t));
    /**
     * Lloyd's Dataverse / Snowflake / Azure SQL / F&O OData use Microsoft Entra or direct HTTP —
     * do not create a Salesforce browser session or call Salesforce JWT (avoids opening SF domains).
     * Scenarios that truly need Playwright + Salesforce must include @ui on the scenario (not only inherited).
     */
    const isLloydsMicrosoftOnly = hasLloyds && !hasUi;

    if (isLloydsMicrosoftOnly) {
      logger.info("Initializing API context for Lloyd's (Dataverse / Snowflake — no Salesforce browser).");
      const { request } = await import('@playwright/test');
      this.apiContext = await request.newContext({ ignoreHTTPSErrors: true });
      this.testContext.lloydsStandalonePlaywrightRequest = true;
      logger.info("Lloyd's: Playwright APIRequestContext only (dispose on scenario cleanup).");
      return;
    }

    logger.info('Initializing API context...');

    // Create API context from browser context
    if (!this.context) {
      await this.initBrowser();
    }

    this.apiContext = this.context.request;

    // CRITICAL FIX: Authenticate browser session for API tests
    // API tests need browser context for APIRequestContext, but if UI steps are used,
    // the browser must be authenticated to avoid getting stuck on login page
    if (this.context && !this.testContext.browserAuthenticated) {
      try {
        // Ensure page exists (create if needed)
        if (!this.page) {
          this.page = await this.context.newPage();
        }

        logger.info('Authenticating browser session for API test (to support UI steps if needed)...');
        const { SalesforceUIAuth } = await import('../utils/salesforce-auth');
        await SalesforceUIAuth.authenticateWithJWT(this.page);
        this.testContext.browserAuthenticated = true;
        logger.info('Browser session authenticated for API test');
      } catch (error: any) {
        logger.warn(`Browser authentication for API test failed (may not be needed): ${error.message}`);
        // Don't throw - API tests can work without browser auth if they only use API steps
      }
    }

    logger.info('API context initialized successfully');
  }

  async cleanup() {
    logger.debug('Cleaning up browser context and API context...');
    
    // Stop cleanup interval if it exists
    if (this.context && (this.context as any)._cleanupInterval) {
      clearInterval((this.context as any)._cleanupInterval);
      logger.debug('Stopped cleanup interval');
    }
    
    // Close ALL pages in context first (but don't close main page if it's still needed)
    // The After hook should have already taken screenshots, so it's safe to close now
    if (this.context) {
      try {
        const allPages = this.context.pages();
        logger.debug(`Closing ${allPages.length} page(s) in context`);
        for (const page of allPages) {
          // Skip main page if it's the same reference (it will be closed with context)
          if (page === this.mainPage) {
            logger.debug(`Skipping main page (will close with context)`);
            continue;
          }
          if (!page.isClosed()) {
            try {
              await page.close({ runBeforeUnload: false });
              logger.debug(`Closed extra page: ${page.url()}`);
            } catch (error: any) {
              logger.debug(`Page close error: ${error.message || 'already closed'}`);
            }
          }
        }
      } catch (error: any) {
        logger.debug(`Error closing pages: ${error.message}`);
      }
    }
    
    // Don't explicitly close main page - it will be closed with the context
    // This prevents "page already closed" errors
    
    // PERFORMANCE OPTIMIZED: Only close context, NOT browser (browser is shared)
    // The shared browser will be closed in AfterAll hook
    if (this.context) {
      try {
        await this.context.close();
        logger.debug('Browser context closed (browser remains open for reuse)');
      } catch (error: any) {
        logger.debug(`Context close error: ${error.message}`);
      }
    }
    
    // Only close browser if it's not the shared one (legacy mode)
    // In optimized mode, browser is shared and closed in AfterAll
    if (this.browser && !(this.browser as any)._isShared) {
      try {
        await this.browser.close();
        logger.debug('Browser closed (legacy mode)');
      } catch (error: any) {
        logger.debug(`Browser close error: ${error.message}`);
      }
    } else if (this.browser && (this.browser as any)._isShared) {
      logger.debug('Skipping browser close - browser is shared and will be closed in AfterAll');
    }
    
    // Dispose API context
    if (this.apiContext) {
      try {
        await this.apiContext.dispose();
        logger.debug('API context disposed');
      } catch (error: any) {
        logger.debug(`API context dispose error: ${error.message}`);
      }
    }
    
    logger.debug('Cleanup completed');
  }

  addScreenshot(path: string): void {
    this.screenshots.push(path);
    this.attachments.push({
      name: `screenshot-${this.screenshots.length}`,
      path,
      type: 'image/png',
    });
  }

  addAttachment(name: string, path: string, type: string): void {
    this.attachments.push({ name, path, type });
  }
}

setWorldConstructor(AutomationWorld);

