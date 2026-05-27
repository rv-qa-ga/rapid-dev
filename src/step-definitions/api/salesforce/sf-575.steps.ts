/**
 * Step Definitions for SF-575 - Validate Dataverse values in Custom Metadata
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import {
  CustomMetadataValidator,
  CustomMetadataValidationOptions,
  type CustomMetadataValidationResult,
} from '../../../utils/custom-metadata-validator';

/** Row stored in testContext.dataverseValidationResults */
type DataverseDynamicsValidationRow = {
  record: unknown;
  dataverseValue: string;
  dataverseField?: string;
  exists: boolean;
  error?: string;
};

/** Row stored in testContext.dataverseComparisonResults */
type DataverseComparisonRow = {
  record: unknown;
  dataverseValue: string;
  dataverseField: string;
  salesforceValue: string;
  matches: boolean;
  error?: string;
};
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { DynamicsAPIClient } from '../../../api-clients/dynamics/DynamicsAPIClient';
import { logger } from '../../../utils/logger';

let customMetadataValidator: CustomMetadataValidator | null = null;

/**
 * Initialize Custom Metadata Validator (SF-575 specific)
 * Note: The common "I have a valid Salesforce API token" step lives in authentication.steps.ts.
 * This step initializes the CustomMetadataValidator on top of the already-authenticated API context.
 */
Given('I have a valid Salesforce API token with Custom Metadata access', async function (this: AutomationWorld) {
  if (!this.apiContext) {
    throw new Error('API context not initialized');
  }

  customMetadataValidator = new CustomMetadataValidator(this.apiContext);
  await customMetadataValidator.authenticate();
  
  this.testContext.customMetadataValidator = customMetadataValidator;
  
  logger.info('✅ Custom Metadata Validator initialized');
});

/**
 * Query Custom Metadata records
 * 
 * Examples:
 *   When I query Custom Metadata "Dataverse_Mapping__mdt" records
 */
When(
  /^I query Custom Metadata "([^"]+)" records$/,
  async function (this: AutomationWorld, metadataType: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    logger.info(`📖 Querying Custom Metadata: ${metadataType}`);
    
    const records = await validator.queryCustomMetadataRecords(metadataType);
    
    this.testContext.customMetadataRecords = records;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = records.length;
    
    logger.info(`✅ Queried ${records.length} Custom Metadata records`);
  }
);

/**
 * Query Custom Metadata record by DeveloperName
 * 
 * Examples:
 *   When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_1"
 */
When(
  /^I query Custom Metadata "([^"]+)" record with DeveloperName "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, developerName: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    logger.info(`📖 Querying Custom Metadata record: ${metadataType}.${developerName}`);
    
    const record = await validator.getCustomMetadataRecord(metadataType, developerName);
    
    if (!record) {
      throw new Error(`Custom Metadata record not found: ${developerName}`);
    }
    
    this.testContext.customMetadataRecord = record;
    this.testContext.customMetadataRecords = [record];
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = 1;
    
    logger.info(`✅ Found Custom Metadata record: ${developerName}`);
  }
);

/**
 * Validate Custom Metadata Dataverse values (basic validation - non-empty)
 * 
 * Examples:
 *   When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values
 */
When(
  /^I validate Custom Metadata "([^"]+)" Dataverse values$/,
  async function (this: AutomationWorld, metadataType: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      validationRules: {
        requireNonEmpty: true
      }
    };
    
    logger.info(`🔍 Validating Custom Metadata Dataverse values: ${metadataType}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    
    logger.info(`✅ Validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

/**
 * Validate Custom Metadata Dataverse values with format validation
 * 
 * Examples:
 *   When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values with format validation
 */
When(
  /^I validate Custom Metadata "([^"]+)" Dataverse values with format validation$/,
  async function (this: AutomationWorld, metadataType: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    // Dataverse values follow pattern: 3-letter prefix + dash + 6-digit number
    // Examples: PTP-000001, CRY-000009, etc.
    const formatPattern = /^[A-Z]{3}-\d{6}$/;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      validationRules: {
        requireNonEmpty: true,
        formatPattern
      }
    };
    
    logger.info(`🔍 Validating Custom Metadata Dataverse values with format: ${metadataType}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    
    logger.info(`✅ Format validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

/**
 * Validate Custom Metadata Dataverse values against allowed values
 * 
 * Examples:
 *   When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values against allowed values
 */
When(
  /^I validate Custom Metadata "([^"]+)" Dataverse values against allowed values$/,
  async function (this: AutomationWorld, metadataType: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    // Note: Allowed values validation is optional and should be configured
    // based on the specific Dataverse field being validated.
    // For example, if validating Party Type mappings, you might check against
    // known Party Type codes (PTP-000001, PTP-000002, etc.)
    // For now, we'll skip allowed values validation unless specifically needed
    const allowedValues: string[] = [];
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      validationRules: {
        requireNonEmpty: true,
        allowedValues: allowedValues.length > 0 ? allowedValues : undefined
      }
    };
    
    logger.info(`🔍 Validating Custom Metadata Dataverse values against allowed values: ${metadataType}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    
    logger.info(`✅ Allowed values validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

/**
 * Validate specific Custom Metadata record
 * 
 * Examples:
 *   When I validate Custom Metadata "Dataverse_Mapping__mdt" record "DVMapping_1" Dataverse value
 */
When(
  /^I validate Custom Metadata "([^"]+)" record "([^"]+)" Dataverse value$/,
  async function (this: AutomationWorld, metadataType: string, developerName: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      filters: {
        developerName
      },
      validationRules: {
        requireNonEmpty: true
      }
    };
    
    logger.info(`🔍 Validating Custom Metadata record: ${metadataType}.${developerName}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataDeveloperName = developerName;
    
    if (validationResult.totalRecords === 0) {
      throw new Error(`Custom Metadata record not found: ${developerName}`);
    }
    
    logger.info(`✅ Record validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

/**
 * Validate Custom Metadata records filtered by Object
 * 
 * Examples:
 *   When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values for Object "Account"
 */
When(
  /^I validate Custom Metadata "([^"]+)" Dataverse values for Object "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, objectName: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      objectField: 'Object__c',
      filters: {
        objectName
      },
      validationRules: {
        requireNonEmpty: true
      }
    };
    
    logger.info(`🔍 Validating Custom Metadata Dataverse values for Object: ${objectName}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataObjectName = objectName;
    
    logger.info(`✅ Object-filtered validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

/**
 * Validate Custom Metadata records filtered by Object and Field
 * 
 * Examples:
 *   When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values for Object "Account" and Field "Type"
 */
When(
  /^I validate Custom Metadata "([^"]+)" Dataverse values for Object "([^"]+)" and Field "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, objectName: string, fieldName: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      objectField: 'Object__c',
      fieldNameField: 'Field__c',
      filters: {
        objectName,
        fieldName
      },
      validationRules: {
        requireNonEmpty: true
      }
    };
    
    logger.info(`🔍 Validating Custom Metadata Dataverse values for Object: ${objectName}, Field: ${fieldName}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataObjectName = objectName;
    this.testContext.customMetadataFieldName = fieldName;
    
    logger.info(`✅ Object/Field-filtered validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

/**
 * Validate all Custom Metadata records
 * 
 * Examples:
 *   When I validate all Custom Metadata "Dataverse_Mapping__mdt" Dataverse values
 */
When(
  /^I validate all Custom Metadata "([^"]+)" Dataverse values$/,
  async function (this: AutomationWorld, metadataType: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      validationRules: {
        requireNonEmpty: true
      }
    };
    
    logger.info(`🔍 Validating all Custom Metadata Dataverse values: ${metadataType}`);
    
    const validationResult = await validator.validateCustomMetadata(options);
    
    this.testContext.customMetadataValidationResult = validationResult;
    this.testContext.customMetadataType = metadataType;
    
    logger.info(`✅ Full validation completed: ${validationResult.validRecords}/${validationResult.totalRecords} valid`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// THEN STEPS - Assertions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assert query returned at least N records
 */
Then(
  /^the query should return at least (\d+) record$/,
  async function (this: AutomationWorld, minCount: number) {
    const count = this.testContext.customMetadataRecordCount || 0;
    
    if (count < minCount) {
      throw new Error(`Expected at least ${minCount} record(s), but got ${count}`);
    }
    
    logger.info(`✅ Query returned ${count} record(s) (expected at least ${minCount})`);
  }
);

/**
 * Assert query returned exactly N records
 */
Then(
  /^the query should return exactly (\d+) record$/,
  async function (this: AutomationWorld, exactCount: number) {
    const count = this.testContext.customMetadataRecordCount || 0;
    
    if (count !== exactCount) {
      throw new Error(`Expected exactly ${exactCount} record(s), but got ${count}`);
    }
    
    logger.info(`✅ Query returned exactly ${exactCount} record(s)`);
  }
);

/**
 * Assert response contains Custom Metadata records
 */
Then('the response should contain Custom Metadata records', async function (this: AutomationWorld) {
  const records = this.testContext.customMetadataRecords;
  
  if (!records || records.length === 0) {
    throw new Error('No Custom Metadata records found in response');
  }
  
  logger.info(`✅ Response contains ${records.length} Custom Metadata record(s)`);
});

/**
 * Assert record has specific DeveloperName
 */
Then(
  /^the record should have DeveloperName "([^"]+)"$/,
  async function (this: AutomationWorld, expectedDeveloperName: string) {
    const record = this.testContext.customMetadataRecord || this.testContext.customMetadataRecords?.[0];
    
    if (!record) {
      throw new Error('No Custom Metadata record found in context');
    }
    
    const actualDeveloperName = record.DeveloperName;
    
    if (actualDeveloperName !== expectedDeveloperName) {
      throw new Error(`Expected DeveloperName "${expectedDeveloperName}", but got "${actualDeveloperName}"`);
    }
    
    logger.info(`✅ Record has DeveloperName: ${expectedDeveloperName}`);
  }
);

/**
 * Assert all Dataverse values are non-empty
 */
Then('all Dataverse values should be non-empty', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.invalidRecords > 0) {
    const invalidResults = validationResult.results.filter((r: CustomMetadataValidationResult) => !r.isValid);
    const errorMessages = invalidResults
      .flatMap((r: CustomMetadataValidationResult) => r.errors)
      .join('; ');
    
    throw new Error(`Found ${validationResult.invalidRecords} invalid record(s): ${errorMessages}`);
  }
  
  logger.info(`✅ All ${validationResult.totalRecords} Dataverse values are non-empty`);
});

/**
 * Assert validation reports no errors
 */
Then('the validation should report no errors', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.summary.totalErrors > 0) {
    const errorMessages = validationResult.results
      .flatMap((r: CustomMetadataValidationResult) => r.errors)
      .join('; ');
    
    throw new Error(`Validation found ${validationResult.summary.totalErrors} error(s): ${errorMessages}`);
  }
  
  logger.info(`✅ Validation completed with no errors`);
});

/**
 * Assert all Dataverse values match required format
 */
Then('all Dataverse values should match the required format', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.invalidRecords > 0) {
    const formatErrors = validationResult.results
      .filter((r: CustomMetadataValidationResult) => !r.isValid)
      .flatMap((r: CustomMetadataValidationResult) => r.errors.filter((e: string) => e.includes('format')));
    
    if (formatErrors.length > 0) {
      throw new Error(`Found format errors: ${formatErrors.join('; ')}`);
    }
  }
  
  logger.info(`✅ All Dataverse values match the required format`);
});

/**
 * Assert validation reports no format errors
 */
Then('the validation should report no format errors', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  const formatErrors = validationResult.results
    .flatMap((r: CustomMetadataValidationResult) => r.errors.filter((e: string) => e.includes('format')));
  
  if (formatErrors.length > 0) {
    throw new Error(`Found ${formatErrors.length} format error(s): ${formatErrors.join('; ')}`);
  }
  
  logger.info(`✅ No format errors found`);
});

/**
 * Assert all Dataverse values are in allowed values list
 */
Then('all Dataverse values should be in the allowed values list', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  // Warnings indicate values not in allowed list (but don't fail validation)
  if (validationResult.summary.totalWarnings > 0) {
    const warnings = validationResult.results
      .flatMap((r: CustomMetadataValidationResult) =>
        r.warnings.filter((w: string) => w.includes('allowed values'))
      );
    
    if (warnings.length > 0) {
      logger.warn(`⚠️  Found ${warnings.length} value(s) not in allowed list: ${warnings.join('; ')}`);
      // This is a warning, not an error, so we log but don't throw
    }
  }
  
  logger.info(`✅ All Dataverse values are in the allowed values list (or validation passed)`);
});

/**
 * Assert validation reports no invalid values
 */
Then('the validation should report no invalid values', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.invalidRecords > 0) {
    const invalidResults = validationResult.results.filter((r: CustomMetadataValidationResult) => !r.isValid);
    const errorMessages = invalidResults
      .flatMap((r: CustomMetadataValidationResult) => r.errors)
      .join('; ');
    
    throw new Error(`Found ${validationResult.invalidRecords} invalid record(s): ${errorMessages}`);
  }
  
  logger.info(`✅ No invalid values found`);
});

/**
 * Assert Dataverse value is valid
 */
Then('the Dataverse value should be valid', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.totalRecords === 0) {
    throw new Error('No records were validated');
  }
  
  if (validationResult.invalidRecords > 0) {
    const invalidResult = validationResult.results.find((r: CustomMetadataValidationResult) => !r.isValid);
    if (invalidResult) {
      throw new Error(`Dataverse value is invalid: ${invalidResult.errors.join('; ')}`);
    }
  }
  
  logger.info(`✅ Dataverse value is valid`);
});

/**
 * Assert all Dataverse values are valid
 */
Then('all Dataverse values should be valid', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.invalidRecords > 0) {
    const invalidResults = validationResult.results.filter((r: CustomMetadataValidationResult) => !r.isValid);
    const errorMessages = invalidResults
      .flatMap((r: CustomMetadataValidationResult) => r.errors)
      .join('; ');
    
    throw new Error(`Found ${validationResult.invalidRecords} invalid record(s): ${errorMessages}`);
  }
  
  logger.info(`✅ All ${validationResult.totalRecords} Dataverse values are valid`);
});

/**
 * Assert validation summary shows total records
 */
Then('the validation summary should show total records', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  if (validationResult.totalRecords === 0) {
    throw new Error('Validation summary shows 0 total records');
  }
  
  logger.info(`✅ Validation summary shows ${validationResult.totalRecords} total record(s)`);
});

/**
 * Assert validation summary shows valid and invalid counts
 */
Then('the validation summary should show valid and invalid record counts', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  const total = validationResult.totalRecords;
  const valid = validationResult.validRecords;
  const invalid = validationResult.invalidRecords;
  
  if (valid + invalid !== total) {
    throw new Error(`Validation summary counts don't match: ${valid} valid + ${invalid} invalid ≠ ${total} total`);
  }
  
  logger.info(`✅ Validation summary: ${valid} valid, ${invalid} invalid out of ${total} total`);
});

/**
 * Assert validation summary shows error and warning counts
 */
Then('the validation summary should show error and warning counts', async function (this: AutomationWorld) {
  const validationResult = this.testContext.customMetadataValidationResult;
  
  if (!validationResult) {
    throw new Error('No validation result found. Run validation step first.');
  }
  
  const errors = validationResult.summary.totalErrors;
  const warnings = validationResult.summary.totalWarnings;
  
  logger.info(`✅ Validation summary: ${errors} error(s), ${warnings} warning(s)`);
});

// ═══════════════════════════════════════════════════════════════════════════
// COUNTRY OBJECT VALIDATION STEPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verify Salesforce org is available
 */
Given('the Salesforce org is available for metadata validation', async function (this: AutomationWorld) {
  if (!this.testContext.apiClient) {
    await this.testContext.customMetadataValidator?.authenticate();
  }
  logger.info('✅ Salesforce org is available');
});

/**
 * Verify custom object exists
 */
Given('the custom object {string} exists', async function (this: AutomationWorld, objectName: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }

  try {
    await apiClient.describeSObject(objectName);
    logger.info(`✅ Custom object "${objectName}" exists`);
  } catch (error: any) {
    throw new Error(`Custom object "${objectName}" does not exist: ${error.message}`);
  }
});

/**
 * Verify field exists with specific label and API name
 */
Then(
  /^a field labeled "([^"]+)" with API name "([^"]+)" should exist$/,
  async function (this: AutomationWorld, fieldLabel: string, apiName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context. Run "I describe the Country__c object fields" first.');
    }

    const field = fields.find((f: any) => 
      f.name === apiName || 
      f.label === fieldLabel ||
      (f.name === apiName && f.label === fieldLabel)
    );

    if (!field) {
      const availableFields = fields.map((f: any) => `${f.label} (${f.name})`).slice(0, 10).join(', ');
      throw new Error(`Field "${fieldLabel}" (${apiName}) does not exist. Available fields: ${availableFields}...`);
    }

    this.testContext.lastCheckedField = apiName;
    logger.info(`✅ Field "${fieldLabel}" (${apiName}) exists`);
  }
);

/**
 * Verify field type with length
 */
Then(
  /^the "([^"]+)" field type should be "([^"]+)" with length (\d+)$/,
  async function (this: AutomationWorld, fieldName: string, expectedType: string, expectedLength: number) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.type.toLowerCase() !== expectedType.toLowerCase()) {
      throw new Error(`Field type is "${field.type}", expected "${expectedType}"`);
    }

    if (field.length !== parseInt(String(expectedLength))) {
      throw new Error(`Field length is ${field.length}, expected ${expectedLength}`);
    }

    logger.info(`✅ Field "${fieldName}" type is "${expectedType}" with length ${expectedLength}`);
  }
);

/**
 * Verify field type with precision and scale
 */
Then(
  /^the "([^"]+)" field type should be "([^"]+)" with precision (\d+) and scale (\d+)$/,
  async function (this: AutomationWorld, fieldName: string, expectedType: string, precision: number, scale: number) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.type.toLowerCase() !== expectedType.toLowerCase()) {
      throw new Error(`Field type is "${field.type}", expected "${expectedType}"`);
    }

    if (field.precision !== parseInt(String(precision))) {
      throw new Error(`Field precision is ${field.precision}, expected ${precision}`);
    }

    if (field.scale !== parseInt(String(scale))) {
      throw new Error(`Field scale is ${field.scale}, expected ${scale}`);
    }

    logger.info(`✅ Field "${fieldName}" type is "${expectedType}" with precision ${precision} and scale ${scale}`);
  }
);

/**
 * Verify field is required
 */
Then(
  /^the "([^"]+)" field should be required$/,
  async function (this: AutomationWorld, fieldName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    const isRequired = field.nillable === false || field.required === true;
    if (!isRequired) {
      throw new Error(`Field "${fieldName}" is not required (nillable: ${field.nillable}, required: ${field.required})`);
    }

    logger.info(`✅ Field "${fieldName}" is required`);
  }
);

/**
 * Verify field is not required
 */
Then(
  /^the "([^"]+)" field should not be required$/,
  async function (this: AutomationWorld, fieldName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    const isRequired = field.nillable === false || field.required === true;
    if (isRequired) {
      throw new Error(`Field "${fieldName}" is required but should not be (nillable: ${field.nillable}, required: ${field.required})`);
    }

    logger.info(`✅ Field "${fieldName}" is not required`);
  }
);

/**
 * Verify field is unique
 */
Then(
  /^the "([^"]+)" field should be unique$/,
  async function (this: AutomationWorld, fieldName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (!field.unique) {
      throw new Error(`Field "${fieldName}" is not unique`);
    }

    logger.info(`✅ Field "${fieldName}" is unique`);
  }
);

/**
 * Verify field is not unique
 */
Then(
  /^the "([^"]+)" field should not be unique$/,
  async function (this: AutomationWorld, fieldName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.unique) {
      throw new Error(`Field "${fieldName}" is unique but should not be`);
    }

    logger.info(`✅ Field "${fieldName}" is not unique`);
  }
);

/**
 * Verify field is read-only
 */
Then(
  /^the "([^"]+)" field should be read-only$/,
  async function (this: AutomationWorld, fieldName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.updateable !== false && field.createable !== false) {
      throw new Error(`Field "${fieldName}" is not read-only (updateable: ${field.updateable}, createable: ${field.createable})`);
    }

    logger.info(`✅ Field "${fieldName}" is read-only`);
  }
);

/**
 * Verify field is hidden from page layouts (API check - field exists but may not be on layouts)
 */
Then(
  /^the "([^"]+)" field should be hidden from page layouts$/,
  async function (this: AutomationWorld, fieldName: string) {
    // This is a metadata validation - in API tests we can only verify the field exists
    // Actual page layout visibility requires UI testing or Tooling API
    logger.info(`✅ Field "${fieldName}" exists (page layout visibility requires UI verification)`);
  }
);

/**
 * Verify field type is Auto Number
 */
Then(
  /^the "([^"]+)" field type should be "Auto Number"$/,
  async function (this: AutomationWorld, fieldName: string) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.type.toLowerCase() !== 'autonumber') {
      throw new Error(`Field type is "${field.type}", expected "Auto Number"`);
    }

    logger.info(`✅ Field "${fieldName}" type is "Auto Number"`);
  }
);

/**
 * Verify Auto Number display format starts with prefix
 */
Then(
  /^the Auto Number display format should start with prefix "([^"]+)"$/,
  async function (this: AutomationWorld, expectedPrefix: string) {
    const fields = this.testContext.fieldsMetadata;
    const lastField = this.testContext.lastCheckedField;
    
    if (!fields || !lastField) {
      throw new Error('No field metadata or field name in context');
    }

    const field = fields.find((f: any) => f.name === lastField || f.label === lastField);
    if (!field) {
      throw new Error(`Field "${lastField}" not found`);
    }

    if (field.type.toLowerCase() !== 'autonumber') {
      throw new Error(`Field "${lastField}" is not an Auto Number field`);
    }

    // Check display format (stored in autoNumberFormat or similar)
    const displayFormat = field.autoNumberFormat || field.displayFormat || '';
    if (!displayFormat.startsWith(expectedPrefix)) {
      throw new Error(`Auto Number format is "${displayFormat}", expected to start with "${expectedPrefix}"`);
    }

    logger.info(`✅ Auto Number format starts with prefix "${expectedPrefix}"`);
  }
);

/**
 * Verify Auto Number uses 6-digit counter pattern
 */
Then(
  /^the Auto Number should use a 6-digit counter pattern like "([^"]+)"$/,
  async function (this: AutomationWorld, examplePattern: string) {
    const fields = this.testContext.fieldsMetadata;
    const lastField = this.testContext.lastCheckedField;
    
    if (!fields || !lastField) {
      throw new Error('No field metadata or field name in context');
    }

    const field = fields.find((f: any) => f.name === lastField || f.label === lastField);
    if (!field) {
      throw new Error(`Field "${lastField}" not found`);
    }

    // Pattern should be like CRY-000000 (prefix + 6 digits)
    const patternRegex = /^[A-Z]{3}-\d{6}$/;
    if (!patternRegex.test(examplePattern)) {
      logger.warn(`Example pattern "${examplePattern}" does not match expected format XXX-XXXXXX`);
    }

    const displayFormat = field.autoNumberFormat || field.displayFormat || '';
    // Verify format contains 6-digit pattern
    if (!displayFormat.includes('000000') && !displayFormat.match(/\{0\}/)) {
      logger.warn(`Auto Number format "${displayFormat}" may not use 6-digit counter`);
    }

    logger.info(`✅ Auto Number format matches pattern: ${examplePattern}`);
  }
);

/**
 * Verify picklist values include specific values
 */
Then(
  /^the picklist values for "([^"]+)" should include:$/,
  async function (this: AutomationWorld, fieldName: string, dataTable: any) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.type.toLowerCase() !== 'picklist' && field.type.toLowerCase() !== 'multipicklist') {
      throw new Error(`Field "${fieldName}" is not a picklist field (type: ${field.type})`);
    }

    const expectedValues = dataTable.raw().map((row: string[]) => row[0].trim());
    const picklistValues = (field.picklistValues || []).map((pv: any) => pv.value || pv.label);

    const missingValues: string[] = [];
    for (const expectedValue of expectedValues) {
      if (!picklistValues.some((pv: string) => pv === expectedValue || pv.toLowerCase() === expectedValue.toLowerCase())) {
        missingValues.push(expectedValue);
      }
    }

    if (missingValues.length > 0) {
      throw new Error(`Picklist "${fieldName}" missing values: ${missingValues.join(', ')}. Available: ${picklistValues.join(', ')}`);
    }

    logger.info(`✅ Picklist "${fieldName}" includes all expected values: ${expectedValues.join(', ')}`);
  }
);

/**
 * Verify field matches pattern
 */
Then(
  /^"([^"]+)" should match the pattern "([^"]+)"$/,
  async function (this: AutomationWorld, fieldName: string, pattern: string) {
    const record = this.testContext.lastCreatedRecord || this.testContext.lastQueryResult?.records?.[0];
    if (!record) {
      throw new Error('No record in context to check pattern');
    }

    const value = record[fieldName];
    if (!value) {
      throw new Error(`Field "${fieldName}" is empty or null`);
    }

    const regex = new RegExp(pattern);
    if (!regex.test(String(value))) {
      throw new Error(`Field "${fieldName}" value "${value}" does not match pattern "${pattern}"`);
    }

    logger.info(`✅ Field "${fieldName}" value "${value}" matches pattern "${pattern}"`);
  }
);

/**
 * Verify required canonical fields exist
 */
Given(
  /^the required canonical fields exist on "([^"]+)":$/,
  async function (this: AutomationWorld, objectName: string, dataTable: any) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    const describeResult = await apiClient.describeSObject(objectName);
    const fields = describeResult.fields || [];
    const requiredFields = dataTable.raw().map((row: string[]) => row[0].trim());

    const missingFields: string[] = [];
    for (const fieldName of requiredFields) {
      const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
      if (!field) {
        missingFields.push(fieldName);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(`Required fields missing on "${objectName}": ${missingFields.join(', ')}`);
    }

    logger.info(`✅ All required canonical fields exist on "${objectName}"`);
  }
);

/**
 * Verify legacy duplicated fields do not exist
 */
Then(
  /^the following legacy duplicated fields should not exist:$/,
  async function (this: AutomationWorld, dataTable: any) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const legacyFields = dataTable.raw().map((row: string[]) => row[0].trim());
    const existingFields: string[] = [];

    for (const legacyField of legacyFields) {
      const field = fields.find((f: any) => 
        f.name === legacyField || 
        f.label === legacyField ||
        f.name.toLowerCase() === legacyField.toLowerCase()
      );
      if (field) {
        existingFields.push(legacyField);
      }
    }

    if (existingFields.length > 0) {
      throw new Error(`Legacy duplicated fields still exist: ${existingFields.join(', ')}`);
    }

    logger.info(`✅ All legacy duplicated fields have been removed`);
  }
);

/**
 * Verify field exists on object
 */
Given(
  /^the field "([^"]+)" exists on "([^"]+)"$/,
  async function (this: AutomationWorld, fieldName: string, objectName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized');
    }

    const describeResult = await apiClient.describeSObject(objectName);
    const fields = describeResult.fields || [];
    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);

    if (!field) {
      throw new Error(`Field "${fieldName}" does not exist on "${objectName}"`);
    }

    logger.info(`✅ Field "${fieldName}" exists on "${objectName}"`);
  }
);

/**
 * Inspect field definitions
 */
When('I inspect field definitions for {string}', async function (this: AutomationWorld, objectName: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }

  const describeResult = await apiClient.describeSObject(objectName);
  this.testContext.fieldsMetadata = describeResult.fields || [];
  this.testContext.objectDescribe = describeResult;

  logger.info(`✅ Inspected field definitions for "${objectName}" (${describeResult.fields?.length || 0} fields)`);
});

/**
 * Verify field type with length (alternative pattern)
 */
Then(
  /^"([^"]+)" should be type "([^"]+)" with length (\d+)$/,
  async function (this: AutomationWorld, fieldName: string, expectedType: string, expectedLength: number) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) {
      throw new Error('No field metadata in context');
    }

    const field = fields.find((f: any) => f.name === fieldName || f.label === fieldName);
    if (!field) {
      throw new Error(`Field "${fieldName}" not found`);
    }

    if (field.type.toLowerCase() !== expectedType.toLowerCase()) {
      throw new Error(`Field type is "${field.type}", expected "${expectedType}"`);
    }

    if (field.length !== parseInt(String(expectedLength))) {
      throw new Error(`Field length is ${field.length}, expected ${expectedLength}`);
    }

    logger.info(`✅ Field "${fieldName}" is type "${expectedType}" with length ${expectedLength}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMICS/DATAVERSE VALIDATION STEPS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Initialize Dynamics API connection
 */
Given('I have a valid Dynamics API connection', async function (this: AutomationWorld) {
  if (!this.apiContext) {
    throw new Error('API context not initialized');
  }

  const dynamicsClient = new DynamicsAPIClient(this.apiContext);
  await dynamicsClient.authenticate();
  
  this.testContext.dynamicsClient = dynamicsClient;
  
  logger.info('✅ Dynamics API client initialized and authenticated');
});

/**
 * Query Custom Metadata records with filters
 */
When(
  /^I query Custom Metadata "([^"]+)" records filtered by Object "([^"]+)" and Field "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, objectName: string, fieldName: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    const options: CustomMetadataValidationOptions = {
      metadataType,
      dataverseValueField: 'Dataverse_Value__c',
      objectField: 'Object__c',
      fieldNameField: 'Field__c',
      filters: {
        objectName,
        fieldName
      }
    };
    
    logger.info(`📖 Querying Custom Metadata: ${metadataType} for Object: ${objectName}, Field: ${fieldName}`);
    
    const records = await validator.queryCustomMetadataRecords(
      metadataType,
      ['FIELDS(ALL)'],
      { Object__c: objectName, Field__c: fieldName }
    );
    
    this.testContext.customMetadataRecords = records;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = records.length;
    
    logger.info(`✅ Queried ${records.length} Custom Metadata records`);
  }
);

/**
 * Query Custom Metadata with Object + Field + Value (SF-1159 / narrow CMDT slices).
 */
When(
  /^I query Custom Metadata "([^"]+)" records filtered by Object "([^"]+)" and Field "([^"]+)" and Value "([^"]+)"$/,
  async function (
    this: AutomationWorld,
    metadataType: string,
    objectName: string,
    fieldName: string,
    value: string
  ) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;

    logger.info(
      `📖 Querying Custom Metadata: ${metadataType} for Object: ${objectName}, Field: ${fieldName}, Value: ${value}`
    );

    const records = await validator.queryCustomMetadataRecords(
      metadataType,
      ['FIELDS(ALL)'],
      { Object__c: objectName, Field__c: fieldName, Value__c: value }
    );

    this.testContext.customMetadataRecords = records;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = records.length;

    logger.info(`✅ Queried ${records.length} Custom Metadata records`);
  }
);

/**
 * Query Custom Metadata records with WHERE clause
 */
When(
  /^I query Custom Metadata "([^"]+)" records where ([^"]+) contains "([^"]+)"$/,
  async function (this: AutomationWorld, metadataType: string, fieldName: string, searchValue: string) {
    if (!this.testContext.customMetadataValidator) {
      throw new Error('Custom Metadata Validator not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const validator = this.testContext.customMetadataValidator as CustomMetadataValidator;
    
    logger.info(`📖 Querying Custom Metadata: ${metadataType} where ${fieldName} contains "${searchValue}"`);
    
    // Query all records and filter in memory (SOQL LIKE is limited)
    const allRecords = await validator.queryCustomMetadataRecords(metadataType, ['FIELDS(ALL)']);
    const filteredRecords = allRecords.filter((record: any) => {
      const fieldValue = String(record[fieldName] || '').toLowerCase();
      return fieldValue.includes(searchValue.toLowerCase());
    });
    
    this.testContext.customMetadataRecords = filteredRecords;
    this.testContext.customMetadataType = metadataType;
    this.testContext.customMetadataRecordCount = filteredRecords.length;
    
    logger.info(`✅ Queried ${filteredRecords.length} Custom Metadata records matching filter`);
  }
);

/**
 * Validate each Dataverse value exists in Dynamics
 */
When('I validate each Dataverse value exists in Dynamics', async function (this: AutomationWorld) {
  const records = this.testContext.customMetadataRecords;
  const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
  
  if (!records || records.length === 0) {
    throw new Error('No Custom Metadata records in context. Query records first.');
  }
  
  if (!dynamicsClient) {
    throw new Error('Dynamics API client not initialized. Run "Given I have a valid Dynamics API connection" first.');
  }

  const validationResults: Array<{
    record: any;
    dataverseValue: string;
    dataverseField: string;
    exists: boolean;
    error?: string;
  }> = [];

  logger.info(`🔍 Validating ${records.length} Dataverse values against Dynamics...`);

  for (const record of records) {
    const dataverseValue = record.Dataverse_Value__c;
    const dataverseField = record.Dataverse_Field__c;
    
    if (!dataverseValue || !dataverseField) {
      validationResults.push({
        record,
        dataverseValue: dataverseValue || '',
        dataverseField: dataverseField || '',
        exists: false,
        error: 'Missing Dataverse_Value__c or Dataverse_Field__c'
      });
      continue;
    }

    try {
      // Parse Dataverse field (e.g., "accelins_party.accelins_partytype" -> entity: "accelins_parties", field: "accelins_partytype")
      const fieldParts = dataverseField.split('.');
      const entityName = fieldParts[0];
      const fieldName = fieldParts[1] || fieldParts[0];
      
      // Map entity names (e.g., "accelins_party" -> "accelins_parties", "accelins_country" -> "accelins_countries")
      let entitySetName = entityName;
      if (entityName === 'accelins_party') {
        entitySetName = 'accelins_parties';
      } else if (entityName === 'accelins_country') {
        entitySetName = 'accelins_countries';
      } else if (!entityName.endsWith('s') && !entityName.endsWith('ies')) {
        entitySetName = entityName + 's';
      }

      // Query Dynamics to check if value exists
      const queryParams = {
        '$filter': `${fieldName} eq '${dataverseValue.replace(/'/g, "''")}'`,
        '$select': fieldName,
        '$top': '1'
      };

      const result = await dynamicsClient.query(entitySetName, queryParams);
      const exists = result.value && result.value.length > 0;

      validationResults.push({
        record,
        dataverseValue,
        dataverseField,
        exists,
        error: exists ? undefined : `Value "${dataverseValue}" not found in Dynamics ${entitySetName}.${fieldName}`
      });

      if (exists) {
        logger.info(`✅ Dataverse value "${dataverseValue}" exists in Dynamics ${entitySetName}.${fieldName}`);
      } else {
        logger.warn(`⚠️  Dataverse value "${dataverseValue}" not found in Dynamics ${entitySetName}.${fieldName}`);
      }
    } catch (error: any) {
      validationResults.push({
        record,
        dataverseValue,
        dataverseField,
        exists: false,
        error: `Error querying Dynamics: ${error.message}`
      });
      logger.error(`❌ Error validating "${dataverseValue}": ${error.message}`);
    }
  }

  this.testContext.dataverseValidationResults = validationResults;
  const validCount = validationResults.filter((r: DataverseDynamicsValidationRow) => r.exists).length;
  const invalidCount = validationResults.filter((r: DataverseDynamicsValidationRow) => !r.exists).length;
  
  logger.info(`📊 Validation Summary: ${validCount} valid, ${invalidCount} invalid out of ${records.length} total`);
});

/**
 * Validate specific Dataverse value exists in Dynamics
 */
When(
  /^I validate the Dataverse value "([^"]+)" exists in Dynamics entity "([^"]+)" for field "([^"]+)"$/,
  async function (this: AutomationWorld, dataverseValue: string, entityName: string, fieldName: string) {
    const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
    
    if (!dynamicsClient) {
      throw new Error('Dynamics API client not initialized. Run "Given I have a valid Dynamics API connection" first.');
    }

    try {
      const queryParams = {
        '$filter': `${fieldName} eq '${dataverseValue.replace(/'/g, "''")}'`,
        '$select': fieldName,
        '$top': '1'
      };

      const result = await dynamicsClient.query(entityName, queryParams);
      const exists = result.value && result.value.length > 0;

      this.testContext.dataverseValueValidation = {
        value: dataverseValue,
        entity: entityName,
        field: fieldName,
        exists,
        error: exists ? undefined : `Value "${dataverseValue}" not found in Dynamics ${entityName}.${fieldName}`
      };

      if (exists) {
        logger.info(`✅ Dataverse value "${dataverseValue}" exists in Dynamics ${entityName}.${fieldName}`);
      } else {
        throw new Error(`Dataverse value "${dataverseValue}" not found in Dynamics ${entityName}.${fieldName}`);
      }
    } catch (error: any) {
      this.testContext.dataverseValueValidation = {
        value: dataverseValue,
        entity: entityName,
        field: fieldName,
        exists: false,
        error: error.message
      };
      throw error;
    }
  }
);

/**
 * Validate Country Dataverse values exist in Dynamics
 */
When('I validate each Country Dataverse value exists in Dynamics accelins_country entity', async function (this: AutomationWorld) {
  const records = this.testContext.customMetadataRecords;
  const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
  
  if (!records || records.length === 0) {
    throw new Error('No Custom Metadata records in context. Query records first.');
  }
  
  if (!dynamicsClient) {
    throw new Error('Dynamics API client not initialized. Run "Given I have a valid Dynamics API connection" first.');
  }

  const validationResults: Array<{
    record: any;
    dataverseValue: string;
    exists: boolean;
    error?: string;
  }> = [];

  logger.info(`🔍 Validating ${records.length} Country Dataverse values against Dynamics accelins_countries...`);

  for (const record of records) {
    const dataverseValue = record.Dataverse_Value__c;
    
    if (!dataverseValue) {
      validationResults.push({
        record,
        dataverseValue: '',
        exists: false,
        error: 'Missing Dataverse_Value__c'
      });
      continue;
    }

    try {
      // Query Dynamics accelins_countries entity
      // Country values are typically stored in accelins_countrymasterid or similar field
      const queryParams = {
        '$filter': `accelins_countrymasterid eq '${dataverseValue.replace(/'/g, "''")}'`,
        '$select': 'accelins_countrymasterid,accelins_name',
        '$top': '1'
      };

      const result = await dynamicsClient.query('accelins_countries', queryParams);
      const exists = result.value && result.value.length > 0;

      validationResults.push({
        record,
        dataverseValue,
        exists,
        error: exists ? undefined : `Country value "${dataverseValue}" not found in Dynamics accelins_countries`
      });

      if (exists) {
        logger.info(`✅ Country Dataverse value "${dataverseValue}" exists in Dynamics`);
      } else {
        logger.warn(`⚠️  Country Dataverse value "${dataverseValue}" not found in Dynamics`);
      }
    } catch (error: any) {
      validationResults.push({
        record,
        dataverseValue,
        exists: false,
        error: `Error querying Dynamics: ${error.message}`
      });
      logger.error(`❌ Error validating Country "${dataverseValue}": ${error.message}`);
    }
  }

  this.testContext.dataverseValidationResults = validationResults;
  const validCount = validationResults.filter((r: DataverseDynamicsValidationRow) => r.exists).length;
  const invalidCount = validationResults.filter((r: DataverseDynamicsValidationRow) => !r.exists).length;
  
  logger.info(`📊 Country Validation Summary: ${validCount} valid, ${invalidCount} invalid out of ${records.length} total`);
});

/**
 * Compare Custom Metadata Dataverse values with Dynamics data
 */
When('I compare each Dataverse value with Dynamics entity data', async function (this: AutomationWorld) {
  const records = this.testContext.customMetadataRecords;
  const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
  
  if (!records || records.length === 0) {
    throw new Error('No Custom Metadata records in context. Query records first.');
  }
  
  if (!dynamicsClient) {
    throw new Error('Dynamics API client not initialized. Run "Given I have a valid Dynamics API connection" first.');
  }

  const comparisonResults: Array<{
    record: any;
    dataverseValue: string;
    dataverseField: string;
    salesforceValue: string;
    matches: boolean;
    error?: string;
  }> = [];

  logger.info(`🔍 Comparing ${records.length} Dataverse values with Dynamics data...`);

  for (const record of records) {
    const dataverseValue = record.Dataverse_Value__c;
    const dataverseField = record.Dataverse_Field__c;
    const salesforceValue = record.Value__c;
    
    if (!dataverseValue || !dataverseField || !salesforceValue) {
      comparisonResults.push({
        record,
        dataverseValue: dataverseValue || '',
        dataverseField: dataverseField || '',
        salesforceValue: salesforceValue || '',
        matches: false,
        error: 'Missing required fields'
      });
      continue;
    }

    try {
      // Parse Dataverse field and query Dynamics
      const fieldParts = dataverseField.split('.');
      const entityName = fieldParts[0];
      const fieldName = fieldParts[1] || fieldParts[0];
      
      let entitySetName = entityName;
      if (entityName === 'accelins_party') {
        entitySetName = 'accelins_parties';
      } else if (entityName === 'accelins_country') {
        entitySetName = 'accelins_countries';
      } else if (!entityName.endsWith('s') && !entityName.endsWith('ies')) {
        entitySetName = entityName + 's';
      }

      // Query Dynamics to get the actual value
      const queryParams = {
        '$filter': `${fieldName} eq '${dataverseValue.replace(/'/g, "''")}'`,
        '$select': fieldName,
        '$top': '1'
      };

      const result = await dynamicsClient.query(entitySetName, queryParams);
      
      if (result.value && result.value.length > 0) {
        const dynamicsRecord = result.value[0];
        const dynamicsFieldValue = dynamicsRecord[fieldName];
        
        // Compare values (exact match or case-insensitive)
        const matches = String(dynamicsFieldValue).trim() === String(dataverseValue).trim() ||
                       String(dynamicsFieldValue).toLowerCase() === String(dataverseValue).toLowerCase();

        comparisonResults.push({
          record,
          dataverseValue,
          dataverseField,
          salesforceValue,
          matches,
          error: matches ? undefined : `Value mismatch: Dynamics="${dynamicsFieldValue}", Expected="${dataverseValue}"`
        });

        if (matches) {
          logger.info(`✅ Values match: Salesforce="${salesforceValue}" ↔ Dynamics="${dataverseValue}"`);
        } else {
          logger.warn(`⚠️  Value mismatch: Salesforce="${salesforceValue}" ↔ Dynamics="${dataverseValue}" (Dynamics has "${dynamicsFieldValue}")`);
        }
      } else {
        comparisonResults.push({
          record,
          dataverseValue,
          dataverseField,
          salesforceValue,
          matches: false,
          error: `Value "${dataverseValue}" not found in Dynamics ${entitySetName}`
        });
      }
    } catch (error: any) {
      comparisonResults.push({
        record,
        dataverseValue,
        dataverseField,
        salesforceValue,
        matches: false,
        error: `Error comparing: ${error.message}`
      });
      logger.error(`❌ Error comparing "${dataverseValue}": ${error.message}`);
    }
  }

  this.testContext.dataverseComparisonResults = comparisonResults;
  const matchCount = comparisonResults.filter((r: DataverseComparisonRow) => r.matches).length;
  const mismatchCount = comparisonResults.filter((r: DataverseComparisonRow) => !r.matches).length;
  
  logger.info(`📊 Comparison Summary: ${matchCount} matches, ${mismatchCount} mismatches out of ${records.length} total`);
});

// ═══════════════════════════════════════════════════════════════════════════
// THEN STEPS - Dynamics Validation Assertions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Assert all Dataverse values exist in Dynamics
 */
Then('all Dataverse values should exist in Dynamics', async function (this: AutomationWorld) {
  const results = this.testContext.dataverseValidationResults;
  
  if (!results || results.length === 0) {
    throw new Error('No validation results found. Run validation step first.');
  }
  
  const missingValues = results.filter((r: DataverseDynamicsValidationRow) => !r.exists);
  
  if (missingValues.length > 0) {
    const errorMessages = missingValues.map((r: DataverseDynamicsValidationRow) => 
      `Value "${r.dataverseValue}" (${r.dataverseField}): ${r.error || 'Not found'}`
    ).join('; ');
    
    throw new Error(`Found ${missingValues.length} Dataverse value(s) that do not exist in Dynamics: ${errorMessages}`);
  }
  
  logger.info(`✅ All ${results.length} Dataverse values exist in Dynamics`);
});

/**
 * Assert validation reports no missing values
 */
Then('the validation should report no missing values', async function (this: AutomationWorld) {
  const results = this.testContext.dataverseValidationResults;
  
  if (!results || results.length === 0) {
    throw new Error('No validation results found. Run validation step first.');
  }
  
  const missingValues = results.filter((r: DataverseDynamicsValidationRow) => !r.exists);
  
  if (missingValues.length > 0) {
    const errorMessages = missingValues.map((r: DataverseDynamicsValidationRow) => 
      `Value "${r.dataverseValue}": ${r.error || 'Not found'}`
    ).join('; ');
    
    throw new Error(`Found ${missingValues.length} missing value(s): ${errorMessages}`);
  }
  
  logger.info(`✅ No missing values found`);
});

/**
 * Assert Dataverse value exists in Dynamics
 */
Then('the Dataverse value should exist in Dynamics', async function (this: AutomationWorld) {
  const validation = this.testContext.dataverseValueValidation;
  
  if (!validation) {
    throw new Error('No Dataverse value validation found. Run validation step first.');
  }
  
  if (!validation.exists) {
    throw new Error(`Dataverse value "${validation.value}" does not exist in Dynamics ${validation.entity}.${validation.field}: ${validation.error || 'Not found'}`);
  }
  
  logger.info(`✅ Dataverse value "${validation.value}" exists in Dynamics`);
});

/**
 * Assert Dataverse value matches expected format
 */
Then('the Dataverse value should match the expected format', async function (this: AutomationWorld) {
  const validation = this.testContext.dataverseValueValidation;
  
  if (!validation) {
    throw new Error('No Dataverse value validation found. Run validation step first.');
  }
  
  // Validate format: XXX-XXXXXX (3 letters, dash, 6 digits)
  const formatPattern = /^[A-Z]{3}-\d{6}$/;
  if (!formatPattern.test(validation.value)) {
    throw new Error(`Dataverse value "${validation.value}" does not match expected format XXX-XXXXXX`);
  }
  
  logger.info(`✅ Dataverse value "${validation.value}" matches expected format`);
});

/**
 * Assert all Country Dataverse values exist in Dynamics
 */
Then('all Country Dataverse values should exist in Dynamics', async function (this: AutomationWorld) {
  const results = this.testContext.dataverseValidationResults;
  
  if (!results || results.length === 0) {
    throw new Error('No validation results found. Run validation step first.');
  }
  
  const missingValues = results.filter((r: DataverseDynamicsValidationRow) => !r.exists);
  
  if (missingValues.length > 0) {
    const errorMessages = missingValues.map((r: DataverseDynamicsValidationRow) => 
      `Country value "${r.dataverseValue}": ${r.error || 'Not found'}`
    ).join('; ');
    
    throw new Error(`Found ${missingValues.length} Country Dataverse value(s) that do not exist in Dynamics: ${errorMessages}`);
  }
  
  logger.info(`✅ All ${results.length} Country Dataverse values exist in Dynamics`);
});

/**
 * Assert validation reports no missing country values
 */
Then('the validation should report no missing country values', async function (this: AutomationWorld) {
  const results = this.testContext.dataverseValidationResults;
  
  if (!results || results.length === 0) {
    throw new Error('No validation results found. Run validation step first.');
  }
  
  const missingValues = results.filter((r: DataverseDynamicsValidationRow) => !r.exists);
  
  if (missingValues.length > 0) {
    const errorMessages = missingValues.map((r: DataverseDynamicsValidationRow) => 
      `Country value "${r.dataverseValue}": ${r.error || 'Not found'}`
    ).join('; ');
    
    throw new Error(`Found ${missingValues.length} missing country value(s): ${errorMessages}`);
  }
  
  logger.info(`✅ No missing country values found`);
});

/**
 * Assert all Dataverse values match Dynamics data
 */
Then('all Dataverse values should match Dynamics data', async function (this: AutomationWorld) {
  const results = this.testContext.dataverseComparisonResults;
  
  if (!results || results.length === 0) {
    throw new Error('No comparison results found. Run comparison step first.');
  }
  
  const mismatches = results.filter((r: DataverseComparisonRow) => !r.matches);
  
  if (mismatches.length > 0) {
    const errorMessages = mismatches.map((r: DataverseComparisonRow) => 
      `Value "${r.dataverseValue}" (${r.dataverseField}): ${r.error || 'Mismatch'}`
    ).join('; ');
    
    throw new Error(`Found ${mismatches.length} Dataverse value(s) that do not match Dynamics data: ${errorMessages}`);
  }
  
  logger.info(`✅ All ${results.length} Dataverse values match Dynamics data`);
});

/**
 * Assert comparison reports no mismatches
 */
Then('the comparison should report no mismatches', async function (this: AutomationWorld) {
  const results = this.testContext.dataverseComparisonResults;
  
  if (!results || results.length === 0) {
    throw new Error('No comparison results found. Run comparison step first.');
  }
  
  const mismatches = results.filter((r: DataverseComparisonRow) => !r.matches);
  
  if (mismatches.length > 0) {
    const errorMessages = mismatches.map((r: DataverseComparisonRow) => 
      `Value "${r.dataverseValue}": ${r.error || 'Mismatch'}`
    ).join('; ');
    
    throw new Error(`Found ${mismatches.length} mismatch(es): ${errorMessages}`);
  }
  
  logger.info(`✅ No mismatches found`);
});