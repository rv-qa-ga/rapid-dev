#!/usr/bin/env node

/**
 * Run tests interactively with Playwright Inspector
 * This enables you to pick locators visually while the test runs
 */

const { spawn } = require('child_process');
const { promptEnvironment } = require('./select-environment');
const path = require('path');
const fs = require('fs');

async function runInteractiveTest() {
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
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const featureFile = args[0] || 'src/features/ui/General/login.feature';
    const tags = args[1] || '@LoginCheck';

    // Set environment variables for interactive mode
    process.env.HEADLESS = 'false';
    process.env.PWDEBUG = '1'; // Enables Playwright Inspector
    
    console.log('🚀 Starting interactive test with Playwright Inspector...');
    console.log(`📁 Feature: ${featureFile}`);
    console.log(`🏷️  Tags: ${tags}`);
    console.log(`🌍 Environment: ${env.toUpperCase()}`);
    console.log('');
    console.log('💡 Playwright Inspector will open automatically');
    console.log('💡 Use the "Pick Locator" button to select elements on the page');
    console.log('💡 The browser will pause at each step for inspection');
    console.log('');

    // Run Cucumber with the feature file
    const cucumber = spawn('npx', [
      'cucumber-js',
      featureFile,
      '--config',
      'cucumber.config.js',
      '--tags',
      tags,
    ], {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });

    cucumber.on('close', (code) => {
      process.exit(code);
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runInteractiveTest();
}

module.exports = { runInteractiveTest };
