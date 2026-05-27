/**
 * Lloyd's Service Bus **read-only** runtime checks (queue depth / DLQ via admin API).
 *
 * @see `src/integrations/lloyds/serviceBusQueueAdmin.ts`
 */

import { Given, Then, When } from '@cucumber/cucumber';

import type { QueueRuntimeProperties } from '@azure/service-bus';

import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';
import {
  fetchLloydsQueueRuntimeForEnv,
  isLloydsSbReadEnabled,
} from '../../integrations/lloyds/serviceBusQueueAdmin';

function sbBag(world: AutomationWorld): {
  byQueue?: Record<string, QueueRuntimeProperties>;
} {
  if (!world.testContext.lloydsSbRuntime) world.testContext.lloydsSbRuntime = {};
  return world.testContext.lloydsSbRuntime as { byQueue?: Record<string, QueueRuntimeProperties> };
}

Given("Lloyd's Service Bus runtime admin read is enabled", function (this: AutomationWorld) {
  if (!isLloydsSbReadEnabled()) {
    logger.warn('Skipping Service Bus runtime read: set LLOYDS_SB_READ_ENABLED=1 and grant admin/read on the namespace.');
    return 'skipped';
  }
});

When('I fetch Lloyd\'s Service Bus runtime properties for queue {string}', async function (this: AutomationWorld, queueName: string) {
  if (!isLloydsSbReadEnabled()) {
    return 'skipped';
  }
  const props = await fetchLloydsQueueRuntimeForEnv(queueName);
  const bag = sbBag(this);
  if (!bag.byQueue) bag.byQueue = {};
  bag.byQueue[queueName] = props;
  logger.info(
    `SB runtime queue=${queueName} active=${props.activeMessageCount} deadLetter=${props.deadLetterMessageCount} scheduled=${props.scheduledMessageCount}`,
  );
});

Then(
  'Lloyd\'s Service Bus queue {string} should report non-negative active and dead-letter counts',
  function (this: AutomationWorld, queueName: string) {
    if (!isLloydsSbReadEnabled()) {
      return 'skipped';
    }
    const row = sbBag(this).byQueue?.[queueName];
    if (!row) {
      throw new Error(`No runtime properties fetched for queue "${queueName}" — run the fetch step first.`);
    }
    for (const [k, v] of [
      ['activeMessageCount', row.activeMessageCount],
      ['deadLetterMessageCount', row.deadLetterMessageCount],
    ] as const) {
      if (typeof v !== 'number' || Number.isNaN(v) || v < 0) {
        throw new Error(`Queue "${queueName}" invalid ${k}: ${String(v)}`);
      }
    }
  },
);
