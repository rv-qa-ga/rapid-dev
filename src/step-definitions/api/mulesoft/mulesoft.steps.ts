/**
 * MuleSoft Anypoint Platform API Step Definitions
 * Provides steps for retrieving and analyzing application logs
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { MuleSoftAPIClient } from '../../../api-clients/mulesoft/MuleSoftAPIClient';
import { logger } from '../../../utils/logger';

// ============================================================================
// AUTHENTICATION STEPS
// ============================================================================

Given('I have a valid MuleSoft API token', async function (this: AutomationWorld) {
  if (!this.apiContext) {
    throw new Error('API context not initialized. Ensure Before hook has run.');
  }

  const apiClient = new MuleSoftAPIClient(this.apiContext);
  await apiClient.authenticate();
  this.testContext.apiClient = apiClient;
  logger.info('MuleSoft API client authenticated and ready');
});

// ============================================================================
// APPLICATION STEPS
// ============================================================================

When('I list all MuleSoft applications', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
  }

  const applications = await apiClient.listApplications();
  this.testContext.mulesoftApplications = applications;
  logger.info(`Found ${applications.length} MuleSoft applications`);
});

Then('the MuleSoft applications list should have at least {int} entries', async function (this: AutomationWorld, min: number) {
  const apps = this.testContext.mulesoftApplications as unknown[] | undefined;
  if (!apps) {
    throw new Error('No applications in context. Run "When I list all MuleSoft applications" first.');
  }
  if (apps.length < min) {
    throw new Error(`Expected at least ${min} MuleSoft application(s), found ${apps.length}`);
  }
  logger.info(`✅ MuleSoft application list has ${apps.length} entr(y/ies) (minimum ${min})`);
});

When('I get the MuleSoft application {string}', async function (this: AutomationWorld, applicationName: string) {
  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
  }

  const application = await apiClient.getApplication(applicationName);
  this.testContext.mulesoftApplication = application;
  this.testContext.mulesoftApplicationName = applicationName;
  logger.info(`Retrieved MuleSoft application: ${applicationName}`);
});

// ============================================================================
// LOG RETRIEVAL STEPS
// ============================================================================

When('I get logs for the MuleSoft application {string}', async function (this: AutomationWorld, applicationName: string) {
  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
  }

  const logResponse = await apiClient.getApplicationLogs(applicationName);
  this.testContext.mulesoftLogs = logResponse.data || [];
  this.testContext.mulesoftLogResponse = logResponse;
  this.testContext.mulesoftApplicationName = applicationName;
  logger.info(`Retrieved ${logResponse.data?.length || 0} log entries for application: ${applicationName}`);
});

When(
  'I get logs for the MuleSoft application {string} with level {string}',
  async function (this: AutomationWorld, applicationName: string, level: string) {
    const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
    if (!apiClient) {
      throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
    }

    const logResponse = await apiClient.getApplicationLogs(applicationName, { level });
    this.testContext.mulesoftLogs = logResponse.data || [];
    this.testContext.mulesoftLogResponse = logResponse;
    this.testContext.mulesoftApplicationName = applicationName;
    logger.info(`Retrieved ${logResponse.data?.length || 0} ${level} log entries for application: ${applicationName}`);
  }
);

When(
  'I search logs for {string} in the MuleSoft application {string}',
  async function (this: AutomationWorld, searchText: string, applicationName: string) {
    const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
    if (!apiClient) {
      throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
    }

    const logs = await apiClient.searchLogs(applicationName, searchText);
    this.testContext.mulesoftLogs = logs;
    this.testContext.mulesoftApplicationName = applicationName;
    this.testContext.mulesoftSearchText = searchText;
    logger.info(`Found ${logs.length} log entries containing "${searchText}" in application: ${applicationName}`);
  }
);

When('I search for errors in the MuleSoft application {string}', async function (this: AutomationWorld, applicationName: string) {
  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
  }

  const errors = await apiClient.searchErrors(applicationName);
  this.testContext.mulesoftLogs = errors;
  this.testContext.mulesoftApplicationName = applicationName;
  logger.info(`Found ${errors.length} error log entries in application: ${applicationName}`);
});

When(
  'I search logs for the stored Salesforce account name in the MuleSoft application {string}',
  async function (this: AutomationWorld, applicationName: string) {
    const accountName = this.testContext.accountName;
    if (!accountName || typeof accountName !== 'string') {
      throw new Error(
        'testContext.accountName is missing. Create a Salesforce Account first (e.g. "Given I have a test Account created via API with Type ...").'
      );
    }

    const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
    if (!apiClient) {
      throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
    }

    const logs = await apiClient.searchLogs(applicationName, accountName);
    this.testContext.mulesoftLogs = logs;
    this.testContext.mulesoftApplicationName = applicationName;
    this.testContext.mulesoftSearchText = accountName;
    logger.info(
      `Found ${logs.length} MuleSoft log entries containing account name "${accountName}" in application: ${applicationName}`
    );
  }
);

When(
  'I get logs by correlation ID {string} for the MuleSoft application {string}',
  async function (this: AutomationWorld, correlationId: string, applicationName: string) {
    const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
    if (!apiClient) {
      throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
    }

    const logs = await apiClient.getLogsByCorrelationId(applicationName, correlationId);
    this.testContext.mulesoftLogs = logs;
    this.testContext.mulesoftApplicationName = applicationName;
    this.testContext.mulesoftCorrelationId = correlationId;
    logger.info(`Found ${logs.length} log entries for correlation ID "${correlationId}" in application: ${applicationName}`);
  }
);

When('I download the log file for the MuleSoft application {string}', async function (this: AutomationWorld, applicationName: string) {
  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized. Use "Given I have a valid MuleSoft API token" first.');
  }

  const logFile = await apiClient.downloadApplicationLogFile(applicationName);
  this.testContext.mulesoftLogFile = logFile;
  this.testContext.mulesoftApplicationName = applicationName;
  logger.info(`Downloaded log file for application: ${applicationName} (${logFile.length} characters)`);
});

// ============================================================================
// VERIFICATION STEPS
// ============================================================================

Then('the MuleSoft application should exist', async function (this: AutomationWorld) {
  const application = this.testContext.mulesoftApplication;
  if (!application) {
    throw new Error('No MuleSoft application in context. Use "When I get the MuleSoft application {string}" first.');
  }
  logger.info(`✅ MuleSoft application exists: ${application.name}`);
});

Then('the MuleSoft application status should be {string}', async function (this: AutomationWorld, expectedStatus: string) {
  const application = this.testContext.mulesoftApplication;
  if (!application) {
    throw new Error('No MuleSoft application in context. Use "When I get the MuleSoft application {string}" first.');
  }

  const actualStatus = application.status?.toLowerCase();
  const expected = expectedStatus.toLowerCase();

  if (actualStatus !== expected) {
    throw new Error(`Expected application status to be "${expectedStatus}" but got "${application.status}"`);
  }

  logger.info(`✅ Application status is "${expectedStatus}"`);
});

Then('the MuleSoft logs should contain {int} entries', async function (this: AutomationWorld, expectedCount: number) {
  const logs = this.testContext.mulesoftLogs || [];
  const actualCount = logs.length;

  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} log entries but found ${actualCount}`);
  }

  logger.info(`✅ Found ${actualCount} log entries as expected`);
});

Then('the MuleSoft logs should contain at least {int} entries', async function (this: AutomationWorld, minCount: number) {
  const logs = this.testContext.mulesoftLogs || [];
  const actualCount = logs.length;

  if (actualCount < minCount) {
    throw new Error(`Expected at least ${minCount} log entries but found ${actualCount}`);
  }

  logger.info(`✅ Found ${actualCount} log entries (minimum: ${minCount})`);
});

Then('the MuleSoft logs should contain the text {string}', async function (this: AutomationWorld, searchText: string) {
  const logs = this.testContext.mulesoftLogs || [];

  const found = logs.some((log: any) => {
    const message = log.message || '';
    const logger = log.logger || '';
    return message.includes(searchText) || logger.includes(searchText);
  });

  if (!found) {
    throw new Error(`Expected to find "${searchText}" in logs but it was not found`);
  }

  logger.info(`✅ Found "${searchText}" in logs`);
});

Then('the MuleSoft logs should not contain the text {string}', async function (this: AutomationWorld, searchText: string) {
  const logs = this.testContext.mulesoftLogs || [];

  const found = logs.some((log: any) => {
    const message = log.message || '';
    const logger = log.logger || '';
    return message.includes(searchText) || logger.includes(searchText);
  });

  if (found) {
    throw new Error(`Expected not to find "${searchText}" in logs but it was found`);
  }

  logger.info(`✅ Confirmed "${searchText}" is not in logs`);
});

Then('the MuleSoft application should have errors', async function (this: AutomationWorld) {
  const applicationName = this.testContext.mulesoftApplicationName;
  if (!applicationName) {
    throw new Error('No MuleSoft application name in context.');
  }

  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized.');
  }

  const hasErrors = await apiClient.hasErrors(applicationName);
  if (!hasErrors) {
    throw new Error(`Expected application ${applicationName} to have errors but none were found`);
  }

  logger.info(`✅ Application ${applicationName} has errors`);
});

Then('the MuleSoft application should not have errors', async function (this: AutomationWorld) {
  const applicationName = this.testContext.mulesoftApplicationName;
  if (!applicationName) {
    throw new Error('No MuleSoft application name in context.');
  }

  const apiClient = this.testContext.apiClient as MuleSoftAPIClient;
  if (!apiClient) {
    throw new Error('MuleSoft API client not initialized.');
  }

  const hasErrors = await apiClient.hasErrors(applicationName);
  if (hasErrors) {
    throw new Error(`Expected application ${applicationName} to have no errors but errors were found`);
  }

  logger.info(`✅ Application ${applicationName} has no errors`);
});

Then('the MuleSoft log file should contain {string}', async function (this: AutomationWorld, searchText: string) {
  const logFile = this.testContext.mulesoftLogFile;
  if (!logFile) {
    throw new Error('No log file in context. Use "When I download the log file for the MuleSoft application {string}" first.');
  }

  if (!logFile.includes(searchText)) {
    throw new Error(`Expected to find "${searchText}" in log file but it was not found`);
  }

  logger.info(`✅ Found "${searchText}" in log file`);
});

Then('the MuleSoft log file should not contain {string}', async function (this: AutomationWorld, searchText: string) {
  const logFile = this.testContext.mulesoftLogFile;
  if (!logFile) {
    throw new Error('No log file in context. Use "When I download the log file for the MuleSoft application {string}" first.');
  }

  if (logFile.includes(searchText)) {
    throw new Error(`Expected not to find "${searchText}" in log file but it was found`);
  }

  logger.info(`✅ Confirmed "${searchText}" is not in log file`);
});
