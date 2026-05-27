/**
 * Create Sample Account in Salesforce
 * Tests the DEV environment setup by creating a test account
 * 
 * Usage:
 *   ENV=dev npx ts-node scripts/create-sample-account.ts
 */

import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

async function createSampleAccount() {
  const envName = config.getEnvironment();
  console.log(`\n🔧 Environment: ${envName.toUpperCase()}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Authenticate
    console.log('1️⃣  Authenticating with Salesforce...');
    const authResult = await SalesforceJWTAuth.authenticate();
    console.log(`   ✅ Authenticated to: ${authResult.instanceUrl}\n`);

    // Step 2: Create Account
    console.log('2️⃣  Creating sample Account...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const accountName = `MULE-Test Account - Automation Setup ${timestamp}`;
    
    const accountData = {
      Name: accountName,
      Description: `Created by automation framework setup test on ${new Date().toLocaleString()}`,
      Type: 'Prospect',
      Industry: 'Technology',
      Region__c: 'UK'  // Required custom field
    };

    const apiUrl = `${authResult.instanceUrl}/services/data/${config.getSalesforceConfig().apiVersion}/sobjects/Account/`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authResult.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(accountData)
    });

    const result = await response.json() as { success?: boolean; id?: string; errors?: any[] };

    if (response.ok && result.success) {
      console.log(`   ✅ Account created successfully!\n`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`   📋 Account Name: ${accountName}`);
      console.log(`   🆔 Account ID:   ${result.id}`);
      console.log(`   🔗 URL: ${authResult.instanceUrl}/${result.id}`);
      console.log('═══════════════════════════════════════════════════════════\n');
      
      console.log('🎉 DEV environment setup is working correctly!\n');
    } else {
      console.error('   ❌ Failed to create account:');
      console.error(JSON.stringify(result, null, 2));
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(`\n💡 Make sure your .env.${envName} is configured correctly with:`);
    console.error('   - SF_JWT_CLIENT_ID');
    console.error('   - SF_JWT_USERNAME');
    console.error('   - SF_CERT_PATH (pointing to certs/server.key)');
    console.error('   - SF_BASE_URL');
    console.error('   - SF_LOGIN_URL');
    process.exit(1);
  }
}

createSampleAccount();

