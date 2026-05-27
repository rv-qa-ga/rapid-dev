# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-113 - Require Account.Region Field
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:52.569Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Require Account.Region Field
# Primary Entity: Order
#
# Test Requirements (4):
#   REQ-1: Prevent Account creation without Region (UI only)
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Successful Account creation with Region
#     → Test Type: BOTH | Priority: p2
#   REQ-3: State filtered by Region selection
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Acceptance criteria not met. I was able to create an account only
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • US
#   • CAN
#   • UK
#   • EU
#   • ROW
#   • CA
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-113 @medium @field-visibility @order
Feature: API - SF-113 - Require Account.Region Field

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Region__c field exists on Order
    When I describe the Order object fields
    Then the "Region__c" field should exist

  @SF-113 @SF-113-API-002 @p1 @field-exists
  Scenario: API - Verify Region__c field exists on Account
    When I describe the Account object fields
    Then the "Region__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-API-003 @p1 @api-create
  Scenario: API - Create Order with Region__c
    When I create a new Order via POST with:
      | field | value |
      | Name  | API Test Order |
      | Region__c | US |
    Then the API should return status code 201
    And the response should contain the new Order ID

  @SF-113 @SF-113-API-004 @p1 @api-update
  Scenario: API - Update Region__c on Order
    Given I have an existing Order record
    When I update the Order field "Region__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-113 @SF-113-API-005 @p2 @api-query
  Scenario: API - Query Order by Region__c
    Given I have an existing Order record
    When I query Order where "Region__c" equals "US"
    Then the API should return status code 200

  @SF-113 @SF-113-API-006 @p2 @data-driven
  Scenario Outline: API - Create Order with each valid Region__c
    When I create a new Order via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Region__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | US |
      | CAN |
      | UK |
      | EU |
      | ROW |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-113 @SF-113-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Region__c value
    When I create a new Order via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Region__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Region"

  @SF-113 @SF-113-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Region__c value
    Given I have a test Order created via API without Region
    When I query the Order record via API
    Then the "Region__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: Prevent Account creation without Region (UI only)
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Successful Account creation with Region
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: State filtered by Region selection
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Acceptance criteria not met. I was able to create an account only
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
