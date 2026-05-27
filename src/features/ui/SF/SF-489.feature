# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-489 - Delete Account fields Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c, Legal_Entity_Name__c
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2025-12-19T15:06:24.985Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Account fields Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c, Legal_Entity_Name__c
# Primary Entity: Lead
#
# Fields Involved (5):
#   • Series Entity (Series_Entity__c) - delete
#   • Sub Type (Sub_Type__c) - delete
#   • Legal Entity (Legal_Entity__c) - delete
#   • Legal Entity Lookup (Legal_Entity_Lookup__c) - delete
#   • Legal Entity Name (Legal_Entity_Name__c) - delete
#
# Test Requirements (3):
#   REQ-1: / WHEN / THEN):Lead/Account-only deletion → I inspect object sche
#     → Test Type: BOTH | Priority: p1
#   REQ-2: reports, dashboards → owners update or remove those references → 
#     → Test Type: BOTH | Priority: p2
#   REQ-3: production data before deletion → a final backup is taken → a ver
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

@ui @salesforce @SF-489 @medium @lead
Feature: SF-489 - Delete Account fields Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c, Legal_Entity_Name__c
  As a Salesforce user
  I want to verify the Series_Entity__c functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-UI-001 @data-driven
  Scenario: Scenario 1
    Given I am logged in as a standard user
    Given Lead/Account-only deletion
    Given The change is deployed
    When I inspect object schemas across the org
    Then Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c
    Then Legal_Entity_Name__c are removed from the Account object only
    Then Any fields with the same API names on other objects remain unchangedReports, dashboards & BI validation
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-002 @negative @data-driven
  Scenario: Scenario 2
    Given I am logged in as a standard user
    Given Reports, dashboards
    Given BI jobs that referenced the Account fields are identified
    When Owners update or remove those references
    When Run tests
    Then Scheduled
    Then Ad-hoc reports
    Then BI jobs run without errors after deletionData backup & rollback
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-003 @data-driven
  Scenario: Scenario 3
    Given I am logged in as a standard user
    Given Production data before deletion
    When A final backup is taken
    Then A verified backup of the five Account fields (by Account Id) is stored with timestamp, owner
    Then Retention notes
    Then A tested rollback procedure to recreate fields
    Then Restore data exists
    Then To complete this I had to remove all references from flows
    Then Page layouts.Two flow versions had to be deleted
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Series_Entity__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-UI-004 @smoke @p1
  Scenario: Verify Series_Entity__c field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Series_Entity__c" field should be visible
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-005 @p1 @edit
  Scenario: Verify Series_Entity__c field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Series_Entity__c" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Series_Entity__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Series_Entity__c should NOT exist on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-UI-006 @smoke @p1 @field-removal
  Scenario: Verify Series_Entity__c field does NOT exist on Lead
    Given I have an existing Lead record
    When I navigate to the Lead record
    Then the "Series_Entity__c" field should not be visible
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-007 @p1 @field-removal
  Scenario: Verify Series_Entity__c field is not available in edit mode
    Given I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Series_Entity__c" field should not be visible
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-008 @p2 @field-removal
  Scenario: Verify Series_Entity__c field is not present on Lead detail page
    Given I have an existing Lead record
    When I navigate to the Lead record
    Then the "Series_Entity__c" field should not be visible
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-009 @p2 @field-removal
  Scenario: Verify Series_Entity__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Series_Entity__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Series_Entity__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-UI-010 @smoke @p1
  Scenario: Verify Series_Entity__c field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Series_Entity__c" field should be visible
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-011 @p1 @edit
  Scenario: Verify Series_Entity__c field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Series_Entity__c" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Series_Entity__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-UI-012 @p2 @negative @blank-value
  Scenario: Verify behavior when Series_Entity__c is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "Series_Entity__c"
    When I navigate to the Lead record
    Then the "Series_Entity__c" field should be visible
    And the "Series_Entity__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-489 @SF-489-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Series_Entity__c
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-UI-014 @p2 @ui-data-creation
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
  #   REQ-1: / WHEN / THEN):Lead/Account-only deletion → I inspect object sche
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: reports, dashboards → owners update or remove those references → 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: production data before deletion → a final backup is taken → a ver
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 91
  # Existing Steps Used: 91
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 91/91 (100%)
  #   - Feature-Specific Steps Used: 0
