#!/usr/bin/env ts-node
/**
 * Fetch SF-575 work item from JIRA and query Custom Metadata
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { jiraClient } from '../src/integrations/jira/client';
import { logger } from '../src/utils/logger';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import axios from 'axios';

// Load environment
const envPaths = [
  path.resolve(process.cwd(), 'src/config/env/.env.qa'),
  path.resolve(process.cwd(), '.env.qa'),
];

for (const envPath of envPaths) {
  if (require('fs').existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

async function fetchSF575() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         📋 FETCHING SF-575 FROM JIRA                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  try {
    // Fetch SF-575 from JIRA
    console.log('Fetching SF-575 from JIRA...');
    const issue = await jiraClient.getIssueWithFullDetails('SF-575');
    
    console.log(`\n✅ Key: ${issue.key}`);
    console.log(`   Summary: ${issue.fields.summary}`);
    console.log(`   Type: ${issue.fields.issuetype?.name || 'N/A'}`);
    console.log(`   Status: ${issue.fields.status?.name || 'N/A'}`);
    console.log(`   Priority: ${issue.fields.priority?.name || 'N/A'}`);
    
    if (issue.fields.description) {
      const desc = typeof issue.fields.description === 'string' 
        ? issue.fields.description 
        : JSON.stringify(issue.fields.description);
      console.log(`\n   Description:\n   ${desc.split('\n').map((l: string) => `   ${l}`).join('\n')}`);
    }

    // Query Custom Metadata
    console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         📖 QUERYING CUSTOM METADATA                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

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

    // Try to find Dataverse_Mapping__mdt
    const metadataTypes = [
      'Dataverse_Mapping__mdt',
      'Integration_Mapping__mdt',
      'Party_Mapping__mdt',
    ];

    for (const metadataType of metadataTypes) {
      try {
        console.log(`\n📋 Querying ${metadataType}...`);
        
        // Describe the Custom Metadata Type
        const describeResponse = await client.get(`/sobjects/${metadataType}/describe`);
        const describeResult = describeResponse.data;
        
        console.log(`✅ Found: ${metadataType}`);
        console.log(`   Label: ${describeResult.label || 'N/A'}`);
        console.log(`   Fields: ${describeResult.fields?.length || 0}`);
        
        if (describeResult.fields) {
          console.log('\n   Field Details:');
          describeResult.fields.forEach((field: any) => {
            console.log(`     - ${field.name} (${field.label || 'N/A'})`);
            console.log(`       Type: ${field.type || 'N/A'}, Length: ${field.length || 'N/A'}`);
            if (field.required) console.log(`       Required: Yes`);
          });
        }

        // Query sample records
        try {
          const recordsQuery = `SELECT FIELDS(ALL) FROM ${metadataType} LIMIT 10`;
          const recordsResponse = await client.get('/query/', {
            params: { q: recordsQuery },
          });
          const recordsResult = recordsResponse.data;
          
          console.log(`\n   Records: ${recordsResult.totalSize} total (showing first 10)`);
          
          if (recordsResult.records && recordsResult.records.length > 0) {
            console.log(`\n   Sample records:`);
            recordsResult.records.slice(0, 3).forEach((record: any, idx: number) => {
              console.log(`\n     Record ${idx + 1} (${record.DeveloperName || record.Id}):`);
              Object.keys(record).forEach(key => {
                if (key !== 'attributes' && record[key] !== null && record[key] !== undefined) {
                  const value = String(record[key]);
                  const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
                  console.log(`       ${key}: ${displayValue}`);
                }
              });
            });
          }
        } catch (recError: any) {
          console.log(`   Could not query records: ${recError.message}`);
        }

        break; // Found one, stop searching
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.log(`   Not found: ${metadataType}`);
          continue;
        } else {
          console.log(`   Error: ${error.message}`);
          continue;
        }
      }
    }

    console.log('\n✅ Done!\n');
  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

fetchSF575().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});
