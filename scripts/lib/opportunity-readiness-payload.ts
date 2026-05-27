/**
 * Shared Opportunity_Readiness__c populate payload for contracting / ManCo test data scripts.
 *
 * Geographies + CurrencyIsoCode are aligned to Member_Operating_Region__c so approval entry
 * criteria (often matching Account / questionnaire region) are satisfied — e.g. UK + USA geography
 * commonly yields NO_APPLICABLE_PROCESS on submit.
 */

export type ReadinessPayloadOptions = {
  /** Sets Opportunity_Summary_Fields_Completed_By__c (text); use MRD JWT username when available. */
  summaryCompletedByUsername?: string;
};

function geographyForMemberOperatingRegion(mor: string): string {
  const r = mor.trim().toUpperCase();
  if (r === 'UK' || r === 'UK AND EU') return 'United Kingdom';
  if (r === 'EU') return 'Germany';
  if (r === 'CA') return 'Canada';
  return 'United States of America';
}

function currencyIsoForMemberOperatingRegion(mor: string): string {
  const r = mor.trim().toUpperCase();
  if (r === 'UK' || r === 'UK AND EU') return 'GBP';
  if (r === 'EU') return 'EUR';
  if (r === 'CA') return 'CAD';
  return 'USD';
}

export function getRequiredReadinessPayload(
  accountId: string | undefined,
  memberOperatingRegion: string,
  options?: ReadinessPayloadOptions
): Record<string, unknown> {
  const effectiveDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  const geo = geographyForMemberOperatingRegion(memberOperatingRegion);
  const currency = currencyIsoForMemberOperatingRegion(memberOperatingRegion);
  return {
    ...(accountId && { Name_of_Prospect__c: accountId }),
    SummaryOfDeal__c: 'E2E contracting test data – summary.',
    ProposedEffectiveDate__c: effectiveDate,
    BusinessPlanProvided__c: 'Yes',
    BusinessPlanDetails__c: 'E2E contracting test business plan details.',
    BriefHistoryOfMGA__c: 'E2E contracting test brief history.',
    KeyPeopleInvolved__c: 'E2E contracting test key people.',
    HistoricGWPGLR__c: 'E2E contracting historic GWP and GLR.',
    ProposedMemberComission__c: 10,
    PreviousCapacity__c: 'E2E contracting previous capacity.',
    ReasonForChange__c: 'E2E contracting reason for change.',
    ProductDescription__c: 'E2E contracting product description.',
    Limits__c: 200000,
    PortfolioMix__c: 'E2E contracting portfolio mix.',
    EstYear1GWP__c: 100000,
    EstYear2GWP__c: 100000,
    ReinsuranceRestrictions__c: 'No',
    ClaimsSolution__c: 'In-House',
    Geographies__c: geo,
    DistributionClash__c: 'No',
    TechnicalResult__c: 'E2E contracting technical result.',
    ReasonForSupport__c: 'E2E contracting reason for support.',
    CurrencyIsoCode: currency,
    Opportunity_Summary_Fields_Completed_Dat__c: today,
    Member_Operating_Region__c: memberOperatingRegion,
    ...(options?.summaryCompletedByUsername?.trim()
      ? { Opportunity_Summary_Fields_Completed_By__c: options.summaryCompletedByUsername.trim() }
      : {}),
    ...(memberOperatingRegion === 'US' || memberOperatingRegion === 'CA'
      ? { State_Provinces__c: memberOperatingRegion === 'US' ? 'New York' : 'Ontario' }
      : {}),
  };
}
