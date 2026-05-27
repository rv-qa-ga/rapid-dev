import { Page, Locator } from '@playwright/test';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

export abstract class BasePage {
  protected page: Page;
  protected timeouts = config.getTimeouts();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   */
  async navigateTo(url: string): Promise<void> {
    logger.info(`Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.timeouts.navigation });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      logger.debug('Navigation did not reach full network idle; continuing.');
    });
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout?: number): Promise<Locator> {
    const locator = this.page.locator(selector);
    await locator.waitFor({ state: 'visible', timeout: timeout || this.timeouts.element });
    return locator;
  }

  /**
   * Click on an element
   */
  async click(selector: string, timeout?: number): Promise<void> {
    logger.debug(`Clicking on: ${selector}`);
    const element = await this.waitForElement(selector, timeout);
    await element.click();
  }

  /**
   * Fill input field
   */
  async fill(selector: string, value: string, timeout?: number): Promise<void> {
    logger.debug(`Filling ${selector} with: ${value}`);
    const element = await this.waitForElement(selector, timeout);
    await element.fill(value);
  }

  /**
   * Get text content of an element
   */
  async getText(selector: string, timeout?: number): Promise<string> {
    const element = await this.waitForElement(selector, timeout);
    return await element.textContent() || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string, timeout?: number): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: timeout || this.timeouts.element });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(timeout?: number): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout: timeout || this.timeouts.navigation });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      logger.debug('Navigation waiting for network idle timed out; proceeding.');
    });
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(name: string): Promise<string> {
    const screenshotPath = `reports/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  }
}

