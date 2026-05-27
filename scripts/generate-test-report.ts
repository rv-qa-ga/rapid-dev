#!/usr/bin/env ts-node

/**
 * Test Execution Report Generation Framework
 * 
 * Generates a self-contained HTML report from JSON test results
 * 
 * Usage:
 *   ts-node scripts/generate-test-report.ts [results.json] [output.html]
 * 
 * Example:
 *   ts-node scripts/generate-test-report.ts reports/test-results.json reports/test-report.html
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  id: string;
  type: 'API' | 'UI';
  feature?: string;
  jiraId?: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  priority?: string;
  testData?: string;
  scenarioDescription: string;
  errorDetails?: string;
  screenshotPath?: string;
  screenshotUrl?: string;
  timestamp?: string;
  duration?: number;
}

interface TestResults {
  runDateTime: string;
  environmentName: string;
  environmentBaseUrl: string;
  executedByUser: string;
  userProfile?: string;
  tests: TestResult[];
}

/**
 * Generate HTML report from JSON results
 */
function generateReport(results: TestResults, outputPath: string): void {
  const html = generateHTML(results);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, html, 'utf-8');
  console.log(`✅ Report generated: ${outputPath}`);
}

/**
 * Generate complete HTML with embedded CSS and JS
 */
function generateHTML(results: TestResults): string {
  // Filter out "Salesforce Login" tests
  const filteredTests = results.tests.filter(t => {
    const featureName = t.feature || '';
    return !featureName.toLowerCase().includes('salesforce login') && 
           !featureName.toLowerCase().includes('login');
  });
  
  const apiTests = filteredTests.filter(t => t.type === 'API');
  const uiTests = filteredTests.filter(t => t.type === 'UI');
  
  const apiSummary = calculateSummary(apiTests);
  const uiSummary = calculateSummary(uiTests);
  const totalSummary = calculateSummary(filteredTests);
  
  const apiFailed = getFailedTests(apiTests);
  const uiFailed = getFailedTests(uiTests);
  
  // Store results in a way that JavaScript can access it
  const resultsJson = JSON.stringify(results);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Execution Report - ${results.environmentName}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    ${getCSS()}
  </style>
</head>
<body>
  <div class="container">
    ${generateHeader(results)}
    ${generateSummary(totalSummary)}
    ${generateTabs(apiSummary, uiSummary, apiFailed, uiFailed, filteredTests)}
  </div>
  <script>
    // Store test results for navigation
    const testResults = ${resultsJson};
    ${getJavaScript(results, apiSummary, uiSummary, totalSummary)}
  </script>
</body>
</html>`;
}

/**
 * Generate header with run metadata
 */
function generateHeader(results: TestResults): string {
  return `
    <header class="report-header">
      <h1>Test Execution Report</h1>
      <div class="metadata">
        <div class="metadata-item">
          <span class="label">Date & Time:</span>
          <span class="value">${formatDateTime(results.runDateTime)}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Environment:</span>
          <span class="value">${results.environmentName.toUpperCase()}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Base URL:</span>
          <span class="value">${results.environmentBaseUrl}</span>
        </div>
        <div class="metadata-item">
          <span class="label">Executed By:</span>
          <span class="value">${results.executedByUser}${results.userProfile ? ` (${results.userProfile})` : ''}</span>
        </div>
      </div>
    </header>
  `;
}

/**
 * Generate overall summary section
 */
function generateSummary(summary: any): string {
  const passPercent = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0';
  const failPercent = summary.total > 0 ? ((summary.failed / summary.total) * 100).toFixed(1) : '0';
  
  return `
    <section class="summary-section">
      <h2>Test Case Summary</h2>
      <div class="summary-grid">
        <div class="summary-card total">
          <div class="summary-value">${summary.total}</div>
          <div class="summary-label">Total Test Cases</div>
        </div>
        <div class="summary-card passed">
          <div class="summary-value">${summary.passed}</div>
          <div class="summary-label">Passed Test Cases</div>
          <div class="summary-percent">${passPercent}%</div>
        </div>
        <div class="summary-card failed">
          <div class="summary-value">${summary.failed}</div>
          <div class="summary-label">Failed Test Cases</div>
          <div class="summary-percent">${failPercent}%</div>
        </div>
        ${summary.skipped > 0 ? `
        <div class="summary-card skipped">
          <div class="summary-value">${summary.skipped}</div>
          <div class="summary-label">Skipped Test Cases</div>
        </div>
        ` : ''}
      </div>
    </section>
  `;
}

/**
 * Generate tabs for API and UI tests
 */
function generateTabs(apiSummary: any, uiSummary: any, apiFailed: TestResult[], uiFailed: TestResult[], allTests: TestResult[]): string {
  return `
    <section class="tabs-section">
      <div class="tabs">
        <button class="tab-button active" onclick="window.showTab('all')">All Tests</button>
        <button class="tab-button" onclick="window.showTab('api')">API Tests</button>
        <button class="tab-button" onclick="window.showTab('ui')">UI Tests</button>
      </div>
      
      <div id="tab-all" class="tab-content active">
        ${generateTabContent('all', allTests, calculateSummary(allTests), allTests.filter(t => t.status === 'FAILED'))}
      </div>
      
      <div id="tab-api" class="tab-content">
        ${generateTabContent('api', apiFailed, apiSummary, apiFailed)}
      </div>
      
      <div id="tab-ui" class="tab-content">
        ${generateTabContent('ui', uiFailed, uiSummary, uiFailed)}
      </div>
    </section>
  `;
}

/**
 * Generate content for a tab
 */
function generateTabContent(type: string, tests: TestResult[], summary: any, failedTests: TestResult[]): string {
  const passPercent = summary.total > 0 ? ((summary.passed / summary.total) * 100).toFixed(1) : '0';
  const failPercent = summary.total > 0 ? ((summary.failed / summary.total) * 100).toFixed(1) : '0';
  const skipPercent = summary.total > 0 && summary.skipped > 0 ? ((summary.skipped / summary.total) * 100).toFixed(1) : '0';
  
  // Filter out "Salesforce Login" tests
  const filteredTests = tests.filter(t => {
    const featureName = t.feature || '';
    return !featureName.toLowerCase().includes('salesforce login') && 
           !featureName.toLowerCase().includes('login');
  });
  
  // Recalculate summary based on filtered tests
  const filteredSummary = calculateSummary(filteredTests);
  const filteredPassPercent = filteredSummary.total > 0 ? ((filteredSummary.passed / filteredSummary.total) * 100).toFixed(1) : '0';
  const filteredFailPercent = filteredSummary.total > 0 ? ((filteredSummary.failed / filteredSummary.total) * 100).toFixed(1) : '0';
  const filteredSkipPercent = filteredSummary.total > 0 && filteredSummary.skipped > 0 ? ((filteredSummary.skipped / filteredSummary.total) * 100).toFixed(1) : '0';
  
  return `
    <div class="tab-summary">
      <h3>${type.toUpperCase()} Test Cases Summary</h3>
      <div class="tab-summary-stats">
        <span>Total Test Cases: <strong>${filteredSummary.total}</strong></span>
        <span>Passed: <strong class="passed">${filteredSummary.passed}</strong> (${filteredPassPercent}%)</span>
        <span>Failed: <strong class="failed">${filteredSummary.failed}</strong> (${filteredFailPercent}%)</span>
        ${filteredSummary.skipped > 0 ? `<span>Skipped: <strong class="skipped">${filteredSummary.skipped}</strong> (${filteredSkipPercent}%)</span>` : ''}
      </div>
    </div>
    
    <div class="chart-container">
      <canvas id="chart-${type}"></canvas>
    </div>
    
    ${generateAllTestsTable(type, filteredTests)}
  `;
}

/**
 * Generate table showing ALL tests (not just failures) - for evidence/documentation
 */
function generateAllTestsTable(type: string, allTests: TestResult[]): string {
  return `
    <div class="table-section">
      <h3>All Test Cases (${type.toUpperCase()}) - Evidence Report</h3>
      <div class="table-controls">
        <input type="text" id="search-${type}" class="search-box" placeholder="Search by ID, JIRA ID, scenario text..." onkeyup="filterTable('${type}')">
        <select id="filter-status-${type}" class="filter-select" onchange="filterTable('${type}')">
          <option value="">All Statuses</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
          <option value="SKIPPED">Skipped</option>
        </select>
        <select id="filter-priority-${type}" class="filter-select" onchange="filterTable('${type}')">
          <option value="">All Priorities</option>
          <option value="P1">P1 - Critical</option>
          <option value="P2">P2 - High</option>
          <option value="P3">P3 - Medium</option>
          <option value="P4">P4 - Low</option>
        </select>
        <select id="filter-feature-${type}" class="filter-select" onchange="filterTable('${type}')">
          <option value="">All Features/JIRA IDs</option>
          ${getUniqueFeatures(allTests).map(f => `<option value="${f}">${f}</option>`).join('')}
        </select>
      </div>
      <div class="table-wrapper">
        <table id="table-${type}" class="issues-table">
          <thead>
            <tr>
              <th>Test Case ID</th>
              <th>Feature/JIRA ID</th>
              <th>Test Data</th>
              <th>Scenario</th>
              <th>Status</th>
              <th>Issue Description</th>
              <th>Error Details</th>
              <th>Screenshot</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            ${allTests.map(test => generateTableRow(test, type)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Generate priority issues table (legacy - kept for backward compatibility)
 */
function generateIssuesTable(type: string, failedTests: TestResult[]): string {
  return generateAllTestsTable(type, failedTests);
}

/**
 * Generate table row for a test
 */
function generateTableRow(test: TestResult, type: string): string {
  const featureOrJira = test.jiraId || test.feature || 'N/A';
  
  // Fix screenshot path - ensure it's relative to the report location
  let screenshot = test.screenshotPath || test.screenshotUrl;
  let screenshotUrl = '';
  if (screenshot) {
    // Normalize path separators
    screenshot = screenshot.replace(/\\/g, '/');
    
    // If it's already a relative path starting with reports/, use as is
    if (screenshot.startsWith('reports/')) {
      screenshotUrl = screenshot;
    } else if (screenshot.startsWith('http')) {
      // External URL - use as is
      screenshotUrl = screenshot;
    } else {
      // Try to make it relative to reports directory
        const reportsDir = path.join(process.cwd(), 'reports');
      const screenshotFullPath = path.isAbsolute(screenshot) 
        ? screenshot 
        : path.join(process.cwd(), screenshot);
      
      if (fs.existsSync(screenshotFullPath)) {
        // Convert to relative path from reports directory
        const relativePath = path.relative(reportsDir, screenshotFullPath).replace(/\\/g, '/');
        screenshotUrl = `reports/${relativePath}`;
        } else {
        // Fallback: assume it's in screenshots folder
        const filename = path.basename(screenshot);
        screenshotUrl = `reports/screenshots/${filename}`;
      }
    }
  }
  
  // Screenshot cell - show for ALL tests (evidence requirement)
  // Display as clickable link with thumbnail
  const screenshotCell = screenshotUrl 
    ? `<div class="screenshot-cell" onclick="event.stopPropagation();">
        <a href="${screenshotUrl}" target="_blank" title="Click to view full screenshot">
          <img src="${screenshotUrl}" alt="Screenshot for ${test.id}" class="screenshot-thumb" 
               onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'color: #999;\\'>Screenshot not found</span>'">
        </a>
        <div class="screenshot-link">
          <a href="${screenshotUrl}" target="_blank" class="screenshot-link-text">View Screenshot</a>
        </div>
      </div>`
    : '<span class="no-screenshot">N/A</span>';
  
  const priorityClass = test.priority ? `priority-${test.priority.toLowerCase()}` : '';
  const statusClass = `status-${test.status.toLowerCase()}`;
  
  // Generate plain English issue description (only for failed tests)
  const issueDescription = test.status === 'FAILED' 
    ? getPlainEnglishIssue(test.errorDetails || '', test.status)
    : test.status === 'PASSED' 
      ? 'Test passed successfully'
      : 'Test was skipped';
  
  // Full error details with expandable/collapsible functionality (only for failed tests)
  const errorDetails = test.errorDetails ? escapeHtml(test.errorDetails) : 'N/A';
  const errorId = `error-${test.id.replace(/[^a-z0-9]/gi, '-')}`;
  const hasLongError = test.errorDetails ? test.errorDetails.length > 300 : false;
  const errorPreview = hasLongError && test.errorDetails
    ? escapeHtml(test.errorDetails.substring(0, 300)) + '...'
    : errorDetails;
  
  const errorCell = test.status === 'FAILED' && hasLongError
    ? `
      <div class="error-container">
        <div class="error-preview" id="preview-${errorId}">
          <pre class="error-text">${errorPreview}</pre>
          <button class="expand-error-btn" onclick="toggleError('${errorId}')">Show Full Error</button>
        </div>
        <div class="error-full" id="full-${errorId}" style="display: none;">
          <pre class="error-text">${errorDetails}</pre>
          <button class="collapse-error-btn" onclick="toggleError('${errorId}')">Show Less</button>
        </div>
      </div>
    `
    : test.status === 'FAILED'
      ? `<pre class="error-text">${errorDetails}</pre>`
      : '<span class="no-error">-</span>';
  
  // Status badge
  const statusBadge = `<span class="status-badge ${statusClass}">${test.status}</span>`;
  
  // Test case details (expandable)
  const detailId = `detail-${test.id.replace(/[^a-z0-9]/gi, '-')}`;
  const duration = test.duration ? `${(test.duration / 1000).toFixed(1)}s` : 'N/A';
  const timestamp = test.timestamp ? formatDateTime(test.timestamp) : 'N/A';
  
  // Generate navigation links to UI/API versions
  let navigationLinks = '';
  if (test.jiraId) {
    const testIdMatch = test.id.match(/^([A-Z]+-\d+)-(UI|API)-(\d+)$/);
    if (testIdMatch) {
      const [, jiraId, currentType, testNum] = testIdMatch;
      const otherType = currentType === 'UI' ? 'API' : 'UI';
      const otherTestId = `${jiraId}-${otherType}-${testNum}`;
      
      // Check if the other type test exists - will be validated in JavaScript
      // For now, always show the link - JavaScript will handle validation
      const otherTestExists = true;
      
      if (otherTestExists) {
        const otherTab = otherType.toLowerCase();
        navigationLinks = `
          <div class="navigation-links">
            <a href="#" onclick="event.preventDefault(); event.stopPropagation(); navigateToTest('${otherTestId}', '${otherTab}'); return false;" 
               class="nav-link" title="View ${otherType} version of this test">
              <span class="nav-icon">${otherType === 'UI' ? '🖥️' : '🔌'}</span> View ${otherType} Test: ${otherTestId}
            </a>
          </div>
        `;
      }
    }
  }
  
  const testCaseDetails = `
    <tr class="test-detail-row" id="${detailId}" style="display: none;">
      <td colspan="9" class="test-detail-cell">
        <div class="test-detail-content">
          <h4>Test Case Details: ${escapeHtml(test.id)}${navigationLinks}</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <strong>Test Case ID:</strong> ${escapeHtml(test.id)}
            </div>
            <div class="detail-item">
              <strong>JIRA ID:</strong> ${escapeHtml(featureOrJira)}
            </div>
            <div class="detail-item">
              <strong>Type:</strong> ${escapeHtml(test.type)}
            </div>
            <div class="detail-item">
              <strong>Priority:</strong> ${escapeHtml(test.priority || 'N/A')}
            </div>
            <div class="detail-item">
              <strong>Status:</strong> ${statusBadge}
            </div>
            <div class="detail-item">
              <strong>Duration:</strong> ${duration}
            </div>
            <div class="detail-item">
              <strong>Timestamp:</strong> ${timestamp}
            </div>
            <div class="detail-item">
              <strong>Test Data:</strong> ${escapeHtml(test.testData || 'N/A')}
            </div>
            <div class="detail-item full-width">
              <strong>Scenario Description:</strong>
              <p>${escapeHtml(test.scenarioDescription)}</p>
            </div>
            ${test.errorDetails ? `
            <div class="detail-item full-width">
              <strong>Error Details:</strong>
              <pre class="error-text">${escapeHtml(test.errorDetails)}</pre>
            </div>
            ` : ''}
            ${screenshotUrl ? `
            <div class="detail-item full-width">
              <strong>Screenshot:</strong>
              <div class="screenshot-full">
                <a href="${screenshotUrl}" target="_blank">
                  <img src="${screenshotUrl}" alt="Full screenshot" class="screenshot-full-img" 
                       onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\\'color: #999;\\'>Screenshot not found</span>'">
                </a>
                <div style="margin-top: 10px;">
                  <a href="${screenshotUrl}" target="_blank" class="screenshot-link-text">Open in new tab</a>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      </td>
    </tr>
  `;
  
  return `
    <tr data-status="${test.status}" data-priority="${test.priority || ''}" data-feature="${featureOrJira}" 
        data-test-id="${escapeHtml(test.id)}"
        class="test-row ${test.status.toLowerCase()} ${priorityClass}" 
        onclick="toggleTestDetail('${detailId}')" style="cursor: pointer;" title="Click to view/hide details">
      <td class="test-id" onclick="event.stopPropagation();"><span class="expand-icon">▼</span> ${escapeHtml(test.id)}</td>
      <td class="jira-id">${escapeHtml(featureOrJira)}</td>
      <td class="test-data">${escapeHtml(test.testData || 'N/A')}</td>
      <td class="scenario">${escapeHtml(test.scenarioDescription)}</td>
      <td class="status">${statusBadge}</td>
      <td class="issue-desc">${issueDescription}</td>
      <td class="error-details">${errorCell}</td>
      <td class="screenshot" onclick="event.stopPropagation();">${screenshotCell}</td>
      <td class="priority"><span class="priority-badge ${priorityClass}">${test.priority || 'N/A'}</span></td>
    </tr>
    ${testCaseDetails}
  `;
}

/**
 * Generate plain English issue description from error message
 */
function getPlainEnglishIssue(errorDetails: string, status: string): string {
  if (status === 'SKIPPED') {
    return 'Test was skipped (likely due to missing prerequisites or dependencies)';
  }
  
  if (!errorDetails || errorDetails.trim() === '') {
    return 'Test failed - no error details available';
  }
  
  const errorLower = errorDetails.toLowerCase();
  
  // Timeout and waiting issues
  if (errorLower.includes('timeout') || errorLower.includes('waiting') || errorLower.includes('exceeded')) {
    if (errorLower.includes('element') || errorLower.includes('locator')) {
      return 'Element did not appear on the page within the expected time - the page may be slow or the element selector may be incorrect';
    }
    if (errorLower.includes('navigation') || errorLower.includes('page')) {
      return 'Page navigation timed out - the page may be taking too long to load';
    }
    return 'Operation timed out - the system may be slow or unresponsive';
  }
  
  // Element not found issues
  if (errorLower.includes('not found') || errorLower.includes('not visible') || errorLower.includes('element not found')) {
    if (errorLower.includes('button') || errorLower.includes('click')) {
      return 'Button or clickable element was not found on the page - the page structure may have changed or the element is hidden';
    }
    if (errorLower.includes('field') || errorLower.includes('input')) {
      return 'Form field or input element was not found - the form may not be loaded or the field selector is incorrect';
    }
    return 'Expected element was not found on the page - the page structure may have changed';
  }
  
  // Authentication issues
  if (errorLower.includes('not logged in') || errorLower.includes('authentication') || errorLower.includes('session expired') || errorLower.includes('invalid_session')) {
    return 'User authentication failed or session expired - login credentials may be invalid or the session timed out';
  }
  
  // Clickability issues
  if (errorLower.includes('not clickable') || errorLower.includes('not enabled') || errorLower.includes('is not clickable')) {
    return 'Button or element was not clickable - it may be disabled, hidden, or covered by another element';
  }
  
  // API errors
  if (errorLower.includes('api') && (errorLower.includes('error') || errorLower.includes('failed'))) {
    if (errorLower.includes('401') || errorLower.includes('unauthorized')) {
      return 'API authentication failed - the access token may be expired or invalid';
    }
    if (errorLower.includes('403') || errorLower.includes('forbidden')) {
      return 'API access forbidden - the user may not have permission to perform this action';
    }
    if (errorLower.includes('404') || errorLower.includes('not found')) {
      return 'API endpoint not found - the URL or resource may be incorrect';
    }
    if (errorLower.includes('400') || errorLower.includes('bad request')) {
      return 'Invalid API request - the data sent to the server may be malformed or missing required fields';
    }
    if (errorLower.includes('500') || errorLower.includes('internal server error')) {
      return 'Server encountered an internal error - this is likely a server-side issue';
    }
    return 'API request failed - the server returned an error response';
  }
  
  // HTTP status codes
  if (errorLower.includes('status code 400')) {
    return 'Invalid data was sent to the server - check that all required fields are provided with valid values';
  }
  if (errorLower.includes('status code 401')) {
    return 'Authentication token expired or invalid - the user needs to re-authenticate';
  }
  if (errorLower.includes('status code 403')) {
    return 'User does not have permission to perform this action - check user roles and permissions';
  }
  if (errorLower.includes('status code 404')) {
    return 'Requested resource was not found - the URL or resource ID may be incorrect';
  }
  if (errorLower.includes('status code 500')) {
    return 'Server encountered an internal error - this is a server-side issue that needs investigation';
  }
  
  // Network issues
  if (errorLower.includes('network') || errorLower.includes('connection') || errorLower.includes('econnrefused')) {
    return 'Network connection failed or timed out - check internet connectivity or server availability';
  }
  
  // Validation issues
  if (errorLower.includes('validation') || errorLower.includes('required field') || errorLower.includes('required')) {
    return 'Required field validation failed - one or more required fields are missing or have invalid values';
  }
  
  // Multiple step definitions
  if (errorLower.includes('multiple step definitions') || errorLower.includes('ambiguous')) {
    return 'Multiple step definitions match the same step - there are duplicate step definitions that need to be consolidated';
  }
  
  // Undefined step
  if (errorLower.includes('undefined') || errorLower.includes('step definition')) {
    return 'Step definition is missing - the step needs to be implemented in the step definitions file';
  }
  
  // Browser/page issues
  if (errorLower.includes('browser') && (errorLower.includes('closed') || errorLower.includes('disconnected'))) {
    return 'Browser was closed or disconnected during test execution - the browser may have crashed or been closed unexpectedly';
  }
  
  // Target closed
  if (errorLower.includes('target closed') || errorLower.includes('target page') || errorLower.includes('context or browser has been closed')) {
    return 'Browser page or context was closed during test execution - this may be due to popup handling or browser cleanup';
  }
  
  // Return first meaningful sentence or first 150 chars
  const sentences = errorDetails.split(/[.!?]/).filter(s => s.trim().length > 20);
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    return firstSentence.length > 150 ? firstSentence.substring(0, 150) + '...' : firstSentence;
  }
  
  // Fallback to first 150 characters
  return errorDetails.length > 150 ? errorDetails.substring(0, 150) + '...' : errorDetails;
}

/**
 * Get unique features/JIRA IDs from tests
 */
function getUniqueFeatures(tests: TestResult[]): string[] {
  const features = new Set<string>();
  tests.forEach(test => {
    if (test.jiraId) features.add(test.jiraId);
    if (test.feature) features.add(test.feature);
  });
  return Array.from(features).sort();
}

/**
 * Calculate summary statistics
 */
function calculateSummary(tests: TestResult[]): any {
  return {
    total: tests.length,
    passed: tests.filter(t => t.status === 'PASSED').length,
    failed: tests.filter(t => t.status === 'FAILED').length,
    skipped: tests.filter(t => t.status === 'SKIPPED').length,
  };
}

/**
 * Get failed tests
 */
function getFailedTests(tests: TestResult[]): TestResult[] {
  return tests.filter(t => t.status === 'FAILED' || (t.priority && ['P1', 'P2'].includes(t.priority)));
}

/**
 * Format date time
 */
function formatDateTime(dateTime: string): string {
  try {
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return dateTime;
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Get embedded CSS
 */
function getCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .report-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .report-header h1 {
      font-size: 2.5em;
      margin-bottom: 20px;
    }
    
    .metadata {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
    }
    
    .metadata-item {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    
    .metadata-item .label {
      font-size: 0.9em;
      opacity: 0.9;
    }
    
    .metadata-item .value {
      font-size: 1.1em;
      font-weight: 600;
    }
    
    .summary-section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .summary-section h2 {
      margin-bottom: 20px;
      color: #333;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }
    
    .summary-card {
      padding: 25px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .summary-card.total {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .summary-card.passed {
      background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
      color: white;
    }
    
    .summary-card.failed {
      background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
      color: white;
    }
    
    .summary-card.skipped {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    
    .summary-value {
      font-size: 3em;
      font-weight: bold;
      margin-bottom: 10px;
    }
    
    .summary-label {
      font-size: 1.1em;
      opacity: 0.95;
    }
    
    .summary-percent {
      font-size: 1.2em;
      margin-top: 10px;
      opacity: 0.9;
    }
    
    .tabs-section {
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .tab-button {
      padding: 12px 24px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 1em;
      font-weight: 600;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.3s;
    }
    
    .tab-button:hover {
      color: #667eea;
    }
    
    .tab-button.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }
    
    .tab-content {
      display: none;
    }
    
    .tab-content.active {
      display: block;
    }
    
    .tab-summary {
      margin-bottom: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .tab-summary h3 {
      margin-bottom: 15px;
      color: #333;
    }
    
    .tab-summary-stats {
      display: flex;
      gap: 30px;
      flex-wrap: wrap;
    }
    
    .tab-summary-stats span {
      font-size: 1.1em;
    }
    
    .tab-summary-stats .passed {
      color: #11998e;
    }
    
    .tab-summary-stats .failed {
      color: #eb3349;
    }
    
    .tab-summary-stats .skipped {
      color: #f5576c;
    }
    
    .chart-container {
      margin: 30px 0;
      height: 300px;
      position: relative;
    }
    
    .table-section {
      margin-top: 40px;
    }
    
    .table-section h3 {
      margin-bottom: 20px;
      color: #333;
    }
    
    .table-controls {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    
    .search-box {
      flex: 1;
      min-width: 200px;
      padding: 10px;
      border: 2px solid #e0e0e0;
      border-radius: 5px;
      font-size: 1em;
    }
    
    .filter-select {
      padding: 10px;
      border: 2px solid #e0e0e0;
      border-radius: 5px;
      font-size: 1em;
      background: white;
      cursor: pointer;
    }
    
    .table-wrapper {
      overflow-x: auto;
    }
    
    .issues-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }
    
    .issues-table thead {
      background: #667eea;
      color: white;
    }
    
    .issues-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
    }
    
    .issues-table td {
      padding: 12px 15px;
      border-bottom: 1px solid #e0e0e0;
      color: #333;
    }
    
    .issues-table tbody tr:hover {
      background: #f8f9fa;
    }
    
    .test-id,
    .jira-id,
    .test-data,
    .scenario,
    .status,
    .issue-desc,
    .error-details,
    .screenshot,
    .priority {
      color: #333;
    }
    
    .issues-table tbody tr.hidden {
      display: none;
    }
    
    .error-cell {
      max-width: 500px;
      word-wrap: break-word;
      color: #eb3349;
      font-size: 0.85em;
    }
    
    .error-container {
      position: relative;
    }
    
    .error-text {
      background: #fff5f5;
      border: 1px solid #fecaca;
      border-radius: 4px;
      padding: 10px;
      margin: 5px 0;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      white-space: pre-wrap;
      word-wrap: break-word;
      max-height: 400px;
      overflow-y: auto;
      color: #991b1b;
    }
    
    .expand-error-btn,
    .collapse-error-btn {
      background: #667eea;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      margin-top: 5px;
      transition: background 0.2s;
    }
    
    .expand-error-btn:hover,
    .collapse-error-btn:hover {
      background: #5568d3;
    }
    
    .issue-description-cell {
      max-width: 300px;
      font-size: 0.9em;
      color: #333;
      line-height: 1.4;
    }
    
    .issue-description-cell strong {
      color: #eb3349;
      font-weight: 600;
    }
    
    .screenshot-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      padding: 5px;
    }
    
    .screenshot-thumb {
      max-width: 100px;
      max-height: 100px;
      border-radius: 4px;
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s;
      display: block;
    }
    
    .screenshot-thumb:hover {
      transform: scale(1.1);
    }
    
    .screenshot-link {
      font-size: 0.85em;
      text-align: center;
    }
    
    .screenshot-link-text {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    
    .screenshot-link-text:hover {
      text-decoration: underline;
    }
    
    .priority-badge {
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 0.9em;
      font-weight: 600;
      display: inline-block;
    }
    
    .priority-p1 {
      background: #eb3349;
      color: white;
    }
    
    .priority-p2 {
      background: #f45c43;
      color: white;
    }
    
    .priority-p3 {
      background: #f093fb;
      color: white;
    }
    
    .priority-p4 {
      background: #f5f5f5;
      color: #333;
    }
    
    .status-badge {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-badge.status-passed {
      background: #11998e;
      color: white;
    }
    
    .status-badge.status-failed {
      background: #eb3349;
      color: white;
    }
    
    .status-badge.status-skipped {
      background: #f5576c;
      color: white;
    }
    
    .no-screenshot,
    .no-error {
      color: #999;
      font-style: italic;
    }
    
    .test-row.passed {
      background: #f0fdf4;
    }
    
    .test-row.passed td {
      color: #166534;
    }
    
    .test-row.failed {
      background: #fef2f2;
    }
    
    .test-row.failed td {
      color: #991b1b;
    }
    
    .test-row.skipped {
      background: #fdf4ff;
    }
    
    .test-row.skipped td {
      color: #7c3aed;
    }
    
    .test-row:hover {
      background: #e8f4f8 !important;
    }
    
    .expand-icon {
      font-size: 0.8em;
      color: #667eea;
      margin-left: 5px;
      transition: transform 0.2s;
    }
    
    .test-detail-row {
      background: #f8f9fa;
    }
    
    .test-detail-cell {
      padding: 20px !important;
      background: #f8f9fa;
      border-top: 2px solid #667eea;
    }
    
    .test-detail-content {
      max-width: 1200px;
    }
    
    .test-detail-content h4 {
      color: #667eea;
      margin-bottom: 15px;
      font-size: 1.2em;
    }
    
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    
    .detail-item {
      padding: 10px;
      background: white;
      border-radius: 4px;
      border-left: 3px solid #667eea;
    }
    
    .detail-item.full-width {
      grid-column: 1 / -1;
    }
    
    .detail-item strong {
      color: #667eea;
      display: block;
      margin-bottom: 5px;
    }
    
    .detail-item p {
      margin: 5px 0 0 0;
      color: #333;
    }
    
    .screenshot-full {
      margin-top: 10px;
      text-align: center;
    }
    
    .screenshot-full-img {
      max-width: 100%;
      max-height: 600px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 10px;
    }
    
    .no-issues {
      text-align: center;
      padding: 40px;
      color: #11998e;
      font-size: 1.2em;
    }
    
    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }
      
      .metadata {
        grid-template-columns: 1fr;
      }
      
      .summary-grid {
        grid-template-columns: 1fr;
      }
      
      .table-controls {
        flex-direction: column;
      }
      
      .search-box,
      .filter-select {
        width: 100%;
      }
      
      .issues-table {
        font-size: 0.9em;
      }
      
      .issues-table th,
      .issues-table td {
        padding: 8px;
      }
    }
  `;
}

/**
 * Get embedded JavaScript
 */
function getJavaScript(results: TestResults, apiSummary: any, uiSummary: any, totalSummary: any): string {
  return `
    // Chart data
    const chartData = {
      all: ${JSON.stringify({
        labels: ['Passed', 'Failed', ...(totalSummary.skipped > 0 ? ['Skipped'] : [])],
        data: [totalSummary.passed, totalSummary.failed, ...(totalSummary.skipped > 0 ? [totalSummary.skipped] : [])],
        colors: ['#11998e', '#eb3349', ...(totalSummary.skipped > 0 ? ['#f5576c'] : [])]
      })},
      api: ${JSON.stringify({
        labels: ['Passed', 'Failed', ...(apiSummary.skipped > 0 ? ['Skipped'] : [])],
        data: [apiSummary.passed, apiSummary.failed, ...(apiSummary.skipped > 0 ? [apiSummary.skipped] : [])],
        colors: ['#11998e', '#eb3349', ...(apiSummary.skipped > 0 ? ['#f5576c'] : [])]
      })},
      ui: ${JSON.stringify({
        labels: ['Passed', 'Failed', ...(uiSummary.skipped > 0 ? ['Skipped'] : [])],
        data: [uiSummary.passed, uiSummary.failed, ...(uiSummary.skipped > 0 ? [uiSummary.skipped] : [])],
        colors: ['#11998e', '#eb3349', ...(uiSummary.skipped > 0 ? ['#f5576c'] : [])]
      })}
    };
    
    const charts = {};
    
    // Initialize charts
    function initCharts() {
      Object.keys(chartData).forEach(type => {
        const ctx = document.getElementById('chart-' + type);
        if (ctx) {
          charts[type] = new Chart(ctx, {
            type: 'pie',
            data: {
              labels: chartData[type].labels,
              datasets: [{
                data: chartData[type].data,
                backgroundColor: chartData[type].colors,
                borderWidth: 2,
                borderColor: '#fff'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 15,
                    font: {
                      size: 14
                    }
                  }
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label || '';
                      const value = context.parsed || 0;
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return label + ': ' + value + ' (' + percentage + '%)';
                    }
                  }
                }
              }
            }
          });
        }
      });
    }
    
    // Tab switching
    function showTab(tabName, buttonElement) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
      });
      document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Show selected tab
      const tabElement = document.getElementById('tab-' + tabName);
      if (tabElement) {
        tabElement.classList.add('active');
      }
      
      // Activate the button that was clicked
      if (buttonElement) {
        buttonElement.classList.add('active');
      } else {
        // Fallback: find button by tab name
        document.querySelectorAll('.tab-button').forEach(btn => {
          if (btn.textContent.trim().toLowerCase().includes(tabName.toLowerCase()) || 
              btn.getAttribute('onclick')?.includes("'" + tabName + "'")) {
            btn.classList.add('active');
    }
        });
      }
    }
    
    // Make showTab available globally with event handling
    window.showTab = function(tabName) {
      showTab(tabName, event ? event.target : null);
    };
    
    // Table filtering
    function filterTable(type) {
      const searchText = document.getElementById('search-' + type)?.value.toLowerCase() || '';
      const statusFilter = document.getElementById('filter-status-' + type)?.value || '';
      const priorityFilter = document.getElementById('filter-priority-' + type)?.value || '';
      const featureFilter = document.getElementById('filter-feature-' + type)?.value || '';
      
      const table = document.getElementById('table-' + type);
      if (!table) return;
      
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        // Skip detail rows in filtering
        if (row.classList.contains('test-detail-row')) {
          return;
        }
        
        const status = row.getAttribute('data-status') || '';
        const priority = row.getAttribute('data-priority') || '';
        const feature = row.getAttribute('data-feature') || '';
        const text = row.textContent.toLowerCase();
        
        const matchesSearch = !searchText || text.includes(searchText);
        const matchesStatus = !statusFilter || status === statusFilter;
        const matchesPriority = !priorityFilter || priority === priorityFilter;
        const matchesFeature = !featureFilter || feature === featureFilter;
        
        if (matchesSearch && matchesStatus && matchesPriority && matchesFeature) {
          row.classList.remove('hidden');
        } else {
          row.classList.add('hidden');
          // Also hide associated detail row
          const detailId = 'detail-' + row.querySelector('.test-id')?.textContent?.trim().replace(/[^a-z0-9]/gi, '-');
          if (detailId) {
            const detailRow = document.getElementById(detailId);
            if (detailRow) {
              detailRow.style.display = 'none';
            }
          }
        }
      });
    }
    
    // Toggle error details expand/collapse
    function toggleError(errorId) {
      const preview = document.getElementById('preview-' + errorId);
      const full = document.getElementById('full-' + errorId);
      
      if (preview && full) {
        if (preview.style.display === 'none') {
          preview.style.display = 'block';
          full.style.display = 'none';
        } else {
          preview.style.display = 'none';
          full.style.display = 'block';
        }
      }
    }
    
    // Toggle test case details
    function toggleTestDetail(detailId) {
      const detailRow = document.getElementById(detailId);
      if (detailRow) {
        if (detailRow.style.display === 'none') {
          detailRow.style.display = 'table-row';
        } else {
          detailRow.style.display = 'none';
        }
      }
    }
    
    // Navigate to a specific test case in a specific tab
    function navigateToTest(testId, tabName) {
      // Check if test exists in testResults
      if (typeof testResults === 'undefined' || !testResults || !testResults.tests) {
        console.warn('Test results not available');
        return;
      }
      
      const testExists = testResults.tests.some(function(t) { return t.id === testId; });
      if (!testExists) {
        console.warn('Test case not found: ' + testId);
        alert('Test case ' + testId + ' not found in the report.');
        return;
      }
      
      // Switch to the appropriate tab first
      showTab(tabName, null);
      
      // Wait for tab to be visible, then scroll to test
      setTimeout(function() {
        // Find the test row
        const testRowSelector = 'tr[data-test-id="' + testId + '"]';
        const testRow = document.querySelector(testRowSelector) ||
                       Array.from(document.querySelectorAll('.test-row')).find(function(row) {
                         const idCell = row.querySelector('.test-id');
                         return idCell && idCell.textContent.trim().includes(testId);
                       });
        
        if (testRow) {
          // Expand the test details if collapsed
          const detailId = 'detail-' + testId.replace(/[^a-z0-9]/gi, '-');
          const detailRow = document.getElementById(detailId);
          if (detailRow && detailRow.style.display === 'none') {
            toggleTestDetail(detailId);
          }
          
          // Scroll to the test row
          testRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Highlight the row briefly
          testRow.style.backgroundColor = '#fff3cd';
          setTimeout(function() {
            testRow.style.backgroundColor = '';
          }, 2000);
        }
      }, 100);
    }
    
    // Make functions available globally
    window.toggleError = toggleError;
    window.toggleTestDetail = toggleTestDetail;
    window.navigateToTest = navigateToTest;
    
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      initCharts();
    });
  `;
}

/**
 * Generate work item level reports
 */
function generateWorkItemReports(results: TestResults, outputDir: string): void {
  // Group tests by Jira ID
  const testsByJiraId = new Map<string, TestResult[]>();
  
  for (const test of results.tests) {
    const jiraId = test.jiraId || test.feature || 'UNKNOWN';
    if (!testsByJiraId.has(jiraId)) {
      testsByJiraId.set(jiraId, []);
    }
    testsByJiraId.get(jiraId)!.push(test);
  }
  
  console.log(`\n📊 Generating ${testsByJiraId.size} work item level reports...`);
  
  // Generate report for each work item
  for (const [jiraId, tests] of testsByJiraId.entries()) {
    const workItemResults: TestResults = {
      ...results,
      tests: tests,
    };
    
    const safeJiraId = jiraId.replace(/[^a-zA-Z0-9-]/g, '_');
    const outputFile = path.join(outputDir, `test-report-${safeJiraId}.html`);
    
    generateReport(workItemResults, outputFile);
    console.log(`  ✅ ${jiraId}: ${tests.length} test(s) → ${outputFile}`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const inputFile = args[0] || path.join(__dirname, '../reports/test-results.json');
  const outputFile = args[1] || path.join(__dirname, '../reports/test-report.html');
  
  // Check for report type flag
  const reportType = args.find(arg => arg === '--overall' || arg === '--work-item' || arg === '--both');
  const isOverall = !reportType || reportType === '--overall' || reportType === '--both';
  const isWorkItem = reportType === '--work-item' || reportType === '--both';
  
  console.log(`📊 Test Execution Report Generator`);
  console.log(`📁 Reading: ${inputFile}`);
  
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: Input file not found: ${inputFile}`);
    console.log(`💡 Tip: Create a test-results.json file with the required schema.`);
    process.exit(1);
  }
  
  try {
    const jsonContent = fs.readFileSync(inputFile, 'utf-8');
    const results: TestResults = JSON.parse(jsonContent);
    
    // Validate required fields
    if (!results.runDateTime || !results.environmentName || !results.tests) {
      throw new Error('Invalid JSON schema. Missing required fields.');
    }
    
    const outputDir = path.dirname(outputFile);
    
    // Generate overall report
    if (isOverall) {
      console.log(`\n📊 Generating overall report...`);
      generateReport(results, outputFile);
      console.log(`✅ Overall report generated: ${outputFile}`);
    }
    
    // Generate work item level reports
    if (isWorkItem) {
      generateWorkItemReports(results, outputDir);
    }
    
    if (!isOverall && !isWorkItem) {
      console.log(`\n⚠️  No report type specified. Use --overall, --work-item, or --both`);
      console.log(`💡 Generating overall report by default...`);
      generateReport(results, outputFile);
      console.log(`✅ Report generated: ${outputFile}`);
    }
    
    console.log(`\n✅ Report generation complete!`);
    
  } catch (error: any) {
    console.error(`❌ Error generating report: ${error.message}`);
    if (error instanceof SyntaxError) {
      console.error(`   Invalid JSON format in ${inputFile}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { generateReport, TestResults, TestResult };

