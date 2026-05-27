# ══════════════════════════════════════════════════════════════════════════════
# CLM Go-Live — Phase E: Bordereaux load test (written + claim)
# Validates no adverse impact on Member/Product lifecycle and bordereaux processing
# Related PP features: PP-11, PP-84 — extend when INT bordereaux paths are confirmed
# ══════════════════════════════════════════════════════════════════════════════

@clm-go-live @bordereaux @member-lifecycle @product-lifecycle @int
Feature: CLM Go-Live - Test bordereaux file load impact
  As a CLM and bordereaux QA engineer
  I want to load controlled written and claim bordereaux test files
  So that go-live does not break processing for new or existing members

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce

  @CLM-GL-INT-300 @p0 @manual @written
  Scenario: Bordereaux - written file processes without blocking Member lifecycle
    Given a programme-approved written bordereaux test file path is configured
    And a test Member exists in Salesforce INT with known Party MasterId
    And baseline Member and Product lifecycle state is captured
    When I submit the written bordereaux test file for ingestion
    Then bordereaux processing should complete without fatal errors
    And the Member Account_Status__c and related Product Maps should remain valid per business rules
    And Dynamics Party for the member should remain consistent with Salesforce mastering

  @CLM-GL-INT-301 @p0 @manual @claim
  Scenario: Bordereaux - claim file processes without blocking Member lifecycle
    Given a programme-approved claim bordereaux test file path is configured
    And the same or linked test Member exists from the written file scenario
    When I submit the claim bordereaux test file for ingestion
    Then claim processing should complete without fatal errors
    And claim transactions should not orphan Product Map or Member Product program links

  @CLM-GL-INT-302 @p0 @manual @existing-member
  Scenario: Bordereaux - existing member control sample shows no unexpected drift
    Given an existing production-like member sample is identified in INT with pre-load snapshot
    When I submit written and claim test files scoped to that member
    Then only expected delta fields should change
    And core Member and Product lifecycle attributes should match pre-load snapshot within tolerance

  @CLM-GL-INT-303 @p1 @manual @new-member
  Scenario: Bordereaux - new member path from Salesforce create through file ingest
    Given I have a test Account name "CLM-GL Bordereaux New Member"
    When I create an Account in Salesforce with:
      | Name              | CLM-GL Bordereaux New Member |
      | Type              | Member                       |
      | Account_Status__c | Prospect                     |
    And I update the Account Status to "Active" to trigger integration
    And I wait 10 seconds for MuleSoft processing
    And I load the written bordereaux test file for the new member keys
    Then bordereaux processing should associate transactions to the new member
    And Product lifecycle records required for the programme should be creatable post-ingest

  @CLM-GL-INT-304 @p1 @negative @manual
  Scenario: Bordereaux - invalid file does not corrupt prior successful member state
    Given a member with successful prior bordereaux ingest in INT
    When I submit a deliberately invalid bordereaux test file for that member
    Then the ingest should fail with clear errors
    And prior Member and Product lifecycle state should remain unchanged
