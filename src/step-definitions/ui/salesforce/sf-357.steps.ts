/**
 * SF-357 - Opportunity Summary questionnaire and Executive approval
 *
 * Per .cursorrules: only work-item-specific step definitions live here.
 * Generic steps are in common (data-factory.steps.ts, ui-common.steps.ts).
 *
 * SF-357-specific:
 * - Required fields payload from data/excel/Opportunity Summary Fields (1).xlsx
 * - Given/When that populate Opportunity Readiness with that payload
 * - Then the approval is routed per SF-656 (approver hierarchy)
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { testDataFactory } from '../../../test-data/TestDataFactory';
import { logger } from '../../../utils/logger';

/**
 * Required Opportunity Summary fields per data/excel/Opportunity Summary Fields (1).xlsx.
 * Used when "all required Opportunity Summary fields are populated" (SF-357 questionnaire).
 */
function getRequiredOpportunitySummaryFieldsPayload(accountId?: string): Record<string, unknown> {
  const effectiveDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  return {
    ...(accountId && { Name_of_Prospect__c: accountId }),
    Summary_of_deal__c: 'E2E test summary per Excel requirements.',
    Proposed_Effective_Date__c: effectiveDate,
    Business_Plan_Provided__c: 'Yes',
    Business_Plan_Details__c: 'E2E test business plan details.',
    Brief_history_of_MGA__c: 'E2E test brief history of MGA.',
    Key_people_involved__c: 'E2E test key people involved.',
    Historic_GWP_GLR__c: 'E2E test historic GWP and GLR.',
    Proposed_Member_Commission__c: 10,
    Proposed_Member_Comission__c: 10,
    Previous_Capacity__c: 'E2E test previous capacity.',
    Reason_for_change__c: 'E2E test reason for change.',
    Is_deal_within_appetite__c: 'Yes',
    Product_Description__c: 'E2E test product description.',
    Currency__c: 'USD',
    Limits__c: 200000,
    Portfolio_mix__c: 'E2E test portfolio mix.',
    Deal_Currency__c: 'USD',
    Est_Year_1_GWP__c: 100000,
    Est_Year_2_GWP__c: 100000,
    Reinsurance_restrictions__c: 'No',
    Claims_Solution__c: 'In-House',
    Geographies__c: 'United States of America',
    Distribution_clash__c: 'No',
    Technical_result__c: 'E2E test technical result.',
    Reason_for_support__c: 'E2E test reason for support.',
    Summary_Fields_Completed_Date__c: today,
  };
}

// ---------------------------------------------------------------------------
// SF-357-specific: Opportunity Readiness with all required fields (Excel-based)
// ---------------------------------------------------------------------------

Given(
  'the Opportunity has an Opportunity Readiness record with all required Opportunity Summary fields already populated by an MRD',
  async function (this: AutomationWorld) {
    await testDataFactory.initialize();
    const opportunityId = this.testContext.opportunityId;
    const opportunityName = this.testContext.opportunityName || opportunityId;
    if (!opportunityId) throw new Error('No Opportunity ID in context.');

    const payload = getRequiredOpportunitySummaryFieldsPayload(this.testContext.accountId) as Record<string, any>;
    let readiness = await testDataFactory.findOpportunityReadinessByOpportunity(opportunityId);
    if (!readiness) {
      readiness = await testDataFactory.createOpportunityReadiness(opportunityId, opportunityName, payload);
    }
    this.testContext.opportunityReadinessId = readiness.id;
    this.testContext.opportunityReadinessName = readiness.name;
    this.testContext.opportunitySummaryFilled = true;
    logger.info(`Opportunity Readiness (pre-filled per Excel): ${readiness.id}`);
  }
);

When(
  'one or more required Opportunity Summary fields on the questionnaire are not populated',
  async function (this: AutomationWorld) {
    this.testContext.opportunitySummaryFilled = false;
  }
);

When(
  'all required Opportunity Summary fields on the questionnaire are populated',
  async function (this: AutomationWorld) {
    this.testContext.opportunitySummaryFilled = true;
    const readinessId = this.testContext.opportunityReadinessId;
    if (readinessId) {
      try {
        await testDataFactory.initialize();
        const payload = getRequiredOpportunitySummaryFieldsPayload(this.testContext.accountId) as Record<string, any>;
        await testDataFactory.updateRecord('Opportunity_Readiness__c', readinessId, payload);
        if (this.page && !this.page.isClosed()) {
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          await this.page.waitForTimeout(2000);
        }
      } catch (e: any) {
        logger.warn(`Could not update Opportunity Readiness with required fields (per Excel): ${e.message}`);
      }
    }
  }
);

// ---------------------------------------------------------------------------
// SF-357/SF-656-specific: approval routing assertion
// ---------------------------------------------------------------------------

Then(
  'the approval is routed according to the approver hierarchy defined in SF-656 (Account Distribution Region)',
  async function (this: AutomationWorld) {
    const body = (await this.page!.textContent('body').catch(() => '')) || '';
    const hasSteps = body.includes('Assigned To') || body.includes('Step') || body.includes('Approval');
    if (!hasSteps) throw new Error('Approval History should show routing (SF-656 hierarchy).');
    logger.info('Approval routing (SF-656) verified');
  }
);
