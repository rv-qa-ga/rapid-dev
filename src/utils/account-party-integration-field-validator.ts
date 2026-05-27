import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';
import {
  loadBulkQueryDataverseMappingCsv,
  resolveBulkQueryExportCsvPath,
  type BulkExportRow,
} from './sf593-gold-vs-bulkquery';
import {
  normalizeSalesforceAccountType,
  partyTypeMatchesAccountType,
  readPartyTypeFromDynamicsRow,
  resolveExpectedPartyTypeCode,
} from './sf-account-party-type-mapping';

export interface IntegrationFieldMismatch {
  salesforceField: string;
  salesforceValue: string;
  dynamicsField: string;
  expectedDynamicsValue: string;
  actualDynamicsValue: string;
  severity: 'critical' | 'warning';
}

export interface IntegrationFieldCheck {
  label: string;
  salesforceField: string;
  salesforceValue: string;
  dynamicsField: string;
  expectedDynamicsValue: string;
  actualDynamicsValue: string;
  passed: boolean;
}

export interface IntegrationValidationResult {
  fieldsChecked: number;
  fieldsPassed: number;
  mismatches: IntegrationFieldMismatch[];
  checks: IntegrationFieldCheck[];
}

const INTEGRATION_FIELD_PRIORITY = [
  'type',
  'data_source_written__c',
  'data_source_claims__c',
  'affiliate_non_affiliate__c',
  'functional_currency__c',
  'admission_status__c',
  'billingcountry',
] as const;

const DIRECT_FIELD_CHECKS: Array<{
  label: string;
  salesforceField: string;
  dynamicsFields: string[];
  critical: boolean;
}> = [
  { label: 'Account Name', salesforceField: 'Name', dynamicsFields: ['accelins_name'], critical: true },
  {
    label: 'PTY Code',
    salesforceField: 'PTY_Code__c',
    dynamicsFields: ['accelins_partymasterid'],
    critical: true,
  },
];

const PARTY_FIELD_ALIASES: Record<string, string[]> = {
  accelins_datasource: ['accelins_datasource'],
  accelins_datasourceclaims: ['accelins_datasourceclaims'],
  accelins_name: ['accelins_name'],
  accelins_partymasterid: ['accelins_partymasterid'],
  accelins_affiliate_nonaffiliate: ['accelins_affiliate_nonaffiliate'],
  accelins_functional_currency: ['accelins_functional_currency'],
  accelins_admittednonadmitted: ['accelins_admittednonadmitted'],
  accelins_country: ['accelins_country'],
  statuscode: ['statuscode'],
  statecode: ['statecode'],
  accelins_partytype: ['accelins_partytype'],
};

let cmdtRowsCache: BulkExportRow[] | null = null;

function loadCmdtRows(): BulkExportRow[] {
  if (cmdtRowsCache) {
    return cmdtRowsCache;
  }
  const csvPath = resolveBulkQueryExportCsvPath();
  if (!csvPath) {
    throw new Error(
      'Dataverse_Mapping__mdt CSV not found under data/excel/. ' +
        'Add qamerge-dataversemapping-metadata.csv or set SF593_BULKQUERY_EXPORT_CSV.'
    );
  }
  cmdtRowsCache = loadBulkQueryDataverseMappingCsv(csvPath);
  return cmdtRowsCache;
}

function partyAttributeFromCmdt(dataverseField: string): string {
  const trimmed = dataverseField.trim();
  if (trimmed.includes('.')) {
    return trimmed.split('.').pop()!.trim();
  }
  return trimmed;
}

function sfFieldApiFromNorm(fieldNorm: string): string {
  if (fieldNorm === 'type') {
    return 'Type';
  }
  const special: Record<string, string> = {
    billingcountry: 'BillingCountry',
    billingstate: 'BillingState',
    billingcity: 'BillingCity',
    billingstreet: 'BillingStreet',
    billingpostalcode: 'BillingPostalCode',
  };
  if (special[fieldNorm]) {
    return special[fieldNorm];
  }
  const parts = fieldNorm.split('_').map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p));
  const joined = parts.join('_');
  if (joined.endsWith('_C') && !joined.endsWith('__c')) {
    return joined.slice(0, -2) + '__c';
  }
  return joined;
}

function readSalesforceField(account: Record<string, unknown>, fieldNorm: string): string {
  const api = sfFieldApiFromNorm(fieldNorm);
  const direct = account[api];
  if (direct != null && String(direct).trim() !== '') {
    return String(direct).trim();
  }
  const lower = api.toLowerCase();
  for (const [key, val] of Object.entries(account)) {
    if (key.toLowerCase() === lower && val != null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function typeLookupValues(sfType: string): string[] {
  const normalized = normalizeSalesforceAccountType(sfType);
  const values = new Set<string>([sfType.trim(), normalized]);
  if (normalized === 'Third Party Administrator') {
    values.add('Third Party Administartor');
  }
  if (normalized === 'Non - Member MGA') {
    values.add('Non-Member MGA');
  }
  return [...values].filter(Boolean);
}

function findCmdtMappings(
  rows: BulkExportRow[],
  fieldNorm: string,
  sfValue: string
): BulkExportRow[] {
  const valueCandidates =
    fieldNorm === 'type' ? typeLookupValues(sfValue) : [sfValue.trim()].filter(Boolean);
  const hits: BulkExportRow[] = [];
  for (const candidate of valueCandidates) {
    const matches = rows.filter(
      (r) =>
        r.objectNorm === 'account' &&
        r.fieldNorm === fieldNorm &&
        r.value.trim().toLowerCase() === candidate.trim().toLowerCase()
    );
    for (const match of matches) {
      if (!hits.some((h) => h.dataverseField === match.dataverseField)) {
        hits.push(match);
      }
    }
  }
  return hits;
}

function readPartyOptionSetValue(
  row: Record<string, unknown>,
  fieldName: string
): { raw: string; label: string; display: string } {
  const formatted = String(
    row[`${fieldName}@OData.Community.Display.V1.FormattedValue`] ?? ''
  ).trim();
  const rawVal = row[fieldName];
  const raw =
    rawVal !== null && rawVal !== undefined && String(rawVal).trim() !== ''
      ? String(rawVal).trim()
      : '';
  const label = formatted || (/^\d+$/.test(raw) ? '' : raw);
  return {
    raw,
    label,
    display: label || raw,
  };
}

export { readPartyOptionSetValue };

function readPartyScalar(party: Record<string, unknown>, attribute: string): string {
  const keys = PARTY_FIELD_ALIASES[attribute] ?? [attribute];
  for (const key of keys) {
    const val = party[key];
    if (val != null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

async function resolveLookupCode(
  dynamicsClient: DynamicsAPIClient | undefined,
  entitySet: string,
  lookupId: string,
  codeFields: string[]
): Promise<string> {
  if (!dynamicsClient || !lookupId) {
    return '';
  }
  try {
    const row = (await dynamicsClient.getRecord(entitySet, lookupId, codeFields)) as Record<
      string,
      unknown
    >;
    for (const field of codeFields) {
      const val = String(row[field] ?? '').trim();
      if (val) {
        return val;
      }
    }
  } catch (error: unknown) {
    logger.warn(
      `Could not resolve ${entitySet} lookup ${lookupId}: ${String((error as Error)?.message ?? error)}`
    );
  }
  return '';
}

async function readActualPartyValue(
  party: Record<string, unknown>,
  attribute: string,
  dynamicsClient?: DynamicsAPIClient
): Promise<string> {
  if (attribute === 'accelins_partytype') {
    return readPartyTypeFromDynamicsRow(party, dynamicsClient);
  }

  if (
    attribute === 'statuscode' ||
    attribute === 'statecode' ||
    attribute === 'accelins_datasource' ||
    attribute === 'accelins_datasourceclaims' ||
    attribute === 'accelins_affiliate_nonaffiliate' ||
    attribute === 'accelins_admittednonadmitted'
  ) {
    const { raw, display } = readPartyOptionSetValue(party, attribute);
    if (attribute === 'statuscode' || attribute === 'statecode') {
      return raw || display;
    }
    return display;
  }

  const direct = readPartyScalar(party, attribute);
  if (/^(PTP|CRY|CCY)-\d+/i.test(direct)) {
    return direct;
  }

  const lookupKey = `_${attribute}id_value`;
  const lookupId = String(party[lookupKey] ?? party[`_${attribute}_value`] ?? '').trim();
  if (lookupId && dynamicsClient) {
    if (attribute === 'accelins_country') {
      return (
        (await resolveLookupCode(dynamicsClient, 'accelins_countries', lookupId, [
          'accelins_partymasterid',
          'accelins_name',
        ])) || direct
      );
    }
    if (attribute === 'accelins_functional_currency') {
      return (
        (await resolveLookupCode(dynamicsClient, 'accelins_currencies', lookupId, [
          'accelins_partymasterid',
          'accelins_name',
        ])) || direct
      );
    }
  }

  return direct;
}

function valuesMatch(expected: string, actual: string, sfLabel?: string): boolean {
  const exp = String(expected ?? '').trim();
  const act = String(actual ?? '').trim();
  if (!act) {
    return false;
  }
  if (exp === act) {
    return true;
  }
  if (exp !== '' && act !== '' && Number(exp) === Number(act)) {
    return true;
  }
  if (sfLabel && act.toLowerCase() === sfLabel.trim().toLowerCase()) {
    return true;
  }
  return exp.toLowerCase() === act.toLowerCase();
}

function optionSetMatchesCmdt(
  party: Record<string, unknown>,
  fieldName: string,
  expectedCmdt: string,
  sfLabel: string
): { passed: boolean; actual: string } {
  const { raw, display } = readPartyOptionSetValue(party, fieldName);
  if (!display) {
    return { passed: false, actual: '' };
  }
  if (display === expectedCmdt) {
    return { passed: true, actual: display };
  }
  if (raw && expectedCmdt && Number(raw) === Number(expectedCmdt)) {
    return { passed: true, actual: display };
  }
  if (sfLabel && display.toLowerCase() === sfLabel.trim().toLowerCase()) {
    return { passed: true, actual: display };
  }
  return { passed: false, actual: display };
}

function dataSourceWrittenMatches(
  party: Record<string, unknown>,
  expectedCmdt: string,
  sfWritten: string,
  sfClaims: string
): { passed: boolean; actual: string; dynamicsField: string } {
  const primary = optionSetMatchesCmdt(party, 'accelins_datasource', expectedCmdt, sfWritten);
  if (primary.passed) {
    return { ...primary, dynamicsField: 'accelins_datasource' };
  }
  if (sfWritten && sfWritten === sfClaims) {
    const claimsExpected = sfWritten.toLowerCase() === 'platform' ? '376140001' : '376140000';
    const fallback = optionSetMatchesCmdt(
      party,
      'accelins_datasourceclaims',
      claimsExpected,
      sfWritten
    );
    if (fallback.passed) {
      return { ...fallback, dynamicsField: 'accelins_datasourceclaims' };
    }
  }
  return { passed: false, actual: primary.actual, dynamicsField: 'accelins_datasource' };
}

function pushCheck(
  checks: IntegrationFieldCheck[],
  check: IntegrationFieldCheck,
  mismatches: IntegrationFieldMismatch[],
  severity: 'critical' | 'warning'
): void {
  checks.push(check);
  if (!check.passed) {
    mismatches.push({
      salesforceField: check.salesforceField,
      salesforceValue: check.salesforceValue,
      dynamicsField: check.dynamicsField,
      expectedDynamicsValue: check.expectedDynamicsValue,
      actualDynamicsValue: check.actualDynamicsValue,
      severity,
    });
  }
}

async function validateAccountStatusComposite(
  rows: BulkExportRow[],
  account: Record<string, unknown>,
  party: Record<string, unknown>,
  dynamicsClient: DynamicsAPIClient | undefined,
  checks: IntegrationFieldCheck[],
  mismatches: IntegrationFieldMismatch[]
): Promise<void> {
  const sfStatus = readSalesforceField(account, 'account_status__c');
  if (!sfStatus) {
    return;
  }

  const mappings = findCmdtMappings(rows, 'account_status__c', sfStatus);
  if (mappings.length === 0) {
    pushCheck(
      checks,
      {
        label: 'Account Status',
        salesforceField: 'Account_Status__c',
        salesforceValue: sfStatus,
        dynamicsField: 'statecode|statuscode',
        expectedDynamicsValue: '(no CMDT mapping)',
        actualDynamicsValue: '',
        passed: false,
      },
      mismatches,
      'critical'
    );
    return;
  }

  const parts: string[] = [];
  let allPassed = true;
  const actualParts: string[] = [];

  for (const mapping of mappings) {
    const attribute = partyAttributeFromCmdt(mapping.dataverseField);
    const expected = mapping.dataverseValue.trim();
    const actual = await readActualPartyValue(party, attribute, dynamicsClient);
    const passed = valuesMatch(expected, actual, attribute === 'statuscode' ? sfStatus : undefined);
    parts.push(`${attribute}=${expected}`);
    actualParts.push(`${attribute}="${actual || '(empty)'}"`);
    if (!passed) {
      allPassed = false;
    }
  }

  pushCheck(
    checks,
    {
      label: 'Account Status (Status Reason)',
      salesforceField: 'Account_Status__c',
      salesforceValue: sfStatus,
      dynamicsField: mappings.map((m) => partyAttributeFromCmdt(m.dataverseField)).join(' + '),
      expectedDynamicsValue: `${sfStatus} (${parts.join(', ')})`,
      actualDynamicsValue: actualParts.join(', '),
      passed: allPassed,
    },
    mismatches,
    'critical'
  );
}

export function clearAccountPartyCmdtCache(): void {
  cmdtRowsCache = null;
}

export async function validateAccountToPartyIntegrationFields(
  account: Record<string, unknown>,
  party: Record<string, unknown>,
  dynamicsClient?: DynamicsAPIClient
): Promise<IntegrationValidationResult> {
  const result = await validateAccountPartyIntegrationFieldsDetailed(account, party, {
    dynamicsClient,
  });
  return {
    fieldsChecked: result.checks.length,
    fieldsPassed: result.checks.filter((c) => c.passed).length,
    mismatches: result.checks
      .filter((c) => !c.passed)
      .map((c) => ({
        salesforceField: c.salesforceField,
        salesforceValue: c.salesforceValue,
        dynamicsField: c.dynamicsField,
        expectedDynamicsValue: c.expectedDynamicsValue,
        actualDynamicsValue: c.actualDynamicsValue,
        severity: ['Type', 'Data_Source_Written__c', 'Data_Source_Claims__c', 'Account_Status__c'].includes(
          c.salesforceField
        )
          ? 'critical'
          : 'warning',
      })),
    checks: result.checks,
  };
}

/** Full CMDT-mapped Account→Party validation (type, data sources, status, affiliate, currency, etc.). */
export async function validateAccountPartyIntegrationFieldsDetailed(
  account: Record<string, unknown>,
  party: Record<string, unknown>,
  options: {
    salesforceClient?: SalesforceAPIClient;
    dynamicsClient?: DynamicsAPIClient;
  } = {}
): Promise<{ checks: IntegrationFieldCheck[] }> {
  const rows = loadCmdtRows();
  const checks: IntegrationFieldCheck[] = [];
  const mismatches: IntegrationFieldMismatch[] = [];

  await validateAccountStatusComposite(rows, account, party, options.dynamicsClient, checks, mismatches);

  for (const fieldNorm of INTEGRATION_FIELD_PRIORITY) {
    const sfValue = readSalesforceField(account, fieldNorm);
    if (!sfValue) {
      continue;
    }

    const sfField = sfFieldApiFromNorm(fieldNorm);
    const critical = ['type', 'data_source_written__c', 'data_source_claims__c'].includes(fieldNorm);

    if (fieldNorm === 'type') {
      let ptpCode = '';
      try {
        ptpCode = await resolveExpectedPartyTypeCode(sfValue, options);
      } catch {
        ptpCode = '';
      }
      const actual = await readPartyTypeFromDynamicsRow(party, options.dynamicsClient);
      const passed = partyTypeMatchesAccountType(actual, sfValue, ptpCode || undefined);
      pushCheck(
        checks,
        {
          label: 'Party Type (Account.Type)',
          salesforceField: 'Type',
          salesforceValue: sfValue,
          dynamicsField: 'accelins_partytype',
          expectedDynamicsValue: ptpCode
            ? `${normalizeSalesforceAccountType(sfValue)} (${ptpCode})`
            : normalizeSalesforceAccountType(sfValue),
          actualDynamicsValue: actual || '(empty)',
          passed,
        },
        mismatches,
        'critical'
      );
      continue;
    }

    if (fieldNorm === 'data_source_written__c') {
      const mappings = findCmdtMappings(rows, fieldNorm, sfValue);
      const mapping = mappings[0];
      const sfClaims = readSalesforceField(account, 'data_source_claims__c');
      const writtenMatch = mapping
        ? dataSourceWrittenMatches(party, mapping.dataverseValue, sfValue, sfClaims)
        : { passed: false, actual: '', dynamicsField: 'accelins_datasource' };
      pushCheck(
        checks,
        {
          label: 'Data Source',
          salesforceField: 'Data_Source_Written__c',
          salesforceValue: sfValue,
          dynamicsField: writtenMatch.dynamicsField,
          expectedDynamicsValue: mapping ? `${sfValue} (${mapping.dataverseValue})` : '(no CMDT mapping)',
          actualDynamicsValue: writtenMatch.actual || '(empty)',
          passed: writtenMatch.passed,
        },
        mismatches,
        'critical'
      );
      continue;
    }

    const mappings = findCmdtMappings(rows, fieldNorm, sfValue);
    if (mappings.length === 0) {
      pushCheck(
        checks,
        {
          label: sfField,
          salesforceField: sfField,
          salesforceValue: sfValue,
          dynamicsField: '(unknown)',
          expectedDynamicsValue: '(no CMDT mapping)',
          actualDynamicsValue: '',
          passed: false,
        },
        mismatches,
        critical ? 'critical' : 'warning'
      );
      continue;
    }

    const mapping = mappings[0];
    const partyAttribute = partyAttributeFromCmdt(mapping.dataverseField);
    const expected = mapping.dataverseValue.trim();
    const actual = await readActualPartyValue(party, partyAttribute, options.dynamicsClient);
    const passed = valuesMatch(expected, actual, sfValue);
    pushCheck(
      checks,
      {
        label: sfField.replace(/__c$/, '').replace(/_/g, ' '),
        salesforceField: sfField,
        salesforceValue: sfValue,
        dynamicsField: partyAttribute,
        expectedDynamicsValue:
          partyAttribute.includes('datasource') || partyAttribute.includes('affiliate')
            ? `${sfValue} (${expected})`
            : expected,
        actualDynamicsValue: actual || '(empty)',
        passed,
      },
      mismatches,
      critical ? 'critical' : 'warning'
    );
  }

  for (const direct of DIRECT_FIELD_CHECKS) {
    const sfValue = String(account[direct.salesforceField] ?? '').trim();
    if (!sfValue) {
      continue;
    }
    let matched = false;
    let actual = '';
    for (const dynField of direct.dynamicsFields) {
      actual = await readActualPartyValue(party, dynField, options.dynamicsClient);
      if (valuesMatch(sfValue, actual)) {
        matched = true;
        break;
      }
    }
    if (!matched && !actual) {
      actual = await readActualPartyValue(party, direct.dynamicsFields[0], options.dynamicsClient);
    }
    pushCheck(
      checks,
      {
        label: direct.label,
        salesforceField: direct.salesforceField,
        salesforceValue: sfValue,
        dynamicsField: direct.dynamicsFields.join('|'),
        expectedDynamicsValue: sfValue,
        actualDynamicsValue: actual || '(empty)',
        passed: matched,
      },
      mismatches,
      direct.critical ? 'critical' : 'warning'
    );
  }

  const failed = checks.filter((c) => !c.passed);
  if (failed.length) {
    logger.warn(
      `Integration field validation failures:\n${failed
        .map(
          (c) =>
            `  • ${c.label}: SF ${c.salesforceField}="${c.salesforceValue}" → ` +
            `D365 ${c.dynamicsField} expected "${c.expectedDynamicsValue}" got "${c.actualDynamicsValue}"`
        )
        .join('\n')}`
    );
  }

  return { checks };
}

export function formatIntegrationValidationReport(result: IntegrationValidationResult): string {
  if (result.mismatches.length === 0) {
    return `All ${result.fieldsPassed}/${result.fieldsChecked} integration fields matched.`;
  }
  const lines = result.mismatches.map(
    (m) =>
      `[${m.severity.toUpperCase()}] SF ${m.salesforceField}="${m.salesforceValue}" → ` +
      `D365 ${m.dynamicsField}: expected "${m.expectedDynamicsValue}", actual "${m.actualDynamicsValue}"`
  );
  return lines.join('\n');
}
