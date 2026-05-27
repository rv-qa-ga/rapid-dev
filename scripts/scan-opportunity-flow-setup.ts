#!/usr/bin/env ts-node
/**
 * Scan Opportunity / Opportunity Readiness / Member Onboarding flow objects in QA
 * for basic setup issues: spelling in labels/API names, missing help text,
 * required-field consistency. Outputs a findings report.
 *
 * Objects scanned: Opportunity, Opportunity_Readiness__c, Task, Account
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/scan-opportunity-flow-setup.ts
 *   npm run scan:opportunity-flow-setup
 *   SF_USE_QA_MRD_FOR_API=true npm run scan:opportunity-flow-setup  # describe as MRD to see all fields
 *
 * Output: reports/opportunity-flow-setup-scan-<timestamp>.txt and .json
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECTS_TO_SCAN = ['Account', 'Opportunity', 'Opportunity_Readiness__c', 'Task'];

/** Common spelling mistakes: wrong -> correct (for labels and API names) */
const SPELLING_CHECKS: Array<{ wrong: RegExp; correct: string; note: string }> = [
  { wrong: /Recipt/i, correct: 'Receipt', note: 'Common typo: Recipt should be Receipt' },
  { wrong: /Recieved/i, correct: 'Received', note: 'Common typo: Recieved should be Received' },
  { wrong: /Questionaire/i, correct: 'Questionnaire', note: 'Common typo: Questionaire should be Questionnaire' },
  { wrong: /Comission/i, correct: 'Commission', note: 'Common typo: Comission should be Commission' },
  { wrong: /Occurence/i, correct: 'Occurrence', note: 'Common typo: Occurence should be Occurrence' },
  { wrong: /Seperator/i, correct: 'Separator', note: 'Common typo: Seperator should be Separator' },
  { wrong: /Refered/i, correct: 'Referred', note: 'Common typo: Refered should be Referred' },
  { wrong: /Recieve/i, correct: 'Receive', note: 'Common typo: Recieve should be Receive' },
  { wrong: /Accross/i, correct: 'Across', note: 'Common typo: Accross should be Across' },
  { wrong: /Enviroment/i, correct: 'Environment', note: 'Common typo: Enviroment should be Environment' },
  { wrong: /Guarentee/i, correct: 'Guarantee', note: 'Common typo: Guarentee should be Guarantee' },
];

interface SfField {
  name: string;
  label: string;
  type: string;
  inlineHelpText?: string | null;
  nillable?: boolean;
  createable?: boolean;
  updateable?: boolean;
  custom?: boolean;
  length?: number;
  [key: string]: any;
}

interface Finding {
  object: string;
  severity: 'error' | 'warning' | 'info';
  category: 'spelling' | 'help_text' | 'label_consistency' | 'required';
  message: string;
  fieldApiName?: string;
  fieldLabel?: string;
  suggestion?: string;
}

async function describeObject(
  accessToken: string,
  instanceUrl: string,
  objectName: string
): Promise<{ fields: SfField[] }> {
  const apiVersion = config.getSalesforceConfig().apiVersion?.replace(/^v/, '') || '59.0';
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${objectName}/describe`;
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  return response.data;
}

function checkSpelling(objName: string, field: SfField, findings: Finding[]): void {
  const toCheck = [field.label || '', field.name || ''];
  const reported = new Set<string>();
  for (const text of toCheck) {
    for (const { wrong, correct, note } of SPELLING_CHECKS) {
      if (wrong.test(text)) {
        const key = `${objName}|${field.name}|${correct}`;
        if (reported.has(key)) continue;
        reported.add(key);
        findings.push({
          object: objName,
          severity: 'error',
          category: 'spelling',
          message: note,
          fieldApiName: field.name,
          fieldLabel: field.label,
          suggestion: `Consider correcting to "${correct}" (API name change requires deployment; label can be updated in Setup).`,
        });
      }
    }
  }
}

function checkHelpText(objName: string, field: SfField, findings: Finding[]): void {
  if (!field.custom) return;
  const hasHelp = field.inlineHelpText && String(field.inlineHelpText).trim().length > 0;
  const required = field.nillable === false && (field.createable || field.updateable);
  if (required && !hasHelp) {
    findings.push({
      object: objName,
      severity: 'warning',
      category: 'help_text',
      message: 'Custom required field has no help text.',
      fieldApiName: field.name,
      fieldLabel: field.label,
      suggestion: 'Add inline help text in Setup for user guidance.',
    });
  }
}

function runScan(): void {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
    console.log(`[OK] Loaded ${envFile}\n`);
  }

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('  Opportunity Flow – Setup & Quality Scan (QA)');
  console.log('  Objects: ' + OBJECTS_TO_SCAN.join(', '));
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  SalesforceJWTAuth.authenticate(apiUser)
    .then(async (auth) => {
      const allFindings: Finding[] = [];
      const fieldSummary: Record<string, { total: number; custom: number; required: number; withHelp: number }> = {};

      for (const objectName of OBJECTS_TO_SCAN) {
        try {
          const data = await describeObject(auth.accessToken, auth.instanceUrl, objectName);
          const fields: SfField[] = data.fields || [];
          const customFields = fields.filter((f) => f.custom === true);
          const requiredFields = fields.filter((f) => f.nillable === false && (f.createable || f.updateable));
          const withHelp = fields.filter((f) => f.inlineHelpText && String(f.inlineHelpText).trim().length > 0);

          fieldSummary[objectName] = {
            total: fields.length,
            custom: customFields.length,
            required: requiredFields.length,
            withHelp: withHelp.length,
          };

          for (const f of fields) {
            checkSpelling(objectName, f, allFindings);
            checkHelpText(objectName, f, allFindings);
          }
        } catch (err: any) {
          console.error(`❌ Failed to describe ${objectName}: ${err.message}`);
        }
      }

      // Report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const reportDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      const reportPath = path.join(reportDir, `opportunity-flow-setup-scan-${timestamp}.txt`);
      const jsonPath = path.join(reportDir, `opportunity-flow-setup-scan-${timestamp}.json`);

      const lines: string[] = [];
      lines.push('OPPORTUNITY FLOW – SETUP & QUALITY SCAN (QA)');
      lines.push('Generated: ' + new Date().toISOString());
      lines.push('');
      lines.push('OBJECT SUMMARY');
      lines.push('-------------');
      for (const [obj, s] of Object.entries(fieldSummary)) {
        lines.push(`  ${obj}: ${s.total} fields (${s.custom} custom, ${s.required} required, ${s.withHelp} with help text)`);
      }
      lines.push('');
      lines.push('FINDINGS');
      lines.push('--------');

      if (allFindings.length === 0) {
        lines.push('  No spelling or help-text issues detected.');
        lines.push('  (Questionnaires_Recipt__c on Task is a known typo – confirm in org if label/API name should be fixed.)');
      } else {
        for (const f of allFindings) {
          lines.push(`  [${f.severity.toUpperCase()}] ${f.object}.${f.fieldApiName || '?'} (${f.fieldLabel || '-'})`);
          lines.push(`    ${f.message}`);
          if (f.suggestion) lines.push(`    Suggestion: ${f.suggestion}`);
          lines.push('');
        }
      }

      lines.push('');
      lines.push('KNOWN CANDIDATE (verify in org)');
      lines.push('-----------------------------');
      lines.push('  • Opportunity.Questionnaires_Recipt__c – "Recipt" is a spelling error; correct form is "Receipt".');
      lines.push('    Label in org: "Questionnaires Recipt Received". If the API name stays as-is, at minimum set the');
      lines.push('    Label to "Questionnaires Receipt Received" in Setup; API rename requires new field or deployment.');
      lines.push('');

      const reportContent = lines.join('\n');
      fs.writeFileSync(reportPath, reportContent, 'utf-8');
      fs.writeFileSync(jsonPath, JSON.stringify({ generated: new Date().toISOString(), summary: fieldSummary, findings: allFindings }, null, 2), 'utf-8');

      console.log(reportContent);
      console.log(`\n📄 Report: ${reportPath}`);
      console.log(`📄 JSON:   ${jsonPath}\n`);
    })
    .catch((err: any) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

runScan();
