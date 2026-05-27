/**
 * Compare Salesforce Account with Dynamics Party
 * 
 * Interactive utility to compare a single Salesforce Account record
 * with its corresponding Dynamics Party record.
 * 
 * Usage:
 *   ts-node scripts/compare-account-dynamics.ts
 *   ts-node scripts/compare-account-dynamics.ts --account-id <id>
 */

import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';
import { AccountComparisonValidator, ComparisonResult } from '../src/utils/account-comparison-validator';
import { logger } from '../src/utils/logger';
import { APIRequestContext, chromium } from '@playwright/test';

interface CliOptions {
  accountId?: string;
  outputPath?: string;
  format: 'console' | 'json' | 'both';
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    format: 'both',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--account-id':
      case '-a':
        if (nextArg && !nextArg.startsWith('--')) {
          options.accountId = nextArg;
          i++;
        }
        break;

      case '--output':
      case '-o':
        if (nextArg && !nextArg.startsWith('--')) {
          options.outputPath = nextArg;
          i++;
        }
        break;

      case '--format':
      case '-f':
        if (nextArg && !nextArg.startsWith('--')) {
          options.format = nextArg as 'console' | 'json' | 'both';
          i++;
        }
        break;

      case '--verbose':
      case '-v':
        options.verbose = true;
        break;

      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Compare Salesforce Account with Dynamics Party
==============================================

Interactive utility to compare a Salesforce Account record with its
corresponding Dynamics Party record.

Usage:
  ts-node scripts/compare-account-dynamics.ts [options]

Options:
  --account-id, -a <id>    Salesforce Account ID (if not provided, will prompt)
  --output, -o <path>      Output file path for JSON report (optional)
  --format, -f <format>    Output format: console, json, or both (default: both)
  --verbose, -v            Show detailed field-by-field comparison
  --help, -h               Show this help message

Examples:
  # Interactive mode (will prompt for Account ID)
  ts-node scripts/compare-account-dynamics.ts

  # With Account ID provided
  ts-node scripts/compare-account-dynamics.ts --account-id 001XX000004ABCD

  # Save JSON report
  ts-node scripts/compare-account-dynamics.ts --account-id 001XX000004ABCD --output report.json

  # Verbose output
  ts-node scripts/compare-account-dynamics.ts --account-id 001XX000004ABCD --verbose
`);
}

/**
 * Prompt for Account ID
 */
function promptAccountId(rl: readline.Interface): Promise<string> {
  return new Promise((resolve) => {
    rl.question('Enter Salesforce Account ID: ', (answer) => {
      const accountId = answer.trim();
      if (!accountId) {
        console.log('❌ Account ID is required');
        resolve(promptAccountId(rl));
      } else {
        resolve(accountId);
      }
    });
  });
}

/**
 * Print comparison result to console
 */
function printComparisonResult(result: ComparisonResult, verbose: boolean): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Account Comparison Result                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Account ID: ${result.accountId}`);
  console.log(`Party ID: ${result.partyId || 'N/A'}\n`);

  // Status
  console.log('Status:');
  console.log(`  Salesforce Account: ${result.accountFound ? '✅ Found' : '❌ Not Found'}`);
  console.log(`  Dynamics Party: ${result.partyFound ? '✅ Found' : '❌ Not Found'}\n`);

  if (!result.accountFound) {
    console.log('❌ Cannot compare: Account not found in Salesforce\n');
    return;
  }

  if (!result.partyFound) {
    console.log('❌ Cannot compare: Party not found in Dynamics\n');
    return;
  }

  // Summary
  const matchRate = result.fieldsCompared > 0
    ? ((result.fieldsMatched / result.fieldsCompared) * 100).toFixed(1)
    : '0';

  console.log('Summary:');
  console.log(`  Fields Compared: ${result.fieldsCompared}`);
  console.log(`  Fields Matched: ${result.fieldsMatched}`);
  console.log(`  Fields Different: ${result.fieldsDifferent}`);
  console.log(`  Fields Skipped: ${result.fieldsSkipped}`);
  console.log(`  Match Rate: ${matchRate}%`);
  console.log(`  Critical Fields: ${result.criticalFieldsMatched ? '✅ All Matched' : '❌ Mismatches Found'}\n`);

  // Errors
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    console.log('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    if (verbose) {
      result.warnings.forEach(warning => {
        console.log(`   - ${warning}`);
      });
    } else {
      console.log(`   ${result.warnings.length} warning(s) found (use --verbose to see details)`);
    }
    console.log('');
  }

  // Detailed field comparison (if verbose)
  if (verbose) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Field-by-Field Comparison:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Group by match status
    const matched = result.comparisons.filter(c => c.match && c.severity !== 'skip');
    const different = result.comparisons.filter(c => !c.match);
    const skipped = result.comparisons.filter(c => c.severity === 'skip');

    if (matched.length > 0) {
      console.log('✅ Matched Fields:');
      matched.forEach(comp => {
        console.log(`   ${comp.dynamicsField} → ${comp.salesforceField}`);
        console.log(`      Dynamics: "${comp.dynamicsValue ?? 'null'}"`);
        console.log(`      Salesforce: "${comp.salesforceValue ?? 'null'}"`);
      });
      console.log('');
    }

    if (different.length > 0) {
      console.log('❌ Different Fields:');
      different.forEach(comp => {
        const icon = comp.severity === 'error' ? '🔴' : '🟡';
        console.log(`   ${icon} ${comp.dynamicsField} → ${comp.salesforceField}`);
        console.log(`      Dynamics: "${comp.dynamicsValue ?? 'null'}"`);
        console.log(`      Salesforce: "${comp.salesforceValue ?? 'null'}"`);
        if (comp.difference) {
          console.log(`      ${comp.difference}`);
        }
      });
      console.log('');
    }

    if (skipped.length > 0 && verbose) {
      console.log('⊘ Skipped Fields:');
      skipped.forEach(comp => {
        console.log(`   ${comp.dynamicsField} → ${comp.salesforceField} (not present in both systems)`);
      });
      console.log('');
    }
  } else {
    console.log('💡 Use --verbose to see detailed field-by-field comparison\n');
  }
}

/**
 * Generate JSON report
 */
function generateJsonReport(result: ComparisonResult, outputPath: string): void {
  const jsonContent = JSON.stringify(result, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');
  logger.info(`📄 JSON report written to: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Account vs Dynamics Comparison                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const options = parseArgs();

  try {
    // Initialize Playwright API context (required for SalesforceAPIClient)
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const apiContext = context.request;

    // Create validator
    const validator = new AccountComparisonValidator(apiContext);

    // Step 1: Load field mappings
    console.log('📖 Loading field mappings...');
    await validator.loadFieldMappings();

    // Step 2: Authenticate
    console.log('\n🔐 Authenticating...');
    await validator.authenticateSalesforce();
    await validator.authenticateDynamics();

    // Step 3: Get Account ID
    let accountId: string;
    if (options.accountId) {
      accountId = options.accountId;
      console.log(`\n📋 Using provided Account ID: ${accountId}`);
    } else {
      // Interactive mode
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      accountId = await promptAccountId(rl);
      rl.close();
    }

    // Step 4: Compare records
    console.log('\n🔍 Comparing records...');
    const result = await validator.compareRecords(accountId);

    // Step 5: Print results
    if (options.format === 'console' || options.format === 'both') {
      printComparisonResult(result, options.verbose);
    }

    // Step 6: Save JSON report if requested
    if ((options.format === 'json' || options.format === 'both') && options.outputPath) {
      generateJsonReport(result, path.resolve(options.outputPath));
    } else if (options.format === 'json' && !options.outputPath) {
      // Auto-generate output path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const outputPath = path.join(process.cwd(), 'data', 'reports', `account-comparison_${accountId}_${timestamp}.json`);
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      generateJsonReport(result, outputPath);
    }

    // Cleanup
    await browser.close();

    // Exit with error code if there are critical errors
    if (result.errors.length > 0 || !result.criticalFieldsMatched) {
      process.exit(1);
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };
