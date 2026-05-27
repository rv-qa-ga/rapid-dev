# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-726 - Member and Non - Member MGA Account lifecycle and governance
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-726 @rbt @medium
Feature: UI - SF-726 - Member and Non - Member MGA Account lifecycle and governance
  As MRD
  I want Member and Non-Member MGA Account Status values to support a flexible but controlled lifecycle
  So that Accounts can progress (or be corrected) without unnecessary restrictions, while protecting downstream integrations and enforcing governance once an Account is operational.

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account record exists with Account Type = "Member" or "Non-Member MGA"
    And the available Account Status values for these Account Types are:
    And Accounts may be created directly in Salesforce or via Lead Conversion
    And the system enforces validation rules required for each lifecycle stage.
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726 @SF-726-UI-001 @p1 @rbt
  Scenario: Accounts created via Lead Conversion must default to Prospect
    Given a Lead is being converted into an Account
    And the Type is "Member" or "Non - Member MGA"
    When the Account is created by Lead Conversion
    Then the Account Status must be set to "Prospect" by default
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-002 @p1 @rbt
  Scenario: Accounts do not have to originate from a Lead
    Given a user is creating an Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user saves the Account
    Then the Account must be allowed to be created without an associated Lead
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-003 @p1 @rbt
  Scenario: Account can be created directly as Prospect
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user creates the Account
    Then the Account Status should default to ‘Prospect’
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-004 @p1 @rbt
  Scenario: Account can be created directly as Onboarding if Prospect validations are met
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user sets Account Status to "Onboarding" and saves
    Then the system must enforce all validation rules required for Accounts in status "Prospect"
    And if the Prospect validations are satisfied, the Account must be created successfully with Account Status = "Onboarding"
    And if the Prospect validations are not satisfied, the save must be blocked with the relevant validation error message(s)
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-005 @p1 @rbt
  Scenario: Account can be created directly as Contracted if Prospect and Onboarding validations are met
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user sets Account Status to "Contracted" and saves
    Then the system must enforce all validation rules required for Accounts in status "Prospect"
    Then the system must enforce all validation rules required for Accounts in status "Onboarding"
    And if the Onboarding validations are satisfied, the Account must be created successfully with Account Status = "Contracted"
    And if the Onboarding validations are not satisfied, the save must be blocked with the relevant validation error message(s)
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-006 @p1 @rbt
  Scenario: Account can be created directly as Active if Prospect and Onboarding and Contracted validations are met
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user sets Account Status to "Active" and saves
    Then the system must enforce all validation rules required for Accounts in status "Prospect"
    Then the system must enforce all validation rules required for Accounts in status "Onboarding"
    And the system must enforce all validation rules required for Accounts in status "Contracted"
    And if all validations are satisfied, the Account must be created successfully with Account Status = "Active"
    And if any validations are not satisfied, the save must be blocked with the relevant validation error message(s)
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-007 @p1 @rbt
  Scenario: Prospect can move directly to Contracted if Onboarding validations are met
    Given an Account exists with Account Status = “Prospect”
    When a user updates the Account Status to “Contracted” and saves
    Then the system must enforce all Onboarding validation requirements
    And if the Onboarding validations are met, the Account must be saved successfully
    And if the Onboarding validations are not met, the save must be blocked with relevant validation messages
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-008 @p1 @rbt
  Scenario: Prospect can move directly to Active if Onboarding and Contracted validations are met
    Given an Account exists with Account Status = “Prospect”
    When a user updates the Account Status to “Active” and saves
    Then the system must enforce all Onboarding validation requirements
    And the system must enforce all Contracted validation requirements
    And if all validations are met, the Account must be saved successfully
    And if any validations are not met, the save must be blocked with relevant validation messages
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-009 @p1 @rbt
  Scenario: Onboarding can move directly to Active if Contracted validations are met
    Given an Account exists with Account Status = “Onboarding”
    When a user updates the Account Status to “Active” and saves
    Then the system must enforce all Contracted validation requirements
    And if the Contracted validations are met, the Account must be saved successfully
    And if the Contracted validations are not met, the save must be blocked with relevant validation messages
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-010 @p1 @rbt
  Scenario: Users can freely move from Onboarding back to Prospect
    Given an Account exists with Account Status = “Onboarding”
    When a user updates the Account Status to “Prospect” and saves
    Then the Account must be saved successfully
    And no Data Governance approval must be required
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-011 @p1 @rbt
  Scenario: Runoff requires prior Active status
    Given an Account exists
    And the Account Status is not “Active”
    When a user attempts to set Account Status to “Runoff” and save
    Then the save must be blocked
    And the user must see an error message stating:
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-012 @p1 @rbt
  Scenario: Offboarded requires prior Runoff status
    Given an Account exists
    And the Account Status is not “Runoff”
    When a user attempts to set Account Status to “Offboarded” and save
    Then the save must be blocked
    And the user must see an error message stating:
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-013 @p1 @rbt
  Scenario: Moving backwards from Contracted or later requires Data Governance approval and a reason
    Given an Account exists with an Account Type ‘Member’ or ‘Non - Member MGA’
    And the Account Status is “Contracted” or “Active” or “Runoff” or “Offboarded”
    When a user attempts to change Account Status to any earlier lifecycle status
    Then this requires data team approval and is covered by [https://accelins.atlassian.net/browse/SF-759|https://accelins.atlassian.net/browse/SF-759|smart-link]
    And I take a screenshot as evidence

  @SF-726 @SF-726-UI-014 @p1 @rbt
  Scenario: Moving an Account to Invalid requires Data Team sign-off and a reason
    Given an Account exists with any Account Type
    When a user attempts to change Account Status to “Invalid”
    Then this requires data team sign off and is covered in [https://accelins.atlassian.net/browse/SF-759|https://accelins.atlassian.net/browse/SF-759]
    And I take a screenshot as evidence

