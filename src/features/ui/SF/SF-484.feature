# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-484 - Hide Investment_Status_c on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:04.437Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Hide Investment_Status_c on Account
# Primary Entity: Account
#
# Fields Involved (1):
#   • Investment_Status_c (Investment_Status_c__c) - hide
#
# Test Requirements (4):
#   REQ-1: / WHEN / THEN):Account detail page (UI) → they open any Account r
#     → Test Type: UI | Priority: p1
#   REQ-2: a System Administrator or approved support role → they open any A
#     → Test Type: UI | Priority: p2
#   REQ-3: the Account record page uses Dynamic Forms or custom Lightning co
#     → Test Type: BOTH | Priority: p2
#   REQ-4: a non-admin user builds or views reports & dashboards → they try 
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

@ui @salesforce @SF-484 @medium @field-visibility @account
Feature: SF-484 - Hide Investment_Status_c on Account
  As a Salesforce user
  I want to verify the Investment_Status_c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-UI-001 @negative @non-admin-user
  Scenario: Scenario 1
    Given I am logged in as a "Non-Admin User" user
    Given Account detail page (UI)
    When I navigate to the Account record
    Then Investment_Status_c is not visible anywhere on the page
    Then Cannot be added through personalization
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-002 @admin
  Scenario: Scenario 2
    Given I am logged in as a "Admin" user
    Given A System Administrator or approved support role
    When I navigate to the Account record
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-003 @negative @non-admin-user
  Scenario: Scenario 3
    Given I am logged in as a "Non-Admin User" user
    Then The field is not rendered
    Then No errors occur; admin/support users still see the fieldReports & Dashboards
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-004 @non-admin-user
  Scenario: Scenario 4
    Given I am logged in as a "Non-Admin User" user
    When They try to add or view Investment_Status_c
    Then The field is not available in the field picker
    Then Does not appear in report results for that user; admins retain reporting capability
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Investment_Status_c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-UI-005 @smoke @p1 @admin
  Scenario: Verify Investment_Status_c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Investment_Status_c" field should be visible
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-006 @p1 @standard-user @negative
  Scenario: Verify Investment_Status_c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Investment_Status_c" field should not be visible
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-007 @p2 @detail-view
  Scenario: Verify Investment_Status_c visibility on Account detail page
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Investment_Status_c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: Investment_Status_c__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-UI-008 @smoke @p1 @admin
  Scenario: Verify admin user can access Investment_Status_c__c
    Given I am logged in as an admin user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Investment_Status_c__c" field should be visible
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-009 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access Investment_Status_c__c
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Investment_Status_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-010 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit Investment_Status_c__c
    Given I am logged in as a read-only user
    And I have an existing Account record
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when Investment_Status_c is blank
    Given I am logged in as a standard user
    And I have a test Account created via API without "Investment_Status_c"
    When I navigate to the Account record
    Then the "Investment_Status_c" field should be visible
    And the "Investment_Status_c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-012 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Investment_Status_c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-484 @SF-484-UI-013 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Investment_Status_c
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "Investment_Status_c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-UI-014 @p2 @ui-data-creation
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
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: / WHEN / THEN):Account detail page (UI) → they open any Account r
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: a System Administrator or approved support role → they open any A
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: the Account record page uses Dynamic Forms or custom Lightning co
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: a non-admin user builds or views reports & dashboards → they try 
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 72
  # Existing Steps Used: 72
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 72/72 (100%)
  #   - Feature-Specific Steps Used: 0
