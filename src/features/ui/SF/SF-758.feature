# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-758 - Other Account types - Lifecycle and Governance Controls
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-758 @rbt @medium
Feature: UI - SF-758 - Other Account types - Lifecycle and Governance Controls
  As Data Steward
  I want Other Account Types to follow a controlled lifecycle with clear governance triggers
  So that Accounts can progress operationally while ensuring backward movements and invalid statuses are properly reviewed and impact-assessed.

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account exists with an Account Type that is not “Member” or “Non-Member MGA”
    And the available Account Status values for these Account Types are:
    And Accounts of these types are created directly in Salesforce as Lead Conversion is out of scope for these types
    And validation rules exist for Onboarding and Active stages
    And Data Team sign-off is required when moving to Invalid or when moving backwards from governed stages
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-758 @SF-758-UI-001 @p1 @rbt
  Scenario: Account can be created directly as Prospect
    Given a user is creating a new Account
    And the Account Type is not ‘Member’ or ‘Non - Member MGA’
    When the user creates the Account
    Then the Account Status must default to “Prospect”
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-002 @p1 @rbt
  Scenario: Account can be created directly as Onboarding
    Given a user is creating a new Account
    And the Account Type is not ‘Member’ or ‘Non - Member MGA’
    When the user sets Account Status to “Onboarding” and saves
    Then the Account must be created successfully
    And all Onboarding validation rules must be enforced
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-003 @p1 @rbt
  Scenario: Account can be created directly as Active if Onboarding validations are met
    Given a user is creating a new Account
    And the Account Type is not ‘Member’ or ‘Non - Member MGA’
    When the user sets Account Status to “Active”
    Then the system must enforce all Onboarding validation requirements
    And if the validations are satisfied, the Account must be saved successfully
    And if the validations are not satisfied, the save must be blocked
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-004 @p1 @rbt
  Scenario: Block Offboarded and Invalid creation
    Given a user is creating a new Account
    When they set Status to Offboarded or Invalid
    Then the save must be blocked and instruct the user to create as Prospect or Onboarding or Active
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-005 @p1 @rbt
  Scenario: Onboarding can move freely back to Prospect
    Given an Account exists
    And Account Status = “Onboarding”
    When a user updates the Account Status to “Prospect” and saves
    Then the change must be allowed
    And no Data Governance approval must be required
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-006 @p1 @rbt
  Scenario: Moving backwards from Active or Offboarded requires governance approval
    Given an Account exists
    And the Account Type is not ‘Member’ or ‘Non - Member MGA’
    And the Account Status is "Active" or "Offboarded"
    When a user attempts to change the Account Status to any earlier lifecycle status
    Then this requires data team approval which is covered in [https://accelins.atlassian.net/browse/SF-759|https://accelins.atlassian.net/browse/SF-759|smart-link]
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-007 @p1 @rbt
  Scenario: Account must be Active before it can be Offboarded
    Given an Account exists
    And the Account Type is not ‘Member’ or ‘Non - Member MGA’
    And Account Status is not “Active”
    When a user attempts to set Account Status to “Offboarded”
    Then the change must be prevented
    And the user must see an error message stating:
    And I take a screenshot as evidence

  @SF-758 @SF-758-UI-008 @p1 @rbt
  Scenario: Moving an Account to Invalid requires Data Team sign-off
    Given an Account exists
    When a user attempts to set Account Status to “Invalid”
    Then this requires data team approval that is covered in [https://accelins.atlassian.net/browse/SF-759|https://accelins.atlassian.net/browse/SF-759|smart-link]
    And I take a screenshot as evidence

