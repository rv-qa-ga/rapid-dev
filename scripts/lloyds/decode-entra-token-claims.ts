/**
 * Fetches an Entra access token (same env as diagnose) and prints decoded JWT claims
 * relevant to Snowflake (roles, aud, appid). Does not print the raw token.
 *
 *   npx cross-env ENV=qa ts-node scripts/lloyds/decode-entra-token-claims.ts
 */

import * as https from 'https';

import {
  loadFinOpsSnowflakeEnv,
  resolveSnowflakeOAuthTokenRequestUrl,
} from '../../src/utils/fowd-agency-xml-compare/snowflake-fetch';

function postForm(url: string, body: string): Promise<{ status: number; text: string }> {
  const u = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: u.hostname,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(Buffer.from(c)));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, text: Buffer.concat(chunks).toString('utf8') });
        });
      },
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function decodeJwtPayload(accessToken: string): Record<string, unknown> {
  const parts = accessToken.split('.');
  if (parts.length < 2) throw new Error('Invalid JWT');
  const payload = parts[1];
  const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  return JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'));
}

function pickClaims(payload: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    'aud',
    'iss',
    'appid',
    'azp',
    'sub',
    'oid',
    'tid',
    'roles',
    'scp',
    'wids',
    'unique_name',
    'upn',
    'preferred_username',
    'name',
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in payload) out[k] = payload[k];
  }
  return out;
}

async function main(): Promise<void> {
  loadFinOpsSnowflakeEnv();
  const clientId = process.env.SNOWFLAKE_CLIENT_ID?.trim();
  const clientSecret = process.env.SNOWFLAKE_CLIENT_SECRET?.trim();
  const role = process.env.SNOWFLAKE_ROLE?.trim() || 'PUBLIC';
  const scope =
    process.env.SNOWFLAKE_OAUTH_SCOPE?.trim()
    || `session:role:${role}`;

  if (!clientId || !clientSecret) {
    console.error('Set SNOWFLAKE_CLIENT_ID and SNOWFLAKE_CLIENT_SECRET in .env.qa');
    process.exit(1);
  }

  const tokenUrl = resolveSnowflakeOAuthTokenRequestUrl();
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  }).toString();

  console.log(`Token URL: ${tokenUrl}`);
  console.log(`Scope:     ${scope}\n`);

  const { status, text } = await postForm(tokenUrl, body);
  if (status < 200 || status >= 300) {
    console.error(`HTTP ${status}:`, text.slice(0, 2000));
    process.exit(1);
  }

  const j = JSON.parse(text) as { access_token?: string };
  const accessToken = j.access_token;
  if (!accessToken) {
    console.error('No access_token in response');
    process.exit(1);
  }

  const payload = decodeJwtPayload(accessToken);
  const picked = pickClaims(payload);

  console.log('Decoded access_token claims (subset — no raw JWT printed):');
  console.log(JSON.stringify(picked, null, 2));

  const roles = payload.roles;
  if (roles === undefined) {
    console.log('\nNo top-level `roles` array in this access token.');
    console.log(
      'Snowflake may still accept a role via integration config; confirm SNOWFLAKE_ROLE with your Snowflake admin.',
    );
  } else if (Array.isArray(roles) && roles.length > 0) {
    console.log('\nFor SNOWFLAKE_ROLE, try one of these token role strings:');
    for (const r of roles) console.log(`  - ${String(r)}`);
  } else {
    console.log('\n`roles` claim present but empty or non-array.');
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
