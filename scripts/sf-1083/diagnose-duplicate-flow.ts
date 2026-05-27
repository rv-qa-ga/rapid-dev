/**
 * SF-1083 diagnostic: end-to-end duplicate flow against a single object (default ASLOB__c).
 * 1) Create baseline with discovered name field.
 * 2) Create probe with allowSave=false → expect DUPLICATES_DETECTED.
 * 3) Create probe with allowSave=true → expect 201 + Match Key populated.
 * 4) Cleanup.
 */
import { request } from '@playwright/test';
import { loadEnvFileWithShellPreserved } from '../../src/config/config';
import { SalesforceAPIClient } from '../../src/api-clients/salesforce/SalesforceAPIClient';
import { extractMatchedRecordIdsFromDuplicateBody } from '../../src/utils/sf-duplicate-api-parse';
import * as path from 'path';
import * as fs from 'fs';

interface FieldMeta {
  name?: string;
  label?: string;
  type?: string;
  createable?: boolean;
  autoNumber?: boolean;
  calculated?: boolean;
  nillable?: boolean;
  defaultedOnCreate?: boolean;
}

function pickNameField(obj: string, fields: FieldMeta[]): string {
  const stdName = fields.find((f) => f.name === 'Name');
  if (stdName?.createable === true && stdName?.autoNumber !== true) return 'Name';
  const cands = fields.filter(
    (f) =>
      f.createable === true &&
      f.autoNumber !== true &&
      f.calculated !== true &&
      f.type === 'string' &&
      String(f.name || '').endsWith('__c') &&
      (/_Name__c$/i.test(String(f.name)) || /name/i.test(String(f.label || '')))
  );
  cands.sort((a, b) => {
    const aReq = a.nillable === false && a.defaultedOnCreate === false ? 0 : 1;
    const bReq = b.nillable === false && b.defaultedOnCreate === false ? 0 : 1;
    if (aReq !== bReq) return aReq - bReq;
    return String(a.name).length - String(b.name).length;
  });
  if (!cands[0]?.name) throw new Error(`No name-like createable field on ${obj}`);
  return cands[0].name;
}

function pickMatchKey(fields: FieldMeta[]): string | null {
  const exact = fields.find((f) => f.name === 'Match_Key__c');
  if (exact?.name) return exact.name;
  const fuzzy = fields.find((f) => f.name && /match.*key/i.test(f.name) && String(f.name).endsWith('__c'));
  return fuzzy?.name || null;
}

async function main() {
  const obj = process.argv[2] || 'ASLOB__c';
  const baselineName = process.argv[3] || 'First Small Business';
  const probeName = process.argv[4] || 'First - Small Business';

  const env = (process.env.ENV || 'qa').toLowerCase();
  const envFile = path.resolve(process.cwd(), 'src', 'config', 'env', `.env.${env}`);
  if (fs.existsSync(envFile)) loadEnvFileWithShellPreserved(envFile);

  const ctx = await request.newContext({ ignoreHTTPSErrors: true });
  const client = new SalesforceAPIClient(ctx);
  await client.authenticate();

  const meta = await client.describeSObject(obj);
  const fields = (meta?.fields || []) as FieldMeta[];
  const nameField = pickNameField(obj, fields);
  const mk = pickMatchKey(fields);
  console.log(`OBJECT=${obj}  nameField=${nameField}  matchKey=${mk || '(none)'}`);

  const stamp = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const baselineFull = `SF1083_DIAG_${stamp}_${baselineName}`;
  const probeFull = `SF1083_DIAG_${stamp}_${probeName}`;

  let baselineId: string | undefined;
  let probeId: string | undefined;
  try {
    const r1 = await client.createRecord(obj, { [nameField]: baselineFull });
    baselineId = r1.id as string;
    console.log(`baseline OK ${baselineId} ${nameField}="${baselineFull}"`);

    const probe1 = await client.createRecordRaw(obj, { [nameField]: probeFull }, { duplicateRuleAllowSave: false });
    console.log(`probe(enforce) http=${probe1.httpStatus} dup=${probe1.duplicateDetected}`);
    console.log(`  rawSnippet=${probe1.rawText.slice(0, 600)}`);
    const matched = extractMatchedRecordIdsFromDuplicateBody(probe1.body);
    console.log(`  matchedIds=${matched.join(', ') || '(none)'}`);
    console.log(`  baselineId in matchedIds? ${matched.includes(baselineId!)}`);

    const probe2 = await client.createRecordRaw(obj, { [nameField]: probeFull }, { duplicateRuleAllowSave: true });
    console.log(`probe(ack) http=${probe2.httpStatus} ok=${probe2.ok} id=${probe2.recordId}`);
    if (probe2.recordId) probeId = probe2.recordId;

    if (mk && probeId) {
      const row = await client.getRecordWithFields(obj, probeId, [mk]);
      console.log(`  probe ${mk} = ${JSON.stringify((row as any)[mk])}`);
    }
  } finally {
    if (probeId) {
      try {
        await client.deleteRecord(obj, probeId);
        console.log(`cleaned probe ${probeId}`);
      } catch (e: any) {
        console.warn(`probe cleanup failed: ${e?.message}`);
      }
    }
    if (baselineId) {
      try {
        await client.deleteRecord(obj, baselineId);
        console.log(`cleaned baseline ${baselineId}`);
      } catch (e: any) {
        console.warn(`baseline cleanup failed: ${e?.message}`);
      }
    }
    await ctx.dispose();
  }
}

main().catch((e) => {
  console.error('DIAG ERROR', e?.stack || e?.message || e);
  process.exit(1);
});
