# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-476 - Hide Annual_GWP_Estimate_Year_1__c from Account records for non-admin users
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:08:21.663Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Hide Annual_GWP_Estimate_Year_1__c from Account records for non-admin users
# Primary Entity: Lead
#
# Fields Involved (1):
#   • Annual_GWP_Estimate_Year_1__c (Annual_GWP_Estimate_Year_1__c__c) - hide
#
# Test Requirements (3):
#   REQ-1: a non-admin user → they open any Account record → Annual_GWP_Esti
#     → Test Type: UI | Priority: p1
#   REQ-2: a non-admin user performs a global search or views an Account in 
#     → Test Type: UI | Priority: p2
#   REQ-3: a non-admin user or integration running under a non-admin profile
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

@ui @salesforce @SF-476 @medium @auto-populate @field-mapping @lead
Feature: SF-476 - Hide Annual_GWP_Estimate_Year_1__c from Account records for non-admin users
  As a Salesforce user
  I want to verify the custom functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-UI-001 @negative @data-driven @non-admin-user
  Scenario: Scenario 1
    Given I am logged in as a "Non-Admin User" user
    When I navigate to the Account record
    Then Annual_GWP_Estimate_Year_1__c is not visible anywhere on the page (detail, related lists, quick actions, inline edit)
    And I navigate to the Account object list
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-002 @non-admin-user
  Scenario: Scenario 2
    Given I am logged in as a "Non-Admin User" user
    And I navigate to the Account object list
    When Results or compact fields are shown
    Then Annual_GWP_Estimate_Year_1__c is not displayed or searchable for that user.Reports & DashboardsGIVEN a non-admin user opens the Report Builder or views a report
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-003 @negative @data-driven @non-admin-user
  Scenario: Scenario 3
    Given I am logged in as a "Non-Admin User" user
    When It queries the Account object via the API
    Then The field is not returned or accessible (i.e., FLS applies)
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: custom on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-UI-004 @smoke @p1 @admin
  Scenario: Verify custom is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "custom" field should be visible
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-005 @p1 @standard-user @negative
  Scenario: Verify custom is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "custom" field should not be visible
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-006 @p2 @detail-view
  Scenario: Verify custom visibility on Lead detail page
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "custom" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Annual_GWP_Estimate_Year_1__c__c from Account to Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-UI-007 @smoke @p1 @auto-populate
  Scenario: Verify Annual_GWP_Estimate_Year_1__c__c auto-populates from Account to Lead
    Given I am logged in as a standard user
    And I have a test Account created via API with:
      | field   | value    |
      | Annual_GWP_Estimate_Year_1__c__c | EU       |
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Annual_GWP_Estimate_Year_1__c__c" field should display "EU"
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-008 @p1 @read-only
  Scenario: Verify Annual_GWP_Estimate_Year_1__c__c is NOT editable on Lead after creation
    Given I am logged in as a standard user
    And I have a test Account created via API with Annual_GWP_Estimate_Year_1__c__c "UK"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Annual_GWP_Estimate_Year_1__c__c" field should not be editable
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-009 @p1 @visibility
  Scenario: Verify Annual_GWP_Estimate_Year_1__c__c field is visible on Lead
    Given I am logged in as a standard user
    And I have a test Account created via API with Annual_GWP_Estimate_Year_1__c__c "US"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Annual_GWP_Estimate_Year_1__c__c" field should be visible
    And the "Annual_GWP_Estimate_Year_1__c__c" field should display "US"
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-010 @p2 @exact-match
  Scenario: Verify Annual_GWP_Estimate_Year_1__c__c value matches exactly from Account
    Given I am logged in as a standard user
    And I have a test Account created via API with Annual_GWP_Estimate_Year_1__c__c "APAC"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Annual_GWP_Estimate_Year_1__c__c" field should display "APAC"
    And the Annual_GWP_Estimate_Year_1__c__c value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when custom is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "custom"
    When I navigate to the Lead record
    Then the "custom" field should be visible
    And the "custom" field should be blank or empty
    And I take a screenshot as evidence

  @SF-476 @SF-476-UI-012 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify custom
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-UI-013 @p2 @ui-data-creation
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
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: a non-admin user → they open any Account record → Annual_GWP_Esti
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: a non-admin user performs a global search or views an Account in 
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: a non-admin user or integration running under a non-admin profile
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 74
  # Existing Steps Used: 74
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 74/74 (100%)
  #   - Feature-Specific Steps Used: 0
