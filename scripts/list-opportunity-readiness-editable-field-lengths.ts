/**
 * List max character length for editable (updateable) text-like fields on Opportunity_Readiness__c.
 * Uses Salesforce Describe API (same as SF-920 verification).
 *
 * Usage: ENV=qa npx ts-node scripts/list-opportunity-readiness-editable-field-lengths.ts
 * Output: console table + reports/opportunity-readiness-editable-field-lengths.csv
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT = 'Opportunity_Readiness__c';

/** Types that carry a meaningful max length for data entry */
const TEXT_LIKE_TYPES = new Set([
  'string',
  'textarea',
  'url',
  'email',
  'phone',
  'encryptedstring',
]);

interface SfField {
  name: string;
  label: string;
  type: string;
  length?: number;
  updateable?: boolean;
  createable?: boolean;
  calculated?: boolean;
  nillable?: boolean;
}

function main(): void {
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

  SalesforceJWTAuth.authenticate(apiUser)
    .then(async (auth) => {
      const apiVersion = (config.getSalesforceConfig().apiVersion || 'v59.0').replace(/^v/, '');
      const url = `${auth.instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${OBJECT}/describe`;
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      const fields: SfField[] = data.fields || [];

      const textLikeUpdateable = fields.filter(
        (f) =>
          f.updateable === true &&
          !f.calculated &&
          TEXT_LIKE_TYPES.has((f.type || '').toLowerCase())
      );

      textLikeUpdateable.sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' }));

      const mouApi = new Set([
        'ConceptualCoverage__c',
        'Limits__c',
        'UnderwritingConsiderations__c',
        'OtherConsiderations__c',
      ]);

      const others = textLikeUpdateable.filter((f) => !mouApi.has(f.name));
      const mou = textLikeUpdateable.filter((f) => mouApi.has(f.name));

      console.log(`Object: ${OBJECT} (${fields.length} fields total)\n`);
      console.log('### MOU / SF-920 quartet (reference)\n');
      printMarkdownTable(mou);

      console.log('\n### All other editable text-like fields (max length)\n');
      printMarkdownTable(others);

      const csvLines = [
        'Section,Field Label,API Name,Salesforce Type,Max Length,Nillable',
        ...mou.map((f) =>
          csvRow('MOU (SF-920)', f.label, f.name, f.type, f.length, f.nillable)
        ),
        ...others.map((f) =>
          csvRow('Other', f.label, f.name, f.type, f.length, f.nillable)
        ),
      ];
      const reportDir = path.join(process.cwd(), 'reports');
      if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
      const csvPath = path.join(reportDir, 'opportunity-readiness-editable-field-lengths.csv');
      fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');
      console.log(`\nCSV: ${csvPath}`);
    })
    .catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
}

function csvRow(
  section: string,
  label: string,
  api: string,
  typ: string,
  len: number | undefined,
  nillable: boolean | undefined
): string {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  return [section, esc(label), esc(api), esc(typ), len ?? '', nillable === false ? 'Required' : ''].join(',');
}

function printMarkdownTable(rows: SfField[]): void {
  console.log('| Field label | API name | Type | Max length |');
  console.log('|-------------|----------|------|------------|');
  for (const f of rows) {
    const len = f.length != null ? String(f.length) : '—';
    console.log(`| ${escapeMd(f.label || '')} | \`${f.name}\` | ${f.type} | ${len} |`);
  }
  if (rows.length === 0) {
    console.log('| — | — | — | — |');
  }
}

function escapeMd(s: string): string {
  return s.replace(/\|/g, '\\|');
}

main();
