#!/usr/bin/env ts-node
/**
 * Read-only Salesforce connectivity check for c2c (.env.c2c).
 * Usage: cross-env ENV=c2c ts-node scripts/c2c-sf-connectivity-check.ts
 */

const targetEnv = (process.env.ENV || 'c2c').toLowerCase();

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const envFile = path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  process.env.ENV = targetEnv;
  console.log(`Loaded: src/config/env/.env.${targetEnv}\n`);
} else {
  console.error(`Missing ${envFile}`);
  process.exit(1);
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(` Salesforce connectivity check (read-only) — ENV=${targetEnv}`);
  console.log(` SF_BASE_URL=${process.env.SF_BASE_URL || '(unset)'}`);
  console.log(` SF_JWT_USERNAME=${process.env.SF_JWT_USERNAME || process.env.SF_USERNAME || '(unset)'}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  const { SalesforceJWTAuth } = await import('../src/utils/jwt-auth');
  const clientId = process.env.SF_JWT_CLIENT_ID || process.env.SF_CLIENT_ID;
  const username = process.env.SF_JWT_USERNAME || process.env.SF_USERNAME;
  const certPath = process.env.SF_CERT_PATH || 'certs/server.key';

  if (!clientId || !username) {
    console.error('FAIL: SF_CLIENT_ID and SF_JWT_USERNAME required in .env.c2c');
    process.exit(1);
  }

  const certFullPath = path.resolve(process.cwd(), certPath);
  if (!fs.existsSync(certFullPath) && !process.env.SF_PRIVATE_KEY) {
    console.error(`FAIL: Private key not found at ${certFullPath} (set SF_PRIVATE_KEY or place key at SF_CERT_PATH)`);
    process.exit(1);
  }

  try {
    const auth = await SalesforceJWTAuth.authenticate();
    const apiVersion = process.env.SF_API_VERSION || 'v60.0';
    const soql = encodeURIComponent('SELECT Id, Name, OrganizationType, IsSandbox FROM Organization LIMIT 1');
    const url = `${auth.instanceUrl}/services/data/${apiVersion}/query?q=${soql}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: 'application/json' },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`FAIL API read: HTTP ${res.status} — ${text.slice(0, 300)}`);
      process.exit(1);
    }

    const body = (await res.json()) as {
      totalSize?: number;
      records?: Array<{ Name?: string; OrganizationType?: string; IsSandbox?: boolean }>;
    };
    const org = body.records?.[0];
    const expectedHost = (process.env.SF_BASE_URL || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    const actualHost = auth.instanceUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

    console.log('PASS: Salesforce JWT authentication');
    console.log(`  User:           ${username}`);
    console.log(`  Instance URL:   ${auth.instanceUrl}`);
    console.log(`  Org name:       ${org?.Name ?? '(unknown)'}`);
    console.log(`  Org type:       ${org?.OrganizationType ?? '(unknown)'}`);
    console.log(`  Is sandbox:     ${org?.IsSandbox ?? '(unknown)'}`);
    console.log(`  Configured URL: ${process.env.SF_BASE_URL || 'n/a'}`);
    console.log(`  URL match:      ${actualHost === expectedHost ? 'YES' : `NO (got ${actualHost})`}`);
    console.log('\nSummary: Salesforce connectivity OK for c2c. No records created.');
    process.exit(0);
  } catch (e: unknown) {
    console.error(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
