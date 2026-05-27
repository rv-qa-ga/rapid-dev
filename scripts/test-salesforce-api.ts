/**
 * Test Salesforce API Access
 * Quick script to test if Salesforce API is working and what versions are available
 */

import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { APIRequestContext, chromium } from '@playwright/test';

async function testSalesforceAPI() {
  console.log('🔐 Authenticating with Salesforce...');
  const authResult = await SalesforceJWTAuth.authenticate();
  const instanceUrl = authResult.instanceUrl.replace(/\/$/, '');
  const accessToken = authResult.accessToken;

  console.log(`✅ Authenticated`);
  console.log(`   Instance URL: ${instanceUrl}`);
  console.log(`   Access Token: ${accessToken.substring(0, 20)}...\n`);

  // Initialize Playwright API context
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const apiContext = context.request;

  // Test 1: List available API versions
  console.log('📋 Test 1: Listing available API versions...');
  try {
    const versionsUrl = `${instanceUrl}/services/data/`;
    const response = await apiContext.get(versionsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (response.ok()) {
      const versions = await response.json();
      console.log(`✅ Available API versions:`);
      if (Array.isArray(versions)) {
        versions.forEach((v: any) => {
          console.log(`   - ${v.version} (${v.label})`);
        });
      } else {
        console.log(`   Response: ${JSON.stringify(versions, null, 2)}`);
      }
    } else {
      console.log(`❌ Failed to get versions: ${response.status()} ${response.statusText()}`);
      const text = await response.text();
      console.log(`   Response: ${text}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n');

  // Test 2: Try to query Account
  console.log('📋 Test 2: Testing Account query with different API versions...');
  const testVersions = ['60.0', '59.0', '58.0', '57.0', '56.0'];
  const accountId = '001UF00000TMXB7YAP';
  
  for (const version of testVersions) {
    try {
      const queryUrl = `${instanceUrl}/services/data/v${version}/query/?q=${encodeURIComponent(`SELECT Id, Name FROM Account WHERE Id = '${accountId}' LIMIT 1`)}`;
      console.log(`   Trying v${version}...`);
      const response = await apiContext.get(queryUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`   ✅ v${version} works! Found ${result.totalSize} record(s)`);
        if (result.records && result.records.length > 0) {
          console.log(`   Account: ${JSON.stringify(result.records[0], null, 2)}`);
        }
        break;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ v${version} failed: ${response.status()} - ${errorText.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.log(`   ❌ v${version} error: ${error.message}`);
    }
  }

  // Test 3: Try REST API endpoint
  console.log('\n📋 Test 3: Testing REST API endpoint...');
  for (const version of testVersions) {
    try {
      const restUrl = `${instanceUrl}/services/data/v${version}/sobjects/Account/${accountId}`;
      console.log(`   Trying v${version} REST endpoint...`);
      const response = await apiContext.get(restUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok()) {
        const result = await response.json();
        console.log(`   ✅ v${version} REST endpoint works!`);
        console.log(`   Account: ${JSON.stringify(result, null, 2)}`);
        break;
      } else {
        const errorText = await response.text();
        console.log(`   ❌ v${version} REST failed: ${response.status()} - ${errorText.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.log(`   ❌ v${version} REST error: ${error.message}`);
    }
  }

  await browser.close();
}

testSalesforceAPI().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
