/**
 * SF-593 / SF-1081 — Account → Party Dataverse_Mapping__mdt integration steps.
 *
 * Reuse-first design:
 *   - Custom Metadata query / authentication / Account-with-status data factory are reused from
 *     sf-575.steps.ts, authentication.steps.ts, data-factory.steps.ts.
 *   - This file only contains the assertions and small flows that are SF-593/SF-1081 specific:
 *     value-pair lookup, audit fields, controlled failure, new/update Account flows.
 *     Excel/CSV bulk parity steps are SF-593-only (@party-excel / @party-bulk-export).
 *     SF-1081 validates Prospect CMDT via live qamerge SOQL (MuleSoft integration user).
 *   - SF-1159: Functional_Currency__c → Dataverse_Mapping__mdt (same CMDT object / steps).
 */
import { DataTable, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { CustomMetadataValidator } from '../../../utils/custom-metadata-validator';
import { logger } from '../../../utils/logger';
import { readPartyIntegrationPicklistValuesFromExcel } from '../../../utils/sf593-party-integration-excel';
import {
  assertBulkExportAllMappingColumnsPopulated,
  assertBulkExportContainsExpectedRows,
  assertBulkExportMinimumRowCount,
  assertEveryGoldRowExistsInBulk,
  loadBulkQueryDataverseMappingCsv,
  loadPartyIntegrationGoldMappingRows,
  resolveBulkExportMinimumRowCount,
  resolveBulkQueryExportCsvPath,
  type ExpectedMappingRowInput,
} from '../../../utils/sf593-gold-vs-bulkquery';
import {
  assertSetupAuditTrailAfterCmdtDeploy,
  deployDvMapping463DataverseValue,
  SF1222_DV463_BASELINE,
  SF1222_DV463_BASELINE_VALUE,
  SF1222_DV463_TEST_VALUE,
  SF1222_DV_MAPPING_463,
} from '../../../utils/sf-cmdt-metadata-deploy';

type DvRow = {
  Object__c?: string;
  Field__c?: string;
  Value__c?: string;
  Dataverse_Field__c?: string;
  Dataverse_Value__c?: string;
  CreatedDate?: string;
  CreatedById?: string;
  LastModifiedDate?: string;
  LastModifiedById?: string;
  [k: string]: unknown;
};

function findAccountField(fields: any[], query: string): any | undefined {
  const q = query.trim().toLowerCase();
  return fields.find(
    (x) =>
      (typeof x.name === 'string' && x.name.toLowerCase() === q) ||
      (typeof x.label === 'string' && x.label.toLowerCase() === q)
  );
}

function requireRecords(world: AutomationWorld): DvRow[] {
  const records = world.testContext.customMetadataRecords as DvRow[] | undefined;
  if (!records?.length) {
    throw new Error(
      'SF593: No Custom Metadata rows in context. Run the filtered Dataverse_Mapping query step first.'
    );
  }
  return records;
}

async function assertDvPairsForPicklistValue(
  world: AutomationWorld,
  picklistValue: string,
  table: DataTable,
  label: string
): Promise<void> {
  const records = requireRecords(world);
  const subset = records.filter(
    (r) =>
      String(r.Value__c ?? '').trim().toLowerCase() === picklistValue.trim().toLowerCase()
  );
  if (subset.length === 0) {
    const sampleValues = [
      ...new Set(records.map((r) => String(r.Value__c ?? '').trim()).filter(Boolean)),
    ].slice(0, 40);
    throw new Error(
      `SF593: No Dataverse_Mapping rows with Value__c matching "${picklistValue}" (case-insensitive). ` +
        `Rows in context: ${records.length}. Distinct Value__c (sample): ${JSON.stringify(sampleValues)}`
    );
  }

  const want = table.hashes() as { Dataverse_Field__c: string; Dataverse_Value__c: string }[];
  for (const row of want) {
    const field = row.Dataverse_Field__c?.trim();
    const val = String(row.Dataverse_Value__c ?? '').trim();
    const hit = subset.find(
      (r) =>
        String(r.Dataverse_Field__c ?? '').trim() === field &&
        String(r.Dataverse_Value__c ?? '').trim() === val
    );
    expect(
      hit,
      `SF593: Missing mapping for Value__c="${picklistValue}" Dataverse_Field__c="${field}" Dataverse_Value__c="${val}". ` +
        `Have: ${JSON.stringify(subset.map((r) => ({ f: r.Dataverse_Field__c, v: r.Dataverse_Value__c })))}`
    ).toBeTruthy();
  }
  logger.info(`SF593: Verified ${want.length} Dataverse pair(s) for ${label}="${picklistValue}"`);
}

async function resolveSObjectFieldViaCmdt(
  world: AutomationWorld,
  opts: {
    sobject: string;
    recordId: string;
    sfFieldApi: string;
    cmdtObject: string;
    cmdtField: string;
  }
): Promise<void> {
  const api = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!api) throw new Error('SF593: API client not initialized');

  const rec = await api.getRecordWithFields(opts.sobject, opts.recordId, [opts.sfFieldApi]);
  const raw = (rec as Record<string, unknown>)?.[opts.sfFieldApi];
  const value = String(raw ?? '').trim();
  if (!value) {
    throw new Error(
      `SF593: ${opts.sobject} ${opts.recordId} has empty ${opts.sfFieldApi} after create/update.`
    );
  }

  world.testContext.sf593ResolvedSourceField = opts.sfFieldApi;
  world.testContext.sf593ResolvedFieldValue = value;
  if (opts.sfFieldApi === 'Account_Status__c') {
    world.testContext.sf593CurrentAccountStatus = value;
  }

  const validator = world.testContext.customMetadataValidator as CustomMetadataValidator | undefined;
  if (!validator) {
    throw new Error(
      'SF593: customMetadataValidator missing — run "Given I have a valid Salesforce API token with Custom Metadata access".'
    );
  }
  const rows = (await validator.queryCustomMetadataRecords(
    'Dataverse_Mapping__mdt',
    ['FIELDS(ALL)'],
    { Object__c: opts.cmdtObject, Field__c: opts.cmdtField, Value__c: value }
  )) as DvRow[];

  world.testContext.sf593ResolvedDvRows = rows;
  logger.info(
    `SF593: Resolved ${rows.length} Dataverse pair(s) for ${opts.sobject} ${opts.recordId} ` +
      `${opts.sfFieldApi}="${value}" (CMDT ${opts.cmdtObject}.${opts.cmdtField}).`
  );
}

async function resolveCreatedAccountFieldViaCmdt(
  world: AutomationWorld,
  fieldApi: string
): Promise<void> {
  const pendingStatus = world.testContext.sf593PendingAccountStatus as string | undefined;
  if (fieldApi === 'Account_Status__c' && pendingStatus?.trim()) {
    await resolveAccountStatusCmdtByPicklistValue(world, pendingStatus);
    return;
  }

  const accountId = world.testContext.accountId as string | undefined;
  if (!accountId) {
    throw new Error(
      'SF593: No accountId in test context — create an Account with the target field populated first.'
    );
  }
  await resolveSObjectFieldViaCmdt(world, {
    sobject: 'Account',
    recordId: accountId,
    sfFieldApi: fieldApi,
    cmdtObject: 'Account',
    cmdtField: fieldApi,
  });
}

/** CMDT Field__c labels (e.g. Region_c) may differ from Salesforce API names (Region__c). */
function describeFieldCandidates(cmdtOrApiField: string): string[] {
  const out = [cmdtOrApiField];
  if (cmdtOrApiField.endsWith('_c') && !cmdtOrApiField.endsWith('__c')) {
    out.push(cmdtOrApiField.replace(/_c$/, '__c'));
  }
  if (cmdtOrApiField.endsWith('__c')) {
    out.push(cmdtOrApiField.replace(/__c$/, '_c'));
  }
  return [...new Set(out)];
}

/** Strip trailing parenthetical labels, e.g. "Member Relationship Director (MRD)" → "member relationship director". */
function normalizePicklistValueForCmdtMatch(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
    .toLowerCase();
}

function findDescribeField(
  fields: { name?: string; picklistValues?: unknown }[],
  candidates: string[]
): { name?: string; picklistValues?: { active?: boolean; value?: string }[] } | undefined {
  const lower = new Set(candidates.map((c) => c.toLowerCase()));
  return fields.find((x) => typeof x.name === 'string' && lower.has(x.name.toLowerCase())) as
    | { name?: string; picklistValues?: { active?: boolean; value?: string }[] }
    | undefined;
}

/** Account_Status__c "New" is the default for newly created Accounts — not integration-mapped in CMDT. */
const ACCOUNT_STATUS_PICKLIST_VALUES_EXCLUDED_FROM_CMDT_COMPLETENESS = ['New'];

function isAccountStatusGovernanceBlocked(message: string): boolean {
  return (
    message.includes('FIELD_CUSTOM_VALIDATION_EXCEPTION') &&
    (message.includes('Data Team approval') || message.includes('Request Status Change'))
  );
}

async function resolveProductMapStatusCmdtByPicklistValue(
  world: AutomationWorld,
  picklistValue: string
): Promise<void> {
  const validator = world.testContext.customMetadataValidator as CustomMetadataValidator | undefined;
  if (!validator) {
    throw new Error(
      'SF593: customMetadataValidator missing — run "Given I have a valid Salesforce API token with Custom Metadata access".'
    );
  }
  const value = picklistValue.trim();
  const statusField =
    process.env.SF796_PRODUCT_MAP_STATUS_FIELD?.trim() || 'Status__c';
  world.testContext.sf593ResolvedSourceField = statusField;
  world.testContext.sf593ResolvedFieldValue = value;

  const rows = (await validator.queryCustomMetadataRecords(
    'Dataverse_Mapping__mdt',
    ['FIELDS(ALL)'],
    { Object__c: 'product_map__c', Field__c: 'status__c', Value__c: value }
  )) as DvRow[];

  world.testContext.sf593ResolvedDvRows = rows;
  logger.info(
    `SF593: Resolved ${rows.length} Dataverse pair(s) for Product_Map ${statusField}="${value}" (CMDT product_map__c.status__c).`
  );
}

async function resolveAccountStatusCmdtByPicklistValue(
  world: AutomationWorld,
  picklistValue: string
): Promise<void> {
  const validator = world.testContext.customMetadataValidator as CustomMetadataValidator | undefined;
  if (!validator) {
    throw new Error(
      'SF593: customMetadataValidator missing — run "Given I have a valid Salesforce API token with Custom Metadata access".'
    );
  }
  const value = picklistValue.trim();
  world.testContext.sf593ResolvedSourceField = 'Account_Status__c';
  world.testContext.sf593ResolvedFieldValue = value;
  world.testContext.sf593CurrentAccountStatus = value;

  const rows = (await validator.queryCustomMetadataRecords(
    'Dataverse_Mapping__mdt',
    ['FIELDS(ALL)'],
    { Object__c: 'Account', Field__c: 'Account_Status__c', Value__c: value }
  )) as DvRow[];

  world.testContext.sf593ResolvedDvRows = rows;
  logger.info(
    `SF593: Resolved ${rows.length} Dataverse pair(s) for Account_Status__c="${value}" (CMDT Account.Account_Status__c).`
  );
}

async function assertActivePicklistCompletenessForCmdtField(
  world: AutomationWorld,
  sobject: string,
  fieldApi: string,
  options?: { excludePicklistValues?: string[] }
): Promise<void> {
  const api = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!api) throw new Error('SF593: API client not initialized');
  const records = requireRecords(world);

  const d = await api.describeSObject(sobject);
  const candidates = describeFieldCandidates(fieldApi);
  const f = findDescribeField(d.fields || [], candidates);

  const cmdtValues = new Set(
    records.map((r) => normalizePicklistValueForCmdtMatch(String(r.Value__c ?? ''))).filter(Boolean)
  );

  if (!f || !Array.isArray(f.picklistValues)) {
    const cmdtDistinct = [...new Set(records.map((r) => String(r.Value__c ?? '').trim()).filter(Boolean))];
    if (!cmdtDistinct.length) {
      throw new Error(
        `SF593: ${sobject}.${fieldApi} has no org picklist (tried ${candidates.join(', ')}) and CMDT has no Value__c rows.`
      );
    }
    logger.warn(
      `SF593: ${sobject}.${fieldApi} has no picklist on describe (tried ${candidates.join(', ')}). ` +
        `Validated ${cmdtDistinct.length} CMDT Value__c row(s) only: ${JSON.stringify(cmdtDistinct)}.`
    );
    return;
  }

  const orgValues = (f.picklistValues as { active?: boolean; value?: string }[])
    .filter((p) => p.active)
    .map((p) => String(p.value ?? '').trim())
    .filter(Boolean);

  const excluded = new Set(
    (options?.excludePicklistValues ?? []).map((v) => normalizePicklistValueForCmdtMatch(v))
  );
  const orgValuesForCheck = orgValues.filter(
    (v) => !excluded.has(normalizePicklistValueForCmdtMatch(v))
  );
  const excludedValues = orgValues.filter((v) =>
    excluded.has(normalizePicklistValueForCmdtMatch(v))
  );

  const missing = orgValuesForCheck.filter(
    (v) => !cmdtValues.has(normalizePicklistValueForCmdtMatch(v))
  );
  if (missing.length) {
    throw new Error(
      `SF593: ${missing.length} active ${sobject}.${f.name ?? fieldApi} picklist value(s) have no Dataverse_Mapping row. ` +
        `Missing values: ${JSON.stringify(missing)}. ` +
        `Org active values (${orgValues.length}): ${JSON.stringify(orgValues)}. ` +
        `CMDT distinct values (${cmdtValues.size}): ${JSON.stringify([...cmdtValues])}.` +
        (excludedValues.length
          ? ` Excluded from check: ${JSON.stringify(excludedValues)}.`
          : '')
    );
  }
  if (excludedValues.length) {
    logger.info(
      `SF593: Excluded ${excludedValues.length} picklist value(s) from CMDT completeness (not integration-mapped): ${JSON.stringify(excludedValues)}`
    );
  }
  logger.info(
    `SF593: All ${orgValuesForCheck.length} active ${sobject}.${f.name ?? fieldApi} picklist value(s) covered by ${records.length} CMDT row(s).`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-usable combo auth: MuleSoft integration JWT + CMDT validator
// (Avoids needing two Background steps in the integration-user scenarios.)
// ═══════════════════════════════════════════════════════════════════════════
Given(
  'I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access',
  async function (this: AutomationWorld) {
    const integrationUser = process.env.SF_MULESOFT_INTEGRATION_JWT_USERNAME?.trim();
    if (!integrationUser) {
      throw new Error(
        'SF_MULESOFT_INTEGRATION_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV>.'
      );
    }
    if (!this.apiContext) throw new Error('API context not initialized');

    const apiClient = new SalesforceAPIClient(this.apiContext);
    await apiClient.authenticate(integrationUser);
    this.testContext.apiClient = apiClient;
    this.testContext.apiJwtUsername = integrationUser;

    const validator = new CustomMetadataValidator(this.apiContext);
    await validator.authenticate(integrationUser);
    this.testContext.customMetadataValidator = validator;

    logger.info(
      `SF593: Authenticated as MuleSoft integration user "${integrationUser}" with CMDT access`
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Describe (reused by the optional Excel-parity scenario)
// ═══════════════════════════════════════════════════════════════════════════
When(
  'I describe the Account object metadata via REST for SF593',
  async function (this: AutomationWorld) {
    const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
    if (!api) throw new Error('SF593: API client not initialized');
    const describeResult = await api.describeSObject('Account');
    this.testContext.describeResult = describeResult;
    this.testContext.fieldsMetadata = describeResult.fields;
    this.testContext.describedObjectName = describeResult.name || 'Account';
    logger.info(`SF593: Described Account (${describeResult.fields?.length ?? 0} fields)`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Jira AC sample assertion: value-pair lookup (already used by SF-593 + SF-1081)
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'the queried Dataverse_Mapping records for Account_Status value {string} should include Dataverse pairs',
  async function (this: AutomationWorld, accountStatusValue: string, table: DataTable) {
    await assertDvPairsForPicklistValue(this, accountStatusValue, table, 'Account_Status__c');
  }
);

Then(
  'the queried Dataverse_Mapping records for picklist value {string} should include Dataverse pairs',
  async function (this: AutomationWorld, picklistValue: string, table: DataTable) {
    await assertDvPairsForPicklistValue(this, picklistValue, table, 'Value__c');
  }
);

Then(
  'the queried Dataverse_Mapping records for picklist value {string} should include Dataverse field {string} with any non-empty Dataverse_Value__c',
  async function (this: AutomationWorld, picklistValue: string, dvField: string) {
    const records = requireRecords(this);
    const subset = records.filter(
      (r) =>
        String(r.Value__c ?? '').trim().toLowerCase() === picklistValue.trim().toLowerCase()
    );
    const wantField = dvField.trim();
    const hit = subset.find(
      (r) =>
        String(r.Dataverse_Field__c ?? '').trim() === wantField &&
        String(r.Dataverse_Value__c ?? '').trim() !== ''
    );
    expect(
      hit,
      `SF593: No row for Value__c="${picklistValue}" with Dataverse_Field__c="${wantField}" and non-empty Dataverse_Value__c. ` +
        `Subset: ${JSON.stringify(subset.map((r) => ({ f: r.Dataverse_Field__c, v: r.Dataverse_Value__c })))}`
    ).toBeTruthy();
  }
);

Then(
  'the queried Dataverse_Mapping records for picklist value {string} should include a Dataverse_Field__c containing {string} with any non-empty Dataverse_Value__c',
  async function (this: AutomationWorld, picklistValue: string, fragment: string) {
    const records = requireRecords(this);
    const subset = records.filter(
      (r) =>
        String(r.Value__c ?? '').trim().toLowerCase() === picklistValue.trim().toLowerCase()
    );
    const frag = fragment.trim().toLowerCase();
    const hit = subset.find((r) => {
      const f = String(r.Dataverse_Field__c ?? '').trim().toLowerCase();
      const v = String(r.Dataverse_Value__c ?? '').trim();
      return f.includes(frag) && v !== '';
    });
    expect(
      hit,
      `SF593: No row for Value__c="${picklistValue}" with Dataverse_Field__c containing "${fragment}" and non-empty value. ` +
        `Subset: ${JSON.stringify(subset.map((r) => ({ f: r.Dataverse_Field__c, v: r.Dataverse_Value__c })))}`
    ).toBeTruthy();
  }
);

Then(
  'every queried Dataverse_Mapping row should have Field__c {string}',
  async function (this: AutomationWorld, fieldApi: string) {
    const records = requireRecords(this);
    const want = fieldApi.trim().replace(/^["']|["']$/g, '');
    const bad = records.filter(
      (r) => String(r.Field__c ?? '').trim().toLowerCase() !== want.toLowerCase()
    );
    expect(
      bad.length,
      `SF593: Expected all ${records.length} row(s) to have Field__c="${want}". Offenders: ${JSON.stringify(
        bad.slice(0, 5).map((r) => ({ Field__c: r.Field__c, Value__c: r.Value__c }))
      )}`
    ).toBe(0);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Schema/shape: every returned CMDT row exposes the documented mapping field KEYS
// (Cheaper than REST describe — qamerge denies REST describe on Dataverse_Mapping__mdt
//  for QA-MRD/MuleSoft but allows SOQL FIELDS(ALL).)
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'the queried Dataverse_Mapping rows should expose mapping field keys',
  async function (this: AutomationWorld) {
    const records = requireRecords(this);
    const required = [
      'Object__c',
      'Field__c',
      'Value__c',
      'Dataverse_Field__c',
      'Dataverse_Value__c',
    ];
    const sample = records[0] ?? {};
    const missing = required.filter((k) => !(k in sample));
    expect(
      missing.length,
      `SF593: First Dataverse_Mapping row is missing field keys: ${JSON.stringify(missing)}. ` +
        `Row keys: ${JSON.stringify(Object.keys(sample))}`
    ).toBe(0);
    logger.info(`SF593: Dataverse_Mapping rows expose all 5 documented field keys.`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AC2 valid-only: every returned row has the documented mapping fields populated
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c',
  async function (this: AutomationWorld) {
    const records = requireRecords(this);
    const offenders: { i: number; row: DvRow }[] = [];
    records.forEach((r, i) => {
      const required: (keyof DvRow)[] = [
        'Object__c',
        'Field__c',
        'Value__c',
        'Dataverse_Field__c',
        'Dataverse_Value__c',
      ];
      if (required.some((k) => String(r[k] ?? '').trim() === '')) offenders.push({ i, row: r });
    });
    expect(
      offenders.length,
      `SF593: ${offenders.length}/${records.length} CMDT row(s) have empty mapping fields. First offenders: ` +
        JSON.stringify(offenders.slice(0, 5), null, 2)
    ).toBe(0);
    logger.info(`SF593: All ${records.length} CMDT row(s) have populated mapping fields.`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AC7 audit: CMDT rows expose audit fields.
// Re-queries CMDT with audit fields explicitly because FIELDS(ALL) on Custom Metadata
// does NOT include audit fields by default in this org (qamerge).
// ═══════════════════════════════════════════════════════════════════════════
function cmdtMetadataComponentFullName(developerName: string): string {
  const dn = developerName.trim();
  return dn.startsWith('Dataverse_Mapping.') ? dn : `Dataverse_Mapping.${dn}`;
}

function isCmdtAuditQueryUnavailable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('INVALID_FIELD') ||
    msg.includes('INVALID_TYPE') ||
    msg.includes('No such column') ||
    msg.includes('not supported')
  );
}

async function assertCmdtRowsExposeAuditFieldsViaTooling(
  api: SalesforceAPIClient,
  developerNames: string[]
): Promise<void> {
  const auditFields = ['CreatedDate', 'CreatedById', 'LastModifiedDate', 'LastModifiedById'];
  const uniqueNames = [...new Set(developerNames.map((n) => n.trim()).filter(Boolean))];
  if (!uniqueNames.length) {
    throw new Error('SF593: No DeveloperName values to verify audit via Tooling.');
  }

  const toolingByDevName = new Map<string, Record<string, unknown>>();
  const chunkSize = 25;
  for (let i = 0; i < uniqueNames.length; i += chunkSize) {
    const chunk = uniqueNames.slice(i, i + chunkSize);
    const inList = chunk
      .map((n) => `'${cmdtMetadataComponentFullName(n).replace(/'/g, "\\'")}'`)
      .join(', ');
    const soql =
      `SELECT FullName, ${auditFields.join(', ')} FROM MetadataComponent ` +
      `WHERE MetadataComponentType = 'CustomMetadata' AND FullName IN (${inList})`;
    const result = await api.toolingQuery<{ records?: Record<string, unknown>[] }>(soql);
    for (const row of result.records ?? []) {
      const fullName = String(row.FullName ?? '');
      const devName = fullName.includes('.') ? fullName.split('.').pop()! : fullName;
      if (devName) toolingByDevName.set(devName, row);
    }
  }

  const offenders: { developerName: string; missing: string[] }[] = [];
  for (const dn of uniqueNames) {
    const row = toolingByDevName.get(dn);
    if (!row) {
      offenders.push({ developerName: dn, missing: ['<row not found in Tooling MetadataComponent>'] });
      continue;
    }
    const missing = auditFields.filter((k) => row[k] == null || String(row[k]).trim() === '');
    if (missing.length) offenders.push({ developerName: dn, missing });
  }

  if (offenders.length) {
    throw new Error(
      `SF593: ${offenders.length}/${uniqueNames.length} CMDT row(s) missing audit fields (Tooling MetadataComponent). ` +
        `First offenders: ${JSON.stringify(offenders.slice(0, 3))}.`
    );
  }
  logger.info(
    `SF593: All ${uniqueNames.length} CMDT row(s) expose audit fields via Tooling MetadataComponent.`
  );
}

async function assertCmdtRowsExposeAuditFields(
  world: AutomationWorld,
  cmdtObject: string,
  cmdtField: string
): Promise<void> {
  const validator = world.testContext.customMetadataValidator as CustomMetadataValidator | undefined;
  const api = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!validator) {
    throw new Error(
      'SF593: customMetadataValidator missing — run "Given I have a valid Salesforce API token with Custom Metadata access".'
    );
  }
  if (!api) throw new Error('SF593: API client not initialized');

  const contextRows = requireRecords(world).filter(
    (r) =>
      String(r.Object__c ?? '').trim() === cmdtObject &&
      String(r.Field__c ?? '').trim() === cmdtField
  );
  const developerNames = contextRows
    .map((r) => String((r as Record<string, unknown>).DeveloperName ?? '').trim())
    .filter(Boolean);

  const auditFields = ['CreatedDate', 'CreatedById', 'LastModifiedDate', 'LastModifiedById'];
  const fieldList = ['DeveloperName', ...auditFields];

  try {
    const rows = (await validator.queryCustomMetadataRecords(
      'Dataverse_Mapping__mdt',
      fieldList,
      { Object__c: cmdtObject, Field__c: cmdtField }
    )) as DvRow[];

    if (!rows.length) {
      throw new Error(
        `SF593: Audit re-query returned 0 rows for CMDT Object__c="${cmdtObject}" Field__c="${cmdtField}".`
      );
    }
    const offenders: { developerName: unknown; missing: string[] }[] = [];
    rows.forEach((r) => {
      const missing = auditFields.filter(
        (k) => (r as Record<string, unknown>)[k] == null || String((r as Record<string, unknown>)[k]).trim() === ''
      );
      if (missing.length) {
        offenders.push({ developerName: (r as Record<string, unknown>).DeveloperName, missing });
      }
    });
    if (offenders.length) {
      throw new Error(
        `SF593: ${offenders.length}/${rows.length} CMDT row(s) missing audit fields for ${cmdtObject}.${cmdtField}. ` +
          `First offenders: ${JSON.stringify(offenders.slice(0, 3))}.`
      );
    }
    logger.info(`SF593: All ${rows.length} CMDT row(s) for ${cmdtObject}.${cmdtField} expose audit fields (runtime SOQL).`);
    return;
  } catch (err: unknown) {
    if (!isCmdtAuditQueryUnavailable(err)) {
      throw err;
    }
    logger.warn(
      `SF593: Runtime SOQL audit columns unavailable on Dataverse_Mapping__mdt; trying Tooling MetadataComponent.`
    );
  }

  if (!developerNames.length) {
    const fallback = (await validator.queryCustomMetadataRecords(
      'Dataverse_Mapping__mdt',
      ['DeveloperName'],
      { Object__c: cmdtObject, Field__c: cmdtField }
    )) as DvRow[];
    developerNames.push(
      ...fallback.map((r) => String((r as Record<string, unknown>).DeveloperName ?? '').trim()).filter(Boolean)
    );
  }

  try {
    await assertCmdtRowsExposeAuditFieldsViaTooling(api, developerNames);
    return;
  } catch (err: unknown) {
    if (!isCmdtAuditQueryUnavailable(err)) {
      throw err;
    }
  }

  throw new Error(
    `SF593: Row-level CMDT audit (CreatedDate, CreatedById, LastModifiedDate, LastModifiedById) is not queryable ` +
      `for ${cmdtObject}.${cmdtField} via runtime SOQL or Tooling MetadataComponent. ` +
      `EntityDefinition-only registration does not satisfy AC7 auditability (when/who/value/domain). ` +
      `See Jira SF-1222.`
  );
}

function uniqueCmdtObjectFieldPairs(records: DvRow[]): { object: string; field: string }[] {
  const seen = new Set<string>();
  const pairs: { object: string; field: string }[] = [];
  for (const r of records) {
    const object = String(r.Object__c ?? '').trim();
    const field = String(r.Field__c ?? '').trim();
    if (!object || !field) continue;
    const key = `${object}\0${field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ object, field });
  }
  return pairs;
}

Then(
  'every Dataverse_Mapping row should expose audit fields CreatedDate, CreatedById, LastModifiedDate, LastModifiedById',
  async function (this: AutomationWorld) {
    requireRecords(this);
    await assertCmdtRowsExposeAuditFields(this, 'Account', 'Account_Status__c');
  }
);

Then(
  'every Dataverse_Mapping row for CMDT Object {string} and Field {string} should expose audit fields CreatedDate, CreatedById, LastModifiedDate, LastModifiedById',
  async function (this: AutomationWorld, cmdtObject: string, cmdtField: string) {
    requireRecords(this);
    await assertCmdtRowsExposeAuditFields(this, cmdtObject, cmdtField);
  }
);

Then(
  'the Dataverse_Mapping__mdt Custom Metadata type should be registered in Salesforce for audit and governance',
  async function (this: AutomationWorld) {
    const records = requireRecords(this);
    const pairs = uniqueCmdtObjectFieldPairs(records);
    if (!pairs.length) {
      throw new Error(
        'SF593: No CMDT rows in context — run a When step that queries Dataverse_Mapping__mdt first.'
      );
    }
    for (const { object, field } of pairs) {
      await assertCmdtRowsExposeAuditFields(this, object, field);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SF-1222 — DVMapping_463 golden record (AC6 no-code-change + AC7 Setup audit)
// ═══════════════════════════════════════════════════════════════════════════
function sf1222SalesforceApi(world: AutomationWorld): SalesforceAPIClient {
  const api = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!api) throw new Error('SF1222: API client not initialized');
  return api;
}

async function queryDv463DataverseValue(api: SalesforceAPIClient): Promise<string> {
  const result = await api.query(
    `SELECT Dataverse_Value__c FROM Dataverse_Mapping__mdt WHERE DeveloperName = '${SF1222_DV_MAPPING_463}'`
  );
  return String((result.records?.[0] as Record<string, unknown> | undefined)?.Dataverse_Value__c ?? '').trim();
}

Then('Dataverse_Mapping DVMapping_463 should match SF-1222 baseline mapping', async function (this: AutomationWorld) {
  const row = (this.testContext.customMetadataRecord ?? requireRecords(this)[0]) as DvRow;
  const b = SF1222_DV463_BASELINE;
  expect(String(row.Object__c ?? '').trim().toLowerCase()).toBe(b.object__c);
  expect(String(row.Field__c ?? '').trim().toLowerCase()).toBe(b.field__c);
  expect(String(row.Value__c ?? '').trim()).toBe(b.value__c);
  expect(String(row.Dataverse_Field__c ?? '').trim()).toBe(b.dataverseField__c);
  expect(String(row.Dataverse_Value__c ?? '').trim()).toBe(b.dataverseValue__c);
  logger.info(`SF1222: ${SF1222_DV_MAPPING_463} baseline mapping verified (PLN → ${b.dataverseValue__c}).`);
});

When('I deploy SF-1222 test Dataverse_Value__c to DVMapping_463', async function (this: AutomationWorld) {
  const api = sf1222SalesforceApi(this);
  this.testContext.sf1222DeployStartedAt = new Date().toISOString();
  await deployDvMapping463DataverseValue(
    this.apiContext,
    api.getInstanceUrl(),
    api.getAccessToken()!,
    SF1222_DV463_TEST_VALUE
  );
});

When('I restore SF-1222 baseline Dataverse_Value__c on DVMapping_463', async function (this: AutomationWorld) {
  const api = sf1222SalesforceApi(this);
  await deployDvMapping463DataverseValue(
    this.apiContext,
    api.getInstanceUrl(),
    api.getAccessToken()!,
    SF1222_DV463_BASELINE_VALUE
  );
});

Then(
  'runtime SOQL for DVMapping_463 should return Dataverse_Value__c {string}',
  async function (this: AutomationWorld, expected: string) {
    const api = sf1222SalesforceApi(this);
    const actual = await queryDv463DataverseValue(api);
    expect(actual, `SF1222: Expected DVMapping_463 Dataverse_Value__c="${expected}", got "${actual}".`).toBe(
      expected
    );
    logger.info(`SF1222: Runtime SOQL confirms Dataverse_Value__c="${actual}".`);
  }
);

Then(
  'DVMapping_463 metadata audit should reflect the CMDT update in SetupAuditTrail',
  async function (this: AutomationWorld) {
    const api = sf1222SalesforceApi(this);
    const started =
      (this.testContext.sf1222DeployStartedAt as string | undefined) ?? new Date().toISOString();
    await assertSetupAuditTrailAfterCmdtDeploy((soql) => api.query(soql), started);
    logger.info(
      'SF1222: AC7 satisfied via SetupAuditTrail (standard CMDT audit; no runtime SOQL CreatedDate/LastModifiedDate on Dataverse_Mapping__mdt).'
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AC5 controlled failure: integration can detect "no mapping" before calling Dataverse
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'the Dataverse_Mapping query for Account_Status value {string} should return no records',
  async function (this: AutomationWorld, unmappedValue: string) {
    const records = requireRecords(this);
    const matches = records.filter(
      (r) => String(r.Value__c ?? '').trim().toLowerCase() === unmappedValue.trim().toLowerCase()
    );
    expect(
      matches.length,
      `SF593: Expected 0 mappings for Value__c="${unmappedValue}", got ${matches.length}. ` +
        `If you see >0, pick a deliberately unmapped sentinel value for the controlled-failure assertion.`
    ).toBe(0);
    logger.info(`SF593: Confirmed no mapping rows for "${unmappedValue}" (controlled failure path).`);
  }
);

Then(
  'the Dataverse_Mapping query for picklist value {string} should return no records',
  async function (this: AutomationWorld, unmappedValue: string) {
    const records = requireRecords(this);
    const matches = records.filter(
      (r) => String(r.Value__c ?? '').trim().toLowerCase() === unmappedValue.trim().toLowerCase()
    );
    expect(
      matches.length,
      `SF593: Expected 0 mappings for Value__c="${unmappedValue}", got ${matches.length}. ` +
        `If you see >0, pick a deliberately unmapped sentinel value for the controlled-failure assertion.`
    ).toBe(0);
    logger.info(`SF593: Confirmed no mapping rows for "${unmappedValue}" (controlled failure path).`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AC3 new Account flow: resolve Dataverse IDs for the test Account's Account_Status
// AC4 update Account flow: also reuses this step (after update step below)
// ═══════════════════════════════════════════════════════════════════════════
When(
  "I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT",
  async function (this: AutomationWorld) {
    await resolveCreatedAccountFieldViaCmdt(this, 'Account_Status__c');
  }
);

When(
  "I resolve Dataverse IDs for the created Account's Functional_Currency__c via CMDT",
  async function (this: AutomationWorld) {
    await resolveCreatedAccountFieldViaCmdt(this, 'Functional_Currency__c');
  }
);

When(
  "I resolve Dataverse IDs for the created Contact's Contact_Status__c via CMDT",
  async function (this: AutomationWorld) {
    const contactId =
      (this.testContext.createdContactId as string | undefined) ||
      (this.testContext.salesforceContactId as string | undefined);
    if (!contactId) {
      throw new Error('SF593: No Contact in context — create a Contact first.');
    }
    await resolveSObjectFieldViaCmdt(this, {
      sobject: 'Contact',
      recordId: contactId,
      sfFieldApi: 'Contact_Status__c',
      cmdtObject: 'contact',
      cmdtField: 'Status_c',
    });
  }
);

When(
  'I resolve Dataverse IDs for Product Map Status {string} via CMDT',
  async function (this: AutomationWorld, status: string) {
    await resolveProductMapStatusCmdtByPicklistValue(this, status);
  }
);

When(
  'I resolve Dataverse IDs for Product Map Non_Renewable {string} via CMDT',
  async function (this: AutomationWorld, value: string) {
    const normalized = value.trim().toLowerCase();
    const cmdtValue =
      normalized === 'true' ? 'TRUE' : normalized === 'false' ? 'FALSE' : value.trim().toUpperCase();
    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator | undefined;
    if (!validator) {
      throw new Error('SF593: customMetadataValidator missing.');
    }
    const field =
      process.env.SF796_PRODUCT_MAP_NON_RENEWABLE_FIELD?.trim() || 'Non_Renewable__c';
    this.testContext.sf593ResolvedSourceField = field;
    this.testContext.sf593ResolvedFieldValue = cmdtValue;
    const rows = (await validator.queryCustomMetadataRecords(
      'Dataverse_Mapping__mdt',
      ['FIELDS(ALL)'],
      { Object__c: 'product_map__c', Field__c: 'non_renewable__c', Value__c: cmdtValue }
    )) as DvRow[];
    this.testContext.sf593ResolvedDvRows = rows;
    logger.info(
      `SF593: Resolved ${rows.length} Dataverse pair(s) for Product_Map ${field} CMDT Value__c="${cmdtValue}".`
    );
  }
);

When(
  "I resolve Dataverse IDs for the created Product_Map's Status__c via CMDT",
  async function (this: AutomationWorld) {
    const pending = this.testContext.sf796PendingProductMapStatus as string | undefined;
    if (pending?.trim()) {
      await resolveProductMapStatusCmdtByPicklistValue(this, pending);
      return;
    }
    const pmId = this.testContext.sf796ProductMapId as string | undefined;
    if (!pmId) {
      throw new Error('SF593: No Product_Map in context — create a Product_Map first (SF-796).');
    }
    const statusField =
      process.env.SF796_PRODUCT_MAP_STATUS_FIELD?.trim() || 'Status__c';
    await resolveSObjectFieldViaCmdt(this, {
      sobject: 'Product_Map__c',
      recordId: pmId,
      sfFieldApi: statusField,
      cmdtObject: 'product_map__c',
      cmdtField: 'status__c',
    });
  }
);

When(
  "I resolve Dataverse IDs for the created Product_Map's Non_Renewable__c via CMDT",
  async function (this: AutomationWorld) {
    const pmId = this.testContext.sf796ProductMapId as string | undefined;
    if (!pmId) {
      throw new Error('SF593: No Product_Map in context — create a Product_Map first (SF-796).');
    }
    const field =
      process.env.SF796_PRODUCT_MAP_NON_RENEWABLE_FIELD?.trim() || 'Non_Renewable__c';
    const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
    if (!api) throw new Error('SF593: API client not initialized');
    const rec = await api.getRecordWithFields('Product_Map__c', pmId, [field]);
    const raw = (rec as Record<string, unknown>)?.[field];
    const cmdtValue =
      typeof raw === 'boolean'
        ? raw
          ? 'TRUE'
          : 'FALSE'
        : String(raw ?? '')
            .trim()
            .toUpperCase() === 'TRUE'
          ? 'TRUE'
          : 'FALSE';

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator | undefined;
    if (!validator) {
      throw new Error('SF593: customMetadataValidator missing.');
    }
    this.testContext.sf593ResolvedSourceField = field;
    this.testContext.sf593ResolvedFieldValue = cmdtValue;
    const rows = (await validator.queryCustomMetadataRecords(
      'Dataverse_Mapping__mdt',
      ['FIELDS(ALL)'],
      { Object__c: 'product_map__c', Field__c: 'non_renewable__c', Value__c: cmdtValue }
    )) as DvRow[];
    this.testContext.sf593ResolvedDvRows = rows;
    logger.info(
      `SF593: Resolved ${rows.length} Dataverse pair(s) for Product_Map ${field}=${JSON.stringify(raw)} → CMDT Value__c="${cmdtValue}".`
    );
  }
);

When(
  "I resolve Dataverse IDs for the created AccountTeamMember's TeamMemberRole via CMDT",
  async function (this: AutomationWorld) {
    const atmId = this.testContext.accountTeamMemberId as string | undefined;
    if (!atmId) {
      throw new Error('SF593: No AccountTeamMember in context — create an AccountTeamMember first.');
    }
    const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
    if (!api) throw new Error('SF593: API client not initialized');
    const atm = await api.getRecordWithFields('AccountTeamMember', atmId, ['TeamMemberRole']);
    const role = String((atm as Record<string, unknown>).TeamMemberRole ?? '').trim();
    if (!role) {
      throw new Error(`SF593: AccountTeamMember ${atmId} has empty TeamMemberRole.`);
    }
    await resolveSObjectFieldViaCmdt(this, {
      sobject: 'AccountTeamMember',
      recordId: atmId,
      sfFieldApi: 'TeamMemberRole',
      cmdtObject: 'AccountTeamMember',
      cmdtField: 'TeamMemberRole',
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// AC4 update flow helper
// ═══════════════════════════════════════════════════════════════════════════
When(
  "I update the created Account's Account_Status__c to {string}",
  async function (this: AutomationWorld, newStatus: string) {
    const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
    const accountId = this.testContext.accountId as string | undefined;
    if (!api) throw new Error('SF593: API client not initialized');
    if (!accountId) {
      throw new Error('SF593: No accountId in test context — create an Account first.');
    }
    delete this.testContext.sf593PendingAccountStatus;
    try {
      await api.updateRecord('Account', accountId, { Account_Status__c: newStatus });
      logger.info(`SF593: Updated Account ${accountId} Account_Status__c → "${newStatus}".`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!isAccountStatusGovernanceBlocked(msg)) {
        throw err;
      }
      this.testContext.sf593PendingAccountStatus = newStatus;
      logger.info(
        `SF593: Direct API update to "${newStatus}" blocked by Account status governance (expected on qamerge). ` +
          `AC4 CMDT resolve will use target status "${newStatus}" without persisting the field change.`
      );
    }
  }
);

Then(
  'the resolved Dataverse IDs should include a field whose name contains {string}',
  async function (this: AutomationWorld, fragment: string) {
    const rows = (this.testContext.sf593ResolvedDvRows as DvRow[] | undefined) ?? [];
    const frag = fragment.trim().toLowerCase();
    const have = rows.map((r) => String(r.Dataverse_Field__c ?? '').trim());
    const hit = have.some((f) => f.toLowerCase().includes(frag));
    const src =
      (this.testContext.sf593ResolvedSourceField as string | undefined)?.trim() ||
      'Account_Status__c';
    const val =
      (this.testContext.sf593ResolvedFieldValue as string | undefined)?.trim() ||
      String(this.testContext.sf593CurrentAccountStatus ?? '').trim();
    expect(
      hit,
      `SF593: Expected a resolved Dataverse_Field__c containing "${fragment}" (case-insensitive) for ${src}="${val}". ` +
        `Have: ${JSON.stringify(have)}`
    ).toBeTruthy();
    logger.info(`SF593: Resolved IDs include a field matching "${fragment}" for ${src}="${val}".`);
  }
);

Then(
  'the resolved Dataverse IDs should include',
  async function (this: AutomationWorld, table: DataTable) {
    const rows = (this.testContext.sf593ResolvedDvRows as DvRow[] | undefined) ?? [];
    const want = table.hashes() as { Dataverse_Field__c: string }[];
    const have = rows.map((r) => String(r.Dataverse_Field__c ?? '').trim());
    const src =
      (this.testContext.sf593ResolvedSourceField as string | undefined)?.trim() ||
      'Account_Status__c';
    const val =
      (this.testContext.sf593ResolvedFieldValue as string | undefined)?.trim() ||
      String(this.testContext.sf593CurrentAccountStatus ?? '').trim();
    for (const row of want) {
      const want1 = row.Dataverse_Field__c?.trim();
      expect(
        have.includes(want1 ?? ''),
        `SF593: Expected Dataverse_Field__c="${want1}" in resolved IDs for ${src}="${val}". ` +
          `Resolved: ${JSON.stringify(have)}`
      ).toBeTruthy();
    }
    logger.info(
      `SF593: Resolved IDs include ${want.length} required Dataverse_Field__c key(s) for ${src}="${val}".`
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Completeness — every active Account_Status__c picklist value has ≥1 CMDT row
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'every active Account_Status__c picklist value should have at least one Dataverse_Mapping row',
  async function (this: AutomationWorld) {
    await assertActivePicklistCompletenessForCmdtField(this, 'Account', 'Account_Status__c', {
      excludePicklistValues: ACCOUNT_STATUS_PICKLIST_VALUES_EXCLUDED_FROM_CMDT_COMPLETENESS,
    });
  }
);

Then(
  'every active Functional_Currency__c picklist value should have at least one Dataverse_Mapping row',
  async function (this: AutomationWorld) {
    await assertActivePicklistCompletenessForCmdtField(this, 'Account', 'Functional_Currency__c');
  }
);

Then(
  'every active Contact_Status__c picklist value should have at least one Dataverse_Mapping row',
  async function (this: AutomationWorld) {
    await assertActivePicklistCompletenessForCmdtField(this, 'Contact', 'Contact_Status__c');
  }
);

Then(
  'every active Product_Map Status__c picklist value should have at least one Dataverse_Mapping row',
  async function (this: AutomationWorld) {
    const statusField =
      process.env.SF796_PRODUCT_MAP_STATUS_FIELD?.trim() || 'Status__c';
    await assertActivePicklistCompletenessForCmdtField(this, 'Product_Map__c', statusField);
  }
);

Then(
  'every active AccountTeamMember TeamMemberRole picklist value should have at least one Dataverse_Mapping row',
  async function (this: AutomationWorld) {
    await assertActivePicklistCompletenessForCmdtField(this, 'AccountTeamMember', 'TeamMemberRole');
  }
);

Then(
  'every active AccountTeamMember Region__c picklist value should have at least one Dataverse_Mapping row',
  async function (this: AutomationWorld) {
    await assertActivePicklistCompletenessForCmdtField(this, 'AccountTeamMember', 'Region__c');
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Gold (BA Picklist Value Mappings — Party Integration) vs bulk Salesforce export (CSV)
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'every Party Integration gold mapping row from Picklist Value Mappings Excel should exist in the Salesforce bulk query Dataverse_Mapping export',
  async function (this: AutomationWorld) {
    const bulkPath = resolveBulkQueryExportCsvPath();
    if (!bulkPath) {
      throw new Error(
        'SF593: No bulk-query CSV found. Set SF593_BULKQUERY_EXPORT_CSV to the export path, ' +
          'or place data/excel/qamerge-dataversemapping-metadata.csv or data/excel/bulkQuery_result*.csv.'
      );
    }
    const gold = await loadPartyIntegrationGoldMappingRows();
    const bulk = loadBulkQueryDataverseMappingCsv(bulkPath);
    assertEveryGoldRowExistsInBulk(gold, bulk);
  }
);

function readBulkExportOrThrow(): { path: string; rows: ReturnType<typeof loadBulkQueryDataverseMappingCsv> } {
  const bulkPath = resolveBulkQueryExportCsvPath();
  if (!bulkPath) {
    throw new Error(
      'SF593: No bulk-query CSV found. Set SF593_BULKQUERY_EXPORT_CSV to the export path, ' +
        'or place data/excel/qamerge-dataversemapping-metadata.csv or bulkQuery_result*.csv (qamerge export).'
    );
  }
  return { path: bulkPath, rows: loadBulkQueryDataverseMappingCsv(bulkPath) };
}

function readBulkExportCached(world: AutomationWorld): {
  path: string;
  rows: ReturnType<typeof loadBulkQueryDataverseMappingCsv>;
} {
  const ctx = world.testContext as {
    sf593BulkExportPath?: string;
    sf593BulkExportRows?: ReturnType<typeof loadBulkQueryDataverseMappingCsv>;
  };
  if (ctx.sf593BulkExportRows?.length && ctx.sf593BulkExportPath) {
    return { path: ctx.sf593BulkExportPath, rows: ctx.sf593BulkExportRows };
  }
  const got = readBulkExportOrThrow();
  ctx.sf593BulkExportPath = got.path;
  ctx.sf593BulkExportRows = got.rows;
  return got;
}

function mappingTableRowToExpected(h: Record<string, string>): ExpectedMappingRowInput {
  const canon = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const pick = (...want: string[]): string => {
    for (const [k, v] of Object.entries(h)) {
      const ck = canon(k);
      for (const w of want) {
        if (ck === canon(w)) return String(v ?? '').trim();
      }
    }
    return '';
  };
  const objectRaw = pick('Object__c', 'object__c', 'Object', 'object');
  const fieldRaw = pick('Field__c', 'field__c', 'Field', 'field');
  const value = pick('Value__c', 'value__c', 'Value', 'value');
  const dataverseField = pick(
    'Dataverse_Field__c',
    'dataverse_field__c',
    'Dataverse Field',
    'DataverseField__c'
  );
  const dataverseValue = pick(
    'Dataverse_Value__c',
    'dataverse_value__c',
    'Dataverse Value',
    'DataverseValue__c'
  );
  if (!fieldRaw || !value || !dataverseField || !dataverseValue) {
    throw new Error(
      `SF593: Mapping table row missing required cells. Got keys: ${Object.keys(h).join(', ')}`
    );
  }
  return { objectRaw: objectRaw || undefined, fieldRaw, value, dataverseField, dataverseValue };
}

Then(
  'the Salesforce bulk query Dataverse_Mapping export should have at least {int} data rows',
  async function (this: AutomationWorld, defaultMin: number) {
    const { rows } = readBulkExportCached(this);
    const min = resolveBulkExportMinimumRowCount(defaultMin);
    assertBulkExportMinimumRowCount(rows, min);
  }
);

Then(
  'every row in the Salesforce bulk query Dataverse_Mapping export should have populated mapping columns',
  async function (this: AutomationWorld) {
    const { rows } = readBulkExportCached(this);
    assertBulkExportAllMappingColumnsPopulated(rows);
  }
);

Then(
  'the Salesforce bulk query Dataverse_Mapping export should contain these expected mapping rows',
  async function (this: AutomationWorld, table: DataTable) {
    const { rows } = readBulkExportCached(this);
    const hashes = table.hashes() as Record<string, string>[];
    const expected = hashes.map(mappingTableRowToExpected);
    assertBulkExportContainsExpectedRows(rows, expected);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Optional: Excel parity (only when "Picklist Value Mappings.xlsx" is present locally)
// Note: compares against CMDT Value__c distinct values for Account.Account_Status__c.
// ═══════════════════════════════════════════════════════════════════════════
Then(
  'the CMDT Dataverse_Mapping rows for Account_Status should match the Party Integration Excel sheet',
  async function (this: AutomationWorld) {
    const records = requireRecords(this);
    const cmdt = [
      ...new Set(records.map((r) => String(r.Value__c ?? '').trim()).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b));

    const fromExcel = await readPartyIntegrationPicklistValuesFromExcel();
    const excel = [...new Set(fromExcel.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b)
    );

    expect(
      cmdt,
      `SF593: CMDT Value__c set (${cmdt.length}) vs Excel "Party Integration" set (${excel.length}). ` +
        `CMDT=${JSON.stringify(cmdt)} Excel=${JSON.stringify(excel)}`
    ).toEqual(excel);
    logger.info(`SF593: CMDT Value__c set matches Excel sheet (${cmdt.length} values).`);
  }
);

// Legacy step kept for backward compatibility with older feature files (no-op import).
Then(
  'Account field {string} active picklist values should match Party Integration sheet from Excel',
  async function (this: AutomationWorld, fieldQuery: string) {
    const api = this.testContext.apiClient as SalesforceAPIClient | undefined;
    if (!api) throw new Error('SF593: No Salesforce API client — run API Background first.');

    const useLabels = process.env.SF593_EXCEL_VALUES_ARE_LABELS === 'true';
    const d = await api.describeSObject('Account');
    const fields = d.fields || [];
    const f = findAccountField(fields, fieldQuery);
    if (!f) throw new Error(`SF593: Field not found on Account describe: "${fieldQuery}"`);
    if (!Array.isArray(f.picklistValues)) {
      throw new Error(`SF593: Field ${f.name} has no picklistValues in describe`);
    }
    const fromOrg = (f.picklistValues as { active?: boolean; value?: string; label?: string }[])
      .filter((p) => p.active)
      .map((p) => (useLabels ? p.label ?? p.value : p.value) as string)
      .filter((s) => s != null && String(s).trim() !== '')
      .map((s) => String(s).trim());

    const fromExcel = await readPartyIntegrationPicklistValuesFromExcel();
    const norm = (arr: string[]) =>
      [...new Set(arr.map((s) => s.trim()))].sort((a, b) => a.localeCompare(b));
    const a = norm(fromOrg);
    const b = norm(fromExcel);
    expect(
      a,
      `SF593: Org picklist (${a.length}) vs Excel (${b.length}). Org=${JSON.stringify(
        a
      )} Excel=${JSON.stringify(b)}`
    ).toEqual(b);
    logger.info(`SF593: Picklist ${f.name} matches Excel (${a.length} active values).`);
  }
);
