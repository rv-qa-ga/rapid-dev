# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-671 - Head of Distribution Approval Workflow for Contracts (UK/EU New Opportunities)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-671 @rbt @medium
Feature: UI - SF-671 - Head of Distribution Approval Workflow for Contracts (UK/EU New Opportunities)
  As user
  I want to approve or reject draft contracts for UK/EU Opportunities
  So that MRDs can proceed with contracting only when internal review is complete

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity exists
    And the Opportunity.Type = New Business
    And the Opportunity is in stage "Contracting"
    And Region__c = UK or EU
    And a draft contract document is uploaded and accessible via the Opportunity
    And an approval request is sent to the Head of Distribution
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-671 @SF-671-UI-001 @p1 @rbt
  Scenario: Head of Distribution can approve the draft contract
    When the Head of Distribution approves the draft contract
    Then the system must record the decision as Approved
    And the system must notify the MRD that the draft contract has been approved
    And I take a screenshot as evidence

  @SF-671 @SF-671-UI-002 @p1 @rbt
  Scenario: Head of Distribution can reject the draft contract with mandatory comments
    When the Head of Distribution rejects the draft contract
    Then the system must require comments to be provided
    And the system must record the decision as Rejected with comments
    And the system must notify the MRD that the draft contract was rejected and requires review
    And I take a screenshot as evidence

  @SF-671 @SF-671-UI-003 @p1 @rbt
  Scenario: MRD can resubmit a rejected draft contract for approval
    Given the draft contract approval decision is Rejected
    When the MRD uploads an updated draft contract (if required) via the Opportunity
    And the MRD resubmits the draft contract for approval
    Then the system must send a new approval request to the Head of Distribution
    And the prior rejection comments must remain visible in the approval history
    And I take a screenshot as evidence

  @SF-671 @SF-671-UI-004 @p1 @rbt
  Scenario: Rejected approvals block further progression until approved
    Given the draft contract approval decision is Rejected or Pending
    When the MRD attempts to progress the Opportunity beyond stage "Contracting"
    Then the system must prevent the stage change
    And display a message indicating the draft contract must be approved
    And I take a screenshot as evidence

