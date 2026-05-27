# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-762 - Contract Approval to Move Account to Contracted (New Business)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-762 @rbt @medium
Feature: UI - SF-762 - Contract Approval to Move Account to Contracted (New Business)
  As MRD
  I want the Account to be prevented from moving to Contracted unless an Approved Contract exists for the related New Business Opportunity
  So that the Account and Opportunity remain in sync and an Account cannot be marked Contracted without a validated contract.

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account exists with Account Type = “Member” or “Non-Member MGA”
    And the Account is related to an Opportunity with Opportunity Type = “New Business”
    And a Contract record may exist related to the Opportunity
    And a Contract has an approval status field that can be set to “Approved”
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-762 @SF-762-UI-001 @p1 @rbt
  Scenario: Account cannot move to Contracted unless executed contract confirmation exists (New Business only)
    Given an Account exists with Account Type = “Member” or “Non-Member MGA”
    And the Account is related to an Opportunity with Opportunity Type = “New Business”
    When a user attempts to change the Account Status to “Contracted” and saves
    Then the signed contract should have been uploaded to SharePoint and is associated to the Opportunity
    And the “Post-Approval Contract” Task is marked Complete
    And if the executed contract confirmation is present, the Account Status change must be allowed
    And if the executed contract confirmation is not present, the save must be blocked
    And the user must see an error message stating:
    And I take a screenshot as evidence

  @SF-762 @SF-762-UI-002 @p1 @rbt
  Scenario: Executed contract checkpoint applies only to New Business
    Given an Account exists
    And the related Opportunity Type is not equal to “New Business”
    When a user changes the Account Status to “Contracted” and saves
    Then the system must not enforce the executed contract checkpoint described for New Business
    And I take a screenshot as evidence

  @SF-762 @SF-762-UI-003 @p1 @rbt
  Scenario: Account status alignment is enforced only at the Contracted checkpoint
    Given an Opportunity exists with Type = “New Business”
    When the Opportunity stage changes between “Pipeline”, “Due Diligence”, and “Contracting”
    Then the system must not enforce any additional Account synchronisation validations beyond the contract approval checkpoint
    And the only required Account synchronisation validation in scope is:
    And I take a screenshot as evidence

