/**
 * ============================================================================
 * PERSISTENT ON-DEMAND TEST DATA CLEANUP SCRIPT
 * ============================================================================
 * 
 * Standalone script to clean up PERSISTENT on-demand test data from Salesforce.
 * This script targets records created with "QA" prefix by the on-demand data
 * creation steps.
 * 
 * USAGE:
 *   npm run cleanup:persistent-data              # Interactive mode
 *   npm run cleanup:persistent-data -- --force   # Delete all without confirmation
 *   npm run cleanup:persistent-data -- --dry-run # Show what would be deleted
 *   npm run cleanup:persistent-data -- --object Account  # Only clean Accounts
 * 
 * ============================================================================
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { logger } from '../src/utils/logger';

// Load environment
const envPath = path.join(__dirname, '..', 'src', 'config', 'env', '.env.qa');
dotenv.config({ path: envPath });
logger.info(`✅ Loaded environment from: ${envPath}`);

// ============================================================================
// CONFIGURATION
// ============================================================================

interface CleanupConfig {
  force: boolean;
  dryRun: boolean;
  objects: string[];
  batchSize: number;
}

// Objects that can have persistent on-demand data
const PERSISTENT_DATA_OBJECTS = [
  'Account',
  'Contact',
  'Lead',
  'Opportunity',
];

// Patterns to identify persistent on-demand test data
const PERSISTENT_DATA_PATTERNS = [
  'QA %',           // QA Parent Account, QA Opportunity Account, etc.
  'QA_%',           // QA_ prefixed records
  '%QA %',          // Any record with "QA " in the name
];

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

async function parseArgs(): Promise<CleanupConfig> {
  const args = process.argv.slice(2);
  const config: CleanupConfig = {
    force: args.includes('--force'),
    dryRun: args.includes('--dry-run'),
    objects: [],
    batchSize: 200,
  };

  // Parse --object argument
  const objectIndex = args.indexOf('--object');
  if (objectIndex !== -1 && args[objectIndex + 1]) {
    config.objects = [args[objectIndex + 1]];
  } else {
    config.objects = PERSISTENT_DATA_OBJECTS;
  }

  return config;
}

async function promptUser(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function authenticate(): Promise<{ instanceUrl: string; accessToken: string }> {
  logger.info('🔐 Authenticating with Salesforce using JWT...');
  
  const clientId = process.env.SF_CLIENT_ID;
  const username = process.env.SF_USERNAME;
  const privateKeyPath = process.env.SF_PRIVATE_KEY_PATH || path.join(__dirname, '..', 'server.key');
  const loginUrl = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !username) {
    throw new Error('Missing SF_CLIENT_ID or SF_USERNAME in environment variables');
  }

  const result = await SalesforceJWTAuth.authenticate(
    clientId,
    username,
    privateKeyPath,
    loginUrl
  );

  logger.info(`✅ Authenticated successfully to: ${result.instanceUrl}`);
  return result;
}

async function queryRecords(
  apiClient: { instanceUrl: string; accessToken: string },
  objectType: string,
  patterns: string[]
): Promise<any[]> {
  const { instanceUrl, accessToken } = apiClient;
  
  // Build WHERE clause with LIKE conditions for each pattern
  const conditions = patterns.map(pattern => {
    // Convert pattern to SOQL LIKE syntax
    const soqlPattern = pattern.replace(/%/g, '%');
    return `Name LIKE '${soqlPattern}'`;
  }).join(' OR ');

  const soql = `SELECT Id, Name, CreatedDate FROM ${objectType} WHERE ${conditions} ORDER BY CreatedDate DESC`;
  
  logger.info(`📊 Querying ${objectType} records...`);
  logger.debug(`SOQL: ${soql}`);

  const response = await fetch(`${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(soql)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.records || [];
}

async function deleteRecords(
  apiClient: { instanceUrl: string; accessToken: string },
  objectType: string,
  recordIds: string[],
  dryRun: boolean
): Promise<{ success: number; failed: number }> {
  if (dryRun) {
    logger.info(`🔍 [DRY RUN] Would delete ${recordIds.length} ${objectType} records`);
    return { success: recordIds.length, failed: 0 };
  }

  const { instanceUrl, accessToken } = apiClient;
  let success = 0;
  let failed = 0;

  // Delete records individually (Salesforce REST API doesn't support batch DELETE)
  logger.info(`🗑️  Deleting ${recordIds.length} ${objectType} record(s)...`);
  
  for (let i = 0; i < recordIds.length; i++) {
    const recordId = recordIds[i];
    const url = `${instanceUrl}/services/data/v58.0/sobjects/${objectType}/${recordId}`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok || response.status === 204) {
        success++;
        if ((i + 1) % 10 === 0) {
          logger.info(`   Progress: ${i + 1}/${recordIds.length} deleted...`);
        }
      } else {
        failed++;
        const errorText = await response.text();
        logger.error(`❌ Failed to delete ${objectType} ${recordId}: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error: any) {
      failed++;
      logger.error(`❌ Error deleting ${objectType} ${recordId}: ${error.message}`);
    }
  }

  return { success, failed };
}

async function cleanupObject(
  apiClient: { instanceUrl: string; accessToken: string },
  objectType: string,
  config: CleanupConfig
): Promise<void> {
  logger.info(`\n${'='.repeat(80)}`);
  logger.info(`🧹 Cleaning up ${objectType} records...`);
  logger.info(`${'='.repeat(80)}`);

  // Query for records matching patterns
  const records = await queryRecords(apiClient, objectType, PERSISTENT_DATA_PATTERNS);

  if (records.length === 0) {
    logger.info(`✅ No ${objectType} records found matching persistent data patterns`);
    return;
  }

  logger.info(`📋 Found ${records.length} ${objectType} record(s) matching patterns:`);
  records.slice(0, 10).forEach((record: any) => {
    logger.info(`   - ${record.Name} (${record.Id}) - Created: ${record.CreatedDate}`);
  });
  if (records.length > 10) {
    logger.info(`   ... and ${records.length - 10} more`);
  }

  if (config.dryRun) {
    logger.info(`\n🔍 [DRY RUN] Would delete ${records.length} ${objectType} record(s)`);
    return;
  }

  // Confirm deletion
  if (!config.force) {
    const answer = await promptUser(
      `\n⚠️  Delete ${records.length} ${objectType} record(s)? (yes/no): `
    );
    if (answer !== 'yes' && answer !== 'y') {
      logger.info(`⏭️  Skipping ${objectType} cleanup`);
      return;
    }
  }

  // Delete records
  const recordIds = records.map((r: any) => r.Id);
  const result = await deleteRecords(apiClient, objectType, recordIds, config.dryRun);

  logger.info(`\n✅ Cleanup complete for ${objectType}:`);
  logger.info(`   - Deleted: ${result.success}`);
  logger.info(`   - Failed: ${result.failed}`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    logger.info('\n' + '='.repeat(80));
    logger.info('🧹 PERSISTENT ON-DEMAND TEST DATA CLEANUP');
    logger.info('='.repeat(80));
    logger.info('This script will delete records created with "QA" prefix');
    logger.info('by the on-demand test data creation steps.');
    logger.info('='.repeat(80) + '\n');

    const config = await parseArgs();

    if (config.dryRun) {
      logger.info('🔍 DRY RUN MODE - No records will be deleted\n');
    }

    if (config.force) {
      logger.info('⚡ FORCE MODE - No confirmation prompts\n');
    }

    // Authenticate
    const apiClient = await authenticate();

    // Clean up each object type
    for (const objectType of config.objects) {
      await cleanupObject(apiClient, objectType, config);
    }

    logger.info('\n' + '='.repeat(80));
    logger.info('✅ CLEANUP COMPLETE');
    logger.info('='.repeat(80) + '\n');

  } catch (error: any) {
    logger.error('\n❌ Cleanup failed:', error.message);
    if (error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

