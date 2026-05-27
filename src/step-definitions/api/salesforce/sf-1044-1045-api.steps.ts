/**
 * SF-1044 / SF-1045 — Account lifecycle and validation rules (REST API).
 * Reuses: SalesforceAPIClient, testDataFactory (createAccount / createOpportunity), AutomationWorld apiError pattern (see sf-719).
 *
 * QA Opportunity contract fields (Fields & Relationships): Has_Approved_Contract__c, Executed_Contract_Confirmed__c (checkbox).
 * API features use Background: "Given I have a valid Salesforce API token as QA MRD user" + TestDataFactory.initialize(SF_QAMRDUSER_JWT_USERNAME).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';

/** QA Opportunity — API names from org metadata (checkbox). */
const OPP_HAS_APPROVED_CONTRACT__C = 'Has_Approved_Contract__c';
const OPP_EXECUTED_CONTRACT_CONFIRMED__C = 'Executed_Contract_Confirmed__c';

const MLER_OBJECT = 'Member_Legal_Entity_Relationship__c';

type MlerFieldMeta = {
  name: string;
  label?: string;
  createable?: boolean;
  type: string;
  picklistValues?: { active: boolean; value: string }[];
};

function valueForMlerField(f: MlerFieldMeta): string {
  if (f.type === 'picklist' || f.type === 'multipicklist') {
    const v = f.picklistValues?.find((p) => p.active)?.value;
    if (!v) throw new Error(`MLER field ${f.name} is picklist but has no active value`);
    return v;
  }
  return 'SF-1044/1045 API — MLER test';
}

/** Same pattern as sf-612: VR may require Reason fields on MLER. */
async function augmentMlerPayloadWithReasonFields(
  apiClient: SalesforceAPIClient,
  payload: Record<string, string>
): Promise<void> {
  const desc = await apiClient.describeSObject(MLER_OBJECT);
  const fields = (desc.fields || []) as MlerFieldMeta[];
  const reasonFields = fields.filter(
    (f) =>
      f.createable && (/reason/i.test(f.name) || /reason/i.test(f.label || ''))
  );
  for (const f of reasonFields) {
    if (payload[f.name] !== undefined) continue;
    payload[f.name] = valueForMlerField(f);
  }
}

/**
 * QA VR: Active/Contracted may require Onboarded_Date__c; Member Active requires ≥1 MLER.
 */
async function ensureOnboardedDateAndMlerForActivePath(this: AutomationWorld, accountId: string): Promise<void> {
  const api = getApi.call(this);
  const today = new Date().toISOString().slice(0, 10);
  try {
    await api.updateRecord('Account', accountId, { Onboarded_Date__c: today });
  } catch (e: any) {
    logger.warn(`Onboarded_Date__c (field may be absent): ${errorText(e)}`);
  }

  const q = await api.query(`SELECT Id, Type FROM Account WHERE Id = '${accountId}' LIMIT 1`);
  const row = q.records?.[0] as { Type?: string } | undefined;
  // Only true Member gets MLER; "Non-Member MGA" also contains substring "member"
  if (row?.Type !== 'Member') {
    return;
  }

  await initFactory.call(this);
  const legal = await testDataFactory.createAccount(
    {
      Name: `SF104X_LE_${Date.now()}`,
      Type: 'Legal Entity',
      Account_Status__c: 'Active',
      Functional_Currency__c: 'USD',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    },
    { checkExists: false, deleteIfExists: false }
  );

  const payload: Record<string, string> = {
    Member__c: accountId,
    Legal_Entity__c: legal.id,
    Start_Date__c: today,
  };
  await augmentMlerPayloadWithReasonFields(api, payload);
  try {
    await api.createRecord(MLER_OBJECT, payload, { timeout: 120000 });
    logger.info(`✅ MLER created for Member ${accountId} → Legal ${legal.id}`);
  } catch (e: any) {
    logger.warn(`MLER create failed (org rules): ${errorText(e)}`);
  }
}

const CONTRACT_ERROR_SUBSTRING =
  'A signed contract must be uploaded and approved before the Account can be set to Contracted or Active.';
const RUNOFF_ERROR_PHRASES = ['runoff', 'offboarded', 'invalid', 'cannot be created', 'not allowed'];
function uniquePartyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function getApi(this: AutomationWorld): SalesforceAPIClient {
  const api = this.testContext.apiClient as SalesforceAPIClient;
  if (!api) {
    throw new Error(
      'API client not initialized. Run Background: "Given I have a valid Salesforce API token" or "… as QA MRD user" first.'
    );
  }
  return api;
}

function errorText(err: any): string {
  if (!err) return '';
  return String(err.message || err.body || JSON.stringify(err));
}

/** Default MGA type for SF-1044 scenarios that say "Member" or "Non-Member MGA" (QA picklist may map Non-Member MGA → Member). */
function sf1044MgaAccountType(): 'Member' | 'Non-Member MGA' {
  return 'Member';
}

async function initFactory(this: AutomationWorld): Promise<void> {
  const mrd = process.env.SF_QAMRDUSER_JWT_USERNAME?.trim();
  await testDataFactory.initialize(mrd);
}

function setApiError(this: AutomationWorld, err: any | undefined): void {
  (this.testContext as any).apiError = err;
}

async function tryApi(this: AutomationWorld, fn: () => Promise<void>): Promise<void> {
  setApiError.call(this, undefined);
  try {
    await fn();
  } catch (e: any) {
    setApiError.call(this, e);
    logger.info(`API error (may be expected): ${errorText(e)}`);
  }
}

/** Prospect-level fields for Member / Non-Member MGA (address + ownership). */
function baseProspectFields(accountType: 'Member' | 'Non-Member MGA'): Record<string, any> {
  const base: Record<string, any> = {
    Ownership: 'Mission',
    BillingCountry: 'United States',
    BillingCity: 'New York',
    BillingState: 'New York',
    BillingPostalCode: '10001',
    BillingStreet: '1 SF-1044 Test Way',
  };
  if (accountType === 'Member') {
    // Prospect allows blank Affiliate per SF-1045-017; omit or set later for Onboarding+
  }
  return base;
}

/** Onboarding requirements: Party code; Affiliate for Member. */
function applyOnboardingFields(
  payload: Record<string, any>,
  accountType: 'Member' | 'Non-Member MGA'
): void {
  payload.Party_Code__c = uniquePartyCode();
  if (accountType === 'Member') {
    payload.Affiliate_Non_Affiliate__c = 'AFL';
  }
}

/**
 * Contract / advanced stage: ensure Opportunity exists on Account with contract flags for positive paths.
 */
async function ensureContractOpportunity(
  this: AutomationWorld,
  accountId: string,
  approved: boolean
): Promise<string> {
  const api = getApi.call(this);
  const ts = Date.now();
  const res = await api.createRecord('Opportunity', {
    Name: `SF1045_NB_${ts}`,
    AccountId: accountId,
    Type: 'New Business',
    StageName: 'Pipeline',
    CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const oppId = res.id as string;
  await setOpportunityContractFlags(api, oppId, approved, approved);
  try {
    await api.updateRecord('Account', accountId, { Opportunity__c: oppId });
  } catch (e: any) {
    logger.warn(`Could not set Account.Opportunity__c (field may differ): ${errorText(e)}`);
  }
  return oppId;
}

async function createNbOpportunityBare(api: SalesforceAPIClient, accountId: string, name: string): Promise<string> {
  const res = await api.createRecord('Opportunity', {
    Name: name,
    AccountId: accountId,
    Type: 'New Business',
    StageName: 'Pipeline',
    CloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  return res.id as string;
}

async function setOpportunityContractFlags(
  api: SalesforceAPIClient,
  oppId: string,
  approved: boolean,
  executed: boolean
): Promise<void> {
  try {
    await api.updateRecord('Opportunity', oppId, {
      [OPP_HAS_APPROVED_CONTRACT__C]: approved,
      [OPP_EXECUTED_CONTRACT_CONFIRMED__C]: executed,
    });
  } catch (e: any) {
    logger.warn(`Could not set Opportunity contract flags: ${errorText(e)}`);
  }
}

async function assertAccountStatus(this: AutomationWorld, expected: string): Promise<void> {
  const api = getApi.call(this);
  const id =
    (this.testContext.sf1044LastAccountId as string) ||
    (this.testContext.recordId as string) ||
    (this.testContext.sf1045LastAccountId as string);
  if (!id) throw new Error('No Account Id in context.');
  const q = await api.query(`SELECT Id, Account_Status__c FROM Account WHERE Id = '${id}' LIMIT 1`);
  const row = q.records?.[0] as { Account_Status__c?: string } | undefined;
  const actual = row?.Account_Status__c;
  if (actual !== expected) {
    throw new Error(`Expected Account_Status__c "${expected}", got "${actual}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SF-1044 — prepare / save
// ═══════════════════════════════════════════════════════════════════════════

Given(
  /^I prepare a new Account via API with Type "Member" or "Non-Member MGA" and Account_Status__c "(.+)"$/,
  async function (this: AutomationWorld, status: string) {
    await initFactory.call(this);
    const accountType = sf1044MgaAccountType();
    const ts = Date.now();
    const name = `SF1044_API_${ts}_${Math.random().toString(36).slice(2, 8)}`;
    const payload: Record<string, any> = {
      Name: name,
      Type: accountType,
      Account_Status__c: status,
      ...baseProspectFields(accountType),
    };
    this.testContext.sf1044PreparedPayload = payload;
    this.testContext.sf1044PrepareLayers = [] as string[];
    logger.info(`SF-1044: prepared Account payload Name=${name} Type=${accountType} Status=${status}`);
  }
);

Given('all Prospect validation rules are satisfied', async function (this: AutomationWorld) {
  const p = this.testContext.sf1044PreparedPayload as Record<string, any> | undefined;
  if (!p) throw new Error('No prepared payload. Run "I prepare a new Account..." first.');
  (this.testContext.sf1044PrepareLayers as string[]).push('prospect');
  logger.info('SF-1044: Prospect layer marked satisfied');
});

Given('all Prospect and Onboarding validation rules are satisfied', async function (this: AutomationWorld) {
  const p = this.testContext.sf1044PreparedPayload as Record<string, any> | undefined;
  if (!p) throw new Error('No prepared payload.');
  (this.testContext.sf1044PrepareLayers as string[]).push('prospect', 'onboarding');
  applyOnboardingFields(p, p.Type === 'Member' ? 'Member' : 'Non-Member MGA');
  logger.info('SF-1044: Prospect + Onboarding layers satisfied');
});

Given('all Prospect, Onboarding, and Contracted validation rules are satisfied', async function (this: AutomationWorld) {
  const p = this.testContext.sf1044PreparedPayload as Record<string, any> | undefined;
  if (!p) throw new Error('No prepared payload.');
  (this.testContext.sf1044PrepareLayers as string[]).push('prospect', 'onboarding', 'contracted');
  const t = (p.Type === 'Member' ? 'Member' : 'Non-Member MGA') as 'Member' | 'Non-Member MGA';
  applyOnboardingFields(p, t);
  logger.info('SF-1044: Prospect + Onboarding + Contracted layers satisfied (Opportunity added on save if needed)');
});

When('I save the Account via API', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const payload = this.testContext.sf1044PreparedPayload as Record<string, any> | undefined;
  if (!payload) throw new Error('No prepared payload. Run prepare steps first.');

  const layers = (this.testContext.sf1044PrepareLayers as string[]) || [];
  const needsContractOpp = layers.includes('contracted');
  const targetStatus = payload.Account_Status__c as string;
  const needsOnboardingFields = ['Onboarding', 'Contracted', 'Active'].includes(targetStatus);
  if (needsOnboardingFields && !payload.Party_Code__c) {
    const t = (payload.Type === 'Non-Member MGA' ? 'Non-Member MGA' : 'Member') as 'Member' | 'Non-Member MGA';
    applyOnboardingFields(payload, t);
  }

  setApiError.call(this, undefined);
  try {
    const api = getApi.call(this);
    let accId: string;

    if (needsContractOpp && (targetStatus === 'Contracted' || targetStatus === 'Active')) {
      const createPayload = { ...payload, Account_Status__c: 'Onboarding' };
      const acc = await testDataFactory.createAccount(createPayload, { checkExists: false, deleteIfExists: false });
      accId = acc.id;
      await ensureContractOpportunity.call(this, accId, true);
      await ensureOnboardedDateAndMlerForActivePath.call(this, accId);
      await api.updateRecord('Account', accId, { Account_Status__c: targetStatus });
    } else {
      const acc = await testDataFactory.createAccount(payload, { checkExists: false, deleteIfExists: false });
      accId = acc.id;
      if (needsContractOpp) {
        await ensureContractOpportunity.call(this, accId, true);
        await ensureOnboardedDateAndMlerForActivePath.call(this, accId);
        await api.updateRecord('Account', accId, { Account_Status__c: targetStatus });
      }
    }

    this.testContext.sf1044LastAccountId = accId;
    this.testContext.recordId = accId;

    setApiError.call(this, undefined);
    logger.info(`SF-1044: Account saved ${accId}`);
  } catch (e: any) {
    setApiError.call(this, e);
    throw e;
  }
});

Then('the API must return success', async function (this: AutomationWorld) {
  const err = (this.testContext as any).apiError;
  if (err) throw new Error(`Expected success but got error: ${errorText(err)}`);
  logger.info('API success confirmed');
});

Then(/^Account_Status__c must be "(.+)"$/, async function (this: AutomationWorld, expected: string) {
  await assertAccountStatus.call(this, expected);
});

Then(/^Account_Status__c in the response must be "(.+)"$/, async function (this: AutomationWorld, expected: string) {
  await assertAccountStatus.call(this, expected);
});

// ═══════════════════════════════════════════════════════════════════════════
// SF-1044 — existing Account + PATCH
// ═══════════════════════════════════════════════════════════════════════════

Given(
  /^an Account exists via API with Account_Status__c "(.+)"$/,
  async function (this: AutomationWorld, status: string) {
    await initFactory.call(this);
    const accountType = 'Member';
    const ts = Date.now();
    const name = `SF1044_EX_${ts}_${Math.random().toString(36).slice(2, 8)}`;
    const data: Record<string, any> = {
      Name: name,
      Type: accountType,
      Account_Status__c: status,
      ...baseProspectFields('Member'),
    };
    if (status !== 'Prospect') {
      applyOnboardingFields(data, 'Member');
    }
    const acc = await testDataFactory.createAccount(data, { checkExists: false, deleteIfExists: false });
    this.testContext.sf1044AccountId = acc.id;
    this.testContext.recordId = acc.id;
    this.testContext.sf1045LastAccountId = acc.id;
    logger.info(`SF-1044: Account exists ${acc.id} status=${status}`);
  }
);

Given('all Onboarding validation requirements are met', async function (this: AutomationWorld) {
  const api = getApi.call(this);
  const id = this.testContext.sf1044AccountId as string;
  if (!id) throw new Error('No Account in context.');
  const party = uniquePartyCode();
  await api.updateRecord('Account', id, {
    Party_Code__c: party,
    Affiliate_Non_Affiliate__c: 'AFL',
  });
  await ensureContractOpportunity.call(this, id, true);
  await ensureOnboardedDateAndMlerForActivePath.call(this, id);
  logger.info(`SF-1044: Onboarding + contract prerequisites set on ${id}`);
});

Given('all Onboarding and Contracted validation requirements are met', async function (this: AutomationWorld) {
  const api = getApi.call(this);
  const id = this.testContext.sf1044AccountId as string;
  if (!id) throw new Error('No Account in context.');
  const party = uniquePartyCode();
  await api.updateRecord('Account', id, {
    Party_Code__c: party,
    Affiliate_Non_Affiliate__c: 'AFL',
  });
  await ensureContractOpportunity.call(this, id, true);
  await ensureOnboardedDateAndMlerForActivePath.call(this, id);
  logger.info(`SF-1044: Onboarding + Contracted (Opportunity) set on ${id}`);
});

Given('all Contracted validation requirements are met', async function (this: AutomationWorld) {
  const id = this.testContext.sf1044AccountId as string;
  if (!id) throw new Error('No Account in context.');
  await ensureContractOpportunity.call(this, id, true);
  await ensureOnboardedDateAndMlerForActivePath.call(this, id);
  logger.info(`SF-1044: Contracted requirements (Opportunity) set on ${id}`);
});

When(
  /^I PATCH the Account via API to set Account_Status__c "(.+)"$/,
  async function (this: AutomationWorld, newStatus: string) {
    const api = getApi.call(this);
    const id =
      (this.testContext.sf1045LastAccountId as string) ||
      (this.testContext.sf1044AccountId as string) ||
      (this.testContext.recordId as string);
    if (!id) throw new Error('No Account Id for PATCH.');
    await tryApi.call(this, async () => {
      await api.updateRecord('Account', id, { Account_Status__c: newStatus });
      this.testContext.sf1045LastPatchedStatus = newStatus;
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SF-1045 — Opportunity + contract (negative / positive)
// ═══════════════════════════════════════════════════════════════════════════

Given('a New Business Opportunity exists linked to the Account payload', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const ts = Date.now();
  const name = `SF1045_CTX_${ts}_${Math.random().toString(36).slice(2, 8)}`;
  const acc = await testDataFactory.createAccount(
    {
      Name: name,
      Type: 'Member',
      Account_Status__c: 'Prospect',
      ...baseProspectFields('Member'),
    },
    { checkExists: false, deleteIfExists: false }
  );
  const api = getApi.call(this);
  const oppId = await createNbOpportunityBare(api, acc.id, `SF1045_NB_${ts}`);
  await setOpportunityContractFlags(api, oppId, false, false);
  try {
    await api.updateRecord('Account', acc.id, { Opportunity__c: oppId });
  } catch (e: any) {
    logger.warn(`Account.Opportunity__c update: ${errorText(e)}`);
  }
  await ensureOnboardedDateAndMlerForActivePath.call(this, acc.id);
  this.testContext.sf1045ContractAccountId = acc.id;
  this.testContext.sf1045ContractOpportunityId = oppId;
  this.testContext.sf1045LastAccountId = acc.id;
  this.testContext.sf1045ContractPostScenario = true;
  logger.info(`SF-1045: Account ${acc.id} + NB Opportunity ${oppId}`);
});

Given(
  'Has_Approved_Contract__c and Executed_Contract_Confirmed__c are not both true on the Opportunity',
  async function (this: AutomationWorld) {
    const api = getApi.call(this);
    const oppId = this.testContext.sf1045ContractOpportunityId as string;
    if (!oppId) throw new Error('No Opportunity in context.');
    await setOpportunityContractFlags(api, oppId, false, false);
  }
);

Given(/^Account Type is "(.+)"$/, async function (this: AutomationWorld, accountType: string) {
  const api = getApi.call(this);
  const accId = this.testContext.sf1045ContractAccountId as string;
  if (!accId) throw new Error('No Account in context.');
  await api.updateRecord('Account', accId, { Type: accountType });
  this.testContext.sf1045AccountType = accountType;
});

When(
  /^I POST a new Account via API with Account_Status__c "(.+)"$/,
  async function (this: AutomationWorld, status: string) {
    await initFactory.call(this);
    const api = getApi.call(this);
    const accId = this.testContext.sf1045ContractAccountId as string;
    const oppId = this.testContext.sf1045ContractOpportunityId as string;
    const accountType = (this.testContext.sf1045AccountType as string) || 'Member';

    await tryApi.call(this, async () => {
      if (this.testContext.sf1045ContractPostScenario && accId && oppId) {
        const q = await api.query(`SELECT Id, Party_Code__c FROM Account WHERE Id='${accId}' LIMIT 1`);
        const row = q.records?.[0] as { Party_Code__c?: string } | undefined;
        if (!row?.Party_Code__c) {
          await api.updateRecord('Account', accId, {
            Party_Code__c: uniquePartyCode(),
            ...(accountType === 'Member' ? { Affiliate_Non_Affiliate__c: 'AFL' } : {}),
          });
        }
        await ensureOnboardedDateAndMlerForActivePath.call(this, accId);
        await api.updateRecord('Account', accId, { Account_Status__c: status, Type: accountType });
        return;
      }
      const ts = Date.now();
      const name = `SF1045_POST_${ts}`;
      const body: Record<string, any> = {
        Name: name,
        Type: accountType,
        Account_Status__c: status,
        ...baseProspectFields(accountType === 'Non-Member MGA' ? 'Non-Member MGA' : 'Member'),
      };
      if (accountType === 'Member') {
        body.Affiliate_Non_Affiliate__c = 'AFL';
      }
      body.Party_Code__c = uniquePartyCode();
      if (oppId) {
        body.Opportunity__c = oppId;
      }
      await api.createRecord('Account', body);
    });
  }
);

Given(
  /^an Account exists via API with Type "(.+)" and Account_Status__c "(.+)"$/,
  async function (this: AutomationWorld, accountType: string, status: string) {
    await initFactory.call(this);
    const t = accountType as 'Member' | 'Non-Member MGA';
    const ts = Date.now();
    const name = `SF1045_EX_${ts}_${Math.random().toString(36).slice(2, 8)}`;
    const data: Record<string, any> = {
      Name: name,
      Type: accountType,
      Account_Status__c: status,
      ...baseProspectFields(t === 'Non-Member MGA' ? 'Non-Member MGA' : 'Member'),
    };
    if (accountType === 'Member') {
      data.Affiliate_Non_Affiliate__c = 'AFL';
    }
    if (status === 'Onboarding' || status === 'Contracted' || status === 'Active') {
      data.Party_Code__c = uniquePartyCode();
    }
    if (accountType === 'Member' && status === 'Prospect') {
      data.Party_Code__c = uniquePartyCode();
    }
    const acc = await testDataFactory.createAccount(data, { checkExists: false, deleteIfExists: false });
    const api = getApi.call(this);
    const oppId = await createNbOpportunityBare(api, acc.id, `SF1045_NB_${ts}`);
    await setOpportunityContractFlags(api, oppId, false, false);
    try {
      await api.updateRecord('Account', acc.id, { Opportunity__c: oppId });
    } catch (e: any) {
      logger.warn(`Opportunity__c: ${errorText(e)}`);
    }
    this.testContext.sf1045LastAccountId = acc.id;
    this.testContext.sf1045ContractOpportunityId = oppId;
    this.testContext.recordId = acc.id;
    await ensureOnboardedDateAndMlerForActivePath.call(this, acc.id);
    logger.info(`SF-1045: Account ${acc.id} Type=${accountType} Status=${status}`);
  }
);

Given(
  'the linked New Business Opportunity does not have approved and executed contract flags',
  async function (this: AutomationWorld) {
    const api = getApi.call(this);
    const oppId = this.testContext.sf1045ContractOpportunityId as string;
    if (!oppId) throw new Error('No Opportunity in context.');
    await setOpportunityContractFlags(api, oppId, false, false);
  }
);

Given(/^an Account exists or is created via API with Type "(.+)"$/, async function (this: AutomationWorld, accountType: string) {
  await initFactory.call(this);
  const t = accountType as 'Member' | 'Non-Member MGA';
  const ts = Date.now();
  const name = `SF1045_OR_${ts}_${Math.random().toString(36).slice(2, 8)}`;
  const data: Record<string, any> = {
    Name: name,
    Type: accountType,
    Account_Status__c: 'Prospect',
    ...baseProspectFields(t === 'Non-Member MGA' ? 'Non-Member MGA' : 'Member'),
  };
  if (accountType === 'Member') {
    data.Affiliate_Non_Affiliate__c = 'AFL';
  }
  const acc = await testDataFactory.createAccount(data, { checkExists: false, deleteIfExists: false });
  const api = getApi.call(this);
  const oppId = await createNbOpportunityBare(api, acc.id, `SF1045_NB_${ts}`);
  await setOpportunityContractFlags(api, oppId, false, false);
  try {
    await api.updateRecord('Account', acc.id, { Opportunity__c: oppId });
  } catch (e: any) {
    logger.warn(`Opportunity__c: ${errorText(e)}`);
  }
  this.testContext.sf1045LastAccountId = acc.id;
  this.testContext.sf1045ContractOpportunityId = oppId;
  this.testContext.recordId = acc.id;
  await ensureOnboardedDateAndMlerForActivePath.call(this, acc.id);
});

Given(
  'the linked New Business Opportunity has Has_Approved_Contract__c true and Executed_Contract_Confirmed__c true',
  async function (this: AutomationWorld) {
    const api = getApi.call(this);
    const oppId = this.testContext.sf1045ContractOpportunityId as string;
    if (!oppId) throw new Error('No Opportunity in context.');
    await setOpportunityContractFlags(api, oppId, true, true);
  }
);

Given('an Account exists via API with Type "Member"', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const ts = Date.now();
  const name = `SF1045_M_${ts}_${Math.random().toString(36).slice(2, 8)}`;
  const acc = await testDataFactory.createAccount(
    {
      Name: name,
      Type: 'Member',
      Account_Status__c: 'Prospect',
      Affiliate_Non_Affiliate__c: 'AFL',
      ...baseProspectFields('Member'),
    },
    { checkExists: false, deleteIfExists: false }
  );
  const api = getApi.call(this);
  const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const res = await api.createRecord('Opportunity', {
    Name: `SF1045_EB_${ts}`,
    AccountId: acc.id,
    Type: 'Existing Business',
    StageName: 'Pipeline',
    CloseDate: closeDate,
  });
  const oppId = res.id as string;
  try {
    await api.updateRecord('Account', acc.id, { Opportunity__c: oppId });
  } catch (e: any) {
    logger.warn(`Opportunity__c: ${errorText(e)}`);
  }
  this.testContext.sf1045LastAccountId = acc.id;
  this.testContext.sf1045ContractOpportunityId = oppId;
  this.testContext.recordId = acc.id;
});

Given('the linked Opportunity Type is not "New Business"', async function (this: AutomationWorld) {
  const api = getApi.call(this);
  const oppId = this.testContext.sf1045ContractOpportunityId as string;
  if (!oppId) throw new Error('No Opportunity in context.');
  await api.updateRecord('Opportunity', oppId, { Type: 'Existing Business' });
});

Then(
  'the contract rule for New Business Opportunity must not reject the save solely based on contract flags',
  async function (this: AutomationWorld) {
    const err = (this.testContext as any).apiError;
    if (err) {
      const msg = errorText(err);
      if (msg.includes(CONTRACT_ERROR_SUBSTRING)) {
        throw new Error(
          `Did not expect contract validation when Opportunity is not New Business. Got: ${msg}`
        );
      }
      throw new Error(`Expected PATCH success for non-New-Business Opportunity. Got: ${msg}`);
    }
    logger.info('Save not blocked by New Business contract rule (as expected).');
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// SF-1045 — Runoff POST
// ═══════════════════════════════════════════════════════════════════════════

When(
  /^I POST a new Account via API with Type "(.+)" and Account_Status__c "Runoff"$/,
  async function (this: AutomationWorld, accountType: string) {
    await initFactory.call(this);
    const api = getApi.call(this);
    const ts = Date.now();
    const name = `SF1045_RUN_${ts}`;
    const body: Record<string, any> = {
      Name: name,
      Type: accountType,
      Account_Status__c: 'Runoff',
      Ownership: 'Mission',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    };
    if (accountType === 'Member') {
      body.Affiliate_Non_Affiliate__c = 'AFL';
    }
    await tryApi.call(this, async () => {
      await api.createRecord('Account', body);
    });
  }
);

Then('the error message must indicate Accounts cannot be created as Runoff, Offboarded or Invalid', async function (this: AutomationWorld) {
  const err = (this.testContext as any).apiError;
  if (!err) throw new Error('Expected validation error.');
  const msg = errorText(err).toLowerCase();
  const ok = RUNOFF_ERROR_PHRASES.some((p) => msg.includes(p));
  if (!ok) {
    throw new Error(`Expected Runoff/Offboarded/Invalid creation error. Got: ${errorText(err)}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SF-1045 — Billing country
// ═══════════════════════════════════════════════════════════════════════════

Given('a minimal valid Account create payload without BillingCountry', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const ts = Date.now();
  this.testContext.sf1045PostPayload = {
    Name: `SF1045_NOBC_${ts}`,
    Type: 'Agency',
    Account_Status__c: 'Prospect',
    Ownership: 'Private',
  };
});

Given('a valid Account create payload with BillingCountry set', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const ts = Date.now();
  this.testContext.sf1045PostPayload = {
    Name: `SF1045_BC_${ts}`,
    Type: 'Agency',
    Account_Status__c: 'Prospect',
    Ownership: 'Private',
    BillingCountry: 'United States',
    BillingCity: 'New York',
    BillingState: 'New York',
    BillingPostalCode: '10001',
  };
});

When('I POST the Account via API', async function (this: AutomationWorld) {
  const api = getApi.call(this);
  const body = this.testContext.sf1045PostPayload as Record<string, any> | undefined;
  if (!body) throw new Error('No POST payload in context.');
  await tryApi.call(this, async () => {
    await api.createRecord('Account', body);
  });
});

Then(/^the error message must contain "(.+)"$/, async function (this: AutomationWorld, substring: string) {
  const err = (this.testContext as any).apiError;
  if (!err) throw new Error('Expected validation error with message fragment.');
  const msg = errorText(err);
  if (!msg.includes(substring)) {
    throw new Error(`Expected error to contain "${substring}". Got: ${msg}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SF-1045 — Party code / MLER / TPA / Affiliate
// ═══════════════════════════════════════════════════════════════════════════

When(
  /^I POST a new Account via API with Type "(.+)" and Account_Status__c "(.+)" and no Party_Code__c$/,
  async function (this: AutomationWorld, accountType: string, status: string) {
    await initFactory.call(this);
    const api = getApi.call(this);
    const ts = Date.now();
    const name = `SF1045_NOPC_${ts}`;
    const body: Record<string, any> = {
      Name: name,
      Type: accountType,
      Account_Status__c: status,
      Ownership: 'Mission',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    };
    if (['Member', 'Insurer', 'Insurer Branch', 'Group'].includes(accountType)) {
      body.Affiliate_Non_Affiliate__c = 'AFL';
    }
    await tryApi.call(this, async () => {
      await api.createRecord('Account', body);
    });
  }
);

Given(
  /^an Account exists via API with Type "(.+)" and without Party_Code__c$/,
  async function (this: AutomationWorld, accountType: string) {
    await initFactory.call(this);
    const ts = Date.now();
    const name = `SF1045_NOPC_EX_${ts}`;
    const data: Record<string, any> = {
      Name: name,
      Type: accountType,
      Account_Status__c: 'Prospect',
      Ownership: 'Mission',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    };
    if (accountType === 'Member' || accountType === 'Insurer Branch') {
      data.Affiliate_Non_Affiliate__c = 'AFL';
    }
    const acc = await testDataFactory.createAccount(data, { checkExists: false, deleteIfExists: false });
    this.testContext.sf1045LastAccountId = acc.id;
    this.testContext.recordId = acc.id;
  }
);

When(
  /^I POST a new Account via API with Type "Member" and Account_Status__c "Contracted" and Count_of_MLER__c 0$/,
  async function (this: AutomationWorld) {
    await initFactory.call(this);
    const api = getApi.call(this);
    const ts = Date.now();
    const body: Record<string, any> = {
      Name: `SF1045_MLER0_${ts}`,
      Type: 'Member',
      Account_Status__c: 'Contracted',
      Ownership: 'Mission',
      Affiliate_Non_Affiliate__c: 'AFL',
      Party_Code__c: uniquePartyCode(),
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    };
    await tryApi.call(this, async () => {
      await api.createRecord('Account', body);
    });
  }
);

Given('an Account exists via API with Type "Member" and Count_of_MLER__c 0', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const acc = await testDataFactory.createAccount(
    {
      Name: `SF1045_MLER_EX_${Date.now()}`,
      Type: 'Member',
      Account_Status__c: 'Onboarding',
      Party_Code__c: uniquePartyCode(),
      Affiliate_Non_Affiliate__c: 'AFL',
      Ownership: 'Mission',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    },
    { checkExists: false, deleteIfExists: false }
  );
  this.testContext.sf1045LastAccountId = acc.id;
  this.testContext.recordId = acc.id;
});

Then(
  'the error must reference Legal Entity requirement for Contracted or Active Member',
  async function (this: AutomationWorld) {
    const err = (this.testContext as any).apiError;
    if (!err) throw new Error('Expected validation error.');
    const msg = errorText(err).toLowerCase();
    const ok =
      msg.includes('legal entity') || msg.includes('mler') || msg.includes('member legal');
    if (!ok) throw new Error(`Expected Legal Entity / MLER reference. Got: ${errorText(err)}`);
  }
);

When(
  /^I POST a new Account via API with Type "TPA" and Account_Status__c "Onboarding" and no Data_Source_Claims__c$/,
  async function (this: AutomationWorld) {
    await initFactory.call(this);
    const api = getApi.call(this);
    const ts = Date.now();
    const body: Record<string, any> = {
      Name: `SF1045_TPA_${ts}`,
      Type: 'TPA',
      Account_Status__c: 'Onboarding',
      Ownership: 'Mission',
      Party_Code__c: uniquePartyCode(),
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    };
    await tryApi.call(this, async () => {
      await api.createRecord('Account', body);
    });
  }
);

Given('an Account exists via API with Type "TPA" and no Data_Source_Claims__c', async function (this: AutomationWorld) {
  await initFactory.call(this);
  const acc = await testDataFactory.createAccount(
    {
      Name: `SF1045_TPA_EX_${Date.now()}`,
      Type: 'TPA',
      Account_Status__c: 'Onboarding',
      Party_Code__c: uniquePartyCode(),
      Ownership: 'Mission',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    },
    { checkExists: false, deleteIfExists: false }
  );
  this.testContext.sf1045LastAccountId = acc.id;
  this.testContext.recordId = acc.id;
});

Then(
  /^the error must reference Data Source \(Claims\) for TPA with Onboarding or Active$/,
  async function (this: AutomationWorld) {
    const err = (this.testContext as any).apiError;
    if (!err) throw new Error('Expected validation error.');
    const msg = errorText(err).toLowerCase();
    const ok =
      msg.includes('data source') ||
      (msg.includes('claims') && msg.includes('tpa')) ||
      msg.includes('data_source');
    if (!ok) throw new Error(`Expected Data Source (Claims) / TPA reference. Got: ${errorText(err)}`);
  }
);

When(
  /^I POST a new Account via API with Type "(.+)" and Account_Status__c "Prospect" and no Affiliate_Non_Affiliate__c$/,
  async function (this: AutomationWorld, accountType: string) {
    await initFactory.call(this);
    const api = getApi.call(this);
    const ts = Date.now();
    const body: Record<string, any> = {
      Name: `SF1045_AFF_${ts}`,
      Type: accountType,
      Account_Status__c: 'Prospect',
      Ownership: 'Mission',
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
    };
    await tryApi.call(this, async () => {
      await api.createRecord('Account', body);
    });
  }
);

Given(
  'an Account exists via API with Type "Member" and Account_Status__c "Prospect" and no Affiliate_Non_Affiliate__c',
  async function (this: AutomationWorld) {
    await initFactory.call(this);
    const acc = await testDataFactory.createAccount(
      {
        Name: `SF1045_AFF_EX_${Date.now()}`,
        Type: 'Member',
        Account_Status__c: 'Prospect',
        Ownership: 'Mission',
        BillingCountry: 'United States',
        BillingCity: 'New York',
        BillingState: 'New York',
        BillingPostalCode: '10001',
      },
      { checkExists: false, deleteIfExists: false }
    );
    const api = getApi.call(this);
    await api.updateRecord('Account', acc.id, { Affiliate_Non_Affiliate__c: null });
    this.testContext.sf1045LastAccountId = acc.id;
    this.testContext.recordId = acc.id;
  }
);

Then('the response must indicate Party Code is required', async function (this: AutomationWorld) {
  const err = (this.testContext as any).apiError;
  if (!err) throw new Error('Expected validation error for Party Code.');
  const msg = errorText(err).toLowerCase();
  const ok = msg.includes('party') && msg.includes('code');
  if (!ok) throw new Error(`Expected Party Code required. Got: ${errorText(err)}`);
});
