# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-679 - Claims Manager Go-Live tasks
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-679 @rbt @medium
Feature: UI - SF-679 - Claims Manager Go-Live tasks
  As associated contract
  I want to be assigned and complete Claims Go-Live tasks once the Opportuntiy has moved to the 'Go-Live' stage
  So that Claims readiness is confirmed before the Opportunity is marked Live

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity is a New Opportunity
    And the Opportunity.Type = New Business
    And the Opportunity can be in any Region (Region__c can be any value)
    And the Opportunity has an associated contract
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-679 @SF-679-UI-001 @p1 @rbt
  Scenario: Opportunity has been moved to “Go-Live” stage
    Given the Opportunity is in stage “Go-Live”
    Then the system must create a Go-Live task called “Claims Go-Live Task”
    And associate the task to the Opportunity
    And assign the task to the Claims manager assigned to that opportunity
    And the Claims Go-Live Task fields must be available for completion (see attachment)
    And I take a screenshot as evidence

  @SF-679 @SF-679-UI-002 @p1 @rbt
  Scenario: Claims Go-Live tasks apply only to New Business Opportunities
    Given the contract is confirmed as Active in CMT and Salesforce
    And the Opportunity.Type is NOT New Business
    When the confirmation is recorded
    Then the system must not create a Claims Go-Live task
    And the Claims Go-Live Task fields must NOT be available for completion
    And I take a screenshot as evidence

  @SF-679 @SF-679-UI-003 @p1 @rbt
  Scenario: Claims manager can complete Claims Go-Live tasks
    Given a Claims Go-Live task exists for the Opportunity
    And all mandatory Claims Go-Live tasks have been completed
    When a Claims manager marks the Claims Go-Live task as Complete
    Then the system must record the completion date and user
    And I take a screenshot as evidence

  @SF-679 @SF-679-UI-004 @p1 @rbt
  Scenario: Opportunity cannot move to Live if Claims Go-Live task is incomplete
    Given the Claims Go-Live task is not Complete
    When the Opportunity is evaluated for status "Live"
    Then the Opportunity must not be allowed to move to status "Live"
    And I take a screenshot as evidence

  @SF-679 @SF-679-UI-005 @p1 @rbt
  Scenario: Opportunity can move to Live once Claims, Operations and Distribution Go-Live tasks are complete
    Given the Claims Go-Live task is Complete
    And the Operations Go-Live task is Complete
    And the Distribution Go-Live task is Complete
    When the Opportunity status is evaluated
    Then the Opportunity must be allowed to move to status "Live" – Make clear that system is changing the stage of opportunity
    And I take a screenshot as evidence

  @SF-679 @SF-679-UI-006 @p1 @rbt
  Scenario: Only the Claims manager can complete the Claims Go-Live task
    Given a Claims Go-Live task exists for the Opportunity
    When a user who is NOT the Claims Manager for that opportunity attempts to mark the task as Complete
    Then the system must prevent completion
    And display a message indicating only the Claims Manager can complete this task
    And I take a screenshot as evidence

