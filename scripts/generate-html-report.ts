#!/usr/bin/env ts-node
/**
 * Generate HTML report from country metadata comparison JSON
 */

import * as fs from 'fs';
import * as path from 'path';

interface ComparisonReport {
  timestamp: string;
  csvRecordCount: number;
  csvUniqueMasterIds: number;
  metadataRecordCount: number;
  matches: number;
  mismatches: number;
  matchRate: string;
  missingInMetadata: number;
  details: {
    matches: Array<{
      developerName: string;
      dataverseValue: string;
      salesforceValue: string;
      objectField: string;
      csvCountryName: string;
      csvAlpha2Code: string;
    }>;
    mismatches: Array<{
      developerName: string;
      dataverseValue: string;
      salesforceValue: string;
      objectField: string;
      error: string;
    }>;
    missingInMetadata: Array<{
      countryMasterId: string;
      countryName: string;
      alpha2Code: string;
    }>;
  };
}

function generateHTMLReport() {
  const jsonPath = path.resolve(process.cwd(), 'reports', 'country-metadata-comparison.json');
  const htmlPath = path.resolve(process.cwd(), 'reports', 'country-metadata-comparison.html');

  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON report not found: ${jsonPath}`);
  }

  const report: ComparisonReport = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  // Categorize mismatches
  const countryMismatches = report.details.mismatches.filter(m => 
    m.dataverseValue.startsWith('CRY-')
  );
  const businessAreaMismatches = report.details.mismatches.filter(m => 
    m.dataverseValue.startsWith('376140')
  );
  const regionMismatches = report.details.mismatches.filter(m => 
    m.dataverseValue.startsWith('REG-')
  );
  const statusMismatches = report.details.mismatches.filter(m => 
    /^[0-2]$/.test(m.dataverseValue)
  );

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Country Metadata Comparison Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #3498db;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        
        h2 {
            color: #34495e;
            margin-top: 40px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #ecf0f1;
        }
        
        h3 {
            color: #555;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        
        .summary-card.success {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
        }
        
        .summary-card.warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .summary-card.info {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .summary-card h3 {
            color: white;
            font-size: 14px;
            text-transform: uppercase;
            margin: 0 0 10px 0;
            opacity: 0.9;
        }
        
        .summary-card .value {
            font-size: 36px;
            font-weight: bold;
            margin: 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        thead {
            background: #34495e;
            color: white;
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #ecf0f1;
        }
        
        tbody tr:hover {
            background: #f8f9fa;
        }
        
        tbody tr:nth-child(even) {
            background: #fafafa;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .badge-success {
            background: #d4edda;
            color: #155724;
        }
        
        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }
        
        .badge-info {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }
        
        .note {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .note strong {
            color: #1976D2;
        }
        
        .timestamp {
            color: #7f8c8d;
            font-size: 14px;
            margin-bottom: 20px;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .count-badge {
            background: #3498db;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
        }
        
        .scrollable {
            max-height: 600px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }
        
        .scrollable table {
            margin: 0;
        }
        
        .scrollable thead {
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #ecf0f1;
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌍 Country Metadata Comparison Report</h1>
        <div class="timestamp">
            Generated: ${new Date(report.timestamp).toLocaleString()}
        </div>
        
        <div class="summary">
            <div class="summary-card success">
                <h3>Match Rate</h3>
                <p class="value">${report.matchRate}</p>
            </div>
            <div class="summary-card success">
                <h3>Matches</h3>
                <p class="value">${report.matches}</p>
            </div>
            <div class="summary-card warning">
                <h3>Mismatches</h3>
                <p class="value">${report.mismatches}</p>
            </div>
            <div class="summary-card info">
                <h3>Total Records</h3>
                <p class="value">${report.metadataRecordCount}</p>
            </div>
            <div class="summary-card info">
                <h3>CSV Countries</h3>
                <p class="value">${report.csvUniqueMasterIds}</p>
            </div>
            <div class="summary-card warning">
                <h3>Missing in Metadata</h3>
                <p class="value">${report.missingInMetadata}</p>
            </div>
        </div>
        
        <h2>✅ Matches (${report.matches})</h2>
        <div class="note">
            <strong>Note:</strong> These ${report.matches} country mappings successfully match between Custom Metadata and the Dataverse CSV export.
        </div>
        <div class="scrollable">
            <table>
                <thead>
                    <tr>
                        <th>Developer Name</th>
                        <th>Dataverse Value</th>
                        <th>Salesforce Value</th>
                        <th>Object.Field</th>
                        <th>CSV Country Name</th>
                        <th>Alpha-2 Code</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.details.matches.map(m => `
                    <tr>
                        <td><code>${m.developerName}</code></td>
                        <td><strong>${m.dataverseValue}</strong></td>
                        <td>${m.salesforceValue}</td>
                        <td><code>${m.objectField}</code></td>
                        <td>${m.csvCountryName}</td>
                        <td><span class="badge badge-info">${m.csvAlpha2Code}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <h2>❌ Mismatches (${report.mismatches})</h2>
        
        ${countryMismatches.length > 0 ? `
        <h3>Country Records Missing in CSV (${countryMismatches.length})</h3>
        <div class="note">
            <strong>Note:</strong> These countries exist in Custom Metadata but were not found in the CSV export. They may need to be added to Dataverse or the CSV export may be incomplete.
        </div>
        <table>
            <thead>
                <tr>
                    <th>Developer Name</th>
                    <th>Dataverse Value</th>
                    <th>Salesforce Value</th>
                    <th>Object.Field</th>
                    <th>Error</th>
                </tr>
            </thead>
            <tbody>
                ${countryMismatches.map(m => `
                <tr>
                    <td><code>${m.developerName}</code></td>
                    <td><strong>${m.dataverseValue}</strong></td>
                    <td>${m.salesforceValue}</td>
                    <td><code>${m.objectField}</code></td>
                    <td><span class="badge badge-danger">${m.error}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        ${businessAreaMismatches.length > 0 ? `
        <h3>Business Area Mappings (${businessAreaMismatches.length})</h3>
        <div class="note">
            <strong>Note:</strong> These are <strong>expected</strong> - they map to <code>accelins_business_area</code> field, not <code>accelins_countrymasterid</code>. They use numeric codes (376140000-376140009) which are not Country Master IDs.
        </div>
        <table>
            <thead>
                <tr>
                    <th>Developer Name</th>
                    <th>Dataverse Value</th>
                    <th>Salesforce Value</th>
                    <th>Object.Field</th>
                </tr>
            </thead>
            <tbody>
                ${businessAreaMismatches.map(m => `
                <tr>
                    <td><code>${m.developerName}</code></td>
                    <td><strong>${m.dataverseValue}</strong></td>
                    <td>${m.salesforceValue}</td>
                    <td><code>${m.objectField}</code></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        ${regionMismatches.length > 0 ? `
        <h3>Distribution Region Mappings (${regionMismatches.length})</h3>
        <div class="note">
            <strong>Note:</strong> These are <strong>expected</strong> - they map to <code>accelins_region</code> field, not <code>accelins_countrymasterid</code>. They use REG- codes which are not Country Master IDs.
        </div>
        <table>
            <thead>
                <tr>
                    <th>Developer Name</th>
                    <th>Dataverse Value</th>
                    <th>Salesforce Value</th>
                    <th>Object.Field</th>
                </tr>
            </thead>
            <tbody>
                ${regionMismatches.map(m => `
                <tr>
                    <td><code>${m.developerName}</code></td>
                    <td><strong>${m.dataverseValue}</strong></td>
                    <td>${m.salesforceValue}</td>
                    <td><code>${m.objectField}</code></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        ${statusMismatches.length > 0 ? `
        <h3>Status Code Mappings (${statusMismatches.length})</h3>
        <div class="note">
            <strong>Note:</strong> These are <strong>expected</strong> - they map to <code>statecode</code> and <code>statuscode</code> fields, not <code>accelins_countrymasterid</code>. They use numeric codes (0, 1, 2) which are not Country Master IDs.
        </div>
        <table>
            <thead>
                <tr>
                    <th>Developer Name</th>
                    <th>Dataverse Value</th>
                    <th>Salesforce Value</th>
                    <th>Object.Field</th>
                </tr>
            </thead>
            <tbody>
                ${statusMismatches.map(m => `
                <tr>
                    <td><code>${m.developerName}</code></td>
                    <td><strong>${m.dataverseValue}</strong></td>
                    <td>${m.salesforceValue}</td>
                    <td><code>${m.objectField}</code></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        ${report.details.missingInMetadata.length > 0 ? `
        <h2>⚠️ Countries Missing in Custom Metadata (${report.details.missingInMetadata.length})</h2>
        <div class="note">
            <strong>Note:</strong> These countries exist in the Dataverse CSV export but are not present in Custom Metadata. They may need to be added to Custom Metadata.
        </div>
        <table>
            <thead>
                <tr>
                    <th>Country Master ID</th>
                    <th>Country Name</th>
                    <th>Alpha-2 Code</th>
                </tr>
            </thead>
            <tbody>
                ${report.details.missingInMetadata.map(m => `
                <tr>
                    <td><strong>${m.countryMasterId}</strong></td>
                    <td>${m.countryName}</td>
                    <td><span class="badge badge-warning">${m.alpha2Code}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : ''}
        
        <div class="footer">
            <p>Report generated by E2E Automation Framework</p>
            <p>Source: Custom Metadata (Salesforce) vs Dataverse CSV Export</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`✅ HTML report generated: ${htmlPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Matches: ${report.matches}`);
  console.log(`   - Mismatches: ${report.mismatches} (${countryMismatches.length} actual country issues)`);
  console.log(`   - Missing in Metadata: ${report.details.missingInMetadata.length}`);
}

generateHTMLReport();
