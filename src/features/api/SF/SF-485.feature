# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-485 - Make Functional_Currency__c mandatory for Insurer, Insurer Branch and Reinsurer
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:07:02.922Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Functional_Currency__c mandatory for Insurer, Insurer Branch and Reinsurer
# Primary Entity: Lead
#
# Fields Involved (1):
#   • Functional Currency (Functional_Currency__c) - modify
#
# Test Requirements (2):
#   REQ-1: / WHEN / THEN):UI: new record (create) → Functional_Currency__c i
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a user opens an existing Insurer, Insurer Branch or Reinsurer rec
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Insurer Branch
#   • Reinsurer
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-485 @medium @field-visibility @lead
Feature: API - SF-485 - Make Functional_Currency__c mandatory for Insurer, Insurer Branch and Reinsurer

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Functional_Currency__c field exists on Lead
    When I describe the Lead object fields
    Then the "Functional_Currency__c" field should exist

  @SF-485 @SF-485-API-002 @p1 @field-exists
  Scenario: API - Verify Functional_Currency__c field exists on Account
    When I describe the Account object fields
    Then the "Functional_Currency__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-API-003 @p1 @api-create
  Scenario: API - Create Lead with Functional_Currency__c
    When I create a new Lead via POST with:
      | field | value |
      | Name  | API Test Lead |
      | Functional_Currency__c | Insurer Branch |
    Then the API should return status code 201
    And the response should contain the new Lead ID

  @SF-485 @SF-485-API-004 @p1 @api-update
  Scenario: API - Update Functional_Currency__c on Lead
    Given I have an existing Lead record
    When I update the Lead field "Functional_Currency__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-485 @SF-485-API-005 @p2 @api-query
  Scenario: API - Query Lead by Functional_Currency__c
    Given I have an existing Lead record
    When I query Lead where "Functional_Currency__c" equals "Insurer Branch"
    Then the API should return status code 200

  @SF-485 @SF-485-API-006 @p2 @data-driven
  Scenario Outline: API - Create Lead with each valid Functional_Currency__c
    When I create a new Lead via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Functional_Currency__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | Insurer Branch |
      | Reinsurer |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-485 @SF-485-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Functional_Currency__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Functional_Currency__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Functional_Currency"

  @SF-485 @SF-485-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Functional_Currency__c value
    Given I have a test Lead created via API without Functional_Currency
    When I query the Lead record via API
    Then the "Functional_Currency__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: / WHEN / THEN):UI: new record (create) → Functional_Currency__c i
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: a user opens an existing Insurer, Insurer Branch or Reinsurer rec
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
