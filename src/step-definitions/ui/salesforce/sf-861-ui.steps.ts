/**
 * SF-861 — UI: Opportunity Sub-Type conditional behaviour (Lightning).
 * Reuses FieldRegistry (Opportunity Name, Stage, Close Date, Opportunity Type, Sub Type).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../../hooks/world';
import { FieldRegistry } from '../../../page-objects/salesforce/fields/FieldRegistry';
import { logger } from '../../../utils/logger';
import { getLightningBaseUrl } from '../../../utils/salesforce-lightning-ui';
import {
  SF861_CANONICAL_SUBTYPE_VALUES,
  SF861_STRUCK_OUT_SUBTYPE_VALUES,
} from '../../api/salesforce/sf-861.steps';

function lightningBase(world: AutomationWorld): string {
  return getLightningBaseUrl(world).replace(/\/$/, '');
}

function expansionType(): string {
  return (
    process.env.SF861_EXPANSION_TYPE?.trim() ||
    process.env.SF883_OPPORTUNITY_TYPE?.trim() ||
    process.env.SF977_OPPORTUNITY_TYPE?.trim() ||
    'Expansion'
  );
}

function reg(world: AutomationWorld): FieldRegistry {
  if (!world.page || world.page.isClosed()) throw new Error('SF-861 UI: page not ready.');
  return new FieldRegistry(world.page);
}

async function clickSave(world: AutomationWorld): Promise<void> {
  const page = world.page!;
  const saveBtn = page
    .getByRole('button', { name: 'Save', exact: true })
    .or(page.locator('button[name="SaveEdit"], button[title="Save"]').first());
  await saveBtn.first().click({ timeout: 20000 });
  await page.waitForTimeout(1500);
}

Given('I open the new Opportunity form for SF861 from the test Account', async function (this: AutomationWorld) {
  const accountId = this.testContext.accountId as string;
  if (!accountId) throw new Error('SF-861 UI: no accountId.');
  const page = this.page;
  if (!page) throw new Error('SF-861 UI: log in first (MRD).');
  const base = lightningBase(this);
  const enc = encodeURIComponent(accountId);
  const url = `${base}/lightning/o/Opportunity/new?count=1&useRecordTypeCheck=1&defaultFieldValues=AccountId:${enc}`;
  logger.info(`SF-861 UI: navigating ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
});

When(
  'I fill mandatory SF861 Opportunity fields with Type Expansion and empty Sub-Type',
  async function (this: AutomationWorld) {
    const r = reg(this);
    const name = `SF861_UI_${Date.now()}`;
    this.testContext.sf861UiOppName = name;
    await r.setValue('Opportunity Name', name);
    await r.setValue('Stage', 'Pipeline');
    const close = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
    await r.setValue('Close Date', close);
    await r.setValue('Opportunity Type', expansionType());
    logger.info('SF-861 UI: filled mandatory fields; Sub-Type left empty');
  }
);

When(
  'I fill mandatory SF861 Opportunity fields with Type New Business and empty Sub-Type',
  async function (this: AutomationWorld) {
    const r = reg(this);
    const name = `SF861_UI_NB_${Date.now()}`;
    this.testContext.sf861UiOppName = name;
    await r.setValue('Opportunity Name', name);
    await r.setValue('Stage', 'Pipeline');
    const close = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
    await r.setValue('Close Date', close);
    await r.setValue('Opportunity Type', 'New Business');
  }
);

When(
  'I fill mandatory SF861 Opportunity fields with Type Expansion and Sub-Type {string}',
  async function (this: AutomationWorld, subType: string) {
    const r = reg(this);
    const name = `SF861_UI_EXP_${Date.now()}`;
    this.testContext.sf861UiOppName = name;
    await r.setValue('Opportunity Name', name);
    await r.setValue('Stage', 'Pipeline');
    const close = new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
    await r.setValue('Close Date', close);
    await r.setValue('Opportunity Type', expansionType());
    await r.setValue('Sub Type', subType);
  }
);

// AC3-specific Type-change step removed (story AC3 dropped — the
// "Type Cant be changed" validation rule prevents the mutation entirely).

When('I save the SF861 Opportunity form', async function (this: AutomationWorld) {
  await clickSave(this);
});

Then(
  'I should see an SF861 validation error about Sub Type or required field',
  async function (this: AutomationWorld) {
    const page = this.page!;
    const textLocator = page.getByText(
      /sub\s*[- ]?type|complete these fields|required fields|Review the errors|We hit a snag|cannot save/i
    );
    const vis = await textLocator.first().isVisible({ timeout: 12000 }).catch(() => false);
    expect(vis, 'SF-861 UI: expected validation message about Sub Type / required fields.').toBe(true);
  }
);

Then('the Sub Type control for SF861 should be disabled or read-only', async function (this: AutomationWorld) {
  const page = this.page!;
  const subCombo = page
    .getByRole('combobox', { name: /sub\s*[- ]?type/i })
    .or(page.locator('lightning-combobox').filter({ hasText: /sub\s*[- ]?type/i }).locator('button[role="combobox"]'))
    .first();
  const present = await subCombo.isVisible({ timeout: 12000 }).catch(() => false);
  if (!present) {
    logger.warn('SF-861 UI: Sub Type combobox not visible — treating as hidden/read-only.');
    return;
  }
  const aria = await subCombo.getAttribute('aria-disabled');
  const ariaReadonly = await subCombo.getAttribute('aria-readonly');
  const disabled = aria === 'true' || ariaReadonly === 'true';
  const parent = subCombo.locator('xpath=ancestor::lightning-combobox[1]');
  const parentClass = (await parent.getAttribute('class').catch(() => '')) || '';
  const greyed = /slds-is-disabled|readonly/i.test(parentClass);
  expect(disabled || greyed, 'SF-861 UI: Sub Type should be disabled/read-only when Type ≠ Expansion').toBe(true);
});

// ─── FR2 — Sub-Type empty / no auto-populate when Type is Expansion ────────

When(
  'I select SF861 Opportunity Type Expansion only on the open form',
  async function (this: AutomationWorld) {
    const r = reg(this);
    await r.setValue('Opportunity Type', expansionType());
    await this.page!.waitForTimeout(800);
  }
);

Then(
  'the Sub Type control for SF861 should be empty with no auto-populated value',
  async function (this: AutomationWorld) {
    const page = this.page!;
    const subCombo = page
      .getByRole('combobox', { name: /sub\s*[- ]?type/i })
      .or(
        page
          .locator('lightning-combobox')
          .filter({ hasText: /sub\s*[- ]?type/i })
          .locator('button[role="combobox"]')
      )
      .first();
    expect(
      await subCombo.isVisible({ timeout: 12000 }).catch(() => false),
      'SF-861 UI: Sub Type combobox should be visible when Type=Expansion'
    ).toBe(true);
    const placeholder = ((await subCombo.textContent().catch(() => '')) || '').trim();
    const dataValue = (await subCombo.getAttribute('data-value').catch(() => '')) || '';
    const isEmpty =
      dataValue === '' ||
      /^(--None--|\u2014\s*None\s*\u2014|None|Select an option)$/i.test(placeholder);
    expect(
      isEmpty,
      `SF-861 UI: Sub Type should not be auto-populated; got data-value="${dataValue}", text="${placeholder}"`
    ).toBe(true);
  }
);

// ─── AC4 — Dropdown options match canonical 6, no struck-outs ──────────────

When('I open the SF861 Sub Type dropdown on the open form', async function (this: AutomationWorld) {
  const page = this.page!;
  // Defensive: close any currently-open listbox (e.g. the Type combobox from a prior step)
  // before opening Sub Type, so the scrape can't accidentally pick up another combobox's options.
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(200);

  const subCombo = page
    .getByRole('combobox', { name: /sub\s*[- ]?type/i })
    .or(
      page
        .locator('lightning-combobox')
        .filter({ hasText: /sub\s*[- ]?type/i })
        .locator('button[role="combobox"]')
    )
    .first();
  await subCombo.click({ timeout: 12000 });
  await page.waitForTimeout(400);

  // Capture the Sub Type combobox's controlled listbox id so the scrape can scope to it.
  const controls = await subCombo.getAttribute('aria-controls').catch(() => null);
  this.testContext.sf861SubTypeListboxId = controls?.trim() || undefined;
  logger.info(`SF-861 UI: Sub Type combobox aria-controls="${controls ?? ''}"`);
});

/**
 * Read the options *only* from the Sub Type listbox.
 *
 * Why we scope: a global `div[role="listbox"]` locator picks up any other open
 * combobox panel on the page (Type, Stage, etc.) and bleeds those options into
 * the Sub Type assertion (we hit this on qamerge — "Expansion" / "New Member"
 * leaked in from the Type combobox).
 *
 * Strategy:
 *   1. Prefer aria-controls → the listbox id explicitly owned by the Sub Type combobox.
 *   2. Fallback: containment under the lightning-combobox whose label contains "Sub Type".
 */
async function readSubTypeDropdownOptions(world: AutomationWorld): Promise<string[]> {
  const page = world.page!;
  const listboxId = world.testContext.sf861SubTypeListboxId as string | undefined;

  // Minimal CSS-id escape (Node has no global `CSS.escape`). Lightning ids are usually
  // safe (alphanumerics/hyphens/digits), but escape anyway in case a colon or dot sneaks in.
  const escapeCssId = (s: string): string => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

  let list = listboxId
    ? page.locator(
        `#${escapeCssId(listboxId)} [role="option"], #${escapeCssId(listboxId)} lightning-base-combobox-item`
      )
    : page
        .locator('lightning-combobox')
        .filter({ hasText: /sub\s*[- ]?type/i })
        .locator('div[role="listbox"] [role="option"], div[role="listbox"] lightning-base-combobox-item');

  if ((await list.count()) === 0) {
    // Last-resort fallback: scoped to a Sub Type-anchored combobox container.
    list = page
      .locator('lightning-combobox')
      .filter({ hasText: /sub\s*[- ]?type/i })
      .locator('div[role="listbox"] [role="option"], div[role="listbox"] lightning-base-combobox-item');
  }

  const count = Math.min(await list.count(), 50);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = ((await list.nth(i).innerText().catch(() => '')) || '').trim();
    if (t && !/^--?None--?$/i.test(t) && !/^\u2014\s*None\s*\u2014$/i.test(t)) out.push(t);
  }
  logger.info(`SF-861 UI: Sub Type dropdown options scraped (listboxId=${listboxId ?? 'n/a'}): ${JSON.stringify(out)}`);
  return [...new Set(out)];
}

Then(
  'the SF861 Sub Type dropdown options should match the canonical story list',
  async function (this: AutomationWorld) {
    const opts = await readSubTypeDropdownOptions(this);
    const want = [...SF861_CANONICAL_SUBTYPE_VALUES].sort();
    expect(opts.slice().sort(), `SF-861 UI: dropdown options=${JSON.stringify(opts)}`).toEqual(want);
  }
);

Then(
  'the SF861 Sub Type dropdown should not contain any struck-out values',
  async function (this: AutomationWorld) {
    const opts = await readSubTypeDropdownOptions(this);
    const present = SF861_STRUCK_OUT_SUBTYPE_VALUES.filter((v) => opts.includes(v));
    expect(present, `SF-861 UI: struck-out option(s) still in dropdown: ${present.join(', ')}`).toEqual([]);
  }
);

// ─── Editable post-create — Edit existing Expansion Opp Sub-Type ────────────

Given('I open the SF861 Opportunity record page for editing', async function (this: AutomationWorld) {
  const id = this.testContext.sf861OpportunityId as string;
  if (!id) throw new Error('SF-861 UI: no opportunity id (seed via API Given first).');
  const page = this.page!;
  const base = lightningBase(this);
  const url = `${base}/lightning/r/Opportunity/${id}/edit`;
  logger.info(`SF-861 UI: navigating ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);
});

When(
  'I change SF861 Sub Type on the open form to {string}',
  async function (this: AutomationWorld, newSubType: string) {
    const r = reg(this);
    await r.setValue('Sub Type', newSubType);
    await this.page!.waitForTimeout(500);
  }
);

// Clear Sub Type — used by AC1 (negative save) on the edit form.
When('I clear SF861 Sub Type on the open form', async function (this: AutomationWorld) {
  const page = this.page!;
  const subCombo = page
    .getByRole('combobox', { name: /sub\s*[- ]?type/i })
    .or(
      page
        .locator('lightning-combobox')
        .filter({ hasText: /sub\s*[- ]?type/i })
        .locator('button[role="combobox"]')
    )
    .first();
  await subCombo.click({ timeout: 12000 });
  await page.waitForTimeout(400);
  const noneOption = page
    .locator('div[role="listbox"] [role="option"], div[role="listbox"] lightning-base-combobox-item')
    .filter({ hasText: /^\s*--?None--?\s*$|^\s*\u2014\s*None\s*\u2014\s*$/i })
    .first();
  if (await noneOption.isVisible({ timeout: 4000 }).catch(() => false)) {
    await noneOption.click();
  } else {
    await page.keyboard.press('Escape');
    logger.warn('SF-861 UI: --None-- option not found; sub-type may already be empty.');
  }
  await page.waitForTimeout(400);
});
// "Then the SF861 Opportunity should have Sub-Type ..." is reused from the
// API step file (sf-861.steps.ts); UI scenarios verify the saved value via the
// same API read (sf861OpportunityId is set by the seed Given).
