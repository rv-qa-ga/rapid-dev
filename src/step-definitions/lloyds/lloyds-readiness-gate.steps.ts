/**
 * Manual readiness gate for Lloyd's post-cleanup E2E read-only runs.
 *
 * Operators clear queues, DLQ, containers, PROCESS_TRACKER, XML blobs, then reload data.
 * Before read-only cross-system checks run, they must confirm readiness:
 * - TTY: interactive Y/N prompt (unless ack env is already set).
 * - Non-TTY (CI): require LLOYDS_E2E_READINESS_ACK=1 (or true/yes).
 */

import * as readline from 'readline';

import { Given } from '@cucumber/cucumber';

import { logger } from '../../utils/logger';

function ackFromEnv(): boolean {
  const v = (process.env.LLOYDS_E2E_READINESS_ACK ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'y';
}

function promptYesNo(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
  });
}

Given("the Lloyd's E2E read-only readiness gate is satisfied", async function () {
  if (ackFromEnv()) {
    logger.info("Lloyd's E2E readiness: LLOYDS_E2E_READINESS_ACK is set — skipping prompt.");
    return;
  }

  if (process.stdin.isTTY && process.stdout.isTTY) {
    const ok = await promptYesNo(
      "\n[Lloyd's E2E] Confirm queues/DLQ/containers/PROCESS_TRACKER/XML cleanup is done AND data load to systems is complete.\n" +
        "Type 'yes' to continue, anything else to abort: ",
    );
    if (!ok) {
      throw new Error(
        "Lloyd's E2E readiness gate declined. Set LLOYDS_E2E_READINESS_ACK=1 for non-interactive ack after cleanup.",
      );
    }
    logger.info("Lloyd's E2E readiness: operator confirmed via TTY prompt.");
    return;
  }

  throw new Error(
    'Lloyd\'s E2E readiness: non-interactive run requires LLOYDS_E2E_READINESS_ACK=1 (or true/yes) after cleanup and data load.',
  );
});
