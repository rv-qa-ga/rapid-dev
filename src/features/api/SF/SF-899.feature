# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-899 - Opportunity type values
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-899 @rbt @medium
Feature: API - SF-899 - Opportunity type values
  API must support the behaviour described in the story (SF-899).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-899 @SF-899-API-001 @p1 @smoke @rbt
  Scenario: API - Opportunity Type must be selected when creating a new Opportunity
    Given an MRD creates a new Opportunity
    When the Opportunity creation screen is displayed
    Then the Opportunity Type field must be visible

  @SF-899 @SF-899-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-899
    When an alternative or invalid request is made
    Then the API must respond appropriately
