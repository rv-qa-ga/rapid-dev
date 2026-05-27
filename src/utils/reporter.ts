import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { config } from '../config/config';
import { AutomationWorld } from '../hooks/world';

export interface TestExecutionInfo {
  environment: string;
  baseUrl: string;
  username?: string;
  userProfile?: string;
  userPermissions?: string[];
  testDataId?: string;
  timestamp: string;
  testCaseId?: string;
  jiraKey?: string;
}

export interface FailureReason {
  scenario: string;
  step: string;
  reason: string;
  screenshot?: string;
  testDataId?: string;
}

export class Reporter {
  private executionInfo: TestExecutionInfo;
  private failures: FailureReason[] = [];
  private reportDir: string;
  private archiveDir: string;

  constructor() {
    this.reportDir = path.join(process.cwd(), 'reports', 'html');
    this.archiveDir = path.join(process.cwd(), 'reports', 'archive');
    this.ensureDirectories();
    this.executionInfo = this.buildExecutionInfo();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  /**
   * Build execution information
   */
  private buildExecutionInfo(): TestExecutionInfo {
    const env = config.getEnvironment();
    const sfConfig = config.getSalesforceConfig();
    const username = process.env.SF_USERNAME || process.env.SF_JWT_USERNAME;

    return {
      environment: env,
      baseUrl: sfConfig.baseUrl,
      username: username,
      userPermissions: [], // Will be populated during test execution
      timestamp: new Date().toISOString(),
    };
  }

  setEnvironmentContext(details: {
    environment?: string;
    baseUrl?: string;
    username?: string;
    userProfile?: string;
    userId?: string;
    profileId?: string;
    userRole?: string;
    requestedRole?: string;
  }): void {
    this.executionInfo = {
      ...this.executionInfo,
      ...details,
    };
  }

  /**
   * Archive existing reports
   */
  archiveExistingReports(): void {
    logger.info('Archiving existing reports...');

    if (!fs.existsSync(this.reportDir)) {
      return;
    }

    const files = fs.readdirSync(this.reportDir);
    if (files.length === 0) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveSubDir = path.join(this.archiveDir, `report-${timestamp}`);

    if (!fs.existsSync(archiveSubDir)) {
      fs.mkdirSync(archiveSubDir, { recursive: true });
    }

    files.forEach((file) => {
      const sourcePath = path.join(this.reportDir, file);
      const destPath = path.join(archiveSubDir, file);

      try {
        fs.copyFileSync(sourcePath, destPath);
        fs.unlinkSync(sourcePath);
        logger.debug(`Archived: ${file}`);
      } catch (error: any) {
        logger.warn(`Failed to archive ${file}: ${error.message}`);
      }
    });

    logger.info(`Archived ${files.length} file(s) to ${archiveSubDir}`);
  }

  /**
   * Record failure reason
   */
  recordFailure(
    scenario: string,
    step: string,
    error: Error,
    testDataId?: string,
    screenshot?: string
  ): void {
    const reason = this.simplifyError(error);
    this.failures.push({
      scenario,
      step,
      reason,
      screenshot,
      testDataId,
    });
  }

  /**
   * Simplify error message to simple English
   */
  private simplifyError(error: Error): string {
    const message = error.message.toLowerCase();

    // Common error patterns and their simple explanations
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

    // Default: return first sentence of error
    const firstSentence = error.message.split('.')[0];
    return firstSentence.length > 100
      ? firstSentence.substring(0, 100) + '...'
      : firstSentence;
  }

  /**
   * Get failure summary table HTML
   */
  getFailureSummaryTable(): string {
    if (this.failures.length === 0) {
      return '<p>✅ No failures - All tests passed!</p>';
    }

    let table = '<h3>Failure Summary</h3>';
    table += '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
    table += '<thead><tr>';
    table += '<th>Scenario</th>';
    table += '<th>Step</th>';
    table += '<th>Reason</th>';
    table += '<th>Test Data ID</th>';
    table += '<th>Screenshot</th>';
    table += '</tr></thead>';
    table += '<tbody>';

    this.failures.forEach((failure) => {
      table += '<tr>';
      table += `<td>${this.escapeHtml(failure.scenario)}</td>`;
      table += `<td>${this.escapeHtml(failure.step)}</td>`;
      table += `<td>${this.escapeHtml(failure.reason)}</td>`;
      table += `<td>${failure.testDataId || 'N/A'}</td>`;
      if (failure.screenshot) {
        table += `<td><a href="${failure.screenshot}" target="_blank">View</a></td>`;
      } else {
        table += '<td>N/A</td>';
      }
      table += '</tr>';
    });

    table += '</tbody></table>';
    return table;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get execution info HTML
   */
  getExecutionInfoHTML(): string {
    const info = this.executionInfo;
    let html = '<div style="background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px;">';
    html += '<h3>Execution Information</h3>';
    html += '<table border="0" cellpadding="5">';
    html += `<tr><td><strong>Environment:</strong></td><td>${info.environment.toUpperCase()}</td></tr>`;
    html += `<tr><td><strong>Base URL:</strong></td><td><a href="${info.baseUrl}" target="_blank">${info.baseUrl}</a></td></tr>`;
    html += `<tr><td><strong>Username:</strong></td><td>${info.username || 'N/A'}</td></tr>`;
    html += `<tr><td><strong>User Permissions:</strong></td><td>${info.userPermissions?.join(', ') || 'N/A'}</td></tr>`;
    html += `<tr><td><strong>Execution Time:</strong></td><td>${new Date(info.timestamp).toLocaleString()}</td></tr>`;
    html += `<tr><td><strong>Test Data ID:</strong></td><td>${info.testDataId || 'N/A'}</td></tr>`;
    if (info.jiraKey) {
      html += `<tr><td><strong>Jira Work Item:</strong></td><td>${info.jiraKey}</td></tr>`;
    }
    html += '</table>';
    html += '</div>';
    return html;
  }

  /**
   * Set test data ID
   */
  setTestDataId(testDataId: string): void {
    this.executionInfo.testDataId = testDataId;
  }

  /**
   * Set Jira key
   */
  setJiraKey(jiraKey: string): void {
    this.executionInfo.jiraKey = jiraKey;
  }

  /**
   * Set user permissions
   */
  setUserPermissions(permissions: string[]): void {
    this.executionInfo.userPermissions = permissions;
  }

  /**
   * Get failures
   */
  getFailures(): FailureReason[] {
    return this.failures;
  }

  /**
   * Get execution info
   */
  getExecutionInfo(): TestExecutionInfo {
    return this.executionInfo;
  }
}

// Global reporter instance
export const reporter = new Reporter();

