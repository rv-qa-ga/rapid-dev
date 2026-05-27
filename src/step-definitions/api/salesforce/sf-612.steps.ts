/**
 * SF-612 - Member Legal Entity Relationship + Dataverse / platform events (API).
 * Flow: Member (Onboarding) + Legal Entity (Active), both Dataverse_ID__c, then MLER.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { SalesforceStreamingClient } from '../../../utils/salesforce-streaming-client';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { randomUUID } from 'crypto';

const OBJECT_API_NAME = 'Member_Legal_Entity_Relationship__c';

/** Unique Party_Code__c for Member (org: max length 4 + uniqueness). */
function uniquePartyCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 4; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
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
  return 'SF-612 API automation — test relationship reason';
}

/** VR may require a "Reason" field; discover from describe (label/name). */
async function augmentMlerPayloadWithReasonFields(
  apiClient: SalesforceAPIClient,
  payload: Record<string, string>
): Promise<void> {
  const desc = await apiClient.describeSObject(OBJECT_API_NAME);
  const fields = (desc.fields || []) as MlerFieldMeta[];
  const reasonFields = fields.filter(
    (f) =>
      f.createable && (/reason/i.test(f.name) || /reason/i.test(f.label || ''))
  );
  for (const f of reasonFields) {
    if (payload[f.name] !== undefined) continue;
    payload[f.name] = valueForMlerField(f);
    logger.info(`✅ MLER payload: ${f.name} (${f.label || f.name})`);
  }
  if (reasonFields.length === 0) {
    logger.warn('No createable Reason-like field found on MLER describe; create may fail on validation rule');
  }
}

function addDaysYMD(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Create MLER; sets sf612MlerId and recordId for platform-event assertions. */
async function createSf612Mler(this: AutomationWorld, startDateYmd: string): Promise<void> {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const memberId = this.testContext.sf612MemberAccountId as string;
  const legalId = this.testContext.sf612LegalEntityAccountId as string;
  if (!apiClient || !memberId || !legalId) {
    throw new Error('Run SF-612 account setup first (Member + Legal Entity IDs missing).');
  }

  this.testContext.apiError = undefined;
  const payload: Record<string, string> = {
    Member__c: memberId,
    Legal_Entity__c: legalId,
    Start_Date__c: startDateYmd,
  };

  await augmentMlerPayloadWithReasonFields(apiClient, payload);

  // MLER create can exceed default 30s API timeout when triggers / platform events run
  const res = await apiClient.createRecord(OBJECT_API_NAME, payload, { timeout: 120000 });
  const id = (res as any).id || (res as any).Id;
  if (!id) {
    throw new Error(`MLER create returned no id: ${JSON.stringify(res)}`);
  }
  this.testContext.sf612MlerId = id;
  this.testContext.recordId = id;
  testDataFactory.registerRecord(id, OBJECT_API_NAME, `SF612_MLER_${id}`);
  logger.info(`✅ Created ${OBJECT_API_NAME} ${id} Start_Date__c=${startDateYmd}`);
  await new Promise((r) => setTimeout(r, 500));
}

// ═══════════════════════════════════════════════════════════════════════════
// Background (mirrors JIRA SF-612)
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration',
  async function () {
    logger.info(
      '✅ Background (SF-612): Salesforce publishes Member Legal Entity Relationship Platform Events for Dataverse'
    );
  }
);

Given('the system is configured for SF-612', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }
  const describeResult = await apiClient.describeSObject(OBJECT_API_NAME);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  logger.info(`✅ System configured for SF-612: ${OBJECT_API_NAME} described`);
});

When('Member Legal Entity Relationship records are eligible for downstream synchronisation with Dataverse', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');
  this.testContext.apiError = undefined;
  try {
    const soql = `SELECT Id, Dataverse_ID__c FROM ${OBJECT_API_NAME} WHERE Dataverse_ID__c != null LIMIT 1`;
    const result = await apiClient.query(soql);
    this.testContext.sf612QueryResult = result;
  } catch (e: any) {
    try {
      const fallback = `SELECT Id FROM ${OBJECT_API_NAME} LIMIT 1`;
      const result = await apiClient.query(fallback);
      this.testContext.sf612QueryResult = result;
    } catch (e2: any) {
      this.testContext.apiError = e2;
    }
  }
});

Given('SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) throw new Error('API client not initialized.');

  await testDataFactory.initialize();
  const ts = Date.now();

  const member = await testDataFactory.createAccount(
    {
      Name: `SF612_Member_${ts}`,
      Type: 'Member',
      Account_Status__c: 'Onboarding',
      Party_Code__c: uniquePartyCode(),
      Affiliate_Non_Affiliate__c: 'AFL',
      Ownership: 'Mission',
    },
    { checkExists: false, deleteIfExists: false }
  );

  const legal = await testDataFactory.createAccount(
    {
      Name: `SF612_LegalEntity_${ts}`,
      Type: 'Legal Entity',
      Account_Status__c: 'Active',
      Functional_Currency__c: 'USD',
      BillingCountry: 'United States',
    },
    { checkExists: false, deleteIfExists: false }
  );

  const guidMember = randomUUID();
  const guidLegal = randomUUID();

  try {
    await apiClient.updateRecord('Account', member.id, { Dataverse_ID__c: guidMember });
    logger.info(`✅ Member ${member.id} Dataverse_ID__c set`);
  } catch (e: any) {
    logger.warn(`Could not set Dataverse_ID__c on Member: ${e.message}`);
    throw new Error(`SF-612 setup: failed to set Dataverse_ID__c on Member Account: ${e.message}`);
  }

  try {
    await apiClient.updateRecord('Account', legal.id, { Dataverse_ID__c: guidLegal });
    logger.info(`✅ Legal Entity ${legal.id} Dataverse_ID__c set`);
  } catch (e: any) {
    logger.warn(`Could not set Dataverse_ID__c on Legal Entity: ${e.message}`);
    throw new Error(`SF-612 setup: failed to set Dataverse_ID__c on Legal Entity Account: ${e.message}`);
  }

  this.testContext.sf612MemberAccountId = member.id;
  this.testContext.sf612LegalEntityAccountId = legal.id;
  this.testContext.sf612MemberDataverseId = guidMember;
  this.testContext.sf612LegalDataverseId = guidLegal;
});

Given(
  'SF-612 test accounts exist: Member Prospect and Legal Entity Active but Member Account has no Dataverse_ID__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    await testDataFactory.initialize();
    const ts = Date.now();

    // Match manual QA: Prospect (or New) Member without debtor/Dataverse id — MLER create should NOT publish.
    // "Onboarding" can cause org flows to stamp Dataverse_ID__c, which makes the scenario look like a product bug.
    const member = await testDataFactory.createAccount(
      {
        Name: `SF612_Member_NoDV_${ts}`,
        Type: 'Member',
        Account_Status__c: 'Prospect',
        Party_Code__c: uniquePartyCode(),
        Affiliate_Non_Affiliate__c: 'AFL',
        Ownership: 'Mission',
        BillingCountry: 'United States',
        BillingState: 'New York',
        BillingCity: 'Automation City',
        BillingPostalCode: '10001',
        BillingStreet: '100 SF-612 No-DV Test St',
      },
      { checkExists: false, deleteIfExists: false }
    );

    const memberCheck = await apiClient.query(
      `SELECT Id, Dataverse_ID__c, Account_Status__c FROM Account WHERE Id = '${member.id}' LIMIT 1`
    );
    const memberRow = memberCheck.records?.[0] as { Dataverse_ID__c?: string } | undefined;
    const dv = memberRow?.Dataverse_ID__c;
    if (dv != null && String(dv).trim() !== '') {
      throw new Error(
        `SF-612 API-007 setup: Member ${member.id} already has Dataverse_ID__c=${JSON.stringify(dv)} after create. ` +
          `Org automation may be stamping Dataverse on this status; manual tests use Prospect/New with no debtor id. ` +
          `Adjust Member fields/status so Dataverse_ID__c stays blank before MLER insert.`
      );
    }
    logger.info(`✅ Member ${member.id} Prospect, Dataverse_ID__c blank (ineligible MLER publish path)`);

    const legal = await testDataFactory.createAccount(
      {
        Name: `SF612_LegalEntity_${ts}`,
        Type: 'Legal Entity',
        Account_Status__c: 'Active',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
      },
      { checkExists: false, deleteIfExists: false }
    );

    const guidLegal = randomUUID();
    try {
      await apiClient.updateRecord('Account', legal.id, { Dataverse_ID__c: guidLegal });
      logger.info(`✅ Legal Entity ${legal.id} Dataverse_ID__c set (Member intentionally without)`);
    } catch (e: any) {
      throw new Error(`SF-612 setup: failed to set Dataverse_ID__c on Legal Entity: ${e.message}`);
    }

    this.testContext.sf612MemberAccountId = member.id;
    this.testContext.sf612LegalEntityAccountId = legal.id;
    this.testContext.sf612MemberDataverseId = null;
    this.testContext.sf612LegalDataverseId = guidLegal;
  }
);

Given(
  'SF-612 test accounts exist: Member Onboarding and Legal Entity Active but Legal Entity has no Dataverse_ID__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    if (!apiClient) throw new Error('API client not initialized.');

    await testDataFactory.initialize();
    const ts = Date.now();

    const member = await testDataFactory.createAccount(
      {
        Name: `SF612_Member_${ts}`,
        Type: 'Member',
        Account_Status__c: 'Onboarding',
        Party_Code__c: uniquePartyCode(),
        Affiliate_Non_Affiliate__c: 'AFL',
        Ownership: 'Mission',
      },
      { checkExists: false, deleteIfExists: false }
    );

    const legal = await testDataFactory.createAccount(
      {
        Name: `SF612_LegalEntity_NoDV_${ts}`,
        Type: 'Legal Entity',
        Account_Status__c: 'Active',
        Functional_Currency__c: 'USD',
        BillingCountry: 'United States',
      },
      { checkExists: false, deleteIfExists: false }
    );

    const guidMember = randomUUID();
    try {
      await apiClient.updateRecord('Account', member.id, { Dataverse_ID__c: guidMember });
      logger.info(`✅ Member ${member.id} Dataverse_ID__c set`);
    } catch (e: any) {
      throw new Error(`SF-612 setup: failed to set Dataverse_ID__c on Member: ${e.message}`);
    }

    const legalCheck = await apiClient.query(
      `SELECT Id, Dataverse_ID__c FROM Account WHERE Id = '${legal.id}' LIMIT 1`
    );
    const legalRow = legalCheck.records?.[0] as { Dataverse_ID__c?: string } | undefined;
    const dv = legalRow?.Dataverse_ID__c;
    if (dv != null && String(dv).trim() !== '') {
      throw new Error(
        `SF-612 setup: Legal Entity ${legal.id} already has Dataverse_ID__c. ` +
          'Use an Account type/status that does not get auto-stamped.'
      );
    }
    logger.info(`✅ Legal Entity ${legal.id} Dataverse_ID__c blank (ineligible for MLER publish)`);

    this.testContext.sf612MemberAccountId = member.id;
    this.testContext.sf612LegalEntityAccountId = legal.id;
    this.testContext.sf612MemberDataverseId = guidMember;
    this.testContext.sf612LegalDataverseId = null;
  }
);

When('I create a Member Legal Entity Relationship via API for SF-612', async function (this: AutomationWorld) {
  try {
    const startDate = new Date().toISOString().slice(0, 10);
    await createSf612Mler.call(this, startDate);
  } catch (e: any) {
    this.testContext.apiError = e;
    throw e;
  }
});

When(
  'I create a Member Legal Entity Relationship via API for SF-612 with Start_Date {int} days in the future',
  async function (this: AutomationWorld, days: number) {
    try {
      await createSf612Mler.call(this, addDaysYMD(days));
    } catch (e: any) {
      this.testContext.apiError = e;
      throw e;
    }
  }
);

When(
  'I attempt to create a Member Legal Entity Relationship via API for SF-612 with invalid Member__c',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const legalId = this.testContext.sf612LegalEntityAccountId as string;
    if (!apiClient || !legalId) {
      throw new Error('Legal Entity id required. Use eligible-accounts setup first.');
    }
    this.testContext.apiError = undefined;
    this.testContext.sf612MlerId = undefined;
    try {
      const payload: Record<string, string> = {
        Member__c: '001000000000000AAA',
        Legal_Entity__c: legalId,
        Start_Date__c: new Date().toISOString().slice(0, 10),
      };
      await augmentMlerPayloadWithReasonFields(apiClient, payload);
      await apiClient.createRecord(OBJECT_API_NAME, payload, { timeout: 30000 });
      throw new Error('Expected create to fail with invalid Member__c');
    } catch (e: any) {
      this.testContext.apiError = e;
      logger.info(`✅ Create failed as expected: ${e.message}`);
    }
  }
);

When('the SF-612 relationship record is saved successfully', async function (this: AutomationWorld) {
  const id = this.testContext.sf612MlerId || this.testContext.recordId;
  if (!id) throw new Error('No SF-612 MLER id in context.');
  logger.info(`✅ SF-612 MLER ${id} saved successfully`);
});

When('I update the SF-612 Member Legal Entity Relationship Start_Date to today', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.sf612MlerId as string;
  if (!apiClient || !id) throw new Error('API client or MLER id missing.');
  const today = new Date().toISOString().slice(0, 10);
  await apiClient.updateRecord(OBJECT_API_NAME, id, { Start_Date__c: today });
  logger.info(`✅ Updated MLER ${id} Start_Date__c to ${today} (should become active per SF-614)`);
});

When(
  'I update the SF-612 Member Legal Entity Relationship Start_Date for a benign change',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.sf612MlerId as string;
    if (!apiClient || !id) throw new Error('API client or MLER id missing.');
    const row = await apiClient.query(
      `SELECT Start_Date__c FROM ${OBJECT_API_NAME} WHERE Id = '${id}' LIMIT 1`
    );
    const current = (row.records?.[0] as any)?.Start_Date__c as string;
    const base = current ? new Date(current + 'T12:00:00.000Z') : new Date();
    base.setUTCDate(base.getUTCDate() + 1);
    const next = base.toISOString().slice(0, 10);
    await apiClient.updateRecord(OBJECT_API_NAME, id, { Start_Date__c: next });
    logger.info(`✅ Updated MLER ${id} Start_Date__c ${current} -> ${next}`);
  }
);

When(
  'I update the SF-612 Member Legal Entity Relationship End_Date to yesterday',
  async function (this: AutomationWorld) {
    const apiClient = this.testContext.apiClient as SalesforceAPIClient;
    const id = this.testContext.sf612MlerId as string;
    if (!apiClient || !id) throw new Error('API client or MLER id missing.');
    const y = new Date();
    y.setUTCDate(y.getUTCDate() - 1);
    const end = y.toISOString().slice(0, 10);
    await apiClient.updateRecord(OBJECT_API_NAME, id, { End_Date__c: end });
    logger.info(`✅ Set MLER ${id} End_Date__c=${end} (expect Is_Active__c false)`);
  }
);

Then('the MLER should link the Member and Legal Entity accounts', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const mlerId = this.testContext.sf612MlerId as string;
  const memberId = this.testContext.sf612MemberAccountId as string;
  const legalId = this.testContext.sf612LegalEntityAccountId as string;
  if (!apiClient || !mlerId) throw new Error('No MLER id in context.');

  const q = await apiClient.query(
    `SELECT Id, Member__c, Legal_Entity__c FROM ${OBJECT_API_NAME} WHERE Id = '${mlerId}' LIMIT 1`
  );
  const row = q.records?.[0];
  if (!row) throw new Error(`MLER ${mlerId} not found`);
  if (row.Member__c !== memberId) {
    throw new Error(`MLER Member__c expected ${memberId}, got ${row.Member__c}`);
  }
  if (row.Legal_Entity__c !== legalId) {
    throw new Error(`MLER Legal_Entity__c expected ${legalId}, got ${row.Legal_Entity__c}`);
  }
  logger.info('✅ MLER links Member and Legal Entity as expected');
});

Then('both related accounts should still have Dataverse_ID__c populated', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const memberId = this.testContext.sf612MemberAccountId as string;
  const legalId = this.testContext.sf612LegalEntityAccountId as string;
  if (!apiClient) throw new Error('No API client');

  const q = await apiClient.query(
    `SELECT Id, Dataverse_ID__c FROM Account WHERE Id IN ('${memberId}','${legalId}')`
  );
  const records = q.records || [];
  for (const acc of records) {
    if (!acc.Dataverse_ID__c) {
      throw new Error(`Account ${acc.Id} missing Dataverse_ID__c after MLER create (possible SF-612 regression).`);
    }
  }
  if (records.length !== 2) {
    throw new Error(`Expected 2 accounts in query, got ${records.length}`);
  }
  logger.info('✅ Both accounts retain Dataverse_ID__c');
});

When('I query the SF-612 Member Legal Entity Relationship record', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const mlerId = this.testContext.sf612MlerId as string;
  if (!apiClient || !mlerId) throw new Error('No MLER id.');

  this.testContext.apiError = undefined;
  try {
    const q = await apiClient.query(
      `SELECT Id, Member__c, Legal_Entity__c, Dataverse_ID__c, Is_Active__c, Start_Date__c, End_Date__c FROM ${OBJECT_API_NAME} WHERE Id = '${mlerId}' LIMIT 1`
    );
    this.testContext.sf612MlerQuery = q.records?.[0];
    const row = this.testContext.sf612MlerQuery;
    logger.info(
      `SF-612 MLER snapshot: Dataverse_ID__c=${row?.Dataverse_ID__c ?? 'null'}, Is_Active__c=${row?.Is_Active__c}`
    );

    // Document common SF-612 gap: parents have Dataverse IDs but MLER Dataverse_ID__c stays null
    if (!row?.Dataverse_ID__c) {
      logger.warn(
        '⚠️ SF-612 check: Member_Legal_Entity_Relationship__c.Dataverse_ID__c is NULL after create. ' +
          'If the story requires this to be stamped for Dataverse sync, this is a defect candidate (events may fire without durable MLER Dataverse id).'
      );
    }
  } catch (e: any) {
    this.testContext.apiError = e;
    throw e;
  }
});

async function assertSf612MlerIsActive(world: AutomationWorld, expected: boolean): Promise<void> {
  const apiClient = world.testContext.apiClient as SalesforceAPIClient;
  const id = world.testContext.sf612MlerId as string;
  if (!apiClient || !id) throw new Error('API client or MLER id missing for Is_Active__c assertion.');
  const q = await apiClient.query(
    `SELECT Is_Active__c FROM ${OBJECT_API_NAME} WHERE Id = '${id}' LIMIT 1`
  );
  const v = (q.records?.[0] as { Is_Active__c?: boolean })?.Is_Active__c;
  if (Boolean(v) !== expected) {
    throw new Error(
      `SF-612 / SF-614: Expected Member_Legal_Entity_Relationship__c.Is_Active__c=${expected}, got ${JSON.stringify(v)}. ` +
        `Check Start_Date__c/End_Date__c derivation.`
    );
  }
  logger.info(`✅ MLER ${id} Is_Active__c is ${expected} as expected`);
}

Then(/^the SF-612 MLER Is_Active__c should be (true|false)$/, async function (this: AutomationWorld, word: string) {
  await assertSf612MlerIsActive(this, word === 'true');
});

Then('the SF-612 relationship create must have failed', async function (this: AutomationWorld) {
  const err = this.testContext.apiError;
  const id = this.testContext.sf612MlerId;
  if (id) {
    throw new Error(`Expected create to fail, but record ${id} was created.`);
  }
  if (!err) {
    throw new Error('Expected create to fail with an error, but no error was captured.');
  }
  logger.info(`✅ Create failed as expected: ${err.message}`);
});

Then('the SF-612 MLER Dataverse_ID__c should be blank', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  const id = this.testContext.sf612MlerId as string;
  if (!apiClient || !id) throw new Error('No MLER id in context.');
  const q = await apiClient.query(
    `SELECT Dataverse_ID__c FROM ${OBJECT_API_NAME} WHERE Id = '${id}' LIMIT 1`
  );
  const v = (q.records?.[0] as { Dataverse_ID__c?: string })?.Dataverse_ID__c;
  if (v != null && String(v).trim() !== '') {
    throw new Error(
      `SF-612 / SF-620: Expected new MLER Dataverse_ID__c to be blank, got ${JSON.stringify(v)}. ` +
        `Integration may have populated it; SF-620 expects blank until MuleSoft receives response from Dataverse.`
    );
  }
  logger.info('✅ MLER Dataverse_ID__c is blank as expected (SF-620: populated by integration)');
});

Then(
  'no Member Legal Entity Relationship Platform Event is received for the SF-612 relationship within {int} seconds',
  async function (this: AutomationWorld, timeoutSec: number) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    const recordId = this.testContext.sf612MlerId || this.testContext.recordId;
    if (!streamingClient) {
      throw new Error('Subscribe to Member Legal Entity Relationship Platform Events first.');
    }
    if (!recordId) {
      throw new Error('No SF-612 MLER id in context.');
    }
    try {
      await streamingClient.waitForEvent({ recordId }, timeoutSec * 1000);
      throw new Error(
        `SF-612: A Member Legal Entity Relationship Platform Event was received for ${recordId}, but this scenario expects no event ` +
          `(ineligible parents or inactive relationship per story).`
      );
    } catch (e: any) {
      if (e.message && e.message.startsWith('SF-612: A Member')) {
        throw e;
      }
      streamingClient.clearEvents();
      logger.info(`✅ No MLER platform event for ${recordId} within ${timeoutSec}s (expected)`);
    }
  }
);

const SF612_MLER_EVENT_API_NAME =
  process.env.SF612_MLER_PLATFORM_EVENT_API_NAME || 'Member_Legal_Entity_Relationship_Event__e';

Then(
  'no Member Legal Entity Relationship Platform Event is received within {int} seconds after failed transaction',
  async function (this: AutomationWorld, timeoutSec: number) {
    const streamingClient = this.testContext.streamingClient as SalesforceStreamingClient;
    if (!streamingClient) {
      throw new Error('Subscribe to Member Legal Entity Relationship Platform Events first.');
    }
    streamingClient.clearEvents();
    await streamingClient.assertNoNewEventsForApiNameDuring(
      SF612_MLER_EVENT_API_NAME,
      timeoutSec * 1000
    );
  }
);
