# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-492 - Hide Opportunities fields TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c, and Expressed_Interest_c from non-admin users
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:11.338Z (FeatureGenerator v3.1)
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
# API TESTS - Comprehensive Coverage
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-492 @medium @field-visibility @opportunity
Feature: API - SF-492 - Hide Opportunities fields TerritoriesCovered_c, First-Year Estimated Gross Written Premi_c, and Expressed_Interest_c from non-admin users

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Opportunity__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Opportunity__c" field should exist

  @SF-492 @SF-492-API-002 @p1 @field-exists
  Scenario: API - Verify Opportunity__c field exists on Account
    When I describe the Account object fields
    Then the "Opportunity__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-API-003 @p1 @api-create
  Scenario: API - Create Opportunity with Opportunity
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | API Test Opportunity |
    Then the API should return status code 201
    And the response should contain the new Opportunity ID

  @SF-492 @SF-492-API-004 @p1 @api-update
  Scenario: API - Update Opportunity__c on Opportunity
    Given I have an existing Opportunity record
    When I update the Opportunity field "Opportunity__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-492 @SF-492-API-005 @p2 @api-query
  Scenario: API - Query Opportunity by Opportunity
    Given I have an existing Opportunity record
    When I query all Opportunity records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-492 @SF-492-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Opportunity__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Opportunity__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Opportunity"

  @SF-492 @SF-492-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Opportunity__c value
    Given I have a test Opportunity created via API without Opportunity
    When I query the Opportunity record via API
    Then the "Opportunity__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: / WHEN / THEN):Field identity confirmed → implementation begins →
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: a non-admin user → they open any Opportunity record in Lightning 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Opportunity Lightning pages → a non-admin user views them → the f
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-7: a non-admin user builds or views reports → they try to add or vie
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 19
  # Existing Steps Used: 19
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 19/19 (100%)
  #   - Feature-Specific Steps Used: 0
