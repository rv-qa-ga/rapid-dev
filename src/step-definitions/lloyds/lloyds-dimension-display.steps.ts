import * as path from 'path';

import { Given, Then } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import {
  assertLedgerDimensionDisplayRows,
  extractLedgerDimensionDisplayRowsFromFile,
} from '../../integrations/lloyds/dimensionDisplayXml';

interface DimensionSampleCtx {
  sampleXmlPath?: string;
}

function dimCtx(world: AutomationWorld): DimensionSampleCtx {
  if (!world.testContext.pp392DimensionSample) world.testContext.pp392DimensionSample = {};
  return world.testContext.pp392DimensionSample as DimensionSampleCtx;
}

Given('the committed Lloyd\'s sample XML at {string}', function (this: AutomationWorld, relPath: string) {
  const abs = path.resolve(process.cwd(), relPath);
  dimCtx(this).sampleXmlPath = abs;
});

Then('each ledger line dimension display fields should satisfy PP-392 tilde-segment rules', function (this: AutomationWorld) {
  const p = dimCtx(this).sampleXmlPath;
  if (!p) throw new Error('No sample XML path — use "the committed Lloyd\'s sample XML at \"…\"" first.');
  const rows = extractLedgerDimensionDisplayRowsFromFile(p);
  if (rows.length === 0) {
    throw new Error(`No <LEDGERJOURNALENTITY> blocks with dimension display tags in ${p}`);
  }
  assertLedgerDimensionDisplayRows(rows);
});
