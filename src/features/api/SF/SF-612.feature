# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-612 - Publish Member Legal Entity Relationship Platform Events for Dataverse
#
# Platform Events must be published when Member Legal Entity Relationship records are eligible
# for downstream synchronisation with Dataverse.
#
# Related Accounts (via Member__c, Legal_Entity__c, optionally Group__c) must have
# Dataverse_Id__c populated before a relationship record can be sent downstream.
#
# The relationship does not have a status field. Start and End dates determine Active/Inactive;
# Is_Active__c is derived (SF-614). Changes to Is_Active__c follow Update event behaviour.
#
# Dataverse cannot create a relationship in Inactive state. Create event only when Is_Active__c = true.
#
# Streaming timing: CometD handshake can be slow; override if needed:
#   SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS=180000
# Channel override: SF612_MLER_PLATFORM_EVENT_CHANNEL=/event/Your_MLER_Event__e
#
# Expected payload: Record_Id__c, Identifier__c, Is_Active__c, CreatedDate, etc.
# Known bug SF-1024: Is_Active__c not published on MLER Platform Event. Do not relax assertions.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-612 @rbt @medium
Feature: API - SF-612 - Member Legal Entity Relationship Platform Events and Dataverse eligibility
  As an integrator
  I need MLER platform events to match Dataverse eligibility rules
  So that Create/Update actions and Is_Active__c align with the user story

  Background:
    Given I have a valid Salesforce API token

  # ─── RBT / API (no Streaming) ───────────────────────────────────────────

  @SF-612 @SF-612-API-001 @p1 @smoke @rbt
  Scenario: API - Describe MLER and query records eligible for Dataverse (smoke)
    Given the system is configured for SF-612
    When Member Legal Entity Relationship records are eligible for downstream synchronisation with Dataverse
    Then the API must return success or the expected outcome

  @SF-612 @SF-612-API-002 @p1 @rbt
  Scenario: API - Create Member (Onboarding) and Legal Entity (Active) with Dataverse_ID__c, then MLER
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    Then the MLER should link the Member and Legal Entity accounts
    And both related accounts should still have Dataverse_ID__c populated

  @SF-612 @SF-612-API-003 @p2 @rbt @TEST
  Scenario: API - After MLER insert, relationship record should expose Dataverse sync fields
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    Then I query the SF-612 Member Legal Entity Relationship record
    And the API must return success or the expected outcome

  # ─── Platform Events (Streaming API) — mirrors JIRA scenarios ─────────────

  @SF-612 @SF-612-API-004 @p1 @platform-events @smoke @rbt
  Scenario: API - Publish Create event when new MLER is saved, accounts in Dataverse, relationship active
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And Salesforce does not publish Platform Events for ineligible relationship records
    And each relationship Platform Event includes the Record ID and Event Identifier
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Relationship Platform Event within 120 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Event Identifier
    And the event includes Is_Active__c
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-005 @p1 @platform-events @rbt
  Scenario: API - Do not publish Create when relationship is not yet active (future Start_Date)
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And Salesforce does not publish Platform Events for ineligible relationship records
    And each relationship Platform Event includes the Record ID and Event Identifier
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612 with Start_Date 90 days in the future
    And the SF-612 relationship record is saved successfully
    Then the SF-612 MLER Is_Active__c should be false
    And no Member Legal Entity Relationship Platform Event is received for the SF-612 relationship within 60 seconds
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-006 @p1 @platform-events @rbt
  Scenario: API - Publish Create when future-dated relationship becomes active (Start_Date moved to today)
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612 with Start_Date 90 days in the future
    And the SF-612 relationship record is saved successfully
    Then the SF-612 MLER Is_Active__c should be false
    And no Member Legal Entity Relationship Platform Event is received for the SF-612 relationship within 45 seconds
    And I update the SF-612 Member Legal Entity Relationship Start_Date to today
    And the SF-612 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Relationship Platform Event within 120 seconds with Identifier__c = "create"
    And the event includes Is_Active__c
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-007 @p1 @platform-events @rbt
  Scenario: API - Do not publish Create when Member Account (Account A) is missing Dataverse_ID__c
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Prospect and Legal Entity Active but Member Account has no Dataverse_ID__c
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    Then no Member Legal Entity Relationship Platform Event is received for the SF-612 relationship within 60 seconds
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-007b @p1 @platform-events @rbt
  Scenario: API - Do not publish Create when Legal Entity Account (Account B) is missing Dataverse_ID__c
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active but Legal Entity has no Dataverse_ID__c
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    Then no Member Legal Entity Relationship Platform Event is received for the SF-612 relationship within 60 seconds
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-008 @p2 @platform-events @rbt
  Scenario: API - Publish Update event when eligible MLER is updated
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And each relationship Platform Event includes the Record ID and Event Identifier
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    And I update the SF-612 Member Legal Entity Relationship Start_Date for a benign change
    And the SF-612 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Relationship Platform Event within 120 seconds with Identifier__c = "update"
    And the event includes the Record ID
    And the event includes Is_Active__c
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-009 @p2 @platform-events @rbt
  Scenario: API - Publish Update when active relationship becomes inactive (End_Date)
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    And I update the SF-612 Member Legal Entity Relationship End_Date to yesterday
    And the SF-612 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Relationship Platform Event within 120 seconds with Identifier__c = "update"
    And the event includes Is_Active__c
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-009b @p2 @platform-events @rbt
  Scenario: API - Do not publish Update when relationship is not eligible
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Prospect and Legal Entity Active but Member Account has no Dataverse_ID__c
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    And I update the SF-612 Member Legal Entity Relationship Start_Date for a benign change
    And the SF-612 relationship record is saved successfully
    Then no Member Legal Entity Relationship Platform Event is received for the SF-612 relationship within 60 seconds
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-010a @p2 @platform-events @rbt
  Scenario: API - Do not publish event if the relationship transaction fails
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I attempt to create a Member Legal Entity Relationship via API for SF-612 with invalid Member__c
    Then the SF-612 relationship create must have failed
    And no Member Legal Entity Relationship Platform Event is received within 60 seconds after failed transaction
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  @SF-612 @SF-612-API-010 @p2 @platform-events @rbt
  Scenario: API - Published MLER Platform Event includes traceability metadata
    Given Salesforce publishes Member Legal Entity Relationship Platform Events for downstream integration
    And I subscribe to Member Legal Entity Relationship Platform Events
    And SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    And the SF-612 relationship record is saved successfully
    And I update the SF-612 Member Legal Entity Relationship Start_Date for a benign change
    And the SF-612 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Relationship Platform Event within 120 seconds
    And the event RecordId__c should match the Member Legal Entity Relationship Id
    And the event should include a unique EventUuid
    And the event should include a CreatedDate timestamp
    And the event should include ReplayId
    And the event action is populated
    Given I unsubscribe from Member Legal Entity Relationship Platform Events

  # ─── API coverage for SF-614 (Is_Active__c) and SF-620 (Dataverse_ID__c) ──
  # Mirrors UI scenarios from SF-614-UI-002/004/005 and SF-620-UI-002

  @SF-612 @SF-612-API-011 @p1 @rbt @sf-614-coverage
  Scenario: API - Is_Active__c is true when Start_Date today and End_Date blank (SF-614 derivation)
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    Then the SF-612 MLER Is_Active__c should be true

  @SF-612 @SF-612-API-012 @p1 @rbt @sf-614-coverage
  Scenario: API - Is_Active__c is false when End_Date set to past (SF-614 derivation)
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    And I update the SF-612 Member Legal Entity Relationship End_Date to yesterday
    And the SF-612 relationship record is saved successfully
    Then the SF-612 MLER Is_Active__c should be false

  @SF-612 @SF-612-API-013 @p1 @rbt @sf-620-coverage
  Scenario: API - New MLER has blank Dataverse_ID__c until integration populates it (SF-620)
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When I create a Member Legal Entity Relationship via API for SF-612
    Then the SF-612 MLER Dataverse_ID__c should be blank
