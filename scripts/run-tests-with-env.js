#!/usr/bin/env node

/**
 * Run tests with environment selection
 * Prompts for environment, loads config, then runs tests
 */

const { spawnSync } = require('child_process');
const { promptEnvironment } = require('./select-environment');
const path = require('path');
const fs = require('fs');

async function runTests() {
  try {
    // Check if ENV is already set (e.g., from command line)
    let env = process.env.ENV;
    
    // If not set, prompt for environment
    if (!env) {
      env = await promptEnvironment();
    } else {
      env = env.toLowerCase();
      console.log(`[OK] Using environment from ENV variable: ${env.toUpperCase()}\n`);
    }
    
    // Set environment variable
    process.env.ENV = env;

    // Caller wins over .env for headed debugging (.env.qa often has HEADLESS=true)
    const headlessFromShell =
      process.env.HEADLESS !== undefined && process.env.HEADLESS !== ''
        ? process.env.HEADLESS
        : undefined;
    
    // Load environment-specific .env file
    const envFile = path.join(__dirname, '../src/config/env', `.env.${env}`);
    if (fs.existsSync(envFile)) {
      console.log(`[LOAD] Loading environment variables from: src/config/env/.env.${env}`);
      // Load dotenv
      require('dotenv').config({ path: envFile, override: true });
      if (headlessFromShell !== undefined) {
        process.env.HEADLESS = headlessFromShell;
        console.log(`[LOAD] HEADLESS kept from shell/environment: ${headlessFromShell}`);
      }
    } else {
      console.log(`[WARN] Environment file not found: ${envFile}`);
      console.log(`   Using default .env file if available\n`);
    }
    
    // Get test command from arguments
    let testCommand = process.argv.slice(2);
    
    // Build cucumber command
    const cucumberArgs = ['cucumber-js'];
    
    // Remove duplicate --tags arguments and collect all tag values
    const tagValues = [];
    const featurePaths = [];
    const otherArgs = [];
    let hasTagsFlag = false;
    /** If caller passes `--config <file>`, use it instead of the default cucumber.config.* */
    let userCucumberConfig = null;
    
    // First pass: collect all tag values and feature paths
    for (let i = 0; i < testCommand.length; i++) {
      const arg = testCommand[i];
      
      // Handle --tags flag
      if (arg === '--tags' || arg === '--tag') {
        hasTagsFlag = true;
        // If next argument exists and is a tag expression, collect it.
        // Allow (@foo or @bar), not just @foo — compound expressions start with '('.
        if (i + 1 < testCommand.length) {
          const nextArg = testCommand[i + 1];
          const isAnotherFlag = nextArg.startsWith('--');
          const isFeaturePath = nextArg.endsWith('.feature');
          if (nextArg && !isAnotherFlag && !isFeaturePath) {
            const tagValue = nextArg.replace(/^['"]|['"]$/g, '');
            tagValues.push(tagValue);
            i++;
          }
        }
        // Skip --tags flags (don't add to otherArgs)
        continue;
      } 
      // Collect standalone tag values (arguments starting with @)
      else if (arg.startsWith('@')) {
        // Remove quotes if present
        const tagValue = arg.replace(/^['"]|['"]$/g, '');
        tagValues.push(tagValue);
        hasTagsFlag = true;
      }
      // Collect feature file paths
      else if (arg.endsWith('.feature')) {
        featurePaths.push(arg);
      }
      // Cucumber config override: --config path/to/cucumber.config.js
      else if (arg === '--config') {
        if (i + 1 < testCommand.length) {
          userCucumberConfig = testCommand[i + 1];
          i++;
        }
      }
      // Collect other arguments to preserve them
      else {
        // Skip arguments that are just tag values in quotes
        if (!arg.match(/^['"]@.*['"]$/)) {
          otherArgs.push(arg);
        }
      }
    }
    
    // Check if specific feature file paths are provided (not directories)
    const hasSpecificFeatureFiles = featurePaths.length > 0 && featurePaths.some(path => path.endsWith('.feature'));
    
    // If no arguments, run all tests
    if (testCommand.length === 0) {
      // Run all features
      cucumberArgs.push('src/features');
    } else {
      // Add feature file paths first
      if (featurePaths.length > 0) {
        cucumberArgs.push(...featurePaths);
      } else if (!hasTagsFlag && tagValues.length === 0) {
        // No tags and no feature paths - run all features
        cucumberArgs.push('src/features');
      }
      
      // Add tags if we have any
      if (tagValues.length > 0) {
        // Combine multiple tags with 'or'
        const combinedTags = tagValues.join(' or ');
        cucumberArgs.push('--tags', combinedTags);
      } else if (hasTagsFlag) {
        // --tags was specified but no tag values - this is an error case
        console.warn('[WARN] --tags specified but no tag values provided');
      }
      
      // Add other arguments (like --config) after tags
      if (otherArgs.length > 0) {
        cucumberArgs.push(...otherArgs);
      }
    }
    
    // Cucumber config: honor explicit --config from argv; otherwise pick a default
    if (userCucumberConfig) {
      cucumberArgs.push('--config', userCucumberConfig);
    } else if (hasSpecificFeatureFiles) {
      cucumberArgs.push('--config', 'cucumber.config.no-paths.js');
    } else {
      cucumberArgs.push('--config', 'cucumber.config.js');
    }
    
    console.log(`[RUN] Running tests with environment: ${env.toUpperCase()}`);
    console.log(`[CMD] Command: npx ${cucumberArgs.join(' ')}\n`);
    
    // Run cucumber with spawnSync so exit codes propagate reliably to callers that use
    // spawnSync (e.g. scripts/lloyds/run-lloyds-e2e-single-repo-then-html.ts).
    // On Windows, use shell: true with properly escaped command to resolve npx.cmd/npx.ps1
    const isWindows = process.platform === 'win32';
    const cucumberEnv = { ...process.env, ENV: env };
    let result;
    if (isWindows) {
      const escapedArgs = cucumberArgs.map((arg) => {
        if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
          return `"${arg.replace(/"/g, '\\"')}"`;
        }
        return arg;
      }).join(' ');
      const command = `npx ${escapedArgs}`;
      result = spawnSync(command, [], {
        stdio: 'inherit',
        shell: true,
        env: cucumberEnv,
      });
    } else {
      result = spawnSync('npx', cucumberArgs, {
        stdio: 'inherit',
        shell: false,
        env: cucumberEnv,
      });
    }

    if (result.error) {
      console.error(`[ERROR] Failed to run test process: ${result.error.message}`);
      if (result.error.code === 'ENOENT') {
        console.error(`[ERROR] npx not found. Make sure Node.js and npm are installed and in your PATH.`);
      }
      process.exit(1);
    }

    const exitCode = result.status === null ? 1 : result.status;
    process.exit(exitCode);
    
  } catch (error) {
    console.error(`[ERROR] Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
