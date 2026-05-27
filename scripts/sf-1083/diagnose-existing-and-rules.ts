/**
 * SF-1083 diagnostic:
 *  1) List existing records on each ref-data object whose Name field begins with our SF1083 prefix or test patterns.
 *  2) Show ALL DuplicateRules on each object (Tooling), including isActive/operationsOnInsert/Update + matchingRule action.
 *  3) Probe ALL 10 objects with allowSave=false using a known-fresh unique name, capturing the full response body.
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
  autoNumber?: boolean;
  calculated?: boolean;
  nillable?: boolean;
  defaultedOnCreate?: boolean;
}

function pickNameField(fields: FieldMeta[]): string | null {
  const stdName = fields.find((f) => f.name === 'Name');
  if (stdName?.createable === true && stdName?.autoNumber !== true) return 'Name';
  const cands = fields.filter(
    (f) =>
      f.createable === true &&
      f.autoNumber !== true &&
      f.calculated !== true &&
      f.type === 'string' &&
      String(f.name || '').endsWith('__c') &&
      (/_Name__c$/i.test(String(f.name)) || /name/i.test(String(f.label || '')))
  );
  cands.sort((a, b) => String(a.name).length - String(b.name).length);
  return cands[0]?.name || null;
}

async function main() {
  const env = (process.env.ENV || 'qa').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const client = new SalesforceAPIClient(ctx);
  await client.authenticate();

  console.log('\n===== TOOLING: DuplicateRule list =====');
  try {
    const dr = await client.toolingQueryAllRecords(
      `SELECT Id, DeveloperName, MasterLabel, IsActive, SobjectType FROM DuplicateRule WHERE SobjectType IN ('Member_Product_and_Program__c','Sub_Product__c','POG_Product__c','OSFI__c','ASLOB__c','Line_of_Business__c','Classes_of_Business__c','BEGAAP_COB__c','Solvency_II__c','Insurance_Product__c') ORDER BY SobjectType, DeveloperName`
    );
    for (const r of dr) {
      const o = r as any;
      console.log(`  ${o.SobjectType}  ${o.DeveloperName}  active=${o.IsActive}  label="${o.MasterLabel}"`);
    }
  } catch (e: any) {
    console.warn(`Tooling query failed: ${e?.message}`);
  }

  console.log('\n===== EXISTING RECORDS (top 5 per object) =====');
  for (const obj of OBJECTS) {
    try {
      const meta = await client.describeSObject(obj);
      const nameField = pickNameField((meta?.fields || []) as FieldMeta[]) || 'Name';
      const soql = `SELECT Id, ${nameField}, CreatedDate FROM ${obj} ORDER BY CreatedDate DESC LIMIT 5`;
      const q = await client.query(soql);
      const rows = (q.records || []) as Array<Record<string, unknown>>;
      console.log(`\n[${obj}] nameField=${nameField} totalSize=${q.totalSize ?? rows.length}`);
      for (const r of rows) {
        console.log(`   ${r.Id}  ${nameField}=${JSON.stringify(r[nameField])}  CreatedDate=${r.CreatedDate}`);
      }
    } catch (e: any) {
      console.warn(`[${obj}] query failed: ${e?.message}`);
    }
  }

  console.log('\n===== PROBE create (allowSave=false) with FRESH unique name =====');
  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  for (const obj of OBJECTS) {
    try {
      const meta = await client.describeSObject(obj);
      const nameField = pickNameField((meta?.fields || []) as FieldMeta[]);
      if (!nameField) {
        console.log(`[${obj}] no name field — skip`);
        continue;
      }
      const probe = `SF1083_PROBE_${stamp}_${obj.replace(/__c$/, '')}_freshunique`;
      const r = await client.createRecordRaw(obj, { [nameField]: probe }, { duplicateRuleAllowSave: false });
      console.log(`[${obj}] http=${r.httpStatus} ok=${r.ok} dup=${r.duplicateDetected} body=${r.rawText.slice(0, 320)}`);
      if (r.ok && r.recordId) {
        try {
          await client.deleteRecord(obj, r.recordId);
        } catch {
          /* best effort */
        }
      }
    } catch (e: any) {
      console.warn(`[${obj}] probe failed: ${e?.message}`);
    }
  }

  await ctx.dispose();
}

main().catch((e) => {
  console.error('DIAG ERROR', e?.stack || e?.message || e);
  process.exit(1);
});
