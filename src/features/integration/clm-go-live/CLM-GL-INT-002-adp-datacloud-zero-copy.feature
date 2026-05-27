# ══════════════════════════════════════════════════════════════════════════════
# CLM Go-Live — Phase C: ADP data product + Data Cloud zero-copy federation
# Product: MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 → Salesforce CRM (read federation)
# No lower ADP env — use read-only production ADP only with programme approval
# ══════════════════════════════════════════════════════════════════════════════

@clm-go-live @adp @data-cloud @federation @int
Feature: CLM Go-Live - ADP MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 and Data Cloud zero-copy
  As a data and CRM QA engineer
  I want the ADP data product federated into Salesforce CRM without breaking mastering
  So that analytics and CRM users see consistent member written premium vs plan data at go-live

  @CLM-GL-INT-100 @p0 @manual @snowflake
  Scenario: ADP - MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 is queryable in Snowflake ADP
    Given read-only Snowflake ADP credentials are approved for go-live validation
    When I query ADP view or table MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 for programme sample members
    Then the result set should include expected columns documented by the data product owner
    And row counts for sample members should be greater than zero

  @CLM-GL-INT-101 @p0 @manual @data-cloud
  Scenario: Data Cloud - zero-copy federated dataset is visible in Salesforce INT
    Given Salesforce Data Cloud INT is configured for zero-copy federation
    When I open the federated data stream or data lake object for MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2
    Then the connector status should be healthy
    And sample member keys from ADP should be queryable in Data Cloud

  @CLM-GL-INT-102 @p0 @manual @crm-federation
  Scenario: CRM - federated premium vs plan fields visible on Member without blocking edits
    Given a programme-approved test Member exists in Salesforce INT with known ADP keys
    When I open the Member record in Salesforce CRM
    Then federated MEMBER_WRITTEN_PREMIUM_VS_PLAN_V2 attributes should display values consistent with ADP sample
    And I should still be able to update Salesforce-mastered fields on the Member per SF-736 rules

  @CLM-GL-INT-103 @p1 @manual @fivetran
  Scenario: FiveTran - Dynamics to ADP sync jobs remain healthy after SF migration window
    Given FiveTran connector monitoring access is available
    When I review sync history for in-scope Dynamics entities since migration cutover
    Then there should be no unresolved failed syncs for programme-critical entities
    And incremental row counts should be within expected bounds

  @CLM-GL-INT-104 @p1 @negative @manual
  Scenario: Federation - CRM edit of mastered field does not corrupt federated read-only slice
    Given a test Member with federated premium vs plan metrics displayed
    When I update only Salesforce-mastered attributes on the Member
    Then federated metrics should remain consistent with ADP on refresh
    And no duplicate or stale federation snapshot should appear in CRM
