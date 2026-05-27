#!/usr/bin/env node
/**
 * Quick verification: Create a Non-Member MGA Account via UI
 *
 * Run from your PowerShell terminal:
 *   cd c:\Automation
 *   npx cross-env ENV=qa HEADLESS=false ts-node scripts/test-create-nonmember-mga.ts
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

if (!process.env.ENV) process.env.ENV = 'qa';
const envFile = path.resolve(__dirname, '../src/config/env', `.env.${process.env.ENV}`);
if (fs.existsSync(envFile)) require('dotenv').config({ path: envFile, override: true });

async function run() {
  const ssDir = path.join(__dirname, 'qa-ui-scan-results');
  if (!fs.existsSync(ssDir)) fs.mkdirSync(ssDir, { recursive: true });

  // Force visible mode - this is a manual verification script
  const isHeadless = false;

  console.log(`\n🖥️  Browser mode: VISIBLE (Chrome) - watch the browser window!`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    slowMo: 0,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--ignore-certificate-errors',
      '--start-maximized',
      '--window-position=50,50',
      '--window-size=1400,900',
      '--no-sandbox',
    ],
  });
  const context = await browser.newContext({
    viewport: null,
    ignoreHTTPSErrors: true,
    locale: 'en-US',
  });
  const page = await context.newPage();
  await page.bringToFront();

  try {
    // Step 1: Authenticate as MRD user
    const mrdUser = process.env.SF_QAMRDUSER_JWT_USERNAME || 'qa.mrd.user@accelins.com';
    console.log(`\n🔐 Authenticating as ${mrdUser}...`);
    const { SalesforceUIAuth } = await import('../src/utils/salesforce-auth');
    await SalesforceUIAuth.authenticateWithJWT(page, { username: mrdUser });
    console.log('✅ Authenticated\n');
    await page.bringToFront();

    // Step 2: Navigate via Accelerant Console → Accounts
    console.log('📋 Navigating to Accounts...');
    const { AccountPage } = await import('../src/page-objects/salesforce/AccountPage');
    const accountPage = new AccountPage(page);
    await accountPage.navigateToListView();
    console.log('✅ On Accounts list view\n');
    await page.bringToFront();

    // Step 3: Click New
    console.log('🆕 Clicking New button...');
    await accountPage.clickNew();
    console.log('✅ Account creation form loaded\n');
    await page.bringToFront();

    // Step 4: Fill fields
    const ts = Date.now();
    const accountName = `QA-Member-${ts}`;

    console.log(`📝 Setting Account Name: ${accountName}`);
    await accountPage.setTextField('Account Name', accountName);

    console.log('📝 Setting Type: Member');
    await accountPage.setComboboxField('Type', 'Member');

    // Wait for dependent picklists to refresh after Type change
    console.log('⏳ Waiting 3s for dependent picklists to refresh...');
    await page.waitForTimeout(3000);

    console.log('📝 Setting Account Status: Prospect');
    await accountPage.setComboboxField('Account Status', 'Prospect');

    console.log('📝 Setting Ownership: Independent');
    await accountPage.setComboboxField('Ownership', 'Independent');

    console.log('📝 Setting Affiliate/Non-Affiliate: AFL');
    await accountPage.setComboboxField('Affiliate/Non-Affiliate', 'AFL');

    console.log('   ✅ All fields filled\n');
    await page.screenshot({ path: path.join(ssDir, 'test-member-filled.png'), fullPage: true });

    // Step 5: Save
    console.log('💾 Clicking Save...');
    await accountPage.save();

    // Step 6: Verify result
    await page.waitForTimeout(5000);
    await page.screenshot({ path: path.join(ssDir, 'test-member-result.png'), fullPage: true });

    const currentUrl = page.url();
    const hasError = await page.locator('.forceFormMessageBody, .slds-theme--error').isVisible({ timeout: 2000 }).catch(() => false);

    if (hasError) {
      const errorText = await page.locator('.forceFormMessageBody').textContent().catch(() => 'Unknown');
      console.log(`\n❌ VALIDATION ERROR: ${errorText}`);
      console.log(`   URL: ${currentUrl}`);
    } else if (currentUrl.includes('/view') || (currentUrl.includes('/Account/') && !currentUrl.includes('/new'))) {
      console.log(`\n✅ SUCCESS! Account "${accountName}" created.`);
      console.log(`   URL: ${currentUrl}`);
    } else {
      // Check for toast success message
      const toast = await page.locator('.slds-theme--success, .toastMessage').isVisible({ timeout: 2000 }).catch(() => false);
      if (toast) {
        console.log(`\n✅ SUCCESS! Account "${accountName}" created (toast visible).`);
      } else {
        console.log(`\n⚠️  Uncertain result. URL: ${currentUrl}`);
      }
    }

    console.log('\n📸 Screenshots saved to scripts/qa-ui-scan-results/');

    if (!isHeadless) {
      console.log('\n⏳ Browser stays open for 10 seconds so you can see the result...');
      await page.waitForTimeout(10000);
    }
  } catch (err: any) {
    console.error(`\n❌ FAILED: ${err.message}`);
    await page.screenshot({ path: path.join(ssDir, 'test-member-error.png'), fullPage: true }).catch(() => {});
    if (!isHeadless) {
      console.log('⏳ Browser stays open for 10 seconds...');
      await page.waitForTimeout(10000);
    }
  } finally {
    await browser.close();
  }
}

run();
