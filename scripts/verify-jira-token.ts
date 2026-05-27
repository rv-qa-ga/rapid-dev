#!/usr/bin/env ts-node
/**
 * Verify Atlassian credentials used by the framework (Jira + Confluence).
 * Loads src/config/env/.env.{ENV} via config (default ENV=qa).
 *
 * Jira token order: JIRA_API_TOKEN → ATLASSIAN_API_TOKEN → JIRA_AUTOMATION_TOKEN → JiraAutomationToken
 * Confluence token order (same as ConfluenceClient): ATLASSIAN_API_TOKEN → JIRA_API_TOKEN
 *
 * Usage:
 *   npm run jira:verify-token
 *   npm run atlassian:verify-tokens
 *   ENV=qa npm run atlassian:verify-tokens
 */

process.env.ENV = process.env.ENV || 'qa';

import axios from 'axios';
import { config } from '../src/config/config';

void config; // ensure .env is loaded

function resolveJiraApiToken(): string {
  return (
    process.env.JIRA_API_TOKEN ||
    process.env.ATLASSIAN_API_TOKEN ||
    process.env.JIRA_AUTOMATION_TOKEN ||
    process.env.JiraAutomationToken ||
    ''
  ).trim();
}

/** Match src/integrations/confluence/client.ts */
function resolveConfluenceApiToken(): string {
  return (process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '').trim();
}

function resolveAtlassianEmail(): string {
  return (process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '').trim();
}

async function verifyJira(): Promise<boolean> {
  const baseUrl = (process.env.JIRA_BASE_URL || config.getJiraConfig().baseUrl || '').replace(/\/+$/, '');
  const email = resolveAtlassianEmail();
  const apiToken = resolveJiraApiToken();

  if (!baseUrl) {
    console.log('⏭️  Jira: skipped (JIRA_BASE_URL not set)');
    return true;
  }
  if (!email || !apiToken) {
    console.error('❌ Jira: missing JIRA_EMAIL/ATLASSIAN_EMAIL or token (JIRA_API_TOKEN / ATLASSIAN_API_TOKEN / …)');
    return false;
  }

  const tokenSource =
    process.env.JIRA_API_TOKEN
      ? 'JIRA_API_TOKEN'
      : process.env.ATLASSIAN_API_TOKEN
        ? 'ATLASSIAN_API_TOKEN'
        : process.env.JIRA_AUTOMATION_TOKEN
          ? 'JIRA_AUTOMATION_TOKEN'
          : 'JiraAutomationToken';

  try {
    const { data, status } = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      auth: { username: email, password: apiToken },
      headers: { Accept: 'application/json' },
      timeout: 15000,
    });
    if (status !== 200) {
      console.error('❌ Jira: unexpected status', status);
      return false;
    }
    console.log(`✅ Jira OK (token from ${tokenSource})`);
    console.log(`   User: ${data.displayName ?? '(no displayName)'}`);
    console.log(`   Email: ${data.emailAddress ?? email}`);
    return true;
  } catch (e: any) {
    const st = e.response?.status;
    console.error('❌ Jira auth failed:', st ?? e.message);
    if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
    return false;
  }
}

async function verifyConfluence(): Promise<boolean> {
  const wikiBase = (process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki').replace(/\/+$/, '');
  const email = resolveAtlassianEmail();
  const apiToken = resolveConfluenceApiToken();

  if (!email || !apiToken) {
    console.error('❌ Confluence: missing ATLASSIAN_EMAIL (or JIRA_EMAIL) or ATLASSIAN_API_TOKEN / JIRA_API_TOKEN');
    return false;
  }

  const tokenSource = process.env.ATLASSIAN_API_TOKEN ? 'ATLASSIAN_API_TOKEN' : 'JIRA_API_TOKEN';

  try {
    const { data, status } = await axios.get(`${wikiBase}/rest/api/user/current`, {
      auth: { username: email, password: apiToken },
      headers: { Accept: 'application/json' },
      timeout: 15000,
    });
    if (status !== 200) {
      console.error('❌ Confluence: unexpected status', status);
      return false;
    }
    console.log(`✅ Confluence OK (token from ${tokenSource})`);
    console.log(`   User: ${data.displayName ?? data.username ?? '(no name)'}`);
    console.log(`   Type: ${data.type ?? 'n/a'}`);
    return true;
  } catch (e: any) {
    const st = e.response?.status;
    console.error('❌ Confluence auth failed:', st ?? e.message);
    if (e.response?.data) console.error(JSON.stringify(e.response.data, null, 2));
    return false;
  }
}

async function main(): Promise<void> {
  console.log('Atlassian credential check (Jira + Confluence)\n');

  const jiraOk = await verifyJira();
  console.log('');
  const confOk = await verifyConfluence();

  if (!jiraOk || !confOk) {
    process.exit(1);
  }
  console.log('\n✅ All Atlassian checks passed.');
}

main();
