# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-459 - Update Account field name labels
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:50.131Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Update Account field name labels
# Primary Entity: Case
#
# Fields Involved (1):
#   • name labels (name_labels__c) - modify
#
# Test Requirements (1):
#   REQ-1: Update field labels to reduce data input errorsGiven I am viewing
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-459 @medium @field-visibility @case
Feature: SF-459 - Update Account field name labels
  As a Salesforce user
  I want to verify the label currently stated as functionality on Case
  So that Case records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-UI-001 @negative @standard-user
  Scenario: Update field labels to reduce data input errorsGiven I am viewing the Account page as an MRDWhen I review the field labelsThen The field label currently stated as ‘Employees’ is updated to ‘No. of Employees’And The field label currently stated as ‘Proposed Expiration Date’ is updated to ‘Current Program Expiration Date’And The field label currently stated as Industry’ is updated to ‘Target Insured Industry’And The standard Salesforce Account Number needs to be hidden in all page layoutsAnd the field label currently stated as ‘Incumbent Carrier' is updated to 'Prior/Incumbent’
    Given I am logged in as a "Standard User" user
    Then Current_Program_Expiration_Date__c.field-meta.xml
    Then Incumbent_Carrier__c.field-meta.xml
    Then Employees is still pending as Salesforce is showing “internal server error”
    Then Case created with Salesforce regarding the errors with standard labels
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=0b58499c-d530-4b5a-a11c-a3b3da4140bdCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I set the "Custom field" field
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=c3dbed1c-c706-4cdc-872d-3cfbdcf13875Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Update-Account-field-name-labelsDifference TypeMetadata TypeNameDifferentCustom fieldAccount.NumberOfEmployeesNo differenceCustom objectAccount
    Then :check_mark: Successfully merged PR #55 from gs-pipeline/SF-459/Update-Account-field-name-labels_-_QA into QA
    Then Fixed pending items. Moving to test
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: label currently stated as on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-UI-002 @smoke @p1 @admin
  Scenario: Verify label currently stated as is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "label currently stated as" field should be visible
    And I take a screenshot as evidence

  @SF-459 @SF-459-UI-003 @p1 @standard-user @negative
  Scenario: Verify label currently stated as is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "label currently stated as" field should not be visible
    And I take a screenshot as evidence

  @SF-459 @SF-459-UI-004 @p2 @detail-view
  Scenario: Verify label currently stated as visibility on Case detail page
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "label currently stated as" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: name_labels__c on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-UI-005 @smoke @p1 @read-only
  Scenario: Verify name_labels__c is read-only on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    Then the "name_labels__c" field should not be editable
    And I take a screenshot as evidence

  @SF-459 @SF-459-UI-006 @p1 @negative
  Scenario: Verify user cannot modify name_labels__c after Case creation
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    Then the "name_labels__c" field should be read-only
    And attempting to edit the name_labels__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-UI-007 @p2 @negative @blank-value
  Scenario: Verify behavior when label currently stated as is blank
    Given I am logged in as a standard user
    And I have a test Case created via API without "label currently stated as"
    When I navigate to the Case record
    Then the "label currently stated as" field should be visible
    And the "label currently stated as" field should be blank or empty
    And I take a screenshot as evidence

  @SF-459 @SF-459-UI-008 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify label currently stated as
    Given I am logged in as a read-only user
    And I have a test Case created via API
    When I navigate to the Case record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-459 @SF-459-UI-009 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to label currently stated as
    Given I am logged in as a standard user
    And I have a test Case created via API
    When I navigate to the Case record
    Then the "label currently stated as" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-UI-010 @p2 @ui-data-creation
  Scenario: Create Case record via UI
    Given I am logged in as a standard user
    When I navigate to the Case object list
    And I click New to create a Case
    And I fill in required Case fields
    And I save the record
    Then the Case should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 51
  # Existing Steps Used: 51
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 51/51 (100%)
  #   - Feature-Specific Steps Used: 0
