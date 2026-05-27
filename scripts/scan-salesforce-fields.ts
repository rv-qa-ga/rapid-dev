/**
 * Salesforce Field Scanner
 * 
 * Scans the Salesforce QA org to extract field metadata for specified objects.
 * Outputs field configurations compatible with the FieldRegistry pattern.
 * 
 * Usage:
 *   npm run scan:fields
 *   npm run scan:fields -- --object Account
 *   npm run scan:fields -- --all
 */

import { config } from '../src/config/config';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface SalesforceField {
  name: string;
  label: string;
  type: string;
  length?: number;
  precision?: number;
  scale?: number;
  picklistValues?: Array<{ value: string; label: string; active: boolean }>;
  referenceTo?: string[];
  nillable: boolean;
  createable: boolean;
  updateable: boolean;
  custom: boolean;
  defaultValue?: any;
  calculated?: boolean;
  unique?: boolean;
  externalId?: boolean;
}

interface FieldConfig {
  label: string;
  apiName: string;
  type: string;
  required: boolean;
  validValues?: string[];
  defaultValue?: string;
  referenceTo?: string;
  aliases?: string[];
}

// Map Salesforce field types to our FieldRegistry types
function mapFieldType(sfType: string, picklistValues?: any[]): string {
  const typeMap: Record<string, string> = {
    'string': 'text',
    'textarea': 'textarea',
    'boolean': 'checkbox',
    'date': 'date',
    'datetime': 'datetime',
    'currency': 'currency',
    'double': 'number',
    'int': 'number',
    'percent': 'number',
    'phone': 'phone',
    'email': 'email',
    'url': 'url',
    'reference': 'lookup',
    'picklist': 'combobox',
    'multipicklist': 'combobox',  // Changed: multiselect fields are now single-select picklists
    'id': 'text',
    'address': 'text',
    'location': 'text',
    'encryptedstring': 'text',
    'base64': 'text',
    'time': 'text',
  };
  
  // If it's a string with picklist values, treat as combobox
  if (sfType === 'string' && picklistValues && picklistValues.length > 0) {
    return 'picklist';
  }
  
  return typeMap[sfType] || 'text';
}

// Convert field to FieldConfig format
function toFieldConfig(field: SalesforceField): FieldConfig {
  const config: FieldConfig = {
    label: field.label,
    apiName: field.name,
    type: mapFieldType(field.type, field.picklistValues),
    required: !field.nillable && field.createable,
  };
  
  // Add picklist values if available
  if (field.picklistValues && field.picklistValues.length > 0) {
    config.validValues = field.picklistValues
      .filter(pv => pv.active)
      .map(pv => pv.value);
  }
  
  // Add reference object for lookups
  if (field.referenceTo && field.referenceTo.length > 0) {
    config.referenceTo = field.referenceTo[0];
  }
  
  // Add default value if present
  if (field.defaultValue !== null && field.defaultValue !== undefined) {
    config.defaultValue = String(field.defaultValue);
  }
  
  return config;
}

// Generate TypeScript code for FieldRegistry
function generateRegistryCode(objectName: string, fields: FieldConfig[]): string {
  const lines: string[] = [];
  lines.push(`// ═══════════════════════════════════════════════════════════════════════════`);
  lines.push(`// ${objectName.toUpperCase()} FIELDS - Auto-generated from Salesforce describe`);
  lines.push(`// ═══════════════════════════════════════════════════════════════════════════`);
  lines.push('');
  
  for (const field of fields) {
    const validValuesStr = field.validValues 
      ? `validValues: [${field.validValues.map(v => `'${v.replace(/'/g, "\\'")}'`).join(', ')}],`
      : '';
    const defaultStr = field.defaultValue ? `defaultValue: '${field.defaultValue}',` : '';
    const refStr = field.referenceTo ? `referenceTo: '${field.referenceTo}',` : '';
    
    lines.push(`  // ${field.label}`);
    lines.push(`  '${field.label}': {`);
    lines.push(`    label: '${field.label}',`);
    lines.push(`    apiName: '${field.apiName}',`);
    lines.push(`    type: '${field.type}',`);
    lines.push(`    required: ${field.required},`);
    if (validValuesStr) lines.push(`    ${validValuesStr}`);
    if (defaultStr) lines.push(`    ${defaultStr}`);
    if (refStr) lines.push(`    ${refStr}`);
    lines.push(`  },`);
    lines.push('');
  }
  
  return lines.join('\n');
}

async function describeObject(
  accessToken: string, 
  instanceUrl: string, 
  objectName: string
): Promise<SalesforceField[]> {
  const url = `${instanceUrl}/services/data/v59.0/sobjects/${objectName}/describe`;
  
  logger.info(`📡 Fetching ${objectName} field metadata...`);
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  return response.data.fields as SalesforceField[];
}

async function scanFields(objectNames: string[]) {
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  logger.info('  SALESFORCE FIELD SCANNER');
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  
  // Authenticate
  logger.info('🔐 Authenticating to Salesforce...');
  const authResult = await SalesforceJWTAuth.authenticate();
  logger.info(`✅ Authenticated to: ${authResult.instanceUrl}`);
  
  const allResults: Record<string, FieldConfig[]> = {};
  
  for (const objectName of objectNames) {
    try {
      const fields = await describeObject(
        authResult.accessToken, 
        authResult.instanceUrl, 
        objectName
      );
      
      logger.info(`✅ Found ${fields.length} fields for ${objectName}`);
      
      // Convert to FieldConfig and filter out system/non-useful fields
      const fieldConfigs = fields
        .filter(f => f.updateable || f.createable) // Only editable fields
        .filter(f => !f.name.endsWith('__r')) // Skip relationship fields
        .filter(f => !['Id', 'CreatedDate', 'LastModifiedDate', 'SystemModstamp', 'CreatedById', 'LastModifiedById', 'IsDeleted'].includes(f.name))
        .map(toFieldConfig)
        .sort((a, b) => a.label.localeCompare(b.label));
      
      allResults[objectName] = fieldConfigs;
      
      // Log summary
      const customFields = fieldConfigs.filter(f => f.apiName.endsWith('__c')).length;
      const standardFields = fieldConfigs.length - customFields;
      logger.info(`   📊 Standard: ${standardFields}, Custom: ${customFields}`);
      
    } catch (error: any) {
      logger.error(`❌ Error scanning ${objectName}: ${error.message}`);
    }
  }
  
  // Save results
  const outputDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save JSON
  const jsonPath = path.join(outputDir, 'salesforce-field-metadata.json');
  fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2));
  logger.info(`\n📄 JSON output saved to: ${jsonPath}`);
  
  // Generate TypeScript code
  const tsLines: string[] = ['/**', ' * Auto-generated Salesforce Field Configurations', ' * Run: npm run scan:fields', ' */', ''];
  
  for (const [objectName, fields] of Object.entries(allResults)) {
    tsLines.push(generateRegistryCode(objectName, fields));
    tsLines.push('');
  }
  
  const tsPath = path.join(outputDir, 'field-registry-config.ts');
  fs.writeFileSync(tsPath, tsLines.join('\n'));
  logger.info(`📄 TypeScript output saved to: ${tsPath}`);
  
  // Print summary
  logger.info('\n═══════════════════════════════════════════════════════════════════════════');
  logger.info('  SUMMARY');
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  
  for (const [objectName, fields] of Object.entries(allResults)) {
    const required = fields.filter(f => f.required).length;
    const picklists = fields.filter(f => f.type === 'combobox' || f.type === 'picklist').length;
    const lookups = fields.filter(f => f.type === 'lookup').length;
    
    logger.info(`\n${objectName}:`);
    logger.info(`   Total fields: ${fields.length}`);
    logger.info(`   Required: ${required}`);
    logger.info(`   Picklists: ${picklists}`);
    logger.info(`   Lookups: ${lookups}`);
  }
  
  logger.info('\n✅ Field scan complete!');
  logger.info('\nNext steps:');
  logger.info('  1. Review reports/field-registry-config.ts');
  logger.info('  2. Copy relevant fields to src/page-objects/salesforce/fields/FieldRegistry.ts');
  logger.info('  3. Add aliases for fields with different UI labels');
}

// Main execution
const args = process.argv.slice(2);
let objectsToScan = ['Account']; // Default

if (args.includes('--all')) {
  objectsToScan = [
    'Account',
    'Lead',
    'Contact',
    'Contract',
    'Opportunity',
    'Opportunity_Readiness__c',
  ];
} else if (args.includes('--object')) {
  const idx = args.indexOf('--object');
  if (args[idx + 1]) {
    objectsToScan = [args[idx + 1]];
  }
}

scanFields(objectsToScan).catch(error => {
  logger.error(`❌ Scan failed: ${error.message}`);
  process.exit(1);
});
