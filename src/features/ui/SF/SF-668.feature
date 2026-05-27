# JIRA: SF-668 - Management Committee Approval Decision
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - Risk-Based Testing (RBT)
# RBT: UI test cases from acceptance criteria; API minimal 1-2 smoke tests.
#
# Story: As a ManCo approver I want to review Member Onboarding information and
# record an approve or reject decision, so that governance approval is formally
# granted before the Opportunity moves to contracting.

@ui @salesforce @SF-668 @high @salesforce @SF-668-RBT @opportunity @manco @approval
Feature: SF-668 - Management Committee Approval Decision
  As a ManCo approver
  I want to review the Member Onboarding information and record an approve or reject decision
  So that governance approval is formally granted before the Opportunity moves to contracting

  Background:
    Given I am logged in as a "QA MRD User" user

  # RBT: Scenario 1 - ManCo approvers notified when approval required
  @SF-668 @SF-668-UI-001 @p1 @smoke @rbt @notification
  Scenario: ManCo approvers are notified when approval is required
    Given the ManCo approvers have been assigned
    When ManCo decisioning becomes active
    Then the assigned ManCo approvers must be notified that Account approval is required
    And the notification must include relevant Opportunity and Account context
    And they must have access to onboarding and POG artefacts to make a decision
    And I take a screenshot as evidence

  # RBT: Scenario 2 - ManCo approvers can view onboarding review comments
  @SF-668 @SF-668-UI-002 @p1 @rbt @view-comments
  Scenario: ManCo approvers can view onboarding and POG review comments
    Given the Opportunity is eligible for ManCo decisioning
    When a ManCo approver reviews the Account
    Then the ManCo approver must be able to view onboarding review comments
    And the ManCo approver must be able to view POG review comments
    And I take a screenshot as evidence

  # RBT: Scenario 3 - ManCo approver can approve the Account
  @SF-668 @SF-668-UI-003 @p1 @rbt @approve
  Scenario: ManCo approver can approve the Account
    Given a ManCo approver has been notified and has reviewed the onboarding information
    When the approver records a decision of Approved
    Then the system must record the approval
    And mark ManCo approval as Approved
    And I take a screenshot as evidence

  # RBT: Scenario 4 - ManCo approver can reject with reason
  @SF-668 @SF-668-UI-004 @p1 @rbt @reject
  Scenario: ManCo approver can reject the Account with a reason
    Given a ManCo approver has been notified and has reviewed the onboarding information
    When the approver records a decision of Rejected
    Then the system must require a reason for rejection
    And record the rejection decision and reason
    And the MRD and POG Manager must be notified of the rejection including the reason
    And I take a screenshot as evidence

  # RBT: Scenario 5 - Rejected ManCo blocks progression to Contracting
  @SF-668 @SF-668-UI-005 @p1 @rbt @rejected-blocks
  Scenario: Rejected ManCo approval blocks progression to Contracting
    Given ManCo approval has been Rejected
    When a user attempts to move the Opportunity to Contracting
    Then the system must prevent the stage change
    And indicate that ManCo approval was rejected
    And I take a screenshot as evidence

  # RBT: Scenario 6 - Approved ManCo allows progression to Contracting
  @SF-668 @SF-668-UI-006 @p1 @rbt @approved-allows
  Scenario: Approved ManCo approval allows progression to Contracting
    Given ManCo approval has been Approved
    When a user attempts to move the Opportunity to Contracting
    Then the stage change must be allowed
    And I take a screenshot as evidence

  # RBT: Permissions - only assigned ManCo approvers can approve
  @SF-668 @SF-668-UI-007 @p2 @rbt @permissions
  Scenario: Only assigned ManCo approvers can approve the account
    Given the Opportunity is eligible for ManCo decisioning
    When a user who is not an assigned ManCo approver attempts to approve or reject
    Then the system must prevent the action
    And all other users can see the ManCo approvers and the status of the approval
    And I take a screenshot as evidence
