/**
 * Salesforce Workbench Page Object Model
 * Handles interactions with Salesforce Workbench UI for data migration
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { logger } from '../../utils/logger';

export class WorkbenchPage extends BasePage {
  // Login page selectors
  private readonly environmentDropdown = 'select[name="environment"]';
  private readonly apiVersionDropdown = 'select[name="apiVersion"]';
  private readonly termsCheckbox = 'input[type="checkbox"][name="terms"]';
  private readonly loginButton = 'button:has-text("Login with Salesforce"), input[type="submit"][value*="Login"], a:has-text("Login with Salesforce"), button:has-text("Login"), input[value*="Login with Salesforce"]';

  // Navigation selectors
  private readonly dataMenu = 'a:has-text("data"), nav a:has-text("Data")';
  private readonly insertMenuItem = 'a:has-text("Insert"), a[href*="insert"]';

  // Insert page selectors
  private readonly objectTypeSelect = 'select[name="entity"], select#entity';
  private readonly fromFileRadio = 'input[type="radio"][value="file"], input[type="radio"][name="sourceType"][value="file"]';
  private readonly fileInput = 'input[type="file"]';
  private readonly uploadButton = 'input[type="submit"][value*="Upload"], button:has-text("Upload")';

  // Field mapping selectors
  private readonly mappingTable = 'table, .mapping-table';
  private readonly fieldMappingRows = 'table tbody tr, .mapping-table tbody tr';
  private readonly csvFieldDropdown = 'select[name*="csvField"], select[name*="csv"], td select';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to Workbench login page
   */
  async navigateToLogin(): Promise<void> {
    await this.navigateTo('https://workbench.developerforce.com/login.php');
    await this.page.waitForLoadState('networkidle');
    logger.info('✅ Navigated to Workbench login page');
  }

  /**
   * Login to Workbench
   * @param environment - Environment to select (default: 'Sandbox')
   */
  async login(environment: string = 'Sandbox'): Promise<void> {
    logger.info(`Logging in to Workbench with environment: ${environment}`);

    // Wait for page to be fully loaded
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(2000); // Give time for dynamic content to load

    // Select environment
    const envSelect = this.page.locator(this.environmentDropdown);
    if (await envSelect.isVisible({ timeout: 10000 }).catch(() => false)) {
      await envSelect.selectOption({ label: environment });
      logger.debug(`Selected environment: ${environment}`);
      await this.page.waitForTimeout(500); // Wait for selection to register
    } else {
      logger.warn('Environment dropdown not found - page may have different structure');
    }

    // Check terms checkbox
    const termsCheckbox = this.page.locator(this.termsCheckbox);
    if (await termsCheckbox.isVisible({ timeout: 10000 }).catch(() => false)) {
      const isChecked = await termsCheckbox.isChecked();
      if (!isChecked) {
        await termsCheckbox.check();
        logger.debug('Checked terms of service checkbox');
        await this.page.waitForTimeout(500); // Wait for checkbox to register
      }
    } else {
      logger.warn('Terms checkbox not found - may not be required or page structure different');
    }

    // Click login button - try multiple selectors
    const loginButtonSelectors = [
      'button:has-text("Login with Salesforce")',
      'input[type="submit"][value*="Login"]',
      'input[value*="Login with Salesforce"]',
      'a:has-text("Login with Salesforce")',
      'button:has-text("Login")',
      'input[type="button"][value*="Login"]',
      'button[type="submit"]',
      'input[type="submit"]',
    ];

    let loginButtonFound = false;
    for (const selector of loginButtonSelectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible({ timeout: 3000 }).catch(() => false)) {
        await button.click();
        logger.info(`Clicked Login button using selector: ${selector}`);
        loginButtonFound = true;
        break;
      }
    }

    if (!loginButtonFound) {
      // Debug: Take screenshot and log page content
      const screenshotPath = await this.takeScreenshot('workbench-login-page');
      logger.error(`Login button not found. Screenshot saved: ${screenshotPath}`);
      
      // Try to find any button or input on the page
      const allButtons = await this.page.locator('button, input[type="submit"], input[type="button"], a.button').all();
      logger.debug(`Found ${allButtons.length} buttons/inputs on page`);
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const text = await allButtons[i].textContent().catch(() => '');
        const value = await allButtons[i].getAttribute('value').catch(() => '');
        logger.debug(`  Button ${i + 1}: text="${text}", value="${value}"`);
      }
      
      throw new Error('Login button not found. Please check the screenshot and verify the page loaded correctly.');
    }

    // Wait for navigation (may redirect to Salesforce login)
    await this.page.waitForLoadState('networkidle', { timeout: 30000 });
    
    // Wait for either Workbench main page or Salesforce login
    const currentUrl = this.page.url();
    if (currentUrl.includes('login.salesforce.com') || currentUrl.includes('salesforce.com/oauth')) {
      logger.info('Redirected to Salesforce login - user may need to complete authentication');
      // Wait a bit for user to complete login if needed
      await this.page.waitForURL(/workbench\.developerforce\.com/, { timeout: 120000 }).catch(() => {
        logger.warn('Still on Salesforce login page - user may need to complete authentication manually');
      });
    }

    await this.page.waitForLoadState('networkidle');
    logger.info('✅ Login process initiated');
  }

  /**
   * Navigate to Data -> Insert page
   */
  async navigateToInsert(): Promise<void> {
    logger.info('Navigating to Data -> Insert...');

    // Click on Data menu
    const dataMenu = this.page.locator(this.dataMenu).first();
    await dataMenu.waitFor({ state: 'visible', timeout: 10000 });
    await dataMenu.click();
    logger.debug('Clicked Data menu');

    // Wait a bit for menu to expand
    await this.page.waitForTimeout(1000);

    // Click on Insert submenu
    const insertMenu = this.page.locator(this.insertMenuItem).first();
    await insertMenu.waitFor({ state: 'visible', timeout: 10000 });
    await insertMenu.click();
    logger.debug('Clicked Insert menu item');

    // Wait for insert page to load
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForURL(/insert\.php/, { timeout: 15000 });
    logger.info('✅ Navigated to Insert page');
  }

  /**
   * Select object type (e.g., Account)
   */
  async selectObjectType(objectType: string): Promise<void> {
    logger.info(`Selecting object type: ${objectType}`);

    const objectSelect = this.page.locator(this.objectTypeSelect);
    await objectSelect.waitFor({ state: 'visible', timeout: 10000 });
    await objectSelect.selectOption({ label: objectType });
    
    // Wait for page to update
    await this.page.waitForTimeout(1000);
    logger.info(`✅ Selected object type: ${objectType}`);
  }

  /**
   * Select "From File" radio button
   */
  async selectFromFile(): Promise<void> {
    logger.info('Selecting "From File" option');

    const fromFileRadio = this.page.locator(this.fromFileRadio).first();
    await fromFileRadio.waitFor({ state: 'visible', timeout: 10000 });
    
    // Check if already selected
    if (!(await fromFileRadio.isChecked())) {
      await fromFileRadio.check();
      logger.debug('Checked "From File" radio button');
    }

    // Wait for file input to appear
    await this.page.waitForTimeout(1000);
    logger.info('✅ Selected "From File" option');
  }

  /**
   * Upload CSV file
   */
  async uploadCsvFile(filePath: string): Promise<void> {
    logger.info(`Uploading CSV file: ${filePath}`);

    const fileInput = this.page.locator(this.fileInput).first();
    await fileInput.waitFor({ state: 'visible', timeout: 10000 });
    
    // Set the file
    await fileInput.setInputFiles(filePath);
    logger.debug('File selected in input');

    // Click upload button if present
    const uploadButton = this.page.locator(this.uploadButton).first();
    if (await uploadButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await uploadButton.click();
      logger.debug('Clicked upload button');
    }

    // Wait for file to upload and mapping page to appear
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000); // Give time for mapping table to render

    // Verify upload success message
    const successMessage = this.page.locator('text=/uploaded successfully/i, .info, .success');
    if (await successMessage.isVisible({ timeout: 10000 }).catch(() => false)) {
      logger.info('✅ CSV file uploaded successfully');
    } else {
      logger.warn('Upload success message not found, but continuing...');
    }
  }

  /**
   * Get all field mapping rows from the table
   */
  async getFieldMappingRows(): Promise<Locator[]> {
    await this.page.waitForSelector(this.fieldMappingRows, { timeout: 15000 });
    const rows = this.page.locator(this.fieldMappingRows);
    const count = await rows.count();
    logger.debug(`Found ${count} field mapping rows`);
    return Array.from({ length: count }, (_, i) => rows.nth(i));
  }

  /**
   * Find the row for a specific Salesforce target field
   */
  async findFieldRow(targetFieldName: string): Promise<Locator | null> {
    const rows = await this.getFieldMappingRows();
    
    for (const row of rows) {
      const fieldCell = row.locator('td:first-child, th:first-child').first();
      const fieldText = await fieldCell.textContent();
      
      if (fieldText && fieldText.trim() === targetFieldName) {
        logger.debug(`Found row for target field: ${targetFieldName}`);
        return row;
      }
    }

    logger.warn(`Row not found for target field: ${targetFieldName}`);
    return null;
  }

  /**
   * Map a source CSV field to a target Salesforce field
   */
  async mapField(targetFieldName: string, sourceFieldName: string): Promise<boolean> {
    logger.info(`Mapping ${sourceFieldName} -> ${targetFieldName}`);

    const row = await this.findFieldRow(targetFieldName);
    if (!row) {
      logger.error(`❌ Could not find row for target field: ${targetFieldName}`);
      return false;
    }

    // Find the CSV field dropdown in this row
    // The dropdown is typically in the second column (CSV Field column)
    const csvFieldSelect = row.locator('select').first();
    
    if (!(await csvFieldSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
      logger.error(`❌ CSV field dropdown not found for ${targetFieldName}`);
      return false;
    }

    // Get all available options
    const options = await csvFieldSelect.locator('option').all();
    let optionFound = false;

    // Normalize field name for comparison (case-insensitive, trim whitespace)
    const normalizedSourceField = sourceFieldName.trim().toLowerCase();

    for (const option of options) {
      const optionText = await option.textContent();
      const optionValue = await option.getAttribute('value');
      
      // Normalize option values for comparison
      const normalizedText = optionText ? optionText.trim().toLowerCase() : '';
      const normalizedValue = optionValue ? optionValue.trim().toLowerCase() : '';
      
      // Try exact match first
      if (normalizedText === normalizedSourceField || normalizedValue === normalizedSourceField) {
        if (optionText && optionText.trim()) {
          await csvFieldSelect.selectOption({ label: optionText.trim() });
        } else if (optionValue) {
          await csvFieldSelect.selectOption({ value: optionValue });
        }
        optionFound = true;
        logger.debug(`Selected option: ${optionText || optionValue}`);
        break;
      }
      
      // Try partial match (in case of slight variations)
      if (normalizedText.includes(normalizedSourceField) || normalizedSourceField.includes(normalizedText)) {
        if (normalizedText && normalizedText !== '-- select --' && normalizedText !== 'select') {
          if (optionText && optionText.trim()) {
            await csvFieldSelect.selectOption({ label: optionText.trim() });
          } else if (optionValue) {
            await csvFieldSelect.selectOption({ value: optionValue });
          }
          optionFound = true;
          logger.debug(`Selected option by partial match: ${optionText || optionValue}`);
          break;
        }
      }
    }

    if (!optionFound) {
      logger.error(`❌ Source field "${sourceFieldName}" not found in dropdown for ${targetFieldName}`);
      return false;
    }

    // Wait a bit for the selection to register
    await this.page.waitForTimeout(500);
    logger.info(`✅ Mapped ${sourceFieldName} -> ${targetFieldName}`);
    return true;
  }

  /**
   * Map multiple fields based on a mapping object
   */
  async mapFields(fieldMappings: Record<string, string>): Promise<{ success: number; failed: number; errors: string[] }> {
    logger.info(`Mapping ${Object.keys(fieldMappings).length} fields...`);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const [targetField, sourceField] of Object.entries(fieldMappings)) {
      const success = await this.mapField(targetField, sourceField);
      if (success) {
        successCount++;
      } else {
        failedCount++;
        errors.push(`Failed to map ${sourceField} -> ${targetField}`);
      }
    }

    logger.info(`✅ Field mapping complete: ${successCount} successful, ${failedCount} failed`);
    return { success: successCount, failed: failedCount, errors };
  }

  /**
   * Get available CSV field options from the first dropdown (to verify CSV columns)
   */
  async getAvailableCsvFields(): Promise<string[]> {
    const rows = await this.getFieldMappingRows();
    if (rows.length === 0) {
      return [];
    }

    const firstRow = rows[0];
    const csvFieldSelect = firstRow.locator('select').first();
    
    if (!(await csvFieldSelect.isVisible({ timeout: 5000 }).catch(() => false))) {
      return [];
    }

    const options = await csvFieldSelect.locator('option').allTextContents();
    // Filter out empty options and return
    return options.filter(opt => opt.trim() !== '' && opt.trim() !== '-- Select --');
  }
}
