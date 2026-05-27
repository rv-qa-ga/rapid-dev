#!/usr/bin/env ts-node
/**
 * Print Service Bus queue runtime metrics for Lloyd's programme queues (read-only).
 *
 * Requires: same SPN vars as send path + LLOYDS_SB_READ_ENABLED=1 (or pass --force to skip that check).
 *
 * Usage:
 *   cross-env ENV=qa LLOYDS_SB_READ_ENABLED=1 ts-node scripts/lloyds/probe-service-bus-queues.ts
 *   cross-env ENV=qa ts-node scripts/lloyds/probe-service-bus-queues.ts --force
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

import {
  getLloydsSbReadQueueNames,
  isLloydsSbReadEnabled,
  fetchLloydsQueueRuntimeForEnv,
} from '../../src/integrations/lloyds/serviceBusQueueAdmin';

const envPaths = [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../.env'),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), p)}`);
    break;
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  if (!isLloydsSbReadEnabled() && !force) {
    console.error('Set LLOYDS_SB_READ_ENABLED=1 or pass --force (not recommended in shared envs).');
    process.exit(1);
  }
  const queues = getLloydsSbReadQueueNames();
  const rows: Record<string, unknown>[] = [];
  for (const q of queues) {
    try {
      const p = await fetchLloydsQueueRuntimeForEnv(q);
      rows.push({
        queue: q,
        activeMessageCount: p.activeMessageCount,
        deadLetterMessageCount: p.deadLetterMessageCount,
        scheduledMessageCount: p.scheduledMessageCount,
        transferMessageCount: p.transferMessageCount,
        transferDeadLetterMessageCount: p.transferDeadLetterMessageCount,
      });
    } catch (e: unknown) {
      rows.push({ queue: q, error: e instanceof Error ? e.message : String(e) });
    }
  }
  console.log(JSON.stringify(rows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
