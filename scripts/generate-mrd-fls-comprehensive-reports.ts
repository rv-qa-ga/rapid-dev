#!/usr/bin/env ts-node

/**
 * Generate Comprehensive Reports for MRD FLS Tests
 * 
 * Generates:
 * 1. Test execution report with recommended fixes
 * 2. Field-level report comparing expected vs actual FLS
 * 3. Excel file with all scenarios and field validations
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

// Cucumber JSON structure interfaces
interface CucumberStep {
  keyword: string;
  name: string;
  line: number;
  match?: { location: string };
  result: {
    status: 'passed' | 'failed' | 'skipped' | 'undefined';
    duration?: number;
    error_message?: string;
  };
  arguments?: any[];
}

interface CucumberElement {
  id: string;
  keyword: string;
  name: string;
  description?: string;
  line: number;
  type: 'scenario' | 'background';
  steps: CucumberStep[];
  tags?: Array<{ name: string }>;
  examples?: Array<{
    id: string;
    name: string;
    keyword: string;
    line: number;
    description?: string;
    tableBody: Array<{
      cells: Array<{ value: string }>;
    }>;
  }>;
}

interface CucumberFeature {
  uri: string;
  id: string;
  line: number;
  keyword: string;
  name: string;
  description?: string;
  elements: CucumberElement[];
  tags?: Array<{ name: string }>;
}

interface CucumberReport {
  [index: number]: CucumberFeature;
}

// Test result interfaces
interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  testType: 'api' | 'ui';
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  fieldName?: string;
  accountType?: string;
  error?: string;
  steps: Array<{
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    error?: string;
  }>;
}

interface FieldTestResult {
  fieldName: string;
  fieldLabel: string;
  expectedView: boolean;
  expectedEdit: boolean;
  actualViewAPI?: boolean;
  actualEditAPI?: boolean;
  actualViewUI?: boolean;
  actualEditUI?: boolean;
  apiTests: {
    describeView?: 'passed' | 'failed' | 'skipped';
    recordView?: 'passed' | 'failed' | 'skipped';
    create?: 'passed' | 'failed' | 'skipped';
    update?: 'passed' | 'failed' | 'skipped';
  };
  uiTests: {
    detailView?: 'passed' | 'failed' | 'skipped';
    createForm?: 'passed' | 'failed' | 'skipped';
    editForm?: 'passed' | 'failed' | 'skipped';
  };
  issues: string[];
  recommendations: string[];
}

interface TestReport {
  generatedAt: string;
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    skipped: number;
    passRate: string;
    apiScenarios: { total: number; passed: number; failed: number; skipped: number };
    uiScenarios: { total: number; passed: number; failed: number; skipped: number };
  };
  failedScenarios: Array<{
    scenarioName: string;
    testType: 'api' | 'ui';
    fieldName?: string;
    accountType?: string;
    error: string;
    recommendedFix: string;
  }>;
  scenarios: ScenarioResult[];
}

async function parseCucumberResults(filePath: string): Promise<CucumberReport | null> {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Test results file not found: ${filePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    // Cucumber JSON is an array, not an object
    const results = JSON.parse(content);
    return Array.isArray(results) ? results : null;
  } catch (error: any) {
    console.error(`❌ Error parsing test results: ${error.message}`);
    return null;
  }
}

function extractFieldNameFromScenario(scenarioName: string): string | undefined {
  // Extract field name from scenario outlines like "API - MRD can view field "Name""
  const match = scenarioName.match(/field\s+"([^"]+)"/i);
  return match ? match[1] : undefined;
}

function extractAccountTypeFromScenario(scenarioName: string): string | undefined {
  // Extract Account Type from scenarios
  const accountTypes = ['Member', 'Insurer', 'Agency', 'Legal Entity', 'Reinsurer', 'TPA'];
  for (const type of accountTypes) {
    if (scenarioName.includes(type)) {
      return type;
    }
  }
  return undefined;
}

function determineTestType(scenarioName: string, tags: Array<{ name: string }> = []): 'api' | 'ui' {
  if (scenarioName.toLowerCase().includes('api') || tags.some(t => t.name === '@api')) {
    return 'api';
  }
  if (scenarioName.toLowerCase().includes('ui') || tags.some(t => t.name === '@ui')) {
    return 'ui';
  }
  return 'api'; // default
}

function parseScenarios(features: CucumberReport | null): ScenarioResult[] {
  if (!features) return [];

  const scenarios: ScenarioResult[] = [];

  for (const feature of Object.values(features)) {
    for (const element of feature.elements || []) {
      if (element.type === 'scenario' || element.keyword === 'Scenario' || element.keyword === 'Scenario Outline') {
        const scenarioName = element.name;
        const fieldName = extractFieldNameFromScenario(scenarioName);
        const accountType = extractAccountTypeFromScenario(scenarioName);
        const testType = determineTestType(scenarioName, element.tags);

        // Determine overall status
        const stepStatuses = element.steps?.map((s: CucumberStep) => s.result?.status) || [];
        let status: 'passed' | 'failed' | 'skipped' = 'passed';
        if (stepStatuses.some((s: string | undefined) => s === 'failed' || s === 'undefined')) {
          status = 'failed';
        } else if (stepStatuses.every((s: string | undefined) => s === 'skipped')) {
          status = 'skipped';
        }

        // Calculate duration
        const duration = element.steps?.reduce((sum: number, step: CucumberStep) => sum + (step.result?.duration || 0), 0) || 0;

        // Get error message
        const failedStep = element.steps?.find((s: CucumberStep) => s.result?.status === 'failed' || s.result?.status === 'undefined');
        const error = failedStep?.result?.error_message || undefined;

        // Handle scenario outlines with examples
        if (element.examples && element.examples.length > 0) {
          for (const example of element.examples) {
            if (example.tableBody) {
              for (const row of example.tableBody) {
                const fieldValue = row.cells?.[0]?.value;
                const actualFieldName = fieldValue || fieldName;

                scenarios.push({
                  scenarioId: `${element.id}-${actualFieldName}`,
                  scenarioName: `${scenarioName} (${actualFieldName})`,
                  testType,
                  status,
                  duration,
                  fieldName: actualFieldName,
                  accountType,
                  error,
                  steps: element.steps?.map((s: CucumberStep) => ({
                    name: s.name,
                    status: s.result?.status || 'skipped',
                    error: s.result?.error_message,
                  })) || [],
                });
              }
            }
          }
        } else {
          scenarios.push({
            scenarioId: element.id,
            scenarioName,
            testType,
            status,
            duration,
            fieldName,
            accountType,
            error,
            steps: element.steps?.map((s: CucumberStep) => ({
              name: s.name,
              status: s.result?.status || 'skipped',
              error: s.result?.error_message,
            })) || [],
          });
        }
      }
    }
  }

  return scenarios;
}

function generateRecommendedFix(scenario: ScenarioResult, fieldName?: string, expectedView?: boolean, expectedEdit?: boolean): string {
  if (scenario.status === 'passed') {
    return 'No action needed - test passed';
  }

  const error = scenario.error?.toLowerCase() || '';
  const testType = scenario.testType;

  if (error.includes('field') && error.includes('not found')) {
    return `Field "${fieldName}" is not accessible. Verify FLS settings: Field should ${expectedView ? '' : 'NOT '}be viewable and ${expectedEdit ? '' : 'NOT '}be editable for MRD role.`;
  }

  if (error.includes('permission') || error.includes('access denied')) {
    return `Permission issue: Check Profile/Permission Set FLS settings for field "${fieldName}". Ensure MRD role has ${expectedView ? 'Read' : 'No Read'} and ${expectedEdit ? 'Edit' : 'No Edit'} access.`;
  }

  if (error.includes('describe') && testType === 'api') {
    return `Describe API issue: Field "${fieldName}" should ${expectedView ? 'appear' : 'NOT appear'} in describe response for MRD role. Check Field-Level Security settings.`;
  }

  if (error.includes('visible') && testType === 'ui') {
    return `UI visibility issue: Field "${fieldName}" should ${expectedView ? 'be visible' : 'NOT be visible'} on Account detail/edit forms for MRD role. Check Page Layout assignments and FLS.`;
  }

  if (error.includes('edit') || error.includes('update')) {
    return `Edit permission issue: Field "${fieldName}" should ${expectedEdit ? 'be editable' : 'NOT be editable'} for MRD role. Verify FLS Edit permission.`;
  }

  return `Review error message and verify FLS settings match expected permissions: View=${expectedView}, Edit=${expectedEdit}`;
}

async function generateTestReport(apiScenarios: ScenarioResult[], uiScenarios: ScenarioResult[]): Promise<TestReport> {
  const allScenarios = [...apiScenarios, ...uiScenarios];
  const passed = allScenarios.filter(s => s.status === 'passed').length;
  const failed = allScenarios.filter(s => s.status === 'failed').length;
  const skipped = allScenarios.filter(s => s.status === 'skipped').length;

  // Load FLS matrix for recommendations
  const flsMatrixPath = path.join(process.cwd(), 'src/config/fls-matrix.json');
  const categorizedPath = path.join(process.cwd(), 'src/config/mrd-fls-fields-categorized.json');
  
  let fieldPermissions: Map<string, { view: boolean; edit: boolean }> = new Map();
  
  if (fs.existsSync(flsMatrixPath) && fs.existsSync(categorizedPath)) {
    const categorized = JSON.parse(fs.readFileSync(categorizedPath, 'utf-8'));
    
    // Build permission map
    for (const field of categorized.viewableEditable || []) {
      fieldPermissions.set(field, { view: true, edit: true });
    }
    for (const field of categorized.viewableNotEditable || []) {
      fieldPermissions.set(field, { view: true, edit: false });
    }
    for (const field of categorized.notViewable || []) {
      fieldPermissions.set(field, { view: false, edit: false });
    }
  }

  const failedScenarios = allScenarios
    .filter(s => s.status === 'failed')
    .map(s => {
      const permissions = s.fieldName ? fieldPermissions.get(s.fieldName) : undefined;
      return {
        scenarioName: s.scenarioName,
        testType: s.testType,
        fieldName: s.fieldName,
        accountType: s.accountType,
        error: s.error || 'Unknown error',
        recommendedFix: generateRecommendedFix(s, s.fieldName, permissions?.view, permissions?.edit),
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalScenarios: allScenarios.length,
      passed,
      failed,
      skipped,
      passRate: allScenarios.length > 0 ? `${((passed / allScenarios.length) * 100).toFixed(1)}%` : '0%',
      apiScenarios: {
        total: apiScenarios.length,
        passed: apiScenarios.filter(s => s.status === 'passed').length,
        failed: apiScenarios.filter(s => s.status === 'failed').length,
        skipped: apiScenarios.filter(s => s.status === 'skipped').length,
      },
      uiScenarios: {
        total: uiScenarios.length,
        passed: uiScenarios.filter(s => s.status === 'passed').length,
        failed: uiScenarios.filter(s => s.status === 'failed').length,
        skipped: uiScenarios.filter(s => s.status === 'skipped').length,
      },
    },
    failedScenarios,
    scenarios: allScenarios,
  };
}

async function generateFieldLevelReport(
  apiScenarios: ScenarioResult[],
  uiScenarios: ScenarioResult[]
): Promise<Map<string, FieldTestResult>> {
  const flsMatrixPath = path.join(process.cwd(), 'src/config/fls-matrix.json');
  const categorizedPath = path.join(process.cwd(), 'src/config/mrd-fls-fields-categorized.json');

  if (!fs.existsSync(flsMatrixPath) || !fs.existsSync(categorizedPath)) {
    throw new Error('FLS matrix files not found. Run extraction script first.');
  }

  const flsMatrix = JSON.parse(fs.readFileSync(flsMatrixPath, 'utf-8'));
  const categorized = JSON.parse(fs.readFileSync(categorizedPath, 'utf-8'));

  const accountFields = flsMatrix.objects.Account?.fields || [];
  const fieldReports = new Map<string, FieldTestResult>();

  // Initialize field reports
  for (const field of accountFields) {
    const fieldName = field.fieldName;
    const isViewableEditable = categorized.viewableEditable.includes(fieldName);
    const isViewableNotEditable = categorized.viewableNotEditable.includes(fieldName);
    const isNotViewable = categorized.notViewable.includes(fieldName);

    fieldReports.set(fieldName, {
      fieldName,
      fieldLabel: field.fieldLabel || fieldName,
      expectedView: isViewableEditable || isViewableNotEditable,
      expectedEdit: isViewableEditable,
      apiTests: {},
      uiTests: {},
      issues: [],
      recommendations: [],
    });
  }

  // Process API scenarios
  for (const scenario of apiScenarios) {
    if (!scenario.fieldName) continue;

    const fieldReport = fieldReports.get(scenario.fieldName);
    if (!fieldReport) continue;

    // Determine test type from scenario name
    const scenarioName = scenario.scenarioName.toLowerCase();
    if (scenarioName.includes('describe')) {
      if (scenarioName.includes('cannot view') || scenarioName.includes('not include')) {
        fieldReport.apiTests.describeView = scenario.status === 'failed' ? 'passed' : 'failed';
      } else {
        fieldReport.apiTests.describeView = scenario.status;
      }
    } else if (scenarioName.includes('create')) {
      fieldReport.apiTests.create = scenario.status;
    } else if (scenarioName.includes('update') || scenarioName.includes('edit')) {
      fieldReport.apiTests.update = scenario.status;
    } else if (scenarioName.includes('view') || scenarioName.includes('access')) {
      fieldReport.apiTests.recordView = scenario.status;
    }
  }

  // Process UI scenarios
  for (const scenario of uiScenarios) {
    if (!scenario.fieldName) continue;

    const fieldReport = fieldReports.get(scenario.fieldName);
    if (!fieldReport) continue;

    const scenarioName = scenario.scenarioName.toLowerCase();
    if (scenarioName.includes('detail page') || scenarioName.includes('detail view')) {
      fieldReport.uiTests.detailView = scenario.status;
    } else if (scenarioName.includes('create form') || scenarioName.includes('create page')) {
      fieldReport.uiTests.createForm = scenario.status;
    } else if (scenarioName.includes('edit form') || scenarioName.includes('edit page')) {
      fieldReport.uiTests.editForm = scenario.status;
    }
  }

  // Analyze issues and generate recommendations
  for (const [fieldName, fieldReport] of fieldReports.entries()) {
    // Check API view tests
    if (fieldReport.expectedView) {
      if (fieldReport.apiTests.describeView === 'failed') {
        fieldReport.issues.push(`API: Field should be viewable but describe API test failed`);
        fieldReport.recommendations.push(`Verify FLS Read permission is enabled for MRD role on field "${fieldName}"`);
      }
      if (fieldReport.apiTests.recordView === 'failed') {
        fieldReport.issues.push(`API: Field should be viewable but record access test failed`);
        fieldReport.recommendations.push(`Check FLS Read permission and ensure MRD role can query this field`);
      }
    } else {
      // Check if any negative test passed (field should not be viewable)
      const negativeTests = apiScenarios.filter(s => 
        s.fieldName === fieldName && 
        (s.scenarioName.toLowerCase().includes('cannot view') || s.scenarioName.toLowerCase().includes('not include'))
      );
      if (negativeTests.length > 0 && negativeTests.some(t => t.status === 'failed')) {
        fieldReport.issues.push(`API: Field should NOT be viewable but negative test failed (field is accessible)`);
        fieldReport.recommendations.push(`Remove FLS Read permission for MRD role on field "${fieldName}"`);
      }
    }

    // Check API edit tests
    if (fieldReport.expectedEdit) {
      if (fieldReport.apiTests.create === 'failed') {
        fieldReport.issues.push(`API: Field should be editable but create test failed`);
        fieldReport.recommendations.push(`Verify FLS Edit permission is enabled for MRD role on field "${fieldName}"`);
      }
      if (fieldReport.apiTests.update === 'failed') {
        fieldReport.issues.push(`API: Field should be editable but update test failed`);
        fieldReport.recommendations.push(`Check FLS Edit permission for MRD role on field "${fieldName}"`);
      }
    } else {
      if (fieldReport.apiTests.create === 'passed' || fieldReport.apiTests.update === 'passed') {
        fieldReport.issues.push(`API: Field should NOT be editable but edit test passed`);
        fieldReport.recommendations.push(`Remove FLS Edit permission for MRD role on field "${fieldName}"`);
      }
    }

    // Check UI view tests
    if (fieldReport.expectedView) {
      if (fieldReport.uiTests.detailView === 'failed') {
        fieldReport.issues.push(`UI: Field should be visible on detail page but test failed`);
        fieldReport.recommendations.push(`Verify field is included in Account Page Layout assigned to MRD role and FLS Read is enabled`);
      }
    } else {
      if (fieldReport.uiTests.detailView === 'passed') {
        fieldReport.issues.push(`UI: Field should NOT be visible but detail page test passed`);
        fieldReport.recommendations.push(`Remove field from Account Page Layout or disable FLS Read for MRD role`);
      }
    }

    // Check UI edit tests
    if (fieldReport.expectedEdit) {
      if (fieldReport.uiTests.createForm === 'failed') {
        fieldReport.issues.push(`UI: Field should be editable on create form but test failed`);
        fieldReport.recommendations.push(`Verify field is included in Account Create/Edit Page Layout and FLS Edit is enabled`);
      }
      if (fieldReport.uiTests.editForm === 'failed') {
        fieldReport.issues.push(`UI: Field should be editable on edit form but test failed`);
        fieldReport.recommendations.push(`Check Account Edit Page Layout and FLS Edit permission for MRD role`);
      }
    } else {
      if (fieldReport.uiTests.createForm === 'passed' || fieldReport.uiTests.editForm === 'passed') {
        fieldReport.issues.push(`UI: Field should NOT be editable but edit form test passed`);
        fieldReport.recommendations.push(`Make field read-only on Page Layout or disable FLS Edit for MRD role`);
      }
    }
  }

  return fieldReports;
}

async function generateMarkdownReports(
  testReport: TestReport,
  fieldReports: Map<string, FieldTestResult>
): Promise<{ testReportPath: string; fieldReportPath: string }> {
  const reportsDir = path.join(process.cwd(), 'reports');

  // Generate Test Execution Report
  let testReportMd = `# MRD FLS Test Execution Report\n\n`;
  testReportMd += `**Generated:** ${new Date(testReport.generatedAt).toLocaleString()}\n\n`;
  testReportMd += `## Executive Summary\n\n`;
  testReportMd += `- **Total Scenarios**: ${testReport.summary.totalScenarios}\n`;
  testReportMd += `- **Passed**: ${testReport.summary.passed} ✅\n`;
  testReportMd += `- **Failed**: ${testReport.summary.failed} ❌\n`;
  testReportMd += `- **Skipped**: ${testReport.summary.skipped} ⏭️\n`;
  testReportMd += `- **Pass Rate**: ${testReport.summary.passRate}\n\n`;

  testReportMd += `### API Tests\n`;
  testReportMd += `- Total: ${testReport.summary.apiScenarios.total}\n`;
  testReportMd += `- Passed: ${testReport.summary.apiScenarios.passed}\n`;
  testReportMd += `- Failed: ${testReport.summary.apiScenarios.failed}\n`;
  testReportMd += `- Skipped: ${testReport.summary.apiScenarios.skipped}\n\n`;

  testReportMd += `### UI Tests\n`;
  testReportMd += `- Total: ${testReport.summary.uiScenarios.total}\n`;
  testReportMd += `- Passed: ${testReport.summary.uiScenarios.passed}\n`;
  testReportMd += `- Failed: ${testReport.summary.uiScenarios.failed}\n`;
  testReportMd += `- Skipped: ${testReport.summary.uiScenarios.skipped}\n\n`;

  if (testReport.failedScenarios.length > 0) {
    testReportMd += `## Failed Test Cases with Recommended Fixes\n\n`;
    testReportMd += `| # | Scenario | Type | Field | Account Type | Error | Recommended Fix |\n`;
    testReportMd += `|---|----------|------|-------|--------------|-------|------------------|\n`;

    testReport.failedScenarios.forEach((failed, index) => {
      testReportMd += `| ${index + 1} | ${failed.scenarioName} | ${failed.testType.toUpperCase()} | ${failed.fieldName || 'N/A'} | ${failed.accountType || 'N/A'} | ${failed.error.substring(0, 100)}... | ${failed.recommendedFix} |\n`;
    });
  }

  const testReportPath = path.join(reportsDir, 'mrd-fls-test-execution-report.md');
  fs.writeFileSync(testReportPath, testReportMd, 'utf-8');

  // Generate Field-Level Report
  let fieldReportMd = `# MRD FLS Field-Level Report\n\n`;
  fieldReportMd += `**Generated:** ${new Date().toISOString()}\n\n`;
  fieldReportMd += `**Purpose:** This report compares expected FLS permissions (from Excel mapping) with actual test results.\n\n`;

  fieldReportMd += `## Fields Working as Expected ✅\n\n`;
  const workingFields = Array.from(fieldReports.values()).filter(fr => fr.issues.length === 0);
  if (workingFields.length > 0) {
    fieldReportMd += `| Field Name | Field Label | Expected View | Expected Edit | Status |\n`;
    fieldReportMd += `|------------|-------------|---------------|---------------|--------|\n`;
    for (const field of workingFields) {
      fieldReportMd += `| ${field.fieldName} | ${field.fieldLabel} | ${field.expectedView ? 'Yes' : 'No'} | ${field.expectedEdit ? 'Yes' : 'No'} | ✅ Working |\n`;
    }
  } else {
    fieldReportMd += `No fields are working as expected.\n\n`;
  }

  fieldReportMd += `\n## Fields NOT Working as Expected ❌\n\n`;
  const failingFields = Array.from(fieldReports.values()).filter(fr => fr.issues.length > 0);
  if (failingFields.length > 0) {
    fieldReportMd += `| Field Name | Field Label | Expected View | Expected Edit | Issues | Recommended Fix |\n`;
    fieldReportMd += `|------------|-------------|---------------|---------------|--------|-----------------|\n`;
    for (const field of failingFields) {
      const issuesText = field.issues.join('; ');
      const recommendationsText = field.recommendations.join('; ');
      fieldReportMd += `| ${field.fieldName} | ${field.fieldLabel} | ${field.expectedView ? 'Yes' : 'No'} | ${field.expectedEdit ? 'Yes' : 'No'} | ${issuesText} | ${recommendationsText} |\n`;
    }
  } else {
    fieldReportMd += `All fields are working as expected! 🎉\n\n`;
  }

  const fieldReportPath = path.join(reportsDir, 'mrd-fls-field-level-report.md');
  fs.writeFileSync(fieldReportPath, fieldReportMd, 'utf-8');

  return { testReportPath, fieldReportPath };
}

async function generateExcelReport(
  testReport: TestReport,
  fieldReports: Map<string, FieldTestResult>
): Promise<string> {
  const reportsDir = path.join(process.cwd(), 'reports');
  const excelPath = path.join(reportsDir, `mrd-fls-test-scenarios-${new Date().toISOString().split('T')[0]}.xlsx`);

  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Test Scenarios Summary
  const scenariosSheet = workbook.addWorksheet('Test Scenarios');
  scenariosSheet.columns = [
    { header: 'Scenario ID', key: 'scenarioId', width: 30 },
    { header: 'Scenario Name', key: 'scenarioName', width: 50 },
    { header: 'Test Type', key: 'testType', width: 10 },
    { header: 'Field Name', key: 'fieldName', width: 25 },
    { header: 'Account Type', key: 'accountType', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Duration (ms)', key: 'duration', width: 15 },
    { header: 'Error Message', key: 'error', width: 80 },
  ];

  for (const scenario of testReport.scenarios) {
    scenariosSheet.addRow({
      scenarioId: scenario.scenarioId,
      scenarioName: scenario.scenarioName,
      testType: scenario.testType.toUpperCase(),
      fieldName: scenario.fieldName || 'N/A',
      accountType: scenario.accountType || 'N/A',
      status: scenario.status.toUpperCase(),
      duration: scenario.duration,
      error: scenario.error || '',
    });
  }

  // Apply conditional formatting for status
  scenariosSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    const statusCell = row.getCell('status');
    if (statusCell.value === 'PASSED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
    } else if (statusCell.value === 'FAILED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } };
    } else if (statusCell.value === 'SKIPPED') {
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4B5' } };
    }
  });

  // Sheet 2: Field-Level Validation
  const fieldsSheet = workbook.addWorksheet('Field Validation');
  fieldsSheet.columns = [
    { header: 'Field Name', key: 'fieldName', width: 30 },
    { header: 'Field Label', key: 'fieldLabel', width: 30 },
    { header: 'Expected View', key: 'expectedView', width: 15 },
    { header: 'Expected Edit', key: 'expectedEdit', width: 15 },
    { header: 'API Describe View', key: 'apiDescribeView', width: 15 },
    { header: 'API Record View', key: 'apiRecordView', width: 15 },
    { header: 'API Create', key: 'apiCreate', width: 15 },
    { header: 'API Update', key: 'apiUpdate', width: 15 },
    { header: 'UI Detail View', key: 'uiDetailView', width: 15 },
    { header: 'UI Create Form', key: 'uiCreateForm', width: 15 },
    { header: 'UI Edit Form', key: 'uiEditForm', width: 15 },
    { header: 'Issues', key: 'issues', width: 80 },
    { header: 'Recommendations', key: 'recommendations', width: 80 },
  ];

  for (const fieldReport of fieldReports.values()) {
    fieldsSheet.addRow({
      fieldName: fieldReport.fieldName,
      fieldLabel: fieldReport.fieldLabel,
      expectedView: fieldReport.expectedView ? 'Yes' : 'No',
      expectedEdit: fieldReport.expectedEdit ? 'Yes' : 'No',
      apiDescribeView: fieldReport.apiTests.describeView?.toUpperCase() || 'N/A',
      apiRecordView: fieldReport.apiTests.recordView?.toUpperCase() || 'N/A',
      apiCreate: fieldReport.apiTests.create?.toUpperCase() || 'N/A',
      apiUpdate: fieldReport.apiTests.update?.toUpperCase() || 'N/A',
      uiDetailView: fieldReport.uiTests.detailView?.toUpperCase() || 'N/A',
      uiCreateForm: fieldReport.uiTests.createForm?.toUpperCase() || 'N/A',
      uiEditForm: fieldReport.uiTests.editForm?.toUpperCase() || 'N/A',
      issues: fieldReport.issues.join('; '),
      recommendations: fieldReport.recommendations.join('; '),
    });
  }

  // Apply conditional formatting
  fieldsSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header
    
    // Color code test result columns
    const testColumns = ['apiDescribeView', 'apiRecordView', 'apiCreate', 'apiUpdate', 'uiDetailView', 'uiCreateForm', 'uiEditForm'];
    for (const colKey of testColumns) {
      const cell = row.getCell(colKey);
      if (cell.value === 'PASSED') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
      } else if (cell.value === 'FAILED') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFB6C1' } };
      }
    }

    // Highlight fields with issues
    const issuesCell = row.getCell('issues');
    if (issuesCell.value && String(issuesCell.value).trim() !== '') {
      row.font = { bold: true };
    }
  });

  // Sheet 3: Summary Statistics
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 40 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  summarySheet.addRow({ metric: 'Total Scenarios', value: testReport.summary.totalScenarios });
  summarySheet.addRow({ metric: 'Passed', value: testReport.summary.passed });
  summarySheet.addRow({ metric: 'Failed', value: testReport.summary.failed });
  summarySheet.addRow({ metric: 'Skipped', value: testReport.summary.skipped });
  summarySheet.addRow({ metric: 'Pass Rate', value: testReport.summary.passRate });
  summarySheet.addRow({ metric: '', value: '' });
  summarySheet.addRow({ metric: 'API Tests - Total', value: testReport.summary.apiScenarios.total });
  summarySheet.addRow({ metric: 'API Tests - Passed', value: testReport.summary.apiScenarios.passed });
  summarySheet.addRow({ metric: 'API Tests - Failed', value: testReport.summary.apiScenarios.failed });
  summarySheet.addRow({ metric: '', value: '' });
  summarySheet.addRow({ metric: 'UI Tests - Total', value: testReport.summary.uiScenarios.total });
  summarySheet.addRow({ metric: 'UI Tests - Passed', value: testReport.summary.uiScenarios.passed });
  summarySheet.addRow({ metric: 'UI Tests - Failed', value: testReport.summary.uiScenarios.failed });
  summarySheet.addRow({ metric: '', value: '' });
  summarySheet.addRow({ metric: 'Total Fields Tested', value: fieldReports.size });
  summarySheet.addRow({ metric: 'Fields Working as Expected', value: Array.from(fieldReports.values()).filter(fr => fr.issues.length === 0).length });
  summarySheet.addRow({ metric: 'Fields with Issues', value: Array.from(fieldReports.values()).filter(fr => fr.issues.length > 0).length });

  await workbook.xlsx.writeFile(excelPath);
  return excelPath;
}

async function main() {
  console.log('📊 Generating Comprehensive MRD FLS Test Reports...\n');

  const reportsDir = path.join(process.cwd(), 'reports');
  const apiResultsPath = path.join(reportsDir, 'mrd-fls-api-results.json');
  const uiResultsPath = path.join(reportsDir, 'mrd-fls-ui-results.json');
  const defaultCucumberJson = path.join(reportsDir, 'json', 'cucumber-report.json');

  // Try to find test results - check multiple locations
  let apiResults: CucumberReport | null = null;
  let uiResults: CucumberReport | null = null;

  // Parse test results
  console.log('📖 Parsing test results...');
  
  // First try specific MRD FLS result files
  apiResults = await parseCucumberResults(apiResultsPath);
  uiResults = await parseCucumberResults(uiResultsPath);
  
  // If not found, try default Cucumber JSON (may contain mixed results)
  if (!apiResults && !uiResults && fs.existsSync(defaultCucumberJson)) {
    console.log('⚠️  MRD-specific result files not found. Checking default Cucumber JSON...');
    const defaultResults = await parseCucumberResults(defaultCucumberJson);
    if (defaultResults) {
      // Filter for MRD FLS scenarios
      const mrdFeatures = Object.values(defaultResults).filter((feature: CucumberFeature) => 
        feature.name?.toLowerCase().includes('mrd') && 
        feature.name?.toLowerCase().includes('fls')
      );
      if (mrdFeatures.length > 0) {
        // Split into API and UI based on tags/scenario names
        const apiFeatures = mrdFeatures.filter((f: CucumberFeature) => 
          f.tags?.some(t => t.name === '@api') || f.name?.toLowerCase().includes('api')
        );
        const uiFeatures = mrdFeatures.filter((f: CucumberFeature) => 
          f.tags?.some(t => t.name === '@ui') || f.name?.toLowerCase().includes('ui')
        );
        
        if (apiFeatures.length > 0) {
          apiResults = apiFeatures as any;
          console.log(`✅ Found ${apiFeatures.length} API feature(s) in default Cucumber JSON`);
        }
        if (uiFeatures.length > 0) {
          uiResults = uiFeatures as any;
          console.log(`✅ Found ${uiFeatures.length} UI feature(s) in default Cucumber JSON`);
        }
      }
    }
  }

  const apiScenarios = parseScenarios(apiResults);
  const uiScenarios = parseScenarios(uiResults);

  console.log(`✅ Parsed ${apiScenarios.length} API scenarios and ${uiScenarios.length} UI scenarios`);

  // Generate test report
  console.log('\n📝 Generating test execution report...');
  const testReport = await generateTestReport(apiScenarios, uiScenarios);
  const testReportJsonPath = path.join(reportsDir, 'mrd-fls-test-report.json');
  fs.writeFileSync(testReportJsonPath, JSON.stringify(testReport, null, 2), 'utf-8');
  console.log(`✅ Test report JSON saved: ${testReportJsonPath}`);

  // Generate field-level report
  console.log('\n🔍 Generating field-level report...');
  const fieldReports = await generateFieldLevelReport(apiScenarios, uiScenarios);
  const fieldReportJsonPath = path.join(reportsDir, 'mrd-fls-field-report-detailed.json');
  fs.writeFileSync(fieldReportJsonPath, JSON.stringify(Array.from(fieldReports.values()), null, 2), 'utf-8');
  console.log(`✅ Field report JSON saved: ${fieldReportJsonPath}`);

  // Generate markdown reports
  console.log('\n📄 Generating markdown reports...');
  const { testReportPath, fieldReportPath } = await generateMarkdownReports(testReport, fieldReports);
  console.log(`✅ Test execution report: ${testReportPath}`);
  console.log(`✅ Field-level report: ${fieldReportPath}`);

  // Generate Excel report
  console.log('\n📊 Generating Excel report...');
  const excelPath = await generateExcelReport(testReport, fieldReports);
  console.log(`✅ Excel report saved: ${excelPath}`);

  console.log('\n✨ All reports generated successfully!');
  console.log('\n📋 Generated Files:');
  console.log(`   1. Test Execution Report (Markdown): ${testReportPath}`);
  console.log(`   2. Field-Level Report (Markdown): ${fieldReportPath}`);
  console.log(`   3. Excel Report: ${excelPath}`);
  console.log(`   4. Test Report (JSON): ${testReportJsonPath}`);
  console.log(`   5. Field Report (JSON): ${fieldReportJsonPath}`);
}

main().catch(console.error);

