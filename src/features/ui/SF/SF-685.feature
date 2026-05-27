# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-685 - Approved Contract MRD Activities
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-685 @rbt @medium
Feature: UI - SF-685 - Approved Contract MRD Activities
  As MRD
  I want to complete the required post-approval activities
  So that the signed contract is stored against the Opportunity and downstream implementation activities can begin

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity is a New Opportunity
    And the Opportunity.Type = New Business
    And the Opportunity can be in any Region (Region__c can be UK, US, CA, EU)
    And the contract has been approved by the Legal (US/CA) or Head of Distribution (UK/EU)
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-685 @SF-685-UI-001 @p1 @rbt
  Scenario: MRD is notified when the contract is approved
    Given the contract approval outcome is Approved
    When the approval decision is recorded
    Then the system must notify the MRD that the contract has been approved
    And the task “post-approval contract” must be created for the MRD
    And the MRD must send the contract to the member to be signed
    And I take a screenshot as evidence

  @SF-685 @SF-685-UI-002 @p1 @rbt
  Scenario: MRD uploads the signed contract to SharePoint via the Opportunity
    Given the MRD has received the signed contract
    Then the MRD uploads the signed contract document to SharePoint from the Opportunity record
    And the signed contract document must be accessible via the Opportunity
    And associated to the correct Opportunity
    And the MRD must mark the “post-approval contract” Task as Complete
    And I take a screenshot as evidence

  @SF-685 @SF-685-UI-003 @p1 @rbt
  Scenario: Only MRDs can complete MRD post-approval contract task
    Given a user is not in the MRD role/profile/permission set
    When they attempt to mark the MRD post-approval contract tasks as Complete
    Then the action must be prevented
    And I take a screenshot as evidence

