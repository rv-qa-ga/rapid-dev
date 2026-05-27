# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-788 - Account Relationship (TPA Maps) Platform Events for Dataverse
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
#
# Platform Events are published when Account Relationship (TPA Maps) records are
# eligible (create/update via UI or API). Related Accounts must have Dataverse_Id__c.
# Platform Event verification is covered by API tests. UI tests verify the user-facing
# flows that trigger those events: create TPA Map, edit Valid From/To.
#
# Object: TPA_Maps__c or Account_Relationship__c (SF788_USE_ACCOUNT_RELATIONSHIP_OBJECT=true)
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-788 @rbt @medium @tpa-maps
Feature: UI - SF-788 - Account Relationship (TPA Maps) Platform Events and Dataverse eligibility
  As a user creating or editing Account Relationship (TPA Maps) records
  I need the UI to support create and update flows that trigger Platform Events when eligible
  So that downstream Dataverse synchronisation works as intended

  Background:
    Given I have a valid Salesforce API token
    And I am logged in as a "QA MRD User" user

  # ─── RBT - UI SCENARIOS (mirrors API coverage; Platform Event verification in API) ───

  @SF-788 @SF-788-UI-001 @p1 @smoke @rbt @field-exists
  Scenario: Account Relationship (TPA Maps) object is accessible for create and edit
    Given the Account Relationship (TPA Maps) object
    When a user navigates to create or view an Account Relationship (TPA Maps) record
    Then the Valid From field must be present
    And the TPA Group Account and TPA Account lookup fields must be present
    And I take a screenshot as evidence

  @SF-788 @SF-788-UI-002 @p1 @rbt @create-eligible
  Scenario: User can create TPA Map via UI when TPA and TPA Group have Dataverse_ID__c
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When the user creates a new Account Relationship (TPA Maps) record via the UI
    And the user selects the TPA Group Account and TPA Account
    And the user sets Valid From to today or earlier
    And the user saves the record
    Then the record must be saved successfully
    And the record must link the TPA Group and TPA accounts
    And I take a screenshot as evidence

  @SF-788 @SF-788-UI-003 @p1 @rbt @create-future-dated
  Scenario: User can create TPA Map with future Valid From (inactive until date reached)
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    When the user creates a new Account Relationship (TPA Maps) record via the UI
    And the user sets Valid From to a date in the future
    And the user saves the record
    Then the record must be saved successfully
    And Is_Active__c must be false until Valid From is reached
    And I take a screenshot as evidence

  @SF-788 @SF-788-UI-004 @p1 @rbt @edit-dates
  Scenario: User can edit TPA Map Valid From and Valid To via UI
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When the user navigates to the Account Relationship (TPA Maps) record
    And the user updates Valid To to a past date
    And the user saves the record
    Then the record must be saved successfully
    And Is_Active__c must be recalculated to false
    And I take a screenshot as evidence

  @SF-788 @SF-788-UI-005 @p1 @rbt @required-fields
  Scenario: TPA Group Account, TPA Account and Valid From are required when creating TPA Map
    Given the Account Relationship (TPA Maps) object
    When the user attempts to create an Account Relationship (TPA Maps) record
    And the user leaves TPA Group Account or TPA Account or Valid From blank
    And the user attempts to save
    Then the save must be prevented
    And a validation message must indicate the required fields
    And I take a screenshot as evidence

  @SF-788 @SF-788-UI-006 @p2 @rbt @related-list
  Scenario: User can access TPA Maps related list from TPA or TPA Group record
    Given SF-788 test accounts exist: TPA and TPA Group with Dataverse_ID__c on both
    And a new Account Relationship (TPA Maps) record is created via API linking the TPA Group and the TPA
    When the user navigates to the TPA Group account record for SF-788
    Then the Account Relationship (TPA Maps) related list must be visible
    And the existing relationship must be displayed
    And I take a screenshot as evidence
