#!/usr/bin/env ts-node

/**
 * analyze-qa-changes.ts
 * 
 * Analyzes differences between v1 (generated) and v2 (QA-reviewed) feature files.
 * Extracts patterns and changes made by QA.
 * 
 * Usage:
 *   npm run learning:analyze              # Analyze all v1→v2 pairs
 *   npm run learning:analyze -- --work-item SF-520  # Analyze specific work item
 */

import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeBase } from '../src/learning-system/KnowledgeBase';
import { FeatureFileParser, ComparisonResult } from '../src/learning-system/FeatureFileParser';
import { logger } from '../src/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface QAChangeAnalysis {
  workItem: string;
  type: 'ui' | 'api';
  analysisDate: string;
  v1File: string;
  v2File: string;
  changes: ComparisonResult;
  patterns: {
    stepImprovements: StepImprovement[];
    scenarioAdditions: ScenarioAddition[];
    tagAdditions: TagAddition[];
    structuralChanges: StructuralChange[];
  };
  summary: {
    scenariosAdded: number;
    scenariosRemoved: number;
    scenariosModified: number;
    stepsAdded: number;
    stepsRemoved: number;
    stepsModified: number;
    tagsAdded: number;
    tagsRemoved: number;
  };
}

interface StepImprovement {
  original: string;
  improved: string;
  context: string;
  frequency: number;
  confidence: number;
}

interface ScenarioAddition {
  scenarioName: string;
  tags: string[];
  steps: string[];
  context: string;
}

interface TagAddition {
  tag: string;
  context: string;
  frequency: number;
}

interface StructuralChange {
  type: 'background' | 'scenario-order' | 'examples';
  description: string;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n📊 Analyzing QA Changes');
  console.log('═══════════════════════════════════════════════════════════\n');

  const args = process.argv.slice(2);
  const workItemArg = args.find(arg => arg.startsWith('--work-item='))?.split('=')[1] ||
                     (args.includes('--work-item') && args[args.indexOf('--work-item') + 1]);

  const knowledgeBase = new KnowledgeBase();
  const parser = new FeatureFileParser();

  // Get work items with v2 files
  const index = knowledgeBase.loadIndex();
  const workItemsWithV2 = workItemArg
    ? index.workItems.filter(item => item.key === workItemArg)
    : knowledgeBase.getWorkItemsWithV2();

  if (workItemsWithV2.length === 0) {
    console.log('❌ No work items with v2 files found.');
    if (workItemArg) {
      console.log(`   Run: npm run learning:detect-v2 -- --work-item ${workItemArg}`);
    } else {
      console.log('   Run: npm run learning:detect-v2');
    }
    console.log('');
    process.exit(1);
  }

  console.log(`📋 Analyzing ${workItemsWithV2.length} work item(s) with v2 files\n`);

  const analyses: QAChangeAnalysis[] = [];

  for (const workItem of workItemsWithV2) {
    // Analyze UI files
    if (workItem.v2FeatureFiles.ui && workItem.v1FeatureFiles.ui) {
      console.log(`\n🔍 Analyzing ${workItem.key} (UI)...`);
      const analysis = await analyzePair(
        parser,
        workItem.key,
        'ui',
        workItem.v1FeatureFiles.ui,
        workItem.v2FeatureFiles.ui
      );
      analyses.push(analysis);
      saveAnalysis(analysis);
    }

    // Analyze API files
    if (workItem.v2FeatureFiles.api && workItem.v1FeatureFiles.api) {
      console.log(`\n🔍 Analyzing ${workItem.key} (API)...`);
      const analysis = await analyzePair(
        parser,
        workItem.key,
        'api',
        workItem.v1FeatureFiles.api,
        workItem.v2FeatureFiles.api
      );
      analyses.push(analysis);
      saveAnalysis(analysis);
    }
  }

  // Generate summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📊 Analysis Summary');
  console.log('═══════════════════════════════════════════════════════════\n');

  let totalScenariosAdded = 0;
  let totalScenariosModified = 0;
  let totalStepsAdded = 0;
  let totalStepsModified = 0;

  for (const analysis of analyses) {
    totalScenariosAdded += analysis.summary.scenariosAdded;
    totalScenariosModified += analysis.summary.scenariosModified;
    totalStepsAdded += analysis.summary.stepsAdded;
    totalStepsModified += analysis.summary.stepsModified;

    console.log(`${analysis.workItem} (${analysis.type.toUpperCase()}):`);
    console.log(`   Scenarios: +${analysis.summary.scenariosAdded} modified:${analysis.summary.scenariosModified}`);
    console.log(`   Steps: +${analysis.summary.stepsAdded} modified:${analysis.summary.stepsModified}`);
    console.log(`   Tags: +${analysis.summary.tagsAdded}`);
    console.log('');
  }

  console.log(`Total: ${totalScenariosAdded} scenarios added, ${totalScenariosModified} modified`);
  console.log(`       ${totalStepsAdded} steps added, ${totalStepsModified} modified\n`);
}

/**
 * Analyze a v1→v2 pair
 */
async function analyzePair(
  parser: FeatureFileParser,
  workItemKey: string,
  type: 'ui' | 'api',
  v1File: string,
  v2File: string
): Promise<QAChangeAnalysis> {
  // Parse both files
  const v1Parsed = parser.parse(v1File);
  const v2Parsed = parser.parse(v2File);

  // Compare
  const comparison = parser.compare(v1Parsed, v2Parsed);

  // Extract patterns
  const patterns = extractPatterns(comparison, v1Parsed, v2Parsed);

  // Create summary
  const summary = {
    scenariosAdded: comparison.scenarios.added.length,
    scenariosRemoved: comparison.scenarios.removed.length,
    scenariosModified: comparison.scenarios.modified.length,
    stepsAdded: comparison.steps.added.length + 
                comparison.scenarios.modified.reduce((sum, m) => sum + m.changes.stepsAdded.length, 0),
    stepsRemoved: comparison.steps.removed.length + 
                  comparison.scenarios.modified.reduce((sum, m) => sum + m.changes.stepsRemoved.length, 0),
    stepsModified: comparison.steps.modified.length + 
                   comparison.scenarios.modified.reduce((sum, m) => sum + m.changes.stepsModified.length, 0),
    tagsAdded: comparison.tags.added.length + 
               comparison.scenarios.modified.reduce((sum, m) => sum + m.changes.tagsAdded.length, 0),
    tagsRemoved: comparison.tags.removed.length + 
                 comparison.scenarios.modified.reduce((sum, m) => sum + m.changes.tagsRemoved.length, 0),
  };

  const analysis: QAChangeAnalysis = {
    workItem: workItemKey,
    type,
    analysisDate: new Date().toISOString(),
    v1File,
    v2File,
    changes: comparison,
    patterns,
    summary,
  };

  console.log(`   ✅ Analyzed: ${summary.scenariosAdded} added, ${summary.scenariosModified} modified, ${summary.stepsAdded} steps added`);

  return analysis;
}

/**
 * Extract patterns from changes
 */
function extractPatterns(
  comparison: ComparisonResult,
  v1Parsed: any,
  v2Parsed: any
): QAChangeAnalysis['patterns'] {
  const stepImprovements: StepImprovement[] = [];
  const scenarioAdditions: ScenarioAddition[] = [];
  const tagAdditions: TagAddition[] = [];
  const structuralChanges: StructuralChange[] = [];

  // Extract step improvements from modified scenarios
  for (const modified of comparison.scenarios.modified) {
    for (const stepMod of modified.changes.stepsModified) {
      stepImprovements.push({
        original: `${stepMod.original.keyword} ${stepMod.original.rawText}`,
        improved: `${stepMod.updated.keyword} ${stepMod.updated.rawText}`,
        context: modified.original.name,
        frequency: 1,
        confidence: 0.5, // Will be updated in learning phase
      });
    }

    // Extract tag additions
    for (const tag of modified.changes.tagsAdded) {
      tagAdditions.push({
        tag,
        context: modified.original.name,
        frequency: 1,
      });
    }
  }

  // Extract scenario additions
  for (const added of comparison.scenarios.added) {
    scenarioAdditions.push({
      scenarioName: added.name,
      tags: added.tags,
      steps: added.steps.map(s => `${s.keyword} ${s.rawText}`),
      context: `${v2Parsed.feature.name} - ${added.name}`,
    });
  }

  // Extract structural changes
  if (comparison.background.changed) {
    structuralChanges.push({
      type: 'background',
      description: `Background changed: ${comparison.background.stepsAdded.length} steps added, ${comparison.background.stepsRemoved.length} removed`,
    });
  }

  return {
    stepImprovements,
    scenarioAdditions,
    tagAdditions,
    structuralChanges,
  };
}

/**
 * Save analysis to file
 */
function saveAnalysis(analysis: QAChangeAnalysis): void {
  const outputDir = path.resolve(process.cwd(), 'data/learning/qa-changes');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputFile = path.join(outputDir, `${analysis.workItem}-${analysis.type}-changes.json`);
  fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
  logger.info(`   💾 Saved analysis to: ${outputFile}`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

