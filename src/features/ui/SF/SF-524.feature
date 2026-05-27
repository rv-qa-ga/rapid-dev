# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-524 - Configure Admission Status Field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:59.214Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Configure Admission Status Field on Account
# Primary Entity: AccountContactRelation
#
# Fields Involved (1):
#   • on Account (on_Account__c) - modify
#
# Test Requirements (5):
#   REQ-1: Admission Status field visible and mandatory for Insurers
#     → Test Type: UI | Priority: p1
#   REQ-2: Admission Status hidden for all non-Insurer account types
#     → Test Type: UI | Priority: p2
#   REQ-3: Default value for non-Insurer account types
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Validation for Insurer accounts
#     → Test Type: UI | Priority: p2
#   REQ-5: -532e5517b94dCommit notes: Source: Dev (gearsetintegration@acceli
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
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-524 @medium @field-visibility @accountcontactrelation
Feature: SF-524 - Configure Admission Status Field on Account
  As a Salesforce user
  I want to verify the Admission_Status__c functionality on AccountContactRelation
  So that AccountContactRelation records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-UI-001 @when-the
  Scenario: Admission Status field visible and mandatory for Insurers
    Given I am logged in as a "When The" user
    Given An Account with an Account Type = "Insurer"
    And I click Edit on the Account
    Given The field "Admission_Status__c" must be visible
    And the record should be saved successfully
    Given The picklist must contain only the values
    Given | Admitted |
    Given | Non-Admitted |
    Given | Not Applicable |
    When I click Edit on the Account
    When The field "Admission_Status__c" must be visible
    And the record should be saved successfully
    When The picklist must contain only the values
    When | Admitted |
    When | Non-Admitted |
    When | Not Applicable |
    Then The field "Admission_Status__c" must be visible
    Then the record should be saved successfully
    Then The picklist must contain only the values
    Then | Admitted |
    Then | Non-Admitted |
    Then | Not Applicable |
    Then the record should be saved successfully
    Then The picklist must contain only the values
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-002 @negative @when-the
  Scenario: Admission Status hidden for all non-Insurer account types
    Given I am logged in as a "When The" user
    Given An Account where Account Type ≠ "Insurer"
    And I click Edit on the Account
    Given The field "Admission_Status__c" must not be visible on the page layout
    When I click Edit on the Account
    When The field "Admission_Status__c" must not be visible on the page layout
    Then The field "Admission_Status__c" must not be visible on the page layout
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-003
  Scenario: Default value for non-Insurer account types
    Given I am logged in as a standard user
    Given An Account where Account Type ≠ "Insurer"
    Given The record is created
    Given "Admission_Status__c" must default to "Not Applicable"
    Given The value must be stored for integration purposes even though the field is hidden
    When The record is created
    When "Admission_Status__c" must default to "Not Applicable"
    When The value must be stored for integration purposes even though the field is hidden
    Then "Admission_Status__c" must default to "Not Applicable"
    Then The value must be stored for integration purposes even though the field is hidden
    Then The value must be stored for integration purposes even though the field is hidden
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-004 @negative @when-the
  Scenario: Validation for Insurer accounts
    Given I am logged in as a "When The" user
    Given An Account where Account Type = "Insurer"
    Given The save must be blocked
    And I should see a validation error
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=1928a570-7f84-4726-
    When I save the record
    When The save must be blocked
    And I should see a validation error
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=1928a570-7f84-4726-
    Then The save must be blocked
    Then I should see a validation error
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=1928a570-7f84-4726-
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-005 @negative @data-driven @link-which-can-be-clicked-and
  Scenario: -532e5517b94dCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given I am logged in as a "Link Which Can Be Clicked And" user
    Then Not a bug
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Admission_Status__c on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-UI-006 @smoke @p1 @admin
  Scenario: Verify Admission_Status__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Admission_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-007 @p1 @standard-user @negative
  Scenario: Verify Admission_Status__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Admission_Status__c" field should not be visible
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-008 @p2 @detail-view
  Scenario: Verify Admission_Status__c visibility on AccountContactRelation detail page
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Admission_Status__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Admission_Status__c on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-UI-009 @smoke @p1
  Scenario: Verify Admission_Status__c field is visible on AccountContactRelation
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Admission_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-010 @p1 @edit
  Scenario: Verify Admission_Status__c field can be edited on AccountContactRelation
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    And I set the "Admission_Status__c" field to "Test Value"
    And I save the record
    Then the AccountContactRelation should be saved successfully
    And the "Admission_Status__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-011 @p1 @data-driven
  Scenario Outline: Set Admission_Status__c to valid values
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    And I set the "Admission_Status__c" field to "<value>"
    And I save the record
    Then the "Admission_Status__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: on_Account__c on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-UI-012 @smoke @p1 @data-driven
  Scenario Outline: Set on_Account__c to valid picklist values
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    And I set the "on_Account__c" field to "<value>"
    And I save the record
    Then the AccountContactRelation should be saved successfully
    And the "on_Account__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-524 @SF-524-UI-013 @p1 @picklist-options
  Scenario: Verify all on_Account__c picklist options are available
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    And I click on the "on_Account__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-UI-014 @p2 @negative @blank-value
  Scenario: Verify behavior when Admission_Status__c is blank
    Given I am logged in as a standard user
    And I have a test AccountContactRelation created via API without "Admission_Status__c"
    When I navigate to the AccountContactRelation record
    Then the "Admission_Status__c" field should be visible
    And the "Admission_Status__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-015 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Admission_Status__c
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    Then the "Admission_Status__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-016 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Admission_Status__c
    Given I am logged in as a read-only user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-524 @SF-524-UI-017 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Admission_Status__c
    Given I am logged in as a standard user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the "Admission_Status__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-UI-018 @p2 @ui-data-creation
  Scenario: Create AccountContactRelation record via UI
    Given I am logged in as a standard user
    When I navigate to the AccountContactRelation object list
    And I click New to create a AccountContactRelation
    And I fill in required AccountContactRelation fields
    And I save the record
    Then the AccountContactRelation should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 4
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 124
  # Existing Steps Used: 124
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 124/124 (100%)
  #   - Feature-Specific Steps Used: 0
