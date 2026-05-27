#!/usr/bin/env ts-node
/**
 * Describe Opportunity_Readiness__c (Opportunity Summary) fields via Salesforce API.
 * Outputs field label, API name, help text (inlineHelpText), and type so you can
 * compare with the Excel sheet without manually checking each field in the UI.
 *
 * Reference: data/excel/Opportunity Summary Fields (1).xlsx / SF-357
 *
 * Note: Describe returns only fields the authenticated user can see (FLS). If you
 * see fewer than 30 fields, run as QA MRD User so describe returns all fields:
 *   SF_USE_QA_MRD_FOR_API=true npm run describe:OpportunityReadiness
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/describe-opportunity-readiness-fields.ts
 *   npm run describe:OpportunityReadiness
 *   SF_USE_QA_MRD_FOR_API=true npm run describe:OpportunityReadiness
 *
 * Output:
 *   - Console: table of all fields with Label | API Name | Help Text | Type
 *   - reports/opportunity-readiness-fields.csv (for Excel comparison)
 *   - Comparison of expected (Excel) labels vs described fields
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT_NAME = 'Opportunity_Readiness__c';

/** Expected field labels from Excel (Opportunity Summary Fields) – order matches spec */
const EXPECTED_LABELS_EXCEL = [
  'Name of prospect',
  'Summary of deal',
  'Proposed Effective Date',
  'Business Plan Provided',
  'Business Plan Details',
  'Brief history of MGA',
  'Key people involved',
  'Historic GWP & GLR',
  'Proposed Member Commission',  // Excel may say "Comission"; UI/API often "Commission"
  'Previous Capacity',
  'Reason for change',
  'Product Description',
  'Limits',
  'Portfolio mix',
  'Deal Currency',               // UI may show as "Currency"
  'Est. Year 1 GWP',
  'Est. Year 2 GWP',
  'Reinsurance restrictions',
  'Reinsurance restriction details',
  'Claims Solution',
  'TPA Names',
  'Member Operating Region',
  'Geographies',
  'State/Provinces',
  'Distribution clash',
  'Distribution clash details',
  'Technical result',
  'Reason for support',
  'Opportunity Summary Fields Completed By',  // UI may show "Summary Fields Completed By"
  'Opportunity Summary Fields Completed Date',
];

interface SfField {
  name: string;
  label: string;
  type: string;
  inlineHelpText?: string | null;
  length?: number;
  precision?: number;
  scale?: number;
  nillable?: boolean;
  createable?: boolean;
  updateable?: boolean;
  [key: string]: any;
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

function normalizeLabel(s: string): string {
  return (s || '').toLowerCase().trim();
}

function main(): void {
  const env = (process.env.ENV || 'qa').toLowerCase();
  process.env.ENV = env;
  const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
    console.log(`[OK] Loaded ${envFile}\n`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`  Describe: ${OBJECT_NAME} (Opportunity Summary)`);
  console.log('  Compare with Excel: Opportunity Summary Fields');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  const apiUser =
    process.env.SF_API_JWT_USERNAME ||
    (process.env.SF_USE_QA_MRD_FOR_API === 'true' ? process.env.SF_QAMRDUSER_JWT_USERNAME : undefined);

  SalesforceJWTAuth.authenticate(apiUser)
    .then(async (auth) => {
      const data = await describeObject(auth.accessToken, auth.instanceUrl, OBJECT_NAME);
      const fields: SfField[] = data.fields || [];

      console.log(`✅ Described ${fields.length} fields via API\n`);

      // Sort: put expected (Excel) fields first in spec order, then rest alphabetically by label
      const ordered: SfField[] = [];
      const seen = new Set<string>();
      for (const label of EXPECTED_LABELS_EXCEL) {
        const match = fields.find(
          (f) =>
            !seen.has(f.name) &&
            (normalizeLabel(f.label) === normalizeLabel(label) ||
              (label === 'Proposed Member Commission' && normalizeLabel(f.label).includes('commission')) ||
              (label === 'Deal Currency' && (normalizeLabel(f.label) === 'currency' || f.name === 'CurrencyIsoCode')))
        );
        if (match) {
          ordered.push(match);
          seen.add(match.name);
        }
      }
      const rest = fields.filter((f) => !seen.has(f.name));
      rest.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
      const allOrdered = [...ordered, ...rest];

      // Table: Label | API Name | Help Text | Type
      const colLabel = 'Field Label';
      const colApi = 'API Name';
      const colHelp = 'Help Text';
      const colType = 'Type';
      const wLabel = Math.max(colLabel.length, ...allOrdered.map((f) => (f.label || '').length), 35);
      const wApi = Math.max(colApi.length, ...allOrdered.map((f) => (f.name || '').length), 45);
      const wType = Math.max(colType.length, 12);
      const header = `${colLabel.padEnd(wLabel)} | ${colApi.padEnd(wApi)} | ${colType.padEnd(wType)} | ${colHelp}`;
      console.log(header);
      console.log('-'.repeat(Math.min(header.length, 160)));

      const csvRows: string[] = ['Field Label,API Name,Type,Help Text'];
      for (const f of allOrdered) {
        const help = (f.inlineHelpText || '').replace(/\r?\n/g, ' ').replace(/"/g, '""');
        const line = `${(f.label || '').padEnd(wLabel)} | ${(f.name || '').padEnd(wApi)} | ${(f.type || '').padEnd(wType)} | ${(help.substring(0, 80))}${help.length > 80 ? '...' : ''}`;
        console.log(line);
        csvRows.push(`"${(f.label || '').replace(/"/g, '""')}","${(f.name || '').replace(/"/g, '""')}","${(f.type || '').replace(/"/g, '""')}","${help}"`);
      }

      // Comparison: Excel expected vs described
      console.log('\n═══════════════════════════════════════════════════════════════════════════');
      console.log('  Comparison with Excel (expected field labels)');
      console.log('═══════════════════════════════════════════════════════════════════════════\n');

      const describedLabels = new Set(fields.map((f) => f.label));
      const describedNorm = new Set(fields.map((f) => normalizeLabel(f.label)));
      const missingInOrg: string[] = [];
      const foundInOrg: string[] = [];
      const aliasMatch: Record<string, string[]> = {
        'Proposed Member Commission': ['commission'],
        'Deal Currency': ['currency'],
        'Opportunity Summary Fields Completed By': ['summary', 'completed', 'by'],
        'Opportunity Summary Fields Completed Date': ['summary', 'completed', 'date'],
      };
      for (const expected of EXPECTED_LABELS_EXCEL) {
        const norm = normalizeLabel(expected);
        let found =
          describedLabels.has(expected) ||
          describedNorm.has(norm);
        if (!found && aliasMatch[expected]) {
          const tokens = aliasMatch[expected];
          found = fields.some((f) => {
            const n = normalizeLabel(f.label);
            return tokens.every((t) => n.includes(t));
          });
        }
        if (found) {
          foundInOrg.push(expected);
        } else {
          missingInOrg.push(expected);
        }
      }
      console.log(`✅ In org (match Excel): ${foundInOrg.length}/${EXPECTED_LABELS_EXCEL.length}`);
      if (missingInOrg.length > 0) {
        console.log(`\n❌ In Excel but NOT in describe (missing or different label):`);
        missingInOrg.forEach((l) => console.log(`   - ${l}`));
      }
      const extraInOrg = fields.filter(
        (f) => !EXPECTED_LABELS_EXCEL.some((e) => normalizeLabel(e) === normalizeLabel(f.label))
      );
      if (extraInOrg.length > 0) {
        console.log(`\n📋 In org but not in Excel list (${extraInOrg.length}):`);
        extraInOrg.slice(0, 15).forEach((f) => console.log(`   - ${f.label} (${f.name})`));
        if (extraInOrg.length > 15) console.log(`   ... and ${extraInOrg.length - 15} more`);
      }

      // Write CSV
      const reportDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      const csvPath = path.join(reportDir, 'opportunity-readiness-fields.csv');
      fs.writeFileSync(csvPath, csvRows.join('\n'), 'utf-8');
      console.log(`\n📄 CSV saved: ${csvPath} (open in Excel to compare with spec)`);
      console.log('\nDone.\n');
    })
    .catch((err: any) => {
      console.error('Error:', err.message);
      process.exit(1);
    });
}

main();
