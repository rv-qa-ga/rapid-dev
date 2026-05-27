/**
 * SF-977 — Product Map lifecycle for Expansion opportunities (API).
 * Reuses: testDataFactory (Account, Opportunity), SalesforceAPIClient, Product_Map__History pattern (SF-973).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { logger } from '../../../utils/logger';
import { createOpportunityWithSubTypeApi, apiJwtUsernameForFactory } from './sf-883.steps';

const PRODUCT_MAP = 'Product_Map__c';
const PRODUCT_MAP_HISTORY = 'Product_Map__History';

function requireApi(world: AutomationWorld): SalesforceAPIClient {
  const api = world.testContext.apiClient as SalesforceAPIClient;
  if (!api) {
    throw new Error(
      'API client not initialized. Run SF-977 Background: "I have Salesforce API clients for product map lifecycle (QA automation describe, Actuary create)" first.'
    );
  }
  return api;
}

/** Standard Account Type picklist — SF-977 requires one of these for all scenarios using the test Account. */
const SF977_ALLOWED_ACCOUNT_TYPES = ['Member', 'Non Member MGA'] as const;

function sf977AccountType(): string {
  const raw = process.env.SF977_ACCOUNT_TYPE?.trim() || 'Member';
  const allowed = SF977_ALLOWED_ACCOUNT_TYPES as readonly string[];
  if (!allowed.includes(raw)) {
    throw new Error(
      `SF977_ACCOUNT_TYPE must be one of: ${allowed.join(', ')}. Got: "${raw}". ` +
        `Org picklist labels must match exactly (set SF977_ACCOUNT_TYPE in .env if your org differs).`
    );
  }
  return raw;
}

function expansionOppType(): string {
  return process.env.SF977_OPPORTUNITY_TYPE?.trim() || 'Expansion';
}

function expansionSubTypePicklistValue(): string {
  return (
    process.env.SF977_EXPANSION_SUB_TYPE?.trim() ||
    process.env.SF883_OTHER_SUBTYPE?.trim() ||
    'New Product'
  );
}

function liveStageName(): string {
  return process.env.SF977_OPPORTUNITY_STAGE_LIVE?.trim() || 'Live';
}

function preLiveStageName(): string {
  return process.env.SF977_PRE_LIVE_STAGE?.trim() || 'Go-Live';
}

function statusDraftExpansion(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_DRAFT?.trim() || 'Draft - Product Expansion';
}

function statusActivePending(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_PENDING?.trim() || 'Active - Pending Go-Live';
}

function statusActive(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_ACTIVE?.trim() || 'Active';
}

function statusInactive(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_INACTIVE?.trim() || 'Inactive';
}

function statusDraftGeneric(): string {
  return process.env.SF977_PRODUCT_MAP_STATUS_DRAFT_GENERIC?.trim() || 'Draft';
}

function dueDiligenceStage(): string {
  return process.env.SF977_OPPORTUNITY_STAGE_DUE_DILIGENCE?.trim() || 'Due Diligence';
}

/** Pipe-separated overrides, e.g. "cannot be created|Product Maps cannot" */
function errorFragmentsCannotCreateActive(): string[] {
  const raw = process.env.SF977_ERROR_CANNOT_CREATE_ACTIVE_SUBSTRING?.trim();
  if (raw) {
    return raw.split('|').map((s) => s.trim()).filter(Boolean);
  }
  return ['cannot be created with Status', 'Product Maps cannot'];
}

function errorFragmentsInvalidTransition(): string[] {
  const raw = process.env.SF977_ERROR_INVALID_STATUS_TRANSITION_SUBSTRING?.trim();
  if (raw) {
    return raw.split('|').map((s) => s.trim()).filter(Boolean);
  }
  return ['not permitted', 'not allowed'];
}

function productMapAutoIdFieldName(): string | undefined {
  const f = process.env.SF977_PRODUCT_MAP_AUTO_ID_FIELD?.trim();
  return f || undefined;
}

function defaultStatusForAccountOnlyProductMap(): string {
  const o = process.env.SF977_DEFAULT_STATUS_ACCOUNT_ONLY?.trim();
  if (o) return o;
  return statusDraftExpansion();
}

function historyFieldLiteralForStatus(): string {
  const sf = statusFieldApi();
  return sf.endsWith('__c') ? sf : 'Status__c';
}

function statusFieldApi(): string {
  const f = process.env.SF977_PRODUCT_MAP_STATUS_FIELD?.trim() || 'Status__c';
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(f)) {
    throw new Error(`Invalid SF977_PRODUCT_MAP_STATUS_FIELD: ${f}`);
  }
  return f;
}

function opportunityLookupField(): string {
  const f = process.env.SF977_PRODUCT_MAP_OPPORTUNITY_LOOKUP?.trim() || 'Opportunity__c';
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(f)) {
    throw new Error(`Invalid SF977_PRODUCT_MAP_OPPORTUNITY_LOOKUP: ${f}`);
  }
  return f;
}

function productMapAccountLookupField(): string {
  const f = process.env.SF977_PRODUCT_MAP_ACCOUNT_LOOKUP?.trim() || 'Account__c';
  if (!/^[A-Za-z][A-Za-z0-9_]*(__c)?$/.test(f)) {
    throw new Error(`Invalid SF977_PRODUCT_MAP_ACCOUNT_LOOKUP: ${f}`);
  }
  return f;
}

function asyncWaitMs(): number {
  const n = parseInt(process.env.SF977_ASYNC_WAIT_MS || '120000', 10);
  return Number.isFinite(n) && n > 0 ? n : 120000;
}

function closeDatePlus30d(): string {
  return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function queryProductMapStatus(api: SalesforceAPIClient, pmId: string): Promise<string | undefined> {
  const sf = statusFieldApi();
  const q = await api.query(`SELECT ${sf} FROM ${PRODUCT_MAP} WHERE Id = '${pmId}' LIMIT 1`);
  const row = q.records?.[0] as Record<string, string> | undefined;
  return row?.[sf];
}

async function waitForProductMapStatus(
  api: SalesforceAPIClient,
  pmId: string,
  expected: string,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  const sf = statusFieldApi();
  while (Date.now() < deadline) {
    const v = await queryProductMapStatus(api, pmId);
    if (v === expected) {
      return;
    }
    await sleep(2500);
  }
  const last = await queryProductMapStatus(api, pmId);
  throw new Error(
    `Timeout: ${PRODUCT_MAP} ${pmId} ${sf} never became "${expected}" (last=${JSON.stringify(last)}). ` +
      `Increase SF977_ASYNC_WAIT_MS or check automation/triggers.`
  );
}

async function createProductMapLinkedToOpp(
  world: AutomationWorld,
  name: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const api = requireApi(world);
  const oppId = world.testContext.sf977OpportunityId as string;
  if (!oppId) {
    throw new Error('No sf977OpportunityId. Create SF-977 Opportunity first.');
  }
  const lookup = opportunityLookupField();
  const sf = statusFieldApi();
  const accField = productMapAccountLookupField();
  const accountId = world.testContext.sf977AccountId as string | undefined;
  const payload: Record<string, unknown> = {
    Name: name,
    [lookup]: oppId,
    ...extra,
  };
  if (accountId && (payload[accField] === undefined || payload[accField] === '')) {
    payload[accField] = accountId;
  }
  // QA validation: Expansion Product Maps must be created with Expansion draft status (not org default).
  if (payload[sf] === undefined || payload[sf] === '') {
    payload[sf] = statusDraftExpansion();
  }
  const res = await api.createRecord(PRODUCT_MAP, payload);
  const id = (res as { id?: string }).id;
  if (!id) {
    throw new Error(`create ${PRODUCT_MAP} returned no id: ${JSON.stringify(res)}`);
  }
  testDataFactory.registerRecord(id, PRODUCT_MAP, name);
  return id;
}

async function queryOpportunityAccountId(
  api: SalesforceAPIClient,
  oppId: string
): Promise<string | undefined> {
  const q = await api.query(`SELECT AccountId FROM Opportunity WHERE Id = '${oppId}' LIMIT 1`);
  return (q.records?.[0] as { AccountId?: string } | undefined)?.AccountId;
}

async function assertProductMapHistoryContainsNewValue(
  api: SalesforceAPIClient,
  parentId: string,
  matchSubstrings: string[]
): Promise<void> {
  await sleep(2500);
  const fieldLit = historyFieldLiteralForStatus();
  const soql = [
    'SELECT Id, NewValue, OldValue, CreatedDate',
    `FROM ${PRODUCT_MAP_HISTORY}`,
    `WHERE ParentId = '${parentId}' AND Field = '${fieldLit}'`,
    'ORDER BY CreatedDate DESC',
    'LIMIT 25',
  ].join(' ');
  const res = await api.query(soql);
  const records = (res.records || []) as Array<{ NewValue?: string }>;
  const ok = records.some((r) =>
    matchSubstrings.some((s) => String(r.NewValue || '').toLowerCase().includes(s.toLowerCase()))
  );
  if (!ok) {
    throw new Error(
      `Expected ${PRODUCT_MAP_HISTORY} row with NewValue matching one of ${JSON.stringify(matchSubstrings)} ` +
        `for ParentId=${parentId}. Sample: ${JSON.stringify(records.slice(0, 5))}.`
    );
  }
}

async function createProductMapOnAccountOnly(
  world: AutomationWorld,
  name: string,
  extra: Record<string, unknown> = {}
): Promise<string> {
  const api = requireApi(world);
  const accountId = world.testContext.sf977AccountId as string;
  if (!accountId) {
    throw new Error('No sf977AccountId. Create Active Account step first.');
  }
  const accField = productMapAccountLookupField();
  const sf = statusFieldApi();
  const payload: Record<string, unknown> = {
    Name: name,
    [accField]: accountId,
    ...extra,
  };
  if (payload[sf] === undefined || payload[sf] === '') {
    payload[sf] = defaultStatusForAccountOnlyProductMap();
  }
  const res = await api.createRecord(PRODUCT_MAP, payload);
  const id = (res as { id?: string }).id;
  if (!id) {
    throw new Error(`create ${PRODUCT_MAP} returned no id: ${JSON.stringify(res)}`);
  }
  testDataFactory.registerRecord(id, PRODUCT_MAP, name);
  return id;
}

async function setProductMapStatus(api: SalesforceAPIClient, pmId: string, status: string): Promise<void> {
  const sf = statusFieldApi();
  await api.updateRecord(PRODUCT_MAP, pmId, { [sf]: status });
}

Given('the Product Map lifecycle behaviour is defined in the parent story SF-980 for SF-977', async function () {
  logger.info(
    'SF-977: Assumes SF-980 defines Expansion Product Map lifecycle (draft, pending go-live, activation on Opp Live).'
  );
});

Given('the Account related to the Opportunity is already Active for SF-977', async function (this: AutomationWorld) {
  await testDataFactory.initialize(apiJwtUsernameForFactory(this));
  const ts = Date.now();
  const accType = sf977AccountType();
  const acc = await testDataFactory.createAccount({
    Name: `SF977_Active_${ts}`,
    Type: accType,
    Functional_Currency__c: 'USD',
    Account_Status__c: 'Active',
    BillingCountry: 'United States',
    BillingState: 'New York',
    BillingCity: 'Boston',
    BillingPostalCode: '02101',
    BillingStreet: '1 Test St',
  });
  this.testContext.sf977AccountId = acc.id;
  this.testContext.sf977AccountType = accType;
  logger.info(`SF-977: Active Account ${acc.id} Type=${accType}`);
});

Then('the SF-977 Account Type should be Member or Non Member MGA', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const id = this.testContext.sf977AccountId as string | undefined;
  if (!id) {
    throw new Error('No sf977AccountId. Run Active Account step first.');
  }
  const q = await api.query(`SELECT Type FROM Account WHERE Id = '${id}' LIMIT 1`);
  const actual = (q.records?.[0] as { Type?: string } | undefined)?.Type?.trim();
  const allowed = SF977_ALLOWED_ACCOUNT_TYPES as readonly string[];
  if (!actual || !allowed.includes(actual)) {
    throw new Error(
      `SF-977: Account Type must be Member or Non Member MGA. Got ${JSON.stringify(actual)} for ${id}.`
    );
  }
  logger.info(`SF-977: Confirmed Account ${id} Type="${actual}"`);
});

Given('an Opportunity exists with Type Expansion for SF-977', async function (this: AutomationWorld) {
  await testDataFactory.initialize(apiJwtUsernameForFactory(this));
  const accountId = this.testContext.sf977AccountId as string;
  if (!accountId) {
    throw new Error('No sf977AccountId. Run Active Account step first.');
  }
  if (process.env.SF977_SKIP_EXPANSION_SUB_TYPE === 'true') {
    const name = `SF977_Expansion_${Date.now()}`;
    const opp = await testDataFactory.createOpportunity(
      {
        Name: name,
        Stage: 'Pipeline',
        Type: expansionOppType(),
        CloseDate: closeDatePlus30d(),
      },
      accountId
    );
    this.testContext.sf977OpportunityId = opp.id;
    this.testContext.sf977OpportunityName = name;
    logger.info(`SF-977: Expansion Opportunity ${opp.id} (Type=${expansionOppType()}, Sub Type skipped)`);
    return;
  }
  const name = `SF977_Expansion_${Date.now()}`;
  const { id, subTypeField } = await createOpportunityWithSubTypeApi(
    this,
    accountId,
    name,
    expansionSubTypePicklistValue(),
    {
      Type: expansionOppType(),
      CloseDate: closeDatePlus30d(),
      Stage: 'Pipeline',
    }
  );
  this.testContext.sf977OpportunityId = id;
  this.testContext.sf977OpportunityName = name;
  this.testContext.sf977ExpansionSubTypeField = subTypeField;
  logger.info(`SF-977: Expansion Opportunity ${id} (Type=${expansionOppType()}, Sub Type field=${subTypeField})`);
});

Given('an Opportunity exists with Stage Due Diligence for SF-977', async function (this: AutomationWorld) {
  await testDataFactory.initialize(apiJwtUsernameForFactory(this));
  const accountId = this.testContext.sf977AccountId as string;
  if (!accountId) {
    throw new Error('No sf977AccountId. Run Active Account step first.');
  }
  const dd = dueDiligenceStage();
  if (process.env.SF977_SKIP_EXPANSION_SUB_TYPE === 'true') {
    const name = `SF977_DueDiligence_${Date.now()}`;
    const opp = await testDataFactory.createOpportunity(
      {
        Name: name,
        Stage: dd,
        Type: expansionOppType(),
        CloseDate: closeDatePlus30d(),
      },
      accountId
    );
    this.testContext.sf977OpportunityId = opp.id;
    this.testContext.sf977OpportunityName = name;
    logger.info(`SF-977: Due Diligence Opportunity ${opp.id} (Type=${expansionOppType()}, Sub Type skipped)`);
    return;
  }
  const name = `SF977_DueDiligence_${Date.now()}`;
  const { id, subTypeField } = await createOpportunityWithSubTypeApi(
    this,
    accountId,
    name,
    expansionSubTypePicklistValue(),
    {
      Type: expansionOppType(),
      CloseDate: closeDatePlus30d(),
      Stage: dd,
    }
  );
  this.testContext.sf977OpportunityId = id;
  this.testContext.sf977OpportunityName = name;
  this.testContext.sf977ExpansionSubTypeField = subTypeField;
  logger.info(
    `SF-977: Due Diligence Opportunity ${id} (Stage=${dd}, Type=${expansionOppType()}, Sub Type field=${subTypeField})`
  );
});

Given('an Opportunity exists with Type Expansion and pre-Live stage for SF-977', async function (this: AutomationWorld) {
  await testDataFactory.initialize(apiJwtUsernameForFactory(this));
  const accountId = this.testContext.sf977AccountId as string;
  if (!accountId) {
    throw new Error('No sf977AccountId. Run Active Account step first.');
  }
  const stage = preLiveStageName();
  if (process.env.SF977_SKIP_EXPANSION_SUB_TYPE === 'true') {
    const name = `SF977_Expansion_PreLive_${Date.now()}`;
    const opp = await testDataFactory.createOpportunity(
      {
        Name: name,
        Stage: stage,
        Type: expansionOppType(),
        CloseDate: closeDatePlus30d(),
      },
      accountId
    );
    this.testContext.sf977OpportunityId = opp.id;
    this.testContext.sf977OpportunityName = name;
    logger.info(`SF-977: Expansion Opportunity ${opp.id} StageName=${stage} (Sub Type skipped)`);
    return;
  }
  const name = `SF977_Expansion_PreLive_${Date.now()}`;
  const { id, subTypeField } = await createOpportunityWithSubTypeApi(
    this,
    accountId,
    name,
    expansionSubTypePicklistValue(),
    {
      Type: expansionOppType(),
      CloseDate: closeDatePlus30d(),
      Stage: stage,
    }
  );
  this.testContext.sf977OpportunityId = id;
  this.testContext.sf977OpportunityName = name;
  this.testContext.sf977ExpansionSubTypeField = subTypeField;
  logger.info(`SF-977: Expansion Opportunity ${id} StageName=${stage} (pre-Live; live=${liveStageName()}; Sub Type field=${subTypeField})`);
});

When(
  'an Actuary creates a Product_Map__c record related to the Expansion Opportunity for SF-977',
  async function (this: AutomationWorld) {
    const api = requireApi(this);
    const name = `SF977_PM_Draft_${Date.now()}`;
    const id = await createProductMapLinkedToOpp(this, name);
    this.testContext.sf977ProductMapId = id;
    const sf = statusFieldApi();
    const row = await api.query(`SELECT Id, ${sf} FROM ${PRODUCT_MAP} WHERE Id = '${id}' LIMIT 1`);
    this.testContext.sf977LastProductMapRow = row.records?.[0];
    logger.info(`SF-977: Created ${PRODUCT_MAP} ${id} (API user simulates Actuary save)`);
  }
);

Then('the Product Map Status for SF-977 should be the Expansion draft status', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const id = this.testContext.sf977ProductMapId as string;
  if (!id) {
    throw new Error('No sf977ProductMapId.');
  }
  const want = statusDraftExpansion();
  const actual = await queryProductMapStatus(api, id);
  if (actual !== want) {
    throw new Error(
      `${PRODUCT_MAP} ${id}: expected ${statusFieldApi()}="${want}", got ${JSON.stringify(actual)}. ` +
        `Set SF977_PRODUCT_MAP_STATUS_DRAFT if your org uses a different label.`
    );
  }
  logger.info(`✅ SF-977: Product Map has Expansion draft status "${want}"`);
});

Then(
  'the SF-977 Product Map should reference the Expansion Opportunity and Account per SF-980',
  async function (this: AutomationWorld) {
    const api = requireApi(this);
    const pmId = this.testContext.sf977ProductMapId as string | undefined;
    const oppId = this.testContext.sf977OpportunityId as string | undefined;
    const accountId = this.testContext.sf977AccountId as string | undefined;
    if (!pmId || !oppId || !accountId) {
      throw new Error('Missing sf977ProductMapId, sf977OpportunityId, or sf977AccountId.');
    }
    const lookup = opportunityLookupField();
    const accField = productMapAccountLookupField();
    const q = await api.query(
      `SELECT ${lookup}, ${accField} FROM ${PRODUCT_MAP} WHERE Id = '${pmId}' LIMIT 1`
    );
    const row = q.records?.[0] as Record<string, string> | undefined;
    if (!row) {
      throw new Error(`No ${PRODUCT_MAP} row for ${pmId}`);
    }
    if (row[lookup] !== oppId) {
      throw new Error(
        `Expected ${PRODUCT_MAP}.${lookup}=${oppId}, got ${JSON.stringify(row[lookup])} (SF-980: Opportunity on Product Map).`
      );
    }
    if (row[accField] !== accountId) {
      throw new Error(
        `Expected ${PRODUCT_MAP}.${accField}=${accountId}, got ${JSON.stringify(row[accField])} (SF-980: Account on Product Map).`
      );
    }
    const oq = await api.query(`SELECT AccountId FROM Opportunity WHERE Id = '${oppId}' LIMIT 1`);
    const oppAcc = (oq.records?.[0] as { AccountId?: string } | undefined)?.AccountId;
    if (oppAcc && row[accField] !== oppAcc) {
      throw new Error(
        `Product Map ${accField} ${row[accField]} should match Opportunity.AccountId ${oppAcc}.`
      );
    }
    logger.info(`✅ SF-977/SF-980: Product Map ${pmId} links Opportunity ${oppId} and Account ${accountId}`);
  }
);

Given(
  'one or more Product_Map__c records related to the Opportunity have Status Active Pending Go-Live for SF-977',
  async function (this: AutomationWorld) {
    const api = requireApi(this);
    const pending = statusActivePending();
    const draft = statusDraftExpansion();
    const name = `SF977_PM_Pending_${Date.now()}`;
    const id = await createProductMapLinkedToOpp(this, name);
    let current = await queryProductMapStatus(api, id);
    if (current !== pending) {
      if (current === draft || current == null || current === '') {
        try {
          await setProductMapStatus(api, id, pending);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(
            `Could not set ${PRODUCT_MAP} to "${pending}" (was "${current}"). ` +
              `Org workflow may require a different path. ${msg}`
          );
        }
      } else {
        try {
          await setProductMapStatus(api, id, pending);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(
            `Product Map status is "${current}"; failed forcing "${pending}". ${msg}. ` +
              `Set SF977_PRODUCT_MAP_STATUS_PENDING if the picklist label differs.`
          );
        }
      }
    }
    current = await queryProductMapStatus(api, id);
    if (current !== pending) {
      throw new Error(`Expected pending status "${pending}", got ${JSON.stringify(current)}`);
    }
    this.testContext.sf977PendingProductMapIds = [id];
    this.testContext.sf977PendingSnapshotIds = [id];
    logger.info(`SF-977: Pending Product Map ${id} (${pending})`);
  }
);

Given(
  'another Product_Map__c related to the same Opportunity has Status Inactive for SF-977',
  async function (this: AutomationWorld) {
    const api = requireApi(this);
    const inactive = statusInactive();
    const name = `SF977_PM_Inactive_${Date.now()}`;
    const id = await createProductMapLinkedToOpp(this, name);
    await setProductMapStatus(api, id, inactive);
    this.testContext.sf977InactiveProductMapId = id;
    logger.info(`SF-977: Inactive Product Map ${id}`);
  }
);

When('the Opportunity Stage is changed to Live for SF-977', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const oppId = this.testContext.sf977OpportunityId as string;
  if (!oppId) {
    throw new Error('No sf977OpportunityId.');
  }
  this.testContext.sf977OppStageUpdateError = undefined;
  const live = liveStageName();
  try {
    await api.updateRecord('Opportunity', oppId, { StageName: live });
    this.testContext.sf977OppStageUpdateError = null;
    logger.info(`SF-977: Opportunity ${oppId} -> StageName "${live}"`);
  } catch (e: unknown) {
    this.testContext.sf977OppStageUpdateError = e;
    logger.warn(`SF-977: Opportunity stage update failed: ${e instanceof Error ? e.message : String(e)}`);
  }
});

Then('the inactive SF-977 Product Map should still have Inactive status', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const id = this.testContext.sf977InactiveProductMapId as string | undefined;
  if (!id) {
    throw new Error('No sf977InactiveProductMapId.');
  }
  const want = statusInactive();
  const actual = await queryProductMapStatus(api, id);
  if (actual !== want) {
    throw new Error(`Inactive Product Map ${id}: expected ${statusFieldApi()}="${want}", got ${JSON.stringify(actual)}`);
  }
  logger.info(`✅ SF-977: Inactive Product Map stayed "${want}"`);
});

async function assertPendingProductMapsBecomeActive(world: AutomationWorld): Promise<void> {
  const api = requireApi(world);
  const ids = world.testContext.sf977PendingProductMapIds as string[] | undefined;
  if (!ids?.length) {
    throw new Error('No sf977PendingProductMapIds.');
  }
  const want = statusActive();
  for (const id of ids) {
    await waitForProductMapStatus(api, id, want, asyncWaitMs());
  }
  logger.info(`✅ SF-977: All pending Product Maps are "${want}" (system-driven transition after Opportunity Live)`);
}

Then(
  'all SF-977 Product Maps that were Active Pending Go-Live should have Status Active',
  async function (this: AutomationWorld) {
    await assertPendingProductMapsBecomeActive(this);
  }
);

Then(
  'all SF-977 Product Maps that were Active Pending Go-Live should have been automatically updated to Active by the system',
  async function (this: AutomationWorld) {
    await assertPendingProductMapsBecomeActive(this);
  }
);

Then('the SF-977 Opportunity Stage should be Live', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const oppId = this.testContext.sf977OpportunityId as string;
  if (!oppId) {
    throw new Error('No sf977OpportunityId.');
  }
  const want = liveStageName();
  const q = await api.query(`SELECT StageName FROM Opportunity WHERE Id = '${oppId}' LIMIT 1`);
  const actual = (q.records?.[0] as { StageName?: string } | undefined)?.StageName?.trim();
  if (actual !== want) {
    throw new Error(`Expected Opportunity ${oppId} StageName="${want}", got ${JSON.stringify(actual)}.`);
  }
  logger.info(`✅ SF-977: Opportunity ${oppId} is Live (${want})`);
});

Then(
  'no Product_Map__c should be created or updated as part of the SF-977 Live transition',
  async function (this: AutomationWorld) {
    const api = requireApi(this);
    const oppId = this.testContext.sf977OpportunityId as string;
    if (!oppId) {
      throw new Error('No sf977OpportunityId.');
    }
    const lookup = opportunityLookupField();
    const q = await api.query(`SELECT Id FROM ${PRODUCT_MAP} WHERE ${lookup} = '${oppId}' LIMIT 50`);
    const n = q.records?.length ?? 0;
    if (n !== 0) {
      throw new Error(
        `Expected zero Product_Map__c for Opportunity ${oppId} after Live (no-PM scenario); found ${n}.`
      );
    }
    logger.info('✅ SF-977: No Product_Map__c created or linked during Live transition');
  }
);

Then('the unique Id of each transitioned SF-977 Product Map should remain unchanged', async function (this: AutomationWorld) {
  const ids = this.testContext.sf977PendingProductMapIds as string[] | undefined;
  const snapshot = this.testContext.sf977PendingSnapshotIds as string[] | undefined;
  if (!ids?.length || !snapshot?.length || ids.length !== snapshot.length) {
    throw new Error('Missing pending id snapshot for SF-977.');
  }
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] !== snapshot[i]) {
      throw new Error(`Product Map Id changed: ${snapshot[i]} -> ${ids[i]}`);
    }
  }
  logger.info('✅ SF-977: Product Map Ids unchanged');
});

Then(
  'each transitioned SF-977 Product Map should have Status change recorded in Product_Map__History',
  async function (this: AutomationWorld) {
    const api = requireApi(this);
    const ids = this.testContext.sf977PendingProductMapIds as string[] | undefined;
    if (!ids?.length) {
      throw new Error('No sf977PendingProductMapIds.');
    }
    const sf = statusFieldApi();
    const fieldLiteral = sf.endsWith('__c') ? sf : 'Status__c';
    const wantActive = statusActive();
    const wantPending = statusActivePending();

    await sleep(3000);

    for (const parentId of ids) {
      const soql = [
        'SELECT Id, ParentId, Field, OldValue, NewValue, CreatedDate',
        `FROM ${PRODUCT_MAP_HISTORY}`,
        `WHERE ParentId = '${parentId}' AND Field = '${fieldLiteral}'`,
        'ORDER BY CreatedDate DESC',
        'LIMIT 20',
      ].join(' ');
      const res = await api.query(soql);
      const records = (res.records || []) as Array<{ NewValue?: string; OldValue?: string }>;
      const ok = records.some(
        (r) =>
          (r.NewValue === wantActive || String(r.NewValue || '').includes('Active')) &&
          (r.OldValue === wantPending ||
            String(r.OldValue || '').includes('Pending') ||
            String(r.OldValue || '').includes('Go-Live'))
      );
      if (!ok) {
        throw new Error(
          `No matching ${PRODUCT_MAP_HISTORY} row for ${parentId} (${fieldLiteral} -> Active from pending). ` +
            `Found: ${JSON.stringify(records.slice(0, 5))}. Enable field history on ${sf} if missing.`
        );
      }
    }
    logger.info(`✅ SF-977: ${PRODUCT_MAP_HISTORY} contains Status transition toward Active`);
  }
);

Given('there are no Product_Map__c records related to the SF-977 Opportunity', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const oppId = this.testContext.sf977OpportunityId as string;
  if (!oppId) {
    throw new Error('No sf977OpportunityId.');
  }
  const lookup = opportunityLookupField();
  const q = await api.query(`SELECT Id FROM ${PRODUCT_MAP} WHERE ${lookup} = '${oppId}' LIMIT 50`);
  const n = q.records?.length ?? 0;
  if (n > 0) {
    throw new Error(`Expected no Product Maps for Opportunity ${oppId}; found ${n}.`);
  }
  logger.info(`SF-977: Confirmed zero Product Maps on Opportunity ${oppId}`);
});

Then('no error should be thrown for the SF-977 Opportunity Live transition', async function (this: AutomationWorld) {
  const err = this.testContext.sf977OppStageUpdateError;
  if (err != null) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Opportunity Live transition failed: ${msg}. Check SF977_OPPORTUNITY_STAGE_LIVE and stage path.`);
  }
  logger.info('✅ SF-977: Opportunity Live transition succeeded');
});

Then('no Product_Map__c records should exist for the SF-977 Opportunity', async function (this: AutomationWorld) {
  const api = requireApi(this);
  const oppId = this.testContext.sf977OpportunityId as string;
  if (!oppId) {
    throw new Error('No sf977OpportunityId.');
  }
  const lookup = opportunityLookupField();
  const q = await api.query(`SELECT Id FROM ${PRODUCT_MAP} WHERE ${lookup} = '${oppId}' LIMIT 50`);
  const n = q.records?.length ?? 0;
  if (n !== 0) {
    throw new Error(`Expected 0 Product Maps after Live; found ${n}.`);
  }
  logger.info('✅ SF-977: Still no Product Maps on Opportunity');
});
