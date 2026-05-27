# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-519 - Derive Distribution Region from Lead Country
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:03.725Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Derive Distribution Region from Lead Country
# Primary Entity: Lead
#
# Test Requirements (7):
#   REQ-1: Country must be populated on all Leads
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Automatically populate Distribution Region based on Country
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Update Distribution Region when Country changes
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Alignment with central region definitions
#     → Test Type: BOTH | Priority: p2
#   REQ-5: No Distribution Region when Country is blank or unmapped
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Distribution Region field includes help text
#     → Test Type: UI | Priority: p2
#   REQ-7: is the standard country field from address details?
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • US
#   • UK
#   • EU
#   • CA
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-519 @medium @auto-populate @field-mapping @lead
Feature: API - SF-519 - Derive Distribution Region from Lead Country

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify standard_country__c field exists on Lead
    When I describe the Lead object fields
    Then the "standard_country__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-API-002 @smoke @p1 @auto-populate
  Scenario: API - Verify standard_country__c is inherited from Account on Lead creation
    Given I have a test Account created via API with standard_country "EU"
    When I create a Lead for the Account via API
    Then the API should return status code 201
    And the Lead should have standard_country "EU"

  @SF-519 @SF-519-API-003 @p1 @auto-populate @data-driven
  Scenario Outline: API - Verify standard_country__c mapping for all valid values
    Given I have a test Account created via API with standard_country "<value>"
    When I create a Lead for the Account via API
    Then the API should return status code 201
    And the Lead should have standard_country "<value>"

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-519 @SF-519-API-004 @p1 @read-only @negative
  Scenario: API - Verify standard_country__c cannot be updated on Lead after creation
    Given I have a test Account created via API with standard_country "UK"
    And I have a test Lead created via API for the Account
    When I try to update the Lead standard_country to "US" via API
    Then the API should reject the standard_country update
    And the Lead standard_country should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid standard_country__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | standard_country__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "standard_country"

  @SF-519 @SF-519-API-006 @p2 @negative @null-value
  Scenario: API - Handle null standard_country__c value
    Given I have a test Lead created via API without standard_country
    When I query the Lead record via API
    Then the "standard_country__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (6):
  #   REQ-1: Country must be populated on all Leads
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Automatically populate Distribution Region based on Country
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Update Distribution Region when Country changes
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Alignment with central region definitions
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: No Distribution Region when Country is blank or unmapped
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-7: is the standard country field from address details?
  #     → Should be tested via API | Priority: p1


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
