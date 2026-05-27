# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-567 - Default Value for Data Source Claims and Written
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: general
# Generated: 2025-12-24T19:08:07.107Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Default Value for Data Source Claims and Written
# Primary Entity: Account
#
# Test Requirements (5):
#   REQ-1: Written Data Source defaults to VIPR for onboarding Accounts
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Claims Data Source defaults to VIPR for onboarding Accounts
#     → Test Type: BOTH | Priority: p2
#   REQ-3: User-entered values must override the default
#     → Test Type: BOTH | Priority: p2
#   REQ-4: No defaulting outside onboarding status
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Defaulting supports mandatory conditions
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

@ui @salesforce @SF-567 @medium @account
Feature: SF-567 - Default Value for Data Source Claims and Written
  As a Salesforce user
  I want to verify the Data_Source_Written__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-UI-001 @p1 @smoke @positive @general
  Scenario: Written Data Source defaults to VIPR for onboarding Accounts
    Given I am logged in as a "Accelerant - System administrator" user
    Given An Account with Status__c = "Onboarding"
    Given The field "Data_Source_Written__c" is blank
    And the Account should be saved successfully
    Given "Data_Source_Written__c" must default to "VIPR"
    And the Account should be saved successfully
    When "Data_Source_Written__c" must default to "VIPR"
    Then "Data_Source_Written__c" must default to "VIPR"
    Then The field "Data_Source_Written__c" is blank
    And I take a screenshot as evidence

  @SF-567 @SF-567-UI-002 @p1 @positive @general
  Scenario: Claims Data Source defaults to VIPR for onboarding Accounts
    Given I am logged in as a "Accelerant - System administrator" user
    Given An Account with Status__c = "Onboarding"
    Given The field "Data_Source_Claims__c" is blank
    And the Account should be saved successfully
    Given "Data_Source_Claims__c" must default to "VIPR"
    And the Account should be saved successfully
    When "Data_Source_Claims__c" must default to "VIPR"
    Then "Data_Source_Claims__c" must default to "VIPR"
    Then The field "Data_Source_Claims__c" is blank
    And I take a screenshot as evidence

  @SF-567 @SF-567-UI-003 @p1 @negative @when-a @general
  Scenario: User-entered values must override the default
    Given I am logged in as a "When A" user
    Given An Account has Status__c = "Onboarding"
    Given A user selects a value in Data_Source_Written__c or Data_Source_Claims__c
    And the record should be saved successfully
    Given The user-selected value must be kept
    Given The default value "VIPR" must not override it
    When A user selects a value in Data_Source_Written__c or Data_Source_Claims__c
    And the record should be saved successfully
    When The user-selected value must be kept
    When The default value "VIPR" must not override it
    Then The user-selected value must be kept
    Then The default value "VIPR" must not override it
    Then the record should be saved successfully
    Then The default value "VIPR" must not override it
    And I take a screenshot as evidence

  @SF-567 @SF-567-UI-004 @p2 @positive @general
  Scenario: No defaulting outside onboarding status
    Given I am logged in as a "Accelerant - System administrator" user
    Given An Account is not in Onboarding status
    Given The Data Source fields are blank
    Given No default value must be applied
    Given The fields must remain blank until populated manually
    When The Data Source fields are blank
    When No default value must be applied
    When The fields must remain blank until populated manually
    Then No default value must be applied
    Then The fields must remain blank until populated manually
    Then The fields must remain blank until populated manually
    And I take a screenshot as evidence

  @SF-567 @SF-567-UI-005 @p2 @positive @data-driven @general
  Scenario: Defaulting supports mandatory conditions
    Given I am logged in as a "Accelerant - System administrator" user
    Given An Account Type
    Given Status combination requires a Data Source value (e.g. Member + Onboarding, or TPA + Onboarding)
    Given The Data Source field is blank
    Given The field must default to VIPR
    Given The onboarding mandatory requirement must be satisfied through this defaulting
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=48909c73-d35f-4795-a353-a9cf0b4558dbCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given Target: accelins / Salesforce_Devops / /Default-Value-for-Data-Source-Claims-and-WrittenDifference TypeMetadata TypeNameNewFlowAccount_Status_Onboarding
    Given :check_mark: Successfully merged PR #89 from gs-pipeline/SF-567/Default-Value-for-Data-Source-Claims-and-Written_-_QA into QA
    When The Data Source field is blank
    When The field must default to VIPR
    When The onboarding mandatory requirement must be satisfied through this defaulting
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=48909c73-d35f-4795-a353-a9cf0b4558dbCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When Target: accelins / Salesforce_Devops / /Default-Value-for-Data-Source-Claims-and-WrittenDifference TypeMetadata TypeNameNewFlowAccount_Status_Onboarding
    When :check_mark: Successfully merged PR #89 from gs-pipeline/SF-567/Default-Value-for-Data-Source-Claims-and-Written_-_QA into QA
    Then The field must default to VIPR
    Then The onboarding mandatory requirement must be satisfied through this defaulting
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=48909c73-d35f-4795-a353-a9cf0b4558dbCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Default-Value-for-Data-Source-Claims-and-WrittenDifference TypeMetadata TypeNameNewFlowAccount_Status_Onboarding
    Then :check_mark: Successfully merged PR #89 from gs-pipeline/SF-567/Default-Value-for-Data-Source-Claims-and-Written_-_QA into QA
    Then Status combination requires a Data Source value (e.g. Member + Onboarding, or TPA + Onboarding)
    Then The onboarding mandatory requirement must be satisfied through this defaulting
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Data_Source_Written__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-UI-006 @smoke @p1
  Scenario: Verify Data_Source_Written__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should be visible
    And I take a screenshot as evidence

  @SF-567 @SF-567-UI-007 @p1 @edit
  Scenario: Verify Data_Source_Written__c field can be edited on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Data_Source_Written__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Data_Source_Written__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when Data_Source_Written__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API without "Data_Source_Written__c"
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should be visible
    And the "Data_Source_Written__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-567 @SF-567-UI-009 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Data_Source_Written__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-UI-010 @p2 @ui-data-creation
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
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: Written Data Source defaults to VIPR for onboarding Accounts
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Claims Data Source defaults to VIPR for onboarding Accounts
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: User-entered values must override the default
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: No defaulting outside onboarding status
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 79
  # Existing Steps Used: 79
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 79/79 (100%)
  #   - Feature-Specific Steps Used: 0
