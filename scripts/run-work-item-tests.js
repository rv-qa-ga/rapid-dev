/**
 * Run tests for each work item individually and generate separate reports
 * Usage: node scripts/run-work-item-tests.js [--env=qa]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get environment from command line or default to qa
const envArg = process.argv.find(arg => arg.startsWith('--env='));
const env = envArg ? envArg.split('=')[1] : 'qa';

// Read work items from file
const workItemsFile = path.join(__dirname, '..', 'inputs', 'jira-work-items.txt');
const workItemsContent = fs.readFileSync(workItemsFile, 'utf-8');

// Extract work items (lines that start with SF- and are not commented)
const workItems = workItemsContent
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#') && line.match(/^SF-\d+/))
  .map(line => line.split(/\s+/)[0]); // Get just the work item ID

console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
console.log(`║  🚀 Running Tests for ${workItems.length} Work Items            ║`);
console.log(`║  Environment: ${env.toUpperCase()}                              ║`);
console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

// Create reports directory structure
const reportsBaseDir = path.join(__dirname, '..', 'reports', 'work-items');
if (!fs.existsSync(reportsBaseDir)) {
  fs.mkdirSync(reportsBaseDir, { recursive: true });
}

const results = [];

// Run tests for each work item
for (let i = 0; i < workItems.length; i++) {
  const workItem = workItems[i];
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`[${i + 1}/${workItems.length}] Processing: ${workItem}`);
  console.log(`${'═'.repeat(70)}\n`);

  const featureFile = path.join(__dirname, '..', 'src', 'features', 'ui', 'SF', `${workItem}.feature`);
  
  // Check if feature file exists
  if (!fs.existsSync(featureFile)) {
    console.log(`⚠️  Feature file not found: ${featureFile}`);
    console.log(`   Skipping ${workItem}...\n`);
    results.push({
      workItem,
      status: 'SKIPPED',
      reason: 'Feature file not found'
    });
    continue;
  }

  // Create work item specific report directory
  const workItemReportDir = path.join(reportsBaseDir, workItem);
  if (!fs.existsSync(workItemReportDir)) {
    fs.mkdirSync(workItemReportDir, { recursive: true });
  }

  // Set environment variables
  process.env.ENV = env;
  process.env.HEADLESS = 'true'; // Run in headless mode

  try {
    // Run tests with work item specific tag
    const tag = `@${workItem}`;
    const cucumberJsonFile = path.join(workItemReportDir, 'cucumber-report.json');
    const cucumberHtmlFile = path.join(workItemReportDir, 'cucumber-report.html');

    console.log(`📋 Running tests for ${workItem}...`);
    console.log(`   Feature: ${featureFile}`);
    console.log(`   Tag: ${tag}`);
    console.log(`   Reports: ${workItemReportDir}\n`);

    // Run tests with specific config to output to work item directory
    const testCommand = `node scripts/run-tests-with-env.js "${featureFile}" --tags "${tag}" --config cucumber.config.no-paths.js`;
    
    // Override report paths by setting format options
    const originalEnv = { ...process.env };
    process.env.CUCUMBER_REPORT_JSON = cucumberJsonFile;
    process.env.CUCUMBER_REPORT_HTML = cucumberHtmlFile;

    try {
      execSync(testCommand, {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          ENV: env,
          HEADLESS: 'true' // Run in headless mode
        }
      });

      // Check if reports were generated
      const jsonExists = fs.existsSync(cucumberJsonFile);
      const htmlExists = fs.existsSync(cucumberHtmlFile);

      if (jsonExists || htmlExists) {
        console.log(`\n✅ Tests completed for ${workItem}`);
        console.log(`   📄 JSON Report: ${cucumberJsonFile}`);
        console.log(`   📄 HTML Report: ${cucumberHtmlFile}`);
        
        // Parse JSON report to get summary
        if (jsonExists) {
          try {
            const jsonContent = fs.readFileSync(cucumberJsonFile, 'utf-8');
            const cucumberData = JSON.parse(jsonContent);
            
            let passed = 0;
            let failed = 0;
            let skipped = 0;
            
            cucumberData.forEach((feature) => {
              if (feature.elements) {
                feature.elements.forEach((element) => {
                  if (element.type === 'scenario') {
                    const steps = element.steps || [];
                    const hasFailure = steps.some((step) => step.result && step.result.status === 'failed');
                    if (hasFailure) {
                      failed++;
                    } else if (steps.some((step) => step.result && step.result.status === 'skipped')) {
                      skipped++;
                    } else {
                      passed++;
                    }
                  }
                });
              }
            });

            console.log(`   📊 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
            
            results.push({
              workItem,
              status: failed > 0 ? 'FAILED' : 'PASSED',
              passed,
              failed,
              skipped,
              jsonReport: cucumberJsonFile,
              htmlReport: cucumberHtmlFile
            });
          } catch (parseError) {
            console.log(`   ⚠️  Could not parse JSON report: ${parseError.message}`);
            results.push({
              workItem,
              status: 'COMPLETED',
              jsonReport: cucumberJsonFile,
              htmlReport: cucumberHtmlFile
            });
          }
        } else {
          results.push({
            workItem,
            status: 'COMPLETED',
            jsonReport: cucumberJsonFile,
            htmlReport: cucumberHtmlFile
          });
        }
      } else {
        console.log(`\n⚠️  Tests completed but reports not found`);
        results.push({
          workItem,
          status: 'COMPLETED',
          note: 'Reports not generated'
        });
      }
    } catch (testError) {
      console.log(`\n❌ Test execution failed for ${workItem}`);
      console.log(`   Error: ${testError.message}`);
      results.push({
        workItem,
        status: 'ERROR',
        error: testError.message
      });
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }

  } catch (error) {
    console.log(`\n❌ Error processing ${workItem}: ${error.message}`);
    results.push({
      workItem,
      status: 'ERROR',
      error: error.message
    });
  }
}

// Generate summary report
console.log(`\n\n${'═'.repeat(70)}`);
console.log(`📊 SUMMARY REPORT`);
console.log(`${'═'.repeat(70)}\n`);

const passed = results.filter(r => r.status === 'PASSED').length;
const failed = results.filter(r => r.status === 'FAILED').length;
const skipped = results.filter(r => r.status === 'SKIPPED').length;
const errors = results.filter(r => r.status === 'ERROR').length;
const completed = results.filter(r => r.status === 'COMPLETED').length;

console.log(`Total Work Items: ${results.length}`);
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`⏭️  Skipped: ${skipped}`);
console.log(`⚠️  Errors: ${errors}`);
console.log(`✓ Completed: ${completed}\n`);

console.log(`\n📁 Reports Location: ${reportsBaseDir}\n`);

// Write summary JSON
const summaryFile = path.join(reportsBaseDir, 'summary.json');
fs.writeFileSync(summaryFile, JSON.stringify({
  environment: env,
  timestamp: new Date().toISOString(),
  total: results.length,
  passed,
  failed,
  skipped,
  errors,
  completed,
  results
}, null, 2));

console.log(`📄 Summary JSON: ${summaryFile}\n`);

// List all reports
console.log(`\n📋 Individual Reports:\n`);
results.forEach(result => {
  if (result.htmlReport) {
    console.log(`   ${result.workItem}: ${result.htmlReport}`);
  } else if (result.status === 'SKIPPED') {
    console.log(`   ${result.workItem}: ${result.reason || 'Skipped'}`);
  } else {
    console.log(`   ${result.workItem}: ${result.status} - ${result.error || result.note || ''}`);
  }
});

console.log(`\n✅ All tests completed!\n`);

