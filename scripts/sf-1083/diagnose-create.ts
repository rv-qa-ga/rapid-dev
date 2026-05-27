/**
 * SF-1083 diagnostic: try Name-only create on every reference data object
 * to surface the exact 400 error from QAMerge before investing in a full run.
 *
 * Usage: cross-env ENV=qamerge ts-node scripts/sf-1083/diagnose-create.ts
 */
import { request } from '@playwright/test';
import { config, loadEnvFileWithShellPreserved } from '../../src/config/config';
import { SalesforceAPIClient } from '../../src/api-clients/salesforce/SalesforceAPIClient';
import * as path from 'path';
import * as fs from 'fs';

const OBJECTS = [
  'Member_Product_and_Program__c',
  'Sub_Product__c',
  'POG_Product__c',
  'OSFI__c',
  'ASLOB__c',
  'Line_of_Business__c',
  'Classes_of_Business__c',
  'BEGAAP_COB__c',
  'Solvency_II__c',
  'Insurance_Product__c',
];

async function main() {
  const env = (process.env.ENV || 'qa').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const client = new SalesforceAPIClient(ctx);
  await client.authenticate();
  console.log('Auth OK; instance =', client.getInstanceUrl());

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const summary: Array<{ obj: string; status: number; ok: boolean; bodySnippet: string }> = [];

  for (const obj of OBJECTS) {
    const probe = `SF1083_DIAG_${stamp}_${obj.replace(/__c$/, '')}`;
    try {
      const res = await client.createRecordRaw(obj, { Name: probe });
      const snippet =
        typeof res.body === 'object' ? JSON.stringify(res.body).slice(0, 800) : String(res.rawText).slice(0, 800);
      summary.push({ obj, status: res.httpStatus, ok: res.ok, bodySnippet: snippet });
      console.log(`\n[${obj}] http=${res.httpStatus} ok=${res.ok}`);
      console.log('  body:', snippet);
      if (res.ok && res.recordId) {
        try {
          await client.deleteRecord(obj, res.recordId);
          console.log('  cleaned up', res.recordId);
        } catch (e: any) {
          console.warn('  cleanup failed:', e?.message || e);
        }
      }
    } catch (e: any) {
      console.error(`\n[${obj}] FATAL`, e?.message || e);
      summary.push({ obj, status: -1, ok: false, bodySnippet: e?.message || String(e) });
    }
  }

  console.log('\n\n===== SUMMARY =====');
  for (const s of summary) {
    console.log(s.obj.padEnd(36), 'http=' + String(s.status).padEnd(4), s.ok ? 'OK ' : 'FAIL', '|', s.bodySnippet.slice(0, 220));
  }

  await ctx.dispose();
}

main().catch((e) => {
  console.error('DIAG ERROR', e?.stack || e?.message || e);
  process.exit(1);
});
