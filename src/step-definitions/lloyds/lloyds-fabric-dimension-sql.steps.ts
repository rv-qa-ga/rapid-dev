/**
 * Phase C — Fabric / warehouse SQL checks for `dimensionattributevaluecombination`
 * (opt-in: `LLOYDS_FABRIC_DIMENSION_SQL_ENABLED=1` + `LLOYDS_FNOFABRIC_SQLSERVER_*`).
 */

import * as path from 'path';

import { After, Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import {
  countRowsByMainAccountToken,
  extractOffsetMainAccountToken,
  getDimensionCombinationSchemaTable,
  isLloydsFabricDimensionSqlReadEnabled,
} from '../../integrations/lloyds/dimensionAttributeValueCombinationSql';
import { LloydsFnOFabricSqlClient } from '../../integrations/lloyds/lloydsFnOFabricSqlClient';
import { isLloydsFnOFabricSqlConfigured } from '../../integrations/lloyds/lloydsFnOFabricSqlEnv';
import { extractLedgerDimensionDisplayRowsFromFile } from '../../integrations/lloyds/dimensionDisplayXml';
import { logger } from '../../utils/logger';

interface FabricSqlCtx {
  client?: LloydsFnOFabricSqlClient;
}

function fabricCtx(world: AutomationWorld): FabricSqlCtx {
  if (!world.testContext.lloydsFabricSql) world.testContext.lloydsFabricSql = {};
  return world.testContext.lloydsFabricSql as FabricSqlCtx;
}

After({ tags: '@lloyds-fabric-dimension-sql' }, async function (this: AutomationWorld) {
  const c = fabricCtx(this).client;
  if (c) {
    try {
      await c.close();
    } catch {
      /* ignore */
    }
    delete fabricCtx(this).client;
  }
});

Given("Lloyd's Fabric dimension SQL read is enabled", function (this: AutomationWorld) {
  if (!isLloydsFabricDimensionSqlReadEnabled()) {
    logger.warn('Lloyd Fabric dimension SQL: LLOYDS_FABRIC_DIMENSION_SQL_ENABLED unset — skipping.');
    return 'skipped';
  }
  if (!isLloydsFnOFabricSqlConfigured()) {
    logger.warn('Lloyd Fabric dimension SQL: LLOYDS_FNOFABRIC_SQLSERVER_HOST/DATABASE unset — skipping.');
    return 'skipped';
  }
});

When(
  "I validate distinct offset main account tokens from the committed sample XML against dbo dimensionattributevaluecombination",
  async function (this: AutomationWorld) {
    if (!isLloydsFabricDimensionSqlReadEnabled() || !isLloydsFnOFabricSqlConfigured()) {
      return 'skipped';
    }
    const dim = (this.testContext.pp392DimensionSample as { sampleXmlPath?: string } | undefined)?.sampleXmlPath;
    if (!dim) {
      throw new Error('No sample XML path — use Given the committed Lloyd\'s sample XML at "…" first.');
    }
    const abs = path.isAbsolute(dim) ? dim : path.resolve(process.cwd(), dim);
    const rows = extractLedgerDimensionDisplayRowsFromFile(abs);
    const tokens = new Set<string>();
    for (const r of rows) {
      const t = extractOffsetMainAccountToken(r.offsetAccountDisplayValue);
      if (t) tokens.add(t);
    }
    if (tokens.size === 0) {
      throw new Error(`No offset main account tokens extracted from ${abs}`);
    }
    const client = new LloydsFnOFabricSqlClient();
    fabricCtx(this).client = client;
    await client.connect();
    const failures: string[] = [];
    for (const tok of tokens) {
      const n = await countRowsByMainAccountToken(client, tok);
      if (n < 1) failures.push(`token="${tok}" count=${n}`);
    }
    if (failures.length) {
      throw new Error(
        `Fabric dimensionattributevaluecombination: no row for token(s): ${failures.join('; ')}. `
          + 'Check LLOYDS_FNOFABRIC_DAC_MAINACCOUNT_COLUMN / LLOYDS_FNOFABRIC_DAC_TABLE or SPN SELECT rights.',
      );
    }
    logger.info(`Lloyd Fabric SQL: OK — ${tokens.size} distinct offset main account token(s) matched.`);
  },
);

When(
  "I run Lloyd's Fabric SQL connectivity smoke against dimensionattributevaluecombination",
  async function (this: AutomationWorld) {
    if (!isLloydsFabricDimensionSqlReadEnabled() || !isLloydsFnOFabricSqlConfigured()) {
      return 'skipped';
    }
    const client = new LloydsFnOFabricSqlClient();
    fabricCtx(this).client = client;
    await client.connect();
    const table = getDimensionCombinationSchemaTable();
    const rows = await client.queryMany<{ n: number }>(`SELECT TOP (1) 1 AS n FROM ${table}`, process.env);
    if (!rows.length) {
      throw new Error(`Fabric SQL smoke: SELECT TOP 1 from ${table} returned no rows (empty table or no read access).`);
    }
  },
);
