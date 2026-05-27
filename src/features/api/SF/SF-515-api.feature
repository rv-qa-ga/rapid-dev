# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-515 - Discontinued Date Field on Account
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-05T21:57:08.157Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Discontinued Date Field on Account
# Primary Entity: Account
#
# Fields Involved (1):
#   • on Account (on_Account__c) - modify
#
# Test Requirements (9):
#   REQ-1: Discontinued Date field exists on Account
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Discontinued Date visible for Active or Offboarded accounts
#     → Test Type: UI | Priority: p2
#   REQ-3: Discontinued Date hidden for non-applicable statuses
#     → Test Type: UI | Priority: p2
#   REQ-4: Discontinued Date mandatory for Offboarded accounts
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Discontinued Date optional for Active accounts
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Prevent Discontinued Date for non-applicable statuses
#     → Test Type: BOTH | Priority: p2
#   REQ-7: Discontinued Date must be on or after Onboarding Date
#     → Test Type: UI | Priority: p2
#   REQ-8: Discontinued Date must not be in the future
#     → Test Type: UI | Priority: p2
#   REQ-9: Commit succeeded: https://app.gearset.com/finished?deploymentId=a
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Date
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-515 @medium @field-visibility @account
Feature: API - SF-515 - Discontinued Date Field on Account

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Discontinued_Date__c field exists on Account
    When I describe the Account object fields
    Then the "Discontinued_Date__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-API-002 @p1 @api-create
  Scenario: API - Create Account with Discontinued_Date__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
      | Discontinued_Date__c | Date |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-515 @SF-515-API-003 @p1 @api-update
  Scenario: API - Update Discontinued_Date__c on Account
    Given I have an existing Account record
    When I update the Account field "Discontinued_Date__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-515 @SF-515-API-004 @p2 @api-query
  Scenario: API - Query Account by Discontinued_Date__c
    Given I have an existing Account record
    When I query Account where "Discontinued_Date__c" equals "Date"
    Then the API should return status code 200

  @SF-515 @SF-515-API-005 @p2 @data-driven
  Scenario Outline: API - Create Account with each valid Discontinued_Date__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Discontinued_Date__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | Date |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-515 @SF-515-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Discontinued_Date__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Discontinued_Date__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Discontinued_Date"

  @SF-515 @SF-515-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Discontinued_Date__c value
    Given I have a test Account created via API without Discontinued_Date
    When I query the Account record via API
    Then the "Discontinued_Date__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: Discontinued Date field exists on Account
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: Discontinued Date mandatory for Offboarded accounts
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Discontinued Date optional for Active accounts
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: Prevent Discontinued Date for non-applicable statuses
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-9: Commit succeeded: https://app.gearset.com/finished?deploymentId=a
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
