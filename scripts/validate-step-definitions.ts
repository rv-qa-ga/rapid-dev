#!/usr/bin/env ts-node

import { StepDefinitionValidator } from '../src/utils/step-definition-validator';
import { logger } from '../src/utils/logger';
import * as path from 'path';
import * as fs from 'fs';

/**
 * CLI script to validate step definitions for feature files
 * 
 * Usage:
 *   npm run validate:steps
 *   npm run validate:steps -- --feature src/features/ui/SF/login.feature
 *   npm run validate:steps -- --work-item SF-503
 *   npm run validate:steps -- --all
 */

async function main() {
  const args = process.argv.slice(2);
  const validator = new StepDefinitionValidator();

  // Load step definitions
  validator.loadStepDefinitions();

  // Load feature steps
  validator.loadFeatureSteps();

  // Check for work item parameter
  if (args.includes('--work-item') && args[args.indexOf('--work-item') + 1]) {
    const workItem = args[args.indexOf('--work-item') + 1].trim();
    logger.info(`Validating step definitions for work item: ${workItem}`);
    
    const uiFeaturePath = path.resolve(`src/features/ui/SF/${workItem}.feature`);
    const apiFeaturePath = path.resolve(`src/features/api/SF/${workItem}.feature`);
    
    const results: any[] = [];
    
    // Validate UI feature file
    if (fs.existsSync(uiFeaturePath)) {
      logger.info(`Validating UI feature: ${uiFeaturePath}`);
      const uiResult = validator.validateFeatureFile(uiFeaturePath);
      if (uiResult) {
        results.push(uiResult);
      }
    } else {
      logger.warn(`UI feature file not found: ${uiFeaturePath}`);
    }
    
    // Validate API feature file
    if (fs.existsSync(apiFeaturePath)) {
      logger.info(`Validating API feature: ${apiFeaturePath}`);
      const apiResult = validator.validateFeatureFile(apiFeaturePath);
      if (apiResult) {
        results.push(apiResult);
      }
    } else {
      logger.warn(`API feature file not found: ${apiFeaturePath}`);
    }
    
    if (results.length === 0) {
      logger.error(`No feature files found for work item: ${workItem}`);
      process.exit(1);
    }
    
    // Generate report
    const report = validator.generateReport(results);
    console.log(report);
    
    // Exit with error if any missing steps
    const hasMissing = results.some((r) => r.missingSteps.length > 0);
    if (hasMissing) {
      process.exit(1);
    }
  } else if (args.includes('--feature') && args[args.indexOf('--feature') + 1]) {
    const featurePath = path.resolve(args[args.indexOf('--feature') + 1]);
    const result = validator.validateFeatureFile(featurePath);

    if (result) {
      console.log(validator.generateReport([result]));
      
      if (result.missingSteps.length > 0) {
        process.exit(1);
      }
    }
  } else {
    // Validate all
    const results = validator.validateAll();
    const report = validator.generateReport(results);
    console.log(report);

    // Exit with error if any missing steps
    const hasMissing = results.some((r) => r.missingSteps.length > 0);
    if (hasMissing) {
      process.exit(1);
    }
  }
}

main().catch((error) => {
  logger.error(`Error: ${error.message}`);
  process.exit(1);
});

