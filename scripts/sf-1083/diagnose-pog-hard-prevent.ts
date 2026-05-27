/**
 * SF-1083 / SF-1022 — definitive diagnostic for POG_Product__c hard-prevent rule.
 *
 * Auths as the Data Governance persona, creates a baseline POG, then attempts
 * an exact-name duplicate twice — once with `allowSave=true` (framework default,
 * tests Block-action enforcement) and once with `allowSave=false` (tests any
 * duplicate rule firing). Captures the full response body from each call so we
 * can see EXACTLY which rule (Prevent_Duplicate vs Match_Key_Alert) is firing.
 *
 * If the Block rule is correctly active and enforced:
 *   - probe with allowSave=true  → 400 DUPLICATES_DETECTED, rule=POG_Prevent_Duplicate
 *   - probe with allowSave=false → 400 DUPLICATES_DETECTED, rule=POG_Prevent_Duplicate (or both)
 *
 * If only the Alert rule is firing (Block is inactive):
 *   - probe with allowSave=true  → 201 Created (Alert allows save)
 *   - probe with allowSave=false → 400 DUPLICATES_DETECTED, rule=POG_Match_Key_Alert
 */
import { request } from '@playwright/test';
import { loadEnvFileWithShellPreserved } from '../../src/config/config';
import { SalesforceAPIClient } from '../../src/api-clients/salesforce/SalesforceAPIClient';
import * as path from 'path';
import * as fs from 'fs';

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
  console.log('[diag] auth OK');

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const sharedName = `SF1083_POG_DIAG_${stamp}_exact_block_test`;

  console.log(`[diag] using exact name: ${sharedName}`);

  // Step 1 — create baseline (allowSave=true)
  console.log('\n[diag] === Step 1: create baseline (allowSave=true) ===');
  const r1 = await client.createRecordRaw(
    'POG_Product__c',
    { Pog_Product_Name__c: sharedName },
    { duplicateRuleAllowSave: true }
  );
  console.log(`http=${r1.httpStatus} ok=${r1.ok} dup=${r1.duplicateDetected} id=${r1.recordId || '-'}`);
  if (!r1.ok) {
    console.log(`body=${r1.rawText.slice(0, 2000)}`);
    await ctx.dispose();
    process.exit(0);
  }
  const baselineId = r1.recordId!;

  // Step 2 — exact duplicate with allowSave=true (Block-only test)
  console.log('\n[diag] === Step 2: probe exact duplicate, allowSave=TRUE (only Block rule should reject) ===');
  const r2 = await client.createRecordRaw(
    'POG_Product__c',
    { Pog_Product_Name__c: sharedName },
    { duplicateRuleAllowSave: true }
  );
  console.log(`http=${r2.httpStatus} ok=${r2.ok} dup=${r2.duplicateDetected} id=${r2.recordId || '-'}`);
  console.log(`FULL BODY (first 4000 chars):\n${r2.rawText.slice(0, 4000)}`);
  if (r2.ok) {
    console.log(
      '[diag] ⚠️  CRITICAL: probe with allowSave=true SAVED — POG_Prevent_Duplicate Block rule is NOT enforcing.'
    );
  } else if (r2.duplicateDetected) {
    const matches = r2.rawText.match(/"duplicateRule":"([^"]+)"/g) || [];
    console.log(`[diag] ✅ duplicate detected. Rules in body: ${matches.join(', ')}`);
  }

  // Step 3 — exact duplicate with allowSave=false (any rule will fire)
  console.log('\n[diag] === Step 3: probe exact duplicate, allowSave=FALSE (any duplicate rule should fire) ===');
  const r3 = await client.createRecordRaw(
    'POG_Product__c',
    { Pog_Product_Name__c: sharedName },
    { duplicateRuleAllowSave: false }
  );
  console.log(`http=${r3.httpStatus} ok=${r3.ok} dup=${r3.duplicateDetected} id=${r3.recordId || '-'}`);
  console.log(`FULL BODY (first 4000 chars):\n${r3.rawText.slice(0, 4000)}`);
  if (r3.duplicateDetected) {
    const matches = r3.rawText.match(/"duplicateRule":"([^"]+)"/g) || [];
    console.log(`[diag] ✅ duplicate detected. Rules in body: ${matches.join(', ')}`);
  }

  // Try cleanup (DG can't delete, will warn)
  try {
    await client.deleteRecord('POG_Product__c', baselineId);
    console.log(`[diag] cleaned baseline ${baselineId}`);
  } catch (e: any) {
    console.warn(`[diag] cleanup failed (DG persona): ${e?.message?.split('\n')[0] || e}`);
  }

  await ctx.dispose();
  console.log('\n[diag] done.');
}

main().catch((e) => {
  console.error('DIAG FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
