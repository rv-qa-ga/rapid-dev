import { Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

export class LoginPage extends BasePage {
  // Selectors
  private readonly usernameInput = '#username';
  private readonly passwordInput = '#password';
  private readonly loginButton = '#Login';
  private readonly errorMessage = '#error';

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to Salesforce login page
   */
  async goto(): Promise<void> {
    try {
      const sfConfig = config.getSalesforceConfig();
      // Use loginUrl from config (which defaults to baseUrl), fallback to env var, then to default
      const loginUrl = sfConfig.loginUrl || sfConfig.baseUrl || process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
      
      logger.info(`=== Navigation Debug ===`);
      logger.info(`Environment: ${config.getEnvironment()}`);
      logger.info(`Salesforce Config - baseUrl: ${sfConfig.baseUrl}`);
      logger.info(`Salesforce Config - loginUrl: ${sfConfig.loginUrl || 'not set (will use baseUrl)'}`);
      logger.info(`Final login URL: ${loginUrl}`);
      logger.info(`Current page URL before navigation: ${this.page.url()}`);
      logger.info(`Page is closed: ${this.page.isClosed()}`);
      
      // Ensure page is still open
      if (this.page.isClosed()) {
        throw new Error('Page has been closed before navigation');
      }
      
      logger.info(`Navigating to: ${loginUrl}`);
      await this.navigateTo(loginUrl);
      
      logger.info(`Current page URL after navigation: ${this.page.url()}`);
      
      // Wait for page to be ready
      await this.page.waitForLoadState('domcontentloaded');
      logger.info('Page loaded successfully');
    } catch (error: any) {
      logger.error(`Failed to navigate to login page: ${error.message}`);
      logger.error(`Stack: ${error.stack}`);
      throw error;
    }
  }

  /**
   * Enter username
   */
  async enterUsername(username: string): Promise<void> {
    await this.fill(this.usernameInput, username);
  }

  /**
   * Enter password
   */
  async enterPassword(password: string): Promise<void> {
    await this.fill(this.passwordInput, password);
  }

  /**
   * Click login button
   */
  async clickLogin(): Promise<void> {
    await this.click(this.loginButton);
    await this.waitForNavigation();
  }

  /**
   * Perform login
   */
  async login(username: string, password: string): Promise<void> {
    logger.info(`Logging in as: ${username}`);
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLogin();
  }

  /**
   * Check if error message is displayed
   */
  async isErrorMessageVisible(): Promise<boolean> {
    return await this.isVisible(this.errorMessage);
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    if (await this.isErrorMessageVisible()) {
      return await this.getText(this.errorMessage);
    }
    return '';
  }
}

