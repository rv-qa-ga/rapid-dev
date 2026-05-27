# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-620 - Add Dataverse_Id__c field on the Member Legal Entity Relationship object
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-620 @rbt @medium
Feature: UI - SF-620 - Add Dataverse_Id__c field on the Member Legal Entity Relationship object
  As Integration Analyst
  I want a hidden field on the Member Legal Entity Relationship object to store the Dataverse record ID returned by Dataverse after Salesforce creates the relationship.
  So that downstream integrations can reliably match relationship records across systems without user intervention

  Background:
    Given I am logged in as a "QA MRD User" user
    Given the custom object Member_Legal_Entity_Relationship__c exists
    And it represents relationships between Members, Legal Entities, and Groups
    And relationship records are synchronised from Salesforce to Dataverse via MuleSoft
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-620 @SF-620-UI-001 @p1 @rbt
  Scenario: Create hidden Dataverse ID field on Member Legal Entity Relationship
    Given the Member_Legal_Entity_Relationship__c object
    When the field Dataverse_ID__c is created
    Then Source_Relationship_Id__c must be deleted from the object
    And the Dataverse_ID__c field must be of type Text(36)
    And it must be labelled “Dataverse ID”
    And it must be excluded from all page layouts
    And it must be hidden from all standard user profiles
    And it must be visible and writable via API only to the MuleSoft integration user
    And I take a screenshot as evidence

  @SF-620 @SF-620-UI-002 @p1 @rbt
  Scenario: New relationship initially has no Dataverse ID
    Given a user creates a new Member_Legal_Entity_Relationship__c record in Salesforce
    When the record is saved
    Then Dataverse_ID__c must be blank
    And it must remain blank until a successful response is received from Dataverse via the MuleSoft integration
    And I take a screenshot as evidence

  @SF-620 @SF-620-UI-003 @p1 @rbt
  Scenario: Dataverse ID is populated only by MuleSoft integration
    Given a Member_Legal_Entity_Relationship__c record exists without a Dataverse ID
    When the MuleSoft integration sends the relationship to Dataverse
    And Dataverse returns the relationship record ID
    Then the MuleSoft integration user populates Dataverse_ID__c via API
    And the update succeeds without user interaction
    And I take a screenshot as evidence

  @SF-620 @SF-620-UI-004 @p1 @rbt
  Scenario: Prevent manual or non-integration updates to Dataverse ID
    Given a user or system other than the MuleSoft integration user
    When the record is saved via the UI or a non-integration API
    Then the save must be blocked
    And the following error message must be displayed or returned:
    And I take a screenshot as evidence

  @SF-620 @SF-620-UI-005 @p1 @rbt
  Scenario: Dataverse ID is immutable once set
    Given Dataverse_ID__c is already populated on a Member_Legal_Entity_Relationship__c record
    When any user or system (including the MuleSoft integration) attempts to change or clear the value
    Then the save must be blocked
    And the same system-managed error message must be returned
    And I take a screenshot as evidence

