/**
 * CLM bulk migration validation — read-only Dynamics preprod vs Salesforce INT.
 */

import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import {
  ClmMigrationLookupResolver,
  clmLookupSelectExtras,
  dynamicsLookupValueAttribute,
  isClmResolvableLookupMapping,
} from './clm-migration-lookup-resolver';
import {
  ClmMigrationEntityConfig,
  evaluateClmMigrationExistenceMatch,
  getClmMigrationEntity,
  getEntityCorrelationStrategy,
  isClmMigrationEntityReadyOnInt,
  resolveDynamicsMatchField,
  resolveFieldMappingPath,
  resolveFieldMappingSheet,
  resolveSalesforceCorrelationField,
  resolveSalesforceMatchField,
  resolveSalesforceMigrationObject,
  shouldValidateClmMigrationAuditFields,
} from './clm-migration-entity-config';
import { loadPicklistMigrationTab } from './clm-picklist-migration-loader';
import {
  ClmAuditFieldMismatch,
  ClmAuditValidationResult,
  DYNAMICS_AUDIT_SELECT,
  SALESFORCE_AUDIT_SELECT,
  validateAuditFieldsForRecords,
} from './clm-migration-audit-validation';
import { loadMappingsFromExcel } from './migration-mapping-loader';
import {
  compareAllFieldsWithMappings,
  DEFAULT_PARTY_TO_ACCOUNT_MAPPINGS,
  FieldMapping,
  setFieldMappingsCache,
  ValidationResult,
} from './migration-field-mapper';
import { logger } from './logger';
import { resolveSalesforceMigrationCorrelationField } from './sf-migration-correlation-field';

export interface ClmEntityMigrationRunResult {
  entity: ClmMigrationEntityConfig;
  mappings: FieldMapping[];
  fieldMappingSource: string;
  fieldMappingSheet: string;
  dynamicsRecords: Record<string, unknown>[];
  validationResults: ValidationResult[];
  missingInSalesforce: string[];
  recordsWithFieldDiffs: number;
  auditValidation?: ClmAuditValidationResult;
  auditMismatches?: ClmAuditFieldMismatch[];
}

function parseMaxRecords(): number {
  const raw = process.env.CLM_MIGRATION_MAX_RECORDS?.trim();
  if (!raw || raw === '0' || raw.toLowerCase() === 'all') {
    return 0;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Business name fields that must stay in $select even when they end with "name". */
const DYNAMICS_SELECT_NAME_ALLOW = new Set([
  'accelins_name',
  'accelins_business_areaname',
  'accelins_regionname',
  'fullname',
  'name',
  'firstname',
  'lastname',
  'middlename',
]);

/**
 * OData does not expose many virtual *name / *typename label attributes on custom entities.
 * Governance sheets may list them — exclude from $select to avoid 400 errors.
 */
export function isLookupFieldMapping(m: FieldMapping): boolean {
  return isClmResolvableLookupMapping(m);
}

/**
 * OData $select — use lookup foreign-key attributes (_field_value), not logical names.
 */
export function filterDynamicsSelectFields(
  mappings: FieldMapping[],
  dynamicsIdField: string,
  includeAuditFields = false
): string[] {
  const fields = new Set<string>([dynamicsIdField]);
  if (includeAuditFields) {
    for (const f of DYNAMICS_AUDIT_SELECT) {
      fields.add(f);
    }
  }
  for (const m of mappings) {
    const f = m.dynamicsField?.trim();
    if (!f) continue;
    if (/^[YN]$/i.test(f) || f.length < 3) continue;
    if (/yominame$/i.test(f)) continue;
    if (isLookupFieldMapping(m)) {
      fields.add(dynamicsLookupValueAttribute(f));
      continue;
    }
    if (/name$/i.test(f) && !DYNAMICS_SELECT_NAME_ALLOW.has(f.toLowerCase())) {
      continue;
    }
    fields.add(f);
  }
  for (const extra of clmLookupSelectExtras(mappings)) {
    fields.add(extra);
  }
  return [...fields];
}

function activeOnlyFilter(_entity: ClmMigrationEntityConfig): string | undefined {
  const flag = (process.env.CLM_MIGRATION_ACTIVE_ONLY || 'false').toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'yes') {
    return 'statecode eq 0';
  }
  return undefined;
}

function applyDynamicsFieldSubstitutions(
  mappings: FieldMapping[],
  substitutions?: Record<string, string>
): FieldMapping[] {
  if (!substitutions || Object.keys(substitutions).length === 0) {
    return mappings;
  }
  const subLower = new Map(
    Object.entries(substitutions).map(([from, to]) => [from.toLowerCase(), to])
  );
  return mappings.map((m) => {
    const replacement = subLower.get(m.dynamicsField.toLowerCase());
    if (!replacement) {
      return m;
    }
    return {
      ...m,
      dynamicsField: replacement,
      fieldType: 'string',
      tolerance: m.tolerance === 'exact' ? 'trimmed' : m.tolerance,
    };
  });
}

export async function loadClmEntityFieldMappings(
  entityKey: string
): Promise<{ mappings: FieldMapping[]; excelPath: string; sheetName: string }> {
  const entity = getClmMigrationEntity(entityKey);
  if (entity.validationMode === 'iso-currency') {
    return {
      mappings: [],
      excelPath: 'CurrencyType (standard ISO) + Dataverse_Mapping__mdt',
      sheetName: 'functional_currency__c CMDT',
    };
  }

  const excelPath = resolveFieldMappingPath(entity);
  const sheetName = resolveFieldMappingSheet(entity);

  try {
    let mappings = await loadMappingsFromExcel({ excelPath, sheetName });
    mappings = applyDynamicsFieldSubstitutions(mappings, entity.dynamicsFieldSubstitutions);
    setFieldMappingsCache(mappings);
    return { mappings, excelPath, sheetName };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (entity.key === 'party') {
      logger.warn(`Field mapping Excel unavailable (${msg}); using default Party→Account mappings.`);
      setFieldMappingsCache(DEFAULT_PARTY_TO_ACCOUNT_MAPPINGS);
      return {
        mappings: DEFAULT_PARTY_TO_ACCOUNT_MAPPINGS,
        excelPath: '(defaults)',
        sheetName: '(defaults)',
      };
    }
    throw err;
  }
}

/** Drop OData properties that do not exist on the entity (parse 400 error message). */
async function resolveDynamicsSelectFields(
  client: DynamicsAPIClient,
  entity: ClmMigrationEntityConfig,
  candidateFields: string[]
): Promise<string[]> {
  let fields = [...new Set(candidateFields.filter(Boolean))];
  const idField = entity.dynamicsIdField;
  if (!fields.includes(idField)) {
    fields.unshift(idField);
  }

  while (fields.length > 0) {
    try {
      await client.query(entity.dynamicsEntitySet, {
        $select: fields.join(','),
        $top: '1',
      });
      logger.info(
        `Dynamics $select OK for ${entity.key}: ${fields.length} field(s) on ${entity.dynamicsEntitySet}`
      );
      return fields;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const match = msg.match(/property named '([^']+)'/i);
      if (!match) {
        throw err;
      }
      const bad = match[1];
      const next = fields.filter((f) => f.toLowerCase() !== bad.toLowerCase());
      if (next.length === fields.length) {
        throw err;
      }
      logger.warn(`Omitting invalid Dynamics field from $select: ${bad}`);
      fields = next.length > 0 ? next : [idField];
    }
  }
  return [idField];
}

export async function queryAllDynamicsRecords(
  client: DynamicsAPIClient,
  entity: ClmMigrationEntityConfig,
  mappings: FieldMapping[],
  options?: { selectFields?: string[]; includeAuditFields?: boolean }
): Promise<Record<string, unknown>[]> {
  const candidateFields =
    options?.selectFields ||
    filterDynamicsSelectFields(mappings, entity.dynamicsIdField, options?.includeAuditFields);
  const selectFields = await resolveDynamicsSelectFields(client, entity, candidateFields);

  const maxRecords = parseMaxRecords();
  const pageSize = Math.min(
    parseInt(process.env.CLM_MIGRATION_PAGE_SIZE || '500', 10) || 500,
    maxRecords > 0 ? maxRecords : 500
  );

  const baseFilter = activeOnlyFilter(entity);
  const all: Record<string, unknown>[] = [];

  const params: Record<string, string> = {
    $select: [...selectFields].join(','),
    $orderby: `${entity.dynamicsIdField} asc`,
    $top: String(pageSize),
  };
  if (baseFilter) {
    params.$filter = baseFilter;
  }

  const loadPage = async (queryParams: Record<string, string>): Promise<DynamicsPage> => {
    const res = await client.query(entity.dynamicsEntitySet, queryParams);
    const batch = ((res.value as Record<string, unknown>[]) || []);
    const link =
      (res as { '@odata.nextLink'?: string })['@odata.nextLink'] ||
      (res as { 'odata.nextLink'?: string })['odata.nextLink'];
    return { batch, nextLink: link };
  };

  type DynamicsPage = { batch: Record<string, unknown>[]; nextLink?: string };

  let { batch, nextLink } = await loadPage(params);
  all.push(...batch);

  while (nextLink && (maxRecords === 0 || all.length < maxRecords)) {
    const res = await client.queryByNextLink(nextLink);
    batch = ((res.value as Record<string, unknown>[]) || []);
    all.push(...batch);
    nextLink =
      (res as { '@odata.nextLink'?: string })['@odata.nextLink'] ||
      (res as { 'odata.nextLink'?: string })['odata.nextLink'];
    if (maxRecords > 0 && all.length >= maxRecords) {
      break;
    }
  }

  // CRM may omit @odata.nextLink and does not support $skip — keyset on id field.
  if (!nextLink && maxRecords === 0 && batch.length >= pageSize) {
    let expectedTotal = 0;
    try {
      const countParams: Record<string, string> = {};
      if (baseFilter) {
        countParams.$filter = baseFilter;
      }
      expectedTotal = await client.countRecords(entity.dynamicsEntitySet, countParams);
    } catch {
      expectedTotal = 0;
    }

    if (expectedTotal > all.length) {
      logger.info(
        `Dynamics @odata.nextLink absent after ${all.length} row(s); continuing with keyset pagination on ${entity.dynamicsIdField} (expected ~${expectedTotal})`
      );
      const idField = entity.dynamicsIdField;
      while (all.length < expectedTotal) {
        const last = all[all.length - 1];
        const lastId = String(last?.[idField] || '');
        if (!lastId) {
          break;
        }
        const keysetFilter = `${idField} gt ${lastId}`;
        const combinedFilter = baseFilter ? `(${baseFilter}) and (${keysetFilter})` : keysetFilter;
        const page = await loadPage({ ...params, $filter: combinedFilter });
        if (page.batch.length === 0) {
          break;
        }
        all.push(...page.batch);
        nextLink = page.nextLink;
        if (page.nextLink) {
          break;
        }
        if (page.batch.length < pageSize) {
          break;
        }
      }
      if (nextLink) {
        while (nextLink && (maxRecords === 0 || all.length < maxRecords)) {
          const res = await client.queryByNextLink(nextLink);
          batch = ((res.value as Record<string, unknown>[]) || []);
          all.push(...batch);
          nextLink =
            (res as { '@odata.nextLink'?: string })['@odata.nextLink'] ||
            (res as { 'odata.nextLink'?: string })['odata.nextLink'];
        }
      }
    }
  }

  const trimmed = maxRecords > 0 && all.length > maxRecords ? all.slice(0, maxRecords) : all;

  logger.info(
    `Queried ${trimmed.length} Dynamics ${entity.dynamicsEntitySet} record(s)` +
      (maxRecords > 0 ? ` (cap ${maxRecords})` : '')
  );
  return trimmed;
}

function readSalesforceFieldValue(rec: Record<string, unknown>, fieldName: string): unknown {
  if (rec[fieldName] !== undefined) {
    return rec[fieldName];
  }
  const lower = fieldName.toLowerCase();
  for (const [k, v] of Object.entries(rec)) {
    if (k.toLowerCase() === lower) {
      return v;
    }
  }
  return undefined;
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function dedupeFieldNames(fields: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of fields) {
    const key = f.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

/** Dynamics and Salesforce may use different GUID casing for the same party. */
export function normalizeCorrelationId(id: string): string {
  return id.trim().toLowerCase();
}

/** Case-insensitive trim for RDM name / master-id matching. */
export function normalizeMatchKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Entity-specific match-key normalization (RDM code padding, descriptive names, etc.). */
export function normalizeEntityMatchKey(entity: ClmMigrationEntityConfig, value: string): string {
  let key = normalizeMatchKey(value);
  if (entity.key === 'osfi') {
    key = key.replace(/^0+/, '') || '0';
  }
  return key;
}

async function resolveSalesforceSelectFields(
  client: SalesforceAPIClient,
  objectApiName: string,
  candidateFields: string[]
): Promise<string[]> {
  let fields = [...new Set(candidateFields.filter(Boolean))];
  if (!fields.includes('Id')) {
    fields.unshift('Id');
  }

  while (fields.length > 0) {
    try {
      await client.query(`SELECT ${fields.join(', ')} FROM ${objectApiName} LIMIT 1`);
      return fields;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const match =
        msg.match(/No such column '([^']+)'/i) ||
        msg.match(/invalid field: ([^\s]+)/i) ||
        msg.match(/Invalid field: ([^\s]+)/i);
      if (!match) {
        throw err;
      }
      const bad = match[1];
      const next = fields.filter((f) => f.toLowerCase() !== bad.toLowerCase());
      if (next.length === fields.length) {
        throw err;
      }
      logger.warn(`Omitting invalid Salesforce field from $select: ${bad}`);
      fields = next.length > 0 ? next : ['Id'];
    }
  }
  return ['Id'];
}

export async function fetchSalesforceByCorrelationIds(
  client: SalesforceAPIClient,
  entity: ClmMigrationEntityConfig,
  mappings: FieldMapping[],
  correlationIds: string[],
  correlationField?: string
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (correlationIds.length === 0) {
    return map;
  }

  const corrField = correlationField || entity.salesforceCorrelationField;
  const sfFields = new Set<string>(['Id', corrField]);
  for (const f of SALESFORCE_AUDIT_SELECT) {
    sfFields.add(f);
  }
  for (const m of mappings) {
    if (m.salesforceField && m.salesforceField !== 'N/A') {
      sfFields.add(m.salesforceField);
    }
  }
  const fieldList = (
    await resolveSalesforceSelectFields(client, entity.salesforceObject, dedupeFieldNames([...sfFields]))
  ).join(', ');
  const batchSize = parseInt(process.env.CLM_MIGRATION_SF_BATCH_SIZE || '200', 10) || 200;

  for (let i = 0; i < correlationIds.length; i += batchSize) {
    const batch = correlationIds.slice(i, i + batchSize);
    const inList = batch.map((id) => `'${escapeSoql(id)}'`).join(', ');
    const soql = `SELECT ${fieldList} FROM ${entity.salesforceObject} WHERE ${corrField} IN (${inList})`;
    const result = await client.query(soql);
    for (const rec of (result.records || []) as Record<string, unknown>[]) {
      const raw = readSalesforceFieldValue(rec, corrField);
      const key = normalizeCorrelationId(String(raw || ''));
      if (key) {
        map.set(key, rec);
      }
    }
  }

  return map;
}

function expandMatchValuesForSoql(entity: ClmMigrationEntityConfig, values: string[]): string[] {
  const expanded = new Set<string>();
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    expanded.add(v);
    if (entity.key === 'osfi') {
      const stripped = v.replace(/^0+/, '') || '0';
      expanded.add(stripped);
      expanded.add(stripped.padStart(4, '0'));
    }
  }
  return [...expanded];
}

export async function fetchSalesforceByMatchValues(
  client: SalesforceAPIClient,
  entity: ClmMigrationEntityConfig,
  mappings: FieldMapping[],
  matchValues: string[],
  matchField?: string
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  if (matchValues.length === 0) {
    return map;
  }

  const sfMatchField = matchField || resolveSalesforceMatchField(entity);
  const sfFields = new Set<string>(['Id', sfMatchField]);
  for (const f of SALESFORCE_AUDIT_SELECT) {
    sfFields.add(f);
  }
  for (const m of mappings) {
    if (m.salesforceField && m.salesforceField !== 'N/A') {
      sfFields.add(m.salesforceField);
    }
  }
  const fieldList = (
    await resolveSalesforceSelectFields(client, entity.salesforceObject, dedupeFieldNames([...sfFields]))
  ).join(', ');
  const batchSize = parseInt(process.env.CLM_MIGRATION_SF_BATCH_SIZE || '200', 10) || 200;

  for (let i = 0; i < matchValues.length; i += batchSize) {
    const batch = expandMatchValuesForSoql(entity, matchValues.slice(i, i + batchSize));
    const inList = batch.map((v) => `'${escapeSoql(v)}'`).join(', ');
    const soql = `SELECT ${fieldList} FROM ${entity.salesforceObject} WHERE ${sfMatchField} IN (${inList})`;
    const result = await client.query(soql);
    for (const rec of (result.records || []) as Record<string, unknown>[]) {
      const raw = readSalesforceFieldValue(rec, sfMatchField);
      const key = normalizeEntityMatchKey(entity, String(raw || ''));
      if (key && !map.has(key)) {
        map.set(key, rec);
      }
    }
  }

  return map;
}

export async function runClmEntityMigrationValidation(
  dynamicsClient: DynamicsAPIClient,
  salesforceClient: SalesforceAPIClient,
  entityKey: string
): Promise<ClmEntityMigrationRunResult> {
  const entity = getClmMigrationEntity(entityKey);
  if (!entity.enabled) {
    throw new Error(`CLM migration entity "${entityKey}" is not enabled yet.`);
  }
  if (!isClmMigrationEntityReadyOnInt(entityKey)) {
    throw new Error(
      `CLM migration entity "${entityKey}" (${entity.jira}) is not ready on INT for field validation.`
    );
  }

  const sfObject = await resolveSalesforceMigrationObject(salesforceClient, entity);
  const sfEntity: ClmMigrationEntityConfig =
    sfObject === entity.salesforceObject ? entity : { ...entity, salesforceObject: sfObject };

  if (entity.validationMode === 'iso-currency') {
    const { runClmCurrencyIsoMigrationValidation } = await import('./clm-migration-currency-validation');
    return runClmCurrencyIsoMigrationValidation(dynamicsClient, salesforceClient, entity);
  }

  const { mappings, excelPath, sheetName } = await loadClmEntityFieldMappings(entityKey);
  const auditEnabled = shouldValidateClmMigrationAuditFields(entity);
  const strategy = getEntityCorrelationStrategy(entity);
  const dynamicsMatchField =
    strategy !== 'dataverse-id' ? resolveDynamicsMatchField(entity) : undefined;
  const candidateFields = filterDynamicsSelectFields(
    mappings,
    entity.dynamicsIdField,
    auditEnabled
  );
  if (dynamicsMatchField && !candidateFields.includes(dynamicsMatchField)) {
    candidateFields.push(dynamicsMatchField);
  }
  if (entity.dynamicsExtraSelectFields) {
    for (const f of entity.dynamicsExtraSelectFields) {
      if (!candidateFields.includes(f)) {
        candidateFields.push(f);
      }
    }
  }
  const validatedSelect = await resolveDynamicsSelectFields(
    dynamicsClient,
    entity,
    candidateFields
  );
  const selectable = new Set(validatedSelect);
  let comparableMappings = mappings.filter(
    (m) =>
      selectable.has(m.dynamicsField) ||
      (isLookupFieldMapping(m) &&
        selectable.has(dynamicsLookupValueAttribute(m.dynamicsField)))
  );

  const sfFieldCandidates = dedupeFieldNames([
    ...(strategy !== 'dataverse-id' ? [resolveSalesforceMatchField(entity)] : []),
    ...comparableMappings.map((m) => m.salesforceField).filter((f) => f && f !== 'N/A'),
  ]);
  const validatedSfSelect = await resolveSalesforceSelectFields(
    salesforceClient,
    sfEntity.salesforceObject,
    sfFieldCandidates
  );
  const validSfFields = new Set(validatedSfSelect.map((f) => f.toLowerCase()));
  const beforeSfFilter = comparableMappings.length;
  comparableMappings = comparableMappings.filter(
    (m) => m.salesforceField && validSfFields.has(m.salesforceField.toLowerCase())
  );

  logger.info(
    `Entity ${entityKey}: ${comparableMappings.length} comparable field(s) ` +
      `(${mappings.length - comparableMappings.length} excluded from Dynamics/SF $select)` +
      (beforeSfFilter > comparableMappings.length
        ? `; ${beforeSfFilter - comparableMappings.length} SF field(s) not on INT TARGET`
        : '') +
      (auditEnabled ? '; audit fields enabled' : '')
  );

  const dynamicsRecords = await queryAllDynamicsRecords(dynamicsClient, entity, mappings, {
    selectFields: validatedSelect,
  });

  const lookupResolver = await ClmMigrationLookupResolver.build(
    dynamicsClient,
    salesforceClient,
    comparableMappings,
    dynamicsRecords
  );

  const picklistValueMap = await loadPicklistMigrationTab(entity.picklistMigrationTab);
  let correlationField: string;
  let sfByKey: Map<string, Record<string, unknown>>;

  if (strategy === 'dataverse-id') {
    const correlationIds = dynamicsRecords
      .map((r) => String(r[entity.dynamicsIdField] || ''))
      .filter(Boolean);
    correlationField = entity.useProbedAccountDataverseField
      ? resolveSalesforceCorrelationField(entity)
      : await resolveSalesforceMigrationCorrelationField(salesforceClient, sfEntity.salesforceObject);
    sfByKey = await fetchSalesforceByCorrelationIds(
      salesforceClient,
      sfEntity,
      comparableMappings,
      correlationIds,
      correlationField
    );
  } else {
    correlationField = resolveSalesforceMatchField(entity);
    const matchKeys = dynamicsRecords
      .map((r) => String(r[dynamicsMatchField!] || ''))
      .filter(Boolean);
    sfByKey = await fetchSalesforceByMatchValues(
      salesforceClient,
      sfEntity,
      comparableMappings,
      matchKeys,
      correlationField
    );
  }

  const validationResults: ValidationResult[] = [];
  const missingInSalesforce: string[] = [];
  let recordsWithFieldDiffs = 0;
  const auditPairs: Array<{
    dynamics: Record<string, unknown>;
    salesforce: Record<string, unknown>;
    dynamicsId: string;
  }> = [];

  for (const dyn of dynamicsRecords) {
    const id = String(dyn[entity.dynamicsIdField] || '');
    let sf: Record<string, unknown> | null = null;
    if (strategy === 'dataverse-id') {
      sf = id ? sfByKey.get(normalizeCorrelationId(id)) ?? null : null;
    } else {
      const matchKey = normalizeEntityMatchKey(entity, String(dyn[dynamicsMatchField!] || ''));
      sf = matchKey ? sfByKey.get(matchKey) ?? null : null;
    }
    if (!sf) {
      missingInSalesforce.push(id || String(dyn[dynamicsMatchField!] || ''));
    } else if (auditEnabled) {
      auditPairs.push({ dynamics: dyn, salesforce: sf, dynamicsId: id });
    }

    const result = await compareAllFieldsWithMappings(dyn, sf, comparableMappings, {
      dynamicsIdField: entity.dynamicsIdField,
      salesforceCorrelationField: correlationField,
      picklistValueMap,
      dynamicsMatchField: strategy !== 'dataverse-id' ? dynamicsMatchField : undefined,
      salesforceMatchField:
        strategy !== 'dataverse-id' ? resolveSalesforceMatchField(entity) : undefined,
      lookupResolver,
    });
    validationResults.push(result);
    if (result.fieldsDifferent > 0) {
      recordsWithFieldDiffs++;
    }
  }

  let auditValidation: ClmAuditValidationResult | undefined;
  if (auditEnabled && auditPairs.length > 0) {
    auditValidation = await validateAuditFieldsForRecords(
      dynamicsClient,
      salesforceClient,
      auditPairs
    );
    if (auditValidation.unmappedDynamicsUsers.size > 0) {
      logger.warn(
        `Audit validation: ${auditValidation.unmappedDynamicsUsers.size} unmapped Dynamics user GUID(s) ` +
          `(set CLM_MIGRATION_USER_MAPPING_CSV or ensure Azure_Active_Directory_ID__c on SF User).`
      );
    }
    if (auditValidation.mismatches.length > 0) {
      logger.warn(
        `Audit validation: ${auditValidation.mismatches.length} Owner/CreatedBy/LastModifiedBy mismatch(es).`
      );
    }
  }

  return {
    entity,
    mappings,
    fieldMappingSource: excelPath,
    fieldMappingSheet: sheetName,
    dynamicsRecords,
    validationResults,
    missingInSalesforce,
    recordsWithFieldDiffs,
    auditValidation,
    auditMismatches: auditValidation?.mismatches,
  };
}
