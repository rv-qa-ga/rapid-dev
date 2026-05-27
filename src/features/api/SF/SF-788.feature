# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-788 - Account Relationship (TPA Maps) Platform Events for Dataverse
#
# Story summary:
# - Platform Events when Account Relationship (TPA Maps) is eligible for downstream sync.
# - Related Accounts must have Dataverse_ID__c populated (API name; story text Dataverse_Id__c).
# - Valid From / Valid To drive Active vs Inactive (Is_Active__c); date-driven changes are Updates.
# - No events for ineligible relationships or failed saves.
#
# Model: TPA Account (Third Party Administrator) + TPA Group (Parent = TPA).
# Object: TPA_Maps__c (default) or Account_Relationship__c when SF788_USE_ACCOUNT_RELATIONSHIP_OBJECT=true.
#
# Streaming: handshake can be slow — SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS (see framework docs).
# Channel: /event/Account_Relationship_Event__e (override with SF788_PLATFORM_EVENT_CHANNEL if needed).
#
# JIRA scenario mapping:
#   1. Publish Create when new relationship, all Accounts in Dataverse, Is_Active__c=true  → API-003
#   2. Do not Create when Account A or B missing Dataverse_ID__c                           → API-004, API-005
#   3. Publish Update for any update to eligible relationship                              → API-007
#   4. Do not Update when relationship not eligible                                       → API-008
#   5. MuleSoft uses Is_Active__c (integration scope)                                      → API-014 @manual
#   6. Do not publish if save fails                                                        → API-010
#   7. Event includes traceability metadata (Record ID, Event Identifier, timestamp)       → API-009
#
# MuleSoft / Dataverse runtime behaviour (“set Active when Is_Active__c true”) is integration scope — not asserted here.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-788 @rbt @medium
Feature: API - SF-788 - Account Relationship (TPA Maps) Platform Events and Dataverse eligibility
  As an integrator
  I need TPA Map platform events to match Dataverse eligibility rules
  So that Create/Update actions and Is_Active__c align with the user story

  Background:
    Given I have a valid Salesforce API token

  # ─── RBT / API (no Streaming) ───────────────────────────────────────────

  @SF-788 @SF-788-API-001 @p1 @smoke @rbt
  Scenario: API - Describe Account Relationship (TPA Maps) and query eligible records (smoke)
    Given the system is configured for SF-788
    When Account Relationship (TPA Maps) records are eligible for downstream synchronisation with Dataverse
    Then the API must return success or the expected outcome

  @SF-788 @SF-788-API-002 @p1 @rbt
  Scenario: API - Create TPA, TPA Group with Dataverse_ID__c on both, then Account Relationship (TPA Map)
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    Then the TPA Map should link the TPA Group and TPA accounts
    And both TPA-related accounts should still have Dataverse_ID__c populated

  @SF-788 @SF-788-API-012 @p2 @rbt @valid-from
  Scenario: API - TPA Map record includes Valid From date for downstream sync
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When I retrieve the created Account Relationship (TPA Maps) record via API
    Then the record should have Valid_From__c populated

  @SF-788 @SF-788-API-013 @p2 @rbt @multiple-tpas
  Scenario: API - TPA Group can be linked to multiple TPA accounts via separate relationships
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    And a second TPA account exists in Salesforce with Dataverse_ID__c populated for SF-788
    And an Account Relationship (TPA Maps) record is created via API linking the same TPA Group and the second TPA
    When the relationship record is saved successfully
    Then the API must return success or the expected outcome

  # ─── Platform Events (Streaming API) — mirrors JIRA scenarios ─────────────

  @SF-788 @SF-788-API-003 @p1 @platform-events @smoke @rbt
  Scenario: API - Publish Create event when new TPA Map is saved and all related Accounts exist in Dataverse
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And Salesforce does not publish Platform Events for ineligible relationship records
    And each relationship Platform Event includes the Record ID and Event Identifier
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    And the relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive an Account Relationship (TPA Maps) Platform Event within 180 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Event Identifier
    And the event includes Is_Active__c
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-004 @p1 @platform-events @rbt
  Scenario: API - Do not publish Create when Related Account (TPA) is missing Dataverse_ID__c
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And SF-788 test accounts exist: TPA without Dataverse_ID__c and TPA Group with Dataverse_ID__c
    When a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    And the relationship record is saved successfully
    Then no Account Relationship (TPA Maps) Platform Event is received for the SF-788 relationship within 60 seconds
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-005 @p1 @platform-events @rbt
  Scenario: API - Do not publish Create when Source Account (TPA Group) is missing Dataverse_ID__c
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And SF-788 test accounts exist: TPA with Dataverse_ID__c and TPA Group without Dataverse_ID__c
    When a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    And the relationship record is saved successfully
    Then no Account Relationship (TPA Maps) Platform Event is received for the SF-788 relationship within 60 seconds
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-006 @p2 @platform-events @rbt @inactive-window
  Scenario: API - Do not publish Create when relationship is inactive per Valid To in the past
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When a new Account Relationship (TPA Maps) record is created via API with inactive date window for SF-788
    And the relationship record is saved successfully
    Then the SF-788 TPA Map Is_Active__c should be false
    And no Account Relationship (TPA Maps) Platform Event is received for the SF-788 relationship within 60 seconds
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-007 @p2 @platform-events @rbt
  Scenario: API - Publish Update event when eligible TPA Map end date (Valid_To__c) is updated
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And each relationship Platform Event includes the Record ID and Event Identifier
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When the same SF-788 TPA Map end date (Valid_To__c) is updated for a benign change
    And the relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive an Account Relationship (TPA Maps) Platform Event within 180 seconds with Identifier__c = "update"
    And the event action is "Update"
    And the event includes the Record ID
    And the event includes the Event Identifier
    And the event includes Is_Active__c
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-007b @p2 @platform-events @rbt
  Scenario: API - Publish Update event when eligible TPA Map start date (Valid_From__c) is updated
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And each relationship Platform Event includes the Record ID and Event Identifier
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When the same SF-788 TPA Map start date (Valid_From__c) is updated for a benign change
    And the relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive an Account Relationship (TPA Maps) Platform Event within 180 seconds with Identifier__c = "update"
    And the event action is "Update"
    And the event includes the Record ID
    And the event includes the Event Identifier
    And the event includes Is_Active__c
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-008 @p2 @platform-events @rbt
  Scenario: API - Do not publish Update when relationship is not eligible (related Account loses Dataverse_ID__c)
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When Dataverse_ID__c is cleared on the SF-788 TPA Group Account via API
    And the same SF-788 TPA Map end date (Valid_To__c) is updated for a benign change
    And the relationship record is saved successfully
    Then no Account Relationship (TPA Maps) Platform Event is received for the SF-788 relationship within 60 seconds
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-009 @p2 @platform-events @rbt
  Scenario: API - Published TPA Map Platform Event includes traceability metadata
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When the same SF-788 TPA Map end date (Valid_To__c) is updated for a benign change
    And the relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive an Account Relationship (TPA Maps) Platform Event within 180 seconds
    And the event RecordId__c should match the Account Relationship (TPA Maps) Id
    And the event should include a unique EventUuid
    And the event should include a CreatedDate timestamp
    And the event should include ReplayId
    And the event action is populated
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-010 @p2 @platform-events @rbt
  Scenario: API - Do not publish Account Relationship Platform Event when save operation fails
    Given Salesforce publishes Account Relationship (TPA Maps) Platform Events for downstream integration
    And I subscribe to Account Relationship (TPA Maps) Platform Events
    And SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When I attempt to create an Account Relationship (TPA Maps) via API with invalid payload expecting failure
    Then the last Salesforce API operation should have failed
    And no Account_Relationship_Event__e Platform Event is received within 60 seconds after the failure
    Given I unsubscribe from Account Relationship (TPA Maps) Platform Events

  @SF-788 @SF-788-API-011 @p2 @rbt
  Scenario: API - Eligible TPA Map record exposes Is_Active__c for downstream integration
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    And I retrieve the created Account Relationship (TPA Maps) record via API
    Then the retrieved TPA Map should expose Is_Active__c for integration payloads

  # JIRA Scenario 4 (MuleSoft): Is_Active__c drives Dataverse Active/Inactive — integration scope, manual or MuleSoft tests
  @SF-788 @SF-788-API-014 @p2 @integration @manual
  Scenario: API - MuleSoft uses Is_Active__c to set Dataverse record state (integration; not executable here)
    Given an Account Relationship (TPA Maps) Platform Event is published
    And the event includes Is_Active__c
    When the event is processed by downstream integration (MuleSoft)
    Then the corresponding relationship record in Dataverse is set to "Active" when Is_Active__c is true
    And the corresponding relationship record in Dataverse is set to "Inactive" when Is_Active__c is false
