# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-492 - Hide Opportunities fields TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c, and Expressed_Interest_c from non-admin users
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:11.266Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Hide Opportunities fields TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c, and Expressed_Interest_c from non-admin users
# Primary Entity: Opportunity
#
# Fields Involved (3):
#   • Opportunities fields TerritoriesCovered_c (Opportunities_fields_TerritoriesCovered_c__c) - hide
#   • First-Year Estimated Gross Written Premi_c (First-Year_Estimated_Gross_Written_Premi_c__c) - hide
#   • Expressed_Interest_c (Expressed_Interest_c__c) - hide
#
# Test Requirements (7):
#   REQ-1: / WHEN / THEN):Field identity confirmed → implementation begins →
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a non-admin user → they open any Opportunity record in Lightning 
#     → Test Type: BOTH | Priority: p2
#   REQ-3: a System Administrator or approved support role → they open any O
#     → Test Type: UI | Priority: p2
#   REQ-4: org profiles → FLS is updated → the three fields are hidden (read
#     → Test Type: UI | Priority: p2
#   REQ-5: Opportunity Lightning pages → a non-admin user views them → the f
#     → Test Type: BOTH | Priority: p2
#   REQ-6: a non-admin user performs a search or views compact lists → resul
#     → Test Type: UI | Priority: p2
#   REQ-7: a non-admin user builds or views reports → they try to add or vie
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

@ui @salesforce @SF-492 @medium @field-visibility @opportunity
Feature: SF-492 - Hide Opportunities fields TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c, and Expressed_Interest_c from non-admin users
  As a Salesforce user
  I want to verify the Opportunity functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-UI-001 @data-driven
  Scenario: Scenario 1
    Given I am logged in as a standard user
    Given Field identity confirmed
    Given Initial analysis
    When Implementation begins
    Then The exact API names for the three fields are confirmed (TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c, Expressed_Interest_c)
    Then DocumentedUI visibility (Account detail page)
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-002 @negative @data-driven @non-admin-user
  Scenario: Scenario 2
    Given I am logged in as a "Non-Admin User" user
    When I navigate to the Opportunity record
    Then TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c
    Then Cannot be added via personalization
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-003 @admin
  Scenario: Scenario 3
    Given I am logged in as a "Admin" user
    Given A System Administrator or approved support role
    When I navigate to the Opportunity record
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-004 @data-driven @org
  Scenario: Scenario 4
    Given I am logged in as a "Org" user
    Then The three fields are hidden (read
    Then Edit unchecked) for all non-admin profiles
    Then Visible for System Administrator
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-005 @negative @data-driven @non-admin-user
  Scenario: Scenario 5
    Given I am logged in as a "Non-Admin User" user
    Then The fields are not rendered or included
    Then No component errors occur; admin/support pages still show the fieldsSearch, compact layouts & global search
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-006 @non-admin-user
  Scenario: Scenario 6
    Given I am logged in as a "Non-Admin User" user
    When Results or compact/list fields are shown
    Then The three fields are not displayed or searchable for that userReports & dashboards
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-007 @non-admin-user
  Scenario: Scenario 7
    Given I am logged in as a "Non-Admin User" user
    Given Dashboards
    When They try to add or view these fields
    Then The fields are not available in the field picker
    Then Do not appear in report results for that user; admins retain full access to report on these fields
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Opportunity on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-UI-008 @smoke @p1
  Scenario: Verify Opportunity field is visible on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-009 @p1 @edit
  Scenario: Verify Opportunity field can be edited on Opportunity
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Opportunity" field to "Test Value"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Opportunity" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: First-Year_Estimated_Gross_Written_Premi_c__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-UI-010 @smoke @p1 @admin
  Scenario: Verify admin user can access First-Year_Estimated_Gross_Written_Premi_c__c
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "First-Year_Estimated_Gross_Written_Premi_c__c" field should be visible
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-011 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access First-Year_Estimated_Gross_Written_Premi_c__c
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "First-Year_Estimated_Gross_Written_Premi_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-012 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit First-Year_Estimated_Gross_Written_Premi_c__c
    Given I am logged in as a read-only user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Opportunities_fields_TerritoriesCovered_c__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-UI-013 @smoke @p1 @admin
  Scenario: Verify Opportunities_fields_TerritoriesCovered_c__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Opportunities_fields_TerritoriesCovered_c__c" field should be visible
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-014 @p1 @standard-user @negative
  Scenario: Verify Opportunities_fields_TerritoriesCovered_c__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Opportunities_fields_TerritoriesCovered_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-015 @p2 @detail-view
  Scenario: Verify Opportunities_fields_TerritoriesCovered_c__c visibility on Opportunity detail page
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Opportunities_fields_TerritoriesCovered_c__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-UI-016 @p2 @negative @blank-value
  Scenario: Verify behavior when Opportunity is blank
    Given I am logged in as a standard user
    And I have a test Opportunity created via API without "Opportunity"
    When I navigate to the Opportunity record
    Then the "Opportunity" field should be visible
    And the "Opportunity" field should be blank or empty
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-017 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Opportunity
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-492 @SF-492-UI-018 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Opportunity
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "Opportunity" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-UI-019 @p2 @ui-data-creation
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
  # Total Requirements: 7
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (7):
  #   REQ-1: / WHEN / THEN):Field identity confirmed → implementation begins →
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: a non-admin user → they open any Opportunity record in Lightning 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: a System Administrator or approved support role → they open any O
  #     → Should be tested via UI | Priority: p2
  #   REQ-4: org profiles → FLS is updated → the three fields are hidden (read
  #     → Should be tested via UI | Priority: p2
  #   REQ-5: Opportunity Lightning pages → a non-admin user views them → the f
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: a non-admin user performs a search or views compact lists → resul
  #     → Should be tested via UI | Priority: p2
  #   REQ-7: a non-admin user builds or views reports → they try to add or vie
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 102
  # Existing Steps Used: 102
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 102/102 (100%)
  #   - Feature-Specific Steps Used: 0
