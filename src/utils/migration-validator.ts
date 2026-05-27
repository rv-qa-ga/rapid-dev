/**
 * Migration Data Validator
 * 
 * Validates migrated data in Salesforce by comparing source CSV data
 * with actual Salesforce Account records.
 */

import * as fs from 'fs';
import * as path from 'path';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceJWTAuth } from './jwt-auth';
import { getFieldMappings, FieldMapping } from './migration-field-mapper';
import { logger } from './logger';
import { APIRequestContext } from '@playwright/test';

export interface CsvRecord {
  [fieldName: string]: string | null;
  accelins_partyid: string; // Primary key for matching
}

export interface SalesforceRecord {
  Id: string;
  [fieldName: string]: any;
}

export interface FieldValidation {
  csvField: string;
  salesforceField: string;
  csvValue: string | null;
  salesforceValue: any;
  match: boolean;
  difference?: string;
  severity: 'error' | 'warning' | 'info' | 'skip';
}

export interface RecordValidation {
  partyId: string;
  csvRowNumber: number;
  csvRecord: CsvRecord;
  salesforceRecord: SalesforceRecord | null;
  found: boolean;
  fieldsValidated: number;
  fieldsMatched: number;
  fieldsDifferent: number;
  fieldsSkipped: number;
  validations: FieldValidation[];
  errors: string[];
  warnings: string[];
}

export interface ValidationReport {
  csvPath: string;
  totalRecords: number;
  recordsFound: number;
  recordsNotFound: number;
  totalFieldsValidated: number;
  totalFieldsMatched: number;
  totalFieldsDifferent: number;
  validationRate: number; // percentage
  recordValidations: RecordValidation[];
  summary: {
    byField: Map<string, { matched: number; different: number; notFound: number }>;
    criticalErrors: number;
    warnings: number;
  };
  generatedAt: string;
}

/**
 * Migration Data Validator
 */
export class MigrationValidator {
  private apiClient: SalesforceAPIClient;
  private fieldMappings: FieldMapping[] = [];
  private csvRecords: CsvRecord[] = [];

  constructor(apiContext: APIRequestContext) {
    this.apiClient = new SalesforceAPIClient(apiContext);
  }

  /**
   * Load CSV file and parse records
   */
  async loadCsvFile(csvPath: string): Promise<CsvRecord[]> {
    logger.info(`📖 Loading CSV file: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    // Parse header
    const headers = this.parseCsvLine(lines[0]);
    logger.debug(`Found ${headers.length} columns: ${headers.join(', ')}`);

    // Parse data rows
    const records: CsvRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      const record: CsvRecord = {} as CsvRecord;

      headers.forEach((header, index) => {
        const value = values[index] || '';
        // Convert empty strings to null for consistency
        record[header] = value.trim() === '' ? null : value.trim();
      });

      // Ensure accelins_partyid exists (required for matching)
      if (!record.accelins_partyid) {
        logger.warn(`Row ${i + 1}: Missing accelins_partyid, skipping`);
        continue;
      }

      records.push(record);
    }

    logger.info(`✅ Loaded ${records.length} records from CSV`);
    this.csvRecords = records;
    return records;
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
  async authenticate(): Promise<void> {
    logger.info('🔐 Authenticating with Salesforce...');
    await this.apiClient.authenticate();
    logger.info('✅ Authenticated successfully');
  }

  /**
   * Find Salesforce Account record by Party ID
   */
  async findAccountByPartyId(partyId: string): Promise<SalesforceRecord | null> {
    try {
      // Query by Party_MasterId__c (external ID)
      const soql = `SELECT Id, Name, Party_MasterId__c, ${this.getSalesforceFieldsForQuery()} 
                     FROM Account 
                     WHERE Party_MasterId__c = '${partyId.replace(/'/g, "\\'")}' 
                     LIMIT 1`;

      const result = await this.apiClient.query(soql);

      if (result.totalSize > 0 && result.records && result.records.length > 0) {
        return result.records[0] as SalesforceRecord;
      }

      return null;
    } catch (error: any) {
      logger.error(`Error querying Account for Party ID ${partyId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all Salesforce field names for SOQL query
   */
  private getSalesforceFieldsForQuery(): string {
    const fields = this.fieldMappings
      .map(m => m.salesforceField)
      .filter(field => field && field !== 'Id' && field !== 'Name') // Id and Name are always included
      .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      .map(field => field.replace(/[^a-zA-Z0-9_]/g, '_')); // Sanitize field names

    // Limit to reasonable number of fields (Salesforce has limits)
    // If too many, we'll query in batches or use a more targeted approach
    return fields.slice(0, 100).join(', ');
  }

  /**
   * Compare CSV value with Salesforce value
   */
  private compareFieldValue(
    csvValue: string | null,
    salesforceValue: any,
    mapping: FieldMapping
  ): { match: boolean; difference?: string } {
    // Handle null/empty values
    const csvNormalized = csvValue === null || csvValue === undefined ? '' : String(csvValue).trim();
    const sfNormalized = salesforceValue === null || salesforceValue === undefined ? '' : String(salesforceValue).trim();

    // Skip comparison for intentionally blank fields (per migration requirements)
    const intentionallyBlankFields = ['createdon', 'createdby', 'modifiedon', 'accelins_partymasterid', 'ownerid'];
    if (csvNormalized === '' && intentionallyBlankFields.some(field => mapping.dynamicsField.toLowerCase().includes(field.toLowerCase()))) {
      return { match: true }; // These are intentionally blank per requirements
    }

    // Apply tolerance based on field type
    switch (mapping.tolerance) {
      case 'exact':
        return {
          match: csvNormalized === sfNormalized,
          difference: csvNormalized !== sfNormalized ? `Expected: "${csvNormalized}", Got: "${sfNormalized}"` : undefined
        };

      case 'case-insensitive':
        return {
          match: csvNormalized.toLowerCase() === sfNormalized.toLowerCase(),
          difference: csvNormalized.toLowerCase() !== sfNormalized.toLowerCase() 
            ? `Expected: "${csvNormalized}", Got: "${sfNormalized}"` : undefined
        };

      case 'trimmed':
        return {
          match: csvNormalized.trim() === sfNormalized.trim(),
          difference: csvNormalized.trim() !== sfNormalized.trim()
            ? `Expected: "${csvNormalized}", Got: "${sfNormalized}"` : undefined
        };

      case 'normalized': {
        // Normalize whitespace
        const csvNorm = csvNormalized.replace(/\s+/g, ' ').trim();
        const sfNorm = sfNormalized.replace(/\s+/g, ' ').trim();
        return {
          match: csvNorm === sfNorm,
          difference: csvNorm !== sfNorm ? `Expected: "${csvNormalized}", Got: "${salesforceValue}"` : undefined
        };
      }

      default:
        return {
          match: csvNormalized === sfNormalized,
          difference: csvNormalized !== sfNormalized ? `Expected: "${csvNormalized}", Got: "${sfNormalized}"` : undefined
        };
    }
  }

  /**
   * Validate a single record
   */
  async validateRecord(csvRecord: CsvRecord, rowNumber: number): Promise<RecordValidation> {
    const partyId = csvRecord.accelins_partyid;
    const validation: RecordValidation = {
      partyId,
      csvRowNumber: rowNumber,
      csvRecord,
      salesforceRecord: null,
      found: false,
      fieldsValidated: 0,
      fieldsMatched: 0,
      fieldsDifferent: 0,
      fieldsSkipped: 0,
      validations: [],
      errors: [],
      warnings: []
    };

    // Find Salesforce record
    const sfRecord = await this.findAccountByPartyId(partyId);

    if (!sfRecord) {
      validation.errors.push(`Account not found in Salesforce for Party ID: ${partyId}`);
      return validation;
    }

    validation.salesforceRecord = sfRecord;
    validation.found = true;

    // Validate each mapped field
    for (const mapping of this.fieldMappings) {
      const csvValue = csvRecord[mapping.dynamicsField];
      const sfValue = sfRecord[mapping.salesforceField];

      // Skip if field is not in CSV (optional fields)
      // Also skip if CSV value is null/empty and field is not critical
      if (csvValue === undefined || (csvValue === null && !mapping.isCritical)) {
        validation.fieldsSkipped++;
        validation.validations.push({
          csvField: mapping.dynamicsField,
          salesforceField: mapping.salesforceField,
          csvValue: csvValue || null,
          salesforceValue: sfValue,
          match: true,
          severity: 'skip'
        });
        continue;
      }

      validation.fieldsValidated++;

      // Compare values
      const comparison = this.compareFieldValue(csvValue, sfValue, mapping);
      const match = comparison.match;

      if (match) {
        validation.fieldsMatched++;
      } else {
        validation.fieldsDifferent++;
        if (mapping.isCritical) {
          validation.errors.push(
            `Critical field mismatch: ${mapping.dynamicsField} → ${mapping.salesforceField}. ${comparison.difference}`
          );
        } else {
          validation.warnings.push(
            `Field mismatch: ${mapping.dynamicsField} → ${mapping.salesforceField}. ${comparison.difference}`
          );
        }
      }

      validation.validations.push({
        csvField: mapping.dynamicsField,
        salesforceField: mapping.salesforceField,
        csvValue,
        salesforceValue: sfValue,
        match,
        difference: comparison.difference,
        severity: mapping.isCritical && !match ? 'error' : !match ? 'warning' : 'info'
      });
    }

    return validation;
  }

  /**
   * Validate all records
   */
  async validateAllRecords(): Promise<ValidationReport> {
    if (this.csvRecords.length === 0) {
      throw new Error('No CSV records loaded. Call loadCsvFile() first.');
    }

    if (this.fieldMappings.length === 0) {
      throw new Error('No field mappings loaded. Call loadFieldMappings() first.');
    }

    logger.info(`\n🔍 Starting validation of ${this.csvRecords.length} records...`);

    const recordValidations: RecordValidation[] = [];
    let recordsFound = 0;
    let recordsNotFound = 0;
    let totalFieldsValidated = 0;
    let totalFieldsMatched = 0;
    let totalFieldsDifferent = 0;

    const fieldStats = new Map<string, { matched: number; different: number; notFound: number }>();

    // Initialize field stats
    this.fieldMappings.forEach(mapping => {
      fieldStats.set(mapping.salesforceField, { matched: 0, different: 0, notFound: 0 });
    });

    // Validate each record
    for (let i = 0; i < this.csvRecords.length; i++) {
      const csvRecord = this.csvRecords[i];
      logger.info(`Validating record ${i + 1}/${this.csvRecords.length}: ${csvRecord.accelins_partyid || 'N/A'}`);

      const validation = await this.validateRecord(csvRecord, i + 2); // +2 for header and 1-based row numbers
      recordValidations.push(validation);

      if (validation.found) {
        recordsFound++;
        totalFieldsValidated += validation.fieldsValidated;
        totalFieldsMatched += validation.fieldsMatched;
        totalFieldsDifferent += validation.fieldsDifferent;

        // Update field-level stats
        validation.validations.forEach(fv => {
          if (fv.severity !== 'skip') {
            const stats = fieldStats.get(fv.salesforceField) || { matched: 0, different: 0, notFound: 0 };
            if (fv.match) {
              stats.matched++;
            } else {
              stats.different++;
            }
            fieldStats.set(fv.salesforceField, stats);
          }
        });
      } else {
        recordsNotFound++;
        // Mark all fields as not found
        this.fieldMappings.forEach(mapping => {
          const stats = fieldStats.get(mapping.salesforceField) || { matched: 0, different: 0, notFound: 0 };
          stats.notFound++;
          fieldStats.set(mapping.salesforceField, stats);
        });
      }
    }

    // Calculate validation rate
    const validationRate = totalFieldsValidated > 0
      ? (totalFieldsMatched / totalFieldsValidated) * 100
      : 0;

    // Count critical errors and warnings
    let criticalErrors = 0;
    let warnings = 0;
    recordValidations.forEach(rv => {
      criticalErrors += rv.errors.length;
      warnings += rv.warnings.length;
    });

    const report: ValidationReport = {
      csvPath: '', // Will be set by caller
      totalRecords: this.csvRecords.length,
      recordsFound,
      recordsNotFound,
      totalFieldsValidated,
      totalFieldsMatched,
      totalFieldsDifferent,
      validationRate,
      recordValidations,
      summary: {
        byField: fieldStats,
        criticalErrors,
        warnings
      },
      generatedAt: new Date().toISOString()
    };

    logger.info(`\n✅ Validation complete!`);
    logger.info(`   Records found: ${recordsFound}/${this.csvRecords.length}`);
    logger.info(`   Fields matched: ${totalFieldsMatched}/${totalFieldsValidated} (${validationRate.toFixed(2)}%)`);
    logger.info(`   Critical errors: ${criticalErrors}`);
    logger.info(`   Warnings: ${warnings}`);

    return report;
  }

  /**
   * Parse CSV line (handles quoted values, commas, etc.)
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    values.push(current);
    return values;
  }
}
