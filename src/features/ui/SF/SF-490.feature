# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-490 - Hide Annual_GWP_Estimate_Year_1_c and POS_FSCS_Exposure on Account (visible to Admins/support only)
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:17.016Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Hide Annual_GWP_Estimate_Year_1_c and POS_FSCS_Exposure on Account (visible to Admins/support only)
# Primary Entity: Lead
#
# Fields Involved (2):
#   • Annual_GWP_Estimate_Year_1_c (Annual_GWP_Estimate_Year_1_c__c) - hide
#   • POS_FSCS_Exposure (POS_FSCS_Exposure__c) - hide
#
# Test Requirements (5):
#   REQ-1: / WHEN / THEN):UI visibility (Account detail page) → they open an
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a System Administrator or approved support role → they open any A
#     → Test Type: UI | Priority: p2
#   REQ-3: org profiles → FLS is updated → the two fields are hidden (read
#     → Test Type: UI | Priority: p2
#   REQ-4: a non-admin user performs a search or views compact lists → resul
#     → Test Type: UI | Priority: p2
#   REQ-5: a non-admin user builds or views reports → they try to add or vie
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

@ui @salesforce @SF-490 @medium @field-visibility @lead
Feature: SF-490 - Hide Annual_GWP_Estimate_Year_1_c and POS_FSCS_Exposure on Account (visible to Admins/support only)
  As a Salesforce user
  I want to verify the Account functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-UI-001 @non-admin-user
  Scenario: Scenario 1
    Given I am logged in as a "Non-Admin User" user
    Given UI visibility (Account detail page)
    When I navigate to the Account record
    Then Annual_GWP_Estimate_Year_1_c
    Then POS_FSCS_Exposure do not appear anywhere on the page
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-002 @admin
  Scenario: Scenario 2
    Given I am logged in as a "Admin" user
    Given A System Administrator or approved support role
    When I navigate to the Account record
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-003 @data-driven @org
  Scenario: Scenario 3
    Given I am logged in as a "Org" user
    Then The two fields are hidden (read
    Then Edit unchecked) for all non-admin profiles
    Then Are visible for System Administrator
    Then Explicitly approved support rolesSearch, compact layouts & global search
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-004 @non-admin-user
  Scenario: Scenario 4
    Given I am logged in as a "Non-Admin User" user
    When Results or compact/list fields are shown
    Then The fields are not displayed or searchable for that userReports & dashboards
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-005 @non-admin-user
  Scenario: Scenario 5
    Given I am logged in as a "Non-Admin User" user
    Given Dashboards
    When They try to add or view these fields
    Then The fields are not available in the field picker
    Then Do not appear in report results for that user; admins retain full access to report on these fields
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: Annual_GWP_Estimate_Year_1_c__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-UI-006 @smoke @p1 @admin
  Scenario: Verify admin user can access Annual_GWP_Estimate_Year_1_c__c
    Given I am logged in as an admin user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Annual_GWP_Estimate_Year_1_c__c" field should be visible
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-007 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access Annual_GWP_Estimate_Year_1_c__c
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Annual_GWP_Estimate_Year_1_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-008 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit Annual_GWP_Estimate_Year_1_c__c
    Given I am logged in as a read-only user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Account on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-UI-009 @smoke @p1 @admin
  Scenario: Verify Account is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Account" field should be visible
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-010 @p1 @standard-user @negative
  Scenario: Verify Account is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Account" field should not be visible
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-011 @p2 @detail-view
  Scenario: Verify Account visibility on Lead detail page
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Account" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-UI-012 @p2 @negative @blank-value
  Scenario: Verify behavior when Account is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "Account"
    When I navigate to the Lead record
    Then the "Account" field should be visible
    And the "Account" field should be blank or empty
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Account
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-490 @SF-490-UI-014 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Account
    Given I am logged in as a standard user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the "Account" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-UI-015 @p2 @ui-data-creation
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
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: / WHEN / THEN):UI visibility (Account detail page) → they open an
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: a System Administrator or approved support role → they open any A
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: org profiles → FLS is updated → the two fields are hidden (read
  #     → Should be tested via UI | Priority: p2
  #   REQ-4: a non-admin user performs a search or views compact lists → resul
  #     → Should be tested via UI | Priority: p2
  #   REQ-5: a non-admin user builds or views reports → they try to add or vie
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
