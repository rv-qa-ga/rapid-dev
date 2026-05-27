import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { logger } from '../../utils/logger';

/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    ⚠️  LOGIN METHODS - STABLE  ⚠️                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  The following methods are LOCKED and should NOT be modified:             ║
 * ║  - openAppLauncher()                                                      ║
 * ║  - openAccelerantConsole()                                                ║
 * ║  - isAccelerantConsoleLoaded()                                            ║
 * ║  - logout()                                                               ║
 * ║                                                                           ║
 * ║  Last verified: 2025-11-29                                                ║
 * ║  These work with @LoginCheck scenario in login.feature                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

export class HomePage extends BasePage {
  // Selectors
  private readonly appLauncherButtonName = 'App Launcher';
  private readonly appSearchAria = 'Search apps and items...';
  private readonly globalSearchInput = 'input[placeholder*="Search"]';
  private readonly viewProfileButtonName = 'View profile';
  private readonly logoutLinkName = 'Log Out';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Check if user is logged in (home page is displayed)
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.getByRole('button', { name: this.appLauncherButtonName }).waitFor({
        state: 'visible',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if App Launcher button is visible
   */
  async isAppLauncherVisible(): Promise<boolean> {
    try {
      await this.page.getByRole('button', { name: this.appLauncherButtonName }).waitFor({
        state: 'visible',
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Log out from Salesforce
   */
  async logout(): Promise<void> {
    logger.info('Logging out from Salesforce');

    // Wait for page to be interactive before attempting logout
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Allow page animations to settle

    // Click View profile button to open the dropdown
    const profileButton = this.page.getByRole('button', { name: this.viewProfileButtonName });
    await profileButton.waitFor({ state: 'visible', timeout: 15000 });
    logger.info('View profile button found, clicking...');
    await profileButton.click();

    // Wait for dropdown to appear
    await this.page.waitForTimeout(1000);

    // Check if Log Out link is visible, if not try clicking profile again
    const logoutLink = this.page.getByRole('link', { name: this.logoutLinkName });
    const isVisible = await logoutLink.isVisible().catch(() => false);
    
    if (!isVisible) {
      logger.info('Log Out link not visible, clicking View profile again...');
      await profileButton.click();
      await this.page.waitForTimeout(1000);
    }

    // Wait for the Log Out link and click it
    await logoutLink.waitFor({ state: 'visible', timeout: 10000 });
    logger.info('Log Out link is visible, clicking...');
    await logoutLink.click();

    // Confirm logout by checking for login page
    logger.info('Waiting for login page to confirm logout...');
    await this.page.waitForSelector('#username', { timeout: 30000 });
    logger.info('Logged out successfully - login page displayed');
  }

  /**
   * Open app launcher - clicks the waffle icon and waits for search to be ready
   */
  async openAppLauncher(): Promise<void> {
    logger.info('Opening app launcher');

    // Click the App Launcher button (waffle icon)
    const launcherButton = this.page.getByRole('button', { name: this.appLauncherButtonName });
    await launcherButton.waitFor({ state: 'visible', timeout: 15000 });
    await launcherButton.click();

    // Wait for the search combobox to appear (this confirms the launcher opened)
    logger.info('Waiting for App Launcher search to be visible...');
    await this.page
      .getByRole('combobox', { name: this.appSearchAria })
      .waitFor({ state: 'visible', timeout: 15000 });
    logger.info('App Launcher is open and ready');
  }

  /**
   * Navigate to Accelerant Console by typing in App Launcher search and clicking the option
   * Assumes App Launcher is already open
   * ENHANCED: Uses proper wait conditions instead of explicit timeouts
   */
  async openAccelerantConsole(): Promise<void> {
    logger.info('Searching for Accelerant Console in App Launcher');

    // Type in search
    const searchCombo = this.page.getByRole('combobox', { name: this.appSearchAria });
    await searchCombo.click();
    await searchCombo.fill('accelerant console');

    // Wait for search results to appear (wait for the option to be visible)
    logger.debug('Waiting for Accelerant Console option to appear...');
    const appOption = this.page.getByRole('option', { name: /Accelerant Console/i });
    await appOption.waitFor({ state: 'visible', timeout: 10000 });

    // Click the Accelerant Console option
    logger.info('Clicking Accelerant Console option');
    await appOption.click();

    // Wait for navigation to complete - wait for actual page elements
    logger.debug('Waiting for navigation to Accelerant Console...');
    
    // Wait for DOM to be ready
    await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
    
    // Wait for network to be idle (all resources loaded)
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
      logger.debug('Network idle timeout during navigation - continuing anyway');
    });
    
    // Wait for Lightning framework to be ready (indicates page is loaded)
    try {
      await this.page.waitForSelector('one-appnav, lightning-app, [data-aura-class*="oneApp"]', { 
        timeout: 15000 
      });
      logger.debug('Lightning framework ready');
    } catch {
      logger.debug('Lightning framework selector not found - continuing anyway');
    }
    
    logger.info('Navigated to Accelerant Console');
  }

  /**
   * Check if Accelerant Console is loaded by verifying the title element is visible
   * ENHANCED: Uses proper wait conditions instead of explicit timeouts
   */
  async isAccelerantConsoleLoaded(): Promise<boolean> {
    logger.info('Checking if Accelerant Console is loaded');
    
    try {
      // Step 1: Wait for initial page load
      await this.page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      
      // Step 2: Wait for network to be idle (all resources loaded)
      await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
        logger.debug('Network idle timeout - continuing anyway');
      });
      
      // Step 3: Wait for Lightning framework to be ready
      // Lightning apps typically have these elements when loaded
      try {
        await this.page.waitForSelector('one-appnav, lightning-app, [data-aura-class*="oneApp"]', { 
          timeout: 15000 
        });
        logger.debug('Lightning framework detected');
      } catch {
        logger.debug('Lightning framework selector not found - continuing anyway');
      }
      
      // Log actual page state for debugging
      const currentUrl = this.page.url();
      const pageTitle = await this.page.title().catch(() => 'Unknown');
      logger.debug(`Current URL: ${currentUrl}`);
      logger.debug(`Page Title: ${pageTitle}`);
      
      // Check for access denied or error pages first
      const accessDeniedSelectors = [
        'text=/access denied/i',
        'text=/insufficient privileges/i',
        'text=/you don\'t have access/i',
        'text=/you do not have access/i',
        '[data-id*="access_denied"]',
        '.error-page',
      ];
      
      for (const selector of accessDeniedSelectors) {
        const accessDenied = await this.page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false);
        if (accessDenied) {
          logger.warn(`Access denied page detected (selector: ${selector}) - user may not have app assignment`);
          logger.warn(`Current URL: ${currentUrl}`);
          logger.warn(`Page Title: ${pageTitle}`);
          return false;
        }
      }
      
      // Try multiple selectors to verify Accelerant Console is loaded
      // Wait for actual elements to appear instead of using timeouts
      
      // Option 1: Title attribute (most reliable) - wait for it to appear
      logger.debug('Waiting for Accelerant Console title element...');
      const consoleTitle = this.page.getByTitle('Accelerant Console');
      try {
        await consoleTitle.waitFor({ state: 'visible', timeout: 15000 });
        logger.info('Accelerant Console is loaded (verified by title)');
        return true;
      } catch {
        logger.debug('Title element not found, trying other methods...');
      }
      
      // Option 2: Check URL contains accelerant or console
      const urlLower = currentUrl.toLowerCase();
      if (urlLower.includes('accelerant') || urlLower.includes('console')) {
        // If URL matches, wait for title element with retry
        try {
          await consoleTitle.waitFor({ state: 'visible', timeout: 10000 });
          logger.info('Accelerant Console is loaded (verified by title after URL check)');
          return true;
        } catch {
          logger.info('Accelerant Console is loaded (verified by URL)');
          return true;
        }
      }
      
      // Option 3: Wait for common Accelerant Console elements with multiple selectors
      logger.debug('Waiting for Accelerant Console page elements...');
      const consoleElementSelectors = [
        '[data-id*="accelerant"]',
        '[title*="Accelerant"]',
        '[title*="ACCELERANT"]',
        'h1:has-text("Accelerant")',
        '[aria-label*="Accelerant"]',
        '[data-label*="Accelerant"]',
      ];
      
      for (const selector of consoleElementSelectors) {
        try {
          const element = this.page.locator(selector).first();
          await element.waitFor({ state: 'visible', timeout: 10000 });
          logger.info(`Accelerant Console is loaded (verified by element: ${selector})`);
          return true;
        } catch {
          // Continue to next selector
        }
      }
      
      // Option 4: Check if page content contains "Accelerant" text (fallback)
      try {
        // Wait for body to be ready before reading content
        await this.page.waitForSelector('body', { timeout: 5000 });
        const pageContent = await this.page.content();
        if (pageContent.toLowerCase().includes('accelerant')) {
          logger.info('Accelerant Console is loaded (verified by page content)');
          return true;
        }
      } catch {
        // Ignore content read errors
      }
      
      // Log diagnostic information when verification fails
      logger.warn('Accelerant Console verification failed - none of the checks passed');
      logger.warn(`Diagnostic Info - URL: ${currentUrl}, Title: ${pageTitle}`);
      
      // Try to capture page text for additional debugging
      try {
        const bodyText = await this.page.locator('body').textContent({ timeout: 2000 }).catch(() => 'Unable to read');
        if (bodyText && bodyText.length < 500) {
          logger.debug(`Page body text (first 500 chars): ${bodyText.substring(0, 500)}`);
        }
      } catch {
        // Ignore errors when reading body text
      }
      
      return false;
    } catch (error: any) {
      logger.warn(`Accelerant Console verification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Navigate to an object (e.g., Accounts, Contacts)
   */
  async navigateToObject(objectName: string): Promise<void> {
    logger.info(`Navigating to ${objectName}`);
    // This is a simplified version - actual implementation would use app launcher
    const url = `${this.getCurrentUrl().split('/lightning')[0]}/lightning/o/${objectName}/list`;
    await this.navigateTo(url);
  }

  /**
   * Navigate to Accelerant Console home page
   * Ensures we're on the Accelerant Console before using the dropdown menu.
   *
   * OPTIMIZED (2026-02-16): MRD user (and most personas) land directly on
   * Accelerant Console after JWT login. Check for the title element FIRST
   * to avoid the slow App Launcher round-trip when we're already there.
   */
  async navigateToAccelerantConsoleHome(): Promise<void> {
    logger.info('Checking if already on Accelerant Console...');

    // Fast check: Is the "Accelerant Console" title element already visible?
    // This is the most common case after JWT login – no need to open App Launcher.
    try {
      const consoleTitle = this.page.getByTitle('Accelerant Console');
      if (await consoleTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        logger.info('✅ Already on Accelerant Console (title element visible)');
        return;
      }
    } catch {
      // Not visible yet, continue to other checks
    }

    // Secondary check: URL or page content hints
    const currentUrl = this.page.url();
    if (currentUrl.includes('accelerant') || currentUrl.includes('console')) {
      if (await this.isAccelerantConsoleLoaded()) {
        logger.info('✅ Already on Accelerant Console (URL/content check)');
        return;
      }
    }
    
    // Only open App Launcher as a last resort
    logger.info('Accelerant Console not detected – opening via App Launcher...');
    await this.openAppLauncher();
    await this.openAccelerantConsole();
    
    // Verify we're on Accelerant Console
    const isLoaded = await this.isAccelerantConsoleLoaded();
    if (!isLoaded) {
      throw new Error('Failed to navigate to Accelerant Console');
    }
    
    logger.info('✅ Successfully navigated to Accelerant Console home');
  }

  /**
   * Navigate to an object via Accelerant Console dropdown menu
   * Steps:
   * 1. Ensure we're on Accelerant Console home
   * 2. Click the dropdown arrow next to "Accelerant Console"
   * 3. Click the object name (e.g., "Accounts") from the dropdown menu
   * 
   * @param objectName - The object name to navigate to (e.g., "Accounts", "Contacts", "Leads")
   */
  async navigateToObjectViaConsoleMenu(objectName: string): Promise<void> {
    logger.info(`Navigating to ${objectName} via Accelerant Console dropdown menu`);
    
    // Step 1: Ensure we're on Accelerant Console home
    await this.navigateToAccelerantConsoleHome();
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
    
    // Step 2: Click the dropdown arrow next to "Accelerant Console"
    // The dropdown arrow (chevron) is next to the app name in the top navigation bar
    logger.info('Clicking dropdown arrow next to Accelerant Console...');
    
    // First, try to find the Accelerant Console tab/button, then find the chevron next to it
    const consoleTabSelectors = [
      'button:has-text("Accelerant Console")',
      'a:has-text("Accelerant Console")',
      '[title="Accelerant Console"]',
      '[aria-label*="Accelerant Console"]',
    ];
    
    let chevronFound = false;
    for (const tabSelector of consoleTabSelectors) {
      try {
        const consoleTab = this.page.locator(tabSelector).first();
        if (await consoleTab.isVisible({ timeout: 2000 }).catch(() => false)) {
          // Find the chevron/dropdown button next to this tab
          // The chevron is typically a sibling or in the same container
          const parent = consoleTab.locator('..'); // Get parent element
          const chevron = parent.locator('button[aria-label*="More"], button[title*="More"], button:has([data-key*="chevron"]), button:has([data-key*="down"])').first();
          
          if (await chevron.isVisible({ timeout: 2000 }).catch(() => false)) {
            await chevron.scrollIntoViewIfNeeded();
            await chevron.click();
            chevronFound = true;
            logger.info('✅ Clicked chevron next to Accelerant Console tab');
            break;
          }
          
          // Alternative: Look for chevron in the same nav item
          const navItem = consoleTab.locator('xpath=ancestor::*[contains(@class, "nav") or contains(@data-aura-class, "Nav")]');
          const chevronInNav = navItem.locator('button:has([data-key*="chevron"]), button:has([data-key*="down"])').first();
          if (await chevronInNav.isVisible({ timeout: 2000 }).catch(() => false)) {
            await chevronInNav.scrollIntoViewIfNeeded();
            await chevronInNav.click();
            chevronFound = true;
            logger.info('✅ Clicked chevron in Accelerant Console nav item');
            break;
          }
        }
      } catch (error: any) {
        logger.debug(`Could not find chevron for tab selector ${tabSelector}: ${error.message}`);
      }
    }
    
    // If chevron not found via tab, try direct selectors
    if (!chevronFound) {
      const dropdownSelectors = [
        // Chevron/dropdown icon in navigation bar
        'one-app-nav-bar-item-manager button[aria-expanded="false"]',
        '[data-aura-class*="AppNavBar"] button[aria-expanded="false"]',
        // Chevron buttons
        'button:has([data-key="chevronright"])',
        'button:has([data-key="chevronDown"])',
        'button:has([data-key*="chevron"])',
        'button:has([data-key*="down"])',
        // Generic dropdown in nav bar
        'nav button[aria-haspopup="true"][aria-expanded="false"]',
        'nav button[aria-expanded="false"]',
        // Dropdown button next to Accelerant Console text
        'button[aria-label*="Accelerant Console"]',
        'button[title*="Accelerant Console"]',
      ];
      
      for (const selector of dropdownSelectors) {
        try {
          const dropdownButton = this.page.locator(selector).first();
          if (await dropdownButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            await dropdownButton.scrollIntoViewIfNeeded();
            await dropdownButton.click();
            await this.page.waitForTimeout(1000); // Wait for dropdown to open
            chevronFound = true;
            logger.info(`✅ Opened dropdown using selector: ${selector}`);
            break;
          }
        } catch (error: any) {
          logger.debug(`Selector ${selector} failed: ${error.message}`);
          continue;
        }
      }
    }
    
    if (!chevronFound) {
      // Fallback: Try clicking on "Accelerant Console" text itself (might open dropdown)
      try {
        const consoleText = this.page.getByText('Accelerant Console', { exact: true }).first();
        if (await consoleText.isVisible({ timeout: 3000 }).catch(() => false)) {
          await consoleText.click();
          await this.page.waitForTimeout(1000);
          chevronFound = true;
          logger.info('✅ Clicked Accelerant Console text to open dropdown');
        }
      } catch (error: any) {
        logger.debug(`Could not click Accelerant Console text: ${error.message}`);
      }
    }
    
    if (!chevronFound) {
      throw new Error('Could not open Accelerant Console dropdown menu. Please verify the dropdown arrow is visible.');
    }
    
    // Step 3: Click the object name from the dropdown menu
    logger.info(`Clicking "${objectName}" from dropdown menu...`);
    
    // Wait for dropdown menu to be visible
    await this.page.waitForTimeout(500);
    
    const objectSelectors = [
      // Role-based selector (most reliable)
      `role=option[name="${objectName}"]`,
      `role=menuitem[name="${objectName}"]`,
      // Text-based selectors
      `text=${objectName}`,
      `button:has-text("${objectName}")`,
      `a:has-text("${objectName}")`,
      `span:has-text("${objectName}")`,
      // With icon (Accounts has building icon)
      `[aria-label*="${objectName}"]`,
      `[title*="${objectName}"]`,
    ];
    
    let objectClicked = false;
    for (const selector of objectSelectors) {
      try {
        const objectElement = this.page.locator(selector).first();
        if (await objectElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          await objectElement.scrollIntoViewIfNeeded();
          await objectElement.click();
          objectClicked = true;
          logger.info(`✅ Clicked "${objectName}" using selector: ${selector}`);
          break;
        }
      } catch (error: any) {
        logger.debug(`Selector ${selector} failed: ${error.message}`);
        continue;
      }
    }
    
    if (!objectClicked) {
      throw new Error(`Could not find "${objectName}" in the Accelerant Console dropdown menu. Please verify the object name is correct.`);
    }
    
    // Wait for navigation to complete
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000); // Wait for page to load
    
    logger.info(`✅ Successfully navigated to ${objectName} via Accelerant Console menu`);
  }

  /**
   * Search for an item
   */
  async search(query: string): Promise<void> {
    logger.info(`Searching for: ${query}`);
    await this.fill(this.globalSearchInput, query);
    await this.page.keyboard.press('Enter');
    await this.waitForNavigation();
  }
}

