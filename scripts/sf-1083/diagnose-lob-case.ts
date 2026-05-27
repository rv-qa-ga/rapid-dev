/**
 * SF-1083 — quick diagnostic for the Line_of_Business__c letter-case scenario
 * that our automated test flagged as a defect but the user couldn't reproduce.
 *
 * Auths as the Data Governance persona (per SF-1083 user story), creates a
 * baseline LOB with a lowercase name, then probes with the same name in upper-
 * case using `Sforce-Duplicate-Rule-Header: allowSave=false`. Captures the
 * full response body so we can see EXACTLY what Salesforce returns — whether
 * it's DUPLICATES_DETECTED, a validation-rule error, or a clean 201.
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
  const baselineName = `SF1083_LOB_DIAG_${stamp}_first small business case`;
  const probeName = baselineName.toUpperCase();

  console.log(`[diag] baseline name: ${baselineName}`);
  console.log(`[diag] probe name:    ${probeName}`);

  // Step 1 — create baseline (framework default allowSave=true)
  console.log('\n[diag] === Step 1: create baseline (allowSave=true) ===');
  const r1 = await client.createRecordRaw(
    'Line_of_Business__c',
    { LOB_Name__c: baselineName },
    { duplicateRuleAllowSave: true }
  );
  console.log(`http=${r1.httpStatus} ok=${r1.ok} dup=${r1.duplicateDetected} id=${r1.recordId || '-'}`);
  if (!r1.ok) {
    console.log(`body=${r1.rawText.slice(0, 2000)}`);
    await ctx.dispose();
    process.exit(0);
  }
  const baselineId = r1.recordId!;

  // Step 1b — read the baseline's Match_Key__c
  try {
    const baselineRow = await client.getRecordWithFields(
      'Line_of_Business__c',
      baselineId,
      ['Match_Key__c', 'LOB_Name__c']
    );
    console.log(`[diag] baseline Match_Key__c = ${JSON.stringify((baselineRow as any).Match_Key__c)}`);
    console.log(`[diag] baseline LOB_Name__c  = ${JSON.stringify((baselineRow as any).LOB_Name__c)}`);
  } catch (e: any) {
    console.warn(`[diag] could not read baseline Match_Key__c: ${e?.message || e}`);
  }

  // Step 2 — probe with allowSave=false (rule check only)
  console.log('\n[diag] === Step 2: probe with allowSave=false (alert check) ===');
  const r2 = await client.createRecordRaw(
    'Line_of_Business__c',
    { LOB_Name__c: probeName },
    { duplicateRuleAllowSave: false }
  );
  console.log(`http=${r2.httpStatus} ok=${r2.ok} dup=${r2.duplicateDetected} id=${r2.recordId || '-'}`);
  console.log(`FULL BODY:\n${r2.rawText.slice(0, 4000)}`);

  // Step 3 — probe with allowSave=true (acknowledged save attempt)
  console.log('\n[diag] === Step 3: probe with allowSave=true (acknowledged save) ===');
  const r3 = await client.createRecordRaw(
    'Line_of_Business__c',
    { LOB_Name__c: probeName },
    { duplicateRuleAllowSave: true }
  );
  console.log(`http=${r3.httpStatus} ok=${r3.ok} dup=${r3.duplicateDetected} id=${r3.recordId || '-'}`);
  if (!r3.ok) {
    console.log(`FULL BODY:\n${r3.rawText.slice(0, 4000)}`);
  } else if (r3.recordId) {
    try {
      const probeRow = await client.getRecordWithFields(
        'Line_of_Business__c',
        r3.recordId,
        ['Match_Key__c', 'LOB_Name__c']
      );
      console.log(`[diag] probe Match_Key__c = ${JSON.stringify((probeRow as any).Match_Key__c)}`);
      console.log(`[diag] probe LOB_Name__c  = ${JSON.stringify((probeRow as any).LOB_Name__c)}`);
    } catch (e: any) {
      console.warn(`[diag] could not read probe Match_Key__c: ${e?.message || e}`);
    }
  }

  await ctx.dispose();
  console.log('\n[diag] done.');
}

main().catch((e) => {
  console.error('DIAG FATAL', e?.stack || e?.message || e);
  process.exit(1);
});
