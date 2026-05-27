/**
 * SF-1083 diagnostic — quick smoke test as the Data Governance user.
 *
 * Verifies:
 *   1) JWT auth as SF_DATAGOVERNANCEUSER_JWT_USERNAME succeeds.
 *   2) describeSObject works for ASLOB__c, OSFI__c (both have Code field) and Sub_Product__c (control).
 *   3) Single create with unique name fragment on each — surfaces whether the
 *      pre-existing *_Prevent_Duplicate rules also apply to the DG persona, or
 *      whether DG bypasses them via profile / permission set scoping.
 *
 * Output is direct to stdout (no redirect) so we can see results live.
 */
import { request } from '@playwright/test';
import { loadEnvFileWithShellPreserved } from '../../src/config/config';
import { SalesforceAPIClient } from '../../src/api-clients/salesforce/SalesforceAPIClient';
import * as path from 'path';
import * as fs from 'fs';

interface FieldMeta {
  name?: string;
  type?: string;
  createable?: boolean;
  autoNumber?: boolean;
  calculated?: boolean;
}

function pickNameField(obj: string, fields: FieldMeta[]): string {
  const std = fields.find((f) => f.name === 'Name');
  if (std?.createable === true && std?.autoNumber !== true) return 'Name';
  const cands = fields.filter(
    (f) =>
      f.createable === true &&
      f.autoNumber !== true &&
      f.calculated !== true &&
      f.type === 'string' &&
      /(_Name__c|^Name__c)$/i.test(String(f.name || ''))
  );
  if (!cands[0]?.name) throw new Error(`No name-like createable field on ${obj}`);
  return cands[0].name as string;
}

async function main() {
  const env = (process.env.ENV || 'qamerge').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);

  const dgUser = process.env.SF_DATAGOVERNANCEUSER_JWT_USERNAME?.trim();
  if (!dgUser) {
    console.error('SF_DATAGOVERNANCEUSER_JWT_USERNAME is not set');
    process.exit(2);
  }
  console.log(`[diag] env=${env} dgUser=${dgUser}`);

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const client = new SalesforceAPIClient(ctx);

  const t0 = Date.now();
  console.log(`[diag] authenticating as DG user...`);
  try {
    await client.authenticate(dgUser);
    console.log(`[diag] auth OK in ${Date.now() - t0}ms`);
  } catch (e: any) {
    console.error(`[diag] AUTH FAILED in ${Date.now() - t0}ms: ${e?.message || e}`);
    await ctx.dispose();
    process.exit(3);
  }

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const objects = ['Sub_Product__c', 'ASLOB__c', 'OSFI__c'];

  for (const obj of objects) {
    console.log(`\n[diag] ============================================================`);
    console.log(`[diag] === ${obj} ===`);
    try {
      const meta = await client.describeSObject(obj);
      const fields = (meta?.fields || []) as FieldMeta[];
      const nameField = pickNameField(obj, fields);
      console.log(`[diag] nameField=${nameField}`);

      const probeName = `SF1083_DG_DIAG_${stamp}_${obj}_first`;
      const t1 = Date.now();
      const r = await client.createRecordRaw(
        obj,
        { [nameField]: probeName },
        { duplicateRuleAllowSave: true }
      );
      console.log(
        `[diag] create http=${r.httpStatus} ok=${r.ok} dup=${r.duplicateDetected} elapsed=${
          Date.now() - t1
        }ms id=${r.recordId || '-'}`
      );
      if (!r.ok) {
        console.log(`[diag] body=${r.rawText.slice(0, 1500)}`);
      }

      if (r.recordId) {
        try {
          await client.deleteRecord(obj, r.recordId);
          console.log(`[diag] cleaned ${r.recordId}`);
        } catch (e: any) {
          console.warn(`[diag] cleanup failed: ${e?.message}`);
        }
      }
    } catch (e: any) {
      console.error(`[diag] ${obj} ERROR: ${e?.message || e}`);
    }
  }

  await ctx.dispose();
  console.log('\n[diag] done.');
}

main().catch((e) => {
  console.error('DIAG FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
