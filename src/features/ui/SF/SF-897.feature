# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-897 - FEEDBACK - 2a. Replace Approval Process with Task-Based Workflow - Coding Quest
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-897 @rbt @medium
Feature: UI - SF-897 - FEEDBACK - 2a. Replace Approval Process with Task-Based Workflow - Coding Quest
  As Underwriter, Actuary, or Exposure Team Member
  I want submission of the Coding Questionnaire to automatically trigger downstream tasks and notifications
  So that the Actuary can begin the Prospect Coding Questionnaire / Draft Product Map and the Exposure Team can begin the Exposure Questionnaire without requiring formal approval.

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-897 @SF-897-UI-001 @p1 @rbt
  Scenario: Main scenario
    Given SF-591 previously introduced Approve and Reject functionality
    Given an Underwriter clicks Submit
    Given Coding Questionnaire is Submitted
    When the Underwriter clicks the existing Submit button:
    Then new tasks must be created for the other two parties (the users who did not make the change).
    And I take a screenshot as evidence
