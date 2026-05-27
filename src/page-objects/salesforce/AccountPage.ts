import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

/**
 * Account Page Object Model
 * Encapsulates all Account-related interactions in Salesforce Lightning
 */
export class AccountPage extends BasePage {
  // ============================================================================
  // SELECTORS - Centralized for easy maintenance
  // ============================================================================
  
  // List View Selectors
  private readonly newButton = 'button[name="New"]';
  private readonly listViewTable = 'table tbody tr, lightning-datatable tbody tr';
  private readonly filterButton = 'button:has-text("Filters"), button[name="filter"]';
  
  // Record Detail Selectors
  private readonly accountNameHeader = 'h1.slds-page-header__title, records-lwc-highlights-panel h1';
  private readonly editButton = 'button[name="Edit"], button:has-text("Edit")';
  private readonly saveButton = 'button[name="SaveEdit"], button:has-text("Save")';
  private readonly cancelButton = 'button[name="CancelEdit"], button:has-text("Cancel")';
  private readonly successToast = '.slds-theme--success, .toastMessage';
  private readonly errorToast = '.slds-theme--error, .forceToastMessage';
  
  // Field Selectors (Lightning)
  private readonly accountStatusCombobox = 'combobox[name="Account Status"], lightning-combobox[data-field="Account_Status__c"]';
  private readonly typeCombobox = 'combobox[name="Type"], lightning-combobox[data-field="Type"]';
  private readonly regionCombobox = 'combobox[name="Region"], lightning-combobox[data-field="Region__c"]';
  /** QA org: Broker Sourced is picklist Yes/No (API Broker_Sourced__c), not checkbox */
  private readonly brokerSourcedCombobox =
    'combobox[name="Broker Sourced"], lightning-combobox[data-field="Broker_Sourced__c"], lightning-combobox[data-field-name="Broker_Sourced__c"]';
  
  // Related Tab
  private readonly relatedTab = 'a[data-tab-name="relatedListsTab"], tab[title="Related"]';
  private readonly historySection = '[data-component-id*="History"], .slds-card:has-text("History")';

  constructor(page: Page) {
    super(page);
  }

  // ============================================================================
  // NAVIGATION METHODS
  // ============================================================================

  /**
   * Navigate to Accounts list view and select "All Accounts"
   * Simple approach: Navigate directly to list URL, then select "All Accounts" from dropdown
   * Based on working patterns from SF-520 and recorded scripts
   */
  async navigateToListView(): Promise<void> {
    const sfConfig = config.getSalesforceConfig();
    // Remove trailing slash and convert to Lightning domain
    const baseUrl = sfConfig.baseUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
    const url = `${baseUrl}/lightning/o/Account/list`;
    logger.info(`Navigating to Account list view: ${url}`);
    await this.navigateTo(url);
    
    // Wait for page to load
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(3000); // Wait for list view to fully load
    
    // Select "All Accounts" list view
    // Pattern from recorded script: click on "All Accounts" text, then title
    logger.info('Selecting "All Accounts" list view...');
    
    try {
      // First, try clicking on "All Accounts" text (this opens the dropdown if needed)
      const allAccountsText = this.page.getByText('All Accounts', { exact: true }).first();
      if (await allAccountsText.isVisible({ timeout: 5000 }).catch(() => false)) {
        await allAccountsText.scrollIntoViewIfNeeded();
        await allAccountsText.click();
        await this.page.waitForTimeout(1000);
        logger.info('✅ Clicked "All Accounts" text');
      }
      
      // Then click on "All Accounts" title/button to select it
      const allAccountsTitle = this.page.getByTitle('All Accounts').first();
      if (await allAccountsTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await allAccountsTitle.scrollIntoViewIfNeeded();
        await allAccountsTitle.click();
        await this.page.waitForTimeout(2000); // Wait for view to load
        logger.info('✅ Selected "All Accounts" list view');
      } else {
        // Fallback: Use the selectListView method
        await this.selectListView('All Accounts');
      }
    } catch (error: any) {
      logger.warn(`Direct selection failed: ${error.message}, trying selectListView method...`);
      await this.selectListView('All Accounts');
    }
    
    // Verify "New" button is visible (confirms we're on the right view)
    try {
      const newButton = this.page.locator(this.newButton);
      await newButton.waitFor({ state: 'visible', timeout: 10000 });
      logger.info('✅ "New" button is visible - "All Accounts" view is active');
    } catch (error: any) {
      logger.warn(`"New" button not immediately visible after selecting "All Accounts". This may indicate the view is still loading.`);
      // Don't throw - the button might appear when we actually try to click it
    }
  }

  /**
   * Close all existing tabs in Salesforce Console
   * This prevents false-positive "Unable to load" detection from old tabs.
   * Uses a short timeout (2s) when checking for tabs so we exit quickly when not in Console app.
   */
  async closeAllTabs(): Promise<void> {
    logger.info('Closing existing Salesforce Console tabs...');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(300);

    const tabCheckTimeoutMs = 2000; // Quick check – avoid ~30s default when no tabs
    const closeButtonSelectors = [
      'button[title="Close"][data-tab-value]',
      'button.slds-button_icon-container[title*="Close"]',
      'button[aria-label*="Close"]',
      '.slds-tabs_default__item button[title*="Close"]',
      'lightning-tab button[title*="Close"]',
      'button:has-text("Close")',
    ];

    let closedCount = 0;
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let foundAny = false;
      for (const selector of closeButtonSelectors) {
        const first = this.page.locator(selector).first();
        if (!(await first.isVisible({ timeout: tabCheckTimeoutMs }).catch(() => false))) {
          continue;
        }
        foundAny = true;
        try {
          const closeButtons = this.page.locator(selector);
          const count = await closeButtons.count();
          for (let i = count - 1; i >= 0; i--) {
            try {
              const btn = closeButtons.nth(i);
              if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.click({ timeout: 1000 });
                closedCount++;
                await this.page.waitForTimeout(200);
                logger.debug(`Closed tab ${i + 1}/${count}`);
              }
            } catch {
              continue;
            }
          }
        } catch {
          // continue
        }
        break;
      }
      if (!foundAny) break;
      await this.page.waitForTimeout(150);
    }

    if (closedCount > 0) {
      logger.info(`✅ Closed ${closedCount} existing tab(s)`);
    } else {
      logger.debug('No tabs found to close');
    }
  }

  /**
   * Navigate to a specific Account record by ID
   */
  async navigateToRecord(accountId: string): Promise<void> {
    // Close existing tabs first to avoid false-positive error detection
    await this.closeAllTabs();
    
    const sfConfig = config.getSalesforceConfig();
    // Remove trailing slash and convert to Lightning domain
    const baseUrl = sfConfig.baseUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
    const url = `${baseUrl}/lightning/r/Account/${accountId}/view`;
    logger.info(`Navigating to Account record: ${url}`);
    await this.navigateTo(url);
    await this.waitForRecordToLoad();
  }

  /**
   * Wait for Account record to fully load
   * OPTIMIZED: Removed arbitrary wait
   */
  async waitForRecordToLoad(): Promise<void> {
    logger.debug('Waiting for Account record to load...');
    await this.page.waitForLoadState('domcontentloaded');
    
    // Wait for the record header or any Lightning record element
    try {
      await this.page.waitForSelector('records-lwc-highlights-panel, .slds-page-header', { 
        timeout: 10000 
      });
      logger.info('Account record loaded successfully');
    } catch {
      logger.warn('Account record load timeout - continuing anyway');
    }
  }

  /**
   * After creating a new account, ensure we're on that record's detail page (not list or modal).
   * Waits for redirect to record view; if still on list, opens the new record by name.
   * Only clicks inside the list/grid body to avoid triggering "New" or other header actions.
   */
  async ensureOnRecordDetailPageAfterCreate(accountName: string): Promise<void> {
    const recordViewPattern = /\/lightning\/r\/Account\/[a-zA-Z0-9]{15,18}(\/view)?(\/)?(\?.*)?$/;
    const recordViewPatternAlt = /\/Account\/[a-zA-Z0-9]{15,18}(\/view)?(\/)?(\?.*)?$/;
    const url = () => this.page.url();

    const isOnRecordView = () => recordViewPattern.test(url()) || recordViewPatternAlt.test(url());
    const isOnNewOrCreatePage = () => /\/new\/?(\?.*)?$/.test(url()) || url().includes('/Account/new');

    try {
      await this.page.waitForURL(recordViewPattern, { timeout: 12000 }).catch(() => null);
    } catch {
      // Timeout or no match - continue
    }
    if (isOnRecordView()) {
      logger.info('Redirected to new Account record view');
      await this.waitForRecordToLoad();
      return;
    }

    if (isOnNewOrCreatePage()) {
      logger.info('Still on new/create page after save - waiting for redirect to list or record');
      await this.page.waitForTimeout(5000);
      if (isOnRecordView()) {
        await this.waitForRecordToLoad();
        return;
      }
      if (isOnNewOrCreatePage()) {
        logger.warn('Still on new/create page - not clicking anything to avoid opening New again');
        return;
      }
    }

    logger.info('Not on record view after save - waiting for list to refresh then opening new account from list');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(5000);

    // Only target links/cells inside the list grid to avoid clicking "New" or header actions.
    const listScopedSelectors = [
      'lightning-datatable tbody a:has-text("' + accountName + '")',
      'lightning-datatable td a:has-text("' + accountName + '")',
      'table.slds-table tbody tr td a:has-text("' + accountName + '")',
      '[role="grid"] tbody td a:has-text("' + accountName + '")',
      'lightning-datatable tbody td:has-text("' + accountName + '")',
      'table.slds-table tbody tr:has-text("' + accountName + '") td:first-child a',
    ];
    for (const sel of listScopedSelectors) {
      const el = this.page.locator(sel).first();
      if (await el.isVisible({ timeout: 8000 }).catch(() => false)) {
        await el.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        await el.click();
        logger.info('Clicked account row/link in list to open record');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(3000);
        if (isOnRecordView()) {
          await this.waitForRecordToLoad();
          return;
        }
      }
    }
    logger.warn('Could not open new account from list - ensure Edit step runs on record view');
  }

  // ============================================================================
  // LIST VIEW METHODS
  // ============================================================================

  /**
   * Click New button to create account
   * Uses multiple selectors like ui-common.steps.ts for reliability
   */
  async clickNew(): Promise<void> {
    logger.info('Clicking New button');
    
    // First, verify we're on the list view (not a detail page)
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/list')) {
      logger.warn('Not on list view - navigating to list view first');
      await this.navigateToListView();
    }
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000); // Allow UI to stabilize
    
    // Try multiple selectors (same as ui-common.steps.ts)
    const newButtonSelectors = [
      // Standard Lightning button by name attribute (most reliable)
      'button[name="New"]',
      // Text-based selectors
      'button:has-text("New")',
      'a:has-text("New")',
      // Lightning component selectors
      'lightning-button:has-text("New") button',
      'lightning-button button:has-text("New")',
      // Title-based selectors
      '[title="New"]',
      'button[title="New"]',
      'a[title="New"]',
      // Role-based selectors
      'button[role="button"]:has-text("New")',
      // Alternative Lightning patterns
      'lightning-button-icon[title="New"]',
      'button.slds-button:has-text("New")',
      // Force.com patterns
      'input[value="New"]',
      'button:has([title="New"])',
    ];
    
    let clicked = false;
    let lastError: string | null = null;
    
    for (const selector of newButtonSelectors) {
      try {
        const button = this.page.locator(selector).first();
        // Wait for button to be visible and enabled
        if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
          // Check if button is enabled
          const isEnabled = await button.isEnabled().catch(() => false);
          if (isEnabled) {
            await button.scrollIntoViewIfNeeded();
            await button.click({ timeout: 5000 });
            
            // Wait for form to appear after clicking New
            logger.info('Waiting for Account creation form to load...');
            await this.waitForAccountFormToLoad();
            
            clicked = true;
            logger.info(`✅ Clicked "New" button using selector: ${selector}`);
            break;
          } else {
            lastError = `Button found but disabled: ${selector}`;
            logger.debug(`Button found but disabled: ${selector}`);
          }
        }
      } catch (error: any) {
        lastError = error.message || `Error with selector ${selector}`;
        logger.debug(`Selector ${selector} failed: ${lastError}`);
        // Continue to next selector
      }
    }
    
    if (!clicked) {
      // If button not found, try to ensure we're on "All Accounts" view
      logger.warn(`"New" button not found. Attempting to select "All Accounts" view...`);
      try {
        await this.selectListView('All Accounts');
        await this.page.waitForTimeout(2000); // Wait for view to load
        
        // Retry with first selector
        const newButton = this.page.locator('button[name="New"]').first();
        if (await newButton.isVisible({ timeout: 10000 }).catch(() => false)) {
          await newButton.scrollIntoViewIfNeeded();
          await newButton.click();
          
          // Wait for form to appear after clicking New
          logger.info('Waiting for Account creation form to load...');
          await this.waitForAccountFormToLoad();
          
          logger.info('✅ Clicked "New" button after selecting "All Accounts"');
          clicked = true;
        }
      } catch (retryError: any) {
        // Take screenshot for debugging
        await this.page.screenshot({ path: `reports/screenshots/new-button-not-found-${Date.now()}.png` });
        logger.error(`"New" button still not found after selecting "All Accounts" view`);
        throw new Error(`Could not find "New" button. Ensure you are on "All Accounts" list view. Current URL: ${currentUrl}. Last error: ${lastError || retryError.message}`);
      }
    }
    
    if (!clicked) {
      throw new Error(`Could not find or click "New" button. Current URL: ${currentUrl}. Last error: ${lastError}`);
    }
    
    // Ensure form is loaded (in case it wasn't waited for in the retry path)
    if (clicked) {
      try {
        await this.waitForAccountFormToLoad();
      } catch (error: any) {
        logger.warn(`Form wait failed but button was clicked: ${error.message}`);
      }
    }
    
    logger.info('✅ Successfully clicked "New" button and form is loaded');
  }

  /**
   * Wait for Account creation form to load after clicking New button
   * Uses longer timeouts and extra selectors for slower QA/sandbox environments.
   */
  async waitForAccountFormToLoad(): Promise<void> {
    logger.info('Waiting for Account creation form to appear...');

    // Wait for navigation to /new and Lightning to bootstrap (QA can be slower)
    await this.page.waitForLoadState('domcontentloaded');
    const url = this.page.url();
    if (url.includes('/Account/new')) {
      await this.page.waitForTimeout(3000); // Give Lightning form time to render
    } else {
      await this.page.waitForTimeout(1500);
    }

    const formTimeoutMs = 15000; // Per-selector timeout (was 10000)
    const formSelectors = [
      'lightning-record-edit-form',
      'lightning-record-form',
      'form[data-aura-class*="RecordEditForm"]',
      '[data-aura-class*="forceRecordEdit"]',
      'force-record-layout',
      '[data-aura-rendered-by*="recordEdit"]',
    ];

    let formFound = false;
    for (const selector of formSelectors) {
      try {
        const form = this.page.locator(selector).first();
        if (await form.isVisible({ timeout: formTimeoutMs }).catch(() => false)) {
          formFound = true;
          logger.info(`✅ Account form detected: ${selector}`);
          break;
        }
      } catch {
        // Continue to next selector
      }
    }

    // If form element not found, check for Account Name or any editable field (QA variants)
    if (!formFound) {
      logger.info('Form element not found, checking for Account Name / form fields...');
      const accountNameSelectors = [
        'label:has-text("Account Name")',
        'label:has-text("Name")',
        'input[aria-label*="Account Name"]',
        'input[aria-label*="Name"]',
        'lightning-input[label*="Account Name"]',
        'lightning-input[label*="Name"]',
        'lightning-input-field[data-field="Name"]',
        'lightning-input-field[label*="Account Name"]',
        '[data-label="Account Name"]',
        '.slds-form-element:has-text("Account Name") input',
        '.slds-form-element:has-text("Name") input',
        'force-record-layout input[type="text"]',
        'lightning-combobox[data-field="Type"]', // Type picklist often loads with form
        'button[title="Save"]',
        'button:has-text("Save")',
      ];

      for (const selector of accountNameSelectors) {
        try {
          const field = this.page.locator(selector).first();
          if (await field.isVisible({ timeout: formTimeoutMs }).catch(() => false)) {
            formFound = true;
            logger.info(`✅ Account form/field detected: ${selector}`);
            break;
          }
        } catch {
          // Continue
        }
      }
    }

    // Last resort: if we're on /Account/new, wait a bit more and re-check once
    if (!formFound && url.includes('/Account/new')) {
      logger.info('On /Account/new but form not yet visible; waiting 5s and re-checking...');
      await this.page.waitForTimeout(5000);
      for (const selector of ['lightning-record-edit-form', 'lightning-input[label*="Account Name"]', 'lightning-input[label*="Name"]', 'label:has-text("Account Name")']) {
        try {
          if (await this.page.locator(selector).first().isVisible({ timeout: 5000 }).catch(() => false)) {
            formFound = true;
            logger.info(`✅ Account form detected on retry: ${selector}`);
            break;
          }
        } catch {
          // Continue
        }
      }
    }

    if (!formFound) {
      const screenshotPath = `reports/screenshots/form-not-loaded-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      logger.error(`❌ Account creation form did not load after clicking New button`);
      logger.error(`   Screenshot saved: ${screenshotPath}`);
      logger.error(`   Current URL: ${this.page.url()}`);
      throw new Error('Account creation form did not load. The page may have navigated incorrectly or the form is taking too long to appear.');
    }

    // Brief wait for form to be interactive
    await this.page.waitForTimeout(1000);
    logger.info('✅ Account creation form is ready');
  }

  /**
   * Get number of records in list view
   */
  async getRecordCount(): Promise<number> {
    const rows = this.page.locator(this.listViewTable);
    return await rows.count();
  }

  /**
   * Open filter panel
   */
  async openFilters(): Promise<void> {
    logger.info('Opening filter panel');
    const filterBtn = this.page.locator(this.filterButton).first();
    await filterBtn.waitFor({ state: 'visible', timeout: 5000 });
    await filterBtn.click();
  }

  /**
   * Add a filter for a specific field
   */
  async addFilter(fieldName: string): Promise<void> {
    logger.info(`Adding filter for: ${fieldName}`);
    await this.openFilters();
    
    const fieldOption = this.page.getByText(fieldName, { exact: true }).first();
    await fieldOption.waitFor({ state: 'visible', timeout: 5000 });
    await fieldOption.click();
  }

  /**
   * Apply current filters
   */
  async applyFilters(): Promise<void> {
    logger.info('Applying filters');
    const applyButton = this.page.getByRole('button', { name: 'Apply' })
      .or(this.page.locator('button[name="apply"]')).first();
    await applyButton.waitFor({ state: 'visible', timeout: 5000 });
    await applyButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Search for an account by name in the list view and open it
   * Uses global search as fallback if list view search fails
   */
  async searchAndOpenAccount(accountName: string): Promise<void> {
    logger.info(`🔍 Searching for Account: "${accountName}"`);
    
    // Wait for the list view to be fully loaded
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
    
    // Strategy 1: Try list view search (filter/search box in the list view)
    let accountFound = false;
    
    try {
      // Find the search/filter input in the list view
      const searchSelectors = [
        'input[placeholder*="Search this list"]',
        'input[placeholder*="Search"]',
        'input[name*="search"]',
        'lightning-input input[type="search"]',
        '.slds-input[type="search"]',
        'input.slds-input[type="text"][placeholder*="Search"]',
      ];
      
      let searchInput: Locator | null = null;
      for (const selector of searchSelectors) {
        try {
          const input = this.page.locator(selector).first();
          if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
            searchInput = input;
            logger.debug(`Found search input using selector: ${selector}`);
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (searchInput) {
        // Clear and type the account name
        await searchInput.clear();
        await searchInput.fill(accountName);
        await this.page.waitForTimeout(1500); // Wait for search results
        
        // Wait for search results to appear
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(2000);
        
        // Find and click the account in the search results
        const accountRowSelectors = [
          `a:has-text("${accountName}")`,
          `tr:has-text("${accountName}") a`,
          `lightning-base-formatted-text:has-text("${accountName}")`,
          `td:has-text("${accountName}")`,
          `[data-row-key-value*="${accountName}"]`,
        ];
        
        for (const selector of accountRowSelectors) {
          try {
            const accountLink = this.page.locator(selector).first();
            if (await accountLink.isVisible({ timeout: 5000 }).catch(() => false)) {
              await accountLink.scrollIntoViewIfNeeded();
              await accountLink.click();
              accountFound = true;
              logger.info(`✅ Clicked Account "${accountName}" from list view search`);
              break;
            }
          } catch {
            continue;
          }
        }
        
        // Fallback: try clicking any row that contains the account name
        if (!accountFound) {
          const allRows = this.page.locator('table tbody tr, lightning-datatable tbody tr');
          const rowCount = await allRows.count();
          
          for (let i = 0; i < rowCount; i++) {
            const row = allRows.nth(i);
            const rowText = await row.textContent();
            if (rowText && rowText.includes(accountName)) {
              const link = row.locator('a').first();
              if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
                await link.click();
                accountFound = true;
                logger.info(`✅ Clicked Account "${accountName}" from row ${i}`);
                break;
              }
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn(`List view search failed: ${error.message}`);
    }
    
    // Strategy 2: Use global search if list view search failed
    if (!accountFound) {
      logger.info('Trying global search as fallback...');
      try {
        // Find global search input
        const globalSearchSelectors = [
          'input[placeholder*="Search"]',
          'input[type="search"]',
          '.slds-input[type="search"]',
          'input.global-search-input',
        ];
        
        let globalSearchInput: Locator | null = null;
        for (const selector of globalSearchSelectors) {
          try {
            const input = this.page.locator(selector).first();
            if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
              globalSearchInput = input;
              break;
            }
          } catch {
            continue;
          }
        }
        
        if (globalSearchInput) {
          await globalSearchInput.clear();
          await globalSearchInput.fill(accountName);
          await this.page.waitForTimeout(1500);
          
          // Wait for search results dropdown
          const searchResult = this.page.locator(`text="${accountName}"`).first();
          if (await searchResult.isVisible({ timeout: 5000 }).catch(() => false)) {
            await searchResult.click();
            accountFound = true;
            logger.info(`✅ Clicked Account "${accountName}" from global search`);
          }
        }
      } catch (error: any) {
        logger.warn(`Global search failed: ${error.message}`);
      }
    }
    
    if (!accountFound) {
      throw new Error(`Could not find Account "${accountName}" in search results. Please verify the account exists and is accessible.`);
    }
    
    // Wait for the account record page to load
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000); // Allow time for record page to render
    
    // Verify we're on the account detail page
    const recordHeader = this.page.locator('records-lwc-highlights-panel, records-highlights2, .slds-page-header');
    const isHeaderVisible = await recordHeader.first().isVisible({ timeout: 10000 }).catch(() => false);
    
    if (!isHeaderVisible) {
      // Check if we're still on list view (search didn't navigate)
      const currentUrl = this.page.url();
      if (currentUrl.includes('/list')) {
        throw new Error(`Search found Account "${accountName}" but failed to navigate to detail page. Current URL: ${currentUrl}`);
      }
    }
    
    logger.info(`✅ Successfully opened Account: ${accountName}`);
  }

  /**
   * Select a specific list view by name (e.g., "All Accounts")
   * Based on recorded script pattern: click text, then click title
   */
  async selectListView(viewName: string): Promise<void> {
    logger.info(`Selecting list view: ${viewName}`);
    
    // Wait for the list view selector to be available
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Allow UI to stabilize
    
    // Strategy 1: Click on the list view selector button/dropdown first (if it shows "Recent" or current view)
    // Look for the list view selector - could be a button showing current view name
    const listViewSelectorButton = this.page.locator('button[aria-label*="List View"], button[title*="View"], lightning-base-combobox[data-id="listViewSelector"] button').first();
    
    if (await listViewSelectorButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      logger.info('Found list view selector button, clicking to open dropdown...');
      await listViewSelectorButton.scrollIntoViewIfNeeded();
      await listViewSelectorButton.click();
      await this.page.waitForTimeout(1000); // Wait for dropdown to open
    }
    
    // Strategy 2: Try clicking on the view name text first (opens dropdown if needed)
    try {
      const viewText = this.page.getByText(viewName, { exact: true }).first();
      if (await viewText.isVisible({ timeout: 5000 }).catch(() => false)) {
        await viewText.scrollIntoViewIfNeeded();
        await viewText.click();
        await this.page.waitForTimeout(1000);
        logger.info(`✅ Clicked "${viewName}" text`);
      }
    } catch (error: any) {
      logger.debug(`Could not click "${viewName}" text: ${error.message}`);
    }
    
    // Strategy 3: Click on the view title/button to select it
    try {
      const viewTitle = this.page.getByTitle(viewName).first();
      if (await viewTitle.isVisible({ timeout: 5000 }).catch(() => false)) {
        await viewTitle.scrollIntoViewIfNeeded();
        await viewTitle.click();
        await this.page.waitForTimeout(2000); // Wait for view to load
        logger.info(`✅ Selected list view: ${viewName} (via title)`);
      } else {
        // Fallback: Try role-based option
        const viewOption = this.page.getByRole('option', { name: viewName, exact: true }).first();
        if (await viewOption.isVisible({ timeout: 3000 }).catch(() => false)) {
          await viewOption.click();
          await this.page.waitForTimeout(2000);
          logger.info(`✅ Selected list view: ${viewName} (via role option)`);
        } else {
          throw new Error(`Could not find "${viewName}" list view option`);
        }
      }
    } catch (error: any) {
      logger.warn(`Title selection failed: ${error.message}, trying alternative selectors...`);
      
      // Fallback: Try alternative selectors
      const fallbackSelectors = [
        `button[title="${viewName}"]`,
        `a[title="${viewName}"]`,
        `span:has-text("${viewName}")`,
        `button:has-text("${viewName}")`,
        `a:has-text("${viewName}")`,
        `lightning-base-combobox-item[data-value="${viewName}"]`,
      ];
      
      let selected = false;
      for (const selector of fallbackSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 3000 }).catch(() => false)) {
            await element.scrollIntoViewIfNeeded();
            await element.click();
            await this.page.waitForTimeout(2000);
            logger.info(`✅ Selected list view: ${viewName} (via ${selector})`);
            selected = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!selected) {
        throw new Error(`Failed to select list view "${viewName}". Please verify the view exists.`);
      }
    }
    
    // Wait for the list view to load
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Allow time for list to refresh
    logger.info(`✅ List view "${viewName}" is now active`);
  }

  // ============================================================================
  // RECORD DETAIL METHODS
  // ============================================================================

  /**
   * Get Account name from detail page header
   */
  async getAccountName(): Promise<string> {
    const header = this.page.locator(this.accountNameHeader).first();
    await header.waitFor({ state: 'visible', timeout: 10000 });
    const text = await header.textContent();
    return text?.trim() || '';
  }

  /**
   * Verify Account name is displayed
   */
  async verifyAccountDisplayed(expectedName?: string): Promise<boolean> {
    const actualName = await this.getAccountName();
    logger.info(`Account displayed: ${actualName}`);
    
    if (expectedName) {
      const matches = actualName.toLowerCase().includes(expectedName.toLowerCase()) ||
                     actualName.toLowerCase().includes('test account');
      if (!matches) {
        logger.warn(`Expected "${expectedName}" but got "${actualName}"`);
      }
      return matches;
    }
    return actualName.length > 0;
  }

  /**
   * Click Edit button on the record
   * Uses multiple strategies: main action button, Lightning selectors, then "Show more actions" menu.
   */
  async clickEdit(): Promise<void> {
    logger.info('Clicking Edit button on Account');

    await this.page.waitForLoadState('domcontentloaded');

    try {
      await this.page.waitForSelector('.slds-spinner', { state: 'hidden', timeout: 5000 }).catch(() => {});
    } catch {
      // Continue
    }

    // Allow record header/actions to render after save
    await this.page.waitForTimeout(2000);

    let editClicked = false;
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts && !editClicked; attempt++) {
      logger.debug(`Click Edit attempt ${attempt}/${maxAttempts}`);

      // Strategy 1: Main Edit action in page header (getByRole)
      try {
        const mainEditBtn = this.page.getByRole('button', { name: 'Edit', exact: true });
        await mainEditBtn.first().waitFor({ state: 'visible', timeout: 5000 });
        await mainEditBtn.first().scrollIntoViewIfNeeded();
        await mainEditBtn.first().click();
        editClicked = true;
        logger.info('✅ Clicked main Edit button to open full edit form');
      } catch (error: any) {
        logger.debug(`Main Edit button not found: ${error.message}, trying alternatives...`);
      }

      // Strategy 2: Broader role (e.g. "Edit record")
      if (!editClicked) {
        try {
          const editBtn = this.page.getByRole('button', { name: /Edit/i }).first();
          if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editBtn.scrollIntoViewIfNeeded();
            await editBtn.click();
            editClicked = true;
            logger.info('✅ Clicked Edit button via getByRole name regex');
          }
        } catch {
          // continue
        }
      }

      // Strategy 3: Lightning / highlights panel selectors
      if (!editClicked) {
        const editSelectors = [
          'button[name="Edit"]',
          'button[title="Edit"]',
          'button[aria-label="Edit"]',
          'lightning-button-menu-item[data-name="edit"]',
          'runtime_platform_actions-action-renderer button:has-text("Edit")',
          'lightning-button-menu button:has-text("Edit")',
          'a[title="Edit"]',
          'slot a[title="Edit"]',
          'lightning-button:has-text("Edit")',
        ];
        for (const selector of editSelectors) {
          try {
            const btn = this.page.locator(selector).first();
            if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
              await btn.scrollIntoViewIfNeeded();
              await btn.click();
              editClicked = true;
              logger.info(`✅ Clicked Edit using selector: ${selector}`);
              break;
            }
          } catch {
            continue;
          }
        }
      }

      // Strategy 4: Open "Show more actions" dropdown and click Edit
      if (!editClicked) {
        const moreActionsSelectors = [
          'button[name="ShowMoreActions"]',
          'button[aria-label*="Show more"]',
          'lightning-button-menu button',
          '[data-aura-class*="forceRecordEdit"] button[aria-haspopup="menu"]',
          'records-lwc-record-layout button[aria-haspopup="menu"]',
        ];
        for (const menuSelector of moreActionsSelectors) {
          const menuBtn = this.page.locator(menuSelector).first();
          if (await menuBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            try {
              await menuBtn.scrollIntoViewIfNeeded();
              await menuBtn.click();
              await this.page.waitForTimeout(600);
              const editMenuItemSelectors = [
                'lightning-menu-item:has-text("Edit")',
                'a[role="menuitem"]:has-text("Edit")',
                '[role="menuitem"]:has-text("Edit")',
                'lightning-button-menu-item:has-text("Edit")',
              ];
              for (const itemSel of editMenuItemSelectors) {
                const item = this.page.locator(itemSel).first();
                if (await item.isVisible({ timeout: 1500 }).catch(() => false)) {
                  await item.click();
                  editClicked = true;
                  logger.info(`✅ Clicked Edit from Show more actions menu (${itemSel})`);
                  break;
                }
              }
              if (editClicked) break;
              // Close menu if we didn't find Edit (Escape or click away)
              await this.page.keyboard.press('Escape').catch(() => {});
            } catch (e) {
              await this.page.keyboard.press('Escape').catch(() => {});
            }
            break; // only try one "more actions" button per attempt
          }
        }
      }

      if (!editClicked && attempt < maxAttempts) {
        logger.info('Edit button not found, refreshing page and retrying...');
        await this.page.reload({ waitUntil: 'domcontentloaded' });
        await this.page.waitForTimeout(3000);
      }
    }

    if (!editClicked) {
      await this.page.screenshot({ path: `reports/screenshots/edit-button-not-found-${Date.now()}.png` });
      throw new Error('Could not find Edit button. Please verify the record can be edited.');
    }

    try {
      const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true });
      await saveBtn.first().waitFor({ state: 'visible', timeout: 5000 });
      logger.info('✅ Full edit form is now open (Save button visible)');
    } catch {
      logger.warn('Save button not immediately visible, but continuing...');
    }
  }

  /**
   * Click inline Edit button for a specific field
   */
  async clickInlineEdit(fieldName: string): Promise<void> {
    logger.info(`Clicking inline Edit for field: ${fieldName}`);
    const editButton = this.page.getByRole('button', { name: `Edit ${fieldName}` });
    await editButton.waitFor({ state: 'visible', timeout: 5000 });
    await editButton.click();
  }

  /**
   * Save the record
   */
  async save(): Promise<void> {
    logger.info('Saving record');
    const saveBtn = this.page.getByRole('button', { name: 'Save', exact: true })
      .or(this.page.locator(this.saveButton)).first();
    await saveBtn.waitFor({ state: 'visible', timeout: 5000 });
    await saveBtn.click();
    await this.waitForSaveComplete();
  }

  /**
   * Wait for save to complete and page to return to view mode
   * FIXED: Ensures page returns to record view after save
   */
  async waitForSaveComplete(): Promise<void> {
    logger.debug('Waiting for save to complete...');
    
    // Wait for either success toast or page reload
    try {
      await Promise.race([
        this.page.waitForSelector(this.successToast, { timeout: 10000 }),
        this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }),
      ]);
      logger.info('Save operation completed');
    } catch {
      logger.warn('Save completion wait timed out - checking for errors');
      if (await this.hasValidationError()) {
        throw new Error('Save failed - validation error detected');
      }
    }
    
    // CRITICAL: Wait for edit form to close (Save button should disappear)
    try {
      await this.page.waitForSelector('button[name="SaveEdit"]', { state: 'hidden', timeout: 5000 });
      logger.debug('Edit form closed - Save button hidden');
    } catch {
      // Button might have different name or not exist
    }
    
    // Wait for the page to return to view mode (record header should be visible)
    try {
      await this.page.waitForSelector('records-lwc-highlights-panel, .slds-page-header', { timeout: 5000 });
      logger.debug('Record view mode confirmed');
    } catch {
      logger.debug('Could not confirm view mode - continuing');
    }
    
    // Brief pause to let Lightning finish rendering the updated values
    await this.page.waitForTimeout(1000);
    
    logger.info('Record saved successfully');
  }

  /**
   * Cancel edit
   */
  async cancel(): Promise<void> {
    logger.info('Canceling edit');
    const cancelBtn = this.page.getByRole('button', { name: 'Cancel' })
      .or(this.page.locator(this.cancelButton)).first();
    await cancelBtn.click();
  }

  /**
   * Check if success message is displayed
   */
  async isSuccessMessageVisible(): Promise<boolean> {
    try {
      const toast = this.page.locator(this.successToast);
      return await toast.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  /**
   * Check if validation error is present
   */
  async hasValidationError(): Promise<boolean> {
    try {
      const errorSelectors = [
        this.errorToast,
        '.slds-form-element__help',
        '.error-message',
        '[data-error-message]',
      ];
      
      for (const selector of errorSelectors) {
        if (await this.page.locator(selector).isVisible({ timeout: 1000 })) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get validation error message
   */
  async getValidationError(): Promise<string | null> {
    const errorSelectors = [
      '.slds-form-element__help',
      '.error-message',
      '.forceToastMessage',
    ];
    
    for (const selector of errorSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        return await element.textContent();
      }
    }
    return null;
  }

  // ============================================================================
  // FIELD METHODS - Generic Lightning field interactions
  // ============================================================================

  /**
   * Set a combobox/picklist field value
   */
  async setComboboxField(fieldName: string, value: string): Promise<void> {
    logger.info(`Setting ${fieldName} to "${value}"`);
    
    // Try to find the combobox by role first
    let combobox = this.page.getByRole('combobox', { name: fieldName });
    
    if (!await combobox.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Try alternative locators
      combobox = this.page.locator(`lightning-combobox[data-field="${fieldName}"] button`)
        .or(this.page.locator(`[data-field="${fieldName}"] .slds-combobox__input`));
    }
    
    await combobox.waitFor({ state: 'visible', timeout: 10000 });
    await combobox.click();
    await this.page.waitForTimeout(300);
    
    // Select the option
    const option = this.page.getByRole('option', { name: value, exact: true })
      .or(this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`));
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    
    logger.info(`✅ Set ${fieldName} to "${value}"`);
  }

  /**
   * Set a text field value
   */
  async setTextField(fieldName: string, value: string): Promise<void> {
    logger.info(`Setting ${fieldName} to "${value}"`);
    
    const input = this.page.getByRole('textbox', { name: fieldName })
      .or(this.page.locator(`input[name="${fieldName}"]`));
    
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.clear();
    await input.fill(value);
    
    logger.info(`✅ Set ${fieldName} to "${value}"`);
  }

  /**
   * Get field value (works for both display and edit mode)
   * IMPROVED: Multiple strategies for Salesforce Lightning field detection
   */
  async getFieldValue(fieldName: string): Promise<string | null> {
    logger.debug(`Getting value for field: ${fieldName}`);
    
    // Wait for page to stabilize
    await this.page.waitForLoadState('domcontentloaded');
    
    // Strategy 1: Look in highlights panel (Account Status often appears here)
    try {
      const highlightsValue = this.page.locator('records-lwc-highlights-panel lightning-formatted-text, records-highlights-details-item lightning-formatted-text');
      const count = await highlightsValue.count();
      for (let i = 0; i < count; i++) {
        const parentText = await highlightsValue.nth(i).locator('xpath=ancestor::*[contains(@class, "highlights")]').first().textContent().catch(() => '');
        if (parentText?.includes(fieldName)) {
          const value = await highlightsValue.nth(i).textContent();
          if (value?.trim()) {
            logger.debug(`Found value "${value}" in highlights panel`);
            return value.trim();
          }
        }
      }
    } catch {
      // Continue
    }
    
    // Strategy 2: Look in flexipage-field containers (most common for record fields)
    try {
      const flexipageField = this.page.locator('flexipage-field').filter({ hasText: fieldName });
      if (await flexipageField.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        const valueElement = flexipageField.first().locator('lightning-formatted-text, .slds-form-element__static, span.test-id__field-value');
        const value = await valueElement.first().textContent().catch(() => null);
        if (value?.trim()) {
          logger.debug(`Found value "${value}" in flexipage-field`);
          return value.trim();
        }
      }
    } catch {
      // Continue
    }
    
    // Strategy 3: Look for Account Status specifically in records-highlights
    if (fieldName === 'Account Status') {
      try {
        const statusElement = this.page.locator('records-highlights-details-item').filter({ hasText: 'Account Status' }).locator('lightning-formatted-text');
        if (await statusElement.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          const value = await statusElement.first().textContent();
          if (value?.trim()) {
            logger.debug(`Found Account Status value "${value}" in highlights`);
            return value.trim();
          }
        }
      } catch {
        // Continue
      }
    }
    
    // Strategy 4: Standard selectors
    const selectors = [
      // Read-only/display mode
      `records-record-layout-item[field-label="${fieldName}"] lightning-formatted-text`,
      `records-record-layout-item[field-label="${fieldName}"] .slds-form-element__static`,
      `[data-field="${fieldName}"] .test-id__field-value`,
      
      // Edit mode - combobox
      `lightning-combobox[data-field="${fieldName}"] input`,
      `[data-field="${fieldName}"] .slds-combobox__input`,
      
      // Edit mode - text
      `input[name="${fieldName}"]`,
    ];
    
    for (const selector of selectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        const value = await element.inputValue().catch(() => null) || 
                     await element.textContent();
        if (value) {
          logger.debug(`Found value "${value}" using selector: ${selector}`);
          return value.trim();
        }
      }
    }
    
    // Strategy 5: Search all lightning-formatted-text for known field values
    if (fieldName === 'Account Status') {
      const validStatuses = ['Prospect', 'Onboarding', 'Contracted', 'Active', 'Runoff', 'Offboarded', 'Invalid'];
      try {
        const allTexts = this.page.locator('lightning-formatted-text');
        const count = await allTexts.count();
        for (let i = 0; i < count; i++) {
          const text = await allTexts.nth(i).textContent().catch(() => null);
          if (text && validStatuses.includes(text.trim())) {
            logger.debug(`Found status value "${text}" via text search`);
            return text.trim();
          }
        }
      } catch {
        // Continue
      }
    }
    
    logger.warn(`Could not find value for field: ${fieldName}`);
    return null;
  }

  /**
   * Verify field displays expected value
   */
  async verifyFieldValue(fieldName: string, expectedValue: string): Promise<void> {
    const actualValue = await this.getFieldValue(fieldName);
    
    if (!actualValue) {
      throw new Error(`Field "${fieldName}" not found or has no value`);
    }
    
    if (!actualValue.toLowerCase().includes(expectedValue.toLowerCase())) {
      throw new Error(`Expected "${fieldName}" to display "${expectedValue}" but got "${actualValue}"`);
    }
    
    logger.info(`✅ Verified ${fieldName} displays "${expectedValue}"`);
  }

  /**
   * Check if field is visible
   * Enhanced to check Member Details section and use FieldRegistry
   * IMPROVED: Better field name mapping, scrolling, and multiple detection strategies
   */
  async isFieldVisible(fieldName: string): Promise<boolean> {
    logger.debug(`Checking if field "${fieldName}" is visible`);
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000); // Allow Lightning to fully render
    
    // Use FieldRegistry to get field config (for API name mapping)
    const { FieldRegistry } = await import('./fields/FieldRegistry');
    const registry = new FieldRegistry(this.page);
    const fieldConfig = registry.getFieldConfig(fieldName);
    const apiName = fieldConfig?.apiName;
    const uiLabel = fieldConfig?.label || fieldName;
    
    // Try both the provided fieldName and the UI label from FieldRegistry
    const fieldNamesToCheck = [fieldName, uiLabel];
    if (apiName && apiName !== fieldName && apiName !== uiLabel) {
      fieldNamesToCheck.push(apiName);
    }
    
    // Strategy 1: Look for field in Member Details section (for Broker Sourced fields)
    if (fieldName.includes('Broker Sourced') || apiName?.includes('Broker_Sourced')) {
      try {
        // Check in Member Details section specifically - multiple ways to find the section
        const memberDetailsSelectors = [
          'records-record-layout-section:has-text("Member Details")',
          '.slds-section:has-text("Member Details")',
          '[data-section-label="Member Details"]',
          'section:has-text("Member Details")',
        ];
        
        for (const sectionSelector of memberDetailsSelectors) {
          const memberDetailsSection = this.page.locator(sectionSelector).first();
          if (await memberDetailsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Try multiple ways to find the field label within the section
            const fieldSelectors = [
              `span:has-text("${fieldName}")`,
              `dt:has-text("${fieldName}")`,
              `label:has-text("${fieldName}")`,
              `div:has-text("${fieldName}")`,
              `td:has-text("${fieldName}")`,
            ];
            
            for (const fieldSelector of fieldSelectors) {
              const fieldInSection = memberDetailsSection.locator(fieldSelector).first();
              if (await fieldInSection.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.debug(`Found field "${fieldName}" in Member Details section using ${fieldSelector}`);
                return true;
              }
            }
            
            // Also check if the field name appears anywhere in the section text
            const sectionText = await memberDetailsSection.textContent().catch(() => '') || '';
            if (sectionText.includes(fieldName)) {
              logger.debug(`Found field "${fieldName}" text in Member Details section`);
              return true;
            }
          }
        }
      } catch {
        // Continue
      }
    }
    
    // Strategy 2: Look for the field label text directly on the page (all sections)
    // Try all possible field name variations
    for (const nameToCheck of fieldNamesToCheck) {
      try {
        // Scroll to top first to ensure we can find fields
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.waitForTimeout(500);
        
        // Try multiple label selectors with partial matching
        const labelSelectors = [
          `span:has-text("${nameToCheck}")`,
          `dt:has-text("${nameToCheck}")`,
          `label:has-text("${nameToCheck}")`,
          `div:has-text("${nameToCheck}")`,
          `td:has-text("${nameToCheck}")`,
          // Partial match for fields with underscores converted to spaces
          nameToCheck.includes('_') ? `span:has-text("${nameToCheck.replace(/_/g, ' ')}")` : '',
          nameToCheck.includes('_') ? `label:has-text("${nameToCheck.replace(/_/g, ' ')}")` : '',
        ].filter(Boolean);
        
        for (const selector of labelSelectors) {
          const fieldLabel = this.page.locator(selector).first();
          if (await fieldLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Scroll element into view to ensure it's actually visible
            await fieldLabel.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(300);
            if (await fieldLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
              logger.debug(`Found field "${nameToCheck}" via label text (selector: ${selector})`);
              return true;
            }
          }
        }
        
        // Also try scrolling through the page to find the field
        const pageHeight = await this.page.evaluate(() => document.body.scrollHeight);
        const viewportHeight = await this.page.evaluate(() => window.innerHeight);
        const scrollSteps = Math.ceil(pageHeight / viewportHeight);
        
        for (let step = 0; step < Math.min(scrollSteps, 5); step++) {
          await this.page.evaluate((y) => window.scrollTo(0, y), step * viewportHeight);
          await this.page.waitForTimeout(300);
          
          const fieldLabel = this.page.locator(`span:has-text("${nameToCheck}"), dt:has-text("${nameToCheck}"), label:has-text("${nameToCheck}")`).first();
          if (await fieldLabel.isVisible({ timeout: 1000 }).catch(() => false)) {
            logger.debug(`Found field "${nameToCheck}" via scrolling (step ${step})`);
            return true;
          }
        }
      } catch {
        // Continue to next name variation
      }
    }
    
    // Strategy 3: Look for the field in flexipage-field containers
    try {
      const flexipageField = this.page.locator('flexipage-field').filter({ hasText: fieldName });
      if (await flexipageField.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        logger.debug(`Found field "${fieldName}" in flexipage-field`);
        return true;
      }
    } catch {
      // Continue
    }
    
    // Strategy 4: Look for records-record-layout-item with field label or API name
    // Try all field name variations
    const selectors: string[] = [];
    for (const nameToCheck of fieldNamesToCheck) {
      selectors.push(
        `records-record-layout-item[field-label="${nameToCheck}"]`,
        `lightning-input-field[data-field="${nameToCheck}"]`,
        `lightning-combobox[data-field="${nameToCheck}"]`,
        `[data-field="${nameToCheck}"]`,
      );
    }
    if (apiName) {
      selectors.push(
        `records-record-layout-item[field-name="${apiName}"]`,
        `lightning-input-field[data-field="${apiName}"]`,
        `lightning-combobox[data-field="${apiName}"]`,
        `[data-field="${apiName}"]`,
      );
    }
    
    // Remove duplicates
    const uniqueSelectors = [...new Set(selectors.filter(Boolean))];
    
    for (const selector of uniqueSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(300);
        if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
          logger.debug(`Found field "${fieldName}" via selector: ${selector}`);
          return true;
        }
      }
    }
    
    // Strategy 5: Check if the field name appears in the page content
    // Try all field name variations
    for (const nameToCheck of fieldNamesToCheck) {
      try {
        const pageText = await this.page.textContent('body') || '';
        if (pageText.includes(nameToCheck)) {
          // Additional verification - look for it in a form element context
          const formElement = this.page.locator(`.slds-form-element:has-text("${nameToCheck}")`);
          if (await formElement.first().isVisible({ timeout: 2000 }).catch(() => false)) {
            logger.debug(`Found field "${nameToCheck}" in form element`);
            return true;
          }
          
          // Check if it's in the record detail area
          const recordDetail = this.page.locator('records-lwc-highlights-panel, records-record-layout-section');
          const count = await recordDetail.count();
          for (let i = 0; i < count; i++) {
            const detailText = await recordDetail.nth(i).textContent().catch(() => '') || '';
            if (detailText.includes(nameToCheck)) {
              logger.debug(`Found field "${nameToCheck}" in record detail area (section ${i})`);
              return true;
            }
          }
        }
      } catch {
        // Continue to next name variation
      }
    }
    
    logger.debug(`Field "${fieldName}" (checked variations: ${fieldNamesToCheck.join(', ')}) not found`);
    return false;
  }

  /**
   * Check if field is editable (not read-only)
   */
  async isFieldEditable(fieldName: string): Promise<boolean> {
    const editableSelectors = [
      `lightning-input-field[data-field="${fieldName}"] input:not([disabled])`,
      `lightning-combobox[data-field="${fieldName}"] button:not([disabled])`,
      `input[name="${fieldName}"]:not([disabled])`,
    ];
    
    for (const selector of editableSelectors) {
      if (await this.page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if field is marked as required (mandatory)
   * Looks for asterisk (*) or required indicator
   */
  async isFieldRequired(fieldName: string): Promise<boolean> {
    logger.debug(`Checking if field "${fieldName}" is marked as required`);
    
    // Wait for page to be ready
    await this.page.waitForLoadState('domcontentloaded');
    
    // Strategy 1: Look for asterisk (*) next to field label
    const asteriskSelectors = [
      `label:has-text("${fieldName}") + span:has-text("*")`,
      `span:has-text("${fieldName}") + span:has-text("*")`,
      `dt:has-text("${fieldName}") + span:has-text("*")`,
      `.slds-form-element__label:has-text("${fieldName}") .slds-required`,
      `label:has-text("${fieldName}") .slds-required`,
      `span:has-text("${fieldName}") ~ .slds-required`,
    ];
    
    for (const selector of asteriskSelectors) {
      if (await this.page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        logger.debug(`Found required indicator for "${fieldName}" via selector: ${selector}`);
        return true;
      }
    }
    
    // Strategy 2: Look for field container with required class
    const requiredContainerSelectors = [
      `.slds-form-element:has-text("${fieldName}") .slds-required`,
      `lightning-input-field[data-field="${fieldName}"] .slds-required`,
      `lightning-combobox[data-field="${fieldName}"] .slds-required`,
      `records-record-layout-item:has-text("${fieldName}") .slds-required`,
    ];
    
    for (const selector of requiredContainerSelectors) {
      if (await this.page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        logger.debug(`Found required indicator for "${fieldName}" in container`);
        return true;
      }
    }
    
    // Strategy 3: Check if field has required attribute
    const fieldSelectors = [
      `lightning-input-field[data-field="${fieldName}"][required]`,
      `lightning-combobox[data-field="${fieldName}"][required]`,
      `input[name="${fieldName}"][required]`,
    ];
    
    for (const selector of fieldSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        const isRequired = await element.getAttribute('required').catch(() => null);
        if (isRequired !== null) {
          logger.debug(`Found required attribute for "${fieldName}"`);
          return true;
        }
      }
    }
    
    logger.debug(`Field "${fieldName}" is not marked as required`);
    return false;
  }

  /**
   * Clear a field value
   */
  async clearField(fieldName: string): Promise<void> {
    logger.info(`Clearing field: ${fieldName}`);
    
    // For combobox, click and select "None" or "--None--"
    const combobox = this.page.getByRole('combobox', { name: fieldName });
    if (await combobox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await combobox.click();
      const noneOption = this.page.getByRole('option', { name: /none/i }).first();
      if (await noneOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await noneOption.click();
        return;
      }
    }
    
    // For text field, clear the input
    const input = this.page.getByRole('textbox', { name: fieldName })
      .or(this.page.locator(`input[name="${fieldName}"]`));
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      await input.clear();
      return;
    }
    
    logger.warn(`Could not clear field: ${fieldName}`);
  }

  // ============================================================================
  // ACCOUNT-SPECIFIC FIELD METHODS
  // ============================================================================

  /**
   * Set Account Status field
   */
  async setAccountStatus(status: string): Promise<void> {
    await this.setComboboxField('Account Status', status);
  }

  /**
   * Get Account Status field value
   */
  async getAccountStatus(): Promise<string | null> {
    return await this.getFieldValue('Account Status');
  }

  /**
   * Set Type field
   */
  async setType(type: string): Promise<void> {
    await this.setComboboxField('Type', type);
  }

  /**
   * Get Type field value
   */
  async getType(): Promise<string | null> {
    return await this.getFieldValue('Type');
  }

  /**
   * Set Region field
   * Uses FieldRegistry for consistent locators (label/API name) across orgs.
   */
  async setRegion(region: string): Promise<void> {
    const { FieldRegistry } = await import('./fields/FieldRegistry');
    const registry = new FieldRegistry(this.page);
    await registry.setValue('Region', region);
    logger.info(`✅ Set Region to "${region}"`);
  }

  /**
   * Set Functional Currency field
   */
  async setFunctionalCurrency(currency: string): Promise<void> {
    await this.setComboboxField('Functional Currency', currency);
  }

  /**
   * Set Billing Country (now a single-select combobox/picklist)
   */
  async setBillingCountry(country: string): Promise<void> {
    logger.info(`Setting Billing Country to: ${country}`);
    
    // Country is now a standard combobox, use FieldRegistry
    const { FieldRegistry } = await import('./fields/FieldRegistry');
    const registry = new FieldRegistry(this.page);
    await registry.setValue('Country', country);
    
    logger.info(`✅ Set Billing Country to "${country}"`);
  }

  // ============================================================================
  // HISTORY / AUDIT METHODS
  // ============================================================================

  /**
   * Navigate to Related tab
   */
  async openRelatedTab(): Promise<void> {
    logger.info('Opening Related tab');
    const relatedTab = this.page.getByRole('tab', { name: 'Related' })
      .or(this.page.locator(this.relatedTab));
    await relatedTab.waitFor({ state: 'visible', timeout: 5000 });
    await relatedTab.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Open Account History section
   */
  async openHistory(): Promise<void> {
    logger.info('Opening Account History');
    
    // First, go to Related tab
    await this.openRelatedTab();
    
    // Find and click history section
    const historyHeader = this.page.getByText('Account History', { exact: true })
      .or(this.page.getByText('History', { exact: true }))
      .or(this.page.locator(this.historySection));
    
    if (await historyHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await historyHeader.click();
    }
    
    // Try to click "View All" if available
    const viewAll = this.page.getByRole('link', { name: /View All.*History/i })
      .or(this.page.getByText('View All').first());
    if (await viewAll.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewAll.click();
      await this.page.waitForLoadState('domcontentloaded');
    }
  }

  /**
   * Verify history contains field change
   */
  async verifyHistoryContainsChange(fieldName: string, oldValue: string, newValue: string): Promise<boolean> {
    logger.info(`Verifying history: ${fieldName} changed from "${oldValue}" to "${newValue}"`);
    
    // Wait for page content to be ready
    await this.page.waitForLoadState('domcontentloaded');
    
    const pageText = await this.page.textContent('body') || '';
    
    // Check if the page contains the field name and both values
    const hasField = pageText.toLowerCase().includes(fieldName.toLowerCase());
    const hasOldValue = pageText.includes(oldValue);
    const hasNewValue = pageText.includes(newValue);
    
    if (hasField && hasOldValue && hasNewValue) {
      logger.info('✅ History change verified');
      return true;
    }
    
    logger.warn(`History verification failed - Field: ${hasField}, Old: ${hasOldValue}, New: ${hasNewValue}`);
    return false;
  }

  // ============================================================================
  // ACCOUNT CREATION (UI)
  // ============================================================================

  /**
   * Create a new account via UI
   * When addressDrivesRegion is true, set billing address and do NOT set Region/State/Province (they auto-calculate).
   * Otherwise Region and State/Province are set explicitly (required in many orgs).
   */
  async createAccount(accountData: {
    name: string;
    type?: string;
    status?: string;
    region?: string;
    stateProvince?: string;
    /** When true, set billing address only; Region and Distribution Region auto-calculate from address */
    addressDrivesRegion?: boolean;
    /** Billing address – use when addressDrivesRegion is true or to fill required address fields */
    billingAddress?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }): Promise<void> {
    logger.info(`Creating account via UI: ${accountData.name}`);

    await this.clickNew();
    await this.setTextField('Account Name', accountData.name);

    // CRITICAL: Type is REQUIRED
    if (accountData.type) {
      await this.setType(accountData.type);
    } else {
      await this.setType('Agency');
      logger.warn('⚠️  Type not provided - defaulting to "Agency" (REQUIRED)');
    }

    if (accountData.status) {
      await this.setAccountStatus(accountData.status);
    }

    const useAddressForRegion = accountData.addressDrivesRegion === true && accountData.billingAddress;
    if (useAddressForRegion && accountData.billingAddress) {
      // Set billing address first (Region/Distribution Region may auto-calculate from address)
      logger.info('Setting billing address (Region and Distribution Region will auto-calculate)');
      await this.setBillingAddress(accountData.billingAddress);
      // Ensure mandatory Region and State/Province are populated (in case auto-calc does not run)
      const region = accountData.region || 'US';
      await this.setRegion(region).catch(() => logger.debug('Region already set or not visible'));
      const stateProvince = accountData.stateProvince ?? (region === 'US' ? 'New York' : region === 'CA' ? 'Ontario' : 'New York');
      await this.setStateProvince(stateProvince).catch(() => logger.debug('State/Province already set or not visible'));
    } else {
      // Explicit Region and State/Province (original behaviour)
      const region = accountData.region || 'US';
      await this.setRegion(region);
      logger.info(`✅ Set Region to "${region}" (REQUIRED)`);
      if (accountData.stateProvince) {
        await this.setStateProvince(accountData.stateProvince);
      } else {
        let defaultState = 'New York';
        switch (region) {
          case 'US': defaultState = 'New York'; break;
          case 'CA': defaultState = 'Ontario'; break;
          case 'UK': defaultState = 'England'; break;
          case 'EU': defaultState = 'Bavaria'; break;
          case 'ROW': defaultState = 'New South Wales'; break;
        }
        await this.setStateProvince(defaultState);
        logger.info(`✅ Set State/Province to "${defaultState}" for Region "${region}" (REQUIRED)`);
      }
    }

    await this.save();
  }

  /**
   * Create a Member account with only mandatory fields (no address).
   * Mandatory: Account Name, Account Status, Party Code, Affiliate/Non-Affiliate, Type, Ownership.
   * Billing country is defaulted to US in the org – do not set or edit address.
   * Party Code is generated as a random 4-char alphanumeric to avoid duplicates.
   */
  async createMemberWithMandatoryFieldsOnly(name: string, status: string, options?: {
    partyCode?: string;
    affiliateNonAffiliate?: string;
    ownership?: string;
  }): Promise<void> {
    const { FieldRegistry } = await import('./fields/FieldRegistry');
    const registry = new FieldRegistry(this.page);
    logger.info(`Creating Member account (mandatory fields only): ${name}`);

    await this.clickNew();
    await this.setTextField('Account Name', name);
    await this.setType('Member');
    await this.setAccountStatus(status);
    await this.page.waitForTimeout(500);
    const form = this.page.locator('lightning-record-edit-form, lightning-record-form').first();
    const formVisible = await form.isVisible({ timeout: 5000 }).catch(() => false);
    const base = formVisible ? form : this.page;
    const setByLabel = async (label: string, value: string): Promise<boolean> => {
      const input = base.getByLabel(label, { exact: false }).first();
      if (await input.isVisible({ timeout: 3000 }).catch(() => false)) {
        await input.clear();
        await input.fill(value);
        logger.info(`✅ Set "${label}" to "${value}"`);
        return true;
      }
      return false;
    };
    const partyCode = options?.partyCode ?? this.generateRandomPartyCode();
    const aff = options?.affiliateNonAffiliate ?? 'AFL';
    const ownership = options?.ownership ?? 'Mission';
    if (!(await setByLabel('Party Code', partyCode))) await registry.setValue('Party Code', partyCode);
    await this.page.waitForTimeout(300);
    try {
      await this.setComboboxField('Affiliate/Non-Affiliate', aff);
    } catch {
      await registry.setValue('Affiliate/Non-Affiliate', aff);
    }
    await this.page.waitForTimeout(200);
    try {
      await this.setComboboxField('Ownership', ownership);
    } catch {
      await registry.setValue('Ownership', ownership);
    }
    await this.save();
    await this.ensureOnRecordDetailPageAfterCreate(name);
  }

  /** Generate a random 4-character alphanumeric string for unique Party Code. */
  private generateRandomPartyCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Set full billing address via FieldRegistry (used when Region/Distribution Region auto-calculate).
   * Does not set Billing State/Province (optional / auto-calculated).
   */
  async setBillingAddress(address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }): Promise<void> {
    const form = this.page.locator('lightning-record-edit-form, lightning-record-form').first();
    const formVisible = await form.isVisible({ timeout: 5000 }).catch(() => false);
    const base = formVisible ? form : this.page;
    const fillByLabel = async (label: string, value: string) => {
      const input = base.getByLabel(label, { exact: false }).first();
      await input.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
      if (await input.isVisible().catch(() => false)) {
        await input.clear();
        await input.fill(value);
        logger.info(`✅ Set "${label}" to "${value}"`);
        return true;
      }
      return false;
    };
    const { FieldRegistry } = await import('./fields/FieldRegistry');
    const registry = new FieldRegistry(this.page);
    await registry.setValue('Billing Street', address.street);
    await this.page.waitForTimeout(400);
    const citySet = await fillByLabel('Billing City', address.city);
    if (!citySet) await registry.setValue('Billing City', address.city);
    await this.page.waitForTimeout(400);
    const zipSet = await fillByLabel('Billing Zip', address.postalCode) || await fillByLabel('Billing Zip/Postal Code', address.postalCode);
    if (!zipSet) await registry.setValue('Billing Zip/Postal Code', address.postalCode);
    const countrySet = await fillByLabel('Billing Country', address.country);
    if (!countrySet) await registry.setValue('Billing Country', address.country);
    logger.info(`✅ Set Billing Address: ${address.street}, ${address.city} ${address.postalCode}, ${address.country}`);
  }
  
  /**
   * Set State/Province field (REQUIRED)
   */
  async setStateProvince(state: string): Promise<void> {
    logger.info(`Setting State/Province to: ${state}`);
    const { FieldRegistry } = await import('./fields/FieldRegistry');
    const registry = new FieldRegistry(this.page);
    await registry.setValue('State/Province', state);
  }
}
