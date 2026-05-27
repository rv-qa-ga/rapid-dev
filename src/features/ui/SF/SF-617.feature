# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-617 - Updates to Account Relationship (TPA Maps) object
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-617 @rbt @medium
Feature: UI - SF-617 - Updates to Account Relationship (TPA Maps) object
  As Data Steward
  I want the Account Relationship object and key fields updated to reflect TPA Maps and enforce valid TPA/TPA Group selections
  So that TPA mapping records are consistently named, simplified, and restricted to the correct Account types.

  Background:
    Given I am logged in as a "QA MRD User" user
    Given the custom object currently named Account Relationship is used to store relationships between Third Party Administrators (TPA) and TPA Groups
    And the object includes lookup fields Source Account and Related Account
    And the object currently includes Account Relationship Name, Master Id, and a Currency field
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-617 @SF-617-UI-001 @p1 @rbt
  Scenario: Rename object label and API name to TPA Maps
    Given the custom object currently has:
    When the object is updated
    Then the Label must be changed to “TPA Maps”
    And the API Name must be changed to TPA_Maps__c
    And all references in page layouts, related lists, reports, flows, validation rules, and integrations must be updated to reference the new API name
    And I take a screenshot as evidence

  @SF-617 @SF-617-UI-002 @p1 @rbt
  Scenario: Rename Source Account field label and API name
    Given the object contains a field:
    When the field is updated
    Then the Label must be changed to “TPA Account”
    And the API Name must be changed to TPA_Account__c
    And all references in automation, validation rules, reports, and integrations must be updated accordingly
    And I take a screenshot as evidence

  @SF-617 @SF-617-UI-003 @p1 @rbt
  Scenario: Rename Related Account field label and API name
    Given the object contains a field:
    When the field is updated
    Then the Label must be changed to “TPA Group Account”
    And the API Name must be changed to TPA_Group_Account__c
    And all references in automation, validation rules, reports, and integrations must be updated accordingly
    And I take a screenshot as evidence

  @SF-617 @SF-617-UI-004 @p1 @rbt
  Scenario: Hide Account Relationship Name field
    Given a user is logged in and has navigated to the Account relationship object of a Party record
    When a user is looking at the page layout
    Then the field: *Account Relationship Name field* must be hidden from the page layout
    And only a single unique identifier must remain (e.g., Master Id)-
    And the existing field with label = Master Id (API name =  tbd) is visible instead
    And I take a screenshot as evidence

  @SF-617 @SF-617-UI-005 @p1 @rbt
  Scenario: Hide Currency field from users
    Given the object includes a Currency field
    When page layouts are updated
    Then the Currency field must be hidden from all page layouts
    And it must not be visible to users in the record detail UI
    And I take a screenshot as evidence

  @SF-617 @SF-617-UI-006 @p1 @rbt
  Scenario: Restrict “TPA Account” lookup to Third Party Administrator Accounts only
    Given a user is creating or editing a TPA Maps record
    When the user searches for an Account in the TPA Account lookup
    Then only Accounts with Type = “Third Party Administrator” must be selectable
    And Accounts with any other Type must not be returned or selectable
    And I take a screenshot as evidence

  @SF-617 @SF-617-UI-007 @p1 @rbt
  Scenario: Restrict “TPA Group Account” lookup to TPA Group Accounts only
    Given a user is creating or editing a TPA Maps record
    When the user searches for an Account in the TPA Group Account lookup
    Then only Accounts with Type = “TPA Group” must be selectable
    And Accounts with any other Type must not be returned or selectable
    And I take a screenshot as evidence

