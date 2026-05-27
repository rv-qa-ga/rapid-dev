# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-573 - Account.Ownership field should be mandatory
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-24T19:13:14.124Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Account.Ownership field should be mandatory
# Primary Entity: Account
#
# Fields Involved (1):
#   • should be mandatory (should_be_mandatory__c) - modify
#
# Test Requirements (3):
#   REQ-1: Ownership field is mandatory on all Account Types
#     → Test Type: UI | Priority: p1
#   REQ-2: Ownership field visible on all Account Types
#     → Test Type: UI | Priority: p2
#   REQ-3: Consistency across integrations and reporting
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

@ui @salesforce @SF-573 @medium @field-visibility @account
Feature: SF-573 - Account.Ownership field should be mandatory
  As a Salesforce user
  I want to verify the Ownership functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-UI-001 @p1 @smoke @negative @user-is-creating-or-editing-an-account-record-when-the @field-visibility
  Scenario: Ownership field is mandatory on all Account Types
    Given I am logged in as a "MRD" user
    When I navigate to the Account object list
    And I click the New button
    And I select Account Type "<AccountType>"
    And I fill in required Account fields
    And I clear the "Ownership" field
    And I save the record
    Then I should see a validation message indicating "Ownership" is required
    And I take a screenshot as evidence
    When I set the "Ownership" field to "Private"
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence
    And the "Ownership" field should be visible
    And I take a screenshot as evidence  
     Examples:
      | AccountType              |
      | Acquisition Company      |
      | Agency                   |
      | Agency Branch            |
      | Distribution Partner     |
      | Group                    |
      | Insurer                  |
      | Insurer Branch           |
      | Legal Entity             |
      | Member                   |
      | Non-Member MGA           |
      | Placing Broker           |
      | Reinsurance Broker       |
      | Reinsurer                |
      | Reinsurer Branch         |
      | Service Company          |
      | Third Party Administrator (TPA) |
      | TPA Group                |


  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Ownership on Account
  # ══════════════════════════════════════════════════════════════════════════

 # @SF-573 @SF-573-UI-004 @smoke @p1
 # Scenario: Verify Ownership field is visible on Account
 #   Given I am logged in as a "Accelerant - System administrator" user
 #   And I have an existing Account record
 #   When I navigate to the Account record
 #   Then the "Ownership" field should be visible
 #   And I take a screenshot as evidence

  @SF-573 @SF-573-UI-005 @p1 @edit
  Scenario: Verify Ownership field can be edited on Account
    Given I am logged in as a "MRD" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Ownership" field to "Owned"
    And I save the record
    Then the Account should be saved successfully
    And the "Ownership" field should display "Owned"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Ownership on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-UI-006 @smoke @p1 @admin
  Scenario: Verify Ownership is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Ownership" field should be visible
    And I take a screenshot as evidence

#  @SF-573 @SF-573-UI-007 @p1 @standard-user @negative
#  Scenario: Verify Ownership is NOT visible for standard users
#  Given I am logged in as a standard user
 #   And I have an existing Account record
 #   When I navigate to the Account record
 #   Then the "Ownership" field should not be visible
 #   And I take a screenshot as evidence

  @SF-573 @SF-573-UI-008 @p2 @detail-view
  Scenario: Verify Ownership visibility on Account detail page
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Ownership" field should be visible in the details section
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when Ownership is blank
    Given I am logged in as a "MRD" user
    And I have a test Account created via API without "Ownership"
    When I navigate to the Account record
    Then the "Ownership" field should be visible
    And the "Ownership" field should be blank or empty
    And I take a screenshot as evidence

  @SF-573 @SF-573-UI-012 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Ownership
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-573 @SF-573-UI-013 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Ownership
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "Ownership" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-UI-014 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a "MRD" user
    When I navigate to the Account object list
    And I click the New button
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Ownership field is mandatory on all Account Types
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: Ownership field visible on all Account Types
  #     → Should be tested via UI | Priority: p2


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
