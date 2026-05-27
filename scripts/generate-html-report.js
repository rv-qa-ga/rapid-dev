const report = require('multiple-cucumber-html-reporter');
const path = require('path');
const fs = require('fs');

const jsonDir = path.join(process.cwd(), 'reports', 'json');
const reportDir = path.join(process.cwd(), 'reports', 'html');
const archiveDir = path.join(process.cwd(), 'reports', 'archive');
const screenshotDir = path.join(process.cwd(), 'reports', 'screenshots');

// Helper to find screenshot files for scenarios
function findScreenshotForScenario(scenarioName, screenshotDir) {
  if (!fs.existsSync(screenshotDir)) {
    return null;
  }
  
  const sanitizedName = scenarioName.replace(/[^a-z0-9]/gi, '_');
  const files = fs.readdirSync(screenshotDir);
  
  // Find the most recent screenshot matching the scenario name
  const matchingFiles = files
    .filter(file => file.startsWith(sanitizedName) && file.endsWith('.png'))
    .map(file => ({
      name: file,
      path: path.join(screenshotDir, file),
      time: fs.statSync(path.join(screenshotDir, file)).mtime
    }))
    .sort((a, b) => b.time - a.time);
  
  return matchingFiles.length > 0 ? matchingFiles[0].name : null;
}

// Ensure directories exist
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir, { recursive: true });
}
if (!fs.existsSync(reportDir)) {
  fs.mkdirSync(reportDir, { recursive: true });
}
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

const jsonFile = path.join(jsonDir, 'cucumber-report.json');

if (!fs.existsSync(jsonFile)) {
  console.error('Cucumber JSON report not found. Run tests first.');
  process.exit(1);
}

// Archive existing reports
function archiveExistingReports() {
  console.log('Archiving existing reports...');
  
  if (!fs.existsSync(reportDir)) {
    return;
  }

  const files = fs.readdirSync(reportDir);
  if (files.length === 0) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveSubDir = path.join(archiveDir, `report-${timestamp}`);

  if (!fs.existsSync(archiveSubDir)) {
    fs.mkdirSync(archiveSubDir, { recursive: true });
  }

  files.forEach((file) => {
    const sourcePath = path.join(reportDir, file);
    const destPath = path.join(archiveSubDir, file);

    try {
      fs.copyFileSync(sourcePath, destPath);
      fs.unlinkSync(sourcePath);
    } catch (error) {
      console.warn(`Failed to archive ${file}: ${error.message}`);
    }
  });

  console.log(`Archived ${files.length} file(s) to ${archiveSubDir}`);
}

// Load environment info
// Override via REPORT_ENV_LABEL when the run uses ENV=<other> but the target org
// being validated is different (e.g. parity scenarios run with ENV=qa as baseline
// but exercise UAT as target — set REPORT_ENV_LABEL=UAT to reflect that).
function loadEnvironmentInfo() {
  const envLabel = process.env.REPORT_ENV_LABEL;
  const env = envLabel || process.env.ENV || 'qa';
  const baseUrl = process.env.SF_BASE_URL || 'Not configured';
  const username = process.env.SF_USERNAME || 'Not configured';

  return {
    env: env.toUpperCase(),
    baseUrl,
    username,
  };
}

// Parse failure reasons and screenshots from JSON report
function parseFailures(jsonData) {
  const failures = [];
  
  if (!jsonData || !Array.isArray(jsonData)) {
    return failures;
  }

  jsonData.forEach((feature) => {
    if (!feature.elements) return;
    
    feature.elements.forEach((element) => {
      if (element.steps) {
        const scenarioName = element.name || 'Unknown';
        // Try to find screenshot file by scenario name (for all scenarios, not just failures)
        let screenshotPath = findScreenshotForScenario(scenarioName, screenshotDir);
        
        // Check for attachments in steps (Cucumber embeddings)
        element.steps.forEach((step) => {
          // Look for screenshots in embeddings
          if (step.embeddings && step.embeddings.length > 0) {
            step.embeddings.forEach((embedding) => {
              if (embedding.mime_type === 'image/png') {
                // Screenshot found in embeddings - use file name if available
                screenshotPath = embedding.file_name || screenshotPath || 'screenshot.png';
              }
            });
          }
          
          // Only add to failures if step failed
          if (step.result && step.result.status === 'FAILED') {
            const reason = simplifyError(step.result.error_message || 'Test failed');
            
            // If no screenshot found yet, check this step's embeddings again
            if (!screenshotPath && step.embeddings && step.embeddings.length > 0) {
              step.embeddings.forEach((embedding) => {
                if (embedding.mime_type === 'image/png') {
                  screenshotPath = embedding.file_name || screenshotPath || 'screenshot.png';
                }
              });
            }
            
            failures.push({
              scenario: scenarioName,
              step: step.name || 'Unknown',
              reason: reason,
              testDataId: step.match?.arguments?.[0]?.value || 'N/A',
              screenshot: screenshotPath,
            });
          }
        });
      }
    });
  });

  return failures;
}

// Simplify error message
function simplifyError(errorMessage) {
  if (!errorMessage) return 'Test failed';
  
  const message = errorMessage.toLowerCase();

  if (message.includes('timeout') || message.includes('waiting')) {
    return 'Element did not appear within the expected time';
  }
  if (message.includes('not found') || message.includes('not visible')) {
    return 'Expected element was not found on the page';
  }
  if (message.includes('not logged in') || message.includes('authentication')) {
    return 'User authentication failed or session expired';
  }
  if (message.includes('not clickable') || message.includes('not enabled')) {
    return 'Button or element was not clickable or enabled';
  }
  if (message.includes('api') && message.includes('error')) {
    return 'API request failed or returned an error';
  }
  if (message.includes('status') && message.includes('400')) {
    return 'Invalid data was sent to the server';
  }
  if (message.includes('status') && message.includes('401')) {
    return 'Authentication token expired or invalid';
  }
  if (message.includes('status') && message.includes('403')) {
    return 'User does not have permission to perform this action';
  }
  if (message.includes('status') && message.includes('404')) {
    return 'Requested resource was not found';
  }
  if (message.includes('status') && message.includes('500')) {
    return 'Server encountered an internal error';
  }
  if (message.includes('network') || message.includes('connection')) {
    return 'Network connection failed or timed out';
  }
  if (message.includes('validation') || message.includes('required')) {
    return 'Required field validation failed';
  }

  // Return first sentence
  const firstSentence = errorMessage.split('.')[0];
  return firstSentence.length > 100
    ? firstSentence.substring(0, 100) + '...'
    : firstSentence;
}

// Archive existing reports
archiveExistingReports();

// Load JSON report
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
const failures = parseFailures(jsonData);
const envInfo = loadEnvironmentInfo();

// Generate timestamp for report
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const reportTimestamp = new Date().toLocaleString();

// Generate report
report.generate({
  jsonDir: jsonDir,
  reportPath: reportDir,
  metadata: {
    browser: {
      name: 'chrome',
      version: 'latest',
    },
    device: 'Local Test Machine',
    platform: {
      name: process.platform,
      version: process.version,
    },
  },
  customData: {
    title: `E2E Test Report - ${reportTimestamp}`,
    data: [
      { label: 'Project', value: 'E2E Automation Framework' },
      { label: 'Environment', value: envInfo.env },
      { label: 'Base URL', value: envInfo.baseUrl },
      { label: 'Username', value: envInfo.username },
      { label: 'Execution Date', value: reportTimestamp },
      { label: 'Report Timestamp', value: timestamp },
    ],
  },
  pageTitle: `E2E Test Report - ${envInfo.env} - ${reportTimestamp}`,
  reportName: `E2E Test Execution Report - ${envInfo.env}`,
  openReportInBrowser: false,
  displayDuration: true,
  displayReportTime: true,
  pageFooter: `
    <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
      <h3>Execution Information</h3>
      <table border="0" cellpadding="5">
        <tr><td><strong>Environment:</strong></td><td>${envInfo.env}</td></tr>
        <tr><td><strong>Base URL:</strong></td><td><a href="${envInfo.baseUrl}" target="_blank">${envInfo.baseUrl}</a></td></tr>
        <tr><td><strong>Username:</strong></td><td>${envInfo.username}</td></tr>
        <tr><td><strong>Execution Time:</strong></td><td>${reportTimestamp}</td></tr>
      </table>
      ${failures.length > 0 ? generateFailureTable(failures) : '<p>✅ No failures - All tests passed!</p>'}
    </div>
    <div style="margin-top: 10px;">
      <p>Generated by E2E Automation Framework</p>
    </div>
  `,
});

// Generate failure table HTML
function generateFailureTable(failures) {
  let table = '<h3>Failure Summary</h3>';
  table += '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top: 10px;">';
  table += '<thead><tr style="background: #f0f0f0;">';
  table += '<th>Scenario</th>';
  table += '<th>Step</th>';
  table += '<th>Reason (Simple English)</th>';
  table += '<th>Test Data ID</th>';
  table += '<th>Screenshot</th>';
  table += '</tr></thead>';
  table += '<tbody>';

  failures.forEach((failure) => {
    table += '<tr>';
    table += `<td>${escapeHtml(failure.scenario)}</td>`;
    table += `<td>${escapeHtml(failure.step)}</td>`;
    table += `<td style="color: #d32f2f;">${escapeHtml(failure.reason)}</td>`;
    table += `<td>${failure.testDataId || 'N/A'}</td>`;
    
    // Screenshot link
    if (failure.screenshot) {
      const screenshotUrl = `../screenshots/${path.basename(failure.screenshot)}`;
      table += `<td><a href="${screenshotUrl}" target="_blank">View</a></td>`;
    } else {
      table += '<td>N/A</td>';
    }
    
    table += '</tr>';
  });

  table += '</tbody></table>';
  return table;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const reportPath = path.join(reportDir, 'index.html');
console.log(`✅ HTML report generated: ${reportPath}`);
console.log(`📊 Failures: ${failures.length}`);
console.log(`🌍 Environment: ${envInfo.env}`);
console.log(`🔗 Base URL: ${envInfo.baseUrl}`);
