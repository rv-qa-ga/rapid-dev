# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-944 - Contract Renewal - Compliance Approval
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-944 @rbt @medium
Feature: UI - SF-944 - Contract Renewal - Compliance Approval
  As MRD
  I want the compliance team to provide Approval when a new contract renewal opportunity is moved to the Due Diligence stage
  So that they can validate the new contract

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an existing Account exists in Salesforce
    And an MRD can create an Opportunity against an existing Account
    And the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Due Diligence’ stage
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-944 @SF-944-UI-001 @p1 @rbt
  Scenario: Compliance Team should receive a notification requesting their Approval of the Draft Contract Renewal
    Given an Opportunity is in the ‘Due Diligence’ stage
    And the MRD has uploaded a Draft Contract Renewal
    Then the system must send the approval request to the Compliance team and say ‘Please review this Draft Contact’ with a link to the Opportunity
    And I take a screenshot as evidence

  @SF-944 @SF-944-UI-002 @p1 @rbt
  Scenario: Notification is not sent unless ‘Contract Renewal’ Expansion Opportunity is in the Due Diligence stage
    Given the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is *NOT* in the ‘Due Diligence’ stage
    Then the Approval Notification should *NOT* be sent
    And I take a screenshot as evidence

  @SF-944 @SF-944-UI-003 @p1 @rbt
  Scenario: Compliance Team member Approves the Contract Renewal
    Given a Compliance Team member reviews the ‘Draft Contract Renewal’
    When a Compliance Team member Approves
    Then the system must record the decision as Approved
    And the system must record which compliance team member Approves
    And the system must record the date of Approval
    And the system must notify the MRD that the draft contract has been Approved –{color:#4c9aff} email and SF{color}
    And I take a screenshot as evidence

  @SF-944 @SF-944-UI-004 @p1 @rbt
  Scenario: Approved Contract Renewals allows progression to Contracting
    Given a Compliance Team member Approves the Contract Renewal
    When a user attempts to move the Opportunity to Contracting
    Then the stage change must be allowed
    And I take a screenshot as evidence

  @SF-944 @SF-944-UI-005 @p1 @rbt
  Scenario: Compliance Team member Rejects the Draft Contract Renewal Contract
    Given a Compliance Team member reviews the ‘Draft Contract Renewal’
    When the Compliance Team member Rejects
    Then the system must require comments to be provided
    And the system must record the decision as Rejected with comments
    And the system must record which compliance team member rejects
    And the system must record the date of rejection
    And the system must notify the MRD that the draft contract was rejected and requires review
    And I take a screenshot as evidence

  @SF-944 @SF-944-UI-006 @p1 @rbt
  Scenario: MRD can resubmit a rejected draft contract for approval
    Given the draft contract approval decision is Rejected
    When the MRD uploads an updated draft contract (if required) via the Opportunity
    And the MRD resubmits the draft contract for approval
    Then the system must send a new approval request to the Compliance team
    And the prior rejection comments must remain visible in the approval history
    And I take a screenshot as evidence

  @SF-944 @SF-944-UI-007 @p1 @rbt
  Scenario: Rejected approvals block further progression until approved
    Given the draft contract approval decision is Rejected or Pending
    When the MRD attempts to progress the Opportunity beyond stage "Contracting"
    Then the system must prevent the stage change
    And display a message indicating the draft contract must be approved
    And I take a screenshot as evidence

