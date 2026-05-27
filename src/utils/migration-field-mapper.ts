/**
 * Migration Field Mapper
 * Maps fields between Dynamics CRM Party entity and Salesforce Account entity
 * 
 * Field mappings: Mapping and Governance of Data Attributes for CLM Design.xlsx
 * See: "M party -> accounts" (Include in Migration = Y)
 */

import {
  expectedSalesforcePicklistValue,
  PicklistValueMap,
} from './clm-picklist-migration-loader';
import {
  DYNAMICS_AUDIT_COMPARE_SKIP,
  DYNAMICS_LOOKUP_COMPARE_SKIP_IF_EMPTY,
  loadMappingsFromExcel,
} from './migration-mapping-loader';
import {
  ClmMigrationLookupResolver,
  isClmResolvableLookupMapping,
  readDynamicsLookupGuid,
} from './clm-migration-lookup-resolver';
import { logger } from './logger';

/** Compare dates by calendar day (UTC), ignoring time and offset formatting. */
function normalizeDateForCompare(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    return String(value).trim();
  }
  return d.toISOString().slice(0, 10);
}

function normalizeGuidForCompare(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

export interface FieldMapping {
  dynamicsField: string;
  salesforceField: string;
  fieldType: 'text' | 'number' | 'date' | 'boolean' | 'picklist' | 'lookup' | 'external-id';
  isCritical: boolean;
  transformation?: (value: any) => any;
  tolerance?: 'exact' | 'case-insensitive' | 'trimmed' | 'normalized';
}

export interface FieldComparison {
  /** Dynamics source field API name */
  field: string;
  salesforceField: string;
  dynamicsValue: any;
  salesforceValue: any;
  match: boolean;
  difference?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  masterId: string;
  partyExists: boolean;
  accountExists: boolean;
  fieldsCompared: number;
  fieldsMatched: number;
  fieldsDifferent: number;
  criticalFieldsMatched: boolean;
  comparisons: FieldComparison[];
  missingInSalesforce: string[];
  missingInDynamics: string[];
  recommendations: string[];
}

/**
 * Field mappings between Dynamics Party and Salesforce Account
 * 
 * Mappings are loaded from Excel file: AccountMigrationMappingDocument.xlsx
 * If Excel file is not found, falls back to default mappings below.
 * 
 * To update mappings, edit the Excel file in the project root.
 */
let cachedMappings: FieldMapping[] | null = null;

/**
 * Get field mappings - loads from Excel if available, otherwise uses defaults
 */
export async function getFieldMappings(): Promise<FieldMapping[]> {
  if (cachedMappings) {
    return cachedMappings;
  }

  try {
    cachedMappings = await loadMappingsFromExcel();
    logger.info(`✅ Loaded ${cachedMappings.length} field mappings from Excel`);
    return cachedMappings;
  } catch (error: any) {
    logger.warn(`⚠️  Could not load mappings from Excel: ${error.message}`);
    logger.info('📋 Using default field mappings');
    cachedMappings = DEFAULT_PARTY_TO_ACCOUNT_MAPPINGS;
    return cachedMappings;
  }
}

/**
 * Clear cached mappings (useful for testing or when Excel file is updated)
 */
export function clearFieldMappingsCache(): void {
  cachedMappings = null;
}

/** Inject mappings for CLM entity-specific validation (clears default cache). */
export function setFieldMappingsCache(mappings: FieldMapping[]): void {
  cachedMappings = mappings;
}

/**
 * Default field mappings (fallback when Excel file is not available)
 * Add/modify mappings based on your actual field structure
 */
export const DEFAULT_PARTY_TO_ACCOUNT_MAPPINGS: FieldMapping[] = [
  // Critical Fields
  {
    dynamicsField: 'accelins_partyid',
    salesforceField: 'Dataverse_ID__c',
    fieldType: 'external-id',
    isCritical: true,
    tolerance: 'exact'
  },
  {
    dynamicsField: 'accelins_partymasterid',
    salesforceField: 'PTY_Code__c',
    fieldType: 'external-id',
    isCritical: true,
    tolerance: 'exact'
  },
  {
    dynamicsField: 'accelins_name',
    salesforceField: 'Name',
    fieldType: 'text',
    isCritical: true,
    tolerance: 'trimmed'
  },
  
  // Standard Fields
  {
    dynamicsField: 'accelins_accountnumber',
    salesforceField: 'AccountNumber',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'exact'
  },
  {
    dynamicsField: 'accelins_email',
    salesforceField: 'Email__c',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'case-insensitive'
  },
  {
    dynamicsField: 'accelins_phone',
    salesforceField: 'Phone',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'normalized'
  },
  {
    dynamicsField: 'accelins_website',
    salesforceField: 'Website',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'exact'
  },
  
  // Address Fields
  {
    dynamicsField: 'accelins_address1_line1',
    salesforceField: 'BillingStreet',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'trimmed'
  },
  {
    dynamicsField: 'accelins_address1_city',
    salesforceField: 'BillingCity',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'trimmed'
  },
  {
    dynamicsField: 'accelins_address1_stateorprovince',
    salesforceField: 'BillingState',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'trimmed'
  },
  {
    dynamicsField: 'accelins_address1_postalcode',
    salesforceField: 'BillingPostalCode',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'exact'
  },
  {
    dynamicsField: 'accelins_address1_country',
    salesforceField: 'BillingCountry',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'trimmed'
  },
  
  // Status/Type Fields
  {
    dynamicsField: 'accelins_status',
    salesforceField: 'Account_Status__c',
    fieldType: 'picklist',
    isCritical: false,
    tolerance: 'exact'
  },
  {
    dynamicsField: 'accelins_type',
    salesforceField: 'Type',
    fieldType: 'picklist',
    isCritical: false,
    tolerance: 'exact'
  },
  
  // Date Fields
  {
    dynamicsField: 'accelins_createdon',
    salesforceField: 'CreatedDate',
    fieldType: 'date',
    isCritical: false,
    transformation: (value: string) => {
      // Convert Dynamics date format to Salesforce format if needed
      if (value) {
        return new Date(value).toISOString();
      }
      return value;
    }
  },
  
  // Custom Fields - Add more as needed
  {
    dynamicsField: 'accelins_description',
    salesforceField: 'Description',
    fieldType: 'text',
    isCritical: false,
    tolerance: 'trimmed'
  }
];

/**
 * Compare two field values based on mapping configuration
 */
export function compareFieldValues(
  dynamicsValue: any,
  salesforceValue: any,
  mapping: FieldMapping
): FieldComparison {
  const field = mapping.dynamicsField;
  let match = false;
  let difference: string | undefined;
  let severity: 'error' | 'warning' | 'info' = 'info';

  // Handle null/undefined values
  const dynVal = dynamicsValue === null || dynamicsValue === undefined ? '' : String(dynamicsValue);
  const sfVal = salesforceValue === null || salesforceValue === undefined ? '' : String(salesforceValue);

  // Apply transformations if needed
  let processedDynVal = dynVal;
  let processedSfVal = sfVal;

  if (mapping.transformation && mapping.fieldType !== 'date') {
    processedDynVal = mapping.transformation(dynamicsValue);
    processedSfVal = mapping.transformation(salesforceValue);
  }

  if (mapping.fieldType === 'date') {
    processedDynVal = normalizeDateForCompare(dynamicsValue);
    processedSfVal = normalizeDateForCompare(salesforceValue);
    match = processedDynVal === processedSfVal;
  } else if (mapping.fieldType === 'external-id') {
    match =
      normalizeGuidForCompare(processedDynVal) === normalizeGuidForCompare(processedSfVal);
  } else if (processedDynVal.trim() === '' && processedSfVal.trim() === '') {
    match = true;
  } else {
  // Apply tolerance based comparison
  switch (mapping.tolerance) {
    case 'exact':
      match = processedDynVal === processedSfVal;
      break;
    case 'case-insensitive':
      match = processedDynVal.toLowerCase() === processedSfVal.toLowerCase();
      break;
    case 'trimmed':
      match = processedDynVal.trim() === processedSfVal.trim();
      break;
    case 'normalized': {
      // Normalize phone numbers, emails, etc.
      const normalize = (val: string) => val.replace(/\s+/g, '').replace(/[()-]/g, '');
      match = normalize(processedDynVal) === normalize(processedSfVal);
      break;
    }
    default:
      match = processedDynVal === processedSfVal;
  }
  }

  if (!match) {
    difference = `Dynamics: "${processedDynVal}" vs Salesforce: "${processedSfVal}"`;
    severity = mapping.isCritical ? 'error' : 'warning';
  }

  return {
    field,
    salesforceField: mapping.salesforceField,
    dynamicsValue: processedDynVal,
    salesforceValue: processedSfVal,
    match,
    difference,
    severity
  };
}

function shouldResolveLookup(mapping: FieldMapping): boolean {
  const f = mapping.dynamicsField.toLowerCase();
  if (DYNAMICS_AUDIT_COMPARE_SKIP.has(f)) {
    return false;
  }
  return isClmResolvableLookupMapping(mapping);
}

function isEmailMapping(mapping: FieldMapping): boolean {
  const f = mapping.dynamicsField.toLowerCase();
  const sf = mapping.salesforceField.toLowerCase();
  return f.includes('email') || sf.includes('email');
}

export interface CompareAllFieldsOptions {
  dynamicsIdField?: string;
  salesforceCorrelationField?: string;
  /** When set, picklist fields compare SF actual vs expected value from migration tab */
  picklistValueMap?: PicklistValueMap;
  /** Skip master-id / name match-key fields — compared via row correlation only. */
  dynamicsMatchField?: string;
  salesforceMatchField?: string;
  lookupResolver?: ClmMigrationLookupResolver;
}

/**
 * Compare all mapped fields (explicit mappings — used by CLM bulk migration validation).
 */
export async function compareAllFieldsWithMappings(
  dynamicsRecord: Record<string, any>,
  salesforceRecord: Record<string, any> | null,
  mappings: FieldMapping[],
  options: CompareAllFieldsOptions = {}
): Promise<ValidationResult> {
  const dynamicsIdField = options.dynamicsIdField || 'accelins_partyid';
  const salesforceCorrelationField =
    options.salesforceCorrelationField || 'Party_MasterId__c';

  const comparisons: FieldComparison[] = [];
  const missingInSalesforce: string[] = [];
  const missingInDynamics: string[] = [];
  let fieldsMatched = 0;
  let fieldsDifferent = 0;
  let criticalFieldsMatched = true;

  const sfRecord = salesforceRecord || {};

  const picklistMap = options.picklistValueMap;

  for (const mapping of mappings) {
    if (DYNAMICS_AUDIT_COMPARE_SKIP.has(mapping.dynamicsField.toLowerCase())) {
      continue;
    }

    const dynValueRaw = dynamicsRecord[mapping.dynamicsField];
    let dynValue = dynValueRaw;
    const sfValue = sfRecord[mapping.salesforceField];

    if (options.lookupResolver && shouldResolveLookup(mapping)) {
      const guid = readDynamicsLookupGuid(dynamicsRecord, mapping.dynamicsField);
      if (guid) {
        dynValue = options.lookupResolver.resolveDynamicsLookupValue(
          mapping.dynamicsField,
          dynamicsRecord,
          mapping.salesforceField
        );
      }
    }

    const dynEmpty =
      dynValue === undefined || dynValue === null || String(dynValue).trim() === '';
    if (
      dynEmpty &&
      DYNAMICS_LOOKUP_COMPARE_SKIP_IF_EMPTY.has(mapping.dynamicsField.toLowerCase())
    ) {
      continue;
    }

    // Correlation id is compared via record match, not as a business attribute.
    if (
      mapping.dynamicsField.toLowerCase() === dynamicsIdField.toLowerCase() &&
      mapping.salesforceField.toLowerCase() === salesforceCorrelationField.toLowerCase()
    ) {
      continue;
    }

    if (options.dynamicsMatchField && options.salesforceMatchField) {
      if (
        mapping.dynamicsField.toLowerCase() === options.dynamicsMatchField.toLowerCase() &&
        mapping.salesforceField.toLowerCase() === options.salesforceMatchField.toLowerCase()
      ) {
        continue;
      }
    }

    if (dynValue === undefined || dynValue === null) {
      missingInDynamics.push(mapping.dynamicsField);
    }
    if (sfValue === undefined || sfValue === null) {
      missingInSalesforce.push(mapping.salesforceField);
    }

    let comparison: FieldComparison;
    const usePicklist =
      picklistMap &&
      (mapping.fieldType === 'picklist' ||
        picklistMap.byField.has(mapping.dynamicsField.toLowerCase()));
    if (usePicklist && picklistMap) {
      const expectedSf = expectedSalesforcePicklistValue(
        mapping.dynamicsField,
        dynValue,
        picklistMap
      );
      if (expectedSf !== undefined) {
        comparison = compareFieldValues(expectedSf, sfValue, {
          ...mapping,
          dynamicsField: mapping.dynamicsField,
          tolerance: mapping.tolerance || 'trimmed',
        });
        if (!comparison.match && comparison.difference) {
          comparison.difference =
            `Picklist map (${mapping.dynamicsField}): expected SF "${expectedSf}" from Dynamics "${dynValue}"; ` +
            comparison.difference;
        }
      } else {
        comparison = compareFieldValues(dynValue, sfValue, mapping);
      }
    } else {
      const effectiveMapping = isEmailMapping(mapping)
        ? { ...mapping, tolerance: 'case-insensitive' as const }
        : shouldResolveLookup(mapping)
          ? { ...mapping, fieldType: 'external-id' as const, tolerance: 'exact' as const }
          : mapping;
      comparison = compareFieldValues(dynValue, sfValue, effectiveMapping);
    }
    comparisons.push(comparison);

    if (comparison.match) {
      fieldsMatched++;
    } else {
      fieldsDifferent++;
      if (mapping.isCritical) {
        criticalFieldsMatched = false;
      }
    }
  }

  const masterId =
    dynamicsRecord[dynamicsIdField] ||
    sfRecord[salesforceCorrelationField] ||
    'UNKNOWN';

  const recommendations: string[] = [];
  if (!salesforceRecord) {
    recommendations.push('Record not found in Salesforce (TARGET).');
  }
  if (!criticalFieldsMatched) {
    recommendations.push('Critical field mismatches detected.');
  }
  if (missingInSalesforce.length > 0) {
    recommendations.push(`Missing/null in Salesforce: ${missingInSalesforce.join(', ')}`);
  }
  if (fieldsDifferent > 0) {
    recommendations.push(`${fieldsDifferent} mapped field(s) differ between SOURCE and TARGET.`);
  }

  return {
    masterId: String(masterId),
    partyExists: !!dynamicsRecord,
    accountExists: !!salesforceRecord,
    fieldsCompared: comparisons.length,
    fieldsMatched,
    fieldsDifferent,
    criticalFieldsMatched,
    comparisons,
    missingInSalesforce,
    missingInDynamics,
    recommendations,
  };
}

/**
 * Compare all mapped fields between Dynamics Party and Salesforce Account
 */
export async function compareAllFields(
  dynamicsParty: Record<string, any>,
  salesforceAccount: Record<string, any>
): Promise<ValidationResult> {
  const mappings = await getFieldMappings();
  
  const comparisons: FieldComparison[] = [];
  const missingInSalesforce: string[] = [];
  const missingInDynamics: string[] = [];
  let fieldsMatched = 0;
  let fieldsDifferent = 0;
  let criticalFieldsMatched = true;

  for (const mapping of mappings) {
    const dynValue = dynamicsParty[mapping.dynamicsField];
    const sfValue = salesforceAccount[mapping.salesforceField];

    // Check if field exists in both systems
    if (dynValue === undefined || dynValue === null) {
      missingInDynamics.push(mapping.dynamicsField);
    }
    if (sfValue === undefined || sfValue === null) {
      missingInSalesforce.push(mapping.salesforceField);
    }

    // Compare values
    const comparison = compareFieldValues(dynValue, sfValue, mapping);
    comparisons.push(comparison);

    if (comparison.match) {
      fieldsMatched++;
    } else {
      fieldsDifferent++;
      if (mapping.isCritical) {
        criticalFieldsMatched = false;
      }
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (!criticalFieldsMatched) {
    recommendations.push('Critical field mismatches detected. Review and fix immediately.');
  }
  if (missingInSalesforce.length > 0) {
    recommendations.push(`Missing fields in Salesforce: ${missingInSalesforce.join(', ')}`);
  }
  if (missingInDynamics.length > 0) {
    recommendations.push(`Missing fields in Dynamics: ${missingInDynamics.join(', ')}`);
  }
  if (fieldsDifferent > 0) {
    recommendations.push(`${fieldsDifferent} field(s) have mismatched values. Review field comparisons.`);
  }

  return {
    masterId: dynamicsParty.accelins_partyid || salesforceAccount.Party_MasterId__c || 'UNKNOWN',
    partyExists: !!dynamicsParty,
    accountExists: !!salesforceAccount,
    fieldsCompared: comparisons.length,
    fieldsMatched,
    fieldsDifferent,
    criticalFieldsMatched,
    comparisons,
    missingInSalesforce,
    missingInDynamics,
    recommendations
  };
}

/**
 * Generate a formatted validation report
 */
export function generateValidationReport(result: ValidationResult): string {
  let report = `\n═══════════════════════════════════════════════════════════════════════════════\n`;
  report += `MIGRATION VALIDATION REPORT\n`;
  report += `═══════════════════════════════════════════════════════════════════════════════\n\n`;
  report += `Master ID: ${result.masterId}\n`;
  report += `Party Exists in Dynamics: ${result.partyExists ? '✅ Yes' : '❌ No'}\n`;
  report += `Account Exists in Salesforce: ${result.accountExists ? '✅ Yes' : '❌ No'}\n\n`;
  
  report += `SUMMARY:\n`;
  report += `  Fields Compared: ${result.fieldsCompared}\n`;
  report += `  Fields Matched: ${result.fieldsMatched} ✅\n`;
  report += `  Fields Different: ${result.fieldsDifferent} ${result.fieldsDifferent > 0 ? '⚠️' : ''}\n`;
  report += `  Critical Fields: ${result.criticalFieldsMatched ? '✅ All Match' : '❌ Mismatch Detected'}\n\n`;

  if (result.fieldsDifferent > 0) {
    report += `FIELD DIFFERENCES:\n`;
    report += `───────────────────────────────────────────────────────────────────────────────\n`;
    for (const comp of result.comparisons) {
      if (!comp.match) {
        const severityIcon = comp.severity === 'error' ? '❌' : '⚠️';
        report += `${severityIcon} ${comp.field}:\n`;
        report += `   Dynamics: ${comp.dynamicsValue || '(empty)'}\n`;
        report += `   Salesforce: ${comp.salesforceValue || '(empty)'}\n`;
        if (comp.difference) {
          report += `   ${comp.difference}\n`;
        }
        report += `\n`;
      }
    }
  }

  if (result.missingInSalesforce.length > 0) {
    report += `MISSING IN SALESFORCE:\n`;
    report += `  ${result.missingInSalesforce.join(', ')}\n\n`;
  }

  if (result.missingInDynamics.length > 0) {
    report += `MISSING IN DYNAMICS:\n`;
    report += `  ${result.missingInDynamics.join(', ')}\n\n`;
  }

  if (result.recommendations.length > 0) {
    report += `RECOMMENDATIONS:\n`;
    for (const rec of result.recommendations) {
      report += `  • ${rec}\n`;
    }
  }

  report += `\n═══════════════════════════════════════════════════════════════════════════════\n`;

  return report;
}

