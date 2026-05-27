/**
 * Get Salesforce Access Token
 * Simple Node.js script to get access token using JWT authentication
 * 
 * Usage:
 *   node -r ts-node/register scripts/get-access-token.ts
 *   ENV=qa node -r ts-node/register scripts/get-access-token.ts
 * 
 * Or use the PowerShell script:
 *   .\scripts\get-access-token.ps1
 */

// This file is a wrapper - the actual implementation is in get-access-token.ts
// Use: node -r ts-node/register scripts/get-access-token.ts
console.log('Please use: node -r ts-node/register scripts/get-access-token.ts');
console.log('Or use the PowerShell script: .\\scripts\\get-access-token.ps1');
process.exit(1);

async function getToken() {
  try {
    console.log('Authenticating with Salesforce using JWT...');
    const authResult = await SalesforceJWTAuth.authenticate();
    
    console.log('\n✅ Authentication successful!\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Access Token:');
    console.log(authResult.accessToken);
    console.log('\nInstance URL:');
    console.log(authResult.instanceUrl);
    console.log('\nToken Type:');
    console.log(authResult.tokenType);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('💡 Copy the Access Token above for use in Postman or API calls\n');
    
    // Also output as JSON for easy parsing
    console.log('\n--- JSON Output (for scripts) ---');
    console.log(JSON.stringify({
      accessToken: authResult.accessToken,
      instanceUrl: authResult.instanceUrl,
      tokenType: authResult.tokenType
    }, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    const envName = process.env.ENV || 'qa';
    console.error(`\n💡 Make sure JWT credentials are configured in src/config/env/.env.${envName}`);
    console.error('   Required variables:');
    console.error('   - SF_JWT_CLIENT_ID (or SF_CLIENT_ID)');
    console.error('   - SF_JWT_USERNAME (or SF_USERNAME)');
    console.error('   - SF_CERT_PATH (defaults to certs/server.key)');
    process.exit(1);
  }
}

getToken();

