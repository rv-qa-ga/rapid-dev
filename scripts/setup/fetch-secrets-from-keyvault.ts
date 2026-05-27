#!/usr/bin/env ts-node

/**
 * Fetch shared automation secrets from Azure Key Vault and write to .env.qa
 *
 * Use this when the team stores SPN/client secrets in Key Vault and each
 * developer has Azure AD access (same group as automation team). They run
 * this once after `az login` to populate src/config/env/.env.qa without
 * ever seeing the secret in plain text.
 *
 * Prerequisites:
 *   1. Azure Key Vault with secrets (e.g. D365-CLIENT-SECRET, SQLSERVER-CLIENT-SECRET)
 *   2. Automation team's Azure AD group has "Key Vault Secrets User" on the vault
 *   3. Developer has run: az login
 *
 * Optional: Install Azure SDK (if not already present):
 *   npm install @azure/keyvault-secrets @azure/identity
 *
 * Required env (set before running, or in a one-off .env.setup):
 *   KEY_VAULT_URL=https://your-vault.vault.azure.net
 *
 * Optional:
 *   KEY_VAULT_SECRETS=secret1,secret2,...  (default: list below)
 *   ENV=qa  (default: qa → writes .env.qa)
 *   KEY_VAULT_OVERWRITE=1  (replace entire .env file — default is merge: only update KV-backed keys)
 *
 * Usage:
 *   KEY_VAULT_URL=https://myvault.vault.azure.net npx ts-node scripts/setup/fetch-secrets-from-keyvault.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

const KEY_VAULT_URL = process.env.KEY_VAULT_URL;
const ENV_NAME = process.env.ENV || 'qa';

// Secret names in Key Vault → env var name (if different). Use same as env.sample when possible.
const DEFAULT_SECRET_MAP: Record<string, string> = {
  'D365-CLIENT-ID': 'D365_CLIENT_ID',
  'D365-CLIENT-SECRET': 'D365_CLIENT_SECRET',
  'D365-TENANT-ID': 'D365_TENANT_ID',
  'D365-SCOPE': 'D365_SCOPE',
  'SQLSERVER-CLIENT-ID': 'SQLSERVER_CLIENT_ID',
  'SQLSERVER-CLIENT-SECRET': 'SQLSERVER_CLIENT_SECRET',
  'SQLSERVER-TENANT-ID': 'SQLSERVER_TENANT_ID',
  'SQLSERVER-HOST': 'SQLSERVER_HOST',
  'MULESOFT-CLIENT-ID': 'MULESOFT_CLIENT_ID',
  'MULESOFT-CLIENT-SECRET': 'MULESOFT_CLIENT_SECRET',
};

/** Node (e.g. ts-node from Cursor) often inherits a PATH without Azure CLI. Prepend standard install dirs. */
function prependAzureCliToPath(): void {
  const extra = process.env.AZURE_CLI_WBIN;
  if (extra && fs.existsSync(extra)) {
    process.env.PATH = `${extra}${path.delimiter}${process.env.PATH || ''}`;
    return;
  }
  const roots =
    process.platform === 'win32'
      ? [
          String.raw`C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin`,
          String.raw`C:\Program Files (x86)\Microsoft SDKs\Azure\CLI2\wbin`,
        ]
      : ['/opt/az/bin', '/usr/local/az/bin'];
  for (const wbin of roots) {
    if (!fs.existsSync(wbin)) continue;
    const azCmd = path.join(wbin, process.platform === 'win32' ? 'az.cmd' : 'az');
    if (fs.existsSync(azCmd) || fs.existsSync(path.join(wbin, 'az'))) {
      process.env.PATH = `${wbin}${path.delimiter}${process.env.PATH || ''}`;
      return;
    }
  }
}

/** Match `KEY=value` or `export KEY=value` (single-line assignments only). */
const ENV_ASSIGN_RE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

const KV_SECTION_HEAD = '# Key Vault secrets (updated by fetch-secrets-from-keyvault — do not commit)';

/**
 * Drop lines that assign any key in `keys`, our prior KV banner line, then append `newBlock`.
 */
function mergeEnvFile(existing: string, keys: Set<string>, newBlock: string): string {
  const kept = existing.split(/\r?\n/).filter((line) => {
    if (line.trim() === KV_SECTION_HEAD) return false;
    const m = line.match(ENV_ASSIGN_RE);
    return !m || !keys.has(m[1]);
  });
  const body = kept.join('\n').replace(/\s+$/, '');
  if (!body) return newBlock.trimStart() + '\n';
  return `${body}\n\n${newBlock}\n`;
}

function assertAzureCliAvailable(): void {
  prependAzureCliToPath();
  const shell = process.platform === 'win32';
  const r = shell
    ? spawnSync('where az', { encoding: 'utf-8', shell: true })
    : spawnSync('which', ['az'], { encoding: 'utf-8' });
  const ok = r.status === 0 && (r.stdout || '').trim().length > 0;
  if (!ok) {
    console.error('❌ Azure CLI (az) not found on PATH for this Node process.');
    console.error('   Fix: Install Azure CLI, then either:');
    console.error('   • Run fetch from Windows Terminal / PowerShell where `az` works, or');
    console.error('   • Set AZURE_CLI_WBIN to your CLI wbin folder (e.g. C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin), or');
    console.error('   • Add that folder to your user/system PATH and restart Cursor.');
    console.error('   Then: az login');
    process.exit(1);
  }
}

async function main() {
  if (!KEY_VAULT_URL) {
    console.error('❌ KEY_VAULT_URL is required. Example: KEY_VAULT_URL=https://myvault.vault.azure.net');
    process.exit(1);
  }

  assertAzureCliAvailable();

  let SecretClient: any;
  let AzureCliCredential: any;
  try {
    const kv = require('@azure/keyvault-secrets');
    const id = require('@azure/identity');
    SecretClient = kv.SecretClient;
    AzureCliCredential = id.AzureCliCredential;
  } catch {
    console.error('❌ Azure SDK not found. Install with:');
    console.error('   npm install @azure/keyvault-secrets @azure/identity');
    process.exit(1);
  }

  const secretList = process.env.KEY_VAULT_SECRETS
    ? process.env.KEY_VAULT_SECRETS.split(',').map((s) => s.trim())
    : Object.keys(DEFAULT_SECRET_MAP);

  console.log('\n🔐 Fetching secrets from Azure Key Vault...');
  console.log(`   Vault: ${KEY_VAULT_URL}`);
  console.log(`   Target: src/config/env/.env.${ENV_NAME}\n`);

  const credential = new AzureCliCredential();
  const client = new SecretClient(KEY_VAULT_URL, credential);

  const lines: string[] = [];
  const updatedKeys = new Set<string>();
  for (const secretName of secretList) {
    try {
      const secret = await client.getSecret(secretName);
      const value = secret.value;
      if (value == null) continue;
      const envVar = DEFAULT_SECRET_MAP[secretName] || secretName.replace(/-/g, '_');
      updatedKeys.add(envVar);
      lines.push(`${envVar}=${value}`);
      console.log(`   ✅ ${secretName} → ${envVar}`);
    } catch (e: any) {
      if (e.statusCode === 404) {
        console.log(`   ⚠️  ${secretName} (not in vault, skipped)`);
      } else {
        console.error(`   ❌ ${secretName}: ${e.message}`);
      }
    }
  }

  if (lines.length === 0) {
    console.error('\n❌ No secrets retrieved. Check vault name and your Azure AD access.');
    process.exit(1);
  }

  const envPath = path.resolve(__dirname, '../../src/config/env', `.env.${ENV_NAME}`);
  const hadExisting = fs.existsSync(envPath);
  const overwrite = process.env.KEY_VAULT_OVERWRITE === '1' || process.env.KEY_VAULT_OVERWRITE === 'true';
  const kvSection = `${KV_SECTION_HEAD}\n${lines.join('\n')}`;
  let out: string;
  if (overwrite) {
    const header = `# Auto-generated from Azure Key Vault - do not commit\n# Add other vars from src/config/env/env.sample (URLs, usernames, etc.)\n\n`;
    out = header + lines.join('\n') + '\n';
  } else if (hadExisting) {
    const existing = fs.readFileSync(envPath, 'utf-8');
    out = mergeEnvFile(existing, updatedKeys, kvSection);
  } else {
    const header = `# Local env — do not commit\n# Non-secret vars: see src/config/env/env.sample\n\n`;
    out = header + lines.join('\n') + '\n';
  }
  fs.writeFileSync(envPath, out, 'utf-8');
  const rel = path.relative(process.cwd(), envPath);
  if (overwrite || !hadExisting) {
    console.log(`\n✅ Wrote ${lines.length} secret(s) to ${rel}`);
  } else {
    console.log(`\n✅ Merged ${lines.length} Key Vault secret(s) into ${rel} (other lines preserved)`);
  }
  console.log(
    overwrite
      ? '   Add any non-secret vars (URLs, usernames) from env.sample. Do not commit this file.\n'
      : '   Set KEY_VAULT_OVERWRITE=1 to replace the whole file. Do not commit this file.\n'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
