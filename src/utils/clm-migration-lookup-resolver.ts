/**
 * Resolve Dynamics OData lookup GUIDs to Salesforce Ids for CLM migration field compare.
 */

import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { buildClmMigrationUserMap } from './clm-migration-audit-validation';
import { FieldMapping } from './migration-field-mapper';
import { logger } from './logger';
import { primeSfAccountDataverseFieldFromOrg, sfAccountDataverseField } from './sf-account-dataverse-field';

export interface ClmLookupTargetConfig {
  dynamicsEntitySet: string;
  dynamicsMasterIdField: string;
  salesforceObject: string;
  salesforceMatchField: string;
}

/** Known Dynamics lookup attributes → TARGET resolution (GUID → SF record Id). */
export const CLM_DYNAMICS_LOOKUP_TARGETS: Record<string, ClmLookupTargetConfig> = {
  accelins_contact_member: {
    dynamicsEntitySet: 'accelins_parties',
    dynamicsMasterIdField: 'accelins_partymasterid',
    salesforceObject: 'Account',
    salesforceMatchField: 'PTY_Code__c',
  },
  accelins_party: {
    dynamicsEntitySet: 'accelins_parties',
    dynamicsMasterIdField: 'accelins_partymasterid',
    salesforceObject: 'Account',
    salesforceMatchField: 'PTY_Code__c',
  },
  accelins_classofbusiness: {
    dynamicsEntitySet: 'accelins_cobs',
    dynamicsMasterIdField: 'accelins_cobmasterid',
    salesforceObject: 'Classes_of_Business__c',
    salesforceMatchField: 'Name',
  },
  accelins_lineofbusiness: {
    dynamicsEntitySet: 'accelins_lobs',
    dynamicsMasterIdField: 'accelins_lobmasterid',
    salesforceObject: 'Line_of_Business__c',
    salesforceMatchField: 'Name',
  },
  accelins_subproduct: {
    dynamicsEntitySet: 'accelins_subproducts',
    dynamicsMasterIdField: 'accelins_subproductmasterid',
    salesforceObject: 'Sub_Product__c',
    salesforceMatchField: 'Name',
  },
  accelins_aslob1: {
    dynamicsEntitySet: 'accelins_aslobs',
    dynamicsMasterIdField: 'accelins_aslob_master_id',
    salesforceObject: 'ASLOB__c',
    salesforceMatchField: 'Name',
  },
  accelins_osfi: {
    dynamicsEntitySet: 'accelins_osficodes',
    dynamicsMasterIdField: 'accelins_osfi_code_master_id',
    salesforceObject: 'OSFI__c',
    salesforceMatchField: 'Name',
  },
};

/** Product_Map__c lookups reference Product2 (by RDM display name + Family), not RDM custom objects. */
const PRODUCT2_LOOKUP_FIELDS: Record<
  string,
  {
    family: string;
    dynamicsEntitySet: string;
    dynamicsIdField: string;
    dynamicsNameField: string;
  }
> = {
  accelins_classofbusiness: {
    family: 'Class of Business',
    dynamicsEntitySet: 'accelins_cobs',
    dynamicsIdField: 'accelins_cobid',
    dynamicsNameField: 'accelins_name',
  },
  accelins_lineofbusiness: {
    family: 'Line Of Business',
    dynamicsEntitySet: 'accelins_lobs',
    dynamicsIdField: 'accelins_lobid',
    dynamicsNameField: 'accelins_name',
  },
  accelins_subproduct: {
    family: 'Sub Product',
    dynamicsEntitySet: 'accelins_subproducts',
    dynamicsIdField: 'accelins_subproductid',
    dynamicsNameField: 'accelins_name',
  },
  accelins_aslob1: {
    family: 'ASLOB',
    dynamicsEntitySet: 'accelins_aslobs',
    dynamicsIdField: 'accelins_aslobid',
    dynamicsNameField: 'accelins_aslob',
  },
  accelins_member_product_program_id: {
    family: 'Member Products & Programs',
    dynamicsEntitySet: 'accelins_memberproductsprograms',
    dynamicsIdField: 'accelins_memberproductsprogramid',
    dynamicsNameField: 'accelins_name',
  },
  accelins_osfi: {
    family: 'OSFI / OSFII',
    dynamicsEntitySet: 'accelins_osficodes',
    dynamicsIdField: 'accelins_osficodeid',
    dynamicsNameField: 'accelins_name',
  },
  accelins_pogproduct: {
    family: 'POG Product',
    dynamicsEntitySet: 'accelins_pog_products',
    dynamicsIdField: 'accelins_pog_productid',
    dynamicsNameField: 'accelins_name',
  },
};

const PARTY_DYNAMICS_LOOKUP_FIELDS = new Set([
  'accelins_party',
  'accelins_contact_member',
  'accelins_tpa',
  'accelins_tpagroupid',
  'accelins_group',
  'accelins_legalentity',
  'accelins_mganame',
]);

export function isPartyAccountLookupMapping(mapping: FieldMapping): boolean {
  const df = mapping.dynamicsField?.toLowerCase() ?? '';
  const sf = mapping.salesforceField ?? '';
  if (PARTY_DYNAMICS_LOOKUP_FIELDS.has(df)) return true;
  if (sf === 'AccountId') return true;
  if (/^(Member|Legal_Entity|Group|TPA_Account|TPA_Group_Account)__c$/i.test(sf)) return true;
  return false;
}

export function isProductMapProduct2Lookup(
  dynamicsField: string,
  salesforceField: string
): boolean {
  return (
    /^(Class_of_Business|Line_of_Business|SubProduct|ASLOB|Member_Products_and_Programs|OSFI|POG_Product)__c$/i.test(
      salesforceField
    ) && Boolean(PRODUCT2_LOOKUP_FIELDS[dynamicsField.toLowerCase()])
  );
}

export function isUserLookupMapping(mapping: FieldMapping): boolean {
  const sf = mapping.salesforceField?.toLowerCase() ?? '';
  const df = mapping.dynamicsField?.toLowerCase() ?? '';
  return sf === 'userid' || df === 'accelins_contact';
}

export function isClmResolvableLookupMapping(mapping: FieldMapping): boolean {
  const f = mapping.dynamicsField?.toLowerCase() ?? '';
  if (!f) return false;
  return (
    mapping.fieldType === 'lookup' ||
    isClmLookupDynamicsField(f) ||
    isPartyAccountLookupMapping(mapping) ||
    isUserLookupMapping(mapping) ||
    isProductMapProduct2Lookup(mapping.dynamicsField, mapping.salesforceField) ||
    mapping.salesforceField === 'AccountId'
  );
}

export function isClmLookupDynamicsField(dynamicsField: string): boolean {
  return Boolean(CLM_DYNAMICS_LOOKUP_TARGETS[dynamicsField.toLowerCase()]);
}

/** OData foreign-key attribute for a Dynamics lookup (e.g. `_accelins_party_value`). */
export function dynamicsLookupValueAttribute(dynamicsField: string): string {
  const f = dynamicsField.trim();
  if (f.startsWith('_') && f.endsWith('_value')) {
    return f;
  }
  return `_${f}_value`;
}

export function readDynamicsLookupGuid(
  record: Record<string, unknown>,
  dynamicsField: string
): string {
  const valueKey = dynamicsLookupValueAttribute(dynamicsField);
  const raw = record[valueKey] ?? record[dynamicsField];
  if (typeof raw === 'object' && raw !== null && 'id' in raw) {
    return String((raw as { id: string }).id).trim();
  }
  return String(raw ?? '').trim();
}

function escapeSoql(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export class ClmMigrationLookupResolver {
  /** Dynamics Party GUID (lower) → Salesforce Account Id */
  private partyGuidToAccountId = new Map<string, string>();

  /** `${salesforceObject}:${dynamicsGuid}` (lower) → Salesforce record Id */
  private dynamicsGuidToSfId = new Map<string, string>();

  /** `${dynamicsField}:${guid}` (lower) → Product2 Id (Product_Map lookups) */
  private product2GuidToId = new Map<string, string>();

  /** Dynamics systemuser GUID (lower) → Salesforce User Id */
  private dynamicsUserToSfUser = new Map<string, string>();

  private constructor() {}

  static async build(
    dynamicsClient: DynamicsAPIClient,
    salesforceClient: SalesforceAPIClient,
    mappings: FieldMapping[],
    dynamicsRecords: Record<string, unknown>[]
  ): Promise<ClmMigrationLookupResolver> {
    const resolver = new ClmMigrationLookupResolver();
    const partyGuids = new Set<string>();
    const rdmGuids = new Map<string, Set<string>>();
    const product2Guids = new Map<string, Set<string>>();
    let needsUserMap = false;

    for (const m of mappings) {
      const field = m.dynamicsField?.toLowerCase();
      if (!field || !isClmResolvableLookupMapping(m)) continue;
      if (isUserLookupMapping(m)) {
        needsUserMap = true;
      }

      for (const rec of dynamicsRecords) {
        const guid = readDynamicsLookupGuid(rec, m.dynamicsField);
        if (!guid) continue;

        if (isPartyAccountLookupMapping(m)) {
          partyGuids.add(guid);
          continue;
        }

        if (isProductMapProduct2Lookup(m.dynamicsField, m.salesforceField)) {
          const set = product2Guids.get(field) ?? new Set<string>();
          set.add(guid);
          product2Guids.set(field, set);
          continue;
        }

        if (CLM_DYNAMICS_LOOKUP_TARGETS[field]) {
          const set = rdmGuids.get(field) ?? new Set<string>();
          set.add(guid);
          rdmGuids.set(field, set);
        }
      }
    }

    if (partyGuids.size > 0) {
      await primeSfAccountDataverseFieldFromOrg(salesforceClient);
      await resolver.resolvePartyGuidsToAccountIds(
        salesforceClient,
        [...partyGuids].map((g) => g.toLowerCase())
      );
    }

    for (const [field, guids] of rdmGuids) {
      const cfg = CLM_DYNAMICS_LOOKUP_TARGETS[field];
      if (cfg) {
        await resolver.resolveRdmGuids(dynamicsClient, salesforceClient, cfg, [...guids], field);
      }
    }

    for (const [field, guids] of product2Guids) {
      await resolver.resolveProduct2Guids(dynamicsClient, salesforceClient, field, [...guids]);
    }

    if (needsUserMap) {
      resolver.dynamicsUserToSfUser = await buildClmMigrationUserMap(
        dynamicsClient,
        salesforceClient
      );
    }

    return resolver;
  }

  private async resolvePartyGuidsToAccountIds(
    salesforceClient: SalesforceAPIClient,
    partyGuidsLower: string[]
  ): Promise<void> {
    const corr = sfAccountDataverseField();
    const batchSize = 200;
    for (let i = 0; i < partyGuidsLower.length; i += batchSize) {
      const batch = partyGuidsLower.slice(i, i + batchSize);
      const inList = batch.map((id) => `'${escapeSoql(id)}'`).join(', ');
      try {
        const result = await salesforceClient.query(
          `SELECT Id, ${corr} FROM Account WHERE ${corr} IN (${inList})`
        );
        for (const rec of (result.records || []) as Record<string, unknown>[]) {
          const dvId = String(rec[corr] ?? '')
            .trim()
            .toLowerCase();
          const sfId = String(rec.Id ?? '').trim();
          if (dvId && sfId) {
            this.partyGuidToAccountId.set(dvId, sfId);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Party GUID → Account Id resolution batch failed: ${msg}`);
      }
    }

    const unresolved = partyGuidsLower.filter((g) => !this.partyGuidToAccountId.has(g));
    if (unresolved.length > 0) {
      logger.info(
        `Lookup resolver: ${this.partyGuidToAccountId.size}/${partyGuidsLower.length} Party GUID(s) resolved via Account.${corr}`
      );
    }
  }

  private async resolveRdmGuids(
    dynamicsClient: DynamicsAPIClient,
    salesforceClient: SalesforceAPIClient,
    cfg: ClmLookupTargetConfig,
    guids: string[],
    dynamicsField: string
  ): Promise<void> {
    const resolvedIdField = this.resolveDynamicsIdField(cfg.dynamicsEntitySet);
    const masterByGuid = await this.batchDynamicsMasterIds(
      dynamicsClient,
      cfg.dynamicsEntitySet,
      resolvedIdField,
      cfg.dynamicsMasterIdField,
      guids
    );

    const masterIds = [...new Set([...masterByGuid.values()])];
    if (masterIds.length === 0) {
      return;
    }

    const sfByMaster = new Map<string, string>();
    const batchSize = 200;
    for (let i = 0; i < masterIds.length; i += batchSize) {
      const batch = masterIds.slice(i, i + batchSize);
      const inList = batch.map((v) => `'${escapeSoql(v)}'`).join(', ');
      try {
        const result = await salesforceClient.query(
          `SELECT Id, ${cfg.salesforceMatchField} FROM ${cfg.salesforceObject} WHERE ${cfg.salesforceMatchField} IN (${inList})`
        );
        for (const rec of (result.records || []) as Record<string, unknown>[]) {
          const key = String(rec[cfg.salesforceMatchField] ?? '').trim();
          const sfId = String(rec.Id ?? '').trim();
          if (key && sfId) {
            sfByMaster.set(key, sfId);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(
          `RDM lookup ${cfg.dynamicsEntitySet} → ${cfg.salesforceObject} batch failed: ${msg}`
        );
      }
    }

    for (const [guid, masterId] of masterByGuid) {
      const sfId = sfByMaster.get(masterId);
      if (sfId) {
        this.dynamicsGuidToSfId.set(`${cfg.salesforceObject}:${guid.toLowerCase()}`, sfId);
        this.dynamicsGuidToSfId.set(`${dynamicsField}:${guid.toLowerCase()}`, sfId);
      }
    }
  }

  private async resolveProduct2Guids(
    dynamicsClient: DynamicsAPIClient,
    salesforceClient: SalesforceAPIClient,
    dynamicsField: string,
    guids: string[]
  ): Promise<void> {
    const p2Cfg = PRODUCT2_LOOKUP_FIELDS[dynamicsField.toLowerCase()];
    if (!p2Cfg || guids.length === 0) {
      return;
    }

    const nameByGuid = await this.batchDynamicsFieldValues(
      dynamicsClient,
      p2Cfg.dynamicsEntitySet,
      p2Cfg.dynamicsIdField,
      p2Cfg.dynamicsNameField,
      guids
    );

    const names = [...new Set([...nameByGuid.values()])].filter(Boolean);
    if (names.length === 0) {
      return;
    }

    const sfByName = new Map<string, string>();
    const batchSize = 100;
    for (let i = 0; i < names.length; i += batchSize) {
      const batch = names.slice(i, i + batchSize);
      const inList = batch.map((v) => `'${escapeSoql(v)}'`).join(', ');
      try {
        const result = await salesforceClient.query(
          `SELECT Id, Name FROM Product2 WHERE Name IN (${inList}) AND Family = '${escapeSoql(p2Cfg.family)}'`
        );
        for (const rec of (result.records || []) as Record<string, unknown>[]) {
          const key = String(rec.Name ?? '').trim();
          const sfId = String(rec.Id ?? '').trim();
          if (key && sfId) {
            sfByName.set(key, sfId);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Product2 lookup ${dynamicsField} batch failed: ${msg}`);
      }
    }

    for (const [guid, name] of nameByGuid) {
      const sfId = sfByName.get(name);
      if (sfId) {
        this.product2GuidToId.set(`${dynamicsField.toLowerCase()}:${guid.toLowerCase()}`, sfId);
      }
    }
  }

  private resolveDynamicsIdField(entitySet: string): string {
    const map: Record<string, string> = {
      accelins_parties: 'accelins_partyid',
      accelins_cobs: 'accelins_cobid',
      accelins_lobs: 'accelins_lobid',
      accelins_subproducts: 'accelins_subproductid',
      accelins_aslobs: 'accelins_aslobid',
      accelins_osficodes: 'accelins_osficodeid',
    };
    return map[entitySet] ?? `${entitySet.replace(/s$/, '')}id`;
  }

  private async batchDynamicsFieldValues(
    dynamicsClient: DynamicsAPIClient,
    entitySet: string,
    idField: string,
    valueField: string,
    guids: string[]
  ): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const batchSize = 40;
    for (let i = 0; i < guids.length; i += batchSize) {
      const batch = guids.slice(i, i + batchSize);
      const filter = batch.map((g) => `${idField} eq ${g}`).join(' or ');
      try {
        const res = await dynamicsClient.query(entitySet, {
          $select: `${idField},${valueField}`,
          $filter: filter,
        });
        for (const row of (res.value as Record<string, unknown>[]) || []) {
          const id = String(row[idField] ?? '').trim();
          const value = String(row[valueField] ?? '').trim();
          if (id && value) {
            out.set(id.toLowerCase(), value);
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn(`Dynamics batch ${valueField} lookup on ${entitySet} failed: ${msg}`);
        for (const g of batch) {
          try {
            const row = (await dynamicsClient.getRecord(entitySet, g, [valueField])) as Record<
              string,
              unknown
            >;
            const value = String(row[valueField] ?? '').trim();
            if (value) out.set(g.toLowerCase(), value);
          } catch {
            /* skip */
          }
        }
      }
    }
    return out;
  }

  private async batchDynamicsMasterIds(
    dynamicsClient: DynamicsAPIClient,
    entitySet: string,
    idField: string,
    masterField: string,
    guids: string[]
  ): Promise<Map<string, string>> {
    return this.batchDynamicsFieldValues(dynamicsClient, entitySet, idField, masterField, guids);
  }

  /** Resolve a Dynamics lookup to a Salesforce Id comparable with SF lookup fields. */
  resolveDynamicsLookupValue(
    dynamicsField: string,
    record: Record<string, unknown>,
    salesforceField: string
  ): unknown {
    const field = dynamicsField.toLowerCase();
    const guid = readDynamicsLookupGuid(record, dynamicsField);
    if (!guid) {
      return record[dynamicsField] ?? '';
    }

    if (isUserLookupMapping({ dynamicsField, salesforceField, fieldType: 'lookup', isCritical: false })) {
      return this.dynamicsUserToSfUser.get(guid.toLowerCase()) ?? '';
    }

    if (isPartyAccountLookupMapping({ dynamicsField, salesforceField, fieldType: 'lookup', isCritical: false })) {
      return this.partyGuidToAccountId.get(guid.toLowerCase()) ?? '';
    }

    if (isProductMapProduct2Lookup(dynamicsField, salesforceField)) {
      return this.product2GuidToId.get(`${field}:${guid.toLowerCase()}`) ?? '';
    }

    const cfg = CLM_DYNAMICS_LOOKUP_TARGETS[field];
    if (cfg) {
      return (
        this.dynamicsGuidToSfId.get(`${field}:${guid.toLowerCase()}`) ??
        this.dynamicsGuidToSfId.get(`${cfg.salesforceObject}:${guid.toLowerCase()}`) ??
        ''
      );
    }

    return guid;
  }
}

const USER_AUDIT_DYNAMICS_FIELDS = new Set([
  'createdby',
  'modifiedby',
  'ownerid',
  'createdonbehalfby',
  'modifiedonbehalfby',
]);

/** OData $select extras for lookup foreign keys. */
export function clmLookupSelectExtras(mappings: FieldMapping[]): string[] {
  const extras: string[] = [];
  for (const m of mappings) {
    const f = m.dynamicsField?.trim();
    if (!f || USER_AUDIT_DYNAMICS_FIELDS.has(f.toLowerCase())) continue;
    if (isClmResolvableLookupMapping(m)) {
      extras.push(dynamicsLookupValueAttribute(f));
    }
  }
  return extras;
}
