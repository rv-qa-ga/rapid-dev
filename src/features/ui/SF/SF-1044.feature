# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1044 - Member and Non-Member MGA Account lifecycle and governance
#       (split from SF-726; scenarios 1–3 and 10–14 exercised under SF-726)
# Related: SF-1045 - Validation rule implementation (see src/features/ui/SF/SF-1045.feature)
# Type: Story | Priority: Medium
# Feature Type: Account lifecycle stacking (UI) — scenarios 4–9
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-1044 @rbt @medium @account @lifecycle
Feature: UI - SF-1044 - Member and Non-Member MGA lifecycle (stacked validations by stage)
  As an MRD
  I want Member and Non-Member MGA Account Status transitions to enforce prior-stage validation rules
  So that Accounts can skip intermediate statuses only when all governing rules are satisfied

  Background:
    Given I am logged in as a "QA MRD User" user

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1044 — Scenarios 4–9 (stacked validations by lifecycle stage)
  # (Scenarios 1–3 and 10–14: see SF-726)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1044 @SF-1044-UI-001 @p1 @rbt @lifecycle
  Scenario: SF-1044 — Create as Onboarding enforces Prospect validations
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user sets Account Status to "Onboarding" and saves
    Then the system must enforce all validation rules required for Accounts in status "Prospect"
    And if Prospect validations are satisfied the Account is created with Status "Onboarding"
    And if Prospect validations are not satisfied the save is blocked with the relevant validation errors
    And I take a screenshot as evidence

  @SF-1044 @SF-1044-UI-002 @p1 @rbt @lifecycle
  Scenario: SF-1044 — Create as Contracted enforces Prospect and Onboarding validations
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user sets Account Status to "Contracted" and saves
    Then the system must enforce all validation rules for "Prospect" and "Onboarding"
    And if Onboarding validations are satisfied the Account is created with Status "Contracted"
    And if not the save is blocked with the relevant validation errors
    And I take a screenshot as evidence

  @SF-1044 @SF-1044-UI-003 @p1 @rbt @lifecycle
  Scenario: SF-1044 — Create as Active enforces Prospect, Onboarding, and Contracted validations
    Given a user is creating a new Account directly in Salesforce
    And the Account Type is "Member" or "Non-Member MGA"
    When the user sets Account Status to "Active" and saves
    Then the system must enforce all validation rules for "Prospect", "Onboarding", and "Contracted"
    And if all are satisfied the Account is created with Status "Active"
    And if any fail the save is blocked with the relevant validation errors
    And I take a screenshot as evidence

  @SF-1044 @SF-1044-UI-004 @p1 @rbt @lifecycle
  Scenario: SF-1044 — Prospect to Contracted enforces Onboarding validations
    Given an Account exists with Account Status "Prospect"
    When the user updates Account Status to "Contracted" and saves
    Then the system must enforce all Onboarding validation requirements
    And if Onboarding validations are met the Account is saved successfully
    And if not the save is blocked with relevant validation messages
    And I take a screenshot as evidence

  @SF-1044 @SF-1044-UI-005 @p1 @rbt @lifecycle
  Scenario: SF-1044 — Prospect to Active enforces Onboarding and Contracted validations
    Given an Account exists with Account Status "Prospect"
    When the user updates Account Status to "Active" and saves
    Then the system must enforce all Onboarding and Contracted validation requirements
    And if all are met the Account is saved successfully
    And if not the save is blocked with relevant validation messages
    And I take a screenshot as evidence

  @SF-1044 @SF-1044-UI-006 @p1 @rbt @lifecycle
  Scenario: SF-1044 — Onboarding to Active enforces Contracted validations
    Given an Account exists with Account Status "Onboarding"
    When the user updates Account Status to "Active" and saves
    Then the system must enforce all Contracted validation requirements
    And if Contracted validations are met the Account is saved successfully
    And if not the save is blocked with relevant validation messages
    And I take a screenshot as evidence
