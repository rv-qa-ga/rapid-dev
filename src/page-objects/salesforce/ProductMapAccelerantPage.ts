import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from '../base/BasePage';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { HomePage } from './HomePage';

/** QA org limitation (SF-977 UI): only this Product label may be selected until data is expanded. */
export const SF977_UI_PRODUCT_ALLOWED = 'test';

export function uiAllowedProductFromEnv(): string {
  return process.env.SF977_UI_ALLOWED_PRODUCT_LABEL?.trim() || SF977_UI_PRODUCT_ALLOWED;
}

/** Aligns with SF977_PRODUCT_MAP_STATUS_DRAFT / API defaults (SF-977 Expansion draft). */
export function sf977ExpansionDraftStatusFromEnv(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_DRAFT?.trim() || 'Draft - Product Expansion';
}

/** Product_Map__c lookup — QA record page shows `Product__c` (see env.sample). */
function productLookupFieldApi(): string {
  return process.env.SF977_UI_PRODUCT_LOOKUP_FIELD?.trim() || 'Product__c';
}

function opportunityLookupFieldApi(): string {
  const f =
    process.env.SF977_UI_OPPORTUNITY_LOOKUP_FIELD?.trim() ||
    process.env.SF977_PRODUCT_MAP_OPPORTUNITY_LOOKUP?.trim() ||
    'Opportunity__c';
  assertSafeSfdcFieldApi(f, 'SF977_UI_OPPORTUNITY_LOOKUP_FIELD');
  return f;
}

function assertSafeSfdcFieldApi(name: string, envKey: string): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(name)) {
    throw new Error(`Invalid ${envKey}="${name}" (expected Salesforce API name)`);
  }
}

export function assertSf977UiProductAllowed(value: string): void {
  const v = value.trim();
  if (v.toLowerCase() !== SF977_UI_PRODUCT_ALLOWED) {
    throw new Error(
      `SF-977 UI: Product must be "${SF977_UI_PRODUCT_ALLOWED}" (QA limitation). Got "${value}". ` +
        `Unset SF977_UI_ALLOWED_PRODUCT_LABEL or set it to "test".`
    );
  }
}

/**
 * Accelerant Console → Product Maps list and New (SF-977 UI smoke).
 * Reuses HomePage.navigateToObjectViaConsoleMenu (stable navigation).
 */
export class ProductMapAccelerantPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  productMapsNavLabel(): string {
    return process.env.SF977_UI_PRODUCT_MAPS_NAV_LABEL?.trim() || 'Product Maps';
  }

  async navigateToProductMapsListViaAccelerantConsole(homePage: HomePage): Promise<void> {
    const label = this.productMapsNavLabel();
    await homePage.navigateToAccelerantConsoleHome();
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(800);

    const onList =
      /lightning\/o\/Product_Map/i.test(this.page.url()) ||
      /Product_Map__c/i.test(this.page.url());
    if (onList) {
      logger.info('SF-977 UI: already on Product Map list URL');
      return;
    }

    const tabOrNav = this.page
      .locator('one-app-nav-bar-item-root')
      .filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();
    if (await tabOrNav.isVisible({ timeout: 4000 }).catch(() => false)) {
      await tabOrNav.click();
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(1500);
      logger.info(`SF-977 UI: opened "${label}" via pinned nav tab`);
      return;
    }

    const base = config.getSalesforceConfig().baseUrl.replace(/\/$/, '');
    const listUrl = `${base}/lightning/o/Product_Map__c/list`;
    try {
      logger.info(`SF-977 UI: navigating directly to Product Map list: ${listUrl}`);
      await this.navigateTo(listUrl);
      await this.page.waitForTimeout(2000);
      const stillWrong = !/Product_Map/i.test(this.page.url());
      if (!stillWrong) {
        logger.info('SF-977 UI: Product Map list opened via direct URL');
        return;
      }
    } catch (e: unknown) {
      logger.warn(`SF-977 UI: direct list URL failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    await homePage.navigateToObjectViaConsoleMenu(label);
  }

  /**
   * Product Maps object list (Accelerant Console): use the **list view** header "New" (top-right),
   * not App Launcher or unrelated New actions elsewhere on the page.
   */
  async clickNewButton(): Promise<void> {
    logger.info('SF-977 UI: waiting for Product Maps list view, then clicking header New');
    await this.page.waitForLoadState('domcontentloaded');

    const listReady = this.page
      .getByPlaceholder(/Search this list/i)
      .or(this.page.locator('lightning-datatable'))
      .or(this.page.locator('flexipage-filter-list'))
      .or(this.page.locator('[data-aura-class*="forceListViewManager"]'))
      .first();
    await listReady.waitFor({ state: 'visible', timeout: 60000 }).catch(() => {
      logger.warn('SF-977 UI: list view readiness hint not found; still attempting New');
    });
    await this.page.waitForTimeout(800);

    const pageHeader = this.page.locator('.slds-page-header').first();

    const candidates: Locator[] = [
      pageHeader.locator('.slds-page-header__col-actions, .slds-page-header__actions').getByRole('button', {
        name: /^New$/i,
      }),
      pageHeader.getByRole('button', { name: /^New$/i }),
      this.page.locator('runtime_platform_actions-action-renderer').filter({ hasText: /^New$/i }).locator('button').first(),
      this.page.locator('lightning-button').filter({ has: this.page.locator('button:has-text("New")') }).locator('button').first(),
      this.page.locator('lightning-button button.slds-button:has-text("New")').first(),
    ];

    let clicked = false;
    for (const loc of candidates) {
      try {
        const target = loc.first();
        if (await target.isVisible({ timeout: 4000 }).catch(() => false)) {
          await target.scrollIntoViewIfNeeded();
          await target.click({ timeout: 20000 });
          clicked = true;
          logger.info('SF-977 UI: clicked list/header New for Product Maps');
          break;
        }
      } catch (e: unknown) {
        logger.debug(`SF-977 UI: New candidate failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!clicked) {
      const fallback = this.page
        .getByRole('button', { name: /^New$/i })
        .or(this.page.locator('a[title="New"]'))
        .or(this.page.locator('button[name="New"]'))
        .first();
      await fallback.waitFor({ state: 'visible', timeout: 20000 });
      await fallback.scrollIntoViewIfNeeded();
      await fallback.click();
      logger.info('SF-977 UI: clicked New (global fallback)');
    }

    await this.page.waitForLoadState('domcontentloaded');
    await this.page
      .locator('[role="dialog"], .modal-container, records-modal-lwc-detail-panel-wrapper')
      .first()
      .waitFor({ state: 'visible', timeout: 45000 })
      .catch(() => {
        logger.warn('SF-977 UI: no dialog shell visible yet after New; continuing to heading wait');
      });
    await this.page.waitForTimeout(1500);
  }

  async expectNewProductMapFormVisible(): Promise<void> {
    const dialog = this.page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 45000 }).catch(() => {});

    const inDialog = dialog.getByRole('heading', { name: /New Product Map/i });
    const heading = this.page.getByRole('heading', { name: /New Product Map/i });
    const fallback = dialog.getByText(/New Product Map/i).first().or(this.page.getByText(/New Product Map/i).first());
    const visible =
      (await inDialog.isVisible({ timeout: 25000 }).catch(() => false)) ||
      (await heading.isVisible({ timeout: 15000 }).catch(() => false)) ||
      (await fallback.isVisible({ timeout: 10000 }).catch(() => false));
    if (!visible) {
      throw new Error('New Product Map form/modal not visible (heading or title text missing).');
    }
    logger.info('SF-977 UI: New Product Map form is visible');
  }

  /**
   * Active New Product Map dialog — avoid `.first()` on generic modal shells (empty layer can win document order).
   */
  formScope(): Locator {
    return this.page
      .locator('[role="dialog"]')
      .filter({ hasText: /New Product Map|Product Map Name/i })
      .last();
  }

  /**
   * After filling Product__c, LEX may show a combobox, lightning-input-field, or record-picker — not always role=combobox "Product".
   */
  async expectProductFieldShowsQaValue(expected: string = uiAllowedProductFromEnv()): Promise<void> {
    assertSf977UiProductAllowed(expected);
    const scope = this.formScope();
    await scope.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const escaped = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');

    const combo = scope.getByRole('combobox', { name: /^Product$/i }).first();
    if (await combo.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(combo).toContainText(re, { timeout: 15000 });
      logger.info('SF-977 UI: asserted Product on combobox');
      return;
    }

    const api = productLookupFieldApi();
    const byApi = scope.locator(`lightning-input-field[field-name="${api}"], lightning-input-field[data-field-name="${api}"]`).first();
    if (await byApi.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(byApi).toContainText(re, { timeout: 15000 });
      logger.info(`SF-977 UI: asserted Product on lightning-input-field ${api}`);
      return;
    }

    const picker = scope.locator(`lightning-record-picker[field-name="${api}"]`).first();
    if (await picker.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(picker).toContainText(re, { timeout: 15000 });
      logger.info(`SF-977 UI: asserted Product on lightning-record-picker ${api}`);
      return;
    }

    throw new Error(
      `SF-977 UI: could not find Product control to assert "${expected}" (tried combobox "Product", ${api} input-field / record-picker).`
    );
  }

  /**
   * Fill Product Map Name (required on New Product Map).
   */
  async fillProductMapName(name: string): Promise<void> {
    const scope = this.formScope();
    await scope.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});

    const candidates = [
      scope.getByRole('textbox', { name: /Product Map Name/i }),
      scope.locator('lightning-input-field[field-name="Name"] input'),
      scope.locator('lightning-input-field[data-field-name="Name"] input'),
      this.page.locator('[role="dialog"] lightning-input-field[field-name="Name"] input').last(),
      this.page.locator('[role="dialog"] lightning-input-field[data-field-name="Name"] input').last(),
      this.page.getByRole('textbox', { name: /Product Map Name/i }),
    ];

    let nameInput: Locator | null = null;
    for (const c of candidates) {
      const loc = c.first();
      if (await loc.isVisible({ timeout: 5000 }).catch(() => false)) {
        nameInput = loc;
        break;
      }
    }
    if (!nameInput) {
      throw new Error(
        'SF-977 UI: Product Map Name input not found inside New Product Map dialog. Check layout / shadow DOM.'
      );
    }
    await nameInput.scrollIntoViewIfNeeded();
    await nameInput.fill(name);
    logger.info(`SF-977 UI: filled Product Map Name (${name.length} chars)`);
  }

  /**
   * Resolve lookup / record-picker input inside the New modal using field API name (e.g. Product__c).
   */
  private lookupInputByFieldApi(scope: Locator, fieldApiName: string): Locator {
    assertSafeSfdcFieldApi(fieldApiName, 'fieldApiName');
    return scope
      .locator(`lightning-input-field[field-name="${fieldApiName}"] input`)
      .or(scope.locator(`lightning-input-field[data-field-name="${fieldApiName}"] input`))
      .or(scope.locator(`lightning-record-picker[field-name="${fieldApiName}"] input`))
      .first();
  }

  private async fillLookupViaFieldApi(scope: Locator, fieldApi: string, searchText: string, pickMatch: string): Promise<void> {
    const input = this.lookupInputByFieldApi(scope, fieldApi);
    await input.waitFor({ state: 'visible', timeout: 20000 });
    await input.scrollIntoViewIfNeeded();
    await input.click();
    await input.fill(searchText);
    await this.page.waitForTimeout(1500);
    await this.pickLookupSearchResult(pickMatch);
  }

  /**
   * Lightning lookup: click/focus input, type search text, pick first matching option.
   * Matches FieldRegistry lookup pattern (async search + option click).
   */
  private async fillSalesforceLookupInForm(options: {
    labelRegex: RegExp;
    placeholderRegex: RegExp;
    searchText: string;
    pickOptionMatching: string;
  }): Promise<void> {
    const scope = this.formScope();
    let lookup: Locator = scope
      .getByPlaceholder(options.placeholderRegex)
      .or(scope.getByRole('combobox', { name: options.labelRegex }))
      .or(scope.getByLabel(options.labelRegex, { exact: false }))
      .first();

    if (!(await lookup.isVisible({ timeout: 4000 }).catch(() => false))) {
      lookup = this.page
        .getByPlaceholder(options.placeholderRegex)
        .or(this.page.getByRole('combobox', { name: options.labelRegex }))
        .first();
    }

    await lookup.waitFor({ state: 'visible', timeout: 20000 });
    await lookup.scrollIntoViewIfNeeded();
    await lookup.click();
    await lookup.fill(options.searchText);
    await this.page.waitForTimeout(1500);

    await this.pickLookupSearchResult(options.pickOptionMatching);
    logger.info(`SF-977 UI: set lookup (${options.labelRegex}) → "${options.pickOptionMatching}"`);
  }

  private async pickLookupSearchResult(pickOptionMatching: string): Promise<void> {
    const escaped = pickOptionMatching.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'i');

    let optionClicked = false;
    const roleOption = this.page.getByRole('option', { name: re }).first();
    if (await roleOption.isVisible({ timeout: 8000 }).catch(() => false)) {
      await roleOption.click();
      optionClicked = true;
    }
    if (!optionClicked) {
      const item = this.page
        .locator('lightning-base-combobox-item, [role="option"]')
        .filter({ hasText: re })
        .first();
      if (await item.isVisible({ timeout: 5000 }).catch(() => false)) {
        await item.click();
        optionClicked = true;
      }
    }
    if (!optionClicked) {
      throw new Error(
        `SF-977 UI lookup: no option matching "${pickOptionMatching}" after search.`
      );
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    await this.page.waitForTimeout(500);
  }

  /**
   * Product lookup — QA: only `test` is valid in the target org for now.
   * Prefers `Product__c` (lightning-input-field) per Product_Map__c layout API names.
   */
  async fillProductLookupAllowedForQa(productLabel: string = uiAllowedProductFromEnv()): Promise<void> {
    assertSf977UiProductAllowed(productLabel);
    const scope = this.formScope();
    await scope.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const api = productLookupFieldApi();
    try {
      await this.fillLookupViaFieldApi(scope, api, productLabel, productLabel);
      logger.info(`SF-977 UI: set Product (${api}) → "${productLabel}"`);
      return;
    } catch (e: unknown) {
      logger.debug(
        `SF-977 UI: Product via ${api} failed (${e instanceof Error ? e.message : String(e)}); trying label/placeholder`
      );
    }
    await this.fillSalesforceLookupInForm({
      labelRegex: /^Product$/i,
      placeholderRegex: /Search Products/i,
      searchText: productLabel,
      pickOptionMatching: productLabel,
    });
  }

  /**
   * Name + Product (QA Actuary: only `test` until catalog expands). Omits SubProduct — not on Actuary layout / FLS in QA.
   */
  async fillNewProductMapMandatoryFieldsForQa(): Promise<void> {
    const product = uiAllowedProductFromEnv();
    assertSf977UiProductAllowed(product);
    const name = process.env.SF977_UI_PRODUCT_MAP_NAME_PREFIX?.trim()
      ? `${process.env.SF977_UI_PRODUCT_MAP_NAME_PREFIX.trim()}_${Date.now()}`
      : `SF977_UI_${Date.now()}`;
    await this.fillProductMapName(name);
    await this.fillProductLookupAllowedForQa(product);
  }

  /**
   * SF-977 UI: set Opportunity lookup on New Product Map (Expansion flow).
   * Search/pick uses the Opportunity Name (seeded via API in the same scenario).
   */
  async fillOpportunityLookupForSf977(opportunityName: string): Promise<void> {
    const scope = this.formScope();
    await scope.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    const api = opportunityLookupFieldApi();
    await this.fillLookupViaFieldApi(scope, api, opportunityName, opportunityName);
    logger.info(`SF-977 UI: set Opportunity (${api}) → "${opportunityName}"`);
  }

  /**
   * Name + Product + Opportunity — Actuary Expansion lifecycle (SF-977 + SF-980 linkage).
   */
  async fillNewProductMapMandatoryFieldsWithExpansionOpportunity(opportunityName: string): Promise<void> {
    const product = uiAllowedProductFromEnv();
    assertSf977UiProductAllowed(product);
    const name = process.env.SF977_UI_PRODUCT_MAP_NAME_PREFIX?.trim()
      ? `${process.env.SF977_UI_PRODUCT_MAP_NAME_PREFIX.trim()}_Exp_${Date.now()}`
      : `SF977_UI_Exp_${Date.now()}`;
    await this.fillProductMapName(name);
    await this.fillProductLookupAllowedForQa(product);
    await this.fillOpportunityLookupForSf977(opportunityName);
  }

  /** Click Save on the active New Product Map modal and wait for the record view. */
  async saveNewProductMapModal(): Promise<void> {
    const dialog = this.page
      .locator('[role="dialog"]')
      .filter({ hasText: /New Product Map|Product Map Name/i })
      .last();
    const save = dialog.getByRole('button', { name: /^Save$/i });
    await save.waitFor({ state: 'visible', timeout: 25000 });
    await save.scrollIntoViewIfNeeded();
    await save.click();
    await this.page.waitForLoadState('domcontentloaded').catch(() => {});
    await this.page
      .locator('[role="dialog"]')
      .filter({ hasText: /New Product Map/i })
      .waitFor({ state: 'hidden', timeout: 120000 })
      .catch(() => {});
    await this.page.waitForURL(/Product_Map/i, { timeout: 120000 });
    await this.page.waitForTimeout(2500);
    logger.info('SF-977 UI: saved New Product Map from modal');
  }

  /** Assert Status (or Product Map Status) on the Product Map record page after save. */
  async expectProductMapRecordPageShowsStatus(expectedStatus: string): Promise<void> {
    const escaped = expectedStatus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped);

    const byFieldLabel = this.page.locator('records-record-layout-item[field-label="Status"]').first();
    if (await byFieldLabel.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(byFieldLabel).toContainText(re, { timeout: 45000 });
      logger.info(`SF-977 UI: Status field shows "${expectedStatus}"`);
      return;
    }

    const bySection = this.page
      .locator('records-record-layout-item')
      .filter({ hasText: /^Status$|Product Map Status/i })
      .first();
    await expect(bySection).toContainText(re, { timeout: 45000 });
    logger.info(`SF-977 UI: record layout shows Status "${expectedStatus}"`);
  }
}
