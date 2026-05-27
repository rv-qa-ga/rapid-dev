#!/usr/bin/env ts-node
/**
 * List active Salesforce approval ProcessDefinition rows for Opportunity_Readiness__c (Tooling API).
 * Use the Id in OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID when the process label/name does not match the REST API.
 *
 * Usage:
 *   npm run data:list-readiness-approval-processes
 *   cross-env ENV=qa ts-node scripts/list-readiness-approval-processes.ts
 *
 * Requires JWT (same as other data scripts): SF_QAMRDUSER_JWT_USERNAME or SF_JWT_USERNAME in .env.qa
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT_API = 'Opportunity_Readiness__c';

function apiVersion(): string {
  const v = config.getSalesforceConfig().apiVersion || '60.0';
  return v.replace(/^v/, '');
}

async function toolingQuery(accessToken: string, instanceUrl: string, soql: string): Promise<any> {
  const q = encodeURIComponent(soql);
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion()}/tooling/query/?q=${q}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`Tooling query failed ${res.status}: ${text}`) as Error & { body?: string };
    err.body = text;
    throw err;
  }
  return JSON.parse(text);
}

async function main(): Promise<void> {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
    console.log(`[OK] Loaded ${envFile}\n`);
  }

  const username =
    process.env.SF_QAMRDUSER_JWT_USERNAME?.trim() ||
    process.env.SF_JWT_USERNAME?.trim();
  if (!username) {
    console.error('Set SF_QAMRDUSER_JWT_USERNAME (or SF_JWT_USERNAME) in .env.qa');
    process.exit(1);
  }

  const auth = await SalesforceJWTAuth.authenticate(username);

  let data: { records?: any[] };
  let records: any[];
  try {
    const primarySoql = `SELECT Id, Name, DeveloperName, State, TableEnumOrId, Type FROM ProcessDefinition WHERE State = 'Active' AND TableEnumOrId = '${OBJECT_API}'`;
    data = await toolingQuery(auth.accessToken, auth.instanceUrl, primarySoql);
    records = data.records || [];

    if (records.length === 0) {
      console.log(
        `[INFO] No rows with TableEnumOrId = ${OBJECT_API}. Trying broader search (Name contains Readiness)...\n`
      );
      const fallbackSoql = `SELECT Id, Name, DeveloperName, State, TableEnumOrId, Type FROM ProcessDefinition WHERE State = 'Active' AND Name LIKE '%Readiness%'`;
      data = await toolingQuery(auth.accessToken, auth.instanceUrl, fallbackSoql);
      records = data.records || [];
    }
  } catch (e: any) {
    const body = e?.body || String(e?.message || e);
    if (body.includes('INVALID_TYPE') || body.includes('not supported')) {
      console.error(
        'Tooling API cannot query ProcessDefinition with this JWT user (common for non-admin users).\n\n' +
          'To fix NO_APPLICABLE_PROCESS without this script:\n' +
          '  • Setup → Approval Processes → open the process for Opportunity Readiness.\n' +
          '  • Use the API / Developer Name as OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME (often not the same as the UI label).\n' +
          '  • Or authenticate as a System Administrator JWT user and re-run this script, or paste the 15–18 char process Id from Setup into OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID.\n'
      );
      process.exit(1);
    }
    throw e;
  }

  if (records.length === 0) {
    console.log('No matching ProcessDefinition records. Check Setup → Approval Processes for Opportunity Readiness.');
    console.log('Your user may need “View Setup and Configuration” or run as a System Administrator JWT user.');
    return;
  }

  console.log(`Active approval processes (${records.length}):\n`);
  console.log('Id                 | DeveloperName          | Name                          | TableEnumOrId');
  console.log('-'.repeat(100));
  for (const r of records) {
    const id = (r.Id || '').padEnd(18);
    const dev = (r.DeveloperName || '').padEnd(22).slice(0, 22);
    const name = (r.Name || '').padEnd(30).slice(0, 30);
    const table = r.TableEnumOrId || '';
    console.log(`${id} | ${dev} | ${name} | ${table}`);
  }
  console.log('\nSet in .env.qa:');
  console.log(`  OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID=<Id from first column>`);
  console.log('Or set OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME to DeveloperName (often more reliable than the UI label).\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
