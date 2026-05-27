/**
 * Generate the exact request body for SF-113-API-002
 * This simulates what the step definition does when creating an Account
 */

// Input from the test scenario
const inputData: Record<string, any> = {
  Name: 'API Test Account',
  Region__c: 'US'
};

// Simulate the step definition logic
const data: Record<string, any> = { ...inputData };

// Make name HIGHLY unique with PREFIX to avoid Salesforce fuzzy duplicate detection
const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase(); // 8 chars
const timestamp = Date.now();
const randomNum = Math.floor(Math.random() * 100000);
if (data.Name) {
  // Prefix with unique ID to avoid fuzzy matching on "Test Account" etc.
  data.Name = `${uniqueId}${randomNum}_API_${data.Name.replace(/\s+/g, '')}_${timestamp}`;
}

// REQUIRED FIELDS
// CRITICAL: Type is now REQUIRED - cannot create Account without Type
if (!data.Type) {
  data.Type = 'Agency'; // Default Type if not provided
  console.log('⚠️  Type not provided in data table - defaulting to "Agency". Type is now REQUIRED for Account creation.');
}

if (!data.Functional_Currency__c) {
  data.Functional_Currency__c = 'USD';
}

// CRITICAL: Region is REQUIRED
if (!data.Region__c) {
  data.Region__c = 'US'; // Default to US (changed from EU to match DEFAULT_ACCOUNT_DATA)
}

// Remove UI-only fields that are not accessible via API
if ('State_Province__c' in data) {
  delete data.State_Province__c;
}
if ('Country__c' in data) {
  delete data.Country__c;
}

if (!data.Account_Status__c) {
  data.Account_Status__c = 'New';
}

// BILLING ADDRESS (Complete)
// Set BillingCountry and related fields based on Region__c
if (!data.BillingCountry) {
  switch (data.Region__c) {
    case 'US':
      data.BillingCountry = 'United States';
      data.BillingCity = data.BillingCity || 'New York';
      data.BillingState = data.BillingState || 'NY';
      data.BillingPostalCode = data.BillingPostalCode || '10001';
      break;
    case 'UK':
      data.BillingCountry = 'United Kingdom';
      data.BillingCity = data.BillingCity || 'London';
      data.BillingPostalCode = data.BillingPostalCode || 'EC1A 1BB';
      break;
    case 'CA':
    case 'CAN':
      data.BillingCountry = 'Canada';
      data.BillingCity = data.BillingCity || 'Toronto';
      data.BillingState = data.BillingState || 'ON';
      data.BillingPostalCode = data.BillingPostalCode || 'M5H 2N2';
      break;
    case 'EU':
    default:
      data.BillingCountry = 'Germany';
      data.BillingCity = data.BillingCity || 'Munich';
      data.BillingState = data.BillingState || 'Bavaria';
      data.BillingPostalCode = data.BillingPostalCode || '80331';
  }
} else {
  // BillingCountry is already set, but ensure BillingState is set for regions that require it
  if (!data.BillingState) {
    switch (data.Region__c) {
      case 'US':
        data.BillingState = 'NY';
        data.BillingCity = data.BillingCity || 'New York';
        data.BillingPostalCode = data.BillingPostalCode || '10001';
        break;
      case 'CA':
      case 'CAN':
        data.BillingState = 'ON';
        data.BillingCity = data.BillingCity || 'Toronto';
        data.BillingPostalCode = data.BillingPostalCode || 'M5H 2N2';
        break;
      case 'EU':
        data.BillingState = 'Bavaria';
        data.BillingCity = data.BillingCity || 'Munich';
        data.BillingPostalCode = data.BillingPostalCode || '80331';
        break;
    }
  }
}

// CRITICAL: BillingState MUST be set when Region__c is 'US' (validation rule requirement)
if (data.Region__c === 'US' && !data.BillingState) {
  data.BillingState = 'NY'; // Default US state
}

if (!data.BillingStreet) {
  data.BillingStreet = '123 API Test Street\nSuite 200';
}

// SHIPPING ADDRESS (Complete)
if (!data.ShippingStreet) {
  data.ShippingStreet = data.BillingStreet;
  data.ShippingCity = data.BillingCity;
  data.ShippingState = data.BillingState;
  data.ShippingPostalCode = data.BillingPostalCode;
  data.ShippingCountry = data.BillingCountry;
}

// CONTACT INFORMATION
if (!data.Phone) {
  data.Phone = '+1-555-0100';
}
if (!data.Fax) {
  data.Fax = '+1-555-0101';
}
if (!data.Website) {
  data.Website = 'https://api-test.example.com';
}

// COMPANY INFORMATION
if (!data.Industry) {
  data.Industry = 'Insurance';
}
if (!data.NumberOfEmployees) {
  data.NumberOfEmployees = 100;
}
if (!data.AnnualRevenue) {
  data.AnnualRevenue = 1000000;
}
if (!data.Ownership) {
  data.Ownership = 'Private';
}

// DESCRIPTION
if (!data.Description) {
  data.Description = `Account created via API test at ${new Date().toISOString()}`;
}

// Output the final request body
console.log('═══════════════════════════════════════════════════════════════');
console.log('SF-113-API-002 Request Body');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\nInput from test scenario:');
console.log(JSON.stringify(inputData, null, 2));
console.log('\nFinal request body (after step definition processing):');
console.log(JSON.stringify(data, null, 2));
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`Total fields: ${Object.keys(data).length}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// Also save to a file for easy analysis
const fs = require('fs');
const path = require('path');
const outputFile = path.join(__dirname, '..', 'reports', 'sf113-api002-request-body.json');
fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
console.log(`✅ Request body saved to: ${outputFile}`);

