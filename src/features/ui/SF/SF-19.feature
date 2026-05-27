# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-19 - 8099: Display Key Account Fields in Header
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: permission-based
# Generated: 2025-12-19T15:08:47.342Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8099: Display Key Account Fields in Header
# Primary Entity: Order
#
# Fields Involved (1):
#   • in Header (in_Header__c) - modify
#
# Test Requirements (2):
#   REQ-1: I am a Salesforce Admin in Setup > Object Manager > Account → I c
#     → Test Type: UI | Priority: p1
#   REQ-2: I am viewing an Account record → the page loads → the compact lay
#     → Test Type: UI | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Primary Contact
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-19 @medium @permissions @roles @order
Feature: SF-19 - 8099: Display Key Account Fields in Header
  As a Salesforce user
  I want to verify the StatusAccount_Status__c functionality on Order
  So that Order records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-UI-001 @verify-header-visibility-for
  Scenario: Scenario 1
    Given I am logged in as a "Verify Header Visibility For" user
    Given I am a Salesforce Admin in Setup > Object Manager > Account
    When I create or edit the Account compact layout
    Then the "Party_ID_PTY_Code__c" field should be visible
    Then The compact layout must be assigned to all Account page layouts
    Then It must display consistently across all Account record typesScenario: Verify header visibility for users
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-002 @data-driven @standard-user
  Scenario: Scenario 2
    Given I am logged in as a "Standard User" user
    And I navigate to the Account record
    When The page loads
    Then The compact layout must display in the header section
    Then The values must update immediately when the underlying fields changeNotes:These five fields are considered the most important Account attributes.They must appear in the header section at the top of every Account record for easy visibility
    Then Does Account status
    Then Functionality of SFDC
    Then Use the base fields in the standard object where possible. “Primary Contact” is a great example where I’m not sure why we’re creating a custom field
    Then Approved in sheet
    Then Acceptance criteria not met
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=7acbabd3-3454-479b-9f7a-62a365cb24c7Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /8099-Display-Key-Account-Fields-in-HeaderDifference TypeMetadata TypeNameNewCompact layoutAccount.Hipten_Account_Compact_LayoutNo differenceCustom objectAccount
    Then :check_mark: Successfully merged PR #59 from gs-pipeline/SF-19/8099-Display-Key-Account-Fields-in-Header_-_QA into QA
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=da008e07-7319-4f3b-8767-f3ced8b8a3ccCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then the "Custom field" field should be visible
    Then :check_mark: Successfully merged PR #67 from gs-pipeline/SF-19/8099-Display-Key-Account-Fields-in-Header_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: StatusAccount_Status__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-UI-003 @smoke @p1 @admin
  Scenario: Verify admin user can access StatusAccount_Status__c
    Given I am logged in as an admin user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "StatusAccount_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-004 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access StatusAccount_Status__c
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "StatusAccount_Status__c" field should not be visible
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-005 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit StatusAccount_Status__c
    Given I am logged in as a read-only user
    And I have an existing Order record
    When I navigate to the Order record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: StatusAccount_Status__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-UI-006 @smoke @p1
  Scenario: Verify StatusAccount_Status__c field is visible on Order
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "StatusAccount_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-007 @p1 @edit
  Scenario: Verify StatusAccount_Status__c field can be edited on Order
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    And I set the "StatusAccount_Status__c" field to "Test Value"
    And I save the record
    Then the Order should be saved successfully
    And the "StatusAccount_Status__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-008 @p1 @data-driven
  Scenario Outline: Set StatusAccount_Status__c to valid values
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    And I set the "StatusAccount_Status__c" field to "<value>"
    And I save the record
    Then the "StatusAccount_Status__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Primary Contact |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: in_Header__c on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-UI-009 @smoke @p1 @read-only
  Scenario: Verify in_Header__c is read-only on Order
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "in_Header__c" field should not be editable
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-010 @p1 @negative
  Scenario: Verify user cannot modify in_Header__c after Order creation
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "in_Header__c" field should be read-only
    And attempting to edit the in_Header__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when StatusAccount_Status__c is blank
    Given I am logged in as a standard user
    And I have a test Order created via API without "StatusAccount_Status__c"
    When I navigate to the Order record
    Then the "StatusAccount_Status__c" field should be visible
    And the "StatusAccount_Status__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-012 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for StatusAccount_Status__c
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "StatusAccount_Status__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify StatusAccount_Status__c
    Given I am logged in as a read-only user
    And I have a test Order created via API
    When I navigate to the Order record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-19 @SF-19-UI-014 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to StatusAccount_Status__c
    Given I am logged in as a standard user
    And I have a test Order created via API
    When I navigate to the Order record
    Then the "StatusAccount_Status__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-UI-015 @p2 @ui-data-creation
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
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: I am a Salesforce Admin in Setup > Object Manager > Account → I c
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: I am viewing an Account record → the page loads → the compact lay
  #     → Should be tested via UI | Priority: p2


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
