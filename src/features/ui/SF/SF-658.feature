# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-658 - Member Onboarding Questionnaire Completion
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-658 @rbt @medium
Feature: UI - SF-658 - Member Onboarding Questionnaire Completion
  As MRD
  I want to be notified to send, receive, and upload the Member Onboarding Questionnaire
  So that the questionnaire is available from the Opportunity and ready for internal review once Due Diligence begins

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity exists
    And the Opportunity Stage = Due Diligence
    And the Opportunity.Type = New Business
    And the Opportunity can be in any Region
    And the Member Onboarding Questionnaire is exchanged outside the system
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-658 @SF-658-UI-001 @p1 @rbt
  Scenario: Moving Opportunity to Due Diligence triggers notification to MRD
    Given an Opportunity has Opportunity Type = "New Business"
    When the Opportunity Stage changes to "Due Diligence"
    Then the MRD must be notified that the Member Onboarding Questionnaire must be sent to the Member
    And I take a screenshot as evidence

  @SF-658 @SF-658-UI-002 @p1 @rbt
  Scenario: Questionnaire is not required for non–New Business Opportunities
    Given an Opportunity is moved to stage "Due Diligence"
    And the Opportunity.Type is NOT New Business
    When the stage change is saved
    Then the system must not trigger the Member Onboarding Questionnaire process
    And the Member Onboarding Questionnaire must not be required
    And I take a screenshot as evidence

  @SF-658 @SF-658-UI-003 @p1 @rbt
  Scenario: MRD uploads received questionnaire to SharePoint via the Opportunity -
    Given the MRD has received the completed Member Onboarding Questionnaire from the member
    When the MRD uploads the questionnaire to SharePoint from the Opportunity record
    Then the questionnaire document must be accessible via the Opportunity
    And associated with the correct Opportunity record
    And I take a screenshot as evidence

  @SF-658 @SF-658-UI-004 @p1 @rbt
  Scenario: Completing questionnaire received task initiates the review process -
    Given a questionnaire document is uploaded and associated with the Opportunity
    And the MRD confirms questionnaire receipt
    Then the questionnaire must be available for internal review
    And I take a screenshot as evidence

  @SF-658 @SF-658-UI-005 @p1 @rbt
  Scenario: Only MRDs can complete questionnaire receipt tasks -
    Given a user does not have MRD authorisation
    When they attempt to upload the questionnaire document
    Then the action must be prevented
    And I take a screenshot as evidence

