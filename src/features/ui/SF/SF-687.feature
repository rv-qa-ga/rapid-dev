# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-687 - Operations Manager Go-Live tasks
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-687 @rbt @medium
Feature: UI - SF-687 - Operations Manager Go-Live tasks
  As associated contract
  I want to be assigned and complete Operations Go-Live tasks once a contract is live
  So that Operations readiness is confirmed before the Opportunity is marked Live

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity is a New Opportunity
    And the Opportunity.Type = New Business
    And the Opportunity can be in any Region (Region__c can be any value)
    And the Opportunity has an associated contract
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-687 @SF-687-UI-001 @p1 @rbt
  Scenario: Opportunity has been moved to “Go-Live” stage
    Given the Opportunity is in stage “Go-Live”
    Then the system must create a Go-Live task called “Operations Go-Live Task”
    And associate the task to the Opportunity
    And assign the task to the Operations manager assigned to that opportunity
    And the Operations Go-Live Task fields must be available for completion (see attachment)
    And I take a screenshot as evidence

  @SF-687 @SF-687-UI-002 @p1 @rbt
  Scenario: Operations Go-Live tasks apply only to New Business Opportunities
    Given the contract is confirmed as Live in CMT and Salesforce
    And the Opportunity.Type is NOT New Business
    When the confirmation is recorded
    Then the system must not create a Operations Go-Live task
    And the Operations Go-Live Task fields must NOT be available for completion
    And I take a screenshot as evidence

  @SF-687 @SF-687-UI-003 @p1 @rbt
  Scenario: Operations Manager can complete Operations Go-Live tasks
    Given a Operations Go-Live task exists for the Opportunity
    And all mandatory Operations Go-Live tasks have been completed
    When a Operations Manager marks the Operations Go-Live task as Complete
    Then the system must record the completion date and user
    And I take a screenshot as evidence

  @SF-687 @SF-687-UI-004 @p1 @rbt
  Scenario: Opportunity cannot move to Live if Operations Go-Live task is incomplete
    Given the Operations Go-Live task is not Complete
    When the Opportunity is evaluated for status "Live"
    Then the Opportunity must not be allowed to move to status "Live"
    And I take a screenshot as evidence

  @SF-687 @SF-687-UI-005 @p1 @rbt
  Scenario: Opportunity can move to Live once Claims, Operations and Distribution Go-Live tasks are complete
    Given the Claims Go-Live task is Complete
    And the Operations Go-Live task is Complete
    And the Distribution Go-Live task is Complete
    When the Opportunity status is evaluated
    Then the Opportunity must be allowed to move to status "Live"
    And I take a screenshot as evidence

  @SF-687 @SF-687-UI-006 @p1 @rbt
  Scenario: Only the Operations manager can complete the Operations Go-Live task
    Given a Operations Go-Live task exists for the Opportunity
    When a user who is NOT the Operations Manager for that opportunity attempts to mark the task as Complete
    Then the system must prevent completion
    And display a message indicating only the Operations Manager can complete this task
    And I take a screenshot as evidence

