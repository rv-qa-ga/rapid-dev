/**
 * Query Salesforce Custom Metadata Types and Records
 * Uses Salesforce API to get Custom Metadata structure
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(process.cwd(), '.env.qa'),
  path.resolve(process.cwd(), 'src/config/env/.env.qa'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

async function queryCustomMetadata() {
  console.log('\n📖 Querying Salesforce Custom Metadata');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Authenticate with Salesforce
    console.log('🔐 Authenticating with Salesforce...');
    const authResult = await SalesforceJWTAuth.authenticate();
    const accessToken = authResult.accessToken;
    const instanceUrl = authResult.instanceUrl;
    const apiVersion = process.env.SF_API_VERSION || 'v60.0';

    console.log('✅ Authenticated successfully\n');

    // Create axios client
    const client = axios.create({
      baseURL: `${instanceUrl}/services/data/${apiVersion}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Authenticated to Salesforce\n');

    // Query Custom Metadata Types using Tooling API
    console.log('📋 Querying Custom Metadata Types...\n');
    
    const metadataTypesQuery = `
      SELECT QualifiedApiName, DeveloperName, Label, NamespacePrefix
      FROM CustomMetadataType
      ORDER BY DeveloperName
    `;

    try {
      const typesResponse = await client.get('/tooling/query/', {
        params: { q: metadataTypesQuery },
      });
      const typesResult = typesResponse.data;
      console.log(`Found ${typesResult.totalSize} Custom Metadata Types:\n`);
      
      if (typesResult.records && typesResult.records.length > 0) {
        typesResult.records.forEach((type: any, index: number) => {
          console.log(`${index + 1}. ${type.DeveloperName || type.QualifiedApiName}`);
          console.log(`   Label: ${type.Label || 'N/A'}`);
          console.log(`   Qualified API Name: ${type.QualifiedApiName || 'N/A'}`);
          if (type.NamespacePrefix) {
            console.log(`   Namespace: ${type.NamespacePrefix}`);
          }
          console.log('');
        });
      }

      // Look for integration-related Custom Metadata Types
      const integrationTypes = typesResult.records.filter((type: any) => 
        (type.DeveloperName && (
          type.DeveloperName.toLowerCase().includes('integration') ||
          type.DeveloperName.toLowerCase().includes('mapping') ||
          type.DeveloperName.toLowerCase().includes('dataverse') ||
          type.DeveloperName.toLowerCase().includes('party') ||
          type.DeveloperName.toLowerCase().includes('account')
        ))
      );

      if (integrationTypes.length > 0) {
        console.log('\n🔍 Potential Integration-Related Custom Metadata Types:');
        console.log('═══════════════════════════════════════════════════════════\n');
        
        for (const type of integrationTypes) {
          console.log(`\n📌 ${type.DeveloperName} (${type.QualifiedApiName})`);
          
            // Query fields for this Custom Metadata Type
            try {
              const fieldsQuery = `
                SELECT QualifiedApiName, DeveloperName, Label, DataType, Length
                FROM CustomField
                WHERE EntityDefinition.QualifiedApiName = '${type.QualifiedApiName}'
                ORDER BY DeveloperName
              `;
              
              const fieldsResponse = await client.get('/tooling/query/', {
                params: { q: fieldsQuery },
              });
              const fieldsResult = fieldsResponse.data;
            
            if (fieldsResult.records && fieldsResult.records.length > 0) {
              console.log(`   Fields (${fieldsResult.records.length}):`);
              fieldsResult.records.forEach((field: any) => {
                console.log(`     - ${field.DeveloperName || field.QualifiedApiName} (${field.DataType || 'N/A'}${field.Length ? `, Length: ${field.Length}` : ''})`);
              });
            }

            // Query sample records (limit to 5 for preview)
            try {
              // For Custom Metadata, we need to use the QualifiedApiName with __mdt suffix
              const qualifiedName = type.QualifiedApiName || `${type.DeveloperName}__mdt`;
              const recordsQuery = `
                SELECT FIELDS(ALL)
                FROM ${qualifiedName}
                LIMIT 5
              `;
              
              const recordsResponse = await client.get('/query/', {
                params: { q: recordsQuery },
              });
              const recordsResult = recordsResponse.data;
              
              if (recordsResult.records && recordsResult.records.length > 0) {
                console.log(`   Sample Records (${recordsResult.totalSize} total, showing ${recordsResult.records.length}):`);
                recordsResult.records.forEach((record: any, idx: number) => {
                  console.log(`     Record ${idx + 1}:`);
                  Object.keys(record).forEach(key => {
                    if (key !== 'attributes') {
                      console.log(`       ${key}: ${record[key] || '(null)'}`);
                    }
                  });
                });
              } else {
                console.log(`   No records found (or query needs adjustment)`);
              }
            } catch (recordError: any) {
              console.log(`   Could not query records: ${recordError.message}`);
            }

          } catch (fieldError: any) {
            console.log(`   Could not query fields: ${fieldError.message}`);
          }
        }
      }

      // Save results to file
      const outputDir = path.join(process.cwd(), 'reports', 'salesforce-metadata');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, 'custom-metadata-types.json');
      fs.writeFileSync(outputPath, JSON.stringify({
        fetchedAt: new Date().toISOString(),
        totalTypes: typesResult.totalSize,
        allTypes: typesResult.records,
        integrationTypes: integrationTypes,
      }, null, 2));

      console.log(`\n📄 Results saved to: ${outputPath}`);

    } catch (error: any) {
      console.error(`❌ Error querying Custom Metadata Types: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // Alternative: Try to describe specific Custom Metadata Types
    console.log('\n\n🔍 Attempting to find Dataverse/Integration mapping Custom Metadata...\n');
    
    // Common naming patterns to try
    const possibleNames = [
      'Dataverse_Mapping__mdt',
      'Integration_Mapping__mdt',
      'Party_Mapping__mdt',
      'Account_Party_Mapping__mdt',
      'MuleSoft_Mapping__mdt',
      'Dataverse_Party_Mapping__mdt',
      'Account_Type_Mapping__mdt',
      'Status_Mapping__mdt',
    ];

    for (const name of possibleNames) {
      try {
        console.log(`Trying: ${name}...`);
        const describeResponse = await client.get(`/sobjects/${name}/describe`);
        const describeResult = describeResponse.data;
        
        console.log(`✅ Found: ${name}`);
        console.log(`   Label: ${describeResult.label || 'N/A'}`);
        console.log(`   Fields: ${describeResult.fields?.length || 0}`);
        
        if (describeResult.fields) {
          console.log('\n   Field Details:');
          describeResult.fields.forEach((field: any) => {
            console.log(`     - ${field.name} (${field.label || 'N/A'})`);
            console.log(`       Type: ${field.type || 'N/A'}, Length: ${field.length || 'N/A'}`);
            if (field.required) console.log(`       Required: Yes`);
            if (field.defaultValue) console.log(`       Default: ${field.defaultValue}`);
          });
        }

        // Query all records to get complete picture
        try {
          const recordsQuery = `SELECT FIELDS(ALL) FROM ${name} ORDER BY Object__c, Field__c LIMIT 100`;
          const recordsResponse = await client.get('/query/', {
            params: { q: recordsQuery },
          });
          const recordsResult = recordsResponse.data;
          
          console.log(`\n   Records: ${recordsResult.totalSize} total`);
          
          // Group by Object and Field for summary
          const grouped: { [key: string]: { [field: string]: number } } = {};
          recordsResult.records.forEach((record: any) => {
            const obj = record.Object__c || 'Unknown';
            const field = record.Field__c || 'Unknown';
            if (!grouped[obj]) grouped[obj] = {};
            grouped[obj][field] = (grouped[obj][field] || 0) + 1;
          });
          
          console.log(`\n   Records by Object and Field:`);
          Object.keys(grouped).sort().forEach(obj => {
            console.log(`     ${obj}:`);
            Object.keys(grouped[obj]).sort().forEach(field => {
              console.log(`       ${field}: ${grouped[obj][field]} mappings`);
            });
          });
          
          if (recordsResult.records && recordsResult.records.length > 0) {
            console.log(`\n   Sample records (first 5):`);
            recordsResult.records.slice(0, 5).forEach((record: any, idx: number) => {
              console.log(`\n     Record ${idx + 1}:`);
              console.log(`       Object: ${record.Object__c || '(null)'}`);
              console.log(`       Field: ${record.Field__c || '(null)'}`);
              console.log(`       Value: ${record.Value__c || '(null)'}`);
              console.log(`       Dataverse Field: ${record.Dataverse_Field__c || '(null)'}`);
              console.log(`       Dataverse Value: ${record.Dataverse_Value__c || '(null)'}`);
            });
          }
        } catch (recError: any) {
          console.log(`   Could not query records: ${recError.message}`);
        }

        break; // Found one, stop searching
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          // Not found, continue
          continue;
        } else {
          console.log(`   Error: ${error.message}`);
          continue;
        }
      }
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

// Main execution
queryCustomMetadata().catch(console.error);

