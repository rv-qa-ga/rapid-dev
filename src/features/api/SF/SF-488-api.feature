# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-488 - Make Onboarded_Date_c mandatory to exit the Contracting stage on Account (manually entered)
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T21:41:06.088Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Onboarded_Date_c mandatory to exit the Contracting stage on Account (manually entered)
# Primary Entity: Contract
#
# Fields Involved (1):
#   • Onboarded_Date_c (Onboarded_Date_c__c) - validate
#
# Test Requirements (1):
#   REQ-1: is unclear on which field needs to be populated and When exactly 
#     → Test Type: API | Priority: p2
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

@api @salesforce @SF-488 @medium @auto-populate @field-mapping @contract
Feature: API - SF-488 - Make Onboarded_Date_c mandatory to exit the Contracting stage on Account (manually entered)

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Onboarded_Date_c__c field exists on Contract
    When I describe the Contract object fields
    Then the "Onboarded_Date_c__c" field should exist

  @SF-488 @SF-488-API-002 @p1 @field-exists
  Scenario: API - Verify Onboarded_Date_c__c field exists on Account
    When I describe the Account object fields
    Then the "Onboarded_Date_c__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-API-003 @smoke @p1 @auto-populate
  Scenario: API - Verify Onboarded_Date_c__c is inherited from Account on Contract creation
    Given I have a test Account created via API with Onboarded_Date_c "EU"
    When I create a Contract for the Account via API
    Then the API should return status code 201
    And the Contract should have Onboarded_Date_c "EU"

  @SF-488 @SF-488-API-004 @p1 @read-only @negative
  Scenario: API - Verify Onboarded_Date_c__c cannot be updated on Contract after creation
    Given I have a test Account created via API with Onboarded_Date_c "UK"
    And I have a test Contract created via API for the Account
    When I try to update the Contract Onboarded_Date_c to "US" via API
    Then the API should reject the Onboarded_Date_c update
    And the Contract Onboarded_Date_c should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Onboarded_Date_c__c value
    When I create a new Contract via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Onboarded_Date_c__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Onboarded_Date_c"

  @SF-488 @SF-488-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Onboarded_Date_c__c value
    Given I have a test Contract created via API without Onboarded_Date_c
    When I query the Contract record via API
    Then the "Onboarded_Date_c__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: is unclear on which field needs to be populated and When exactly 
  #     → Should be tested via API | Priority: p2


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
