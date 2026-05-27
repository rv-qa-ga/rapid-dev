/**
 * UAT Smoke Data Creation - Step Definitions
 *
 * Purpose: Glue steps for UAT smoke data-seeding scenarios (@uat-smoke-data).
 * Reuses existing framework where possible:
 *   - SalesforceAPIClient.createRecord(...) for all record creates
 *   - TestDataFactory for standard objects (Lead/Contact/Account/Opportunity)
 *   - existing sf-872-data.steps.ts for 9 product reference objects
 *   - existing sf-600-account-team-member.steps.ts for AccountTeamMember
 *
 * Only adds steps that do not already exist in the framework:
 *   - Country__c create (simple, persistent)
 *   - Member_Legal_Entity_Relationship__c create (needs 2 Accounts)
 *   - OpportunityTeamMember create
 *   - A generic "create a smoke test record via API" for custom objects
 *   - UI glue: "I create a <Object> record via UI with minimal fields" (Name only)
 *
 * Related Jira: SF-699
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { testDataFactory } from '../../test-data/TestDataFactory';
import { logger } from '../../utils/logger';

// ═══════════════════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════════════════

function smokeName(objectType: string, mode: 'UI' | 'API'): string {
  const ts = Date.now();
  return `UAT Smoke ${mode} - ${objectType} - ${ts}`;
}

function getClient(world: AutomationWorld): SalesforceAPIClient {
  const apiClient = world.testContext.apiClient as SalesforceAPIClient | undefined;
  if (!apiClient) {
    throw new Error(
      'API client not initialized. Run a "Given I have a valid Salesforce API token as ..." step first.'
    );
  }
  return apiClient;
}

function recordCreated(world: AutomationWorld, objectApi: string, id: string): void {
  world.testContext.uatSmokeLastObject = objectApi;
  world.testContext.uatSmokeLastRecordId = id;
  if (!world.testContext.uatSmokeCreatedRecords) {
    world.testContext.uatSmokeCreatedRecords = [];
  }
  (world.testContext.uatSmokeCreatedRecords as Array<{ object: string; id: string }>).push({
    object: objectApi,
    id,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GIVEN: Two Accounts for MLER
// ═══════════════════════════════════════════════════════════════════════════

Given(
  'I have two test Accounts created via API for UAT smoke MLER',
  async function (this: AutomationWorld) {
    await testDataFactory.initialize();
    const memberName = smokeName('Account-MLER-Member', 'API');
    const entityName = smokeName('Account-MLER-LegalEntity', 'API');

    const member = await testDataFactory.createAccount({ Name: memberName, Type: 'Member' });
    // UAT validation: the second Account must be of Type "Legal Entity" for MLER create.
    const legalEntity = await testDataFactory.createAccount({
      Name: entityName,
      Type: 'Legal Entity',
    });

    testDataFactory.markAsPersistent(member.id);
    testDataFactory.markAsPersistent(legalEntity.id);

    this.testContext.mlerMemberAccountId = member.id;
    this.testContext.mlerLegalEntityAccountId = legalEntity.id;
    this.testContext.mlerMemberAccountName = memberName;
    this.testContext.mlerLegalEntityAccountName = entityName;

    logger.info(
      `UAT smoke MLER: Member Account ${member.id} (${memberName}); Legal Entity Account ${legalEntity.id} (${entityName})`
    );
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// API CREATE: Member_Legal_Entity_Relationship__c
// ═══════════════════════════════════════════════════════════════════════════

When(
  'I create a Member Legal Entity Relationship record via API for UAT smoke',
  async function (this: AutomationWorld) {
    const apiClient = getClient(this);
    const memberId = this.testContext.mlerMemberAccountId as string | undefined;
    const legalEntityId = this.testContext.mlerLegalEntityAccountId as string | undefined;

    if (!memberId || !legalEntityId) {
      throw new Error(
        'MLER prerequisite Accounts missing. Run "Given I have two test Accounts created via API for UAT smoke MLER" first.'
      );
    }

    const startDate = new Date().toISOString().slice(0, 10);
    const payload: Record<string, unknown> = {
      Member__c: memberId,
      Legal_Entity__c: legalEntityId,
      Start_Date__c: startDate,
    };

    const result = await apiClient.createRecord('Member_Legal_Entity_Relationship__c', payload);
    if (!result.id) {
      throw new Error(
        `MLER create failed: ${JSON.stringify(result.errors || result, null, 2)}`
      );
    }

    recordCreated(this, 'Member_Legal_Entity_Relationship__c', result.id);
    logger.info(`✅ UAT smoke MLER created: ${result.id}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// API CREATE: OpportunityTeamMember (standard)
// ═══════════════════════════════════════════════════════════════════════════

When(
  'I create an Opportunity Team Member record via API for UAT smoke',
  async function (this: AutomationWorld) {
    const apiClient = getClient(this);
    const opportunityId =
      (this.testContext.opportunityId as string | undefined) ||
      (this.testContext.uatSmokeOpportunityId as string | undefined);
    if (!opportunityId) {
      throw new Error(
        'Opportunity ID missing. Create an Opportunity first via "Given I have a test Opportunity created via API".'
      );
    }

    const userRes = await apiClient.query(`SELECT Id FROM User WHERE IsActive = true LIMIT 1`);
    if (!userRes.records || userRes.records.length === 0) {
      throw new Error('No active User found for OpportunityTeamMember');
    }
    const userId = userRes.records[0].Id as string;

    const payload: Record<string, unknown> = {
      OpportunityId: opportunityId,
      UserId: userId,
      TeamMemberRole: 'Account Manager',
    };

    const result = await apiClient.createRecord('OpportunityTeamMember', payload);
    if (!result.id) {
      throw new Error(
        `OpportunityTeamMember create failed: ${JSON.stringify(
          result.errors || result,
          null,
          2
        )}`
      );
    }

    recordCreated(this, 'OpportunityTeamMember', result.id);
    logger.info(`✅ UAT smoke OpportunityTeamMember created: ${result.id}`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// API CREATE: Country__c (simple, Name-only)
// ═══════════════════════════════════════════════════════════════════════════

function randAlpha(len: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < len; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
}

When(
  'I create a Country__c record via API for UAT smoke',
  async function (this: AutomationWorld) {
    const apiClient = getClient(this);
    const name = smokeName('Country', 'API');
    // SF-575: Alpha2_Code__c is required + unique (2 chars); Alpha3_Code__c is unique (3 chars).
    const payload: Record<string, unknown> = {
      Name: name,
      Alpha2_Code__c: randAlpha(2),
      Alpha3_Code__c: randAlpha(3),
    };

    const result = await apiClient.createRecord('Country__c', payload);
    if (!result.id) {
      throw new Error(
        `Country__c create failed: ${JSON.stringify(result.errors || result, null, 2)}`
      );
    }

    this.testContext.countryId = result.id;
    this.testContext.countryName = name;
    recordCreated(this, 'Country__c', result.id);
    logger.info(`✅ UAT smoke Country__c created: ${result.id} (${name})`);
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// Generic verification (works for API create in any @uat-smoke-data scenario)
// ═══════════════════════════════════════════════════════════════════════════

Then(
  'the UAT smoke record should be created successfully',
  async function (this: AutomationWorld) {
    const id = this.testContext.uatSmokeLastRecordId as string | undefined;
    const objectApi = this.testContext.uatSmokeLastObject as string | undefined;
    if (!id || !objectApi) {
      throw new Error(
        'No UAT smoke record context found. Make sure a create step ran successfully.'
      );
    }
    const apiClient = getClient(this);
    const rec = await apiClient.getRecord(objectApi, id);
    if (!rec.Id) {
      throw new Error(`Could not retrieve ${objectApi} ${id} after create`);
    }
    logger.info(`✅ UAT smoke verified: ${objectApi} ${id}`);
  }
);
