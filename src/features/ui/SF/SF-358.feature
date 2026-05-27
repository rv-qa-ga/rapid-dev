# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-358 - Underwriter Review Data Capture
# As the Underwriter I want to complete required Underwriting fields during the
# Member Onboarding Questionnaire review so that Underwriting requirements are
# formally captured before the onboarding review can be marked as complete.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-358 @medium @salesforce @field-visibility @task
Feature: SF-358 - Underwriter Review Data Capture
  As the Underwriter
  I want to complete required Underwriting fields during the Member Onboarding Questionnaire review
  So that Underwriting requirements are formally captured before the onboarding review can be marked as complete.

  Background:
    Given an Opportunity exists
    And the Opportunity is in stage 'Due Diligence'
    And the Member Onboarding Questionnaire has been submitted for review
    And Underwriter is a required reviewer for the onboarding questionnaire

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 1: Underwriting fields become required once onboarding review starts
  # ─────────────────────────────────────────────────────────────────────────

  @SF-358 @SF-358-UI-001 @p1 @smoke @positive @field-visibility @field-exists
  Scenario: Underwriting fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    And the Underwriting review task is active
    When the assigned Underwriter to the opportunity accesses the Opportunity
    Then the required Underwriting onboarding fields must be available for completion (see attachment)

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 2: The assigned Underwriter can complete Underwriting fields
  # ─────────────────────────────────────────────────────────────────────────

  @SF-358 @SF-358-UI-002 @p1 @positive @update
  Scenario: The assigned Underwriter to the opportunity can complete Underwriting fields
    Given an Underwriting review task exists
    When the assigned Underwriter to the opportunity completes the required Underwriting onboarding fields
    Then the values must be saved successfully
    And recorded against the Opportunity

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 3: Onboarding review cannot be marked complete if Underwriting fields missing
  # ─────────────────────────────────────────────────────────────────────────

  @SF-358 @SF-358-UI-003 @p2 @negative
  Scenario: Onboarding review cannot be marked as complete if Underwriting fields are missing
    Given the Member Onboarding Questionnaire review is in progress
    And one or more required Underwriting onboarding fields are not completed
    When the assigned Underwriter to the opportunity attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And display a message indicating that Underwriting fields must be completed first

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 4: Region Specific Underwriter tasks only visible for those Regions
  # ─────────────────────────────────────────────────────────────────────────

  @SF-358 @SF-358-UI-004 @p2 @region @visibility
  Scenario: Region Specific Underwriter tasks are only visible for those Regions
    Given the Member Onboarding Questionnaire review is in progress
    When the Region for the Underwriter task is "US"
    Then the underwriter task must only appear for US member opportunities (Region__c = US)
    And the underwriter task must be hidden for all non-US member opportunities (Region__c ≠ US)

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 5: Onboarding review can be completed once Underwriting fields completed
  # ─────────────────────────────────────────────────────────────────────────

  @SF-358 @SF-358-UI-005 @p1 @positive
  Scenario: Onboarding review can be completed once Underwriting fields are completed
    Given the Member Onboarding Questionnaire review is in progress
    And all required Underwriting onboarding fields are completed
    When the assigned Underwriter to the opportunity attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the action must succeed

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 6: Only the assigned Underwriter may complete Underwriting fields
  # ─────────────────────────────────────────────────────────────────────────

  @SF-358 @SF-358-UI-006 @p2 @negative @permissions
  Scenario: Only the assigned Underwriter to that opportunity may complete Underwriting fields
    Given a user is not the assigned Underwriter to the opportunity
    When they attempt to complete or update the Underwriting onboarding fields
    Then the action must be prevented
