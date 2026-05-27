#!/usr/bin/env ts-node
/** Print Salesforce JWT access token for Postman. Usage: ENV=qamerge npx ts-node scripts/postman-sf-jwt-token.ts */
import * as path from 'path';
import * as dotenv from 'dotenv';

const env = (process.env.ENV || 'qamerge').toLowerCase();
dotenv.config({
  path: path.resolve(__dirname, '../src/config/env', `.env.${env}`),
  override: true,
});
process.env.ENV = env;

async function main(): Promise<void> {
  const { SalesforceJWTAuth } = await import('../src/utils/jwt-auth');
  const user = process.env.SF_QAMRDUSER_JWT_USERNAME || process.env.SF_JWT_USERNAME;
  const result = await SalesforceJWTAuth.authenticate(user);
  console.log(JSON.stringify({ access_token: result.accessToken, instance_url: result.instanceUrl }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
