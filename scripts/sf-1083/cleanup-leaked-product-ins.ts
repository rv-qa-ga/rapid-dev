/**
 * SF-1083 — one-off cleanup: soft-delete the 2 Product_ins__c records leaked by the
 * diag run. Product_ins__c has a validation rule that blocks DELETE and requires
 * setting Status (or equivalent) to Inactive. We first describe the object to find
 * a Status / Active / IsActive-like picklist or checkbox, then update each record.
 */
import { request } from '@playwright/test';
import { loadEnvFileWithShellPreserved } from '../../src/config/config';
import { SalesforceAPIClient } from '../../src/api-clients/salesforce/SalesforceAPIClient';
import * as path from 'path';
import * as fs from 'fs';

const LEAKED_IDS = ['a0uUF000007EYdhYAG', 'a0uUF000007EYfJYAW'];

interface PicklistValue { value?: string; active?: boolean; defaultValue?: boolean }
interface FieldMeta {
  name?: string;
  label?: string;
  type?: string;
  updateable?: boolean;
  picklistValues?: PicklistValue[];
}

async function main() {
  const env = (process.env.ENV || 'qamerge').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);
  const adminUser = process.env.SF_QAAUTOMATIONUSER_JWT_USERNAME?.trim();
  if (!adminUser) throw new Error('SF_QAAUTOMATIONUSER_JWT_USERNAME missing');

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const client = new SalesforceAPIClient(ctx);
  await client.authenticate(adminUser);
  console.log(`[cleanup] auth OK as ${adminUser}`);

  const meta = await client.describeSObject('Product_ins__c');
  const fields = (meta?.fields || []) as FieldMeta[];
  const statusLike = fields.find(
    (f) =>
      f.updateable === true &&
      /(status|active|isactive)/i.test(String(f.name || '')) &&
      (f.type === 'picklist' || f.type === 'boolean' || f.type === 'string')
  );
  console.log(
    `[cleanup] candidate status field: name=${statusLike?.name} type=${statusLike?.type} label=${JSON.stringify(statusLike?.label)}`
  );
  if (statusLike?.type === 'picklist') {
    console.log(`[cleanup]   picklist values: ${(statusLike.picklistValues || []).map((p) => p.value).join(' | ')}`);
  }

  if (!statusLike?.name) {
    console.log('[cleanup] No status-like updateable field found — cannot soft-delete via API. Manual cleanup required.');
    await ctx.dispose();
    return;
  }

  let inactiveValue: string | boolean = 'Inactive';
  if (statusLike.type === 'picklist') {
    const pv = (statusLike.picklistValues || []).find((p) =>
      /inactive|disabled|archived|retired/i.test(String(p.value || ''))
    );
    if (pv?.value) inactiveValue = pv.value;
  } else if (statusLike.type === 'boolean') {
    inactiveValue = false;
  }
  console.log(`[cleanup] using ${statusLike.name} = ${JSON.stringify(inactiveValue)}`);

  for (const id of LEAKED_IDS) {
    try {
      await client.updateRecord('Product_ins__c', id, { [statusLike.name]: inactiveValue });
      console.log(`[cleanup] soft-deleted Product_ins__c/${id} (${statusLike.name}=${JSON.stringify(inactiveValue)})`);
    } catch (e: any) {
      console.log(`[cleanup] WARN could not update ${id}: ${e?.message?.split('\n')[0]?.slice(0, 300)}`);
    }
  }
  await ctx.dispose();
}

main().catch((e) => {
  console.error('CLEANUP FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
