#!/usr/bin/env ts-node

/**
 * Generate Work Item Level Reports
 * 
 * Generates HTML reports for each work item from their individual Cucumber JSON reports
 * 
 * Usage:
 *   ts-node scripts/generate-work-item-reports.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { convertCucumberToTestResults } from './convert-cucumber-to-test-results';

const workItemsDir = path.join(__dirname, '..', 'reports', 'work-items');
const summaryFile = path.join(workItemsDir, 'summary.json');

interface WorkItemResult {
  workItem: string;
  status: string;
  passed?: number;
  failed?: number;
  skipped?: number;
  jsonReport?: string;
  htmlReport?: string;
  error?: string;
}

interface Summary {
  environment: string;
  timestamp: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  completed: number;
  results: WorkItemResult[];
}

function generateReportForWorkItem(workItem: string, workItemDir: string): boolean {
  const cucumberJsonFile = path.join(workItemDir, 'cucumber-report.json');
  const testResultsFile = path.join(workItemDir, 'test-results.json');
  const testReportFile = path.join(workItemDir, 'test-report.html');

  // Check if Cucumber JSON exists
  if (!fs.existsSync(cucumberJsonFile)) {
    console.log(`   ⚠️  No Cucumber JSON found for ${workItem}`);
    return false;
  }

  try {
    // Step 1: Convert Cucumber JSON to test-results.json
    console.log(`   📝 Converting Cucumber JSON to test-results.json...`);
    const jsonContent = fs.readFileSync(cucumberJsonFile, 'utf-8');
    const cucumberJson = JSON.parse(jsonContent);
    const testResults = convertCucumberToTestResults(cucumberJson);
    
    // Write test results JSON
    fs.writeFileSync(testResultsFile, JSON.stringify(testResults, null, 2));
    
    const passed = testResults.tests.filter(t => t.status === 'PASSED').length;
    const failed = testResults.tests.filter(t => t.status === 'FAILED').length;
    const skipped = testResults.tests.filter(t => t.status === 'SKIPPED').length;
    
    console.log(`   ✅ Converted ${testResults.tests.length} test(s) - Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);

    // Step 2: Generate test-report.html
    console.log(`   📄 Generating test-report.html...`);
    execSync(
      `ts-node ${path.join(__dirname, 'generate-test-report.ts')} ${testResultsFile} ${testReportFile}`,
      { stdio: 'pipe', cwd: path.join(__dirname, '..') }
    );
    
    console.log(`   ✅ Report generated: ${testReportFile}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Error generating report: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 Generating Work Item Level Reports                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Check if summary file exists
  if (!fs.existsSync(summaryFile)) {
    console.error(`❌ Summary file not found: ${summaryFile}`);
    console.log(`💡 Run tests first using: node scripts/run-work-item-tests.js`);
    process.exit(1);
  }

  // Load summary
  const summary: Summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
  
  console.log(`📋 Found ${summary.results.length} work item(s) to process\n`);

  let successCount = 0;
  let errorCount = 0;

  // Generate reports for each work item
  for (const result of summary.results) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Processing: ${result.workItem}`);
    console.log(`${'─'.repeat(70)}`);

    const workItemDir = path.join(workItemsDir, result.workItem);
    
    if (!fs.existsSync(workItemDir)) {
      console.log(`   ⚠️  Directory not found: ${workItemDir}`);
      errorCount++;
      continue;
    }

    const success = generateReportForWorkItem(result.workItem, workItemDir);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  // Generate summary report
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);
  console.log(`Total Work Items: ${summary.results.length}`);
  console.log(`✅ Reports Generated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}\n`);

  // List all generated reports
  console.log(`📁 Generated Reports:\n`);
  for (const result of summary.results) {
    const workItemDir = path.join(workItemsDir, result.workItem);
    const testReportFile = path.join(workItemDir, 'test-report.html');
    
    if (fs.existsSync(testReportFile)) {
      console.log(`   ✅ ${result.workItem}: ${testReportFile}`);
    } else {
      console.log(`   ⚠️  ${result.workItem}: No report generated`);
    }
  }

  console.log(`\n✅ Report generation complete!\n`);
}

// Run if called directly
if (require.main === module) {
  main();
}

