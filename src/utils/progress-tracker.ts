/**
 * Progress Tracker Utility
 * 
 * Tracks and displays test execution progress in real-time
 * Shows progress for scenarios, steps, and overall test suite
 */

import { logger } from './logger';

interface ProgressStats {
  totalScenarios: number;
  completedScenarios: number;
  totalSteps: number;
  completedSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  currentScenario?: string;
  currentStep?: string;
  startTime: number;
}

class ProgressTracker {
  private stats: ProgressStats = {
    totalScenarios: 0,
    completedScenarios: 0,
    totalSteps: 0,
    completedSteps: 0,
    passedSteps: 0,
    failedSteps: 0,
    skippedSteps: 0,
    startTime: Date.now(),
  };

  private scenarioStartTime: number = 0;
  private stepStartTime: number = 0;

  /**
   * Initialize progress tracker with total counts
   */
  initialize(totalScenarios: number, totalSteps: number): void {
    this.stats.totalScenarios = totalScenarios;
    this.stats.totalSteps = totalSteps;
    this.stats.startTime = Date.now();
    this.logProgress('INIT', 'Test execution started');
  }

  /**
   * Mark start of a scenario
   */
  startScenario(scenarioName: string): void {
    this.stats.currentScenario = scenarioName;
    this.scenarioStartTime = Date.now();
    // Don't increment here - increment when scenario actually starts
    this.logProgress('SCENARIO_START', `Starting: ${scenarioName}`);
  }

  /**
   * Mark end of a scenario
   */
  endScenario(scenarioName: string, status: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED'): void {
    const duration = ((Date.now() - this.scenarioStartTime) / 1000).toFixed(1);
    this.stats.completedScenarios++;
    this.logProgress('SCENARIO_END', `Completed: ${scenarioName} (${status}) - ${duration}s`);
    this.stats.currentScenario = undefined;
  }

  /**
   * Mark start of a step
   */
  startStep(stepText: string): void {
    this.stats.currentStep = stepText;
    this.stepStartTime = Date.now();
    this.stats.completedSteps++;
    this.logProgress('STEP_START', stepText);
  }

  /**
   * Mark end of a step
   */
  endStep(stepText: string, status: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED'): void {
    const duration = ((Date.now() - this.stepStartTime) / 1000).toFixed(1);
    
    if (status === 'PASSED') {
      this.stats.passedSteps++;
    } else if (status === 'FAILED') {
      this.stats.failedSteps++;
    } else {
      this.stats.skippedSteps++;
    }
    
    this.logProgress('STEP_END', `${stepText} (${status}) - ${duration}s`);
    this.stats.currentStep = undefined;
  }

  /**
   * Log progress with formatted output
   */
  private logProgress(type: string, message: string): void {
    const scenarioProgress = this.stats.totalScenarios > 0
      ? `${this.stats.completedScenarios}/${this.stats.totalScenarios}`
      : '?/?';
    
    const stepProgress = this.stats.totalSteps > 0
      ? `${this.stats.completedSteps}/${this.stats.totalSteps}`
      : '?/?';
    
    const scenarioPercent = this.stats.totalScenarios > 0
      ? ((this.stats.completedScenarios / this.stats.totalScenarios) * 100).toFixed(1)
      : '0.0';
    
    const stepPercent = this.stats.totalSteps > 0
      ? ((this.stats.completedSteps / this.stats.totalSteps) * 100).toFixed(1)
      : '0.0';
    
    const elapsed = ((Date.now() - this.stats.startTime) / 1000).toFixed(0);
    
    // Create progress bar for steps
    const progressBar = this.createProgressBar(parseFloat(stepPercent), 50);
    
    // Format message based on type
    let formattedMessage = '';
    switch (type) {
      case 'INIT':
        formattedMessage = `\n${'='.repeat(80)}\n[START] TEST EXECUTION STARTED\n${'='.repeat(80)}`;
        logger.info(formattedMessage);
        logger.info(`[STATS] Total Scenarios: ${this.stats.totalScenarios} | Total Steps: ${this.stats.totalSteps}`);
        break;
      
      case 'SCENARIO_START':
        formattedMessage = `\n${'-'.repeat(80)}\n[SCENARIO] Scenario ${scenarioProgress} (${scenarioPercent}%) | Step ${stepProgress} (${stepPercent}%) | Elapsed: ${elapsed}s\n${'-'.repeat(80)}`;
        logger.info(formattedMessage);
        logger.info(`[RUN] ${message}`);
        break;
      
      case 'SCENARIO_END':
        logger.info(`[OK] ${message}`);
        break;
      
      case 'STEP_START':
        // Show progress bar and step info
        formattedMessage = `${progressBar} ${stepPercent}% | Step ${stepProgress} | ${message}`;
        logger.info(formattedMessage);
        break;
      
      case 'STEP_END': {
        // Update progress bar and show result
        const updatedBar = this.createProgressBar(parseFloat(stepPercent), 50);
        // Extract status from message (format: "stepText (STATUS) - duration")
        const statusMatch = message.match(/\(([A-Z]+)\)/);
        const stepStatus = statusMatch ? statusMatch[1] : 'PASSED';
        const statusIcon = stepStatus === 'PASSED' ? '[OK]' : stepStatus === 'FAILED' ? '[FAIL]' : '[SKIP]';
        formattedMessage = `${updatedBar} ${stepPercent}% | Step ${stepProgress} | ${statusIcon} ${message}`;
        logger.info(formattedMessage);
        break;
      }
    }
  }

  /**
   * Create a visual progress bar (using ASCII characters for PowerShell compatibility)
   */
  private createProgressBar(percent: number, length: number): string {
    const filled = Math.floor((percent / 100) * length);
    const empty = length - filled;
    // Use ASCII characters instead of Unicode box-drawing characters
    return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
  }

  /**
   * Get current progress statistics
   */
  getStats(): ProgressStats {
    return { ...this.stats };
  }

  /**
   * Log final summary
   */
  logSummary(): void {
    const totalTime = ((Date.now() - this.stats.startTime) / 1000).toFixed(0);
    const scenarioPercent = this.stats.totalScenarios > 0
      ? ((this.stats.completedScenarios / this.stats.totalScenarios) * 100).toFixed(1)
      : '0.0';
    
    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`[SUMMARY] TEST EXECUTION SUMMARY`);
    logger.info(`${'='.repeat(80)}`);
    logger.info(`Scenarios: ${this.stats.completedScenarios}/${this.stats.totalScenarios} (${scenarioPercent}%)`);
    logger.info(`Steps: ${this.stats.completedSteps}/${this.stats.totalSteps}`);
    logger.info(`  [OK] Passed: ${this.stats.passedSteps}`);
    logger.info(`  [FAIL] Failed: ${this.stats.failedSteps}`);
    logger.info(`  [SKIP] Skipped: ${this.stats.skippedSteps}`);
    logger.info(`Total Time: ${totalTime}s`);
    logger.info(`${'='.repeat(80)}\n`);
  }
}

// Singleton instance
export const progressTracker = new ProgressTracker();

