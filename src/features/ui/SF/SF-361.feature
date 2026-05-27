# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-361 - Operations Manager Review Data Capture
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-361 @rbt @medium
Feature: UI - SF-361 - Operations Manager Review Data Capture
  As Operations manager
  I want to complete required Operations fields during the Member Onboarding Questionnaire review
  So that Operations requirements are formally captured before the onboarding review can be marked as complete.

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity exists
    And the Opportunity is in stage ‘Due Diligence’
    And the Member Onboarding Questionnaire has been submitted for review
    And Operations is a required reviewer for the onboarding questionnaire
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-361 @SF-361-UI-001 @p1 @rbt
  Scenario: Operations fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    And the Operations review task is active
    When the Operations Manager accesses the Opportunity
    Then the required Operations onboarding fields must be available for completion (see attachment)
    And I take a screenshot as evidence

  @SF-361 @SF-361-UI-002 @p1 @rbt
  Scenario: Operations reviewers can complete Operations fields
    Given a Operations review task exists
    When the Operations Manager for that opportunity completes the required Operations onboarding fields
    Then the values must be saved successfully
    And recorded against the Opportunity
    And I take a screenshot as evidence

  @SF-361 @SF-361-UI-003 @p1 @rbt
  Scenario: Onboarding review cannot be marked as complete if Operations fields are not completed
    Given the Member Onboarding Questionnaire review is in progress
    And one or more required Operations onboarding fields are not completed
    When the Operations Manager attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And display a message indicating that Operations fields must be completed first
    And I take a screenshot as evidence

  @SF-361 @SF-361-UI-004 @p1 @rbt
  Scenario: Onboarding review can be completed once Required Operations fields are completed
    Given the Member Onboarding Questionnaire review is in progress
    And all required Operations onboarding fields are completed
    When the Operations Manager attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the action must succeed
    And I take a screenshot as evidence

  @SF-361 @SF-361-UI-005 @p1 @rbt
  Scenario: Only the Operations Manager may complete the Operations fields
    Given a user is not part the Operations manager for the Opportunity
    When they attempt to complete or update the Operations onboarding fields
    Then the action must be prevented
    And I take a screenshot as evidence

