/**
 * Process GitHub Actions Artifacts and Generate Report for SF-467
 * 
 * This script processes downloaded GitHub Actions test artifacts and generates
 * a comprehensive test report for SF-467.
 * 
 * Usage:
 *   1. Download artifacts from GitHub Actions (test-reports-{run_number}.zip)
 *   2. Extract to a folder (e.g., artifacts/)
 *   3. Run: ts-node scripts/process-github-artifacts.ts artifacts/
 * 
 * Or if artifacts are already in reports/ folder:
 *   ts-node scripts/process-github-artifacts.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ArtifactInfo {
  cucumberJson: string;
  testResults: string;
  screenshots: string[];
  timestamp: string;
}

function findCucumberReport(artifactsDir: string): string | null {
  const possiblePaths = [
    path.join(artifactsDir, 'reports', 'json', 'cucumber-report.json'),
    path.join(artifactsDir, 'reports', 'cucumber-report.json'),
    path.join(artifactsDir, 'cucumber-report.json'),
    path.join(process.cwd(), 'reports', 'json', 'cucumber-report.json'),
    path.join(process.cwd(), 'reports', 'cucumber-report.json'),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log(`✅ Found cucumber-report.json at: ${filePath}`);
      return filePath;
    }
  }

  return null;
}

function copyArtifactsToReports(artifactsDir: string): void {
  console.log(`\n📁 Copying artifacts from: ${artifactsDir}`);
  
  const sourceReports = path.join(artifactsDir, 'reports');
  const targetReports = path.join(process.cwd(), 'reports');

  if (!fs.existsSync(sourceReports)) {
    console.log(`⚠️  No reports folder found in artifacts. Looking for files directly...`);
    return;
  }

  // Copy JSON reports
  const sourceJson = path.join(sourceReports, 'json');
  const targetJson = path.join(targetReports, 'json');
  
  if (fs.existsSync(sourceJson)) {
    if (!fs.existsSync(targetJson)) {
      fs.mkdirSync(targetJson, { recursive: true });
    }
    
    const jsonFiles = fs.readdirSync(sourceJson).filter(f => f.endsWith('.json'));
    for (const file of jsonFiles) {
      const source = path.join(sourceJson, file);
      const target = path.join(targetJson, file);
      fs.copyFileSync(source, target);
      console.log(`   ✅ Copied: ${file}`);
    }
  }

  // Copy cucumber-report.json if it exists in reports root
  const sourceCucumber = path.join(sourceReports, 'cucumber-report.json');
  const targetCucumber = path.join(targetReports, 'cucumber-report.json');
  if (fs.existsSync(sourceCucumber)) {
    fs.copyFileSync(sourceCucumber, targetCucumber);
    console.log(`   ✅ Copied: cucumber-report.json`);
  }

  // Copy screenshots
  const sourceScreenshots = path.join(sourceReports, 'screenshots');
  const targetScreenshots = path.join(targetReports, 'screenshots');
  
  if (fs.existsSync(sourceScreenshots)) {
    if (!fs.existsSync(targetScreenshots)) {
      fs.mkdirSync(targetScreenshots, { recursive: true });
    }
    
    const screenshotFiles = fs.readdirSync(sourceScreenshots);
    for (const file of screenshotFiles) {
      const source = path.join(sourceScreenshots, file);
      const target = path.join(targetScreenshots, file);
      if (fs.statSync(source).isFile()) {
        fs.copyFileSync(source, target);
      }
    }
    console.log(`   ✅ Copied ${screenshotFiles.length} screenshot(s)`);
  }

  console.log(`✅ Artifacts copied to reports/ folder\n`);
}

function generateReport(): void {
  console.log('📊 Generating test report from cucumber-report.json...\n');
  
  try {
    // Use the existing report generation script
    execSync('npm run report:full', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log('\n✅ Report generation complete!');
    console.log('📄 Report location: reports/test-report.html');
    console.log('📄 Timestamped report: reports/test-report-{timestamp}.html');
  } catch (error: any) {
    console.error(`❌ Error generating report: ${error.message}`);
    process.exit(1);
  }
}

function generateWorkItemReport(workItem: string = 'SF-467'): void {
  console.log(`\n📊 Generating work item specific report for ${workItem}...\n`);
  
  try {
    // Use the work item report generation
    execSync(`npm run report:full:work-item`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`\n✅ ${workItem} report generation complete!`);
  } catch (error: any) {
    console.error(`❌ Error generating work item report: ${error.message}`);
    // Don't exit - try full report instead
    console.log('⚠️  Falling back to full report generation...');
    generateReport();
  }
}

function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  GitHub Actions Artifacts Processor for SF-467              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const artifactsDir = process.argv[2] || null;

  // If artifacts directory provided, copy files first
  if (artifactsDir) {
    if (!fs.existsSync(artifactsDir)) {
      console.error(`❌ Error: Artifacts directory not found: ${artifactsDir}`);
      console.log('\n💡 Usage:');
      console.log('   1. Download artifacts from GitHub Actions');
      console.log('   2. Extract the ZIP file to a folder');
      console.log('   3. Run: ts-node scripts/process-github-artifacts.ts <extracted-folder>');
      process.exit(1);
    }

    copyArtifactsToReports(artifactsDir);
  }

  // Find cucumber-report.json
  const cucumberJson = artifactsDir 
    ? findCucumberReport(artifactsDir)
    : findCucumberReport(process.cwd());

  if (!cucumberJson) {
    console.error('❌ Error: cucumber-report.json not found!');
    console.log('\n💡 Please either:');
    console.log('   1. Download artifacts from GitHub Actions and extract them');
    console.log('   2. Run: ts-node scripts/process-github-artifacts.ts <extracted-folder>');
    console.log('   3. Or manually copy cucumber-report.json to reports/json/ or reports/');
    process.exit(1);
  }

  // Copy to standard location if needed
  const targetJson = path.join(process.cwd(), 'reports', 'json', 'cucumber-report.json');
  if (cucumberJson !== targetJson) {
    const targetDir = path.dirname(targetJson);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.copyFileSync(cucumberJson, targetJson);
    console.log(`✅ Copied cucumber-report.json to standard location\n`);
  }

  // Generate report
  generateWorkItemReport('SF-467');
}

main();
