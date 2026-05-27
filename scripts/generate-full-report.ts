#!/usr/bin/env ts-node

/**
 * Generate Full Test Report
 * 
 * Automatically converts Cucumber JSON to test-results.json and generates test-report.html
 * Reports are saved with timestamps to preserve historical test execution results.
 * 
 * Usage:
 *   ts-node scripts/generate-full-report.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { convertCucumberToTestResults } from './convert-cucumber-to-test-results';
import { execSync } from 'child_process';

/**
 * Generate timestamp string in format: YYYY-MM-DD_HH-MM-SS
 */
function generateTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

function main() {
  const cucumberJsonFile = path.join(__dirname, '../reports/json/cucumber-report.json');
  const reportsDir = path.join(__dirname, '../reports');
  
  console.log('📊 Generating Full Test Report');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Step 1: Check if Cucumber JSON exists
  if (!fs.existsSync(cucumberJsonFile)) {
    console.error(`❌ Error: Cucumber JSON report not found: ${cucumberJsonFile}`);
    console.log(`💡 Tip: Run tests first to generate cucumber-report.json`);
    console.log(`   Example: npm run test:tag "@LoginCheck"`);
    process.exit(1);
  }
  
  // Generate timestamp for this report
  const timestamp = generateTimestamp();
  
  // Create timestamped filenames
  const testResultsFileTimestamped = path.join(reportsDir, `test-results-${timestamp}.json`);
  const testReportFileTimestamped = path.join(reportsDir, `test-report-${timestamp}.html`);
  
  // Also maintain "latest" versions for backward compatibility
  const testResultsFile = path.join(reportsDir, 'test-results.json');
  const testReportFile = path.join(reportsDir, 'test-report.html');
  
  // Step 2: Convert Cucumber JSON to test-results.json
  console.log('📝 Step 1: Converting Cucumber JSON to test-results.json...');
  try {
    const jsonContent = fs.readFileSync(cucumberJsonFile, 'utf-8');
    const cucumberJson = JSON.parse(jsonContent);
    const testResults = convertCucumberToTestResults(cucumberJson);
    
    // Ensure output directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    // Write timestamped test results JSON
    fs.writeFileSync(testResultsFileTimestamped, JSON.stringify(testResults, null, 2));
    
    // Also create/update the "latest" version for backward compatibility
    fs.writeFileSync(testResultsFile, JSON.stringify(testResults, null, 2));
    
    console.log(`✅ Converted ${testResults.tests.length} test results`);
    console.log(`   - Passed: ${testResults.tests.filter(t => t.status === 'PASSED').length}`);
    console.log(`   - Failed: ${testResults.tests.filter(t => t.status === 'FAILED').length}`);
    console.log(`   - Skipped: ${testResults.tests.filter(t => t.status === 'SKIPPED').length}`);
    console.log(`\n📄 Timestamped JSON: ${path.basename(testResultsFileTimestamped)}`);
    console.log(`📄 Latest JSON: ${path.basename(testResultsFile)}\n`);
  } catch (error: any) {
    console.error(`❌ Error converting Cucumber JSON: ${error.message}`);
    process.exit(1);
  }
  
  // Step 3: Generate test-report.html
  console.log('📄 Step 2: Generating test-report.html...');
  try {
    // Generate timestamped HTML report
    execSync(
      `ts-node ${path.join(__dirname, 'generate-test-report.ts')} ${testResultsFileTimestamped} ${testReportFileTimestamped}`,
      { stdio: 'inherit', cwd: path.join(__dirname, '..') }
    );
    
    // Also generate "latest" version for backward compatibility
    execSync(
      `ts-node ${path.join(__dirname, 'generate-test-report.ts')} ${testResultsFile} ${testReportFile}`,
      { stdio: 'inherit', cwd: path.join(__dirname, '..') }
    );
    
    console.log(`\n✅ Full report generation complete!`);
    console.log(`📄 Timestamped Report: ${path.basename(testReportFileTimestamped)}`);
    console.log(`📄 Timestamped JSON: ${path.basename(testResultsFileTimestamped)}`);
    console.log(`📄 Latest Report: ${path.basename(testReportFile)}`);
    console.log(`📄 Latest JSON: ${path.basename(testResultsFile)}`);
    console.log(`\n💡 Historical reports are preserved with timestamps.`);
    console.log(`   Latest versions are maintained for backward compatibility.`);
  } catch (error: any) {
    console.error(`❌ Error generating test-report.html: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

