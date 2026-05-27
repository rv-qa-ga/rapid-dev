# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-490 - Hide Annual_GWP_Estimate_Year_1_c and POS_FSCS_Exposure on Account (visible to Admins/support only)
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:17.077Z (FeatureGenerator v3.1)
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
# API TESTS - Comprehensive Coverage
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-490 @medium @field-visibility @lead
Feature: API - SF-490 - Hide Annual_GWP_Estimate_Year_1_c and POS_FSCS_Exposure on Account (visible to Admins/support only)

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Account__c field exists on Lead
    When I describe the Lead object fields
    Then the "Account__c" field should exist

  @SF-490 @SF-490-API-002 @p1 @field-exists
  Scenario: API - Verify Account__c field exists on Account
    When I describe the Account object fields
    Then the "Account__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-API-003 @p1 @api-create
  Scenario: API - Create Lead with Account
    When I create a new Lead via POST with:
      | field | value |
      | Name  | API Test Lead |
    Then the API should return status code 201
    And the response should contain the new Lead ID

  @SF-490 @SF-490-API-004 @p1 @api-update
  Scenario: API - Update Account__c on Lead
    Given I have an existing Lead record
    When I update the Lead field "Account__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-490 @SF-490-API-005 @p2 @api-query
  Scenario: API - Query Lead by Account
    Given I have an existing Lead record
    When I query all Lead records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-490 @SF-490-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Account__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Account__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Account"

  @SF-490 @SF-490-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Account__c value
    Given I have a test Lead created via API without Account
    When I query the Lead record via API
    Then the "Account__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: / WHEN / THEN):UI visibility (Account detail page) → they open an
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-5: a non-admin user builds or views reports → they try to add or vie
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
