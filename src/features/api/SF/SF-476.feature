# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-476 - Hide Annual_GWP_Estimate_Year_1__c from Account records for non-admin users
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:08:21.765Z (FeatureGenerator v3.1)
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
# API TESTS - Comprehensive Coverage
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-476 @medium @auto-populate @field-mapping @lead
Feature: API - SF-476 - Hide Annual_GWP_Estimate_Year_1__c from Account records for non-admin users

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Annual_GWP_Estimate_Year_1__c field exists on Lead
    When I describe the Lead object fields
    Then the "Annual_GWP_Estimate_Year_1__c" field should exist

  @SF-476 @SF-476-API-002 @p1 @field-exists
  Scenario: API - Verify Annual_GWP_Estimate_Year_1__c field exists on Account
    When I describe the Account object fields
    Then the "Annual_GWP_Estimate_Year_1__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-API-003 @smoke @p1 @auto-populate
  Scenario: API - Verify Annual_GWP_Estimate_Year_1__c is inherited from Account on Lead creation
    Given I have a test Account created via API with custom "EU"
    When I create a Lead for the Account via API
    Then the API should return status code 201
    And the Lead should have custom "EU"

  @SF-476 @SF-476-API-004 @p1 @read-only @negative
  Scenario: API - Verify Annual_GWP_Estimate_Year_1__c cannot be updated on Lead after creation
    Given I have a test Account created via API with custom "UK"
    And I have a test Lead created via API for the Account
    When I try to update the Lead custom to "US" via API
    Then the API should reject the custom update
    And the Lead custom should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-476 @SF-476-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Annual_GWP_Estimate_Year_1__c value
    When I create a new Lead via POST with:
      | field | value |
      | LastName  | Invalid Test |
      | Company | Test Company |
      | Annual_GWP_Estimate_Year_1__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Annual_GWP_Estimate_Year_1"

  @SF-476 @SF-476-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Annual_GWP_Estimate_Year_1__c value
    Given I have a test Lead created via API without custom
    When I query the Lead record via API
    Then the "Annual_GWP_Estimate_Year_1__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-3: a non-admin user or integration running under a non-admin profile
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
