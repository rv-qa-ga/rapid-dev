# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-503 - Remove Sub_Type__c from Lead page layout and make it non-required
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:04.919Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove Sub_Type__c from Lead page layout and make it non-required
# Primary Entity: Lead
#
# Fields Involved (1):
#   • Sub Type (Sub_Type__c) - delete
#
# Test Requirements (1):
#   REQ-1: / WHEN / THEN)Page layout removalGIVEN a standard user opens or e
#     → Test Type: UI | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-503 @medium @field-visibility @lead
Feature: SF-503 - Remove Sub_Type__c from Lead page layout and make it non-required
  As a Salesforce user
  I want to verify the Sub_Type__c functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-UI-001 @negative @data-driven @standard-user
  Scenario: Scenario 1
    Given I am logged in as a "Standard User" user
    And I navigate to the Lead record
    Given I have a test Lead created via API
    When The integration runs
    Then Requests are accepted
    Then Not rejected for missing Sub_Type__c (unless other business rules apply)
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Sub_Type__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-UI-002 @smoke @p1 @admin
  Scenario: Verify Sub_Type__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should be visible
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-003 @p1 @standard-user @negative
  Scenario: Verify Sub_Type__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should not be visible
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-004 @p2 @detail-view
  Scenario: Verify Sub_Type__c visibility on Lead detail page
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Sub_Type__c should NOT exist on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-UI-005 @smoke @p1 @field-removal
  Scenario: Verify Sub_Type__c field does NOT exist on Lead
    Given I have an existing Lead record
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should not be visible
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-006 @p1 @field-removal
  Scenario: Verify Sub_Type__c field is not available in edit mode
    Given I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Sub_Type__c" field should not be visible
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-007 @p2 @field-removal
  Scenario: Verify Sub_Type__c field is not present on Lead detail page
    Given I have an existing Lead record
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should not be visible
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-008 @p2 @field-removal
  Scenario: Verify Sub_Type__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-UI-009 @p2 @negative @blank-value
  Scenario: Verify behavior when Sub_Type__c is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "Sub_Type__c"
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should be visible
    And the "Sub_Type__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-010 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Sub_Type__c
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-503 @SF-503-UI-011 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Sub_Type__c
    Given I am logged in as a standard user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the "Sub_Type__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-UI-012 @p2 @ui-data-creation
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
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: / WHEN / THEN)Page layout removalGIVEN a standard user opens or e
  #     → Should be tested via UI | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 63
  # Existing Steps Used: 63
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 63/63 (100%)
  #   - Feature-Specific Steps Used: 0
