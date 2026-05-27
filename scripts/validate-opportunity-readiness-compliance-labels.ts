#!/usr/bin/env ts-node
/**
 * Validate Opportunity_Readiness__c Compliance section labels against updated requirements.
 *
 * Compares Salesforce field labels (from API describe) to the updated Compliance
 * field names. Generates an HTML report: Current (old) Label → Updated (expected) Label,
 * whether the field exists in org, actual label, and pass/fail.
 *
 * Updated requirements (from stakeholder):
 *   - Confirm Staff background check completed? → Staff Background Check Complete
 *   - Confirm company regulatory checks completed? → Company Regulatory Checks Complete
 *   - Confirm Compliance Document Review Completed? → Compliance Document Review Complete
 *   - Confirm Regulatory Issues or Action reviewed? → Regulatory Issues or Action Reviewed
 *   - Confirm Background/Sanction Screen Checks completed on key staff → Background Screen Checks Complete
 *   - National Producer Number (single old) → National Producer Number for the Agency
 *   - National Producer Number (single old) → National Producer Number for the Producer
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/validate-opportunity-readiness-compliance-labels.ts
 *   SF_USE_QA_MRD_FOR_API=true npm run validate:OpportunityReadinessCompliance
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT_NAME = 'Opportunity_Readiness__c';

/** Compliance section: Current Field Name → Updated Field Name (from updated requirements).
 *  updatedLabelVariants: optional alternative labels accepted in org (e.g. "National Producer Number for Producer" without "the"). */
const COMPLIANCE_LABEL_MAP: Array<{ currentLabel: string; updatedLabel: string; updatedLabelVariants?: string[] }> = [
  { currentLabel: 'Confirm Staff background check completed?', updatedLabel: 'Staff Background Check Complete' },
  { currentLabel: 'Confirm company regulatory checks completed?', updatedLabel: 'Company Regulatory Checks Complete' },
  { currentLabel: 'Confirm Compliance Document Review Completed?', updatedLabel: 'Compliance Document Review Complete' },
  { currentLabel: 'Confirm Regulatory Issues or Action reviewed?', updatedLabel: 'Regulatory Issues or Action Reviewed' },
  { currentLabel: 'Confirm Background/Sanction Screen Checks completed on key staff', updatedLabel: 'Background Screen Checks Complete' },
  { currentLabel: 'National Producer Number for the agency and each of the individual producers', updatedLabel: 'National Producer Number for the Agency' },
  {
    currentLabel: 'National Producer Number for the agency and each of the individual producers',
    updatedLabel: 'National Producer Number for the Producer',
    updatedLabelVariants: ['National Producer Number for Producer'],
  },
];

interface SfField {
  name: string;
  label: string;
  type: string;
  [key: string]: any;
}

interface ComplianceCheckResult {
  currentLabel: string;
  updatedLabel: string;
  foundByUpdatedLabel: boolean;
  foundByCurrentLabel: boolean;
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

function findFieldByLabel(fields: SfField[], label: string, excludeLabel?: string): SfField | null {
  const norm = normalizeLabel(label);
  if (!norm) return null;
  const excludeNorm = excludeLabel ? normalizeLabel(excludeLabel) : null;
  const exact = fields.find(
    (f) => normalizeLabel(f.label) === norm && (!excludeNorm || normalizeLabel(f.label) !== excludeNorm)
  );
  if (exact) return exact;
  const partial = fields.find(
    (f) =>
      (normalizeLabel(f.label).includes(norm) || norm.includes(normalizeLabel(f.label))) &&
      (!excludeNorm || normalizeLabel(f.label) !== excludeNorm)
  );
  return partial || null;
}

function runComplianceChecks(fields: SfField[]): ComplianceCheckResult[] {
  const results: ComplianceCheckResult[] = [];

  for (const { currentLabel, updatedLabel, updatedLabelVariants } of COMPLIANCE_LABEL_MAP) {
    const excludeForUpdated =
      updatedLabel === 'National Producer Number for the Producer' ? 'National Producer Number for the Agency' : undefined;
    let byUpdated = findFieldByLabel(fields, updatedLabel, excludeForUpdated);
    if (!byUpdated && updatedLabelVariants?.length) {
      for (const variant of updatedLabelVariants) {
        byUpdated = findFieldByLabel(fields, variant, excludeForUpdated);
        if (byUpdated) break;
      }
    }
    // For "National Producer Number for the Producer", do not match the Agency field (same current label splits to two)
    const byCurrent =
      updatedLabel === 'National Producer Number for the Producer'
        ? findFieldByLabel(fields, currentLabel, 'National Producer Number for the Agency')
        : findFieldByLabel(fields, currentLabel);

    let actualLabel: string | null = null;
    let apiName: string | null = null;
    let pass = false;
    let notes = '';

    if (byUpdated) {
      actualLabel = byUpdated.label;
      apiName = byUpdated.name;
      pass = true;
      notes = 'Label in org matches updated requirement';
    } else if (byCurrent) {
      actualLabel = byCurrent.label;
      apiName = byCurrent.name;
      pass = false;
      notes = `Still shows old label; should be updated to: "${updatedLabel}"`;
    } else {
      notes =
        updatedLabel === 'National Producer Number for the Producer'
          ? 'Expected separate field "National Producer Number for the Producer" (split from original); not found in org.'
          : `No field found matching current or updated label`;
    }

    results.push({
      currentLabel,
      updatedLabel,
      foundByUpdatedLabel: !!byUpdated,
      foundByCurrentLabel: !!byCurrent,
      actualLabel,
      apiName,
      pass,
      notes,
    });
  }

  return results;
}

function generateHtmlReport(results: ComplianceCheckResult[], generatedAt: string): string {
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;
  const rows = results
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.currentLabel)}</td>
      <td>${escapeHtml(r.updatedLabel)}</td>
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
  <title>Opportunity Readiness — Compliance Section Label Validation</title>
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
  <h1>Opportunity_Readiness__c — Compliance Section Label Validation</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} | Object: ${OBJECT_NAME} | Source: API describe</p>
  <div class="summary ${failCount === 0 ? 'pass' : 'fail'}">
    <strong>Summary:</strong> ${passCount} of ${results.length} checks passed, ${failCount} failed.
    ${failCount === 0 ? 'All compliance labels match updated requirements.' : 'Some fields still use old labels or are missing.'}
  </div>
  <table>
    <thead>
      <tr>
        <th>Current Field Name (old)</th>
        <th>Updated Field Name (expected)</th>
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  console.log('  Opportunity_Readiness__c — Compliance Section Label Validation');
  console.log('  (Updated requirements: new field labels)');
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

  console.log('📋 Running compliance section label checks (updated requirements)...');
  const results = runComplianceChecks(fields);
  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.length - passCount;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  Results');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');
  results.forEach((r, i) => {
    const icon = r.pass ? '✅' : '❌';
    console.log(`  ${i + 1}. ${icon} ${r.updatedLabel}`);
    console.log(`     Current (old): ${r.currentLabel}`);
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
  const htmlPath = path.join(reportDir, `Opportunity-Readiness-Compliance-Labels-${timestamp}.html`);
  const html = generateHtmlReport(results, generatedAt);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`📊 Report saved: ${htmlPath}\n`);
}

main().catch((err: any) => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
