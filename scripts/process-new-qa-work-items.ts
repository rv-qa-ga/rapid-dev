#!/usr/bin/env ts-node
/**
 * Process New QA Work Items
 * 
 * Automates the workflow to:
 * 1. Query Jira for new work items in QA queue
 * 2. Generate feature files for new work items
 * 3. Generate step definitions for missing steps
 * 
 * Usage:
 *   npm run process:new-qa-items                    # Process all new items (default: mode 3)
 *   npm run process:new-qa-items -- SF-600         # Process specific item
 *   npm run process:new-qa-items -- --dry-run      # Show what would be done
 *   npm run process:new-qa-items -- --steps-only   # Only generate step definitions
 *   npm run process:new-qa-items -- --overwrite    # Overwrite existing feature files
 *   npm run process:new-qa-items -- --mode 4       # Use Risk-Based Testing (RBT) mode
 *   npm run process:new-qa-items -- --mode=4 SF-600 # RBT mode for specific item
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { JiraClient } from '../src/integrations/jira/client';
import { FeatureGenerator } from '../src/integrations/jira/FeatureGenerator';
import { config } from '../src/config/config';
import { logger } from '../src/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface WorkItemStatus {
  key: string;
  summary: string;
  status: string;
  hasUIFeature: boolean;
  hasAPIFeature: boolean;
  uiFeaturePath?: string;
  apiFeaturePath?: string;
  needsFeatureGeneration: boolean;
  needsStepDefinitions: boolean;
}

interface ProcessingResult {
  workItem: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
  uiFeatureGenerated?: boolean;
  apiFeatureGenerated?: boolean;
  stepDefinitionsGenerated?: boolean;
  errors?: string[];
}

interface SummaryReport {
  totalFound: number;
  newWorkItems: number;
  existingWorkItems: number;
  featuresGenerated: number;
  stepDefinitionsGenerated: number;
  skipped: number;
  failed: number;
  results: ProcessingResult[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const FEATURES_UI_DIR = 'src/features/ui/SF';
const FEATURES_API_DIR = 'src/features/api/SF';
const STEP_DEF_UI_DIR = 'src/step-definitions/ui/salesforce';
const STEP_DEF_API_DIR = 'src/step-definitions/api/salesforce';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if feature file exists for a work item
 */
function findFeatureFiles(workItemKey: string): { ui?: string; api?: string } {
  const uiPattern = path.join(FEATURES_UI_DIR, `${workItemKey}.feature`);
  const apiPattern = path.join(FEATURES_API_DIR, `${workItemKey}.feature`);
  
  return {
    ui: fs.existsSync(uiPattern) ? uiPattern : undefined,
    api: fs.existsSync(apiPattern) ? apiPattern : undefined,
  };
}

/**
 * Check if step definition files exist for a work item
 */
function findStepDefinitionFiles(workItemKey: string): { ui?: string; api?: string } {
  const uiPattern = path.join(STEP_DEF_UI_DIR, `${workItemKey}.steps.ts`);
  const apiPattern = path.join(STEP_DEF_API_DIR, `${workItemKey}.steps.ts`);
  
  return {
    ui: fs.existsSync(uiPattern) ? uiPattern : undefined,
    api: fs.existsSync(apiPattern) ? apiPattern : undefined,
  };
}

/**
 * Analyze work item status
 */
function analyzeWorkItem(issue: any): WorkItemStatus {
  const key = issue.key;
  const features = findFeatureFiles(key);
  const stepDefs = findStepDefinitionFiles(key);
  
  return {
    key,
    summary: issue.fields.summary || 'No summary',
    status: issue.fields.status?.name || 'Unknown',
    hasUIFeature: !!features.ui,
    hasAPIFeature: !!features.api,
    uiFeaturePath: features.ui,
    apiFeaturePath: features.api,
    needsFeatureGeneration: !features.ui || !features.api,
    needsStepDefinitions: !stepDefs.ui || !stepDefs.api,
  };
}

/**
 * Query Jira for QA queue work items
 */
async function queryQAWorkItems(jiraClient: JiraClient, projectKey: string): Promise<any[]> {
  const jql = `project = ${projectKey} AND issuetype = Story AND status IN ("Ready for QA", "In QA") ORDER BY key ASC`;
  
  logger.info(`🔍 Querying Jira with JQL: ${jql}`);
  const searchResult = await jiraClient.searchIssues(jql);
  const issues = searchResult.issues;
  logger.info(`✅ Found ${issues.length} work items in QA queue`);
  
  return issues;
}

/**
 * Generate feature files for a work item
 */
async function generateFeatureFiles(
  workItemKey: string,
  overwrite: boolean = false,
  mode: 1 | 2 | 3 | 4 = 3
): Promise<{ uiGenerated: boolean; apiGenerated: boolean; error?: string }> {
  try {
    const generator = new FeatureGenerator('src/features', mode);
    
    // Check if files exist
    const existing = findFeatureFiles(workItemKey);
    
    if (existing.ui && existing.api && !overwrite) {
      logger.info(`   ⏭️  Feature files already exist for ${workItemKey}`);
      return { uiGenerated: false, apiGenerated: false };
    }
    
    if (overwrite && (existing.ui || existing.api)) {
      logger.info(`   🔄 Overwriting existing feature files for ${workItemKey}`);
      if (existing.ui) fs.unlinkSync(existing.ui);
      if (existing.api) fs.unlinkSync(existing.api);
    }
    
    logger.info(`   📝 Generating feature files for ${workItemKey}...`);
    await generator.generateWithSuffix(workItemKey, '');
    
    // Verify files were created
    const after = findFeatureFiles(workItemKey);
    
    return {
      uiGenerated: !!after.ui,
      apiGenerated: !!after.api,
    };
  } catch (error: any) {
    logger.error(`   ❌ Error generating feature files: ${error.message}`);
    return {
      uiGenerated: false,
      apiGenerated: false,
      error: error.message,
    };
  }
}

/**
 * Generate step definitions for a work item
 */
async function generateStepDefinitions(workItemKey: string): Promise<{ generated: boolean; error?: string }> {
  try {
    // Check if feature files exist
    const features = findFeatureFiles(workItemKey);
    
    if (!features.ui && !features.api) {
      return {
        generated: false,
        error: 'No feature files found. Generate feature files first.',
      };
    }
    
    logger.info(`   📝 Generating step definitions for ${workItemKey}...`);
    
    // Check if step defs already exist
    const stepDefs = findStepDefinitionFiles(workItemKey);
    
    // Import and use the step definition generator logic
    // We'll dynamically import the generate-step-definitions module
    const { execSync } = require('child_process');
    
    try {
      // Execute the step definition generator script
      const command = `npm run generate:steps -- --work-item ${workItemKey}`;
      logger.info(`   🔧 Executing: ${command}`);
      
      execSync(command, { 
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      
      // Verify files were created
      const afterStepDefs = findStepDefinitionFiles(workItemKey);
      const uiGenerated = !stepDefs.ui && !!afterStepDefs.ui;
      const apiGenerated = !stepDefs.api && !!afterStepDefs.api;
      
      if (uiGenerated || apiGenerated) {
        logger.info(`   ✅ Step definition files generated`);
        return { generated: true };
      } else {
        logger.info(`   ⏭️  Step definition files already exist or no missing steps`);
        return { generated: false };
      }
    } catch (execError: any) {
      // The script might exit with code 0 even if no steps were generated
      // Check if files were actually created
      const afterStepDefs = findStepDefinitionFiles(workItemKey);
      const uiGenerated = !stepDefs.ui && !!afterStepDefs.ui;
      const apiGenerated = !stepDefs.api && !!afterStepDefs.api;
      
      if (uiGenerated || apiGenerated) {
        logger.info(`   ✅ Step definition files generated`);
        return { generated: true };
      }
      
      // If no files were created, it might be because all steps already exist
      if (execError.status === 0) {
        logger.info(`   ℹ️  All step definitions already exist`);
        return { generated: false };
      }
      
      throw execError;
    }
  } catch (error: any) {
    logger.error(`   ❌ Error generating step definitions: ${error.message}`);
    return {
      generated: false,
      error: error.message,
    };
  }
}

/**
 * Process a single work item
 */
async function processWorkItem(
  workItem: WorkItemStatus,
  options: {
    dryRun: boolean;
    stepsOnly: boolean;
    overwrite: boolean;
    mode: 1 | 2 | 3 | 4;
  }
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    workItem: workItem.key,
    status: 'success',
    message: '',
    errors: [],
  };
  
  try {
    logger.info(`\n${'─'.repeat(80)}`);
    logger.info(`Processing: ${workItem.key} - ${workItem.summary}`);
    logger.info(`${'─'.repeat(80)}`);
    
    if (options.dryRun) {
      logger.info(`   🔍 DRY RUN: Would process ${workItem.key}`);
      if (workItem.needsFeatureGeneration) {
        logger.info(`      → Would generate feature files`);
      }
      if (workItem.needsStepDefinitions) {
        logger.info(`      → Would generate step definitions`);
      }
      result.status = 'skipped';
      result.message = 'Dry run - no changes made';
      return result;
    }
    
    // Generate feature files if needed (or when overwrite requested)
    if (!options.stepsOnly && (workItem.needsFeatureGeneration || options.overwrite)) {
      const featureResult = await generateFeatureFiles(workItem.key, options.overwrite, options.mode);
      result.uiFeatureGenerated = featureResult.uiGenerated;
      result.apiFeatureGenerated = featureResult.apiGenerated;
      
      if (featureResult.error) {
        result.errors?.push(featureResult.error);
        result.status = 'failed';
      }
    } else if (!workItem.needsFeatureGeneration) {
      logger.info(`   ✅ Feature files already exist`);
    }
    
    // Generate step definitions if needed
    if (workItem.needsStepDefinitions) {
      const stepResult = await generateStepDefinitions(workItem.key);
      result.stepDefinitionsGenerated = stepResult.generated;
      
      if (stepResult.error) {
        result.errors?.push(stepResult.error);
        if (result.status === 'success') {
          result.status = 'failed';
        }
      }
    } else {
      logger.info(`   ✅ Step definition files already exist`);
    }
    
    if (result.status === 'success') {
      result.message = 'Successfully processed';
    }
    
  } catch (error: any) {
    logger.error(`   ❌ Error processing ${workItem.key}: ${error.message}`);
    result.status = 'failed';
    result.message = error.message;
    result.errors?.push(error.message);
  }
  
  return result;
}

/**
 * Generate summary report
 */
function generateReport(summary: SummaryReport): void {
  console.log('\n' + '═'.repeat(80));
  console.log('📊 PROCESSING SUMMARY REPORT');
  console.log('═'.repeat(80));
  console.log(`\nTotal work items found in QA queue: ${summary.totalFound}`);
  console.log(`  • New work items (need feature files): ${summary.newWorkItems}`);
  console.log(`  • Existing work items: ${summary.existingWorkItems}`);
  console.log(`\nProcessing Results:`);
  console.log(`  ✅ Features generated: ${summary.featuresGenerated}`);
  console.log(`  ✅ Step definitions generated: ${summary.stepDefinitionsGenerated}`);
  console.log(`  ⏭️  Skipped: ${summary.skipped}`);
  console.log(`  ❌ Failed: ${summary.failed}`);
  
  if (summary.results.length > 0) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log('📋 DETAILED RESULTS');
    console.log(`${'─'.repeat(80)}\n`);
    
    summary.results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : result.status === 'skipped' ? '⏭️' : '❌';
      console.log(`${index + 1}. ${icon} ${result.workItem}: ${result.message}`);
      
      if (result.uiFeatureGenerated || result.apiFeatureGenerated) {
        const features = [];
        if (result.uiFeatureGenerated) features.push('UI');
        if (result.apiFeatureGenerated) features.push('API');
        console.log(`   → Feature files generated: ${features.join(', ')}`);
      }
      
      if (result.stepDefinitionsGenerated) {
        console.log(`   → Step definitions generated`);
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log(`   → Errors:`);
        result.errors.forEach(err => console.log(`      • ${err}`));
      }
    });
  }
  
  console.log(`\n${'═'.repeat(80)}`);
  console.log('📝 NEXT STEPS');
  console.log(`${'═'.repeat(80)}`);
  console.log('1. Review generated feature files');
  console.log('2. Generate step definitions: npm run generate:steps -- --work-item <KEY>');
  console.log('3. Implement step definition logic');
  console.log('4. Run tests: npm run test:tag @<KEY>');
  console.log('5. Update inputs/jira-work-items.txt with processed items');
  console.log(`${'═'.repeat(80)}\n`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🚀 PROCESS NEW QA WORK ITEMS                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const stepsOnly = args.includes('--steps-only') || args.includes('-s');
  const overwrite = args.includes('--overwrite') || args.includes('-o');

  // Mode selection (1: User Only, 2: User + Augmentation, 3: Generator Only, 4: Risk-Based Testing)
  let generationMode: 1 | 2 | 3 | 4 = 3;
  const modeIndex = args.findIndex(arg => arg === '--mode' || arg.startsWith('--mode='));
  if (modeIndex !== -1) {
    const modeArg = args[modeIndex];
    const modeValue = modeArg.includes('=') ? modeArg.split('=')[1] : args[modeIndex + 1];
    const modeNum = parseInt(modeValue, 10);
    if (modeNum === 1 || modeNum === 2 || modeNum === 3 || modeNum === 4) {
      generationMode = modeNum as 1 | 2 | 3 | 4;
    }
  } else if (process.env.FEATURE_GENERATOR_MODE) {
    const envMode = parseInt(process.env.FEATURE_GENERATOR_MODE, 10);
    if (envMode === 1 || envMode === 2 || envMode === 3 || envMode === 4) {
      generationMode = envMode as 1 | 2 | 3 | 4;
    }
  }

  const modeNames: Record<number, string> = {
    1: 'User Scenarios Only',
    2: 'User Scenarios + Augmentation',
    3: 'Generator Only',
    4: 'Risk-Based Testing (RBT)',
  };
  logger.info(`📋 Generation Mode: ${generationMode} - ${modeNames[generationMode]}\n`);

  const specificItems = args.filter(arg => 
    !arg.startsWith('--') && 
    !arg.startsWith('-') &&
    !(modeIndex !== -1 && !args[modeIndex].includes('=') && args.indexOf(arg) === modeIndex + 1)
  );
  
  if (dryRun) {
    logger.info('🔍 DRY RUN MODE: No changes will be made\n');
  }
  
  try {
    // Initialize Jira client
    const jiraClient = new JiraClient();
    const jiraConfig = config.getJiraConfig();
    const projectKey = jiraConfig.projectKey;
    
    logger.info(`📋 Project Key: ${projectKey}\n`);
    
    // Query work items
    let issues: any[] = [];
    
    if (specificItems.length > 0) {
      // Fetch specific work items
      logger.info(`📋 Fetching specific work items: ${specificItems.join(', ')}`);
      for (const itemKey of specificItems) {
        try {
          const issue = await jiraClient.getIssue(itemKey);
          issues.push(issue);
        } catch (error: any) {
          logger.error(`❌ Failed to fetch ${itemKey}: ${error.message}`);
        }
      }
    } else {
      // Query QA queue
      issues = await queryQAWorkItems(jiraClient, projectKey);
    }
    
    if (issues.length === 0) {
      logger.info('✅ No work items found to process');
      process.exit(0);
    }
    
    // Analyze work items
    logger.info(`\n📊 Analyzing ${issues.length} work item(s)...\n`);
    const workItems = issues.map(issue => analyzeWorkItem(issue));
    
    const newWorkItems = workItems.filter(w => w.needsFeatureGeneration);
    const existingWorkItems = workItems.filter(w => !w.needsFeatureGeneration);
    
    logger.info(`📋 Analysis Results:`);
    logger.info(`   • New work items (need feature files): ${newWorkItems.length}`);
    logger.info(`   • Existing work items: ${existingWorkItems.length}`);
    
    if (newWorkItems.length > 0) {
      logger.info(`\n   New work items:`);
      newWorkItems.forEach(w => {
        logger.info(`      - ${w.key}: ${w.summary}`);
        logger.info(`        Status: ${w.status}`);
        logger.info(`        UI Feature: ${w.hasUIFeature ? '✅' : '❌'}`);
        logger.info(`        API Feature: ${w.hasAPIFeature ? '✅' : '❌'}`);
      });
    }
    
    // Process work items
    const summary: SummaryReport = {
      totalFound: issues.length,
      newWorkItems: newWorkItems.length,
      existingWorkItems: existingWorkItems.length,
      featuresGenerated: 0,
      stepDefinitionsGenerated: 0,
      skipped: 0,
      failed: 0,
      results: [],
    };
    
    for (const workItem of workItems) {
      const result = await processWorkItem(workItem, {
        dryRun,
        stepsOnly,
        overwrite,
        mode: generationMode,
      });
      
      summary.results.push(result);
      
      if (result.status === 'success') {
        if (result.uiFeatureGenerated || result.apiFeatureGenerated) {
          summary.featuresGenerated++;
        }
        if (result.stepDefinitionsGenerated) {
          summary.stepDefinitionsGenerated++;
        }
      } else if (result.status === 'skipped') {
        summary.skipped++;
      } else {
        summary.failed++;
      }
    }
    
    // Generate report
    generateReport(summary);
    
    // Exit with appropriate code
    if (summary.failed > 0) {
      process.exit(1);
    }
    
  } catch (error: any) {
    logger.error(`❌ Fatal error: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

