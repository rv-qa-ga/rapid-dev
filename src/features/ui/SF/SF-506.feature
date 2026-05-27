# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-506 - Hide Estimated Onboarding Date on Account and Map from Lead to Opportunity
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:05:46.559Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Hide Estimated Onboarding Date on Account and Map from Lead to Opportunity
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • Estimated Onboarding Date (Estimated_Onboarding_Date__c) - hide
#
# Test Requirements (3):
#   REQ-1: Estimated Onboarding Date hidden from all Account page layouts
#     → Test Type: UI | Priority: p1
#   REQ-2: Estimated Onboarding Date maps from Lead to Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-3: No mapping to Account during conversion
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

@ui @salesforce @SF-506 @medium @auto-populate @field-mapping @opportunity
Feature: SF-506 - Hide Estimated Onboarding Date on Account and Map from Lead to Opportunity
  As a Salesforce user
  I want to verify the Estimated_Onboarding_Date__c functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-UI-001 @negative @account-record-is-displayed-when-any
  Scenario: Estimated Onboarding Date hidden from all Account page layouts
    Given I am logged in as a "Account Record Is Displayed When Any" user
    Given An Account record is displayed
    Given Any user views or edits an Account
    Given The "Estimated_Onboarding_Date__c" field should not appear on the page layout
    And I navigate to the Account record
    When Any user views or edits an Account
    When The "Estimated_Onboarding_Date__c" field should not appear on the page layout
    When I navigate to the Account record
    Then The "Estimated_Onboarding_Date__c" field should not appear on the page layout
    And I navigate to the Account record
    And I navigate to the Account record
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-002
  Scenario: Estimated Onboarding Date maps from Lead to Opportunity
    Given I am logged in as a standard user
    Given A Lead record has a value in the "Estimated_Onboarding_Date__c" field
    Given The Lead is converted to an Opportunity
    Given The "Estimated_Onboarding_Date__c" field on the Opportunity should automatically populate with the same value from the Lead
    When The Lead is converted to an Opportunity
    When The "Estimated_Onboarding_Date__c" field on the Opportunity should automatically populate with the same value from the Lead
    Then The "Estimated_Onboarding_Date__c" field on the Opportunity should automatically populate with the same value from the Lead
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-003 @negative
  Scenario: No mapping to Account during conversion
    Given I am logged in as a standard user
    Given A Lead is converted
    Given I have an existing Account record
    Given The "Estimated_Onboarding_Date__c" field should not populate or appear on the Account
    Given Components for deployment
    Given Account page layout
    Given Post deployment steps
    When I navigate to the Account object list
    When The "Estimated_Onboarding_Date__c" field should not populate or appear on the Account
    When Components for deployment
    When Account page layout
    When Post deployment steps
    Then The "Estimated_Onboarding_Date__c" field should not populate or appear on the Account
    Then Components for deployment
    Then Account page layout
    Then Post deployment steps
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Estimated_Onboarding_Date__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-UI-004 @smoke @p1 @admin
  Scenario: Verify Estimated_Onboarding_Date__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Estimated_Onboarding_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-005 @p1 @standard-user @negative
  Scenario: Verify Estimated_Onboarding_Date__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Estimated_Onboarding_Date__c" field should not be visible
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-006 @p2 @detail-view
  Scenario: Verify Estimated_Onboarding_Date__c visibility on Opportunity detail page
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Estimated_Onboarding_Date__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION: Estimated_Onboarding_Date__c mapping from Lead to Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-UI-007 @smoke @p1 @lead-conversion
  Scenario: Verify Estimated_Onboarding_Date__c maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with:
      | field   | value    |
      | Estimated_Onboarding_Date__c | EU       |
    When I convert the Lead to Opportunity
    Then the Opportunity should have Estimated_Onboarding_Date "EU"
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-008 @p1 @lead-conversion @negative
  Scenario: Verify Estimated_Onboarding_Date__c does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with:
      | field   | value    |
      | Estimated_Onboarding_Date__c | UK       |
    When I convert the Lead to Opportunity
    Then the Opportunity should have Estimated_Onboarding_Date "UK"
    And the Account should NOT have Estimated_Onboarding_Date
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-009 @p2 @lead-conversion
  Scenario: Verify Estimated_Onboarding_Date__c value is preserved during Lead conversion
    Given I have a test Lead created via API with Estimated_Onboarding_Date "US"
    When I convert the Lead to Opportunity
    Then the Opportunity should have Estimated_Onboarding_Date "US"
    And the Estimated_Onboarding_Date value should match exactly what was on the Lead
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-UI-010 @p2 @negative @blank-value
  Scenario: Verify behavior when Estimated_Onboarding_Date__c is blank
    Given I am logged in as a standard user
    And I have a test Opportunity created via API without "Estimated_Onboarding_Date__c"
    When I navigate to the Opportunity record
    Then the "Estimated_Onboarding_Date__c" field should be visible
    And the "Estimated_Onboarding_Date__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-506 @SF-506-UI-011 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Estimated_Onboarding_Date__c
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-UI-012 @p2 @ui-data-creation
  Scenario: Create Opportunity record via UI
    Given I am logged in as a standard user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 2
  # Coverage: 67%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-3: No mapping to Account during conversion
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 84
  # Existing Steps Used: 84
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 84/84 (100%)
  #   - Feature-Specific Steps Used: 0
