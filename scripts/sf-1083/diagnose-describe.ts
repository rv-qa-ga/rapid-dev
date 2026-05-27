/**
 * SF-1083 diagnostic: describe each reference data object, list:
 *   - Name field type / autoNumber / createable
 *   - All createable fields (so we can decide what to send)
 *   - Required (nillable=false, defaultedOnCreate=false) createable fields
 */
import { request } from '@playwright/test';
import { loadEnvFileWithShellPreserved } from '../../src/config/config';
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

interface FieldMeta {
  name?: string;
  label?: string;
  type?: string;
  createable?: boolean;
  updateable?: boolean;
  nillable?: boolean;
  defaultedOnCreate?: boolean;
  autoNumber?: boolean;
  calculated?: boolean;
  unique?: boolean;
  length?: number;
}

async function main() {
  const env = (process.env.ENV || 'qa').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const client = new SalesforceAPIClient(ctx);
  await client.authenticate();
  console.log('Auth OK');

  for (const obj of OBJECTS) {
    try {
      const meta = await client.describeSObject(obj);
      const fields = (meta?.fields || []) as FieldMeta[];
      const nameField = fields.find((f) => f.name === 'Name');
      const createable = fields.filter((f) => f.createable);
      const required = createable.filter((f) => f.nillable === false && f.defaultedOnCreate === false);
      const nameLike = fields.filter((f) =>
        /name/i.test(String(f.name || '')) || /name/i.test(String(f.label || ''))
      );
      console.log(`\n===== ${obj} =====`);
      console.log(`  Name field type=${nameField?.type} autoNumber=${nameField?.autoNumber} createable=${nameField?.createable} updateable=${nameField?.updateable}`);
      console.log(`  Required (no default) createable fields: ${required.length}`);
      for (const r of required) {
        console.log(`    - ${r.name}  type=${r.type}  unique=${r.unique}  length=${r.length}`);
      }
      console.log(`  Name-like fields: ${nameLike.map((f) => `${f.name}(type=${f.type},createable=${f.createable},autoNumber=${f.autoNumber})`).join(', ') || '(none)'}`);
      console.log(`  Total createable fields: ${createable.length} (${createable.slice(0, 12).map((f) => f.name).join(', ')}${createable.length > 12 ? ', ...' : ''})`);
    } catch (e: any) {
      console.error(`\n===== ${obj} =====\n  describe ERROR: ${e?.message || e}`);
    }
  }

  await ctx.dispose();
}

main().catch((e) => {
  console.error('DESCRIBE ERROR', e?.stack || e?.message || e);
  process.exit(1);
});
