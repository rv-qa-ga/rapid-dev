#!/usr/bin/env ts-node

/**
 * build-knowledge-base.ts
 * 
 * Builds and maintains the knowledge base of work items and their context.
 * 
 * Usage:
 *   npm run knowledge:build                    # Build for all work items in jira-work-items.txt
 *   npm run knowledge:build -- --work-item SF-520  # Build for specific work item
 *   npm run knowledge:build -- --all           # Build for all work items (from Jira)
 *   npm run knowledge:build -- --update        # Update existing entries
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { KnowledgeBase, WorkItemIndexEntry } from '../src/learning-system/KnowledgeBase';
import { ContextExtractor } from '../src/learning-system/ContextExtractor';
import { logger } from '../src/utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORK_ITEMS_FILE = 'inputs/jira-work-items.txt';

// ============================================================================
// UTILITIES
// ============================================================================

function loadEnvironment(): void {
  const envPaths = [
    path.resolve(process.cwd(), 'src/config/env/.env.qa'),
    path.resolve(process.cwd(), '.env.qa'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      logger.info(`📁 Loaded env from: ${path.relative(process.cwd(), envPath)}`);
      return;
    }
  }

  logger.error('❌ No .env file found');
  process.exit(1);
}

function readWorkItemsFromFile(): string[] {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  if (!fs.existsSync(filePath)) {
    logger.warn(`⚠️  Work items file not found: ${filePath}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const items = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      // Extract work item key (e.g., "SF-520" from "SF-520 - reviewed")
      const match = line.match(/^([A-Z]+-\d+)/);
      return match ? match[1] : line;
    })
    .filter(item => /^[A-Z]+-\d+$/.test(item));

  return items;
}

function findFeatureFiles(workItemKey: string): { ui?: string; api?: string } {
  const featureFiles: { ui?: string; api?: string } = {};

  const uiFile = path.resolve(process.cwd(), `src/features/ui/SF/${workItemKey}.feature`);
  const apiFile = path.resolve(process.cwd(), `src/features/api/SF/${workItemKey}.feature`);

  if (fs.existsSync(uiFile)) {
    featureFiles.ui = `src/features/ui/SF/${workItemKey}.feature`;
  }
  if (fs.existsSync(apiFile)) {
    featureFiles.api = `src/features/api/SF/${workItemKey}.feature`;
  }

  return featureFiles;
}

function findV2FeatureFiles(workItemKey: string): { ui?: string; api?: string } {
  const featureFiles: { ui?: string; api?: string } = {};

  const uiFile = path.resolve(process.cwd(), `src/features/ui/SF/${workItemKey}-v2.feature`);
  const apiFile = path.resolve(process.cwd(), `src/features/api/SF/${workItemKey}-v2.feature`);

  if (fs.existsSync(uiFile)) {
    featureFiles.ui = `src/features/ui/SF/${workItemKey}-v2.feature`;
  }
  if (fs.existsSync(apiFile)) {
    featureFiles.api = `src/features/api/SF/${workItemKey}-v2.feature`;
  }

  return featureFiles;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n📚 Building Knowledge Base');
  console.log('═══════════════════════════════════════════════════════════\n');

  loadEnvironment();

  const args = process.argv.slice(2);
  const workItemArg = args.find(arg => arg.startsWith('--work-item='))?.split('=')[1] ||
                     (args.includes('--work-item') && args[args.indexOf('--work-item') + 1]);
  const allFlag = args.includes('--all');
  const updateFlag = args.includes('--update');

  const knowledgeBase = new KnowledgeBase();
  const contextExtractor = new ContextExtractor();

  let workItems: string[] = [];

  if (workItemArg) {
    // Single work item
    workItems = [workItemArg];
    console.log(`📋 Processing work item: ${workItemArg}\n`);
  } else if (allFlag) {
    // TODO: Fetch all work items from Jira (would need pagination)
    console.log('⚠️  --all flag not yet implemented. Use --work-item or read from file.\n');
    process.exit(1);
  } else {
    // Read from file
    workItems = readWorkItemsFromFile();
    console.log(`📋 Found ${workItems.length} work items in ${WORK_ITEMS_FILE}\n`);
  }

  if (workItems.length === 0) {
    console.log('❌ No work items to process');
    process.exit(1);
  }

  let processed = 0;
  let errors = 0;

  for (const workItemKey of workItems) {
    try {
      console.log(`\n🔍 Processing ${workItemKey}...`);

      // Extract context
      const context = await contextExtractor.extractContext(workItemKey);

      // Save context
      knowledgeBase.saveWorkItemContext(context);

      // Find feature files
      const v1Files = findFeatureFiles(workItemKey);
      const v2Files = findV2FeatureFiles(workItemKey);

      // Create index entry
      const indexEntry: WorkItemIndexEntry = {
        key: context.key,
        summary: context.summary,
        type: context.type,
        status: context.status,
        priority: context.priority,
        entities: context.description.parsed.entities,
        fields: context.description.parsed.fields,
        featureTypes: context.description.parsed.actions, // Simplified - would need better detection
        relatedItems: context.relatedIssues.map(issue => issue.key),
        contextFile: `data/knowledge-base/work-items/${workItemKey}.json`,
        v1FeatureFiles: v1Files,
        v2FeatureFiles: v2Files,
        lastUpdated: new Date().toISOString(),
      };

      // Update index
      knowledgeBase.updateIndexEntry(indexEntry);

      console.log(`   ✅ Context extracted: ${context.description.parsed.entities.length} entities, ${context.description.parsed.fields.length} fields`);
      if (v2Files.ui || v2Files.api) {
        console.log(`   📝 Found v2 files (QA-reviewed)`);
      }

      processed++;
    } catch (error: any) {
      console.error(`   ❌ Error processing ${workItemKey}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✅ Processed: ${processed}`);
  if (errors > 0) {
    console.log(`❌ Errors: ${errors}`);
  }
  console.log(`\n📚 Knowledge base updated successfully!\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

