# JIRA: SF-723 - New Opportunity Moved to Contracting Stage
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - Risk-Based Testing (RBT)
# RBT: UI test cases from acceptance criteria; API minimal 1-2 smoke tests.
#
# Story: As an MRD I want the Opportunity to automatically move to "Contracting"
# when the Member Onboarding Questionnaire review is completed (for US/CA only).

@ui @salesforce @SF-723 @medium @salesforce @SF-723-RBT @opportunity @contracting @mrd
Feature: SF-723 - New Opportunity Moved to Contracting Stage
  As an MRD
  I want the Opportunity to automatically move to the "Contracting" stage when the Member Onboarding Questionnaire review is completed (for US/CA only)
  So that onboarding completion triggers the next step for applicable regions

  Background:
    Given I am logged in as a "QA MRD User" user

  # RBT: Scenario 1 - US/CA Opportunity moves to Contracting when onboarding review completes
  @SF-723 @SF-723-UI-001 @p1 @smoke @rbt @us-ca-auto-move
  Scenario: US/CA Opportunity moves to Contracting when onboarding review completes
    Given the Opportunity is in stage "Due Diligence"
    And the Opportunity Region__c is "US" or "CA"
    And the Member Onboarding Questionnaire review is in progress
    When the Member Onboarding Questionnaire review is marked as complete
    Then the Opportunity stage must be updated to "Contracting"
    And the stage change must be recorded against the Opportunity
    And I take a screenshot as evidence

  # RBT: Scenario 2 - UK/EU Opportunity does NOT move when onboarding review completes
  @SF-723 @SF-723-UI-002 @p1 @rbt @uk-eu-no-auto-move
  Scenario: UK/EU Opportunity does not move to Contracting when onboarding review completes
    Given the Opportunity is in stage "Due Diligence"
    And the Opportunity Region__c is "UK" or "EU"
    And the Member Onboarding Questionnaire review is in progress
    When the Member Onboarding Questionnaire review is marked as complete
    Then the Opportunity stage must not be updated to "Contracting"
    And the Opportunity stage must remain unchanged
    And I take a screenshot as evidence

  # RBT: Boundary - only when review is completed (not on submit)
  @SF-723 @SF-723-UI-003 @p2 @rbt @boundary
  Scenario: Opportunity does not move to Contracting until review is marked complete
    Given the Opportunity is in stage "Due Diligence"
    And the Opportunity Region__c is "US"
    And the Member Onboarding Questionnaire has been submitted but review is not yet complete
    When the MRD views the Opportunity
    Then the Opportunity stage must still be "Due Diligence"
    And I take a screenshot as evidence
