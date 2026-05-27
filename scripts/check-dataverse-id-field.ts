#!/usr/bin/env ts-node

/**
 * Check if Dataverse_ID__c field exists and is accessible via API on Account object
 */

import * as path from 'path';
import { config } from '../src/config/config';
import { SalesforceAPIClient } from '../src/api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../src/utils/logger';
import { APIRequestContext, chromium } from '@playwright/test';

async function checkDataverseIdField() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   Checking Dataverse_ID__c Field on Account Object                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // Initialize browser context for API client
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const apiContext = context.request;

  try {
    // Initialize API client
    const apiClient = new SalesforceAPIClient(apiContext);
    await apiClient.authenticate();

    console.log('📋 Step 1: Describing Account object to get field metadata...\n');

    // Describe Account object
    const describeResult = await apiClient.describeSObject('Account');

    console.log(`✅ Account object described successfully`);
    console.log(`   Total fields: ${describeResult.fields.length}\n`);

    // Search for Dataverse_ID__c field
    const fieldNames = ['Dataverse_ID__c', 'DataverseID__c', 'DataverseId__c', 'dataverse_id__c'];
    let foundField: any = null;
    let foundFieldName: string = '';

    for (const fieldName of fieldNames) {
      foundField = describeResult.fields.find((f: any): boolean => 
        f.name === fieldName || 
        f.name.toLowerCase() === fieldName.toLowerCase()
      );
      if (foundField) {
        foundFieldName = fieldName;
        break;
      }
    }

    if (!foundField) {
      console.log('❌ Field NOT FOUND');
      console.log('   Searched for:', fieldNames.join(', '));
      console.log('\n📋 Available custom fields (ending with __c):');
      const customFields = describeResult.fields
        .filter((f: any) => f.name.endsWith('__c'))
        .map((f: any) => f.name)
        .sort();
      
      // Check if any field contains "dataverse" or "d365" in the name
      const dataverseRelated = customFields.filter((f: string): boolean => 
        f.toLowerCase().includes('dataverse') || 
        f.toLowerCase().includes('d365') ||
        f.toLowerCase().includes('dynamics')
      );

      if (dataverseRelated.length > 0) {
        console.log('\n   🔍 Found related fields:');
        dataverseRelated.forEach(f => console.log(`      - ${f}`));
      }

      console.log(`\n   Showing first 20 custom fields:`);
      customFields.slice(0, 20).forEach(f => console.log(`      - ${f}`));
      if (customFields.length > 20) {
        console.log(`      ... and ${customFields.length - 20} more`);
      }
    } else {
      console.log('✅ Field FOUND');
      console.log(`   Field Name: ${foundField.name}`);
      console.log(`   Field Label: ${foundField.label}`);
      console.log(`   Field Type: ${foundField.type}`);
      console.log(`   Accessible: ${foundField.accessible ? '✅ YES' : '❌ NO'}`);
      console.log(`   Createable: ${foundField.createable ? '✅ YES' : '❌ NO'}`);
      console.log(`   Updateable: ${foundField.updateable ? '✅ YES' : '❌ NO'}`);
      console.log(`   Queryable: ${foundField.queryable ? '✅ YES' : '❌ NO'}`);
      console.log(`   Nillable: ${foundField.nillable ? '✅ YES' : '❌ NO'}`);
      console.log(`   Required: ${!foundField.nillable ? '✅ YES' : '❌ NO'}`);

      if (!foundField.accessible) {
        console.log('\n⚠️  WARNING: Field exists but is NOT accessible via API');
        console.log('   This is a Field-Level Security (FLS) issue.');
        console.log('   The field exists but the current user does not have read access.');
        console.log('\n   🔧 To Fix:');
        console.log('   1. Go to Setup > Object Manager > Account > Fields & Relationships');
        console.log('   2. Click on "Dataverse ID" field');
        console.log('   3. Go to "Field-Level Security" section');
        console.log('   4. Ensure the test user profile/permission set has "Read" access');
        console.log('   5. For API access, ensure "Read" is enabled (not just visible in UI)');
      }

      if (!foundField.queryable) {
        console.log('\n⚠️  WARNING: Field exists but is NOT queryable');
        console.log('   This means you cannot use it in SOQL queries.');
      }

      // Try to query an Account with this field
      console.log('\n📋 Step 2: Testing if field can be queried...\n');
      try {
        const testQuery = `SELECT Id, Name, ${foundField.name} FROM Account LIMIT 1`;
        console.log(`   Query: ${testQuery}`);
        
        const queryResult = await apiClient.query(testQuery);
        
        if (queryResult.records && queryResult.records.length > 0) {
          const record = queryResult.records[0];
          console.log('✅ Query successful!');
          console.log(`   Account Name: ${record.Name}`);
          console.log(`   Account ID: ${record.Id}`);
          console.log(`   ${foundField.name}: ${record[foundField.name] || '(null or empty)'}`);
        } else {
          console.log('⚠️  Query successful but no records returned');
        }
      } catch (queryError: any) {
        console.log('❌ Query FAILED');
        console.log(`   Error: ${queryError.message}`);
        if (queryError.message.includes('INVALID_FIELD')) {
          console.log('\n   💡 This confirms the field is not accessible via API queries.');
          console.log('   Possible causes:');
          console.log('   1. Field-Level Security (FLS) restrictions');
          console.log('   2. Field is not queryable');
          console.log('   3. User profile/permission set restrictions');
        }
      }
    }

    console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║   Check Complete                                                           ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  } catch (error: any) {
    console.error('\n❌ Error checking field:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error(`\n   Stack trace:\n${error.stack}`);
    }
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

// Run the check
checkDataverseIdField().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
