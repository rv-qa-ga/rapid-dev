# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-967 - Contract Capacity Increase - IRD Sign Off
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-967 @rbt @medium
Feature: API - SF-967 - Contract Capacity Increase - IRD Sign Off
  API must support the behaviour described in the story (SF-967).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-967 @SF-967-API-001 @p1 @smoke @rbt
  Scenario: API - MRD should be asked if the Opportunity requires IRD Sign Off
    Given the Opportunity has a Sub Type = ‘Contract Capacity Increase’
    When the API is invoked for SF-967
    Then the API must return success or the expected outcome

  @SF-967 @SF-967-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-967
    When an alternative or invalid request is made
    Then the API must respond appropriately
