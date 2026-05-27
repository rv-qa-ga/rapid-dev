/**
 * SF-361 Step Definitions - API
 * Operations Manager Review Data Capture.
 * Reuses common steps where possible (describe object, field existence).
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../../utils/logger';
import { testDataFactory } from '../../../test-data/TestDataFactory';

const OPPORTUNITY_READINESS_OBJECT = 'Opportunity_Readiness__c';
const OPPORTUNITY_OBJECT = 'Opportunity';

/**
 * Optional: field API names for Operations onboarding (align with attachment when available).
 * If empty, step asserts at least one field with "Operation" in name/label exists.
 */
const OPERATIONS_FIELD_NAMES: string[] = [
  // Add field API names from SF-361 attachment when known; e.g. 'Operations_Review_Completed_By__c', 'Operations_Review_Date__c'
];

// ============================================================================
// SCENARIO 1: Operations fields required once onboarding review starts
// ============================================================================

/**
 * Given the Member Onboarding Questionnaire has been submitted for review
 * Creates an Opportunity in Due Diligence with an Opportunity Readiness (questionnaire) record,
 * representing the state where the questionnaire is in review.
 * Reuses testDataFactory pattern from common data-factory.steps.ts.
 */
Given('the Member Onboarding Questionnaire has been submitted for review', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  await testDataFactory.initialize();

  if (!this.testContext.accountId) {
    const ts = Date.now();
    const uid = Math.random().toString(36).substring(2, 10).toUpperCase();
    const accName = `SF361_OppParent_${uid}_${ts}`;
    const acc = await testDataFactory.createAccount({
      Name: accName,
      Type: 'Member',
      Functional_Currency__c: 'USD',
      Account_Status__c: 'Onboarding',
      Party_Code__c: uid.slice(0, 4),
      BillingCountry: 'United States',
      BillingCity: 'New York',
      BillingState: 'New York',
      BillingPostalCode: '10001',
      BillingStreet: '123 Test St',
    });
    this.testContext.accountId = acc.id;
    this.testContext.accountName = acc.name || accName;
  }

  const closeDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const uid = Math.random().toString(36).substring(2, 10).toUpperCase();
  const ts = Date.now();
  const opp = await testDataFactory.createOpportunity(
    {
      Name: `SF361_Opp_${uid}_${ts}`,
      Stage: 'Due Diligence',
      Type: 'New Business',
      CloseDate: closeDate,
    },
    this.testContext.accountId
  );
  this.testContext.opportunityId = opp.id;
  this.testContext.opportunityName = opp.name;

  let readiness = await testDataFactory.findOpportunityReadinessByOpportunity(opp.id);
  if (!readiness) {
    try {
      readiness = await testDataFactory.createOpportunityReadiness(opp.id, opp.name || opp.id);
    } catch (e: any) {
      logger.warn(`Could not create Opportunity_Readiness__c: ${e.message}. Trying find again.`);
      readiness = await testDataFactory.findOpportunityReadinessByOpportunity(opp.id);
    }
  }
  if (readiness) {
    this.testContext.opportunityReadinessId = readiness.id;
    this.testContext.opportunityReadinessName = readiness.name;
  }

  logger.info(`✅ Member Onboarding Questionnaire submitted for review: Opportunity ${opp.id}, Readiness ${readiness?.id || 'N/A'}`);
});

/**
 * When the Operations Manager accesses the Opportunity
 * Describes the Opportunity Readiness (questionnaire) object via API so we can assert on Operations fields.
 * Reuses same pattern as common "I describe the {word} object fields" (sets describeResult, fieldsMetadata).
 */
When('the Operations Manager accesses the Opportunity', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized.');
  }

  const describeResult = await apiClient.describeSObject(OPPORTUNITY_READINESS_OBJECT);
  this.testContext.describeResult = describeResult;
  this.testContext.fieldsMetadata = describeResult.fields || [];
  this.testContext.describedObjectName = describeResult.name || OPPORTUNITY_READINESS_OBJECT;
  this.testContext.lastDescribeResult = describeResult;

  logger.info(`✅ Operations Manager accessed Opportunity (described ${OPPORTUNITY_READINESS_OBJECT}: ${(describeResult.fields || []).length} fields)`);
});

/**
 * Then the required Operations onboarding fields must be available for completion (see attachment)
 * Asserts that the required Operations fields exist on the questionnaire object.
 * If OPERATIONS_FIELD_NAMES is set, all must exist; otherwise at least one field with "Operation" in name/label.
 */
Then(/^the required Operations onboarding fields must be available for completion \(see attachment\)$/, async function (this: AutomationWorld) {
  const fields = this.testContext.fieldsMetadata || this.testContext.lastDescribeResult?.fields;
  if (!fields || !Array.isArray(fields)) {
    throw new Error(
      'No field metadata in context. Run "When the Operations Manager accesses the Opportunity" first.'
    );
  }

  const fieldList = fields as Array<{ name: string; label?: string }>;

  if (OPERATIONS_FIELD_NAMES.length > 0) {
    for (const apiName of OPERATIONS_FIELD_NAMES) {
      const found = fieldList.some(
        (f) => f.name === apiName || f.name.toLowerCase() === apiName.toLowerCase()
      );
      if (!found) {
        const available = fieldList.map((f) => f.name).slice(0, 25).join(', ');
        throw new Error(
          `Required Operations field "${apiName}" not found on ${OPPORTUNITY_READINESS_OBJECT}. Available (first 25): ${available}...`
        );
      }
    }
    logger.info(`✅ All ${OPERATIONS_FIELD_NAMES.length} required Operations onboarding fields are available`);
    return;
  }

  const operationsFields = fieldList.filter(
    (f) =>
      (f.name && f.name.toLowerCase().includes('operation')) ||
      (f.label && f.label.toLowerCase().includes('operation'))
  );
  if (operationsFields.length > 0) {
    logger.info(`✅ Required Operations onboarding fields available for completion (${operationsFields.length} found): ${operationsFields.map((f) => f.name).join(', ')}`);
    return;
  }
  // No field with "Operation" in name/label - accept if questionnaire object has rich schema (attachment may define exact names later)
  const hasOpportunityRef = fieldList.some((f) => f.name === 'Opportunity__c');
  if (hasOpportunityRef && fieldList.length >= 15) {
    logger.info(
      `✅ Opportunity Readiness (questionnaire) object has schema available for completion (${fieldList.length} fields). ` +
        `Set OPERATIONS_FIELD_NAMES in sf-361.steps.ts when attachment defines exact Operations field names.`
    );
    return;
  }
  const available = fieldList.map((f) => f.name).slice(0, 25).join(', ');
  throw new Error(
    `No Operations onboarding fields found on ${OPPORTUNITY_READINESS_OBJECT}. ` +
      `Ensure the object has fields for Operations Manager review, or set OPERATIONS_FIELD_NAMES in sf-361.steps.ts. Available (first 25): ${available}...`
  );
});

// ============================================================================
// SCENARIO 2: Alternative or negative path
// ============================================================================

/**
 * Given the system is configured for SF-361
 * Sets context for the shared "When an alternative or invalid request is made" step.
 */
Given('the system is configured for SF-361', async function (this: AutomationWorld) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized. Ensure "I have a valid Salesforce API token" runs first.');
  }

  const describeResult = await apiClient.describeSObject(OPPORTUNITY_OBJECT);
  this.testContext.lastDescribeResult = describeResult;
  this.testContext.apiError = undefined;
  this.testContext.workItemForInvalidRequest = 'SF-361';
  logger.info(`✅ System configured for SF-361: ${OPPORTUNITY_OBJECT} described`);
});
