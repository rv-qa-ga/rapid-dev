# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-504 - AccountTeamMember object consolidation
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-504 @rbt @medium
Feature: API - SF-504 - AccountTeamMember object consolidation
  API must support the behaviour described in the story (SF-504).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-504 @SF-504-API-001 @p1 @smoke @rbt
  Scenario: API - Main flow
    Given the system is configured for SF-504
    When the API is invoked for SF-504
    Then the API must return success or the expected outcome
