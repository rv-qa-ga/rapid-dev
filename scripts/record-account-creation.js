#!/usr/bin/env node

/**
 * Record Account Creation Flow with Playwright Codegen
 * 
 * This script uses Playwright's built-in codegen command to record interactions.
 * It will open a browser where you can:
 * 1. Authenticate with Salesforce (or use existing session)
 * 2. Navigate to Account creation page
 * 3. Interact with all important fields
 * 4. Copy the generated selectors from the codegen window
 * 
 * Usage:
 *   npm run record:account
 */

const { spawn } = require('child_process');
const { promptEnvironment } = require('./select-environment');
const path = require('path');
const fs = require('fs');

async function recordAccountCreation() {
  try {
    // Prompt for environment
    const env = await promptEnvironment();
    process.env.ENV = env;
    
    // Load environment-specific .env file
    const envFile = path.join(__dirname, '../src/config/env', `.env.${env}`);
    if (fs.existsSync(envFile)) {
      require('dotenv').config({ path: envFile, override: true });
      console.log(`📁 Loaded environment variables from: src/config/env/.env.${env}\n`);
    }

    const baseUrl = process.env.SF_BASE_URL || 'https://login.salesforce.com';
    const accountNewUrl = `${baseUrl}/lightning/o/Account/new`;

    console.log('🚀 Starting Playwright Codegen for Account Creation...');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Instructions:');
    console.log('   1. A browser window will open with Playwright Codegen');
    console.log('   2. Authenticate with Salesforce (or use existing session)');
    console.log('   3. Navigate to: ' + accountNewUrl);
    console.log('   4. Interact with all important fields:');
    console.log('      - Name field');
    console.log('      - Type field (combobox)');
    console.log('      - Status field (combobox)');
    console.log('      - Any other important fields');
    console.log('   5. Watch the Codegen window for generated selectors');
    console.log('   6. Copy the selectors and provide them to update step definitions');
    console.log('   7. Close the browser when done\n');
    console.log('💡 The Codegen window shows the generated Playwright code');
    console.log('💡 Use the "Pick Locator" button to get selectors for specific elements\n');

    // Use Playwright codegen - it will open a browser with recording enabled
    // We'll start from the login URL, user can navigate from there
    const codegen = spawn('npx', [
      'playwright',
      'codegen',
      baseUrl,
      '--target=javascript',
      '--output=scripts/utilities/recorded-account-creation.js'
    ], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    codegen.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Recording completed!');
        console.log('📝 Check scripts/utilities/recorded-account-creation.js for the generated code');
        console.log('💡 Extract selectors from the generated code and provide them for step definition updates');
      } else {
        console.log('\n⚠️  Recording ended');
      }
    });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  recordAccountCreation();
}

module.exports = { recordAccountCreation };

