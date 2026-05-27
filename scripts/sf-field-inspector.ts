#!/usr/bin/env ts-node
/**
 * Salesforce Field Inspector
 * 
 * Queries the Salesforce API to inspect field metadata for Account objects.
 * Useful for debugging UI selectors and understanding field structure.
 * 
 * Usage:
 *   npx ts-node scripts/sf-field-inspector.ts
 *   npx ts-node scripts/sf-field-inspector.ts --field Type
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';

// Load environment
const env = process.env.ENV || 'qa';
const envConfigPath = path.resolve(__dirname, '../src/config/env', `.env.${env}`);
if (fs.existsSync(envConfigPath)) {
  dotenv.config({ path: envConfigPath, override: true });
  console.log(`📁 Loaded environment from: ${envConfigPath}`);
}

interface FieldMetadata {
  name: string;
  label: string;
  type: string;
  required: boolean;
  picklistValues?: Array<{ value: string; label: string; active: boolean }>;
  referenceTo?: string[];
  relationshipName?: string;
  length?: number;
  precision?: number;
  scale?: number;
  updateable: boolean;
  createable: boolean;
  nillable: boolean;
  htmlFormatted?: boolean;
  controllerName?: string;
  dependentPicklist?: boolean;
}

async function inspectAccountFields() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    Salesforce Account Field Inspector                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Authenticate
    console.log('🔐 Authenticating with Salesforce...');
    const authResult = await SalesforceJWTAuth.authenticate();
    console.log(`✅ Authenticated to: ${authResult.instanceUrl}`);
    
    // Get Account describe
    console.log('\n📊 Fetching Account object metadata...');
    const apiVersion = process.env.SF_API_VERSION || '60.0';
    const describeUrl = `${authResult.instanceUrl}/services/data/v${apiVersion}/sobjects/Account/describe`;
    
    const response = await fetch(describeUrl, {
      headers: {
        'Authorization': `Bearer ${authResult.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to describe Account: ${error}`);
    }
    
    const accountDescribe = await response.json();
    
    // Check for specific field argument
    const args = process.argv.slice(2);
    const fieldIndex = args.indexOf('--field');
    const specificField = fieldIndex !== -1 && args[fieldIndex + 1] ? args[fieldIndex + 1] : null;
    
    if (specificField) {
      // Show specific field details
      const field = accountDescribe.fields.find((f: any) => 
        f.name.toLowerCase() === specificField.toLowerCase() || 
        f.label.toLowerCase() === specificField.toLowerCase()
      );
      
      if (field) {
        console.log(`\n📋 Field Details: ${field.label} (${field.name})`);
        console.log('═'.repeat(60));
        console.log(`  API Name: ${field.name}`);
        console.log(`  Label: ${field.label}`);
        console.log(`  Type: ${field.type}`);
        console.log(`  Required: ${!field.nillable}`);
        console.log(`  Createable: ${field.createable}`);
        console.log(`  Updateable: ${field.updateable}`);
        console.log(`  Length: ${field.length || 'N/A'}`);
        
        if (field.type === 'picklist' && field.picklistValues) {
          console.log(`\n  📝 Picklist Values (${field.picklistValues.length}):`);
          field.picklistValues.forEach((pv: any, idx: number) => {
            if (pv.active) {
              console.log(`    ${idx + 1}. "${pv.value}" (label: "${pv.label}")`);
            }
          });
        }
        
        if (field.dependentPicklist) {
          console.log(`\n  ⚠️  This is a dependent picklist`);
          console.log(`  Controller: ${field.controllerName || 'Unknown'}`);
        }
        
        if (field.referenceTo && field.referenceTo.length > 0) {
          console.log(`\n  🔗 References: ${field.referenceTo.join(', ')}`);
        }
        
        // Show raw JSON for debugging
        console.log('\n  📄 Raw Field Metadata:');
        console.log(JSON.stringify(field, null, 2).split('\n').map(l => '    ' + l).join('\n'));
      } else {
        console.log(`\n❌ Field "${specificField}" not found`);
        console.log('Available fields:');
        accountDescribe.fields.slice(0, 20).forEach((f: any) => {
          console.log(`  - ${f.name} (${f.label})`);
        });
        console.log(`  ... and ${accountDescribe.fields.length - 20} more`);
      }
    } else {
      // Show summary of key fields
      console.log(`\n📋 Account Object Summary:`);
      console.log(`  Total Fields: ${accountDescribe.fields.length}`);
      console.log(`  Record Types: ${accountDescribe.recordTypeInfos?.length || 0}`);
      
      // Key fields for UI testing
      const keyFields = ['Name', 'Type', 'Region__c', 'PTY_Code__c', 'Party_ID__c', 'AccountNumber', 'OwnerId'];
      console.log('\n🔑 Key Fields for UI Testing:');
      console.log('═'.repeat(60));
      
      for (const fieldName of keyFields) {
        const field = accountDescribe.fields.find((f: any) => f.name === fieldName);
        if (field) {
          const typeInfo = field.type === 'picklist' 
            ? `picklist (${field.picklistValues?.filter((p: any) => p.active).length || 0} values)` 
            : field.type;
          console.log(`  ${field.label.padEnd(25)} | ${field.name.padEnd(20)} | ${typeInfo}`);
        }
      }
      
      // Picklist fields
      const picklistFields = accountDescribe.fields.filter((f: any) => f.type === 'picklist' && f.createable);
      console.log(`\n📝 Picklist Fields (${picklistFields.length} createable):`);
      console.log('═'.repeat(60));
      picklistFields.slice(0, 15).forEach((field: any) => {
        const values = field.picklistValues?.filter((p: any) => p.active).length || 0;
        const dependent = field.dependentPicklist ? ' [DEPENDENT]' : '';
        console.log(`  ${field.label.padEnd(30)} | ${field.name.padEnd(25)} | ${values} values${dependent}`);
      });
      
      // Show Type field specifically
      const typeField = accountDescribe.fields.find((f: any) => f.name === 'Type');
      if (typeField) {
        console.log('\n🎯 Type Field (Critical for Testing):');
        console.log('═'.repeat(60));
        console.log(`  API Name: ${typeField.name}`);
        console.log(`  Label: ${typeField.label}`);
        console.log(`  Type: ${typeField.type}`);
        console.log(`  Required: ${!typeField.nillable}`);
        console.log(`  Dependent Picklist: ${typeField.dependentPicklist || false}`);
        if (typeField.controllerName) {
          console.log(`  Controller Field: ${typeField.controllerName}`);
        }
        
        if (typeField.picklistValues) {
          console.log(`\n  Available Values:`);
          typeField.picklistValues
            .filter((pv: any) => pv.active)
            .forEach((pv: any, idx: number) => {
              console.log(`    ${idx + 1}. "${pv.value}"`);
            });
        }
      }
    }
    
    console.log('\n✅ Field inspection complete');
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run
inspectAccountFields();
