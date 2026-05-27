# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-662 - Functional Currency in Account should be limited
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-662 @rbt @medium
Feature: API - SF-662 - Functional Currency in Account should be limited
  API must support the behaviour described in the story (SF-662).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-662 @SF-662-API-001 @p1 @smoke @rbt
  Scenario: API - Restrict Functional Currency values to approved list
    Given the Functional Currency field exists on the Account object
    When a user views or edits the Functional Currency picklist
    Then the available values must be limited to:

  @SF-662 @SF-662-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-662
    When an alternative or invalid request is made
    Then the API must respond appropriately
