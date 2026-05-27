# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-662 - Functional Currency in Account should be limited
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-662 @rbt @medium
Feature: UI - SF-662 - Functional Currency in Account should be limited
  As MRD
  I want the Functional Currency field on the Account to be restricted to a used list of currencies
  So that only used currencies are selected and data consistency is maintained across reporting and integrations.

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-662 @SF-662-UI-001 @p1 @rbt
  Scenario: Restrict Functional Currency values to approved list
    Given the Functional Currency field exists on the Account object
    When a user views or edits the Functional Currency picklist
    Then the available values must be limited to:
    And no other currency values must be selectable
    And I take a screenshot as evidence

  @SF-662 @SF-662-UI-002 @p1 @rbt
  Scenario: Prevent selection of unused currencies
    Given a user is creating or editing an Account
    When the user attempts to select a Functional Currency value
    Then the system must only allow selection of USD, CAD, EUR, or GBP
    And the record must not allow any value outside of this approved list
    And I take a screenshot as evidence

