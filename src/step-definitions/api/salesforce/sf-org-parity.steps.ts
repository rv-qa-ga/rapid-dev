/**
 * QA vs UAT org parity checks (describeGlobal, REST describe, Tooling EntityDefinition).
 * Baseline: current ENV (e.g. qa) — credentials from `src/config/env/.env.qa` via the test runner.
 * UAT: JWT user and optional overrides read from `src/config/env/.env.uat` (SF_JWT_USERNAME in that file).
 * Optional: SF_PARITY_UAT_JWT_USERNAME in .env.qa overrides the UAT username if set.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceJWTAuth } from '../../../utils/jwt-auth';
import { logger } from '../../../utils/logger';
import {
  appendCustomFieldDiffSheet,
  defaultParityReportPath,
  fetchPermissionSets,
  filterDescribeGlobalRows,
  parseExcludePrefixes,
  writeDescribeGlobalParityWorkbook,
  type DescribeGlobalSObjectRow,
  type PermissionSetRow,
} from '../../../utils/sf-org-parity-report';

const UAT_ENV_FILE = path.resolve(process.cwd(), 'src/config/env/.env.uat');

/** Env keys merged from `.env.uat` only for the UAT JWT exchange, then restored. */
const UAT_JWT_OVERLAY_KEYS = [
  'SF_JWT_CLIENT_ID',
  'SF_CLIENT_ID',
  'SF_CERT_PATH',
  'SF_PRIVATE_KEY',
  'SF_LOGIN_URL',
  'SF_BASE_URL',
] as const;

function loadParsedDotenvUat(): Record<string, string> {
  if (!fs.existsSync(UAT_ENV_FILE)) {
    throw new Error(
      `UAT env file not found: ${UAT_ENV_FILE}. Create it with SF_JWT_USERNAME (UAT org user) and the same or UAT-specific JWT settings as your Connected App.`
    );
  }
  const raw = fs.readFileSync(UAT_ENV_FILE, 'utf-8');
  return dotenv.parse(raw) as Record<string, string>;
}

function resolveUatJwtUsername(uatParsed: Record<string, string>): string {
  const fromQaOverride = process.env.SF_PARITY_UAT_JWT_USERNAME?.trim();
  if (fromQaOverride) {
    return fromQaOverride;
  }
  const u = (uatParsed.SF_JWT_USERNAME || uatParsed.SF_USERNAME || '').trim();
  if (!u) {
    throw new Error(
      `Set SF_JWT_USERNAME in ${UAT_ENV_FILE} to your UAT JWT integration user, or set SF_PARITY_UAT_JWT_USERNAME in .env.${process.env.ENV || 'qa'}.`
    );
  }
  return u;
}

const CTX_BASELINE_CUSTOM = 'sfParityBaselineCustomObjectNames';
const CTX_UAT_CUSTOM = 'sfParityUatCustomObjectNames';
const CTX_BASELINE_ENTITIES = 'sfParityBaselineEntityApiNames';
const CTX_UAT_ENTITIES = 'sfParityUatEntityApiNames';

function sortedCustomNamesFromDescribeGlobal(body: {
  sobjects: Array<{ name: string; custom: boolean }>;
}): string[] {
  return body.sobjects
    .filter((s) => s.custom && s.name && s.name.endsWith('__c'))
    .map((s) => s.name)
    .sort();
}

function fieldApiNames(describeBody: { fields?: Array<{ name: string }> }): Set<string> {
  const names = new Set<string>();
  if (!Array.isArray(describeBody.fields)) {
    return names;
  }
  for (const f of describeBody.fields) {
    if (f?.name) {
      names.add(f.name);
    }
  }
  return names;
}

Given(
  'I have paired Salesforce API clients for QA baseline and UAT target parity',
  async function (this: AutomationWorld) {
    const uatParsed = loadParsedDotenvUat();
    const uatUser = resolveUatJwtUsername(uatParsed);

    await this.initAPI();

    const baseline = new SalesforceAPIClient(this.apiContext);
    await baseline.authenticate();
    logger.info('Parity baseline client authenticated (current ENV Salesforce config)');

    const backup: Record<string, string | undefined> = {};
    for (const key of UAT_JWT_OVERLAY_KEYS) {
      const v = uatParsed[key]?.trim();
      if (v) {
        backup[key] = process.env[key];
        process.env[key] = v;
      }
    }

    let uatAuth;
    try {
      uatAuth = await SalesforceJWTAuth.authenticate(uatUser);
    } finally {
      for (const key of Object.keys(backup)) {
        const prev = backup[key];
        if (prev === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = prev;
        }
      }
    }

    const uatClient = new SalesforceAPIClient(this.apiContext);
    uatClient.applyJwtAuthResult(uatAuth);
    logger.info(`Parity UAT client: ${uatAuth.instanceUrl} (user ${uatUser})`);

    this.testContext.sfParityBaselineClient = baseline;
    this.testContext.sfParityUatClient = uatClient;
    this.testContext.sfParityBaselineInstanceUrl = baseline.getInstanceUrl();
    this.testContext.sfParityUatInstanceUrl = uatClient.getInstanceUrl();
  }
);

When('I capture describe-global custom object names from the parity baseline org', async function (this: AutomationWorld) {
  const client = this.testContext.sfParityBaselineClient as SalesforceAPIClient | undefined;
  if (!client) {
    throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
  }
  const dg = await client.describeGlobal();
  const names = sortedCustomNamesFromDescribeGlobal(dg);
  this.testContext[CTX_BASELINE_CUSTOM] = names;
  logger.info(`Baseline custom objects (__c): ${names.length}`);
});

When('I capture describe-global custom object names from the parity UAT org', async function (this: AutomationWorld) {
  const client = this.testContext.sfParityUatClient as SalesforceAPIClient | undefined;
  if (!client) {
    throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
  }
  const dg = await client.describeGlobal();
  const names = sortedCustomNamesFromDescribeGlobal(dg);
  this.testContext[CTX_UAT_CUSTOM] = names;
  logger.info(`UAT custom objects (__c): ${names.length}`);
});

function assertStrictSetMatch(
  label: string,
  baseline: string[],
  target: string[],
  maxList: number
): void {
  const a = new Set(baseline);
  const b = new Set(target);
  const onlyBaseline = baseline.filter((x) => !b.has(x));
  const onlyTarget = target.filter((x) => !a.has(x));
  if (onlyBaseline.length > 0 || onlyTarget.length > 0) {
    const parts: string[] = [];
    if (onlyBaseline.length > 0) {
      parts.push(
        `only in baseline (${onlyBaseline.length}): ${onlyBaseline.slice(0, maxList).join(', ')}` +
          (onlyBaseline.length > maxList ? ' …' : '')
      );
    }
    if (onlyTarget.length > 0) {
      parts.push(
        `only in UAT (${onlyTarget.length}): ${onlyTarget.slice(0, maxList).join(', ')}` +
          (onlyTarget.length > maxList ? ' …' : '')
      );
    }
    throw new Error(`${label} strict mismatch — ${parts.join(' | ')}`);
  }
  logger.info(`${label}: strict match OK (${baseline.length} names)`);
}

Then(
  'describe-global custom object API names should match strictly between baseline and UAT',
  async function (this: AutomationWorld) {
    const baseline: string[] = this.testContext[CTX_BASELINE_CUSTOM] || [];
    const uat: string[] = this.testContext[CTX_UAT_CUSTOM] || [];
    assertStrictSetMatch('describeGlobal custom objects (__c)', baseline, uat, 40);
  }
);

When(
  'I capture Tooling EntityDefinition custom API names with no namespace from the parity baseline org',
  async function (this: AutomationWorld) {
    const client = this.testContext.sfParityBaselineClient as SalesforceAPIClient | undefined;
    if (!client) {
      throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
    }
    const soql =
      "SELECT QualifiedApiName FROM EntityDefinition WHERE NamespacePrefix = null " +
      "AND IsCustomSetting = false AND QualifiedApiName LIKE '%__c' ORDER BY QualifiedApiName";
    const rows = (await client.toolingQueryAllRecords(soql)) as Array<{ QualifiedApiName?: string }>;
    const names = rows.map((r) => r.QualifiedApiName).filter((n): n is string => !!n);
    this.testContext[CTX_BASELINE_ENTITIES] = names;
    logger.info(`Baseline Tooling EntityDefinition (__c): ${names.length}`);
  }
);

When(
  'I capture Tooling EntityDefinition custom API names with no namespace from the parity UAT org',
  async function (this: AutomationWorld) {
    const client = this.testContext.sfParityUatClient as SalesforceAPIClient | undefined;
    if (!client) {
      throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
    }
    const soql =
      "SELECT QualifiedApiName FROM EntityDefinition WHERE NamespacePrefix = null " +
      "AND IsCustomSetting = false AND QualifiedApiName LIKE '%__c' ORDER BY QualifiedApiName";
    const rows = (await client.toolingQueryAllRecords(soql)) as Array<{ QualifiedApiName?: string }>;
    const names = rows.map((r) => r.QualifiedApiName).filter((n): n is string => !!n);
    this.testContext[CTX_UAT_ENTITIES] = names;
    logger.info(`UAT Tooling EntityDefinition (__c): ${names.length}`);
  }
);

Then(
  'Tooling custom EntityDefinition API names should match strictly between baseline and UAT',
  async function (this: AutomationWorld) {
    const baseline: string[] = this.testContext[CTX_BASELINE_ENTITIES] || [];
    const uat: string[] = this.testContext[CTX_UAT_ENTITIES] || [];
    assertStrictSetMatch('Tooling EntityDefinition (__c, no namespace)', baseline, uat, 40);
  }
);

When('I capture field API names for {string} from the parity baseline org', async function (this: AutomationWorld, objectApiName: string) {
  const client = this.testContext.sfParityBaselineClient as SalesforceAPIClient | undefined;
  if (!client) {
    throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
  }
  const safe = objectApiName.replace(/[^a-zA-Z0-9_]/g, '');
  if (safe !== objectApiName) {
    throw new Error(`Invalid object API name: ${objectApiName}`);
  }
  const d = await client.describeSObject(safe);
  const key = `sfParityBaselineFields_${safe}`;
  this.testContext[key] = fieldApiNames(d);
  logger.info(`Baseline ${safe} fields: ${(this.testContext[key] as Set<string>).size}`);
});

When('I capture field API names for {string} from the parity UAT org', async function (this: AutomationWorld, objectApiName: string) {
  const client = this.testContext.sfParityUatClient as SalesforceAPIClient | undefined;
  if (!client) {
    throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
  }
  const safe = objectApiName.replace(/[^a-zA-Z0-9_]/g, '');
  if (safe !== objectApiName) {
    throw new Error(`Invalid object API name: ${objectApiName}`);
  }
  const d = await client.describeSObject(safe);
  const key = `sfParityUatFields_${safe}`;
  this.testContext[key] = fieldApiNames(d);
  logger.info(`UAT ${safe} fields: ${(this.testContext[key] as Set<string>).size}`);
});

const CTX_REPORT_BASELINE_ROWS = 'sfParityReportBaselineSObjects';
const CTX_REPORT_UAT_ROWS = 'sfParityReportUatSObjects';
const CTX_REPORT_PATH = 'sfParityReportPath';

function reportObjectsMode(): 'all' | 'custom' {
  const m = (process.env.SF_PARITY_REPORT_OBJECTS || 'all').toLowerCase().trim();
  return m === 'custom' ? 'custom' : 'all';
}

When(
  'I capture describe-global all SObject rows from the parity baseline org for parity report',
  async function (this: AutomationWorld) {
    const client = this.testContext.sfParityBaselineClient as SalesforceAPIClient | undefined;
    if (!client) {
      throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
    }
    const dg = await client.describeGlobal();
    const rows: DescribeGlobalSObjectRow[] = (dg.sobjects || [])
      .filter((s: { name?: string }) => s.name && typeof s.name === 'string')
      .map((s: { name: string; label?: string; custom?: boolean }) => ({
        name: s.name,
        label: s.label ?? '',
        custom: !!s.custom,
      }));
    const exclude = parseExcludePrefixes(process.env.SF_PARITY_REPORT_EXCLUDE_PREFIXES);
    const filtered = filterDescribeGlobalRows(rows, reportObjectsMode(), exclude);
    this.testContext[CTX_REPORT_BASELINE_ROWS] = filtered;
    if ((process.env.SF_PARITY_REPORT_PERMISSION_SETS || 'true').toLowerCase() !== 'false') {
      this.testContext.sfParityReportBaselinePermissionSets = await fetchPermissionSets(client);
      logger.info(
        `Parity report: baseline PermissionSets: ${(this.testContext.sfParityReportBaselinePermissionSets as PermissionSetRow[]).length}`
      );
    }
    logger.info(`Parity report: baseline SObjects (${reportObjectsMode()}): ${filtered.length}`);
  }
);

When(
  'I capture describe-global all SObject rows from the parity UAT org for parity report',
  async function (this: AutomationWorld) {
    const client = this.testContext.sfParityUatClient as SalesforceAPIClient | undefined;
    if (!client) {
      throw new Error('Run "Given I have paired Salesforce API clients for QA baseline and UAT target parity" first.');
    }
    const dg = await client.describeGlobal();
    const rows: DescribeGlobalSObjectRow[] = (dg.sobjects || [])
      .filter((s: { name?: string }) => s.name && typeof s.name === 'string')
      .map((s: { name: string; label?: string; custom?: boolean }) => ({
        name: s.name,
        label: s.label ?? '',
        custom: !!s.custom,
      }));
    const exclude = parseExcludePrefixes(process.env.SF_PARITY_REPORT_EXCLUDE_PREFIXES);
    const filtered = filterDescribeGlobalRows(rows, reportObjectsMode(), exclude);
    this.testContext[CTX_REPORT_UAT_ROWS] = filtered;
    if ((process.env.SF_PARITY_REPORT_PERMISSION_SETS || 'true').toLowerCase() !== 'false') {
      this.testContext.sfParityReportUatPermissionSets = await fetchPermissionSets(client);
      logger.info(
        `Parity report: UAT PermissionSets: ${(this.testContext.sfParityReportUatPermissionSets as PermissionSetRow[]).length}`
      );
    }
    logger.info(`Parity report: UAT SObjects (${reportObjectsMode()}): ${filtered.length}`);
  }
);

When('I write the QA vs UAT parity workbook to Excel', async function (this: AutomationWorld) {
  const baselineRows = this.testContext[CTX_REPORT_BASELINE_ROWS] as DescribeGlobalSObjectRow[] | undefined;
  const uatRows = this.testContext[CTX_REPORT_UAT_ROWS] as DescribeGlobalSObjectRow[] | undefined;
  if (!baselineRows || !uatRows) {
    throw new Error('Run both parity report capture steps for baseline and UAT first.');
  }
  const out =
    process.env.SF_PARITY_REPORT_OUTPUT?.trim() ||
    defaultParityReportPath();
  const baselineClient = this.testContext.sfParityBaselineClient as SalesforceAPIClient;
  const uatClient = this.testContext.sfParityUatClient as SalesforceAPIClient;
  const baselineLabel =
    (this.testContext.sfParityBaselineInstanceUrl as string) || baselineClient.getInstanceUrl();
  const uatLabel = (this.testContext.sfParityUatInstanceUrl as string) || uatClient.getInstanceUrl();

  const psB = this.testContext.sfParityReportBaselinePermissionSets as PermissionSetRow[] | undefined;
  const psU = this.testContext.sfParityReportUatPermissionSets as PermissionSetRow[] | undefined;

  await writeDescribeGlobalParityWorkbook({
    baselineRows,
    uatRows,
    permissionSets: psB && psU ? { baseline: psB, uat: psU } : undefined,
    outputPath: out,
    baselineInstanceLabel: baselineLabel,
    uatInstanceLabel: uatLabel,
  });

  const maxField = Math.max(0, parseInt(process.env.SF_PARITY_REPORT_FIELD_DIFF_MAX || '0', 10) || 0);
  if (maxField > 0) {
    await appendCustomFieldDiffSheet({
      workbookPath: out,
      baselineClient,
      uatClient,
      baselineRows,
      uatRows,
      maxObjects: maxField,
    });
  } else {
    logger.info('Parity report: SF_PARITY_REPORT_FIELD_DIFF_MAX not set or 0 — skipping CustomFieldDiffs sheet');
  }

  this.testContext[CTX_REPORT_PATH] = out;
  logger.info(`Parity report path: ${out}`);
});

Then('the parity report workbook should exist on disk', async function (this: AutomationWorld) {
  const p = this.testContext[CTX_REPORT_PATH] as string | undefined;
  if (!p) {
    throw new Error('Report path missing; run "I write the QA vs UAT parity workbook to Excel" first.');
  }
  if (!fs.existsSync(p)) {
    throw new Error(`Parity report not found at ${p}`);
  }
  logger.info(`Parity report verified: ${p}`);
});

Then(
  'custom fields on {string} should match strictly between baseline and UAT describe',
  async function (this: AutomationWorld, objectApiName: string) {
    const safe = objectApiName.replace(/[^a-zA-Z0-9_]/g, '');
    if (safe !== objectApiName) {
      throw new Error(`Invalid object API name: ${objectApiName}`);
    }
    const baseline = this.testContext[`sfParityBaselineFields_${safe}`] as Set<string> | undefined;
    const uat = this.testContext[`sfParityUatFields_${safe}`] as Set<string> | undefined;
    if (!baseline || !uat) {
      throw new Error(`Run capture steps for ${safe} on both orgs first.`);
    }
    const baselineCustom = [...baseline].filter((f) => f.endsWith('__c')).sort();
    const uatCustom = [...uat].filter((f) => f.endsWith('__c')).sort();
    assertStrictSetMatch(`SObject ${safe} custom fields (__c)`, baselineCustom, uatCustom, 50);
  }
);
