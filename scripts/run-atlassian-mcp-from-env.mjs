#!/usr/bin/env node
/**
 * Cursor MCP bridge: loads Atlassian credentials from repo .env.qa (or CURSOR_MCP_ENV_FILE),
 * then spawns mcp-remote → https://mcp.atlassian.com/v1/mcp (Atlassian Rovo MCP Server).
 *
 * Token sources (first match wins):
 *   ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN
 *   JIRA_EMAIL + JIRA_API_TOKEN
 *
 * Rovo MCP may require an MCP-scoped personal API token if your org uses token auth;
 * see https://support.atlassian.com/atlassian-rovo-mcp-server/docs/configuring-authentication-via-api-token/
 *
 * Usage: configured as the MCP server "command" in .cursor/mcp.json (stdio).
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const envFile =
  process.env.CURSOR_MCP_ENV_FILE ||
  path.join(repoRoot, 'src', 'config', 'env', '.env.qa');

if (!fs.existsSync(envFile)) {
  console.error(`[atlassian-mcp] Env file not found: ${envFile}`);
  console.error('Set CURSOR_MCP_ENV_FILE or add src/config/env/.env.qa');
  process.exit(1);
}

dotenv.config({ path: envFile, override: true });

const email = (process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '').trim();
const token = (process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '').trim();

if (!email || !token) {
  console.error(
    '[atlassian-mcp] Missing credentials. Set ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN (or JIRA_EMAIL + JIRA_API_TOKEN) in .env.qa'
  );
  process.exit(1);
}

const basic = Buffer.from(`${email}:${token}`, 'utf8').toString('base64');
// mcp-remote: pass one argv per --header; avoid shell:true on Windows (mangles colons / base64).
const authorizationHeader = `Authorization: Basic ${basic}`;

let site =
  (process.env.ATLASSIAN_MCP_SITE_URL || process.env.JIRA_BASE_URL || '').trim() ||
  'https://accelins.atlassian.net';
site = site.replace(/\/+$/, '');
if (site.endsWith('/wiki')) {
  site = site.slice(0, -'/wiki'.length);
}

const mcpUrl = (process.env.ATLASSIAN_MCP_URL || 'https://mcp.atlassian.com/v1/mcp').trim();

const mcpRemoteEntry = path.join(repoRoot, 'node_modules', 'mcp-remote', 'dist', 'proxy.js');
if (!fs.existsSync(mcpRemoteEntry)) {
  console.error('[atlassian-mcp] Missing mcp-remote. Run: npm install');
  process.exit(1);
}

const args = [mcpUrl, '--resource', `${site}/`, '--header', authorizationHeader];

const child = spawn(process.execPath, [mcpRemoteEntry, ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd: repoRoot,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
