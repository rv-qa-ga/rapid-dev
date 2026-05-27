/**
 * Account Comparison Validator
 * 
 * Compares a Salesforce Account record with its corresponding Dynamics Party record
 * by querying both systems and comparing all mapped fields.
 */

import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { getFieldMappings, FieldMapping } from './migration-field-mapper';
import { logger } from './logger';
import { APIRequestContext } from '@playwright/test';

export interface SalesforceAccount {
  Id: string;
  Name?: string;
  Party_MasterId__c?: string;
  [fieldName: string]: any;
}

export interface DynamicsParty {
  accelins_partyid?: string;
  accelins_name?: string;
  [fieldName: string]: any;
}

export interface FieldComparison {
  dynamicsField: string;
  salesforceField: string;
  dynamicsValue: any;
  salesforceValue: any;
  match: boolean;
  difference?: string;
  severity: 'error' | 'warning' | 'info' | 'skip';
}

export interface ComparisonResult {
  accountId: string;
  partyId: string | null;
  accountFound: boolean;
  partyFound: boolean;
  accountRecord: SalesforceAccount | null;
  partyRecord: DynamicsParty | null;
  fieldsCompared: number;
  fieldsMatched: number;
  fieldsDifferent: number;
  fieldsSkipped: number;
  criticalFieldsMatched: boolean;
  comparisons: FieldComparison[];
  errors: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Account Comparison Validator
 */
export class AccountComparisonValidator {
  private salesforceClient: SalesforceAPIClient;
  private dynamicsClient: DynamicsAPIClient;
  private fieldMappings: FieldMapping[] = [];

  constructor(apiContext: APIRequestContext) {
    this.salesforceClient = new SalesforceAPIClient(apiContext);
    this.dynamicsClient = new DynamicsAPIClient(apiContext);
  }

  /**
   * Load field mappings
   */
  async loadFieldMappings(): Promise<void> {
    logger.info('📖 Loading field mappings...');
    this.fieldMappings = await getFieldMappings();
    logger.info(`✅ Loaded ${this.fieldMappings.length} field mappings`);
  }

  /**
   * Authenticate with Salesforce
   */
  async authenticateSalesforce(): Promise<void> {
    logger.info('🔐 Authenticating with Salesforce...');
    await this.salesforceClient.authenticate();
    logger.info('✅ Authenticated with Salesforce');
    
    // Test API access by describing Account object
    try {
      logger.debug('Testing API access by describing Account object...');
      await this.salesforceClient.describeSObject('Account');
      logger.debug('✅ API access verified');
    } catch (describeError: any) {
      logger.warn(`⚠️  Could not describe Account object: ${describeError.message}`);
      logger.warn(`   This might indicate an API version or permissions issue`);
    }
  }

  /**
   * Authenticate with Dynamics
   */
  async authenticateDynamics(): Promise<void> {
    logger.info('🔐 Authenticating with Dynamics (Dataverse)...');
    await this.dynamicsClient.authenticate();
    logger.info('✅ Authenticated with Dynamics');
  }

  /**
   * Get Salesforce Account by ID
   */
  async getAccountById(accountId: string): Promise<SalesforceAccount | null> {
    try {
      // Try SOQL query first (more reliable than REST endpoint in some cases)
      logger.debug(`Trying SOQL query first...`);
      // Try with PTY_Code__c first (as seen in test output), fallback to Party_MasterId__c
      let simpleSoql = `SELECT Id, Name, PTY_Code__c FROM Account WHERE Id = '${accountId.replace(/'/g, "\\'")}' LIMIT 1`;
      let testResult: Awaited<ReturnType<SalesforceAPIClient['query']>>;

      try {
        testResult = await this.salesforceClient.query(simpleSoql);
        
        if (testResult.records && testResult.records.length > 0) {
          logger.info(`Account found via SOQL query, fetching all fields...`);
          // If SOQL works, use it for the full query
          return await this.getAccountByIdViaQuery(accountId);
        } else {
          logger.warn(`Account ${accountId} not found via SOQL query (no records returned)`);
          return null;
        }
      } catch (queryError: any) {
        // If PTY_Code__c fails, try Party_MasterId__c
        if (queryError.message.includes('No such column') && queryError.message.includes('PTY_Code__c')) {
          logger.debug(`PTY_Code__c not found, trying Party_MasterId__c...`);
          simpleSoql = `SELECT Id, Name, Party_MasterId__c FROM Account WHERE Id = '${accountId.replace(/'/g, "\\'")}' LIMIT 1`;
          try {
            testResult = await this.salesforceClient.query(simpleSoql);
            if (testResult.records && testResult.records.length > 0) {
              logger.info(`Account found via SOQL query, fetching all fields...`);
              return await this.getAccountByIdViaQuery(accountId);
            }
          } catch (retryError: any) {
            logger.error(`Both PTY_Code__c and Party_MasterId__c queries failed`);
            logger.error(`Error: ${retryError.message}`);
            return null;
          }
        }
        
        // Check if it's a 404 - might be API version issue
        if (queryError.message.includes('NOT_FOUND') || queryError.message.includes('404')) {
          logger.error(`API endpoint returned 404. This might indicate:`);
          logger.error(`  1. API version issue - try checking available versions`);
          logger.error(`  2. Account ID format issue`);
          logger.error(`  3. Permissions issue`);
          logger.error(`Error details: ${queryError.message}`);
        } else {
          logger.warn(`SOQL query failed: ${queryError.message}`);
        }
        return null;
      }

      // If getRecord works, get all fields using getRecordWithFields
      const invalidFieldNames = ['N/A', 'None', 'NONE', 'n/a', 'none', '', ' '];
      const salesforceFields = this.fieldMappings
        .map(m => m.salesforceField)
        .filter(field => field && field !== 'Id' && field !== 'Name') // Exclude Id and Name (we add them separately)
        .filter(field => !invalidFieldNames.includes(field.trim()))
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .slice(0, 100); // Limit to 100 fields

      // Build fields list, ensuring no duplicates
      // Try PTY_Code__c first (as seen in test output), then Party_MasterId__c
      const partyIdFields = ['PTY_Code__c', 'Party_MasterId__c'];
      const allFields = ['Id', 'Name', ...partyIdFields, ...salesforceFields];
      const uniqueFields = Array.from(new Set(allFields)); // Final deduplication

      // Try getRecordWithFields first
      try {
        const result = await this.salesforceClient.getRecordWithFields('Account', accountId, uniqueFields);
        if (result && result.Id) {
          return result as SalesforceAccount;
        }
      } catch (getFieldsError: any) {
        logger.warn(`getRecordWithFields failed: ${getFieldsError.message}, falling back to SOQL query`);
        // Fall back to SOQL query
        return await this.getAccountByIdViaQuery(accountId);
      }

      return null;
    } catch (error: any) {
      logger.error(`Error querying Account ${accountId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Salesforce Account by ID using SOQL query (fallback method)
   */
  private async getAccountByIdViaQuery(accountId: string): Promise<SalesforceAccount | null> {
    try {
      const invalidFieldNames = ['N/A', 'None', 'NONE', 'n/a', 'none', '', ' '];
      const salesforceFields = this.fieldMappings
        .map(m => m.salesforceField)
        .filter(field => field && field !== 'Id' && field !== 'Name')
        .filter(field => !invalidFieldNames.includes(field.trim()))
        .filter((value, index, self) => self.indexOf(value) === index)
        .slice(0, 100);

      // Try PTY_Code__c first (as seen in test output), then Party_MasterId__c
      const partyIdFields = ['PTY_Code__c', 'Party_MasterId__c'];
      const allFields = ['Id', 'Name', ...partyIdFields, ...salesforceFields];
      const uniqueFields = Array.from(new Set(allFields));
      const fieldsList = uniqueFields.join(', ');

      let soql = `SELECT ${fieldsList} FROM Account WHERE Id = '${accountId.replace(/'/g, "\\'")}' LIMIT 1`;
      
      try {
        const result = await this.salesforceClient.query(soql);

        if (result.totalSize > 0 && result.records && result.records.length > 0) {
          return result.records[0] as SalesforceAccount;
        }

        return null;
      } catch (queryError: any) {
        // If PTY_Code__c fails, try without it
        if (queryError.message.includes('No such column') && queryError.message.includes('PTY_Code__c')) {
          logger.debug(`PTY_Code__c not found, trying without it...`);
          const fieldsWithoutPTY = uniqueFields.filter(f => f !== 'PTY_Code__c');
          const fieldsList2 = fieldsWithoutPTY.join(', ');
          soql = `SELECT ${fieldsList2} FROM Account WHERE Id = '${accountId.replace(/'/g, "\\'")}' LIMIT 1`;
          const result2 = await this.salesforceClient.query(soql);
          if (result2.totalSize > 0 && result2.records && result2.records.length > 0) {
            return result2.records[0] as SalesforceAccount;
          }
        }
        throw queryError;
      }
    } catch (error: any) {
      logger.error(`Error querying Account via SOQL ${accountId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get Dynamics Party by Party ID (using Dataverse API)
   */
  async getPartyById(partyId: string): Promise<DynamicsParty | null> {
    try {
      // Build $select parameter with all mapped Dynamics fields
      const dynamicsFields = this.fieldMappings
        .map(m => m.dynamicsField)
        .filter(field => field)
        .filter((value, index, self) => self.indexOf(value) === index);

      // Always include key fields
      const requiredFields = ['accelins_partyid', 'accelins_name', 'accelins_partymasterid'];
      const allFields = [...new Set([...requiredFields, ...dynamicsFields])];

      const selectFields = allFields.join(',');

      // Query Dynamics using OData API
      const queryParams = {
        '$filter': `accelins_partyid eq '${partyId.replace(/'/g, "''")}'`,
        '$select': selectFields
      };

      const result = await this.dynamicsClient.query('accelins_parties', queryParams);

      if (result.value && result.value.length > 0) {
        return result.value[0] as DynamicsParty;
      }

      return null;
    } catch (error: any) {
      logger.error(`Error querying Party ${partyId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compare field values
   */
  private compareFieldValue(
    dynamicsValue: any,
    salesforceValue: any,
    mapping: FieldMapping
  ): { match: boolean; difference?: string } {
    // Handle null/empty values
    const dynNormalized = dynamicsValue === null || dynamicsValue === undefined ? '' : String(dynamicsValue).trim();
    const sfNormalized = salesforceValue === null || salesforceValue === undefined ? '' : String(salesforceValue).trim();

    // Skip comparison for intentionally blank fields (per migration requirements)
    const intentionallyBlankFields = ['createdon', 'createdby', 'modifiedon', 'accelins_partymasterid', 'ownerid'];
    if (sfNormalized === '' && intentionallyBlankFields.some(field => mapping.dynamicsField.toLowerCase().includes(field.toLowerCase()))) {
      return { match: true }; // These are intentionally blank
    }

    // Apply tolerance based on field type
    switch (mapping.tolerance) {
      case 'exact':
        return {
          match: dynNormalized === sfNormalized,
          difference: dynNormalized !== sfNormalized ? `Dynamics: "${dynNormalized}", Salesforce: "${sfNormalized}"` : undefined
        };

      case 'case-insensitive':
        return {
          match: dynNormalized.toLowerCase() === sfNormalized.toLowerCase(),
          difference: dynNormalized.toLowerCase() !== sfNormalized.toLowerCase()
            ? `Dynamics: "${dynNormalized}", Salesforce: "${sfNormalized}"` : undefined
        };

      case 'trimmed':
        return {
          match: dynNormalized.trim() === sfNormalized.trim(),
          difference: dynNormalized.trim() !== sfNormalized.trim()
            ? `Dynamics: "${dynNormalized}", Salesforce: "${sfNormalized}"` : undefined
        };

      case 'normalized': {
        // Normalize whitespace
        const dynNorm = dynNormalized.replace(/\s+/g, ' ').trim();
        const sfNorm = sfNormalized.replace(/\s+/g, ' ').trim();
        return {
          match: dynNorm === sfNorm,
          difference: dynNorm !== sfNorm ? `Dynamics: "${dynNormalized}", Salesforce: "${sfNormalized}"` : undefined
        };
      }

      default:
        return {
          match: dynNormalized === sfNormalized,
          difference: dynNormalized !== sfNormalized ? `Dynamics: "${dynNormalized}", Salesforce: "${sfNormalized}"` : undefined
        };
    }
  }

  /**
   * Compare Account and Party records
   */
  async compareRecords(
    accountId: string,
    database?: string
  ): Promise<ComparisonResult> {
    const result: ComparisonResult = {
      accountId,
      partyId: null,
      accountFound: false,
      partyFound: false,
      accountRecord: null,
      partyRecord: null,
      fieldsCompared: 0,
      fieldsMatched: 0,
      fieldsDifferent: 0,
      fieldsSkipped: 0,
      criticalFieldsMatched: true,
      comparisons: [],
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    // Step 1: Get Salesforce Account
    logger.info(`\n📋 Step 1: Fetching Salesforce Account ${accountId}...`);
    const account = await this.getAccountById(accountId);

    if (!account) {
      result.errors.push(`Account not found in Salesforce: ${accountId}`);
      return result;
    }

    result.accountFound = true;
    result.accountRecord = account;

    // Step 2: Extract Party ID (try PTY_Code__c first, then Party_MasterId__c)
    const partyId = account.PTY_Code__c || account.Party_MasterId__c;
    if (!partyId) {
      result.errors.push('PTY_Code__c or Party_MasterId__c not found in Account. Account may not be linked to a Party.');
      return result;
    }

    result.partyId = partyId;
    logger.info(`   Found Party ID: ${partyId}`);

    // Step 3: Get Dynamics Party
    logger.info(`\n📋 Step 2: Fetching Dynamics Party ${partyId}...`);
    const party = await this.getPartyById(partyId);

    if (!party) {
      result.errors.push(`Party not found in Dynamics: ${partyId}`);
      return result;
    }

    result.partyFound = true;
    result.partyRecord = party;

    // Step 4: Compare fields
    logger.info(`\n📋 Step 3: Comparing fields...`);
    let criticalFieldsMatched = true;

    for (const mapping of this.fieldMappings) {
      const dynamicsValue = party[mapping.dynamicsField];
      const salesforceValue = account[mapping.salesforceField];

      // Skip if field doesn't exist in either system
      if (dynamicsValue === undefined && salesforceValue === undefined) {
        result.fieldsSkipped++;
        result.comparisons.push({
          dynamicsField: mapping.dynamicsField,
          salesforceField: mapping.salesforceField,
          dynamicsValue: null,
          salesforceValue: null,
          match: true,
          severity: 'skip'
        });
        continue;
      }

      result.fieldsCompared++;

      // Compare values
      const comparison = this.compareFieldValue(dynamicsValue, salesforceValue, mapping);
      const match = comparison.match;

      if (match) {
        result.fieldsMatched++;
      } else {
        result.fieldsDifferent++;
        if (mapping.isCritical) {
          criticalFieldsMatched = false;
          result.errors.push(
            `Critical field mismatch: ${mapping.dynamicsField} → ${mapping.salesforceField}. ${comparison.difference}`
          );
        } else {
          result.warnings.push(
            `Field mismatch: ${mapping.dynamicsField} → ${mapping.salesforceField}. ${comparison.difference}`
          );
        }
      }

      result.comparisons.push({
        dynamicsField: mapping.dynamicsField,
        salesforceField: mapping.salesforceField,
        dynamicsValue: dynamicsValue ?? null,
        salesforceValue: salesforceValue ?? null,
        match,
        difference: comparison.difference,
        severity: mapping.isCritical && !match ? 'error' : !match ? 'warning' : 'info'
      });
    }

    result.criticalFieldsMatched = criticalFieldsMatched;

    logger.info(`   Fields compared: ${result.fieldsCompared}`);
    logger.info(`   Fields matched: ${result.fieldsMatched}`);
    logger.info(`   Fields different: ${result.fieldsDifferent}`);
    logger.info(`   Critical fields matched: ${criticalFieldsMatched ? '✅' : '❌'}`);

    return result;
  }
}
