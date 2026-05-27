#!/usr/bin/env node

/**
 * Interactive environment selector
 * Prompts user to select an environment and sets ENV variable
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Available environment slugs.
// Convention:
//   qa  → Lloyd's (D365 = accelinsqatest.crm11.dynamics.com) — Stage 1+ Lloyd's automation
//   qa2 → Salesforce (D365 = accelinsqatest2.crm11.dynamics.com, RDM env) — Salesforce automation
// Both share the same QA Salesforce sandbox URL; they differ on the Dynamics org.
const availableEnvs = ['dev', 'qa', 'qa2', 'uat', 'prod', 'sandbox'];

function getAvailableEnvs() {
  const envs = [];
  const configDir = path.join(__dirname, '../src/config/env');
  
  // Check which .env files exist
  availableEnvs.forEach(env => {
    const envFile = path.join(configDir, `.env.${env}`);
    const jsonFile = path.join(configDir, `${env}.json`);
    
    if (fs.existsSync(envFile) || fs.existsSync(jsonFile)) {
      envs.push(env);
    }
  });
  
  return envs.length > 0 ? envs : availableEnvs;
}

function promptEnvironment() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const availableEnvs = getAvailableEnvs();
    
    console.log('\nSelect Environment:');
    console.log('========================================');
    availableEnvs.forEach((env, index) => {
      console.log(`  ${index + 1}. ${env.toUpperCase()}`);
    });
    console.log('========================================\n');

    rl.question('Enter environment number or name (default: qa): ', (answer) => {
      rl.close();
      
      let selectedEnv = answer.trim().toLowerCase();
      
      // If number entered, convert to env name
      const num = parseInt(selectedEnv);
      if (!isNaN(num) && num > 0 && num <= availableEnvs.length) {
        selectedEnv = availableEnvs[num - 1];
      }
      
      // Validate selection
      if (!selectedEnv || !availableEnvs.includes(selectedEnv)) {
        if (!selectedEnv) {
          selectedEnv = 'qa'; // Default
        } else {
          console.log(`[WARN] Invalid environment "${selectedEnv}". Using default: qa`);
          selectedEnv = 'qa';
        }
      }
      
      console.log(`[OK] Selected environment: ${selectedEnv.toUpperCase()}\n`);
      resolve(selectedEnv);
    });
  });
}

// If run directly, prompt and set environment
if (require.main === module) {
  promptEnvironment().then((env) => {
    process.env.ENV = env;
    console.log(`Environment set to: ${env.toUpperCase()}`);
    console.log(`Loading config from: src/config/env/.env.${env} and ${env}.json\n`);
  });
}

module.exports = { promptEnvironment, getAvailableEnvs };

