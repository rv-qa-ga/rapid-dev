#!/usr/bin/env ts-node
/**
 * Validate Opportunity_Readiness__c IT Security Review section labels (DD stage).
 *
 * Same approach as Compliance: Salesforce describe API on Opportunity_Readiness__c,
 * then check expected IT Security section field labels exist. Generates HTML report.
 *
 * Expected fields can be updated in IT_SECURITY_EXPECTED_LABELS (from DD Tasks spec or stakeholder).
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/validate-opportunity-readiness-it-security-labels.ts
 *   SF_USE_QA_MRD_FOR_API=true npm run validate:OpportunityReadinessITSecurity
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT_NAME = 'Opportunity_Readiness__c';

/** IT Security Review section: expected field labels (from DD UI / stakeholder). Add variants if org uses different wording. */
const IT_SECURITY_EXPECTED_LABELS: Array<{ expectedLabel: string; labelVariants?: string[] }> = [
  { expectedLabel: 'Upguard Security Rating' },
  // Add more from IT Security DD Tasks when available
];

interface SfField {
  name: string;
  label: string;
  type: string;
  [key: string]: any;
}

interface SectionCheckResult {
  expectedLabel: string;
  found: boolean;
  actualLabel: string | null;
  apiName: string | null;
  pass: boolean;
  notes: string;
}

function normalizeLabel(s: string): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<{ fields: SfField[] }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }).then((r) => r.data);
}

function findFieldByLabel(fields: SfField[], label: string, variants?: string[]): SfField | null {
  const norm = normalizeLabel(label);
  let f = fields.find((x) => normalizeLabel(x.label) === norm);
  if (f) return f;
  if (variants?.length) {
    for (const v of variants) {
      f = fields.find((x) => normalizeLabel(x.label) === normalizeLabel(v));
      if (f) return f;
    }
  }
  f = fields.find((x) => normalizeLabel(x.label).includes(norm) || norm.includes(normalizeLabel(x.label)));
  return f || null;
}

function runSectionChecks(fields: SfField[]): SectionCheckResult[] {
  return IT_SECURITY_EXPECTED_LABELS.map(({ expectedLabel, labelVariants }) => {
    const found = findFieldByLabel(fields, expectedLabel, labelVariants);
    const pass = !!found;
    return {
      expectedLabel,
      found: !!found,
      actualLabel: found?.label ?? null,
      apiName: found?.name ?? null,
      pass,
      notes: pass ? 'Field exists in org' : 'No matching field found in describe',
    };
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateHtmlReport(results: SectionCheckResult[], generatedAt: string): string {
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  const rows = results
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.expectedLabel)}</td>
      <td>${r.actualLabel != null ? escapeHtml(r.actualLabel) : '—'}</td>
      <td>${r.apiName != null ? escapeHtml(r.apiName) : '—'}</td>
      <td class="${r.pass ? 'pass' : 'fail'}">${r.pass ? 'Pass' : 'Fail'}</td>
      <td>${escapeHtml(r.notes)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opportunity Readiness — IT Security Review Section</title>
  <style>
    body { font-family: Segoe UI, system-ui, sans-serif; margin: 24px; background: #f5f5f5; }
    h1 { color: #0B5394; margin-bottom: 8px; }
    .meta { color: #555; font-size: 14px; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; max-width: 1200px; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; }
    th { background: #0B5394; color: white; font-weight: 600; }
    tr:nth-child(even) { background: #f9f9f9; }
    .pass { color: #006100; font-weight: 600; }
    .fail { color: #9C0006; font-weight: 600; }
    .summary { margin-bottom: 20px; padding: 12px 16px; background: white; max-width: 1200px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .summary.pass { border-left: 4px solid #006100; }
    .summary.fail { border-left: 4px solid #9C0006; }
  </style>
</head>
<body>
  <h1>Opportunity_Readiness__c — IT Security Review Section (DD Stage)</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} | Object: ${OBJECT_NAME} | Source: API describe</p>
  <div class="summary ${failCount === 0 ? 'pass' : 'fail'}">
    <strong>Summary:</strong> ${passCount} of ${results.length} checks passed, ${failCount} failed.
    ${failCount === 0 ? 'All expected IT Security section fields present.' : 'Some fields missing or label mismatch.'}
  </div>
  <table>
    <thead>
      <tr>
        <th>Expected Field Label</th>
        <th>Actual Label in Org</th>
        <th>API Name</th>
        <th>Status</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>`;
}

async function main(): Promise<void> {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
    console.log(`[OK] Loaded ${envFile}\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Opportunity_Readiness__c — IT Security Review Section Label Validation');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);
  if (apiUser) console.log(`🔐 Using JWT user: ${apiUser}\n`);

  console.log(`📡 Describing ${OBJECT_NAME}...`);
  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  const describeData = await describeObject(auth.accessToken, auth.instanceUrl, OBJECT_NAME);
  const fields: SfField[] = describeData.fields || [];
  console.log(`   ✅ ${fields.length} fields returned.\n`);

  console.log('📋 Running IT Security Review section checks...');
  const results = runSectionChecks(fields);
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  results.forEach((r, i) => {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${i + 1}. ${icon} ${r.expectedLabel}`);
    console.log(`     In org: ${r.actualLabel ?? '—'} ${r.apiName ? `(${r.apiName})` : ''}`);
    console.log(`     ${r.notes}\n`);
  });
  console.log('─'.repeat(60));
  console.log(`  Overall: ${passCount}/${results.length} passed, ${failCount} failed`);
  console.log(`  RESULT: ${failCount === 0 ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19);
  const htmlPath = path.join(reportDir, `Opportunity-Readiness-IT-Security-Labels-${timestamp}.html`);
  const html = generateHtmlReport(results, generatedAt);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`📊 Report saved: ${htmlPath}\n`);
}

main().catch((err: any) => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
