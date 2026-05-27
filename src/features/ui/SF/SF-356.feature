# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-356 - Actuary Review Data Capture
# As the Actuary I want to complete required Actuarial fields during the
# Member Onboarding Questionnaire review so that Actuarial requirements are
# formally captured before the onboarding review can be marked as complete.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-356 @medium @salesforce @field-visibility @task
Feature: SF-356 - Actuary Review Data Capture
  As the Actuary
  I want to complete required Actuarial fields during the Member Onboarding Questionnaire review
  So that Actuarial requirements are formally captured before the onboarding review can be marked as complete.

  Background:
    Given an Opportunity exists in stage 'Due Diligence' with Type 'New Business'
    And the Opportunity has an Opportunity Readiness record
    And the Member Onboarding Questionnaire has been submitted for review

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 1: Actuarial fields become required once onboarding review starts
  # ─────────────────────────────────────────────────────────────────────────

  @SF-356 @SF-356-UI-001 @p1 @smoke @positive @field-visibility @field-exists
  Scenario: Actuarial fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    And the Actuarial review task is active
    When the assigned Actuary to the opportunity accesses the Opportunity
    Then the required Actuarial onboarding fields must be available for completion (see attachment)

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 2: The assigned Actuary can complete the Actuarial fields
  # ─────────────────────────────────────────────────────────────────────────

  @SF-356 @SF-356-UI-002 @p1 @positive @update
  Scenario: The assigned Actuary to the opportunity can complete the Actuarial fields
    Given an Actuarial review task exists
    When the assigned Actuary to the opportunity completes the required Actuarial onboarding fields
    Then the values must be saved successfully
    And recorded against the Opportunity

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 3: Onboarding review cannot be marked complete if Actuarial fields incomplete
  # ─────────────────────────────────────────────────────────────────────────

  @SF-356 @SF-356-UI-003 @p2 @negative
  Scenario: Onboarding review cannot be marked as complete if Actuarial fields are incomplete
    Given the Member Onboarding Questionnaire review is in progress
    And one or more required Actuarial onboarding fields are not completed
    When the assigned Actuary to the opportunity attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And display a message indicating that Actuarial fields must be completed first

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 4: Onboarding review can be completed once Actuarial fields are completed
  # ─────────────────────────────────────────────────────────────────────────

  @SF-356 @SF-356-UI-004 @p1 @positive
  Scenario: Onboarding review can be completed once Actuarial fields are completed
    Given the Member Onboarding Questionnaire review is in progress
    And all required Actuarial onboarding fields are populated
    When the assigned Actuary to the opportunity attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the action must succeed

  # ─────────────────────────────────────────────────────────────────────────
  # Scenario 5: Only the assigned Actuary may complete the Actuarial fields
  # ─────────────────────────────────────────────────────────────────────────

  @SF-356 @SF-356-UI-005 @p2 @negative @permissions
  Scenario: Only the assigned Actuary to that opportunity may complete the Actuarial fields
    Given a user is not the assigned Actuary to the opportunity
    When they attempt to complete or update the Actuarial onboarding fields
    Then the action must be prevented
