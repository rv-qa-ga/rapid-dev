/**
 * Per-scenario QA vs UAT parity Excel export.
 * Triggered by feature/scenario tag @sf-parity-auto-report. Runs regardless of scenario pass/fail
 * so strict checks still surface a failure AND an Excel artifact is produced for review.
 */
import { After } from '@cucumber/cucumber';
import * as path from 'path';
import { AutomationWorld } from './world';
import { logger } from '../utils/logger';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import {
  appendCustomFieldDiffSheet,
  fetchPermissionSets,
  filterDescribeGlobalRows,
  parseExcludePrefixes,
  writeDescribeGlobalParityWorkbook,
  type DescribeGlobalSObjectRow,
} from '../utils/sf-org-parity-report';

function runStamp(): string {
  if (!process.env.__SF_PARITY_RUN_STAMP) {
    process.env.__SF_PARITY_RUN_STAMP = new Date().toISOString().replace(/[:.]/g, '-');
  }
  return process.env.__SF_PARITY_RUN_STAMP!;
}

function safeFileName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_\-.]/g, '_').slice(0, 120) || 'scenario';
}

function reportObjectsMode(): 'all' | 'custom' {
  const m = (process.env.SF_PARITY_REPORT_OBJECTS || 'all').toLowerCase().trim();
  return m === 'custom' ? 'custom' : 'all';
}

After({ tags: '@sf-parity-auto-report' }, async function (this: AutomationWorld, scenario: any) {
  const scenarioName: string = scenario?.pickle?.name || this.testContext?.scenarioName || 'parity-scenario';

  const baseline = this.testContext.sfParityBaselineClient as SalesforceAPIClient | undefined;
  const uat = this.testContext.sfParityUatClient as SalesforceAPIClient | undefined;
  if (!baseline || !uat) {
    logger.warn(
      `@sf-parity-auto-report: paired clients missing on testContext for scenario "${scenarioName}" (Background failed?); skipping Excel.`
    );
    return;
  }

  try {
    const includePs = (process.env.SF_PARITY_REPORT_PERMISSION_SETS || 'true').toLowerCase() !== 'false';
    const [dgB, dgU, psB, psU] = await Promise.all([
      baseline.describeGlobal(),
      uat.describeGlobal(),
      includePs ? fetchPermissionSets(baseline) : Promise.resolve([]),
      includePs ? fetchPermissionSets(uat) : Promise.resolve([]),
    ]);
    const baselineAll: DescribeGlobalSObjectRow[] = (dgB.sobjects || [])
      .filter((s: { name?: string }) => !!s.name)
      .map((s: { name: string; label?: string; custom?: boolean }) => ({
        name: s.name,
        label: s.label ?? '',
        custom: !!s.custom,
      }));
    const uatAll: DescribeGlobalSObjectRow[] = (dgU.sobjects || [])
      .filter((s: { name?: string }) => !!s.name)
      .map((s: { name: string; label?: string; custom?: boolean }) => ({
        name: s.name,
        label: s.label ?? '',
        custom: !!s.custom,
      }));

    const exclude = parseExcludePrefixes(process.env.SF_PARITY_REPORT_EXCLUDE_PREFIXES);
    const mode = reportObjectsMode();
    const baselineRows = filterDescribeGlobalRows(baselineAll, mode, exclude);
    const uatRows = filterDescribeGlobalRows(uatAll, mode, exclude);

    const baseDir = process.env.SF_PARITY_REPORT_DIR?.trim()
      || path.join(process.cwd(), 'reports', 'sf-org-parity', runStamp());
    const outPath = path.join(baseDir, `${safeFileName(scenarioName)}.xlsx`);

    await writeDescribeGlobalParityWorkbook({
      baselineRows,
      uatRows,
      permissionSets: includePs ? { baseline: psB, uat: psU } : undefined,
      outputPath: outPath,
      baselineInstanceLabel: baseline.getInstanceUrl(),
      uatInstanceLabel: uat.getInstanceUrl(),
    });

    const maxField = Math.max(0, parseInt(process.env.SF_PARITY_REPORT_FIELD_DIFF_MAX || '0', 10) || 0);
    if (maxField > 0) {
      await appendCustomFieldDiffSheet({
        workbookPath: outPath,
        baselineClient: baseline,
        uatClient: uat,
        baselineRows,
        uatRows,
        maxObjects: maxField,
      });
    }

    if (typeof (this as any).attach === 'function') {
      try {
        await (this as any).attach(`Parity workbook: ${outPath}`, 'text/plain');
      } catch {
        /* attach is best-effort */
      }
    }
    logger.info(`@sf-parity-auto-report: wrote ${outPath}`);
  } catch (err: any) {
    logger.warn(`@sf-parity-auto-report: skipped due to error (${err?.message || err})`);
  }
});
