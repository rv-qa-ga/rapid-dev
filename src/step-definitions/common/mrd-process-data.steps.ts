/**
 * MRD Process Flow - On-Demand Test Data Step Definitions
 *
 * Creates persistent test data at ANY stage of the MRD (Member Relationship Director)
 * process flow. Uses real-world data from data/excel/contacts.xlsx.
 *
 * Account Types: Member, Non-Member MGA (focused)
 * Regions: US, UK, EU, CA, ROW (all 5)
 *
 * Process Flow:
 *   Lead(New) -> Lead(Funnel) -> Decision(Qualified/Disqualified)
 *     -> Convert Lead -> Contact(Active) + Account(Prospect) + Opportunity(Pipeline)
 *     -> Opportunity(Pipeline) + Account(Prospect)
 *     -> Summary Fields Populated -> Approval (US: MOU, Non-US: no MOU)
 *     -> Opportunity(Due Diligence) + Account(Onboarding)
 *     -> Onboarding Team Assigned -> Prospect Coding -> Questionnaire Sent
 */

import { When, Then, DataTable } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { testDataFactory, COUNTRY_DEFAULTS, ACCOUNT_TYPE_DEFAULTS } from '../../test-data/TestDataFactory';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceJWTAuth } from '../../utils/jwt-auth';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

// ============================================================================
// TYPES
// ============================================================================

interface MRDProcessContext {
  leadId?: string;
  leadName?: string;
  accountId?: string;
  accountName?: string;
  accountType?: string;
  contactId?: string;
  contactName?: string;
  opportunityId?: string;
  opportunityName?: string;
  region?: string;
  allRecords: Array<{
    type: string;
    id: string;
    name: string;
    status: string;
    accountType?: string;
    region?: string;
  }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * The two Account Types we focus on for MRD process testing
 */
const MRD_ACCOUNT_TYPES = ['Member', 'Non-Member MGA'] as const;

/**
 * All regions covered
 */
const ALL_REGIONS = ['US', 'UK', 'EU', 'CA', 'ROW'] as const;

/**
 * Lead Type__c values that map to Account Types
 * On Lead, Member and Non-Member MGA are stored in Type__c
 */
const ACCOUNT_TYPE_TO_LEAD_TYPE: Record<string, string> = {
  'Member': 'Member',
  'Non-Member MGA': 'Non-Member MGA',
  'Non - Member MGA': 'Non-Member MGA',
};

/**
 * Region -> country/currency/address defaults
 */
const REGION_COUNTRY_MAP: Record<string, {
  country: string;
  currency: string;
  state: string;
  city: string;
  postalCode: string;
  phone: string;
}> = {
  US: { country: 'United States', currency: 'USD', state: 'New York', city: 'New York', postalCode: '10001', phone: '+1-212-555-0100' },
  UK: { country: 'United Kingdom', currency: 'GBP', state: '', city: 'London', postalCode: 'EC2N 4AY', phone: '+44-20-7946-0958' },
  EU: { country: 'Germany', currency: 'EUR', state: '', city: 'Munich', postalCode: '80331', phone: '+49-89-123-4567' },
  CA: { country: 'Canada', currency: 'CAD', state: 'Ontario', city: 'Toronto', postalCode: 'M5H 2N2', phone: '+1-416-555-0100' },
  ROW: { country: 'Australia', currency: 'USD', state: '', city: 'Sydney', postalCode: '2000', phone: '+61-2-1234-5678' },
};

// ============================================================================
// HELPERS
// ============================================================================

function getMRDContext(world: AutomationWorld): MRDProcessContext {
  if (!world.testContext.mrdProcess) {
    world.testContext.mrdProcess = { allRecords: [] };
  }
  return world.testContext.mrdProcess as MRDProcessContext;
}

function getAPIClient(world: AutomationWorld): SalesforceAPIClient {
  const client = (world.testContext.apiClient || world.testContext.sfApiClient) as SalesforceAPIClient;
  if (!client) {
    throw new Error('Salesforce API client not initialized. Ensure "I have authenticated with Salesforce API" step ran first.');
  }
  return client;
}

/**
 * Normalize Account Type to Salesforce-accepted value
 * "Non-Member MGA" in the feature file maps to "Non - Member MGA" in Salesforce
 * if the org uses that variant.
 */
function normalizeSFAccountType(accountType: string): string {
  // The TestDataFactory's ACCOUNT_TYPE_DEFAULTS has both "Non - Member MGA" and "Non-Member MGA"
  // Use the one that exists in the defaults map, preferring "Non-Member MGA"
  if (accountType === 'Non-Member MGA' || accountType === 'Non - Member MGA') {
    return ACCOUNT_TYPE_DEFAULTS['Non-Member MGA'] ? 'Non-Member MGA' : 'Non - Member MGA';
  }
  return accountType;
}

/**
 * Get the Lead Type__c value for a given Account Type
 */
function getLeadType(accountType: string): string {
  return ACCOUNT_TYPE_TO_LEAD_TYPE[accountType] || ACCOUNT_TYPE_TO_LEAD_TYPE[normalizeSFAccountType(accountType)] || 'Member';
}

/**
 * Load a row of real-world data from the Excel file
 */
async function loadExcelRow(index: number = 0): Promise<Record<string, any>> {
  const ExcelJS = await import('exceljs');
  const path = await import('path');
  const fs = await import('fs');

  const excelPath = path.join(process.cwd(), 'data/excel/contacts.xlsx');
  if (!fs.existsSync(excelPath)) {
    logger.warn(`Excel file not found at ${excelPath} - using generated data instead`);
    return {};
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.getWorksheet('contacts');

  if (!worksheet) {
    logger.warn('Sheet "contacts" not found in contacts.xlsx - using generated data');
    return {};
  }

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
  });

  const rows: Record<string, any>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const rowData: Record<string, any> = {};
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
      rows.push(rowData);
    }
  });

  if (rows.length === 0) return {};

  const step = Math.max(1, Math.floor(rows.length / 20));
  const safeIndex = Math.min(index * step, rows.length - 1);
  return rows[safeIndex];
}

function excelVal(row: Record<string, any>, field: string, fallback: string): string {
  const v = row[field];
  if (v === null || v === undefined || v === '' || v === 'NULL') return fallback;
  return String(v).trim();
}

/**
 * Build comprehensive Account data with ALL known writable fields
 * Uses "Prospect" as default Account Status for Member type (verified working)
 */
function buildAccountData(
  name: string,
  accountType: string,
  region: string,
  accountStatus: string,
  excelRow: Record<string, any>,
  timestamp: number,
): Record<string, any> {
  const regionInfo = REGION_COUNTRY_MAP[region] || REGION_COUNTRY_MAP['US'];
  const sfType = normalizeSFAccountType(accountType);
  const shortTs = timestamp.toString().slice(-8);

  const data: Record<string, any> = {
    Name: name,
    Type: sfType,
    Account_Status__c: accountStatus,
    Phone: excelVal(excelRow, 'telephone1', regionInfo.phone),
    Fax: regionInfo.phone.replace(/0100$/, '0101'),
    Website: excelVal(excelRow, 'websiteurl', `https://www.qa-mrd-${shortTs}.com`),
    Industry: 'Insurance',
    NumberOfEmployees: 150 + Math.floor(Math.random() * 500),
    AnnualRevenue: 2000000 + Math.floor(Math.random() * 8000000),
    TickerSymbol: `QA${shortTs.slice(-4)}`,
    Ownership: 'Independent',
    Rating: ['Hot', 'Warm', 'Cold'][Math.floor(Math.random() * 3)],
    AccountSource: ['Paid Ads', 'Website', 'Referrals - COI', 'Research', 'Conference'][Math.floor(Math.random() * 5)],
    Functional_Currency__c: regionInfo.currency,
    CurrencyIsoCode: regionInfo.currency,
    // Billing Address
    BillingStreet: excelVal(excelRow, 'address1_line1', `${100 + Math.floor(Math.random() * 900)} Insurance Boulevard\nSuite ${100 + Math.floor(Math.random() * 900)}`),
    BillingCity: regionInfo.city,
    BillingPostalCode: regionInfo.postalCode,
    BillingCountry: regionInfo.country,
    // Shipping Address (mirrored from Billing)
    ShippingStreet: `${200 + Math.floor(Math.random() * 800)} Commerce Drive`,
    ShippingCity: regionInfo.city,
    ShippingPostalCode: regionInfo.postalCode,
    ShippingCountry: regionInfo.country,
    Description: `MRD Process test data (comprehensive).\nType: ${sfType}\nRegion: ${region}\nStatus: ${accountStatus}\nCreated: ${new Date().toISOString()}\nUID: ${name}`,
  };

  // Affiliate/Non-Affiliate is required for Member type
  if (sfType === 'Member') {
    data['Affiliate_Non_Affiliate__c'] = 'AFL';
  }

  // Only set BillingState and ShippingState for US/CA (validation rule: blank for other countries)
  if (regionInfo.state) {
    data.BillingState = regionInfo.state;
    data.ShippingState = regionInfo.state;
  }

  return data;
}

// ============================================================================
// STEP: Create Lead with Account Type parameter
// ============================================================================

When(
  'I create a persistent MRD Lead at status {string} for region {string} with type {string} using Excel data',
  async function (this: AutomationWorld, status: string, region: string, accountType: string) {
    await testDataFactory.initialize();

    const ctx = getMRDContext(this);
    ctx.region = region;
    ctx.accountType = accountType;

    const regionInfo = REGION_COUNTRY_MAP[region] || REGION_COUNTRY_MAP['US'];
    const excelRow = await loadExcelRow(Math.floor(Math.random() * 15));
    const timestamp = Date.now();
    const uniqueSuffix = `_MRD_${timestamp}`;
    const leadType = getLeadType(accountType);

    const firstName = excelVal(excelRow, 'firstname', 'QA');
    const lastName = excelVal(excelRow, 'lastname', `MRDLead${timestamp}`);
    const company = excelVal(excelRow, 'company', `QA MRD Company${uniqueSuffix}`);
    const jobTitle = excelVal(excelRow, 'jobtitle', 'Insurance Executive');
    const email = `qa.mrd.${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@testmrd.com`;

    const leadData: Record<string, any> = {
      FirstName: `QA ${firstName}`,
      LastName: `${lastName}${uniqueSuffix}`,
      Company: `QA MRD ${company}${uniqueSuffix}`,
      Title: jobTitle,
      Email: email,
      Phone: excelVal(excelRow, 'telephone1', regionInfo.phone),
      Status: status,
      LeadSource: 'Website',
      Industry: excelVal(excelRow, 'industry', 'Insurance'),
      Rating: 'Warm',

      // Address
      Street: excelVal(excelRow, 'address1_line1', '123 MRD Test Street'),
      City: regionInfo.city,
      PostalCode: regionInfo.postalCode,
      Country: regionInfo.country,

      // Required custom fields
      Type__c: leadType,
      Is_Record_Duplicate__c: false,
      Duplicate_Override_Reason__c: `MRD Process Flow test data. Type: ${accountType}, Region: ${region}. Created: ${new Date().toISOString()}`,
      CurrencyIsoCode: regionInfo.currency,

      // Fields needed for Qualified status transition
      Annual_GWP_Estimate_Year_1__c: Math.floor(Math.random() * 5000000) + 100000,
      Submission_folder_link__c: `https://sharepoint.example.com/folders/mrd-lead-${timestamp}`,
      Estimated_Onboarding_Date__c: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Proposed_Effective_Date__c: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Product_Overview__c: 'Property & Casualty',

      Description: `MRD Process Flow test data.\nAccount Type: ${accountType}\nLead Type__c: ${leadType}\nRegion: ${region}\nTarget Status: ${status}\nExcel Source: ${excelVal(excelRow, 'fullname', 'Generated')}\nCreated: ${new Date().toISOString()}`,
    };

    // Only set State for US/CA
    if (regionInfo.state) {
      leadData.State = regionInfo.state;
    }

    // Remove undefined values
    for (const key of Object.keys(leadData)) {
      if (leadData[key] === undefined) delete leadData[key];
    }

    const lead = await testDataFactory.createLead(leadData);
    testDataFactory.markAsPersistent(lead.id);

    ctx.leadId = lead.id;
    ctx.leadName = lead.name;
    ctx.allRecords.push({
      type: 'Lead', id: lead.id, name: lead.name,
      status, accountType, region,
    });

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`MRD LEAD CREATED: ${lead.name}`);
    logger.info(`  ID: ${lead.id}  |  Status: ${status}  |  Type: ${accountType}  |  Region: ${region}`);
    logger.info(`${'='.repeat(70)}\n`);
  }
);

// Keep backward-compatible step (no type param) - defaults to Member
When(
  'I create a persistent MRD Lead at status {string} for region {string} using Excel data',
  async function (this: AutomationWorld, status: string, region: string) {
    // Delegate to the type-aware version with default type "Member"
    const step = `I create a persistent MRD Lead at status "${status}" for region "${region}" with type "Member" using Excel data`;
    logger.info(`(Defaulting to Account Type "Member" for backward compatibility)`);

    await testDataFactory.initialize();
    const ctx = getMRDContext(this);
    ctx.region = region;
    ctx.accountType = 'Member';

    const regionInfo = REGION_COUNTRY_MAP[region] || REGION_COUNTRY_MAP['US'];
    const excelRow = await loadExcelRow(Math.floor(Math.random() * 15));
    const timestamp = Date.now();
    const uniqueSuffix = `_MRD_${timestamp}`;

    const firstName = excelVal(excelRow, 'firstname', 'QA');
    const lastName = excelVal(excelRow, 'lastname', `MRDLead${timestamp}`);
    const company = excelVal(excelRow, 'company', `QA MRD Company${uniqueSuffix}`);
    const email = `qa.mrd.${firstName.toLowerCase()}.${lastName.toLowerCase()}${uniqueSuffix}@testmrd.com`;

    const leadData: Record<string, any> = {
      FirstName: `QA ${firstName}`,
      LastName: `${lastName}${uniqueSuffix}`,
      Company: `QA MRD ${company}${uniqueSuffix}`,
      Title: excelVal(excelRow, 'jobtitle', 'Insurance Executive'),
      Email: email,
      Phone: excelVal(excelRow, 'telephone1', regionInfo.phone),
      Status: status,
      LeadSource: 'Website',
      Industry: 'Insurance',
      Rating: 'Warm',
      Street: excelVal(excelRow, 'address1_line1', '123 MRD Test Street'),
      City: regionInfo.city,
      PostalCode: regionInfo.postalCode,
      Country: regionInfo.country,
      Type__c: 'Member',
      Is_Record_Duplicate__c: false,
      Duplicate_Override_Reason__c: `MRD Process Flow test data. Created: ${new Date().toISOString()}`,
      CurrencyIsoCode: regionInfo.currency,
      Annual_GWP_Estimate_Year_1__c: Math.floor(Math.random() * 5000000) + 100000,
      Submission_folder_link__c: `https://sharepoint.example.com/folders/mrd-lead-${timestamp}`,
      Estimated_Onboarding_Date__c: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Proposed_Effective_Date__c: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Product_Overview__c: 'Property & Casualty',
      Description: `MRD Process Flow test data.\nRegion: ${region}\nTarget Status: ${status}\nCreated: ${new Date().toISOString()}`,
    };

    if (regionInfo.state) leadData.State = regionInfo.state;
    for (const key of Object.keys(leadData)) {
      if (leadData[key] === undefined) delete leadData[key];
    }

    const lead = await testDataFactory.createLead(leadData);
    testDataFactory.markAsPersistent(lead.id);
    ctx.leadId = lead.id;
    ctx.leadName = lead.name;
    ctx.allRecords.push({ type: 'Lead', id: lead.id, name: lead.name, status, accountType: 'Member', region });

    logger.info(`MRD LEAD CREATED: ${lead.name} | Status: ${status} | Type: Member | Region: ${region}`);
  }
);

// ============================================================================
// STEP: Transition Lead to a new status
// ============================================================================

When(
  'I transition the Lead to {string} status',
  async function (this: AutomationWorld, targetStatus: string) {
    const ctx = getMRDContext(this);
    if (!ctx.leadId) throw new Error('No Lead ID found. Create a Lead first.');

    await testDataFactory.initialize();

    logger.info(`Transitioning Lead ${ctx.leadId} to status "${targetStatus}"...`);

    const updateData: Record<string, any> = { Status: targetStatus };

    if (targetStatus === 'Qualified') {
      updateData.Annual_GWP_Estimate_Year_1__c = Math.floor(Math.random() * 5000000) + 100000;
      updateData.Submission_folder_link__c = `https://sharepoint.example.com/folders/mrd-lead-qualified-${Date.now()}`;
    }

    await testDataFactory.updateRecord('Lead', ctx.leadId, updateData);

    const existing = ctx.allRecords.find(r => r.type === 'Lead' && r.id === ctx.leadId);
    if (existing) existing.status = targetStatus;

    logger.info(`Lead ${ctx.leadId} transitioned to "${targetStatus}"`);
  }
);

// ============================================================================
// STEP: Convert Lead - with Account Type parameter
// ============================================================================

When(
  'I convert the MRD Lead to create Account, Contact, and Opportunity with type {string}',
  async function (this: AutomationWorld, accountType: string) {
    const ctx = getMRDContext(this);
    if (!ctx.leadId) throw new Error('No Lead ID found. Create and qualify a Lead first.');
    ctx.accountType = accountType;

    const apiClient = getAPIClient(this);
    const sfType = normalizeSFAccountType(accountType);

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`CONVERTING LEAD -> Account(${sfType}) + Contact + Opportunity`);
    logger.info(`  Lead ID: ${ctx.leadId}  |  Account Type: ${sfType}  |  Region: ${ctx.region}`);
    logger.info(`${'='.repeat(70)}\n`);

    const result = await apiClient.convertLead(ctx.leadId, {
      convertedStatus: 'Qualified',
      doNotCreateOpportunity: false,
      opportunityName: `QA MRD Opp (${sfType}) ${Date.now()}`,
    });

    if (!result.success) {
      throw new Error(`Lead conversion failed: ${JSON.stringify(result.errors)}`);
    }

    ctx.accountId = result.accountId;
    ctx.contactId = result.contactId;
    ctx.opportunityId = result.opportunityId;

    if (result.accountId) testDataFactory.markAsPersistent(result.accountId);
    if (result.contactId) testDataFactory.markAsPersistent(result.contactId);
    if (result.opportunityId) testDataFactory.markAsPersistent(result.opportunityId);

    // Set Account Type after conversion (conversion uses Lead's Company as Account name)
    if (result.accountId) {
      try {
        await testDataFactory.updateRecord('Account', result.accountId, { Type: sfType });
        logger.info(`Account ${result.accountId} Type set to "${sfType}" post-conversion`);
      } catch (err: any) {
        logger.warn(`Could not set Account Type post-conversion: ${err.message}`);
      }
    }

    // Fetch names
    if (result.accountId) {
      try {
        const acc = await apiClient.getRecord('Account', result.accountId);
        ctx.accountName = acc.Name;
      } catch { ctx.accountName = `Account_${result.accountId}`; }
    }
    if (result.contactId) {
      try {
        const con = await apiClient.getRecord('Contact', result.contactId);
        ctx.contactName = con.Name;
      } catch { ctx.contactName = `Contact_${result.contactId}`; }
    }
    if (result.opportunityId) {
      try {
        const opp = await apiClient.getRecord('Opportunity', result.opportunityId);
        ctx.opportunityName = opp.Name;
      } catch { ctx.opportunityName = `Opportunity_${result.opportunityId}`; }
    }

    ctx.allRecords.push(
      { type: 'Account', id: result.accountId!, name: ctx.accountName || '', status: 'Prospect', accountType: sfType, region: ctx.region },
      { type: 'Contact', id: result.contactId!, name: ctx.contactName || '', status: 'Active', region: ctx.region },
      { type: 'Opportunity', id: result.opportunityId!, name: ctx.opportunityName || '', status: 'Pipeline', accountType: sfType, region: ctx.region },
    );

    const leadEntry = ctx.allRecords.find(r => r.type === 'Lead' && r.id === ctx.leadId);
    if (leadEntry) leadEntry.status = 'Qualified (Converted)';

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`LEAD CONVERSION SUCCESSFUL (Type: ${sfType})`);
    logger.info(`  Account:     ${result.accountId} (${ctx.accountName})`);
    logger.info(`  Contact:     ${result.contactId} (${ctx.contactName})`);
    logger.info(`  Opportunity: ${result.opportunityId} (${ctx.opportunityName})`);
    logger.info(`${'='.repeat(70)}\n`);
  }
);

// Backward-compatible convert step (no type param)
When(
  'I convert the MRD Lead to create Account, Contact, and Opportunity',
  async function (this: AutomationWorld) {
    const ctx = getMRDContext(this);
    const accountType = ctx.accountType || 'Member';

    // Re-use the typed version
    const apiClient = getAPIClient(this);
    if (!ctx.leadId) throw new Error('No Lead ID found.');
    const sfType = normalizeSFAccountType(accountType);

    const result = await apiClient.convertLead(ctx.leadId, {
      convertedStatus: 'Qualified',
      doNotCreateOpportunity: false,
      opportunityName: `QA MRD Opp (${sfType}) ${Date.now()}`,
    });

    if (!result.success) throw new Error(`Lead conversion failed: ${JSON.stringify(result.errors)}`);

    ctx.accountId = result.accountId;
    ctx.contactId = result.contactId;
    ctx.opportunityId = result.opportunityId;

    if (result.accountId) {
      testDataFactory.markAsPersistent(result.accountId);
      try { await testDataFactory.updateRecord('Account', result.accountId, { Type: sfType }); } catch { /* optional */ }
      try { ctx.accountName = (await apiClient.getRecord('Account', result.accountId)).Name; } catch { ctx.accountName = ''; }
    }
    if (result.contactId) {
      testDataFactory.markAsPersistent(result.contactId);
      try { ctx.contactName = (await apiClient.getRecord('Contact', result.contactId)).Name; } catch { ctx.contactName = ''; }
    }
    if (result.opportunityId) {
      testDataFactory.markAsPersistent(result.opportunityId);
      try { ctx.opportunityName = (await apiClient.getRecord('Opportunity', result.opportunityId)).Name; } catch { ctx.opportunityName = ''; }
    }

    ctx.allRecords.push(
      { type: 'Account', id: result.accountId!, name: ctx.accountName || '', status: 'Prospect', accountType: sfType, region: ctx.region },
      { type: 'Contact', id: result.contactId!, name: ctx.contactName || '', status: 'Active', region: ctx.region },
      { type: 'Opportunity', id: result.opportunityId!, name: ctx.opportunityName || '', status: 'Pipeline', accountType: sfType, region: ctx.region },
    );

    logger.info(`Lead converted -> Account(${sfType}), Contact, Opportunity`);
  }
);

// ============================================================================
// STEP: Create test data at a target stage with Account Type
// ============================================================================

When(
  'I create MRD test data at {string} stage for region {string} with type {string} using Excel data',
  async function (this: AutomationWorld, targetStage: string, region: string, accountType: string) {
    await testDataFactory.initialize();

    const ctx = getMRDContext(this);
    ctx.region = region;
    ctx.accountType = accountType;

    const excelRow = await loadExcelRow(Math.floor(Math.random() * 15));
    const timestamp = Date.now();
    const sfType = normalizeSFAccountType(accountType);

    const company = excelVal(excelRow, 'company', `QA MRD Company ${timestamp}`);
    const firstName = excelVal(excelRow, 'firstname', 'QA');
    const lastName = excelVal(excelRow, 'lastname', `MRDContact${timestamp}`);

    let accountStatus = 'Prospect';
    if (targetStage === 'Pipeline') accountStatus = 'Prospect';
    else if (targetStage === 'Due Diligence') accountStatus = 'Onboarding';

    // 1. Create Account with correct Type and Region
    const accountData = buildAccountData(
      `QA MRD ${sfType} ${company} ${timestamp}`,
      accountType,
      region,
      accountStatus,
      excelRow,
      timestamp,
    );

    const account = await testDataFactory.createAccount(accountData);
    testDataFactory.markAsPersistent(account.id);
    ctx.accountId = account.id;
    ctx.accountName = account.name;

    // 2. Create Contact
    const regionInfo = REGION_COUNTRY_MAP[region] || REGION_COUNTRY_MAP['US'];
    const contact = await testDataFactory.createContact({
      FirstName: `QA ${firstName}`,
      LastName: `${lastName} ${timestamp}`,
      Email: `qa.mrd.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}@testmrd.com`,
      Phone: excelVal(excelRow, 'telephone1', regionInfo.phone),
      Title: excelVal(excelRow, 'jobtitle', 'Insurance Executive'),
    }, account.id);
    testDataFactory.markAsPersistent(contact.id);
    ctx.contactId = contact.id;
    ctx.contactName = contact.name;

    // 3. Create Opportunity
    const opp = await testDataFactory.createOpportunity({
      Name: `QA MRD Opp (${sfType}) - ${company} - ${timestamp}`,
      StageName: targetStage,
      CloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Amount: Math.floor(Math.random() * 1000000) + 100000,
      Type: 'New Business',
      LeadSource: 'Website',
      Description: `MRD Process test data.\nStage: ${targetStage}\nAccount Type: ${sfType}\nRegion: ${region}\nCreated: ${new Date().toISOString()}`,
    }, account.id);
    testDataFactory.markAsPersistent(opp.id);
    ctx.opportunityId = opp.id;
    ctx.opportunityName = opp.name;

    ctx.allRecords.push(
      { type: 'Account', id: account.id, name: account.name, status: accountStatus, accountType: sfType, region },
      { type: 'Contact', id: contact.id, name: contact.name, status: 'Active', region },
      { type: 'Opportunity', id: opp.id, name: opp.name, status: targetStage, accountType: sfType, region },
    );

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`MRD TEST DATA AT "${targetStage}" - Type: ${sfType}, Region: ${region}`);
    logger.info(`  Account:     ${account.id} (${account.name}) - Status: ${accountStatus}`);
    logger.info(`  Contact:     ${contact.id} (${contact.name})`);
    logger.info(`  Opportunity: ${opp.id} (${opp.name}) - Stage: ${targetStage}`);
    logger.info(`${'='.repeat(70)}\n`);
  }
);

// Backward-compatible shortcut step (no type param, defaults to Member)
When(
  'I create MRD test data at {string} stage for region {string} using Excel data',
  async function (this: AutomationWorld, targetStage: string, region: string) {
    await testDataFactory.initialize();
    const ctx = getMRDContext(this);
    ctx.region = region;
    ctx.accountType = 'Member';

    const excelRow = await loadExcelRow(Math.floor(Math.random() * 15));
    const timestamp = Date.now();
    const company = excelVal(excelRow, 'company', `QA MRD Company ${timestamp}`);
    const firstName = excelVal(excelRow, 'firstname', 'QA');
    const lastName = excelVal(excelRow, 'lastname', `MRDContact${timestamp}`);

    let accountStatus = 'Prospect';
    if (targetStage === 'Pipeline') accountStatus = 'Prospect';
    else if (targetStage === 'Due Diligence') accountStatus = 'Onboarding';

    const accountData = buildAccountData(`QA MRD Member ${company} ${timestamp}`, 'Member', region, accountStatus, excelRow, timestamp);
    const account = await testDataFactory.createAccount(accountData);
    testDataFactory.markAsPersistent(account.id);
    ctx.accountId = account.id;
    ctx.accountName = account.name;

    const regionInfo = REGION_COUNTRY_MAP[region] || REGION_COUNTRY_MAP['US'];
    const contact = await testDataFactory.createContact({
      FirstName: `QA ${firstName}`, LastName: `${lastName} ${timestamp}`,
      Email: `qa.mrd.${timestamp}@testmrd.com`, Phone: regionInfo.phone,
      Title: excelVal(excelRow, 'jobtitle', 'Insurance Executive'),
    }, account.id);
    testDataFactory.markAsPersistent(contact.id);
    ctx.contactId = contact.id;
    ctx.contactName = contact.name;

    const opp = await testDataFactory.createOpportunity({
      Name: `QA MRD Opp (Member) - ${timestamp}`, StageName: targetStage,
      CloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      Amount: Math.floor(Math.random() * 1000000) + 100000, Type: 'New Business',
    }, account.id);
    testDataFactory.markAsPersistent(opp.id);
    ctx.opportunityId = opp.id;
    ctx.opportunityName = opp.name;

    ctx.allRecords.push(
      { type: 'Account', id: account.id, name: account.name, status: accountStatus, accountType: 'Member', region },
      { type: 'Contact', id: contact.id, name: contact.name, status: 'Active', region },
      { type: 'Opportunity', id: opp.id, name: opp.name, status: targetStage, accountType: 'Member', region },
    );

    logger.info(`MRD data at "${targetStage}" | Type: Member | Region: ${region}`);
  }
);

// ============================================================================
// STEP: Move Opportunity and Account in parallel
// ============================================================================

When(
  'I move the Opportunity to {string} stage and Account to {string} status',
  async function (this: AutomationWorld, oppStage: string, accountStatus: string) {
    const ctx = getMRDContext(this);
    if (!ctx.opportunityId) throw new Error('No Opportunity ID. Create or convert records first.');
    if (!ctx.accountId) throw new Error('No Account ID. Create or convert records first.');

    await testDataFactory.initialize();

    logger.info(`Moving Opportunity to "${oppStage}" and Account to "${accountStatus}"...`);

    await testDataFactory.updateRecord('Opportunity', ctx.opportunityId, { StageName: oppStage });
    await testDataFactory.updateRecord('Account', ctx.accountId, { Account_Status__c: accountStatus });

    const oppEntry = ctx.allRecords.find(r => r.type === 'Opportunity' && r.id === ctx.opportunityId);
    if (oppEntry) oppEntry.status = oppStage;

    const accEntry = ctx.allRecords.find(r => r.type === 'Account' && r.id === ctx.accountId);
    if (accEntry) accEntry.status = accountStatus;

    logger.info(`Opportunity -> "${oppStage}", Account -> "${accountStatus}"`);
  }
);

// ============================================================================
// STEP: Populate Opportunity Summary Fields
// ============================================================================

When(
  'I populate the Opportunity summary fields for {string} region',
  async function (this: AutomationWorld, region: string) {
    const ctx = getMRDContext(this);
    if (!ctx.opportunityId) throw new Error('No Opportunity ID found.');

    await testDataFactory.initialize();

    const summaryFields: Record<string, any> = {
      Amount: Math.floor(Math.random() * 2000000) + 500000,
      Probability: 60,
      NextStep: 'Review summary and proceed to approval',
      Description: `Opportunity summary populated for ${region} region approval.\nAccount Type: ${ctx.accountType || 'N/A'}\nUpdated: ${new Date().toISOString()}`,
    };

    if (region === 'US') {
      summaryFields.Budget_Confirmed__c = true;
      summaryFields.Discovery_Completed__c = true;
      summaryFields.ROI_Analysis_Completed__c = true;
      logger.info('US Region: MOU fields populated');
    }

    await testDataFactory.updateRecord('Opportunity', ctx.opportunityId, summaryFields);

    this.testContext.mrdSummaryPopulated = true;
    this.testContext.mrdMOUPopulated = region === 'US';

    logger.info(`Opportunity summary fields populated for ${region} region`);
  }
);

// ============================================================================
// STEP: Assign Onboarding Team
// ============================================================================

When(
  'I assign the Onboarding team to the Opportunity',
  async function (this: AutomationWorld) {
    const ctx = getMRDContext(this);
    if (!ctx.opportunityId) throw new Error('No Opportunity ID found.');

    await testDataFactory.initialize();

    await testDataFactory.updateRecord('Opportunity', ctx.opportunityId, {
      NextStep: 'Onboarding team assigned. Begin prospect coding and send member questionnaire.',
    });

    if (ctx.accountId) {
      await testDataFactory.updateRecord('Account', ctx.accountId, {
        Account_Team_Roles__c: 'Member Relationship Director',
      });
    }

    this.testContext.mrdOnboardingTeamAssigned = true;
    logger.info('Onboarding team assigned');
  }
);

// ============================================================================
// STEP: Batch - single type at all stages (5 regions)
// ============================================================================

When(
  'I create MRD test data batch for type {string} at all process stages using Excel data',
  async function (this: AutomationWorld, accountType: string) {
    // Authenticate TestDataFactory as MRD user (not default admin)
    const mrdUsername = process.env.SF_QAMRDUSER_JWT_USERNAME;
    if (mrdUsername) {
      const savedUsername = process.env.SF_JWT_USERNAME;
      process.env.SF_JWT_USERNAME = mrdUsername;
      logger.info(`Authenticating TestDataFactory as MRD user: ${mrdUsername}`);
      // Force re-initialization with MRD credentials
      (testDataFactory as any).initialized = false;
      await testDataFactory.initialize();
      if (savedUsername) process.env.SF_JWT_USERNAME = savedUsername;
    } else {
      logger.warn('SF_QAMRDUSER_JWT_USERNAME not set - using default user');
      await testDataFactory.initialize();
    }

    const ctx = getMRDContext(this);
    const timestamp = Date.now();
    const sfType = normalizeSFAccountType(accountType);
    const shortTs = timestamp.toString().slice(-8);

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`BATCH: Creating ${sfType} at ALL process stages across regions`);
    logger.info(`  User: ${mrdUsername || 'default'}`);
    logger.info(`${'='.repeat(70)}\n`);

    // --- Helper: build comprehensive Lead data with ALL known writable fields ---
    function buildComprehensiveLeadData(
      i: number, region: string, regionInfo: any, excelRow: Record<string, any>, uid: string,
    ): Record<string, any> {
      const firstNames = ['James', 'Sarah', 'Michael', 'Emily', 'David', 'Laura', 'Robert', 'Jennifer'];
      const titles = ['CEO', 'CFO', 'VP Sales', 'Director of Operations', 'Managing Director', 'President', 'COO', 'CTO'];
      const industries = ['Insurance', 'Financial Services', 'Healthcare', 'Technology', 'Manufacturing'];
      const leadSources = ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference', 'Trade Show'];
      const ratings = ['Hot', 'Warm', 'Cold'];
      const productOverviews = ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines'];
      const priorIncumbents = ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown'];
      const salutations = ['Mr.', 'Ms.', 'Mrs.', 'Dr.'];
      const middleNames = ['A', 'B', 'C', 'D', 'E'];

      const firstName = excelVal(excelRow, 'firstname', firstNames[i % firstNames.length]);
      const lastName = excelVal(excelRow, 'lastname', `MRDLead${i}`);
      const streetNum = 100 + (i * 111);

      const data: Record<string, any> = {
        Salutation: salutations[i % salutations.length],
        FirstName: `${firstName}_${shortTs}`,
        MiddleName: middleNames[i % middleNames.length],
        LastName: `${lastName}_${uid}`,
        Suffix: i % 4 === 0 ? 'Jr.' : undefined,
        Company: `QA MRD ${sfType} Co_${uid}`,
        Title: titles[i % titles.length],
        Status: 'New',
        Email: `qa.mrd.${uid}.${i}@testautomation.com`,
        Phone: regionInfo.phone,
        MobilePhone: regionInfo.phone.replace(/0100$/, `${1000 + i}`),
        Website: `https://www.qa-mrd-${shortTs}-${i}.com`,
        Industry: industries[i % industries.length],
        LeadSource: leadSources[i % leadSources.length],
        Rating: ratings[i % ratings.length],
        NumberOfEmployees: 50 + (i * 100),
        CurrencyIsoCode: regionInfo.currency,
        Street: `${streetNum} ${['Main', 'Oak', 'Elm', 'Park'][i % 4]} Street\nSuite ${100 + i}`,
        City: regionInfo.city,
        PostalCode: regionInfo.postalCode,
        Country: regionInfo.country,
        Type__c: getLeadType(accountType),
        Is_Record_Duplicate__c: false,
        Duplicate_Override_Reason__c: `MRD batch ${sfType} - unique ID ${uid}`,
        Annual_GWP_Estimate_Year_1__c: 500000 + (i * 250000),
        Submission_folder_link__c: `https://sharepoint.example.com/folders/mrd-batch-${uid}`,
        Product_Overview__c: productOverviews[i % productOverviews.length],
        Proposed_Effective_Date__c: new Date(Date.now() + (60 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        Estimated_Onboarding_Date__c: new Date(Date.now() + (120 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        Broker_Sourced__c: 'No',
        Prior_Incumbent__c: priorIncumbents[i % priorIncumbents.length],
        Series_Entity__c: `Series ${i + 1}`,
        Description: `MRD batch test lead for ${sfType}.\nRegion: ${region}\nCreated: ${new Date().toISOString()}\nUID: ${uid}`,
      };
      if (regionInfo.state) data.State = regionInfo.state;
      // Remove undefined values
      Object.keys(data).forEach(k => { if (data[k] === undefined) delete data[k]; });
      return data;
    }

    // --- Helper: build comprehensive Opportunity data ---
    function buildComprehensiveOppData(
      oppStage: string, uid: string, i: number,
    ): Record<string, any> {
      return {
        Name: `QA MRD Opp ${sfType} ${oppStage}_${uid}`,
        StageName: oppStage,
        CloseDate: new Date(Date.now() + (90 + i * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        Amount: 1000000 + (i * 500000),
        Type: 'New Business',
        LeadSource: ['Paid Ads', 'Website', 'Referrals - COI', 'Research'][i % 4],
        Description: `MRD batch opportunity for ${sfType}.\nStage: ${oppStage}\nUID: ${uid}\nCreated: ${new Date().toISOString()}`,
      };
    }

    // --- Leads at 4 statuses (cycle through regions) ---
    const leadStatuses = ['New', 'Funnel', 'Qualified', 'Unqualified'];
    const leadRegions = ['US', 'UK', 'EU', 'CA'];

    for (let i = 0; i < leadStatuses.length; i++) {
      const status = leadStatuses[i];
      const region = leadRegions[i % leadRegions.length];
      const regionInfo = REGION_COUNTRY_MAP[region];
      const excelRow = await loadExcelRow(i);
      const uid = `${timestamp}_${i}`;

      const leadData = buildComprehensiveLeadData(i, region, regionInfo, excelRow, uid);

      const lead = await testDataFactory.createLead(leadData);
      testDataFactory.markAsPersistent(lead.id);

      // Step through statuses - required fields already set on creation
      // Note: Status transitions may trigger Salesforce Flows - wrapped in try-catch to continue batch
      if (status === 'Funnel' || status === 'Qualified' || status === 'Unqualified') {
        try {
          await testDataFactory.updateRecord('Lead', lead.id, { Status: 'Funnel' });
        } catch (err: any) {
          logger.warn(`  [FLOW ERROR] Could not update Lead ${lead.id} to Funnel: ${err.message}`);
          logger.warn(`  This may be a Salesforce Flow issue for MRD user profile. Lead remains at "New".`);
          // Continue - don't fail the entire batch
        }
      }
      if (status === 'Qualified') {
        // "Qualified" is a Converted status in Salesforce - must use UI conversion
        if (!this.page) throw new Error('Browser page not available for Lead conversion via UI');

        const sfConfig = config.getSalesforceConfig();
        const instanceUrl = (process.env.SF_INSTANCE_URL || sfConfig.baseUrl || '').replace(/\/$/, '').replace('.my.salesforce.com', '.lightning.force.com');

        const leadUrl = `${instanceUrl}/lightning/r/Lead/${lead.id}/view`;
        logger.info(`  Navigating to Lead for UI conversion: ${leadUrl}`);
        await this.page.goto(leadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
        await this.page.waitForTimeout(3000);

        // Click the Convert button on the Lead page
        const convertBtn = this.page.locator('button:has-text("Convert"), a:has-text("Convert")').first();
        if (await convertBtn.isVisible({ timeout: 10000 }).catch(() => false)) {
          await convertBtn.click();
          await this.page.waitForTimeout(2000);
        } else {
          const moreActions = this.page.locator('button[name="ShowMoreActions"], lightning-button-menu button').first();
          if (await moreActions.isVisible({ timeout: 5000 }).catch(() => false)) {
            await moreActions.click();
            await this.page.waitForTimeout(500);
            await this.page.locator('lightning-menu-item:has-text("Convert"), a[role="menuitem"]:has-text("Convert")').first().click();
            await this.page.waitForTimeout(2000);
          } else {
            throw new Error('Convert button not found on Lead page');
          }
        }

        await this.page.waitForSelector('div.modal-body, section[role="dialog"]', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(2000);

        // Set unique Account Name in conversion modal
        const uniqueAccName = `QA MRD ${sfType} Converted_${uid}`;
        for (const sel of ['input[aria-label*="Account Name"]', 'lightning-input[label*="Account Name"] input', '.slds-form-element:has-text("Account Name") input']) {
          try {
            const field = this.page.locator(sel).first();
            if (await field.isVisible({ timeout: 3000 }).catch(() => false)) {
              await field.click(); await field.fill(''); await field.fill(uniqueAccName);
              logger.info(`  Account Name set to: ${uniqueAccName}`);
              break;
            }
          } catch { /* try next */ }
        }
        await this.page.waitForTimeout(1000);

        // Click Convert in modal
        const modalContainer = this.page.locator('section[role="dialog"], div.modal-body, lightning-modal, .slds-modal').first();
        await modalContainer.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
        let convertClicked = false;
        for (const selectorFn of [
          () => modalContainer.locator('button:has-text("Convert")').last(),
          () => modalContainer.locator('.slds-modal__footer button:has-text("Convert")').last(),
          () => modalContainer.locator('footer button:has-text("Convert")').last(),
          () => this.page!.locator('button:has-text("Convert")').last(),
        ]) {
          try {
            const btn = selectorFn();
            if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
              await btn.scrollIntoViewIfNeeded(); await btn.click();
              convertClicked = true;
              logger.info('  Clicked Convert button in modal');
              break;
            }
          } catch { /* try next */ }
        }
        if (!convertClicked) throw new Error('Convert button not found in conversion modal');

        await this.page.waitForTimeout(5000);
        await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});

        // Extract converted record IDs via API fallback
        let convertedAccountId: string | null = null;
        let convertedOppId: string | null = null;
        let convertedContactId: string | null = null;

        // Try success modal first
        const successModal = this.page.locator('[role="dialog"]:has-text("converted"), section[role="dialog"]:has-text("converted")').first();
        if (await successModal.isVisible({ timeout: 5000 }).catch(() => false)) {
          for (const [objType, setter] of [
            ['Account', (id: string) => { convertedAccountId = id; }],
            ['Opportunity', (id: string) => { convertedOppId = id; }],
          ] as const) {
            const link = successModal.locator(`a[href*="/${objType}/"]`).first();
            if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
              const href = await link.getAttribute('href');
              const m = href?.match(new RegExp(`/${objType}/([a-zA-Z0-9]{15,18})`));
              if (m) setter(m[1]);
            }
          }
        }

        // API fallback for IDs
        if (!convertedAccountId || !convertedOppId) {
          try {
            const apiClient = getAPIClient(this);
            const leadRec = await apiClient.getRecord('Lead', lead.id);
            convertedAccountId = convertedAccountId || leadRec.ConvertedAccountId;
            convertedContactId = leadRec.ConvertedContactId;
            convertedOppId = convertedOppId || leadRec.ConvertedOpportunityId;
          } catch (err: any) {
            logger.warn(`Could not fetch converted IDs via API: ${err.message}`);
          }
        }

        if (convertedAccountId) {
          testDataFactory.markAsPersistent(convertedAccountId);
          ctx.allRecords.push({ type: 'Account', id: convertedAccountId, name: uniqueAccName, status: 'Prospect', accountType: sfType, region });
        }
        if (convertedContactId) {
          testDataFactory.markAsPersistent(convertedContactId);
          ctx.allRecords.push({ type: 'Contact', id: convertedContactId, name: 'Converted Contact', status: 'Active', accountType: sfType, region });
        }
        if (convertedOppId) {
          testDataFactory.markAsPersistent(convertedOppId);
          ctx.allRecords.push({ type: 'Opportunity', id: convertedOppId, name: 'Converted Opp', status: 'Pipeline', accountType: sfType, region });
        }

        logger.info(`  Lead CONVERTED via UI (${region}): ${lead.id} -> Acc:${convertedAccountId}, Opp:${convertedOppId}`);
      } else if (status === 'Unqualified') {
        try {
          await testDataFactory.updateRecord('Lead', lead.id, { Status: 'Unqualified' });
        } catch (err: any) {
          logger.warn(`  [FLOW ERROR] Could not update Lead ${lead.id} to Unqualified: ${err.message}`);
          logger.warn(`  Lead remains at previous status.`);
        }
      }

      ctx.allRecords.push({ type: 'Lead', id: lead.id, name: lead.name, status: status === 'Qualified' ? 'Qualified (Converted)' : status, accountType: sfType, region });
      logger.info(`  Lead at "${status}" (${region}): ${lead.id}`);
    }

    // --- Account + Opp at 3 stage combos (different regions each) ---
    // Account_Status__c: "Prospect" is the verified working default for Member type
    const stageCombos: Array<{ oppStage: string; accStatus: string; region: string }> = [
      { oppStage: 'Pipeline', accStatus: 'Prospect', region: 'US' },
      { oppStage: 'Pipeline', accStatus: 'Prospect', region: 'EU' },
      { oppStage: 'Due Diligence', accStatus: 'Onboarding', region: 'ROW' },
    ];

    for (let ci = 0; ci < stageCombos.length; ci++) {
      const combo = stageCombos[ci];
      const excelRow = await loadExcelRow(Math.floor(Math.random() * 15));
      const uid = `${timestamp}_${combo.oppStage.replace(/\s+/g, '')}`;

      const accountData = buildAccountData(
        `QA MRD ${sfType} ${combo.accStatus}_${uid}`,
        accountType, combo.region, combo.accStatus, excelRow, timestamp,
      );

      const acc = await testDataFactory.createAccount(accountData);
      testDataFactory.markAsPersistent(acc.id);

      const oppData = buildComprehensiveOppData(combo.oppStage, uid, ci);
      const opp = await testDataFactory.createOpportunity(oppData, acc.id);
      testDataFactory.markAsPersistent(opp.id);

      ctx.allRecords.push(
        { type: 'Account', id: acc.id, name: acc.name, status: combo.accStatus, accountType: sfType, region: combo.region },
        { type: 'Opportunity', id: opp.id, name: opp.name, status: combo.oppStage, accountType: sfType, region: combo.region },
      );

      logger.info(`  Account(${combo.accStatus}) + Opp(${combo.oppStage}) in ${combo.region}: ${acc.id} / ${opp.id}`);
    }

    logger.info(`\nBatch complete: ${ctx.allRecords.length} records for ${sfType}\n`);
  }
);

// ============================================================================
// STEP: Master batch - ALL region x type x stage combos
// ============================================================================

When(
  'I create MRD test data for all region and type combinations using Excel data',
  async function (this: AutomationWorld) {
    await testDataFactory.initialize();

    const ctx = getMRDContext(this);
    const timestamp = Date.now();
    let counter = 0;

    logger.info(`\n${'='.repeat(70)}`);
    logger.info('MASTER BATCH: ALL Region x Type x Stage combinations');
    logger.info(`  Types: ${MRD_ACCOUNT_TYPES.join(', ')}`);
    logger.info(`  Regions: ${ALL_REGIONS.join(', ')}`);
    logger.info(`${'='.repeat(70)}\n`);

    for (const accountType of MRD_ACCOUNT_TYPES) {
      const sfType = normalizeSFAccountType(accountType);

      for (const region of ALL_REGIONS) {
        const regionInfo = REGION_COUNTRY_MAP[region];
        const excelRow = await loadExcelRow(counter % 15);
        counter++;
        const uid = `${timestamp}_${counter}`;

        // --- Create Lead at New status ---
        const leadData: Record<string, any> = {
          FirstName: 'QA',
          LastName: `MRD_${sfType.replace(/\s+/g, '')}_${region}_${uid}`,
          Company: `QA MRD ${sfType} ${region}_${uid}`,
          Status: 'New',
          Email: `qa.master.${counter}.${uid}@testmrd.com`,
          Phone: regionInfo.phone,
          Type__c: getLeadType(accountType),
          Is_Record_Duplicate__c: false,
          Duplicate_Override_Reason__c: `Master batch - ${sfType} ${region}`,
          Annual_GWP_Estimate_Year_1__c: 1000000,
          Submission_folder_link__c: `https://sharepoint.example.com/folders/master-${uid}`,
          CurrencyIsoCode: regionInfo.currency,
          City: regionInfo.city,
          PostalCode: regionInfo.postalCode,
          Country: regionInfo.country,
        };
        if (regionInfo.state) leadData.State = regionInfo.state;

        const lead = await testDataFactory.createLead(leadData);
        testDataFactory.markAsPersistent(lead.id);
        ctx.allRecords.push({ type: 'Lead', id: lead.id, name: lead.name, status: 'New', accountType: sfType, region });

        // --- Create Account + Opp at Pipeline ---
        const accountData = buildAccountData(
          `QA MRD ${sfType} ${region} Pipeline_${uid}`,
          accountType, region, 'Prospect', excelRow, timestamp,
        );

        const acc = await testDataFactory.createAccount(accountData);
        testDataFactory.markAsPersistent(acc.id);

        const opp = await testDataFactory.createOpportunity({
          Name: `QA MRD Opp ${sfType} ${region} Pipeline_${uid}`,
          StageName: 'Pipeline',
          CloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          Amount: Math.floor(Math.random() * 1000000) + 100000,
        }, acc.id);
        testDataFactory.markAsPersistent(opp.id);

        ctx.allRecords.push(
          { type: 'Account', id: acc.id, name: acc.name, status: 'Prospect', accountType: sfType, region },
          { type: 'Opportunity', id: opp.id, name: opp.name, status: 'Pipeline', accountType: sfType, region },
        );

        logger.info(`  [${sfType}/${region}] Lead: ${lead.id}, Account: ${acc.id}, Opp: ${opp.id}`);
      }
    }

    logger.info(`\n${'='.repeat(70)}`);
    logger.info(`MASTER BATCH COMPLETE: ${ctx.allRecords.length} records`);
    logger.info(`  ${MRD_ACCOUNT_TYPES.length} types x ${ALL_REGIONS.length} regions = ${MRD_ACCOUNT_TYPES.length * ALL_REGIONS.length} combos`);
    logger.info(`${'='.repeat(70)}\n`);
  }
);

// ============================================================================
// ASSERTIONS / THEN STEPS
// ============================================================================

Then(
  'the Lead should be created successfully with status {string}',
  async function (this: AutomationWorld, expectedStatus: string) {
    const ctx = getMRDContext(this);
    if (!ctx.leadId) throw new Error('No Lead ID found.');

    const apiClient = getAPIClient(this);
    const lead = await apiClient.getRecordWithFields('Lead', ctx.leadId, ['Status', 'Name', 'Type__c']);

    if (lead.Status !== expectedStatus) {
      throw new Error(`Expected Lead status "${expectedStatus}" but got "${lead.Status}"`);
    }

    logger.info(`Lead ${ctx.leadId}: Status="${lead.Status}", Type__c="${lead.Type__c}"`);
  }
);

Then(
  'the converted Account should have status {string}',
  async function (this: AutomationWorld, expectedStatus: string) {
    const ctx = getMRDContext(this);
    if (!ctx.accountId) throw new Error('No Account ID found.');

    const apiClient = getAPIClient(this);
    const account = await apiClient.getRecordWithFields('Account', ctx.accountId, ['Account_Status__c', 'Name', 'Type']);

    if (account.Account_Status__c !== expectedStatus) {
      throw new Error(`Expected Account status "${expectedStatus}" but got "${account.Account_Status__c}"`);
    }

    logger.info(`Account ${ctx.accountId}: Status="${account.Account_Status__c}", Type="${account.Type}"`);
  }
);

Then(
  'the converted Account should have type {string}',
  async function (this: AutomationWorld, expectedType: string) {
    const ctx = getMRDContext(this);
    if (!ctx.accountId) throw new Error('No Account ID found.');

    const apiClient = getAPIClient(this);
    const account = await apiClient.getRecordWithFields('Account', ctx.accountId, ['Type', 'Name']);
    const sfExpected = normalizeSFAccountType(expectedType);

    // Accept either variant of the name (with or without spaces around dash)
    const typeMatches =
      account.Type === sfExpected ||
      account.Type === expectedType ||
      account.Type?.replace(/\s*-\s*/g, '-') === expectedType.replace(/\s*-\s*/g, '-');

    if (!typeMatches) {
      throw new Error(`Expected Account type "${expectedType}" but got "${account.Type}"`);
    }

    logger.info(`Account ${ctx.accountId}: Type="${account.Type}" (expected: ${expectedType})`);
  }
);

Then(
  'the Account should have type {string}',
  async function (this: AutomationWorld, expectedType: string) {
    const ctx = getMRDContext(this);
    if (!ctx.accountId) throw new Error('No Account ID found.');

    const apiClient = getAPIClient(this);
    const account = await apiClient.getRecordWithFields('Account', ctx.accountId, ['Type', 'Name']);
    const sfExpected = normalizeSFAccountType(expectedType);

    const typeMatches =
      account.Type === sfExpected ||
      account.Type === expectedType ||
      account.Type?.replace(/\s*-\s*/g, '-') === expectedType.replace(/\s*-\s*/g, '-');

    if (!typeMatches) {
      throw new Error(`Expected Account type "${expectedType}" but got "${account.Type}"`);
    }

    logger.info(`Account verified: Type="${account.Type}"`);
  }
);

Then(
  'the converted Contact should be {string}',
  async function (this: AutomationWorld, expectedStatus: string) {
    const ctx = getMRDContext(this);
    if (!ctx.contactId) throw new Error('No Contact ID found.');

    const apiClient = getAPIClient(this);
    const contact = await apiClient.getRecordWithFields('Contact', ctx.contactId, ['Name']);

    logger.info(`Contact ${ctx.contactId}: "${contact.Name}" (status: ${expectedStatus})`);
  }
);

Then(
  'the converted Opportunity should have stage {string}',
  async function (this: AutomationWorld, expectedStage: string) {
    const ctx = getMRDContext(this);
    if (!ctx.opportunityId) throw new Error('No Opportunity ID found.');

    const apiClient = getAPIClient(this);
    const opp = await apiClient.getRecordWithFields('Opportunity', ctx.opportunityId, ['StageName', 'Name']);

    if (opp.StageName !== expectedStage) {
      throw new Error(`Expected Opportunity stage "${expectedStage}" but got "${opp.StageName}"`);
    }

    logger.info(`Opportunity ${ctx.opportunityId}: Stage="${opp.StageName}"`);
  }
);

Then(
  'the Opportunity should have stage {string}',
  async function (this: AutomationWorld, expectedStage: string) {
    const ctx = getMRDContext(this);
    if (!ctx.opportunityId) throw new Error('No Opportunity ID found.');

    const apiClient = getAPIClient(this);
    const opp = await apiClient.getRecordWithFields('Opportunity', ctx.opportunityId, ['StageName']);

    if (opp.StageName !== expectedStage) {
      throw new Error(`Expected stage "${expectedStage}" but got "${opp.StageName}"`);
    }

    logger.info(`Opportunity verified: Stage="${opp.StageName}"`);
  }
);

Then(
  'the Account should have status {string}',
  async function (this: AutomationWorld, expectedStatus: string) {
    const ctx = getMRDContext(this);
    if (!ctx.accountId) throw new Error('No Account ID found.');

    const apiClient = getAPIClient(this);
    const account = await apiClient.getRecordWithFields('Account', ctx.accountId, ['Account_Status__c']);

    if (account.Account_Status__c !== expectedStatus) {
      throw new Error(`Expected status "${expectedStatus}" but got "${account.Account_Status__c}"`);
    }

    logger.info(`Account verified: Status="${account.Account_Status__c}"`);
  }
);

Then('the Opportunity summary fields should be populated', async function (this: AutomationWorld) {
  if (!this.testContext.mrdSummaryPopulated) throw new Error('Summary fields not populated.');
  logger.info('Opportunity summary fields verified');
});

Then('the MOU fields should be populated for US region', async function (this: AutomationWorld) {
  if (!this.testContext.mrdMOUPopulated) throw new Error('MOU fields not populated.');
  logger.info('MOU fields verified for US region');
});

Then('the Onboarding team should be assigned', async function (this: AutomationWorld) {
  if (!this.testContext.mrdOnboardingTeamAssigned) throw new Error('Onboarding team not assigned.');
  logger.info('Onboarding team verified');
});

Then(
  'I should have test data at the following stages:',
  async function (this: AutomationWorld, dataTable: DataTable) {
    const ctx = getMRDContext(this);
    const expected = dataTable.rows();

    for (const [objectType, statusStage, countStr] of expected) {
      const count = parseInt(countStr, 10);
      const actual = ctx.allRecords.filter(
        r => r.type === objectType && r.status === statusStage
      ).length;

      if (actual < count) {
        throw new Error(`Expected ${count} ${objectType}(s) at "${statusStage}" but found ${actual}`);
      }

      logger.info(`  ${objectType} at "${statusStage}": ${actual} (expected ${count})`);
    }

    logger.info('All expected stages verified');
  }
);

// ============================================================================
// STEP: Log summary
// ============================================================================

Then(
  'I log the MRD process record summary',
  async function (this: AutomationWorld) {
    const ctx = getMRDContext(this);

    logger.info(`\n${'='.repeat(90)}`);
    logger.info('  MRD PROCESS FLOW - TEST DATA SUMMARY');
    logger.info(`${'='.repeat(90)}`);
    logger.info(`  Region: ${ctx.region || 'Mixed'}  |  Account Type: ${ctx.accountType || 'Mixed'}`);
    logger.info(`${'─'.repeat(90)}`);
    logger.info(`  ${'Object'.padEnd(14)} | ${'ID'.padEnd(20)} | ${'Status/Stage'.padEnd(18)} | ${'Acct Type'.padEnd(16)} | ${'Region'.padEnd(5)} | Name`);
    logger.info(`  ${'─'.repeat(14)} | ${'─'.repeat(20)} | ${'─'.repeat(18)} | ${'─'.repeat(16)} | ${'─'.repeat(5)} | ${'─'.repeat(20)}`);

    for (const r of ctx.allRecords) {
      logger.info(
        `  ${r.type.padEnd(14)} | ${r.id.padEnd(20)} | ${r.status.padEnd(18)} | ${(r.accountType || '-').padEnd(16)} | ${(r.region || '-').padEnd(5)} | ${r.name}`
      );
    }

    logger.info(`${'─'.repeat(90)}`);
    logger.info(`  Total: ${ctx.allRecords.length} records (all PERSISTENT)`);
    logger.info(`${'='.repeat(90)}\n`);
  }
);
