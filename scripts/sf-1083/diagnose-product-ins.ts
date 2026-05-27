/**
 * SF-1083 — quick diagnostic: confirm Product_ins__c is accessible to the DG persona
 * and discover its createable name field (and any required fields).
 */
import { request } from '@playwright/test';
import { loadEnvFileWithShellPreserved } from '../../src/config/config';
import { SalesforceAPIClient } from '../../src/api-clients/salesforce/SalesforceAPIClient';
import * as path from 'path';
import * as fs from 'fs';

interface FieldMeta {
  name?: string;
  label?: string;
  type?: string;
  createable?: boolean;
  autoNumber?: boolean;
  calculated?: boolean;
  nillable?: boolean;
  defaultedOnCreate?: boolean;
}

async function main() {
  const env = (process.env.ENV || 'qamerge').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);
  const dgUser = process.env.SF_DATAGOVERNANCEUSER_JWT_USERNAME?.trim();
  const adminUser = process.env.SF_QAAUTOMATIONUSER_JWT_USERNAME?.trim();
  console.log(`[diag] env=${env} dgUser=${dgUser} adminUser=${adminUser}`);

  for (const user of [dgUser, adminUser].filter(Boolean) as string[]) {
    console.log(`\n[diag] ============================================================`);
    console.log(`[diag] === Testing as ${user} ===`);
    const ctx = await request.newContext({ ignoreHTTPSErrors: true });
    const client = new SalesforceAPIClient(ctx);
    await client.authenticate(user);
    console.log(`[diag] auth OK as ${user}`);

    try {
      const meta = await client.describeSObject('Product_ins__c');
      const fields = (meta?.fields || []) as FieldMeta[];
      console.log(`[diag] Product_ins__c EXISTS — readable to ${user}`);
      const stdName = fields.find((f) => f.name === 'Name');
      console.log(
        `  Name field: type=${stdName?.type} autoNumber=${stdName?.autoNumber} createable=${stdName?.createable}`
      );
      const cands = fields.filter(
        (f) =>
          f.createable === true &&
          f.autoNumber !== true &&
          f.calculated !== true &&
          f.type === 'string' &&
          /(_Name__c|^Name__c)$/i.test(String(f.name || ''))
      );
      console.log(`  Name-like createable fields:`);
      for (const c of cands) {
        console.log(
          `    - ${c.name}  label=${JSON.stringify(c.label)}  required=${c.nillable === false && c.defaultedOnCreate === false}`
        );
      }
      const required = fields
        .filter((f) => f.createable === true && f.nillable === false && f.defaultedOnCreate === false)
        .map((f) => f.name);
      console.log(`  All required createable fields: ${required.join(', ')}`);
      const nameField = cands[0]?.name;
      if (nameField) {
        const stamp = Math.random().toString(36).slice(2, 7);
        const probeName = `SF1083_DIAG_${stamp}_product_ins_test`;
        console.log(`\n  Trying probe create with ${nameField}="${probeName}"`);
        const r = await client.createRecordRaw('Product_ins__c', { [nameField]: probeName }, { duplicateRuleAllowSave: true });
        console.log(`  http=${r.httpStatus} ok=${r.ok} dup=${r.duplicateDetected} val=${r.validationDetected} id=${r.recordId || '-'}`);
        if (!r.ok) {
          console.log(`  body: ${r.rawText.slice(0, 800)}`);
        }
        // Best-effort cleanup so diag runs don't leak fixture records.
        if (r.ok && r.recordId) {
          try {
            await client.deleteRecord('Product_ins__c', r.recordId);
            console.log(`  cleanup: deleted ${r.recordId}`);
          } catch (e: any) {
            console.log(`  cleanup: WARN could not delete ${r.recordId} as ${user}: ${e?.message?.split('\n')[0]?.slice(0, 200)}`);
          }
        }
      }
    } catch (e: any) {
      console.log(`[diag] Product_ins__c NOT accessible to ${user}: ${e?.message?.split('\n')[0]?.slice(0, 200)}`);
    }
    await ctx.dispose();
  }

  console.log('\n[diag] done.');
}

main().catch((e) => {
  console.error('DIAG FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
