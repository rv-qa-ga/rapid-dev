# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-360 - Claims Manager Review Data Capture
# As a Claims manager I want to complete required claims fields during the
# Member Onboarding Questionnaire review so that claims requirements are
# formally captured before the onboarding review can be marked as complete.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-360 @medium @salesforce @field-visibility @task
Feature: SF-360 - Claims Manager Review Data Capture
  As a Claims manager
  I want to complete required claims fields during the Member Onboarding Questionnaire review
  So that claims requirements are formally captured before the onboarding review can be marked as complete.

  Background:
    Given an Opportunity exists
    And the Opportunity is in stage 'Due Diligence'
    And the Member Onboarding Questionnaire has been submitted for review
    And Claims is a required reviewer for the onboarding questionnaire

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 1: Claims fields become required once onboarding review starts
  # ─────────────────────────────────────────────────────────────────────────

  @SF-360 @SF-360-UI-001 @p1 @smoke @positive @field-visibility @field-exists
  Scenario: Claims fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    And the Claims review task is active
    When the Claims Manager accesses the Opportunity
    Then the required Claims onboarding fields must be available for population (see attachment)

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 2: Claims reviewers can populate Claims fields
  # ─────────────────────────────────────────────────────────────────────────

  @SF-360 @SF-360-UI-002 @p1 @positive @update
  Scenario: Claims reviewers can populate Claims fields
    Given a Claims review task exists
    When the Claims Manager for that opportunity populates the required Claims onboarding fields
    Then the values must be saved successfully
    And recorded against the Opportunity

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 3: Onboarding review cannot be marked complete if Claims fields missing
  # ─────────────────────────────────────────────────────────────────────────

  @SF-360 @SF-360-UI-003 @p2 @negative
  Scenario: Onboarding review cannot be marked as complete if Claims fields are missing
    Given the Member Onboarding Questionnaire review is in progress
    And one or more required Claims onboarding fields are not populated
    When the Claims Manager attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And display a message indicating that Claims fields must be completed first

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 4: Onboarding review can be completed once Claims fields are populated
  # ─────────────────────────────────────────────────────────────────────────

  @SF-360 @SF-360-UI-004 @p1 @positive
  Scenario: Onboarding review can be completed once Claims fields are populated
    Given the Member Onboarding Questionnaire review is in progress
    And all required Claims onboarding fields are populated
    When the Claims Manager attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the action must succeed

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 5: Only the Claims Manager may populate Claims fields
  # ─────────────────────────────────────────────────────────────────────────

  @SF-360 @SF-360-UI-005 @p2 @negative @permissions
  Scenario: Only the Claims Manager may populate Claims fields
    Given a user is not the Claims Manager for the Opportunity
    When they attempt to populate or update the Claims onboarding fields
    Then the action must be prevented
