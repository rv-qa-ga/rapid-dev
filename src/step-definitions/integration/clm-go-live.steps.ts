/**
 * CLM Go-Live migration / integration step definitions.
 * Plan: docs/clm/CLM_GO_LIVE_MIGRATION_INTEGRATION_TEST_PLAN.md
 *
 * Steps marked pending until .env.int entity mappings and Data Cloud / ADP access are confirmed.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';

function pending(message: string): never {
  throw new Error(`PENDING: ${message}`);
}

function assertIntEnvironment(): void {
  const env = (process.env.ENV || '').toLowerCase();
  if (env !== 'int') {
    pending(
      `Expected ENV=int (load src/config/env/.env.int). Current ENV=${process.env.ENV || '(unset)'}`
    );
  }
  const sfUrl = (process.env.SF_BASE_URL || '').toLowerCase();
  if (!sfUrl.includes('arx--int')) {
    logger.warn(`SF_BASE_URL does not contain arx--int: ${process.env.SF_BASE_URL || '(unset)'}`);
  }
  const d365Url = (process.env.D365_BASE_URL || '').toLowerCase();
  if (!d365Url.includes('accelinspreprod')) {
    logger.warn(
      `D365_BASE_URL does not contain accelinspreprod: ${process.env.D365_BASE_URL || '(unset)'}`
    );
  }
}

Given('programme INT credentials are loaded from env file int', function (this: AutomationWorld) {
  assertIntEnvironment();
  this.testContext.clmGoLiveEnv = 'int';
  logger.info('CLM Go-Live: INT environment gate passed');
});

Given(
  'CLM migration validation is configured for entity {string} {string} {string} {string}',
  function (
    this: AutomationWorld,
    jira: string,
    dynamicsEntity: string,
    salesforceObject: string,
    correlationField: string
  ) {
    assertIntEnvironment();
    this.testContext.clmMigrationEntity = { jira, dynamicsEntity, salesforceObject, correlationField };
    pending(
      `Implement generic migration compare for ${jira} (${dynamicsEntity} → ${salesforceObject}.${correlationField}). ` +
        'Extend migration-field-mapper or add entity-specific loader from Picklist Value Mappings.xlsx.'
    );
  }
);

When(
  'I query Dynamics preprod for a sample {string} by correlation key {string}',
  async function (this: AutomationWorld, _dynamicsEntity: string, _sampleKey: string) {
    pending('Dynamics sample fetch by correlation key — wire DynamicsAPIClient per entity set');
  }
);

Then(
  'the corresponding {string} record should exist in Salesforce INT with {string} populated',
  async function (this: AutomationWorld, _salesforceObject: string, _correlationField: string) {
    pending('Salesforce INT record existence check by correlation field');
  }
);

Then(
  'mapped migration fields should match between Dynamics and Salesforce',
  async function (this: AutomationWorld) {
    pending('Field-level migration compare for non-Account entities');
  }
);

Given(
  'CLM lifecycle test is configured for Jira {string} object {string}',
  function (this: AutomationWorld, jira: string, salesforceObject: string) {
    assertIntEnvironment();
    this.testContext.clmLifecycleEntity = { jira, salesforceObject };
    pending(
      `Implement Create/Update lifecycle for ${jira} (${salesforceObject}). Reuse TestDataFactory + platform event pattern from SF-736.`
    );
  }
);

When(
  'I create a {string} record in Salesforce INT with minimum required fields',
  async function (this: AutomationWorld, _salesforceObject: string) {
    pending('Generic mastered-object create via API');
  }
);

When('I activate or qualify the record per integration eligibility rules', async function (this: AutomationWorld) {
  pending('Entity-specific eligibility (status / valid-from) before sync');
});

Then(
  'the record should receive Dataverse_ID__c or equivalent correlation within the integration SLA',
  async function (this: AutomationWorld) {
    pending('Poll Salesforce for Dataverse_ID__c after platform event / Mule processing');
  }
);

When('I update the same {string} record with a traceable field change', async function (this: AutomationWorld, _obj: string) {
  pending('Generic mastered-object update via API');
});

Then('Dynamics preprod should reflect the update on the correlated row', async function (this: AutomationWorld) {
  pending('Dynamics fetch + field assert for updated row');
});

When('I run the automated feature pack tagged {word} against Salesforce INT', async function (this: AutomationWorld, tag: string) {
  const scripts: Record<string, string> = {
    'SF-736': 'cross-env ENV=int node scripts/run-tests-with-env.js src/features/api/SF/SF-736.feature --tags @SF-736',
    'SF-769': 'cross-env ENV=int npm run test:sf769',
    'SF-788': 'cross-env ENV=int npm run test:sf788',
    'SF-796': 'cross-env ENV=int npm run test:sf796:qamerge',
    'SF-872': 'cross-env ENV=int npm run test:sf872',
  };
  const cmd = scripts[tag];
  if (!cmd) {
    pending(`No npm runner mapped for ${tag}. Add script to package.json or run Jira feature manually.`);
  }
  logger.info(`CLM checklist: run separately → ${cmd}`);
  pending(`Manual orchestration step — execute: ${cmd}`);
});

Then('all SF-736 API Create and Update scenarios should pass', function () {
  pending('Execute SF-736 pack first; this step is a programme checklist placeholder');
});

Then('SF-769 platform event and optional Dataverse Member Maps assertions should pass', function () {
  pending('Execute SF-769 pack first; this step is a programme checklist placeholder');
});

Then('eligible TPA Map Create and Update events should publish per SF-788 acceptance criteria', function () {
  pending('Execute SF-788 pack first; this step is a programme checklist placeholder');
});

Then(
  'Dataverse_Mapping__mdt should resolve Product Map picklist values for MuleSoft',
  function () {
    pending('Execute SF-796 pack first; this step is a programme checklist placeholder');
  }
);

Then('product reference data create and update flows should meet SF-872 governance rules', function () {
  pending('Execute SF-872 pack first; this step is a programme checklist placeholder');
});

// ── Data Cloud / ADP / FiveTran (manual until env vars exist) ─────────────────

Given('Salesforce Data Cloud INT access is configured', function () {
  if (!process.env.SF_DATA_CLOUD_API_BASE?.trim()) {
    pending('Set SF_DATA_CLOUD_API_BASE (and related auth) in .env.int');
  }
});

When('I compare Data Cloud object row counts to Salesforce CRM for in-scope RDM entities', function () {
  pending('Data Cloud query API — object list from data team');
});

Then(
  'Data Cloud counts should be within the programme-approved tolerance of CRM counts',
  function () {
    pending('Implement count reconciliation report under reports/clm/');
  }
);

Then('a Data Cloud migration evidence report should be saved', function () {
  pending('Save HTML/CSV evidence under reports/clm/');
});

Given('read-only Snowflake ADP credentials are approved for go-live validation', function () {
  if (!process.env.SNOWFLAKE_ACCOUNT?.trim()) {
    pending('Configure SNOWFLAKE_* in .env.int for read-only ADP (production with approval)');
  }
});

When(
  'I query ADP view or table MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 for programme sample members',
  function () {
    pending('Snowflake query via existing finops snowflake client');
  }
);

Then(
  'the result set should include expected columns documented by the data product owner',
  function () {
    pending('Column manifest from data product owner');
  }
);

Then('row counts for sample members should be greater than zero', function () {
  pending('Assert sample member keys return rows');
});

Given('Salesforce Data Cloud INT is configured for zero-copy federation', function () {
  pending('Data Cloud connector health check');
});

When(
  'I open the federated data stream or data lake object for MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2',
  function () {
    pending('UI or API: federated object name from data team');
  }
);

Then('the connector status should be healthy', function () {
  pending('Connector status API');
});

Then('sample member keys from ADP should be queryable in Data Cloud', function () {
  pending('Cross-query ADP sample keys in Data Cloud');
});

Given('a programme-approved test Member exists in Salesforce INT with known ADP keys', function () {
  pending('Seed member + document ADP keys in data/clm/');
});

When('I open the Member record in Salesforce CRM', function () {
  pending('Playwright UI or API composite for federated fields');
});

Then(
  'federated MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 attributes should display values consistent with ADP sample',
  function () {
    pending('Compare CRM federated fields to Snowflake sample');
  }
);

Then(
  'I should still be able to update Salesforce-mastered fields on the Member per SF-736 rules',
  function () {
    pending('API update Member mastered field after federation display');
  }
);

Given('FiveTran connector monitoring access is available', function () {
  pending('FIVETRAN_API_KEY or manual dashboard access in .env.int');
});

When('I review sync history for in-scope Dynamics entities since migration cutover', function () {
  pending('FiveTran API or manual checkpoint');
});

Then(
  'there should be no unresolved failed syncs for programme-critical entities',
  function () {
    pending('FiveTran failed sync assert');
  }
);

Then('incremental row counts should be within expected bounds', function () {
  pending('FiveTran row count trend assert');
});

// ── Bordereaux (manual) ───────────────────────────────────────────────────────

Given('a programme-approved written bordereaux test file path is configured', function () {
  if (!process.env.BORDEREAUX_TEST_FILE_WRITTEN?.trim()) {
    pending('Set BORDEREAUX_TEST_FILE_WRITTEN in .env.int');
  }
});

Given('a programme-approved claim bordereaux test file path is configured', function () {
  if (!process.env.BORDEREAUX_TEST_FILE_CLAIM?.trim()) {
    pending('Set BORDEREAUX_TEST_FILE_CLAIM in .env.int');
  }
});

Given('a test Member exists in Salesforce INT with known Party MasterId', function () {
  pending('Resolve test member from BORDEREAUX_TEST_MEMBER_MASTER_ID or data/clm/');
});

Given('baseline Member and Product lifecycle state is captured', function () {
  pending('Snapshot API state before bordereaux load');
});

When('I submit the written bordereaux test file for ingestion', function () {
  pending('Bordereaux ingest interface — path from BORDEREAUX_TEST_FILE_WRITTEN');
});

When('I submit the claim bordereaux test file for ingestion', function () {
  pending('Bordereaux ingest interface — path from BORDEREAUX_TEST_FILE_CLAIM');
});

Then('bordereaux processing should complete without fatal errors', function () {
  pending('Poll ingest status / error queue');
});

Then(
  'the Member Account_Status__c and related Product Maps should remain valid per business rules',
  function () {
    pending('Post-ingest Salesforce API validation');
  }
);

Then(
  'Dynamics Party for the member should remain consistent with Salesforce mastering',
  function () {
    pending('Post-ingest Dynamics Party compare');
  }
);

Then(
  'claim processing should complete without fatal errors',
  function () {
    pending('Claim ingest status poll');
  }
);

Then(
  'claim transactions should not orphan Product Map or Member Product program links',
  function () {
    pending('Link integrity queries on Product_Map__c / Member_Product_and_Program__c');
  }
);

Given(
  'an existing production-like member sample is identified in INT with pre-load snapshot',
  function () {
    pending('Existing member id from data team + snapshot');
  }
);

When('I submit written and claim test files scoped to that member', function () {
  pending('Scoped bordereaux load for control member');
});

Then('only expected delta fields should change', function () {
  pending('Diff snapshot vs post-load');
});

Then(
  'core Member and Product lifecycle attributes should match pre-load snapshot within tolerance',
  function () {
    pending('Tolerance rules from programme');
  }
);

When('I load the written bordereaux test file for the new member keys', function () {
  pending('Written file ingest for newly created member');
});

Then('bordereaux processing should associate transactions to the new member', function () {
  pending('Transaction linkage assert');
});

Then(
  'Product lifecycle records required for the programme should be creatable post-ingest',
  function () {
    pending('Create Product Map / MPP post-ingest smoke');
  }
);

Given('a member with successful prior bordereaux ingest in INT', function () {
  pending('Member with known good prior ingest');
});

When('I submit a deliberately invalid bordereaux test file for that member', function () {
  pending('Invalid file path BORDEREAUX_TEST_FILE_INVALID');
});

Then('the ingest should fail with clear errors', function () {
  pending('Assert failure message');
});

Then('prior Member and Product lifecycle state should remain unchanged', function () {
  pending('Compare to pre-invalid-load snapshot');
});
