# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-506 - Hide Estimated Onboarding Date on Account and Map from Lead to Opportunity
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:05:46.635Z (FeatureGenerator v3.1)
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
#   • Estimated (Estimated__c) - hide
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
# API TESTS - Comprehensive Coverage
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-506 @medium @auto-populate @field-mapping @opportunity
Feature: API - SF-506 - Hide Estimated Onboarding Date on Account and Map from Lead to Opportunity

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Estimated_Onboarding_Date__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Estimated_Onboarding_Date__c" field should exist

  @SF-506 @SF-506-API-002 @p1 @field-exists
  Scenario: API - Verify Estimated_Onboarding_Date__c field exists on Account
    When I describe the Account object fields
    Then the "Estimated_Onboarding_Date__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-API-003 @smoke @p1 @lead-conversion
  Scenario: API - Verify Estimated_Onboarding_Date__c maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with Estimated_Onboarding_Date "EU"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Estimated_Onboarding_Date "EU"

  @SF-506 @SF-506-API-004 @p1 @lead-conversion @negative
  Scenario: API - Verify Estimated_Onboarding_Date__c does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with Estimated_Onboarding_Date "UK"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Estimated_Onboarding_Date "UK"
    And the Account should NOT have Estimated_Onboarding_Date

  @SF-506 @SF-506-API-005 @p2 @lead-conversion
  Scenario: API - Verify Estimated_Onboarding_Date__c value is preserved during Lead conversion
    Given I have a test Lead created via API with Estimated_Onboarding_Date "US"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Estimated_Onboarding_Date "US"
    And the Estimated_Onboarding_Date value should match exactly what was on the Lead

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-506 @SF-506-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Estimated_Onboarding_Date__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Estimated_Onboarding_Date__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Estimated_Onboarding_Date"

  @SF-506 @SF-506-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Estimated_Onboarding_Date__c value
    Given I have a test Opportunity created via API without Estimated_Onboarding_Date
    When I query the Opportunity record via API
    Then the "Estimated_Onboarding_Date__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-2: Estimated Onboarding Date maps from Lead to Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: No mapping to Account during conversion
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 24
  # Existing Steps Used: 24
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 24/24 (100%)
  #   - Feature-Specific Steps Used: 0
