/**
 * Custom Metadata Validator
 *
 * Validates Custom Metadata records, specifically Dataverse values in types like
 * `Dataverse_Mapping__mdt`. SOQL runs on a dedicated `SalesforceAPIClient` whose JWT
 * can differ from the world's default API client (see `authenticate()` — MuleSoft / SF_CMDT_QUERY_JWT_USERNAME).
 */

import { APIRequestContext } from '@playwright/test';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';

export interface CustomMetadataRecord {
  Id?: string;
  DeveloperName?: string;
  MasterLabel?: string;
  [fieldName: string]: any;
}

export interface CustomMetadataValidationResult {
  recordId: string;
  recordName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedFields: {
    fieldName: string;
    value: any;
    isValid: boolean;
    message?: string;
  }[];
}

export interface CustomMetadataValidationOptions {
  /** Custom Metadata Type API name (e.g., 'Dataverse_Mapping__mdt') */
  metadataType: string;
  /** Field name containing Dataverse value to validate (e.g., 'Dataverse_Value__c') */
  dataverseValueField: string;
  /** Optional: Field name for Salesforce value (e.g., 'Value__c') */
  salesforceValueField?: string;
  /** Optional: Field name for object name (e.g., 'Object__c') */
  objectField?: string;
  /** Optional: Field name for field name (e.g., 'Field__c') */
  fieldNameField?: string;
  /** Optional: Filter records by specific criteria */
  filters?: {
    objectName?: string;
    fieldName?: string;
    developerName?: string;
  };
  /** Validation rules */
  validationRules?: {
    /** Require Dataverse value to be non-empty */
    requireNonEmpty?: boolean;
    /** Validate format (regex pattern) */
    formatPattern?: RegExp;
    /** Validate against list of allowed values */
    allowedValues?: string[];
    /** Custom validation function */
    customValidator?: (value: any, record: CustomMetadataRecord) => { isValid: boolean; message?: string };
  };
}

export class CustomMetadataValidator {
  private apiClient: SalesforceAPIClient;

  /**
   * Explicit field lists for known "large" Custom Metadata Types.
   *
   * Salesforce returns a misleading `INVALID_TYPE` ("sObject type X is not supported")
   * when running `SELECT FIELDS(ALL) FROM <CMDT>` once the CMDT crosses an internal
   * record-volume threshold (observed on Dataverse_Mapping__mdt after country mappings
   * were loaded — ~150+ rows). The same SOQL with explicit fields works fine for the
   * same user (verified via REST Inspector). Mirrors the explicit-fields pattern in
   * src/step-definitions/api/salesforce/sf-789.steps.ts (DV_MAPPING_FIELDS).
   */
  private static readonly EXPLICIT_FIELD_LISTS: Record<string, string[]> = {
    Dataverse_Mapping__mdt: [
      'Id',
      'DeveloperName',
      'MasterLabel',
      'Object__c',
      'Field__c',
      'Value__c',
      'Dataverse_Field__c',
      'Dataverse_Value__c',
    ],
  };

  constructor(apiContext: APIRequestContext) {
    this.apiClient = new SalesforceAPIClient(apiContext);
  }

  /**
   * Authenticate the internal API client used for Custom Metadata SOQL.
   *
   * Order of precedence for JWT `sub`:
   * 1. `SF_CMDT_QUERY_JWT_USERNAME` — explicit user for CMDT SOQL only (optional).
   * 2. `SF_MULESOFT_INTEGRATION_JWT_USERNAME` — integration user (often has Dataverse_Mapping__mdt read on qamerge).
   * 3. Default `SalesforceAPIClient.authenticate()` chain (`SF_API_JWT_USERNAME`, `SF_USE_QA_MRD_FOR_API`, etc.).
   *
   * The scenario `apiClient` on the world object is unchanged; only this validator's client is affected.
   */
  async authenticate(): Promise<void> {
    logger.info('🔐 Authenticating with Salesforce for Custom Metadata validation...');
    const explicitCmdt =
      process.env.SF_CMDT_QUERY_JWT_USERNAME?.trim() || process.env.SF_MULESOFT_INTEGRATION_JWT_USERNAME?.trim();
    if (explicitCmdt) {
      await this.apiClient.authenticate(explicitCmdt);
      logger.info(`✅ Custom Metadata validator JWT: ${explicitCmdt}`);
    } else {
      await this.apiClient.authenticate();
    }
    logger.info('✅ Authenticated successfully');
  }

  /**
   * Query Custom Metadata records
   */
  async queryCustomMetadataRecords(
    metadataType: string,
    fields: string[] = ['FIELDS(ALL)'],
    filters?: { [key: string]: string }
  ): Promise<CustomMetadataRecord[]> {
    logger.info(`📖 Querying Custom Metadata: ${metadataType}`);

    try {
      // Build WHERE clause if filters provided
      let whereClause = '';
      if (filters && Object.keys(filters).length > 0) {
        const conditions = Object.entries(filters)
          .map(([key, value]) => `${key} = '${value.replace(/'/g, "\\'")}'`)
          .join(' AND ');
        whereClause = ` WHERE ${conditions}`;
      }

      const wantsFieldsAll = fields.includes('FIELDS(ALL)');
      const explicitOverride = CustomMetadataValidator.EXPLICIT_FIELD_LISTS[metadataType];
      let fieldsClause: string;
      let limit: number;
      if (wantsFieldsAll && explicitOverride) {
        fieldsClause = explicitOverride.join(', ');
        limit = 1000;
        logger.debug(
          `Substituting FIELDS(ALL) → explicit fields for "${metadataType}" (avoids INVALID_TYPE on large CMDTs).`
        );
      } else if (wantsFieldsAll) {
        fieldsClause = 'FIELDS(ALL)';
        // Salesforce requires LIMIT ≤ 200 when using FIELDS(ALL) on Custom Metadata (MALFORMED_QUERY otherwise).
        limit = 200;
      } else {
        fieldsClause = fields.join(', ');
        limit = 1000;
      }
      const soql = `SELECT ${fieldsClause} FROM ${metadataType}${whereClause} ORDER BY DeveloperName LIMIT ${limit}`;

      logger.debug(`SOQL: ${soql}`);

      const result = await this.apiClient.query(soql);

      if (!result.records || result.records.length === 0) {
        logger.warn(`⚠️  No records found for ${metadataType}`);
        return [];
      }

      logger.info(`✅ Found ${result.records.length} Custom Metadata records`);
      return result.records as CustomMetadataRecord[];
    } catch (error: any) {
      logger.error(`❌ Error querying Custom Metadata: ${error.message}`);
      throw new Error(`Failed to query Custom Metadata ${metadataType}: ${error.message}`);
    }
  }

  /**
   * Validate a single Custom Metadata record
   */
  validateRecord(
    record: CustomMetadataRecord,
    options: CustomMetadataValidationOptions
  ): CustomMetadataValidationResult {
    const recordId = record.Id || record.DeveloperName || 'Unknown';
    const recordName = record.DeveloperName || record.MasterLabel || recordId;
    
    const result: CustomMetadataValidationResult = {
      recordId,
      recordName,
      isValid: true,
      errors: [],
      warnings: [],
      validatedFields: []
    };

    // Get the Dataverse value field
    const dataverseValue = record[options.dataverseValueField];
    const fieldValidation = {
      fieldName: options.dataverseValueField,
      value: dataverseValue,
      isValid: true,
      message: undefined as string | undefined
    };

    // Apply validation rules
    if (options.validationRules) {
      const rules = options.validationRules;

      // Rule 1: Require non-empty
      if (rules.requireNonEmpty) {
        if (dataverseValue === null || dataverseValue === undefined || dataverseValue === '') {
          fieldValidation.isValid = false;
          fieldValidation.message = 'Dataverse value is required but is empty';
          result.errors.push(`Record ${recordName}: ${fieldValidation.message}`);
          result.isValid = false;
        }
      }

      // Rule 2: Format pattern validation
      if (rules.formatPattern && dataverseValue !== null && dataverseValue !== undefined && dataverseValue !== '') {
        const valueStr = String(dataverseValue);
        if (!rules.formatPattern.test(valueStr)) {
          fieldValidation.isValid = false;
          fieldValidation.message = `Dataverse value does not match required format: ${rules.formatPattern}`;
          result.errors.push(`Record ${recordName}: ${fieldValidation.message}`);
          result.isValid = false;
        }
      }

      // Rule 3: Allowed values validation
      if (rules.allowedValues && dataverseValue !== null && dataverseValue !== undefined && dataverseValue !== '') {
        const valueStr = String(dataverseValue).trim();
        if (!rules.allowedValues.includes(valueStr)) {
          fieldValidation.isValid = false;
          fieldValidation.message = `Dataverse value "${valueStr}" is not in allowed values: ${rules.allowedValues.join(', ')}`;
          result.warnings.push(`Record ${recordName}: ${fieldValidation.message}`);
          // Warnings don't fail validation, but we track them
        }
      }

      // Rule 4: Custom validator
      if (rules.customValidator) {
        try {
          const customResult = rules.customValidator(dataverseValue, record);
          if (!customResult.isValid) {
            fieldValidation.isValid = false;
            fieldValidation.message = customResult.message || 'Custom validation failed';
            result.errors.push(`Record ${recordName}: ${fieldValidation.message}`);
            result.isValid = false;
          }
        } catch (error: any) {
          fieldValidation.isValid = false;
          fieldValidation.message = `Custom validator error: ${error.message}`;
          result.errors.push(`Record ${recordName}: ${fieldValidation.message}`);
          result.isValid = false;
        }
      }
    }

    result.validatedFields.push(fieldValidation);

    return result;
  }

  /**
   * Validate all Custom Metadata records matching the criteria
   */
  async validateCustomMetadata(
    options: CustomMetadataValidationOptions
  ): Promise<{
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    results: CustomMetadataValidationResult[];
    summary: {
      totalErrors: number;
      totalWarnings: number;
    };
  }> {
    logger.info(`🔍 Validating Custom Metadata: ${options.metadataType}`);
    logger.info(`   Dataverse Value Field: ${options.dataverseValueField}`);

    // Build filters for query
    const queryFilters: { [key: string]: string } = {};
    if (options.filters?.objectName && options.objectField) {
      queryFilters[options.objectField] = options.filters.objectName;
    }
    if (options.filters?.fieldName && options.fieldNameField) {
      queryFilters[options.fieldNameField] = options.filters.fieldName;
    }
    if (options.filters?.developerName) {
      queryFilters['DeveloperName'] = options.filters.developerName;
    }

    // Query records
    const records = await this.queryCustomMetadataRecords(
      options.metadataType,
      ['FIELDS(ALL)'],
      Object.keys(queryFilters).length > 0 ? queryFilters : undefined
    );

    if (records.length === 0) {
      logger.warn(`⚠️  No records found to validate`);
      return {
        totalRecords: 0,
        validRecords: 0,
        invalidRecords: 0,
        results: [],
        summary: {
          totalErrors: 0,
          totalWarnings: 0
        }
      };
    }

    // Validate each record
    const results: CustomMetadataValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const record of records) {
      const validationResult = this.validateRecord(record, options);
      results.push(validationResult);

      if (validationResult.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      totalErrors += validationResult.errors.length;
      totalWarnings += validationResult.warnings.length;
    }

    logger.info(`📊 Validation Summary:`);
    logger.info(`   Total Records: ${records.length}`);
    logger.info(`   Valid: ${validCount}`);
    logger.info(`   Invalid: ${invalidCount}`);
    logger.info(`   Total Errors: ${totalErrors}`);
    logger.info(`   Total Warnings: ${totalWarnings}`);

    return {
      totalRecords: records.length,
      validRecords: validCount,
      invalidRecords: invalidCount,
      results,
      summary: {
        totalErrors,
        totalWarnings
      }
    };
  }

  /**
   * Get a specific Custom Metadata record by DeveloperName
   */
  async getCustomMetadataRecord(
    metadataType: string,
    developerName: string
  ): Promise<CustomMetadataRecord | null> {
    logger.info(`📖 Getting Custom Metadata record: ${metadataType}.${developerName}`);

    const records = await this.queryCustomMetadataRecords(
      metadataType,
      ['FIELDS(ALL)'],
      { DeveloperName: developerName }
    );

    if (records.length === 0) {
      logger.warn(`⚠️  Record not found: ${developerName}`);
      return null;
    }

    if (records.length > 1) {
      logger.warn(`⚠️  Multiple records found with DeveloperName: ${developerName}`);
    }

    return records[0];
  }
}
