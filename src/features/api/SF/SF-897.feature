# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-897 - FEEDBACK - 2a. Replace Approval Process with Task-Based Workflow - Coding Quest
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-897 @rbt @medium
Feature: API - SF-897 - FEEDBACK - 2a. Replace Approval Process with Task-Based Workflow - Coding Quest
  API must support the behaviour described in the story (SF-897).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-897 @SF-897-API-001 @p1 @smoke @rbt
  Scenario: API - Main scenario
    Given SF-591 previously introduced Approve and Reject functionality
    Given an Underwriter clicks Submit
    Given Coding Questionnaire is Submitted
    When the Underwriter clicks the existing Submit button:
    Then new tasks must be created for the other two parties (the users who did not make the change).
