# JIRA: SF-759 - Account Status Governance Approval Mechanism
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - Risk-Based Testing (RBT)
# RBT: UI test cases from acceptance criteria; API minimal 1-2 smoke tests.
#
# Story: As a Data Steward I want restricted Account Status changes to require
# formal governance approval, so that downstream impacts are assessed and audit
# controls are maintained.

@ui @salesforce @SF-759 @high @salesforce @SF-759-RBT @account @governance @approval
Feature: SF-759 - Account Status Governance Approval Mechanism
  As a Data Steward
  I want restricted Account Status changes to require formal governance approval
  So that downstream system impacts are assessed and status changes are not made without oversight

  Background:
    Given I am an authenticated Salesforce user

  # RBT: Scenario 1 - User must provide reason for governance-controlled status change
  @SF-759 @SF-759-UI-001 @p1 @smoke @rbt @reason-required
  Scenario: User must provide a reason when attempting a governance-controlled status change
    Given an Account exists
    And the user attempts to change the Account Status
    And the requested status change is governance-controlled
    When the user submits the status change
    Then the system must require the user to provide a reason for the requested change
    And the status change must not take effect immediately
    And I take a screenshot as evidence

  # RBT: Scenario 2 - Approval request routed to Data Team
  @SF-759 @SF-759-UI-002 @p1 @rbt @approval-request
  Scenario: Governance approval request is submitted to the Data Team
    Given a governance-controlled status change has been requested with a reason
    When the user submits the request
    Then an approval request must be created
    And the request must be routed to the Data Team approval queue
    And the message must indicate "Please review this request to change the Status of a Salesforce Account"
    And the Account Status must remain unchanged while the request is pending
    And I take a screenshot as evidence

  # RBT: Scenario 3 - Data Team performs impact analysis before approving
  @SF-759 @SF-759-UI-003 @p1 @rbt @impact-analysis
  Scenario: Data Team must perform impact analysis before approving or rejecting
    Given a governance request is pending
    When the Data Team reviews the request
    Then they must assess downstream system impact
    And they must record a decision of "Approved" or "Rejected"
    And they must provide comments explaining the decision
    And I take a screenshot as evidence

  # RBT: Scenario 4 - Approved request allows requester to update Account Status
  @SF-759 @SF-759-UI-004 @p1 @rbt @approved-update
  Scenario: Approved request allows requester to update Account Status
    Given a governance request has been approved
    When the approval is recorded
    Then the requesting user must be permitted to update the Account Status to the originally requested value
    And the system must record the approval and applied change
    And I take a screenshot as evidence

  # RBT: Scenario 5 - Rejected request leaves Account Status unchanged
  @SF-759 @SF-759-UI-005 @p1 @rbt @rejected-unchanged
  Scenario: Rejected request leaves Account Status unchanged
    Given a governance request has been rejected
    When the rejection is recorded
    Then the Account Status must remain unchanged
    And the rejection reason must be stored
    And the requesting user must be notified of the rejection
    And I take a screenshot as evidence

  # RBT: Scenario 6 - Invalid status cannot be reversed without new Account
  @SF-759 @SF-759-UI-006 @p1 @rbt @invalid-status
  Scenario: Invalid status cannot be reversed; user must create new Account
    Given an Account has Account Status "Invalid"
    When a user attempts to change the Account Status
    Then the change must be prevented
    And the user must be informed that a new Account must be created instead
    And I take a screenshot as evidence

  # RBT: Scenario 7 - Second governance request prevented while one is pending
  @SF-759 @SF-759-UI-007 @p2 @rbt @second-request
  Scenario: User cannot submit second governance request while one is pending
    Given a governance request is Pending for the Account
    When a user attempts to submit a second governance request for the same Account
    Then the system must prevent submission
    And instruct the user to wait or withdraw the existing request
    And I take a screenshot as evidence

  # RBT: Scenario 8 - Only approved target status can be applied
  @SF-759 @SF-759-UI-008 @p2 @rbt @approved-only
  Scenario: When approval is granted only the approved target status may be applied
    Given a governance request is Approved and not yet applied
    When the requester updates Account Status
    Then only the approved target status may be selected
    And the approval must be linked to the applied change
    And I take a screenshot as evidence
