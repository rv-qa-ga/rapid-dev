import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { logger } from './logger';

/** All 17 Salesforce Account Type picklist values (SF-467 / picklist-values.json). */
export const SF736_ACCOUNT_TYPES = [
  'Acquisition Company',
  'Agency',
  'Agency Branch',
  'Distribution Partner',
  'Group',
  'Insurer',
  'Insurer Branch',
  'Legal Entity',
  'Member',
  'Non - Member MGA',
  'Placing Broker',
  'Reinsurance Broker',
  'Reinsurer',
  'Reinsurer Branch',
  'Service Company',
  'Third Party Administrator',
  'TPA Group',
] as const;

export type Sf736AccountType = (typeof SF736_ACCOUNT_TYPES)[number];

/** qamerge Dataverse_Mapping__mdt: account.type → accelins_party.accelins_partytype (PTP-*). */
const ACCOUNT_TYPE_TO_PARTY_TYPE_CODE: Record<string, string> = {
  'Acquisition Company': 'PTP-000014',
  Agency: 'PTP-000004',
  'Agency Branch': 'PTP-000016',
  'Distribution Partner': 'PTP-000018',
  Group: 'PTP-000008',
  Insurer: 'PTP-000002',
  'Insurer Branch': 'PTP-000017',
  'Legal Entity': 'PTP-000009',
  Member: 'PTP-000001',
  'Non - Member MGA': 'PTP-000019',
  'Non-Member MGA': 'PTP-000019',
  'Placing Broker': 'PTP-000007',
  'Reinsurance Broker': 'PTP-000006',
  Reinsurer: 'PTP-000005',
  'Reinsurer Branch': 'PTP-000015',
  'Service Company': 'PTP-000013',
  'Third Party Administrator': 'PTP-000003',
  'Third Party Administartor': 'PTP-000003',
};

const ACCOUNT_TYPE_ALIASES: Record<string, string> = {
  'Non-Member MGA': 'Non - Member MGA',
  'Third Party Administrator (TPA)': 'Third Party Administrator',
  TPA: 'Third Party Administrator',
};

/** Status that triggers SF→D365 integration for each Account Type in SF-736 party-type coverage. */
export function integrationTriggerStatusForAccountType(_accountType: string): string {
  // Onboarding triggers MuleSoft sync with fewer Active-only validation rules (contract, admission).
  return 'Onboarding';
}

export function normalizeSalesforceAccountType(accountType: string): string {
  const trimmed = String(accountType ?? '').trim();
  return ACCOUNT_TYPE_ALIASES[trimmed] ?? trimmed;
}

export function getStaticPartyTypeCodeForAccountType(accountType: string): string | undefined {
  const normalized = normalizeSalesforceAccountType(accountType);
  return ACCOUNT_TYPE_TO_PARTY_TYPE_CODE[normalized];
}

async function queryCmdtPartyTypeCode(
  salesforceClient: SalesforceAPIClient,
  accountType: string
): Promise<string | undefined> {
  const candidates = [accountType, normalizeSalesforceAccountType(accountType)];
  const unique = [...new Set(candidates.filter(Boolean))];
  for (const value of unique) {
    const escaped = value.replace(/'/g, "\\'");
    const soql =
      `SELECT Dataverse_Value__c FROM Dataverse_Mapping__mdt ` +
      `WHERE Object__c = 'account' AND Field__c = 'type' AND Value__c = '${escaped}' LIMIT 1`;
    try {
      const result = await salesforceClient.query(soql);
      const code = String(result.records?.[0]?.Dataverse_Value__c ?? '').trim();
      if (code) {
        logger.info(`✅ Resolved party type code ${code} from CMDT for Account Type "${value}"`);
        return code;
      }
    } catch (error: unknown) {
      logger.warn(`CMDT lookup failed for Account Type "${value}": ${String((error as Error)?.message ?? error)}`);
    }
  }
  return undefined;
}

async function queryDynamicsPartyTypeCodeByName(
  dynamicsClient: DynamicsAPIClient,
  partyTypeName: string
): Promise<string | undefined> {
  const escaped = partyTypeName.replace(/'/g, "''");
  try {
    const result = await dynamicsClient.query('accelins_partytypes', {
      $filter: `accelins_name eq '${escaped}'`,
      $select: 'accelins_name',
      $top: '1',
    });
    const row = result.value?.[0] as Record<string, unknown> | undefined;
    const name = String(row?.accelins_name ?? '').trim();
    if (name) {
      logger.info(`✅ Resolved party type "${name}" from Dynamics partytypes for "${partyTypeName}"`);
      return name;
    }
  } catch (error: unknown) {
    logger.warn(
      `Dynamics partytypes lookup failed for "${partyTypeName}": ${String((error as Error)?.message ?? error)}`
    );
  }
  return undefined;
}

/** Normalize party type labels for comparison (handles "Non - Member MGA" vs "Non-Member MGA"). */
export function normalizePartyTypeLabel(value: string): string {
  return String(value ?? '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** True when D365 party type label or PTP code matches SF Account.Type. */
export function partyTypeMatchesAccountType(
  actual: string,
  accountType: string,
  ptpCode?: string
): boolean {
  const a = actual.trim();
  if (!a) {
    return false;
  }
  const normalized = normalizeSalesforceAccountType(accountType);
  if (a.toLowerCase() === normalized.toLowerCase()) {
    return true;
  }
  if (normalizePartyTypeLabel(a) === normalizePartyTypeLabel(normalized)) {
    return true;
  }
  if (ptpCode && a.toUpperCase() === ptpCode.toUpperCase()) {
    return true;
  }
  return false;
}

/** Resolve expected PTP-* code for Account.Type (static map, then CMDT, then Dynamics partytypes). */
export async function resolveExpectedPartyTypeCode(
  accountType: string,
  options?: {
    salesforceClient?: SalesforceAPIClient;
    dynamicsClient?: DynamicsAPIClient;
  }
): Promise<string> {
  const normalized = normalizeSalesforceAccountType(accountType);
  const staticCode = getStaticPartyTypeCodeForAccountType(normalized);
  if (staticCode) {
    return staticCode;
  }

  if (options?.salesforceClient) {
    const fromCmdt = await queryCmdtPartyTypeCode(options.salesforceClient, normalized);
    if (fromCmdt) {
      return fromCmdt;
    }
  }

  if (options?.dynamicsClient) {
    const fromDynamics = await queryDynamicsPartyTypeCodeByName(options.dynamicsClient, normalized);
    if (fromDynamics) {
      return fromDynamics;
    }
  }

  throw new Error(
    `No party type (PTP) mapping found for Account Type "${accountType}". ` +
      `Add CMDT row account.type → accelins_party.accelins_partytype or update sf-account-party-type-mapping.ts.`
  );
}

/** Read D365 Party Type as UI label (e.g. "Member") or PTP code when present. */
export async function readPartyTypeFromDynamicsRow(
  row: Record<string, unknown>,
  dynamicsClient?: DynamicsAPIClient
): Promise<string> {
  const typeName = String(row.accelins_party_type_name ?? '').trim();
  if (typeName) {
    return typeName;
  }

  const expanded = row.accelins_PartyType ?? row.accelins_partytype;
  if (expanded && typeof expanded === 'object' && !Array.isArray(expanded)) {
    const name = String((expanded as Record<string, unknown>).accelins_name ?? '').trim();
    if (name) {
      return name;
    }
  }

  const formatted = String(
    row['accelins_partytype@OData.Community.Display.V1.FormattedValue'] ??
      row['accelins_PartyType@OData.Community.Display.V1.FormattedValue'] ??
      ''
  ).trim();
  if (formatted) {
    return formatted;
  }

  const direct = String(row.accelins_partytype ?? row.accelins_PartyType ?? '').trim();
  if (direct && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(direct)) {
    return direct;
  }

  const lookupId = String(row._accelins_partytype_value ?? row._accelins_partytypeid_value ?? '').trim();
  if (lookupId && dynamicsClient) {
    try {
      const result = (await dynamicsClient.getRecord('accelins_partytypes', lookupId, [
        'accelins_name',
      ])) as Record<string, unknown>;
      const name = String(result?.accelins_name ?? '').trim();
      if (name) {
        return name;
      }
    } catch (error: unknown) {
      logger.warn(`Could not expand party type lookup ${lookupId}: ${String((error as Error)?.message ?? error)}`);
    }
  }

  return formatted || direct;
}

/** Fetch Party row with party-type lookup expanded (matches D365 UI / OData schema). */
export async function fetchPartyWithExpandedType(
  dynamicsClient: DynamicsAPIClient,
  partyId: string
): Promise<Record<string, unknown>> {
  const escaped = partyId.replace(/'/g, "''");
  const prefer =
    'odata.include-annotations="OData.Community.Display.V1.FormattedValue"';
  const result = await dynamicsClient.query(
    'accelins_parties',
    {
      $filter: `accelins_partyid eq '${escaped}'`,
      $select:
        'accelins_partyid,accelins_name,accelins_partymasterid,accelins_datasource,accelins_datasourceclaims,accelins_affiliate_nonaffiliate,accelins_admittednonadmitted,statuscode,statecode,_accelins_partytype_value,accelins_party_type_name,_accelins_functional_currency_value,_accelins_country_value',
      $expand: 'accelins_PartyType($select=accelins_name)',
    },
    { headers: { Prefer: prefer } }
  );
  return (result.value?.[0] ?? {}) as Record<string, unknown>;
}

/** @deprecated Prefer readPartyTypeFromDynamicsRow */
export async function readPartyTypeCodeFromDynamicsRow(
  row: Record<string, unknown>,
  dynamicsClient?: DynamicsAPIClient
): Promise<string> {
  return readPartyTypeFromDynamicsRow(row, dynamicsClient);
}
