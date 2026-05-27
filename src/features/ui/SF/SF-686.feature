# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-686 - Operations Add Contract Data into CMT
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-686 @rbt @medium
Feature: UI - SF-686 - Operations Add Contract Data into CMT
  As Operations Manager
  I want to enter the approved signed contract details into CMT
  So that the Opportunity can move to the "Go-Live" stage and Go-Live tasks can be initiated

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity is a New Opportunity
    And the Opportunity.Type = New Business
    And the Opportunity can be in any Region (Region__c can be UK, US, CA, EU)
    And the contract has been approved by the Legal (US/CA) or Head of Distribution (UK/EU)
    And the MRD post-approval contract tasks are Complete
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-686 @SF-686-UI-001 @p1 @rbt
  Scenario: Completion of MRD post-approval tasks triggers the “Input Contract Data into CMT” task
    Given the MRD “post-approval contract” task is marked Complete
    Then the system must create a task for the Operations Manager called “Input Contract Data into CMT”
    And associate the task to the Opportunity
    And I take a screenshot as evidence

  @SF-686 @SF-686-UI-002 @p1 @rbt
  Scenario: Completion of MRD post-approval tasks must be Marked Complete
    Given the MRD post-approval contract tasks are NOT marked Complete
    Then the system must NOT create the task for the Operations Manager to add contract information into CMT
    And I take a screenshot as evidence

  @SF-686 @SF-686-UI-003 @p1 @rbt
  Scenario: Only Operations Manager can complete the “Input Contract Data into CMT” task
    Given an Operations Manager CMT task exists for the Opportunity
    When a user who is NOT the Operations Manager for that opportunity, attempts to mark the task as Complete
    Then the system must prevent completion
    And display a message indicating only the Operations Manager can complete this task
    And I take a screenshot as evidence

  @SF-686 @SF-686-UI-004 @p1 @rbt
  Scenario: Completing the “Input Contract Data into CMT” task moves the Opportunity to "Go-Live" stage
    Given the Operations Manager has added contract information into CMT
    When the Operations Manager marks the “Input Contract Data into CMT” task as Complete
    Then the system must move the Opportunity stage to "Go-Live"
    And I take a screenshot as evidence

  @SF-686 @SF-686-UI-005 @p1 @rbt
  Scenario: Opportunity cannot move to "Go-Live" unless the Operations Manager completes “Input Contract Data into CMT” task
    Given the Operations Manager “Input Contract Data into CMT” task is not Complete
    When the Opportunity is evaluated for stage "Go-Live"
    Then the Opportunity must not be allowed to move to stage "Go-Live"
    And I take a screenshot as evidence

