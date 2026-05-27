# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-515 - Discontinued Date Field on Account
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-05T21:57:07.946Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Discontinued Date Field on Account
# Primary Entity: Account
#
# Fields Involved (1):
#   • on Account (on_Account__c) - modify
#
# Test Requirements (9):
#   REQ-1: Discontinued Date field exists on Account
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Discontinued Date visible for Active or Offboarded accounts
#     → Test Type: UI | Priority: p2
#   REQ-3: Discontinued Date hidden for non-applicable statuses
#     → Test Type: UI | Priority: p2
#   REQ-4: Discontinued Date mandatory for Offboarded accounts
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Discontinued Date optional for Active accounts
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Prevent Discontinued Date for non-applicable statuses
#     → Test Type: BOTH | Priority: p2
#   REQ-7: Discontinued Date must be on or after Onboarding Date
#     → Test Type: UI | Priority: p2
#   REQ-8: Discontinued Date must not be in the future
#     → Test Type: UI | Priority: p2
#   REQ-9: Commit succeeded: https://app.gearset.com/finished?deploymentId=a
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Date
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-515 @medium @field-visibility @account
Feature: SF-515 - Discontinued Date Field on Account
  As a Salesforce user
  I want to verify the Discontinued_Date__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-001 @p1 @smoke @positive @field-visibility @field-exists
  Scenario: Discontinued Date field exists on Account
    Given I am logged in as a "Accelerant - System administrator" user
    Given The Account object
    Given The "Discontinued_Date__c" field is created
    Given It must be of type Date
    Given It must be available on the page layouts for
    Given | Member          |
    Given | Non-Member MGA  |
    When The "Discontinued_Date__c" field is created
    When It must be of type Date
    When It must be available on the page layouts for
    When | Member          |
    When | Non-Member MGA  |
    Then It must be of type Date
    Then It must be available on the page layouts for
    Then | Member          |
    Then | Non-Member MGA  |
    Then It must be available on the page layouts for
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-002 @p1 @positive @when-the @field-visibility @visibility
  Scenario: Discontinued Date visible for Active or Offboarded accounts
    Given I am logged in as a "When The" user
    Given An Account record (Member or Non-Member MGA)
    Given Account_Status__c is either "Active" or "Offboarded"
    And I click Edit on the Account
    Given The field "Discontinued_Date__c" must be visible
    Given Editable
    When I click Edit on the Account
    When The field "Discontinued_Date__c" must be visible
    When Editable
    Then The field "Discontinued_Date__c" must be visible
    Then Editable
    Then Account_Status__c is either "Active" or "Offboarded"
    Then Editable
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-003 @p1 @negative @when-the @field-visibility
  Scenario: Discontinued Date hidden for non-applicable statuses
    Given I am logged in as a "When The" user
    Given An Account record (Member or Non-Member MGA)
    Given Account_Status__c is not "Active" or "Offboarded"
    And I click Edit on the Account
    Given The field "Discontinued_Date__c" must not be visible on the page
    When I click Edit on the Account
    When The field "Discontinued_Date__c" must not be visible on the page
    Then The field "Discontinued_Date__c" must not be visible on the page
    Then Account_Status__c is not "Active" or "Offboarded"
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-004 @p2 @positive @data-driven @when-the @field-visibility
  Scenario: Discontinued Date mandatory for Offboarded accounts
    Given I am logged in as a "When The" user
    Given An Account record (Member or Non-Member MGA)
    Given Account_Status__c = "Offboarded"
    And I save the record
    Given "Discontinued_Date__c" must be populated
    Given If blank, the save is blocked with the message
    Given "Discontinued Date is required when Status is Offboarded."
    When I save the record
    When "Discontinued_Date__c" must be populated
    When If blank, the save is blocked with the message
    When "Discontinued Date is required when Status is Offboarded."
    Then "Discontinued_Date__c" must be populated
    Then If blank, the save is blocked with the message
    Then "Discontinued Date is required when Status is Offboarded."
    Then Account_Status__c = "Offboarded"
    Then If blank, the save is blocked with the message
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-005 @p2 @positive @when-the @field-visibility
  Scenario: Discontinued Date optional for Active accounts
    Given I am logged in as a "When The" user
    Given An Account record (Member or Non-Member MGA)
    Given Account_Status__c = "Active"
    And I save the record
    Given "Discontinued_Date__c" may be populated or left blank
    When I save the record
    When "Discontinued_Date__c" may be populated or left blank
    Then "Discontinued_Date__c" may be populated or left blank
    Then Account_Status__c = "Active"
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-006 @p2 @positive @when-any @field-visibility
  Scenario: Prevent Discontinued Date for non-applicable statuses
    Given I am logged in as a "When Any" user
    Given An Account record (Member or Non-Member MGA)
    Given Account_Status__c is not "Active" or "Offboarded"
    Given Any user or integration attempts to save a value in Discontinued_Date__c
    Given The save must be blocked with the message
    Given "Discontinued Date can only be set when Status is Active or Offboarded."
    When Any user or integration attempts to save a value in Discontinued_Date__c
    When The save must be blocked with the message
    When "Discontinued Date can only be set when Status is Active or Offboarded."
    Then The save must be blocked with the message
    Then "Discontinued Date can only be set when Status is Active or Offboarded."
    Then Account_Status__c is not "Active" or "Offboarded"
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-007 @p2 @negative @c-populated-when-the @field-visibility
  Scenario: Discontinued Date must be on or after Onboarding Date
    Given I am logged in as a "C Populated When The" user
    Given An Account record has an Onboarding_Date__c populated
    Given The user enters a value in Discontinued_Date__c
    Given The Discontinued_Date__c must be greater than or equal to Onboarding_Date__c
    Given If Discontinued_Date__c is earlier than Onboarding_Date__c
    And the record should be saved successfully
    And I should see a validation error
    Given "Discontinued Date cannot be earlier than the Onboarding Date."
    When The user enters a value in Discontinued_Date__c
    When The Discontinued_Date__c must be greater than or equal to Onboarding_Date__c
    When If Discontinued_Date__c is earlier than Onboarding_Date__c
    And the record should be saved successfully
    And I should see a validation error
    When "Discontinued Date cannot be earlier than the Onboarding Date."
    Then The Discontinued_Date__c must be greater than or equal to Onboarding_Date__c
    Then If Discontinued_Date__c is earlier than Onboarding_Date__c
    Then the record should be saved successfully
    Then I should see a validation error
    Then "Discontinued Date cannot be earlier than the Onboarding Date."
    Then If Discontinued_Date__c is earlier than Onboarding_Date__c
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-008 @p2 @negative @when-the @field-visibility
  Scenario: Discontinued Date must not be in the future
    Given I am logged in as a "When The" user
    Given An Account record (Member or Non-Member MGA)
    Given Account_Status__c is either "Active" or "Offboarded"
    Given The user enters a value in Discontinued_Date__c
    Given The Discontinued_Date__c must be less than or equal to today’s date
    Given If Discontinued_Date__c is greater than today’s date
    And the record should be saved successfully
    And I should see a validation error
    Given "Discontinued Date cannot be a future date."
    Given Evidences on field creation
    When The user enters a value in Discontinued_Date__c
    When The Discontinued_Date__c must be less than or equal to today’s date
    When If Discontinued_Date__c is greater than today’s date
    And the record should be saved successfully
    And I should see a validation error
    When "Discontinued Date cannot be a future date."
    When Evidences on field creation
    Then The Discontinued_Date__c must be less than or equal to today’s date
    Then If Discontinued_Date__c is greater than today’s date
    Then the record should be saved successfully
    Then I should see a validation error
    Then "Discontinued Date cannot be a future date."
    Then Evidences on field creation
    Then Account_Status__c is either "Active" or "Offboarded"
    Then If Discontinued_Date__c is greater than today’s date
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-009 @p2 @negative @data-driven @field-visibility
  Scenario: Commit succeeded: https://app.gearset.com/finished?deploymentId=aa640dd1-917e-44fb-a8af-4cbe57acb215Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given I am logged in as a "Accelerant - System administrator" user
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Discontinued_Date__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-010 @smoke @p1
  Scenario: Verify Discontinued_Date__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-011 @p1 @edit
  Scenario: Verify Discontinued_Date__c field can be edited on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Discontinued_Date__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Discontinued_Date__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-012 @p1 @data-driven
  Scenario Outline: Set Discontinued_Date__c to valid values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Discontinued_Date__c" field to "<value>"
    And I save the record
    Then the "Discontinued_Date__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Date |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Discontinued_Date__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-013 @smoke @p1 @admin
  Scenario: Verify Discontinued_Date__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-014 @p1 @standard-user @negative
  Scenario: Verify Discontinued_Date__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should not be visible
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-015 @p2 @detail-view
  Scenario: Verify Discontinued_Date__c visibility on Account detail page
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Discontinued_Date__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-016 @smoke @p1
  Scenario: Verify Discontinued_Date__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-017 @p1 @edit
  Scenario: Verify Discontinued_Date__c field can be edited on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Discontinued_Date__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Discontinued_Date__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-018 @p1 @data-driven
  Scenario Outline: Set Discontinued_Date__c to valid values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Discontinued_Date__c" field to "<value>"
    And I save the record
    Then the "Discontinued_Date__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Date |

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: on_Account__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-019 @smoke @p1 @data-driven
  Scenario Outline: Set on_Account__c to valid picklist values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "on_Account__c" field to "<value>"
    And I save the record
    Then the Account should be saved successfully
    And the "on_Account__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Date |

  @SF-515 @SF-515-UI-020 @p1 @picklist-options
  Scenario: Verify all on_Account__c picklist options are available
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I click on the "on_Account__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-021 @p2 @negative @blank-value
  Scenario: Verify behavior when Discontinued_Date__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API without "Discontinued_Date__c"
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should be visible
    And the "Discontinued_Date__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-022 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Discontinued_Date__c
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Discontinued_Date__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-023 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Discontinued_Date__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-515 @SF-515-UI-024 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Discontinued_Date__c
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "Discontinued_Date__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-UI-025 @p2 @ui-data-creation
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
  # Total Requirements: 9
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (9):
  #   REQ-1: Discontinued Date field exists on Account
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Discontinued Date visible for Active or Offboarded accounts
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: Discontinued Date hidden for non-applicable statuses
  #     → Should be tested via UI | Priority: p2
  #   REQ-4: Discontinued Date mandatory for Offboarded accounts
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Discontinued Date optional for Active accounts
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: Prevent Discontinued Date for non-applicable statuses
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-7: Discontinued Date must be on or after Onboarding Date
  #     → Should be tested via UI | Priority: p2
  #   REQ-8: Discontinued Date must not be in the future
  #     → Should be tested via UI | Priority: p2
  #   REQ-9: Commit succeeded: https://app.gearset.com/finished?deploymentId=a
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 210
  # Existing Steps Used: 210
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 210/210 (100%)
  #   - Feature-Specific Steps Used: 0
