# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-364 - Finance Review Data Capture
# Regenerated in RBT mode from work item description (6 scenarios).
# ══════════════════════════════════════════════════════════════════════════════
#
# As a Finance Reviewer
# I want to complete required Finance fields during the Member Onboarding Questionnaire review
# So that Finance requirements are formally captured before the onboarding review can be marked as complete.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-364 @medium @salesforce @finance-review @member-onboarding
Feature: SF-364 - Finance Review Data Capture
  As a Finance Reviewer
  I want to complete required Finance fields during the Member Onboarding Questionnaire review
  So that Finance requirements are formally captured before the onboarding review can be marked as complete.

  Background:
    Given an Opportunity exists
    And the Opportunity is in stage "Due Diligence"
    And the Member Onboarding Questionnaire has been submitted for review
    And Finance is a required reviewer for the onboarding questionnaire

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Finance fields become required once onboarding review starts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-364 @SF-364-UI-001 @p1 @smoke @positive @finance-review
  Scenario: Finance fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    And the Finance review task is active
    When a Finance reviewer accesses the Opportunity
    Then the required Finance onboarding fields must be available for completion
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Finance reviewers can complete Finance fields
  # ══════════════════════════════════════════════════════════════════════════

  @SF-364 @SF-364-UI-002 @p1 @positive @finance-review
  Scenario: Finance reviewers can complete Finance fields
    Given a Finance review task exists
    When an authorised Finance user completes the required Finance onboarding fields
    Then the values must be saved successfully
    And recorded against the Opportunity
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Onboarding review cannot be marked complete if Finance fields are missing
  # ══════════════════════════════════════════════════════════════════════════

  @SF-364 @SF-364-UI-003 @p1 @negative @finance-review
  Scenario: Onboarding review cannot be marked complete if Finance fields are missing
    Given the Member Onboarding Questionnaire review is in progress
    And one or more of the required Finance onboarding fields are not completed
    When the Finance approver attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And display a message indicating that the Finance fields must be completed first
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Region Specific Finance tasks are only visible for those Regions
  # ══════════════════════════════════════════════════════════════════════════

  @SF-364 @SF-364-UI-004 @p2 @positive @region-specific @finance-review
  Scenario: Region Specific Finance tasks are only visible for those Regions
    Given the Member Onboarding Questionnaire review is in progress
    When the Region for the Finance task is "UK/EU/Canada"
    Then the finance task must only appear for UK, EU and CA member opportunities (Region__c = UK/EU/CA)
    And the finance task must be hidden for all non UK, EU and CA member opportunities (Region__c ≠ UK/EU/CA)
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 5: Onboarding review can be completed once Finance fields are completed
  # ══════════════════════════════════════════════════════════════════════════

  @SF-364 @SF-364-UI-005 @p1 @positive @finance-review
  Scenario: Onboarding review can be completed once Finance fields are completed
    Given the Member Onboarding Questionnaire review is in progress
    And all required Finance onboarding fields are completed
    When the Finance approver attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the action must succeed
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 6: Only Finance users may populate Finance fields
  # ══════════════════════════════════════════════════════════════════════════

  @SF-364 @SF-364-UI-006 @p1 @negative @permissions @finance-review
  Scenario: Only Finance users may populate Finance fields
    Given a user is not part of the Finance role or team
    When they attempt to complete or update the Finance onboarding fields
    Then the action must be prevented
    And I take a screenshot as evidence
