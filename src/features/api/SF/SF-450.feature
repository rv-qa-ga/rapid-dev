# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-450 -  Party code - only required for particular party Types
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-01-08T19:36:11.884Z (FeatureGenerator v3.1)
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
# Overview: All other users must be able to view but not enter, change or clear the Party Code.
# Primary Entity: Order
#
# Fields Involved (2):
#   • Member (Member__c) - show
#   • Insurer Branch (Insurer_Branch__c) - show
#
# Test Requirements (8):
#   REQ-1: Verify "Member" is visible on Order page layout for all Account T
#     → Test Type: UI | Priority: p1
#   REQ-2: Verify "Insurer Branch" is visible on Order page layout for all A
#     → Test Type: UI | Priority: p1
#   REQ-3: Party Code is mandatory for specified Party Types and Statuses
#     → Test Type: BOTH | Priority: p1
#   REQ-4: Party Code is mandatory for Reinsurers with Owned Ownership
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Party Code optional for other Party Types and Statuses
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Party Code not allowed for Legal Entities
#     → Test Type: UI | Priority: p2
#   REQ-7: Party Code cannot be modified once entered
#     → Test Type: UI | Priority: p2
#   REQ-8: Party Code must be unique and follow a 4-character alphanumeric f
#     → Test Type: UI | Priority: p2
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

@api @salesforce @SF-450 @medium @order
Feature: API - SF-450 -  Party code - only required for particular party Types

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Member__c field exists on Order
    When I describe the Order object fields
    Then the "Member__c" field should exist

  @SF-450 @SF-450-API-002 @p1 @field-exists
  Scenario: API - Verify Member__c field exists on Account
    When I describe the Account object fields
    Then the "Member__c" field should exist

  @SF-450 @SF-450-API-003 @smoke @p1 @field-exists
  Scenario: API - Verify Insurer_Branch__c field exists on Order
    When I describe the Order object fields
    Then the "Insurer_Branch__c" field should exist

  @SF-450 @SF-450-API-004 @p1 @field-exists
  Scenario: API - Verify Insurer_Branch__c field exists on Account
    When I describe the Account object fields
    Then the "Insurer_Branch__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-API-005 @p1 @api-create
  Scenario: API - Create Order with Member
    When I create a new Order via POST with:
      | field | value |
      | Name  | API Test Order |
    Then the API should return status code 201
    And the response should contain the new Order ID

  @SF-450 @SF-450-API-006 @p1 @api-update
  Scenario: API - Update Member__c on Order
    Given I have an existing Order record
    When I update the Order field "Member__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-450 @SF-450-API-007 @p2 @api-query
  Scenario: API - Query Order by Member
    Given I have an existing Order record
    When I query all Order records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-450 @SF-450-API-008 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Member__c value
    When I create a new Order via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Member__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Member"

  @SF-450 @SF-450-API-009 @p2 @negative @null-value
  Scenario: API - Handle null Member__c value
    Given I have a test Order created via API without Member
    When I query the Order record via API
    Then the "Member__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-3: Party Code is mandatory for specified Party Types and Statuses
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: Party Code is mandatory for Reinsurers with Owned Ownership
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Party Code optional for other Party Types and Statuses
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 23
  # Existing Steps Used: 23
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 23/23 (100%)
  #   - Feature-Specific Steps Used: 0
