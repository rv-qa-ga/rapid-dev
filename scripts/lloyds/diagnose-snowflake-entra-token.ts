/**
 * POSTs to the Entra v2.0 token endpoint using the same env as FinOps Snowflake OAuth.
 * Prints HTTP status and JSON body (no secrets) so you can fix invalid_scope / unauthorized_client.
 *
 *   npm run lloyds:snowflake:entra-diagnose
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
  console.log(`Scope:     ${scope}`);
  const { status, text } = await postForm(tokenUrl, body);
  console.log(`HTTP:      ${status}`);
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    console.log('Body:', JSON.stringify(j, null, 2));
  } catch {
    console.log('Body (raw):', text.slice(0, 2000));
  }
  process.exit(status >= 200 && status < 300 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
