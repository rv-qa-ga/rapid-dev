#!/usr/bin/env node

/**
 * Run SF-529 test interactively with Playwright Inspector
 * This enables you to pick locators visually while the test runs
 * 
 * Usage:
 *   npm run test:interactive:sf529
 *   or
 *   node scripts/run-interactive-sf529.js
 */

const { spawn } = require('child_process');
const { promptEnvironment } = require('./select-environment');
const path = require('path');
const fs = require('fs');

async function runInteractiveSF529() {
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
    
    // Set environment variables for interactive mode
    process.env.HEADLESS = 'false';
    process.env.PWDEBUG = '1'; // Enables Playwright Inspector
    process.env.DEBUG = 'pw:api'; // Enable Playwright debug logs
    
    console.log('🚀 Starting interactive test with Playwright Inspector...');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📋 Test: SF-529-001 - Verify Types on the Object field is displayed');
    console.log('🌍 Environment: ' + env.toUpperCase());
    console.log('');
    console.log('💡 Playwright Inspector will open automatically');
    console.log('💡 The browser will pause at each step for inspection');
    console.log('💡 Use the "Pick Locator" button to select elements');
    console.log('💡 Focus on the Edit button selector when it fails');
    console.log('');
    console.log('📝 Steps that will run:');
    console.log('   1. Authenticate with Salesforce');
    console.log('   2. Create test Account via API');
    console.log('   3. Navigate to Account record');
    console.log('   4. Verify Type field is visible');
    console.log('   5. Click Edit button (THIS IS WHERE WE NEED THE SELECTOR)');
    console.log('');
    console.log('⏳ Starting test...\n');

    // Run Cucumber with the specific tag
    const cucumber = spawn('npx', [
      'cucumber-js',
      '--tags', '@SF-529-001',
      '--config', 'cucumber.config.js',
    ], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    cucumber.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Test completed!');
      } else {
        console.log('\n⚠️  Test ended (this is expected if you stopped it manually)');
      }
      process.exit(code);
    });

    cucumber.on('error', (error) => {
      console.error(`❌ Error running test: ${error.message}`);
      process.exit(1);
    });

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  runInteractiveSF529();
}

module.exports = { runInteractiveSF529 };

