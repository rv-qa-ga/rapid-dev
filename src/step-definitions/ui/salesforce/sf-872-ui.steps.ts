/**
 * SF-872 / SF-1015 — UI: Lightning list + new form reachable (object creation scope).
 * Migration row data / Excel content is out of scope.
 */

import type { Page } from '@playwright/test';
import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { config } from '../../../config/config';
import { logger } from '../../../utils/logger';
import {
  buildUiObjectCreationRows,
  buildUiReadOnlyGovernanceRows,
  type Sf872ComparisonRow,
} from '../../../utils/sf872-object-creation-verify';
import { writeSf872ComparisonReport } from '../../../utils/sf872-comparison-report';

const SF872_REFERENCE_LINE =
  'N/A — SF-872 validates Lightning reachability; Excel workbooks are migration sources, not UI expected values.';

/** Lightning Experience host for /lightning/o/... URLs (not the SOAP/API my.salesforce.com host). */
function toLightningExperienceBaseUrl(url: string): string {
  const u = url.replace(/\/$/, '');
  if (u.includes('.lightning.force.com')) return u;
  if (u.includes('.my.salesforce.com')) {
    return u.replace('.my.salesforce.com', '.lightning.force.com');
  }
  return u;
}

function lightningBaseUrlForSf872(world: AutomationWorld): string {
  const envUrl = (process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL || '').trim();
  if (envUrl) return toLightningExperienceBaseUrl(envUrl);

  const fromAuth = world.testContext?.authResult?.instanceUrl as string | undefined;
  if (fromAuth?.trim()) return toLightningExperienceBaseUrl(fromAuth.trim());

  const base = config.getSalesforceConfig().baseUrl?.trim();
  if (base) return toLightningExperienceBaseUrl(base);

  throw new Error(
    'Cannot resolve Lightning base URL for SF-872 UI. Set SALESFORCE_INSTANCE_URL (or SF_INSTANCE_URL), or ensure JWT auth / Salesforce baseUrl is configured.'
  );
}

/**
 * LEX list/new pages often show the global header before Aura renders the body.
 * LWC surfaces often live in closed shadow roots — avoid brittle tag selectors that never match.
 * Use load + networkidle + spinners, then a main-workspace size heuristic (soft timeout).
 */
async function waitForSf872LightningSurface(page: Page): Promise<void> {
  await page.waitForLoadState('load', { timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page
    .locator('.slds-spinner, .forceListViewManagerSpinner, lightning-spinner')
    .first()
    .waitFor({ state: 'hidden', timeout: 45000 })
    .catch(() => {});

  await page
    .waitForFunction(
      () => {
        const bigEnough = (el: Element | null) => {
          if (!el) return false;
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.height > 160 && r.width > 320;
        };
        const selectors = [
          '.oneContent',
          '[role="main"]',
          '.navexDesktopLayoutContainer',
          '.workspace',
          '.desktop.container',
        ];
        for (const sel of selectors) {
          if (bigEnough(document.querySelector(sel))) return true;
        }
        const body = document.body;
        return !!(body && body.scrollHeight > 380);
      },
      { timeout: 35000 }
    )
    .catch(() => {
      logger.warn(
        'SF-872: LEX main-area heuristic timed out; continuing (page may still be settling for screenshots)'
      );
    });

  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
}

When(
  'I verify Lightning list and new form for SF-872 custom object {string}',
  async function (this: AutomationWorld, objectApiName: string) {
    const page = this.page;
    if (!page) throw new Error('Browser page not initialized.');

    const base = lightningBaseUrlForSf872(this);
    const listUrl = `${base}/lightning/o/${encodeURIComponent(objectApiName)}/list`;
    const newUrl = `${base}/lightning/o/${encodeURIComponent(objectApiName)}/new`;

    await page.goto(listUrl, { waitUntil: 'load', timeout: 90000 });
    await waitForSf872LightningSurface(page);
    const listUrlActual = page.url();
    const listOk = listUrlActual.includes(`/lightning/o/${objectApiName}/list`);

    await page.goto(newUrl, { waitUntil: 'load', timeout: 90000 });
    await waitForSf872LightningSurface(page);
    const newUrlActual = page.url();
    const newOk = newUrlActual.includes(`/lightning/o/${objectApiName}/new`);

    const formShellVisible = await page
      .locator('records-record-layout-item, lightning-input, .forceGeneratedLayout, lightning-record-edit-form')
      .first()
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    const rows = buildUiObjectCreationRows({
      objectApiName,
      listUrl,
      newUrl,
      listUrlActual,
      newUrlActual,
      listOk,
      newOk,
      formShellVisible,
    });

    this.testContext.sf872ObjectApiName = objectApiName;
    this.testContext.sf872UiComparisonRows = rows;
  }
);

When(
  'I verify Lightning list for SF-872 custom object {string} as read-only user without new record access',
  async function (this: AutomationWorld, objectApiName: string) {
    const page = this.page;
    if (!page) throw new Error('Browser page not initialized.');

    const base = lightningBaseUrlForSf872(this);
    const listUrl = `${base}/lightning/o/${encodeURIComponent(objectApiName)}/list`;
    const newUrl = `${base}/lightning/o/${encodeURIComponent(objectApiName)}/new`;

    await page.goto(listUrl, { waitUntil: 'load', timeout: 90000 });
    await waitForSf872LightningSurface(page);
    const listUrlActual = page.url();
    const listOk = listUrlActual.includes(`/lightning/o/${objectApiName}/list`);

    await page.goto(newUrl, { waitUntil: 'load', timeout: 90000 });
    await waitForSf872LightningSurface(page);
    const newUrlActual = page.url();
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const insufficient = /insufficient privileges|insufficient access|no access to this page|can't create|cannot create|you don['’]t have access/i.test(
      bodyText
    );
    const onNewPath = newUrlActual.includes(`/lightning/o/${objectApiName}/new`);
    const formShellVisible = await page
      .locator('records-record-layout-item, lightning-input, .forceGeneratedLayout, lightning-record-edit-form')
      .first()
      .isVisible({ timeout: 20000 })
      .catch(() => false);

    const newRecordAccessBlocked = insufficient || !onNewPath || !formShellVisible;

    const rows = buildUiReadOnlyGovernanceRows({
      objectApiName,
      listUrl,
      newUrl,
      listUrlActual,
      newUrlActual,
      listOk,
      newRecordAccessBlocked,
    });

    this.testContext.sf872ObjectApiName = objectApiName;
    this.testContext.sf872UiComparisonRows = rows;
  }
);

Then('I write the SF-872 UI object creation verification report', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872UiComparisonRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 UI verification data. Run the SF-872 Lightning verify step first.');
  }

  const objectApi = this.testContext.sf872ObjectApiName as string;
  const scenarioName = this.testContext.scenarioName as string | undefined;

  const outPath = writeSf872ComparisonReport(
    {
      kind: 'UI',
      title: `SF-872 UI — object creation — ${objectApi}`,
      objectApiName: objectApi,
      specPath: SF872_REFERENCE_LINE,
      scenarioName,
    },
    rows
  );

  this.testContext.sf872LastReportPath = outPath;
  logger.info(`SF-872 UI object creation report: ${outPath}`);
});

Then('the SF-872 Lightning object creation checks should pass', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872UiComparisonRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 UI verification data.');
  }

  const bad = rows.filter((r) => !r.ok);
  if (bad.length > 0) {
    const msg = bad.map((b) => `• ${b.check}: expected "${b.expected}" actual "${b.actual}"`).join('\n');
    const reportHint = this.testContext.sf872LastReportPath
      ? ` See report: ${this.testContext.sf872LastReportPath}`
      : '';
    throw new Error(`SF-872 UI object creation checks failed (${bad.length}):\n${msg}${reportHint}`);
  }
});

Then('I write the SF-872 UI governance verification report', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872UiComparisonRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 UI verification data. Run the SF-872 read-only Lightning step first.');
  }

  const objectApi = this.testContext.sf872ObjectApiName as string;
  const scenarioName = this.testContext.scenarioName as string | undefined;

  const outPath = writeSf872ComparisonReport(
    {
      kind: 'UI',
      title: `SF-872 UI — governance — ${objectApi}`,
      objectApiName: objectApi,
      specPath: SF872_REFERENCE_LINE,
      scenarioName,
    },
    rows
  );

  this.testContext.sf872LastReportPath = outPath;
  logger.info(`SF-872 UI governance report: ${outPath}`);
});

Then('the SF-872 UI governance checks should pass', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872UiComparisonRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 UI governance verification data.');
  }

  const bad = rows.filter((r) => !r.ok);
  if (bad.length > 0) {
    const msg = bad.map((b) => `• ${b.check}: expected "${b.expected}" actual "${b.actual}"`).join('\n');
    const reportHint = this.testContext.sf872LastReportPath
      ? ` See report: ${this.testContext.sf872LastReportPath}`
      : '';
    throw new Error(`SF-872 UI governance checks failed (${bad.length}):\n${msg}${reportHint}`);
  }
});
