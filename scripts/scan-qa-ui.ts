#!/usr/bin/env node
/**
 * QA UI Scanner – Discover current selectors on Salesforce QA
 *
 * Follows the real user flow:
 *   Login as MRD → Accelerant Console → Accounts → All Accounts → New
 *
 * Usage:
 *   npm run scan:qa:ui                          # MRD user (default)
 *   npm run scan:qa:ui -- --user admin          # Admin user
 *   npx cross-env ENV=qa HEADLESS=false ts-node scripts/scan-qa-ui.ts  # visible browser
 *
 * Output: scripts/qa-ui-scan-results/account-<timestamp>.json, .txt, .png
 */

import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

if (!process.env.ENV) {
  process.env.ENV = 'qa';
  console.log('⚠️  ENV not set; using qa');
}

const envFilePath = path.resolve(__dirname, '../src/config/env', `.env.${process.env.ENV}`);
if (fs.existsSync(envFilePath)) {
  require('dotenv').config({ path: envFilePath, override: true });
  console.log(`✅ Loaded ${path.basename(envFilePath)}\n`);
}

function resolveUsername(): string {
  const args = process.argv.slice(2);
  const userIdx = args.indexOf('--user');
  const userArg = userIdx !== -1 ? args[userIdx + 1] : undefined;
  const ALIASES: Record<string, string> = {
    mrd:      process.env.SF_QAMRDUSER_JWT_USERNAME || 'qa.mrd.user@accelins.com',
    admin:    process.env.SF_ADMIN_JWT_USERNAME || process.env.SF_JWT_USERNAME || '',
    standard: process.env.SF_STANDARDUSER_JWT_USERNAME || '',
    nonadmin: process.env.SF_NONADMINUSER_JWT_USERNAME || '',
  };
  if (!userArg) return ALIASES.mrd;
  return ALIASES[userArg.toLowerCase()] || userArg;
}

// Collect every interactive element's key attributes from the page
async function collectAllElements(page: Page) {
  return page.evaluate(() => {
    const out: any[] = [];
    const seen = new Set<Element>();

    function grab(el: Element) {
      if (seen.has(el)) return;
      seen.add(el);
      const tag = el.tagName.toLowerCase();
      const rect = el.getBoundingClientRect();
      out.push({
        tag,
        name: el.getAttribute('name') || undefined,
        title: el.getAttribute('title') || undefined,
        text: (el.textContent || '').trim().slice(0, 120),
        role: el.getAttribute('role') || undefined,
        ariaLabel: el.getAttribute('aria-label') || undefined,
        dataField: el.getAttribute('data-field') || undefined,
        type: (el as HTMLInputElement).type || undefined,
        className: (el.className || '').toString().slice(0, 120) || undefined,
        visible: rect.width > 0 && rect.height > 0,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      });
    }

    // Buttons (native + lightning wrappers)
    document.querySelectorAll('button').forEach(grab);
    document.querySelectorAll('lightning-button button, lightning-button-icon button').forEach(grab);

    // Links that might be action buttons
    document.querySelectorAll('a[role="button"], a[data-aura-rendered-by]').forEach(grab);

    // Inputs, comboboxes, textareas (form fields)
    document.querySelectorAll(
      'lightning-input, lightning-combobox, lightning-textarea, lightning-dual-listbox, ' +
      'lightning-grouped-combobox, lightning-lookup, lightning-input-field, lightning-radio-group, ' +
      'input, select, textarea, [role="combobox"], [role="listbox"], [role="textbox"]'
    ).forEach(grab);

    return out;
  });
}

// Extract only form-relevant fields with labels
async function collectFormFields(page: Page) {
  return page.evaluate(() => {
    const out: any[] = [];
    const seen = new Set<string>();

    function addField(el: Element) {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute('role') || undefined;
      const name = el.getAttribute('name') || undefined;
      const dataField = el.getAttribute('data-field')
        || el.closest('[data-field]')?.getAttribute('data-field')
        || undefined;
      const ariaLabel = el.getAttribute('aria-label') || undefined;
      const type = (el as HTMLInputElement).type || undefined;

      // Find label
      let label: string | undefined;
      // Strategy 1: closest form-element label
      const formEl = el.closest('.slds-form-element, lightning-input-field, records-record-layout-item');
      if (formEl) {
        const lbl = formEl.querySelector('label, .slds-form-element__label, span.slds-form-element__label');
        if (lbl) label = (lbl.textContent || '').trim().replace(/\s*\*\s*$/, '').slice(0, 100);
      }
      // Strategy 2: aria-label or label[for]
      if (!label && ariaLabel) label = ariaLabel;
      if (!label && el.id) {
        const l = document.querySelector(`label[for="${el.id}"]`);
        if (l) label = (l.textContent || '').trim().slice(0, 100);
      }
      // Strategy 3: for lightning-input-field, the field-label attribute
      if (!label) {
        const recordItem = el.closest('records-record-layout-item');
        if (recordItem) {
          const fl = recordItem.getAttribute('field-label');
          if (fl) label = fl;
        }
      }

      // Check required
      const required = !!(
        el.hasAttribute('required') ||
        formEl?.querySelector('.slds-required, abbr.slds-required')
      );

      const key = `${label || ''}|${tag}|${name || ''}|${dataField || ''}`;
      if (seen.has(key)) return;
      seen.add(key);

      out.push({ label, tag, role, name, dataField, ariaLabel, type: type || undefined, required });
    }

    // Lightning field components
    document.querySelectorAll(
      'lightning-input, lightning-combobox, lightning-textarea, lightning-dual-listbox, ' +
      'lightning-grouped-combobox, lightning-lookup, lightning-input-field, lightning-radio-group'
    ).forEach(addField);

    // Standard inputs inside the form
    document.querySelectorAll(
      'input[type="text"], input:not([type]), textarea, select, [role="combobox"], [role="textbox"]'
    ).forEach((el) => {
      // Only include elements inside a form or modal
      if (el.closest('lightning-record-edit-form, records-record-layout, section[role="dialog"], .modal-body, force-record-layout')) {
        addField(el);
      }
    });

    return out;
  });
}

async function main() {
  const resultsDir = path.join(__dirname, 'qa-ui-scan-results');
  if (!fs.existsSync(resultsDir)) fs.mkdirSync(resultsDir, { recursive: true });

  const scanUser = resolveUsername();
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  let browser;
  try {
    console.log(`🔐 Authenticating as: ${scanUser}`);
    browser = await chromium.launch({
      channel: 'chrome',
      headless: process.env.HEADLESS !== 'false',
      args: ['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      locale: 'en-US',
    });
    const page = await context.newPage();

    // --- Step 1: Authenticate as MRD user
    const { SalesforceUIAuth } = await import('../src/utils/salesforce-auth');
    await SalesforceUIAuth.authenticateWithJWT(page, { username: scanUser });
    console.log(`✅ Authenticated as ${scanUser}\n`);

    // --- Step 2: Navigate to Accelerant Console → Accounts → All Accounts
    // Use existing page objects so navigation mirrors real tests
    console.log('📋 Step 2: Navigating Accelerant Console → Accounts → All Accounts...');
    const { HomePage } = await import('../src/page-objects/salesforce/HomePage');
    const homePage = new HomePage(page);

    try {
      await homePage.navigateToObjectViaConsoleMenu('Accounts');
      console.log('   ✅ Navigated to Accounts via Console menu');
    } catch (navErr: any) {
      console.log(`   ⚠️ Console menu nav failed (${navErr.message}), falling back to direct URL`);
      const baseUrl = process.env.SF_BASE_URL || '';
      const lightBase = baseUrl.replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');
      await page.goto(`${lightBase}/lightning/o/Account/list`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Select "All Accounts" list view
    console.log('   Selecting "All Accounts" list view...');
    try {
      // Click the list view dropdown (title="Select a List View: Accounts")
      const viewDropdown = page.locator('button[title="Select a List View: Accounts"]').first();
      if (await viewDropdown.isVisible({ timeout: 5000 }).catch(() => false)) {
        await viewDropdown.click();
        await page.waitForTimeout(1500);
      }
      // Click "All Accounts" option
      const allAccounts = page.getByRole('option', { name: 'All Accounts' }).first()
        .or(page.locator('li a span').filter({ hasText: 'All Accounts' }).first());
      if (await allAccounts.isVisible({ timeout: 3000 }).catch(() => false)) {
        await allAccounts.click();
        await page.waitForTimeout(3000);
        console.log('   ✅ Selected "All Accounts"');
      } else {
        // Try clicking text directly
        const allAccountsText = page.getByText('All Accounts', { exact: true }).first();
        if (await allAccountsText.isVisible({ timeout: 2000 }).catch(() => false)) {
          await allAccountsText.click();
          await page.waitForTimeout(3000);
          console.log('   ✅ Selected "All Accounts" (by text)');
        }
      }
    } catch (e: any) {
      console.log(`   ⚠️ Could not select "All Accounts": ${e.message}`);
    }

    // Wait for list to stabilize
    await page.waitForTimeout(2000);

    // --- Step 3: Screenshot the list view
    const listSsPath = path.join(resultsDir, `list-view-${ts}.png`);
    await page.screenshot({ path: listSsPath, fullPage: true });
    console.log(`   📸 List view screenshot: ${listSsPath}`);

    // --- Step 4: Collect all elements on the list view
    console.log('   Collecting list view elements...');
    const listElements = await collectAllElements(page);
    const listUrl = page.url();

    // Find which header selectors are visible
    const headerSelectors: string[] = [];
    for (const sel of ['.forceListViewManagerHeader', '[data-aura-class*="ListViewManager"]', '.slds-page-header', 'header[role="banner"]']) {
      if (await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        headerSelectors.push(sel);
      }
    }

    // --- Step 5: Click the "New" button (top right)
    console.log('\n📝 Step 5: Clicking "New" button to open Account form...');
    let newButtonClicked = false;
    let newButtonInfo = '(not found)';

    // Strategy 1: button[name="New"]
    const newByName = page.locator('button[name="New"]').first();
    if (await newByName.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newByName.click();
      newButtonClicked = true;
      newButtonInfo = 'button[name="New"]';
    }

    // Strategy 2: getByRole button "New"
    if (!newButtonClicked) {
      const newByRole = page.getByRole('button', { name: 'New', exact: true }).first();
      if (await newByRole.isVisible({ timeout: 3000 }).catch(() => false)) {
        await newByRole.click();
        newButtonClicked = true;
        newButtonInfo = 'getByRole("button", { name: "New" })';
      }
    }

    // Strategy 3: Any visible element with just "New" text that looks clickable
    if (!newButtonClicked) {
      const candidates = page.locator('button, a, lightning-button button, [role="button"]').filter({ hasText: /^New$/ });
      const count = await candidates.count();
      for (let i = 0; i < count; i++) {
        const el = candidates.nth(i);
        if (await el.isVisible().catch(() => false)) {
          const href = await el.getAttribute('href').catch(() => null);
          const dataRecId = await el.getAttribute('data-recordid').catch(() => null);
          if (!href && !dataRecId) {
            await el.click();
            newButtonClicked = true;
            const tag = await el.evaluate((e) => e.tagName.toLowerCase());
            newButtonInfo = `${tag}:has-text("New") (nth=${i})`;
            break;
          }
        }
      }
    }

    // Strategy 4: Use AccountPage.clickNew() as ultimate fallback
    if (!newButtonClicked) {
      console.log('   ⚠️ Trying AccountPage.clickNew() fallback...');
      try {
        const { AccountPage } = await import('../src/page-objects/salesforce/AccountPage');
        const accountPage = new AccountPage(page);
        await accountPage.clickNew();
        newButtonClicked = true;
        newButtonInfo = 'AccountPage.clickNew() fallback';
      } catch (e: any) {
        console.log(`   ❌ AccountPage.clickNew() also failed: ${e.message}`);
      }
    }

    console.log(`   New button: ${newButtonClicked ? '✅' : '❌'} ${newButtonInfo}`);

    // --- Step 6: Wait for form to load and scan it
    let hasRecordTypePicker: { options: string[] } | null = null;

    if (newButtonClicked) {
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Check for record type picker
      hasRecordTypePicker = await page.evaluate(() => {
        const rg = document.querySelector('lightning-radio-group, [data-field="RecordTypeId"]');
        if (!rg) return null;
        const options: string[] = [];
        rg.querySelectorAll('input[type="radio"], span.slds-radio__label, label').forEach((opt) => {
          const t = (opt.textContent || '').trim();
          if (t) options.push(t);
        });
        return { options };
      });

      if (hasRecordTypePicker) {
        console.log(`   Record type picker found: ${hasRecordTypePicker.options.join(', ')}`);
        // Click Next to proceed past record type picker
        const nextBtn = page.getByRole('button', { name: 'Next' }).first()
          .or(page.locator('button[title="Next"]').first());
        if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nextBtn.click();
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          await page.waitForTimeout(5000);
          console.log('   ✅ Clicked Next past record type picker');
        }
      }

      // Wait for form to be ready
      await page.waitForTimeout(3000);
    }

    // Screenshot the form
    const formSsPath = path.join(resultsDir, `new-account-form-${ts}.png`);
    await page.screenshot({ path: formSsPath, fullPage: true });
    console.log(`   📸 Form screenshot: ${formSsPath}`);

    // Collect form fields
    console.log('   Collecting form fields...');
    const formFields = await collectFormFields(page);
    const formAllElements = await collectAllElements(page);
    const formUrl = page.url();

    // Check which form containers are visible
    const formContainers: string[] = [];
    for (const sel of [
      'lightning-record-edit-form', 'lightning-record-form', 'force-record-layout',
      'records-record-layout', '[data-aura-class*="forceRecordEdit"]', 'records-record-edit-form',
      '.modal-container', 'section[role="dialog"]', 'div.modal-body',
    ]) {
      if (await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false)) {
        formContainers.push(sel);
      }
    }

    // --- Build scan result
    const scan = {
      user: scanUser,
      capturedAt: new Date().toISOString(),
      listView: {
        url: listUrl,
        headerSelectors,
        allElements: listElements,
        newButton: newButtonInfo,
      },
      newForm: {
        url: formUrl,
        newButtonClicked,
        recordTypePicker: hasRecordTypePicker,
        formContainers,
        fields: formFields,
        allElements: formAllElements,
      },
    };

    // --- Write JSON
    const jsonPath = path.join(resultsDir, `account-${ts}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(scan, null, 2), 'utf8');
    console.log(`\n✅ JSON: ${jsonPath}`);

    // --- Write human-readable report
    const newBtnElements = listElements.filter((e: any) =>
      e.visible && ((e.text || '') === 'New' || e.name === 'New' || (e.title || '') === 'New')
    );
    const lines: string[] = [
      'QA UI Scan – Account (MRD User Flow)',
      '=====================================',
      `User: ${scan.user}`,
      `Captured: ${scan.capturedAt}`,
      '',
      'NAVIGATION',
      '----------',
      `List view URL: ${scan.listView.url}`,
      `Header selectors visible: ${headerSelectors.join(', ') || '(none)'}`,
      '',
      '"NEW" BUTTON',
      '------------',
      `Clicked: ${newButtonClicked ? 'YES' : 'NO'}`,
      `Method: ${newButtonInfo}`,
      `Candidate "New" elements on list view:`,
      ...newBtnElements.map((e: any) => `  - tag=${e.tag} name=${e.name} title=${e.title} text="${e.text}" role=${e.role} class=${(e.className || '').slice(0, 60)}`),
      '',
      'NEW ACCOUNT FORM',
      '-----------------',
      `Form URL: ${scan.newForm.url}`,
      `Record type picker: ${hasRecordTypePicker ? 'YES – ' + hasRecordTypePicker.options.join(', ') : 'No'}`,
      `Form containers: ${formContainers.join(', ') || '(none)'}`,
      `Fields found: ${formFields.length}`,
      '',
      ...formFields.map((f: any) =>
        `  ${f.required ? '*' : ' '} ${(f.label || '???').padEnd(40)} tag=${f.tag.padEnd(22)} name=${(f.name || '').padEnd(20)} data-field=${(f.dataField || '').padEnd(25)} role=${f.role || ''}`
      ),
      '',
      'SCREENSHOTS',
      '-----------',
      `List view: ${listSsPath}`,
      `Form:      ${formSsPath}`,
      '',
      'ANALYSIS',
      '--------',
      newButtonClicked
        ? `✅ "New" button found and clicked via: ${newButtonInfo}`
        : '❌ "New" button NOT found – navigation or permissions issue',
      formFields.length > 0
        ? `✅ ${formFields.length} form fields discovered`
        : '❌ No form fields found – form may not have loaded',
    ];
    const txtPath = path.join(resultsDir, `account-${ts}.txt`);
    fs.writeFileSync(txtPath, lines.join('\n'), 'utf8');
    console.log(`✅ Report: ${txtPath}\n`);

    await browser.close();
    console.log('Done.');
  } catch (err: any) {
    console.error('❌ Scan failed:', err?.message || err);
    if (browser) await browser.close().catch(() => {});
    process.exit(1);
  }
}

main();
