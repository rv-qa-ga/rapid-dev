#!/usr/bin/env ts-node
/**
 * Exit 0 if sanity-plan.json has at least one runnable row; exit 1 otherwise.
 * Use in CI or pre-flight before PP-392 / Lloyd's Cucumber runs.
 *
 *   npm run lloyds:sanity:plan:check
 */

import * as path from 'path';

import { readSanityPlan, resolvePlanPath } from '../../src/integrations/lloyds/sanityPlanner';

function main(): void {
  const filePath = resolvePlanPath();
  const plan = readSanityPlan(filePath);
  if (!plan) {
    console.error(`No snapshot at ${path.relative(process.cwd(), filePath)}. Run npm run lloyds:sanity:plan`);
    process.exit(1);
    return;
  }
  if (plan.runnable.length === 0) {
    console.error(
      `Sanity plan has 0 runnable rows (${plan.blocked.length} blocked). ` +
        `Run: npm run lloyds:sanity:plan  (or if Storage list is denied: npm run lloyds:sanity:plan:from-docs-xml)`,
    );
    process.exit(1);
    return;
  }
  console.log(`OK: ${plan.runnable.length} runnable row(s) in ${path.relative(process.cwd(), filePath)}`);
}

main();
