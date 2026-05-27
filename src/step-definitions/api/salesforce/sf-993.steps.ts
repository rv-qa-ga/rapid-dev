/**
 * SF-993 — layout / delete cleanup: Tooling validation-rule coverage and schema checks
 * so hidden or deleted fields are not enforced by validation rules or required metadata.
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';

/**
 * REST describe (avoids ambiguous match with MuleSoft's "I describe the Account object fields").
 */
When('I fetch describe metadata for the {word} object', async function (this: AutomationWorld, objectType: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Run "Given I have a valid Salesforce API token" first.');
  }

  const describeResult = await apiClient.describeSObject(objectType);
  this.testContext.describeResult = describeResult;
  this.testContext.fieldsMetadata = describeResult.fields;
  (this.testContext as { describedObjectName?: string }).describedObjectName =
    describeResult.name || objectType;

  logger.info(`SF-993: Described ${objectType} (${describeResult.fields?.length ?? 0} fields)`);
});

/** Map feature wording to Salesforce object API names for Tooling EntityDefinition.DeveloperName */
function objectApiNameForValidationRules(word: string): string {
  const w = word.trim();
  const key = w.replace(/\s+/g, '').toLowerCase();
  const map: Record<string, string> = {
    lead: 'Lead',
    account: 'Account',
    contact: 'Contact',
    accountcontactrelation: 'AccountContactRelation',
    opportunity: 'Opportunity',
  };
  return map[key] || w;
}

/**
 * Normalize Tooling ValidationRule rows so shared Then steps (from SF-574) can read
 * ErrorConditionFormula / ErrorMessage from either top-level fields or Metadata JSON.
 */
function normalizeToolingValidationRule(record: Record<string, unknown>): Record<string, unknown> {
  let formula = String(record.ErrorConditionFormula ?? '');
  let message = String(record.ErrorMessage ?? '');
  const meta = record.Metadata as Record<string, unknown> | string | undefined;
  if (meta && typeof meta === 'object') {
    formula = formula || String(meta.errorConditionFormula ?? meta.formula ?? '');
    message = message || String(meta.errorMessage ?? '');
  } else if (typeof meta === 'string' && meta.trim()) {
    try {
      const m = JSON.parse(meta) as Record<string, unknown>;
      formula = formula || String(m.errorConditionFormula ?? m.formula ?? '');
      message = message || String(m.errorMessage ?? '');
    } catch {
      /* ignore */
    }
  }
  return {
    ...record,
    ErrorConditionFormula: formula,
    ErrorMessage: message,
    FullName: record.FullName ?? record.ValidationName ?? '',
  };
}

When(
  'I describe the {word} object validation rules via Tooling API',
  async function (this: AutomationWorld, objectWord: string) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) {
      throw new Error('API client not initialized. Run "Given I have a valid Salesforce API token" first.');
    }

    const entity = objectApiNameForValidationRules(objectWord);
    // ErrorConditionFormula is not a queryable column on ValidationRule in many orgs; formula lives in Metadata.
    const selectClause =
      'SELECT Id, FullName, ValidationName, Active, ErrorMessage, Metadata FROM ValidationRule';
    const byDeveloper = `${selectClause} WHERE EntityDefinition.DeveloperName = '${entity}'`;
    const byQualified = `${selectClause} WHERE EntityDefinition.QualifiedApiName = '${entity}'`;

    let result: { records?: Record<string, unknown>[] };
    try {
      result = await apiClient.toolingQuery<{ records?: Record<string, unknown>[] }>(byDeveloper);
    } catch (e: unknown) {
      logger.warn(
        `SF-993: Tooling query by DeveloperName failed (${e instanceof Error ? e.message : String(e)}); retrying QualifiedApiName`
      );
      result = await apiClient.toolingQuery<{ records?: Record<string, unknown>[] }>(byQualified);
    }

    const raw = result.records || [];
    this.testContext.validationRules = raw.map(normalizeToolingValidationRule);

    logger.info(
      `SF-993: Loaded ${this.testContext.validationRules.length} validation rule(s) for ${entity} via Tooling API`
    );
  }
);

Then(
  'the inspected field allows null or defaulted values on create',
  async function (this: AutomationWorld) {
    const field = this.testContext.currentFieldMetadata as
      | { name?: string; nillable?: boolean; defaultValue?: unknown; defaultValueFormula?: string | null }
      | undefined;
    if (!field) {
      throw new Error(
        'No field metadata in context. Run "When I describe the … object fields" then "When I inspect the … field metadata" first.'
      );
    }

    const hasDefault =
      field.defaultValue !== undefined &&
      field.defaultValue !== null &&
      String(field.defaultValue).trim() !== '';
    const hasDefaultFormula = !!(field.defaultValueFormula && String(field.defaultValueFormula).trim());

    if (field.nillable === false && !hasDefault && !hasDefaultFormula) {
      throw new Error(
        `SF-993: Field "${field.name}" is not nillable (nillable=false) and has no default — org may still require it on create.`
      );
    }

    logger.info(
      `SF-993: Field "${field.name}" is OK for create without explicit value (nillable=${field.nillable}, hasDefault=${hasDefault || hasDefaultFormula})`
    );
  }
);
