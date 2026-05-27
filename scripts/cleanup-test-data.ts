/**
 * ============================================================================
 * TEST DATA CLEANUP SCRIPT
 * ============================================================================
 * 
 * Standalone script to clean up test data from Salesforce.
 * Can be run manually or scheduled.
 * 
 * USAGE:
 *   npm run cleanup:test-data              # Interactive mode
 *   npm run cleanup:test-data -- --force   # Delete all without confirmation
 *   npm run cleanup:test-data -- --dry-run # Show what would be deleted
 *   npm run cleanup:test-data -- --object Account  # Only clean Accounts
 *   npm run cleanup:test-data -- --pattern "Test*" # Only matching pattern
 * 
 * ============================================================================
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';
import { SalesforceAPIClient } from '../src/api/salesforce/SalesforceAPIClient';
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
  patterns: string[];
  maxAge: number; // Hours - delete records older than this
  batchSize: number;
}

// Test data patterns to identify automation-created records
const TEST_DATA_PATTERNS = [
  // Random ID patterns from TestDataFactory
  '%_Test%',
  '%Test_%',
  'Test %',
  '%API_Test%',
  '%UI_Test%',
  // Pattern: 8-char random ID followed by underscore
  '[A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9][A-Z0-9]_%',
  // Filter test patterns
  'Filter Test%',
  // Timestamp-based patterns
  '%_17647%', // Unix timestamp pattern
  '%_17648%',
  '%_17649%',
];

// Objects to clean
const CLEANABLE_OBJECTS = [
  'Account',
  'Contact',
  'Lead',
  'Opportunity',
  'Contract',
  'Case',
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
    patterns: [],
    maxAge: 24, // Default: 24 hours
    batchSize: 200,
  };

  // Parse --object argument
  const objectIndex = args.indexOf('--object');
  if (objectIndex !== -1 && args[objectIndex + 1]) {
    config.objects = [args[objectIndex + 1]];
  } else {
    config.objects = CLEANABLE_OBJECTS;
  }

  // Parse --pattern argument
  const patternIndex = args.indexOf('--pattern');
  if (patternIndex !== -1 && args[patternIndex + 1]) {
    config.patterns = [args[patternIndex + 1]];
  } else {
    config.patterns = TEST_DATA_PATTERNS;
  }

  // Parse --max-age argument (in hours)
  const maxAgeIndex = args.indexOf('--max-age');
  if (maxAgeIndex !== -1 && args[maxAgeIndex + 1]) {
    config.maxAge = parseInt(args[maxAgeIndex + 1], 10);
  }

  return config;
}

async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function findTestRecords(
  client: SalesforceAPIClient,
  objectName: string,
  patterns: string[],
  maxAgeHours: number
): Promise<Array<{ Id: string; Name: string; CreatedDate: string }>> {
  const records: Array<{ Id: string; Name: string; CreatedDate: string }> = [];
  
  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - maxAgeHours);
  const cutoffISO = cutoffDate.toISOString();

  // Build SOQL query with LIKE patterns
  const likeConditions = patterns.map((p) => `Name LIKE '${p}'`).join(' OR ');
  
  const query = `
    SELECT Id, Name, CreatedDate 
    FROM ${objectName} 
    WHERE (${likeConditions})
    AND CreatedDate >= ${cutoffISO}
    ORDER BY CreatedDate DESC
    LIMIT 2000
  `;

  try {
    logger.debug(`Query: ${query.replace(/\s+/g, ' ').trim()}`);
    const result = await client.query(query);
    records.push(...(result.records || []));
  } catch (error: any) {
    logger.warn(`Failed to query ${objectName}: ${error.message}`);
  }

  return records;
}

async function deleteRecords(
  client: SalesforceAPIClient,
  objectName: string,
  recordIds: string[],
  dryRun: boolean,
  batchSize: number
): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < recordIds.length; i += batchSize) {
    const batch = recordIds.slice(i, i + batchSize);
    
    for (const id of batch) {
      if (dryRun) {
        logger.info(`[DRY RUN] Would delete ${objectName}: ${id}`);
        deleted++;
      } else {
        try {
          await client.deleteRecord(objectName, id);
          deleted++;
          logger.debug(`Deleted ${objectName}: ${id}`);
        } catch (error: any) {
          failed++;
          logger.warn(`Failed to delete ${objectName} ${id}: ${error.message}`);
        }
      }
    }

    // Progress update
    if (!dryRun && batch.length > 0) {
      logger.info(`Progress: ${Math.min(i + batchSize, recordIds.length)}/${recordIds.length} ${objectName} records processed`);
    }
  }

  return { deleted, failed };
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                    TEST DATA CLEANUP UTILITY                               ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  const config = await parseArgs();
  
  logger.info('Configuration:');
  logger.info(`  Mode: ${config.dryRun ? 'DRY RUN' : config.force ? 'FORCE' : 'INTERACTIVE'}`);
  logger.info(`  Objects: ${config.objects.join(', ')}`);
  logger.info(`  Max Age: ${config.maxAge} hours`);
  logger.info(`  Patterns: ${config.patterns.length} pattern(s)`);

  // Initialize API client
  const client = new SalesforceAPIClient();
  await client.authenticate();
  logger.info('✅ Authenticated to Salesforce');

  // Summary of records to delete
  const summary: Record<string, Array<{ Id: string; Name: string; CreatedDate: string }>> = {};
  let totalRecords = 0;

  // Find test records for each object
  logger.info('\n📊 Scanning for test data...\n');

  for (const objectName of config.objects) {
    logger.info(`Scanning ${objectName}...`);
    const records = await findTestRecords(client, objectName, config.patterns, config.maxAge);
    summary[objectName] = records;
    totalRecords += records.length;
    logger.info(`  Found ${records.length} test record(s)`);
  }

  // Display summary
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('📋 CLEANUP SUMMARY');
  console.log('════════════════════════════════════════════════════════════════════════════');
  
  for (const [objectName, records] of Object.entries(summary)) {
    if (records.length > 0) {
      console.log(`\n${objectName}: ${records.length} record(s)`);
      // Show first 5 records as sample
      records.slice(0, 5).forEach((r) => {
        console.log(`  - ${r.Name} (${r.Id}) - Created: ${r.CreatedDate}`);
      });
      if (records.length > 5) {
        console.log(`  ... and ${records.length - 5} more`);
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log(`TOTAL: ${totalRecords} record(s) to delete`);
  console.log('════════════════════════════════════════════════════════════════════════════\n');

  if (totalRecords === 0) {
    logger.info('✅ No test data found to clean up!');
    return;
  }

  // Confirm deletion
  if (!config.force && !config.dryRun) {
    const confirmed = await confirmAction(`⚠️  Delete ${totalRecords} record(s)?`);
    if (!confirmed) {
      logger.info('❌ Cleanup cancelled by user');
      return;
    }
  }

  // Perform deletion
  logger.info('\n🗑️  Starting cleanup...\n');

  let totalDeleted = 0;
  let totalFailed = 0;

  for (const [objectName, records] of Object.entries(summary)) {
    if (records.length > 0) {
      logger.info(`Deleting ${records.length} ${objectName} record(s)...`);
      const recordIds = records.map((r) => r.Id);
      const { deleted, failed } = await deleteRecords(
        client,
        objectName,
        recordIds,
        config.dryRun,
        config.batchSize
      );
      totalDeleted += deleted;
      totalFailed += failed;
    }
  }

  // Final summary
  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('📊 CLEANUP COMPLETE');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log(`  ✅ Deleted: ${totalDeleted}`);
  console.log(`  ❌ Failed: ${totalFailed}`);
  if (config.dryRun) {
    console.log(`  ⚠️  DRY RUN MODE - No actual deletions performed`);
  }
  console.log('════════════════════════════════════════════════════════════════════════════\n');
}

// Run
main().catch((error) => {
  logger.error(`Cleanup failed: ${error.message}`);
  process.exit(1);
});
