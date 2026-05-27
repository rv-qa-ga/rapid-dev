# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-570 - Introduce an additional picklist value in Account.Account_Status_c
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-behavior
# Generated: 2025-12-24T19:17:45.751Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Introduce an additional picklist value in Account.Account_Status_c
# Primary Entity: Account
#
# Test Requirements (6):
#   REQ-1: Invalid value added to Account Status picklist
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Restrict who can set a record to Invalid
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Authorised users may move a record to Invalid
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Impact assessment must be confirmed before setting status to Inva
#     → Test Type: UI | Priority: p2
#   REQ-5: Governance check before invalidation
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Invalid Accounts are read-only for non-authorised users
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-570 @medium @field-behavior @read-only @account
Feature: SF-570 - Introduce an additional picklist value in Account.Account_Status_c
  As a Salesforce user
  I want to verify the Account_Status__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-001 @p1 @smoke @negative @field-behavior @create
  Scenario: Invalid value added to Account Status picklist
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I click on the "Account_Status__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-002 @p1 @negative @data-driven @field-behavior @permissions
  Scenario: Restrict who can set a record to Invalid
    Given I am logged in as a "Accelerant - Standard user" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Invalid"
    And I save the record
    Then I should see a validation error
    And I should see a validation error for "Account_Status__c"
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-003 @p1 @field-behavior
  Scenario: Authorised users may move a record to Invalid
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Invalid"
    And I save the record
    Then the Account should be saved successfully
    And the "Account_Status__c" field should display "Invalid"
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-004 @p2 @negative @authorised @field-behavior
  Scenario: Impact assessment must be confirmed before setting status to Invalid
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Invalid"
    And I save the record
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-005 @p2 @negative @field-behavior
  Scenario: Governance check before invalidation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Invalid"
    And I save the record
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-006 @p2 @negative @non-authorised @field-behavior @read-only
  Scenario: Invalid Accounts are read-only for non-authorised users
    Given I am logged in as a "Accelerant - Standard user" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Invalid"
    And I save the record
    Then the Account should be saved successfully
    When I navigate to the Account record
    Then the "Account_Status__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: Account_Status__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-007 @p1 @picklist-options
  Scenario: Verify all Account_Status__c picklist options are available
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I click on the "Account_Status__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Account_Status__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-008 @smoke @p1
  Scenario: Verify Account_Status__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Account_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-009 @p1 @edit
  Scenario: Verify Account_Status__c field can be edited on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Active"
    And I save the record
    Then the Account should be saved successfully
    And the "Account_Status__c" field should display "Active"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Account_Status__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-010 @smoke @p1
  Scenario: Verify Account_Status__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Account_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-011 @p1 @edit
  Scenario: Verify Account_Status__c field can be edited on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account_Status__c" field to "Active"
    And I save the record
    Then the Account should be saved successfully
    And the "Account_Status__c" field should display "Active"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Account_Status__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-012 @smoke @p1 @read-only
  Scenario: Verify Account_Status__c is read-only on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Account_Status__c" field should not be editable
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-013 @p1 @negative
  Scenario: Verify user cannot modify Account_Status__c after Account creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Account_Status__c" field should be read-only
    And attempting to edit the Account_Status__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-014 @p2 @negative @blank-value
  Scenario: Verify behavior when Account_Status__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API without "Account_Status__c"
    When I navigate to the Account record
    Then the "Account_Status__c" field should be visible
    And the "Account_Status__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-570 @SF-570-UI-015 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Account_Status__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-UI-016 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: Invalid value added to Account Status picklist
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Restrict who can set a record to Invalid
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Authorised users may move a record to Invalid
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Impact assessment must be confirmed before setting status to Inva
  #     → Should be tested via UI | Priority: p2
  #   REQ-5: Governance check before invalidation
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 129
  # Existing Steps Used: 129
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 129/129 (100%)
  #   - Feature-Specific Steps Used: 0
