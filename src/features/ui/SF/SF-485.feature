# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-485 - Make Functional_Currency__c mandatory for Insurer, Insurer Branch and Reinsurer
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:07:02.828Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Functional_Currency__c mandatory for Insurer, Insurer Branch and Reinsurer
# Primary Entity: Lead
#
# Fields Involved (1):
#   • Functional Currency (Functional_Currency__c) - modify
#
# Test Requirements (2):
#   REQ-1: / WHEN / THEN):UI: new record (create) → Functional_Currency__c i
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a user opens an existing Insurer, Insurer Branch or Reinsurer rec
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
#   • Insurer Branch
#   • Reinsurer
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-485 @medium @field-visibility @lead
Feature: SF-485 - Make Functional_Currency__c mandatory for Insurer, Insurer Branch and Reinsurer
  As a Salesforce user
  I want to verify the Functional_Currency__c functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-UI-001 @negative @data-driven @given-a
  Scenario: Scenario 1
    Given I am logged in as a "Given A" user
    Given UI: new record (create)
    Given A user attempts to create a new Insurer, Insurer Branch or Reinsurer record (via UI)
    When Functional_Currency__c is blank on save
    Then The save is blocked
    And I click Edit on the Account
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-002 @negative @data-driven @admin
  Scenario: Scenario 2
    Given I am logged in as a "Admin" user
    When They attempt to clear or blank Functional_Currency__c
    Then I should see a validation error
    Then Account Sub-Type = Insurer BranchWhen Account Type = Reinsurer
    Then Also created a validation rule
    Then Component NameComponent TypeModification TypeAccelerant_Agency_Lightning_Account_Record_PageFlexipageModifyAccelerant_Insurer_Lightning_Account_Record_PageFlexipageModifyAccelerant_Member_Lightning_Account_Record_PageFlexipageModifyAccelerant_Other_Lightning_Account_Record_PageFlexipageModifyAccelerant_Reinsurer_Lightning_Account_Record_PageFlexipageModifyFunctional_Currency_RequiredValidation RuleCreate
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=045a00c9-a176-43a2-90b5-9ed74c81be19Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Account object list
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Functional_Currency__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-UI-003 @smoke @p1 @admin
  Scenario: Verify Functional_Currency__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Functional_Currency__c" field should be visible
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-004 @p1 @standard-user @negative
  Scenario: Verify Functional_Currency__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Functional_Currency__c" field should not be visible
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-005 @p2 @detail-view
  Scenario: Verify Functional_Currency__c visibility on Lead detail page
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Functional_Currency__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Functional_Currency__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-UI-006 @smoke @p1
  Scenario: Verify Functional_Currency__c field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Functional_Currency__c" field should be visible
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-007 @p1 @edit
  Scenario: Verify Functional_Currency__c field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Functional_Currency__c" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Functional_Currency__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-008 @p1 @data-driven
  Scenario Outline: Set Functional_Currency__c to valid values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Functional_Currency__c" field to "<value>"
    And I save the record
    Then the "Functional_Currency__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Insurer Branch |
      | Reinsurer |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Functional_Currency__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-UI-009 @smoke @p1 @read-only
  Scenario: Verify Functional_Currency__c is read-only on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Functional_Currency__c" field should not be editable
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-010 @p1 @negative
  Scenario: Verify user cannot modify Functional_Currency__c after Lead creation
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Functional_Currency__c" field should be read-only
    And attempting to edit the Functional_Currency__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when Functional_Currency__c is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "Functional_Currency__c"
    When I navigate to the Lead record
    Then the "Functional_Currency__c" field should be visible
    And the "Functional_Currency__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-012 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Functional_Currency__c
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Functional_Currency__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Functional_Currency__c
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-485 @SF-485-UI-014 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Functional_Currency__c
    Given I am logged in as a standard user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the "Functional_Currency__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-UI-015 @p2 @ui-data-creation
  Scenario: Create Lead record via UI
    Given I am logged in as a standard user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: / WHEN / THEN):UI: new record (create) → Functional_Currency__c i
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 78
  # Existing Steps Used: 78
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 78/78 (100%)
  #   - Feature-Specific Steps Used: 0
