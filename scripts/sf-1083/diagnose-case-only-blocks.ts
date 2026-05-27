/**
 * SF-1083 — diagnostic for the 4 objects that show a Block-rule firing on
 * case-only differences (acknowledged save returns 400 "Use one of these records?").
 * Captures the exact `duplicateRule` name on each so we know whether they are:
 *   - intentional hard-prevent rules (like SF-1022 for POG_Product__c) → keep + adjust assertion
 *   - legacy `*_Prevent_Duplicate` rules to retire (like the OSFI/ASLOB pair Sai retired)
 *
 * Auths as the Data Governance persona. For each object, creates a baseline
 * lowercase name, then probes with the same name uppercased — once with
 * `allowSave=true` (Block-only test) and once with `allowSave=false` (any rule).
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
  await client.authenticate(dgUser);
  console.log('[diag] auth OK\n');

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const objects = [
    'Member_Product_and_Program__c',
    'Classes_of_Business__c',
    'BEGAAP_COB__c',
    'Solvency_II__c',
  ];

  const summary: Array<{ obj: string; rules: string[]; finalStatus: number; canSaveWithAllowTrue: boolean }> = [];

  for (const obj of objects) {
    console.log(`\n[diag] ============================================================`);
    console.log(`[diag] === ${obj} ===`);
    try {
      const meta = await client.describeSObject(obj);
      const fields = (meta?.fields || []) as FieldMeta[];
      const nameField = pickNameField(obj, fields);
      console.log(`[diag] nameField=${nameField}`);

      const baseName = `SF1083_DIAG_${stamp}_${obj}_case_baseline`;
      const upper = baseName.toUpperCase();

      // Step 1 — create baseline
      const r1 = await client.createRecordRaw(
        obj,
        { [nameField]: baseName },
        { duplicateRuleAllowSave: true }
      );
      if (!r1.ok) {
        console.log(`[diag] baseline create FAILED http=${r1.httpStatus} body=${r1.rawText.slice(0, 600)}`);
        continue;
      }
      console.log(`[diag] baseline OK id=${r1.recordId}`);

      // Step 2 — probe case-only diff with allowSave=true (Block-only test)
      const r2 = await client.createRecordRaw(
        obj,
        { [nameField]: upper },
        { duplicateRuleAllowSave: true }
      );
      console.log(`[diag] probe allowSave=true:  http=${r2.httpStatus} dup=${r2.duplicateDetected} rules=[${r2.duplicateRules.join(', ')}]`);
      if (r2.ok) {
        console.log(`[diag] ⚠️  probe SAVED with allowSave=true — only an Allow-rule (alert) fired, no Block rule active`);
      } else {
        console.log(`[diag] body: ${r2.rawText.slice(0, 600)}`);
      }

      // Step 3 — probe case-only diff with allowSave=false (any rule)
      const r3 = await client.createRecordRaw(
        obj,
        { [nameField]: upper },
        { duplicateRuleAllowSave: false }
      );
      console.log(`[diag] probe allowSave=false: http=${r3.httpStatus} dup=${r3.duplicateDetected} rules=[${r3.duplicateRules.join(', ')}]`);

      summary.push({
        obj,
        rules: [...new Set([...r2.duplicateRules, ...r3.duplicateRules])],
        finalStatus: r2.httpStatus,
        canSaveWithAllowTrue: r2.ok,
      });
    } catch (e: any) {
      console.error(`[diag] ${obj} ERROR: ${e?.message || e}`);
    }
  }

  console.log('\n\n[diag] ============================================================');
  console.log('[diag] SUMMARY — what fired on case-only differences (allowSave=true):');
  console.log('[diag] ============================================================');
  for (const s of summary) {
    const verdict = s.canSaveWithAllowTrue
      ? '✅ Allow-rule only (no Block)'
      : `⛔ BLOCK rule fired: ${s.rules.join(', ') || '(name not in payload)'}`;
    console.log(`[diag] ${s.obj}: ${verdict}`);
  }

  await ctx.dispose();
  console.log('\n[diag] done.');
}

main().catch((e) => {
  console.error('DIAG FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
