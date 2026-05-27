import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { normalizeSalesforceAccountType } from './sf-account-party-type-mapping';
import {
  validateAccountPartyIntegrationFieldsDetailed,
  type IntegrationFieldCheck,
  readPartyOptionSetValue,
} from './account-party-integration-field-validator';

export type { IntegrationFieldCheck };
export { readPartyOptionSetValue };

export interface CmdtMappingRow {
  dataverseField: string;
  dataverseValue: string;
}

/** qamerge CMDT fallbacks when SOQL is unavailable (from qamerge-dataversemapping-metadata.csv). */
const STATIC_CMDT: Record<string, CmdtMappingRow> = {
  'account|type|Member': {
    dataverseField: 'accelins_party.accelins_partytype',
    dataverseValue: 'PTP-000001',
  },
  'account|type|Agency': {
    dataverseField: 'accelins_party.accelins_partytype',
    dataverseValue: 'PTP-000004',
  },
  'account|data_source_written__c|Platform': {
    dataverseField: 'accelins_party.accelins_datasource',
    dataverseValue: '376140000',
  },
  'account|data_source_written__c|VIPR': {
    dataverseField: 'accelins_party.accelins_datasource',
    dataverseValue: '376140001',
  },
  'account|data_source_claims__c|Platform': {
    dataverseField: 'accelins_party.accelins_datasourceclaims',
    dataverseValue: '376140001',
  },
  'account|data_source_claims__c|VIPR': {
    dataverseField: 'accelins_party.accelins_datasourceclaims',
    dataverseValue: '376140000',
  },
  'account|affiliate_non_affiliate__c|AFL': {
    dataverseField: 'accelins_party.accelins_affiliate_nonaffiliate',
    dataverseValue: '376140000',
  },
  'account|affiliate_non_affiliate__c|NAF': {
    dataverseField: 'accelins_party.accelins_affiliate_nonaffiliate',
    dataverseValue: '376140001',
  },
};

function cmdtKey(object: string, field: string, value: string): string {
  return `${object.toLowerCase()}|${field.toLowerCase()}|${value}`;
}

export async function resolveCmdtMapping(
  salesforceClient: SalesforceAPIClient | undefined,
  object: string,
  field: string,
  value: string
): Promise<CmdtMappingRow | undefined> {
  const staticHit = STATIC_CMDT[cmdtKey(object, field, value)];
  if (staticHit) {
    return staticHit;
  }

  if (!salesforceClient || !value) {
    return undefined;
  }

  const objectCandidates = [object, object.toLowerCase()];
  const fieldCandidates = [field, field.toLowerCase()];
  const valueCandidates = [
    value,
    normalizeSalesforceAccountType(value),
    ...(value === 'Non - Member MGA' ? ['Non-Member MGA'] : []),
    ...(value === 'Third Party Administrator' ? ['Third Party Administartor'] : []),
  ];

  for (const obj of [...new Set(objectCandidates)]) {
    for (const fld of [...new Set(fieldCandidates)]) {
      for (const val of [...new Set(valueCandidates.filter(Boolean))]) {
        const escapedObj = obj.replace(/'/g, "\\'");
        const escapedFld = fld.replace(/'/g, "\\'");
        const escapedVal = val.replace(/'/g, "\\'");
        const soql =
          `SELECT Dataverse_Field__c, Dataverse_Value__c FROM Dataverse_Mapping__mdt ` +
          `WHERE Object__c = '${escapedObj}' AND Field__c = '${escapedFld}' AND Value__c = '${escapedVal}' LIMIT 1`;
        try {
          const result = await salesforceClient.query(soql);
          const row = result.records?.[0] as Record<string, unknown> | undefined;
          const dataverseField = String(row?.Dataverse_Field__c ?? '').trim();
          const dataverseValue = String(row?.Dataverse_Value__c ?? '').trim();
          if (dataverseField && dataverseValue) {
            return { dataverseField, dataverseValue };
          }
        } catch {
          // try next candidate
        }
      }
    }
  }

  return undefined;
}

/** Extra Account fields to set on create so Type + Data Source sync can be validated on qamerge. */
export function integrationCreateFieldsForAccountType(accountType: string): Record<string, string> {
  const normalized = normalizeSalesforceAccountType(accountType);
  const fields: Record<string, string> = {
    Data_Source_Written__c: 'Platform',
    Data_Source_Claims__c: 'Platform',
    Written_Accounting_Period_Effective_From__c: '2026-01-01',
    Claims_Production_Period_Effective_From__c: '2026-01-01',
  };
  if (['Insurer', 'Insurer Branch', 'Reinsurer', 'Reinsurer Branch'].includes(normalized)) {
    fields.Admission_Status__c = 'Admitted';
  }
  if (['Member', 'Insurer', 'Insurer Branch', 'Group', 'Reinsurer'].includes(normalized)) {
    fields.Affiliate_Non_Affiliate__c = 'AFL';
  }
  return fields;
}

export async function validateAccountPartyIntegrationFields(
  account: Record<string, unknown>,
  party: Record<string, unknown>,
  options: {
    salesforceClient?: SalesforceAPIClient;
    dynamicsClient?: DynamicsAPIClient;
  }
): Promise<IntegrationFieldCheck[]> {
  const { checks } = await validateAccountPartyIntegrationFieldsDetailed(account, party, options);
  return checks;
}

export function formatIntegrationFieldFailures(checks: IntegrationFieldCheck[]): string {
  return checks
    .filter((c) => !c.passed)
    .map(
      (c) =>
        `${c.label}: SF ${c.salesforceField}="${c.salesforceValue}" → ` +
        `D365 ${c.dynamicsField} expected "${c.expectedDynamicsValue}", actual "${c.actualDynamicsValue}"`
    )
    .join('\n');
}
