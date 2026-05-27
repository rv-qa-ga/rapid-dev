/**
 * SF-861 — API: Opportunity Sub-Type conditional mandatory (Expansion only).
 * Reuses SF-883 Sub Type field resolution and create helpers.
 */

import { Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { config } from '../../../config/config';
import { logger } from '../../../utils/logger';
import {
  apiJwtUsernameForFactory,
  buildSubTypeFieldCandidates,
  createOpportunityWithSubTypeApi,
} from './sf-883.steps';

const OBJECT = 'Opportunity';

/**
 * Canonical list from SF-861 Field Configuration (exact labels).
 *
 * Story renames applied (per BA confirmation, screenshot of acceptance comment):
 *   - "Misc. UW Guideline Changes"  → "Underwriting Guideline Changes"
 *   - "Contract renewals"           → "Contract renewals/extensions"
 *
 * Open question (pending BA): qamerge picklist shows "Capacity Increase";
 * story doc shows "Contract Capacity Increase". Keeping the story label here
 * so the test surfaces the discrepancy until clarified — flip via env if
 * the BA confirms the shorter qamerge label is intentional.
 */
export const SF861_CANONICAL_SUBTYPE_VALUES: readonly string[] = (() => {
  const override = process.env.SF861_SUBTYPE_VALUES?.trim();
  if (override) {
    return override
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [
    'New Product',
    'Book-roll',
    'Contract Capacity Increase',
    'Underwriting Guideline Changes',
    'Rate & Commission Changes',
    'Contract renewals/extensions',
  ];
})();

/** Values that appeared in earlier drafts of AC4 but are STRUCK OUT and must NOT be active. */
export const SF861_STRUCK_OUT_SUBTYPE_VALUES: readonly string[] = [
  'Territorial Limits',
  'Misc. UW Guideline Changes',
  'Risk Exchange Transfers',
];

function expansionTypeLabel(): string {
  return (
    process.env.SF861_EXPANSION_TYPE?.trim() ||
    process.env.SF883_OPPORTUNITY_TYPE?.trim() ||
    process.env.SF977_OPPORTUNITY_TYPE?.trim() ||
    'Expansion'
  );
}

function nonExpansionTypeLabel(): string {
  return process.env.SF861_NON_EXPANSION_TYPE?.trim() || 'New Business';
}

function closeDateIso(): string {
  return new Date(Date.now() + 30 * 864e5).toISOString().split('T')[0];
}

async function resolveSubTypeApiName(world: AutomationWorld): Promise<string> {
  const cached = world.testContext.sf861SubTypeApiName as string | undefined;
  if (cached) return cached;
  const candidates = await buildSubTypeFieldCandidates(world);
  if (!candidates.length) {
    throw new Error(
      'SF-861: No Sub Type API field candidates. Set SF883_SUB_TYPE_API_FIELD or SF977_EXPANSION_SUB_TYPE_FIELD.'
    );
  }
  const apiName = candidates[0];
  world.testContext.sf861SubTypeApiName = apiName;
  logger.info(`SF-861: resolved Sub Type field: ${apiName}`);
  return apiName;
}

async function fetchOppFields(
  world: AutomationWorld,
  oppId: string,
  fields: string[]
): Promise<Record<string, unknown>> {
  const api = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (api) {
    return (await api.getRecordWithFields(OBJECT, oppId, fields)) as Record<string, unknown>;
  }
  // UI-only scenarios don't initialize an apiClient; fall back to TestDataFactory
  // (already authenticated as the same MRD user honoring SF_USE_QA_MRD_FOR_API).
  await testDataFactory.initialize(apiJwtUsernameForFactory(world));
  const soql = `SELECT ${fields.join(',')} FROM ${OBJECT} WHERE Id='${oppId}' LIMIT 1`;
  const res = (await testDataFactory.query(soql)) as { records?: Array<Record<string, unknown>> };
  if (!res.records || res.records.length === 0) {
    throw new Error(`SF-861: Opportunity ${oppId} not found via TestDataFactory query`);
  }
  return res.records[0];
}

When(
  'I attempt to create an Opportunity via API for SF861 with Type Expansion and blank Sub-Type',
  async function (this: AutomationWorld) {
    const api = this.testContext.apiClient as SalesforceAPIClient;
    const accountId = this.testContext.accountId as string;
    if (!api || !accountId) throw new Error('SF-861: need API client and accountId from Background.');

    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const subField = await resolveSubTypeApiName(this);
    const name = `SF861_AC1_${Date.now()}`;
    const body: Record<string, unknown> = {
      Name: name,
      AccountId: accountId,
      StageName: 'Pipeline',
      CloseDate: closeDateIso(),
      Type: expansionTypeLabel(),
    };
    // Explicitly omit Sub-Type; if org allows null column in POST, validation should still fire for Expansion.
    const raw = await api.createRecordRaw(OBJECT, body as Record<string, any>);
    this.testContext.sf861LastCreateRaw = raw;
    this.testContext.sf861ProbeOppName = name;
    logger.info(
      `SF-861: raw create Expansion without Sub-Type → ok=${raw.ok} http=${raw.httpStatus} subFieldResolved=${subField}`
    );
  }
);

Then('the SF861 Opportunity create should be rejected', async function (this: AutomationWorld) {
  const raw = this.testContext.sf861LastCreateRaw as { ok: boolean; httpStatus: number } | undefined;
  if (!raw) throw new Error('SF-861: run the attempt create step first.');
  expect(raw.ok, `SF-861: expected failed create, got ok=true http=${raw.httpStatus}`).toBe(false);
  expect(raw.httpStatus).toBeGreaterThanOrEqual(400);
});

Then(
  'the SF861 rejection should mention Sub Type or Sub_Type or Expansion validation',
  async function (this: AutomationWorld) {
    const raw = this.testContext.sf861LastCreateRaw as { rawText?: string; body?: unknown } | undefined;
    const text = `${raw?.rawText || ''} ${JSON.stringify(raw?.body || '')}`;
    const ok =
      /sub\s*[- ]?type|sub_type|Sub_Type|Expansion|Sub Type Required|Required if Type/i.test(text) ||
      /FIELD_CUSTOM_VALIDATION_EXCEPTION/i.test(text);
    expect(ok, `SF-861: unexpected error payload (expected Sub-Type / validation hint): ${text.slice(0, 1200)}`).toBe(
      true
    );
  }
);

When(
  'I create an Opportunity via API for SF861 with Type {string} and blank Sub-Type',
  async function (this: AutomationWorld, oppType: string) {
    const accountId = this.testContext.accountId as string;
    if (!accountId) throw new Error('SF-861: no accountId');
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const name = `SF861_AC2_${Date.now()}`;
    const rec = await testDataFactory.createOpportunity(
      {
        Name: name,
        Type: oppType,
        Stage: 'Pipeline',
        CloseDate: closeDateIso(),
      },
      accountId
    );
    this.testContext.sf861OpportunityId = rec.id;
    this.testContext.sf861OpportunityName = name;
    logger.info(`SF-861: created Opportunity ${rec.id} Type=${oppType} (no Sub-Type in payload)`);
  }
);

When(
  'I create an Opportunity via API for SF861 with Type Expansion and Sub-Type {string}',
  async function (this: AutomationWorld, subType: string) {
    const accountId = this.testContext.accountId as string;
    if (!accountId) throw new Error('SF-861: no accountId');
    const name = `SF861_AC5_${Date.now()}`;
    const { id, subTypeField } = await createOpportunityWithSubTypeApi(
      this,
      accountId,
      name,
      subType,
      {
        Type: expansionTypeLabel(),
        CloseDate: closeDateIso(),
        Stage: 'Pipeline',
      }
    );
    this.testContext.sf861OpportunityId = id;
    if (subTypeField) this.testContext.sf861SubTypeApiName = subTypeField;
    logger.info(`SF-861: created Expansion Opp ${id} Sub-Type="${subType}"`);
  }
);

Given(
  'an Opportunity exists for SF861 with Type Expansion and Sub-Type {string}',
  async function (this: AutomationWorld, subType: string) {
    const accountId = this.testContext.accountId as string;
    if (!accountId) throw new Error('SF-861: no accountId');
    const name = `SF861_EXP_OPP_${Date.now()}`;
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const pinnedField =
      process.env.SF883_SUB_TYPE_API_FIELD?.trim() ||
      process.env.SF977_EXPANSION_SUB_TYPE_FIELD?.trim();
    if (pinnedField) {
      const rec = await testDataFactory.createOpportunity(
        {
          Name: name,
          Type: expansionTypeLabel(),
          Stage: 'Pipeline',
          CloseDate: closeDateIso(),
          [pinnedField]: subType,
        } as Record<string, unknown>,
        accountId
      );
      this.testContext.sf861OpportunityId = rec.id;
      this.testContext.sf861SubTypeApiName = pinnedField;
      logger.info(`SF-861: seed Expansion Opp ${rec.id} Sub-Type="${subType}" (pinned field ${pinnedField})`);
      return;
    }
    const { id, subTypeField } = await createOpportunityWithSubTypeApi(
      this,
      accountId,
      name,
      subType,
      {
        Type: expansionTypeLabel(),
        CloseDate: closeDateIso(),
        Stage: 'Pipeline',
      }
    );
    this.testContext.sf861OpportunityId = id;
    if (subTypeField) this.testContext.sf861SubTypeApiName = subTypeField;
    logger.info(`SF-861: seed Expansion Opp ${id} Sub-Type="${subType}"`);
  }
);

// AC3-specific Type-change steps were removed (story AC3 dropped — the
// "Type Cant be changed" validation rule prevents the mutation entirely).

Then('the SF861 Opportunity should have blank Sub-Type', async function (this: AutomationWorld) {
  const id = this.testContext.sf861OpportunityId as string;
  if (!id) throw new Error('SF-861: no opportunity id');
  const field = await resolveSubTypeApiName(this);
  const row = await fetchOppFields(this, id, [field, 'Type']);
  const v = row[field];
  const blank = v === null || v === undefined || String(v).trim() === '';
  expect(blank, `SF-861: expected blank ${field}, got ${JSON.stringify(v)}`).toBe(true);
});

Then('the SF861 Opportunity Type should be {string}', async function (this: AutomationWorld, expected: string) {
  const id = this.testContext.sf861OpportunityId as string;
  if (!id) throw new Error('SF-861: no opportunity id');
  const row = await fetchOppFields(this, id, ['Type']);
  expect(String(row.Type), `SF-861: Type mismatch`).toBe(expected);
});

Then(
  'the SF861 Opportunity Type should match the configured Expansion value',
  async function (this: AutomationWorld) {
    const id = this.testContext.sf861OpportunityId as string;
    if (!id) throw new Error('SF-861: no opportunity id');
    const row = await fetchOppFields(this, id, ['Type']);
    expect(String(row.Type)).toBe(expansionTypeLabel());
  }
);

Then(
  'the SF861 Opportunity Type should match the configured non-Expansion value',
  async function (this: AutomationWorld) {
    const id = this.testContext.sf861OpportunityId as string;
    if (!id) throw new Error('SF-861: no opportunity id');
    const row = await fetchOppFields(this, id, ['Type']);
    expect(String(row.Type)).toBe(nonExpansionTypeLabel());
  }
);

Then('the SF861 Opportunity should have Sub-Type {string}', async function (this: AutomationWorld, expected: string) {
  const id = this.testContext.sf861OpportunityId as string;
  if (!id) throw new Error('SF-861: no opportunity id');
  const field = await resolveSubTypeApiName(this);
  const row = await fetchOppFields(this, id, [field]);
  expect(String(row[field])).toBe(expected);
});

Then(
  'the Sub-Type picklist active values for SF861 should match the canonical story list',
  async function (this: AutomationWorld) {
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const subField = await resolveSubTypeApiName(this);
    const d = await testDataFactory.describeSObject(OBJECT);
    const f = (d.fields || []).find((x: { name?: string }) => x.name === subField);
    if (!f || f.type !== 'picklist' || !Array.isArray(f.picklistValues)) {
      throw new Error(`SF-861: describe missing picklist metadata for ${subField}`);
    }
    const active = (f.picklistValues as { value?: string; active?: boolean }[])
      .filter((p) => p.active)
      .map((p) => p.value as string)
      .filter(Boolean)
      .sort();
    const want = [...SF861_CANONICAL_SUBTYPE_VALUES].sort();
    expect(active).toEqual(want);
  }
);

When('I convert the SF861 test Lead to Account and Opportunity', async function (this: AutomationWorld) {
  const leadId = this.testContext.leadId as string;
  if (!leadId) throw new Error('SF-861: no leadId — run Lead create step first.');
  await testDataFactory.initialize(apiJwtUsernameForFactory(this));
  const result = await testDataFactory.convertLead(leadId, {
    opportunityName: `SF861_LeadConv_${Date.now()}`,
  });
  if (!result.success) {
    throw new Error(`SF-861: Lead convert failed: ${JSON.stringify(result.errors || result)}`);
  }
  if (!result.opportunityId) throw new Error('SF-861: convert succeeded but no opportunityId');
  this.testContext.sf861OpportunityId = result.opportunityId;
  if (result.accountId) this.testContext.accountId = result.accountId;
  logger.info(`SF-861: converted Lead → Opp ${result.opportunityId}`);
});

Then(
  'the converted SF861 Opportunity Type should match the configured non-Expansion value',
  async function (this: AutomationWorld) {
    const id = this.testContext.sf861OpportunityId as string;
    if (!id) throw new Error('SF-861: no converted opportunity id');
    const row = await fetchOppFields(this, id, ['Type']);
    expect(String(row.Type)).toBe(nonExpansionTypeLabel());
  }
);

Then('the converted SF861 Opportunity should have blank Sub-Type', async function (this: AutomationWorld) {
  const id = this.testContext.sf861OpportunityId as string;
  if (!id) throw new Error('SF-861: no converted opportunity id');
  const field = await resolveSubTypeApiName(this);
  const row = await fetchOppFields(this, id, [field]);
  const v = row[field];
  const blank = v === null || v === undefined || String(v).trim() === '';
  expect(blank, `SF-861: expected blank Sub-Type after lead convert, got ${JSON.stringify(v)}`).toBe(true);
});

// ─── AC4 strike-outs ───────────────────────────────────────────────────────

Then(
  'the Sub-Type picklist for SF861 should not contain the SF-861 struck-out values',
  async function (this: AutomationWorld) {
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const subField = await resolveSubTypeApiName(this);
    const d = await testDataFactory.describeSObject(OBJECT);
    const f = (d.fields || []).find((x: { name?: string }) => x.name === subField);
    if (!f || !Array.isArray(f.picklistValues)) {
      throw new Error(`SF-861: describe missing picklist metadata for ${subField}`);
    }
    const active = new Set(
      (f.picklistValues as { value?: string; active?: boolean }[])
        .filter((p) => p.active && p.value)
        .map((p) => p.value as string)
    );
    const present = SF861_STRUCK_OUT_SUBTYPE_VALUES.filter((v) => active.has(v));
    expect(present, `SF-861: struck-out value(s) still active in picklist: ${present.join(', ')}`).toEqual([]);
  }
);

// ─── FR2 — Default Value None / no auto-populate (describe) ─────────────────

Then('the Sub-Type field for SF861 should have no default value via describe', async function (this: AutomationWorld) {
  await testDataFactory.initialize(apiJwtUsernameForFactory(this));
  const subField = await resolveSubTypeApiName(this);
  const d = await testDataFactory.describeSObject(OBJECT);
  const f = (d.fields || []).find((x: { name?: string }) => x.name === subField) as
    | { defaultValue?: unknown; defaultedOnCreate?: boolean }
    | undefined;
  if (!f) throw new Error(`SF-861: describe missing field ${subField}`);
  const dv = f.defaultValue;
  const blank = dv === null || dv === undefined || (typeof dv === 'string' && dv.trim() === '');
  expect(blank, `SF-861: expected no defaultValue on ${subField}, got ${JSON.stringify(dv)}`).toBe(true);
});

Then(
  'the Sub-Type field for SF861 should not be defaulted on create via describe',
  async function (this: AutomationWorld) {
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const subField = await resolveSubTypeApiName(this);
    const d = await testDataFactory.describeSObject(OBJECT);
    const f = (d.fields || []).find((x: { name?: string }) => x.name === subField) as
      | { defaultedOnCreate?: boolean }
      | undefined;
    if (!f) throw new Error(`SF-861: describe missing field ${subField}`);
    expect(
      f.defaultedOnCreate === false,
      `SF-861: expected defaultedOnCreate=false on ${subField}, got ${JSON.stringify(f.defaultedOnCreate)}`
    ).toBe(true);
  }
);

// ─── Editable post-create (Field Configuration) ─────────────────────────────

When(
  'I update the Sub-Type for SF861 to {string} while Type stays Expansion',
  async function (this: AutomationWorld, newSubType: string) {
    const id = this.testContext.sf861OpportunityId as string;
    if (!id) throw new Error('SF-861: no opportunity id (seed via the "Expansion + Sub-Type" Given)');
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const field = await resolveSubTypeApiName(this);
    await testDataFactory.updateRecord(OBJECT, id, { [field]: newSubType });
    logger.info(`SF-861: PATCHed ${id} ${field} → "${newSubType}" (Type unchanged)`);
  }
);

Given(
  'an Opportunity exists for SF861 with Type non-Expansion and blank Sub-Type',
  async function (this: AutomationWorld) {
    const accountId = this.testContext.accountId as string;
    if (!accountId) throw new Error('SF-861: no accountId');
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const name = `SF861_NE_${Date.now()}`;
    const rec = await testDataFactory.createOpportunity(
      {
        Name: name,
        Type: nonExpansionTypeLabel(),
        Stage: 'Pipeline',
        CloseDate: closeDateIso(),
      },
      accountId
    );
    this.testContext.sf861OpportunityId = rec.id;
    logger.info(`SF-861: seed non-Expansion Opp ${rec.id} (Type=${nonExpansionTypeLabel()}, Sub-Type blank)`);
  }
);

When(
  'I attempt to set Sub-Type for SF861 to {string} while Type is non-Expansion',
  async function (this: AutomationWorld, subType: string) {
    const id = this.testContext.sf861OpportunityId as string;
    if (!id) throw new Error('SF-861: no opportunity id');
    await testDataFactory.initialize(apiJwtUsernameForFactory(this));
    const field = await resolveSubTypeApiName(this);
    let rejected = false;
    let rejectionMessage = '';
    try {
      await testDataFactory.updateRecord(OBJECT, id, { [field]: subType });
      logger.info(`SF-861: PATCH on non-Expansion accepted (org may rely on auto-clear instead).`);
    } catch (e: any) {
      rejected = true;
      rejectionMessage = String(e?.message || e);
      logger.info(`SF-861: PATCH on non-Expansion rejected: ${rejectionMessage.slice(0, 220)}`);
    }
    this.testContext.sf861NonExpPatchRejected = rejected;
    this.testContext.sf861NonExpPatchMessage = rejectionMessage;
  }
);

Then(
  'the SF861 Sub-Type set on non-Expansion should be either rejected or cleared',
  async function (this: AutomationWorld) {
    const id = this.testContext.sf861OpportunityId as string;
    if (!id) throw new Error('SF-861: no opportunity id');
    const rejected = this.testContext.sf861NonExpPatchRejected === true;
    const msg = (this.testContext.sf861NonExpPatchMessage as string) || '';
    if (rejected) {
      const looksLikeFieldDependency =
        /INVALID_FIELD_FOR_INSERT_UPDATE|FIELD_CUSTOM_VALIDATION|dependent picklist|controlling field|Sub Type|Sub_Type|Expansion/i.test(
          msg
        );
      expect(
        looksLikeFieldDependency,
        `SF-861: PATCH was rejected but with unexpected message: ${msg.slice(0, 600)}`
      ).toBe(true);
      return;
    }
    const field = await resolveSubTypeApiName(this);
    const row = await fetchOppFields(this, id, [field, 'Type']);
    const v = row[field];
    const blank = v === null || v === undefined || String(v).trim() === '';
    expect(
      blank,
      `SF-861: PATCH was accepted on non-Expansion Opp but Sub-Type was not cleared (got ${JSON.stringify(v)}, Type=${row.Type})`
    ).toBe(true);
  }
);

// ─── Tooling: Validation rule must be Active ─────────────────────────────────

Then(
  'the validation rule {string} on Opportunity should be Active for SF861',
  async function (this: AutomationWorld, ruleName: string) {
    const api = this.testContext.apiClient as SalesforceAPIClient;
    if (!api) throw new Error('SF-861: no API client');
    let v = config.getSalesforceConfig().apiVersion || '60.0';
    v = v.startsWith('v') ? v : `v${v}`;
    const soql = `SELECT Id, Active, ValidationName FROM ValidationRule WHERE EntityDefinition.QualifiedApiName = 'Opportunity' AND ValidationName = '${ruleName.replace(/'/g, "\\'")}'`;
    const endpoint = `/services/data/${v}/tooling/query/?q=${encodeURIComponent(soql.replace(/\s+/g, ' ').trim())}`;
    const res = await api.get(endpoint);
    if (!res.ok()) {
      throw new Error(`SF-861: Tooling query failed (${res.status()}). Body: ${(await res.text()).slice(0, 400)}`);
    }
    const json = (await res.json()) as { records?: Array<{ Id: string; Active: boolean; ValidationName: string }> };
    const records = json.records || [];
    expect(records.length, `SF-861: ValidationRule "${ruleName}" not found on Opportunity`).toBeGreaterThan(0);
    const active = records.find((r) => r.Active === true);
    expect(
      active,
      `SF-861: ValidationRule "${ruleName}" present but no Active=true row (records=${JSON.stringify(records)})`
    ).toBeTruthy();
    logger.info(`SF-861: validation rule "${ruleName}" Active=true (Id=${active!.Id})`);
  }
);
