#!/usr/bin/env ts-node
/**
 * Compare Custom Metadata Dataverse values with exported Country data from Dynamics
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import axios from 'axios';
import { logger } from '../src/utils/logger';

// Load environment
const envPaths = [
  path.resolve(process.cwd(), 'src/config/env/.env.qa'),
  path.resolve(process.cwd(), '.env.qa'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

interface CountryRecord {
  accelins_countrymasterid?: string;
  accelins_name?: string;
  accelins_alpha2code?: string;
  accelins_alpha3code?: string;
  [key: string]: any;
}

interface CustomMetadataRecord {
  Id?: string;
  DeveloperName?: string;
  Dataverse_Value__c?: string;
  Dataverse_Field__c?: string;
  Value__c?: string;
  Object__c?: string;
  Field__c?: string;
  [key: string]: any;
}

async function compareCountryData() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   COMPARING CUSTOM METADATA WITH DATAVERSE COUNTRY DATA      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Step 1: Read CSV file
  const csvPath = path.resolve(process.cwd(), 'data/excel/accelins_Country-QATEST222Jan.csv');
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  console.log('📖 Reading Country data from CSV...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const countryRecords: CountryRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const record: any = {};
    headers.forEach((header, index) => {
      const value = values[index] || '';
      record[header] = value === 'NULL' ? null : value;
    });
    countryRecords.push(record as CountryRecord);
  }

  console.log(`✅ Loaded ${countryRecords.length} country records from CSV\n`);

  // Extract country master IDs
  const countryMasterIds = new Set<string>();
  const countryMap = new Map<string, CountryRecord>();

  for (const record of countryRecords) {
    const masterId = record.accelins_countrymasterid;
    if (masterId) {
      countryMasterIds.add(masterId.trim());
      countryMap.set(masterId.trim(), record);
    }
  }

  console.log(`📊 Found ${countryMasterIds.size} unique Country Master IDs in CSV\n`);

  // Step 2: Query Custom Metadata from Salesforce
  console.log('🔐 Authenticating with Salesforce...');
  const sfAuthResult = await SalesforceJWTAuth.authenticate();
  const sfAccessToken = sfAuthResult.accessToken;
  const sfInstanceUrl = sfAuthResult.instanceUrl;
  const apiVersion = process.env.SF_API_VERSION || 'v60.0';

  const sfClient = axios.create({
    baseURL: `${sfInstanceUrl}/services/data/${apiVersion}`,
    headers: {
      'Authorization': `Bearer ${sfAccessToken}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('✅ Authenticated with Salesforce\n');

  // Query Custom Metadata for Country mappings
  console.log('📖 Querying Custom Metadata for Country mappings...');
  // Query all records and filter in memory (SOQL LIKE has limitations)
  const metadataQuery = `SELECT Id, DeveloperName, MasterLabel, Dataverse_Value__c, Dataverse_Field__c, Value__c, Object__c, Field__c FROM Dataverse_Mapping__mdt ORDER BY DeveloperName LIMIT 1000`;
  
  let metadataRecords: CustomMetadataRecord[] = [];
  try {
    const metadataResponse = await sfClient.get('/query/', {
      params: { q: metadataQuery },
    });

    const allMetadataRecords: CustomMetadataRecord[] = metadataResponse.data.records || [];
    // Filter for Country-related mappings
    metadataRecords = allMetadataRecords.filter(record => 
      record.Dataverse_Field__c && 
      (record.Dataverse_Field__c.includes('accelins_country') || 
       record.Dataverse_Field__c.toLowerCase().includes('country'))
    );
    console.log(`✅ Found ${metadataRecords.length} Custom Metadata records for Country mappings (out of ${allMetadataRecords.length} total)\n`);
  } catch (error: any) {
    console.error(`❌ Error querying Custom Metadata: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    throw error;
  }

  // Step 3: Compare values
  console.log('🔍 Comparing Custom Metadata values with CSV data...\n');
  console.log('═'.repeat(80));

  const mismatches: Array<{
    metadataRecord: CustomMetadataRecord;
    dataverseValue: string;
    existsInCSV: boolean;
    csvRecord?: CountryRecord;
    error?: string;
  }> = [];

  const matches: Array<{
    metadataRecord: CustomMetadataRecord;
    dataverseValue: string;
    csvRecord: CountryRecord;
  }> = [];

  for (const metadataRecord of metadataRecords) {
    const dataverseValue = metadataRecord.Dataverse_Value__c;
    const dataverseField = metadataRecord.Dataverse_Field__c;
    const salesforceValue = metadataRecord.Value__c;
    const objectName = metadataRecord.Object__c;
    const fieldName = metadataRecord.Field__c;

    if (!dataverseValue) {
      mismatches.push({
        metadataRecord,
        dataverseValue: '',
        existsInCSV: false,
        error: 'Missing Dataverse_Value__c'
      });
      continue;
    }

    // Check if this is a country-related mapping
    if (dataverseField && dataverseField.includes('accelins_country')) {
      const exists = countryMasterIds.has(dataverseValue.trim());
      const csvRecord = countryMap.get(dataverseValue.trim());

      if (exists && csvRecord) {
        matches.push({
          metadataRecord,
          dataverseValue,
          csvRecord
        });
        console.log(`✅ MATCH: "${dataverseValue}" → "${salesforceValue}" (${objectName}.${fieldName})`);
        console.log(`   CSV: ${csvRecord.accelins_name || 'N/A'} (${csvRecord.accelins_alpha2code || 'N/A'})`);
      } else {
        mismatches.push({
          metadataRecord,
          dataverseValue,
          existsInCSV: false,
          error: `Country Master ID "${dataverseValue}" not found in CSV export`
        });
        console.log(`❌ MISMATCH: "${dataverseValue}" → "${salesforceValue}" (${objectName}.${fieldName})`);
        console.log(`   Error: Country Master ID not found in CSV`);
      }
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('\n📊 COMPARISON SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total Custom Metadata Records: ${metadataRecords.length}`);
  console.log(`Matches: ${matches.length}`);
  console.log(`Mismatches: ${mismatches.length}`);
  console.log(`Match Rate: ${((matches.length / metadataRecords.length) * 100).toFixed(2)}%`);

  if (mismatches.length > 0) {
    console.log('\n❌ MISMATCHES FOUND:');
    console.log('═'.repeat(80));
    for (const mismatch of mismatches) {
      const record = mismatch.metadataRecord;
      console.log(`\nRecord: ${record.DeveloperName || record.Id}`);
      console.log(`  Dataverse Value: ${mismatch.dataverseValue}`);
      console.log(`  Salesforce Value: ${record.Value__c}`);
      console.log(`  Object.Field: ${record.Object__c}.${record.Field__c}`);
      console.log(`  Dataverse Field: ${record.Dataverse_Field__c}`);
      console.log(`  Error: ${mismatch.error}`);
    }
  } else {
    console.log('\n✅ ALL VALUES MATCH! No mismatches found.');
  }

  // Step 4: Check for CSV values not in Custom Metadata
  console.log('\n\n🔍 Checking for CSV values missing in Custom Metadata...');
  const metadataValues = new Set(metadataRecords.map(r => r.Dataverse_Value__c).filter(v => v));
  const missingInMetadata: string[] = [];

  for (const masterId of countryMasterIds) {
    if (!metadataValues.has(masterId)) {
      const csvRecord = countryMap.get(masterId);
      missingInMetadata.push(masterId);
      console.log(`⚠️  CSV Country "${masterId}" (${csvRecord?.accelins_name || 'N/A'}) not found in Custom Metadata`);
    }
  }

  if (missingInMetadata.length > 0) {
    console.log(`\n⚠️  Found ${missingInMetadata.length} Country Master IDs in CSV that are not in Custom Metadata`);
  } else {
    console.log('\n✅ All CSV Country Master IDs are present in Custom Metadata');
  }

  // Save report
  const reportPath = path.resolve(process.cwd(), 'reports', 'country-metadata-comparison.json');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    csvRecordCount: countryRecords.length,
    csvUniqueMasterIds: countryMasterIds.size,
    metadataRecordCount: metadataRecords.length,
    matches: matches.length,
    mismatches: mismatches.length,
    matchRate: ((matches.length / metadataRecords.length) * 100).toFixed(2) + '%',
    missingInMetadata: missingInMetadata.length,
    details: {
      matches: matches.map(m => ({
        developerName: m.metadataRecord.DeveloperName,
        dataverseValue: m.dataverseValue,
        salesforceValue: m.metadataRecord.Value__c,
        objectField: `${m.metadataRecord.Object__c}.${m.metadataRecord.Field__c}`,
        csvCountryName: m.csvRecord.accelins_name,
        csvAlpha2Code: m.csvRecord.accelins_alpha2code
      })),
      mismatches: mismatches.map(m => ({
        developerName: m.metadataRecord.DeveloperName,
        dataverseValue: m.dataverseValue,
        salesforceValue: m.metadataRecord.Value__c,
        objectField: `${m.metadataRecord.Object__c}.${m.metadataRecord.Field__c}`,
        error: m.error
      })),
      missingInMetadata: missingInMetadata.map(id => {
        const record = countryMap.get(id);
        return {
          countryMasterId: id,
          countryName: record?.accelins_name,
          alpha2Code: record?.accelins_alpha2code
        };
      })
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  console.log('\n✅ Comparison completed!\n');
}

compareCountryData().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
