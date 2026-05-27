# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-726 - Member and Non-Member MGA Account Status lifecycle (Demo)
# Type: Story | Priority: Medium
# Feature Type: API - Demo feature file for SF-726 scenarios
# Description: Account Status values (Prospect, Onboarding, Contracted, Active,
#   Runoff, Offboarded, Invalid) with validation rules per lifecycle stage.
# Notes: Invalid handling governed by SF-759.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-726 @SF-726-Demo @rbt @medium @demo
Feature: API - SF-726 Demo - Member and Non-Member MGA Account Status lifecycle
  As an MRD I want Member and Non-Member MGA Account Status values to support a
  flexible but controlled lifecycle So that Accounts can progress (or be corrected)
  without unnecessary restrictions, while protecting downstream integrations.

  Background:
    Given I have a valid Salesforce API token
    And the available Account Status values for Account Type "Member" or "Non-Member MGA" are Prospect, Onboarding, Contracted, Active, Runoff, Offboarded, Invalid

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Lead Conversion defaults to Prospect
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-001 @p1 @smoke @rbt
  Scenario: API - Accounts created via Lead Conversion must default to Prospect
    Given a Lead is being converted into an Account via API
    And the Account Type is "Member" or "Non-Member MGA"
    When the Account is created by Lead Conversion
    Then the API response must indicate success
    And the Account Status in the response must be "Prospect"

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Direct creation without Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-002 @p2 @rbt
  Scenario: API - Account can be created directly without an associated Lead
    Given I create an Account via API with Type "Member" or "Non-Member MGA"
    When I save the Account without an associated Lead
    Then the API must allow the Account to be created successfully

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Direct creation as Prospect
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-003 @p1 @rbt
  Scenario: API - Account created directly defaults to Prospect
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    When I save the Account without setting Account Status
    Then the API response must indicate success
    And the Account Status in the response must be "Prospect"

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Direct creation as Onboarding (Prospect validations met)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-004 @p2 @rbt
  Scenario: API - Account can be created as Onboarding if Prospect validations are met
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    And I set Account Status to "Onboarding"
    And all validation rules required for "Prospect" are satisfied
    When I save the Account via API
    Then the API must return success
    And the Account Status in the response must be "Onboarding"

  @SF-726-Demo @SF-726-API-004b @p2 @rbt
  Scenario: API - Account creation as Onboarding blocked when Prospect validations not met
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    And I set Account Status to "Onboarding"
    And one or more Prospect validation rules are not satisfied
    When I attempt to save the Account via API
    Then the API must return a validation error
    And the response must include the relevant validation error message(s)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 5: Direct creation as Contracted (Prospect + Onboarding validations)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-005 @p2 @rbt
  Scenario: API - Account can be created as Contracted if Prospect and Onboarding validations are met
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    And I set Account Status to "Contracted"
    And all Prospect and Onboarding validation rules are satisfied
    When I save the Account via API
    Then the API must return success
    And the Account Status in the response must be "Contracted"

  @SF-726-Demo @SF-726-API-005b @p2 @rbt
  Scenario: API - Account creation as Contracted blocked when Onboarding validations not met
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    And I set Account Status to "Contracted"
    And Onboarding validations are not satisfied
    When I attempt to save the Account via API
    Then the API must return a validation error
    And the response must include the relevant validation error message(s)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 6: Direct creation as Active (all prior validations met)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-006 @p2 @rbt
  Scenario: API - Account can be created as Active if Prospect, Onboarding and Contracted validations are met
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    And I set Account Status to "Active"
    And all Prospect, Onboarding and Contracted validation rules are satisfied
    When I save the Account via API
    Then the API must return success
    And the Account Status in the response must be "Active"

  @SF-726-Demo @SF-726-API-006b @p2 @rbt
  Scenario: API - Account creation as Active blocked when any prior validations not met
    Given I create a new Account via API with Type "Member" or "Non-Member MGA"
    And I set Account Status to "Active"
    And one or more of Prospect, Onboarding or Contracted validations are not satisfied
    When I attempt to save the Account via API
    Then the API must return a validation error
    And the response must include the relevant validation error message(s)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 7: Prospect to Contracted (Onboarding validations enforced)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-007 @p2 @rbt
  Scenario: API - Prospect can move to Contracted if Onboarding validations are met
    Given an Account exists via API with Account Status "Prospect"
    And all Onboarding validation requirements are met
    When I update the Account via API to set Account Status to "Contracted"
    Then the API must return success
    And the Account Status in the response must be "Contracted"

  @SF-726-Demo @SF-726-API-007b @p2 @rbt
  Scenario: API - Prospect to Contracted blocked when Onboarding validations not met
    Given an Account exists via API with Account Status "Prospect"
    And Onboarding validations are not met
    When I attempt to update the Account via API to set Account Status to "Contracted"
    Then the API must return a validation error
    And the response must include the relevant validation message(s)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 8: Prospect to Active (Onboarding + Contracted validations)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-008 @p2 @rbt
  Scenario: API - Prospect can move to Active if Onboarding and Contracted validations are met
    Given an Account exists via API with Account Status "Prospect"
    And all Onboarding and Contracted validation requirements are met
    When I update the Account via API to set Account Status to "Active"
    Then the API must return success
    And the Account Status in the response must be "Active"

  @SF-726-Demo @SF-726-API-008b @p2 @rbt
  Scenario: API - Prospect to Active blocked when validations not met
    Given an Account exists via API with Account Status "Prospect"
    And one or more Onboarding or Contracted validations are not met
    When I attempt to update the Account via API to set Account Status to "Active"
    Then the API must return a validation error
    And the response must include the relevant validation message(s)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 9: Onboarding to Active (Contracted validations)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-009 @p2 @rbt
  Scenario: API - Onboarding can move to Active if Contracted validations are met
    Given an Account exists via API with Account Status "Onboarding"
    And all Contracted validation requirements are met
    When I update the Account via API to set Account Status to "Active"
    Then the API must return success
    And the Account Status in the response must be "Active"

  @SF-726-Demo @SF-726-API-009b @p2 @rbt
  Scenario: API - Onboarding to Active blocked when Contracted validations not met
    Given an Account exists via API with Account Status "Onboarding"
    And Contracted validations are not met
    When I attempt to update the Account via API to set Account Status to "Active"
    Then the API must return a validation error
    And the response must include the relevant validation message(s)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 10: Onboarding back to Prospect (no approval required)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-010 @p2 @rbt
  Scenario: API - Onboarding can move back to Prospect without Data Governance approval
    Given an Account exists via API with Account Status "Onboarding"
    When I update the Account via API to set Account Status to "Prospect"
    Then the API must return success
    And the Account Status in the response must be "Prospect"
    And no Data Governance approval must be required

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 11: Runoff requires prior Active status
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-011 @p2 @rbt
  Scenario: API - Runoff blocked when Account is not Active
    Given an Account exists via API with Account Status not "Active"
    When I attempt to update the Account via API to set Account Status to "Runoff"
    Then the API must return a validation error
    And the error message must state "An Account must be Active before it can move to Runoff."

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 12: Offboarded requires prior Runoff status
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-012 @p2 @rbt
  Scenario: API - Offboarded blocked when Account is not Runoff
    Given an Account exists via API with Account Status not "Runoff"
    When I attempt to update the Account via API to set Account Status to "Offboarded"
    Then the API must return a validation error
    And the error message must state "An Account must be in Runoff before it can move to Offboarded."

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 13: Moving backwards from Contracted or later requires Data Governance (SF-759)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-013 @p2 @rbt
  Scenario: API - Moving backwards from Contracted or later requires Data Governance approval (SF-759)
    Given an Account exists via API with Account Type "Member" or "Non-Member MGA"
    And the Account Status is "Contracted" or "Active" or "Runoff" or "Offboarded"
    When I attempt to update the Account via API to an earlier lifecycle status
    Then the behaviour is governed by Data Governance approval and is covered by SF-759

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 14: Moving to Invalid requires Data Team sign-off (SF-759)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-726-Demo @SF-726-API-014 @p2 @rbt
  Scenario: API - Moving Account to Invalid requires Data Team sign-off (SF-759)
    Given an Account exists via API with any Account Type
    When I attempt to update the Account via API to set Account Status to "Invalid"
    Then the behaviour requires data team sign-off and is covered by SF-759
