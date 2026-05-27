# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-510 - Data Source and Effective From Fields – Visibility and Validation Rules
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:37.373Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Data Source and Effective From Fields – Visibility and Validation Rules
# Primary Entity: Account
#
# Fields Involved (2):
#   • – Visibility (–_Visibility__c) - modify
#   • Validation Rules (Validation_Rules__c) - modify
#
# Test Requirements (8):
#   REQ-1: Data_Source_Written__c field visible on all Accounts
#     → Test Type: UI | Priority: p1
#   REQ-2: Data_Source_Written__c mandatory for onboarding Members
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Data_Source_Claims__c field visible on all Accounts
#     → Test Type: UI | Priority: p2
#   REQ-4: Data_Source_Claims__c mandatory for onboarding TPAs
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Create and show Written Accounting Period Effective From field
#     → Test Type: UI | Priority: p2
#   REQ-6: Written Accounting Period Effective From required when Data Sourc
#     → Test Type: BOTH | Priority: p2
#   REQ-7: Create and show Claims Production Period Effective From field
#     → Test Type: UI | Priority: p2
#   REQ-8: Claims Production Period Effective From required when Data Source
#     → Test Type: API | Priority: p2
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

@ui @salesforce @SF-510 @medium @field-visibility @account
Feature: SF-510 - Data Source and Effective From Fields – Visibility and Validation Rules
  As a Salesforce user
  I want to verify the Data_Source_Written__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-UI-001 @account-record-of-any-type-when-the
  Scenario: Data_Source_Written__c field visible on all Accounts
    Given I am logged in as a "Account Record Of Any Type When The" user
    Given An Account record of any type
    And I click Edit on the Account
    Given The "Data_Source_Written__c" field must be visible
    When I click Edit on the Account
    When The "Data_Source_Written__c" field must be visible
    Then The "Data_Source_Written__c" field must be visible
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-002 @data-driven @when-the
  Scenario: Data_Source_Written__c mandatory for onboarding Members
    Given I am logged in as a "When The" user
    Given An Account with Account_Type__c = "Member"
    Given Status__c = "Onboarding"
    And I save the record
    Given "Data_Source_Written__c" must be populated
    Given If it is blank, the save is blocked with the message
    Given "Data Source (Written) is required when Account Type = Member
    Given Status = Onboarding."
    When I save the record
    When "Data_Source_Written__c" must be populated
    When If it is blank, the save is blocked with the message
    When "Data Source (Written) is required when Account Type = Member
    When Status = Onboarding."
    Then "Data_Source_Written__c" must be populated
    Then If it is blank, the save is blocked with the message
    Then "Data Source (Written) is required when Account Type = Member
    Then Status = Onboarding."
    Then Status__c = "Onboarding"
    Then If it is blank, the save is blocked with the message
    Then Status = Onboarding."
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-003 @account-record-of-any-type-when-the
  Scenario: Data_Source_Claims__c field visible on all Accounts
    Given I am logged in as a "Account Record Of Any Type When The" user
    Given An Account record of any type
    And I click Edit on the Account
    Given The "Data_Source_Claims__c" field must be visible
    When I click Edit on the Account
    When The "Data_Source_Claims__c" field must be visible
    Then The "Data_Source_Claims__c" field must be visible
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-004 @data-driven @when-the
  Scenario: Data_Source_Claims__c mandatory for onboarding TPAs
    Given I am logged in as a "When The" user
    Given An Account with Account_Type__c = "TPA"
    Given Status__c = "Onboarding"
    And I save the record
    Given "Data_Source_Claims__c" must be populated
    Given If it is blank, the save is blocked with the message
    Given "Data Source (Claims) is required when Account Type = TPA
    Given Status = Onboarding."
    When I save the record
    When "Data_Source_Claims__c" must be populated
    When If it is blank, the save is blocked with the message
    When "Data Source (Claims) is required when Account Type = TPA
    When Status = Onboarding."
    Then "Data_Source_Claims__c" must be populated
    Then If it is blank, the save is blocked with the message
    Then "Data Source (Claims) is required when Account Type = TPA
    Then Status = Onboarding."
    Then Status__c = "Onboarding"
    Then If it is blank, the save is blocked with the message
    Then Status = Onboarding."
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-005
  Scenario: Create and show Written Accounting Period Effective From field
    Given I am logged in as a standard user
    Given The Account object
    Given The field "Written_Accounting_Period_Effective_From__c" is created
    Given It must be of type Date
    Given Visible on all Account types
    When The field "Written_Accounting_Period_Effective_From__c" is created
    When It must be of type Date
    When Visible on all Account types
    Then It must be of type Date
    Then Visible on all Account types
    Then Visible on all Account types
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-006 @data-driven @when-the
  Scenario: Written Accounting Period Effective From required when Data Source Written = Platform
    Given I am logged in as a "When The" user
    Given An Account where "Data_Source_Written__c" = "Platform"
    And I save the record
    Given "Written_Accounting_Period_Effective_From__c" must be populated
    Given If it is blank, the save is blocked with the message
    Given "Written Accounting Period Effective From is required when Data Source (Written) = Platform."
    When I save the record
    When "Written_Accounting_Period_Effective_From__c" must be populated
    When If it is blank, the save is blocked with the message
    When "Written Accounting Period Effective From is required when Data Source (Written) = Platform."
    Then "Written_Accounting_Period_Effective_From__c" must be populated
    Then If it is blank, the save is blocked with the message
    Then "Written Accounting Period Effective From is required when Data Source (Written) = Platform."
    Then If it is blank, the save is blocked with the message
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-007
  Scenario: Create and show Claims Production Period Effective From field
    Given I am logged in as a standard user
    Given The Account object
    Given The field "Claims_Production_Period_Effective_From__c" is created
    Given It must be of type Date
    Given Visible on all Account types
    When The field "Claims_Production_Period_Effective_From__c" is created
    When It must be of type Date
    When Visible on all Account types
    Then It must be of type Date
    Then Visible on all Account types
    Then Visible on all Account types
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-008 @data-driven @into-qa-the
  Scenario: Claims Production Period Effective From required when Data Source Claims = Platform
    Given I am logged in as a "Into Qa The" user
    Given An Account where "Data_Source_Claims__c" = "Platform"
    And I save the record
    Given "Claims_Production_Period_Effective_From__c" must be populated
    Given If it is blank, the save is blocked with the message
    Given "Claims Production Period Effective From is required when Data Source (Claims) = Platform."
    And the "{fieldName}" field should not be visible or should be read-only
    Given Edit access
    Given S2: It is not Account Type but Account Record Type, please update the JIRA Also, to what PS/PSG these new fields needs access to, for now we have granted access to System Admin Profile
    Given ComponentComponent TypeClaims_Production_Period_Effective_From__cFieldWritten_Accounting_Period_Effective_From__cFieldRequired_Data_Source_WrittenValidation RuleRequired_Data_Source_ClaimsValidation RuleRequired_Claims_Prod_Period_Eff_FromValidation RuleRequired_Written_Acc_Period_Eff_FromValidation RuleAccelerant - Agency Lightning Account Record PageLightning Record PageAccelerant - Insurer Lightning Account Record PageLightning Record PageAccelerant - Member Lightning Account Record PageLightning Record PageAccelerant - Other Lightning Account Record PageLightning Record PageAccelerant - Reinsurer Lightning Account Record PageLightning Record PageAccelerant - TPA Lightning Account Record PageLightning Record PageAccount Record Page - Three ColumnLightning Record PageAccount LayoutPage Layout
    Given We filter by the Account Type
    Given Use a dynamic page to show the relevant fields. Please confirm the approach with Naveen as he has implemented this
    Given The PS/PSG are still be worked out so the System Admin Profile is fine for now
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=b4123a40-a6b7-4eff-8a9e-1c74c7070c22Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And the "Custom field" field should be visible
    Given :check_mark: Successfully merged PR #31 from gs-pipeline/SF-510/Data-Source-and-Effective-From-Fields-Visibility-and-Validation-Rules_-_QA into QA
    When I save the record
    When "Claims_Production_Period_Effective_From__c" must be populated
    When If it is blank, the save is blocked with the message
    When "Claims Production Period Effective From is required when Data Source (Claims) = Platform."
    And the "{fieldName}" field should not be visible or should be read-only
    When Edit access
    When S2: It is not Account Type but Account Record Type, please update the JIRA Also, to what PS/PSG these new fields needs access to, for now we have granted access to System Admin Profile
    When ComponentComponent TypeClaims_Production_Period_Effective_From__cFieldWritten_Accounting_Period_Effective_From__cFieldRequired_Data_Source_WrittenValidation RuleRequired_Data_Source_ClaimsValidation RuleRequired_Claims_Prod_Period_Eff_FromValidation RuleRequired_Written_Acc_Period_Eff_FromValidation RuleAccelerant - Agency Lightning Account Record PageLightning Record PageAccelerant - Insurer Lightning Account Record PageLightning Record PageAccelerant - Member Lightning Account Record PageLightning Record PageAccelerant - Other Lightning Account Record PageLightning Record PageAccelerant - Reinsurer Lightning Account Record PageLightning Record PageAccelerant - TPA Lightning Account Record PageLightning Record PageAccount Record Page - Three ColumnLightning Record PageAccount LayoutPage Layout
    When We filter by the Account Type
    When Use a dynamic page to show the relevant fields. Please confirm the approach with Naveen as he has implemented this
    When The PS/PSG are still be worked out so the System Admin Profile is fine for now
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=b4123a40-a6b7-4eff-8a9e-1c74c7070c22Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And the "Custom field" field should be visible
    When :check_mark: Successfully merged PR #31 from gs-pipeline/SF-510/Data-Source-and-Effective-From-Fields-Visibility-and-Validation-Rules_-_QA into QA
    Then "Claims_Production_Period_Effective_From__c" must be populated
    Then If it is blank, the save is blocked with the message
    Then "Claims Production Period Effective From is required when Data Source (Claims) = Platform."
    Then the "{fieldName}" field should not be visible or should be read-only
    Then Edit access
    Then S2: It is not Account Type but Account Record Type, please update the JIRA Also, to what PS/PSG these new fields needs access to, for now we have granted access to System Admin Profile
    Then ComponentComponent TypeClaims_Production_Period_Effective_From__cFieldWritten_Accounting_Period_Effective_From__cFieldRequired_Data_Source_WrittenValidation RuleRequired_Data_Source_ClaimsValidation RuleRequired_Claims_Prod_Period_Eff_FromValidation RuleRequired_Written_Acc_Period_Eff_FromValidation RuleAccelerant - Agency Lightning Account Record PageLightning Record PageAccelerant - Insurer Lightning Account Record PageLightning Record PageAccelerant - Member Lightning Account Record PageLightning Record PageAccelerant - Other Lightning Account Record PageLightning Record PageAccelerant - Reinsurer Lightning Account Record PageLightning Record PageAccelerant - TPA Lightning Account Record PageLightning Record PageAccount Record Page - Three ColumnLightning Record PageAccount LayoutPage Layout
    Then We filter by the Account Type
    Then Use a dynamic page to show the relevant fields. Please confirm the approach with Naveen as he has implemented this
    Then The PS/PSG are still be worked out so the System Admin Profile is fine for now
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=b4123a40-a6b7-4eff-8a9e-1c74c7070c22Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then the "Custom field" field should be visible
    Then :check_mark: Successfully merged PR #31 from gs-pipeline/SF-510/Data-Source-and-Effective-From-Fields-Visibility-and-Validation-Rules_-_QA into QA
    Then If it is blank, the save is blocked with the message
    Then Edit access
    Then We filter by the Account Type and use a dynamic page to show the relevant fields. Please confirm the approach with Naveen as he has implemented this
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Data_Source_Written__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-UI-009 @smoke @p1 @admin
  Scenario: Verify Data_Source_Written__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should be visible
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-010 @p1 @standard-user @negative
  Scenario: Verify Data_Source_Written__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should not be visible
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-011 @p2 @detail-view
  Scenario: Verify Data_Source_Written__c visibility on Account detail page
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Data_Source_Written__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-UI-012 @smoke @p1
  Scenario: Verify Data_Source_Written__c field is visible on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should be visible
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-013 @p1 @edit
  Scenario: Verify Data_Source_Written__c field can be edited on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Data_Source_Written__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Data_Source_Written__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-014 @p1 @data-driven
  Scenario Outline: Set Data_Source_Written__c to valid values
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Data_Source_Written__c" field to "<value>"
    And I save the record
    Then the "Data_Source_Written__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Date |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: –_Visibility__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-UI-015 @smoke @p1 @read-only
  Scenario: Verify –_Visibility__c is read-only on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "–_Visibility__c" field should not be editable
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-016 @p1 @negative
  Scenario: Verify user cannot modify –_Visibility__c after Account creation
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "–_Visibility__c" field should be read-only
    And attempting to edit the –_Visibility__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-UI-017 @p2 @negative @blank-value
  Scenario: Verify behavior when Data_Source_Written__c is blank
    Given I am logged in as a standard user
    And I have a test Account created via API without "Data_Source_Written__c"
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should be visible
    And the "Data_Source_Written__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-018 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Data_Source_Written__c
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Data_Source_Written__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-019 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Data_Source_Written__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-510 @SF-510-UI-020 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Data_Source_Written__c
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "Data_Source_Written__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-UI-021 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a standard user
    When I navigate to the Account object list
    And I click New to create a Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 7
  # Covered Requirements: 5
  # Coverage: 71%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-2: Data_Source_Written__c mandatory for onboarding Members
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Data_Source_Claims__c mandatory for onboarding TPAs
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 168
  # Existing Steps Used: 168
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 168/168 (100%)
  #   - Feature-Specific Steps Used: 0
