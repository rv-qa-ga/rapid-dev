/**
 * SF-872 / SF-1015 — API: custom object *creation* (describe/metadata only).
 * Migration row data in Excel is out of scope.
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

const DESCRIBE_EVIDENCE_MAX_CHARS = 18000;

function truncateForEvidenceJson(obj: unknown, max = DESCRIBE_EVIDENCE_MAX_CHARS): string {
  const s = JSON.stringify(obj, null, 2);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}\n… (truncated, ${s.length} chars total)`;
}

async function attachSf872DescribeEvidence(
  world: AutomationWorld,
  objectApiName: string,
  audit: Awaited<ReturnType<SalesforceAPIClient['fetchSObjectDescribeAudit']>>
): Promise<void> {
  const body = audit.body;
  let describeSummary: Record<string, unknown> = { note: 'non-object or parse error' };
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const b = body as {
      name?: string;
      label?: string;
      keyPrefix?: string;
      fields?: { name?: string; label?: string; type?: string }[];
    };
    describeSummary = {
      name: b.name,
      label: b.label,
      keyPrefix: b.keyPrefix,
      fieldsCount: Array.isArray(b.fields) ? b.fields.length : undefined,
      fieldsSample: Array.isArray(b.fields)
        ? b.fields.slice(0, 30).map((f) => ({ name: f.name, label: f.label, type: f.type }))
        : undefined,
    };
  }

  const payload = {
    evidenceType: 'sf872-sobject-describe',
    objectApiName,
    request: { method: 'GET', url: audit.requestUrl },
    response: { httpStatus: audit.status, ok: audit.ok },
    describeSummary,
    responseBody: truncateForEvidenceJson(body),
  };

  if (typeof world.attach === 'function') {
    await world.attach(JSON.stringify(payload, null, 2), 'application/json');
  }
}
import { buildApiObjectCreationRows, type Sf872ComparisonRow } from '../../../utils/sf872-object-creation-verify';
import {
  compareFieldMatrixToDescribe,
  loadExpectedFieldMatrix,
  type DescribeFieldLike,
} from '../../../utils/sf872-field-matrix';
import { writeSf872ComparisonReport } from '../../../utils/sf872-comparison-report';

When(
  'I verify Salesforce object {string} for SF-872 object creation',
  async function (this: AutomationWorld, objectApiName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const audit = await apiClient.fetchSObjectDescribeAudit(objectApiName);
    await attachSf872DescribeEvidence(this, objectApiName, audit);

    let describe: any = null;
    let describeError: string | undefined;
    if (
      audit.ok &&
      audit.body &&
      typeof audit.body === 'object' &&
      Array.isArray((audit.body as { fields?: unknown }).fields)
    ) {
      describe = audit.body;
    } else {
      describeError = audit.ok
        ? 'Describe response missing fields[]'
        : `HTTP ${audit.status}: ${truncateForEvidenceJson(audit.body, 2000)}`;
      logger.warn(`SF-872 describe failed for ${objectApiName}: ${describeError}`);
    }

    const rows = buildApiObjectCreationRows(objectApiName, describe, describeError);
    const matrixRelPath = `data/sf872/expected-fields/${objectApiName}.json`;
    this.testContext.sf872FieldMatrixPath = matrixRelPath;

    if (describe && !describeError) {
      try {
        const matrix = loadExpectedFieldMatrix(objectApiName);
        rows.push(
          ...compareFieldMatrixToDescribe(
            objectApiName,
            matrix,
            describe.fields as DescribeFieldLike[] | undefined,
            matrixRelPath
          )
        );
      } catch (e: any) {
        rows.push({
          check: 'Field matrix JSON',
          expected: matrixRelPath,
          actual: 'not loaded',
          ok: false,
          notes: e?.message || String(e),
        });
      }
    } else {
      rows.push({
        check: 'Field matrix JSON',
        expected: matrixRelPath,
        actual: 'skipped (describe failed)',
        ok: false,
        notes: 'Fix object describe first; then field matrix is compared',
      });
    }

    this.testContext.sf872ApiObjectName = objectApiName;
    this.testContext.sf872ApiComparisonRows = rows;
  }
);

Then('I write the SF-872 API object creation verification report', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872ApiComparisonRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 API verification data. Run the SF-872 verify step first.');
  }

  const objectApiName = this.testContext.sf872ApiObjectName as string;
  const scenarioName = this.testContext.scenarioName as string | undefined;

  const matrixPath = (this.testContext.sf872FieldMatrixPath as string) || undefined;
  const outPath = writeSf872ComparisonReport(
    {
      kind: 'API',
      title: `SF-872 API — object + field matrix — ${objectApiName}`,
      objectApiName,
      specPath:
        matrixPath ||
        'data/sf872/expected-fields/<Object__c>.json — run scripts/sf872-bootstrap-field-expectations.ts',
      scenarioName,
    },
    rows
  );

  this.testContext.sf872LastReportPath = outPath;
  logger.info(`SF-872 API object creation report: ${outPath}`);
});

Then('the SF-872 object creation API checks should pass', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872ApiComparisonRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 API verification data. Run the SF-872 verify step first.');
  }

  const bad = rows.filter((r) => !r.ok);
  if (bad.length > 0) {
    const msg = bad.map((b) => `• ${b.check}: expected "${b.expected}" actual "${b.actual}"`).join('\n');
    const reportHint = this.testContext.sf872LastReportPath
      ? ` See report: ${this.testContext.sf872LastReportPath}`
      : '';
    throw new Error(`SF-872 API object creation checks failed (${bad.length}):\n${msg}${reportHint}`);
  }
  logger.info('SF-872 API: object creation describe checks passed.');
});
