# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-758 - Other Account types - Lifecycle and Governance Controls
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-758 @rbt @medium
Feature: API - SF-758 - Other Account types - Lifecycle and Governance Controls
  API must support the behaviour described in the story (SF-758).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-758 @SF-758-API-001 @p1 @smoke @rbt
  Scenario: API - Account can be created directly as Prospect
    Given a user is creating a new Account
    When the user creates the Account
    Then the Account Status must default to “Prospect”

  @SF-758 @SF-758-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-758
    When an alternative or invalid request is made
    Then the API must respond appropriately
