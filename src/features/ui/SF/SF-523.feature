# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-523 - Hide Account Fields
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-08T19:38:10.271Z (FeatureGenerator v3.1)
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
# Overview: Hide Account Fields
# Primary Entity: Account
#
# Fields Involved (1):
#   • Account Fields (Account_Fields__c) - hide
#
# Account Types Involved (17):
#   • Acquisition Company
#   • Agency
#   • Agency Branch
#   • Distribution Partner
#   • Group
#   • Insurer
#   • Insurer Branch
#   • Legal Entity
#   • Member
#   • Non-Member MGA
#   • Placing Broker
#   • Reinsurance Broker
#   • Reinsurer
#   • Reinsurer Branch
#   • Service Company
#   • Third Party Administrator (TPA)
#   • TPA Group
#
# Test Requirements (5):
#   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
#     → Test Type: UI | Priority: p1
#   REQ-2: Verify "Account Fields" is hidden on Account page layout (for all
#     → Test Type: UI | Priority: p2
#   REQ-3: Hide fields from all Account Types
#     → Test Type: BOTH | Priority: p1
#   REQ-4: Prevent population of fields
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Remove references to fields in automation or reporting
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-523 @medium @field-visibility @account
Feature: SF-523 - Hide Account Fields
  As a Salesforce user
  I want to verify the First_Written_Premium_Date__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-UI-001 @p1 @smoke @negative @data-driven @currencyisocode-exist-in-salesforce-account-object-when-page-layouts-are-reviewed-then-these-fields-must-be-removed-from-all-page-layouts-across-all-account-types @field-visibility
  Scenario: Hide fields from all Account Types
    Given I am logged in as a "Currencyisocode Exist In Salesforce Account Object When Page Layouts Are Reviewed Then These Fields Must Be Removed From All Page Layouts Across All Account Types" user
    Given The fields First_Written_Premium_Date__c, Reinsurance_Arrangements__c
    Given FOS_FSCS_Exposure__c, CurrencyIsoCode exist in Salesforce Account object
    Given Page layouts are reviewed
    Given These fields must be removed from all page layouts across all Account types
    Given Users must not be able to view or edit them in the user interface
    When Page layouts are reviewed
    When These fields must be removed from all page layouts across all Account types
    When Users must not be able to view or edit them in the user interface
    Then These fields must be removed from all page layouts across all Account types
    Then Users must not be able to view or edit them in the user interface
    Then FOS_FSCS_Exposure__c, CurrencyIsoCode exist in Salesforce Account object
    Then Users must not be able to view or edit them in the user interface
    And I take a screenshot as evidence

  @SF-523 @SF-523-UI-002 @p1 @negative @data-driven @qa-mrd-user @field-visibility
  Scenario: Prevent population of fields
    Given I am logged in as a "QA MRD User" user
    Given The fields are no longer in use
    Given The fields First_Written_Premium_Date__c, Reinsurance_Arrangements__c
    Given FOS_FSCS_Exposure__c, CurrencyIsoCode must not be populated
    Given No automation, integration, or user action should insert or update values in these fields
    When The fields First_Written_Premium_Date__c, Reinsurance_Arrangements__c
    When FOS_FSCS_Exposure__c, CurrencyIsoCode must not be populated
    When No automation, integration, or user action should insert or update values in these fields
    Then The fields First_Written_Premium_Date__c, Reinsurance_Arrangements__c
    Then FOS_FSCS_Exposure__c, CurrencyIsoCode must not be populated
    Then No automation, integration, or user action should insert or update values in these fields
    Then FOS_FSCS_Exposure__c, CurrencyIsoCode must not be populated
    Then No automation, integration, or user action should insert or update values in these fields
    And I take a screenshot as evidence

  @SF-523 @SF-523-UI-003 @p1 @negative @data-driven @field-visibility
  Scenario: Remove references to fields in automation or reporting
    Given I am logged in as a "Accelerant - System administrator" user
    Given The fields are hidden
    Given Must no longer be used
    Given Reviewing validation rules, formulas, flows
    Given Reports
    Given Any references to these fields must be removed or deactivated
    Given No errors should occur as a result of their removal from layouts
    Given Missing to deploy through Gearset (fields removal but not existent in target branch)
    Given Ready for QA
    When Reviewing validation rules, formulas, flows
    When Reports
    When Any references to these fields must be removed or deactivated
    When No errors should occur as a result of their removal from layouts
    When Missing to deploy through Gearset (fields removal but not existent in target branch)
    When Ready for QA
    Then Any references to these fields must be removed or deactivated
    Then No errors should occur as a result of their removal from layouts
    Then Missing to deploy through Gearset (fields removal but not existent in target branch)
    Then Ready for QA
    Then Must no longer be used
    Then Reports
    Then No errors should occur as a result of their removal from layouts
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-UI-004 @smoke @p1 @admin
  Scenario: Verify "Account_Fields__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    Then the "Account_Fields__c" field should be visible
    And I take a screenshot as evidence

  @SF-523 @SF-523-UI-005 @p1 @account-type-visibility
  Scenario Outline: Verify "Account_Fields__c" is visible for all Account Types
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I set the "Type" field to "<accountType>"
    Then the "Account_Fields__c" field should be visible
    And I take a screenshot as evidence

    Examples:
      | accountType |
      | Acquisition Company |
      | Agency |
      | Agency Branch |
      | Distribution Partner |
      | Group |
      | Insurer |
      | Insurer Branch |
      | Legal Entity |
      | Member |
      | Non-Member MGA |
      | Placing Broker |
      | Reinsurance Broker |
      | Reinsurer |
      | Reinsurer Branch |
      | Service Company |
      | Third Party Administrator (TPA) |
      | TPA Group |

  @SF-523 @SF-523-UI-006 @p2 @edit-form
  Scenario: Verify "Account_Fields__c" is visible on Account edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Account_Fields__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: First_Written_Premium_Date__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-UI-007 @smoke @p1
  Scenario: Verify First_Written_Premium_Date__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "First_Written_Premium_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-523 @SF-523-UI-008 @p1 @edit
  Scenario: Verify First_Written_Premium_Date__c field can be edited on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "First_Written_Premium_Date__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "First_Written_Premium_Date__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-UI-009 @p2 @negative @blank-value
  Scenario: Verify behavior when First_Written_Premium_Date__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API without "First_Written_Premium_Date__c"
    When I navigate to the Account record
    Then the "First_Written_Premium_Date__c" field should be visible
    And the "First_Written_Premium_Date__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-523 @SF-523-UI-010 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify First_Written_Premium_Date__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-523 @SF-523-UI-011 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to First_Written_Premium_Date__c
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "First_Written_Premium_Date__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCOUNT TYPE FIELD: Verify all 17 Account Types are available
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-UI-012 @smoke @p1 @account-type-validation
  Scenario: Verify Account Type field dropdown shows all 17 Account Types
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I click on the "Type" picklist
    Then I should see "Acquisition Company" in the "Type" field picklist
    Then I should see "Agency" in the "Type" field picklist
    Then I should see "Agency Branch" in the "Type" field picklist
    Then I should see "Distribution Partner" in the "Type" field picklist
    Then I should see "Group" in the "Type" field picklist
    Then I should see "Insurer" in the "Type" field picklist
    Then I should see "Insurer Branch" in the "Type" field picklist
    Then I should see "Legal Entity" in the "Type" field picklist
    Then I should see "Member" in the "Type" field picklist
    Then I should see "Non-Member MGA" in the "Type" field picklist
    Then I should see "Placing Broker" in the "Type" field picklist
    Then I should see "Reinsurance Broker" in the "Type" field picklist
    Then I should see "Reinsurer" in the "Type" field picklist
    Then I should see "Reinsurer Branch" in the "Type" field picklist
    Then I should see "Service Company" in the "Type" field picklist
    Then I should see "Third Party Administrator (TPA)" in the "Type" field picklist
    Then I should see "TPA Group" in the "Type" field picklist
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-UI-013 @p2 @ui-data-creation
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
  #   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: Verify "Account Fields" is hidden on Account page layout (for all
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: Hide fields from all Account Types
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: Prevent population of fields
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Remove references to fields in automation or reporting
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 121
  # Existing Steps Used: 121
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 121/121 (100%)
  #   - Feature-Specific Steps Used: 0
