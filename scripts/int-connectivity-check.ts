#!/usr/bin/env ts-node
/**
 * Read-only connectivity check for INT (.env.int).
 * No records created — JWT token, SOQL read, Dynamics WhoAmI, optional MuleSoft token.
 *
 * Usage: cross-env ENV=int ts-node scripts/int-connectivity-check.ts
 *        npm run int:connectivity-check
 */

/** Shell `ENV=int` wins over `ENV=qamerge` inside `.env.int` (common when file was copied from qamerge). */
const targetEnv = (process.env.ENV || 'int').toLowerCase();

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

const envFile = path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  process.env.ENV = targetEnv;
  console.log(`📁 Loaded: src/config/env/.env.${targetEnv} (ENV=${targetEnv})\n`);
} else {
  console.error(`❌ Missing ${envFile}`);
  process.exit(1);
}

type CheckResult = { name: string; ok: boolean; detail: string };

const results: CheckResult[] = [];

function pass(name: string, detail: string): void {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}: ${detail}`);
}

function fail(name: string, detail: string): void {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}: ${detail}`);
}

function skip(name: string, detail: string): void {
  results.push({ name, ok: true, detail: `[SKIP] ${detail}` });
  console.log(`⏭️  ${name}: ${detail}`);
}

async function checkSalesforce(): Promise<void> {
  const { SalesforceJWTAuth } = await import('../src/utils/jwt-auth');
  const clientId = process.env.SF_JWT_CLIENT_ID || process.env.SF_CLIENT_ID;
  const username = process.env.SF_JWT_USERNAME || process.env.SF_USERNAME;
  const baseUrl = process.env.SF_BASE_URL || '';

  if (!clientId || !username) {
    fail('Salesforce JWT', 'SF_JWT_CLIENT_ID and SF_JWT_USERNAME required in .env.int');
    return;
  }

  try {
    const auth = await SalesforceJWTAuth.authenticate();
    const apiVersion = process.env.SF_API_VERSION || 'v59.0';
    const soql = encodeURIComponent('SELECT Id, Name FROM Organization LIMIT 1');
    const url = `${auth.instanceUrl}/services/data/${apiVersion}/query?q=${soql}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.accessToken}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      fail('Salesforce API read', `HTTP ${res.status} — ${text.slice(0, 200)}`);
      return;
    }
    const body = (await res.json()) as { totalSize?: number; records?: Array<{ Name?: string }> };
    const orgName = body.records?.[0]?.Name ?? '(unknown)';
    pass(
      'Salesforce JWT + API read',
      `user=${username}, instance=${auth.instanceUrl}, org=${orgName}, configured base=${baseUrl || 'n/a'}`
    );
  } catch (e: unknown) {
    fail('Salesforce JWT', e instanceof Error ? e.message : String(e));
  }
}

async function checkDynamics(): Promise<void> {
  const { DynamicsAuth } = await import('../src/utils/dynamics-auth');
  const base = process.env.D365_BASE_URL || '';
  const webApi = process.env.D365_WEB_API_BASE_URL || '';

  if (!process.env.D365_CLIENT_ID || !process.env.D365_CLIENT_SECRET || !process.env.D365_SCOPE) {
    fail('Dynamics SPN', 'D365_CLIENT_ID, D365_CLIENT_SECRET, D365_SCOPE required in .env.int');
    return;
  }

  try {
    const auth = await DynamicsAuth.authenticate();
    const whoAmIUrl = `${(webApi || `${base}/api/data/v9.2/`).replace(/\/+$/, '')}/WhoAmI`;
    const res = await fetch(whoAmIUrl, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      fail('Dynamics WhoAmI', `HTTP ${res.status} — ${text.slice(0, 200)}`);
      return;
    }
    const body = (await res.json()) as { UserId?: string; OrganizationId?: string };
    pass(
      'Dynamics SPN + WhoAmI',
      `org=${body.OrganizationId ?? '?'}, user=${body.UserId ?? '?'}, webApi=${whoAmIUrl}`
    );
  } catch (e: unknown) {
    fail('Dynamics SPN', e instanceof Error ? e.message : String(e));
  }
}

async function checkMuleSoft(): Promise<void> {
  const orgId = process.env.MULESOFT_ORG_ID?.trim();
  const envId = process.env.MULESOFT_ENV_ID?.trim();
  const clientId = process.env.MULESOFT_CLIENT_ID?.trim();
  const clientSecret = process.env.MULESOFT_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    skip('MuleSoft', 'MULESOFT_CLIENT_ID / MULESOFT_CLIENT_SECRET not set — optional for Phase A');
    return;
  }

  try {
    const tokenUrl =
      process.env.MULESOFT_TOKEN_URL?.trim() ||
      'https://anypoint.mulesoft.com/accounts/api/v2/oauth2/token';
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!res.ok) {
      fail('MuleSoft OAuth', `HTTP ${res.status}`);
      return;
    }
    pass('MuleSoft OAuth', `token OK (org=${orgId ?? 'n/a'}, env=${envId ?? 'n/a'})`);
  } catch (e: unknown) {
    fail('MuleSoft OAuth', e instanceof Error ? e.message : String(e));
  }
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(` INT connectivity check (read-only) — ENV=${targetEnv}`);
  console.log(` SF_BASE_URL=${process.env.SF_BASE_URL || '(unset)'}`);
  console.log(` D365_BASE_URL=${process.env.D365_BASE_URL || '(unset)'}\n`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await checkSalesforce();
  await checkDynamics();
  await checkMuleSoft();

  console.log('\n═══════════════════════════════════════════════════════════');
  const failedRequired = results.filter(
    (r) => !r.ok && (r.name.includes('Salesforce') || r.name.includes('Dynamics'))
  );
  if (failedRequired.length === 0) {
    console.log(' Summary: Required checks passed (Salesforce + Dynamics). No records created.');
    if (results.some((r) => !r.ok && r.name.includes('MuleSoft'))) {
      console.log(' Note: MuleSoft optional — update INT Mule credentials before Phase B.');
    }
    process.exit(0);
  } else {
    console.log(` Summary: ${failedRequired.length} required check(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
