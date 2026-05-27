/**
 * SF-1083 — re-attach the API HTML report to existing Zephyr executions whose
 * original attachment upload 503'd against the Zephyr Cloud / CloudFront edge.
 *
 * Reuses the framework's `zephyrClient.uploadExecutionAttachment(...)` (now
 * with built-in retry-with-backoff for 5xx / 429), so this is just a thin
 * driver around a known list of execution IDs.
 *
 * Usage:
 *   cross-env ENV=qamerge ts-node scripts/sf-1083/reattach-report-to-executions.ts \
 *     --report reports/sf-1083/SF-1083-API-Report-2026-05-11.html \
 *     --executions 2508726726,2508727049,2508727143,2508727448,2508727787,2508727970,2508728199,2508728424
 */
import { zephyrClient } from '../../src/integrations/zephyr/client';
import { logger } from '../../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

interface Args {
  report: string;
  executions: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = { report: '', executions: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--report') args.report = argv[++i];
    else if (a === '--executions') {
      args.executions = (argv[++i] || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  if (!args.report || args.executions.length === 0) {
    console.error('Usage: --report <path.html> --executions id1,id2,...');
    process.exit(2);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPath = path.resolve(args.report);
  if (!fs.existsSync(reportPath)) {
    logger.error(`Report file not found: ${reportPath}`);
    process.exit(1);
  }
  logger.info(`Re-attaching ${reportPath} to ${args.executions.length} execution(s)`);

  let okCount = 0;
  let failCount = 0;
  for (const id of args.executions) {
    try {
      await zephyrClient.uploadExecutionAttachment(id, reportPath);
      okCount++;
    } catch (e: any) {
      logger.error(`Failed to attach to execution ${id}: ${e?.message || e}`);
      failCount++;
    }
  }

  logger.info(`Re-attach summary: ok=${okCount}, fail=${failCount}, total=${args.executions.length}`);
  process.exit(failCount === 0 ? 0 : 3);
}

main().catch((e) => {
  logger.error(`FATAL: ${e?.stack || e?.message || e}`);
  process.exit(1);
});
