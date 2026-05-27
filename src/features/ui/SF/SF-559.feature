# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-559 - Add field Dataverse_ID_c field to contact object
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-559 @rbt @medium
Feature: UI - SF-559 - Add field Dataverse_ID_c field to contact object
  As integration analyst
  I want a hidden field on Contact to store the Dataverse record ID returned by Dataverse after Salesforce creates/sends the Contact
  So that downstream integrations can reliably match records across systems without user intervention.

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-559 @SF-559-UI-001 @p1 @rbt
  Scenario: Create hidden Dataverse ID field on Contact
    Given the Contact object
    When the field "Dataverse_ID__c" is created
    Then it must be of type Text(36)
    And labeled "Dataverse ID"
    And excluded from all page layouts
    And visible and writable via API only to the MuleSoft integration user
    And I take a screenshot as evidence

  @SF-559 @SF-559-UI-002 @p1 @rbt
  Scenario: New Salesforce Contact initially has no Dataverse ID
    Given a user creates a new Contact in Salesforce
    When the record is saved
    Then Dataverse_ID__c must be blank
    And it must remain blank until a successful response is received from Dataverse via the MuleSoft integration.
    And I take a screenshot as evidence

  @SF-559 @SF-559-UI-003 @p1 @rbt
  Scenario: Dataverse ID is populated only by MuleSoft integration
    Given a Contact record exists in Salesforce without a Dataverse ID
    When the MuleSoft integration user sends the Contact to Dataverse and receives the Dataverse record ID
    Then the MuleSoft integration user populates Dataverse_ID__c via API
    And this update succeeds without user interaction.
    And I take a screenshot as evidence

  @SF-559 @SF-559-UI-004 @p1 @rbt
  Scenario: Prevent manual or non-integration updates to Dataverse ID
    Given a user or system other than the MuleSoft integration user attempts to create or update Dataverse_ID__c
    When the record is saved via the UI or non-integration API
    Then the save is blocked
    And the following error message is displayed or returned:
    And I take a screenshot as evidence

  @SF-559 @SF-559-UI-005 @p1 @rbt
  Scenario: Dataverse ID is immutable once set
    Given Dataverse_ID__c is already populated on a Contact
    When any user or system (including the MuleSoft integration) attempts to change or clear the value
    Then the save is blocked
    And the same system-managed error message is returned.
    And I take a screenshot as evidence

