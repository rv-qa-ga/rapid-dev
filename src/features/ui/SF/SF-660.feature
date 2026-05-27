# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-660 - Member Onboarding Questionnaire – Required Reviews by Roles and Control Teams
# Type: Story | Priority: Medium
# Feature Type: onboarding | opportunity | tasks | validation
# Generated: RBT (Risk-Based Testing) - UI
# ══════════════════════════════════════════════════════════════════════════════
#
# As an MRD I want all required onboarding roles and control teams to review the
# Member Onboarding Questionnaire and confirm when their review is complete, so that
# onboarding information is validated and acknowledged before the opportunity can progress.
#
# Onboarding roles: Actuary, Underwriter, Claims Manager, Operations Manager.
# Control/oversight teams: Compliance, IT Security, Finance.
# Note: Role/team-specific data capture is out of scope (separate stories).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-660 @rbt @medium @onboarding @opportunity @review @tasks
Feature: UI - SF-660 - Member Onboarding Questionnaire required reviews
  As an MRD
  I want all required onboarding roles and control teams to review the Member Onboarding Questionnaire and confirm when their review is complete
  So that onboarding information is validated and acknowledged before the opportunity can progress

  Background:
    Given I am logged in as a "QA MRD User" user
    And an Opportunity exists with Opportunity Type "New Business"
    And the Member Onboarding Questionnaire has been received and made available for review
    And the Opportunity has the following onboarding roles assigned: Actuary, Underwriter, Claims Manager, Operations Manager
    And the following control or oversight teams are required to review the questionnaire: Compliance, IT Security, Finance

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS (review tasks, completion, reminders, scope)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-660 @SF-660-UI-001 @p1 @smoke @rbt @task-creation
  Scenario: Review tasks are created for all required reviewers
    Given questionnaire receipt has been confirmed
    When the review process begins
    Then the review task "Review Member Onboarding Questionnaire" must be created for:
      | Reviewer Type | Assignee                          |
      | Role          | the assigned Actuary              |
      | Role          | the assigned Underwriter          |
      | Role          | the assigned Claims Manager       |
      | Role          | the assigned Operations Manager   |
      | Team          | the Compliance team               |
      | Team          | the IT Security team              |
      | Team          | the Finance team                  |
    And each review task must include access to the questionnaire document with the message: "Please review the following Member Onboarding Questionnaire"
    And I take a screenshot as evidence

  @SF-660 @SF-660-UI-002 @p1 @rbt @onboarding-roles
  Scenario: Assigned onboarding roles complete their review
    Given the review task "Review Member Onboarding Questionnaire" exists for an assigned onboarding role (Actuary, Underwriter, Claims Manager, or Operations Manager)
    When the role holder completes their review
    Then they must be able to add review comments (optional)
    And they must be able to mark their review as Complete
    And the system must record the reviewer, date, and comments
    And I take a screenshot as evidence

  @SF-660 @SF-660-UI-003 @p1 @rbt @control-teams
  Scenario: Control and oversight teams complete their review
    Given the review task "Review Member Onboarding Questionnaire" exists for a control or oversight team (Compliance, IT Security, or Finance)
    When any authorised member of that team completes the review
    Then they must be able to add review comments (optional)
    And they must be able to mark the team review as Complete
    And the system must record the user, date, and comments
    And I take a screenshot as evidence

  @SF-660 @SF-660-UI-004 @p1 @rbt @validation @blocked
  Scenario: Questionnaire cannot be completed until all reviews are complete
    Given one or more required review tasks are not marked as Complete
    When the MRD attempts to mark the Member Onboarding Questionnaire as complete
    Then the system must prevent completion
    And the system must display the message: "Not all required reviews have been completed - Task cannot be completed"
    And I take a screenshot as evidence

  @SF-660 @SF-660-UI-005 @p2 @rbt @reminder
  Scenario: Questionnaire pending review for 3 working days – reminder notification
    Given the review task "Review Member Onboarding Questionnaire" exists for an assigned onboarding role or an oversight team
    And the task has been pending review for 3 working days
    When the reminder is sent
    Then a notification must be sent to remind the reviewers to complete the review
    And the notification must say: "The following Onboarding Questionnaire needs to be reviewed - Please review"
    And a reviewer who has already marked their review as Complete must not receive this reminder notification
    And I take a screenshot as evidence

  @SF-660 @SF-660-UI-006 @p1 @smoke @rbt @completion
  Scenario: Questionnaire is completed once all reviews are complete
    Given all required review tasks have been marked as Complete
    When the MRD marks the Member Onboarding Questionnaire as complete
    Then the system must mark the questionnaire as complete
    And the system must record the completion date and user
    And I take a screenshot as evidence

  @SF-660 @SF-660-UI-007 @p2 @rbt @negative
  Scenario: Review requirements apply only to New Business onboarding
    Given an Opportunity exists
    When the Opportunity Type is not "New Business"
    Then these review requirements must not be enforced
    And I take a screenshot as evidence
