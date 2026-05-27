#!/usr/bin/env ts-node
/**
 * generate-features.ts
 * 
 * Generates Gherkin feature files from Jira work items.
 * Reads work items from inputs/jira-work-items.txt or command line arguments.
 * 
 * Usage:
 *   npm run jira:generate                        # Reads from inputs/jira-work-items.txt
 *   npm run jira:generate -- SF-520              # Single work item
 *   npm run jira:generate -- SF-520 SF-521       # Multiple work items
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { logger } from '../../utils/logger';

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORK_ITEMS_FILE = 'inputs/jira-work-items.txt';
const FEATURES_DIR = 'src/features';

// ============================================================================
// UTILITIES
// ============================================================================

function loadEnvironment(): void {
  const envPaths = [
    path.resolve(process.cwd(), 'src/config/env/.env.qa'),
    path.resolve(process.cwd(), '.env.qa'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`📁 Loaded credentials from: ${envPath}\n`);
      return;
    }
  }

  console.error('❌ No .env.qa file found');
  process.exit(1);
}

function readWorkItemsFromFile(): string[] {
  const filePath = path.resolve(process.cwd(), WORK_ITEMS_FILE);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${WORK_ITEMS_FILE} not found`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const workItems: string[] = [];
  
  content
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }
      // Extract work item ID from both regular lines and lines with extra text
      // Matches patterns like:
      // - "SF-529"
      // - "SF-529 - Uploaded and results updated"
      // - "SF-467 - Regenerated"
      const match = trimmed.match(/^#?([A-Z]+-\d+)/);
      if (match && match[1]) {
        workItems.push(match[1]);
      }
    });
  
  return workItems;
}

function getExistingFeatureFiles(issueKey: string): string[] {
  const existing: string[] = [];
  const projectPrefix = issueKey.split('-')[0];

  const uiPath = path.join(FEATURES_DIR, 'ui', projectPrefix, `${issueKey}.feature`);
  if (fs.existsSync(uiPath)) {
    existing.push(uiPath);
  }

  const apiPath = path.join(FEATURES_DIR, 'api', projectPrefix, `${issueKey}.feature`);
  if (fs.existsSync(apiPath)) {
    existing.push(apiPath);
  }

  const uiDir = path.join(FEATURES_DIR, 'ui', projectPrefix);
  const apiDir = path.join(FEATURES_DIR, 'api', projectPrefix);
  
  [uiDir, apiDir].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.startsWith(`${issueKey}-v`) && file.endsWith('.feature')) {
          existing.push(path.join(dir, file));
        }
      });
    }
  });

  return existing;
}

function getNextVersion(issueKey: string): number {
  const projectPrefix = issueKey.split('-')[0];
  let maxVersion = 1;

  [path.join(FEATURES_DIR, 'ui', projectPrefix), path.join(FEATURES_DIR, 'api', projectPrefix)].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const match = file.match(new RegExp(`^${issueKey}-v(\\d+)\\.feature$`));
        if (match) {
          const version = parseInt(match[1], 10);
          if (version >= maxVersion) {
            maxVersion = version + 1;
          }
        }
      });
    }
  });

  return maxVersion;
}

// Create a reusable readline interface
let rl: readline.Interface | null = null;

function getReadlineInterface(): readline.Interface {
  if (!rl) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

function closeReadlineInterface(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}

async function promptUser(question: string): Promise<string> {
  const rlInterface = getReadlineInterface();

  return new Promise((resolve) => {
    rlInterface.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🚀 FEATURE GENERATOR                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');

  loadEnvironment();

  // Import generator after env is loaded
  const { FeatureGenerator } = await import('./FeatureGenerator');

  // Check for command-line flags
  const args = process.argv.slice(2);
  const overwriteAll = args.includes('--overwrite-all') || args.includes('-O');
  const skipAll = args.includes('--skip-all') || args.includes('-S');
  const versionAll = args.includes('--version-all') || args.includes('-V');
  
  // Mode selection (1: User Only, 2: User + Augmentation, 3: Generator Only, 4: Risk-Based Testing)
  let generationMode: 1 | 2 | 3 | 4 = 3; // Default to MODE 3 (current behavior)
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
  
  // User scenarios file path (for MODE 1 & 2)
  let userScenariosPath: string | null = null;
  const scenariosIndex = args.findIndex(arg => arg === '--scenarios' || arg.startsWith('--scenarios='));
  if (scenariosIndex !== -1) {
    const scenariosArg = args[scenariosIndex];
    userScenariosPath = scenariosArg.includes('=') ? scenariosArg.split('=')[1] : args[scenariosIndex + 1];
  }
  
  let workItems: string[] = args.filter(arg => 
    !arg.startsWith('-') && 
    arg !== '--mode' && 
    arg !== '--scenarios' &&
    !arg.match(/^--mode=/) &&
    !arg.match(/^--scenarios=/)
  );

  if (workItems.length === 0) {
    console.log(`📄 Reading work items from: ${WORK_ITEMS_FILE}`);
    workItems = readWorkItemsFromFile();
  }

  if (workItems.length === 0) {
    console.log('');
    console.log('❌ No work items found.');
    console.log('');
    console.log('Add work items to inputs/jira-work-items.txt or pass them as arguments:');
    console.log('  npm run jira:generate              # Reads from file');
    console.log('  npm run jira:generate -- SF-520    # Single item');
    console.log('');
    process.exit(1);
  }

  console.log(`\n📋 Found ${workItems.length} work item(s): ${workItems.join(', ')}\n`);

  // Mode selection prompt (if not specified)
  if (generationMode === 3 && !userScenariosPath && modeIndex === -1 && !process.env.FEATURE_GENERATOR_MODE) {
    console.log('📋 GENERATION MODE SELECTION');
    console.log('');
    console.log('Select generation mode:');
    console.log('  [1] User Scenarios Only - Only user-provided scenarios are used');
    console.log('  [2] User Scenarios + Augmentation - User scenarios + generator fills gaps');
    console.log('  [3] Generator Only - Full automatic generation (current behavior)');
    console.log('  [4] Risk-Based Testing (RBT) - UI comprehensive, API minimal 1-2 tests');
    console.log('');
    const modeAnswer = await promptUser('Your choice [1/2/3/4] (default: 3): ');
    if (modeAnswer === '1') generationMode = 1;
    else if (modeAnswer === '2') generationMode = 2;
    else if (modeAnswer === '4') generationMode = 4;
    else generationMode = 3;
    console.log('');
  }

  // User scenarios input (for MODE 1 & 2)
  let userScenarios: any[] = [];
  if ((generationMode === 1 || generationMode === 2) && !userScenariosPath) {
    console.log('📋 USER SCENARIOS INPUT');
    console.log('');
    console.log('Provide scenarios via:');
    console.log('  [1] Feature file (.feature)');
    console.log('  [2] CSV/XLSX scenario sheet');
    console.log('');
    const inputType = await promptUser('Your choice [1/2] (or press Enter to skip): ');
    if (inputType === '1' || inputType === '2') {
      const filePath = await promptUser('Enter file path: ');
      if (filePath && filePath.trim()) {
        userScenariosPath = filePath.trim();
      }
    }
    console.log('');
  }

  // Parse user scenarios if provided
  if (userScenariosPath && (generationMode === 1 || generationMode === 2)) {
    try {
      if (userScenariosPath.endsWith('.feature')) {
        userScenarios = FeatureGenerator.parseUserFeatureFile(userScenariosPath);
        console.log(`✅ Parsed ${userScenarios.length} scenario(s) from feature file`);
      } else if (userScenariosPath.endsWith('.csv') || userScenariosPath.endsWith('.xlsx')) {
        userScenarios = FeatureGenerator.parseUserScenarioSheet(userScenariosPath);
        console.log(`✅ Parsed ${userScenarios.length} scenario(s) from CSV/XLSX file`);
      } else {
        console.log(`⚠️  Unsupported file type. Expected .feature, .csv, or .xlsx`);
      }
    } catch (error: any) {
      console.error(`❌ Error parsing user scenarios: ${error.message}`);
      process.exit(1);
    }
    console.log('');
  }

  const results = { generated: [] as string[], skipped: [] as string[], failed: [] as string[] };
  let globalAction: 'ask' | 'overwrite-all' | 'skip-all' | 'version-all' = 'ask';
  
  // Set global action from command-line flags
  if (overwriteAll) {
    globalAction = 'overwrite-all';
    console.log('📝 Overwrite mode: All existing files will be overwritten\n');
  } else if (skipAll) {
    globalAction = 'skip-all';
    console.log('⏭️  Skip mode: All existing files will be skipped\n');
  } else if (versionAll) {
    globalAction = 'version-all';
    console.log('📝 Version mode: New versions will be created for all files\n');
  }

  for (const workItem of workItems) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Processing: ${workItem}`);
    console.log(`${'─'.repeat(60)}`);

    const existingFiles = getExistingFeatureFiles(workItem);

    let action: 'generate' | 'skip' | 'version' = 'generate';
    let versionSuffix = '';

    if (existingFiles.length > 0) {
      console.log(`\n⚠️  Existing feature file(s) found:`);
      existingFiles.forEach(f => console.log(`   - ${f}`));

      if (globalAction === 'ask') {
        console.log('');
        console.log('Options:');
        console.log('  [o] Overwrite - Delete existing and recreate');
        console.log('  [s] Skip - Keep existing, skip this item');
        console.log('  [v] Version - Create new version (e.g., SF-520-v2.feature)');
        console.log('  [O] Overwrite ALL remaining items');
        console.log('  [S] Skip ALL remaining items');
        console.log('  [V] Version ALL remaining items');
        console.log('');

        const answer = await promptUser('Your choice [o/s/v/O/S/V]: ');

        switch (answer) {
          case 'o':
            action = 'generate';
            existingFiles.forEach(f => {
              fs.unlinkSync(f);
              console.log(`   🗑️  Deleted: ${f}`);
            });
            break;
          case 's':
            action = 'skip';
            break;
          case 'v':
            action = 'version';
            versionSuffix = `-v${getNextVersion(workItem)}`;
            break;
          case 'O':
            globalAction = 'overwrite-all';
            action = 'generate';
            existingFiles.forEach(f => {
              fs.unlinkSync(f);
              console.log(`   🗑️  Deleted: ${f}`);
            });
            break;
          case 'S':
            globalAction = 'skip-all';
            action = 'skip';
            break;
          case 'V':
            globalAction = 'version-all';
            action = 'version';
            versionSuffix = `-v${getNextVersion(workItem)}`;
            break;
          default:
            console.log('   Invalid choice, skipping...');
            action = 'skip';
        }
      } else if (globalAction === 'overwrite-all') {
        action = 'generate';
        existingFiles.forEach(f => {
          fs.unlinkSync(f);
          console.log(`   🗑️  Deleted: ${f}`);
        });
      } else if (globalAction === 'skip-all') {
        action = 'skip';
      } else if (globalAction === 'version-all') {
        action = 'version';
        versionSuffix = `-v${getNextVersion(workItem)}`;
      }
    }

    if (action === 'skip') {
      console.log(`   ⏭️  Skipped: ${workItem}`);
      results.skipped.push(workItem);
      continue;
    }

    try {
      const generator = new FeatureGenerator('src/features', generationMode, userScenarios);
      
      if (action === 'version') {
        console.log(`   📝 Creating version: ${workItem}${versionSuffix}`);
      }

      await generator.generateWithSuffix(workItem, versionSuffix);
      results.generated.push(workItem + versionSuffix);
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      results.failed.push(workItem);
    }
  }

  // Summary
  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  
  if (results.generated.length > 0) {
    console.log(`✅ Generated: ${results.generated.length}`);
    results.generated.forEach(w => console.log(`   - ${w}`));
  }
  
  if (results.skipped.length > 0) {
    console.log(`⏭️  Skipped: ${results.skipped.length}`);
    results.skipped.forEach(w => console.log(`   - ${w}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}`);
    results.failed.forEach(w => console.log(`   - ${w}`));
  }

  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Review generated feature files');
  console.log('   2. Customize steps for your specific requirements');
  console.log('   3. Create/update step definitions');
  console.log('   4. Run: npm run validate:steps');
  console.log('   5. Run: npm run test:tag @<JIRA-KEY>');
  console.log('');
  
  // Close readline interface when done
  closeReadlineInterface();
}

main().catch((error) => {
  console.error(`\n❌ Fatal error: ${error.message}`);
  process.exit(1);
});

