#!/usr/bin/env ts-node

/**
 * Connectivity Check - Tests connection to all systems used by the automation framework
 *
 * Usage:
 *   npm run connectivity:check
 *   ENV=qa ts-node scripts/check-connectivity.ts
 *
 * Tests: Confluence, Dynamics 365, SQL Server, Salesforce QA, Jira, Zephyr
 */

// Ensure ENV is set before config loads
process.env.ENV = process.env.ENV || 'qa';

import axios from 'axios';
import { config } from '../src/config/config';
import { SqlServerClient } from '../src/sqlserver/client/SqlServerClient';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { ConfluenceClient } from '../src/integrations/confluence/client';
import { DynamicsAuth } from '../src/utils/dynamics-auth';

interface CheckResult {
  system: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  duration?: number;
}

const results: CheckResult[] = [];

function addResult(system: string, status: CheckResult['status'], message: string, duration?: number) {
  results.push({ system, status, message, duration });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`  ${icon} ${system}: ${message}${duration ? ` (${duration}ms)` : ''}`);
}

async function checkConfluence(): Promise<void> {
  const start = Date.now();
  try {
    const client = new ConfluenceClient();
    if (!client.isConfigured()) {
      addResult('Confluence', 'skip', 'Not configured (ATLASSIAN_EMAIL/ATLASSIAN_API_TOKEN)');
      return;
    }
    const spaceKey = process.env.CONFLUENCE_SPACE_KEY || 'TM';
    const baseUrl = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
    const email = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
    const apiToken = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const response = await axios.get(`${baseUrl}/rest/api/space/${spaceKey}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });
    if (response.status === 200) {
      const name = response.data?.name || spaceKey;
      addResult('Confluence', 'pass', `Connected (Space: ${name})`, Date.now() - start);
    } else {
      addResult('Confluence', 'fail', `HTTP ${response.status}`, Date.now() - start);
    }
  } catch (error: any) {
    addResult(
      'Confluence',
      'fail',
      error.response?.status ? `HTTP ${error.response.status}` : error.message,
      Date.now() - start
    );
  }
}

async function checkDynamics(): Promise<void> {
  const start = Date.now();
  try {
    const d365Config = config.getDynamicsConfig();
    const authResult = await DynamicsAuth.authenticate();
    if (!authResult?.accessToken) {
      addResult('Dynamics 365', 'fail', 'No access token returned', Date.now() - start);
      return;
    }
    const webApiUrl = d365Config.webApiBaseUrl || `${d365Config.baseUrl}/api/data/v9.2/`;
    const response = await axios.get(`${webApiUrl}WhoAmI`, {
      headers: {
        Authorization: `Bearer ${authResult.accessToken}`,
        Accept: 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
      },
      timeout: 10000,
    });
    if (response.status === 200 && response.data?.OrganizationId) {
      addResult(
        'Dynamics 365',
        'pass',
        `Connected (Org: ${response.data.OrganizationId.substring(0, 8)}...)`,
        Date.now() - start
      );
    } else {
      addResult('Dynamics 365', 'fail', `Unexpected response: ${response.status}`, Date.now() - start);
    }
  } catch (error: any) {
    addResult(
      'Dynamics 365',
      'fail',
      error.message || 'Authentication failed',
      Date.now() - start
    );
  }
}

async function checkSqlServer(): Promise<void> {
  const start = Date.now();
  let client: SqlServerClient | null = null;
  try {
    const sqlConfig = config.getSqlServerConfig();
    if (!sqlConfig.host || sqlConfig.host.includes('your-sql-server')) {
      addResult('SQL Server', 'skip', 'Not configured (SQLSERVER_HOST or AZURE_SQL_DB_DEV_SERVER)');
      return;
    }
    client = new SqlServerClient();
    const connected = await client.testConnection();
    if (connected) {
      addResult('SQL Server', 'pass', `Connected (${sqlConfig.host})`, Date.now() - start);
    } else {
      addResult('SQL Server', 'fail', 'Connection test returned false', Date.now() - start);
    }
  } catch (error: any) {
    addResult('SQL Server', 'fail', error.message, Date.now() - start);
  } finally {
    if (client) await client.close();
  }
}

async function checkSalesforce(): Promise<void> {
  const start = Date.now();
  try {
    const authResult = await SalesforceJWTAuth.authenticate();
    if (authResult?.instanceUrl) {
      addResult(
        'Salesforce QA',
        'pass',
        `Connected (${authResult.instanceUrl.replace(/\/$/, '')})`,
        Date.now() - start
      );
    } else {
      addResult('Salesforce QA', 'fail', 'No instance URL returned', Date.now() - start);
    }
  } catch (error: any) {
    addResult('Salesforce QA', 'fail', error.message, Date.now() - start);
  }
}

async function checkJira(): Promise<void> {
  const start = Date.now();
  try {
    // Use myself endpoint - lightweight connectivity check
    const baseUrl = (process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
    const email = process.env.JIRA_EMAIL || process.env.ATLASSIAN_EMAIL || '';
    const apiToken =
      process.env.JIRA_API_TOKEN ||
      process.env.ATLASSIAN_API_TOKEN ||
      process.env.JIRA_AUTOMATION_TOKEN ||
      process.env.JiraAutomationToken ||
      '';

    if (!email || !apiToken) {
      addResult('Jira', 'skip', 'Not configured (JIRA_EMAIL/JIRA_API_TOKEN)');
      return;
    }

    const response = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      auth: { username: email, password: apiToken },
      headers: { Accept: 'application/json' },
      timeout: 10000,
    });
    if (response.status === 200) {
      const displayName = response.data?.displayName || 'User';
      addResult('Jira', 'pass', `Connected (${displayName})`, Date.now() - start);
    } else {
      addResult('Jira', 'fail', `HTTP ${response.status}`, Date.now() - start);
    }
  } catch (error: any) {
    addResult(
      'Jira',
      'fail',
      error.response?.status ? `HTTP ${error.response.status}` : error.message,
      Date.now() - start
    );
  }
}

async function checkZephyr(): Promise<void> {
  const start = Date.now();
  try {
    const baseUrl = process.env.ZEPHYR_BASE_URL || '';
    const apiToken = process.env.ZEPHYR_API_TOKEN || '';

    if (!apiToken) {
      addResult('Zephyr', 'skip', 'Not configured (ZEPHYR_API_TOKEN)');
      return;
    }

    const isZephyrScaleCloud =
      !baseUrl ||
      baseUrl.includes('zephyrscale.smartbear.com') ||
      baseUrl.includes('api.zephyrscale');
    const apiBaseUrl = isZephyrScaleCloud
      ? 'https://api.zephyrscale.smartbear.com/v2'
      : `${baseUrl.replace(/\/+$/, '')}/rest/atm/1.0`;

    const endpoint = isZephyrScaleCloud ? '/projects' : '/project';
    const response = await axios.get(`${apiBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    if (response.status === 200) {
      const count = response.data?.data?.length ?? response.data?.length ?? 0;
      addResult('Zephyr', 'pass', `Connected (${count} project(s))`, Date.now() - start);
    } else {
      addResult('Zephyr', 'fail', `HTTP ${response.status}`, Date.now() - start);
    }
  } catch (error: any) {
    addResult(
      'Zephyr',
      'fail',
      error.response?.status ? `HTTP ${error.response.status}` : error.message,
      Date.now() - start
    );
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  Automation Framework - Connectivity Check');
  console.log(`  Environment: ${config.getEnvironment()}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  await checkConfluence();
  await checkDynamics();
  await checkSqlServer();
  await checkSalesforce();
  await checkJira();
  await checkZephyr();

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
