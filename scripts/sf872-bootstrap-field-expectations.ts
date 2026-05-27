/**
 * One-time / refresh: pull Salesforce describe for each SF-872 object and write
 * data/sf872/expected-fields/<Object__c>.json (apiName, label, dataType).
 *
 *   npx cross-env ENV=qa ts-node scripts/sf872-bootstrap-field-expectations.ts
 *
 * Commit the JSON files; API tests compare the org to this golden matrix.
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from '../src/config/config';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import {
  formatDescribeFieldDataType,
  type DescribeFieldLike,
  type Sf872ExpectedField,
  type Sf872ExpectedFieldMatrixFile,
} from '../src/utils/sf872-field-matrix';

const OBJECTS = [
  'Sub_Product__c',
  'POG_Product__c',
  'OSFI__c',
  'Member_Product_and_Program__c',
  'Line_of_Business__c',
  'Classes_of_Business__c',
  'BEGAAP_COB__c',
  'ASLOB__c',
  'Solvency_II__c',
  'Insurance_Product__c',
];

async function describeSObject(
  accessToken: string,
  instanceUrl: string,
  objectApiName: string
): Promise<{ fields: DescribeFieldLike[] }> {
  const ver = config.getSalesforceConfig().apiVersion.replace(/^v/, '');
  const base = instanceUrl.replace(/\/$/, '');
  const url = `${base}/services/data/v${ver}/sobjects/${encodeURIComponent(objectApiName)}/describe`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Describe ${objectApiName} failed ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<{ fields: DescribeFieldLike[] }>;
}

async function main() {
  const auth = await SalesforceJWTAuth.authenticate();
  const outDir = path.join(process.cwd(), 'data', 'sf872', 'expected-fields');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const generatedAt = new Date().toISOString();

  for (const objectApiName of OBJECTS) {
    console.log(`Describing ${objectApiName}…`);
    const desc = await describeSObject(auth.accessToken, auth.instanceUrl, objectApiName);
    const fields: Sf872ExpectedField[] = (desc.fields || [])
      .map((f) => ({
        apiName: f.name,
        label: (f.label || '').trim(),
        dataType: formatDescribeFieldDataType(f),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

    const doc: Sf872ExpectedFieldMatrixFile = {
      objectApiName,
      generatedAt,
      note: 'Generated from org describe; SF-872 API tests treat this as the expected field matrix.',
      fields,
    };

    const filePath = path.join(outDir, `${objectApiName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf8');
    console.log(`  Wrote ${fields.length} fields → ${filePath}`);
  }

  console.log('\nDone. Review diffs and commit data/sf872/expected-fields/*.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
