#!/usr/bin/env ts-node

/**
 * Generate Work Item Summary Report
 * 
 * Creates an HTML summary report from the work item test execution summary
 * 
 * Usage:
 *   ts-node scripts/generate-work-item-summary-report.ts
 */

import * as path from 'path';
import * as fs from 'fs';

const workItemsDir = path.join(__dirname, '..', 'reports', 'work-items');
const summaryFile = path.join(workItemsDir, 'summary.json');
const summaryReportFile = path.join(workItemsDir, 'summary-report.html');

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

function generateHTMLReport(summary: Summary): string {
  const timestamp = new Date(summary.timestamp).toLocaleString();
  const passedCount = summary.results.filter(r => r.status === 'PASSED').length;
  const failedCount = summary.results.filter(r => r.status === 'FAILED').length;
  const errorCount = summary.results.filter(r => r.status === 'ERROR').length;
  const skippedCount = summary.results.filter(r => r.status === 'SKIPPED').length;

  let rows = '';
  summary.results.forEach((result, index) => {
    const statusClass = result.status === 'PASSED' ? 'success' : 
                       result.status === 'FAILED' ? 'danger' : 
                       result.status === 'ERROR' ? 'warning' : 'info';
    const statusIcon = result.status === 'PASSED' ? '✅' : 
                      result.status === 'FAILED' ? '❌' : 
                      result.status === 'ERROR' ? '⚠️' : '⏭️';
    
    const testCounts = result.passed !== undefined ? 
      `Passed: ${result.passed || 0}, Failed: ${result.failed || 0}, Skipped: ${result.skipped || 0}` : 
      '';
    
    const reportLink = result.htmlReport && fs.existsSync(result.htmlReport) ?
      `<a href="${path.relative(workItemsDir, result.htmlReport).replace(/\\/g, '/')}" target="_blank">View Report</a>` :
      result.jsonReport && fs.existsSync(result.jsonReport) ?
      `<a href="${path.relative(workItemsDir, result.jsonReport).replace(/\\/g, '/')}" target="_blank">View JSON</a>` :
      'No report available';
    
    const errorDetails = result.error ? `<br><small class="text-muted">${result.error}</small>` : '';
    
    rows += `
      <tr class="${statusClass}">
        <td>${index + 1}</td>
        <td><strong>${result.workItem}</strong></td>
        <td><span class="badge badge-${statusClass}">${statusIcon} ${result.status}</span></td>
        <td>${testCounts || '-'}</td>
        <td>${reportLink}${errorDetails}</td>
      </tr>
    `;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Work Item Test Execution Summary</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .meta {
      font-size: 14px;
      opacity: 0.9;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8f9fa;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .stat-card .value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .stat-card .label {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-card.success .value { color: #28a745; }
    .stat-card.danger .value { color: #dc3545; }
    .stat-card.warning .value { color: #ffc107; }
    .stat-card.info .value { color: #17a2b8; }
    .content {
      padding: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f8f9fa;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
      color: #495057;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
    }
    tr:hover {
      background: #f8f9fa;
    }
    tr.success {
      background: #d4edda;
    }
    tr.danger {
      background: #f8d7da;
    }
    tr.warning {
      background: #fff3cd;
    }
    tr.info {
      background: #d1ecf1;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success {
      background: #28a745;
      color: white;
    }
    .badge-danger {
      background: #dc3545;
      color: white;
    }
    .badge-warning {
      background: #ffc107;
      color: #333;
    }
    .badge-info {
      background: #17a2b8;
      color: white;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .text-muted {
      color: #6c757d;
      font-size: 12px;
    }
    .footer {
      padding: 20px 30px;
      background: #f8f9fa;
      text-align: center;
      color: #6c757d;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Work Item Test Execution Summary</h1>
      <div class="meta">
        Environment: ${summary.environment.toUpperCase()} | 
        Generated: ${timestamp}
      </div>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="value">${summary.total}</div>
        <div class="label">Total Work Items</div>
      </div>
      <div class="stat-card success">
        <div class="value">${passedCount}</div>
        <div class="label">Passed</div>
      </div>
      <div class="stat-card danger">
        <div class="value">${failedCount}</div>
        <div class="label">Failed</div>
      </div>
      <div class="stat-card warning">
        <div class="value">${errorCount}</div>
        <div class="label">Errors</div>
      </div>
      <div class="stat-card info">
        <div class="value">${skippedCount}</div>
        <div class="label">Skipped</div>
      </div>
    </div>
    
    <div class="content">
      <h2>Work Item Details</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Work Item</th>
            <th>Status</th>
            <th>Test Results</th>
            <th>Report</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      Generated by E2E Automation Framework | ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>
`;
}

function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║  📊 Generating Work Item Summary Report                      ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Check if summary file exists
  if (!fs.existsSync(summaryFile)) {
    console.error(`❌ Summary file not found: ${summaryFile}`);
    console.log(`💡 Run tests first using: node scripts/run-work-item-tests.js`);
    process.exit(1);
  }

  // Load summary
  const summary: Summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
  
  console.log(`📋 Processing ${summary.results.length} work item(s)...`);

  // Generate HTML report
  const html = generateHTMLReport(summary);
  fs.writeFileSync(summaryReportFile, html, 'utf-8');

  console.log(`\n✅ Summary report generated: ${summaryReportFile}`);
  console.log(`\n📊 Summary Statistics:`);
  console.log(`   Total Work Items: ${summary.total}`);
  console.log(`   ✅ Passed: ${summary.results.filter(r => r.status === 'PASSED').length}`);
  console.log(`   ❌ Failed: ${summary.results.filter(r => r.status === 'FAILED').length}`);
  console.log(`   ⚠️  Errors: ${summary.results.filter(r => r.status === 'ERROR').length}`);
  console.log(`   ⏭️  Skipped: ${summary.results.filter(r => r.status === 'SKIPPED').length}`);
  console.log(`\n✅ Report generation complete!\n`);
}

// Run if called directly
if (require.main === module) {
  main();
}

