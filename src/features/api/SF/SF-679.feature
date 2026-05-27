# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-679 - Claims Manager Go-Live tasks
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-679 @rbt @medium
Feature: API - SF-679 - Claims Manager Go-Live tasks
  API must support the behaviour described in the story (SF-679).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-679 @SF-679-API-001 @p1 @smoke @rbt
  Scenario: API - Opportunity has been moved to “Go-Live” stage
    Given the Opportunity is in stage “Go-Live”
    When the API is invoked for SF-679
    Then the system must create a Go-Live task called “Claims Go-Live Task”

  @SF-679 @SF-679-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-679
    When an alternative or invalid request is made
    Then the API must respond appropriately
