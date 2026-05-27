/**
 * Validate Migrated Data in Salesforce
 * 
 * This script validates that data migrated to Salesforce matches the source CSV file.
 * It compares each field for each record and generates a detailed validation report.
 * 
 * Usage:
 *   ts-node scripts/validate-migrated-data.ts --csv <path>
 *   ts-node scripts/validate-migrated-data.ts --csv data/excel/QATEST2PartyTable0108Sample19Jan.csv
 */

import * as path from 'path';
import * as fs from 'fs';
import { MigrationValidator, ValidationReport, RecordValidation } from '../src/utils/migration-validator';
import { logger } from '../src/utils/logger';
import { APIRequestContext, chromium } from '@playwright/test';

interface CliOptions {
  csvPath: string;
  outputPath?: string;
  format: 'json' | 'html' | 'both';
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    csvPath: '',
    format: 'both',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--csv':
      case '-c':
        if (nextArg && !nextArg.startsWith('--')) {
          options.csvPath = nextArg;
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
          options.format = nextArg as 'json' | 'html' | 'both';
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
Validate Migrated Data in Salesforce
====================================

This script validates that data migrated to Salesforce matches the source CSV file.

Usage:
  ts-node scripts/validate-migrated-data.ts --csv <path> [options]

Required Options:
  --csv, -c <path>        Path to CSV file used for migration

Optional Options:
  --output, -o <path>     Output directory for reports (default: data/reports)
  --format, -f <format>   Report format: json, html, or both (default: both)
  --verbose, -v          Show detailed validation output
  --help, -h             Show this help message

Examples:
  # Validate with default settings
  ts-node scripts/validate-migrated-data.ts --csv data/excel/QATEST2PartyTable0108Sample19Jan.csv

  # Generate only JSON report
  ts-node scripts/validate-migrated-data.ts --csv data/excel/QATEST2PartyTable0108Sample19Jan.csv --format json

  # Custom output directory
  ts-node scripts/validate-migrated-data.ts --csv data/excel/QATEST2PartyTable0108Sample19Jan.csv --output reports/validation
`);
}

/**
 * Generate JSON report
 */
function generateJsonReport(report: ValidationReport, outputPath: string): void {
  const jsonContent = JSON.stringify(report, null, 2);
  fs.writeFileSync(outputPath, jsonContent, 'utf-8');
  logger.info(`📄 JSON report written to: ${outputPath}`);
}

/**
 * Generate HTML report
 */
function generateHtmlReport(report: ValidationReport, outputPath: string): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration Validation Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            color: #333;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            color: #1a1a1a;
            border-bottom: 3px solid #0176d3;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8f9fa;
            border-left: 4px solid #0176d3;
            padding: 20px;
            border-radius: 4px;
        }
        .summary-card h3 {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            margin-bottom: 10px;
        }
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
            color: #1a1a1a;
        }
        .summary-card.success .value { color: #2e844a; }
        .summary-card.error .value { color: #c23934; }
        .summary-card.warning .value { color: #ff9a3c; }
        .record-section {
            margin-top: 40px;
        }
        .record-header {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .record-header:hover {
            background: #e9ecef;
        }
        .record-header h3 {
            color: #1a1a1a;
            font-size: 16px;
        }
        .record-status {
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .status-found { background: #cdefc4; color: #2e844a; }
        .status-not-found { background: #fecaca; color: #c23934; }
        .status-error { background: #fecaca; color: #c23934; }
        .status-warning { background: #ffeaa7; color: #d68910; }
        .record-details {
            display: none;
            margin-top: 10px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .record-details.show {
            display: block;
        }
        .field-comparison {
            display: grid;
            grid-template-columns: 2fr 2fr 1fr 3fr;
            gap: 10px;
            padding: 10px;
            border-bottom: 1px solid #dee2e6;
            align-items: center;
        }
        .field-comparison:last-child {
            border-bottom: none;
        }
        .field-comparison.header {
            font-weight: bold;
            background: #e9ecef;
            border-bottom: 2px solid #0176d3;
        }
        .field-name {
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }
        .field-value {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #666;
            word-break: break-all;
        }
        .match-icon {
            font-size: 18px;
        }
        .match { color: #2e844a; }
        .mismatch { color: #c23934; }
        .skip { color: #999; }
        .error-list, .warning-list {
            margin-top: 15px;
            padding: 10px;
            border-radius: 4px;
        }
        .error-list {
            background: #fee;
            border-left: 4px solid #c23934;
        }
        .warning-list {
            background: #fff4e6;
            border-left: 4px solid #ff9a3c;
        }
        .error-list li, .warning-list li {
            margin: 5px 0;
            font-size: 13px;
        }
        .field-stats {
            margin-top: 40px;
        }
        .field-stats table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .field-stats th, .field-stats td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
        }
        .field-stats th {
            background: #f8f9fa;
            font-weight: bold;
            color: #1a1a1a;
        }
        .field-stats tr:hover {
            background: #f8f9fa;
        }
        .timestamp {
            color: #666;
            font-size: 12px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #dee2e6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Migration Validation Report</h1>
        
        <div class="summary">
            <div class="summary-card success">
                <h3>Records Found</h3>
                <div class="value">${report.recordsFound}/${report.totalRecords}</div>
            </div>
            <div class="summary-card error">
                <h3>Records Not Found</h3>
                <div class="value">${report.recordsNotFound}</div>
            </div>
            <div class="summary-card success">
                <h3>Fields Matched</h3>
                <div class="value">${report.totalFieldsMatched}/${report.totalFieldsValidated}</div>
            </div>
            <div class="summary-card ${report.validationRate >= 95 ? 'success' : report.validationRate >= 80 ? 'warning' : 'error'}">
                <h3>Validation Rate</h3>
                <div class="value">${report.validationRate.toFixed(1)}%</div>
            </div>
            <div class="summary-card error">
                <h3>Critical Errors</h3>
                <div class="value">${report.summary.criticalErrors}</div>
            </div>
            <div class="summary-card warning">
                <h3>Warnings</h3>
                <div class="value">${report.summary.warnings}</div>
            </div>
        </div>

        ${generateFieldStatsSection(report)}

        <div class="record-section">
            <h2>Record-by-Record Validation</h2>
            ${report.recordValidations.map((rv, index) => generateRecordSection(rv, index)).join('')}
        </div>

        <div class="timestamp">
            Generated: ${new Date(report.generatedAt).toLocaleString()}<br>
            CSV File: ${path.basename(report.csvPath)}
        </div>
    </div>

    <script>
        document.querySelectorAll('.record-header').forEach(header => {
            header.addEventListener('click', function() {
                const details = this.nextElementSibling;
                details.classList.toggle('show');
            });
        });
    </script>
</body>
</html>
`;

  fs.writeFileSync(outputPath, html, 'utf-8');
  logger.info(`📄 HTML report written to: ${outputPath}`);
}

/**
 * Generate field statistics section
 */
function generateFieldStatsSection(report: ValidationReport): string {
  const fieldStats = Array.from(report.summary.byField.entries())
    .map(([field, stats]) => ({
      field,
      ...stats,
      total: stats.matched + stats.different + stats.notFound,
      matchRate: stats.matched + stats.different > 0
        ? ((stats.matched / (stats.matched + stats.different)) * 100).toFixed(1)
        : 'N/A'
    }))
    .sort((a, b) => b.total - a.total);

  if (fieldStats.length === 0) {
    return '';
  }

  return `
        <div class="field-stats">
            <h2>Field-Level Statistics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Salesforce Field</th>
                        <th>Matched</th>
                        <th>Different</th>
                        <th>Not Found</th>
                        <th>Match Rate</th>
                    </tr>
                </thead>
                <tbody>
                    ${fieldStats.map(fs => `
                        <tr>
                            <td class="field-name">${fs.field}</td>
                            <td style="color: #2e844a;">${fs.matched}</td>
                            <td style="color: #c23934;">${fs.different}</td>
                            <td style="color: #999;">${fs.notFound}</td>
                            <td>${fs.matchRate}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
  `;
}

/**
 * Generate record validation section
 */
function generateRecordSection(rv: RecordValidation, index: number): string {
  const statusClass = rv.found
    ? (rv.errors.length > 0 ? 'status-error' : rv.warnings.length > 0 ? 'status-warning' : 'status-found')
    : 'status-not-found';
  const statusText = rv.found
    ? (rv.errors.length > 0 ? 'ERROR' : rv.warnings.length > 0 ? 'WARNING' : 'VALID')
    : 'NOT FOUND';

  const matchRate = rv.fieldsValidated > 0
    ? ((rv.fieldsMatched / rv.fieldsValidated) * 100).toFixed(1)
    : '0';

  return `
        <div class="record-section">
            <div class="record-header">
                <h3>Record ${index + 1}: ${rv.csvRecord.accelins_name || 'N/A'} (Party ID: ${rv.partyId})</h3>
                <div>
                    <span class="record-status ${statusClass}">${statusText}</span>
                    <span style="margin-left: 10px; color: #666;">${matchRate}% matched</span>
                </div>
            </div>
            <div class="record-details">
                ${rv.errors.length > 0 ? `
                    <div class="error-list">
                        <strong>Errors:</strong>
                        <ul>
                            ${rv.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${rv.warnings.length > 0 ? `
                    <div class="warning-list">
                        <strong>Warnings:</strong>
                        <ul>
                            ${rv.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                ${rv.found ? `
                    <div style="margin-top: 15px;">
                        <strong>Field Comparisons:</strong>
                        <div class="field-comparison header">
                            <div>CSV Field</div>
                            <div>Salesforce Field</div>
                            <div>Match</div>
                            <div>Values</div>
                        </div>
                        ${rv.validations.map(fv => `
                            <div class="field-comparison">
                                <div class="field-name">${escapeHtml(fv.csvField)}</div>
                                <div class="field-name">${escapeHtml(fv.salesforceField)}</div>
                                <div class="match-icon ${fv.match ? 'match' : fv.severity === 'skip' ? 'skip' : 'mismatch'}">
                                    ${fv.match ? '✓' : fv.severity === 'skip' ? '⊘' : '✗'}
                                </div>
                                <div class="field-value">
                                    CSV: "${escapeHtml(String(fv.csvValue || ''))}"<br>
                                    SF: "${escapeHtml(String(fv.salesforceValue || ''))}"
                                    ${fv.difference ? `<br><span style="color: #c23934;">${escapeHtml(fv.difference)}</span>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Print summary to console
 */
function printSummary(report: ValidationReport, verbose: boolean): void {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Migration Validation Summary                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Total Records: ${report.totalRecords}`);
  console.log(`✅ Records Found: ${report.recordsFound}`);
  console.log(`❌ Records Not Found: ${report.recordsNotFound}`);
  console.log(`\nFields Validated: ${report.totalFieldsValidated}`);
  console.log(`✅ Fields Matched: ${report.totalFieldsMatched}`);
  console.log(`❌ Fields Different: ${report.totalFieldsDifferent}`);
  console.log(`📊 Validation Rate: ${report.validationRate.toFixed(2)}%`);
  console.log(`\n⚠️  Critical Errors: ${report.summary.criticalErrors}`);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`);

  if (verbose) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Field-Level Statistics:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const fieldStats = Array.from(report.summary.byField.entries())
      .sort((a, b) => {
        const aTotal = a[1].matched + a[1].different;
        const bTotal = b[1].matched + b[1].different;
        return bTotal - aTotal;
      });

    fieldStats.forEach(([field, stats]) => {
      const total = stats.matched + stats.different;
      const matchRate = total > 0 ? ((stats.matched / total) * 100).toFixed(1) : 'N/A';
      console.log(`${field}:`);
      console.log(`  Matched: ${stats.matched}, Different: ${stats.different}, Not Found: ${stats.notFound}, Rate: ${matchRate}%`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Record Details:');
    console.log('═══════════════════════════════════════════════════════════════\n');

    report.recordValidations.forEach((rv, index) => {
      console.log(`\nRecord ${index + 1}: ${rv.csvRecord.accelins_name || 'N/A'} (${rv.partyId})`);
      if (!rv.found) {
        console.log('  ❌ NOT FOUND IN SALESFORCE');
      } else {
        console.log(`  ✅ Found (SF ID: ${rv.salesforceRecord?.Id})`);
        console.log(`  Fields: ${rv.fieldsMatched}/${rv.fieldsValidated} matched (${((rv.fieldsMatched / rv.fieldsValidated) * 100).toFixed(1)}%)`);
        if (rv.errors.length > 0) {
          console.log(`  Errors: ${rv.errors.length}`);
          rv.errors.forEach(e => console.log(`    - ${e}`));
        }
        if (rv.warnings.length > 0) {
          console.log(`  Warnings: ${rv.warnings.length}`);
          rv.warnings.slice(0, 5).forEach(w => console.log(`    - ${w}`));
          if (rv.warnings.length > 5) {
            console.log(`    ... and ${rv.warnings.length - 5} more warnings`);
          }
        }
      }
    });
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Migration Data Validation                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const options = parseArgs();

  // Validate required options
  if (!options.csvPath) {
    console.error('❌ Error: --csv is required');
    printUsage();
    process.exit(1);
  }

  if (!fs.existsSync(options.csvPath)) {
    console.error(`❌ Error: CSV file not found: ${options.csvPath}`);
    process.exit(1);
  }

  try {
    // Initialize Playwright API context (required for SalesforceAPIClient)
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const apiContext = context.request;

    // Create validator
    const validator = new MigrationValidator(apiContext);

    // Step 1: Load CSV file
    console.log('📖 Step 1: Loading CSV file...');
    await validator.loadCsvFile(path.resolve(options.csvPath));

    // Step 2: Load field mappings
    console.log('\n📖 Step 2: Loading field mappings...');
    await validator.loadFieldMappings();

    // Step 3: Authenticate with Salesforce
    console.log('\n🔐 Step 3: Authenticating with Salesforce...');
    await validator.authenticate();

    // Step 4: Validate all records
    console.log('\n🔍 Step 4: Validating records...');
    const report = await validator.validateAllRecords();
    report.csvPath = path.resolve(options.csvPath);

    // Step 5: Generate reports
    console.log('\n📄 Step 5: Generating reports...');
    const outputDir = options.outputPath
      ? path.resolve(options.outputPath)
      : path.join(process.cwd(), 'data', 'reports');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const baseName = path.basename(options.csvPath, path.extname(options.csvPath));

    if (options.format === 'json' || options.format === 'both') {
      const jsonPath = path.join(outputDir, `${baseName}_validation_${timestamp}.json`);
      generateJsonReport(report, jsonPath);
    }

    if (options.format === 'html' || options.format === 'both') {
      const htmlPath = path.join(outputDir, `${baseName}_validation_${timestamp}.html`);
      generateHtmlReport(report, htmlPath);
    }

    // Step 6: Print summary
    printSummary(report, options.verbose);

    // Cleanup
    await browser.close();

    console.log('\n✅ Validation complete!\n');

    // Exit with error code if there are critical errors
    if (report.summary.criticalErrors > 0 || report.recordsNotFound > 0) {
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
