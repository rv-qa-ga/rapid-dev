# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-726 - Member and Non - Member MGA Account lifecycle and governance
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-726 @rbt @medium
Feature: API - SF-726 - Member and Non - Member MGA Account lifecycle and governance
  API must support the behaviour described in the story (SF-726).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726 @SF-726-API-001 @p1 @smoke @rbt
  Scenario: API - Accounts created via Lead Conversion must default to Prospect
    Given a Lead is being converted into an Account
    When the Account is created by Lead Conversion
    Then the Account Status must be set to "Prospect" by default

  @SF-726 @SF-726-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-726
    When an alternative or invalid request is made
    Then the API must respond appropriately
