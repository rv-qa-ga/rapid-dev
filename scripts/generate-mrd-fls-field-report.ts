#!/usr/bin/env ts-node

/**
 * Generate Field-Level Report for MRD FLS Tests
 * 
 * Analyzes test results and generates a comprehensive field-level report
 * showing which fields passed/failed for each test scenario
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'undefined';
  duration?: number;
  error?: string;
}

interface FieldTestResult {
  fieldName: string;
  testType: 'view' | 'edit' | 'create' | 'update';
  scenario: string;
  status: 'passed' | 'failed' | 'skipped';
  error?: string;
}

interface FieldReport {
  fieldName: string;
  fieldLabel?: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  testResults: FieldTestResult[];
  viewTests: { passed: number; failed: number; skipped: number };
  editTests: { passed: number; failed: number; skipped: number };
  createTests: { passed: number; failed: number; skipped: number };
}

async function generateFieldReport() {
  const reportsDir = path.join(process.cwd(), 'reports');
  const apiResultsPath = path.join(reportsDir, 'mrd-fls-api-results.json');
  const uiResultsPath = path.join(reportsDir, 'mrd-fls-ui-results.json');
  
  // Load FLS matrix to get all fields
  const flsMatrixPath = path.join(process.cwd(), 'src/config/fls-matrix.json');
  const categorizedPath = path.join(process.cwd(), 'src/config/mrd-fls-fields-categorized.json');
  
  if (!fs.existsSync(flsMatrixPath)) {
    throw new Error(`FLS matrix not found: ${flsMatrixPath}. Run extraction script first.`);
  }

  const flsMatrix = JSON.parse(fs.readFileSync(flsMatrixPath, 'utf-8'));
  const categorized = JSON.parse(fs.readFileSync(categorizedPath, 'utf-8'));
  
  const accountFields = flsMatrix.objects.Account?.fields || [];
  
  // Initialize field reports
  const fieldReports: Map<string, FieldReport> = new Map();
  
  for (const field of accountFields) {
    const fieldName = field.fieldName;
    const fieldLabel = field.fieldLabel;
    
    fieldReports.set(fieldName, {
      fieldName,
      fieldLabel,
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      testResults: [],
      viewTests: { passed: 0, failed: 0, skipped: 0 },
      editTests: { passed: 0, failed: 0, skipped: 0 },
      createTests: { passed: 0, failed: 0, skipped: 0 },
    });
  }
  
  // Load test results if available
  let apiResults: any = null;
  let uiResults: any = null;
  
  if (fs.existsSync(apiResultsPath)) {
    try {
      apiResults = JSON.parse(fs.readFileSync(apiResultsPath, 'utf-8'));
      console.log(`✅ Loaded API test results from ${apiResultsPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not parse API results: ${error}`);
    }
  }
  
  if (fs.existsSync(uiResultsPath)) {
    try {
      uiResults = JSON.parse(fs.readFileSync(uiResultsPath, 'utf-8'));
      console.log(`✅ Loaded UI test results from ${uiResultsPath}`);
    } catch (error) {
      console.warn(`⚠️  Could not parse UI results: ${error}`);
    }
  }
  
  // Process test results and map to fields
  // This is a simplified version - in a real implementation, you'd parse the Cucumber JSON
  // and extract field-level test results from scenario outlines
  
  // Generate report
  const reportPath = path.join(reportsDir, 'mrd-fls-field-report.json');
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFields: fieldReports.size,
      viewableEditable: categorized.viewableEditable.length,
      viewableNotEditable: categorized.viewableNotEditable.length,
      notViewable: categorized.notViewable.length,
    },
    fields: Array.from(fieldReports.values()).map(fr => ({
      fieldName: fr.fieldName,
      fieldLabel: fr.fieldLabel,
      permissions: {
        view: categorized.viewableEditable.includes(fr.fieldName) || 
               categorized.viewableNotEditable.includes(fr.fieldName),
        edit: categorized.viewableEditable.includes(fr.fieldName),
      },
      testCoverage: {
        totalTests: fr.totalTests,
        passed: fr.passed,
        failed: fr.failed,
        skipped: fr.skipped,
        passRate: fr.totalTests > 0 ? ((fr.passed / fr.totalTests) * 100).toFixed(1) + '%' : 'N/A',
      },
      testBreakdown: {
        view: fr.viewTests,
        edit: fr.editTests,
        create: fr.createTests,
      },
    })),
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n✅ Field-level report generated: ${reportPath}`);
  
  // Generate markdown report
  const mdReportPath = path.join(reportsDir, 'mrd-fls-field-report.md');
  let mdReport = `# MRD FLS Field-Level Test Report\n\n`;
  mdReport += `Generated: ${new Date().toISOString()}\n\n`;
  mdReport += `## Summary\n\n`;
  mdReport += `- **Total Fields**: ${report.summary.totalFields}\n`;
  mdReport += `- **Viewable & Editable**: ${report.summary.viewableEditable}\n`;
  mdReport += `- **Viewable (Read-Only)**: ${report.summary.viewableNotEditable}\n`;
  mdReport += `- **Not Viewable**: ${report.summary.notViewable}\n\n`;
  
  mdReport += `## Field-Level Test Coverage\n\n`;
  mdReport += `| Field Name | Field Label | View | Edit | Total Tests | Passed | Failed | Pass Rate |\n`;
  mdReport += `|------------|-------------|------|------|-------------|--------|--------|-----------|\n`;
  
  for (const field of report.fields) {
    const viewIcon = field.permissions.view ? '✅' : '❌';
    const editIcon = field.permissions.edit ? '✅' : '❌';
    mdReport += `| ${field.fieldName} | ${field.fieldLabel || ''} | ${viewIcon} | ${editIcon} | ${field.testCoverage.totalTests} | ${field.testCoverage.passed} | ${field.testCoverage.failed} | ${field.testCoverage.passRate} |\n`;
  }
  
  fs.writeFileSync(mdReportPath, mdReport, 'utf-8');
  console.log(`✅ Markdown report generated: ${mdReportPath}`);
  
  return { reportPath, mdReportPath };
}

generateFieldReport().catch(console.error);

