# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-612 - Publish Member Legal Entity Relationship Platform Events for Dataverse
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
#
# Platform Events are published when MLER records are eligible (create/update via UI or API).
# Related Accounts must have Dataverse_Id__c populated. Create event only when Is_Active__c = true.
# Platform Event verification is covered by API tests (SF-612.feature API). UI tests verify
# the user-facing flows that trigger those events: create MLER, edit dates.
#
# Related: SF-614 (Is_Active__c derivation), SF-620 (Dataverse_ID__c field)
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-612 @rbt @medium @member-legal-entity-relationship
Feature: UI - SF-612 - Member Legal Entity Relationship Platform Events and Dataverse eligibility
  As a user creating or editing Member Legal Entity Relationships
  I need the UI to support create and update flows that trigger Platform Events when eligible
  So that downstream Dataverse synchronisation works as intended

  Background:
    Given I have a valid Salesforce API token
    And I am logged in as a "QA MRD User" user

  # ─── RBT - UI SCENARIOS (mirrors API coverage; Platform Event verification in API) ───

  @SF-612 @SF-612-UI-001 @p1 @smoke @rbt @field-exists
  Scenario: Member Legal Entity Relationship object is accessible for create and edit
    Given the Member_Legal_Entity_Relationship__c object
    When a user navigates to create or view a Member Legal Entity Relationship
    Then the Start Date field must be present
    And the Member and Legal Entity lookup fields must be present
    And I take a screenshot as evidence

  @SF-612 @SF-612-UI-002 @p1 @rbt @create-eligible
  Scenario: User can create MLER via UI when Member and Legal Entity have Dataverse_ID__c
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When the user creates a new Member Legal Entity Relationship via the UI
    And selects the Member and Legal Entity accounts
    And sets Start Date to today or earlier
    And saves the record
    Then the record must be saved successfully
    And the record must link the Member and Legal Entity
    And I take a screenshot as evidence

  @SF-612 @SF-612-UI-003 @p1 @rbt @create-future-dated
  Scenario: User can create MLER with future Start Date (inactive until date reached)
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    When the user creates a new Member Legal Entity Relationship via the UI
    And sets Start Date to a date in the future
    And saves the record
    Then the record must be saved successfully
    And Is_Active__c must be false until Start Date is reached
    And I take a screenshot as evidence

  @SF-612 @SF-612-UI-004 @p1 @rbt @edit-dates
  Scenario: User can edit MLER Start and End dates via UI
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    And I create a Member Legal Entity Relationship via API for SF-612
    When the user navigates to the Member Legal Entity Relationship record
    And updates the End Date to a past date
    And saves the record
    Then the record must be saved successfully
    And Is_Active__c must be recalculated to false
    And I take a screenshot as evidence

  @SF-612 @SF-612-UI-005 @p1 @rbt @required-fields
  Scenario: Member, Legal Entity and Start Date are required when creating MLER
    Given the Member_Legal_Entity_Relationship__c object
    When the user attempts to create a Member Legal Entity Relationship
    And leaves Member or Legal Entity or Start Date blank
    And attempts to save
    Then the save must be prevented
    And a validation message must indicate the required fields
    And I take a screenshot as evidence

  @SF-612 @SF-612-UI-006 @p1 @rbt @dataverse-id-hidden
  Scenario: Dataverse_ID__c is hidden from UI (SF-620)
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    And I create a Member Legal Entity Relationship via API for SF-612
    When a standard user views the Member Legal Entity Relationship record
    Then the Dataverse_ID__c field must not be visible on the page layout
    And I take a screenshot as evidence

  @SF-612 @SF-612-UI-007 @p2 @rbt @related-list
  Scenario: User can access MLER related list from Member or Legal Entity record
    Given SF-612 test accounts exist: Member Onboarding and Legal Entity Active with Dataverse_ID__c on both
    And I create a Member Legal Entity Relationship via API for SF-612
    When the user navigates to the Member account record for SF-612
    Then the Member Legal Entity Relationships related list must be visible
    And the existing relationship must be displayed
    And I take a screenshot as evidence
