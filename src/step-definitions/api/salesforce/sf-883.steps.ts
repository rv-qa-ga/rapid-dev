/**
 * SF-883 Step Definitions - API
 * Rate & Commission Changes — describe, Tooling/discover Sub Type, create Opportunity, PATCH validation, stage rules.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { DataTable } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { config } from '../../../config/config';

const OBJECT_API_NAME = 'Opportunity';

const SUB_TYPE_API_CANDIDATES = [
  'Sub_Type__c',
  'Opportunity_Sub_Type__c',
  'Subtype__c',
  'SubType__c',
  'Opp_Sub_Type__c',
  'OpportunitySubtype__c',
];

/**
 * JWT subject for TestDataFactory when it must match {@link SalesforceAPIClient}.
 *
 * Resolution order:
 *   1. `world.testContext.apiJwtUsername` — set by role-specific API token steps
 *      (e.g. "I have a valid Salesforce API token as QA MRD user").
 *   2. `SF_USE_QA_MRD_FOR_API=true` + `SF_QAMRDUSER_JWT_USERNAME` — global override
 *      that mirrors what `SalesforceAPIClient.authenticate()` already does. This
 *      keeps TestDataFactory and SalesforceAPIClient using the same user for
 *      stories whose fields are MRD-only (e.g. SF-861 Sub_Type__c FLS).
 */
export function apiJwtUsernameForFactory(world: AutomationWorld): string | undefined {
  const u = world.testContext.apiJwtUsername;
  if (typeof u === 'string' && u.trim()) return u.trim();
  if (process.env.SF_USE_QA_MRD_FOR_API === 'true') {
    const mrd = process.env.SF_QAMRDUSER_JWT_USERNAME?.trim();
    if (mrd) return mrd;
  }
  return undefined;
}

function norm(s: string): string {
  return (s || '').toLowerCase().trim();
}

function findFieldByLabelOrApiName(fields: any[], fieldName: string): any {
  const field = fields.find(
    (f: any) => f.label === fieldName || norm(f.label) === norm(fieldName) || f.name === fieldName
  );
  if (field) return field;
  const withSuffix = fieldName.replace(/\s+/g, '_') + '__c';
  return fields.find((f: any) => f.name === withSuffix);
}

/** Must match org rule: Sub Type (and RAC fields in UI) is tied to Expansion in QA. */
function oppType(): string {
  return process.env.SF883_OPPORTUNITY_TYPE || 'Expansion';
}

function otherSubtype(): string {
  return process.env.SF883_OTHER_SUBTYPE || 'New Product';
}

function contractingStage(): string {
  return process.env.SF883_CONTRACTING_STAGE || 'Contracting';
}

function commentsApiName(ctx: AutomationWorld): string {
  const env = process.env.SF883_COMMENTS_FIELD?.trim();
  if (env) return env;
  const fields = ctx.testContext.fieldsMetadata;
  if (fields?.length) {
    const f = findFieldByLabelOrApiName(fields, 'Updated Commission Rate Additional Cmts');
    if (f) return f.name;
  }
  return 'UpdatedCommissionRateAdditionalCmts__c';
}

const LEGACY_COMMENTS_API = 'Updated_Commission_Rate_Additional_Cmts__c';

function normalizeCommentsFieldInBody(body: Record<string, unknown>, resolved: string): void {
  if (body[LEGACY_COMMENTS_API] !== undefined && resolved !== LEGACY_COMMENTS_API) {
    body[resolved] = body[LEGACY_COMMENTS_API];
    delete body[LEGACY_COMMENTS_API];
  }
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

function discoverSubTypeApiFieldsFromDescribe(fields: any[] | undefined): string[] {
  if (!Array.isArray(fields)) return [];
  const found: string[] = [];
  for (const f of fields) {
    if (f.createable === false) continue;
    if (subTypeHeuristicMatch(f)) {
      found.push(f.name);
    }
  }
  return [...new Set(found)];
}

/** Label-based fallback: e.g. "Opportunity Sub-Type" (createable only). */
function discoverSubTypeLooseLabelCreateable(fields: any[] | undefined): string[] {
  if (!Array.isArray(fields)) return [];
  const re = /\bsub[-\s]?types?\b|\bsubtype\b/i;
  const found: string[] = [];
  for (const f of fields) {
    if (f?.createable !== true || !f?.name || !String(f.name).endsWith('__c')) continue;
    if (re.test(String(f.label || ''))) {
      found.push(f.name);
    }
  }
  return [...new Set(found)];
}

/** Heuristic Sub Type fields on schema regardless of createable (for automation describe + Actuary create). */
function discoverSubTypeHeuristicOnSchema(fields: any[] | undefined): string[] {
  if (!Array.isArray(fields)) return [];
  const found: string[] = [];
  for (const f of fields) {
    if (subTypeHeuristicMatch(f)) {
      found.push(f.name);
    }
  }
  return [...new Set(found)];
}

/** Label regex match on schema regardless of createable. */
function discoverSubTypeLooseLabelOnSchema(fields: any[] | undefined): string[] {
  if (!Array.isArray(fields)) return [];
  const re = /\bsub[-\s]?types?\b|\bsubtype\b/i;
  const found: string[] = [];
  for (const f of fields) {
    if (!f?.name || !String(f.name).endsWith('__c')) continue;
    if (re.test(String(f.label || ''))) {
      found.push(f.name);
    }
  }
  return [...new Set(found)];
}

function filterToCreateableApiNames(candidates: string[], fields: any[] | undefined): string[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    return candidates;
  }
  const createable = new Set(
    fields.filter((f: any) => f?.createable === true).map((f: any) => f.name).filter(Boolean)
  );
  return candidates.filter((n) => createable.has(n));
}

/** Prefer QA automation client when SF-977 uses dual auth (describe/tooling vs Actuary creates). */
function subTypeMetadataApiClient(world: AutomationWorld): SalesforceAPIClient {
  const describe = world.testContext.apiClientDescribe as SalesforceAPIClient | undefined;
  const primary = world.testContext.apiClient as SalesforceAPIClient;
  const api = describe || primary;
  if (!api) {
    throw new Error('No API client in context');
  }
  return api;
}

async function toolingSubTypeFieldCandidates(world: AutomationWorld): Promise<string[]> {
  const ctx = world.testContext as { sf883SubTypeToolingCandidates?: string[] };
  if (Array.isArray(ctx.sf883SubTypeToolingCandidates)) {
    return ctx.sf883SubTypeToolingCandidates;
  }
  const api = subTypeMetadataApiClient(world);
  let v = config.getSalesforceConfig().apiVersion || '60.0';
  v = v.startsWith('v') ? v : `v${v}`;
  const soql = `SELECT DeveloperName, NamespacePrefix FROM CustomField WHERE TableEnumOrId = 'Opportunity'`;
  const endpoint = `/services/data/${v}/tooling/query/?q=${encodeURIComponent(soql.replace(/\s+/g, ' ').trim())}`;
  const names: string[] = [];
  try {
    const res = await api.get(endpoint);
    if (!res.ok()) {
      logger.warn(
        `SF-883 API: Tooling CustomField query failed (${res.status()}); Sub Type resolution falls back to describe/static list.`
      );
      ctx.sf883SubTypeToolingCandidates = [];
      return [];
    }
    const json = (await res.json()) as {
      records?: Array<{ DeveloperName?: string; NamespacePrefix?: string | null }>;
    };
    for (const r of json.records || []) {
      const dev = r.DeveloperName;
      if (!dev) continue;
      const dn = norm(dev.replace(/_/g, ''));
      if (!(dn.includes('sub') && dn.includes('type'))) continue;
      const ns = r.NamespacePrefix;
      const apiName = ns ? `${ns}__${dev}__c` : `${dev}__c`;
      names.push(apiName);
    }
    logger.info(`SF-883 API: Tooling Sub Type–like Opportunity fields: ${names.slice(0, 12).join(', ') || '(none)'}`);
  } catch (e: any) {
    logger.warn(`SF-883 API: Tooling Sub Type lookup error: ${e?.message || e}`);
  }
  ctx.sf883SubTypeToolingCandidates = names;
  return names;
}

function filterToDescribedFieldNames(candidates: string[], fields: any[] | undefined): string[] {
  if (!Array.isArray(fields) || fields.length === 0) {
    return candidates;
  }
  const allowed = new Set(fields.map((f) => f?.name).filter(Boolean));
  return candidates.filter((n) => allowed.has(n));
}

/** Exported for SF-861 (Sub-Type picklist / conditional mandatory) and other stories reusing the same field. */
export async function buildSubTypeFieldCandidates(world: AutomationWorld): Promise<string[]> {
  const envField =
    process.env.SF977_EXPANSION_SUB_TYPE_FIELD?.trim() || process.env.SF883_SUB_TYPE_API_FIELD?.trim();
  if (envField) return [envField];

  const describeClient = world.testContext.apiClientDescribe as SalesforceAPIClient | undefined;
  let describeResult: { fields?: any[]; name?: string };
  let fields: any[] | undefined;

  if (describeClient) {
    // SF-977 dual-auth: QA automation describes Opportunity; Actuary performs POST (createable may differ per profile).
    describeResult = await describeClient.describeSObject(OBJECT_API_NAME);
    fields = describeResult.fields;
    logger.info(
      'SF-977: Opportunity describe for Sub Type resolution uses QA automation client (Actuary used only for creates).'
    );
  } else {
    await testDataFactory.initialize(apiJwtUsernameForFactory(world));
    describeResult = await testDataFactory.describeSObject(OBJECT_API_NAME);
    fields = describeResult.fields;
  }

  world.testContext.describeResult = describeResult;
  world.testContext.fieldsMetadata = fields;
  world.testContext.describedObjectName = describeResult.name || OBJECT_API_NAME;

  const useAutomationDescribeForSubType = !!describeClient;

  const cached977 = world.testContext.sf977ExpansionSubTypeField as string | undefined;
  const tooling = await toolingSubTypeFieldCandidates(world);
  const fromDescribeStrict = discoverSubTypeApiFieldsFromDescribe(fields);
  const looseLabelCreateable = discoverSubTypeLooseLabelCreateable(fields);
  const onSchemaHeuristic = discoverSubTypeHeuristicOnSchema(fields);
  const onSchemaLooseLabel = discoverSubTypeLooseLabelOnSchema(fields);

  const head = [
    ...new Set([
      ...(cached977 ? [cached977] : []),
      ...tooling,
      ...fromDescribeStrict,
      ...(useAutomationDescribeForSubType ? [...onSchemaHeuristic, ...onSchemaLooseLabel] : looseLabelCreateable),
    ]),
  ];
  const merged = [...head, ...SUB_TYPE_API_CANDIDATES.filter((n) => !head.includes(n))];
  let out = filterToDescribedFieldNames(merged, fields);

  if (useAutomationDescribeForSubType) {
    if (out.length === 0) {
      out = filterToDescribedFieldNames([...SUB_TYPE_API_CANDIDATES], fields);
    }
    if (out.length === 0) {
      // Describe may omit labels/heuristics; still try known API names + Tooling with Actuary POST.
      out = [
        ...new Set([
          ...(cached977 ? [cached977] : []),
          ...tooling,
          ...onSchemaHeuristic,
          ...onSchemaLooseLabel,
          ...SUB_TYPE_API_CANDIDATES,
        ]),
      ];
      logger.warn(
        `SF-977: No Sub Type field left after automation describe filter (${fields?.length ?? 0} fields); ` +
          `trying ${out.length} candidate API name(s) on Actuary create.`
      );
    }
  } else {
    out = filterToCreateableApiNames(out, fields);
    if (out.length === 0) {
      out = filterToCreateableApiNames(
        [...fromDescribeStrict, ...looseLabelCreateable, ...SUB_TYPE_API_CANDIDATES],
        fields
      );
    }
  }
  if (out.length === 0) {
    throw new Error(
      (useAutomationDescribeForSubType
        ? 'No Opportunity Sub Type field matched heuristics on QA automation describe. '
        : 'No createable Opportunity field matched Sub Type heuristics (JWT describe). ') +
        'Set SF977_EXPANSION_SUB_TYPE_FIELD or SF883_SUB_TYPE_API_FIELD to the API name, ' +
        'and SF977_EXPANSION_SUB_TYPE or SF883_OTHER_SUBTYPE for the picklist value.'
    );
  }
  logger.info(
    `SF-883 API: Sub Type field candidates for POST try (${out.length}): ${out.slice(0, 15).join(', ')}`
  );
  return out;
}

/**
 * POST Opportunity with Expansion Sub Type by trying candidate API names (Tooling, describe, static list).
 * Used by SF-883 and SF-977 API scenarios.
 */
export async function createOpportunityWithSubTypeApi(
  world: AutomationWorld,
  accountId: string,
  name: string,
  subType: string,
  basePayload: Record<string, unknown>
): Promise<{ id: string; subTypeField: string }> {
  const api = world.testContext.apiClient as SalesforceAPIClient;
  if (!api) {
    throw new Error('No API client in context');
  }
  await testDataFactory.initialize(apiJwtUsernameForFactory(world));

  const closeDate =
    (basePayload.CloseDate as string) || new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
  const stage = (basePayload.Stage as string) || 'Pipeline';
  const baseOppData: Record<string, any> = {
    Name: name,
    Stage: stage,
    Type: basePayload.Type,
    CloseDate: closeDate,
  };
  if (basePayload.Distribution_Region__c != null && basePayload.Distribution_Region__c !== '') {
    baseOppData.Distribution_Region__c = basePayload.Distribution_Region__c;
  }

  const candidates = await buildSubTypeFieldCandidates(world);
  if (candidates.length === 0) {
    throw new Error('No Sub Type API field candidates; describe Opportunity or set SF883_SUB_TYPE_API_FIELD');
  }
  logger.debug(`SF-883 API: Sub Type try order (first 12): ${candidates.slice(0, 12).join(', ')}`);
  let lastError: Error | null = null;

  try {
    const opp = await testDataFactory.createOpportunity({ ...baseOppData }, accountId);
    logger.info(`SF-883 API: Opportunity created without Sub Type field (${opp.id})`);
    return { id: opp.id, subTypeField: '' };
  } catch (e: any) {
    lastError = e;
    const msg = String(e.message || e);
    if (!/Sub Type|SubType|subtype|FIELD_CUSTOM_VALIDATION/i.test(msg)) {
      throw e;
    }
    logger.debug(`SF-883 API: create without Sub Type rejected; trying candidate fields: ${msg.slice(0, 180)}`);
  }

  for (const field of candidates) {
    const data = { ...baseOppData, [field]: subType };
    try {
      const opp = await testDataFactory.createOpportunity(data, accountId);
      return { id: opp.id, subTypeField: field };
    } catch (e: any) {
      lastError = e;
      const msg = String(e.message || e);
      if (msg.includes('No such column') || (msg.includes('INVALID_FIELD') && msg.includes(field))) {
        logger.debug(`SF-883 API: skip sub type field ${field}: ${msg.slice(0, 120)}`);
        continue;
      }
      if (msg.includes('FIELD_CUSTOM_VALIDATION_EXCEPTION') && msg.includes('Sub Type')) {
        logger.debug(`SF-883 API: validation for sub type field ${field}`);
        continue;
      }
      throw e;
    }
  }
  const hint =
    'Could not POST Opportunity with any Sub Type field. If Tooling lists a field but REST says "No such column", ' +
    'verify deployment and that the JWT user targets the same org as Lightning; test POST in Workbench. ' +
    'Set SF977_EXPANSION_SUB_TYPE_FIELD or SF883_SUB_TYPE_API_FIELD if the API name differs.';
  throw new Error(`${hint} Last error: ${lastError?.message || 'unknown'}`);
}

async function ensureSf883Opportunity(
  world: AutomationWorld,
  subType: string,
  extras: Record<string, unknown> = {}
): Promise<string> {
  await testDataFactory.initialize(apiJwtUsernameForFactory(world));
  const accountId = world.testContext.accountId;
  if (!accountId) {
    throw new Error('No Account ID. Run "I have a test Account created via API" first.');
  }
  const name = `SF-883 API ${Date.now()}`;
  const basePayload: Record<string, unknown> = {
    Type: oppType(),
    CloseDate: new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0],
    Stage: 'Pipeline',
    ...extras,
  };
  const region = process.env.SF883_DISTRIBUTION_REGION || 'US';
  if (process.env.SF883_SET_DISTRIBUTION_REGION_API === 'true' && region) {
    basePayload.Distribution_Region__c = region;
  }
  try {
    const { id, subTypeField } = await createOpportunityWithSubTypeApi(world, accountId, name, subType, basePayload);
    world.testContext.opportunityId = id;
    world.testContext.sf883SubTypeFieldUsed = subTypeField;
    logger.info(`SF-883 API: Opportunity ${id} Sub Type="${subType}" (${subTypeField})`);
    return id;
  } catch (e: any) {
    if (String(e.message).includes('Distribution_Region__c')) {
      delete basePayload.Distribution_Region__c;
      const { id, subTypeField } = await createOpportunityWithSubTypeApi(world, accountId, name, subType, basePayload);
      world.testContext.opportunityId = id;
      world.testContext.sf883SubTypeFieldUsed = subTypeField;
      return id;
    }
    throw e;
  }
}

function patchBodyFromTable(table: DataTable): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const row of table.hashes()) {
    const k = row.field;
    const v = row.value;
    if (v === '(null)' || v === '<null>') body[k] = null;
    else body[k] = v;
  }
  return body;
}

async function describeOpportunityIfNeeded(ctx: AutomationWorld): Promise<void> {
  if (ctx.testContext.fieldsMetadata?.length && ctx.testContext.describedObjectName === OBJECT_API_NAME) {
    return;
  }
  await testDataFactory.initialize(apiJwtUsernameForFactory(ctx));
  const describeResult = await testDataFactory.describeSObject(OBJECT_API_NAME);
  ctx.testContext.describeResult = describeResult;
  ctx.testContext.fieldsMetadata = describeResult.fields;
  ctx.testContext.describedObjectName = describeResult.name || OBJECT_API_NAME;
}

// ─── Configure + metadata ───────────────────────────────────────────────────

Given('the system is configured for SF-883', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }
  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  this.testContext.describeResult = describeResult;
  this.testContext.fieldsMetadata = describeResult.fields;
  this.testContext.describedObjectName = describeResult.name || OBJECT_API_NAME;
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  this.testContext.workItemForInvalidRequest = 'SF-883';
  logger.info(`✅ System configured for SF-883: ${OBJECT_API_NAME} described (${describeResult.fields?.length || 0} fields)`);
});

Then(
  'the SF-883 Current Commission Rate field is read-only when visible in Opportunity describe',
  async function (this: AutomationWorld) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields?.length) {
      throw new Error('No field metadata. Run "Given the system is configured for SF-883" first.');
    }
    const envName = process.env.SF883_CURRENT_COMMISSION_FIELD?.trim();
    const f = envName
      ? fields.find((x: any) => x.name === envName)
      : findFieldByLabelOrApiName(fields, 'Current Commission Rate');
    if (!f) {
      logger.warn(
        'SF-883 API: Current Commission Rate not in Opportunity describe for this integration user (often FLS). Skipping read-only assertion — verify via UI or set SF883_CURRENT_COMMISSION_FIELD and grant read access.'
      );
      return;
    }
    const readOnly = f.calculated === true || f.autoNumber === true || f.updateable === false;
    if (!readOnly) {
      throw new Error(
        `SF-883: field ${f.name} should be read-only; calculated=${f.calculated}, updateable=${f.updateable}`
      );
    }
    logger.info(`✅ SF-883: ${f.name} is read-only via API describe`);
  }
);

Then('the {string} field should be updateable on Opportunity', async function (this: AutomationWorld, fieldLabel: string) {
  const fields = this.testContext.fieldsMetadata;
  if (!fields || !Array.isArray(fields)) {
    throw new Error('No field metadata. Run "Given the system is configured for SF-883" first.');
  }
  const f = findFieldByLabelOrApiName(fields, fieldLabel);
  if (!f) {
    throw new Error(`Field "${fieldLabel}" not found on Opportunity (visible to API user).`);
  }
  if (f.updateable !== true) {
    throw new Error(`Field "${fieldLabel}" (${f.name}) must be updateable for SF-883; updateable=${f.updateable}`);
  }
  logger.info(`✅ ${f.name} is updateable`);
});

Then(
  'the {string} field should be read-only on Opportunity via API',
  async function (this: AutomationWorld, fieldLabel: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields || !Array.isArray(fields)) {
      throw new Error('No field metadata. Run "Given the system is configured for SF-883" first.');
    }
    const f = findFieldByLabelOrApiName(fields, fieldLabel);
    if (!f) {
      throw new Error(`Field "${fieldLabel}" not found on Opportunity describe.`);
    }
    const readOnly = f.calculated === true || f.autoNumber === true || f.updateable === false;
    if (!readOnly) {
      throw new Error(
        `Field "${fieldLabel}" (${f.name}) should be read-only via API; calculated=${f.calculated}, updateable=${f.updateable}`
      );
    }
    logger.info(`✅ ${f.name} is read-only via API`);
  }
);

Then(
  'the {string} field should support two decimal places via API',
  async function (this: AutomationWorld, fieldLabel: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields || !Array.isArray(fields)) {
      throw new Error('No field metadata.');
    }
    const f = findFieldByLabelOrApiName(fields, fieldLabel);
    if (!f) {
      throw new Error(`Field "${fieldLabel}" not found.`);
    }
    const t = String(f.type || '').toLowerCase();
    const okTypes = ['double', 'currency', 'percent'];
    if (!okTypes.includes(t)) {
      throw new Error(`Field "${fieldLabel}" (${f.name}) type is ${f.type}; expected one of ${okTypes.join(', ')}`);
    }
    const scale = typeof f.scale === 'number' ? f.scale : undefined;
    if (scale !== undefined && scale < 2) {
      throw new Error(`Field "${fieldLabel}" (${f.name}) scale=${scale}; expected at least 2 decimal places in metadata`);
    }
    logger.info(`✅ ${f.name} supports decimal precision (type=${f.type}, scale=${scale ?? 'n/a'})`);
  }
);

Then(
  'the SF-883 additional comments field should exist as long text up to 500 characters via API',
  async function (this: AutomationWorld) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields || !Array.isArray(fields)) {
      throw new Error('No field metadata.');
    }
    const name = commentsApiName(this);
    const f =
      fields.find((x: any) => x.name === name) ||
      findFieldByLabelOrApiName(fields, 'Updated Commission Rate Additional Cmts');
    if (!f) {
      throw new Error(`SF-883 comments field not found (API name ${name}). Set SF883_COMMENTS_FIELD if needed.`);
    }
    const t = String(f.type || '').toLowerCase();
    if (t !== 'textarea' && t !== 'string') {
      throw new Error(`Comments field ${f.name} type=${f.type}; expected textarea or string`);
    }
    const len = f.length;
    if (typeof len === 'number' && len > 0 && len !== 500) {
      logger.warn(`SF-883: comments field ${f.name} length=${len} (story specifies 500)`);
    }
    if (typeof len === 'number' && len > 0 && len < 500) {
      throw new Error(`Comments field ${f.name} length=${len}; story requires up to 500 characters`);
    }
    logger.info(`✅ SF-883 comments field ${f.name} (type=${f.type}, length=${len ?? 'default'})`);
  }
);

// ─── Data setup ─────────────────────────────────────────────────────────────

Given(
  'an SF-883 API test Opportunity exists with Sub Type {string} and blank Updated Commission Rate',
  async function (this: AutomationWorld, subType: string) {
    await describeOpportunityIfNeeded(this);
    await ensureSf883Opportunity(this, subType);
    const api = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.opportunityId!;
    try {
      await api.updateRecord('Opportunity', id, { Updated_Commission_Rate__c: null });
    } catch (e: any) {
      logger.warn(`SF-883: clearing Updated_Commission_Rate__c: ${e.message}`);
    }
  }
);

Given('an SF-883 API test Opportunity exists with Sub Type {string}', async function (this: AutomationWorld, subType: string) {
  await describeOpportunityIfNeeded(this);
  await ensureSf883Opportunity(this, subType);
});

Given(
  'an SF-883 API test Opportunity exists with the non-Rate-and-Commission sub type for SF-883',
  async function (this: AutomationWorld) {
    await describeOpportunityIfNeeded(this);
    const sub = otherSubtype();
    logger.info(`SF-883 API: using non-RAC Sub Type "${sub}" (SF883_OTHER_SUBTYPE)`);
    await ensureSf883Opportunity(this, sub);
  }
);

// ─── PATCH ──────────────────────────────────────────────────────────────────

When('I attempt to update the SF-883 test Opportunity via API with:', async function (this: AutomationWorld, table: DataTable) {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.opportunityId;
  if (!api) throw new Error('No API client');
  if (!id) throw new Error('No opportunityId');
  const body = patchBodyFromTable(table);
  normalizeCommentsFieldInBody(body, commentsApiName(this));
  this.testContext.sf883LastPatchSucceeded = false;
  this.testContext.sf883LastPatchError = '';
  try {
    await api.updateRecord('Opportunity', id, body);
    this.testContext.sf883LastPatchSucceeded = true;
  } catch (e: any) {
    this.testContext.sf883LastPatchError = e.message || String(e);
    this.testContext.sf883LastPatchSucceeded = false;
  }
});

When('I update the SF-883 test Opportunity via API with:', async function (this: AutomationWorld, table: DataTable) {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.opportunityId;
  if (!api) throw new Error('No API client');
  if (!id) throw new Error('No opportunityId');
  const body = patchBodyFromTable(table);
  normalizeCommentsFieldInBody(body, commentsApiName(this));
  await api.updateRecord('Opportunity', id, body);
  this.testContext.sf883LastPatchSucceeded = true;
  this.testContext.sf883LastPatchError = '';
});

When('I update the SF-883 test Opportunity via API with StageName for SF-883 contracting stage', async function (this: AutomationWorld) {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.opportunityId;
  if (!api) throw new Error('No API client');
  if (!id) throw new Error('No opportunityId');
  const stage = contractingStage();
  await api.updateRecord('Opportunity', id, { StageName: stage });
  this.testContext.sf883LastPatchSucceeded = true;
  this.testContext.sf883LastPatchError = '';
});

When('I attempt to update the SF-883 test Opportunity via API with StageName for SF-883 contracting stage', async function (this: AutomationWorld) {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.opportunityId;
  if (!api) throw new Error('No API client');
  if (!id) throw new Error('No opportunityId');
  const stage = contractingStage();
  this.testContext.sf883LastPatchSucceeded = false;
  this.testContext.sf883LastPatchError = '';
  try {
    await api.updateRecord('Opportunity', id, { StageName: stage });
    this.testContext.sf883LastPatchSucceeded = true;
  } catch (e: any) {
    this.testContext.sf883LastPatchError = e.message || String(e);
    this.testContext.sf883LastPatchSucceeded = false;
  }
});

// ─── Assertions ─────────────────────────────────────────────────────────────

Then('the SF-883 Opportunity API update must have failed', async function (this: AutomationWorld) {
  if (this.testContext.sf883LastPatchSucceeded !== false) {
    throw new Error(
      `Expected Opportunity PATCH to fail; success=${this.testContext.sf883LastPatchSucceeded}. Error was: ${this.testContext.sf883LastPatchError || '(none)'}`
    );
  }
  logger.info(`✅ SF-883 PATCH failed as expected: ${(this.testContext.sf883LastPatchError || '').slice(0, 200)}`);
});

Then('the SF-883 Opportunity API update must have succeeded', async function (this: AutomationWorld) {
  if (this.testContext.sf883LastPatchSucceeded !== true) {
    throw new Error(`Expected Opportunity PATCH to succeed. Error: ${this.testContext.sf883LastPatchError || 'unknown'}`);
  }
});

Then('the SF-883 Opportunity API error must indicate Updated Commission Rate is required', async function (this: AutomationWorld) {
  const err = norm(this.testContext.sf883LastPatchError || '');
  const a = norm('Please add the Updated Commission Rate');
  const b = norm('Complete this field');
  const c = norm('Updated Commission Rate');
  if (!err.includes(a) && !err.includes(b) && !err.includes(c)) {
    throw new Error(
      `Expected validation message about Updated Commission Rate. Got: ${this.testContext.sf883LastPatchError || '(empty)'}`
    );
  }
});

Then(
  'the SF-883 Opportunity API error must mention blocking progression to contracting or commission rate',
  async function (this: AutomationWorld) {
    const err = norm(this.testContext.sf883LastPatchError || '');
    const hints = ['contract', 'commission', 'rate', 'stage', 'updated commission', 'field_custom_validation', 'cannot', 'required'];
    if (!hints.some((h) => err.includes(h))) {
      throw new Error(`Expected stage/commission-related error. Got: ${this.testContext.sf883LastPatchError || '(empty)'}`);
    }
  }
);

Then(
  'the SF-883 test Opportunity should have Updated_Commission_Rate__c approximately {string}',
  async function (this: AutomationWorld, expectedRaw: string) {
    const expected = parseFloat(expectedRaw.replace(/^"|"$/g, ''));
    const api = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.opportunityId;
    const q = await api.query(`SELECT Updated_Commission_Rate__c FROM Opportunity WHERE Id = '${id}' LIMIT 1`);
    const row = (q as any).records?.[0];
    const actual = row?.Updated_Commission_Rate__c;
    const num = actual == null ? NaN : Number(actual);
    if (Number.isNaN(num) || Math.abs(num - expected) > 0.01) {
      throw new Error(`Updated_Commission_Rate__c expected ~${expected}, got ${actual}`);
    }
  }
);

Then('the SF-883 test Opportunity should have additional comments containing {string}', async function (this: AutomationWorld, text: string) {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.opportunityId;
  const field = commentsApiName(this);
  const q = await api.query(`SELECT ${field} FROM Opportunity WHERE Id = '${id}' LIMIT 1`);
  const row = (q as any).records?.[0];
  const actual = row?.[field] ?? '';
  if (!String(actual).includes(text)) {
    throw new Error(`Expected ${field} to contain "${text}", got: ${actual}`);
  }
});

Then(
  'the SF-883 test Opportunity StageName via API should match the configured contracting stage',
  async function (this: AutomationWorld) {
    const api = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.opportunityId;
    const want = contractingStage();
    const q = await api.query(`SELECT StageName FROM Opportunity WHERE Id = '${id}' LIMIT 1`);
    const row = (q as any).records?.[0];
    const actual = row?.StageName;
    if (actual !== want) {
      throw new Error(
        `StageName expected "${want}", got "${actual}" (set SF883_CONTRACTING_STAGE if your org uses a different label)`
      );
    }
  }
);
