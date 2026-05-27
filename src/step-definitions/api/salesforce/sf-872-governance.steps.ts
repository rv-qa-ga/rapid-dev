/**
 * SF-872 — Access and governance model (roles, describe permissions, field history via Tooling).
 * Complements sf-872.steps.ts (object + field matrix). Uses representative object Sub_Product__c in features.
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import type { Sf872ComparisonRow } from '../../../utils/sf872-object-creation-verify';
import { writeSf872ComparisonReport } from '../../../utils/sf872-comparison-report';

function fieldByName(
  describe: { fields?: { name?: string; createable?: boolean; updateable?: boolean }[] },
  name: string
) {
  return describe.fields?.find((f) => f.name === name);
}

When(
  'I verify SF-872 Data Governance record permissions via describe for object {string}',
  async function (this: AutomationWorld, objectApiName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Use "Given I have a valid Salesforce API token as Data Governance user" first.');
    }

    const audit = await apiClient.fetchSObjectDescribeAudit(objectApiName);
    const rows: Sf872ComparisonRow[] = [];

    rows.push({
      check: 'SF-872 Data Governance scope',
      expected: 'Create, edit, deactivate (Valid To) on reference records',
      actual: 'REST describe permissions for current JWT user',
      ok: true,
    });

    if (!audit.ok || !audit.body || typeof audit.body !== 'object' || !Array.isArray((audit.body as { fields?: unknown }).fields)) {
      rows.push({
        check: `Describe ${objectApiName}`,
        expected: 'ok with fields[]',
        actual: `HTTP ${audit.status}`,
        ok: false,
      });
      this.testContext.sf872GovernanceRows = rows;
      this.testContext.sf872GovernanceObjectApiName = objectApiName;
      return;
    }

    const describe = audit.body as {
      createable?: boolean;
      updateable?: boolean;
      fields?: { name?: string; createable?: boolean; updateable?: boolean }[];
    };

    rows.push({
      check: 'Object createable',
      expected: 'true',
      actual: String(describe.createable),
      ok: describe.createable === true,
    });
    rows.push({
      check: 'Object updateable',
      expected: 'true',
      actual: String(describe.updateable),
      ok: describe.updateable === true,
    });

    const validTo = fieldByName(describe, 'Valid_To__c');
    rows.push({
      check: 'Valid_To__c updateable (deactivate / lifecycle)',
      expected: 'true',
      actual: String(validTo?.updateable),
      ok: validTo?.updateable === true,
    });

    const validFrom = fieldByName(describe, 'Valid_From__c');
    rows.push({
      check: 'Valid_From__c updateable',
      expected: 'true',
      actual: String(validFrom?.updateable),
      ok: validFrom?.updateable === true,
    });

    const subName = fieldByName(describe, 'Sub_Product_Name__c');
    const nameField = fieldByName(describe, 'Name');
    const editableLabel =
      subName?.updateable === true ? 'Sub_Product_Name__c' : nameField?.updateable === true ? 'Name' : 'none';

    rows.push({
      check: 'At least one primary label field updateable (edit records)',
      expected: 'Sub_Product_Name__c or Name updateable',
      actual: editableLabel,
      ok: subName?.updateable === true || nameField?.updateable === true,
      notes:
        objectApiName === 'Sub_Product__c'
          ? undefined
          : 'For other objects, extend this step with that object’s label field API names if needed.',
    });

    if (typeof this.attach === 'function') {
      await this.attach(
        JSON.stringify(
          {
            evidenceType: 'sf872-dg-describe',
            objectApiName,
            createable: describe.createable,
            updateable: describe.updateable,
          },
          null,
          2
        ),
        'application/json'
      );
    }

    this.testContext.sf872GovernanceRows = rows;
    this.testContext.sf872GovernanceObjectApiName = objectApiName;
    logger.info(`SF-872 Data Governance describe checks recorded for ${objectApiName}`);
  }
);

When(
  'I verify SF-872 read-only record permissions via describe for object {string}',
  async function (this: AutomationWorld, objectApiName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Use "Given I have a valid Salesforce API token as read-only user" first.');
    }

    const audit = await apiClient.fetchSObjectDescribeAudit(objectApiName);
    const rows: Sf872ComparisonRow[] = [];

    rows.push({
      check: 'SF-872 read-only scope',
      expected: 'View only; no create, edit, deactivate, or delete',
      actual: 'REST describe permissions for read-only JWT user',
      ok: true,
    });

    if (!audit.ok || !audit.body || typeof audit.body !== 'object' || !Array.isArray((audit.body as { fields?: unknown }).fields)) {
      rows.push({
        check: `Describe ${objectApiName}`,
        expected: 'ok with fields[]',
        actual: `HTTP ${audit.status}`,
        ok: false,
      });
      this.testContext.sf872GovernanceRows = rows;
      this.testContext.sf872GovernanceObjectApiName = objectApiName;
      return;
    }

    const describe = audit.body as {
      createable?: boolean;
      updateable?: boolean;
      deletable?: boolean;
      fields?: { name?: string; createable?: boolean; updateable?: boolean }[];
    };

    rows.push({
      check: 'Object not createable (read-only)',
      expected: 'false',
      actual: String(describe.createable),
      ok: describe.createable === false,
    });
    rows.push({
      check: 'Object not updateable (read-only)',
      expected: 'false',
      actual: String(describe.updateable),
      ok: describe.updateable === false,
    });
    rows.push({
      check: 'Object not deletable (read-only)',
      expected: 'false',
      actual: String(describe.deletable),
      ok: describe.deletable === false,
    });

    const validTo = fieldByName(describe, 'Valid_To__c');
    if (validTo) {
      rows.push({
        check: 'Valid_To__c not updateable (read-only)',
        expected: 'false',
        actual: String(validTo.updateable),
        ok: validTo.updateable === false,
      });
    }

    if (typeof this.attach === 'function') {
      await this.attach(
        JSON.stringify(
          {
            evidenceType: 'sf872-readonly-describe',
            objectApiName,
            createable: describe.createable,
            updateable: describe.updateable,
            deletable: describe.deletable,
          },
          null,
          2
        ),
        'application/json'
      );
    }

    this.testContext.sf872GovernanceRows = rows;
    this.testContext.sf872GovernanceObjectApiName = objectApiName;
    logger.info(`SF-872 read-only describe checks recorded for ${objectApiName}`);
  }
);

When(
  'I verify SF-872 field history tracking via Tooling for object {string}',
  async function (this: AutomationWorld, objectApiName: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Use admin API token first.');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(objectApiName)) {
      throw new Error(`Unsafe object API name for Tooling query: ${objectApiName}`);
    }

    const rows: Sf872ComparisonRow[] = [];
    rows.push({
      check: 'SF-872 auditability (Tooling)',
      expected: 'Field history on Name, Valid From, Valid To, governance fields',
      actual: 'FieldDefinition.IsFieldHistoryTracked',
      ok: true,
    });

    const trackedFields =
      objectApiName === 'Sub_Product__c'
        ? ['Name', 'Valid_From__c', 'Valid_To__c', 'Sub_Product_Name__c', 'Status__c']
        : ['Name', 'Valid_From__c', 'Valid_To__c'];

    const inList = trackedFields.map((n) => `'${n}'`).join(',');
    const soql = `SELECT QualifiedApiName, IsFieldHistoryTracked FROM FieldDefinition WHERE EntityDefinition.QualifiedApiName = '${objectApiName}' AND QualifiedApiName IN (${inList})`;

    type TRow = { QualifiedApiName: string; IsFieldHistoryTracked: boolean };
    let records: TRow[] = [];
    try {
      const result = await apiClient.toolingQuery<{ records?: TRow[] }>(soql);
      records = result.records || [];
    } catch (e: any) {
      rows.push({
        check: 'Tooling FieldDefinition query',
        expected: 'success',
        actual: e?.message || String(e),
        ok: false,
      });
      this.testContext.sf872GovernanceRows = rows;
      this.testContext.sf872GovernanceObjectApiName = objectApiName;
      return;
    }

    if (typeof this.attach === 'function') {
      await this.attach(JSON.stringify({ evidenceType: 'sf872-tooling-field-history', objectApiName, records }, null, 2), 'application/json');
    }

    for (const api of trackedFields) {
      const row = records.find((r) => r.QualifiedApiName === api);
      rows.push({
        check: `Field history tracked: ${api}`,
        expected: 'IsFieldHistoryTracked true',
        actual: row ? String(row.IsFieldHistoryTracked) : 'missing from Tooling result',
        ok: row?.IsFieldHistoryTracked === true,
      });
    }

    this.testContext.sf872GovernanceRows = rows;
    this.testContext.sf872GovernanceObjectApiName = objectApiName;
    logger.info(`SF-872 Tooling field history checks recorded for ${objectApiName}`);
  }
);

Then('I write the SF-872 governance verification report', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872GovernanceRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 governance rows. Run an SF-872 governance When step first.');
  }

  const objectApiName = this.testContext.sf872GovernanceObjectApiName as string;
  const scenarioName = this.testContext.scenarioName as string | undefined;

  const outPath = writeSf872ComparisonReport(
    {
      kind: 'API',
      title: `SF-872 API — governance — ${objectApiName}`,
      objectApiName,
      specPath: 'Jira SF-872 Access and Governance Model',
      scenarioName,
    },
    rows
  );

  this.testContext.sf872LastReportPath = outPath;
  logger.info(`SF-872 governance report: ${outPath}`);
});

Then('the SF-872 governance permission checks should pass', async function (this: AutomationWorld) {
  const rows = this.testContext.sf872GovernanceRows as Sf872ComparisonRow[] | undefined;
  if (!rows?.length) {
    throw new Error('No SF-872 governance rows.');
  }

  const bad = rows.filter((r) => !r.ok);
  if (bad.length > 0) {
    const msg = bad.map((b) => `• ${b.check}: expected "${b.expected}" actual "${b.actual}"`).join('\n');
    const reportHint = this.testContext.sf872LastReportPath ? ` See report: ${this.testContext.sf872LastReportPath}` : '';
    throw new Error(`SF-872 governance checks failed (${bad.length}):\n${msg}${reportHint}`);
  }
  logger.info('SF-872 governance checks passed.');
});
