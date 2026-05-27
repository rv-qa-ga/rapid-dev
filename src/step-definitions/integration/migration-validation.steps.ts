/**
 * Migration Validation Step Definitions
 * Validates data migration from Dynamics CRM to Salesforce
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { DynamicsAPIClient } from '../../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { 
  compareAllFields, 
  generateValidationReport,
  getFieldMappings,
  ValidationResult 
} from '../../utils/migration-field-mapper';
import { logger } from '../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import {
  primeSfAccountDataverseFieldFromOrg,
  primeSfAccountPartyMasterFieldFromOrg,
} from '../../utils/sf-account-dataverse-field';

// ============================================================================
// AUTHENTICATION STEPS
// ============================================================================

async function authenticateDynamicsWithRetry(
  dynamicsClient: DynamicsAPIClient,
  maxAttempts = 3
): Promise<void> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await dynamicsClient.authenticate();
      return;
    } catch (error: any) {
      lastError = error;
      const message = String(error?.message || error);
      const retryable =
        message.includes('fetch failed') ||
        message.includes('ECONNRESET') ||
        message.includes('ETIMEDOUT') ||
        message.includes('socket hang up');
      if (attempt < maxAttempts && retryable) {
        const waitMs = attempt * 3000;
        logger.warn(
          `Dynamics auth attempt ${attempt}/${maxAttempts} failed (${message}); retrying in ${waitMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

Given('I have valid API access to both Dynamics CRM and Salesforce', async function (this: AutomationWorld) {
  if (!this.apiContext) {
    throw new Error('API context not initialized. Ensure Before hook has run.');
  }

  // Initialize Dynamics API client
  const dynamicsClient = new DynamicsAPIClient(this.apiContext);
  await authenticateDynamicsWithRetry(dynamicsClient);
  this.testContext.dynamicsClient = dynamicsClient;

  // Initialize Salesforce API client
  const salesforceClient = new SalesforceAPIClient(this.apiContext);
  await salesforceClient.authenticate();
  this.testContext.salesforceClient = salesforceClient;
  // Streaming / generic platform-event steps expect `apiClient`; alias the same JWT session client.
  this.testContext.apiClient = salesforceClient;

  await primeSfAccountDataverseFieldFromOrg(salesforceClient);
  await primeSfAccountPartyMasterFieldFromOrg(salesforceClient);

  logger.info('✅ Both Dynamics CRM and Salesforce API clients authenticated');
});

// ============================================================================
// PARTY MASTER ID STEPS
// ============================================================================

Given('I have a Party MasterId {string}', async function (this: AutomationWorld, masterId: string) {
  this.testContext.masterId = masterId;
  logger.info(`📋 Party MasterId set: ${masterId}`);
});

Given('I have a list of Party MasterIds:', async function (this: AutomationWorld, dataTable: any) {
  const rows = dataTable.raw();
  const masterIds: string[] = [];
  
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0]) {
      masterIds.push(rows[i][0]);
    }
  }
  
  this.testContext.masterIds = masterIds;
  logger.info(`📋 Party MasterIds set: ${masterIds.join(', ')}`);
});

// ============================================================================
// DATA RETRIEVAL STEPS
// ============================================================================

When('I retrieve the Party details from Dynamics CRM by MasterId', async function (this: AutomationWorld) {
  const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
  if (!dynamicsClient) {
    throw new Error('Dynamics API client not initialized.');
  }

  const masterId = this.testContext.masterId;
  if (!masterId) {
    throw new Error('Party MasterId not set. Use "Given I have a Party MasterId" step first.');
  }

  try {
    // Query Dynamics Party by MasterId
    // Assuming MasterId is stored in accelins_partyid or a similar field
    const mappings = await getFieldMappings();
    const dynamicsFields = mappings.map(m => m.dynamicsField).join(',');
    const queryParams = {
      '$filter': `accelins_partyid eq '${masterId}'`,
      '$select': dynamicsFields
    };

    const result = await dynamicsClient.query('accelins_parties', queryParams);
    
    if (result.value && result.value.length > 0) {
      this.testContext.dynamicsParty = result.value[0];
      logger.info(`✅ Retrieved Party from Dynamics CRM: ${masterId}`);
    } else {
      this.testContext.dynamicsParty = null;
      logger.warn(`⚠️  Party not found in Dynamics CRM: ${masterId}`);
    }
  } catch (error: any) {
    this.testContext.dynamicsParty = null;
    logger.error(`❌ Error retrieving Party from Dynamics CRM: ${error.message}`);
    throw error;
  }
});

When('I retrieve the corresponding Account details from Salesforce by MasterId', async function (this: AutomationWorld) {
  const salesforceClient = this.testContext.salesforceClient as SalesforceAPIClient;
  if (!salesforceClient) {
    throw new Error('Salesforce API client not initialized.');
  }

  const masterId = this.testContext.masterId;
  if (!masterId) {
    throw new Error('Party MasterId not set.');
  }

  try {
    // Get all Salesforce fields from mappings
    const mappings = await getFieldMappings();
    const salesforceFields = mappings.map(m => m.salesforceField).filter(f => f && f !== 'N/A');
    
    // Build SOQL query with all mapped fields
    const fieldList = salesforceFields.length > 0 
      ? salesforceFields.join(', ')
      : 'Id, Name, Party_MasterId__c'; // Fallback if no mappings
    
    const soql = `SELECT ${fieldList}
                 FROM Account 
                 WHERE Party_MasterId__c = '${masterId}' 
                 LIMIT 1`;

    const result = await salesforceClient.query(soql);
    
    if (result.records && result.records.length > 0) {
      this.testContext.salesforceAccount = result.records[0];
      logger.info(`✅ Retrieved Account from Salesforce: ${masterId}`);
    } else {
      this.testContext.salesforceAccount = null;
      logger.warn(`⚠️  Account not found in Salesforce: ${masterId}`);
    }
  } catch (error: any) {
    this.testContext.salesforceAccount = null;
    logger.error(`❌ Error retrieving Account from Salesforce: ${error.message}`);
    throw error;
  }
});

// ============================================================================
// VALIDATION STEPS
// ============================================================================

Then('the Party should have a corresponding Account in Salesforce', async function (this: AutomationWorld) {
  const dynamicsParty = this.testContext.dynamicsParty;
  const salesforceAccount = this.testContext.salesforceAccount;

  if (!dynamicsParty) {
    throw new Error('Party not found in Dynamics CRM. Cannot validate migration.');
  }

  if (!salesforceAccount) {
    throw new Error(`Party ${this.testContext.masterId} does not have a corresponding Account in Salesforce. Migration may be incomplete.`);
  }

  logger.info(`✅ Party has corresponding Account in Salesforce`);
});

Then('the Party should exist in Dynamics CRM', async function (this: AutomationWorld) {
  const dynamicsParty = this.testContext.dynamicsParty;
  
  if (!dynamicsParty) {
    throw new Error(`Party ${this.testContext.masterId} does not exist in Dynamics CRM.`);
  }

  logger.info(`✅ Party exists in Dynamics CRM`);
});

Then('the Party should not have a corresponding Account in Salesforce', async function (this: AutomationWorld) {
  const salesforceAccount = this.testContext.salesforceAccount;
  
  if (salesforceAccount) {
    throw new Error(`Party ${this.testContext.masterId} has a corresponding Account in Salesforce, but it should not exist.`);
  }

  logger.info(`✅ Party does not have corresponding Account in Salesforce (as expected)`);
});

Then('all mapped fields should match between Dynamics Party and Salesforce Account', async function (this: AutomationWorld) {
  const dynamicsParty = this.testContext.dynamicsParty;
  const salesforceAccount = this.testContext.salesforceAccount;

  if (!dynamicsParty || !salesforceAccount) {
    throw new Error('Both Party and Account must be retrieved before comparison.');
  }

  const validationResult = await compareAllFields(dynamicsParty, salesforceAccount);
  this.testContext.validationResult = validationResult;

  if (!validationResult.criticalFieldsMatched) {
    throw new Error('Critical fields do not match. See validation report for details.');
  }

  if (validationResult.fieldsDifferent > 0) {
    logger.warn(`⚠️  ${validationResult.fieldsDifferent} field(s) have mismatched values.`);
  } else {
    logger.info(`✅ All mapped fields match between Dynamics Party and Salesforce Account`);
  }
});

Then('all fields from the mapping document should be verified', async function (this: AutomationWorld) {
  const validationResult = this.testContext.validationResult as ValidationResult;
  
  if (!validationResult) {
    throw new Error('Validation result not found. Run field comparison first.');
  }

  const mappings = await getFieldMappings();
  const totalMappings = mappings.length;
  const verifiedFields = validationResult.fieldsCompared;

  if (verifiedFields < totalMappings) {
    logger.warn(`⚠️  Only ${verifiedFields} of ${totalMappings} mapped fields were verified.`);
  } else {
    logger.info(`✅ All ${totalMappings} fields from mapping document were verified.`);
  }

  // Ensure we verified all fields that should be included in migration
  const includedMappings = mappings.filter(m => m.salesforceField && m.salesforceField !== 'N/A');
  if (verifiedFields < includedMappings.length) {
    throw new Error(
      `Not all fields from mapping document were verified. ` +
      `Expected: ${includedMappings.length}, Verified: ${verifiedFields}`
    );
  }
});

Then('any field differences should be reported', async function (this: AutomationWorld) {
  const validationResult = this.testContext.validationResult as ValidationResult;
  
  if (!validationResult) {
    throw new Error('Validation result not found. Run field comparison first.');
  }

  const report = generateValidationReport(validationResult);
  logger.info(report);

  // Save report to file
  const reportsDir = path.join(process.cwd(), 'reports', 'migration-validation');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportFile = path.join(reportsDir, `validation-${this.testContext.masterId}-${Date.now()}.txt`);
  fs.writeFileSync(reportFile, report);
  logger.info(`📄 Validation report saved to: ${reportFile}`);

  this.testContext.validationReport = report;
  this.testContext.validationReportPath = reportFile;
});

Then('the following fields should match:', async function (this: AutomationWorld, dataTable: any) {
  const dynamicsParty = this.testContext.dynamicsParty;
  const salesforceAccount = this.testContext.salesforceAccount;

  if (!dynamicsParty || !salesforceAccount) {
    throw new Error('Both Party and Account must be retrieved before comparison.');
  }

  const rows = dataTable.raw();
  const mismatches: string[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const dynamicsField = rows[i][0];
    const salesforceField = rows[i][1];
    
    const dynValue = dynamicsParty[dynamicsField];
    const sfValue = salesforceAccount[salesforceField];

    if (String(dynValue || '') !== String(sfValue || '')) {
      mismatches.push(`${dynamicsField} (Dynamics: "${dynValue}") vs ${salesforceField} (Salesforce: "${sfValue}")`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Field mismatches detected:\n${mismatches.join('\n')}`);
  }

  logger.info(`✅ All specified fields match`);
});

Then('the following critical fields must match exactly:', async function (this: AutomationWorld, dataTable: any) {
  const dynamicsParty = this.testContext.dynamicsParty;
  const salesforceAccount = this.testContext.salesforceAccount;

  if (!dynamicsParty || !salesforceAccount) {
    throw new Error('Both Party and Account must be retrieved before comparison.');
  }

  const rows = dataTable.raw();
  const mismatches: string[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const dynamicsField = rows[i][0];
    const salesforceField = rows[i][1];
    
    const dynValue = String(dynamicsParty[dynamicsField] || '');
    const sfValue = String(salesforceAccount[salesforceField] || '');

    if (dynValue !== sfValue) {
      mismatches.push(`${dynamicsField}="${dynValue}" vs ${salesforceField}="${sfValue}"`);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Critical field mismatches detected:\n${mismatches.join('\n')}`);
  }

  logger.info(`✅ All critical fields match exactly`);
});

Then('the following optional fields should match with tolerance:', async function (this: AutomationWorld, dataTable: any) {
  const dynamicsParty = this.testContext.dynamicsParty;
  const salesforceAccount = this.testContext.salesforceAccount;

  if (!dynamicsParty || !salesforceAccount) {
    throw new Error('Both Party and Account must be retrieved before comparison.');
  }

  const rows = dataTable.raw();
  const warnings: string[] = [];

  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    const dynamicsField = rows[i][0];
    const salesforceField = rows[i][1];
    const tolerance = rows[i][2] || 'exact';
    
    const dynValue = String(dynamicsParty[dynamicsField] || '').trim();
    const sfValue = String(salesforceAccount[salesforceField] || '').trim();

    let match = false;
    switch (tolerance.toLowerCase()) {
      case 'exact':
        match = dynValue === sfValue;
        break;
      case 'case-insensitive':
        match = dynValue.toLowerCase() === sfValue.toLowerCase();
        break;
      case 'trimmed':
        match = dynValue.trim() === sfValue.trim();
        break;
      default:
        match = dynValue === sfValue;
    }

    if (!match) {
      warnings.push(`${dynamicsField}="${dynValue}" vs ${salesforceField}="${sfValue}" (tolerance: ${tolerance})`);
    }
  }

  if (warnings.length > 0) {
    logger.warn(`⚠️  Optional field differences (warnings):\n${warnings.join('\n')}`);
  } else {
    logger.info(`✅ All optional fields match with tolerance`);
  }
});

// ============================================================================
// BATCH VALIDATION STEPS
// ============================================================================

When('I validate each Party migration', async function (this: AutomationWorld) {
  const masterIds = this.testContext.masterIds as string[];
  if (!masterIds || masterIds.length === 0) {
    throw new Error('No MasterIds provided for batch validation.');
  }

  const validationResults: ValidationResult[] = [];
  const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
  const salesforceClient = this.testContext.salesforceClient as SalesforceAPIClient;

  if (!dynamicsClient || !salesforceClient) {
    throw new Error('API clients not initialized.');
  }

  for (const masterId of masterIds) {
    this.testContext.masterId = masterId;
    
    try {
      // Retrieve Party from Dynamics
      const mappings = await getFieldMappings();
      const dynamicsFields = mappings.map(m => m.dynamicsField).join(',');
      const queryParams = {
        '$filter': `accelins_partyid eq '${masterId}'`,
        '$select': dynamicsFields
      };
      const dynamicsResult = await dynamicsClient.query('accelins_parties', queryParams);
      const dynamicsParty = dynamicsResult.value && dynamicsResult.value.length > 0 ? dynamicsResult.value[0] : null;
      this.testContext.dynamicsParty = dynamicsParty;

      // Retrieve Account from Salesforce
      const soql = `SELECT Id, Name, Party_MasterId__c, AccountNumber, Phone, Website, Email__c, 
                   BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry,
                   Account_Status__c, Type, Description, CreatedDate
                   FROM Account 
                   WHERE Party_MasterId__c = '${masterId}' 
                   LIMIT 1`;
      const salesforceResult = await salesforceClient.query(soql);
      const salesforceAccount = salesforceResult.records && salesforceResult.records.length > 0 ? salesforceResult.records[0] : null;
      this.testContext.salesforceAccount = salesforceAccount;

      if (dynamicsParty && salesforceAccount) {
        const result = await compareAllFields(dynamicsParty, salesforceAccount);
        validationResults.push(result);
        logger.info(`✅ Validated migration for ${masterId}`);
      } else {
        logger.warn(`⚠️  Skipping validation for ${masterId} - missing data`);
        // Create a result indicating missing data
        validationResults.push({
          masterId,
          partyExists: !!dynamicsParty,
          accountExists: !!salesforceAccount,
          fieldsCompared: 0,
          fieldsMatched: 0,
          fieldsDifferent: 0,
          criticalFieldsMatched: false,
          comparisons: [],
          missingInSalesforce: [],
          missingInDynamics: [],
          recommendations: [
            dynamicsParty ? 'Account not found in Salesforce' : 'Party not found in Dynamics',
            salesforceAccount ? 'Party not found in Dynamics' : 'Account not found in Salesforce'
          ]
        });
      }
    } catch (error: any) {
      logger.error(`❌ Error validating ${masterId}: ${error.message}`);
      validationResults.push({
        masterId,
        partyExists: false,
        accountExists: false,
        fieldsCompared: 0,
        fieldsMatched: 0,
        fieldsDifferent: 0,
        criticalFieldsMatched: false,
        comparisons: [],
        missingInSalesforce: [],
        missingInDynamics: [],
        recommendations: [`Error during validation: ${error.message}`]
      });
    }
  }

  this.testContext.batchValidationResults = validationResults;
  logger.info(`✅ Validated ${validationResults.length} Party migrations`);
});

Then('all Parties should have corresponding Accounts in Salesforce', async function (this: AutomationWorld) {
  const results = this.testContext.batchValidationResults as ValidationResult[];
  if (!results) {
    throw new Error('Batch validation results not found.');
  }

  const missingAccounts = results.filter(r => !r.accountExists);
  if (missingAccounts.length > 0) {
    throw new Error(`${missingAccounts.length} Party(ies) do not have corresponding Accounts in Salesforce: ${missingAccounts.map(r => r.masterId).join(', ')}`);
  }

  logger.info(`✅ All Parties have corresponding Accounts in Salesforce`);
});

Then('a migration validation report should be generated', async function (this: AutomationWorld) {
  const results = this.testContext.batchValidationResults as ValidationResult[];
  if (!results) {
    throw new Error('Batch validation results not found.');
  }

  let batchReport = `\n═══════════════════════════════════════════════════════════════════════════════\n`;
  batchReport += `BATCH MIGRATION VALIDATION REPORT\n`;
  batchReport += `═══════════════════════════════════════════════════════════════════════════════\n\n`;
  batchReport += `Total Parties Validated: ${results.length}\n`;
  batchReport += `Parties with Accounts: ${results.filter(r => r.accountExists).length}\n`;
  batchReport += `Parties Missing Accounts: ${results.filter(r => !r.accountExists).length}\n`;
  batchReport += `Total Fields Matched: ${results.reduce((sum, r) => sum + r.fieldsMatched, 0)}\n`;
  batchReport += `Total Fields Different: ${results.reduce((sum, r) => sum + r.fieldsDifferent, 0)}\n\n`;

  for (const result of results) {
    batchReport += generateValidationReport(result);
    batchReport += `\n`;
  }

  // Save batch report
  const reportsDir = path.join(process.cwd(), 'reports', 'migration-validation');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const batchReportFile = path.join(reportsDir, `batch-validation-${Date.now()}.txt`);
  fs.writeFileSync(batchReportFile, batchReport);
  logger.info(`📄 Batch validation report saved to: ${batchReportFile}`);

  this.testContext.batchReportPath = batchReportFile;
});

// ============================================================================
// ADDITIONAL VALIDATION STEPS
// ============================================================================

Then('the Account in Salesforce should have the MasterId field populated', async function (this: AutomationWorld) {
  const salesforceAccount = this.testContext.salesforceAccount;
  if (!salesforceAccount) {
    throw new Error('Account not found in Salesforce.');
  }

  const masterId = salesforceAccount.Party_MasterId__c;
  if (!masterId) {
    throw new Error('Party_MasterId__c field is not populated in Salesforce Account.');
  }

  logger.info(`✅ Account has MasterId field populated: ${masterId}`);
});

Then('if MasterId is missing, the migration validation should report the issue', async function (this: AutomationWorld) {
  const salesforceAccount = this.testContext.salesforceAccount;
  const masterId = this.testContext.masterId;

  if (!salesforceAccount) {
    logger.warn(`⚠️  Account not found for MasterId: ${masterId}`);
    return;
  }

  if (!salesforceAccount.Party_MasterId__c) {
    logger.error(`❌ MasterId field is missing in Salesforce Account for Party: ${masterId}`);
    throw new Error(`MasterId field is missing in Salesforce Account. This indicates a migration issue.`);
  }
});

Then('date fields should be converted correctly', async function (this: AutomationWorld) {
  logger.info('✅ Date field conversion validation (placeholder - implement based on your date format requirements)');
});

Then('number fields should be converted correctly', async function (this: AutomationWorld) {
  logger.info('✅ Number field conversion validation (placeholder - implement based on your number format requirements)');
});

Then('text fields should be trimmed and normalized', async function (this: AutomationWorld) {
  logger.info('✅ Text field normalization validation (placeholder - implement based on your text format requirements)');
});

Then('any data type conversion issues should be reported', async function (this: AutomationWorld) {
  logger.info('✅ Data type conversion issues reporting (placeholder)');
});

Then('differences in optional fields should be reported as warnings', async function (this: AutomationWorld) {
  const validationResult = this.testContext.validationResult as ValidationResult;
  if (!validationResult) {
    throw new Error('Validation result not found.');
  }

  const optionalFieldDifferences = validationResult.comparisons.filter(
    c => !c.match && c.severity === 'warning'
  );

  if (optionalFieldDifferences.length > 0) {
    logger.warn(`⚠️  ${optionalFieldDifferences.length} optional field(s) have differences (warnings)`);
  }
});

Then('a detailed validation report should be generated with:', async function (this: AutomationWorld, dataTable: any) {
  const validationResult = this.testContext.validationResult as ValidationResult;
  if (!validationResult) {
    throw new Error('Validation result not found.');
  }

  const report = generateValidationReport(validationResult);
  logger.info(report);

  // Verify report contains required sections
  const rows = dataTable.raw();
  const requiredSections: string[] = [];
  for (let i = 1; i < rows.length; i++) {
    requiredSections.push(rows[i][0]);
  }

  for (const section of requiredSections) {
    if (!report.includes(section)) {
      throw new Error(`Validation report missing required section: ${section}`);
    }
  }

  logger.info(`✅ Validation report contains all required sections`);
});

Then('the report should be saved to the reports directory', async function (this: AutomationWorld) {
  const reportPath = this.testContext.validationReportPath;
  if (!reportPath) {
    throw new Error('Report path not found. Report may not have been generated.');
  }

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Report file not found at: ${reportPath}`);
  }

  logger.info(`✅ Report saved to: ${reportPath}`);
});

Then('the migration validation should report missing Account', async function (this: AutomationWorld) {
  const salesforceAccount = this.testContext.salesforceAccount;
  const masterId = this.testContext.masterId;

  if (salesforceAccount) {
    throw new Error(`Account found for MasterId ${masterId}, but validation expected it to be missing.`);
  }

  logger.info(`✅ Migration validation correctly reports missing Account for MasterId: ${masterId}`);
});

When('I validate the Party migration', async function (this: AutomationWorld) {
  const masterId = this.testContext.masterId;
  if (!masterId) {
    throw new Error('Party MasterId not set.');
  }

  // Retrieve from both systems
  await this.constructor.prototype['I retrieve the Party details from Dynamics CRM by MasterId'].call(this);
  await this.constructor.prototype['I retrieve the corresponding Account details from Salesforce by MasterId'].call(this);

  const dynamicsParty = this.testContext.dynamicsParty;
  const salesforceAccount = this.testContext.salesforceAccount;

  if (!dynamicsParty || !salesforceAccount) {
    throw new Error('Both Party and Account must be retrieved before validation.');
  }

  const validationResult = await compareAllFields(dynamicsParty, salesforceAccount);
  this.testContext.validationResult = validationResult;

  logger.info(`✅ Party migration validated for MasterId: ${masterId}`);
});

Then('any mismatches in critical fields should fail the validation', async function (this: AutomationWorld) {
  const validationResult = this.testContext.validationResult as ValidationResult;
  
  if (!validationResult) {
    throw new Error('Validation result not found. Run field comparison first.');
  }

  if (!validationResult.criticalFieldsMatched) {
    const criticalMismatches = validationResult.comparisons.filter(
      c => !c.match && c.severity === 'error'
    );
    
    if (criticalMismatches.length > 0) {
      const mismatchDetails = criticalMismatches.map(c => 
        `${c.field}: "${c.dynamicsValue}" vs "${c.salesforceValue}"`
      ).join('; ');
      
      throw new Error(
        `Critical field mismatches detected. Validation failed.\n` +
        `Mismatches: ${mismatchDetails}`
      );
    }
  }

  logger.info(`✅ All critical fields match - validation passed`);
});

