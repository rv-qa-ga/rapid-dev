#!/usr/bin/env ts-node
/**
 * Run tests from a Zephyr Scale test cycle or Jira work item
 * 
 * This script supports two modes:
 * 1. Run from test cycle: Gets test cases from a Zephyr Scale test cycle
 * 2. Run from work item: Finds all test cases linked to a Jira work item
 * 
 * Then:
 * - Extracts test case IDs (tags) from those test cases
 * - Runs Cucumber tests with those tags
 * - Uploads results to the specified Zephyr test cycle
 * 
 * Usage:
 *   # Run from test cycle
 *   npm run test:regression -- --cycle "SF-R7 Regression" --environment qa
 *   
 *   # Run from work item
 *   npm run test:regression -- --work-item SF-655 --cycle "SF-R7 Regression" --environment qa
 *   
 *   # Dry run
 *   npm run test:regression -- --cycle "SF-R7 Regression" --environment qa --dry-run
 *
 * Smoke Tests cycle: When --cycle "Smoke Tests" is used, if the cycle is not found or
 * no test case IDs can be extracted (e.g. SMOKE-001 in names/labels), the script falls
 * back to running the QA smoke feature by tag: qa-smoke-test.feature with @smoke.
 * You can add or update test cases in the "Smoke Tests" cycle in Zephyr Scale anytime;
 * when IDs are present in the cycle they will be used, otherwise the tag-based fallback runs.
 */

import { zephyrClient } from '../src/integrations/zephyr/client';
import { ZephyrLinker } from '../src/integrations/zephyr/linker';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface Options {
  workItem?: string;
  cycleName?: string;
  environment: string;
  dryRun: boolean;
  branch?: string;
  listCycles?: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  let workItem: string | undefined;
  let cycleName: string | undefined;
  let environment = 'qa';
  let dryRun = false;
  let branch: string | undefined;
  let listCycles = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--work-item' && args[i + 1] && !args[i + 1].startsWith('--')) {
      workItem = args[++i];
    } else if (arg === '--cycle' && args[i + 1] && !args[i + 1].startsWith('--')) {
      cycleName = args[++i];
      // Handle empty string explicitly
      if (cycleName === '""' || cycleName === "''" || cycleName === '') {
        cycleName = undefined;
      }
    } else if (arg === '--environment' && args[i + 1] && !args[i + 1].startsWith('--')) {
      environment = args[++i];
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--branch' && args[i + 1] && !args[i + 1].startsWith('--')) {
      branch = args[++i];
    } else if (arg === '--list-cycles') {
      listCycles = true;
    } else if (arg.startsWith('--work-item=')) {
      workItem = arg.split('=')[1];
    } else if (arg.startsWith('--cycle=')) {
      cycleName = arg.split('=')[1];
      if (cycleName === '""' || cycleName === "''" || cycleName === '') {
        cycleName = undefined;
      }
    } else if (arg.startsWith('--environment=')) {
      environment = arg.split('=')[1];
    } else if (arg.startsWith('--branch=')) {
      branch = arg.split('=')[1];
    }
  }

  if (listCycles) {
    return { workItem, cycleName, environment, dryRun, branch, listCycles: true };
  }

  if (!cycleName && !workItem) {
    console.error('❌ Error: Either --cycle or --work-item parameter is required');
    console.error('Usage examples:');
    console.error('  npm run test:regression -- --cycle "SF-R7 Regression" --environment qa');
    console.error('  npm run test:regression -- --work-item SF-655 --cycle "SF-R7 Regression" --environment qa');
    console.error('  npm run test:regression -- --list-cycles  # List all available cycles');
    process.exit(1);
  }

  return { workItem, cycleName, environment, dryRun, branch, listCycles: false };
}

/** Normalize a label to string (Zephyr API may return labels as string or { name: string }) */
function toLabelString(l: any): string {
  if (typeof l === 'string') return l;
  if (l != null && typeof (l as any).name === 'string') return (l as any).name;
  return String(l ?? '');
}

/** Regex for standard test case ID: SF-XXX-UI-001 or SF-XXX-API-001 */
const STANDARD_ID_REGEX = /([A-Z]+-\d+-(?:UI|API)-\d+)/;
/** Regex for smoke test case ID: SMOKE-001 */
const SMOKE_ID_REGEX = /(SMOKE-\d+)/;

/**
 * Extract test case IDs from Zephyr test cases
 * Test case IDs are typically in labels or test case names
 * Supports formats:
 * - SF-520-UI-001, SF-520-API-001 (standard format)
 * - SMOKE-001, SMOKE-002 (smoke test format)
 *
 * Zephyr Scale may return labels as strings or objects with .name; names may be
 * "SF-T1762: SMOKE-001: Verify..." so we match IDs anywhere in the string.
 */
function extractTestCaseIds(testCases: any[]): string[] {
  const testCaseIds = new Set<string>();

  for (const testCase of testCases) {
    // Normalize labels (API can return string[] or { name: string }[])
    const rawLabels = testCase.labels || [];
    const labels = rawLabels.map((l: any) => toLabelString(l)).filter(Boolean);

    // First, try standard format: SF-XXX-UI-001 or SF-XXX-API-001
    const standardFormatLabel = labels.find((s: string) => /^[A-Z]+-\d+-(?:UI|API)-\d+$/.test(s));
    if (standardFormatLabel) {
      testCaseIds.add(standardFormatLabel);
      continue;
    }

    // Then, try smoke test format: SMOKE-001, SMOKE-002, etc.
    const smokeTestLabel = labels.find((s: string) => /^SMOKE-\d+$/.test(s));
    if (smokeTestLabel) {
      testCaseIds.add(smokeTestLabel);
      continue;
    }

    // Extract from test case name (anywhere in string, e.g. "SF-T1762: SMOKE-001: Verify...")
    const testCaseName = String(testCase.name || '');
    const standardNameMatch = testCaseName.match(STANDARD_ID_REGEX);
    if (standardNameMatch) {
      testCaseIds.add(standardNameMatch[1]);
      continue;
    }
    const smokeNameMatch = testCaseName.match(SMOKE_ID_REGEX);
    if (smokeNameMatch) {
      testCaseIds.add(smokeNameMatch[1]);
      continue;
    }

    // Fallback: extract from test case key (e.g. key contains ID)
    const testCaseKey = String(testCase.key || '');
    const standardKeyMatch = testCaseKey.match(STANDARD_ID_REGEX);
    if (standardKeyMatch) {
      testCaseIds.add(standardKeyMatch[1]);
      continue;
    }
    const smokeKeyMatch = testCaseKey.match(SMOKE_ID_REGEX);
    if (smokeKeyMatch) {
      testCaseIds.add(smokeKeyMatch[1]);
    }
  }

  return Array.from(testCaseIds).sort();
}

/**
 * Build Cucumber tags from test case IDs
 * Converts: ['SF-520-UI-001', 'SF-520-API-001'] -> '@SF-520-UI-001 or @SF-520-API-001'
 */
function buildTags(testCaseIds: string[]): string {
  if (testCaseIds.length === 0) {
    return '';
  }
  return testCaseIds.map(id => `@${id}`).join(' or ');
}

/** True when every extracted cycle id is a smoke id (SMOKE-001); --work-item SF-655 would not match these on upload */
function isAllSmokeTestCaseIds(testCaseIds: string[]): boolean {
  return testCaseIds.length > 0 && testCaseIds.every((id) => /^SMOKE-\d+$/.test(id));
}

/** QA smoke test feature path - used for tag-based fallback when Zephyr cycle returns no IDs */
const SMOKE_TEST_FEATURE = 'src/features/ui/General/qa-smoke-test.feature';

/** True when running the Smoke Tests cycle (enables tag-based fallback) */
function isSmokeTestsCycle(cycleName: string | undefined): boolean {
  return Boolean(cycleName && cycleName.toLowerCase() === 'smoke tests');
}

async function main() {
  const options = parseArgs();
  
  console.log('\n🚀 Running regression tests');
  console.log('═'.repeat(60));
  if (options.workItem) {
    console.log(`   Work Item: ${options.workItem}`);
  }
  if (options.cycleName) {
    console.log(`   Zephyr Cycle: ${options.cycleName}`);
  }
  console.log(`   Environment: ${options.environment}`);
  console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
  if (options.branch) {
    console.log(`   Branch: ${options.branch}`);
  }
  console.log('═'.repeat(60));

  try {
    // Handle list cycles mode
    if (options.listCycles) {
      console.log('\n📋 Listing all available test cycles in Zephyr Scale...');
      const projectKey = process.env.ZEPHYR_PROJECT_KEY || 'SF';
      const allCycles = await zephyrClient.searchTestCycles('', projectKey);
      
      if (allCycles.length === 0) {
        console.log('   No test cycles found in Zephyr Scale');
      } else {
        console.log(`\n✅ Found ${allCycles.length} test cycle(s):\n`);
        allCycles.forEach((cycle: any, index: number) => {
          const key = cycle.key || 'N/A';
          const name = cycle.name || 'N/A';
          console.log(`   ${index + 1}. ${name} (${key})`);
        });
        console.log('\n💡 Usage: npm run test:regression -- --cycle "Cycle Name" --environment qa');
      }
      return;
    }

    let testCases: any[] = [];
    let testCycleKey: string | undefined;

    // Step 1: Get test cases from cycle or work item
    if (options.cycleName) {
      // Mode 1: Get test cases from test cycle
      console.log(`\n📋 Step 1: Finding test cycle "${options.cycleName}"...`);
      const cycles = await zephyrClient.searchTestCycles(options.cycleName);
      
      if (cycles.length === 0) {
        if (isSmokeTestsCycle(options.cycleName)) {
          console.warn(`⚠️  Test cycle "${options.cycleName}" not found. Using tag-based fallback (${SMOKE_TEST_FEATURE} @smoke).`);
          testCycleKey = undefined;
          testCases = [];
          // Fall through to run fallback and upload
        } else {
          console.error(`❌ Error: Test cycle "${options.cycleName}" not found in Zephyr Scale`);
          process.exit(1);
        }
      } else {
      const exactMatch = cycles.find(c => c.name === options.cycleName);
      const testCycle = exactMatch || cycles[0];
      
      if (!testCycle) {
        console.error(`❌ Error: Test cycle "${options.cycleName}" not found in Zephyr Scale`);
        console.error(`\n   Available cycles (first 10):`);
        // Try to get all cycles to show what's available
        try {
          const projectKey = process.env.ZEPHYR_PROJECT_KEY || 'SF';
          const allCycles = await zephyrClient.searchTestCycles('', projectKey);
          allCycles.slice(0, 10).forEach((cycle: any, index: number) => {
            console.error(`   ${index + 1}. ${cycle.name || 'N/A'}`);
          });
          if (allCycles.length > 10) {
            console.error(`   ... and ${allCycles.length - 10} more`);
          }
        } catch (e) {
          console.error(`   (Unable to list available cycles)`);
        }
        process.exit(1);
      }
      
      if (cycles.length > 1 && !exactMatch) {
        console.log(`⚠️  Warning: Multiple cycles found. Using: ${testCycle.name} (${testCycle.key})`);
      } else {
        console.log(`✅ Found test cycle: ${testCycle.name} (${testCycle.key})`);
      }

      testCycleKey = testCycle.key;

      if (!testCycleKey) {
        console.error(`❌ Error: Test cycle "${options.cycleName}" has no key`);
        process.exit(1);
      }

      // Get test executions from the cycle
      console.log(`\n📊 Step 2: Fetching test cases from cycle...`);
      const executions = await zephyrClient.getTestExecutions(testCycleKey);
      
      if (executions.length === 0) {
        if (isSmokeTestsCycle(options.cycleName)) {
          console.warn(`⚠️  No test cases in cycle "${options.cycleName}". Using tag-based fallback (${SMOKE_TEST_FEATURE} @smoke).`);
          testCases = [];
        } else {
          console.error(`❌ Error: No test cases found in cycle "${options.cycleName}"`);
          console.error(`   Please add test cases to the cycle in Zephyr Scale first.`);
          process.exit(1);
        }
      } else {
      console.log(`✅ Found ${executions.length} test execution(s) in cycle`);

      // Extract test case keys from executions
      // Test executions in Zephyr Scale have testCase.self URL or testCaseKey
      const testCaseKeys = new Set<string>();
      executions.forEach((exec: any) => {
        if (exec.testCaseKey) {
          testCaseKeys.add(exec.testCaseKey);
        } else if (exec.testCase) {
          // Extract key from testCase.self URL: /testcases/SF-T305/versions/1 -> SF-T305
          if (exec.testCase.self) {
            const match = exec.testCase.self.match(/\/testcases\/([^\/]+)/);
            if (match && match[1]) {
              testCaseKeys.add(match[1]);
            }
          } else if (exec.testCase.key) {
            testCaseKeys.add(exec.testCase.key);
          }
        }
      });

      if (testCaseKeys.size === 0) {
        console.error(`❌ Error: Could not extract test case keys from executions`);
        console.error(`   Execution structure: ${JSON.stringify(executions[0] || {}, null, 2)}`);
        process.exit(1);
      }

      console.log(`📥 Fetching test case details for ${testCaseKeys.size} unique test case(s)...`);
      const fetchedTestCases: any[] = [];
      const keysArray = Array.from(testCaseKeys);
      
      // Fetch test cases in batches to avoid overwhelming the API
      for (let i = 0; i < keysArray.length; i++) {
        const key = keysArray[i];
        try {
          const testCase = await zephyrClient.getTestCase(key);
          if (testCase) {
            fetchedTestCases.push(testCase);
          }
          // Show progress for large batches
          if ((i + 1) % 10 === 0 || i === keysArray.length - 1) {
            console.log(`   Fetched ${i + 1}/${keysArray.length} test case(s)...`);
          }
        } catch (error: any) {
          console.log(`   ⚠️  Could not fetch test case ${key}: ${error.message}`);
        }
      }
      
      if (fetchedTestCases.length === 0) {
        console.error(`❌ Error: Could not fetch any test cases from Zephyr Scale`);
        process.exit(1);
      }
      
      testCases = fetchedTestCases;
      console.log(`✅ Fetched ${fetchedTestCases.length} test case(s)`);
      }
      }
    } else if (options.workItem) {
      // Mode 2: Get test cases from work item
      console.log(`\n📋 Step 1: Finding test cases for work item "${options.workItem}"...`);
      const linker = new ZephyrLinker();
      const projectKey = process.env.ZEPHYR_PROJECT_KEY || 'SF';
      testCases = await linker.findTestCasesForWorkItem(options.workItem, projectKey);
      
      if (testCases.length === 0) {
        console.error(`❌ Error: No test cases found for work item "${options.workItem}"`);
        console.error(`\n   This could mean:`);
        console.error(`   - Test cases haven't been uploaded to Zephyr yet`);
        console.error(`   - Test cases exist but don't have labels matching "${options.workItem}"`);
        console.error(`   - Test cases are in a different project`);
        console.error(`\n   To upload test cases, run:`);
        console.error(`   npm run zephyr:UploadTestCase -- --work-item ${options.workItem}`);
        process.exit(1);
      }

      console.log(`✅ Found ${testCases.length} test case(s) for work item "${options.workItem}"`);
    }

    // Step 2/3: Extract test case IDs
    const extractStepNum = options.cycleName ? '3' : '2';
    console.log(`\n🏷️  Step ${extractStepNum}: Extracting test case IDs...`);
    const testCaseIds = extractTestCaseIds(testCases);
    
    if (testCaseIds.length === 0) {
      if (isSmokeTestsCycle(options.cycleName)) {
        console.warn(`⚠️  Could not extract test case IDs from cycle. Using tag-based fallback (${SMOKE_TEST_FEATURE} @smoke).`);
        console.warn(`   You can add/update test cases in the "Smoke Tests" cycle in Zephyr; IDs (SMOKE-001, SMOKE-002, ...) in names or labels will be used when present.`);
      } else {
        console.error(`❌ Error: Could not extract test case IDs from test cases`);
        console.error(`   Test cases must have labels or names matching pattern:`);
        console.error(`   - Standard format: SF-XXX-UI-001 or SF-XXX-API-001`);
        console.error(`   - Smoke test format: SMOKE-001, SMOKE-002, etc.`);
        console.error(`\n   Found test cases:`);
        testCases.slice(0, 5).forEach((tc: any, index: number) => {
          const labelStrs = (tc.labels || []).map((l: any) => toLabelString(l)).filter(Boolean);
          console.error(`   ${index + 1}. ${tc.key || 'N/A'}: ${tc.name || 'N/A'}`);
          console.error(`      Labels: ${labelStrs.length ? labelStrs.join(', ') : 'None'}`);
        });
        if (testCases.length > 5) {
          console.error(`   ... and ${testCases.length - 5} more`);
        }
        process.exit(1);
      }
    } else {
    console.log(`✅ Extracted ${testCaseIds.length} unique test case ID(s):`);
    testCaseIds.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    }

    // Step 3/4: Build tags and run tests
    const runStepNum = options.cycleName ? '4' : '3';
    const useSmokeFallback = testCaseIds.length === 0 && isSmokeTestsCycle(options.cycleName);
    const allSmokeIdsFromCycle = isAllSmokeTestCaseIds(testCaseIds);
    const uploadUsesSmokeFeaturePath = useSmokeFallback || allSmokeIdsFromCycle;
    const tags = buildTags(testCaseIds);
    const testCommand = useSmokeFallback
      ? `node scripts/run-tests-with-env.js ${SMOKE_TEST_FEATURE} --tags '@smoke'`
      : `node scripts/run-tests-with-env.js --tags '${tags}'`;
    
    if (options.dryRun) {
      console.log(`\n[DRY RUN] Would execute:`);
      console.log(`   ENV=${options.environment} ${testCommand}`);
      if (options.cycleName) {
        if (uploadUsesSmokeFeaturePath) {
          console.log(`   npm run zephyr:UploadResult -- --feature "${SMOKE_TEST_FEATURE}" --cycle "${options.cycleName}"`);
        } else if (options.workItem) {
          console.log(`   npm run zephyr:UploadResult -- --work-item ${options.workItem} --cycle "${options.cycleName}"`);
        } else {
          console.log(`   npm run zephyr:UploadResult -- --feature "${SMOKE_TEST_FEATURE}" --cycle "${options.cycleName}"`);
        }
      } else if (options.workItem) {
        console.log(`   npm run zephyr:UploadResult -- --work-item ${options.workItem}`);
      }
      console.log(`\n✅ Dry run complete. Use without --dry-run to execute tests.`);
      return;
    }

    console.log(`\n🧪 Step ${runStepNum}: ${useSmokeFallback ? 'Running smoke tests (tag-based fallback)' : 'Running tests with tags'}: ${useSmokeFallback ? SMOKE_TEST_FEATURE + ' @smoke' : tags.substring(0, 100) + (tags.length > 100 ? '...' : '')}`);

    // Set environment variable
    process.env.ENV = options.environment;

    console.log(`\n▶️  Executing: ${testCommand}`);
    console.log('─'.repeat(60));

    try {
      execSync(testCommand, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, ENV: options.environment }
      });

      console.log('\n✅ Tests completed successfully');
    } catch (error: any) {
      console.error('\n❌ Tests failed or had errors');
      // Don't exit with error code - we still want to upload results
    }

    // Step 4/5: Upload results to Zephyr
    const uploadStepNum = options.cycleName ? '5' : '4';
    
    // Check if report exists before attempting upload
    const fs = require('fs');
    const path = require('path');
    const possibleReportPaths = [
      path.join(process.cwd(), 'reports', 'json', 'cucumber-report.json'),
      path.join(process.cwd(), 'reports', 'cucumber-report.json'),
      path.join(process.cwd(), 'cucumber-report.json')
    ];
    
    let reportFound = false;
    let reportPath = '';
    for (const reportFile of possibleReportPaths) {
      if (fs.existsSync(reportFile)) {
        reportFound = true;
        reportPath = reportFile;
        console.log(`\n✅ Found test report: ${reportPath}`);
        break;
      }
    }
    
    if (!reportFound) {
      console.error(`\n❌ Error: No test report found. Cannot upload to Zephyr Scale.`);
      console.error(`   Checked locations:`);
      possibleReportPaths.forEach(p => console.error(`   - ${p}`));
      console.error(`   Please ensure tests completed and generated a report.`);
      process.exit(1);
    }
    
    if (options.cycleName) {
      console.log(`\n📤 Step ${uploadStepNum}: Uploading results to Zephyr Scale cycle "${options.cycleName}"...`);
      let uploadCommand: string;
      if (uploadUsesSmokeFeaturePath) {
        // SMOKE-* ids are not SF-655-UI-### ; --work-item would filter to zero. Scope upload to the smoke feature file.
        uploadCommand = `npm run zephyr:UploadResult -- --feature "${SMOKE_TEST_FEATURE}" --cycle "${options.cycleName}"`;
      } else if (options.workItem) {
        uploadCommand = `npm run zephyr:UploadResult -- --work-item ${options.workItem} --cycle "${options.cycleName}"`;
      } else {
        uploadCommand = `npm run zephyr:UploadResult -- --feature "${SMOKE_TEST_FEATURE}" --cycle "${options.cycleName}"`;
      }
      console.log(`▶️  Executing: ${uploadCommand}`);
      
      try {
        execSync(uploadCommand, {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: { ...process.env, ENV: options.environment }
        });
        console.log(`\n✅ Results uploaded to cycle "${options.cycleName}"`);
      } catch (error: any) {
        console.error(`\n❌ Error: Failed to upload results to Zephyr Scale`);
        console.error(`   Error: ${error.message}`);
        console.error(`   You can manually upload results using:`);
        console.error(`   ${uploadCommand}`);
        process.exit(1);
      }
    } else if (options.workItem) {
      console.log(`\n📤 Step ${uploadStepNum}: Uploading results to Zephyr Scale...`);
      const uploadCommand = `npm run zephyr:UploadResult -- --work-item ${options.workItem}`;
      console.log(`▶️  Executing: ${uploadCommand}`);
      
      try {
        execSync(uploadCommand, {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: { ...process.env, ENV: options.environment }
        });
        console.log(`\n✅ Results uploaded for work item "${options.workItem}"`);
      } catch (error: any) {
        console.error(`\n❌ Error: Failed to upload results to Zephyr Scale`);
        console.error(`   Error: ${error.message}`);
        console.error(`   You can manually upload results using:`);
        console.error(`   ${uploadCommand}`);
        process.exit(1);
      }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Process complete!');
    console.log('═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
