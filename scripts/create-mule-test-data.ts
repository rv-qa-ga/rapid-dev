/**
 * Create MULE- Test Data in DEV Salesforce
 * Creates Accounts, Leads, Contacts, and Opportunities with MULE- prefix
 * 
 * Usage:
 *   ENV=dev npx ts-node scripts/create-mule-test-data.ts
 *   ENV=dev npx ts-node scripts/create-mule-test-data.ts --accounts
 *   ENV=dev npx ts-node scripts/create-mule-test-data.ts --all
 */

import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';

const PREFIX = 'MULE-';

interface SalesforceResponse {
  success?: boolean;
  id?: string;
  errors?: any[];
}

// Valid Account Types from Salesforce
const ACCOUNT_TYPES = [
  'Agency', 'Insurer', 'Member', 'Non - Member MGA', 'Reinsurer',
  'Acquisition Company', 'Agency Branch', 'Distribution Partner',
  'Group', 'Insurer Branch', 'Legal Entity', 'Placing Broker',
  'Reinsurance Broker', 'Reinsurer Branch', 'Service Company',
  'Third Party Administrator'
];

// Country to Region mapping
const COUNTRY_REGION_MAP: Record<string, { region: string; currency: string }> = {
  'United States': { region: 'US', currency: 'USD' },
  'United Kingdom': { region: 'UK', currency: 'GBP' },
  'Canada': { region: 'CA', currency: 'CAD' },
  'Germany': { region: 'EU', currency: 'EUR' },
  'France': { region: 'EU', currency: 'EUR' },
  'Netherlands': { region: 'EU', currency: 'EUR' },
  'Belgium': { region: 'EU', currency: 'EUR' },
  'Switzerland': { region: 'EU', currency: 'EUR' },
  'Australia': { region: 'ROW', currency: 'USD' },
  'Singapore': { region: 'ROW', currency: 'USD' },
};

const DIVERSE_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France',
  'Australia', 'Netherlands', 'Switzerland', 'Belgium', 'Singapore',
  'United States', 'United Kingdom', 'Canada', 'Germany', 'France', 'Australia'
];

async function createRecord(
  instanceUrl: string,
  accessToken: string,
  objectType: string,
  data: Record<string, any>
): Promise<SalesforceResponse> {
  const apiVersion = config.getSalesforceConfig().apiVersion;
  const url = `${instanceUrl}/services/data/${apiVersion}/sobjects/${objectType}/`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  const result = await response.json() as SalesforceResponse;

  if (!response.ok) {
    console.error(`❌ Failed to create ${objectType}:`, JSON.stringify(result, null, 2));
    throw new Error(`Failed to create ${objectType}: ${JSON.stringify(result)}`);
  }

  return result;
}

async function queryExistingAccounts(instanceUrl: string, accessToken: string, prefix: string): Promise<string[]> {
  const apiVersion = config.getSalesforceConfig().apiVersion;
  const soql = encodeURIComponent(`SELECT Id FROM Account WHERE Name LIKE '${prefix}%' LIMIT 20`);
  const url = `${instanceUrl}/services/data/${apiVersion}/query/?q=${soql}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  const result = await response.json() as { records?: { Id: string }[] };
  return result.records?.map(r => r.Id) || [];
}

async function createAccounts(instanceUrl: string, accessToken: string, count: number = 15) {
  console.log(`\n📦 Creating ${count} ${PREFIX}Accounts...\n`);
  const createdAccounts: { id: string; name: string; type: string }[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const accountType = ACCOUNT_TYPES[i % ACCOUNT_TYPES.length];
    const country = DIVERSE_COUNTRIES[i % DIVERSE_COUNTRIES.length];
    const countryInfo = COUNTRY_REGION_MAP[country] || { region: 'US', currency: 'USD' };

    const accountName = `${PREFIX}${accountType.replace(/\s+/g, '')} Test Account ${i + 1}`;

    const accountData = {
      Name: accountName,
      Type: accountType,
      Account_Status__c: ['New', 'Active', 'Contracted'][i % 3],
      BillingCountry: country,
      BillingCity: ['New York', 'London', 'Toronto', 'Berlin', 'Paris', 'Sydney'][i % 6],
      Region__c: countryInfo.region,
      Functional_Currency__c: countryInfo.currency,
      Industry: 'Insurance',
      Description: `${PREFIX}Test Account created by automation on ${new Date().toISOString()}. Account Type: ${accountType}, Country: ${country}`,
      Phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
      Website: `https://www.${accountName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}.com`
    };

    try {
      const result = await createRecord(instanceUrl, accessToken, 'Account', accountData);
      createdAccounts.push({ id: result.id!, name: accountName, type: accountType });
      console.log(`   ✅ Created: ${accountName} (${accountType}) - ID: ${result.id}`);
    } catch (error: any) {
      console.error(`   ❌ Failed: ${accountName} - ${error.message}`);
    }
  }

  return createdAccounts;
}

async function createLeads(instanceUrl: string, accessToken: string, count: number = 10) {
  console.log(`\n📦 Creating ${count} ${PREFIX}Leads...\n`);
  const createdLeads: { id: string; name: string }[] = [];
  const timestamp = Date.now();

  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Amanda', 'Robert', 'Lisa'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
  const leadSources = ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const country = DIVERSE_COUNTRIES[i % DIVERSE_COUNTRIES.length];
    const countryInfo = COUNTRY_REGION_MAP[country] || { region: 'US', currency: 'USD' };

    const leadData = {
      FirstName: `${PREFIX}${firstName}`,
      LastName: `${lastName}_${timestamp}_${i}`,
      Company: `${PREFIX}Test Company ${i + 1}`,
      Title: ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager'][i % 5],
      Email: `mule.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}.${i}@testcompany.com`,
      Phone: `+1-555-${String(2000 + i).padStart(4, '0')}`,
      Status: ['New', 'Funnel', 'Unqualified'][i % 3],
      LeadSource: leadSources[i % leadSources.length],
      Industry: 'Insurance',
      Country: country,
      Region__c: countryInfo.region,
      Type__c: 'Member',
      Is_Record_Duplicate__c: false,
      Duplicate_Override_Reason__c: `${PREFIX}Test data creation - Unique Lead for automation testing`,
      Description: `${PREFIX}Test Lead created by automation on ${new Date().toISOString()}`
    };

    try {
      const result = await createRecord(instanceUrl, accessToken, 'Lead', leadData);
      const leadName = `${PREFIX}${firstName} ${lastName}`;
      createdLeads.push({ id: result.id!, name: leadName });
      console.log(`   ✅ Created: ${leadName} - ID: ${result.id}`);
    } catch (error: any) {
      console.error(`   ❌ Failed: ${PREFIX}${firstName} ${lastName} - ${error.message}`);
    }
  }

  return createdLeads;
}

async function createContacts(instanceUrl: string, accessToken: string, parentAccountIds: string[], count: number = 10) {
  console.log(`\n📦 Creating ${count} ${PREFIX}Contacts...\n`);
  const createdContacts: { id: string; name: string }[] = [];
  const timestamp = Date.now();

  const firstNames = ['Alice', 'Bob', 'Carol', 'Dan', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack'];
  const lastNames = ['Anderson', 'Baker', 'Clark', 'Davis', 'Evans', 'Foster', 'Green', 'Harris', 'Irving', 'Jackson'];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const accountId = parentAccountIds[i % parentAccountIds.length];

    const contactData = {
      FirstName: `${PREFIX}${firstName}`,
      LastName: `${lastName}_${timestamp}_${i}`,
      AccountId: accountId,
      Title: ['Director', 'Manager', 'Analyst', 'Specialist', 'Consultant'][i % 5],
      Email: `mule.${firstName.toLowerCase()}.${lastName.toLowerCase()}.${timestamp}.${i}@testcontact.com`,
      Phone: `+1-555-${String(3000 + i).padStart(4, '0')}`,
      Department: ['Sales', 'Marketing', 'Operations', 'Finance', 'IT'][i % 5]
    };

    try {
      const result = await createRecord(instanceUrl, accessToken, 'Contact', contactData);
      const contactName = `${PREFIX}${firstName} ${lastName}`;
      createdContacts.push({ id: result.id!, name: contactName });
      console.log(`   ✅ Created: ${contactName} - ID: ${result.id}`);
    } catch (error: any) {
      console.error(`   ❌ Failed: ${PREFIX}${firstName} ${lastName} - ${error.message}`);
    }
  }

  return createdContacts;
}

async function createOpportunities(instanceUrl: string, accessToken: string, parentAccountIds: string[], count: number = 10) {
  console.log(`\n📦 Creating ${count} ${PREFIX}Opportunities...\n`);
  const createdOpps: { id: string; name: string }[] = [];
  const timestamp = Date.now();

  const oppNames = [
    'New Business Partnership', 'Enterprise Coverage Expansion', 'Risk Management Solution',
    'Comprehensive Insurance Package', 'Strategic Partnership', 'Premium Coverage Program',
    'Custom Insurance Solution', 'Multi-Line Coverage', 'Annual Policy Renewal', 'Specialty Risk Coverage'
  ];
  const stages = ['Due Diligence', 'Go‑Live', 'Active'];
  const types = ['Existing Business', 'New Business', 'Member'];

  for (let i = 0; i < count; i++) {
    const accountId = parentAccountIds[i % parentAccountIds.length];
    const oppName = `${PREFIX}${oppNames[i % oppNames.length]} ${timestamp}_${i}`;
    const stage = stages[i % stages.length];
    const closeDate = new Date(Date.now() + (30 + i * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const oppData = {
      Name: oppName,
      AccountId: accountId,
      StageName: stage,
      Type: types[i % types.length],
      CloseDate: closeDate,
      Amount: Math.floor(Math.random() * 500000) + 100000,
      Probability: stage === 'Active' ? 100 : stage === 'Go‑Live' ? 80 : 40,
      LeadSource: ['Paid Ads', 'Website', 'Referrals - COI'][i % 3],
      Description: `${PREFIX}Test Opportunity created by automation on ${new Date().toISOString()}`
    };

    try {
      const result = await createRecord(instanceUrl, accessToken, 'Opportunity', oppData);
      createdOpps.push({ id: result.id!, name: oppName });
      console.log(`   ✅ Created: ${oppName} - ID: ${result.id}`);
    } catch (error: any) {
      console.error(`   ❌ Failed: ${oppName} - ${error.message}`);
    }
  }

  return createdOpps;
}

async function main() {
  const args = process.argv.slice(2);
  const createAll = args.includes('--all') || args.length === 0;
  const createAccountsOnly = args.includes('--accounts');
  const createLeadsOnly = args.includes('--leads');
  const createContactsOnly = args.includes('--contacts');
  const createOppsOnly = args.includes('--opportunities');

  const envName = config.getEnvironment();
  console.log(`\n🔧 Environment: ${envName.toUpperCase()}`);
  console.log(`📋 Prefix: ${PREFIX}`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  try {
    // Authenticate
    console.log('1️⃣  Authenticating with Salesforce...');
    const authResult = await SalesforceJWTAuth.authenticate();
    console.log(`   ✅ Authenticated to: ${authResult.instanceUrl}\n`);

    const createdRecords: { type: string; id: string; name: string }[] = [];

    // Create Accounts
    if (createAll || createAccountsOnly) {
      const accounts = await createAccounts(authResult.instanceUrl, authResult.accessToken, 15);
      accounts.forEach(a => createdRecords.push({ type: 'Account', id: a.id, name: a.name }));
    }

    // Create Leads
    if (createAll || createLeadsOnly) {
      const leads = await createLeads(authResult.instanceUrl, authResult.accessToken, 10);
      leads.forEach(l => createdRecords.push({ type: 'Lead', id: l.id, name: l.name }));
    }

    // Create Contacts (need Account IDs)
    if (createAll || createContactsOnly) {
      // Get or query existing parent accounts for contacts
      let parentAccountIds: string[] = createdRecords.filter(r => r.type === 'Account').map(r => r.id);
      if (parentAccountIds.length === 0) {
        console.log('\n🔍 Querying existing MULE- Accounts for Contacts...');
        parentAccountIds = await queryExistingAccounts(authResult.instanceUrl, authResult.accessToken, 'MULE-');
        if (parentAccountIds.length === 0) {
          console.log('\n📦 No existing MULE- Accounts found, creating new ones...');
          const parentAccounts = await createAccounts(authResult.instanceUrl, authResult.accessToken, 5);
          parentAccountIds = parentAccounts.map(a => a.id);
          parentAccounts.forEach(a => createdRecords.push({ type: 'Account', id: a.id, name: a.name }));
        } else {
          console.log(`   ✅ Found ${parentAccountIds.length} existing MULE- Accounts`);
        }
      }
      const contacts = await createContacts(authResult.instanceUrl, authResult.accessToken, parentAccountIds, 10);
      contacts.forEach(c => createdRecords.push({ type: 'Contact', id: c.id, name: c.name }));
    }

    // Create Opportunities (need Account IDs)
    if (createAll || createOppsOnly) {
      // Get or create parent accounts for opportunities
      let parentAccountIds: string[] = createdRecords.filter(r => r.type === 'Account').map(r => r.id);
      if (parentAccountIds.length === 0) {
        console.log('\n📦 Creating parent Accounts for Opportunities...');
        const parentAccounts = await createAccounts(authResult.instanceUrl, authResult.accessToken, 5);
        parentAccountIds = parentAccounts.map(a => a.id);
        parentAccounts.forEach(a => createdRecords.push({ type: 'Account', id: a.id, name: a.name }));
      }
      const opps = await createOpportunities(authResult.instanceUrl, authResult.accessToken, parentAccountIds, 10);
      opps.forEach(o => createdRecords.push({ type: 'Opportunity', id: o.id, name: o.name }));
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log('📋 SUMMARY - All Created Records');
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

    const accountCount = createdRecords.filter(r => r.type === 'Account').length;
    const leadCount = createdRecords.filter(r => r.type === 'Lead').length;
    const contactCount = createdRecords.filter(r => r.type === 'Contact').length;
    const oppCount = createdRecords.filter(r => r.type === 'Opportunity').length;

    console.log(`   📁 Accounts:      ${accountCount}`);
    console.log(`   📁 Leads:         ${leadCount}`);
    console.log(`   📁 Contacts:      ${contactCount}`);
    console.log(`   📁 Opportunities: ${oppCount}`);
    console.log(`   ────────────────────────`);
    console.log(`   📊 Total:         ${createdRecords.length}`);

    console.log('\n═══════════════════════════════════════════════════════════════════════════');
    console.log(`🎉 ${PREFIX}Test data creation completed successfully!`);
    console.log('═══════════════════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();

