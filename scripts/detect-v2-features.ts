#!/usr/bin/env ts-node

/**
 * detect-v2-features.ts
 * 
 * Detects v2 (QA-reviewed) feature files and creates v1→v2 mappings.
 * 
 * Usage:
 *   npm run learning:detect-v2              # Detect all v2 files
 *   npm run learning:detect-v2 -- --work-item SF-520  # Detect for specific work item
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { KnowledgeBase } from '../src/learning-system/KnowledgeBase';
import { logger } from '../src/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface VersionPair {
  workItemKey: string;
  type: 'ui' | 'api';
  v1File?: string;
  v2File: string;
  detected: string;
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log('\n🔍 Detecting v2 Feature Files');
  console.log('═══════════════════════════════════════════════════════════\n');

  const args = process.argv.slice(2);
  const workItemArg = args.find(arg => arg.startsWith('--work-item='))?.split('=')[1] ||
                     (args.includes('--work-item') && args[args.indexOf('--work-item') + 1]);

  const knowledgeBase = new KnowledgeBase();
  const versionPairs: VersionPair[] = [];

  // Find all v2 feature files
  const v2Pattern = workItemArg
    ? `src/features/**/${workItemArg}-v2.feature`
    : 'src/features/**/*-v2.feature';

  const v2Files = glob.sync(v2Pattern);

  console.log(`📋 Found ${v2Files.length} v2 feature file(s)\n`);

  for (const v2File of v2Files) {
    // Extract work item key and type from path
    const match = v2File.match(/src\/features\/(ui|api)\/SF\/([A-Z]+-\d+)-v2\.feature/);
    if (!match) {
      logger.warn(`⚠️  Could not parse v2 file: ${v2File}`);
      continue;
    }

    const [, type, workItemKey] = match;
    const fileType = type as 'ui' | 'api';

    // Find corresponding v1 file
    const v1File = v2File.replace('-v2.feature', '.feature');
    const v1Exists = fs.existsSync(v1File);

    const pair: VersionPair = {
      workItemKey,
      type: fileType,
      v2File,
      v1File: v1Exists ? v1File : undefined,
      detected: new Date().toISOString(),
    };

    versionPairs.push(pair);

    console.log(`   ${workItemKey} (${fileType.toUpperCase()}):`);
    console.log(`      v1: ${v1Exists ? '✓' : '✗'} ${v1File}`);
    console.log(`      v2: ✓ ${v2File}`);
    console.log('');

    // Update knowledge base index
    const index = knowledgeBase.loadIndex();
    const entry = index.workItems.find(item => item.key === workItemKey);

    if (entry) {
      if (fileType === 'ui') {
        entry.v2FeatureFiles.ui = v2File;
        if (v1Exists) {
          entry.v1FeatureFiles.ui = v1File;
        }
      } else {
        entry.v2FeatureFiles.api = v2File;
        if (v1Exists) {
          entry.v1FeatureFiles.api = v1File;
        }
      }
      entry.lastUpdated = new Date().toISOString();
      knowledgeBase.updateIndexEntry(entry);
    } else {
      // Create new entry if work item not in index
      logger.warn(`⚠️  Work item ${workItemKey} not in knowledge base index. Run knowledge:build first.`);
    }
  }

  // Save version pairs mapping
  const pairsFile = path.resolve(process.cwd(), 'data/learning/version-pairs.json');
  fs.writeFileSync(
    pairsFile,
    JSON.stringify({ pairs: versionPairs, lastUpdated: new Date().toISOString() }, null, 2)
  );

  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ Detected ${versionPairs.length} v2 file(s)`);
  console.log(`📝 Version pairs saved to: ${pairsFile}\n`);

  // Summary
  const withV1 = versionPairs.filter(p => p.v1File).length;
  const withoutV1 = versionPairs.length - withV1;

  if (withoutV1 > 0) {
    console.log(`⚠️  Warning: ${withoutV1} v2 file(s) without corresponding v1 file(s)\n`);
  }
}

main();

