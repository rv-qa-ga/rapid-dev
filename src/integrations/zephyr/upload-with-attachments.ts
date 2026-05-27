/**
 * Upload Cucumber Results with Attachments to Zephyr Scale
 * 
 * This script uses the /automations/executions/cucumber endpoint which 
 * is the ONLY way to upload attachments in Zephyr Scale Cloud.
 * 
 * Usage:
 *   npm run zephyr:UploadWithAttachments -- --cycle "Sprint-93-QA"
 *   npm run zephyr:UploadWithAttachments -- --cycle "Sprint-93-QA" --html reports/html/cucumber-report.html
 */

import * as fs from 'fs';
import * as path from 'path';
import { zephyrClient } from './client';
import { logger } from '../../utils/logger';
import { globSync } from 'glob';

interface UploadOptions {
  testCycleName: string;
  resultsFile?: string;
  htmlReport?: string;
  includeScreenshots?: boolean;
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2);
  const options: UploadOptions = {
    testCycleName: '',
    includeScreenshots: true,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--cycle':
        options.testCycleName = args[++i] || '';
        break;
      case '--results':
        options.resultsFile = args[++i];
        break;
      case '--html':
        options.htmlReport = args[++i];
        break;
      case '--no-screenshots':
        options.includeScreenshots = false;
        break;
    }
  }

  return options;
}

function findLatestCucumberJson(): string | null {
  const patterns = [
    'reports/json/cucumber-report.json',
    'reports/cucumber-report.json',
    'reports/*.json',
  ];

  for (const pattern of patterns) {
    const files = globSync(pattern);
    if (files.length > 0) {
      // Return most recently modified
      const sorted = files
        .map(f => ({ path: f, mtime: fs.statSync(f).mtime.getTime() }))
        .sort((a, b) => b.mtime - a.mtime);
      return sorted[0].path;
    }
  }

  return null;
}

function findHtmlReport(): string | null {
  const patterns = [
    'reports/html/cucumber-report.html',
    'reports/cucumber-report.html',
    'reports/*.html',
  ];

  for (const pattern of patterns) {
    const files = globSync(pattern);
    if (files.length > 0) {
      return files[0];
    }
  }

  return null;
}

function findRecentScreenshots(maxCount: number = 5): string[] {
  const screenshotsDir = path.join(process.cwd(), 'reports', 'screenshots');
  
  if (!fs.existsSync(screenshotsDir)) {
    return [];
  }

  const files = globSync('*.png', { cwd: screenshotsDir });
  
  // Get most recent screenshots
  const sorted = files
    .map(f => ({
      path: path.join(screenshotsDir, f),
      mtime: fs.statSync(path.join(screenshotsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, maxCount);

  return sorted.map(f => f.path);
}

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     Zephyr Scale - Upload Cucumber Results with Attachments               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const options = parseArgs();

  if (!options.testCycleName) {
    console.log('Usage: npm run zephyr:UploadWithAttachments -- --cycle <cycle-name>');
    console.log('');
    console.log('Options:');
    console.log('  --cycle <name>       Test cycle name (required)');
    console.log('  --results <file>     Path to Cucumber JSON results');
    console.log('  --html <file>        Path to HTML report');
    console.log('  --no-screenshots     Skip including screenshots');
    console.log('');
    process.exit(1);
  }

  // Find Cucumber JSON results
  const resultsFile = options.resultsFile || findLatestCucumberJson();
  if (!resultsFile || !fs.existsSync(resultsFile)) {
    logger.error('❌ No Cucumber JSON results file found');
    process.exit(1);
  }
  logger.info(`📄 Results file: ${resultsFile}`);

  // Collect attachments
  const attachments: string[] = [];

  // HTML report
  const htmlReport = options.htmlReport || findHtmlReport();
  if (htmlReport && fs.existsSync(htmlReport)) {
    attachments.push(htmlReport);
    logger.info(`📄 HTML report: ${htmlReport}`);
  }

  // Screenshots
  if (options.includeScreenshots) {
    const screenshots = findRecentScreenshots(5);
    attachments.push(...screenshots);
    logger.info(`📸 Screenshots: ${screenshots.length} file(s)`);
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('📊 UPLOAD SUMMARY');
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log(`   Test Cycle: ${options.testCycleName}`);
  console.log(`   Results File: ${resultsFile}`);
  console.log(`   Attachments: ${attachments.length}`);
  attachments.forEach(a => console.log(`      - ${path.basename(a)}`));
  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('');

  try {
    const result = await zephyrClient.uploadCucumberResultsWithAttachments(
      resultsFile,
      options.testCycleName,
      attachments
    );

    console.log('');
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log('📊 UPLOAD COMPLETE');
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log(`   ✅ Results uploaded to: ${options.testCycleName}`);
    if (result?.testCycle) {
      console.log(`   📁 Test Cycle Key: ${result.testCycle.key}`);
    }
    console.log('════════════════════════════════════════════════════════════════════════════');
    console.log('');
  } catch (error: any) {
    logger.error(`❌ Upload failed: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error(`Error: ${error.message}`);
  process.exit(1);
});

