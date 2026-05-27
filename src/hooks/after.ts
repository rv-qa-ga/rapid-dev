import { After, AfterAll, AfterStep } from '@cucumber/cucumber';
import { AutomationWorld } from './world';
import { logger } from '../utils/logger';
import { reporter } from '../utils/reporter';
import { progressTracker } from '../utils/progress-tracker';
import { SalesforceStreamingClient } from '../utils/salesforce-streaming-client';
import * as path from 'path';
import * as fs from 'fs';

AfterStep(async function (this: AutomationWorld, step: any) {
  // Track step completion
  const stepText = step.pickleStep?.text || 'Unknown step';
  const stepResult = step.result?.status || 'PASSED';
  const status = stepResult === 'PASSED' ? 'PASSED' : stepResult === 'FAILED' ? 'FAILED' : 'SKIPPED';
  progressTracker.endStep(stepText, status);
  
  // Take screenshot on demand if requested
  const takeScreenshot = process.env.TAKE_SCREENSHOTS === 'true' || 
                         process.env.CAPTURE_EVIDENCE === 'true' ||
                         this.testContext.takeScreenshot === true;

  if (takeScreenshot && this.page) {
    const screenshotDir = path.join(process.cwd(), 'reports', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const stepName = step.pickleStep?.text?.substring(0, 50).replace(/[^a-z0-9]/gi, '_') || 'step';
    const screenshotPath = path.join(
      screenshotDir,
      `${stepName}-${timestamp}.png`
    );
    
    try {
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      this.addScreenshot(screenshotPath);
      logger.info(`Evidence screenshot saved: ${screenshotPath}`);
    } catch (error) {
      logger.error(`Failed to take evidence screenshot: ${error}`);
    }
  }
});

After(async function (this: AutomationWorld, scenario: any) {
  const scenarioName = scenario.pickle.name;
  const scenarioResult = scenario.result?.status || 'PASSED';
  const status = scenarioResult === 'PASSED' ? 'PASSED' : scenarioResult === 'FAILED' ? 'FAILED' : 'SKIPPED';
  
  // Track scenario end
  progressTracker.endScenario(scenarioName, status);
  
  const testDataId = this.testContext.testDataId || this.testContext.testData?.TestCaseID;
  const scenarioTags = scenario.pickle?.tags?.map((tag: any) => tag.name) || [];
  const isUITest = scenarioTags.some((tag: string) => tag === '@ui');

  // Record test data ID
  if (testDataId) {
    reporter.setTestDataId(testDataId);
  }

  // Record Jira key if available
  const jiraTag = scenarioTags.find((tag: string) => /^@[A-Z]+-\d+$/.test(tag));
  if (jiraTag) {
    reporter.setJiraKey(jiraTag.substring(1));
  }

  // Extract test case ID from tags
  // Formats supported:
  //   - UI:  @SF-520-UI-001  -> SF-520-UI-001
  //   - API: @SF-520-API-001 -> SF-520-API-001
  let testCaseId: string | undefined;
  const testCaseTag = scenarioTags.find((tag: string) => /^@[A-Z]+-\d+-(UI|API)-\d+$/.test(tag));
  if (testCaseTag) {
    testCaseId = testCaseTag.substring(1); // Remove @ symbol
  } else if (jiraTag) {
    // Fallback: try to generate from scenario ID if we have Jira ID
    // Determine if this is UI or API based on tags
    const isApiTest = scenarioTags.some((tag: string) => tag === '@api');
    const testType = isApiTest ? 'API' : 'UI';
    const scenarioId = scenario.pickle?.id || '';
    const idPart = scenarioId.split(';').pop() || '001';
    const paddedId = idPart.padStart(3, '0');
    testCaseId = `${jiraTag.substring(1)}-${testType}-${paddedId}`;
  }
  
  // Store test case ID in context for report generation
  if (testCaseId) {
    this.testContext.testCaseId = testCaseId;
  }

  // UI evidence: prefer explicit "screenshot as evidence" step (attaches to Cucumber); avoid duplicate/misleading After captures.
  // Skip After screenshot for @manual (often no app URL) and when the scenario already ends with an evidence screenshot step.
  // Salesforce Lightning: fullPage captures are often mostly blank; use viewport for @salesforce.
  let takeScreenshot = false;
  const isManualUi = scenarioTags.some((tag: string) => tag === '@manual');
  const pickleSteps = scenario.pickle?.steps || [];
  const hasExplicitScreenshotEvidence = pickleSteps.some(
    (s: { text?: string }) =>
      typeof s.text === 'string' &&
      s.text.toLowerCase().includes('screenshot') &&
      s.text.toLowerCase().includes('evidence')
  );

  if (isUITest) {
    try {
      if (this.page && !this.page.isClosed()) {
        if (isManualUi) {
          logger.debug(`Skipping After screenshot: @manual scenario (${scenarioName})`);
        } else if (hasExplicitScreenshotEvidence && status === 'PASSED') {
          logger.debug(
            `Skipping After screenshot: scenario passed and already includes explicit evidence step (${scenarioName})`
          );
        } else {
          // Failure before evidence step, or no explicit step: capture for Zephyr/Confluence
          takeScreenshot = true;
        }
      } else if (this.page?.isClosed()) {
        logger.warn(`Cannot take screenshot: page is closed for scenario: ${scenarioName}`);
      } else {
        logger.warn(`Cannot take screenshot: page not initialized for scenario: ${scenarioName}`);
      }
    } catch (error: any) {
      logger.warn(`Cannot take screenshot: ${error.message}`);
    }
  }
  
  if (takeScreenshot) {
    const screenshotDir = path.join(process.cwd(), 'reports', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const status = scenario.result?.status || 'UNKNOWN';
    
    // Build screenshot filename with test case ID if available
    // Format: SF-520-001-ScenarioName-STATUS-timestamp.png
    let screenshotFileName: string;
    if (testCaseId) {
      const sanitizedName = scenarioName.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
      screenshotFileName = `${testCaseId}-${sanitizedName}-${status}-${timestamp}.png`;
    } else {
      // Fallback to old naming if test case ID not available
      const sanitizedName = scenarioName.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
      screenshotFileName = `${sanitizedName}-${status}-${timestamp}.png`;
    }
    
    const screenshotPath = path.join(screenshotDir, screenshotFileName);
    
    try {
      // Double-check page is still available before taking screenshot
      if (!this.page || this.page.isClosed()) {
        logger.warn(`Page closed before screenshot could be taken for: ${scenarioName}`);
        throw new Error('Page is closed');
      }
      
      const isSalesforceUi = scenarioTags.some((tag: string) => tag === '@salesforce');
      const shotUrl = (() => {
        try {
          return this.page!.url();
        } catch {
          return '';
        }
      })();
      const looksLikeSalesforce = isSalesforceUi || /salesforce\.com|force\.com|site\.com/i.test(shotUrl);

      // Take screenshot with error handling
      await this.page.screenshot({
        path: screenshotPath,
        // Lightning record pages often render a huge scrollable shell; fullPage yields empty gray bands in evidence.
        fullPage: !looksLikeSalesforce,
        timeout: 15000,
      });
      
      // Verify screenshot file was created
      if (!fs.existsSync(screenshotPath)) {
        throw new Error(`Screenshot file was not created: ${screenshotPath}`);
      }
      
      // Add screenshot to Cucumber attachments for report linking
      const relativePath = path.relative(process.cwd(), screenshotPath).replace(/\\/g, '/');
      this.addScreenshot(screenshotPath);
      
      // Attach screenshot to Cucumber report using the World's attach method
      // This ensures screenshots appear in the HTML report
      try {
        const screenshotBuffer = fs.readFileSync(screenshotPath);
        // Use the attach method from Cucumber World context
        if (typeof (this as any).attach === 'function') {
          await (this as any).attach(screenshotBuffer, 'image/png');
          logger.info(`✅ Screenshot attached to Cucumber report: ${relativePath}`);
        } else {
          // Fallback: just log the screenshot path for report generator to find
          logger.info(`📸 Screenshot saved for report: ${relativePath}`);
        }
      } catch (attachError: any) {
        logger.warn(`⚠️  Failed to attach screenshot to Cucumber report: ${attachError.message}`);
        // Continue - screenshot file exists and can be found by report generator
      }
      
      // Store screenshot path in test context for report generation
      if (!this.testContext.screenshots) {
        this.testContext.screenshots = [];
      }
      this.testContext.screenshots.push({
        path: relativePath,
        fullPath: screenshotPath,
        status: status,
        scenario: scenarioName
      });
      
      logger.info(`Evidence screenshot saved: ${relativePath} (Status: ${status})`);
      
      // If failed, also record failure with screenshot
      if (status === 'FAILED') {
        const failedStep = scenario.result?.message || 'Unknown step';
        reporter.recordFailure(
          scenarioName,
          failedStep,
          new Error(scenario.result?.message || 'Test failed'),
          testDataId,
          relativePath
        );
      }
    } catch (error: any) {
      logger.error(`Failed to take screenshot: ${error.message}`);
      
      // If failed, still record failure without screenshot
      if (scenario.result?.status === 'FAILED') {
        reporter.recordFailure(
          scenarioName,
          scenario.result?.message || 'Unknown step',
          new Error(scenario.result?.message || 'Test failed'),
          testDataId
        );
      }
    }
  } else if (scenario.result?.status === 'FAILED') {
    // Record failure even without screenshot (API test or page closed)
    reporter.recordFailure(
      scenarioName,
      scenario.result?.message || 'Unknown step',
      new Error(scenario.result?.message || 'Test failed'),
      testDataId
    );
  }

  // PERFORMANCE OPTIMIZED: Skip logout - browser context is closing anyway
  // Logout is unnecessary overhead since we're closing the context
  // Removed logout to save ~1-2 seconds per scenario

  // NOTE: Test data cleanup is now ONLY done in AfterAll hook
  // This prevents scenarios from deleting data that other scenarios need
  // Each scenario creates its own account via Background step, and all are cleaned up at the end
  // Scenarios tagged @persist-data: mark created records as persistent so AfterAll skips cleanup (for E2E validation in other systems)
  // SF769_SKIP_CLEANUP=true + @SF-769: same behavior (keep Accounts/MLER in org while debugging Group API vs UI / Mule)
  const persistData = scenarioTags.some((tag: string) => tag === '@persist-data');
  const sf769KeepData =
    process.env.SF769_SKIP_CLEANUP === 'true' &&
    scenarioTags.some((tag: string) => tag === '@SF-769');
  if (persistData || sf769KeepData) {
    try {
      const { testDataFactory } = await import('../test-data/TestDataFactory');
      const records = testDataFactory.getCreatedRecords();
      for (const record of records) {
        testDataFactory.markAsPersistent(record.id);
      }
      if (records.length > 0) {
        if (sf769KeepData && !persistData) {
          logger.info(
            `📌 Marked ${records.length} record(s) as PERSISTENT (SF769_SKIP_CLEANUP=true, @SF-769) — skipping delete for root-cause analysis`
          );
        } else {
          logger.info(
            `📌 Marked ${records.length} record(s) as PERSISTENT (@persist-data) - data will not be deleted for E2E validation`
          );
        }
      }
    } catch (e: any) {
      logger.warn(`Could not mark records persistent: ${e?.message || e}`);
    }
  }
  logger.debug('Skipping per-scenario test data cleanup (will be done in AfterAll)');

  // Cleanup streaming client if it exists
  const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
  if (streamingClient) {
    try {
      await streamingClient.disconnect();
      logger.debug('Disconnected streaming client');
    } catch (error: any) {
      logger.warn(`Failed to disconnect streaming client: ${error.message}`);
    }
    this.testContext.streamingClient = null;
  }

  // Cleanup - close context only (browser is shared and reused)
  await this.cleanup();
  
  // Clear test context (but keep testDataId for reporting)
  const savedTestDataId = this.testContext.testDataId;
  this.testContext = {};
  if (savedTestDataId) {
    this.testContext.testDataId = savedTestDataId;
  }
  this.screenshots = [];
  this.attachments = [];
});

AfterAll(async function () {
  logger.info('=== Test Suite Completed ===');
  
  // UAT Smoke: do NOT delete test data - leave it in the environment
  const env = (process.env.ENV || '').toLowerCase();
  if (env === 'uat') {
    try {
      const { testDataFactory } = await import('../test-data/TestDataFactory');
      const records = testDataFactory.getCreatedRecords();
      if (records.length > 0) {
        logger.info(`📌 UAT Smoke: leaving ${records.length} record(s) in the environment (no cleanup)`);
        records.forEach(r => logger.info(`   - ${r.type}: ${r.id} (${r.name})`));
      }
    } catch (e: any) {
      logger.debug(`UAT skip-cleanup check: ${e?.message || e}`);
    }
  } else {
    // FINAL CLEANUP: Ensure all test data is deleted (safety net) - non-UAT only
    try {
      const { testDataFactory } = await import('../test-data/TestDataFactory');
      const records = testDataFactory.getCreatedRecords();
      if (records.length > 0) {
        logger.warn(`⚠️  Found ${records.length} remaining test records - performing final cleanup`);
        await testDataFactory.cleanup();
        
        // Verify cleanup completed - check again after cleanup
        const remainingRecords = testDataFactory.getCreatedRecords();
        if (remainingRecords.length > 0) {
          logger.error(`❌ Cleanup incomplete: ${remainingRecords.length} records still remain after cleanup attempt`);
          logger.error(`Remaining records: ${remainingRecords.map(r => `${r.type}:${r.id} (${r.name})`).join(', ')}`);
        } else {
          logger.info(`✅ Final test data cleanup complete - all ${records.length} records deleted`);
        }
      } else {
        logger.debug('No test records to clean up');
      }
    } catch (cleanupError: any) {
      logger.error(`❌ Failed to perform final cleanup: ${cleanupError.message}`);
      logger.error(`Stack trace: ${cleanupError.stack}`);
      
      // Try to get records even if cleanup failed, for manual cleanup
      try {
        const { testDataFactory } = await import('../test-data/TestDataFactory');
        const records = testDataFactory.getCreatedRecords();
        if (records.length > 0) {
          logger.error(`⚠️  ${records.length} records remain that need manual cleanup:`);
          records.forEach(r => {
            logger.error(`  - ${r.type}: ${r.id} (${r.name})`);
          });
        }
      } catch (error: any) {
        logger.error(`❌ Could not retrieve remaining records: ${error.message}`);
      }
    }
  }
  
  // CLEANUP DYNAMICS RECORDS: Deactivate all tracked Dynamics records (set statecode to 1)
  // Note: We deactivate instead of delete due to permission restrictions
  try {
    const { dynamicsRecordTracker } = await import('../test-data/DynamicsRecordTracker');
    const recordsToCleanup = dynamicsRecordTracker.getRecordsToCleanup();
    
    if (recordsToCleanup.length > 0) {
      logger.warn(`⚠️  Found ${recordsToCleanup.length} remaining Dynamics records - performing cleanup`);
      
      // Create a new API context for cleanup (AfterAll doesn't have access to world's apiContext)
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      const apiContext = context.request;
      
      try {
        const { DynamicsAPIClient } = await import('../api-clients/dynamics/DynamicsAPIClient');
        const apiClient = new DynamicsAPIClient(apiContext);
        await apiClient.authenticate();
        
        let deletedCount = 0;
        let failedCount = 0;
        
        // Deactivate records in reverse order (handles dependencies)
        // Note: We deactivate instead of delete due to permission restrictions
        for (const record of recordsToCleanup.reverse()) {
          try {
            // Deactivate by setting statecode to 1 (Inactive)
            await apiClient.updateRecord(record.entitySetName, record.recordId, { statecode: 1 });
            deletedCount++;
            logger.debug(`✅ Deactivated Dynamics ${record.entitySetName} record: ${record.recordId} (${record.recordName})`);
          } catch (error: any) {
            failedCount++;
            logger.warn(`❌ Failed to deactivate Dynamics ${record.entitySetName} record ${record.recordId}: ${error.message}`);
          }
        }
        
        // Clear tracked records after cleanup attempt
        dynamicsRecordTracker.clear();
        
        if (failedCount > 0) {
          logger.warn(`⚠️  Dynamics cleanup completed: ${deletedCount} deactivated, ${failedCount} failed`);
        } else {
          logger.info(`✅ Dynamics cleanup complete: ${deletedCount} records deactivated`);
        }
      } finally {
        // Clean up browser and context
        await context.close();
        await browser.close();
      }
    }
  } catch (dynamicsCleanupError: any) {
    logger.error(`❌ Failed to perform Dynamics cleanup: ${dynamicsCleanupError.message}`);
  }
  
  // PERFORMANCE OPTIMIZED: Close shared browser here (only once at the end)
  const { sharedBrowser } = await import('./before');
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
      logger.info('Shared browser closed');
    } catch (error: any) {
      logger.warn(`Error closing shared browser: ${error.message}`);
    }
  }

  try {
    const { archiveCucumberJsonIfEnabled } = await import('../utils/cucumber-json-archive');
    await archiveCucumberJsonIfEnabled();
  } catch (archiveError: any) {
    logger.debug(`Cucumber JSON archive skipped: ${archiveError?.message || archiveError}`);
  }

  // Generate enhanced report with execution info and failures
  // This will be called by the report generation script
});

