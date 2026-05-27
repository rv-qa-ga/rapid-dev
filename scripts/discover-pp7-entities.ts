#!/usr/bin/env ts-node

/**
 * Discover PP-7 Master Agreement and Contract (CMT UMR) Entity Details
 * Finds entity set names, field names, relationships, and related information
 * Connects to Dynamics SIT environment
 */

import { config } from '../src/config/config';
import { DynamicsAuth } from '../src/utils/dynamics-auth';
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

interface Relationship {
  SchemaName: string;
  ReferencedEntity: string;
  ReferencingEntity: string;
  ReferencedAttribute: string;
  ReferencingAttribute: string;
  RelationshipType: string;
}

async function discoverPP7Entities() {
  try {
    // Set environment to SIT
    process.env.ENV = 'sit';
    const env = config.getEnvironment();
    console.log(`\n🔍 Discovering PP-7 Master Agreement and Contract (CMT UMR) Entity Details\n`);
    console.log(`Environment: ${env.toUpperCase()}\n`);

    // Authenticate and get token
    console.log('🔐 Authenticating with Dynamics 365 SIT environment...');
    const authResult = await DynamicsAuth.authenticate();
    const accessToken = authResult.accessToken;
    const d365Config = config.getDynamicsConfig();
    const baseUrl = d365Config.webApiBaseUrl || `${d365Config.baseUrl}/api/data/${d365Config.apiVersion || 'v9.2'}/`;
    console.log(`✅ Authenticated with Dynamics 365`);
    console.log(`   Base URL: ${baseUrl}\n`);

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

    const results: any = {
      masterAgreement: null,
      contract: null,
      relationships: []
    };

    // Step 1: Find Master Agreement entity set
    console.log('📋 Step 1: Finding Master Agreement entity set...');
    const serviceDoc = await apiCall('') as any;
    const entitySets = serviceDoc.value || [];
    
    const masterEntitySets = entitySets.filter((e: any) => 
      e.name?.toLowerCase().includes('master') || 
      e.name?.toLowerCase().includes('agreement')
    );

    console.log(`\nFound ${masterEntitySets.length} entity sets with "master" or "agreement" in name:\n`);
    masterEntitySets.forEach((entity: any, index: number) => {
      console.log(`  ${index + 1}. ${entity.name}${entity.entityType ? ` (${entity.entityType})` : ''}`);
    });

    // Find the specific Master Agreement entity set - try multiple variations
    const masterAgreementSet = entitySets.find((e: any) => 
      e.name?.toLowerCase() === 'accelins_masteragreements' ||
      e.name?.toLowerCase() === 'accelins_masteragreement' ||
      e.name?.toLowerCase().includes('masteragreement')
    );
    
    // If not found, try searching by entity definitions
    if (!masterAgreementSet) {
      console.log('Searching EntityDefinitions for Master Agreement...');
      try {
        const allEntityDefs = await apiCall('EntityDefinitions') as any;
        const entityDefs = allEntityDefs.value || [];
        const masterDef = entityDefs.find((e: any) => 
          e.LogicalName?.toLowerCase() === 'accelins_masteragreement' ||
          e.LogicalName?.toLowerCase().includes('masteragreement')
        );
        if (masterDef) {
          console.log(`Found Master Agreement logical name: ${masterDef.LogicalName}`);
          // Find corresponding entity set
          const matchingSet = entitySets.find((e: any) => 
            e.entityType?.includes(masterDef.LogicalName) ||
            e.name?.toLowerCase().includes(masterDef.LogicalName.toLowerCase())
          );
          if (matchingSet) {
            console.log(`✅ Found Master Agreement entity set via logical name: ${matchingSet.name}\n`);
            results.masterAgreement = {
              entitySetName: matchingSet.name,
              entityType: matchingSet.entityType,
              logicalName: masterDef.LogicalName
            };
          }
        }
      } catch (error: any) {
        console.log(`Error searching EntityDefinitions: ${error.message}`);
      }
    }

    if (masterAgreementSet) {
      console.log(`\n✅ Found Master Agreement entity set: ${masterAgreementSet.name}\n`);
      results.masterAgreement = {
        entitySetName: masterAgreementSet.name,
        entityType: masterAgreementSet.entityType
      };
    } else {
      console.log('\n⚠️  Could not find exact match for Master Agreement. Trying to find by logical name...\n');
    }

    // Step 2: Find Contract entity set (CMT UMRs)
    console.log('📋 Step 2: Finding Contract entity set (CMT UMRs)...');
    const contractEntitySets = entitySets.filter((e: any) => 
      e.name?.toLowerCase().includes('contract') ||
      e.name?.toLowerCase() === 'contracts'
    );

    console.log(`\nFound ${contractEntitySets.length} entity sets with "contract" in name:\n`);
    contractEntitySets.forEach((entity: any, index: number) => {
      console.log(`  ${index + 1}. ${entity.name}${entity.entityType ? ` (${entity.entityType})` : ''}`);
    });

    // Find Contract entity set - try multiple variations
    const contractSet = entitySets.find((e: any) => 
      e.name?.toLowerCase() === 'accelins_contracts' ||
      e.name?.toLowerCase() === 'accelins_contract' ||
      e.name?.toLowerCase() === 'contracts' ||
      (e.name?.toLowerCase().includes('contract') && !e.name?.toLowerCase().includes('set'))
    );
    
    // If not found, try searching by entity definitions
    if (!contractSet) {
      console.log('Searching EntityDefinitions for Contract...');
      try {
        const allEntityDefs = await apiCall('EntityDefinitions') as any;
        const entityDefs = allEntityDefs.value || [];
        const contractDef = entityDefs.find((e: any) => 
          e.LogicalName?.toLowerCase() === 'accelins_contract' ||
          e.LogicalName?.toLowerCase() === 'contract' ||
          (e.LogicalName?.toLowerCase().includes('contract') && 
           !e.LogicalName?.toLowerCase().includes('set') &&
           !e.LogicalName?.toLowerCase().includes('party'))
        );
        if (contractDef) {
          console.log(`Found Contract logical name: ${contractDef.LogicalName}`);
          // Find corresponding entity set
          const matchingSet = entitySets.find((e: any) => 
            e.entityType?.includes(contractDef.LogicalName) ||
            e.name?.toLowerCase().includes(contractDef.LogicalName.toLowerCase())
          );
          if (matchingSet) {
            console.log(`✅ Found Contract entity set via logical name: ${matchingSet.name}\n`);
            results.contract = {
              entitySetName: matchingSet.name,
              entityType: matchingSet.entityType,
              logicalName: contractDef.LogicalName
            };
          }
        }
      } catch (error: any) {
        console.log(`Error searching EntityDefinitions: ${error.message}`);
      }
    }

    if (contractSet) {
      console.log(`\n✅ Found Contract entity set: ${contractSet.name}\n`);
      results.contract = {
        entitySetName: contractSet.name,
        entityType: contractSet.entityType
      };
    }

    // Step 3: Get Master Agreement entity definition and properties
    if (masterAgreementSet || results.masterAgreement) {
      console.log('📋 Step 3: Getting Master Agreement entity definition...');
      const logicalName = results.masterAgreement?.logicalName || 
                         masterAgreementSet?.name.replace('Set', '').replace('s', '').toLowerCase() ||
                         'accelins_masteragreement';
      
      try {
        const entityDef = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')`) as any;
        console.log(`✅ Retrieved entity definition for: ${logicalName}\n`);
        
        results.masterAgreement.logicalName = entityDef.LogicalName;
        results.masterAgreement.displayName = entityDef.DisplayName?.UserLocalizedLabel?.Label || logicalName;
        results.masterAgreement.primaryIdAttribute = entityDef.PrimaryIdAttribute;
        results.masterAgreement.primaryNameAttribute = entityDef.PrimaryNameAttribute;

        // Get attributes/properties
        console.log('📋 Getting Master Agreement properties...');
        const properties = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')/Attributes`) as any;
        const attributes = properties.value || [];
        
        results.masterAgreement.fields = attributes.map((attr: EntityProperty) => ({
          logicalName: attr.LogicalName,
          displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          attributeType: attr.AttributeType,
          isRequired: attr.IsRequired || false,
          isCustom: attr.IsCustomAttribute || false
        }));

        // Filter for relevant fields
        const relevantFields = results.masterAgreement.fields.filter((f: any) => 
          f.logicalName.includes('master') ||
          f.logicalName.includes('umr') ||
          f.logicalName.includes('agreement') ||
          f.logicalName.includes('description') ||
          f.logicalName.includes('start') ||
          f.logicalName.includes('end') ||
          f.logicalName.includes('date') ||
          f.logicalName.includes('status')
        );

        console.log(`\n📊 Master Agreement - Relevant Fields (${relevantFields.length} of ${results.masterAgreement.fields.length} total):\n`);
        relevantFields.forEach((field: any) => {
          console.log(`  • ${field.logicalName} (${field.displayName})`);
          console.log(`    Type: ${field.attributeType}, Required: ${field.isRequired}, Custom: ${field.isCustom}`);
        });

        // Get relationships
        console.log('\n📋 Getting Master Agreement relationships...');
        const relationships = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')/OneToManyRelationships`) as any;
        const oneToManyRels = relationships.value || [];
        
        const underlyingRels = oneToManyRels.filter((rel: any) => 
          rel.ReferencedEntity?.toLowerCase() === logicalName &&
          (rel.ReferencingEntity?.toLowerCase().includes('contract') ||
           rel.ReferencingEntity?.toLowerCase().includes('umr') ||
           rel.SchemaName?.toLowerCase().includes('underlying') ||
           rel.SchemaName?.toLowerCase().includes('agreement'))
        );

        console.log(`\n📊 Master Agreement - Relationships to Contracts/UMRs:\n`);
        if (underlyingRels.length > 0) {
          underlyingRels.forEach((rel: Relationship) => {
            console.log(`  • ${rel.SchemaName}`);
            console.log(`    Referencing Entity: ${rel.ReferencingEntity}`);
            console.log(`    Referencing Attribute: ${rel.ReferencingAttribute}`);
            results.relationships.push({
              schemaName: rel.SchemaName,
              referencingEntity: rel.ReferencingEntity,
              referencingAttribute: rel.ReferencingAttribute,
              relationshipType: 'OneToMany'
            });
          });
        } else {
          console.log('  ⚠️  No relationships found. Checking ManyToOne relationships...');
          
          const manyToOneRels = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')/ManyToOneRelationships`) as any;
          const manyToOne = manyToOneRels.value || [];
          const contractRels = manyToOne.filter((rel: any) => 
            rel.ReferencingEntity?.toLowerCase() === logicalName &&
            (rel.ReferencedEntity?.toLowerCase().includes('contract') ||
             rel.ReferencedEntity?.toLowerCase().includes('umr'))
          );

          if (contractRels.length > 0) {
            contractRels.forEach((rel: Relationship) => {
              console.log(`  • ${rel.SchemaName}`);
              console.log(`    Referenced Entity: ${rel.ReferencedEntity}`);
              console.log(`    Referenced Attribute: ${rel.ReferencedAttribute}`);
              results.relationships.push({
                schemaName: rel.SchemaName,
                referencedEntity: rel.ReferencedEntity,
                referencedAttribute: rel.ReferencedAttribute,
                relationshipType: 'ManyToOne'
              });
            });
          }
        }

      } catch (error: any) {
        console.log(`\n⚠️  Error getting Master Agreement definition: ${error.message}\n`);
      }
    }

    // Step 4: Get Contract entity definition and properties
    if (contractSet || results.contract) {
      console.log('\n📋 Step 4: Getting Contract entity definition...');
      const logicalName = results.contract?.logicalName || 
                         contractSet?.name.replace('Set', '').replace('s', '').toLowerCase() ||
                         'accelins_contract';
      
      try {
        const entityDef = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')`) as any;
        console.log(`✅ Retrieved entity definition for: ${logicalName}\n`);
        
        results.contract.logicalName = entityDef.LogicalName;
        results.contract.displayName = entityDef.DisplayName?.UserLocalizedLabel?.Label || logicalName;
        results.contract.primaryIdAttribute = entityDef.PrimaryIdAttribute;
        results.contract.primaryNameAttribute = entityDef.PrimaryNameAttribute;

        // Get attributes/properties
        console.log('📋 Getting Contract properties...');
        const properties = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')/Attributes`) as any;
        const attributes = properties.value || [];
        
        results.contract.fields = attributes.map((attr: EntityProperty) => ({
          logicalName: attr.LogicalName,
          displayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
          attributeType: attr.AttributeType,
          isRequired: attr.IsRequired || false,
          isCustom: attr.IsCustomAttribute || false
        }));

        // Filter for relevant fields
        const relevantFields = results.contract.fields.filter((f: any) => 
          f.logicalName.includes('contract') ||
          f.logicalName.includes('reference') ||
          f.logicalName.includes('umr') ||
          f.logicalName.includes('master') ||
          f.logicalName.includes('member') ||
          f.logicalName.includes('coverage') ||
          f.logicalName.includes('status')
        );

        console.log(`\n📊 Contract (CMT UMR) - Relevant Fields (${relevantFields.length} of ${results.contract.fields.length} total):\n`);
        relevantFields.forEach((field: any) => {
          console.log(`  • ${field.logicalName} (${field.displayName})`);
          console.log(`    Type: ${field.attributeType}, Required: ${field.isRequired}, Custom: ${field.isCustom}`);
        });

        // Get relationships to Master Agreement
        console.log('\n📋 Getting Contract relationships to Master Agreement...');
        const manyToOneRels = await apiCall(`EntityDefinitions(LogicalName='${logicalName}')/ManyToOneRelationships`) as any;
        const masterRels = (manyToOneRels.value || []).filter((rel: any) => 
          rel.ReferencingEntity?.toLowerCase() === logicalName &&
          (rel.ReferencedEntity?.toLowerCase().includes('master') ||
           rel.ReferencedEntity?.toLowerCase().includes('agreement') ||
           rel.SchemaName?.toLowerCase().includes('master') ||
           rel.SchemaName?.toLowerCase().includes('agreement'))
        );

        console.log(`\n📊 Contract - Relationships to Master Agreement:\n`);
        if (masterRels.length > 0) {
          masterRels.forEach((rel: Relationship) => {
            console.log(`  • ${rel.SchemaName}`);
            console.log(`    Referenced Entity: ${rel.ReferencedEntity}`);
            console.log(`    Referenced Attribute: ${rel.ReferencedAttribute}`);
            console.log(`    Referencing Attribute: ${rel.ReferencingAttribute}`);
            results.relationships.push({
              schemaName: rel.SchemaName,
              referencedEntity: rel.ReferencedEntity,
              referencedAttribute: rel.ReferencedAttribute,
              referencingAttribute: rel.ReferencingAttribute,
              relationshipType: 'ManyToOne'
            });
          });
        } else {
          console.log('  ⚠️  No relationships to Master Agreement found.');
        }

      } catch (error: any) {
        console.log(`\n⚠️  Error getting Contract definition: ${error.message}\n`);
      }
    }

    // Save results to file
    const outputPath = path.join(process.cwd(), 'outputs', 'pp7-entity-discovery.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n✅ Results saved to: ${outputPath}\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('📊 DISCOVERY SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    
    if (results.masterAgreement) {
      console.log(`Master Agreement:`);
      console.log(`  Entity Set: ${results.masterAgreement.entitySetName}`);
      console.log(`  Logical Name: ${results.masterAgreement.logicalName || 'N/A'}`);
      console.log(`  Primary ID: ${results.masterAgreement.primaryIdAttribute || 'N/A'}`);
      console.log(`  Primary Name: ${results.masterAgreement.primaryNameAttribute || 'N/A'}`);
      console.log(`  Total Fields: ${results.masterAgreement.fields?.length || 0}\n`);
    }

    if (results.contract) {
      console.log(`Contract (CMT UMR):`);
      console.log(`  Entity Set: ${results.contract.entitySetName}`);
      console.log(`  Logical Name: ${results.contract.logicalName || 'N/A'}`);
      console.log(`  Primary ID: ${results.contract.primaryIdAttribute || 'N/A'}`);
      console.log(`  Primary Name: ${results.contract.primaryNameAttribute || 'N/A'}`);
      console.log(`  Total Fields: ${results.contract.fields?.length || 0}\n`);
    }

    if (results.relationships.length > 0) {
      console.log(`Relationships Found: ${results.relationships.length}\n`);
      results.relationships.forEach((rel: any, index: number) => {
        console.log(`  ${index + 1}. ${rel.schemaName} (${rel.relationshipType})`);
      });
    } else {
      console.log('⚠️  No relationships found between Master Agreement and Contract entities.\n');
    }

    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run discovery
discoverPP7Entities();
