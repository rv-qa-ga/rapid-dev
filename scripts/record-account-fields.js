#!/usr/bin/env node

/**
 * Record Account Field Selectors with Playwright Inspector
 * 
 * This script opens a browser with Playwright Inspector enabled,
 * authenticates with Salesforce, and navigates to Account creation.
 * You can then use the Inspector to pick locators for all fields.
 * 
 * Usage:
 *   npm run record:account:fields
 */

const { chromium } = require('playwright');
const { promptEnvironment } = require('./select-environment');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

async function recordAccountFields() {
  let browser = null;
  let context = null;
  let page = null;

  try {
    // Prompt for environment
    const env = await promptEnvironment();
    process.env.ENV = env;

    // Load environment-specific .env file
    const envFile = path.join(__dirname, '../src/config/env', `.env.${env}`);
    if (fs.existsSync(envFile)) {
      dotenv.config({ path: envFile, override: true });
      console.log(`📁 Loaded environment variables from: src/config/env/.env.${env}\n`);
    }

    const baseUrl = process.env.SF_BASE_URL || 'https://login.salesforce.com';
    const accountNewUrl = `${baseUrl}/lightning/o/Account/new`;

    console.log('🚀 Starting Playwright Inspector for Account Field Recording...');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Enable Inspector mode
    process.env.PWDEBUG = '1';

    // Launch browser
    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    });

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      baseURL: baseUrl,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      ignoreHTTPSErrors: true,
    });

    page = await context.newPage();

    console.log('📋 Instructions:');
    console.log('   1. Playwright Inspector will open automatically');
    console.log('   2. Authenticate with Salesforce (or use existing session)');
    console.log('   3. Navigate to: ' + accountNewUrl);
    console.log('   4. Use the Inspector\'s "Pick Locator" button to select fields:');
    console.log('      - Name field');
    console.log('      - Type field (combobox)');
    console.log('      - Status field (combobox)');
    console.log('      - Any other important fields');
    console.log('   5. Copy the selectors from the Inspector panel');
    console.log('   6. Press Ctrl+C in this terminal when done\n');
    console.log('💡 The Inspector shows the exact selector for each element you click\n');

    // Navigate to login first (user will authenticate)
    console.log('🌐 Opening browser...');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    console.log('\n⏳ Browser is ready. Please:');
    console.log('   1. Authenticate if needed');
    console.log('   2. Navigate to Account creation: ' + accountNewUrl);
    console.log('   3. Use Inspector to pick locators for all fields');
    console.log('   4. Press Ctrl+C when done\n');

    // Keep browser open
    await new Promise(() => {});

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    if (page && !page.isClosed()) {
      console.log('\n⚠️  Browser is still open. Close it manually when done.');
    }
  }
}

// Run if executed directly
if (require.main === module) {
  recordAccountFields().catch((error) => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { recordAccountFields };

