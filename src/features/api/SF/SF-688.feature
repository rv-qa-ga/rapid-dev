# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-688 - Distribution Go-Live tasks
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-688 @rbt @medium
Feature: API - SF-688 - Distribution Go-Live tasks
  API must support the behaviour described in the story (SF-688).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-688 @SF-688-API-001 @p1 @smoke @rbt
  Scenario: API - Opportunity has been moved to “Go-Live” stage
    Given the Opportunity is in stage “Go-Live”
    When the API is invoked for SF-688
    Then the system must create a Go-Live task called “Distribution Go-Live Task”

  @SF-688 @SF-688-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-688
    When an alternative or invalid request is made
    Then the API must respond appropriately
