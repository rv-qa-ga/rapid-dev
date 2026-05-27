/**
 * Seeds three persistent SF-977 manual verification datasets (matches API scenarios 001–003).
 * Uses QA Actuary JWT (same as SF-977 API tests). Does not run Cucumber teardown.
 *
 * Usage:
 *   cross-env ENV=qa npx ts-node scripts/seed-sf977-manual-test-data.ts
 *
 * Requires: SF_QAACTUARYUSER_JWT_USERNAME (+ JWT cert / client id as for other scripts).
 * Optional: SF_JWT_USERNAME (or SF_API_JWT_USERNAME) for Opportunity describe when resolving Sub Type;
 *   if unset, describe uses Actuary. Set SF977_SKIP_EXPANSION_SUB_TYPE=true to skip Sub Type on Opportunity.
 *
 * Org labels: same SF977_* overrides as sf-977.steps.ts / env.sample.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';
import { testDataFactory } from '../src/test-data/TestDataFactory';
import { logger } from '../src/utils/logger';

const PRODUCT_MAP = 'Product_Map__c';

const SUB_TYPE_API_CANDIDATES = [
  'Sub_Type__c',
  'Opportunity_Sub_Type__c',
  'Subtype__c',
  'SubType__c',
  'Opp_Sub_Type__c',
  'OpportunitySubtype__c',
];

function loadEnvFiles(): void {
  const env = process.env.ENV || 'qa';
  const envPaths = [
    path.resolve(__dirname, '../src/config/env', `.env.${env}`),
    path.resolve(__dirname, '../.env.qa'),
    path.resolve(__dirname, '../.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      console.log(`Loaded: ${path.relative(process.cwd(), envPath)}`);
      break;
    }
  }
}

function apiVersionPrefix(): string {
  let v = config.getSalesforceConfig().apiVersion || '60.0';
  return v.startsWith('v') ? v : `v${v}`;
}

function sf977AccountType(): string {
  const raw = process.env.SF977_ACCOUNT_TYPE?.trim() || 'Member';
  const allowed = ['Member', 'Non Member MGA'] as const;
  if (!allowed.includes(raw as (typeof allowed)[number])) {
    throw new Error(`SF977_ACCOUNT_TYPE must be Member or Non Member MGA. Got: "${raw}"`);
  }
  return raw;
}

function expansionOppType(): string {
  return process.env.SF977_OPPORTUNITY_TYPE?.trim() || 'Expansion';
}

function expansionSubTypePicklistValue(): string {
  return (
    process.env.SF977_EXPANSION_SUB_TYPE?.trim() ||
    process.env.SF883_OTHER_SUBTYPE?.trim() ||
    'New Product'
  );
}

function liveStageName(): string {
  return process.env.SF977_OPPORTUNITY_STAGE_LIVE?.trim() || 'Live';
}

function preLiveStageName(): string {
  return process.env.SF977_PRE_LIVE_STAGE?.trim() || 'Go-Live';
}

function statusDraftExpansion(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_DRAFT?.trim() || 'Draft - Product Expansion';
}

function statusActivePending(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_PENDING?.trim() || 'Active - Pending Go-Live';
}

function statusActive(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_ACTIVE?.trim() || 'Active';
}

function statusInactive(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_INACTIVE?.trim() || 'Inactive';
}

function statusFieldApi(): string {
  const f = process.env.SF977_PRODUCT_MAP_STATUS_FIELD?.trim() || 'Status__c';
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(f)) {
    throw new Error(`Invalid SF977_PRODUCT_MAP_STATUS_FIELD: ${f}`);
  }
  return f;
}

function opportunityLookupField(): string {
  const f = process.env.SF977_PRODUCT_MAP_OPPORTUNITY_LOOKUP?.trim() || 'Opportunity__c';
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(f)) {
    throw new Error(`Invalid SF977_PRODUCT_MAP_OPPORTUNITY_LOOKUP: ${f}`);
  }
  return f;
}

function productMapAccountLookupField(): string {
  const f = process.env.SF977_PRODUCT_MAP_ACCOUNT_LOOKUP?.trim() || 'Account__c';
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(f)) {
    throw new Error(`Invalid SF977_PRODUCT_MAP_ACCOUNT_LOOKUP: ${f}`);
  }
  return f;
}

function closeDatePlus30d(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

/** QA org: Active Member accounts require Party_Code__c (max 4, unique). */
function uniquePartyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function onboardedDateToday(): string {
  return new Date().toISOString().split('T')[0];
}

function norm(s: string): string {
  return (s || '').toLowerCase().trim();
}

function subTypeHeuristicMatch(f: { name?: string; label?: string }): boolean {
  if (!f?.name || !String(f.name).endsWith('__c')) return false;
  const label = norm(f.label || '');
  const nm = norm(String(f.name).replace(/__c$/, ''));
  const byLabel =
    label === 'sub type' ||
    label === 'subtype' ||
    (label.includes('sub') && label.includes('type') && !label.includes('object'));
  const byName =
    nm.includes('sub_type') ||
    nm.includes('subtype') ||
    nm.includes('opportunity_sub') ||
    nm.includes('oppsub');
  return byLabel || byName;
}

function discoverSubTypeFromDescribe(fields: any[] | undefined): string[] {
  if (!Array.isArray(fields)) return [];
  const found: string[] = [];
  for (const f of fields) {
    if (f?.createable !== true) continue;
    if (subTypeHeuristicMatch(f)) found.push(f.name);
  }
  return [...new Set(found)];
}

async function describeOpportunity(accessToken: string, instanceUrl: string): Promise<any[]> {
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${apiVersionPrefix()}/sobjects/Opportunity/describe`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`Opportunity describe failed: ${res.status} ${await res.text()}`);
  }
  const j = (await res.json()) as { fields?: any[] };
  return j.fields || [];
}

async function restPost(
  instanceUrl: string,
  accessToken: string,
  objectType: string,
  body: Record<string, unknown>
): Promise<{ id: string; success?: boolean }> {
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${apiVersionPrefix()}/sobjects/${objectType}/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Sforce-Duplicate-Rule-Header': 'allowSave=true',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`POST ${objectType} failed: ${res.status} ${text}`);
  }
  const id = (json as { id?: string }).id;
  if (!id) throw new Error(`POST ${objectType} missing id: ${text}`);
  return { id, success: (json as { success?: boolean }).success };
}

async function restPatch(
  instanceUrl: string,
  accessToken: string,
  objectType: string,
  recordId: string,
  body: Record<string, unknown>
): Promise<void> {
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${apiVersionPrefix()}/sobjects/${objectType}/${recordId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`PATCH ${objectType}/${recordId} failed: ${res.status} ${await res.text()}`);
  }
}

async function buildSubTypeCandidates(
  describeUser: string | undefined,
  actuaryUser: string
): Promise<string[]> {
  const envField =
    process.env.SF977_EXPANSION_SUB_TYPE_FIELD?.trim() || process.env.SF883_SUB_TYPE_API_FIELD?.trim();
  if (envField) return [envField];

  const describeSubject = describeUser?.trim() || actuaryUser;
  const dAuth = await SalesforceJWTAuth.authenticate(describeSubject);
  const fields = await describeOpportunity(dAuth.accessToken, dAuth.instanceUrl);
  const fromDescribe = discoverSubTypeFromDescribe(fields);
  const merged = [...new Set([...fromDescribe, ...SUB_TYPE_API_CANDIDATES])];
  const allowed = new Set(fields.map((f) => f?.name).filter(Boolean));
  let filtered = merged.filter((n) => allowed.has(n));
  if (filtered.length === 0) {
    // Match SF-977: if automation describe omits heuristics, still try known API names on Actuary POST.
    logger.warn(
      'seed-sf977: no Sub Type field matched describe filter; trying static candidates on create.'
    );
    filtered = [...new Set(SUB_TYPE_API_CANDIDATES)];
  }
  return filtered;
}

async function createExpansionOpportunity(
  accountId: string,
  name: string,
  stage: string,
  actuaryUser: string,
  describeUser: string | undefined
): Promise<string> {
  const base: Record<string, any> = {
    Name: name,
    Stage: stage,
    Type: expansionOppType(),
    CloseDate: closeDatePlus30d(),
  };

  if (process.env.SF977_SKIP_EXPANSION_SUB_TYPE === 'true') {
    const r = await testDataFactory.createOpportunity(base, accountId);
    return r.id;
  }

  try {
    const r = await testDataFactory.createOpportunity(base, accountId);
    return r.id;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/Sub Type|SubType|subtype|FIELD_CUSTOM_VALIDATION/i.test(msg)) {
      throw e;
    }
    logger.info('Opportunity create without Sub Type rejected; trying Sub Type fields...');
  }

  const subVal = expansionSubTypePicklistValue();
  const candidates = await buildSubTypeCandidates(describeUser, actuaryUser);
  let lastErr: Error | null = null;
  for (const field of candidates) {
    try {
      const r = await testDataFactory.createOpportunity({ ...base, [field]: subVal }, accountId);
      logger.info(`Created Opportunity with Sub Type field ${field}`);
      return r.id;
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const msg = lastErr.message;
      if (msg.includes('No such column') || (msg.includes('INVALID_FIELD') && msg.includes(field))) {
        continue;
      }
      if (/FIELD_CUSTOM_VALIDATION_EXCEPTION/i.test(msg) && /Sub Type/i.test(msg)) {
        continue;
      }
      throw lastErr;
    }
  }
  throw new Error(
    `Could not create Expansion Opportunity with Sub Type. Last error: ${lastErr?.message}. ` +
      'Set SF977_EXPANSION_SUB_TYPE_FIELD or SF977_SKIP_EXPANSION_SUB_TYPE=true.'
  );
}

async function createProductMapLinked(
  instanceUrl: string,
  token: string,
  accountId: string,
  oppId: string,
  name: string,
  status?: string
): Promise<string> {
  const lookup = opportunityLookupField();
  const accField = productMapAccountLookupField();
  const sf = statusFieldApi();
  const payload: Record<string, unknown> = {
    Name: name,
    [lookup]: oppId,
    [accField]: accountId,
    [sf]: status ?? statusDraftExpansion(),
  };
  const { id } = await restPost(instanceUrl, token, PRODUCT_MAP, payload);
  return id;
}

async function setProductMapStatus(
  instanceUrl: string,
  token: string,
  pmId: string,
  status: string
): Promise<void> {
  await restPatch(instanceUrl, token, PRODUCT_MAP, pmId, { [statusFieldApi()]: status });
}

async function main(): Promise<void> {
  loadEnvFiles();

  const actuary = process.env.SF_QAACTUARYUSER_JWT_USERNAME?.trim();
  if (!actuary) {
    console.error('SF_QAACTUARYUSER_JWT_USERNAME is required.');
    process.exit(1);
  }

  const describeUser =
    process.env.SF_API_JWT_USERNAME?.trim() || process.env.SF_JWT_USERNAME?.trim() || undefined;

  await testDataFactory.initialize(actuary);
  const auth = await SalesforceJWTAuth.authenticate(actuary);
  const { instanceUrl, accessToken } = auth;
  const runId = Date.now();
  const accType = sf977AccountType();

  type Bundle = {
    scenario: string;
    accountId: string;
    opportunityId: string;
    productMapIds: string[];
    notes: string;
  };

  const bundles: Bundle[] = [];

  // --- Dataset 1: SF-977-API-001 (draft Product Map on Expansion opp) ---
  {
    const acc = await testDataFactory.createAccount({
      Name: `SF977_MANUAL_001_${runId}`,
      Type: accType,
      Functional_Currency__c: 'USD',
      Account_Status__c: 'Active',
      Onboarded_Date__c: onboardedDateToday(),
      Party_Code__c: uniquePartyCode(),
      BillingCountry: 'United States',
      BillingState: 'New York',
      BillingCity: 'Boston',
      BillingPostalCode: '02101',
      BillingStreet: '1 Test St',
    });
    testDataFactory.markAsPersistent(acc.id);

    const oppId = await createExpansionOpportunity(
      acc.id,
      `SF977_MANUAL_001_Opp_${runId}`,
      'Pipeline',
      actuary,
      describeUser
    );
    testDataFactory.markAsPersistent(oppId);

    const pmId = await createProductMapLinked(
      instanceUrl,
      accessToken,
      acc.id,
      oppId,
      `SF977_MANUAL_001_PM_${runId}`
    );
    testDataFactory.markAsPersistent(pmId);

    bundles.push({
      scenario: 'SF-977-API-001 (Draft - Product Expansion)',
      accountId: acc.id,
      opportunityId: oppId,
      productMapIds: [pmId],
      notes: `Product_Map__c should show status "${statusDraftExpansion()}".`,
    });
  }

  // --- Dataset 2: SF-977-API-002 (pre-Live opp, pending + inactive maps — move to Live manually) ---
  {
    const acc = await testDataFactory.createAccount({
      Name: `SF977_MANUAL_002_${runId}`,
      Type: accType,
      Functional_Currency__c: 'USD',
      Account_Status__c: 'Active',
      Onboarded_Date__c: onboardedDateToday(),
      Party_Code__c: uniquePartyCode(),
      BillingCountry: 'United States',
      BillingState: 'New York',
      BillingCity: 'Boston',
      BillingPostalCode: '02101',
      BillingStreet: '1 Test St',
    });
    testDataFactory.markAsPersistent(acc.id);

    const oppId = await createExpansionOpportunity(
      acc.id,
      `SF977_MANUAL_002_Opp_${runId}`,
      preLiveStageName(),
      actuary,
      describeUser
    );
    testDataFactory.markAsPersistent(oppId);

    const pendingId = await createProductMapLinked(
      instanceUrl,
      accessToken,
      acc.id,
      oppId,
      `SF977_MANUAL_002_PM_Pending_${runId}`
    );
    await setProductMapStatus(instanceUrl, accessToken, pendingId, statusActivePending());
    testDataFactory.markAsPersistent(pendingId);

    const inactiveId = await createProductMapLinked(
      instanceUrl,
      accessToken,
      acc.id,
      oppId,
      `SF977_MANUAL_002_PM_Inactive_${runId}`
    );
    await setProductMapStatus(instanceUrl, accessToken, inactiveId, statusInactive());
    testDataFactory.markAsPersistent(inactiveId);

    bundles.push({
      scenario: 'SF-977-API-002 (Pending + Inactive; Opportunity still pre-Live)',
      accountId: acc.id,
      opportunityId: oppId,
      productMapIds: [pendingId, inactiveId],
      notes:
        `Opportunity StageName is "${preLiveStageName()}". After you set Stage to "${liveStageName()}", ` +
        `pending map should become "${statusActive()}"; inactive stays "${statusInactive()}".`,
    });
  }

  // --- Dataset 3: SF-977-API-003 (pre-Live opp, no Product Maps) ---
  {
    const acc = await testDataFactory.createAccount({
      Name: `SF977_MANUAL_003_${runId}`,
      Type: accType,
      Functional_Currency__c: 'USD',
      Account_Status__c: 'Active',
      Onboarded_Date__c: onboardedDateToday(),
      Party_Code__c: uniquePartyCode(),
      BillingCountry: 'United States',
      BillingState: 'New York',
      BillingCity: 'Boston',
      BillingPostalCode: '02101',
      BillingStreet: '1 Test St',
    });
    testDataFactory.markAsPersistent(acc.id);

    const oppId = await createExpansionOpportunity(
      acc.id,
      `SF977_MANUAL_003_Opp_${runId}`,
      preLiveStageName(),
      actuary,
      describeUser
    );
    testDataFactory.markAsPersistent(oppId);

    bundles.push({
      scenario: 'SF-977-API-003 (No Product Maps; pre-Live → Live manually)',
      accountId: acc.id,
      opportunityId: oppId,
      productMapIds: [],
      notes: `No Product_Map__c rows. Move Opportunity to "${liveStageName()}"; expect no Product Maps created.`,
    });
  }

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('SF-977 manual test data (persistent in org; delete in Salesforce if needed)');
  console.log('══════════════════════════════════════════════════════════════\n');

  for (const b of bundles) {
    console.log(`▶ ${b.scenario}`);
    console.log(`   AccountId:       ${b.accountId}`);
    console.log(`   OpportunityId:   ${b.opportunityId}`);
    if (b.productMapIds.length) {
      b.productMapIds.forEach((id, i) => {
        const label = b.productMapIds.length > 1 ? (i === 0 ? ' [first]' : ' [second]') : '';
        console.log(`   Product_Map__c:  ${id}${label}`);
      });
    } else {
      console.log(`   Product_Map__c:  (none)`);
    }
    console.log(`   ${b.notes}\n`);
  }

  const outPath = path.resolve(__dirname, '../data/sf977-manual-test-ids.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        instanceUrl,
        accountType: accType,
        bundles: bundles.map((b) => ({
          scenario: b.scenario,
          accountId: b.accountId,
          opportunityId: b.opportunityId,
          productMapIds: b.productMapIds,
          notes: b.notes,
        })),
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`Wrote: ${path.relative(process.cwd(), outPath)}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
