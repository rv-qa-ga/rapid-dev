/**
 * SF-1159 — UI smoke: Setup → Custom Metadata Types → Dataverse_Mapping__mdt records.
 * Reuses authenticated Playwright page from authentication.steps.ts.
 */
import { expect, type FrameLocator, type Page } from '@playwright/test';
import { Then, When } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { config } from '../../../config/config';
import { logger } from '../../../utils/logger';

function toSetupBaseUrl(instanceUrl: string): string {
  let u = instanceUrl.replace(/\/$/, '');
  if (u.includes('.lightning.force.com')) {
    u = u.replace('.lightning.force.com', '.my.salesforce.com');
  }
  if (u.includes('.my.salesforce.com')) {
    return u.replace('.my.salesforce.com', '.my.salesforce-setup.com');
  }
  return u;
}

function resolveInstanceUrl(world: AutomationWorld): string {
  const raw =
    process.env.SF_INSTANCE_URL?.trim() ||
    process.env.SALESFORCE_INSTANCE_URL?.trim() ||
    (world.testContext.instanceUrl as string | undefined)?.trim() ||
    config.getSalesforceConfig().baseUrl?.trim() ||
    '';
  if (!raw) {
    throw new Error(
      'SF-1159 UI: Cannot resolve instance URL (SF_INSTANCE_URL / SALESFORCE_INSTANCE_URL / config.baseUrl).'
    );
  }
  return raw;
}

const SETUP_IFRAME_SELECTOR =
  'iframe[name^="setupFrame"], iframe#setupFrame, iframe[title*="Setup"]';

function setupFrame(page: Page): FrameLocator {
  return page.frameLocator(SETUP_IFRAME_SELECTOR);
}

/**
 * Setup / Custom Metadata content usually renders inside a Setup iframe.
 */
async function expectTextVisibleOnPageOrInSetupFrame(
  page: Page,
  pattern: RegExp,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const frame = setupFrame(page);
  const inFrame = frame.getByText(pattern).first();
  const inPage = page.getByText(pattern).first();
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      if (await inFrame.isVisible({ timeout: 1500 }).catch(() => false)) return;
      if (await inPage.isVisible({ timeout: 1500 }).catch(() => false)) return;
    } catch (e) {
      lastError = e;
    }
    await page.waitForTimeout(400);
  }
  throw new Error(
    `Expected text matching ${pattern} in main page or Setup iframe within ${timeoutMs}ms` +
      (lastError instanceof Error ? `: ${lastError.message}` : '')
  );
}

async function clickLinkInSetupIfVisible(page: Page, pattern: RegExp): Promise<boolean> {
  const frame = setupFrame(page);
  const link = frame.getByRole('link', { name: pattern }).first();
  if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
    await link.click();
    await page.waitForTimeout(1000);
    return true;
  }
  const text = frame.getByText(pattern).first();
  if (await text.isVisible({ timeout: 3000 }).catch(() => false)) {
    await text.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

When('I navigate to Salesforce Setup Custom Metadata Types page', async function (this: AutomationWorld) {
  const setupBase = toSetupBaseUrl(resolveInstanceUrl(this));
  const url = `${setupBase}/lightning/setup/CustomMetadata/page`;
  logger.info(`SF-1159 UI: Opening Custom Metadata Types setup: ${url}`);
  await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
});

Then('I should see the Salesforce Custom Metadata setup experience', async function (this: AutomationWorld) {
  const url = this.page.url();
  expect(
    url,
    'Expected Custom Metadata Setup URL (salesforce-setup.com .../CustomMetadata/)'
  ).toMatch(/CustomMetadata|setupid=CustomMetadata|salesforce-setup\.com/i);

  await expectTextVisibleOnPageOrInSetupFrame(this.page, /Custom Metadata Types/i, 90000);

  logger.info('SF-1159 UI: Custom Metadata Types setup page rendered.');
});

When(
  'I open Dataverse Mapping manage records from Custom Metadata Types',
  async function (this: AutomationWorld) {
    const openedType = await clickLinkInSetupIfVisible(this.page, /^Dataverse Mapping$/i);
    if (!openedType) {
      const fallback = await clickLinkInSetupIfVisible(this.page, /Dataverse Mapping/i);
      if (!fallback) {
        throw new Error(
          'SF-1159 UI: Could not find "Dataverse Mapping" on Custom Metadata Types page. ' +
            'Confirm Dataverse_Mapping__mdt is deployed in this org.'
        );
      }
    }

    const openedRecords = await clickLinkInSetupIfVisible(this.page, /Manage Records/i);
    if (!openedRecords) {
      throw new Error(
        'SF-1159 UI: Opened Dataverse Mapping type but "Manage Records" was not available.'
      );
    }

    await this.page.waitForTimeout(1000);
    logger.info('SF-1159 UI: Opened Dataverse Mapping manage records from Custom Metadata Types.');
  }
);

Then(
  'I should see functional_currency__c mappings on the Dataverse Mapping records page',
  async function (this: AutomationWorld) {
    await expectTextVisibleOnPageOrInSetupFrame(this.page, /functional_currency__c/i, 90000);
    await expectTextVisibleOnPageOrInSetupFrame(this.page, /\baccount\b/i, 30000);
    logger.info('SF-1159 UI: functional_currency__c Account mappings visible on Dataverse Mapping records.');
  }
);

Then('I should see setup content mentioning {string}', async function (this: AutomationWorld, fragment: string) {
  const needle = fragment.trim();
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expectTextVisibleOnPageOrInSetupFrame(this.page, new RegExp(escaped, 'i'), 90000);
  logger.info(`SF-1159 UI: Visible content mentions "${needle}".`);
});
