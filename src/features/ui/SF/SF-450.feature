# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-450 -  Party code - only required for particular party Types
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-01-08T19:36:11.715Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 3
# Description: Generator Only - Full automatic generation from Jira data (current behavior)
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: All other users must be able to view but not enter, change or clear the Party Code.
# Primary Entity: Order
#
# Fields Involved (2):
#   • Member (Member__c) - show
#   • Insurer Branch (Insurer_Branch__c) - show
#
# Test Requirements (8):
#   REQ-1: Verify "Member" is visible on Order page layout for all Account T
#     → Test Type: UI | Priority: p1
#   REQ-2: Verify "Insurer Branch" is visible on Order page layout for all A
#     → Test Type: UI | Priority: p1
#   REQ-3: Party Code is mandatory for specified Party Types and Statuses
#     → Test Type: BOTH | Priority: p1
#   REQ-4: Party Code is mandatory for Reinsurers with Owned Ownership
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Party Code optional for other Party Types and Statuses
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Party Code not allowed for Legal Entities
#     → Test Type: UI | Priority: p2
#   REQ-7: Party Code cannot be modified once entered
#     → Test Type: UI | Priority: p2
#   REQ-8: Party Code must be unique and follow a 4-character alphanumeric f
#     → Test Type: UI | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-450 @medium @order
Feature: SF-450 -  Party code - only required for particular party Types
  As a Salesforce user
  I want to verify the Party_Code__c functionality on Order
  So that Order records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-UI-001 @p1 @smoke @negative @party-code-to-be-entered-the @validation-rule
  Scenario: Party Code is mandatory for specified Party Types and Statuses
    Given I am logged in as a "Party Code To Be Entered The" user
    Given The Party Type is one of the following
    Given | Member | Non-Member MGA | Insurer | Insurer Branch | Group |
    Given The Status is either "Active" or "Onboarding"
    And I save the record
    Given The system must require a Party Code to be entered
    When I save the record
    When The system must require a Party Code to be entered
    When I save the record
    Then The system must require a Party Code to be entered
    And I save the record
    Then The Status is either "Active" or "Onboarding"
    And I save the record
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-002 @p1 @negative @party-code-to-be-entered-the @validation-rule
  Scenario: Party Code is mandatory for Reinsurers with Owned Ownership
    Given I am logged in as a "Party Code To Be Entered The" user
    Given The Party Type is "Reinsurer"
    Given The Ownership is "Owned"
    And I save the record
    Given The system must require a Party Code to be entered
    When I save the record
    When The system must require a Party Code to be entered
    When I save the record
    Then The system must require a Party Code to be entered
    And I save the record
    Then The Ownership is "Owned"
    And I save the record
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-003 @p1 @positive @party-code-then-the-system-should-allow-the-party-code-to-be-entered-the @validation-rule
  Scenario: Party Code optional for other Party Types and Statuses
    Given I am logged in as a "Party Code Then The System Should Allow The Party Code To Be Entered The" user
    Given The Party Type is not one of the specified types
    Given Or the Status is not "Active" or "Onboarding"
    Given Or the Party Type is "Reinsurer"
    Given Ownership is not "Owned"
    Given The user enters a Party Code
    Given The system should allow the Party Code to be entered
    When The user enters a Party Code
    When The system should allow the Party Code to be entered
    When I save the record
    Then The system should allow the Party Code to be entered
    And I save the record
    Then Ownership is not "Owned"
    And I save the record
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-004 @p2 @negative @legal-entity-when-the @validation-rule
  Scenario: Party Code not allowed for Legal Entities
    Given I am logged in as a "Legal Entity When The" user
    Given The Party represents a Legal Entity
    Given The user attempts to enter a Party Code
    Given The system must prevent the user from entering a Party Code
    Given Display a validation message indicating that Legal Entities cannot have Party Codes
    When The user attempts to enter a Party Code
    When The system must prevent the user from entering a Party Code
    When Display a validation message indicating that Legal Entities cannot have Party Codes
    Then The system must prevent the user from entering a Party Code
    Then Display a validation message indicating that Legal Entities cannot have Party Codes
    Then Display a validation message indicating that Legal Entities cannot have Party Codes
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-005 @p2 @negative @party-record-already-has-a-party-code-value-when-any @validation-rule
  Scenario: Party Code cannot be modified once entered
    Given I am logged in as a "Party Record Already Has A Party Code Value When Any" user
    Given A Party record already has a Party Code value
    Given Any user attempts to edit the Party Code field
    Given The system must prevent the change
    When Any user attempts to edit the Party Code field
    When The system must prevent the change
    Then The system must prevent the change
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-006 @p2 @negative @data-driven @party-code-when-the @validation-rule
  Scenario: Party Code must be unique and follow a 4-character alphanumeric format
    Given I am logged in as a "Party Code When The" user
    Given The user enters a Party Code
    And I save the record
    Given The system must validate that
    Given - The Party Code is exactly 4 characters long
    Given - The Party Code contains only alphanumeric characters (letters
    Given Numbers)
    Given - The Party Code value does not already exist on any other Party record
    Given If any of these conditions are not met
    Given The system must prevent saving the record
    When I save the record
    When The system must validate that
    When - The Party Code is exactly 4 characters long
    When - The Party Code contains only alphanumeric characters (letters
    When Numbers)
    When - The Party Code value does not already exist on any other Party record
    When If any of these conditions are not met
    When The system must prevent saving the record
    And I should see a validation error
    When Also as a note Party Code is an example of one the fields we will need to have strict permissions around so only certain users can populate this field
    Then The system must validate that
    Then - The Party Code is exactly 4 characters long
    Then - The Party Code contains only alphanumeric characters (letters
    Then Numbers)
    Then - The Party Code value does not already exist on any other Party record
    Then If any of these conditions are not met
    Then The system must prevent saving the record
    Then I should see a validation error
    Then Also as a note Party Code is an example of one the fields we will need to have strict permissions around so only certain users can populate this field
    Then Numbers)
    Then If any of these conditions are not met
    Then I should see a validation error
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Member__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-UI-007 @smoke @p1
  Scenario: Verify Member__c field is visible on Order
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Member__c" field should be visible
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-008 @p1 @edit
  Scenario: Verify Member__c field can be edited on Order
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    And I set the "Member__c" field to "Test Value"
    And I save the record
    Then the Order should be saved successfully
    And the "Member__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Party_Code__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-UI-009 @smoke @p1
  Scenario: Verify Party_Code__c field is visible on Order
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Party_Code__c" field should be visible
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-010 @p1 @edit
  Scenario: Verify Party_Code__c field can be edited on Order
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    And I set the "Party_Code__c" field to "Test Value"
    And I save the record
    Then the Order should be saved successfully
    And the "Party_Code__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 2 field(s) on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-UI-011 @smoke @p1 @admin
  Scenario: Verify "Member" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Order object list
    And I click New to create a Order
    Then the "Member" field should be visible
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-012 @p2 @edit-form
  Scenario: Verify "Member" is visible on Order edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "Member" field should be visible
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-013 @smoke @p1 @admin
  Scenario: Verify "Insurer Branch" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Order object list
    And I click New to create a Order
    Then the "Insurer Branch" field should be visible
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-014 @p2 @edit-form
  Scenario: Verify "Insurer Branch" is visible on Order edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "Insurer Branch" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-UI-015 @p2 @negative @blank-value
  Scenario: Verify behavior when Party_Code__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Order created via API without "Party_Code__c"
    When I navigate to the Order record
    Then the "Party_Code__c" field should be visible
    And the "Party_Code__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-450 @SF-450-UI-016 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Party_Code__c
    Given I am logged in as a read-only user
    And I have a test Order created via API
    When I navigate to the Order record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-UI-017 @p2 @ui-data-creation
  Scenario: Create Order record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Order object list
    And I click New to create a Order
    And I fill in required Order fields
    And I save the record
    Then the Order should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 8
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (8):
  #   REQ-1: Verify "Member" is visible on Order page layout for all Account T
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: Verify "Insurer Branch" is visible on Order page layout for all A
  #     → Should be tested via UI | Priority: p1
  #   REQ-3: Party Code is mandatory for specified Party Types and Statuses
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: Party Code is mandatory for Reinsurers with Owned Ownership
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Party Code optional for other Party Types and Statuses
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: Party Code not allowed for Legal Entities
  #     → Should be tested via UI | Priority: p2
  #   REQ-7: Party Code cannot be modified once entered
  #     → Should be tested via UI | Priority: p2
  #   REQ-8: Party Code must be unique and follow a 4-character alphanumeric f
  #     → Should be tested via UI | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 163
  # Existing Steps Used: 163
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 163/163 (100%)
  #   - Feature-Specific Steps Used: 0
