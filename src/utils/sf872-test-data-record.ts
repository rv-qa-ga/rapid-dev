/**
 * Minimal SF-872 reference-data rows via REST create, driven by live describe
 * (required fields, picklists, lookups). Reduces drift when org metadata changes.
 */

import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';

export type Sf872RecordCreateContext = {
  product2Id: string;
  /** Set when creating Line_of_Business__c (prerequisite Solvency_II__c row). */
  solvencyIiId?: string;
};

type DescribeField = {
  name: string;
  type: string;
  createable: boolean;
  nillable?: boolean;
  defaultedOnCreate?: boolean;
  referenceTo?: string[];
  picklistValues?: Array<{ value: string; active?: boolean }>;
  length?: number;
};

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max);
}

function firstActivePicklist(f: DescribeField): string | undefined {
  const vals = f.picklistValues?.filter((p) => p.active !== false) || [];
  return vals[0]?.value;
}

/**
 * Product2 used as parent for Lookup(Product) on SF-872 objects. Override with SF_SF872_PRODUCT2_ID.
 */
export async function ensureSf872Product2Id(client: SalesforceAPIClient): Promise<string> {
  const envId = process.env.SF_SF872_PRODUCT2_ID?.trim();
  if (envId) {
    logger.info(`SF-872: using Product2 from SF_SF872_PRODUCT2_ID`);
    return envId;
  }

  const res = await client.query('SELECT Id FROM Product2 WHERE IsActive = true LIMIT 1');
  if (res.records?.length && (res.records[0] as { Id?: string }).Id) {
    const id = (res.records[0] as { Id: string }).Id;
    logger.info(`SF-872: using existing Product2 ${id}`);
    return id;
  }

  const stamp = Date.now();
  const created = await client.createRecord('Product2', {
    Name: `SF-872 Test Product ${stamp}`,
    ProductCode: `SF872-${stamp}`,
    IsActive: true,
  });
  if (!created.id) {
    throw new Error('Product2 create returned no id');
  }
  logger.info(`SF-872: created Product2 ${created.id}`);
  return created.id;
}

function resolveReference(
  field: DescribeField,
  objectApiName: string,
  ctx: Sf872RecordCreateContext
): string | undefined {
  const refs = field.referenceTo || [];
  if (refs.includes('Product2')) {
    return ctx.product2Id;
  }
  if (refs.includes('Solvency_II__c')) {
    if (!ctx.solvencyIiId) {
      throw new Error(
        `Field ${objectApiName}.${field.name} references Solvency_II__c but solvencyIiId was not provided`
      );
    }
    return ctx.solvencyIiId;
  }
  return undefined;
}

async function valueForDescribeField(
  client: SalesforceAPIClient,
  objectApiName: string,
  field: DescribeField,
  ctx: Sf872RecordCreateContext
): Promise<unknown> {
  const t = field.type;
  const n = field.name;

  if (t === 'boolean') {
    return false;
  }

  if (t === 'date') {
    if (n === 'Valid_To__c') {
      return '2099-12-31';
    }
    return new Date().toISOString().slice(0, 10);
  }

  if (t === 'datetime') {
    return new Date().toISOString();
  }

  if (t === 'picklist' || t === 'multipicklist') {
    const v = firstActivePicklist(field);
    if (!v) {
      throw new Error(`No active picklist value for ${objectApiName}.${n}`);
    }
    return v;
  }

  if (t === 'reference') {
    const id = resolveReference(field, objectApiName, ctx);
    if (id) {
      return id;
    }
    throw new Error(
      `Unsupported reference ${objectApiName}.${n} -> ${(field.referenceTo || []).join(', ')}`
    );
  }

  if (t === 'string' || t === 'textarea' || t === 'url' || t === 'phone' || t === 'email') {
    const max = field.length && field.length > 0 ? field.length : 255;
    return truncate(`SF-872 ${objectApiName} ${n} ${Date.now()}`, max);
  }

  if (t === 'double' || t === 'currency' || t === 'percent' || t === 'int') {
    return 0;
  }

  if (t === 'encryptedstring') {
    const max = field.length && field.length > 0 ? field.length : 255;
    return truncate(`SF872-${Date.now()}`, max);
  }

  throw new Error(`Unsupported SF-872 field type ${t} for ${objectApiName}.${n}`);
}

const OPTIONAL_SF872_FIELDS = new Set(['Valid_From__c', 'Valid_To__c', 'Status__c']);

/**
 * Build a create payload from describe: required createable fields (minus defaults) plus optional SF-872 staples.
 * Also sets any createable *_Name__c string when still empty (better row labels).
 */
export async function buildSf872ReferenceRecordPayload(
  client: SalesforceAPIClient,
  objectApiName: string,
  ctx: Sf872RecordCreateContext
): Promise<Record<string, unknown>> {
  const d = await client.describeSObject(objectApiName);
  const fields = (d.fields || []) as DescribeField[];
  const payload: Record<string, unknown> = {};

  for (const f of fields) {
    if (!f.createable) {
      continue;
    }
    if (f.defaultedOnCreate) {
      continue;
    }
    if (f.name === 'CurrencyIsoCode') {
      continue;
    }

    const required = f.nillable === false;
    const wantOptional = OPTIONAL_SF872_FIELDS.has(f.name);
    if (!required && !wantOptional) {
      continue;
    }

    const val = await valueForDescribeField(client, objectApiName, f, ctx);
    payload[f.name] = val;
  }

  for (const f of fields) {
    if (!f.createable || f.type !== 'string') {
      continue;
    }
    if (!/_Name__c$|_Code__c$/.test(f.name)) {
      continue;
    }
    if (payload[f.name] !== undefined) {
      continue;
    }
    const max = f.length && f.length > 0 ? f.length : 255;
    payload[f.name] = truncate(`SF-872 ${f.name} ${Date.now()}`, max);
  }

  return payload;
}
