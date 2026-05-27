/**
 * SF-920 — Verify MOU / questionnaire text field max lengths vs BA spec (Describe API).
 * BA: Conceptual Coverage 200, Limits 300, Underwriting Considerations 10,000, Other Considerations 200
 *
 * Usage: ENV=qa npx ts-node scripts/verify-sf920-mou-field-lengths.ts
 */
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const OBJECT = 'Opportunity_Readiness__c';

/** Label substring → expected max length (characters) per BA SF-920 */
const EXPECTED: { match: (label: string) => boolean; max: number; name: string }[] = [
  { name: 'Conceptual Coverage', max: 200, match: (l) => l.includes('conceptual') && l.includes('coverage') },
  { name: 'Limits', max: 300, match: (l) => l.trim() === 'limits' },
  {
    name: 'Underwriting Considerations',
    max: 10000,
    match: (l) => l.includes('underwriting') && l.includes('consideration'),
  },
  {
    name: 'Other Considerations',
    max: 200,
    match: (l) => l.includes('other') && l.includes('consideration'),
  },
];

async function main(): Promise<void> {
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

  const auth = await SalesforceJWTAuth.authenticate(apiUser);
  const apiVersion = (config.getSalesforceConfig().apiVersion || 'v59.0').replace(/^v/, '');
  const url = `${auth.instanceUrl.replace(/\/$/, '')}/services/data/v${apiVersion}/sobjects/${OBJECT}/describe`;
  const { data } = await axios.get(url, {
    headers: { Authorization: `Bearer ${auth.accessToken}` },
  });

  const fields: { label: string; name: string; type: string; length?: number }[] = data.fields || [];
  console.log(`Described ${OBJECT}: ${fields.length} fields\n`);
  console.log('BA expected max lengths: Conceptual Coverage=200, Limits=300, Underwriting Considerations=10000, Other Considerations=200\n');

  let failures = 0;
  for (const spec of EXPECTED) {
    const field = fields.find((f) => spec.match((f.label || '').toLowerCase()));
    if (!field) {
      console.log(`❌ ${spec.name}: no field matched (check label in org)\n`);
      failures++;
      continue;
    }
    const len = field.length;
    const ok = len === spec.max;
    const icon = ok ? '✅' : '❌';
    console.log(
      `${icon} ${spec.name}\n   Label: "${field.label}"\n   API: ${field.name}\n   Salesforce type: ${field.type}\n   Max length (org): ${len ?? '(n/a)'}\n   BA expected: ${spec.max}\n`
    );
    if (!ok) failures++;
  }

  if (failures > 0) {
    console.log(`\n${failures} mismatch(es) or missing field(s).`);
    process.exit(1);
  }
  console.log('All four MOU fields match BA character limits.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
