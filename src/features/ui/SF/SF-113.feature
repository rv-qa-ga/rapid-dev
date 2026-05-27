# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-113 - Require Account.Region Field
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:52.506Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Require Account.Region Field
# Primary Entity: Order
#
# Test Requirements (4):
#   REQ-1: Prevent Account creation without Region (UI only)
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Successful Account creation with Region
#     → Test Type: BOTH | Priority: p2
#   REQ-3: State filtered by Region selection
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Acceptance criteria not met. I was able to create an account only
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
#   • CAN
#   • UK
#   • EU
#   • ROW
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-113 @medium @field-visibility @order
Feature: SF-113 - Require Account.Region Field
  As a Salesforce user
  I want to verify the Region__c functionality on Order
  So that Order records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-UI-001 @negative
  Scenario: Prevent Account creation without Region (UI only)
    Given I am logged in as a standard user
    Given I have an existing Account record
    When I fill in all required fields except Region__c
    Then The save is prevented
    And I save the record
    Then I should see a validation error
    Then The Account is not created
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-002 @negative
  Scenario: Successful Account creation with Region
    Given I am logged in as a standard user
    Given I have an existing Account record
    When I fill in all required fields including Region__c
    Then the Account should be saved successfully
    And I save the record
    Then The Region value is stored
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-003 @negative @data-driven
  Scenario: State filtered by Region selection
    Given I am logged in as a standard user
    Given I have an existing Account record
    When I select US as the Region
    Then The State/Province picklist must show only US States
    Then Provinces from other Regions must not be available for selection
    Then I must select a valid State from the filtered list before saving.✅ Business Value:Ensures every Account is tied to a Region for regulatory compliance.Enables accurate routing and team assignment based on geography.Provides data governance by requiring Region on all UI-created Accounts, while still allowing flexibility for bulk data operations and integrations
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-004 @data-driven @admin
  Scenario: is needed.
    Given I am logged in as a "Admin" user
    Then Acceptance criteria not met. I was able to create an account only with the name.No Region mandatory.test | Account | Salesforce
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=cd43c106-a458-4c15-bc92-9b492e285278Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Require-Account-Region-FieldDifference TypeMetadata TypeNameNewCustom fieldAccount.RegionNo differenceCustom objectAccount
    Then :check_mark: Successfully merged PR #61 from gs-pipeline/SF-113/Require-Account-Region-Field_-_QA into QA
    Then Currently blocked by bug  but have an observation that the order of list of values does not match the AC - please confirm if its ok
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Region__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-UI-005 @smoke @p1
  Scenario: Verify Region__c field is visible on Order
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Region__c" field should be visible
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-006 @p1 @edit
  Scenario: Verify Region__c field can be edited on Order
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    And I set the "Region__c" field to "Test Value"
    And I save the record
    Then the Order should be saved successfully
    And the "Region__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-007 @p1 @data-driven
  Scenario Outline: Set Region__c to valid values
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    And I set the "Region__c" field to "<value>"
    And I save the record
    Then the "Region__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | CAN |
      | UK |
      | EU |
      | ROW |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Region__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-UI-008 @smoke @p1 @admin
  Scenario: Verify Region__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Region__c" field should be visible
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-009 @p1 @standard-user @negative
  Scenario: Verify Region__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Region__c" field should not be visible
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-010 @p2 @detail-view
  Scenario: Verify Region__c visibility on Order detail page
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Region__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: Region__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-UI-011 @smoke @p1 @admin
  Scenario: Verify admin user can access Region__c
    Given I am logged in as an admin user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Region__c" field should be visible
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-012 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access Region__c
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "Region__c" field should not be visible
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-013 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit Region__c
    Given I am logged in as a read-only user
    And I have an existing Order record
    When I navigate to the Order record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-UI-014 @p2 @negative @blank-value
  Scenario: Verify behavior when Region__c is blank
    Given I am logged in as a standard user
    And I have a test Order created via API without "Region__c"
    When I navigate to the Order record
    Then the "Region__c" field should be visible
    And the "Region__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-015 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Region__c
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "Region__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-016 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Region__c
    Given I am logged in as a read-only user
    And I have a test Order created via API
    When I navigate to the Order record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-113 @SF-113-UI-017 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Region__c
    Given I am logged in as a standard user
    And I have a test Order created via API
    When I navigate to the Order record
    Then the "Region__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-UI-018 @p2 @ui-data-creation
  Scenario: Create Order record via UI
    Given I am logged in as a standard user
    When I navigate to the Order object list
    And I click New to create a Order
    And I fill in required Order fields
    And I save the record
    Then the Order should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: Prevent Account creation without Region (UI only)
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Successful Account creation with Region
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: State filtered by Region selection
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 96
  # Existing Steps Used: 96
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 96/96 (100%)
  #   - Feature-Specific Steps Used: 0
