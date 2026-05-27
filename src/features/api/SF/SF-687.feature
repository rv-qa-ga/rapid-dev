# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-687 - Operations Manager Go-Live tasks
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-687 @rbt @medium
Feature: API - SF-687 - Operations Manager Go-Live tasks
  API must support the behaviour described in the story (SF-687).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-687 @SF-687-API-001 @p1 @smoke @rbt
  Scenario: API - Opportunity has been moved to “Go-Live” stage
    Given the Opportunity is in stage “Go-Live”
    When the API is invoked for SF-687
    Then the system must create a Go-Live task called “Operations Go-Live Task”

  @SF-687 @SF-687-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-687
    When an alternative or invalid request is made
    Then the API must respond appropriately
