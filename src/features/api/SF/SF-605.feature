# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-605 - Make Dataverse field identifier available in Salesforce for integration Country_c -> Country
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-16T17:18:05.095Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 3
# Description: Generator Only - Full automatic generation from Jira data (current behavior)
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Dataverse field identifier available in Salesforce for integration Country_c -> Country
# Primary Entity: Record
#
# Fields Involved (1):
#   • identifier available in Salesforce (identifier_available_in_Salesforce__c) - modify
#
# Test Requirements (5):
#   REQ-1: Verify "identifier available in Salesforce" behavior on Record
#     → Test Type: BOTH | Priority: p2
#   REQ-2: the Country to Country field → I query Salesforce to resolve the 
#     → Test Type: BOTH | Priority: p1
#   REQ-3: I am processing a Salesforce Country record that is eligible to b
#     → Test Type: BOTH | Priority: p2
#   REQ-4: I am processing an Country record with an integrated field value 
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Salesforce-held Dataverse IDs can change over time → an integrati
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

@api @salesforce @SF-605 @medium @auto-populate @field-mapping
Feature: API - SF-605 - Make Dataverse field identifier available in Salesforce for integration Country_c -> Country

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify identifier_available_in_Salesforce__c field exists on Record
    When I describe the Record object fields
    Then the "identifier_available_in_Salesforce__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-API-002 @smoke @p1 @auto-populate
  Scenario: API - Verify Country_record_contains_one_or_more_integrated__c is inherited from Account on Record creation
    Given I have a test Account created via API with Country_record_contains_one_or_more_integrated "EU"
    When I create a Record for the Account via API
    Then the API should return status code 201
    And the Record should have Country_record_contains_one_or_more_integrated "EU"

  @SF-605 @SF-605-API-003 @p1 @read-only @negative
  Scenario: API - Verify Country_record_contains_one_or_more_integrated__c cannot be updated on Record after creation
    Given I have a test Account created via API with Country_record_contains_one_or_more_integrated "UK"
    And I have a test Record created via API for the Account
    When I try to update the Record Country_record_contains_one_or_more_integrated to "US" via API
    Then the API should reject the Country_record_contains_one_or_more_integrated update
    And the Record Country_record_contains_one_or_more_integrated should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-API-004 @p2 @negative @invalid-value
  Scenario: API - Reject invalid identifier_available_in_Salesforce__c value
    When I create a new Record via POST with:
      | field | value |
      | Name  | Invalid Test |
      | identifier_available_in_Salesforce__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "identifier_available_in_Salesforce"

  @SF-605 @SF-605-API-005 @p2 @negative @null-value
  Scenario: API - Handle null identifier_available_in_Salesforce__c value
    Given I have a test Record created via API without identifier_available_in_Salesforce
    When I query the Record record via API
    Then the "identifier_available_in_Salesforce__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: Verify "identifier available in Salesforce" behavior on Record
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: the Country to Country field → I query Salesforce to resolve the 
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-3: I am processing a Salesforce Country record that is eligible to b
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: I am processing an Country record with an integrated field value 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Salesforce-held Dataverse IDs can change over time → an integrati
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 17
  # Existing Steps Used: 17
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 17/17 (100%)
  #   - Feature-Specific Steps Used: 0
