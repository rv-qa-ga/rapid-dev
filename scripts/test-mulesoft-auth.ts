/**
 * Simple script to test MuleSoft authentication
 * Uses QA env by default. Run with: npx ts-node scripts/test-mulesoft-auth.ts
 * Override env: ENV=qa npx ts-node scripts/test-mulesoft-auth.ts
 */

import { MuleSoftAuth } from '../src/utils/mulesoft-auth';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables (same pattern as other scripts: try multiple paths)
const env = process.env.ENV || 'qa';
const envPaths = [
  path.resolve(__dirname, '../src/config/env', `.env.${env}`),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`✅ Loaded environment from: ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

async function testAuthentication() {
  try {
    console.log('\n🔐 Testing MuleSoft Authentication...\n');

    // Check if credentials are set
    const clientId = process.env.MULESOFT_CLIENT_ID;
    const clientSecret = process.env.MULESOFT_CLIENT_SECRET;

    if (!clientId) {
      console.error('❌ MULESOFT_CLIENT_ID is not set in .env file');
      process.exit(1);
    }

    if (!clientSecret) {
      console.error('❌ MULESOFT_CLIENT_SECRET is not set in .env file');
      process.exit(1);
    }

    console.log(`✅ Client ID found: ${clientId.substring(0, 10)}...`);
    console.log(`✅ Client Secret found: ${clientSecret.substring(0, 10)}...\n`);

    // Attempt authentication
    console.log('🔄 Attempting authentication...');
    const authResult = await MuleSoftAuth.authenticate();

    console.log('\n✅ Authentication Successful!');
    console.log(`   Token Type: ${authResult.tokenType}`);
    console.log(`   Expires In: ${authResult.expiresIn} seconds`);
    console.log(`   Access Token: ${authResult.accessToken.substring(0, 20)}...`);
    console.log('\n🎉 MuleSoft authentication is working correctly!\n');

    return authResult;
  } catch (error: any) {
    console.error('\n❌ Authentication Failed!');
    console.error(`   Error: ${error.message}`);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Verify MULESOFT_CLIENT_ID and MULESOFT_CLIENT_SECRET in .env file');
    console.error('   2. Check that the Connected App is active');
    console.error('   3. Verify the Connected App has correct scopes');
    console.error('   4. Check your base URL:');
    console.error('      - EU region (default for QA/TEST): https://eu1.anypoint.mulesoft.com');
    console.error('      - US region: https://anypoint.mulesoft.com');
    console.error('   5. Verify Connected App is in the correct organization\n');
    process.exit(1);
  }
}

// Run the test
testAuthentication().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
