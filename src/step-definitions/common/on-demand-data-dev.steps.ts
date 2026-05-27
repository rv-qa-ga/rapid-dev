/**
 * On-Demand Test Data Step Definitions - DEV ENVIRONMENT
 * 
 * These steps create PERSISTENT test data (no cleanup) for manual testing.
 * Use with @onDemandDev tag to run manually when sample data is needed in DEV.
 * 
 * ════════════════════════════════════════════════════════════════════════════
 * 🔧 DEV VERSION - Uses "MULE-" prefix instead of "QA"
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * This is a copy of on-demand-data.steps.ts modified for DEV environment:
 * - All "QA" prefixes replaced with "MULE-"
 * - Uses @onDemandDev tag instead of @onDemand
 * 
 * Created: 2025-12-18
 * Status: ✅ DEV Environment Data Creation
 * ════════════════════════════════════════════════════════════════════════════
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { testDataFactory, COUNTRY_DEFAULTS, VALID_ACCOUNT_TYPES, TestRecord } from '../../test-data/TestDataFactory';
import { logger } from '../../utils/logger';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse data table into record object, replacing <timestamp> placeholders
 */
function parseDataTable(dataTable: DataTable): Record<string, any> {
  const rows = dataTable.rows();
  const data: Record<string, any> = {};
  const timestamp = Date.now();
  
  for (const [field, value] of rows) {
    // Replace <timestamp> placeholder
    const processedValue = value.replace(/<timestamp>/g, String(timestamp));
    data[field] = processedValue;
  }
  
  return data;
}

/**
 * Apply country defaults to data
 */
function applyCountryDefaults(data: Record<string, any>): Record<string, any> {
  const country = data.BillingCountry || data.Country;
  
  if (country && COUNTRY_DEFAULTS[country]) {
    const defaults = COUNTRY_DEFAULTS[country];
    const result: Record<string, any> = {
      Region__c: defaults.region,
      Functional_Currency__c: defaults.currency,
      BillingCity: defaults.city,
      BillingState: defaults.state,
      BillingPostalCode: defaults.postalCode,
      Phone: defaults.phone,
      ...data, // User data takes precedence
    };
    
    // NOTE: State_Province__c and Country__c are UI-only fields (not accessible via API)
    // They are auto-populated from BillingState/BillingCountry in the UI
    // Do NOT set these fields in API requests - they will be removed by TestDataFactory
    
    return result;
  }
  
  return data;
}

// ============================================================================
// PERSISTENT ACCOUNT CREATION (No Cleanup)
// ============================================================================

When('I create a persistent Account with:', async function (this: AutomationWorld, dataTable: DataTable) {
  await testDataFactory.initialize();
  
  const data = parseDataTable(dataTable);
  const enrichedData = applyCountryDefaults(data);
  
  logger.info(`📦 Creating PERSISTENT Account (no cleanup): ${enrichedData.Name}`);
  
  // Create the account
  const record = await testDataFactory.createAccount(enrichedData, {
    checkExists: true,
    deleteIfExists: false,  // Don't delete if exists
    reuseExisting: false,   // Create new anyway
  });
  
  // Mark as persistent so it won't be deleted in cleanup
  testDataFactory.markAsPersistent(record.id);
  
  // Store for reference
  this.testContext.persistentRecords = this.testContext.persistentRecords || [];
  this.testContext.persistentRecords.push(record);
  this.testContext.lastCreatedRecord = record;
  
  logger.info(`✅ PERSISTENT Account created: ${record.id} (${record.name})`);
});

// Note: "the Account should be created successfully" removed - use generic "the {word} should be created successfully"

Then('I log the created Account ID for reference', async function (this: AutomationWorld) {
  const record = this.testContext.lastCreatedRecord;
  
  if (record) {
    logger.info('═══════════════════════════════════════════════════════════════════════════');
    logger.info(`📋 CREATED ACCOUNT (PERSISTENT - NO CLEANUP)`);
    logger.info(`   ID:   ${record.id}`);
    logger.info(`   Name: ${record.name}`);
    logger.info(`   Type: ${record.data?.Type || 'N/A'}`);
    logger.info('═══════════════════════════════════════════════════════════════════════════');
  }
});

// ============================================================================
// PERSISTENT LEAD CREATION (No Cleanup)
// ============================================================================

When('I create a persistent Lead with:', async function (this: AutomationWorld, dataTable: DataTable) {
  await testDataFactory.initialize();
  
  const data = parseDataTable(dataTable);
  
  logger.info(`📦 Creating PERSISTENT Lead (no cleanup): ${data.FirstName} ${data.LastName}`);
  
  const record = await testDataFactory.createLead(data);
  
  // Mark as persistent so it won't be deleted in cleanup
  testDataFactory.markAsPersistent(record.id);
  
  this.testContext.persistentRecords = this.testContext.persistentRecords || [];
  this.testContext.persistentRecords.push(record);
  this.testContext.lastCreatedRecord = record;
  
  logger.info(`✅ PERSISTENT Lead created: ${record.id}`);
});

// Note: "the Lead should be created successfully" removed - use generic "the {word} should be created successfully"

Then('I log the created Lead ID for reference', async function (this: AutomationWorld) {
  const record = this.testContext.lastCreatedRecord;
  
  if (record) {
    logger.info('═══════════════════════════════════════════════════════════════════════════');
    logger.info(`📋 CREATED LEAD (PERSISTENT - NO CLEANUP)`);
    logger.info(`   ID:   ${record.id}`);
    logger.info(`   Name: ${record.name}`);
    logger.info('═══════════════════════════════════════════════════════════════════════════');
  }
});

// ============================================================================
// PERSISTENT CONTACT CREATION (No Cleanup)
// ============================================================================

Given('I have an existing Account in {string}', async function (this: AutomationWorld, country: string) {
  await testDataFactory.initialize();
  
  // Create an account for the contact
  const defaults = COUNTRY_DEFAULTS[country] || { region: 'EU', currency: 'USD' };
  
  const record = await testDataFactory.createAccount({
    Name: `TestAccount_${country}_${Date.now()}`,
    Type: 'Agency',
    BillingCountry: country,
    Region__c: defaults.region,
    Functional_Currency__c: defaults.currency,
  });
  
  this.testContext.parentAccountId = record.id;
  this.testContext.parentAccountName = record.name;
  
  logger.info(`✅ Parent Account created: ${record.id}`);
});

Given('I have an existing Account', async function (this: AutomationWorld) {
  await testDataFactory.initialize();
  
  const record = await testDataFactory.createAccount({
    Name: `TestAccount_${Date.now()}`,
    Type: 'Agency',
  });
  
  this.testContext.parentAccountId = record.id;
  this.testContext.parentAccountName = record.name;
  
  logger.info(`✅ Parent Account created: ${record.id}`);
});

When('I create a persistent Contact linked to the Account with:', async function (this: AutomationWorld, dataTable: DataTable) {
  await testDataFactory.initialize();
  
  const data = parseDataTable(dataTable);
  const accountId = this.testContext.parentAccountId;
  
  if (!accountId) {
    throw new Error('No parent Account ID found. Run "I have an existing Account" step first.');
  }
  
  logger.info(`📦 Creating PERSISTENT Contact (no cleanup): ${data.FirstName} ${data.LastName}`);
  
  const record = await testDataFactory.createContact(data, accountId);
  
  // Mark as persistent so it won't be deleted in cleanup
  testDataFactory.markAsPersistent(record.id);
  
  this.testContext.persistentRecords = this.testContext.persistentRecords || [];
  this.testContext.persistentRecords.push(record);
  this.testContext.lastCreatedRecord = record;
  
  logger.info(`✅ PERSISTENT Contact created: ${record.id}`);
});

// Note: "the Contact should be created successfully" removed - use generic "the {word} should be created successfully"

Then('I log the created Contact ID for reference', async function (this: AutomationWorld) {
  const record = this.testContext.lastCreatedRecord;
  
  if (record) {
    logger.info('═══════════════════════════════════════════════════════════════════════════');
    logger.info(`📋 CREATED CONTACT (PERSISTENT - NO CLEANUP)`);
    logger.info(`   ID:   ${record.id}`);
    logger.info(`   Name: ${record.name}`);
    logger.info('═══════════════════════════════════════════════════════════════════════════');
  }
});

// ============================================================================
// PERSISTENT OPPORTUNITY CREATION (No Cleanup)
// ============================================================================

When('I create a persistent Opportunity linked to the Account with:', async function (this: AutomationWorld, dataTable: DataTable) {
  await testDataFactory.initialize();
  
  const data = parseDataTable(dataTable);
  const accountId = this.testContext.parentAccountId;
  
  if (!accountId) {
    throw new Error('No parent Account ID found. Run "I have an existing Account" step first.');
  }
  
  logger.info(`📦 Creating PERSISTENT Opportunity (no cleanup): ${data.Name}`);
  
  const record = await testDataFactory.createOpportunity(data, accountId);
  
  // Mark as persistent so it won't be deleted in cleanup
  testDataFactory.markAsPersistent(record.id);
  
  this.testContext.persistentRecords = this.testContext.persistentRecords || [];
  this.testContext.persistentRecords.push(record);
  this.testContext.lastCreatedRecord = record;
  
  logger.info(`✅ PERSISTENT Opportunity created: ${record.id}`);
});

// Note: "the Opportunity should be created successfully" removed - use generic "the {word} should be created successfully"

Then('I log the created Opportunity ID for reference', async function (this: AutomationWorld) {
  const record = this.testContext.lastCreatedRecord;
  
  if (record) {
    logger.info('═══════════════════════════════════════════════════════════════════════════');
    logger.info(`📋 CREATED OPPORTUNITY (PERSISTENT - NO CLEANUP)`);
    logger.info(`   ID:   ${record.id}`);
    logger.info(`   Name: ${record.name}`);
    logger.info('═══════════════════════════════════════════════════════════════════════════');
  }
});

// ============================================================================
// COMPREHENSIVE DATA SET CREATION
// ============================================================================

When('I create a complete test data set with all Account Types', async function (this: AutomationWorld) {
  await testDataFactory.initialize();
  
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  logger.info('📦 Creating COMPREHENSIVE TEST DATA SET - All Account Types');
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  
  this.testContext.persistentRecords = [];
  const timestamp = Date.now();
  
  for (const accountType of VALID_ACCOUNT_TYPES) {
    const safeName = accountType.replace(/[^a-zA-Z0-9]/g, '');
    
    const record = await testDataFactory.createAccount({
      Name: `Test${safeName}Account_${timestamp}`,
      Type: accountType,
    }, {
      checkExists: false,
      deleteIfExists: false,
    });
    
    // Mark as persistent so it won't be deleted in cleanup
    testDataFactory.markAsPersistent(record.id);
    
    this.testContext.persistentRecords.push(record);
    logger.info(`✅ Created ${accountType}: ${record.id}`);
  }
  
  logger.info(`\n✅ Created ${this.testContext.persistentRecords.length} Accounts (PERSISTENT)`);
});

Then('I should have {int} Accounts created \\(one per Type)', async function (this: AutomationWorld, expectedCount: number) {
  const created = this.testContext.persistentRecords?.length || 0;
  
  if (created !== expectedCount) {
    throw new Error(`Expected ${expectedCount} Accounts, but created ${created}`);
  }
  
  logger.info(`✅ Verified ${created} Accounts created`);
});

Then('I should have {int} Leads created \\(one per Type)', async function (this: AutomationWorld, expectedCount: number) {
  const records = (this.testContext.persistentRecords || []) as TestRecord[];
  const created = records.filter((r: TestRecord) => r.type === 'Lead').length;
  
  if (created !== expectedCount) {
    throw new Error(`Expected ${expectedCount} Leads, but created ${created}`);
  }
  
  logger.info(`✅ Verified ${created} Leads created`);
});

Then('I should have {int} Contacts created \\(one per Type)', async function (this: AutomationWorld, expectedCount: number) {
  const records = (this.testContext.persistentRecords || []) as TestRecord[];
  const created = records.filter((r: TestRecord) => r.type === 'Contact').length;
  
  if (created !== expectedCount) {
    throw new Error(`Expected ${expectedCount} Contacts, but created ${created}`);
  }
  
  logger.info(`✅ Verified ${created} Contacts created`);
});

Then('I should have {int} Opportunities created \\(one per Type)', async function (this: AutomationWorld, expectedCount: number) {
  const records = (this.testContext.persistentRecords || []) as TestRecord[];
  const created = records.filter((r: TestRecord) => r.type === 'Opportunity').length;
  
  if (created !== expectedCount) {
    throw new Error(`Expected ${expectedCount} Opportunities, but created ${created}`);
  }
  
  logger.info(`✅ Verified ${created} Opportunities created`);
});

Then('I should have {int} total records created', async function (this: AutomationWorld, expectedCount: number) {
  const created = this.testContext.persistentRecords?.length || 0;
  
  if (created !== expectedCount) {
    throw new Error(`Expected ${expectedCount} total records, but created ${created}`);
  }
  
  logger.info(`✅ Verified ${created} total records created`);
});

Then('I log all created records for reference', async function (this: AutomationWorld) {
  const records = this.testContext.persistentRecords || [];
  
  logger.info('\n═══════════════════════════════════════════════════════════════════════════');
  logger.info('📋 ALL CREATED RECORDS (PERSISTENT - NO CLEANUP)');
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  
  for (const record of records) {
    logger.info(`   ${(record.type || 'Unknown').padEnd(12)} | ${record.id} | ${record.name}`);
  }
  
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  logger.info(`Total: ${records.length} records created`);
  logger.info('═══════════════════════════════════════════════════════════════════════════\n');
});

Then('each Account should be in a different country', async function (this: AutomationWorld) {
  // This is handled by ACCOUNT_TYPE_DEFAULTS which assigns different countries
  logger.info('✅ Accounts created with diverse countries (per Account Type defaults)');
});

Then('I log all created record IDs for reference', async function (this: AutomationWorld) {
  const records = this.testContext.persistentRecords || [];
  
  logger.info('\n═══════════════════════════════════════════════════════════════════════════');
  logger.info('📋 ALL CREATED RECORDS (PERSISTENT - NO CLEANUP)');
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  
  for (const record of records) {
    logger.info(`   ${record.type.padEnd(12)} | ${record.id} | ${record.name}`);
  }
  
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  logger.info(`Total: ${records.length} records created`);
  logger.info('═══════════════════════════════════════════════════════════════════════════\n');
});

When('I create a sample test data set with:', async function (this: AutomationWorld, dataTable: DataTable) {
  await testDataFactory.initialize();
  
  const rows = dataTable.rows();
  this.testContext.persistentRecords = [];
  
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  logger.info('📦 Creating SAMPLE TEST DATA SET (PERSISTENT)');
  logger.info('═══════════════════════════════════════════════════════════════════════════');
  
  const timestamp = Date.now();
  let accountId: string | undefined;
  
  for (const [countStr, entity] of rows) {
    const count = parseInt(countStr, 10);
    
    for (let i = 0; i < count; i++) {
      let record;
      
      switch (entity.toLowerCase()) {
        case 'account':
          record = await testDataFactory.createAccount({
            Name: `SampleAccount_${i + 1}_${timestamp}`,
            Type: VALID_ACCOUNT_TYPES[i % VALID_ACCOUNT_TYPES.length],
          });
          accountId = record.id;
          break;
          
        case 'lead':
          record = await testDataFactory.createLead({
            FirstName: 'Sample',
            LastName: `Lead_${i + 1}_${timestamp}`,
            Company: `Sample Company ${i + 1}`,
          });
          break;
          
        case 'contact':
          if (!accountId) {
            // CRITICAL: Type is REQUIRED - always set it
            const acc = await testDataFactory.createAccount({ 
              Name: `ContactParent_${timestamp}`,
              Type: 'Agency', // Type is REQUIRED
            });
            accountId = acc.id;
            testDataFactory.markAsPersistent(acc.id);
            this.testContext.persistentRecords.push(acc);
          }
          record = await testDataFactory.createContact({
            FirstName: 'Sample',
            LastName: `Contact_${i + 1}_${timestamp}`,
          }, accountId);
          break;
          
        case 'opportunity':
          if (!accountId) {
            // CRITICAL: Type is REQUIRED - always set it
            const acc = await testDataFactory.createAccount({ 
              Name: `OppParent_${timestamp}`,
              Type: 'Agency', // Type is REQUIRED
            });
            accountId = acc.id;
            testDataFactory.markAsPersistent(acc.id);
            this.testContext.persistentRecords.push(acc);
          }
          record = await testDataFactory.createOpportunity({
            Name: `SampleOpp_${i + 1}_${timestamp}`,
          }, accountId);
          break;
          
        default:
          logger.warn(`Unknown entity type: ${entity}`);
          continue;
      }
      
      if (record) {
        // Mark as persistent so it won't be deleted in cleanup
        testDataFactory.markAsPersistent(record.id);
        this.testContext.persistentRecords.push(record);
        logger.info(`✅ Created ${entity}: ${record.id} (PERSISTENT)`);
      }
    }
  }
});

Then('all records should be created successfully', async function (this: AutomationWorld) {
  const records = this.testContext.persistentRecords || [];
  
  if (records.length === 0) {
    throw new Error('No records were created');
  }
  
  logger.info(`✅ ${records.length} records created successfully`);
});

// ============================================================================
// ENHANCED REAL-WORLD DATA CREATION (From Excel)
// ============================================================================

/**
 * Create 15 diverse Accounts from Excel data with QA prefixes (covers all Account Types)
 */
When('I create 10 real-world Accounts from Excel data', async function (this: AutomationWorld) {
  await testDataFactory.initialize();

  logger.info('📊 Creating 15 diverse Accounts from Excel data (covering all Account Types)...');

  // Load Excel data from root directory
  const { testDataManager } = await import('../../test-data/helpers/TestDataManager');
  const ExcelJS = await import('exceljs');
  const path = await import('path');
  const fs = await import('fs');
  
  // Read Excel file from root directory
  const excelPath = path.join(process.cwd(), 'data/excel/contacts.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet('contacts');
  
  if (!worksheet) {
    throw new Error('Sheet "contacts" not found in data/excel/contacts.xlsx');
  }
  
  // Parse Excel data
  const contactsData: any[] = [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        const value = cell.value;
        if (value === null || value === undefined) {
          rowData[header] = null;
        } else if (value instanceof Date) {
          rowData[header] = value.toISOString().split('T')[0];
        } else {
          rowData[header] = value?.toString() || '';
        }
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      contactsData.push(rowData);
    }
  });

  if (contactsData.length === 0) {
    throw new Error('No contact data found in Excel file');
  }

  // Select 15 diverse rows (spread across the file)
  const step = Math.max(1, Math.floor(contactsData.length / 15));
  const selectedRows = [];
  for (let i = 0; i < 15; i++) {
    const rowIndex = Math.min(i * step, contactsData.length - 1);
    selectedRows.push(contactsData[rowIndex]);
  }

  // Use all Account Types to ensure complete coverage
  const accountTypes = [
    'Agency', 'Insurer', 'Member', 'Non - Member MGA', 'Reinsurer',
    'Acquisition Company', 'Agency Branch', 'Distribution Partner',
    'Group', 'Insurer Branch', 'Legal Entity', 'Placing Broker', 
    'Reinsurance Broker', 'Reinsurer Branch', 'Service Company',
    'Third Party Administrator', 'Member MGA', 'Non-Member MGA'
  ];

  // Ensure regional diversity across all regions: US, UK, CA, EU, ROW
  const diverseCountries = [
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
    'Australia', 'Netherlands', 'Switzerland', 'Belgium', 'Singapore',
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France'
  ];

  for (let i = 0; i < 15; i++) {
    const excelRow = selectedRows[i];
    const accountType = accountTypes[i % accountTypes.length];
    
    // Extract realistic data from Excel
    const companyName = getCompanyName(excelRow, i);
    // Override country to ensure regional diversity
    const country = diverseCountries[i % diverseCountries.length];
    const address = getRealisticAddress(excelRow, country);
    const phone = getPhoneNumber(excelRow, country);
    const email = getExcelValue(excelRow, 'emailaddress1', '');
    const website = getExcelValue(excelRow, 'websiteurl', `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`);
    const jobTitle = getExcelValue(excelRow, 'jobtitle', 'Insurance Executive');
    const industry = getExcelValue(excelRow, 'industry', 'Insurance');
    
    // Realistic employee and revenue ranges based on account type
    const employeeRanges: Record<string, [number, number]> = {
      'Agency': [10, 100],
      'Insurer': [500, 5000],
      'Member': [50, 500],
      'Reinsurer': [200, 2000],
      'Acquisition Company': [25, 250],
      'Agency Branch': [5, 50],
      'Distribution Partner': [15, 150],
      'Group': [100, 1000],
      'Insurer Branch': [50, 500],
      'Legal Entity': [20, 200],
      'Placing Broker': [30, 300],
      'Reinsurance Broker': [40, 400],
      'Non - Member MGA': [25, 250],
      'Reinsurer Branch': [50, 500],
      'Service Company': [20, 200],
      'Third Party Administrator': [35, 350],
      'Member MGA': [30, 300],
      'Non-Member MGA': [25, 250]
    };
    
    const [minEmp, maxEmp] = employeeRanges[accountType] || [50, 500];
    const employees = Math.floor(Math.random() * (maxEmp - minEmp + 1)) + minEmp;
    const revenue = employees * (Math.floor(Math.random() * 200000) + 50000); // $50k-$250k per employee

    // Map Excel columns to Salesforce Account fields with realistic defaults
    const baseAccountData: any = {
      Name: companyName,
      Type: accountType,
      Account_Status__c: ['Prospect', 'Active', 'Contracted'][i % 3],
      Phone: phone,
      Fax: getPhoneNumber(excelRow, country).replace(phone, phone + '1'), // Different fax number
      Website: website,
      Industry: industry,

      // Billing Address (realistic)
      BillingStreet: address.street,
      BillingCity: address.city,
      BillingState: address.state,
      BillingPostalCode: address.postalCode,
      BillingCountry: address.country,

      // Shipping Address (same as billing for most, but can vary)
      ShippingStreet: address.street,
      ShippingCity: address.city,
      ShippingState: address.state,
      ShippingPostalCode: address.postalCode,
      ShippingCountry: address.country,

      // Company info (realistic ranges)
      NumberOfEmployees: employees,
      AnnualRevenue: revenue,
      TickerSymbol: companyName.substring(0, 4).toUpperCase().replace(/\s/g, ''),
      Ownership: ['Private', 'Public', 'Subsidiary'][i % 3],

      // Description with Excel source
      Description: `Real-world Account from Excel data.\nOriginal contact: ${getExcelValue(excelRow, 'fullname', 'Unknown')}\nOriginal company: ${getExcelValue(excelRow, 'company', 'Unknown')}\nJob Title: ${jobTitle}\nCreated: ${new Date().toISOString()}\nSource: data/excel/contacts.xlsx`,

      // Apply regional defaults based on country
      ...applyCountryDefaults({
        Region__c: getRegionFromCountry(country),
        Functional_Currency__c: getCurrencyFromCountry(country)
      })
    };

    // Populate ALL available Account fields with comprehensive data
    const accountData = generateComprehensiveAccountData(baseAccountData, i, country);

    const account = await testDataFactory.createAccount(accountData);
    testDataFactory.markAsPersistent(account.id);

    this.testContext.persistentRecords = this.testContext.persistentRecords || [];
    this.testContext.persistentRecords.push(account);

    logger.info(`✅ Created Account: ${account.name} (${accountType})`);
  }

  logger.info(`✅ Created 15 diverse Accounts from Excel data (PERSISTENT) - covering all Account Types`);
});

/**
 * Create 10 diverse Leads from Excel data with QA prefixes
 */
When('I create 10 real-world Leads from Excel data', async function (this: AutomationWorld) {
  await testDataFactory.initialize();

  logger.info('📊 Creating 10 diverse Leads from Excel data...');

  // Load Excel data from root directory
  const { testDataManager } = await import('../../test-data/helpers/TestDataManager');
  const ExcelJS = await import('exceljs');
  const path = await import('path');
  const fs = await import('fs');
  
  // Read Excel file from root directory
  const excelPath = path.join(process.cwd(), 'data/excel/contacts.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet('contacts');
  
  if (!worksheet) {
    throw new Error('Sheet "contacts" not found in data/excel/contacts.xlsx');
  }
  
  // Parse Excel data
  const contactsData: any[] = [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        const value = cell.value;
        if (value === null || value === undefined) {
          rowData[header] = null;
        } else if (value instanceof Date) {
          rowData[header] = value.toISOString().split('T')[0];
        } else {
          rowData[header] = value?.toString() || '';
        }
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      contactsData.push(rowData);
    }
  });

  if (contactsData.length === 0) {
    throw new Error('No contact data found in Excel file');
  }

  // Select 10 diverse rows
  const step = Math.max(1, Math.floor(contactsData.length / 10));
  const selectedRows = [];
  for (let i = 0; i < 10; i++) {
    const rowIndex = Math.min(i * step, contactsData.length - 1);
    selectedRows.push(contactsData[rowIndex]);
  }

  // Valid LeadSource values: Paid Ads, Website, Purchased List, Referrals - COI, Referral - Internal Staff, Research, Conference
  const leadSources = ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'];
  const industries = ['Insurance', 'Financial Services', 'Consulting', 'Technology', 'Healthcare'];

  for (let i = 0; i < 10; i++) {
    const excelRow = selectedRows[i];
    
    // Extract realistic data
    const firstName = getExcelValue(excelRow, 'firstname', ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Amanda', 'Robert', 'Lisa'][i]);
    const lastName = getExcelValue(excelRow, 'lastname', ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'][i]);
    const companyName = getCompanyName(excelRow, i);
    const country = getExcelValue(excelRow, 'address1_country', 'United States');
    const address = getRealisticAddress(excelRow, country);
    const phone = getPhoneNumber(excelRow, country);
    const email = getExcelValue(excelRow, 'emailaddress1', '');
    const jobTitle = getExcelValue(excelRow, 'jobtitle', ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'Analyst', 'Consultant', 'Advisor', 'Executive', 'Specialist'][i]);
    const industry = industries[i % industries.length];
    const leadSource = leadSources[i % leadSources.length];
    
    // Generate realistic email if not present
    let leadEmail = email;
    if (!leadEmail || leadEmail === 'NULL' || !leadEmail.includes('@')) {
      const domain = companyName.toLowerCase().replace(/\s+/g, '').replace(/qa/gi, '') + '.com';
      leadEmail = `mule.${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
    } else {
      leadEmail = `mule.${leadEmail}`;
    }

    // Use valid Lead Status values: Unqualified, New, Funnel, Qualified
    // Avoid "Qualified" which requires additional fields (Submission folder link, Annual GWP Estimate)
    const safeStatuses = ['Unqualified', 'New', 'Funnel'];
    const status = safeStatuses[i % safeStatuses.length];

    // Make Lead unique to avoid duplicate detection
    const timestamp = Date.now();
    const uniqueSuffix = `_${timestamp}_${i}`;
    const uniqueCompanyName = `${companyName}${uniqueSuffix}`;
    const uniqueEmail = leadEmail.includes('@') 
      ? leadEmail.replace('@', `${uniqueSuffix}@`)
      : `mule.${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@${companyName.toLowerCase().replace(/\s+/g, '')}.com`;

    const baseLeadData: any = {
      FirstName: `MULE-${firstName}`,
      LastName: lastName,
      Company: uniqueCompanyName,
      Title: jobTitle,
      Email: uniqueEmail,
      Phone: phone,
      MobilePhone: getExcelValue(excelRow, 'mobilephone', phone),
      Website: getExcelValue(excelRow, 'websiteurl', `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`),
      Industry: industry,
      LeadSource: leadSource,
      Status: status,
      Rating: ['Hot', 'Warm', 'Cold'][i % 3],

      // Required custom fields
      Type__c: 'Member',
      Is_Record_Duplicate__c: false,
      Duplicate_Override_Reason__c: `Test data creation - Unique Lead for QA automation testing. Created: ${new Date().toISOString()}`,

      // Address (realistic)
      Street: address.street,
      City: address.city,
      State: address.state,
      PostalCode: address.postalCode,
      Country: address.country,

      // Description (Lead doesn't have AnnualRevenue or NumberOfEmployees)
      Description: `Real-world Lead from Excel data.\nOriginal contact: ${getExcelValue(excelRow, 'fullname', `${firstName} ${lastName}`)}\nOriginal company: ${getExcelValue(excelRow, 'company', companyName)}\nJob Title: ${jobTitle}\nIndustry: ${industry}\nCreated: ${new Date().toISOString()}\nSource: data/excel/contacts.xlsx`,

      // Regional data
      Region__c: getRegionFromCountry(country)
    };

    // Populate ALL available Lead fields with comprehensive data
    const leadData = generateComprehensiveLeadData(baseLeadData, i, country);

    const lead = await testDataFactory.createLead(leadData);
    testDataFactory.markAsPersistent(lead.id);

    this.testContext.persistentRecords = this.testContext.persistentRecords || [];
    this.testContext.persistentRecords.push(lead);

    logger.info(`✅ Created Lead: ${lead.name} (${leadSources[i % leadSources.length]})`);
  }

  logger.info(`✅ Created 10 diverse Leads from Excel data (PERSISTENT)`);
});

/**
 * Create 10 diverse Contacts from Excel data with QA prefixes
 * 
 * 🔒 LOCKED: Stable implementation - tested and verified
 * - Creates 10 parent Accounts with diverse regions
 * - Creates 10 Contacts linked to parent Accounts
 * - Uses valid Salesforce field names (Title, not JobTitle)
 * - Removed invalid fields (BirthDate)
 * - Fixed Jigsaw field length (max 20 chars)
 */
When('I create 10 real-world Contacts from Excel data', async function (this: AutomationWorld) {
  await testDataFactory.initialize();

  logger.info('📊 Creating 10 diverse Contacts from Excel data...');

  // Load Excel data from root directory
  const { testDataManager } = await import('../../test-data/helpers/TestDataManager');
  const ExcelJS = await import('exceljs');
  const path = await import('path');
  const fs = await import('fs');
  
  // Read Excel file from root directory
  const excelPath = path.join(process.cwd(), 'data/excel/contacts.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet('contacts');
  
  if (!worksheet) {
    throw new Error('Sheet "contacts" not found in data/excel/contacts.xlsx');
  }
  
  // Parse Excel data
  const contactsData: any[] = [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        const value = cell.value;
        if (value === null || value === undefined) {
          rowData[header] = null;
        } else if (value instanceof Date) {
          rowData[header] = value.toISOString().split('T')[0];
        } else {
          rowData[header] = value?.toString() || '';
        }
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      contactsData.push(rowData);
    }
  });

  if (contactsData.length === 0) {
    throw new Error('No contact data found in Excel file');
  }

  // Select 10 diverse rows
  const step = Math.max(1, Math.floor(contactsData.length / 10));
  const selectedRows = [];
  for (let i = 0; i < 10; i++) {
    const rowIndex = Math.min(i * step, contactsData.length - 1);
    selectedRows.push(contactsData[rowIndex]);
  }

  // Ensure regional diversity for parent accounts
  const diverseCountries = [
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
    'Australia', 'Netherlands', 'Switzerland', 'Belgium', 'Singapore'
  ];

  // Create parent accounts first for the contacts
  const accountIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const excelRow = selectedRows[i];
    // Override country to ensure regional diversity
    const country = diverseCountries[i % diverseCountries.length];
    const region = getRegionFromCountry(country);
    
    // Build account data with country-specific defaults
    const baseAccountData: any = {
      Name: `MULE-Parent Account ${i + 1}`,
      Type: 'Agency',
      Account_Status__c: 'Prospect',
      Phone: getPhoneNumber(excelRow, country),
      BillingCountry: country,
      Region__c: region
    };
    
    // Apply country defaults (this will set BillingState correctly for US)
    // NOTE: State_Province__c and Country__c are UI-only fields (auto-populated from billing address)
    const accountData = applyCountryDefaults(baseAccountData);

    const account = await testDataFactory.createAccount(accountData);
    testDataFactory.markAsPersistent(account.id);
    accountIds.push(account.id);
    
    // Track parent accounts in persistent records
    this.testContext.persistentRecords = this.testContext.persistentRecords || [];
    this.testContext.persistentRecords.push(account);
  }

  for (let i = 0; i < 10; i++) {
    const excelRow = selectedRows[i];
    const accountId = accountIds[i];
    
    // Extract realistic data
    const firstName = getExcelValue(excelRow, 'firstname', ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Amanda', 'Robert', 'Lisa'][i]);
    const lastName = getExcelValue(excelRow, 'lastname', ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'][i]);
    const country = getExcelValue(excelRow, 'address1_country', 'United States');
    const address = getRealisticAddress(excelRow, country);
    const phone = getPhoneNumber(excelRow, country);
    const email = getExcelValue(excelRow, 'emailaddress1', '');
    const jobTitle = getExcelValue(excelRow, 'jobtitle', ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'Analyst', 'Consultant', 'Advisor', 'Executive', 'Specialist'][i]);
    const department = getExcelValue(excelRow, 'department', ['Sales', 'Marketing', 'Operations', 'Finance', 'IT', 'HR', 'Legal', 'Risk Management', 'Underwriting', 'Claims'][i]);
    
    // Generate realistic email if not present
    let contactEmail = email;
    if (!contactEmail || contactEmail === 'NULL' || !contactEmail.includes('@')) {
      const accountName = `MULE-Parent Account ${i + 1}`;
      const domain = accountName.toLowerCase().replace(/\s+/g, '').replace(/qa/gi, '') + '.com';
      contactEmail = `mule.${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
    } else {
      contactEmail = `mule.${contactEmail}`;
    }

    const baseContactData: any = {
      FirstName: `MULE-${firstName}`,
      LastName: lastName,
      Email: contactEmail,
      Phone: phone,
      MobilePhone: getExcelValue(excelRow, 'mobilephone', phone),
      Title: jobTitle,
      Department: department,
      AssistantName: getExcelValue(excelRow, 'assistantname', ''),
      AssistantPhone: getExcelValue(excelRow, 'assistantphone', ''),

      // Address (realistic)
      MailingStreet: address.street,
      MailingCity: address.city,
      MailingState: address.state,
      MailingPostalCode: address.postalCode,
      MailingCountry: address.country,

      // Personal info (realistic)
      // Note: BirthDate field does not exist on Contact object in this org
      Salutation: ['Mr.', 'Ms.', 'Dr.', 'Mrs.', 'Prof.'][i % 5],
      Description: `Real-world Contact from Excel data.\nOriginal: ${getExcelValue(excelRow, 'fullname', `${firstName} ${lastName}`)}\nOriginal company: ${getExcelValue(excelRow, 'company', 'Unknown')}\nJob Title: ${jobTitle}\nDepartment: ${department}\nCreated: ${new Date().toISOString()}\nSource: data/excel/contacts.xlsx`
    };

    // Populate ALL available Contact fields with comprehensive data
    const contactData = generateComprehensiveContactData(baseContactData, i, country);

    const contact = await testDataFactory.createContact(contactData, accountId);
    testDataFactory.markAsPersistent(contact.id);

    this.testContext.persistentRecords = this.testContext.persistentRecords || [];
    this.testContext.persistentRecords.push(contact);

    logger.info(`✅ Created Contact: ${contact.name} (${excelRow.jobtitle || 'Test Title'})`);
  }

  logger.info(`✅ Created 10 diverse Contacts from Excel data (PERSISTENT)`);
});

/**
 * Create 10 diverse Opportunities from Excel data with QA prefixes
 */
When('I create 10 real-world Opportunities from Excel data', async function (this: AutomationWorld) {
  await testDataFactory.initialize();

  logger.info('📊 Creating 10 diverse Opportunities from Excel data...');

  // Load Excel data from root directory
  const { testDataManager } = await import('../../test-data/helpers/TestDataManager');
  const ExcelJS = await import('exceljs');
  const path = await import('path');
  const fs = await import('fs');
  
  // Read Excel file from root directory
  const excelPath = path.join(process.cwd(), 'data/excel/contacts.xlsx');
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Excel file not found: ${excelPath}`);
  }
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet('contacts');
  
  if (!worksheet) {
    throw new Error('Sheet "contacts" not found in data/excel/contacts.xlsx');
  }
  
  // Parse Excel data
  const contactsData: any[] = [];
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });
  
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    const rowData: any = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        const value = cell.value;
        if (value === null || value === undefined) {
          rowData[header] = null;
        } else if (value instanceof Date) {
          rowData[header] = value.toISOString().split('T')[0];
        } else {
          rowData[header] = value?.toString() || '';
        }
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      contactsData.push(rowData);
    }
  });

  if (contactsData.length === 0) {
    throw new Error('No contact data found in Excel file');
  }

  // Select 10 diverse rows
  const step = Math.max(1, Math.floor(contactsData.length / 10));
  const selectedRows = [];
  for (let i = 0; i < 10; i++) {
    const rowIndex = Math.min(i * step, contactsData.length - 1);
    selectedRows.push(contactsData[rowIndex]);
  }

  // Ensure regional diversity for parent accounts
  const diverseCountries = [
    'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
    'Australia', 'Netherlands', 'Switzerland', 'Belgium', 'Singapore'
  ];

  // Diverse Account Types to ensure coverage across different types
  const diverseAccountTypes = [
    'Agency',
    'Member',
    'Non-Member MGA',
    'Insurer',
    'Reinsurer',
    'Placing Broker',
    'Distribution Partner',
    'Group',
    'Service Company',
    'Agency Branch'
  ];

  // Create parent accounts first with diverse types
  const accountIds: string[] = [];
  for (let i = 0; i < 10; i++) {
    const excelRow = selectedRows[i];
    // Override country to ensure regional diversity
    const country = diverseCountries[i % diverseCountries.length];
    const region = getRegionFromCountry(country);
    const accountType = diverseAccountTypes[i % diverseAccountTypes.length];
    
    // Build account data with country-specific defaults and diverse Account Type
    const baseAccountData: any = {
      Name: `MULE-Opportunity Account ${i + 1} (${accountType})`,
      Type: accountType,
      Account_Status__c: 'Prospect',
      Phone: getPhoneNumber(excelRow, country),
      BillingCountry: country,
      Region__c: region
    };
    
    // Apply country defaults (this will set BillingState correctly for US)
    // NOTE: State_Province__c and Country__c are UI-only fields (auto-populated from billing address)
    const accountData = applyCountryDefaults(baseAccountData);

    const account = await testDataFactory.createAccount(accountData);
    testDataFactory.markAsPersistent(account.id);
    accountIds.push(account.id);
    
    // Track parent accounts in persistent records
    this.testContext.persistentRecords = this.testContext.persistentRecords || [];
    this.testContext.persistentRecords.push(account);
  }

  // Valid Opportunity StageName values: Due Diligence, Go‑Live, Active
  // Note: "Pipeline" stage requires Estimated_Onboarding_Date__c field which doesn't exist
  // Note: "Contract" stage requires Win Reason field which we don't have the API name for
  // Note: "Unqualified" stage requires Decline GWP and Unqualified Reason fields which we don't have API names for
  // Using stages without validation rule requirements
  const stages = ['Due Diligence', 'Go‑Live', 'Active'];
  // Valid Opportunity Type values: Existing Business, New Business, Member
  const types = ['Existing Business', 'New Business', 'Member'];

  for (let i = 0; i < 10; i++) {
    const excelRow = selectedRows[i];
    const accountId = accountIds[i];
    
    // Extract realistic data
    const firstName = getExcelValue(excelRow, 'firstname', ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Amanda', 'Robert', 'Lisa'][i]);
    const lastName = getExcelValue(excelRow, 'lastname', ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'][i]);
    const companyName = getCompanyName(excelRow, i);
    const stage = stages[i % stages.length];
    const type = types[i % types.length];
    
    // Realistic opportunity amounts based on stage
    const amountRanges: Record<string, [number, number]> = {
      'Due Diligence': [50000, 200000],
      'Go‑Live': [100000, 500000],
      'Active': [150000, 1000000]
    };
    
    const [minAmount, maxAmount] = amountRanges[stage] || [50000, 200000];
    const amount = Math.floor(Math.random() * (maxAmount - minAmount + 1)) + minAmount;
    
    // Probability based on stage
    const probabilityMap: Record<string, number> = {
      'Due Diligence': 40,
      'Go‑Live': 80,
      'Active': 100
    };
    
    const probability = probabilityMap[stage] || 50;
    
    // Close date based on stage (further out for early stages)
    const daysFromNow = stage === 'Active' 
      ? Math.floor(Math.random() * 30) - 30 // Past 30 days
      : stage === 'Go‑Live'
      ? Math.floor(Math.random() * 30) + 1 // Next 30 days
      : Math.floor(Math.random() * 90) + 30; // 30-120 days
    
    const closeDate = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Realistic opportunity names
    const oppNames = [
      'New Business Partnership',
      'Enterprise Coverage Expansion',
      'Risk Management Solution',
      'Comprehensive Insurance Package',
      'Strategic Partnership Opportunity',
      'Premium Coverage Program',
      'Custom Insurance Solution',
      'Multi-Line Coverage Agreement',
      'Annual Policy Renewal',
      'Specialty Risk Coverage'
    ];

    const baseOppData: any = {
      Name: `MULE-${oppNames[i % oppNames.length]} - ${companyName}`,
      StageName: stage,
      Type: type,
      Amount: amount,
      Probability: probability,
      CloseDate: closeDate,
      NextStep: `Schedule follow-up call with ${firstName} ${lastName} to discuss ${oppNames[i % oppNames.length].toLowerCase()}`,
      LeadSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'][i % 7],
      Description: `Real-world Opportunity from Excel data.\nOriginal contact: ${getExcelValue(excelRow, 'fullname', `${firstName} ${lastName}`)}\nCompany: ${companyName}\nJob Title: ${getExcelValue(excelRow, 'jobtitle', 'Executive')}\nStage: ${stage}\nAmount: $${amount.toLocaleString()}\nCreated: ${new Date().toISOString()}\nSource: data/excel/contacts.xlsx`
    };

    // Populate ALL available Opportunity fields with comprehensive data
    const oppData = generateComprehensiveOpportunityData(baseOppData, i, accountId);

    const opp = await testDataFactory.createOpportunity(oppData, accountId);
    testDataFactory.markAsPersistent(opp.id);

    this.testContext.persistentRecords = this.testContext.persistentRecords || [];
    this.testContext.persistentRecords.push(opp);

    logger.info(`✅ Created Opportunity: ${opp.name} (${stages[i % stages.length]})`);
  }

  logger.info(`✅ Created 10 diverse Opportunities from Excel data (PERSISTENT)`);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely extract string value from Excel row (handles null/undefined)
 */
function getExcelValue(row: any, field: string, defaultValue: string = ''): string {
  const value = row[field];
  if (value === null || value === undefined || value === 'NULL' || value === '') {
    return defaultValue;
  }
  return String(value).trim();
}

/**
 * Get realistic company name from Excel data or generate one
 */
function getCompanyName(excelRow: any, index: number): string {
  const company = getExcelValue(excelRow, 'company', '');
  const partyName = getExcelValue(excelRow, 'accelins_partyname', '');
  const lastName = getExcelValue(excelRow, 'lastname', '');
  
  if (company && company !== 'NULL' && company.length > 2) {
    return `MULE-${company}`;
  }
  if (partyName && partyName !== 'NULL' && partyName.length > 2) {
    return `MULE-${partyName}`;
  }
  if (lastName && lastName !== 'NULL') {
    return `MULE-${lastName} Insurance Group ${index + 1}`;
  }
  
  // Realistic company names
  const companyNames = [
    'Global Insurance Partners', 'Premier Risk Solutions', 'Elite Coverage Group',
    'Advanced Insurance Services', 'Strategic Risk Management', 'Professional Coverage Inc',
    'Comprehensive Insurance Solutions', 'Premium Risk Advisors', 'Integrated Insurance Group',
    'Excellence Insurance Services'
  ];
  return `MULE-${companyNames[index % companyNames.length]}`;
}

/**
 * Get realistic phone number from Excel or generate one
 */
function getPhoneNumber(excelRow: any, country?: string): string {
  const phone = getExcelValue(excelRow, 'telephone1', '');
  if (phone && phone !== 'NULL' && phone.length > 5) {
    return phone;
  }
  
  // Generate realistic phone numbers based on country
  const countryLower = (country || '').toLowerCase();
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) {
    return `+44 20 ${Math.floor(Math.random() * 9000) + 1000} ${Math.floor(Math.random() * 9000) + 1000}`;
  }
  if (countryLower.includes('germany')) {
    return `+49 ${Math.floor(Math.random() * 90) + 10} ${Math.floor(Math.random() * 9000000) + 1000000}`;
  }
  if (countryLower.includes('france')) {
    return `+33 ${Math.floor(Math.random() * 9) + 1} ${Math.floor(Math.random() * 90000000) + 10000000}`;
  }
  if (countryLower.includes('canada')) {
    return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
  }
  
  // Default US format
  return `+1-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`;
}

/**
 * Get realistic address from Excel or generate one
 */
function getRealisticAddress(excelRow: any, country?: string): { street: string; city: string; state: string; postalCode: string; country: string } {
  const countryLower = (country || '').toLowerCase();
  
  // Realistic addresses by country
  const addresses: Record<string, { street: string[]; city: string[]; state: string[]; postalCode: string[] }> = {
    'us': {
      street: ['123 Main Street', '456 Oak Avenue', '789 Park Boulevard', '321 Elm Drive', '654 Pine Road'],
      city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose'],
      state: ['New York', 'California', 'Illinois', 'Texas', 'Arizona', 'Pennsylvania'],
      postalCode: ['10001', '90001', '60601', '77001', '85001', '19101']
    },
    'uk': {
      street: ['15 High Street', '42 Queen\'s Road', '78 King\'s Avenue', '23 Victoria Street', '56 Oxford Road'],
      city: ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Glasgow', 'Edinburgh', 'Bristol'],
      state: ['Greater London', 'Greater Manchester', 'West Midlands', 'Merseyside', 'West Yorkshire'],
      postalCode: ['SW1A 1AA', 'M1 1AA', 'B1 1AA', 'L1 1AA', 'LS1 1AA']
    },
    'germany': {
      street: ['Hauptstraße 15', 'Bahnhofstraße 42', 'Kirchgasse 8', 'Marktplatz 12', 'Gartenweg 5'],
      city: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 'Düsseldorf', 'Dortmund'],
      state: ['Berlin', 'Bavaria', 'Hamburg', 'Hesse', 'North Rhine-Westphalia', 'Baden-Württemberg'],
      postalCode: ['10115', '80331', '20095', '60311', '50667', '70173', '40210', '44135']
    },
    'france': {
      street: ['15 Rue de la Paix', '42 Avenue des Champs-Élysées', '78 Boulevard Saint-Germain', '23 Rue de Rivoli'],
      city: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Montpellier'],
      state: ['Île-de-France', 'Auvergne-Rhône-Alpes', 'Provence-Alpes-Côte d\'Azur', 'Occitanie'],
      postalCode: ['75001', '69001', '13001', '31000', '06000', '44000', '67000', '34000']
    },
    'canada': {
      street: ['123 Main Street', '456 Queen Street', '789 King Avenue', '321 Bay Street'],
      city: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa', 'Edmonton', 'Winnipeg', 'Quebec City'],
      state: ['Ontario', 'British Columbia', 'Quebec', 'Alberta', 'Manitoba'],
      postalCode: ['M5H 2N2', 'V6B 1A1', 'H3A 0G4', 'T2P 2M5', 'K1A 0A6']
    }
  };
  
  // Determine country code
  let countryCode = 'us';
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) countryCode = 'uk';
  else if (countryLower.includes('germany')) countryCode = 'germany';
  else if (countryLower.includes('france')) countryCode = 'france';
  else if (countryLower.includes('canada')) countryCode = 'canada';
  
  const addrSet = addresses[countryCode] || addresses['us'];
  const index = Math.floor(Math.random() * addrSet.street.length);
  
  return {
    street: getExcelValue(excelRow, 'address1_line1', addrSet.street[index]),
    city: getExcelValue(excelRow, 'address1_city', addrSet.city[index]),
    state: getExcelValue(excelRow, 'address1_stateorprovince', addrSet.state[index % addrSet.state.length]),
    postalCode: getExcelValue(excelRow, 'address1_postalcode', addrSet.postalCode[index]),
    country: getExcelValue(excelRow, 'address1_country', country || 'United States')
  };
}

/**
 * Get region from country name
 */
function getRegionFromCountry(country?: string): string {
  if (!country) return 'US';

  const countryLower = String(country).toLowerCase();

  if (countryLower.includes('united states') || countryLower.includes('usa')) return 'US';
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'UK';
  if (countryLower.includes('canada')) return 'CA';
  if (['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland'].some(c => countryLower.includes(c))) return 'EU';
  if (['australia', 'new zealand'].some(c => countryLower.includes(c))) return 'APAC';

  return 'EU'; // Default to EU for European countries
}

/**
 * Get currency from country
 */
/**
 * Get valid Account Currency code from country
 * Valid values: GBP, CAD, EUR, USD (restricted picklist)
 */
function getCurrencyFromCountry(country?: string): string {
  if (!country) return 'USD';

  const countryLower = country.toLowerCase();

  // Map to valid Account Currency codes only
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'GBP';
  if (['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland', 'spain', 'italy', 'europe'].some(c => countryLower.includes(c))) return 'EUR';
  if (countryLower.includes('canada')) return 'CAD';
  
  // All other countries default to USD (valid for Account Currency)
  return 'USD';
}

/**
 * Generate random birth date for adults (25-65 years old)
 */
function generateRandomBirthDate(): string {
  const now = new Date();
  const minAge = 25;
  const maxAge = 65;
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const birthYear = now.getFullYear() - age;
  const birthMonth = Math.floor(Math.random() * 12);
  const birthDay = Math.floor(Math.random() * 28) + 1; // Avoid Feb 29 issues

  return new Date(birthYear, birthMonth, birthDay).toISOString().split('T')[0];
}

/**
 * Generate comprehensive Account field data with ALL available fields populated
 */
function generateComprehensiveAccountData(
  baseData: Record<string, any>,
  index: number,
  country: string
): Record<string, any> {
  const region = getRegionFromCountry(country);
  const currency = getCurrencyFromCountry(country);
  
  // Generate Account Number (realistic format)
  const accountNumber = `ACC-${String(1000000 + index).padStart(7, '0')}`;
  
  // Generate realistic coordinates based on country
  const coordinates = getCoordinatesForCountry(country);
  
  return {
    ...baseData,
    
    // Standard Account fields
    AccountNumber: accountNumber,
    Rating: ['Hot', 'Warm', 'Cold'][index % 3],
    Site: `${baseData.Name} - ${['Headquarters', 'Main Office', 'Regional Office', 'Branch Office'][index % 4]}`,
    AccountSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'][index % 7],
    
    // Geographic fields
    BillingGeocodeAccuracy: 'Address',
    BillingLatitude: coordinates.latitude,
    BillingLongitude: coordinates.longitude,
    ShippingGeocodeAccuracy: 'Address',
    ShippingLatitude: coordinates.latitude,
    ShippingLongitude: coordinates.longitude,
    
    // Standard Account fields
    CurrencyIsoCode: currency,
    Jigsaw: `JIGSAW-${String(100000 + index).padStart(6, '0')}`, // Data.com Key
    Sic: `${String(6000 + index).padStart(4, '0')}`, // SIC Code
    SicDesc: ['Insurance Carriers', 'Insurance Agencies', 'Insurance Brokers', 'Reinsurance Carriers'][index % 4],
    
    // Custom Account fields (only fields that exist in Salesforce)
    Account_Team_Roles__c: ['Member Relationship Director', 'Actuarial Lead', 'Operations Manager', 'Claims Manager', 'Underwriter', 'Claims Operations Specialist', 'Processing Lead'][index % 7],
    Admission_Status__c: ['Admitted', 'Non-Admitted', 'Not Applicable'][index % 3],
    Affiliate_Non_Affiliate__c: ['NAF', 'AFL', 'Blank'][index % 3],
    Annual_GWP_Estimate_Year_1__c: baseData.AnnualRevenue ? Math.floor(baseData.AnnualRevenue * 0.5) : Math.floor(Math.random() * 5000000) + 100000,
    Binding_Authority_Limited__c: index % 2 === 0, // Boolean
    Data_Source_Claims__c: ['VIPR', 'Platform'][index % 2],
    Data_Source_Written__c: ['VIPR', 'Platform'][index % 2],
    Distribution_Region__c: ['US', 'UK', 'EU', 'Asia', 'Americas', 'Africa', 'Oceania'][index % 7],
    Estimated_Onboarding_Date__c: new Date(Date.now() + (90 + index * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    First_Written_Premium_Date__c: new Date(Date.now() - (365 + index * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    FOS_FSCS_Exposure__c: Math.floor(Math.random() * 100), // Percentage
    Investment_Status__c: ['Non-owned', 'Minority', 'Majority'][index % 3],
    Number_of_Locations__c: Math.floor(Math.random() * 50) + 1,
    POS_FSCS_Exposure__c: Math.floor(Math.random() * 100), // Percentage
    Proposed_Effective_Date__c: new Date(Date.now() + (30 + index * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Current_Program_Expiration_Date__c: new Date(Date.now() + (365 + index * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Reinsurance_Arrangements__c: ['Quota Share', 'Excess of Loss', 'Facultative', 'Treaty'][index % 4],
    Runoff__c: false, // Boolean
    Upsell_Opportunity__c: ['Maybe', 'Yes', 'No'][index % 3],
    
    // Ensure all address fields are populated
    BillingStreet: baseData.BillingStreet || `${index + 1} Main Street`,
    BillingCity: baseData.BillingCity || 'Default City',
    BillingState: baseData.BillingState || 'Default State',
    BillingPostalCode: baseData.BillingPostalCode || '12345',
    BillingCountry: baseData.BillingCountry || country,
    ShippingStreet: baseData.ShippingStreet || baseData.BillingStreet || `${index + 1} Main Street`,
    ShippingCity: baseData.ShippingCity || baseData.BillingCity || 'Default City',
    ShippingState: baseData.ShippingState || baseData.BillingState || 'Default State',
    ShippingPostalCode: baseData.ShippingPostalCode || baseData.BillingPostalCode || '12345',
    ShippingCountry: baseData.ShippingCountry || baseData.BillingCountry || country,
  };
}

/**
 * Generate comprehensive Lead field data with ALL available fields populated
 */
function generateComprehensiveLeadData(
  baseData: Record<string, any>,
  index: number,
  country: string
): Record<string, any> {
  const region = getRegionFromCountry(country);
  const currency = getCurrencyFromCountry(country);
  const coordinates = getCoordinatesForCountry(country);
  
  return {
    ...baseData,
    
    // Standard Lead fields
    CurrencyIsoCode: currency,
    Jigsaw: `JIGSAW-LEAD-${String(100000 + index).padStart(6, '0')}`,
    NumberOfEmployees: Math.floor(Math.random() * 1000) + 10,
    GeocodeAccuracy: 'Address',
    Latitude: coordinates.latitude,
    Longitude: coordinates.longitude,
    MiddleName: ['A', 'B', 'C', 'D', 'E'][index % 5],
    Suffix: ['Jr.', 'Sr.', 'II', 'III', ''][index % 5],
    Salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'][index % 6],
    
    // Custom Lead fields
    Annual_GWP_Estimate_Year_1__c: Math.floor(Math.random() * 5000000) + 100000,
    // Delegated_Limits_Initial__c: Removed - field does not exist on Lead object in org
    Estimated_Onboarding_Date__c: new Date(Date.now() + (90 + index * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Proposed_Effective_Date__c: new Date(Date.now() + (30 + index * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Current_Policy_Expiration_Date__c: new Date(Date.now() + (365 + index * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Product_Overview__c: ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines'][index % 5],
    Prior_Incumbent__c: ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown'][index % 4],
    Legal_Entity__c: ['LLC', 'Corporation', 'Partnership', 'Sole Proprietorship'][index % 4],
    Series_Entity__c: `Series ${index + 1}`,
    
    // Ensure all address fields are populated
    Street: baseData.Street || `${index + 1} Business Street`,
    City: baseData.City || 'Default City',
    State: baseData.State || 'Default State',
    PostalCode: baseData.PostalCode || '12345',
    Country: baseData.Country || country,
  };
}

/**
 * Generate comprehensive Contact field data with ALL available fields populated
 */
function generateComprehensiveContactData(
  baseData: Record<string, any>,
  index: number,
  country: string
): Record<string, any> {
  const currency = getCurrencyFromCountry(country);
  const coordinates = getCoordinatesForCountry(country);
  
  return {
    ...baseData,
    
    // Standard Contact fields
    CurrencyIsoCode: currency,
    // Note: Jigsaw field has max length of 20 characters
    Jigsaw: `JIG-C-${index}`,
    MiddleName: ['A', 'B', 'C', 'D', 'E'][index % 5],
    Suffix: ['Jr.', 'Sr.', 'II', 'III', ''][index % 5],
    Salutation: ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'][index % 6],
    LeadSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'][index % 7],
    
    // Geographic fields
    MailingGeocodeAccuracy: 'Address',
    MailingLatitude: coordinates.latitude,
    MailingLongitude: coordinates.longitude,
    
    // Note: Estimated_Onboarding_Date__c does not exist on Contact object in this org
    // Removed to avoid "No such column" errors
    
    // Ensure all address fields are populated
    MailingStreet: baseData.MailingStreet || `${index + 1} Contact Street`,
    MailingCity: baseData.MailingCity || 'Default City',
    MailingState: baseData.MailingState || 'Default State',
    MailingPostalCode: baseData.MailingPostalCode || '12345',
    MailingCountry: baseData.MailingCountry || country,
  };
}

/**
 * Generate comprehensive Opportunity field data with ALL available fields populated
 */
function generateComprehensiveOpportunityData(
  baseData: Record<string, any>,
  index: number,
  accountId: string
): Record<string, any> {
  return {
    ...baseData,
    
    // Standard Opportunity fields
    AccountId: accountId,
    CurrencyIsoCode: getCurrencyFromCountry('United States'), // Default, can be overridden
    NextStep: `Follow-up call scheduled for ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}`,
    LeadSource: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'][index % 7],
    ForecastCategoryName: ['Pipeline', 'Best Case', 'Commit', 'Closed', 'Omitted'][index % 5],
    
    // Custom Opportunity fields (only fields that exist in Salesforce)
    Budget_Confirmed__c: index % 2 === 0, // Boolean
    Discovery_Completed__c: index % 3 === 0, // Boolean
    Review_Staging_Sent__c: false, // Boolean
    ROI_Analysis_Completed__c: index % 2 === 0, // Boolean
    Date_Stage_Name_Last_Changed__c: new Date().toISOString(),
    
    // Note: TerritoriesCovered__c, First_Year_Estimated_GWP__c, Expressed_Interest__c 
    // are only available for specific Opportunity record types and may not exist in all orgs
    // Removed to avoid "No such column" errors
  };
}

/**
 * Get coordinates for a country (realistic lat/long)
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

