#!/usr/bin/env ts-node

/**
 * Generate Work Item Reports from Main Cucumber Report
 * 
 * Parses the main cucumber-report.json and generates individual work item reports
 * 
 * Usage:
 *   ts-node scripts/generate-work-item-reports-from-main.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { convertCucumberToTestResults } from './convert-cucumber-to-test-results';

const mainCucumberReport = path.join(__dirname, '..', 'reports', 'json', 'cucumber-report.json');
const workItemsDir = path.join(__dirname, '..', 'reports', 'work-items');

interface CucumberFeature {
  uri: string;
  id: string;
  line: number;
  keyword: string;
  name: string;
  description: string;
  tags: Array<{ name: string; line: number }>;
  elements: Array<{
    id: string;
    keyword: string;
    name: string;
    line: number;
    description: string;
    type: string;
    tags?: Array<{ name: string; line: number }>;
    steps: Array<any>;
  }>;
}

function extractWorkItemFromFeature(feature: CucumberFeature): string | null {
  // Try to extract from tags
  const workItemTag = feature.tags?.find(tag => tag.name.startsWith('@SF-'));
  if (workItemTag) {
    return workItemTag.name.replace('@', '');
  }

  // Try to extract from URI (e.g., src/features/ui/SF/SF-40.feature)
  const uriMatch = feature.uri.match(/SF[\/\\](SF-\d+)\.feature/);
  if (uriMatch) {
    return uriMatch[1];
  }

  // Try to extract from feature name
  const nameMatch = feature.name.match(/SF-(\d+)/);
  if (nameMatch) {
    return `SF-${nameMatch[1]}`;
  }

  return null;
}

function groupFeaturesByWorkItem(features: CucumberFeature[]): Map<string, CucumberFeature[]> {
  const workItemMap = new Map<string, CucumberFeature[]>();

  features.forEach(feature => {
    const workItem = extractWorkItemFromFeature(feature);
    if (workItem) {
      if (!workItemMap.has(workItem)) {
        workItemMap.set(workItem, []);
      }
      workItemMap.get(workItem)!.push(feature);
    }
  });

  return workItemMap;
}

function generateReportForWorkItem(workItem: string, features: CucumberFeature[]): boolean {
  const workItemDir = path.join(workItemsDir, workItem);
  
  // Ensure directory exists
  if (!fs.existsSync(workItemDir)) {
    fs.mkdirSync(workItemDir, { recursive: true });
  }

  const cucumberJsonFile = path.join(workItemDir, 'cucumber-report.json');
  const testResultsFile = path.join(workItemDir, 'test-results.json');
  const testReportFile = path.join(workItemDir, 'test-report.html');

  try {
    // Write work item specific Cucumber JSON
    fs.writeFileSync(cucumberJsonFile, JSON.stringify(features, null, 2), 'utf-8');
    console.log(`   ✅ Created Cucumber JSON: ${cucumberJsonFile}`);

    // Step 1: Convert Cucumber JSON to test-results.json
    console.log(`   📝 Converting to test-results.json...`);
    // convertCucumberToTestResults expects the full Cucumber JSON array format
    const testResults = convertCucumberToTestResults(features as any);
    
    // Write test results JSON
    fs.writeFileSync(testResultsFile, JSON.stringify(testResults, null, 2));
    
    const passed = testResults.tests.filter(t => t.status === 'PASSED').length;
    const failed = testResults.tests.filter(t => t.status === 'FAILED').length;
    const skipped = testResults.tests.filter(t => t.status === 'SKIPPED').length;
    
    console.log(`   ✅ Converted ${testResults.tests.length} test(s) - Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}`);

    // Step 2: Generate test-report.html
    console.log(`   📄 Generating HTML report...`);
    execSync(
      `node -r ts-node/register ${path.join(__dirname, 'generate-test-report.ts')} ${testResultsFile} ${testReportFile}`,
      { stdio: 'pipe', cwd: path.join(__dirname, '..') }
    );
    
    console.log(`   ✅ HTML report generated: ${testReportFile}`);
    return true;
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 Generating Work Item Reports from Main Cucumber Report   ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Check if main Cucumber JSON exists
  if (!fs.existsSync(mainCucumberReport)) {
    console.error(`❌ Main Cucumber report not found: ${mainCucumberReport}`);
    console.log(`💡 Run tests first to generate cucumber-report.json`);
    process.exit(1);
  }

  // Load and parse Cucumber JSON
  console.log(`📋 Loading main Cucumber report...`);
  const jsonContent = fs.readFileSync(mainCucumberReport, 'utf-8');
  const features: CucumberFeature[] = JSON.parse(jsonContent);
  
  console.log(`✅ Loaded ${features.length} feature(s)\n`);

  // Group features by work item
  console.log(`📊 Grouping features by work item...`);
  const workItemMap = groupFeaturesByWorkItem(features);
  
  console.log(`✅ Found ${workItemMap.size} work item(s) with test results\n`);

  if (workItemMap.size === 0) {
    console.log(`⚠️  No work items found in the Cucumber report.`);
    console.log(`   Make sure feature files are tagged with @SF-XXX or located in SF/ directory.`);
    process.exit(0);
  }

  let successCount = 0;
  let errorCount = 0;

  // Generate reports for each work item
  for (const [workItem, workItemFeatures] of workItemMap.entries()) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Processing: ${workItem} (${workItemFeatures.length} feature(s))`);
    console.log(`${'─'.repeat(70)}`);

    const success = generateReportForWorkItem(workItem, workItemFeatures);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  // Summary
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log(`📊 SUMMARY`);
  console.log(`${'═'.repeat(70)}\n`);
  console.log(`Total Work Items: ${workItemMap.size}`);
  console.log(`✅ Reports Generated: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}\n`);

  // List all generated reports
  console.log(`📁 Generated Reports:\n`);
  for (const workItem of workItemMap.keys()) {
    const workItemDir = path.join(workItemsDir, workItem);
    const testReportFile = path.join(workItemDir, 'test-report.html');
    
    if (fs.existsSync(testReportFile)) {
      console.log(`   ✅ ${workItem}: ${testReportFile}`);
    } else {
      const cucumberJsonFile = path.join(workItemDir, 'cucumber-report.json');
      if (fs.existsSync(cucumberJsonFile)) {
        console.log(`   ⚠️  ${workItem}: JSON only (HTML generation failed)`);
      } else {
        console.log(`   ❌ ${workItem}: No report generated`);
      }
    }
  }

  console.log(`\n✅ Report generation complete!\n`);
}

// Run if called directly
if (require.main === module) {
  main();
}

