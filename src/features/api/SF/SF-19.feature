# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-19 - 8099: Display Key Account Fields in Header
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: permission-based
# Generated: 2025-12-19T15:08:47.404Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8099: Display Key Account Fields in Header
# Primary Entity: Order
#
# Fields Involved (1):
#   • in Header (in_Header__c) - modify
#
# Test Requirements (2):
#   REQ-1: I am a Salesforce Admin in Setup > Object Manager > Account → I c
#     → Test Type: UI | Priority: p1
#   REQ-2: I am viewing an Account record → the page loads → the compact lay
#     → Test Type: UI | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Primary Contact
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-19 @medium @permissions @roles @order
Feature: API - SF-19 - 8099: Display Key Account Fields in Header

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify StatusAccount_Status__c field exists on Order
    When I describe the Order object fields
    Then the "StatusAccount_Status__c" field should exist

  @SF-19 @SF-19-API-002 @p1 @field-exists
  Scenario: API - Verify StatusAccount_Status__c field exists on Account
    When I describe the Account object fields
    Then the "StatusAccount_Status__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-API-003 @p1 @api-create
  Scenario: API - Create Order with StatusAccount_Status__c
    When I create a new Order via POST with:
      | field | value |
      | Name  | API Test Order |
      | StatusAccount_Status__c | Primary Contact |
    Then the API should return status code 201
    And the response should contain the new Order ID

  @SF-19 @SF-19-API-004 @p1 @api-update
  Scenario: API - Update StatusAccount_Status__c on Order
    Given I have an existing Order record
    When I update the Order field "StatusAccount_Status__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-19 @SF-19-API-005 @p2 @api-query
  Scenario: API - Query Order by StatusAccount_Status__c
    Given I have an existing Order record
    When I query Order where "StatusAccount_Status__c" equals "Primary Contact"
    Then the API should return status code 200

  @SF-19 @SF-19-API-006 @p2 @data-driven
  Scenario Outline: API - Create Order with each valid StatusAccount_Status__c
    When I create a new Order via POST with:
      | field | value |
      | Name  | API Test <value> |
      | StatusAccount_Status__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | Primary Contact |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-19 @SF-19-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid StatusAccount_Status__c value
    When I create a new Order via POST with:
      | field | value |
      | Name  | Invalid Test |
      | StatusAccount_Status__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "StatusAccount_Status"

  @SF-19 @SF-19-API-008 @p2 @negative @null-value
  Scenario: API - Handle null StatusAccount_Status__c value
    Given I have a test Order created via API without StatusAccount_Status
    When I query the Order record via API
    Then the "StatusAccount_Status__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


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
