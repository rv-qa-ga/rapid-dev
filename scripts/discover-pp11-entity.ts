#!/usr/bin/env ts-node

/**
 * Discover PP-11 Counterparty Relationship Entity Details
 * Finds entity set name, field names, and related information
 */

import { config } from '../src/config/config';
import { DynamicsAuth } from '../src/utils/dynamics-auth';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface EntityProperty {
  LogicalName: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  AttributeType: string;
  IsRequired?: boolean;
  IsCustomAttribute?: boolean;
  OptionSet?: {
    Options?: Array<{
      Value: number;
      Label: {
        UserLocalizedLabel?: {
          Label: string;
        };
      };
    }>;
  };
}

async function discoverPP11Entity() {
  try {
    const env = config.getEnvironment();
    console.log(`\n🔍 Discovering PP-11 Counterparty Relationship Entity Details\n`);
    console.log(`Environment: ${env.toUpperCase()}\n`);

    // Authenticate and get token
    console.log('🔐 Authenticating with Dynamics 365...');
    const authResult = await DynamicsAuth.authenticate();
    const accessToken = authResult.accessToken;
    const d365Config = config.getDynamicsConfig();
    const baseUrl = d365Config.webApiBaseUrl || `${d365Config.baseUrl}/api/data/${d365Config.apiVersion || 'v9.2'}/`;
    console.log('✅ Authenticated with Dynamics 365\n');

    // Helper function to make API calls
    async function apiCall(endpoint: string): Promise<any> {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return await response.json();
    }

    // Step 1: Find Counterparty Relationship entity set
    console.log('📋 Step 1: Finding Counterparty Relationship entity set...');
    const serviceDoc = await apiCall('') as any;
    const entitySets = serviceDoc.value || [];
    
    const counterpartyEntitySets = entitySets.filter((e: any) => 
      e.name?.toLowerCase().includes('counterparty') || 
      e.name?.toLowerCase().includes('counter')
    );

    console.log(`\nFound ${counterpartyEntitySets.length} entity sets with "counterparty" in name:\n`);
    counterpartyEntitySets.forEach((entity: any, index: number) => {
      console.log(`  ${index + 1}. ${entity.name}${entity.entityType ? ` (${entity.entityType})` : ''}`);
    });

    // Find the specific one
    const counterpartyRelationshipSet = entitySets.find((e: any) => 
      e.name?.toLowerCase() === 'accelins_counterpartyrelationships' ||
      e.name?.toLowerCase().includes('counterpartyrelationship')
    );

    if (counterpartyRelationshipSet) {
      console.log(`\n✅ Found entity set: ${counterpartyRelationshipSet.name}\n`);
    } else {
      console.log('\n⚠️  Could not find exact match. Trying to find by logical name...\n');
      
      // Try to find by entity definitions
      const allEntityDefs = await apiCall('EntityDefinitions') as any;
      const entityDefs = allEntityDefs.value || [];
      
      const counterpartyDefs = entityDefs.filter((e: any) => 
        e.LogicalName?.toLowerCase().includes('counterparty')
      );

      console.log(`Found ${counterpartyDefs.length} entity definitions with "counterparty":\n`);
      counterpartyDefs.forEach((entity: any, index: number) => {
        const logicalName = entity.LogicalName || 'N/A';
        const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || 'N/A';
        const entitySetName = entity.EntitySetName || 'N/A';
        console.log(`  ${index + 1}. LogicalName: ${logicalName}`);
        console.log(`     DisplayName: ${displayName}`);
        console.log(`     EntitySetName: ${entitySetName}\n`);
      });
    }

    // Try to get properties for accelins_counterpartyrelationship
    const logicalName = 'accelins_counterpartyrelationship';
    
    try {
      console.log(`\n📋 Step 2: Getting entity definition for: ${logicalName}...`);
      const entityDef = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')`) as any;
        console.log(`✅ Found entity definition!\n`);
        console.log(`  LogicalName: ${entityDef.LogicalName || 'N/A'}`);
        console.log(`  DisplayName: ${entityDef.DisplayName?.UserLocalizedLabel?.Label || 'N/A'}`);
        console.log(`  EntitySetName: ${entityDef.EntitySetName || 'N/A'}`);
        console.log(`  PrimaryIdAttribute: ${entityDef.PrimaryIdAttribute || 'N/A'}\n`);

        // Step 3: Get all properties/fields
        console.log(`📋 Step 3: Getting all properties/fields for ${logicalName}...`);
        const properties = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')/Attributes`) as any;
        const fields = properties.value || [];

        console.log(`\n✅ Found ${fields.length} fields\n`);

        // Find DCR Processing field
        console.log('🔍 Searching for DCR Processing field...\n');
        const dcrFields = fields.filter((f: EntityProperty) => 
          f.LogicalName?.toLowerCase().includes('dcr') ||
          f.LogicalName?.toLowerCase().includes('processing')
        );

        if (dcrFields.length > 0) {
          console.log('✅ Found DCR Processing related fields:\n');
          dcrFields.forEach((field: EntityProperty) => {
            const displayName = field.DisplayName?.UserLocalizedLabel?.Label || field.LogicalName;
            console.log(`  Field: ${field.LogicalName}`);
            console.log(`    Display Name: ${displayName}`);
            console.log(`    Type: ${field.AttributeType}`);
            console.log(`    Required: ${field.IsRequired || false}`);
            console.log(`    Custom: ${field.IsCustomAttribute || false}\n`);
          });
        } else {
          console.log('⚠️  No DCR Processing field found. Searching all fields for "dcr" or "processing"...\n');
          const allFieldsWithDcr = fields.filter((f: EntityProperty) => {
            const logicalName = f.LogicalName?.toLowerCase() || '';
            const displayName = f.DisplayName?.UserLocalizedLabel?.Label?.toLowerCase() || '';
            return logicalName.includes('dcr') || displayName.includes('dcr') ||
                   logicalName.includes('processing') || displayName.includes('processing');
          });
          
          if (allFieldsWithDcr.length > 0) {
            allFieldsWithDcr.forEach((field: EntityProperty) => {
              const displayName = field.DisplayName?.UserLocalizedLabel?.Label || field.LogicalName;
              console.log(`  Field: ${field.LogicalName}`);
              console.log(`    Display Name: ${displayName}`);
              console.log(`    Type: ${field.AttributeType}\n`);
            });
          }
        }

        // Find Contract Reference field
        console.log('🔍 Searching for Contract Reference field...\n');
        const contractFields = fields.filter((f: EntityProperty) => 
          f.LogicalName?.toLowerCase().includes('contract') ||
          f.LogicalName?.toLowerCase().includes('reference')
        );

        if (contractFields.length > 0) {
          console.log('✅ Found Contract Reference related fields:\n');
          contractFields.forEach((field: EntityProperty) => {
            const displayName = field.DisplayName?.UserLocalizedLabel?.Label || field.LogicalName;
            console.log(`  Field: ${field.LogicalName}`);
            console.log(`    Display Name: ${displayName}`);
            console.log(`    Type: ${field.AttributeType}\n`);
          });
        }

        // Find Counterparty Role field
        console.log('🔍 Searching for Counterparty Role field...\n');
        const roleFields = fields.filter((f: EntityProperty) => 
          f.LogicalName?.toLowerCase().includes('role') ||
          f.LogicalName?.toLowerCase().includes('counterpartyrole')
        );

        if (roleFields.length > 0) {
          console.log('✅ Found Counterparty Role related fields:\n');
          roleFields.forEach((field: EntityProperty) => {
            const displayName = field.DisplayName?.UserLocalizedLabel?.Label || field.LogicalName;
            console.log(`  Field: ${field.LogicalName}`);
            console.log(`    Display Name: ${displayName}`);
            console.log(`    Type: ${field.AttributeType}`);
            
            // If it's an OptionSet, try to get values
            if (field.OptionSet?.Options) {
              console.log(`    OptionSet Values:`);
              field.OptionSet.Options.forEach((option: any) => {
                const label = option.Label?.UserLocalizedLabel?.Label || `Value ${option.Value}`;
                console.log(`      - ${label} (Value: ${option.Value})`);
              });
            }
            console.log('');
          });
        }

        // Find Counter Party field
        console.log('🔍 Searching for Counter Party field...\n');
        const counterPartyFields = fields.filter((f: EntityProperty) => 
          f.LogicalName?.toLowerCase().includes('counterparty') && 
          !f.LogicalName?.toLowerCase().includes('role')
        );

        if (counterPartyFields.length > 0) {
          console.log('✅ Found Counter Party related fields:\n');
          counterPartyFields.forEach((field: EntityProperty) => {
            const displayName = field.DisplayName?.UserLocalizedLabel?.Label || field.LogicalName;
            console.log(`  Field: ${field.LogicalName}`);
            console.log(`    Display Name: ${displayName}`);
            console.log(`    Type: ${field.AttributeType}\n`);
          });
        }

        // Save full field list to file
        const outputDir = path.join(__dirname, '../reports/dynamics');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFile = path.join(outputDir, `pp11-counterparty-relationship-fields-${env}-${new Date().toISOString().split('T')[0]}.json`);
        const outputData = {
          environment: env,
          timestamp: new Date().toISOString(),
          entityLogicalName: logicalName,
          entitySetName: entityDef.EntitySetName,
          displayName: entityDef.DisplayName?.UserLocalizedLabel?.Label,
          primaryIdAttribute: entityDef.PrimaryIdAttribute,
          totalFields: fields.length,
          fields: fields.map((f: EntityProperty) => ({
            logicalName: f.LogicalName,
            displayName: f.DisplayName?.UserLocalizedLabel?.Label || f.LogicalName,
            attributeType: f.AttributeType,
            isRequired: f.IsRequired || false,
            isCustom: f.IsCustomAttribute || false,
            optionSetValues: f.OptionSet?.Options?.map((opt: any) => ({
              value: opt.Value,
              label: opt.Label?.UserLocalizedLabel?.Label || `Value ${opt.Value}`
            })) || null
          })),
          keyFields: {
            dcrProcessing: dcrFields.map((f: EntityProperty) => f.LogicalName),
            contractReference: contractFields.map((f: EntityProperty) => f.LogicalName),
            counterpartyRole: roleFields.map((f: EntityProperty) => f.LogicalName),
            counterparty: counterPartyFields.map((f: EntityProperty) => f.LogicalName)
          }
        };

      fs.writeFileSync(outputFile, JSON.stringify(outputData, null, 2));
      console.log(`\n💾 Full field list saved to: ${outputFile}`);

    } catch (error: any) {
      console.error(`\n❌ Error getting entity definition: ${error.message}`);
      console.log('\nTrying alternative entity names...\n');
      
      // Try variations
      const alternatives = [
        'accelins_counterpartyrelationships',
        'counterpartyrelationship',
        'counterparty_relationship'
      ];

      for (const altName of alternatives) {
        try {
          console.log(`Trying: ${altName}...`);
          const entityDef = await apiCall(`EntityDefinitions(LogicalName='${altName}')`) as any;
          console.log(`✅ Found! EntitySetName: ${entityDef.EntitySetName || 'N/A'}\n`);
          break;
        } catch (e: any) {
          // Continue to next
        }
      }
    }
    console.log('\n✅ Discovery completed!\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  discoverPP11Entity();
}
