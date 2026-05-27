# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-592 - 3. Notify assigned Exposure Team member and create task when Coding Questionnaire is submitted
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-592 @rbt @medium
Feature: UI - SF-592 - 3. Notify assigned Exposure Team member and create task when Coding Questionnaire is submitted
  As assigned Exposure team member
  I want Salesforce to notify the already-assigned Exposure Team member and create a task when an Underwriter submits the Coding Questionnaire
  So that the Exposure team is informed that underwriting has progressed and the Exposure Questionnaire is ready for action.

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-592 @SF-592-UI-001 @p1 @rbt
  Scenario: Story acceptance criteria
    Given the system is set up for SF-592
    When the user performs the required actions
    Then the expected outcome per story description is verified
    And I take a screenshot as evidence

