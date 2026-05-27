import * as fs from 'fs';
import { sfAccountDataverseField } from './sf-account-dataverse-field';

/**
 * CLM go-live migration entity registry.
 *
 * Field mappings: Mapping and Governance of Data Attributes for CLM Design.xlsx
 *   — "M <source> -> <target>" tabs; column N "Include in Migration? (Y/N)" = Y only.
 *
 * Picklist values: Picklist Value Mappings.xlsx (per-entity migration tabs where defined).
 */

export const CLM_MAPPING_GOVERNANCE_EXCEL =
  'data/excel/Mapping and Governance of Data Attributes for CLM Design.xlsx';

export const PICKLIST_MAPPINGS_EXCEL = 'data/excel/Picklist Value Mappings.xlsx';

/** All programme M migration tabs (governance workbook). */
export const CLM_GOVERNANCE_M_SHEETS = [
  'M party -> accounts',
  'M membermap -> memberLEgroup',
  'M tpamap -> TPA_Map__c',
  'M externalcontact -> contacts',
  'M internal_contact ->TeamMember',
  'M accelins_country -> country_c',
  'M accelins_p_m -> productmap',
  'M accelins_sp -> sp',
  'M accelins_p -> Product(ins)',
  'M accelins_aslob -> aslob',
  'M accelins_osficode -> osfi',
  'M accelins_pog_p -> pog_p',
  'M accelins_cob -> cob',
  'M accelins_lob -> lob',
  'M accelins_b_c -> begaap_cob',
  'M accelins_s_i -> solvencyII',
  /** In workbook + plan (SF-779); confirm with programme if not in your M-tab checklist */
  'M accelins_mpp -> mpp',
] as const;

export interface ClmMigrationEntityConfig {
  key: string;
  jira: string;
  label: string;
  dynamicsEntitySet: string;
  dynamicsIdField: string;
  salesforceObject: string;
  salesforceCorrelationField: string;
  useProbedAccountDataverseField?: boolean;
  fieldMappingExcelEnv: string;
  fieldMappingSheetEnv: string;
  governanceMigrationSheet: string;
  picklistMigrationTab: string;
  /** Automated field + count validation */
  enabled: boolean;
  /** Excluded this migration cycle (e.g. SF-785 Product) — still listed for traceability */
  outOfScopeThisCycle?: boolean;
  outOfScopeReason?: string;
  /**
   * Salesforce object + correlation field verified on INT (May 2026 QA progress).
   * When false, field-level @CLM-MIG-ENTITY scenarios stay @pending-step-def until load completes.
   */
  intMigrationReady?: boolean;
  /** Alternate SF object name (e.g. Insurance_Product__c vs Product_ins__c on INT). */
  salesforceObjectAlternate?: string;
  /** How A2 record counts are evaluated for Go/No-Go. Default exact. */
  countMatchMode?: 'exact' | 'sf-lte-dynamics' | 'tolerance';
  /** Allowed positive delta (Dynamics − SF migrated) when countMatchMode=tolerance. */
  countTolerance?: number;
  /** Allowed positive delta (SF − Dynamics) when TARGET has extra rows (e.g. change history). */
  countSfHigherTolerance?: number;
  countExclusionNote?: string;
  /** How A3 existence check treats missing TARGET rows. Default all. */
  existenceMatchMode?: 'all' | 'tolerance' | 'skip';
  existenceTolerance?: number;
  existenceExclusionNote?: string;
  /** Phase A audit field validation (Owner/CreatedBy/LastModifiedBy). Default true when loaded. */
  validateAuditFields?: boolean;
  /**
   * How Dynamics SOURCE rows are matched to Salesforce TARGET rows.
   * RDM objects on INT often lack Dataverse_ID__c — use name or master-id instead.
   */
  correlationStrategy?: 'dataverse-id' | 'name' | 'master-id' | 'iso-code';
  /** Dynamics field used as match key when correlationStrategy is name or master-id. */
  dynamicsMatchField?: string;
  /** Salesforce field used as match key when correlationStrategy is name or master-id. */
  salesforceMatchField?: string;
  /** A2 counts compare Dynamics total to SF total (not correlation-populated rows). */
  countUsesSalesforceTotal?: boolean;
  /** Currency uses CurrencyType ISO + CMDT — not custom object / governance M-tab. */
  validationMode?: 'standard' | 'iso-currency';
  /** Extra Dynamics attributes to include in OData $select (field validation only). */
  dynamicsExtraSelectFields?: string[];
  /**
   * Replace governance Dynamics API names before validation (e.g. option-set code field → label attribute).
   * Key = governance sheet field; value = OData attribute to read/compare.
   */
  dynamicsFieldSubstitutions?: Record<string, string>;
}

export const CLM_MIGRATION_ENTITIES: ClmMigrationEntityConfig[] = [
  // ── Mastered / transactional ──────────────────────────────────────────────
  {
    key: 'party',
    jira: 'SF-736',
    label: 'Account → Party',
    dynamicsEntitySet: 'accelins_parties',
    dynamicsIdField: 'accelins_partyid',
    salesforceObject: 'Account',
    salesforceCorrelationField: 'Dataverse_ID__c',
    useProbedAccountDataverseField: true,
    fieldMappingExcelEnv: 'CLM_PARTY_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_PARTY_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M party -> accounts',
    picklistMigrationTab: 'Party Migration',
    enabled: true,
    intMigrationReady: true,
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_partymasterid',
    salesforceMatchField: 'PTY_Code__c',
  },
  {
    key: 'contact-external',
    jira: 'SF-738',
    label: 'Contact (External — BA accelins_contact)',
    /** BA table: accelins_contact — OData exposes standard `contacts` entity set (381 on INT). */
    dynamicsEntitySet: 'contacts',
    dynamicsIdField: 'contactid',
    salesforceObject: 'Contact',
    salesforceCorrelationField: 'Dataverse_ID__c',
    fieldMappingExcelEnv: 'CLM_CONTACT_EXT_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_CONTACT_EXT_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M externalcontact -> contacts',
    picklistMigrationTab: 'Migration External Contact',
    enabled: true,
    intMigrationReady: true,
    countMatchMode: 'tolerance',
    countTolerance: 37,
    countExclusionNote:
      'Duplicate emails excluded from Contact load; duplicates routed to AccountContactRelation (BA per-object procedures).',
    existenceMatchMode: 'tolerance',
    existenceTolerance: 37,
    existenceExclusionNote:
      'Up to 37 Dynamics contacts may exist only via ACR after duplicate handling — not as Contact rows.',
    /** BA: contacts table includes accelins_partyname — used in field validation, not row correlation. */
    dynamicsExtraSelectFields: ['accelins_partyname'],
  },
  {
    key: 'contact-internal',
    jira: 'SF-737',
    label: 'Contact (Internal — accelins_internal_contact)',
    dynamicsEntitySet: 'accelins_internal_contacts',
    dynamicsIdField: 'accelins_internal_contactid',
    salesforceObject: 'AccountTeamMember',
    salesforceCorrelationField: 'Internal_Contact_Master_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_internal_contact_master_id',
    salesforceMatchField: 'Internal_Contact_Master_ID__c',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_CONTACT_INT_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_CONTACT_INT_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M internal_contact ->TeamMember',
    picklistMigrationTab: 'Migration Internal Contact',
    enabled: true,
    intMigrationReady: true,
    countMatchMode: 'sf-lte-dynamics',
    countExclusionNote:
      'Inactive rows and users no longer at Accelerant excluded per BA internal-contact procedures (~833 on INT).',
    existenceMatchMode: 'skip',
    existenceExclusionNote:
      'Not all Dynamics internal contacts migrate — inactive / departed-user rows excluded by BA design.',
  },
  {
    key: 'member-map',
    jira: 'SF-769',
    label: 'Member Legal Entity Relationship',
    dynamicsEntitySet: 'accelins_membermappings',
    dynamicsIdField: 'accelins_membermappingid',
    salesforceObject: 'Member_Legal_Entity_Relationship__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    fieldMappingExcelEnv: 'CLM_MEMBER_MAP_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_MEMBER_MAP_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M membermap -> memberLEgroup',
    picklistMigrationTab: 'Migration Member Maps',
    enabled: true,
    intMigrationReady: true,
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_name',
    salesforceMatchField: 'Name',
  },
  {
    key: 'tpa-map',
    jira: 'SF-775',
    label: 'TPA Map',
    dynamicsEntitySet: 'accelins_tpamapses',
    dynamicsIdField: 'accelins_tpamapsid',
    salesforceObject: 'TPA_Maps__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    fieldMappingExcelEnv: 'CLM_TPA_MAP_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_TPA_MAP_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M tpamap -> TPA_Map__c',
    picklistMigrationTab: 'Migration TPA Maps',
    enabled: true,
    intMigrationReady: true,
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_name',
    salesforceMatchField: 'Name',
  },
  // ── RDM reference data ────────────────────────────────────────────────────
  {
    key: 'country',
    jira: 'SF-739',
    label: 'Country',
    dynamicsEntitySet: 'accelins_countries',
    dynamicsIdField: 'accelins_countryid',
    salesforceObject: 'Country__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    fieldMappingExcelEnv: 'CLM_COUNTRY_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_COUNTRY_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_country -> country_c',
    picklistMigrationTab: 'Migration Country',
    enabled: true,
    intMigrationReady: true,
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_countrymasterid',
    salesforceMatchField: 'Country_Master_ID__c',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    dynamicsFieldSubstitutions: {
      accelins_business_area: 'accelins_business_areaname',
    },
  },
  {
    key: 'product-map',
    jira: 'SF-767',
    label: 'Product Map',
    /** BA table: accelins_product_map — OData entity set accelins_productmappings. */
    dynamicsEntitySet: 'accelins_productmappings',
    dynamicsIdField: 'accelins_productmappingid',
    salesforceObject: 'Product_Map__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    fieldMappingExcelEnv: 'CLM_PRODUCT_MAP_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_PRODUCT_MAP_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_p_m -> productmap',
    picklistMigrationTab: 'Migration Product Maps',
    enabled: true,
    intMigrationReady: true,
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_name',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    countMatchMode: 'tolerance',
    countSfHigherTolerance: 3000,
    countExclusionNote:
      'A2 compares Dynamics count to SF Product_Map__c total. Extra SF rows (change-history) have PM- Master IDs not present in Dynamics SOURCE — tolerated via countSfHigherTolerance.',
  },
  {
    key: 'sub-product',
    jira: 'SF-766',
    label: 'Sub Product',
    dynamicsEntitySet: 'accelins_subproducts',
    dynamicsIdField: 'accelins_subproductid',
    salesforceObject: 'Sub_Product__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_subproductmasterid',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_SUB_PRODUCT_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_SUB_PRODUCT_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_sp -> sp',
    picklistMigrationTab: 'Migration Product Maps',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'product',
    jira: 'SF-785',
    label: 'Product (Insurance)',
    /** BA table: accelins_product → Product_ins__c on INT. */
    dynamicsEntitySet: 'accelins_products',
    dynamicsIdField: 'accelins_productid',
    salesforceObject: 'Product_ins__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_productmasterid',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_PRODUCT_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_PRODUCT_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_p -> Product(ins)',
    picklistMigrationTab: 'Migration Product Maps',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'aslob',
    jira: 'SF-780',
    label: 'ASLOB',
    dynamicsEntitySet: 'accelins_aslobs',
    dynamicsIdField: 'accelins_aslobid',
    salesforceObject: 'ASLOB__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    /** BA: accelins_aslob = description; accelins_aslob_master_id (e.g. ASLOB-000037) ↔ SF Name. */
    dynamicsMatchField: 'accelins_aslob_master_id',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    dynamicsExtraSelectFields: ['accelins_aslob'],
    fieldMappingExcelEnv: 'CLM_ASLOB_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_ASLOB_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_aslob -> aslob',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'osfi',
    jira: 'SF-798',
    label: 'OSFI',
    dynamicsEntitySet: 'accelins_osficodes',
    dynamicsIdField: 'accelins_osficodeid',
    salesforceObject: 'OSFI__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_osfi_code_master_id',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_OSFI_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_OSFI_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_osficode -> osfi',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'class-of-business',
    jira: 'SF-781',
    label: 'Class of Business',
    dynamicsEntitySet: 'accelins_cobs',
    dynamicsIdField: 'accelins_cobid',
    salesforceObject: 'Classes_of_Business__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_cobmasterid',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_COB_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_COB_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_cob -> cob',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'line-of-business',
    jira: 'SF-782',
    label: 'Line of Business',
    dynamicsEntitySet: 'accelins_lobs',
    dynamicsIdField: 'accelins_lobid',
    salesforceObject: 'Line_of_Business__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_lobmasterid',
    salesforceMatchField: 'Name',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_LOB_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_LOB_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_lob -> lob',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'begaap-cob',
    jira: 'SF-783',
    label: 'BEGAAP COB',
    dynamicsEntitySet: 'accelins_begaap_cobs',
    dynamicsIdField: 'accelins_begaap_cobid',
    salesforceObject: 'BEGAAP_COB__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'name',
    dynamicsMatchField: 'accelins_name',
    salesforceMatchField: 'BEGAAP_COB_Name__c',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_BEGAAP_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_BEGAAP_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_b_c -> begaap_cob',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'solvency-ii',
    jira: 'SF-784',
    label: 'Solvency II',
    dynamicsEntitySet: 'accelins_solvency_iis',
    dynamicsIdField: 'accelins_solvency_iiid',
    salesforceObject: 'Solvency_II__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'name',
    dynamicsMatchField: 'accelins_name',
    salesforceMatchField: 'Solvency_II_Name__c',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_SOLVENCY_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_SOLVENCY_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_s_i -> solvencyII',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'member-product-program',
    jira: 'SF-779',
    label: 'Member Product Program',
    dynamicsEntitySet: 'accelins_memberproductsprograms',
    dynamicsIdField: 'accelins_memberproductsprogramid',
    salesforceObject: 'Member_Product_and_Program__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'name',
    dynamicsMatchField: 'accelins_name',
    salesforceMatchField: 'Member_Product_and_Program_Name__c',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_MPP_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_MPP_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_mpp -> mpp',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  {
    key: 'pog-product',
    jira: 'SF-872',
    label: 'POG Product',
    dynamicsEntitySet: 'accelins_pog_products',
    dynamicsIdField: 'accelins_pog_productid',
    salesforceObject: 'POG_Product__c',
    salesforceCorrelationField: 'Dataverse_ID__c',
    correlationStrategy: 'master-id',
    dynamicsMatchField: 'accelins_pog_product_master_id',
    salesforceMatchField: 'Name',
    dynamicsExtraSelectFields: ['accelins_name'],
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_POG_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_POG_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: 'M accelins_pog_p -> pog_p',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
  // SF-786 — Currency via standard Salesforce CurrencyType (ISO) + CMDT metadata
  {
    key: 'currency',
    jira: 'SF-786',
    label: 'Currency',
    dynamicsEntitySet: 'transactioncurrencies',
    dynamicsIdField: 'transactioncurrencyid',
    salesforceObject: 'CurrencyType',
    salesforceCorrelationField: 'IsoCode',
    correlationStrategy: 'iso-code',
    dynamicsMatchField: 'isocurrencycode',
    salesforceMatchField: 'IsoCode',
    validationMode: 'iso-currency',
    countMatchMode: 'tolerance',
    countSfHigherTolerance: 50,
    countExclusionNote:
      'SF org may include additional standard CurrencyType ISO codes beyond Dynamics transactioncurrencies row count.',
    countUsesSalesforceTotal: true,
    validateAuditFields: false,
    fieldMappingExcelEnv: 'CLM_CURRENCY_FIELD_MAPPING_EXCEL',
    fieldMappingSheetEnv: 'CLM_CURRENCY_FIELD_MAPPING_SHEET',
    governanceMigrationSheet: '',
    picklistMigrationTab: '',
    enabled: true,
    intMigrationReady: true,
  },
];

export function getClmMigrationEntity(key: string): ClmMigrationEntityConfig {
  const entity = CLM_MIGRATION_ENTITIES.find((e) => e.key === key);
  if (!entity) {
    throw new Error(`Unknown CLM migration entity: ${key}`);
  }
  return entity;
}

function countReadyOnly(): boolean {
  return (process.env.CLM_MIGRATION_COUNT_READY_ONLY || 'false').toLowerCase() === 'true';
}

/** Go/No-Go uses full BA entity table by default (all enabled, in-cycle entities). */
export function isClmMigrationGoNoGoFullTable(): boolean {
  const raw = process.env.CLM_MIGRATION_GONOGO_FULL_TABLE;
  if (raw === undefined || raw === '') {
    return true;
  }
  return raw.toLowerCase() !== 'false';
}

/** Entities included in record-count validation (A2 / Go/No-Go). */
export function getClmMigrationEntitiesForCounts(): ClmMigrationEntityConfig[] {
  const skipKeys = new Set(
    (process.env.CLM_MIGRATION_COUNT_SKIP || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const readyOnly = countReadyOnly();
  return CLM_MIGRATION_ENTITIES.filter(
    (e) =>
      e.enabled &&
      !e.outOfScopeThisCycle &&
      !skipKeys.has(e.key) &&
      (!readyOnly || e.intMigrationReady === true)
  );
}

/** Evaluate whether SOURCE vs TARGET migrated counts satisfy entity rules. */
export function evaluateClmMigrationCountMatch(
  entity: ClmMigrationEntityConfig,
  dynamicsCount: number,
  salesforceMigratedCount: number,
  salesforceTotalCount?: number
): { match: boolean; delta: number; mode: string } {
  const sfCount =
    entity.countUsesSalesforceTotal && salesforceTotalCount !== undefined
      ? salesforceTotalCount
      : salesforceMigratedCount;
  const delta = dynamicsCount - sfCount;
  const mode = entity.countUsesSalesforceTotal
    ? `${entity.countMatchMode || 'exact'}-sf-total`
    : entity.countMatchMode || 'exact';

  if (entity.countMatchMode === 'sf-lte-dynamics') {
    return { match: sfCount <= dynamicsCount, delta, mode };
  }
  if (entity.countMatchMode === 'tolerance') {
    const tolerance = entity.countTolerance ?? 0;
    const sfHigher = entity.countSfHigherTolerance ?? 0;
    const dynamicsHigherOk = delta >= 0 && delta <= tolerance;
    const sfHigherOk = delta < 0 && -delta <= sfHigher;
    return {
      match: dynamicsHigherOk || sfHigherOk,
      delta,
      mode: sfHigher > 0 ? `${mode}+sf-higher-${sfHigher}` : mode,
    };
  }
  return { match: delta === 0, delta, mode };
}

export function getEntityCorrelationStrategy(
  entity: ClmMigrationEntityConfig
): 'dataverse-id' | 'name' | 'master-id' | 'iso-code' {
  return entity.correlationStrategy || 'dataverse-id';
}

export function resolveDynamicsMatchField(entity: ClmMigrationEntityConfig): string {
  return entity.dynamicsMatchField || 'accelins_name';
}

export function resolveSalesforceMatchField(entity: ClmMigrationEntityConfig): string {
  return entity.salesforceMatchField || 'Name';
}

/** Use alternate SF object when primary has zero rows (e.g. Product_ins__c vs Insurance_Product__c). */
export async function resolveSalesforceMigrationObject(
  client: import('../api-clients/salesforce/SalesforceAPIClient').SalesforceAPIClient,
  entity: ClmMigrationEntityConfig
): Promise<string> {
  const primary = entity.salesforceObject;
  const alternate = entity.salesforceObjectAlternate?.trim();
  if (!alternate) {
    return primary;
  }
  try {
    const primaryCount = await client.query(`SELECT COUNT() FROM ${primary}`);
    if ((primaryCount.totalSize ?? 0) > 0) {
      return primary;
    }
    const altCount = await client.query(`SELECT COUNT() FROM ${alternate}`);
    if ((altCount.totalSize ?? 0) > 0) {
      return alternate;
    }
  } catch {
    /* keep primary */
  }
  return primary;
}

export function evaluateClmMigrationExistenceMatch(
  entity: ClmMigrationEntityConfig,
  missingCount: number
): boolean {
  if (entity.existenceMatchMode === 'skip') {
    return true;
  }
  if (missingCount === 0) {
    return true;
  }
  if (entity.existenceMatchMode === 'tolerance') {
    return missingCount <= (entity.existenceTolerance ?? 0);
  }
  return false;
}

/** Entities with SF TARGET data on INT — eligible for @int-migration-ready field validation. */
export function getClmMigrationEntitiesReadyOnInt(): ClmMigrationEntityConfig[] {
  return CLM_MIGRATION_ENTITIES.filter(
    (e) => e.enabled && !e.outOfScopeThisCycle && e.intMigrationReady === true
  );
}

export function isClmMigrationEntityReadyOnInt(entityKey: string): boolean {
  const entity = getClmMigrationEntity(entityKey);
  return Boolean(entity.enabled && !entity.outOfScopeThisCycle && entity.intMigrationReady);
}

export function resolveSalesforceCorrelationField(entity: ClmMigrationEntityConfig): string {
  const strategy = getEntityCorrelationStrategy(entity);
  if (
    strategy === 'master-id' ||
    strategy === 'name' ||
    strategy === 'iso-code'
  ) {
    return resolveSalesforceMatchField(entity);
  }
  if (entity.useProbedAccountDataverseField) {
    return sfAccountDataverseField();
  }
  return entity.salesforceCorrelationField;
}

export function shouldValidateClmMigrationAuditFields(entity: ClmMigrationEntityConfig): boolean {
  if (entity.validateAuditFields === false) {
    return false;
  }
  return entity.validateAuditFields === true || entity.intMigrationReady === true;
}

export function resolveFieldMappingPath(entity: ClmMigrationEntityConfig): string {
  const fromEnv = process.env[entity.fieldMappingExcelEnv]?.trim();
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv;
  }
  const shared = process.env.CLM_MIGRATION_FIELD_EXCEL?.trim();
  if (shared && fs.existsSync(shared)) {
    return shared;
  }
  const governance = process.env.CLM_MAPPING_GOVERNANCE_EXCEL?.trim();
  if (governance && fs.existsSync(governance)) {
    return governance;
  }
  const defaultPath = CLM_MAPPING_GOVERNANCE_EXCEL;
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }
  return defaultPath;
}

export function resolveFieldMappingSheet(entity: ClmMigrationEntityConfig): string {
  return (
    process.env[entity.fieldMappingSheetEnv]?.trim() ||
    process.env.CLM_MIGRATION_FIELD_SHEET?.trim() ||
    entity.governanceMigrationSheet
  );
}
