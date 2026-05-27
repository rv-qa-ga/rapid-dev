/**
 * Dynamics 365 Finance (F&O) OData — opt-in connectivity (`LLOYDS_FNO_ODATA_ENABLED=1`).
 */

import { Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { probeFnoOdata } from '../../integrations/lloyds/lloydsFnOOdataClient';
import {
  buildFnoOdataRelativePathForRepo,
  isLloydsFnoOdataRepoProbeConfigured,
  isLloydsFnOOdataConfigured,
  isLloydsFnOOdataReadEnabled,
} from '../../integrations/lloyds/lloydsFnOOdataEnv';
import { logger } from '../../utils/logger';

interface FnoCtx {
  lastProbe?: { url: string; status: number; statusText: string };
}

function ctx(world: AutomationWorld): FnoCtx {
  if (!world.testContext.lloydsFnoOdata) world.testContext.lloydsFnoOdata = {};
  return world.testContext.lloydsFnoOdata as FnoCtx;
}

Given("Lloyd's F&O OData read is enabled", function (this: AutomationWorld) {
  if (!isLloydsFnOOdataReadEnabled()) {
    logger.warn("Lloyd's F&O OData: LLOYDS_FNO_ODATA_ENABLED unset — skipping.");
    return 'skipped';
  }
  if (!isLloydsFnOOdataConfigured()) {
    logger.warn("Lloyd's F&O OData: LLOYDS_FNO_ODATA_BASE_URL unset — skipping.");
    return 'skipped';
  }
  if (!this.apiContext) {
    throw new Error('world.apiContext is not initialised.');
  }
});

Given("Lloyd's F&O OData per-repository read is configured", function (this: AutomationWorld) {
  if (!isLloydsFnOOdataReadEnabled()) {
    logger.warn("Lloyd's F&O OData: LLOYDS_FNO_ODATA_ENABLED unset — skipping.");
    return 'skipped';
  }
  if (!isLloydsFnOOdataConfigured()) {
    logger.warn("Lloyd's F&O OData: LLOYDS_FNO_ODATA_BASE_URL unset — skipping.");
    return 'skipped';
  }
  if (!isLloydsFnoOdataRepoProbeConfigured()) {
    logger.warn(
      "Lloyd's F&O OData: set LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE with {repo} (OData path under /data) — skipping per-repo probe.",
    );
    return 'skipped';
  }
  if (!this.apiContext) {
    throw new Error('world.apiContext is not initialised.');
  }
});

When('I request F&O OData resource {string}', async function (this: AutomationWorld, relativePath: string) {
  if (!isLloydsFnOOdataReadEnabled() || !isLloydsFnOOdataConfigured()) {
    return 'skipped';
  }
  if (!this.apiContext) throw new Error('world.apiContext is not initialised.');
  const probe = await probeFnoOdata(this.apiContext, relativePath.trim());
  ctx(this).lastProbe = probe;
  logger.info(`[fno-odata] GET ${probe.url} → ${probe.status} ${probe.statusText}`);
});

When('I request F&O OData for repository {string}', async function (this: AutomationWorld, repoId: string) {
  if (!isLloydsFnOOdataReadEnabled() || !isLloydsFnOOdataConfigured() || !isLloydsFnoOdataRepoProbeConfigured()) {
    return 'skipped';
  }
  if (!this.apiContext) throw new Error('world.apiContext is not initialised.');
  const relativePath = buildFnoOdataRelativePathForRepo(repoId.trim());
  const probe = await probeFnoOdata(this.apiContext, relativePath);
  ctx(this).lastProbe = probe;
  logger.info(`[fno-odata] repo=${repoId} GET ${probe.url} → ${probe.status} ${probe.statusText}`);
});

Then('the F&O OData HTTP status should be {int}', function (this: AutomationWorld, expected: number) {
  if (!isLloydsFnOOdataReadEnabled() || !isLloydsFnOOdataConfigured()) {
    return 'skipped';
  }
  const p = ctx(this).lastProbe;
  if (!p) throw new Error('No F&O OData probe — run the When step first.');
  if (p.status !== expected) {
    throw new Error(`F&O OData expected HTTP ${expected}, got ${p.status} (${p.statusText}) for ${p.url}`);
  }
});
