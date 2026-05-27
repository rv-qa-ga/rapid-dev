/**
 * Data Factory & API Common Step Definitions
 * 
 * Consolidated steps for:
 * - Test data creation via Salesforce API
 * - API authentication
 * - Common API response handling
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { testDataFactory, COUNTRY_DEFAULTS } from '../../test-data/TestDataFactory';
import { logger } from '../../utils/logger';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';

/** SF-942: geographic helper codes (from getRegionFromCountry) → Reporting_Region__c picklist */
function mapLegacyGeoRegionToReportingRegion(region: string): string {
  const m: Record<string, string> = {
    US: 'US',
    CA: 'CA',
    EU: 'EU',
    UK: 'UK&I',
    APAC: 'US',
    ROW: 'US',
  };
  return m[region] || 'US';
}

/**
 * Initialize TestDataFactory JWT to match the active API client user when set
 * (e.g. after "I have a valid Salesforce API token as QA MRD user") so record creation uses the same identity.
 */
async function initTestDataFactoryFromContext(world: AutomationWorld): Promise<void> {
  const jwt = world.testContext.apiJwtUsername?.trim();
  await testDataFactory.initialize(jwt || undefined);
}

// ============================================================================
// API AUTHENTICATION
// ============================================================================
// Note: Authentication steps moved to common/authentication.steps.ts
// This file only contains test data factory steps

// ============================================================================
// TEST DATA FACTORY - ACCOUNTS
// ============================================================================

// Step definition for "I have a test Account created via API with Type {string}"
// This is more specific than the generic "I have a test Account created via API with {word} {string}" step
// Using regex to ensure exact match and avoid ambiguity
Given(/^I have a test Account created via API with Type "?([^"]+)"?$/, async function (this: AutomationWorld, accountType: string) {
  logger.info(`Creating test Account with Type: ${accountType}`);
  
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const randomNum = Math.floor(Math.random() * 100000);
  const accountName = `${uniqueId}${randomNum}_${accountType.replace(/\s+/g, '')}_${timestamp}`;
  
  const account = await testDataFactory.createAccount({
    Name: accountName,
    Type: accountType,
  });
  
  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`✅ Created Account with Type="${accountType}": ${account.id}`);
});

Given('I have a test Account created via API with all required fields', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // UNIQUE IDENTIFIER GENERATION
  // Format: ABC12345_1234567890123 (8 char alphanumeric + timestamp)
  // This ensures MAXIMUM uniqueness to avoid Salesforce duplicate detection
  // ═══════════════════════════════════════════════════════════════════════════
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase(); // 8 chars
  const uniqueName = `${uniqueId}_${timestamp}`;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MAXIMUM FIELDS - Complete account data for robust test data
  // ALL accounts get Type='Agency' by default (except Type-specific scenarios)
  // TestDataFactory will apply additional defaults from DEFAULT_ACCOUNT_DATA
  // ═══════════════════════════════════════════════════════════════════════════
  const accountData: Record<string, any> = {
    // ─────────────────────────────────────────────────────────────────────────
    // IDENTITY - Unique prefix to avoid Salesforce fuzzy matching
    // ─────────────────────────────────────────────────────────────────────────
    Name: uniqueName,
    
    // ─────────────────────────────────────────────────────────────────────────
    // REQUIRED FIELDS (Type is ALWAYS included by default)
    // ─────────────────────────────────────────────────────────────────────────
    Type: 'Agency',                                    // DEFAULT TYPE - always set
    Account_Status__c: 'Prospect',                          // Default status
    Functional_Currency__c: 'USD',                     // Required for certain types
    Reporting_Region__c: 'EU',                                   // Required field
    
    // ─────────────────────────────────────────────────────────────────────────
    // CONTACT INFORMATION
    // ─────────────────────────────────────────────────────────────────────────
    Phone: '+1-555-0100',
    Fax: '+1-555-0101',
    Website: 'https://test-automation.example.com',
    
    // ─────────────────────────────────────────────────────────────────────────
    // BILLING ADDRESS (Complete)
    // ─────────────────────────────────────────────────────────────────────────
    // NOTE: BillingState must be blank unless BillingCountry is "United States" or "Canada"
    // Validation rule: "Billing State/Province must be blank unless the country is United States or Canada"
    BillingStreet: '123 Automation Test Street\nSuite 100',
    BillingCity: 'Munich',
    // BillingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so BillingState must be blank
    BillingPostalCode: '80331',
    BillingCountry: 'Germany',
    
    // ─────────────────────────────────────────────────────────────────────────
    // SHIPPING ADDRESS (Complete)
    // ─────────────────────────────────────────────────────────────────────────
    // NOTE: ShippingState should match BillingState logic (blank for non-US/Canada)
    ShippingStreet: '456 Test Shipping Lane\nBuilding B',
    ShippingCity: 'Munich',
    // ShippingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so ShippingState must be blank
    ShippingPostalCode: '80333',
    ShippingCountry: 'Germany',
    
    // ─────────────────────────────────────────────────────────────────────────
    // COMPANY INFORMATION
    // ─────────────────────────────────────────────────────────────────────────
    Industry: 'Insurance',
    NumberOfEmployees: 250,
    AnnualRevenue: 5000000,
    TickerSymbol: 'TEST',
    Ownership: 'Private',
    
    // ─────────────────────────────────────────────────────────────────────────
    // DESCRIPTION
    // ─────────────────────────────────────────────────────────────────────────
    Description: `Test account created for E2E automation testing.\nCreated: ${new Date().toISOString()}\nUnique ID: ${uniqueId}`,
  };
  
  logger.info(`📝 Creating Account with MAXIMUM FIELDS:`);
  logger.info(`   Name: ${accountData.Name}`);
  logger.info(`   Type: ${accountData.Type}`);
  logger.info(`   Reporting_Region__c: ${accountData.Reporting_Region__c}`);
  logger.info(`   Fields populated: ${Object.keys(accountData).length}`);
  
  // Create new account - don't reuse existing to ensure clean test data
  const account = await testDataFactory.createAccount(accountData, { 
    checkExists: false,     // Skip check - unique name ensures no conflicts
    deleteIfExists: false,  // Not needed with unique name
    reuseExisting: false 
  });

  // Verify the account was created successfully
  if (!account || !account.id) {
    throw new Error('Account creation failed - no ID returned');
  }
  
  logger.info(`📋 Account created with ID: ${account.id}`);
  
  logger.info(`✅ Account created and ready: ${account.id}`);

  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.accountData = accountData;
  this.testContext.accountCreatedViaAPI = true; // Mark as API-created - Type cannot be changed
  
  // Store flag to indicate this account should NOT be cleaned up until test completes
  this.testContext.skipCleanup = false; // Will be cleaned up after test
  
  logger.info(`✅ Test Account created and verified: ${account.id} (${account.name})`);
  logger.info(`⚠️  Note: Type cannot be changed on API-created accounts`);
});

// Alias for backward compatibility - same as "with all required fields"
Given('I have a test Account created via API', async function (this: AutomationWorld) {
  // Delegate to the "with all required fields" step by calling it directly
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `${uniqueId}_${timestamp}`;
  
  const accountData: Record<string, any> = {
    Name: uniqueName,
    Type: 'Agency',
    Account_Status__c: 'Prospect',
    Functional_Currency__c: 'USD',
    Reporting_Region__c: 'EU',
    Phone: '+1-555-0100',
    Fax: '+1-555-0101',
    Website: 'https://test-automation.example.com',
    BillingStreet: '123 Automation Test Street\nSuite 100',
    BillingCity: 'Munich',
    // BillingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '80331',
    BillingCountry: 'Germany',
    ShippingStreet: '456 Test Shipping Lane\nBuilding B',
    ShippingCity: 'Munich',
    // ShippingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so ShippingState must be blank
    ShippingPostalCode: '80333',
    ShippingCountry: 'Germany',
    Industry: 'Insurance',
    NumberOfEmployees: 250,
    AnnualRevenue: 5000000,
    TickerSymbol: 'TEST',
    Ownership: 'Private',
    Description: `Test account created for E2E automation testing.\nCreated: ${new Date().toISOString()}\nUnique ID: ${uniqueId}`,
  };
  
  const account = await testDataFactory.createAccount(accountData, { 
    checkExists: false,
    deleteIfExists: false,
    reuseExisting: false 
  });

  if (!account || !account.id) {
    throw new Error('Account creation failed - no ID returned');
  }
  
  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.accountData = accountData;
  this.testContext.accountCreatedViaAPI = true;
  this.testContext.skipCleanup = false;
  
  logger.info(`✅ Test Account created and verified: ${account.id} (${account.name})`);
});

// Note: "I have an existing Account record" is handled by the generic step "I have an existing {word} record" below
// Removed specific step to avoid ambiguity

Given('I have an Account with status {string}', async function (this: AutomationWorld, status: string) {
  await initTestDataFactoryFromContext(this);
  
  // Generate unique identifier
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `${uniqueId}_${timestamp}`;
  
  const account = await testDataFactory.createAccountWithStatus(status, {
    // ─────────────────────────────────────────────────────────────────────────
    // MAXIMUM FIELDS for status-specific account
    // ─────────────────────────────────────────────────────────────────────────
    Name: uniqueName,
    Type: 'Agency',                                    // DEFAULT TYPE
    Functional_Currency__c: 'USD',
    Reporting_Region__c: 'EU',
    
    // Contact Information
    Phone: '+1-555-0100',
    Fax: '+1-555-0101',
    Website: 'https://test-automation.example.com',
    
    // Billing Address
    // NOTE: BillingState must be blank unless BillingCountry is "United States" or "Canada"
    BillingStreet: '123 Automation Test Street',
    BillingCity: 'Munich',
    // BillingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '80331',
    BillingCountry: 'Germany',
    
    // Company Information
    Industry: 'Insurance',
    NumberOfEmployees: 250,
    AnnualRevenue: 5000000,
    Ownership: 'Private',
  });
  
  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.salesforceAccountId = account.id;
  this.testContext.salesforceAccount = { Id: account.id, Name: account.name };
  logger.info(`✅ Account with status "${status}" created: ${account.id}`);
});

Given('I have an Account with Functional_Currency {string}', async function (this: AutomationWorld, currency: string) {
  await initTestDataFactoryFromContext(this);

  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `${uniqueId}_${timestamp}`;

  const account = await testDataFactory.createAccount(
    {
      Name: uniqueName,
      Type: 'Agency',
      Account_Status__c: 'Active',
      Functional_Currency__c: currency,
      Reporting_Region__c: 'EU',
      Phone: '+1-555-0100',
      BillingStreet: '123 Automation Test Street',
      BillingCity: 'Munich',
      BillingPostalCode: '80331',
      BillingCountry: 'Germany',
      Industry: 'Insurance',
      NumberOfEmployees: 250,
      AnnualRevenue: 5000000,
      Ownership: 'Private',
    },
    { checkExists: false, deleteIfExists: false, reuseExisting: false }
  );

  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  logger.info(`✅ Account with Functional_Currency "${currency}" created: ${account.id}`);
});

Given('I have an Account with Type {string} created via API', async function (this: AutomationWorld, accountType: string) {
  await initTestDataFactoryFromContext(this);
  
  // Generate unique identifier
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `${uniqueId}_${timestamp}`;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TYPE-SPECIFIC ACCOUNT CREATION
  // This step is for scenarios that TEST specific account types
  // The Type is passed as a parameter (not using default)
  // ═══════════════════════════════════════════════════════════════════════════
  const account = await testDataFactory.createAccount({
    Name: uniqueName,
    Type: accountType,                                 // Use specified type
    Account_Status__c: 'Prospect',
    Functional_Currency__c: 'USD',
    Reporting_Region__c: 'EU',
    
    // Contact Information
    Phone: '+1-555-0100',
    Fax: '+1-555-0101',
    Website: 'https://test-automation.example.com',
    
    // Billing Address
    // NOTE: BillingState must be blank unless BillingCountry is "United States" or "Canada"
    BillingStreet: '123 Automation Test Street',
    BillingCity: 'Munich',
    // BillingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '80331',
    BillingCountry: 'Germany',
    
    // Company Information
    Industry: 'Insurance',
    NumberOfEmployees: 250,
    AnnualRevenue: 5000000,
    Ownership: 'Private',
  }, { 
    checkExists: false,     // Skip check - unique name ensures no conflicts
    deleteIfExists: false,
    reuseExisting: false 
  });

  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.accountType = accountType;
  this.testContext.accountCreatedViaAPI = true; // Mark as API-created - Type cannot be changed
  logger.info(`✅ Account with Type "${accountType}" created: ${account.id} (${uniqueName})`);
  logger.info(`⚠️  Note: Type cannot be changed on API-created accounts`);
});

Given('I have multiple Account records', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  const accounts = [];
  for (let i = 1; i <= 3; i++) {
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const account = await testDataFactory.createAccount({
      Name: `${uniqueId}_${timestamp}_${i}`,
      Type: 'Agency',                                  // DEFAULT TYPE
      Account_Status__c: 'Prospect',
      Functional_Currency__c: 'USD',
      Reporting_Region__c: 'EU',
      BillingCountry: 'Germany',
      Industry: 'Insurance',
    });
    accounts.push(account);
  }

  this.testContext.accountIds = accounts.map(a => a.id);
  logger.info(`✅ Created ${accounts.length} test accounts with Type=Agency`);
});

// Removed to avoid ambiguity with 'I have {int} {word} records' in api-common.steps.ts
// Use the generic step instead: Given I have 3 Account records

// ============================================================================
// TEST DATA FACTORY - CONTACTS
// ============================================================================

Given('I have a test Contact created via API', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  if (!this.testContext.accountId) {
    const account = await testDataFactory.createAccount({
      Name: `${uniqueId}_Parent_${timestamp}`,
      Type: 'Agency',
      Functional_Currency__c: 'USD',
      Reporting_Region__c: 'EU',
      BillingCountry: 'Germany',
    });
    this.testContext.accountId = account.id;
  }

  const contact = await testDataFactory.createContact({
    FirstName: uniqueId,
    LastName: `Contact_${timestamp}`,
    Email: `${uniqueId.toLowerCase()}@test.example.com`,
    Phone: '+1-555-0100',
    Title: 'Test Contact',
    Department: 'Testing',
  }, this.testContext.accountId);

  this.testContext.contactId = contact.id;
  this.testContext.contactName = contact.name;
  logger.info(`✅ Contact created: ${contact.id} (${uniqueId})`);
});

// ============================================================================
// TEST DATA FACTORY - LEADS
// ============================================================================

/**
 * Helper function to create a comprehensive Lead with all fields populated
 */
async function createComprehensiveLead(world: AutomationWorld): Promise<void> {
  await initTestDataFactoryFromContext(world);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Cycle through different countries for variety
  const countries = ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Netherlands', 'Switzerland'];
  const leadCount = (world.testContext.leadCount || 0) % countries.length;
  const selectedCountry = countries[leadCount];
  world.testContext.leadCount = (world.testContext.leadCount || 0) + 1;
  
  // Get region and currency from country
  const region = getRegionFromCountry(selectedCountry);
  const currency = getCurrencyFromCountry(selectedCountry);
  const countryDefaults = COUNTRY_DEFAULTS[selectedCountry] || { city: 'New York', state: 'New York', postalCode: '10001', phone: '+1-555-0100' };
  const coordinates = getCoordinatesForCountry(selectedCountry);
  
  // Generate unique names with variety
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica'];
  const uniqueFirstName = `${firstNames[leadCount % firstNames.length]}${uniqueId.substring(0, 3)}`;
  const companyTypes = ['Insurance', 'Agency', 'Brokerage', 'Consulting', 'Services', 'Group', 'Partners', 'Associates'];
  const uniqueCompanyName = `${companyTypes[leadCount % companyTypes.length]}${uniqueId}_${timestamp}`;
  
  // Generate unique address
  const streetNumber = Math.floor(Math.random() * 9999) + 1000;
  const suiteNumber = Math.floor(Math.random() * 999) + 100;
  const streetNames = ['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Broadway', 'Washington'];
  const uniqueStreet = `${streetNumber} ${streetNames[leadCount % streetNames.length]} Street\nSuite ${suiteNumber}`;
  const uniquePostalCode = `${countryDefaults.postalCode}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  const uniqueEmail = `lead.${uniqueId.toLowerCase()}.${timestamp}@testcompany${leadCount}.com`;
  const phoneBase = countryDefaults.phone.replace(/\d{4}$/, '');
  const uniquePhone = `${phoneBase}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  
  // Comprehensive Lead data with all fields populated
  const leadData: Record<string, any> = {
    FirstName: uniqueFirstName,
    LastName: `Lead_${uniqueId}_${timestamp}`,
    Company: uniqueCompanyName,
    Status: ['Open - Not Contacted', 'Working - Contacted', 'Qualified', 'Unqualified'][leadCount % 4],
    Email: uniqueEmail,
    Phone: uniquePhone,
    MobilePhone: uniquePhone,
    Title: ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'President', 'VP Operations', 'Chief Technology Officer'][leadCount % 8],
    Industry: ['Insurance', 'Financial Services', 'Healthcare', 'Technology', 'Manufacturing'][leadCount % 5],
    LeadSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference', 'Trade Show'][leadCount % 8],
    Rating: ['Hot', 'Warm', 'Cold'][leadCount % 3],
    Website: `https://www.${uniqueCompanyName.toLowerCase().replace(/\s+/g, '')}.com`,
    
    // Address fields
    Street: uniqueStreet,
    City: countryDefaults.city,
    State: countryDefaults.state,
    PostalCode: uniquePostalCode,
    Country: selectedCountry,
    
    // SF-942: Reporting_Region__c (replaces deprecated Region__c / Distribution_Region__c on Lead)
    Reporting_Region__c: mapLegacyGeoRegionToReportingRegion(region),
    Type__c: ['Member', 'Non-Member MGA'][leadCount % 2], // Cycle through valid Type__c values
    Broker_Sourced__c: 'No',
    Is_Record_Duplicate__c: false,
    Duplicate_Override_Reason__c: `Test data creation - Comprehensive Lead for automation testing. Created: ${new Date().toISOString()}`,
    
    // Additional comprehensive fields
    CurrencyIsoCode: currency,
    NumberOfEmployees: Math.floor(Math.random() * 1000) + 10,
    GeocodeAccuracy: 'Address',
    Latitude: coordinates.latitude,
    Longitude: coordinates.longitude,
    MiddleName: ['A', 'B', 'C', 'D', 'E'][leadCount % 5],
    Suffix: ['Jr.', 'Sr.', 'II', 'III', ''][leadCount % 5],
    Salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'][leadCount % 6],
    
    // Custom Lead fields
    Annual_GWP_Estimate_Year_1__c: Math.floor(Math.random() * 5000000) + 100000,
    Submission_folder_link__c: `https://sharepoint.example.com/folders/test-lead-${uniqueId.toLowerCase()}-${timestamp}`,
    Estimated_Onboarding_Date__c: new Date(Date.now() + (90 + leadCount * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    // SF-993: Proposed_Effective_Date__c removed from Lead — omit on API create
    Product_Overview__c: ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines'][leadCount % 5],
    Prior_Incumbent__c: ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown'][leadCount % 4],
    Series_Entity__c: `Series ${leadCount + 1}`,
  };
  
  // Add description after Type__c is defined
  leadData.Description = `Comprehensive test Lead with variety.\nCountry: ${selectedCountry}\nRegion: ${region}\nCurrency: ${currency}\nType: ${leadData.Type__c}\nCreated: ${new Date().toISOString()}`;
  
  const lead = await testDataFactory.createLead(leadData);

  world.testContext.leadId = lead.id;
  world.testContext.leadName = lead.name;
  world.testContext.leadData = leadData;
  world.testContext.leadType = leadData.Type__c;
  logger.info(`✅ Lead created with comprehensive data: ${lead.id} (Country: ${selectedCountry}, Region: ${region}, Type: ${leadData.Type__c})`);
}

Given('I have an existing Lead record', async function (this: AutomationWorld) {
  await createComprehensiveLead(this);
});

// Alias for backward compatibility
Given('I have a test Lead created via API', async function (this: AutomationWorld) {
  await createComprehensiveLead(this);
});

// ============================================================================
// TEST DATA FACTORY - OPPORTUNITIES
// ============================================================================

Given('I have a test AccountContactRelation created via API', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  // Always create new Account and Contact for ACR to avoid conflicts
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Create a new Account
  const account = await testDataFactory.createAccount({ 
    Name: `ACR_${timestamp}_${uniqueId}_Account`,
    Type: 'Agency',
    Functional_Currency__c: 'USD',
    Reporting_Region__c: 'EU',
    BillingCountry: 'Germany',
  });
  this.testContext.accountId = account.id;
  
  // Create Contact WITH AccountId (this auto-creates the ACR)
  const contact = await testDataFactory.createContact({ 
    FirstName: 'ACR',
    LastName: `Contact_${timestamp}`,
    Email: `acr_${timestamp}@test.example.com`,
    Phone: '+1-555-0100',
  }, this.testContext.accountId); // Pass accountId - this auto-creates ACR
  this.testContext.contactId = contact.id;
  
  // Query for the auto-created ACR
  const acrQuery = `SELECT Id FROM AccountContactRelation WHERE AccountId = '${this.testContext.accountId}' AND ContactId = '${this.testContext.contactId}' LIMIT 1`;
  const queryResult = await testDataFactory.query(acrQuery);
  
  if (queryResult.records && queryResult.records.length > 0) {
    const acrId = queryResult.records[0].Id;
    this.testContext.recordId = acrId;
    this.testContext.recordType = 'AccountContactRelation';
    
    // Register for cleanup
    testDataFactory.registerRecord(acrId, 'AccountContactRelation', `ACR_${acrId}`);
    
    logger.info(`✅ Found auto-created AccountContactRelation: ${acrId}`);
  } else {
    throw new Error('AccountContactRelation was not auto-created when Contact was linked to Account');
  }
});

Given('I have a test Opportunity created via API', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  if (!this.testContext.accountId) {
    const account = await testDataFactory.createAccount({
      Name: `${uniqueId}_OppParent_${timestamp}`,
      Type: 'Agency',
      Functional_Currency__c: 'USD',
      Reporting_Region__c: 'EU',
      BillingCountry: 'Germany',
    });
    this.testContext.accountId = account.id;
  }

  // Calculate close date 30 days from now in YYYY-MM-DD format
  const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const opportunity = await testDataFactory.createOpportunity({
    Name: `${uniqueId}_Opp_${timestamp}`,
    StageName: 'Pipeline',  // API field name is StageName, not Stage
    CloseDate: closeDate,
    Amount: 50000,
    Type: 'New Business',
    LeadSource: 'Web',
    Description: `Test opportunity created for E2E automation. Unique ID: ${uniqueId}`,
  }, this.testContext.accountId);

  this.testContext.opportunityId = opportunity.id;
  this.testContext.opportunityName = opportunity.name;
  logger.info(`✅ Opportunity created: ${opportunity.id} (${uniqueId})`);
});

/**
 * Reusable: Create an Opportunity in a given stage and type (e.g. Pipeline, New Business).
 * Uses testContext.accountId or creates an Account if needed.
 */
Given(
  'an Opportunity exists in stage {string} with Type {string}',
  async function (this: AutomationWorld, stage: string, type: string) {
    try {
      await initTestDataFactoryFromContext(this);
      if (!this.testContext.accountId) {
        const ts = Date.now();
        const uid = Math.random().toString(36).substring(2, 10).toUpperCase();
        const accName = `OppParent_${uid}_${ts}`;
        const acc = await testDataFactory.createAccount({
          Name: accName,
          Type: 'Agency',
          Functional_Currency__c: 'USD',
          Account_Status__c: 'Prospect',
          BillingCountry: 'United States',
          BillingCity: 'New York',
          BillingState: 'New York',
          BillingPostalCode: '10001',
          BillingStreet: '123 Test St',
          ShippingCountry: 'United States',
          ShippingCity: 'New York',
          ShippingPostalCode: '10001',
          ShippingStreet: '456 Test Shipping Lane',
        });
        this.testContext.accountId = acc.id;
        this.testContext.accountName = acc.name || accName;
      }
      const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const uid = Math.random().toString(36).substring(2, 10).toUpperCase();
      const ts = Date.now();
      const opp = await testDataFactory.createOpportunity(
        {
          Name: `Opp_${uid}_${ts}`,
          Stage: stage,
          Type: type,
          CloseDate: closeDate,
        },
        this.testContext.accountId
      );
      this.testContext.opportunityId = opp.id;
      this.testContext.opportunityName = opp.name;
      this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
      logger.info(`✅ Opportunity created: ${opp.id} (Stage=${stage}, Type=${type})`);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      logger.error(`Step failed (Account or Opportunity create): ${msg}`);
      throw e;
    }
  }
);

/**
 * Reusable: Ensure the Opportunity has a related Opportunity_Readiness__c record (find or create).
 */
Given('the Opportunity has an Opportunity Readiness record', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  const opportunityId = this.testContext.opportunityId;
  const opportunityName = this.testContext.opportunityName || opportunityId;
  if (!opportunityId) throw new Error('No Opportunity ID in context. Create an Opportunity first.');

  let readiness = await testDataFactory.findOpportunityReadinessByOpportunity(opportunityId);
  if (!readiness) {
    try {
      readiness = await testDataFactory.createOpportunityReadiness(opportunityId, opportunityName);
    } catch (e: any) {
      logger.warn(`Could not create Opportunity_Readiness__c: ${e.message}. Assuming one exists or is auto-created.`);
      readiness = await testDataFactory.findOpportunityReadinessByOpportunity(opportunityId);
      if (!readiness) throw new Error(`No Opportunity Readiness record for Opportunity ${opportunityId}.`);
    }
  }
  this.testContext.opportunityReadinessId = readiness.id;
  this.testContext.opportunityReadinessName = readiness.name;
  logger.info(`✅ Opportunity Readiness record: ${readiness.id}`);
});

// ============================================================================
// GENERIC ENTITY STEPS
// ============================================================================

Given(/^I have an existing (?!Lead\b|lead\b)(\w+) record$/, async function (this: AutomationWorld, entityType: string) {
  // Explicitly exclude 'lead' (case-insensitive) to avoid ambiguity with the specific "I have an existing Lead record" step
  // Using negative lookahead regex to prevent matching 'Lead' or 'lead'
  
  await initTestDataFactoryFromContext(this);
  
  const entity = entityType.toLowerCase();
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  const uniqueName = `${uniqueId}_${timestamp}`;
  
  switch (entity) {
    case 'account': {
      // ═══════════════════════════════════════════════════════════════════════
      // Create account with MAXIMUM FIELDS
      // Type='Agency' is the DEFAULT for all accounts
      // ═══════════════════════════════════════════════════════════════════════
      const account = await testDataFactory.createAccount({ 
        Name: uniqueName,
        Type: 'Agency',                                // DEFAULT TYPE
        Account_Status__c: 'Prospect',
        Functional_Currency__c: 'USD',
        Reporting_Region__c: 'EU',
        
        // Contact Information
        Phone: '+1-555-0100',
        Fax: '+1-555-0101',
        Website: 'https://test-automation.example.com',
        
        // Billing Address
        // NOTE: BillingState must be blank unless BillingCountry is "United States" or "Canada"
        BillingStreet: '123 Automation Test Street',
        BillingCity: 'Munich',
        // BillingState: 'Bavaria', // REMOVED - Germany is not US/Canada, so BillingState must be blank per validation rule
        BillingPostalCode: '80331',
        BillingCountry: 'Germany',
        
        // Company Information
        Industry: 'Insurance',
        NumberOfEmployees: 250,
        AnnualRevenue: 5000000,
        Ownership: 'Private',
      });
      this.testContext.recordId = account.id;
      this.testContext.recordType = 'Account';
      this.testContext.accountId = account.id;
      this.testContext.accountName = account.name;
      break;
    }
      
    case 'contact': {
      if (!this.testContext.accountId) {
        const parentAccount = await testDataFactory.createAccount({ 
          Name: `${uniqueId}_Parent_${timestamp}`,
          Type: 'Agency',
          Functional_Currency__c: 'USD',
          Reporting_Region__c: 'EU',
          BillingCountry: 'Germany',
        });
        this.testContext.accountId = parentAccount.id;
      }
      const contact = await testDataFactory.createContact({ 
        FirstName: uniqueId,
        LastName: `Contact_${timestamp}`,
        Email: `${uniqueId.toLowerCase()}@test.example.com`,
        Phone: '+1-555-0100',
      }, this.testContext.accountId);
      this.testContext.recordId = contact.id;
      this.testContext.recordType = 'Contact';
      this.testContext.contactId = contact.id; // FIXED: Set contactId for navigation steps
      this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
      break;
    }
      
    // NOTE: 'lead' case removed - use "I have an existing Lead record" step instead
    // This avoids ambiguity with the specific comprehensive Lead creation step
    // case 'lead':
    //   ... removed to avoid step definition ambiguity ...
      
    case 'opportunity': {
      // Need an Account first
      if (!this.testContext.accountId) {
        const parentAccount = await testDataFactory.createAccount({ 
          Name: `${uniqueId}_OppParent_${timestamp}`,
          Type: 'Agency',
          Functional_Currency__c: 'USD',
          Reporting_Region__c: 'EU',
          BillingCountry: 'Germany',
        });
        this.testContext.accountId = parentAccount.id;
      }
      const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const opportunity = await testDataFactory.createOpportunity({
        Name: `${uniqueId}_Opp_${timestamp}`,
        StageName: 'Pipeline',
        CloseDate: closeDate,
        Amount: 50000,
        Type: 'New Business',
      }, this.testContext.accountId);
      this.testContext.recordId = opportunity.id;
      this.testContext.recordType = 'Opportunity';
      this.testContext.opportunityId = opportunity.id; // FIXED: Set opportunityId for navigation steps
      this.testContext.opportunityName = opportunity.name;
      this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
      break;
    }
      
    case 'accountcontactrelation': {
      // Create fresh Account and Contact - the Contact creation with AccountId auto-creates ACR
      const acrUniqueId = `ACR_${timestamp}_${Math.random().toString(36).substring(7)}`;
      const acrAccount = await testDataFactory.createAccount({ 
        Name: `${acrUniqueId}_Account`,
        Type: 'Agency',
        Functional_Currency__c: 'USD',
        Reporting_Region__c: 'EU',
        BillingCountry: 'Germany',
      });
      this.testContext.accountId = acrAccount.id;
      
      // Create Contact WITH AccountId - Salesforce auto-creates AccountContactRelation
      const acrContact = await testDataFactory.createContact({ 
        FirstName: acrUniqueId.substring(0, 8),
        LastName: `Contact_${timestamp}`,
        Email: `${acrUniqueId.toLowerCase()}@test.example.com`,
        Phone: '+1-555-0100',
      }, this.testContext.accountId);
      this.testContext.contactId = acrContact.id;
      
      // Query for the auto-created AccountContactRelation
      const acrQuery = await testDataFactory.query(
        `SELECT Id FROM AccountContactRelation WHERE AccountId = '${this.testContext.accountId}' AND ContactId = '${this.testContext.contactId}' LIMIT 1`
      );
      
      if (!acrQuery.records || acrQuery.records.length === 0) {
        throw new Error('AccountContactRelation was not auto-created when Contact was linked to Account');
      }
      
      this.testContext.recordId = acrQuery.records[0].Id;
      this.testContext.recordType = 'AccountContactRelation';
      
      // Register for cleanup (ACR is auto-deleted when Contact is deleted, but register anyway for safety)
      testDataFactory.registerRecord(this.testContext.recordId, 'AccountContactRelation', `ACR_${this.testContext.recordId}`);
      logger.info(`✅ Found auto-created AccountContactRelation: ${this.testContext.recordId}`);
      break;
    }

    case 'account_relationship__c': {
      // Account Relationship (TPA Maps) - requires Source_Account__c and Related_Account__c (Account lookups)
      const apiClient = this.testContext.apiClient;
      if (!apiClient) {
        throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first (e.g. in Background).');
      }
      // Create two accounts for the relationship
      if (!this.testContext.accountId) {
        const srcAccount = await testDataFactory.createAccount({
          Name: `AR_Source_${uniqueName}`,
          Type: 'Agency',
          Functional_Currency__c: 'USD',
          Reporting_Region__c: 'EU',
          BillingCountry: 'Germany',
        });
        this.testContext.accountId = srcAccount.id;
      }
      const relatedAccount = await testDataFactory.createAccount({
        Name: `AR_Related_${uniqueName}`,
        Type: 'Agency',
        Functional_Currency__c: 'USD',
        Reporting_Region__c: 'EU',
        BillingCountry: 'Germany',
      });
      const validFrom = new Date().toISOString().split('T')[0];
      const payload: Record<string, any> = {
        Source_Account__c: this.testContext.accountId,
        Related_Account__c: relatedAccount.id,
        Valid_From__c: validFrom,
        Is_Active__c: true,
      };
      const result = await apiClient.createRecord('Account_Relationship__c', payload);
      this.testContext.recordId = result.id;
      this.testContext.recordType = 'Account_Relationship__c';
      this.testContext.accountRelationshipId = result.id;
      testDataFactory.registerRecord(result.id, 'Account_Relationship__c', `AR_${result.id}`);
      logger.info(`✅ Created Account_Relationship__c: ${result.id}`);
      break;
    }
      
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
  
  logger.info(`✅ Created ${entityType} record: ${this.testContext.recordId} (${uniqueName})`);
});

// ============================================================================
// API RESPONSE HANDLING
// ============================================================================

Then('the API response status should be {int}', async function (this: AutomationWorld, expectedStatus: number) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found in test context');
  }

  const actualStatus = response.status();
  if (actualStatus !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus} but got ${actualStatus}`);
  }
});

// Note: "the API should return status code {int}" is defined in common/api-common.steps.ts
// Removed duplicate to avoid ambiguity

Then('the API should return a successful response', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    // If using testDataFactory, success is implied
    logger.info('API operation completed successfully');
    return;
  }

  const status = response.status();
  if (status < 200 || status >= 300) {
    throw new Error(`Expected successful response but got status ${status}`);
  }
});

Then('the API should return an error status code', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }

  const status = response.status();
  if (status < 400) {
    throw new Error(`Expected error status but got ${status}`);
  }
});

Given('I load test data for test case {string}', async function (this: AutomationWorld, testCaseId: string) {
  // This is a placeholder - would need TestDataManager for Excel or use TestDataFactory for JSON
  logger.warn('Test data loading from Excel not fully implemented - using TestDataFactory');
  await initTestDataFactoryFromContext(this);
  const data = testDataFactory.getTestData('accounts', testCaseId);
  if (data) {
    this.testContext.testData = data;
    this.testContext.testDataId = testCaseId;
    logger.info(`Test data loaded for ${testCaseId}`);
  } else {
    logger.warn(`Test data not found for ${testCaseId}`);
  }
});

Then('the error response should contain a descriptive message', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }

  const body = await response.json();
  const hasMessage = body.message || body.error || body.errorMessage || (body.errors && body.errors.length > 0);
  
  if (!hasMessage) {
    throw new Error('Expected error message in response but none found');
  }
});

// ============================================================================
// GENERIC RECORD CREATION WITH DATA TABLE
// ============================================================================

import { DataTable } from '@cucumber/cucumber';

/**
 * Create Account with specific data from table
 */
Given('I have a test Account created via API with:', async function (
  this: AutomationWorld,
  dataTable: DataTable
) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Base data
  const accountData: Record<string, any> = {
    Name: `Test_${uniqueId}_${timestamp}`,
    Type: 'Agency',
    Account_Status__c: 'Prospect',
  };
  
  // Merge with provided data
  const rows = dataTable.hashes();
  rows.forEach((row: any) => {
    const apiFieldName = row.field.includes('__c') ? row.field : 
      ['Name', 'Type', 'Industry', 'Website', 'Phone'].includes(row.field) ? row.field : `${row.field.replace(/\s+/g, '_')}__c`;
    accountData[apiFieldName] = row.value;
  });
  
  const account = await testDataFactory.createAccount(accountData);
  
  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Account with custom data: ${account.id}`);
});

/**
 * Create record without specific field
 */
Given(/^I have a test (\w+) created via API without (.+)$/, async function (
  this: AutomationWorld,
  objectType: string,
  fieldName: string
) {
  // Normalize field name - remove quotes if present
  fieldName = fieldName.trim().replace(/^["']|["']$/g, '');
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Convert field name to API format
  // Standard fields (Name, Type, Industry, Ownership, etc.) should not have __c appended
  const standardFields = ['Name', 'Type', 'Industry', 'Ownership', 'Phone', 'Fax', 'Website', 'Description'];
  const apiFieldName = fieldName.includes('__c') ? fieldName : 
    standardFields.includes(fieldName) ? fieldName : `${fieldName.replace(/\s+/g, '_')}__c`;
  
  if (objectType.toLowerCase() === 'account') {
    const accountData: Record<string, any> = {
      Name: `NoField_${uniqueId}_${timestamp}`,
      Account_Status__c: 'Prospect',
      Reporting_Region__c: 'US',
    };
    
    // CRITICAL: Only set Type if we're NOT testing without Type
    // For negative test cases where Type is missing, don't set it
    if (apiFieldName !== 'Type' && fieldName.toLowerCase() !== 'type') {
      accountData.Type = 'Agency'; // Set Type only if we're not testing without it
    }
    
    // CRITICAL: Only set Ownership if we're NOT testing without Ownership
    // For negative test cases where Ownership is missing, don't set it
    if (apiFieldName !== 'Ownership' && fieldName.toLowerCase() !== 'ownership') {
      // Ownership is required, but we'll let the test verify it fails without it
      // Don't set it here if we're testing without it
    }
    
    // Remove the specified field (if it was set)
    delete accountData[apiFieldName];
    
    // For negative test cases (especially without Type or Ownership), use direct API call
    // TestDataFactory will try to add Type and Ownership, so we need to bypass it
    if (apiFieldName === 'Type' || fieldName.toLowerCase() === 'type' ||
        apiFieldName === 'Ownership' || fieldName.toLowerCase() === 'ownership') {
      // This is a negative test - create account without Type or Ownership and expect error
      const fieldLabel = apiFieldName === 'Type' ? 'Type' : 'Ownership';
      logger.info(`⚠️  Creating Account WITHOUT ${fieldLabel} for negative test case`);
      if (apiFieldName === 'Type') {
        logger.info(`⚠️  This should fail with: "Account Type is required. Please select a value before saving"`);
      } else {
        logger.info(`⚠️  This should fail with: "Ownership is required" or similar validation error`);
      }
      
      // Use direct API call to bypass TestDataFactory's Type enforcement
      // Initialize API context if needed
      if (!this.apiContext) {
        const { request } = await import('@playwright/test');
        const { config } = await import('../../config/config');
        const sfConfig = config.getSalesforceConfig();
        this.apiContext = await request.newContext({
          baseURL: sfConfig.baseUrl,
        });
      }
      
      // Create SalesforceAPIClient for direct API call (bypasses TestDataFactory)
      const apiClient = new SalesforceAPIClient(this.apiContext);
      await apiClient.authenticate();
      
      // Use direct API call (bypasses TestDataFactory which would add Type/Ownership)
      try {
        const result = await apiClient.createRecord('Account', accountData);
        const fieldLabel = apiFieldName === 'Type' ? 'Type' : 'Ownership';
        logger.warn(`⚠️  Account created despite missing ${fieldLabel} - this may indicate ${fieldLabel} is not required`);
        this.testContext.accountId = result.id;
        this.testContext.accountName = accountData.Name;
      } catch (error: any) {
        // Expected error - store it for verification
        const fieldLabel = apiFieldName === 'Type' ? 'Type' : 'Ownership';
        this.testContext.apiError = error;
        this.testContext.lastResponse = {
          status: () => error.status || 400,
          json: async () => ({ error: error.message })
        };
        logger.info(`✅ Account creation correctly rejected without ${fieldLabel}: ${error.message}`);
        throw error; // Re-throw so test can verify the error
      }
    } else {
      // Normal case - create account with all required fields
      const account = await testDataFactory.createAccount(accountData);
      this.testContext.accountId = account.id;
      this.testContext.accountName = account.name;
      logger.info(`Created Account without ${fieldName}: ${account.id}`);
    }
    
    this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  } else if (objectType.toLowerCase() === 'opportunity') {
    // Need Account first
    if (!this.testContext.accountId) {
      const account = await testDataFactory.createAccount({
        Name: `Parent_${uniqueId}_${timestamp}`,
        Type: 'Agency',
      });
      this.testContext.accountId = account.id;
    }
    
    const oppData: Record<string, any> = {
      Name: `Opp_${uniqueId}_${timestamp}`,
      AccountId: this.testContext.accountId,
      StageName: 'Pipeline',
      CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };
    
    // Remove the specified field
    delete oppData[apiFieldName];
    
    const opp = await testDataFactory.createOpportunity(oppData, this.testContext.accountId);
    this.testContext.opportunityId = opp.id;
    this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
    
    logger.info(`Created Opportunity without ${fieldName}: ${opp.id}`);
  } else if (objectType.toLowerCase() === 'contact') {
    // Create Contact WITHOUT AccountId to prevent auto-ACR creation
    const contactData: Record<string, any> = {
      FirstName: uniqueId.substring(0, 8),
      LastName: `Contact_${timestamp}`,
      Email: `${uniqueId.toLowerCase()}@test.example.com`,
      Phone: '+1-555-0100',
    };
    
    // Remove the specified field (e.g., AccountId)
    delete contactData[apiFieldName];
    
    // Create contact WITHOUT linking to an account
    const contact = await testDataFactory.createContact(contactData);  // No accountId = no auto-ACR
    this.testContext.contactId = contact.id;
    this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
    
    logger.info(`Created Contact without ${fieldName}: ${contact.id}`);
  } else if (objectType.toLowerCase() === 'lead') {
    const leadData: Record<string, any> = {
      FirstName: uniqueId.substring(0, 8),
      LastName: `Lead_${timestamp}`,
      Company: `Company_${uniqueId}_${timestamp}`,
      Email: `${uniqueId.toLowerCase()}@test.example.com`,
      Phone: '+1-555-0100',
      Status: 'Open - Not Contacted',
    };
    
    // Remove the specified field (e.g., Region__c)
    delete leadData[apiFieldName];
    
    const lead = await testDataFactory.createLead(leadData);
    this.testContext.leadId = lead.id;
    this.testContext.leadName = lead.name;
    this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
    
    logger.info(`Created Lead without ${fieldName}: ${lead.id}`);
  } else if (objectType.toLowerCase() === 'accountcontactrelation') {
    // For ACR, we use auto-created ACR approach, so just log this
    logger.info(`Note: AccountContactRelation cannot be created directly without required fields`);
    
    // If we need an ACR without a specific field, we use the auto-created approach
    // and set recordId to null to indicate we need a fresh one
    this.testContext.recordId = undefined;
  } else {
    // Generic handler for custom objects (e.g., ColumnFlexipageModifyAccount)
    logger.info(`Creating custom object ${objectType} without ${fieldName}`);
    
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Build base data for the custom object
    const objectData: Record<string, any> = {};
    
    // For ColumnFlexipageModifyAccount and similar Account-related custom objects
    // We need an Account relationship - create one if not available
    if (objectType.toLowerCase().includes('account') || objectType === 'ColumnFlexipageModifyAccount') {
      if (!this.testContext.accountId) {
        // Create a test Account first
        logger.info(`No Account found in context, creating one for ${objectType}`);
        const account = await testDataFactory.createAccount({
          Name: `TestAccount_${uniqueId}_${timestamp}`,
          Type: 'Agency',
        });
        this.testContext.accountId = account.id;
        logger.info(`Created Account ${account.id} for ${objectType}`);
      }
      // Link to Account using the standard relationship field
      objectData.on_Account__c = this.testContext.accountId;
      logger.info(`Linking ${objectType} to Account ${this.testContext.accountId}`);
    }
    
    // Remove the specified field
    delete objectData[apiFieldName];
    
    // Use SalesforceAPIClient directly to create the custom object
    try {
      // Initialize API context if needed
      if (!this.apiContext) {
        const { request } = await import('@playwright/test');
        const { config } = await import('../../config/config');
        const sfConfig = config.getSalesforceConfig();
        this.apiContext = await request.newContext({
          baseURL: sfConfig.baseUrl,
        });
      }
      
      const { SalesforceAPIClient } = await import('../../api-clients/salesforce/SalesforceAPIClient');
      const apiClient = new SalesforceAPIClient(this.apiContext);
      await apiClient.authenticate();
      
      // First, verify the object exists by describing it
      try {
        await apiClient.describeSObject(objectType);
        logger.info(`✅ Verified ${objectType} object exists in org`);
      } catch (describeError: any) {
        if (describeError.message?.includes('404') || describeError.message?.includes('does not exist')) {
          throw new Error(
            `Object "${objectType}" does not exist in the Salesforce org. ` +
            `This custom object may not be deployed to the ${process.env.ENV || 'current'} environment. ` +
            `Please verify the object is deployed and the API name is correct.`
          );
        }
        // If describe fails for another reason, log but continue
        logger.warn(`Could not describe ${objectType}: ${describeError.message}`);
      }
      
      const result = await apiClient.createRecord(objectType, objectData);
      
      // Store the record ID in context
      this.testContext.recordId = result.id;
      this.testContext[`${objectType.toLowerCase()}Id`] = result.id;
      this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
      
      logger.info(`Created ${objectType} without ${fieldName}: ${result.id}`);
    } catch (error: any) {
      if (error.message?.includes('does not exist in the Salesforce org')) {
        throw error; // Re-throw our custom error
      }
      logger.error(`Failed to create ${objectType}: ${error.message}`);
      throw error;
    }
  }
});

/**
 * Create Account with specific field value
 * NOTE: Type has its own specific step definition above to avoid ambiguity
 * Using regex with negative lookahead to explicitly exclude Type
 */
Given(/^I have a test Account created via API with (?!Type\b)(\w+) "([^"]+)"$/, async function (
  this: AutomationWorld,
  fieldName: string,
  value: string
) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  const apiFieldName = fieldName.includes('__c') ? fieldName : 
    ['Name', 'Type', 'Industry'].includes(fieldName) ? fieldName : `${fieldName.replace(/\s+/g, '_')}__c`;
  
  const accountData: Record<string, any> = {
    Name: `${fieldName}_${uniqueId}_${timestamp}`,
    Type: 'Agency',
    Account_Status__c: 'Prospect',
    [apiFieldName]: value,
  };
  
  const account = await testDataFactory.createAccount(accountData);
  
  this.testContext.accountId = account.id;
  this.testContext.accountName = account.name;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Account with ${fieldName}=${value}: ${account.id}`);
});

/**
 * Create Account without a specific field
 * NOTE: This step definition is commented out to avoid ambiguity with the generic
 * step definition "I have a test (\w+) created via API without (.+)$" in the same file.
 * The generic step definition handles all object types including Account.
 */
// Given(/^I have a test Account created via API without ([\w_]+)$/, async function (
//   this: AutomationWorld,
//   fieldName: string
// ) {
//   await initTestDataFactoryFromContext(this);
//   
//   const timestamp = Date.now();
//   const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
//   
//   // Convert field name to API format
//   // Standard fields (Name, Type, Industry, Ownership, etc.) should not have __c appended
//   const standardFields = ['Name', 'Type', 'Industry', 'Ownership', 'Phone', 'Fax', 'Website', 'Description'];
//   const apiFieldName = fieldName.includes('__c') ? fieldName : 
//     standardFields.includes(fieldName) ? fieldName : `${fieldName.replace(/\s+/g, '_')}__c`;
//   
//   // If creating without Region, use API client directly to bypass testDataFactory defaults
//   if (apiFieldName === 'Region__c' || fieldName.toLowerCase() === 'region') {
//     const apiClient = this.testContext.apiClient;
//     if (!apiClient) {
//       throw new Error('API client not initialized');
//     }
//     
//     const accountData: Record<string, any> = {
//       Name: `NoField_${uniqueId}_${timestamp}`,
//       Type: 'Agency',
//       Account_Status__c: 'Prospect',
//       Functional_Currency__c: 'USD',
//       // Explicitly NOT including Region__c
//     };
//     
//     logger.info(`Creating Account without ${apiFieldName} via direct API call`);
//     
//     try {
//       const result = await apiClient.createRecord('Account', accountData);
//       this.testContext.accountId = result.id;
//       this.testContext.accountName = accountData.Name;
//       this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
//       this.testContext.recordId = result.id;
//       
//       logger.info(`Created Account without ${apiFieldName}: ${result.id}`);
//     } catch (error: any) {
//       logger.error(`Failed to create Account without ${apiFieldName}: ${error.message}`);
//       throw error;
//     }
//   } else {
//     // For other fields, use testDataFactory (which will add Region__c)
//     const accountData: Record<string, any> = {
//       Name: `NoField_${uniqueId}_${timestamp}`,
//       Type: 'Agency',
//       Account_Status__c: 'Prospect',
//       Region__c: 'US',
//     };
//     
//     // Explicitly exclude the specified field
//     delete accountData[apiFieldName];
//     
//     logger.info(`Creating Account without ${apiFieldName}`);
//     
//     const account = await testDataFactory.createAccount(accountData);
//     
//     this.testContext.accountId = account.id;
//     this.testContext.accountName = account.name;
//     this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
//     this.testContext.recordId = account.id;
//     
//     logger.info(`Created Account without ${apiFieldName}: ${account.id}`);
//   }
// });

/**
 * Create Opportunity with specific field value
 */
Given('I have a test Opportunity created via API with {word} {string}', async function (
  this: AutomationWorld,
  fieldName: string,
  value: string
) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Create parent Account if needed
  if (!this.testContext.accountId) {
    const account = await testDataFactory.createAccount({
      Name: `Parent_${uniqueId}_${timestamp}`,
      Type: 'Agency',
    });
    this.testContext.accountId = account.id;
  }
  
  const apiFieldName = fieldName.includes('__c') ? fieldName : 
    ['Name', 'StageName', 'Amount'].includes(fieldName) ? fieldName : `${fieldName.replace(/\s+/g, '_')}__c`;
  
  const oppData: Record<string, any> = {
    Name: `Opp_${fieldName}_${uniqueId}_${timestamp}`,
    StageName: 'Pipeline',
    CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    [apiFieldName]: value,
  };
  
  const opp = await testDataFactory.createOpportunity(oppData, this.testContext.accountId);
  
  this.testContext.opportunityId = opp.id;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Opportunity with ${fieldName}=${value}: ${opp.id}`);
});

/**
 * Create Opportunity for existing Account
 */
Given('I have a test Opportunity created via API for the Account', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  const accountId = this.testContext.accountId;
  if (!accountId) {
    throw new Error('No Account ID in context. Create Account first.');
  }
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  const oppData: Record<string, any> = {
    Name: `Opp_${uniqueId}_${timestamp}`,
    StageName: 'Pipeline',
    CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
  
  const opp = await testDataFactory.createOpportunity(oppData, accountId);
  
  this.testContext.opportunityId = opp.id;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Opportunity for Account: ${opp.id}`);
});

/**
 * Create Lead linked to an Account (for conversion scenarios)
 */
Given('I have a test Lead created via API for the Account', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  // Get Account info for potential field mapping
  const accountId = this.testContext.accountId;
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  const leadData: Record<string, any> = {
    FirstName: uniqueId.substring(0, 8),
    LastName: `Lead_${timestamp}`,
    Company: `Company_${uniqueId}`,
    Email: `${uniqueId.toLowerCase()}@test.example.com`,
    Status: 'Open - Not Contacted',
  };
  
  // SF-942: copy Reporting Region from Account when available
  const last = this.testContext.lastResponse as Record<string, unknown> | undefined;
  if (last?.Reporting_Region__c) {
    leadData.Reporting_Region__c = last.Reporting_Region__c;
  }
  
  const lead = await testDataFactory.createLead(leadData);
  
  this.testContext.leadId = lead.id;
  this.testContext.leadName = lead.name;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Lead for Account: ${lead.id}`);
});

/**
 * Create Lead with specific data
 * Enhanced to populate comprehensive Lead data with variety (countries, regions, etc.)
 */
Given('I have a test Lead created via API with:', async function (
  this: AutomationWorld,
  dataTable: DataTable
) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Parse user-provided data from table
  const userProvidedData: Record<string, any> = {};
  const rows = dataTable.hashes();
  rows.forEach((row: any) => {
    const apiFieldName = row.field.includes('__c') ? row.field : 
      ['LastName', 'FirstName', 'Company', 'Status', 'Email', 'Phone', 'Title', 'Industry', 'LeadSource', 'Rating', 'Website', 'MobilePhone', 'Street', 'City', 'State', 'PostalCode', 'Country', 'Description'].includes(row.field) ? row.field : `${row.field.replace(/\s+/g, '_')}__c`;
    userProvidedData[apiFieldName] = row.value;
  });
  
  // Determine country for variety (cycle through different countries)
  const countries = ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Netherlands', 'Switzerland'];
  const countryIndex = (this.testContext.leadCount || 0) % countries.length;
  const selectedCountry = userProvidedData.Country || countries[countryIndex];
  this.testContext.leadCount = (this.testContext.leadCount || 0) + 1;
  
  // Get region and currency from country
  const region = getRegionFromCountry(selectedCountry);
  const currency = getCurrencyFromCountry(selectedCountry);
  const countryDefaults = COUNTRY_DEFAULTS[selectedCountry] || { city: 'New York', state: 'New York', postalCode: '10001', phone: '+1-555-0100' };
  const coordinates = getCoordinatesForCountry(selectedCountry);
  
  // Base Lead data with defaults
  // CRITICAL: Always append timestamp to LastName to ensure uniqueness, even if user provided it
  const baseLastName = userProvidedData.LastName 
    ? `${userProvidedData.LastName}_${timestamp}` 
    : `Lead_${uniqueId}_${timestamp}`;
  
  // CRITICAL: Always append timestamp to Company to ensure uniqueness, even if user provided it
  const baseCompany = userProvidedData.Company 
    ? `${userProvidedData.Company}_${timestamp}` 
    : `Company_${uniqueId}_${timestamp}`;
  
  // Generate unique first name with variety
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica', 'William', 'Amanda', 'James', 'Lisa', 'Richard', 'Jennifer', 'Joseph', 'Michelle'];
  const uniqueFirstName = userProvidedData.FirstName || `${firstNames[countryIndex % firstNames.length]}${uniqueId.substring(0, 3)}`;
  
  // Generate unique company name with variety
  const companyTypes = ['Insurance', 'Agency', 'Brokerage', 'Consulting', 'Services', 'Group', 'Partners', 'Associates', 'Solutions', 'Enterprises'];
  const uniqueCompanyName = userProvidedData.Company 
    ? `${userProvidedData.Company}_${timestamp}` 
    : `${companyTypes[countryIndex % companyTypes.length]}${uniqueId}_${timestamp}`;
  
  // Generate unique address with variety (different street numbers, suite numbers, etc.)
  const streetNumber = Math.floor(Math.random() * 9999) + 1000; // Random 4-digit number
  const suiteNumber = Math.floor(Math.random() * 999) + 100; // Random 3-digit suite
  const streetNames = ['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Broadway', 'Washington', 'Lincoln', 'Madison'];
  const uniqueStreet = userProvidedData.Street || `${streetNumber} ${streetNames[countryIndex % streetNames.length]} Street\nSuite ${suiteNumber}`;
  
  // Generate unique postal code (add random suffix to base)
  const uniquePostalCode = userProvidedData.PostalCode || `${countryDefaults.postalCode}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  
  // Generate unique email with timestamp
  const uniqueEmail = userProvidedData.Email || `lead.${uniqueId.toLowerCase()}.${timestamp}@testcompany${countryIndex}.com`;
  
  // Generate unique phone number (add random suffix)
  const phoneBase = countryDefaults.phone.replace(/\d{4}$/, ''); // Remove last 4 digits
  const uniquePhone = userProvidedData.Phone || `${phoneBase}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  
  const baseLeadData: Record<string, any> = {
    LastName: baseLastName,
    FirstName: uniqueFirstName,
    Company: uniqueCompanyName,
    Status: userProvidedData.Status || 'Open - Not Contacted',
    Email: uniqueEmail,
    Phone: uniquePhone,
    MobilePhone: userProvidedData.MobilePhone || uniquePhone,
    Title: userProvidedData.Title || ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'President', 'VP Operations', 'Chief Technology Officer'][countryIndex % 8],
    Industry: userProvidedData.Industry || ['Insurance', 'Financial Services', 'Healthcare', 'Technology', 'Manufacturing'][countryIndex % 5],
    LeadSource: userProvidedData.LeadSource || ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference', 'Trade Show'][countryIndex % 8],
    Rating: userProvidedData.Rating || ['Hot', 'Warm', 'Cold'][countryIndex % 3],
    Website: userProvidedData.Website || `https://www.${uniqueCompanyName.toLowerCase().replace(/\s+/g, '')}.com`,
    
    // Address fields with country variety and uniqueness
    Street: uniqueStreet,
    City: userProvidedData.City || countryDefaults.city,
    State: userProvidedData.State || countryDefaults.state, // CRITICAL: State must be set when Country is set (required for Region field)
    PostalCode: uniquePostalCode,
    Country: selectedCountry,
    
    // SF-942: Reporting_Region__c
    Reporting_Region__c:
      userProvidedData.Reporting_Region__c ||
      mapLegacyGeoRegionToReportingRegion(userProvidedData.Region__c || region),
    Type__c: userProvidedData.Type__c || 'Member',
    Is_Record_Duplicate__c: userProvidedData.Is_Record_Duplicate__c !== undefined ? userProvidedData.Is_Record_Duplicate__c : false,
    Duplicate_Override_Reason__c: userProvidedData.Duplicate_Override_Reason__c || `Test data creation - Unique Lead for automation testing. Created: ${new Date().toISOString()}`,
    
    // Additional comprehensive fields
    CurrencyIsoCode: currency,
    NumberOfEmployees: Math.floor(Math.random() * 1000) + 10,
    GeocodeAccuracy: 'Address',
    Latitude: coordinates.latitude,
    Longitude: coordinates.longitude,
    MiddleName: ['A', 'B', 'C', 'D', 'E'][countryIndex % 5],
    Suffix: ['Jr.', 'Sr.', 'II', 'III', ''][countryIndex % 5],
    Salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'][countryIndex % 6],
    
    // Custom Lead fields (comprehensive coverage)
    // CRITICAL: Required fields for Lead conversion
    Annual_GWP_Estimate_Year_1__c: userProvidedData.Annual_GWP_Estimate_Year_1__c || Math.floor(Math.random() * 5000000) + 100000,
    Submission_folder_link__c: userProvidedData.Submission_folder_link__c || `https://sharepoint.example.com/folders/test-lead-${uniqueId.toLowerCase()}-${timestamp}`,
    // Delegated_Limits_Initial__c: Removed - field does not exist on Lead object in org
    Estimated_Onboarding_Date__c: userProvidedData.Estimated_Onboarding_Date__c || new Date(Date.now() + (90 + countryIndex * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Proposed_Effective_Date__c: userProvidedData.Proposed_Effective_Date__c || new Date(Date.now() + (30 + countryIndex * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    // Current_Policy_Expiration_Date__c: Removed - field does not exist on Lead object in this org
    // Only set if explicitly provided by user
    ...(userProvidedData.Current_Policy_Expiration_Date__c ? { Current_Policy_Expiration_Date__c: userProvidedData.Current_Policy_Expiration_Date__c } : {}),
    Product_Overview__c: userProvidedData.Product_Overview__c || ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines'][countryIndex % 5],
    Prior_Incumbent__c: userProvidedData.Prior_Incumbent__c || ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown'][countryIndex % 4],
    // Legal_Entity__c: Removed - field does not exist on Lead object in this org
    // Only set if explicitly provided by user
    ...(userProvidedData.Legal_Entity__c ? { Legal_Entity__c: userProvidedData.Legal_Entity__c } : {}),
    Series_Entity__c: userProvidedData.Series_Entity__c || `Series ${countryIndex + 1}`,
    Description: userProvidedData.Description || `Comprehensive test Lead with variety.\nCountry: ${selectedCountry}\nRegion: ${region}\nCurrency: ${currency}\nCreated: ${new Date().toISOString()}`,
    
    // Override with any user-provided values (user data takes precedence)
    ...userProvidedData,
  };
  
  const lead = await testDataFactory.createLead(baseLeadData);
  
  this.testContext.leadId = lead.id;
  this.testContext.leadData = baseLeadData; // Store lead data for later access
  this.testContext.leadType = baseLeadData.Type__c; // Store Type__c if present
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Lead with comprehensive data: ${lead.id} (Country: ${selectedCountry}, Region: ${region})`);
});

/**
 * Helper function to get region from country
 */
function getRegionFromCountry(country?: string): string {
  if (!country) return 'US';
  const countryLower = String(country).toLowerCase();
  if (countryLower.includes('united states') || countryLower.includes('usa')) return 'US';
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'UK';
  if (countryLower.includes('canada')) return 'CA';
  if (['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland'].some(c => countryLower.includes(c))) return 'EU';
  if (['australia', 'new zealand'].some(c => countryLower.includes(c))) return 'APAC';
  return 'EU'; // Default to EU
}

/**
 * Helper function to get currency from country
 */
function getCurrencyFromCountry(country?: string): string {
  if (!country) return 'USD';
  const countryLower = country.toLowerCase();
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'GBP';
  if (['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland', 'spain', 'italy', 'europe'].some(c => countryLower.includes(c))) return 'EUR';
  if (countryLower.includes('canada')) return 'CAD';
  return 'USD';
}

/**
 * Helper function to get coordinates for country
 */
function getCoordinatesForCountry(country: string): { latitude: number; longitude: number } {
  const countryCoords: Record<string, { latitude: number; longitude: number }> = {
    'United States': { latitude: 39.8283, longitude: -98.5795 },
    'United Kingdom': { latitude: 51.5074, longitude: -0.1278 },
    'Canada': { latitude: 56.1304, longitude: -106.3468 },
    'Germany': { latitude: 51.1657, longitude: 10.4515 },
    'France': { latitude: 46.2276, longitude: 2.2137 },
    'Australia': { latitude: -25.2744, longitude: 133.7751 },
    'Netherlands': { latitude: 52.1326, longitude: 5.2913 },
    'Switzerland': { latitude: 46.8182, longitude: 8.2275 },
    'Belgium': { latitude: 50.5039, longitude: 4.4699 },
    'Singapore': { latitude: 1.3521, longitude: 103.8198 },
  };
  const defaultCoords = { latitude: 40.7128, longitude: -74.0060 }; // New York default
  return countryCoords[country] || defaultCoords;
}

/**
 * Create Lead with specific field value
 */
Given('I have a test Lead created via API with {word} {string}', async function (
  this: AutomationWorld,
  fieldName: string,
  value: string
) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  const apiFieldName = fieldName.includes('__c') ? fieldName : 
    ['LastName', 'FirstName', 'Company', 'Status'].includes(fieldName) ? fieldName : `${fieldName.replace(/\s+/g, '_')}__c`;
  
  // Special handling for Estimated_Onboarding_Date__c - convert region codes to dates
  let fieldValue = value;
  if (apiFieldName === 'Estimated_Onboarding_Date__c') {
    // Convert region codes to future dates for testing
    // Use fixed offsets to ensure consistency across test steps
    const now = Date.now();
    const regionToDateMap: Record<string, string> = {
      'EU': new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
      'UK': new Date(now + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 120 days from now
      'US': new Date(now + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 150 days from now
    };
    
    if (regionToDateMap[value.toUpperCase()]) {
      fieldValue = regionToDateMap[value.toUpperCase()];
      // Store the mapping for later validation (region -> date)
      this.testContext.estimatedOnboardingDateRegionMap = this.testContext.estimatedOnboardingDateRegionMap || {};
      this.testContext.estimatedOnboardingDateRegionMap[value.toUpperCase()] = fieldValue;
      logger.info(`Converting region code "${value}" to date "${fieldValue}" for ${apiFieldName}`);
    } else {
      // If it's already a date format, use it as-is
      // Otherwise, try to parse it as a date
      try {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          fieldValue = parsedDate.toISOString().split('T')[0];
        }
      } catch {
        // If parsing fails, use the original value and let the API error
        logger.warn(`Could not convert "${value}" to date for ${apiFieldName}, using as-is`);
      }
    }
  }
  
  // Use comprehensive field data with the specified field value
  const countries = ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Netherlands', 'Switzerland'];
  const leadCount = (this.testContext.leadCount || 0) % countries.length;
  const selectedCountry = countries[leadCount];
  this.testContext.leadCount = (this.testContext.leadCount || 0) + 1;
  
  const region = getRegionFromCountry(selectedCountry);
  const currency = getCurrencyFromCountry(selectedCountry);
  const countryDefaults = COUNTRY_DEFAULTS[selectedCountry] || { city: 'New York', state: 'New York', postalCode: '10001', phone: '+1-555-0100' };
  const coordinates = getCoordinatesForCountry(selectedCountry);
  
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica'];
  const uniqueFirstName = `${firstNames[leadCount % firstNames.length]}${uniqueId.substring(0, 3)}`;
  const companyTypes = ['Insurance', 'Agency', 'Brokerage', 'Consulting', 'Services', 'Group', 'Partners', 'Associates'];
  const uniqueCompanyName = `${companyTypes[leadCount % companyTypes.length]}${uniqueId}_${timestamp}`;
  const uniqueEmail = `lead.${uniqueId.toLowerCase()}.${timestamp}@testcompany${leadCount}.com`;
  const phoneBase = countryDefaults.phone.replace(/\d{4}$/, '');
  const uniquePhone = `${phoneBase}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  const streetNumber = Math.floor(Math.random() * 9999) + 1000;
  const suiteNumber = Math.floor(Math.random() * 999) + 100;
  const streetNames = ['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Broadway', 'Washington'];
  const uniqueStreet = `${streetNumber} ${streetNames[leadCount % streetNames.length]} Street\nSuite ${suiteNumber}`;
  const uniquePostalCode = `${countryDefaults.postalCode}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  
  const leadData: Record<string, any> = {
    FirstName: uniqueFirstName,
    LastName: `Lead_${uniqueId}_${timestamp}`,
    Company: uniqueCompanyName,
    Status: ['Open - Not Contacted', 'Working - Contacted', 'Qualified', 'Unqualified'][leadCount % 4],
    Email: uniqueEmail,
    Phone: uniquePhone,
    MobilePhone: uniquePhone,
    Title: ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'President', 'VP Operations', 'Chief Technology Officer'][leadCount % 8],
    Industry: ['Insurance', 'Financial Services', 'Healthcare', 'Technology', 'Manufacturing'][leadCount % 5],
    LeadSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference', 'Trade Show'][leadCount % 8],
    Rating: ['Hot', 'Warm', 'Cold'][leadCount % 3],
    Website: `https://www.${uniqueCompanyName.toLowerCase().replace(/\s+/g, '')}.com`,
    Street: uniqueStreet,
    City: countryDefaults.city,
    State: countryDefaults.state,
    PostalCode: uniquePostalCode,
    Country: selectedCountry,
    Reporting_Region__c: mapLegacyGeoRegionToReportingRegion(region),
    Type__c: ['Member', 'Non-Member MGA'][leadCount % 2],
    Is_Record_Duplicate__c: false,
    Duplicate_Override_Reason__c: `Test data creation - Comprehensive Lead for automation testing. Created: ${new Date().toISOString()}`,
    CurrencyIsoCode: currency,
    NumberOfEmployees: Math.floor(Math.random() * 1000) + 10,
    GeocodeAccuracy: 'Address',
    Latitude: coordinates.latitude,
    Longitude: coordinates.longitude,
    MiddleName: ['A', 'B', 'C', 'D', 'E'][leadCount % 5],
    Suffix: ['Jr.', 'Sr.', 'II', 'III', ''][leadCount % 5],
    Salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'][leadCount % 6],
    Annual_GWP_Estimate_Year_1__c: Math.floor(Math.random() * 5000000) + 100000,
    Submission_folder_link__c: `https://sharepoint.example.com/folders/test-lead-${uniqueId.toLowerCase()}-${timestamp}`,
    Estimated_Onboarding_Date__c: new Date(Date.now() + (90 + leadCount * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Proposed_Effective_Date__c: new Date(Date.now() + (30 + leadCount * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Product_Overview__c: ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines'][leadCount % 5],
    Prior_Incumbent__c: ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown'][leadCount % 4],
    Series_Entity__c: `Series ${leadCount + 1}`,
    Description: `Comprehensive test Lead with variety.\nCountry: ${selectedCountry}\nRegion: ${region}\nCurrency: ${currency}\nCreated: ${new Date().toISOString()}`,
    // Override with the specified field value
    [apiFieldName]: fieldValue,
  };
  
  const lead = await testDataFactory.createLead(leadData);
  
  this.testContext.leadId = lead.id;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  // Store the original value for later validation
  if (apiFieldName === 'Estimated_Onboarding_Date__c') {
    this.testContext.estimatedOnboardingDateOriginalValue = value;
  }
  
  logger.info(`Created Lead with ${fieldName}=${fieldValue} (original: ${value}): ${lead.id}`);
});

/**
 * Create Lead with specific Type__c value
 * Used for testing Type__c field scenarios with comprehensive field data
 */
Given(/^I have an existing Lead record with "Type__c" = "([^"]+)"$/, async function (
  this: AutomationWorld,
  typeValue: string
) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Cycle through different countries for variety
  const countries = ['United States', 'United Kingdom', 'Germany', 'France', 'Canada', 'Australia', 'Netherlands', 'Switzerland'];
  const leadCount = (this.testContext.leadCount || 0) % countries.length;
  const selectedCountry = countries[leadCount];
  this.testContext.leadCount = (this.testContext.leadCount || 0) + 1;
  
  const region = getRegionFromCountry(selectedCountry);
  const currency = getCurrencyFromCountry(selectedCountry);
  const countryDefaults = COUNTRY_DEFAULTS[selectedCountry] || { city: 'New York', state: 'New York', postalCode: '10001', phone: '+1-555-0100' };
  const coordinates = getCoordinatesForCountry(selectedCountry);
  
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica'];
  const uniqueFirstName = `${firstNames[leadCount % firstNames.length]}${uniqueId.substring(0, 3)}`;
  const companyTypes = ['Insurance', 'Agency', 'Brokerage', 'Consulting', 'Services', 'Group', 'Partners', 'Associates'];
  const uniqueCompanyName = `${companyTypes[leadCount % companyTypes.length]}${uniqueId}_${timestamp}`;
  const uniqueEmail = `lead.${uniqueId.toLowerCase()}.${timestamp}@testcompany${leadCount}.com`;
  const phoneBase = countryDefaults.phone.replace(/\d{4}$/, '');
  const uniquePhone = `${phoneBase}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  const streetNumber = Math.floor(Math.random() * 9999) + 1000;
  const suiteNumber = Math.floor(Math.random() * 999) + 100;
  const streetNames = ['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Broadway', 'Washington'];
  const uniqueStreet = `${streetNumber} ${streetNames[leadCount % streetNames.length]} Street\nSuite ${suiteNumber}`;
  const uniquePostalCode = `${countryDefaults.postalCode}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  
  const leadData: Record<string, any> = {
    FirstName: uniqueFirstName,
    LastName: `Lead_${uniqueId}_${timestamp}`,
    Company: uniqueCompanyName,
    Status: ['Open - Not Contacted', 'Working - Contacted', 'Qualified', 'Unqualified'][leadCount % 4],
    Email: uniqueEmail,
    Phone: uniquePhone,
    MobilePhone: uniquePhone,
    Title: ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'President', 'VP Operations', 'Chief Technology Officer'][leadCount % 8],
    Industry: ['Insurance', 'Financial Services', 'Healthcare', 'Technology', 'Manufacturing'][leadCount % 5],
    LeadSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference', 'Trade Show'][leadCount % 8],
    Rating: ['Hot', 'Warm', 'Cold'][leadCount % 3],
    Website: `https://www.${uniqueCompanyName.toLowerCase().replace(/\s+/g, '')}.com`,
    Street: uniqueStreet,
    City: countryDefaults.city,
    State: countryDefaults.state,
    PostalCode: uniquePostalCode,
    Country: selectedCountry,
    Reporting_Region__c: mapLegacyGeoRegionToReportingRegion(region),
    Type__c: typeValue, // Use the specified Type__c value
    Is_Record_Duplicate__c: false,
    Duplicate_Override_Reason__c: `Test data creation - Comprehensive Lead for automation testing. Created: ${new Date().toISOString()}`,
    CurrencyIsoCode: currency,
    NumberOfEmployees: Math.floor(Math.random() * 1000) + 10,
    GeocodeAccuracy: 'Address',
    Latitude: coordinates.latitude,
    Longitude: coordinates.longitude,
    MiddleName: ['A', 'B', 'C', 'D', 'E'][leadCount % 5],
    Suffix: ['Jr.', 'Sr.', 'II', 'III', ''][leadCount % 5],
    Salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'][leadCount % 6],
    Annual_GWP_Estimate_Year_1__c: Math.floor(Math.random() * 5000000) + 100000,
    Submission_folder_link__c: `https://sharepoint.example.com/folders/test-lead-${uniqueId.toLowerCase()}-${timestamp}`,
    Estimated_Onboarding_Date__c: new Date(Date.now() + (90 + leadCount * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Proposed_Effective_Date__c: new Date(Date.now() + (30 + leadCount * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Product_Overview__c: ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines'][leadCount % 5],
    Prior_Incumbent__c: ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown'][leadCount % 4],
    Series_Entity__c: `Series ${leadCount + 1}`,
  };
  
  leadData.Description = `Comprehensive test Lead with variety.\nCountry: ${selectedCountry}\nRegion: ${region}\nCurrency: ${currency}\nType: ${typeValue}\nCreated: ${new Date().toISOString()}`;
  
  const lead = await testDataFactory.createLead(leadData);
  
  this.testContext.leadId = lead.id;
  this.testContext.leadName = lead.name;
  this.testContext.leadData = leadData;
  this.testContext.leadType = typeValue;
  
  logger.info(`✅ Lead created with comprehensive data and Type__c="${typeValue}": ${lead.id} (Country: ${selectedCountry}, Region: ${region})`);
});

/**
 * Create Lead without custom field (Annual_GWP_Estimate_Year_1__c)
 * Used for testing null/empty custom field scenarios
 */
Given('I have a test Lead created via API without custom', async function (this: AutomationWorld) {
  await initTestDataFactoryFromContext(this);
  
  const timestamp = Date.now();
  const uniqueId = Math.random().toString(36).substring(2, 10).toUpperCase();
  
  // Create Lead without Annual_GWP_Estimate_Year_1__c field
  const leadData: Record<string, any> = {
    LastName: `Lead_${uniqueId}_${timestamp}`,
    Company: `Company_${uniqueId}`,
    Status: 'Open - Not Contacted',
    Email: `${uniqueId.toLowerCase()}@test.example.com`
    // Explicitly do NOT set Annual_GWP_Estimate_Year_1__c
  };
  
  const lead = await testDataFactory.createLead(leadData);
  
  this.testContext.leadId = lead.id;
  this.testContext.instanceUrl = process.env.SF_INSTANCE_URL || '';
  
  logger.info(`Created Lead without custom field: ${lead.id}`);
});

// ============================================================================
// CLEANUP
// ============================================================================

// NOTE: Cleanup is handled in src/hooks/after.ts to ensure it runs
// even if tests fail. The After hook in after.ts runs AFTER each scenario
// completes, ensuring test data is available throughout the entire scenario.
// This backup hook has been removed to prevent premature cleanup during
// scenario execution.
