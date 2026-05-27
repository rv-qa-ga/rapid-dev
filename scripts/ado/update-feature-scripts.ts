#!/usr/bin/env ts-node

/**
 * Update existing ADO feature files with SQL script references
 * 
 * This script scans for SQL scripts in src/features/sqlserver/sql-scripts/ and
 * updates corresponding feature files to include script references.
 */

import * as fs from 'fs';
import * as path from 'path';
import { updateFeatureFileWithScripts, findScriptsForWorkItem } from '../../src/integrations/azure-devops/updateFeatureWithScripts';
import { logger } from '../../src/utils/logger';

const FEATURES_DIR = 'src/features/sqlserver';
const SQL_SCRIPTS_DIR = 'src/features/sqlserver/sql-scripts';

/**
 * Extract work item ID from feature file name
 */
function extractWorkItemId(fileName: string): number | null {
  const match = fileName.match(/^ADO-(\d+)-/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Find feature file for a work item
 */
function findFeatureFile(workItemId: number): string | null {
  const files = fs.readdirSync(FEATURES_DIR);
  const pattern = new RegExp(`^ADO-${workItemId}-.+\\.feature$`, 'i');
  
  const featureFile = files.find(file => pattern.test(file));
  return featureFile ? path.join(FEATURES_DIR, featureFile) : null;
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    logger.info('🔍 Scanning for SQL scripts and updating feature files...');
    
    if (!fs.existsSync(SQL_SCRIPTS_DIR)) {
      logger.warn(`SQL scripts directory not found: ${SQL_SCRIPTS_DIR}`);
      return;
    }

    // Get all SQL script files
    const scriptFiles = fs.readdirSync(SQL_SCRIPTS_DIR).filter(f => f.endsWith('.sql'));
    
    if (scriptFiles.length === 0) {
      logger.info('No SQL scripts found to process');
      return;
    }

    logger.info(`Found ${scriptFiles.length} SQL script(s)`);

    // Group scripts by work item ID
    const scriptsByWorkItem = new Map<number, string[]>();
    
    scriptFiles.forEach(file => {
      const workItemId = extractWorkItemId(file);
      if (workItemId) {
        if (!scriptsByWorkItem.has(workItemId)) {
          scriptsByWorkItem.set(workItemId, []);
        }
        scriptsByWorkItem.get(workItemId)!.push(file);
      }
    });

    logger.info(`Found scripts for ${scriptsByWorkItem.size} work item(s)`);

    // Update each feature file
    for (const [workItemId, scriptFiles] of scriptsByWorkItem.entries()) {
      const featureFile = findFeatureFile(workItemId);
      
      if (!featureFile) {
        logger.warn(`No feature file found for work item ${workItemId}`);
        continue;
      }

      logger.info(`\n📝 Updating feature file for work item ${workItemId}...`);
      logger.info(`   Feature file: ${featureFile}`);
      logger.info(`   Scripts: ${scriptFiles.join(', ')}`);

      const scripts = findScriptsForWorkItem(workItemId, SQL_SCRIPTS_DIR);
      
      if (scripts.length > 0) {
        updateFeatureFileWithScripts(featureFile, scripts);
        logger.info(`✅ Updated feature file with ${scripts.length} script reference(s)`);
      }
    }

    logger.info('\n✅ Script update completed');
  } catch (error: any) {
    logger.error('❌ Error updating feature files:', error);
    process.exit(1);
  }
}

// Run the script
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

