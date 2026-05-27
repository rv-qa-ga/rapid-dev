#!/usr/bin/env ts-node

/**
 * Generate Simple Field-Level Excel Report for MRD FLS Tests
 * 
 * Creates a simple Excel sheet showing:
 * - Field Name
 * - Test Type (API/UI)
 * - Status (Pass/Fail)
 * - Failure Reason
 * - Expected View/Edit permissions
 */

import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

interface FieldResult {
  fieldName: string;
  testType: 'API' | 'UI';
  status: 'Pass' | 'Fail';
  failureReason?: string;
  expectedView: boolean;
  expectedEdit: boolean;
  testScenario: string;
  testCaseId: string;
}

async function generateSimpleExcelReport() {
  console.log('📊 Generating Simple Field-Level Excel Report...\n');

  const reportsDir = path.join(process.cwd(), 'reports');
  const apiResultsPath = path.join(reportsDir, 'mrd-fls-api-results.json');
  const uiResultsPath = path.join(reportsDir, 'mrd-fls-ui-results.json');
  const fieldReportPath = path.join(reportsDir, 'mrd-fls-field-report-detailed.json');
  const flsMatrixPath = path.join(process.cwd(), 'src/config/fls-matrix.json');
  const categorizedPath = path.join(process.cwd(), 'src/config/mrd-fls-fields-categorized.json');

  // Load FLS matrix and categorized fields
  if (!fs.existsSync(flsMatrixPath) || !fs.existsSync(categorizedPath)) {
    throw new Error('FLS matrix files not found. Run extraction script first.');
  }

  const flsMatrix = JSON.parse(fs.readFileSync(flsMatrixPath, 'utf-8'));
  const categorized = JSON.parse(fs.readFileSync(categorizedPath, 'utf-8'));
  const accountFields = flsMatrix.objects.Account?.fields || [];

  // Create field map for quick lookup
  const fieldMap = new Map<string, { label: string; expectedView: boolean; expectedEdit: boolean }>();
  for (const field of accountFields) {
    const fieldName = field.fieldName;
    const isViewableEditable = categorized.viewableEditable.includes(fieldName);
    const isViewableNotEditable = categorized.viewableNotEditable.includes(fieldName);
    
    fieldMap.set(fieldName, {
      label: field.fieldLabel || fieldName,
      expectedView: isViewableEditable || isViewableNotEditable,
      expectedEdit: isViewableEditable,
    });
  }

  // Load test results
  let apiResults: any = null;
  let uiResults: any = null;

  if (fs.existsSync(apiResultsPath)) {
    try {
      const content = fs.readFileSync(apiResultsPath, 'utf-8');
      if (content.trim()) {
        apiResults = JSON.parse(content);
        console.log('✅ Loaded API test results');
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not parse API results: ${error.message}`);
    }
  }

  if (fs.existsSync(uiResultsPath)) {
    try {
      const content = fs.readFileSync(uiResultsPath, 'utf-8');
      if (content.trim()) {
        uiResults = JSON.parse(content);
        console.log('✅ Loaded UI test results');
      }
    } catch (error: any) {
      console.warn(`⚠️  Could not parse UI results: ${error.message}`);
    }
  }

  // If no specific results, try default location
  if (!apiResults && !uiResults) {
    const defaultResultsPath = path.join(reportsDir, 'json/cucumber-report.json');
    if (fs.existsSync(defaultResultsPath)) {
      try {
        const content = fs.readFileSync(defaultResultsPath, 'utf-8');
        if (content.trim()) {
          apiResults = JSON.parse(content);
          console.log('✅ Loaded test results from default location');
        }
      } catch (error: any) {
        console.warn(`⚠️  Could not parse default results: ${error.message}`);
      }
    }
  }

  // Load field-level report if available
  let fieldReport: any = null;
  if (fs.existsSync(fieldReportPath)) {
    try {
      fieldReport = JSON.parse(fs.readFileSync(fieldReportPath, 'utf-8'));
      console.log('✅ Loaded field-level report');
    } catch (error: any) {
      console.warn(`⚠️  Could not parse field report: ${error.message}`);
    }
  }

  // Parse scenarios and extract field-level results
  const fieldResults: FieldResult[] = [];
  let testCaseCounter = { API: 0, UI: 0 };

  // Helper function to generate test case ID
  function generateTestCaseId(testType: 'API' | 'UI'): string {
    testCaseCounter[testType]++;
    const counter = testCaseCounter[testType].toString().padStart(3, '0');
    return `MRD-FLS-${testType}-${counter}`;
  }

  // Helper function to extract scenario name with context
  function extractScenarioName(element: any, feature: any): string {
    let scenarioName = element.name || '';
    
    // Try to get scenario ID from tags
    const scenarioIdTag = element.tags?.find((t: any) => t.name?.startsWith('@MRD-FLS-'));
    if (scenarioIdTag) {
      scenarioName = `${scenarioName} [${scenarioIdTag.name}]`;
    }
    
    // Add account type if present in scenario name
    const accountTypeMatch = scenarioName.match(/(Member|Insurer|Agency|Non - Member MGA|Non-Member MGA)/i);
    if (accountTypeMatch && !scenarioName.includes(accountTypeMatch[0])) {
      scenarioName = `${scenarioName} (${accountTypeMatch[0]})`;
    }
    
    return scenarioName || 'Unknown Scenario';
  }

  // Process API results
  if (apiResults) {
    const features = Array.isArray(apiResults) ? apiResults : Object.values(apiResults);
    
    for (const feature of features) {
      if (!feature.elements) continue;
      
      const isAPITest = feature.uri?.includes('/api/') || feature.tags?.some((t: any) => t.name === '@api');
      
      for (const element of feature.elements) {
        if (element.type !== 'scenario') continue;
        
        const scenarioName = extractScenarioName(element, feature);
        const status = element.steps?.every((s: any) => s.result?.status === 'passed') ? 'Pass' : 'Fail';
        
        // Extract field name from scenario name
        const fieldMatch = scenarioName.match(/"([^"]+)"/);
        const fieldName = fieldMatch ? fieldMatch[1] : null;
        
        if (fieldName && fieldMap.has(fieldName)) {
          const fieldInfo = fieldMap.get(fieldName)!;
          const failedStep = element.steps?.find((s: any) => s.result?.status === 'failed');
          const errorMessage = failedStep?.result?.error_message || failedStep?.result?.message || '';
          
          // Extract failure reason
          let failureReason = '';
          if (status === 'Fail' && errorMessage) {
            // Simplify error message
            if (errorMessage.includes('not found in describe')) {
              failureReason = 'Field not accessible via describe API';
            } else if (errorMessage.includes('should NOT be accessible')) {
              failureReason = 'Field should be hidden but is accessible';
            } else if (errorMessage.includes('should be viewable')) {
              failureReason = 'Field should be viewable but is not';
            } else if (errorMessage.includes('should be editable')) {
              failureReason = 'Field should be editable but is not';
            } else if (errorMessage.includes('FIELD_CUSTOM_VALIDATION')) {
              failureReason = 'Validation rule error';
            } else {
              failureReason = errorMessage.substring(0, 200); // Truncate long messages
            }
          }

          fieldResults.push({
            fieldName,
            testType: 'API',
            status,
            failureReason: status === 'Fail' ? failureReason : undefined,
            expectedView: fieldInfo.expectedView,
            expectedEdit: fieldInfo.expectedEdit,
            testScenario: scenarioName,
            testCaseId: generateTestCaseId('API'),
          });
        }
      }
    }
  }

  // Process UI results
  if (uiResults) {
    const features = Array.isArray(uiResults) ? uiResults : Object.values(uiResults);
    
    for (const feature of features) {
      if (!feature.elements) continue;
      
      for (const element of feature.elements) {
        if (element.type !== 'scenario') continue;
        
        const scenarioName = extractScenarioName(element, feature);
        const status = element.steps?.every((s: any) => s.result?.status === 'passed') ? 'Pass' : 'Fail';
        
        // Extract field name from scenario name
        const fieldMatch = scenarioName.match(/"([^"]+)"/);
        const fieldName = fieldMatch ? fieldMatch[1] : null;
        
        if (fieldName && fieldMap.has(fieldName)) {
          const fieldInfo = fieldMap.get(fieldName)!;
          const failedStep = element.steps?.find((s: any) => s.result?.status === 'failed');
          const errorMessage = failedStep?.result?.error_message || failedStep?.result?.message || '';
          
          let failureReason = '';
          if (status === 'Fail' && errorMessage) {
            if (errorMessage.includes('should be visible')) {
              failureReason = 'Field should be visible but is not';
            } else if (errorMessage.includes('should not be visible')) {
              failureReason = 'Field should be hidden but is visible';
            } else if (errorMessage.includes('should be editable')) {
              failureReason = 'Field should be editable but is not';
            } else {
              failureReason = errorMessage.substring(0, 200);
            }
          }

          fieldResults.push({
            fieldName,
            testType: 'UI',
            status,
            failureReason: status === 'Fail' ? failureReason : undefined,
            expectedView: fieldInfo.expectedView,
            expectedEdit: fieldInfo.expectedEdit,
            testScenario: scenarioName,
            testCaseId: generateTestCaseId('UI'),
          });
        }
      }
    }
  }

  // If we have field report, use it to supplement
  if (fieldReport && fieldReport.fields) {
    for (const field of fieldReport.fields) {
      if (!fieldMap.has(field.fieldName)) continue;
      
      const fieldInfo = fieldMap.get(field.fieldName)!;
      const hasIssues = field.issues && field.issues.length > 0;
      
      // Add API results from field report
      if (field.apiTests) {
        const apiStatus = Object.values(field.apiTests).some((s: any) => s === 'failed') ? 'Fail' : 
                         Object.values(field.apiTests).some((s: any) => s === 'passed') ? 'Pass' : undefined;
        
        if (apiStatus) {
          const existing = fieldResults.find(r => r.fieldName === field.fieldName && r.testType === 'API');
          if (!existing) {
            fieldResults.push({
              fieldName: field.fieldName,
              testType: 'API',
              status: apiStatus,
              failureReason: hasIssues ? field.issues.join('; ') : undefined,
              expectedView: fieldInfo.expectedView,
              expectedEdit: fieldInfo.expectedEdit,
              testScenario: `API - MRD FLS validation for ${field.fieldName}`,
              testCaseId: generateTestCaseId('API'),
            });
          }
        }
      }
      
      // Add UI results from field report
      if (field.uiTests) {
        const uiStatus = Object.values(field.uiTests).some((s: any) => s === 'failed') ? 'Fail' : 
                        Object.values(field.uiTests).some((s: any) => s === 'passed') ? 'Pass' : undefined;
        
        if (uiStatus) {
          const existing = fieldResults.find(r => r.fieldName === field.fieldName && r.testType === 'UI');
          if (!existing) {
            fieldResults.push({
              fieldName: field.fieldName,
              testType: 'UI',
              status: uiStatus,
              failureReason: hasIssues ? field.issues.join('; ') : undefined,
              expectedView: fieldInfo.expectedView,
              expectedEdit: fieldInfo.expectedEdit,
              testScenario: `UI - MRD FLS validation for ${field.fieldName}`,
              testCaseId: generateTestCaseId('UI'),
            });
          }
        }
      }
    }
  }

  // Sort by field name, then by test type
  fieldResults.sort((a, b) => {
    if (a.fieldName !== b.fieldName) {
      return a.fieldName.localeCompare(b.fieldName);
    }
    return a.testType.localeCompare(b.testType);
  });

  // Create Excel workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Field-Level Test Results');

  // Set column headers
  worksheet.columns = [
    { header: 'Test Case ID', key: 'testCaseId', width: 18 },
    { header: 'Scenario', key: 'testScenario', width: 60 },
    { header: 'Field Name', key: 'fieldName', width: 30 },
    { header: 'Field Label', key: 'fieldLabel', width: 35 },
    { header: 'Test Type', key: 'testType', width: 10 },
    { header: 'Status', key: 'status', width: 10 },
    { header: 'Failure Reason', key: 'failureReason', width: 60 },
    { header: 'Expected View', key: 'expectedView', width: 15 },
    { header: 'Expected Edit', key: 'expectedEdit', width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 11 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  // Add data rows
  for (const result of fieldResults) {
    const fieldInfo = fieldMap.get(result.fieldName);
    const row = worksheet.addRow({
      testCaseId: result.testCaseId,
      testScenario: result.testScenario,
      fieldName: result.fieldName,
      fieldLabel: fieldInfo?.label || result.fieldName,
      testType: result.testType,
      status: result.status,
      failureReason: result.failureReason || '',
      expectedView: result.expectedView ? 'Yes' : 'No',
      expectedEdit: result.expectedEdit ? 'Yes' : 'No',
    });

    // Color code status
    const statusCell = row.getCell('status');
    if (result.status === 'Pass') {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC6EFCE' },
      };
      statusCell.font = { color: { argb: 'FF006100' } };
    } else {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC7CE' },
      };
      statusCell.font = { color: { argb: 'FF9C0006' } };
    }

    // Color code test type
    const testTypeCell = row.getCell('testType');
    if (result.testType === 'API') {
      testTypeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7F3FF' },
      };
    } else {
      testTypeCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF4E6' },
      };
    }

    // Wrap text for failure reason and scenario
    row.getCell('failureReason').alignment = { wrapText: true, vertical: 'top' };
    row.getCell('testScenario').alignment = { wrapText: true, vertical: 'top' };
  }

  // Freeze header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `I${worksheet.rowCount}`,
  };

  // Save Excel file with timestamp to avoid conflicts
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + 
                    new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const excelPath = path.join(reportsDir, `mrd-fls-field-level-simple-${timestamp}.xlsx`);
  
  // Try to delete old file if it exists and is not locked
  const oldFilePattern = path.join(reportsDir, 'mrd-fls-field-level-simple-*.xlsx');
  try {
    const oldFiles = fs.readdirSync(reportsDir)
      .filter(f => f.startsWith('mrd-fls-field-level-simple-') && f.endsWith('.xlsx'))
      .map(f => path.join(reportsDir, f))
      .filter(f => f !== excelPath);
    
    // Keep only the 5 most recent files
    if (oldFiles.length > 5) {
      const sortedFiles = oldFiles
        .map(f => ({ path: f, time: fs.statSync(f).mtime }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());
      
      for (let i = 5; i < sortedFiles.length; i++) {
        try {
          fs.unlinkSync(sortedFiles[i].path);
        } catch (e) {
          // Ignore errors deleting old files
        }
      }
    }
  } catch (e) {
    // Ignore errors cleaning up old files
  }
  
  await workbook.xlsx.writeFile(excelPath);
  
  console.log(`\n✅ Simple Excel report generated: ${excelPath}`);
  console.log(`\n📊 Summary:`);
  console.log(`   Total rows: ${fieldResults.length}`);
  console.log(`   Passed: ${fieldResults.filter(r => r.status === 'Pass').length}`);
  console.log(`   Failed: ${fieldResults.filter(r => r.status === 'Fail').length}`);
  console.log(`   API tests: ${fieldResults.filter(r => r.testType === 'API').length}`);
  console.log(`   UI tests: ${fieldResults.filter(r => r.testType === 'UI').length}`);
}

// Run the script
generateSimpleExcelReport().catch((error) => {
  console.error('❌ Error generating report:', error);
  process.exit(1);
});

