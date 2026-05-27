/**
 * Validate Test Data Fields
 * 
 * Checks that all fields used in Opportunity and Contact creation
 * actually exist in Salesforce and have valid picklist values.
 */

import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { logger } from '../src/utils/logger';
import axios from 'axios';

interface FieldInfo {
  name: string;
  type: string;
  picklistValues?: Array<{ value: string; active: boolean }>;
  nillable: boolean;
  createable: boolean;
}

async function validateFields() {
  try {
    // Authenticate
    logger.info('🔐 Authenticating with Salesforce...');
    const authResult = await SalesforceJWTAuth.authenticate();
    
    const instanceUrl = authResult.instanceUrl;
    const accessToken = authResult.accessToken;
    
    // Describe Opportunity and Contact objects
    logger.info('📋 Describing Opportunity and Contact objects...');
    
    const [oppDescribe, contactDescribe] = await Promise.all([
      axios.get(`${instanceUrl}/services/data/v58.0/sobjects/Opportunity/describe`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      }),
      axios.get(`${instanceUrl}/services/data/v58.0/sobjects/Contact/describe`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
    ]);
    
    const oppFields = new Map<string, FieldInfo>();
    const contactFields = new Map<string, FieldInfo>();
    
    // Build field maps
    oppDescribe.data.fields.forEach((field: any) => {
      oppFields.set(field.name, {
        name: field.name,
        type: field.type,
        picklistValues: field.picklistValues,
        nillable: field.nillable,
        createable: field.createable
      });
    });
    
    contactDescribe.data.fields.forEach((field: any) => {
      contactFields.set(field.name, {
        name: field.name,
        type: field.type,
        picklistValues: field.picklistValues,
        nillable: field.nillable,
        createable: field.createable
      });
    });
    
    // Fields used in Opportunity creation
    const oppFieldsUsed = [
      'Name', 'StageName', 'Type', 'Amount', 'Probability', 'CloseDate', 'NextStep',
      'LeadSource', 'Description', 'AccountId', 'CurrencyIsoCode', 'ForecastCategoryName',
      'Budget_Confirmed__c', 'Discovery_Completed__c', 'Review_Staging_Sent__c',
      'ROI_Analysis_Completed__c', 'Date_Stage_Name_Last_Changed__c'
    ];
    
    // Fields used in Contact creation
    const contactFieldsUsed = [
      'FirstName', 'LastName', 'Email', 'Phone', 'AccountId', 'CurrencyIsoCode',
      'Jigsaw', 'MiddleName', 'Suffix', 'Salutation', 'LeadSource',
      'MailingGeocodeAccuracy', 'MailingLatitude', 'MailingLongitude',
      'MailingStreet', 'MailingCity', 'MailingState', 'MailingPostalCode', 'MailingCountry'
    ];
    
    // Validate Opportunity fields
    logger.info('\n📊 Validating Opportunity fields...');
    const invalidOppFields: string[] = [];
    const invalidOppPicklistValues: Array<{ field: string; value: string }> = [];
    
    for (const fieldName of oppFieldsUsed) {
      const field = oppFields.get(fieldName);
      if (!field) {
        invalidOppFields.push(fieldName);
        logger.error(`  ❌ Field does not exist: ${fieldName}`);
      } else if (!field.createable) {
        logger.warn(`  ⚠️  Field exists but is not createable: ${fieldName} (type: ${field.type})`);
      } else {
        logger.info(`  ✅ ${fieldName} (type: ${field.type})`);
        
        // Check picklist values for specific fields
        if (fieldName === 'StageName' && field.picklistValues) {
          const validValues = field.picklistValues
            .filter(pv => pv.active)
            .map(pv => pv.value);
          logger.info(`     Valid StageName values: ${validValues.join(', ')}`);
          
          // Check if our used values are valid
          // Note: "Pipeline" stage requires Estimated_Onboarding_Date__c which doesn't exist
          // Note: "Contract" stage requires Win Reason field which we don't have the API name for
          // Note: "Unqualified" stage requires Decline GWP and Unqualified Reason fields which we don't have API names for
          const usedValues = ['Due Diligence', 'Go‑Live', 'Active'];
          for (const usedValue of usedValues) {
            if (!validValues.includes(usedValue)) {
              invalidOppPicklistValues.push({ field: fieldName, value: usedValue });
              logger.error(`     ❌ Invalid StageName value: ${usedValue}`);
            }
          }
        }
        
        if (fieldName === 'Type' && field.picklistValues) {
          const validValues = field.picklistValues
            .filter(pv => pv.active)
            .map(pv => pv.value);
          logger.info(`     Valid Type values: ${validValues.join(', ')}`);
          
          const usedValues = ['Existing Business', 'New Business', 'Member'];
          for (const usedValue of usedValues) {
            if (!validValues.includes(usedValue)) {
              invalidOppPicklistValues.push({ field: fieldName, value: usedValue });
              logger.error(`     ❌ Invalid Type value: ${usedValue}`);
            }
          }
        }
        
        if (fieldName === 'LeadSource' && field.picklistValues) {
          const validValues = field.picklistValues
            .filter(pv => pv.active)
            .map(pv => pv.value);
          logger.info(`     Valid LeadSource values: ${validValues.join(', ')}`);
          
          const usedValues = ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'];
          for (const usedValue of usedValues) {
            if (!validValues.includes(usedValue)) {
              invalidOppPicklistValues.push({ field: fieldName, value: usedValue });
              logger.error(`     ❌ Invalid LeadSource value: ${usedValue}`);
            }
          }
        }
      }
    }
    
    // Validate Contact fields
    logger.info('\n📊 Validating Contact fields...');
    const invalidContactFields: string[] = [];
    const invalidContactPicklistValues: Array<{ field: string; value: string }> = [];
    
    for (const fieldName of contactFieldsUsed) {
      const field = contactFields.get(fieldName);
      if (!field) {
        invalidContactFields.push(fieldName);
        logger.error(`  ❌ Field does not exist: ${fieldName}`);
      } else if (!field.createable) {
        logger.warn(`  ⚠️  Field exists but is not createable: ${fieldName} (type: ${field.type})`);
      } else {
        logger.info(`  ✅ ${fieldName} (type: ${field.type})`);
        
        // Check picklist values
        if (fieldName === 'LeadSource' && field.picklistValues) {
          const validValues = field.picklistValues
            .filter(pv => pv.active)
            .map(pv => pv.value);
          logger.info(`     Valid LeadSource values: ${validValues.join(', ')}`);
          
          const usedValues = ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'];
          for (const usedValue of usedValues) {
            if (!validValues.includes(usedValue)) {
              invalidContactPicklistValues.push({ field: fieldName, value: usedValue });
              logger.error(`     ❌ Invalid LeadSource value: ${usedValue}`);
            }
          }
        }
      }
    }
    
    // Summary
    logger.info('\n📈 Validation Summary:');
    logger.info(`   Opportunity: ${oppFieldsUsed.length - invalidOppFields.length}/${oppFieldsUsed.length} fields valid`);
    if (invalidOppFields.length > 0) {
      logger.error(`   ❌ Invalid Opportunity fields: ${invalidOppFields.join(', ')}`);
    }
    if (invalidOppPicklistValues.length > 0) {
      logger.error(`   ❌ Invalid Opportunity picklist values: ${invalidOppPicklistValues.map(iv => `${iv.field}=${iv.value}`).join(', ')}`);
    }
    
    logger.info(`   Contact: ${contactFieldsUsed.length - invalidContactFields.length}/${contactFieldsUsed.length} fields valid`);
    if (invalidContactFields.length > 0) {
      logger.error(`   ❌ Invalid Contact fields: ${invalidContactFields.join(', ')}`);
    }
    if (invalidContactPicklistValues.length > 0) {
      logger.error(`   ❌ Invalid Contact picklist values: ${invalidContactPicklistValues.map(iv => `${iv.field}=${iv.value}`).join(', ')}`);
    }
    
    if (invalidOppFields.length === 0 && invalidOppPicklistValues.length === 0 &&
        invalidContactFields.length === 0 && invalidContactPicklistValues.length === 0) {
      logger.info('\n✅ All fields and picklist values are valid!');
      process.exit(0);
    } else {
      logger.error('\n❌ Validation failed. Please fix the issues above.');
      process.exit(1);
    }
    
  } catch (error: any) {
    logger.error('❌ Validation failed:', error.message);
    if (error.response) {
      logger.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run validation
validateFields();

