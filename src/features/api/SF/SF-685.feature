# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-685 - Approved Contract MRD Activities
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-685 @rbt @medium
Feature: API - SF-685 - Approved Contract MRD Activities
  API must support the behaviour described in the story (SF-685).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-685 @SF-685-API-001 @p1 @smoke @rbt
  Scenario: API - MRD is notified when the contract is approved
    Given the contract approval outcome is Approved
    When the approval decision is recorded
    Then the system must notify the MRD that the contract has been approved

  @SF-685 @SF-685-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-685
    When an alternative or invalid request is made
    Then the API must respond appropriately
