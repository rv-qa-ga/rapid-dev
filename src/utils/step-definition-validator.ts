import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';
import { logger } from './logger';

export interface StepDefinitionInfo {
  file: string;
  stepType: 'Given' | 'When' | 'Then' | 'And' | 'But';
  pattern: string;
  line: number;
}

export interface FeatureStep {
  type: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  line: number;
  file: string;
}

export interface ValidationResult {
  featureFile: string;
  missingSteps: FeatureStep[];
  totalSteps: number;
  implementedSteps: number;
  coverage: number;
}

export class StepDefinitionValidator {
  private stepDefinitions: StepDefinitionInfo[] = [];
  private featureSteps: FeatureStep[] = [];

  /**
   * Load all step definitions from the codebase
   */
  loadStepDefinitions(stepDefDir: string = 'src/step-definitions'): void {
    logger.info(`Loading step definitions from: ${stepDefDir}`);

    const stepFiles = globSync(`${stepDefDir}/**/*.ts`);
    this.stepDefinitions = [];

    for (const file of stepFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const steps = this.extractStepDefinitions(content, file);
        this.stepDefinitions.push(...steps);
      } catch (error: any) {
        logger.warn(`Failed to read step definition file ${file}: ${error.message}`);
      }
    }

    logger.info(`Loaded ${this.stepDefinitions.length} step definitions`);
  }

  /**
   * Extract step definitions from a TypeScript file
   */
  private extractStepDefinitions(content: string, file: string): StepDefinitionInfo[] {
    const steps: StepDefinitionInfo[] = [];
    const lines = content.split('\n');

    // Match Cucumber step definitions: Given/When/Then/And/But('pattern', ...)
    const stepRegex = /(Given|When|Then|And|But)\s*\(['"`](.+?)['"`]/g;

    lines.forEach((line, index) => {
      const matches = [...line.matchAll(stepRegex)];
      matches.forEach((match) => {
        steps.push({
          file,
          stepType: match[1] as StepDefinitionInfo['stepType'],
          pattern: match[2],
          line: index + 1,
        });
      });
    });

    return steps;
  }

  /**
   * Load all steps from feature files
   */
  loadFeatureSteps(featuresDir: string = 'src/features'): void {
    logger.info(`Loading feature steps from: ${featuresDir}`);

    const featureFiles = globSync(`${featuresDir}/**/*.feature`);
    this.featureSteps = [];

    for (const file of featureFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const steps = this.extractFeatureSteps(content, file);
        this.featureSteps.push(...steps);
      } catch (error: any) {
        logger.warn(`Failed to read feature file ${file}: ${error.message}`);
      }
    }

    logger.info(`Loaded ${this.featureSteps.length} feature steps`);
  }

  /**
   * Extract steps from a Gherkin feature file
   */
  private extractFeatureSteps(content: string, file: string): FeatureStep[] {
    const steps: FeatureStep[] = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Match Gherkin steps: Given/When/Then/And/But
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.+)$/i);
      
      if (stepMatch) {
        steps.push({
          type: stepMatch[1] as FeatureStep['type'],
          text: stepMatch[2].trim(),
          line: index + 1,
          file,
        });
      }
    });

    return steps;
  }

  /**
   * Check if a feature step has a matching step definition
   */
  private isStepImplemented(step: FeatureStep): boolean {
    // Normalize step text (remove parameters, case insensitive)
    const normalizedStep = this.normalizeStepText(step.text);

    return this.stepDefinitions.some((def) => {
      // Check if step type matches
      if (def.stepType !== step.type && step.type !== 'And' && step.type !== 'But') {
        return false;
      }

      // Normalize definition pattern
      const normalizedPattern = this.normalizeStepText(def.pattern);

      // Check for exact match
      if (normalizedStep === normalizedPattern) {
        return true;
      }

      // Check for regex pattern match
      if (this.matchesPattern(normalizedStep, normalizedPattern)) {
        return true;
      }

      // Check for parameterized steps (e.g., "I enter {string}" matches "I enter username")
      if (this.matchesParameterized(normalizedStep, normalizedPattern)) {
        return true;
      }

      return false;
    });
  }

  /**
   * Normalize step text for comparison
   */
  private normalizeStepText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\{word\}/g, '\\w+')
      .replace(/\{string\}/g, '.*')
      .replace(/\{int\}/g, '\\d+')
      .replace(/\{float\}/g, '\\d+\\.\\d+')
      .replace(/["']/g, '')
      .trim();
  }

  /**
   * Check if step matches a regex pattern
   */
  private matchesPattern(step: string, pattern: string): boolean {
    try {
      // Convert Cucumber pattern to regex
      const regexPattern = pattern
        .replace(/\{word\}/g, '\\w+')
        .replace(/\{string\}/g, '.*')
        .replace(/\{int\}/g, '\\d+')
        .replace(/\{float\}/g, '\\d+\\.\\d+')
        .replace(/\*/g, '.*');

      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(step);
    } catch {
      return false;
    }
  }

  /**
   * Check if step matches a parameterized pattern
   */
  private matchesParameterized(step: string, pattern: string): boolean {
    // Simple parameter matching - can be enhanced
    const stepWords = step.split(/\s+/);
    const patternWords = pattern.split(/\s+/);

    if (stepWords.length !== patternWords.length) {
      return false;
    }

    for (let i = 0; i < patternWords.length; i++) {
      const patternWord = patternWords[i];
      
      // Skip parameter placeholders
      if (patternWord.match(/^\{.*\}$/)) {
        continue;
      }

      // Words must match
      if (stepWords[i] !== patternWord) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate all feature files against step definitions
   */
  validateAll(): ValidationResult[] {
    logger.info('Validating all feature files...');

    const results: ValidationResult[] = [];
    const featureFiles = new Set(this.featureSteps.map((s) => s.file));

    for (const featureFile of featureFiles) {
      const fileSteps = this.featureSteps.filter((s) => s.file === featureFile);
      const missingSteps: FeatureStep[] = [];

      for (const step of fileSteps) {
        if (!this.isStepImplemented(step)) {
          missingSteps.push(step);
        }
      }

      const totalSteps = fileSteps.length;
      const implementedSteps = totalSteps - missingSteps.length;
      const coverage = totalSteps > 0 ? (implementedSteps / totalSteps) * 100 : 100;

      results.push({
        featureFile,
        missingSteps,
        totalSteps,
        implementedSteps,
        coverage,
      });
    }

    return results;
  }

  /**
   * Validate a specific feature file
   */
  validateFeatureFile(featureFilePath: string): ValidationResult | null {
    const content = fs.readFileSync(featureFilePath, 'utf-8');
    const steps = this.extractFeatureSteps(content, featureFilePath);
    const missingSteps: FeatureStep[] = [];

    for (const step of steps) {
      if (!this.isStepImplemented(step)) {
        missingSteps.push(step);
      }
    }

    const totalSteps = steps.length;
    const implementedSteps = totalSteps - missingSteps.length;
    const coverage = totalSteps > 0 ? (implementedSteps / totalSteps) * 100 : 100;

    return {
      featureFile: featureFilePath,
      missingSteps,
      totalSteps,
      implementedSteps,
      coverage,
    };
  }

  /**
   * Generate a report of missing step definitions
   */
  generateReport(results: ValidationResult[]): string {
    let report = '\n=== Step Definition Validation Report ===\n\n';

    const totalFeatures = results.length;
    const totalSteps = results.reduce((sum, r) => sum + r.totalSteps, 0);
    const totalMissing = results.reduce((sum, r) => sum + r.missingSteps.length, 0);
    const avgCoverage = results.reduce((sum, r) => sum + r.coverage, 0) / totalFeatures;

    report += `Summary:\n`;
    report += `  Total Feature Files: ${totalFeatures}\n`;
    report += `  Total Steps: ${totalSteps}\n`;
    report += `  Missing Steps: ${totalMissing}\n`;
    report += `  Average Coverage: ${avgCoverage.toFixed(2)}%\n\n`;

    // Group by coverage
    const complete = results.filter((r) => r.coverage === 100);
    const partial = results.filter((r) => r.coverage > 0 && r.coverage < 100);
    const missing = results.filter((r) => r.coverage === 0);

    if (complete.length > 0) {
      report += `✅ Complete (100% coverage): ${complete.length} files\n`;
    }

    if (partial.length > 0) {
      report += `⚠️  Partial Coverage: ${partial.length} files\n`;
      partial.forEach((r) => {
        report += `   ${r.featureFile}: ${r.coverage.toFixed(1)}% (${r.missingSteps.length} missing)\n`;
      });
    }

    if (missing.length > 0) {
      report += `❌ No Coverage: ${missing.length} files\n`;
      missing.forEach((r) => {
        report += `   ${r.featureFile}\n`;
      });
    }

    // Detailed missing steps
    const filesWithMissing = results.filter((r) => r.missingSteps.length > 0);
    if (filesWithMissing.length > 0) {
      report += `\n=== Missing Step Definitions ===\n\n`;
      filesWithMissing.forEach((result) => {
        report += `File: ${result.featureFile}\n`;
        result.missingSteps.forEach((step) => {
          report += `  Line ${step.line}: ${step.type} ${step.text}\n`;
        });
        report += `\n`;
      });
    }

    return report;
  }
}

