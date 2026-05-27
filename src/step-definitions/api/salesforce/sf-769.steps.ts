/**
 * SF-769 - Member Legal Entity Group Relationship → Dataverse Member Maps (API).
 * Uses Member_Legal_Entity_Relationship__c with Group__c populated (same object as SF-612/SF-789).
 * Traces CometD / Platform Events and optional Dataverse OData polling.
 *
 * Group Account: UI vs API (root-cause checklist)
 * - UI (e.g. manual "mEMBErGROUptEST1"): user only fills what the Lightning layout requires — no framework merge.
 * - API: testDataFactory.createAccount() merges DEFAULT_ACCOUNT_DATA + ACCOUNT_TYPE_DEFAULTS['Group'] (CAD/Vancouver/BC),
 *   then SF-769 overrides (US/CA/LA, Affiliate_Non_Affiliate__c, Ownership). Picklist / conditional rules may add fields.
 * - We intentionally do NOT merge sf769AccountDataverseFriendlyFields() into Group — QA validation rejected claims/data-source
 *   on Type Group while Member/Legal accept them (Dataverse-friendly for Mule PATCH).
 * - Dataverse_ID__c: set via API immediately after each Account create (not only after all three). If Group create fails
 *   (e.g. Party_Code__c), Member/Legal still get a GUID for debugging; without this, outbound sync can create Dynamics
 *   parties while Salesforce Accounts still show blank Dataverse_ID__c because the PATCH block never ran.
 * - Group requires Party_Code__c when Status is Active/Onboarding (QA validation) — same as Member.
 * - To keep created data for comparison with UI records: SF769_SKIP_CLEANUP=true or npm run test:sf769:keep-data.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceStreamingClient } from '../../../utils/salesforce-streaming-client';
import { DynamicsAPIClient } from '../../../api-clients/dynamics/DynamicsAPIClient';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { randomUUID } from 'crypto';

const OBJECT_API_NAME = 'Member_Legal_Entity_Relationship__c';

function uniquePartyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

/**
 * Reduces MuleSoft → Dataverse PATCH failures where required party attributes are cleared
 * (e.g. accelins_mgaownership / accelins_claimsproductionperiodeffectivefrom) when SF omits them.
 * Maps align with scripts/automate-workbench-field-mapping.ts (Ownership, Claims_Production_*).
 * Do not merge into Group accounts — QA org validation rejects claims/data-source fields on Type Group.
 */
function sf769AccountDataverseFriendlyFields(): Record<string, string> {
  const ymd = new Date().toISOString().slice(0, 10);
  return {
    Data_Source_Written__c: 'Platform',
    Data_Source_Claims__c: 'Platform',
    Claims_Production_Period_Effective_From__c: ymd,
    Written_Accounting_Period_Effective_From__c: ymd,
  };
}

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
    if (!v) {
      throw new Error(`MLER field ${f.name} is picklist but has no active value`);
    }
    return v;
  }
  return 'SF-769 API automation — Member Maps path';
}

async function augmentMlerPayloadWithReasonFields(
  apiClient: SalesforceAPIClient,
  payload: Record<string, string>
): Promise<void> {
  const desc = await apiClient.describeSObject(OBJECT_API_NAME);
  const fields = (desc.fields || []) as MlerFieldMeta[];
  const reasonFields = fields.filter(
    (f) => f.createable && (/reason/i.test(f.name) || /reason/i.test(f.label || ''))
  );
  for (const f of reasonFields) {
    if (payload[f.name] !== undefined) continue;
    payload[f.name] = valueForMlerField(f);
    logger.info(`✅ SF-769 MLER payload: ${f.name} (${f.label || f.name})`);
  }
  if (reasonFields.length === 0) {
    logger.warn('No createable Reason-like field found on MLER describe; create may fail on validation rule');
  }
}

function assertGroupFieldCreateable(desc: { fields?: MlerFieldMeta[] }): void {
  const groupField = (desc.fields || []).find((f) => f.name === 'Group__c');
  if (!groupField) {
    throw new Error('SF-769: Member_Legal_Entity_Relationship__c has no Group__c field');
  }
  if (!groupField.createable) {
    throw new Error('SF-769: Group__c must be createable on Member_Legal_Entity_Relationship__c for this story');
  }
}

async function setSf769AccountDataverseId(
  apiClient: SalesforceAPIClient,
  label: string,
  accountId: string,
  guid: string
): Promise<void> {
  try {
    await apiClient.updateRecord('Account', accountId, { Dataverse_ID__c: guid });
    logger.info(`✅ SF-769 ${label} ${accountId} Dataverse_ID__c set`);
  } catch (e: any) {
    throw new Error(`SF-769 setup: failed to set Dataverse_ID__c on ${label} Account: ${e.message}`);
  }
}

async function createSf769Mler(this: AutomationWorld, startDateYmd: string): Promise<void> {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const memberId = this.testContext.sf769MemberAccountId as string;
  const legalId = this.testContext.sf769LegalEntityAccountId as string;
  const groupId = this.testContext.sf769GroupAccountId as string;
  if (!apiClient || !memberId || !legalId || !groupId) {
    throw new Error('Run SF-769 account setup first (Member + Legal Entity + Group IDs missing).');
  }

  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  assertGroupFieldCreateable(describeResult);

  this.testContext.apiError = undefined;
  const payload: Record<string, string> = {
    Member__c: memberId,
    Legal_Entity__c: legalId,
    Group__c: groupId,
    Start_Date__c: startDateYmd,
  };

  await augmentMlerPayloadWithReasonFields(apiClient, payload);

  const res = await apiClient.createRecord(OBJECT_API_NAME, payload, { timeout: 120000 });
  const id = (res as any).id || (res as any).Id;
  if (!id) {
    throw new Error(`SF-769 MLER create returned no id: ${JSON.stringify(res)}`);
  }
  this.testContext.sf769RelationshipId = id;
  this.testContext.sf612MlerId = id;
  this.testContext.recordId = id;
  testDataFactory.registerRecord(id, OBJECT_API_NAME, `SF769_MLER_${id}`);
  logger.info(`✅ SF-769 Created ${OBJECT_API_NAME} ${id} with Group__c Start_Date__c=${startDateYmd}`);
  await new Promise((r) => setTimeout(r, 500));
}

// ═══════════════════════════════════════════════════════════════════════════
// Background / narrative
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'Salesforce publishes Member Legal Entity Group Relationship Platform Events for Member Maps integration',
  async function () {
    logger.info(
      '✅ SF-769: Platform Events (CometD) carry MLER changes toward MuleSoft → Dataverse Member Maps'
    );
  }
);

Given('the system is configured for SF-769', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }
  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  assertGroupFieldCreateable(describeResult);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  logger.info(`✅ System configured for SF-769: ${OBJECT_API_NAME} described, Group__c createable`);
});

Given(
  'SF-769 test accounts exist: Member, Legal Entity, and Group with Dataverse_ID__c on all three',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    await testDataFactory.initialize();
    const ts = Date.now();

    const guidMember = randomUUID();
    const guidLegal = randomUUID();
    const guidGroup = randomUUID();

    const member = await testDataFactory.createAccount(
      {
        ...sf769AccountDataverseFriendlyFields(),
        Name: `SF769_Member_${ts}`,
        Type: 'Member',
        Account_Status__c: 'Onboarding',
        Party_Code__c: uniquePartyCode(),
        Affiliate_Non_Affiliate__c: 'AFL',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );
    await setSf769AccountDataverseId(apiClient, 'Member', member.id, guidMember);

    const legal = await testDataFactory.createAccount(
      {
        ...sf769AccountDataverseFriendlyFields(),
        Name: `SF769_LegalEntity_${ts}`,
        Type: 'Legal Entity',
        Account_Status__c: 'Active',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );
    await setSf769AccountDataverseId(apiClient, 'Legal Entity', legal.id, guidLegal);

    const group = await testDataFactory.createAccount(
      {
        Name: `SF769_Group_${ts}`,
        Type: 'Group',
        Account_Status__c: 'Active',
        Party_Code__c: uniquePartyCode(),
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
        BillingState: 'California',
        BillingCity: 'Los Angeles',
        BillingPostalCode: '90001',
        BillingStreet: '200 SF-769 Group Test St',
        ShippingCountry: 'United States',
        ShippingState: 'California',
        ShippingCity: 'Los Angeles',
        ShippingPostalCode: '90001',
        Affiliate_Non_Affiliate__c: 'NAF',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );
    await setSf769AccountDataverseId(apiClient, 'Group', group.id, guidGroup);

    this.testContext.sf769MemberAccountId = member.id;
    this.testContext.sf769LegalEntityAccountId = legal.id;
    this.testContext.sf769GroupAccountId = group.id;
    this.testContext.sf769MemberDataverseId = guidMember;
    this.testContext.sf769LegalDataverseId = guidLegal;
    this.testContext.sf769GroupDataverseId = guidGroup;
    this.testContext.sf612MemberAccountId = member.id;
    this.testContext.sf612LegalEntityAccountId = legal.id;
  }
);

Given(
  'SF-769 test accounts exist: Member and Legal Entity with Dataverse_ID__c but Group has no Dataverse_ID__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    await testDataFactory.initialize();
    const ts = Date.now();

    const guidMember = randomUUID();
    const guidLegal = randomUUID();

    const member = await testDataFactory.createAccount(
      {
        ...sf769AccountDataverseFriendlyFields(),
        Name: `SF769_Member_${ts}`,
        Type: 'Member',
        Account_Status__c: 'Onboarding',
        Party_Code__c: uniquePartyCode(),
        Affiliate_Non_Affiliate__c: 'AFL',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );
    await setSf769AccountDataverseId(apiClient, 'Member', member.id, guidMember);

    const legal = await testDataFactory.createAccount(
      {
        ...sf769AccountDataverseFriendlyFields(),
        Name: `SF769_LegalEntity_${ts}`,
        Type: 'Legal Entity',
        Account_Status__c: 'Active',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );
    await setSf769AccountDataverseId(apiClient, 'Legal Entity', legal.id, guidLegal);

    const group = await testDataFactory.createAccount(
      {
        Name: `SF769_Group_NoDV_${ts}`,
        Type: 'Group',
        Account_Status__c: 'Active',
        Party_Code__c: uniquePartyCode(),
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
        BillingState: 'California',
        BillingCity: 'Los Angeles',
        BillingPostalCode: '90001',
        BillingStreet: '201 SF-769 Group NoDV Test St',
        ShippingCountry: 'United States',
        ShippingState: 'California',
        ShippingCity: 'Los Angeles',
        ShippingPostalCode: '90001',
        Affiliate_Non_Affiliate__c: 'NAF',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );

    const groupCheck = await apiClient.query(
      `SELECT Id, Dataverse_ID__c FROM Account WHERE Id = '${group.id}' LIMIT 1`
    );
    const groupRow = groupCheck.records?.[0] as { Dataverse_ID__c?: string } | undefined;
    const dv = groupRow?.Dataverse_ID__c;
    if (dv != null && String(dv).trim() !== '') {
      throw new Error(
        `SF-769 ineligible setup: Group ${group.id} already has Dataverse_ID__c. Adjust org automation so Group stays blank.`
      );
    }

    this.testContext.sf769MemberAccountId = member.id;
    this.testContext.sf769LegalEntityAccountId = legal.id;
    this.testContext.sf769GroupAccountId = group.id;
    this.testContext.sf769MemberDataverseId = guidMember;
    this.testContext.sf769LegalDataverseId = guidLegal;
    this.testContext.sf769GroupDataverseId = null;
    logger.info(`✅ SF-769 ineligible path: Group ${group.id} has no Dataverse_ID__c`);
  }
);

When('I create a Member Legal Entity Relationship with Group via API for SF-769', async function (this: AutomationWorld) {
  try {
    const startDate = new Date().toISOString().slice(0, 10);
    await createSf769Mler.call(this, startDate);
  } catch (e: any) {
    this.testContext.apiError = e;
    throw e;
  }
});

When(
  'I attempt to create a Member Legal Entity Relationship with Group via API for SF-769 with invalid Member__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const legalId = this.testContext.sf769LegalEntityAccountId as string;
    const groupId = this.testContext.sf769GroupAccountId as string;
    if (!apiClient || !legalId || !groupId) {
      throw new Error('SF-769 setup: Legal Entity and Group ids required.');
    }
    this.testContext.apiError = undefined;
    this.testContext.sf769RelationshipId = undefined;
    this.testContext.sf612MlerId = undefined;
    try {
      const payload: Record<string, string> = {
        Member__c: '001000000000000AAA',
        Legal_Entity__c: legalId,
        Group__c: groupId,
        Start_Date__c: new Date().toISOString().slice(0, 10),
      };
      await augmentMlerPayloadWithReasonFields(apiClient, payload);
      await apiClient.createRecord(OBJECT_API_NAME, payload, { timeout: 30000 });
      throw new Error('Expected create to fail with invalid Member__c');
    } catch (e: any) {
      this.testContext.apiError = e;
      logger.info(`✅ SF-769 create failed as expected: ${e.message}`);
    }
  }
);

When('the SF-769 relationship record is saved successfully', async function (this: AutomationWorld) {
  const id = this.testContext.sf769RelationshipId || this.testContext.recordId;
  if (!id) throw new Error('No SF-769 MLER id in context.');
  logger.info(`✅ SF-769 MLER ${id} saved successfully`);
});

When('I update the SF-769 Member Legal Entity Relationship for a benign field change', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.sf769RelationshipId as string;
  if (!apiClient || !id) throw new Error('API client or SF-769 MLER id missing.');
  const row = await apiClient.query(
    `SELECT Start_Date__c FROM ${OBJECT_API_NAME} WHERE Id = '${id}' LIMIT 1`
  );
  const current = (row.records?.[0] as any)?.Start_Date__c as string;
  const base = current ? new Date(current + 'T12:00:00.000Z') : new Date();
  base.setUTCDate(base.getUTCDate() + 1);
  const next = base.toISOString().slice(0, 10);
  await apiClient.updateRecord(OBJECT_API_NAME, id, { Start_Date__c: next });
  logger.info(`✅ SF-769 Updated MLER ${id} Start_Date__c ${current} -> ${next}`);
});

Then(
  'the SF-769 MLER should link Member, Legal Entity, and Group accounts',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const mlerId = this.testContext.sf769RelationshipId as string;
    const memberId = this.testContext.sf769MemberAccountId as string;
    const legalId = this.testContext.sf769LegalEntityAccountId as string;
    const groupId = this.testContext.sf769GroupAccountId as string;
    if (!apiClient || !mlerId) throw new Error('No SF-769 MLER id in context.');

    const q = await apiClient.query(
      `SELECT Id, Member__c, Legal_Entity__c, Group__c FROM ${OBJECT_API_NAME} WHERE Id = '${mlerId}' LIMIT 1`
    );
    const row = q.records?.[0] as { Member__c?: string; Legal_Entity__c?: string; Group__c?: string };
    if (!row) throw new Error(`MLER ${mlerId} not found`);
    if (row.Member__c !== memberId) {
      throw new Error(`MLER Member__c expected ${memberId}, got ${row.Member__c}`);
    }
    if (row.Legal_Entity__c !== legalId) {
      throw new Error(`MLER Legal_Entity__c expected ${legalId}, got ${row.Legal_Entity__c}`);
    }
    if (row.Group__c !== groupId) {
      throw new Error(`MLER Group__c expected ${groupId}, got ${row.Group__c}`);
    }
    logger.info('✅ SF-769 MLER links Member, Legal Entity, and Group');
  }
);

Then(
  'Member, Legal Entity, and Group accounts should still have Dataverse_ID__c populated',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const memberId = this.testContext.sf769MemberAccountId as string;
    const legalId = this.testContext.sf769LegalEntityAccountId as string;
    const groupId = this.testContext.sf769GroupAccountId as string;
    if (!apiClient) throw new Error('No API client');

    for (const [label, id] of [
      ['Member', memberId],
      ['Legal Entity', legalId],
      ['Group', groupId],
    ] as const) {
      const q = await apiClient.query(
        `SELECT Dataverse_ID__c FROM Account WHERE Id = '${id}' LIMIT 1`
      );
      const v = (q.records?.[0] as { Dataverse_ID__c?: string })?.Dataverse_ID__c;
      if (v == null || String(v).trim() === '') {
        throw new Error(`SF-769: Expected ${label} ${id} to retain Dataverse_ID__c`);
      }
    }
    logger.info('✅ SF-769: Member, Legal Entity, Group still have Dataverse_ID__c');
  }
);

Then('the SF-769 relationship create must have failed', async function (this: AutomationWorld) {
  const err = this.testContext.apiError;
  const id = this.testContext.sf769RelationshipId;
  if (id) {
    throw new Error(`Expected create to fail, but record ${id} was created.`);
  }
  if (!err) {
    throw new Error('Expected create to fail with an error, but no error was captured.');
  }
  logger.info(`✅ SF-769 create failed as expected: ${err.message}`);
});

const SF769_STREAMING_EVENT_API_NAME_FOR_ASSERT =
  process.env.SF769_PLATFORM_EVENT_API_NAME ||
  process.env.SF612_MLER_PLATFORM_EVENT_API_NAME ||
  'Member_Legal_Entity_Relationship_Event__e';

Then(
  'no Member Legal Entity Group Relationship Platform Event is received within {int} seconds after failed transaction',
  async function (this: AutomationWorld, timeoutSec: number) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    if (!streamingClient) {
      throw new Error('Subscribe to Member Legal Entity Group Relationship Platform Events first.');
    }
    streamingClient.clearEvents();
    await streamingClient.assertNoNewEventsForApiNameDuring(
      SF769_STREAMING_EVENT_API_NAME_FOR_ASSERT,
      timeoutSec * 1000
    );
  }
);

Then(
  'no Member Legal Entity Group Relationship Platform Event is received for the SF-769 relationship within {int} seconds',
  async function (this: AutomationWorld, timeoutSec: number) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    const recordId = this.testContext.sf769RelationshipId || this.testContext.recordId;
    if (!streamingClient) {
      throw new Error('Subscribe to Member Legal Entity Group Relationship Platform Events first.');
    }
    if (!recordId) {
      throw new Error('No SF-769 MLER id in context.');
    }
    try {
      await streamingClient.waitForEvent({ recordId }, timeoutSec * 1000);
      throw new Error(
        `SF-769: A Member Legal Entity Group Relationship Platform Event was received for ${recordId}, but this scenario expects no event.`
      );
    } catch (e: any) {
      if (e.message && e.message.startsWith('SF-769: A Member')) {
        throw e;
      }
      streamingClient.clearEvents();
      logger.info(`✅ No MLER (Group path) platform event for ${recordId} within ${timeoutSec}s (expected)`);
    }
  }
);

Then(
  'a Dataverse Member Maps row should exist for the SF-769 Salesforce relationship within {int} seconds',
  async function (this: AutomationWorld, timeoutSec: number) {
    const entitySet =
      process.env.SF769_DYNAMICS_MEMBER_MAPS_ENTITY_SET?.trim() || 'accelins_membermappings';
    const corrField = process.env.SF769_DYNAMICS_CORRELATION_FIELD?.trim();

    let dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
    if (!dynamicsClient) {
      if (!this.apiContext) throw new Error('API context not initialized');
      dynamicsClient = new DynamicsAPIClient(this.apiContext);
      await dynamicsClient.authenticate();
      this.testContext.dynamicsClient = dynamicsClient;
    }

    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const sfId = this.testContext.sf769RelationshipId as string;
    if (!sfId) throw new Error('No SF-769 relationship id; create MLER first.');

    const deadline = Date.now() + timeoutSec * 1000;
    let lastCount = 0;
    let lastHint = '';

    while (Date.now() < deadline) {
      if (corrField) {
        const id15 = sfId.length >= 15 ? sfId.substring(0, 15) : sfId;
        const filter = `(${corrField} eq '${sfId}' or ${corrField} eq '${id15}')`;
        const result = await dynamicsClient.query(entitySet, { $filter: filter, $top: '5' });
        const records = (result as any)?.value ?? [];
        lastCount = Array.isArray(records) ? records.length : 0;
        lastHint = `${corrField}=${sfId}`;
        if (lastCount > 0) {
          this.testContext.sf769DataverseMemberMapRow = records[0];
          logger.info(`✅ Dataverse Member Maps: ${lastCount} row(s) for ${corrField}=${sfId} (${entitySet})`);
          return;
        }
      } else if (apiClient) {
        const q = await apiClient.query(
          `SELECT Dataverse_ID__c FROM Member_Legal_Entity_Relationship__c WHERE Id = '${sfId}' LIMIT 1`
        );
        const dvId = (q.records?.[0] as { Dataverse_ID__c?: string })?.Dataverse_ID__c?.trim();
        if (dvId) {
          const filter = `accelins_membermappingid eq '${dvId}'`;
          const result = await dynamicsClient.query(entitySet, { $filter: filter, $top: '5' });
          const records = (result as any)?.value ?? [];
          lastCount = Array.isArray(records) ? records.length : 0;
          lastHint = `accelins_membermappingid=${dvId} (from MLER Dataverse_ID__c)`;
          if (lastCount > 0) {
            this.testContext.sf769DataverseMemberMapRow = records[0];
            logger.info(`✅ Dataverse Member Maps: ${lastCount} row(s) for ${lastHint} (${entitySet})`);
            return;
          }
        } else {
          lastHint = 'MLER Dataverse_ID__c still blank on Salesforce';
        }
      }

      await new Promise((r) => setTimeout(r, 5000));
    }
    throw new Error(
      `SF-769: No Dataverse ${entitySet} row for SF MLER ${sfId} within ${timeoutSec}s (${lastHint}; last query returned ${lastCount})`
    );
  }
);
