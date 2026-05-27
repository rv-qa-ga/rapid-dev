# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-110 - Enable Field History Tracking for Opportunity fields
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-08T19:36:02.199Z (FeatureGenerator v3.1)
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
# Overview: Enable Field History Tracking for Opportunity fields
# Primary Entity: Contract
#
# Fields Involved (1):
#   • History Tracking (History_Tracking__c) - modify
#
# Test Requirements (4):
#   REQ-1: Verify "History Tracking" behavior on Contract
#     → Test Type: BOTH | Priority: p2
#   REQ-2: Enable field history tracking for critical fields
#     → Test Type: BOTH | Priority: p1
#   REQ-3: Verify field history visibility on Opportunity records
#     → Test Type: UI | Priority: p2
#   REQ-4: Validate history retention and reporting
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Stage
#   • Expressed Interest
#   • Territories Covered
#   • Declined GWP
#   • MOU Sent Date
#   • Provisional Commission
#   • Substage
#   • Unqualified Reason
#   • Unqualified Reason Details
#   • Win Reason
#   • Win Reason Details
#   • Date
#   • User
#   • New Value
#   • Date Range
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-110 @medium @field-visibility @contract
Feature: API - SF-110 - Enable Field History Tracking for Opportunity fields

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify History_Tracking__c field exists on Contract
    When I describe the Contract object fields
    Then the "History_Tracking__c" field should exist

  @SF-110 @SF-110-API-002 @p1 @field-exists
  Scenario: API - Verify History_Tracking__c field exists on Account
    When I describe the Account object fields
    Then the "History_Tracking__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-API-003 @p1 @api-create
  Scenario: API - Create Contract with History Tracking
    When I create a new Contract via POST with:
      | field | value |
      | Name  | API Test Contract |
      | History_Tracking__c | Stage |
    Then the API should return status code 201
    And the response should contain the new Contract ID

  @SF-110 @SF-110-API-004 @p1 @api-update
  Scenario: API - Update History_Tracking__c on Contract
    Given I have an existing Contract record
    When I update the Contract field "History_Tracking__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-110 @SF-110-API-005 @p2 @api-query
  Scenario: API - Query Contract by History Tracking
    Given I have an existing Contract record
    When I query Contract where "History_Tracking__c" equals "Stage"
    Then the API should return status code 200

  @SF-110 @SF-110-API-006 @p2 @data-driven
  Scenario Outline: API - Create Contract with each valid History Tracking
    When I create a new Contract via POST with:
      | field | value |
      | Name  | API Test <value> |
      | History_Tracking__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | Stage |
      | Expressed Interest |
      | Territories Covered |
      | Declined GWP |
      | MOU Sent Date |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid History_Tracking__c value
    When I create a new Contract via POST with:
      | field | value |
      | Name  | Invalid Test |
      | History_Tracking__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "History_Tracking"

  @SF-110 @SF-110-API-008 @p2 @negative @null-value
  Scenario: API - Handle null History_Tracking__c value
    Given I have a test Contract created via API without History_Tracking
    When I query the Contract record via API
    Then the "History_Tracking__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: Verify "History Tracking" behavior on Contract
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: Enable field history tracking for critical fields
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: Validate history retention and reporting
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
