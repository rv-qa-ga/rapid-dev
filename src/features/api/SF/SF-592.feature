# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-592 - 3. Notify assigned Exposure Team member and create task when Coding Questionnaire is submitted
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-592 @rbt @medium
Feature: API - SF-592 - 3. Notify assigned Exposure Team member and create task when Coding Questionnaire is submitted
  API must support the behaviour described in the story (SF-592).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-592 @SF-592-API-001 @p1 @smoke @rbt
  Scenario: API - Story acceptance criteria
    Given the system is set up for SF-592
    When the user performs the required actions
    Then the expected outcome per story description is verified
