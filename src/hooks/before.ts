import { Before, BeforeAll, BeforeStep } from '@cucumber/cucumber';
import { AutomationWorld } from './world';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { reporter } from '../utils/reporter';
import { Browser } from '@playwright/test';
import { chromium } from '@playwright/test';
import { progressTracker } from '../utils/progress-tracker';

// Shared browser instance - reused across all scenarios for performance
// Exported so AfterAll can close it
export let sharedBrowser: Browser | null = null;

BeforeAll(async function () {
  logger.info('=== Test Suite Starting ===');
  const env = config.getEnvironment();
  const baseUrl = config.getSalesforceConfig().baseUrl;
  const username = process.env.SF_USERNAME || process.env.SF_JWT_USERNAME;
  
  logger.info(`Environment: ${env}`);
  logger.info(`Salesforce Base URL: ${baseUrl}`);
  logger.info(`Username: ${username || 'Not configured'}`);
  
  // Log user permissions if available (can be enhanced to fetch from Salesforce)
  const permissions = process.env.SF_USER_PERMISSIONS?.split(',') || [];
  if (permissions.length > 0) {
    reporter.setUserPermissions(permissions);
    logger.info(`User Permissions: ${permissions.join(', ')}`);
  }

  // Initialize shared browser only if needed (lazy initialization in Before hook)
  // This prevents launching browser for API-only test runs
  logger.info('Browser will be initialized on-demand for UI tests');
  
  // Note: Progress tracker will be initialized when we know the total count
  // This will be done in a custom hook or via Cucumber's event system
});

Before(async function (this: AutomationWorld, scenario: any) {
  const scenarioName = scenario.pickle?.name || 'Unknown';
  
  // Track scenario start
  progressTracker.startScenario(scenarioName);
  
  logger.info('Setting up test scenario...');
  logger.info(`Scenario: ${scenarioName}`);
  
  // Get tags from scenario
  const tags = scenario.pickle?.tags?.map((tag: any) => tag.name) || [];
  const tagNames = tags.join(' ');
  logger.info(`Tags: ${tagNames}`);
  
  // Store tags and feature name in test context for use in step definitions
  this.testContext.scenarioTags = tags;
  this.testContext.scenarioName = scenarioName;
  this.testContext.featureName = scenario.gherkinDocument?.feature?.name || '';

  // Determine if this is a UI test
  const isUITest = tagNames.includes('@ui') || 
                   (!tagNames.includes('@api') && tags.length > 0) || // Default to UI if not API
                   tags.length === 0;
  
  // SQL Server-only scenarios (@businessdata): no browser, no Salesforce/Dynamics API
  // Exception: @e2e or @ui with @businessdata means full pipeline test (browser + API + SQL)
  const isSqlServerOnly =
    tagNames.includes('@businessdata') &&
    !tagNames.includes('@e2e') &&
    !tagNames.includes('@ui');
  if (isSqlServerOnly) {
    logger.info('SQL Server-only scenario (@businessdata): skipping browser and Salesforce/Dynamics API init');
  }
  
  // Initialize browser for UI tests - PERFORMANCE OPTIMIZED: reuse shared browser
  // Skip browser for SQL Server-only scenarios
  if (!isSqlServerOnly && isUITest) {
    // Lazy initialization: launch browser only when needed for UI tests
    if (!sharedBrowser || !sharedBrowser.isConnected()) {
      logger.info('Initializing shared browser for UI test...');
      
      // ASSISTED MODE: Force non-headless and enable Playwright Inspector
      const assistedMode = process.env.ASSISTED_MODE === 'true' || process.env.ASSISTED_MODE === '1';
      const headlessEnv = process.env.HEADLESS?.toLowerCase();
      const headedMode = headlessEnv === 'false' || headlessEnv === '0' || headlessEnv === 'off' || headlessEnv === 'no';
      const isHeadless = assistedMode ? false : !headedMode;

      if (!isHeadless) {
        logger.info(
          `Browser mode: headed (visible window). HEADLESS=${JSON.stringify(process.env.HEADLESS ?? '')}`
        );
      }
      
      if (assistedMode) {
        logger.info('═══════════════════════════════════════════════════════════════');
        logger.info('🔧 ASSISTED MODE ENABLED');
        logger.info('═══════════════════════════════════════════════════════════════');
        logger.info('💡 Browser will run in headed mode (visible)');
        logger.info('💡 Playwright Inspector will be enabled');
        logger.info('💡 Test will pause after login for manual interaction');
        logger.info('═══════════════════════════════════════════════════════════════');
        // Enable Playwright Inspector
        process.env.PWDEBUG = '1';
      }
      
      sharedBrowser = await chromium.launch({
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
      (sharedBrowser as any)._isShared = true;
      logger.info('Shared browser initialized');
    }
    
    // Always create a fresh browser context for each UI scenario
    const needsNewContext = !this.page || 
                           this.page.isClosed() || 
                           !this.context ||
                           (this.context as any)._isClosed;
    
    if (needsNewContext) {
      logger.debug('Creating new browser context for UI test (reusing shared browser)...');
      try {
        await this.initBrowserContext(sharedBrowser!);
      } catch (error: any) {
        logger.error(`Failed to create browser context: ${error.message}`);
        // Try relaunching the browser
        logger.info('Attempting to relaunch browser...');
        const assistedMode = process.env.ASSISTED_MODE === 'true' || process.env.ASSISTED_MODE === '1';
        const headlessEnv = process.env.HEADLESS?.toLowerCase();
        const headedMode = headlessEnv === 'false' || headlessEnv === '0' || headlessEnv === 'off' || headlessEnv === 'no';
        const isHeadless = assistedMode ? false : !headedMode;
        
        if (assistedMode) {
          process.env.PWDEBUG = '1';
        }
        
        sharedBrowser = await chromium.launch({
          channel: 'chrome',
          headless: isHeadless,
          args: ['--start-maximized', '--disable-blink-features=AutomationControlled', '--no-sandbox'],
        });
        (sharedBrowser as any)._isShared = true;
        await this.initBrowserContext(sharedBrowser!);
      }
    } else {
      logger.debug('Browser context already initialized');
    }
  }
  
  // Initialize API context for API tests and integration tests
  // Skip for SQL Server-only scenarios (@businessdata) - they only need SqlServerClient
  // Skip for Dynamics-only UI scenarios (@DynamicsUILogin) - no Salesforce, avoid opening SF in browser
  const isDynamicsOnlyUI = tagNames.includes('@DynamicsUILogin');
  if (!isSqlServerOnly && !isDynamicsOnlyUI && (tagNames.includes('@api') || tagNames.includes('@integration'))) {
    if (!this.apiContext) {
      logger.info('Initializing API context for API/Integration test...');
      await this.initAPI();
    }
  }
  if (isDynamicsOnlyUI) {
    logger.info('Dynamics-only UI scenario (@DynamicsUILogin): skipping Salesforce API init');
  }
});

BeforeStep(async function (this: AutomationWorld, step: any) {
  const stepText = step.pickleStep?.text || 'Unknown step';
  progressTracker.startStep(stepText);
});

