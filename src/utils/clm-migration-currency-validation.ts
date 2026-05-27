/**
 * SF-786 Currency — Dynamics transactioncurrencies vs Salesforce CurrencyType (ISO codes).
 * No custom Currency__c object; currencies live in standard SF CurrencyType + CMDT mappings.
 */

import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { ClmMigrationEntityConfig } from './clm-migration-entity-config';
import { ClmEntityMigrationRunResult } from './clm-migration-validation.service';
import { normalizeMatchKey } from './clm-migration-validation.service';
import { FieldMapping, ValidationResult } from './migration-field-mapper';
import { logger } from './logger';
import { loadBulkQueryDataverseMappingCsv, resolveBulkQueryExportCsvPath } from './sf593-gold-vs-bulkquery';

export interface CurrencyIsoRow {
  isoCode: string;
  dynamicsName?: string;
  salesforceActive?: boolean;
  inCmdtMetadata?: boolean;
}

function readCmdtCurrencyIsoCodes(): Set<string> {
  const csvPath = resolveBulkQueryExportCsvPath();
  if (!csvPath) {
    logger.warn('Currency CMDT check skipped — qamerge-dataversemapping-metadata.csv not found.');
    return new Set();
  }
  const rows = loadBulkQueryDataverseMappingCsv(csvPath);
  const isos = new Set<string>();
  for (const row of rows) {
    if (row.fieldNorm !== 'functional_currency__c') {
      continue;
    }
    const iso = row.value.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(iso)) {
      isos.add(iso);
    }
  }
  logger.info(`CMDT functional_currency__c: ${isos.size} distinct ISO code(s) in metadata.`);
  return isos;
}

export async function queryDynamicsTransactionCurrencies(
  client: DynamicsAPIClient
): Promise<Array<{ transactioncurrencyid: string; isocurrencycode: string; currencyname?: string }>> {
  const all: Array<{ transactioncurrencyid: string; isocurrencycode: string; currencyname?: string }> = [];
  let nextLink: string | undefined;
  const params: Record<string, string> = {
    $select: 'transactioncurrencyid,isocurrencycode,currencyname',
    $top: '500',
  };

  do {
    const res = nextLink
      ? await client.queryByNextLink(nextLink)
      : await client.query('transactioncurrencies', params);
    const batch = ((res.value as Record<string, unknown>[]) || []).map((r) => ({
      transactioncurrencyid: String(r.transactioncurrencyid || ''),
      isocurrencycode: String(r.isocurrencycode || '').trim().toUpperCase(),
      currencyname: r.currencyname ? String(r.currencyname) : undefined,
    }));
    all.push(...batch.filter((r) => r.isocurrencycode));
    nextLink =
      (res as { '@odata.nextLink'?: string })['@odata.nextLink'] ||
      (res as { 'odata.nextLink'?: string })['odata.nextLink'];
  } while (nextLink);

  logger.info(`Dynamics transactioncurrencies: ${all.length} row(s) with ISO code.`);
  return all;
}

export async function querySalesforceCurrencyTypes(
  client: SalesforceAPIClient
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const result = await client.query(
    'SELECT Id, IsoCode, DecimalPlaces, IsActive, ConversionRate FROM CurrencyType'
  );
  for (const rec of (result.records || []) as Record<string, unknown>[]) {
    const iso = normalizeMatchKey(String(rec.IsoCode || '')).toUpperCase();
    if (iso) {
      map.set(iso, rec);
    }
  }
  logger.info(`Salesforce CurrencyType: ${map.size} ISO code(s).`);
  return map;
}

export async function runClmCurrencyIsoMigrationValidation(
  dynamicsClient: DynamicsAPIClient,
  salesforceClient: SalesforceAPIClient,
  entity: ClmMigrationEntityConfig
): Promise<ClmEntityMigrationRunResult> {
  const dynamicsRows = await queryDynamicsTransactionCurrencies(dynamicsClient);
  const sfByIso = await querySalesforceCurrencyTypes(salesforceClient);
  const cmdtIsos = readCmdtCurrencyIsoCodes();

  const dynamicsRecords: Record<string, unknown>[] = dynamicsRows.map((r) => ({
    transactioncurrencyid: r.transactioncurrencyid,
    isocurrencycode: r.isocurrencycode,
    currencyname: r.currencyname,
  }));

  const mappings: FieldMapping[] = [
    {
      dynamicsField: 'isocurrencycode',
      salesforceField: 'IsoCode',
      fieldType: 'string',
      isCritical: true,
      tolerance: 'exact',
    },
  ];

  const validationResults: ValidationResult[] = [];
  const missingInSalesforce: string[] = [];
  let recordsWithFieldDiffs = 0;

  for (const dyn of dynamicsRecords) {
    const iso = String(dyn.isocurrencycode || '').toUpperCase();
    const sf = sfByIso.get(iso) ?? null;
    const inCmdt = cmdtIsos.size === 0 || cmdtIsos.has(iso);

    if (!sf) {
      missingInSalesforce.push(String(dyn.transactioncurrencyid || iso));
    }

    const isoMatch = Boolean(sf && normalizeMatchKey(String(sf.IsoCode || '')).toUpperCase() === iso);
    const comparisons = [
      {
        field: 'isocurrencycode',
        salesforceField: 'IsoCode',
        dynamicsValue: iso,
        salesforceValue: sf ? String(sf.IsoCode || '') : '(missing)',
        match: isoMatch,
        severity: 'error' as const,
      },
      {
        field: 'cmdt_metadata',
        salesforceField: 'Dataverse_Mapping__mdt',
        dynamicsValue: iso,
        salesforceValue: inCmdt ? 'present' : '(not in CMDT)',
        match: inCmdt,
        severity: 'warning' as const,
      },
    ];

    const fieldsDifferent = comparisons.filter((c) => !c.match).length;
    if (fieldsDifferent > 0) {
      recordsWithFieldDiffs++;
    }

    validationResults.push({
      masterId: iso,
      partyExists: false,
      accountExists: Boolean(sf),
      fieldsCompared: comparisons.length,
      fieldsMatched: comparisons.length - fieldsDifferent,
      fieldsDifferent,
      criticalFieldsMatched: isoMatch,
      comparisons,
      missingInSalesforce: sf ? [] : [iso],
      missingInDynamics: [],
      recommendations: [],
    });
  }

  // CMDT rows are integration metadata — log gaps but do not fail existence (not all ISO codes are org-active).
  const cmdtMissingInSf = [...cmdtIsos].filter((iso) => !sfByIso.has(iso));
  if (cmdtMissingInSf.length > 0) {
    logger.info(
      `Currency CMDT: ${cmdtMissingInSf.length} functional_currency__c ISO code(s) in metadata ` +
        `not present as active CurrencyType (informational only).`
    );
  }

  return {
    entity,
    mappings,
    fieldMappingSource: 'CurrencyType (standard ISO) + Dataverse_Mapping__mdt',
    fieldMappingSheet: 'functional_currency__c CMDT rows',
    dynamicsRecords,
    validationResults,
    missingInSalesforce,
    recordsWithFieldDiffs,
  };
}
