# JIRA: SF-362 - Compliance Data Capture for Member Onboarding Review
# RBT test cases from Jira description (Mode 4) - Compliance Reviewer completes required compliance fields during Member Onboarding Questionnaire review.
#
# Story: As a Compliance Reviewer I want to complete required compliance fields during the Member Onboarding Questionnaire review So that compliance requirements are formally captured before the onboarding review can be marked as complete.

@ui @salesforce @SF-362 @medium @salesforce @SF-362-RBT @compliance @onboarding @questionnaire
Feature: SF-362 - Compliance Data Capture for Member Onboarding Review
  As a Compliance Reviewer
  I want to complete required compliance fields during the Member Onboarding Questionnaire review
  So that compliance requirements are formally captured before the onboarding review can be marked as complete

  Background:
    Given an Opportunity exists
    And the Opportunity is in stage "Due Diligence"
    And the Member Onboarding Questionnaire has been submitted for review
    And Compliance is a required reviewer for the onboarding questionnaire

  # RBT: Scenario 1 - Compliance fields available once review starts
  @SF-362 @SF-362-UI-001 @p1 @smoke @rbt @compliance-fields-available
  Scenario: Compliance fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    And the Compliance review task is active
    When a Compliance reviewer accesses the Opportunity
    Then the required Compliance onboarding fields must be available for completion
    And I take a screenshot as evidence

  # RBT: Scenario 2 - Compliance reviewers can complete and save fields
  @SF-362 @SF-362-UI-002 @p1 @rbt @compliance-complete
  Scenario: Compliance reviewers can complete compliance fields
    Given a Compliance review task exists
    When an authorised Compliance user completes the required Compliance onboarding fields
    Then the values must be saved successfully
    And recorded against the Opportunity
    And I take a screenshot as evidence

  # RBT: Scenario 3 - Cannot mark review complete if Compliance fields missing
  @SF-362 @SF-362-UI-003 @p1 @rbt @block-completion
  Scenario: Onboarding review cannot be marked complete if Compliance fields are missing
    Given the Member Onboarding Questionnaire review is in progress
    And one or more required Compliance onboarding fields are not completed
    When the Compliance approver attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And display a message indicating that Compliance fields must be completed first
    And I take a screenshot as evidence

  # RBT: Scenario 4 - Region-specific Compliance tasks visibility (US example)
  @SF-362 @SF-362-UI-004 @p1 @rbt @region-specific
  Scenario: Region-specific Compliance tasks are only visible for those Regions
    Given the Member Onboarding Questionnaire review is in progress
    When the Region for the Compliance task is "US"
    Then the Compliance task must only appear for US member opportunities (Region__c = US)
    And the Compliance task must be hidden for all non-US member opportunities (Region__c ≠ US)
    And I take a screenshot as evidence

  # RBT: Scenario 5 - Review can be completed once Compliance fields completed
  @SF-362 @SF-362-UI-005 @p1 @rbt @completion-allowed
  Scenario: Onboarding review can be completed once Compliance fields are completed
    Given the Member Onboarding Questionnaire review is in progress
    And all required Compliance onboarding fields are completed
    When the Compliance approver attempts to mark their review of the Member Onboarding Questionnaire as complete
    Then the action must succeed
    And I take a screenshot as evidence

  # RBT: Scenario 6 - Only Compliance users may complete Compliance fields
  @SF-362 @SF-362-UI-006 @p1 @rbt @permissions
  Scenario: Only Compliance users may complete Compliance fields
    Given a user is not part of the Compliance role or team
    When they attempt to complete or update the Compliance onboarding fields
    Then the action must be prevented
    And I take a screenshot as evidence
