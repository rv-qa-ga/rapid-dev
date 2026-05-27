#!/usr/bin/env ts-node
/**
 * Deploy C2C role-based Home FlexiPages from metadata/c2c/flexipages/.
 * Usage: cross-env ENV=c2c ts-node scripts/deploy-c2c-home-flexipages.ts
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

const targetEnv = (process.env.ENV || 'c2c').toLowerCase();
const envFile = path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  process.env.ENV = targetEnv;
} else {
  console.error(`Missing ${envFile}`);
  process.exit(1);
}

const FLEXIPAGE_DIR = path.resolve(__dirname, '../metadata/c2c/flexipages');
const APP_METADATA = path.resolve(__dirname, '../metadata/c2c/applications/standard__LightningSales.app-meta.xml');
const FLEXIPAGES = [
  'Home_Actuary',
  'Home_Admin',
  'Home_Data_Governance',
  'Home_MRD',
  'Home_Non_Admin_User',
  'Home_Standard_User',
];

function apiVersionTag(): string {
  const raw = process.env.SF_API_VERSION?.trim() || '60.0';
  return raw.startsWith('v') ? raw : `v${raw}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function soapSessionHeader(sessionId: string): string {
  return `<met:SessionHeader><met:sessionId>${escapeXml(sessionId)}</met:sessionId></met:SessionHeader>`;
}

async function metadataSoap(
  instanceUrl: string,
  sessionId: string,
  soapAction: string,
  bodyInner: string
): Promise<string> {
  const ver = apiVersionTag();
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>${soapSessionHeader(sessionId)}</soapenv:Header>
  <soapenv:Body>${bodyInner}</soapenv:Body>
</soapenv:Envelope>`;

  const url = `${instanceUrl.replace(/\/$/, '')}/services/Soap/m/${ver.replace(/^v/, '')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionId}`,
      'Content-Type': 'text/xml; charset=UTF-8',
      SOAPAction: soapAction,
    },
    body: envelope,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Metadata SOAP ${soapAction} failed (${res.status}): ${text.slice(0, 800)}`);
  }
  return text;
}

function parseDeployId(soapResponse: string): string {
  const m =
    soapResponse.match(/<id>([^<]+)<\/id>/i) ||
    soapResponse.match(/<met:id>([^<]+)<\/met:id>/i);
  if (!m?.[1]) {
    throw new Error(`Metadata deploy: no async id in response: ${soapResponse.slice(0, 400)}`);
  }
  return m[1];
}

function parseDeployDone(soapResponse: string): { done: boolean; success: boolean; message: string } {
  const done = /<done>(true|false)<\/done>/i.exec(soapResponse)?.[1] === 'true';
  const success = /<success>(true|false)<\/success>/i.exec(soapResponse)?.[1] === 'true';
  const message =
    soapResponse.match(/<problem>([^<]*)<\/problem>/i)?.[1] ||
    soapResponse.match(/<faultstring>([^<]*)<\/faultstring>/i)?.[1] ||
    '';
  return { done, success, message };
}

function buildDeployZip(pkgRoot: string): string {
  const zipPath = path.join(os.tmpdir(), `c2c-home-flexipages-${Date.now()}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  const entries: string[] = ['package.xml'];
  for (const name of FLEXIPAGES) {
    entries.push(`flexipages/${name}.flexipage-meta.xml`);
  }

  const ps1 = path.join(os.tmpdir(), `c2c-home-zip-${Date.now()}.ps1`);
  const lines = [
    'Add-Type -AssemblyName System.IO.Compression',
    'Add-Type -AssemblyName System.IO.Compression.FileSystem',
    `$zip = '${zipPath.replace(/'/g, "''")}'`,
    `$root = '${pkgRoot.replace(/'/g, "''")}'`,
    '$archive = [System.IO.Compression.ZipFile]::Open($zip, [System.IO.Compression.ZipArchiveMode]::Create)',
  ];
  for (const entry of entries) {
    const src = path.join(pkgRoot, entry.replace(/\//g, path.sep));
    lines.push(
      `[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, '${src.replace(/'/g, "''")}', '${entry}') | Out-Null`
    );
  }
  lines.push('$archive.Dispose()');
  lines.push('[System.IO.Compression.ZipFile]::OpenRead($zip).Entries | ForEach-Object { $_.FullName }');

  fs.writeFileSync(ps1, lines.join('\n'), 'utf8');
  const listing = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1}"`, {
    encoding: 'utf8',
  });
  try {
    fs.unlinkSync(ps1);
  } catch {
    /* ignore */
  }

  const stat = fs.statSync(zipPath);
  if (stat.size < 100) {
    throw new Error(`Deploy zip too small (${stat.size} bytes). Entries: ${listing}`);
  }
  console.log(`Deploy zip (${stat.size} bytes): ${listing.trim().replace(/\r?\n/g, ', ')}`);
  return zipPath;
}

async function main(): Promise<void> {
  console.log(`Deploying ${FLEXIPAGES.length} Home FlexiPages to ENV=${targetEnv}...\n`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c2c-home-deploy-'));
  const pkgRoot = path.join(tmp, 'deploy');
  const flexiDir = path.join(pkgRoot, 'flexipages');
  fs.mkdirSync(flexiDir, { recursive: true });

  const members = FLEXIPAGES.map((n) => `    <members>${n}</members>`).join('\n');
  fs.writeFileSync(
    path.join(pkgRoot, 'package.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
${members}
    <name>FlexiPage</name>
  </types>
  <version>${apiVersionTag().replace(/^v/, '')}</version>
</Package>`
  );

  for (const name of FLEXIPAGES) {
    const src = path.join(FLEXIPAGE_DIR, `${name}.flexipage-meta.xml`);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing flexipage source: ${src}`);
    }
    fs.copyFileSync(src, path.join(flexiDir, `${name}.flexipage-meta.xml`));
  }

  const zipPath = buildDeployZip(pkgRoot);
  const zipB64 = fs.readFileSync(zipPath).toString('base64');

  const { SalesforceJWTAuth } = await import('../src/utils/jwt-auth');
  const auth = await SalesforceJWTAuth.authenticate();
  console.log(`Authenticated: ${auth.instanceUrl}\n`);

  const deployResp = await metadataSoap(
    auth.instanceUrl,
    auth.accessToken,
    'deploy',
    `<met:deploy>
      <met:ZipFile>${zipB64}</met:ZipFile>
      <met:DeployOptions>
        <met:rollbackOnError>true</met:rollbackOnError>
        <met:singlePackage>true</met:singlePackage>
        <met:testLevel>NoTestRun</met:testLevel>
      </met:DeployOptions>
    </met:deploy>`
  );
  const deployId = parseDeployId(deployResp);
  console.log(`Metadata deploy started: id=${deployId}`);

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusResp = await metadataSoap(
      auth.instanceUrl,
      auth.accessToken,
      'checkDeployStatus',
      `<met:checkDeployStatus><met:asyncProcessId>${escapeXml(deployId)}</met:asyncProcessId><met:includeDetails>true</met:includeDetails></met:checkDeployStatus>`
    );
    const st = parseDeployDone(statusResp);
    if (st.done) {
      if (!st.success) {
        console.error(statusResp.slice(0, 2000));
        throw new Error(`Metadata deploy failed: ${st.message || 'see response above'}`);
      }
      console.log('\nPASS: All Home FlexiPages deployed with banner "RapidDev: POC".');
      break;
    }
    if (i % 5 === 0) {
      console.log(`  ...still deploying (${(i + 1) * 2}s)`);
    }
    if (i === 59) {
      throw new Error('Metadata deploy timed out');
    }
  }

  fs.rmSync(tmp, { recursive: true, force: true });
  try {
    fs.unlinkSync(zipPath);
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
