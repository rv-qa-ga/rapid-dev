/**
 * Automate Salesforce Workbench Field Mapping - Interactive Version
 * 
 * This script provides an interactive, step-by-step workflow for data migration:
 * 1. Data Source Selection: Fetch from Dynamics or use existing CSV
 * 2. CSV Preparation: Clean and modify CSV (remove NULLs, sort, etc.)
 * 3. Workbench Automation: Login, upload, and map fields
 * 
 * Usage:
 *   ts-node scripts/automate-workbench-field-mapping.ts
 * 
 * The script will prompt you at each step for confirmation and input.
 */

import { chromium, Browser, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { WorkbenchPage } from '../src/page-objects/salesforce/WorkbenchPage';
import { logger } from '../src/utils/logger';
import { SqlServerClient } from '../src/sqlserver/client/SqlServerClient';
import { SalesforceUIAuth } from '../src/utils/salesforce-auth';
import { config } from '../src/config/config';

/**
 * Field mapping configuration
 * Maps source CSV field names to Salesforce target field names
 * Based on the migration mapping document
 */
const FIELD_MAPPINGS: Record<string, string> = {
  // Status and Type fields
  'statuscode': 'Account_Status__c',
  'accelins_name': 'Name',
  'accelins_partymasterid': 'PTY_Code__c',
  'accelins_partytype': 'Type',
  'accelins_member_previous_known_name': 'Member_Previously_Known_As_Name__c',
  'accelins_member_short_name': 'Party_Code__c',
  
  // Address fields
  'accelins_addressline1': 'BillingStreet',
  'accelins_addressline2': 'BillingStreet', // Both map to same field
  'accelins_city': 'BillingCity',
  'accelins_country': 'BillingCountry',
  'accelins_postal_code': 'BillingPostalCode',
  'accelins_state': 'BillingState',
  
  // Data source fields
  'accelins_datasource': 'Data_Source_Written__c',
  'accelins_affiliate_nonaffiliate': 'Affiliate_Non_Affiliate__c',
  'accelins_functional_currency': 'Functional_Currency__c',
  'accelins_admittednonadmitted': 'Admission_Status__c',
  'accelins_mgaownership': 'Ownership',
  'accelins_datasourceclaims': 'Data_Source_Claims__c',
  
  // Date fields
  'accelins_claimsproductionperiodeffectivefrom': 'Claims_Production_Period_Effective_From__c',
  'accelins_writtenaccountingperiodeffectivefrom': 'Written_Accounting_Period_Effective_From__c',
  'accelins_memberstartdate': 'Onboarded_Date__c',
  'accelins_memberdiscontinueddate': 'Discontinued_Date__c',
  
  // Additional fields that might be in CSV
  'accelins_full_address': 'BillingStreet', // If concatenated address exists
};

/**
 * Available Dynamics environments
 */
const DYNAMICS_ENVIRONMENTS = ['QATEST2', 'QATEST', 'DEV', 'UAT', 'PROD'];

/**
 * Prompt user for input
 */
function promptUser(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user for yes/no confirmation
 */
async function confirmAction(rl: readline.Interface, question: string, defaultValue: boolean = true): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await promptUser(rl, `${question} [${defaultText}]: `);
  
  if (!answer) {
    return defaultValue;
  }
  
  const normalized = answer.toLowerCase();
  return normalized === 'y' || normalized === 'yes';
}

/**
 * Prompt user to select from options
 */
async function selectOption(rl: readline.Interface, question: string, options: string[], defaultIndex?: number): Promise<string> {
  console.log(`\n${question}`);
  options.forEach((opt, index) => {
    const marker = defaultIndex === index ? '→' : ' ';
    console.log(`  ${marker} [${index + 1}] ${opt}`);
  });
  
  const defaultText = defaultIndex !== undefined ? ` (default: ${defaultIndex + 1})` : '';
  const answer = await promptUser(rl, `\nSelect option${defaultText}: `);
  
  if (!answer && defaultIndex !== undefined) {
    return options[defaultIndex];
  }
  
  const selectedIndex = parseInt(answer, 10) - 1;
  if (selectedIndex >= 0 && selectedIndex < options.length) {
    return options[selectedIndex];
  }
  
  throw new Error(`Invalid selection. Please choose a number between 1 and ${options.length}`);
}

/**
 * Prompt for number input
 */
async function promptNumber(rl: readline.Interface, question: string, defaultValue?: number, min?: number, max?: number): Promise<number> {
  const defaultText = defaultValue !== undefined ? ` (default: ${defaultValue})` : '';
  const answer = await promptUser(rl, `${question}${defaultText}: `);
  
  if (!answer && defaultValue !== undefined) {
    return defaultValue;
  }
  
  const num = parseInt(answer, 10);
  if (isNaN(num)) {
    throw new Error('Invalid number. Please enter a valid number.');
  }
  
  if (min !== undefined && num < min) {
    throw new Error(`Number must be at least ${min}`);
  }
  
  if (max !== undefined && num > max) {
    throw new Error(`Number must be at most ${max}`);
  }
  
  return num;
}

/**
 * Load field mappings from Excel file if available
 * Falls back to default mappings above
 */
async function loadFieldMappings(): Promise<Record<string, string>> {
  try {
    // Try to load from Excel mapping document
    const { loadMappingsFromExcel } = await import('../src/utils/migration-mapping-loader');
    const mappings = await loadMappingsFromExcel();
    
    // Convert to the format we need: target -> source
    const mappingDict: Record<string, string> = {};
    for (const mapping of mappings) {
      // Note: Excel has dynamicsField (source) -> salesforceField (target)
      // We need target -> source for Workbench mapping
      mappingDict[mapping.salesforceField] = mapping.dynamicsField;
    }
    
    if (Object.keys(mappingDict).length > 0) {
      logger.info(`✅ Loaded ${Object.keys(mappingDict).length} field mappings from Excel`);
      return mappingDict;
    }
  } catch (error: any) {
    logger.warn(`⚠️  Could not load mappings from Excel: ${error.message}`);
    logger.info('📋 Using default field mappings');
  }
  
  // Return default mappings (inverted: target -> source)
  const defaultMappings: Record<string, string> = {};
  for (const [source, target] of Object.entries(FIELD_MAPPINGS)) {
    // Handle multiple sources mapping to same target (e.g., addressline1 and addressline2)
    if (defaultMappings[target]) {
      // If target already exists, prefer the first one or combine logic
      // For now, we'll use the first mapping
      continue;
    }
    defaultMappings[target] = source;
  }
  
  return defaultMappings;
}

/**
 * Build SQL query with configurable record limit
 */
function buildPartyQuery(recordLimit?: number): string {
  const topClause = recordLimit ? `TOP(${recordLimit})` : '';
  
  return `
SELECT ${topClause}
    statecode,
    accelins_name,
    accelins_partyid,
    createdon,
    createdby,
    modifiedon,
    modifiedby,
    ownerid,
    statuscode,
    accelins_partymasterid,
    accelins_partytype,
    accelins_member_previous_known_name,
    accelins_member_short_name,
    accelins_addressline1,
    accelins_addressline2,
    accelins_city,
    accelins_country,
    accelins_postal_code,
    accelins_state,
    accelins_datasource,
    accelins_affiliate_nonaffiliate,
    accelins_functional_currency,
    accelins_admittednonadmitted,
    accelins_mgaownership,
    accelins_datasourceclaims,
    accelins_claimsproductionperiodeffectivefrom,
    accelins_writtenaccountingperiodeffectivefrom,
    accelins_memberstartdate,
    accelins_memberdiscontinueddate,
    CONCAT(accelins_addressline1, ' ', accelins_addressline2) AS accelins_full_address
FROM dbo.accelins_party
ORDER BY accelins_partymasterid ASC;
`;
}

/**
 * Fetch data from Dynamics and export to CSV
 */
async function fetchAndExportData(
  rl: readline.Interface,
  environment: string,
  recordLimit?: number,
  database?: string
): Promise<string> {
  console.log(`\n📊 Fetching data from Dynamics ${environment} database...`);
  
  // Generate output file path
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputDir = path.join(process.cwd(), 'data', 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, `${environment}PartyTable${timestamp}.csv`);
  const absoluteOutputPath = path.resolve(outputPath);
  
  console.log(`📁 Output file: ${absoluteOutputPath}`);
  
  if (!(await confirmAction(rl, 'Proceed with data fetch?', true))) {
    throw new Error('Data fetch cancelled by user');
  }

  let sqlClient: SqlServerClient | null = null;

  try {
    // Initialize SQL Server client
    console.log('\n🔌 Connecting to SQL Server...');
    sqlClient = new SqlServerClient();
    console.log('✅ Connected to SQL Server');

    // Build and execute query
    const query = buildPartyQuery(recordLimit);
    console.log(`\n📝 Executing query${database ? ` on database: ${database}` : ''}...`);
    if (recordLimit) {
      console.log(`   Limiting to ${recordLimit} records`);
    }
    
    const result = await sqlClient.queryMany(query, undefined, { database });

    if (result.recordset.length === 0) {
      throw new Error('No data returned from query');
    }

    console.log(`✅ Fetched ${result.recordset.length} records`);

    // Export to CSV
    return await exportToCsv(result.recordset, absoluteOutputPath);
  } catch (error: any) {
    console.error(`\n❌ Error fetching data: ${error.message}`);
    throw error;
  } finally {
    if (sqlClient) {
      await sqlClient.close();
    }
  }
}

/**
 * Export data to CSV file (replacing NULL with blank, sorted by PTY Master ID)
 */
async function exportToCsv(data: any[], outputPath: string): Promise<string> {
  console.log('\n📝 Exporting to CSV...');
  
  // Get column names
  const columns = Object.keys(data[0]);

  // Convert to CSV
  const csvLines: string[] = [];

  // Write header
  csvLines.push(columns.join(','));

  // Write data rows (replace NULL with blank, sort by accelins_partymasterid)
  const sortedRows = [...data].sort((a: any, b: any) => {
    const aId = a.accelins_partymasterid || '';
    const bId = b.accelins_partymasterid || '';
    return String(aId).localeCompare(String(bId));
  });

  for (const row of sortedRows) {
    const csvRow = columns.map(col => {
      const value = row[col];
      // Replace NULL/undefined with blank
      if (value === null || value === undefined) {
        return '';
      }
      // Escape commas and quotes in CSV
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvLines.push(csvRow.join(','));
  }

  // Write to file
  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
  console.log(`✅ Exported ${sortedRows.length} records to CSV`);
  console.log(`📁 File saved: ${outputPath}`);

  return outputPath;
}

/**
 * Clean and modify CSV file (remove NULLs, ensure proper formatting)
 */
async function cleanCsvFile(rl: readline.Interface, csvFilePath: string): Promise<string> {
  console.log(`\n🧹 Cleaning CSV file: ${csvFilePath}`);
  
  if (!(await confirmAction(rl, 'Proceed with CSV cleaning?', true))) {
    return csvFilePath; // Return original file
  }

  // Read CSV file
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const header = lines[0].split(',');
  const cleanedLines: string[] = [header.join(',')]; // Keep header as-is

  // Process data rows
  let cleanedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines
    
    const values = lines[i].split(',');
    const cleanedValues = values.map(val => {
      // Remove quotes if present
      let cleaned = val.replace(/^"|"$/g, '');
      // Replace NULL, null, NULL strings with blank
      if (cleaned.toUpperCase() === 'NULL' || cleaned === '') {
        cleaned = '';
      }
      // Re-escape if needed
      if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
        return `"${cleaned.replace(/"/g, '""')}"`;
      }
      return cleaned;
    });
    
    cleanedLines.push(cleanedValues.join(','));
    cleanedCount++;
  }

  // Create cleaned file path
  const dir = path.dirname(csvFilePath);
  const ext = path.extname(csvFilePath);
  const base = path.basename(csvFilePath, ext);
  const cleanedPath = path.join(dir, `${base}_cleaned${ext}`);

  // Write cleaned CSV
  fs.writeFileSync(cleanedPath, cleanedLines.join('\n'), 'utf-8');
  
  console.log(`✅ Cleaned ${cleanedCount} rows`);
  console.log(`📁 Cleaned file: ${cleanedPath}`);
  
  if (await confirmAction(rl, 'Use cleaned file for import?', true)) {
    return cleanedPath;
  }
  
  return csvFilePath;
}

/**
 * Step 1: Data Source Selection
 */
async function step1_SelectDataSource(rl: readline.Interface): Promise<string> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 1: DATA SOURCE SELECTION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const dataSource = await selectOption(
    rl,
    'How would you like to get the data?',
    ['Fetch from Dynamics database', 'Use existing CSV file'],
    0
  );

  if (dataSource === 'Fetch from Dynamics database') {
    // Select environment
    const environment = await selectOption(
      rl,
      'Select Dynamics environment:',
      DYNAMICS_ENVIRONMENTS,
      0 // Default to QATEST2
    );

    // Get record limit
    console.log('\n📊 Record Limit:');
    console.log('   Enter number of records to fetch, or leave blank for all records');
    const recordLimit = await promptNumber(rl, 'Number of records', undefined, 1);

    // Select database (optional)
    console.log('\n💾 Database Selection:');
    console.log('   Press Enter to use default database, or enter database name');
    const databaseInput = await promptUser(rl, 'Database name (optional): ');
    const database = databaseInput || 'D365Lake';

    // Fetch data
    return await fetchAndExportData(rl, environment, recordLimit || undefined, database);
  } else {
    // Get CSV file path
    const csvPath = await promptUser(rl, 'Enter path to CSV file: ');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }
    
    console.log(`✅ CSV file found: ${csvPath}`);
    return path.resolve(csvPath);
  }
}

/**
 * Step 2: CSV Preparation and Transformation
 */
async function step2_PrepareCsv(rl: readline.Interface, csvFilePath: string): Promise<string> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 2: CSV PREPARATION & TRANSFORMATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`📁 Current CSV file: ${csvFilePath}`);
  
  // Show file info
  const stats = fs.statSync(csvFilePath);
  const fileSizeKB = (stats.size / 1024).toFixed(2);
  console.log(`   Size: ${fileSizeKB} KB`);
  
  // Count lines
  const content = fs.readFileSync(csvFilePath, 'utf-8');
  const lineCount = content.split('\n').length - 1; // Subtract header
  console.log(`   Estimated rows: ${lineCount}`);

  // Ask about picklist transformation
  console.log('\n🔄 Picklist Value Transformation:');
  console.log('   Transform coded Dataverse values to Salesforce picklist values?');
  const shouldTransform = await confirmAction(rl, 'Apply picklist value transformations?', true);

  if (shouldTransform) {
    // Get mapping file path
    const defaultMappingPath = path.join(process.cwd(), 'data', 'excel', 'PicklistValueMappings.xlsx');
    const mappingPathInput = await promptUser(rl, `Picklist mapping Excel file path [${defaultMappingPath}]: `);
    const mappingPath = mappingPathInput.trim() || defaultMappingPath;

    if (!fs.existsSync(mappingPath)) {
      console.log(`⚠️  Mapping file not found: ${mappingPath}`);
      if (!(await confirmAction(rl, 'Continue without transformation?', true))) {
        throw new Error('Picklist transformation cancelled');
      }
      return csvFilePath;
    }

    // Get sheet name
    const sheetName = await promptUser(rl, 'Sheet name [party migration]: ') || 'party migration';

    try {
      console.log('\n🔄 Transforming picklist values...');
      
      // Import transformation utilities
      const { PicklistMappingRepository } = await import('../src/utils/picklist-mapping-repository');
      const { CsvTransformer } = await import('../src/utils/csv-transformer');

      const mappingRepo = new PicklistMappingRepository();
      await mappingRepo.loadMappings(path.resolve(mappingPath), sheetName);

      const mappedFields = mappingRepo.getMappedFields();
      console.log(`   Loaded mappings for ${mappedFields.length} fields`);

      const transformer = new CsvTransformer(mappingRepo);
      const result = await transformer.transformCsv(csvFilePath, undefined, true, false);

      console.log(`✅ Transformation complete!`);
      console.log(`   Transformed ${result.transformedFields} values`);
      console.log(`   Unmapped values: ${result.unmappedValues.length}`);
      
      if (result.unmappedValues.length > 0) {
        console.log('\n⚠️  Some values could not be mapped:');
        const unmappedByField = new Map<string, number>();
        result.unmappedValues.forEach(log => {
          const count = unmappedByField.get(log.fieldName) || 0;
          unmappedByField.set(log.fieldName, count + 1);
        });
        Array.from(unmappedByField.entries())
          .slice(0, 5)
          .forEach(([field, count]) => {
            console.log(`   ${field}: ${count} unmapped value(s)`);
          });
      }

      if (await confirmAction(rl, '\nUse transformed CSV for Workbench import?', true)) {
        return result.outputPath;
      }
    } catch (error: any) {
      console.error(`❌ Transformation failed: ${error.message}`);
      if (!(await confirmAction(rl, 'Continue with original CSV?', true))) {
        throw error;
      }
    }
  }
  
  // Basic cleaning option
  if (await confirmAction(rl, '\nDo you want to clean the CSV file (remove NULLs, etc.)?', true)) {
    return await cleanCsvFile(rl, csvFilePath);
  }
  
  return csvFilePath;
}

/**
 * Wait for user to complete manual Salesforce login
 */
async function waitForManualLogin(rl: readline.Interface, page: Page): Promise<void> {
  const sfConfig = config.getSalesforceConfig();
  const loginUrl = sfConfig.loginUrl || sfConfig.baseUrl || 'https://login.salesforce.com';
  console.log(`\n🌐 Opening Salesforce login page: ${loginUrl}`);
  await page.goto(loginUrl, { waitUntil: 'networkidle' });
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('MANUAL LOGIN REQUIRED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n📌 Instructions:');
  console.log('   1. In the browser window, enter your Salesforce username and password');
  console.log('   2. Click "Log In to Sandbox" button');
  console.log('   3. Wait for the Salesforce home page to load (you should see the App Launcher icon)');
  console.log('   4. The script will automatically detect when login is complete');
  console.log('\n⏳ Waiting for you to complete login...');
  console.log('   (The script will check every 3 seconds for up to 2 minutes)');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // Poll for login completion
  const maxAttempts = 40; // 40 * 3 seconds = 2 minutes
  let attempts = 0;
  let loginComplete = false;
  
  while (attempts < maxAttempts && !loginComplete) {
    await page.waitForTimeout(3000); // Wait 3 seconds between checks
    
    try {
      // Check if we're no longer on login page
      const currentUrl = page.url();
      const isOnLoginPage = currentUrl.includes('/login') || 
                            currentUrl.includes('login.salesforce.com') ||
                            (await page.locator('#username, input[name="username"]').isVisible({ timeout: 1000 }).catch(() => false));
      
      if (!isOnLoginPage) {
        // Try to verify with HomePage
        const { HomePage } = await import('../src/page-objects/salesforce/HomePage');
        const homePage = new HomePage(page);
        loginComplete = await homePage.isLoggedIn().catch(() => false);
        
        if (loginComplete) {
          console.log('\n✅ Login detected! Salesforce home page loaded.');
          break;
        }
      }
      
      attempts++;
      if (attempts % 5 === 0) {
        console.log(`   Still waiting... (${attempts * 3} seconds elapsed)`);
      }
    } catch (error) {
      // Continue polling
      attempts++;
    }
  }
  
  if (!loginComplete) {
    console.log('\n⚠️  Automatic detection timed out.');
    console.log('   Please verify you are logged into Salesforce in the browser.');
    if (!(await confirmAction(rl, 'Have you completed Salesforce login?', true))) {
      throw new Error('Salesforce login required to continue');
    }
  }
}

/**
 * Step 3: Workbench Automation
 */
async function step3_WorkbenchAutomation(rl: readline.Interface, csvFilePath: string): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('STEP 3: WORKBENCH AUTOMATION');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`📁 CSV file: ${csvFilePath}`);
  
  if (!(await confirmAction(rl, 'Proceed with Workbench automation?', true))) {
    console.log('❌ Workbench automation cancelled by user');
    return;
  }

  // Load field mappings
  console.log('\n📋 Loading field mappings...');
  const fieldMappings = await loadFieldMappings();
  console.log(`✅ Loaded ${Object.keys(fieldMappings).length} field mappings`);

  // Launch browser
  console.log('\n🌐 Launching browser...');
  if (!(await confirmAction(rl, 'Open browser and proceed with Salesforce login?', true))) {
    console.log('❌ Browser launch cancelled');
    return;
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
    ],
  });

  let salesforcePage: Page | null = null;
  let workbenchPage: Page | null = null;

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });

    // Step 3.1: Login to Salesforce QA first
    console.log('\n📝 Step 3.1: Logging into Salesforce QA environment...');
    if (!(await confirmAction(rl, 'Proceed with Salesforce QA login?', true))) {
      console.log('❌ Salesforce login cancelled');
      return;
    }

    salesforcePage = await context.newPage();
    
    // Check if JWT credentials are available
    const hasJWT = !!(process.env.SF_JWT_CLIENT_ID || process.env.SF_CLIENT_ID) && 
                   !!(process.env.SF_JWT_USERNAME || process.env.SF_USERNAME);
    
    if (hasJWT) {
      try {
        // Use JWT authentication (preferred method)
        console.log('🔐 Authenticating with Salesforce using JWT...');
        const authResult = await SalesforceUIAuth.authenticateWithJWT(salesforcePage);
        console.log(`✅ Successfully logged into Salesforce QA`);
        console.log(`   Instance URL: ${authResult.instanceUrl}`);
        
        // Navigate to home to ensure session is established
        const sfConfig = config.getSalesforceConfig();
        const homeUrl = `${sfConfig.baseUrl.replace(/\/$/, '')}/lightning/page/home`;
        await salesforcePage.goto(homeUrl, { waitUntil: 'networkidle' });
        await salesforcePage.waitForTimeout(2000);
        console.log('✅ Salesforce session established');
      } catch (error: any) {
        console.error(`\n❌ JWT authentication failed: ${error.message}`);
        console.log('\n⚠️  Falling back to manual login...');
        await waitForManualLogin(rl, salesforcePage);
      }
    } else {
      // No JWT credentials - use manual login
      console.log('⚠️  JWT credentials not found. Using manual login...');
      console.log('   To use JWT authentication, configure:');
      console.log('   - SF_JWT_CLIENT_ID (or SF_CLIENT_ID)');
      console.log('   - SF_JWT_USERNAME (or SF_USERNAME)');
      console.log('   - SF_CERT_PATH (defaults to certs/server.key)');
      console.log('   in src/config/env/.env.qa\n');
      
      await waitForManualLogin(rl, salesforcePage);
    }
    
    // Verify we're actually logged in using HomePage
    console.log('\n🔍 Verifying Salesforce session...');
    const { HomePage } = await import('../src/page-objects/salesforce/HomePage');
    const homePage = new HomePage(salesforcePage);
    
    let loginVerified = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        loginVerified = await homePage.isLoggedIn();
        if (loginVerified) {
          break;
        }
      } catch (error) {
        // Continue trying
      }
      
      if (!loginVerified && attempt < 4) {
        console.log(`   Attempt ${attempt + 1}/5: Waiting for login to complete...`);
        await salesforcePage.waitForTimeout(2000);
      }
    }
    
    if (!loginVerified) {
      const currentUrl = salesforcePage.url();
      console.log('⚠️  Warning: Login verification failed. Current URL:', currentUrl);
      console.log('   Please ensure you are logged into Salesforce in the browser.');
      if (!(await confirmAction(rl, 'Are you logged into Salesforce? (check the browser window)', true))) {
        throw new Error('Salesforce login verification failed');
      }
    } else {
      console.log('✅ Salesforce session verified - logged in successfully');
    }

    // Step 3.2: Open Workbench in a new tab
    console.log('\n📝 Step 3.2: Opening Workbench in new tab...');
    if (!(await confirmAction(rl, 'Open Workbench in a new tab?', true))) {
      console.log('❌ Workbench tab opening cancelled');
      return;
    }

    // Create new page (tab) in the same context (shares cookies/session)
    workbenchPage = await context.newPage();
    const workbench = new WorkbenchPage(workbenchPage);
    
    // Navigate to Workbench - it should use the existing Salesforce session
    console.log('🌐 Navigating to Workbench...');
    await workbench.navigateToLogin();
    console.log('✅ Opened Workbench in new tab');
    
    // Wait a bit for page to load
    await workbenchPage.waitForTimeout(2000);
    
    // Check if we're already logged in (Workbench might auto-authenticate with existing session)
    const workbenchUrl = workbenchPage.url();
    if (workbenchUrl.includes('workbench.developerforce.com') && !workbenchUrl.includes('login.php')) {
      console.log('✅ Already authenticated to Workbench (using existing Salesforce session)');
    } else {
      // Step 3.3: Complete Workbench login if needed
      console.log('\n📝 Step 3.3: Completing Workbench authentication...');
      console.log('⚠️  Note: Workbench may use existing Salesforce session');
      if (await confirmAction(rl, 'Proceed with Workbench login steps?', true)) {
        await workbench.login('Sandbox');
        await workbenchPage.waitForTimeout(3000);
        console.log('✅ Workbench login process initiated');
      }
    }

    // Step 3.4: Navigate to Data -> Insert
    console.log('\n📝 Step 3.4: Navigating to Data -> Insert...');
    if (await confirmAction(rl, 'Navigate to Data -> Insert?', true)) {
      await workbench.navigateToInsert();
      console.log('✅ Navigated to Insert page');
    }

    // Step 3.5: Select Account object type
    console.log('\n📝 Step 3.5: Selecting Account object type...');
    if (await confirmAction(rl, 'Select Account object type?', true)) {
      await workbench.selectObjectType('Account');
      console.log('✅ Selected Account');
    }

    // Step 3.6: Select "From File" option
    console.log('\n📝 Step 3.6: Selecting "From File" option...');
    if (await confirmAction(rl, 'Select "From File" option?', true)) {
      await workbench.selectFromFile();
      console.log('✅ Selected "From File"');
    }

    // Step 3.7: Upload CSV file
    console.log('\n📝 Step 3.7: Uploading CSV file...');
    if (await confirmAction(rl, 'Upload CSV file?', true)) {
      await workbench.uploadCsvFile(csvFilePath);
      console.log('✅ CSV file uploaded');
    }

    // Wait for mapping table
    console.log('\n⏳ Waiting for field mapping table to load...');
    await workbenchPage.waitForTimeout(3000);

    // Step 3.8: Get available CSV fields
    const availableCsvFields = await workbench.getAvailableCsvFields();
    console.log(`\n📋 Available CSV fields (${availableCsvFields.length}):`);
    availableCsvFields.forEach((field, index) => {
      if (index < 10 || index >= availableCsvFields.length - 5) {
        console.log(`   - ${field}`);
      } else if (index === 10) {
        console.log(`   ... (${availableCsvFields.length - 15} more fields)`);
      }
    });

    // Step 3.9: Map fields
    console.log('\n📝 Step 3.9: Mapping fields...');
    if (await confirmAction(rl, 'Proceed with automatic field mapping?', true)) {
      const mappingResult = await workbench.mapFields(fieldMappings);

      // Report results
      console.log('\n═══════════════════════════════════════════════════════════════════');
      console.log('FIELD MAPPING RESULTS');
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log(`✅ Successfully mapped: ${mappingResult.success} fields`);
      console.log(`❌ Failed to map: ${mappingResult.failed} fields`);
      
      if (mappingResult.errors.length > 0) {
        console.log('\nErrors:');
        mappingResult.errors.forEach(error => console.log(`  - ${error}`));
      }
    }

    console.log('\n✅ Field mapping automation complete!');
    console.log('⚠️  Please review the mappings in the browser and click "Next" or "Submit" when ready.');
    console.log('⚠️  The browser will remain open for you to complete the process.');
    console.log('\n📌 Note: You have two tabs open:');
    console.log('   1. Salesforce QA (first tab)');
    console.log('   2. Workbench (second tab)');

    // Keep browser open
    console.log('\n⏸️  Browser will remain open. Press Ctrl+C in terminal when done.');
    await new Promise(() => {}); // Wait indefinitely

  } catch (error: any) {
    console.error(`\n❌ Error during automation: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    throw error;
  } finally {
    // Browser stays open for user review
    // Note: Both tabs remain open
  }
}

/**
 * Main workflow
 */
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║   Salesforce Workbench Field Mapping Automation              ║');
    console.log('║   Interactive Step-by-Step Workflow                          ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Step 1: Data Source Selection
    const csvFilePath = await step1_SelectDataSource(rl);

    // Step 2: CSV Preparation
    const finalCsvPath = await step2_PrepareCsv(rl, csvFilePath);

    // Step 3: Workbench Automation
    await step3_WorkbenchAutomation(rl, finalCsvPath);

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

// Export functions for programmatic use
export { loadFieldMappings };

// Keep old function name for backward compatibility
async function automateFieldMapping(csvFilePath?: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    let finalPath = csvFilePath;
    
    if (!finalPath) {
      finalPath = await step1_SelectDataSource(rl);
    } else {
      finalPath = path.resolve(finalPath);
    }
    
    finalPath = await step2_PrepareCsv(rl, finalPath);
    await step3_WorkbenchAutomation(rl, finalPath);
  } finally {
    rl.close();
  }
}
