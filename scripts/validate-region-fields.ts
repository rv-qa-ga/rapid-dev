#!/usr/bin/env ts-node
/**
 * Validate region-level fields on Salesforce objects (Opportunity, Account, Lead).
 *
 * Uses the same approach as the Compliance label check: Salesforce describe API on each
 * object, then compare field metadata (label / API name) to expected region-related fields.
 * Use this to confirm "region level" fields exist and have the expected labels in the org.
 *
 * How region-level is checked:
 *   - Object(s) to check are configured below (default: Opportunity, optional: Account, Lead).
 *   - For each object we call GET /services/data/vXX/sobjects/<ObjectApiName>/describe.
 *   - We then verify each expected field exists (by API name or by label match).
 *
 * To add more objects or fields: edit REGION_OBJECTS_CONFIG.
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/validate-region-fields.ts
 *   SF_USE_QA_MRD_FOR_API=true npm run validate:RegionFields
 *   npm run validate:RegionFields
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

interface SfField {
  name: string;
  label: string;
  type: string;
  [key: string]: any;
}

/** Per-object config: object API name → list of expected region-related fields.
 *  Either apiName (then we only check existence) or expectedLabel (we check label match; optional apiName for clarity). */
const REGION_OBJECTS_CONFIG: Array<{
  objectApiName: string;
  objectLabel?: string;
  fields: Array<{ apiName: string; expectedLabel?: string; labelVariants?: string[] }>;
}> = [
  {
    objectApiName: 'Opportunity',
    objectLabel: 'Opportunity',
    fields: [
      { apiName: 'Region__c', expectedLabel: 'Region', labelVariants: ['Region__c'] },
      { apiName: 'Distribution_Region__c', expectedLabel: 'Distribution Region', labelVariants: ['Distribution Region__c'] },
      { apiName: 'Distribution_Region_Name__c', expectedLabel: 'Distribution Region Name', labelVariants: [] },
    ],
  },
  // Uncomment to also check Account / Lead region fields (e.g. before SF-728 retirement):
  // {
  //   objectApiName: 'Account',
  //   objectLabel: 'Account',
  //   fields: [
  //     { apiName: 'Region__c', expectedLabel: 'Region' },
  //     { apiName: 'Distribution_Region__c', expectedLabel: 'Distribution Region' },
  //   ],
  // },
  // {
  //   objectApiName: 'Lead',
  //   objectLabel: 'Lead',
  //   fields: [
  //     { apiName: 'Region__c', expectedLabel: 'Region' },
  //     { apiName: 'Distribution_Region__c', expectedLabel: 'Distribution Region' },
  //   ],
  // },
];

interface FieldCheckResult {
  objectApiName: string;
  objectLabel: string;
  apiName: string;
  expectedLabel: string | null;
  found: boolean;
  actualLabel: string | null;
  actualType: string | null;
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
): Promise<{ fields: SfField[]; label?: string }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  return axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }).then((r) => r.data);
}

function findFieldByApiName(fields: SfField[], apiName: string): SfField | null {
  return fields.find((f) => f.name === apiName) || null;
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
  return fields.find((x) => normalizeLabel(x.label).includes(norm) || norm.includes(normalizeLabel(x.label))) || null;
}

function runRegionChecks(
  objectApiName: string,
  objectLabel: string,
  fields: SfField[],
  fieldConfigs: Array<{ apiName: string; expectedLabel?: string; labelVariants?: string[] }>
): FieldCheckResult[] {
  const results: FieldCheckResult[] = [];

  for (const fc of fieldConfigs) {
    const byApi = findFieldByApiName(fields, fc.apiName);
    let pass = false;
    let actualLabel: string | null = null;
    let actualType: string | null = null;
    let notes = '';

    if (byApi) {
      actualLabel = byApi.label;
      actualType = byApi.type;
      if (fc.expectedLabel == null) {
        pass = true;
        notes = 'Field exists';
      } else {
        const expectedNorm = normalizeLabel(fc.expectedLabel);
        const actualNorm = normalizeLabel(byApi.label);
        if (actualNorm === expectedNorm) {
          pass = true;
          notes = 'Label matches expected';
        } else {
          const byVariant = fc.labelVariants?.length
            ? fc.labelVariants.some((v) => normalizeLabel(v) === actualNorm)
            : false;
          if (byVariant) {
            pass = true;
            notes = 'Label matches accepted variant';
          } else {
            pass = false;
            notes = `Expected label "${fc.expectedLabel}"; actual "${byApi.label}"`;
          }
        }
      }
    } else {
      // Require match by API name only; do not match by label (avoids e.g. "Name" matching "Distribution Region Name")
      notes = `Field ${fc.apiName} not found in describe`;
    }

    results.push({
      objectApiName,
      objectLabel,
      apiName: fc.apiName,
      expectedLabel: fc.expectedLabel ?? null,
      found: !!byApi,
      actualLabel,
      actualType,
      pass,
      notes,
    });
  }

  return results;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function generateHtmlReport(allResults: FieldCheckResult[], generatedAt: string): string {
  const totalPass = allResults.filter((r) => r.pass).length;
  const totalFail = allResults.length - totalPass;
  const rows = allResults
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.objectLabel)}</td>
      <td>${escapeHtml(r.apiName)}</td>
      <td>${r.expectedLabel != null ? escapeHtml(r.expectedLabel) : '—'}</td>
      <td>${r.actualLabel != null ? escapeHtml(r.actualLabel) : '—'}</td>
      <td>${r.actualType != null ? escapeHtml(r.actualType) : '—'}</td>
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
  <title>Region-Level Fields Validation</title>
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
  <h1>Region-Level Fields Validation</h1>
  <p class="meta">Generated: ${escapeHtml(generatedAt)} | Source: Salesforce describe API (per object)</p>
  <div class="summary ${totalFail === 0 ? 'pass' : 'fail'}">
    <strong>Summary:</strong> ${totalPass} of ${allResults.length} checks passed, ${totalFail} failed.
    ${totalFail === 0 ? 'All region-level fields present with expected labels.' : 'Some fields missing or label mismatch.'}
  </div>
  <table>
    <thead>
      <tr>
        <th>Object</th>
        <th>API Name</th>
        <th>Expected Label</th>
        <th>Actual Label in Org</th>
        <th>Type</th>
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
  console.log('  Region-Level Fields Validation');
  console.log('  (Salesforce describe API per object)');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);
  if (apiUser) console.log(`🔐 Using JWT user: ${apiUser}\n`);

  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  const allResults: FieldCheckResult[] = [];

  for (const objConfig of REGION_OBJECTS_CONFIG) {
    const objectName = objConfig.objectApiName;
    const objectLabel = objConfig.objectLabel ?? objectName;
    console.log(`📡 Describing ${objectName}...`);
    try {
      const describeData = await describeObject(auth.accessToken, auth.instanceUrl, objectName);
      const fields: SfField[] = describeData.fields || [];
      console.log(`   ✅ ${fields.length} fields returned.`);
      const results = runRegionChecks(objectName, objectLabel, fields, objConfig.fields);
      allResults.push(...results);
      results.forEach((r) => {
        const icon = r.pass ? '✅' : '❌';
        console.log(`   ${icon} ${r.apiName}: ${r.actualLabel ?? '—'} — ${r.notes}`);
      });
      console.log('');
    } catch (err: any) {
      console.error(`   ❌ Failed to describe ${objectName}: ${err.message}`);
      for (const fc of objConfig.fields) {
        allResults.push({
          objectApiName: objectName,
          objectLabel,
          apiName: fc.apiName,
          expectedLabel: fc.expectedLabel ?? null,
          found: false,
          actualLabel: null,
          actualType: null,
          pass: false,
          notes: `Describe failed: ${err.message}`,
        });
      }
    }
  }

  const totalPass = allResults.filter((r) => r.pass).length;
  const totalFail = allResults.length - totalPass;

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`  Overall: ${totalPass}/${allResults.length} passed, ${totalFail} failed`);
  console.log(`  RESULT: ${totalFail === 0 ? '✅ ALL PASS' : '❌ SOME FAILED'}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replace(/[:.]/g, '-').slice(0, 19);
  const htmlPath = path.join(reportDir, `Region-Fields-Validation-${timestamp}.html`);
  const html = generateHtmlReport(allResults, generatedAt);
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`📊 Report saved: ${htmlPath}\n`);
}

main().catch((err: any) => {
  console.error('Error:', err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
