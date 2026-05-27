#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { zephyrClient, ZephyrExecution } from './client';
import { logger } from '../../utils/logger';
import { parseJiraKey, extractTags } from '../../utils/helpers';

/**
 * CLI script to update Zephyr Scale execution results
 * 
 * Usage:
 *   npm run zephyr:update -- --test-case ZEPHYR-123 --status PASS
 */

async function main() {
  const args = process.argv.slice(2);
  let testCaseKey: string | null = null;
  let status: 'PASS' | 'FAIL' | 'EXECUTING' | 'BLOCKED' = 'PASS';
  let comment: string | undefined;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--test-case' && args[i + 1]) {
      testCaseKey = args[i + 1];
      i++;
    } else if (args[i] === '--status' && args[i + 1]) {
      status = args[i + 1].toUpperCase() as any;
      i++;
    } else if (args[i] === '--comment' && args[i + 1]) {
      comment = args[i + 1];
      i++;
    }
  }

  if (!testCaseKey) {
    logger.error('Test case key is required. Use --test-case ZEPHYR-123');
    process.exit(1);
  }

  const execution: ZephyrExecution = {
    testCaseKey,
    status,
    comment,
  };

  try {
    await zephyrClient.createExecution(execution);
    logger.info(`✅ Execution result updated for ${testCaseKey}: ${status}`);
  } catch (error: any) {
    logger.error(`Failed to update execution: ${error.message}`);
    process.exit(1);
  }
}

main().catch((error) => {
  logger.error(`Error: ${error.message}`);
  process.exit(1);
});

