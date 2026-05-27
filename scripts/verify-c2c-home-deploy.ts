#!/usr/bin/env ts-node
/**
 * Verify C2C Home FlexiPage content and profile/app overrides in org.
 * Usage: cross-env ENV=c2c ts-node scripts/verify-c2c-home-deploy.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const targetEnv = (process.env.ENV || 'c2c').toLowerCase();
const envFile = path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  process.env.ENV = targetEnv;
}

function apiVersion(): string {
  const raw = process.env.SF_API_VERSION?.trim() || 'v60.0';
  return raw.startsWith('v') ? raw : `v${raw}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function metadataRead(instanceUrl: string, token: string, type: string, names: string[]): Promise<string> {
  const ver = apiVersion().replace(/^v/, '');
  const nameTags = names.map((n) => `<met:fullNames>${escapeXml(n)}</met:fullNames>`).join('');
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header><met:SessionHeader><met:sessionId>${escapeXml(token)}</met:sessionId></met:SessionHeader></soapenv:Header>
  <soapenv:Body><met:readMetadata><met:type>${type}</met:type>${nameTags}</met:readMetadata></soapenv:Body>
</soapenv:Envelope>`;
  const url = `${instanceUrl.replace(/\/$/, '')}/services/Soap/m/${ver}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/xml; charset=UTF-8',
      SOAPAction: 'readMetadata',
    },
    body: envelope,
  });
  return res.text();
}

async function soql(instanceUrl: string, token: string, q: string): Promise<unknown> {
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${apiVersion()}/query?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SOQL failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function main(): Promise<void> {
  const { SalesforceJWTAuth } = await import('../src/utils/jwt-auth');
  const auth = await SalesforceJWTAuth.authenticate();
  console.log(`Org: ${auth.instanceUrl}\n`);

  // 1) Read FlexiPage metadata from org
  console.log('=== FlexiPage metadata (org) ===');
  const flexiNames = ['Home_MRD', 'Home_Admin', 'Home_Standard_User'];
  const flexiXml = await metadataRead(auth.instanceUrl, auth.accessToken, 'FlexiPage', flexiNames);
  for (const name of flexiNames) {
    const block = flexiXml.match(new RegExp(`<fullName>${name}</fullName>[\\s\\S]*?(?=<fullName>|</records>)`, 'i'));
    const hasRapidDev = block?.[0]?.includes('RapidDev: POC') ?? false;
    const hasOld = block?.[0]?.match(/MRD Home|Admin Home|Standard User Home|SF-1093/i);
    console.log(`  ${name}: RapidDev: POC=${hasRapidDev ? 'YES' : 'NO'}${hasOld ? ` (old text still present: ${hasOld[0]})` : ''}`);
  }

  // 2) Recent deploy / setup audit
  console.log('\n=== Recent SetupAuditTrail (FlexiPage / Home) ===');
  try {
    const audit = (await soql(
      auth.instanceUrl,
      auth.accessToken,
      `SELECT Id, Action, Section, Display, CreatedDate, CreatedBy.Name FROM SetupAuditTrail WHERE CreatedDate = LAST_N_DAYS:7 ORDER BY CreatedDate DESC LIMIT 30`
    )) as { records?: Array<{ Action?: string; Section?: string; Display?: string; CreatedDate?: string; CreatedBy?: { Name?: string } }> };
    const hits = (audit.records ?? []).filter((r) => {
      const blob = `${r.Action} ${r.Section} ${r.Display}`.toLowerCase();
      return blob.includes('flexi') || blob.includes('home') || blob.includes('lightning page');
    });
    if (hits.length === 0) {
      console.log('  No FlexiPage/Home audit rows in last 7 days (may require View Setup and Configuration).');
      console.log('  Recent rows (any):');
      for (const r of (audit.records ?? []).slice(0, 5)) {
        console.log(`    ${r.CreatedDate} | ${r.Action} | ${r.Section} | ${r.Display}`);
      }
    } else {
      for (const r of hits.slice(0, 10)) {
        console.log(`  ${r.CreatedDate} | ${r.Action} | ${r.Section} | ${r.Display} | by ${r.CreatedBy?.Name ?? '?'}`);
      }
    }
  } catch (e) {
    console.log(`  SetupAuditTrail query failed: ${e instanceof Error ? e.message : e}`);
  }

  // 3) Deploy requests (Metadata API deploy history via AsyncApexJob won't work - use DeployRequest via tooling if available)
  console.log('\n=== Recent Metadata Deployments (DeployRequest) ===');
  try {
    const deploys = (await soql(
      auth.instanceUrl,
      auth.accessToken,
      `SELECT Id, Status, StartDate, CompletedDate, NumberComponentsDeployed, NumberComponentErrors FROM DeployRequest ORDER BY StartDate DESC LIMIT 5`
    )) as { records?: Array<{ Id?: string; Status?: string; StartDate?: string; CompletedDate?: string; NumberComponentsDeployed?: number; NumberComponentErrors?: number }> };
    for (const d of deploys.records ?? []) {
      console.log(`  ${d.StartDate} | ${d.Status} | deployed=${d.NumberComponentsDeployed} errors=${d.NumberComponentErrors} id=${d.Id}`);
    }
  } catch (e) {
    console.log(`  DeployRequest query failed: ${e instanceof Error ? e.message : e}`);
  }

  // 4) App home overrides via Metadata read on CustomApplication
  console.log('\n=== Sales app Home overrides (metadata) ===');
  const appXml = await metadataRead(auth.instanceUrl, auth.accessToken, 'CustomApplication', ['standard__LightningSales']);
  const overrides = [...appXml.matchAll(/<profileActionOverrides>[\s\S]*?<\/profileActionOverrides>/gi)];
  const homeOverrides = overrides.filter((m) => m[0].includes('standard-home') && m[0].includes('Tab'));
  if (homeOverrides.length === 0) {
    console.log('  WARNING: No profileActionOverrides for standard-home Tab found on Sales app in org!');
  } else {
    for (const block of homeOverrides) {
      const profile = block[0].match(/<profile>([^<]*)<\/profile>/i)?.[1] ?? '?';
      const content = block[0].match(/<content>([^<]*)<\/content>/i)?.[1] ?? '?';
      console.log(`  profile=${profile} → home flexipage=${content}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
