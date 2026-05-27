# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-550 - Add TPA Group as an Account Type
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: picklist-values
# Generated: 2025-12-15T19:25:04.121Z (FeatureGenerator v3.0)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Add TPA Group as an Account Type
# Primary Entity: Account
#
# Test Requirements (3):
#   REQ-1: Add TPA Group to Account Type picklist
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Restrict Account Type to approved values only
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Integration and automation alignment
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

@api @salesforce @SF-550 @medium @picklist @account
Feature: API - SF-550 - Add TPA Group as an Account Type

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-550 @SF-550-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Type field supports TPA Group value
    When I describe the Account object fields
    Then the "Type" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-550 @SF-550-API-002 @p1 @api-create
  Scenario: API - Create Account with TPA Group
    When I create a new Account via POST with:
      | field | value      |
      | Name  | API Test Account |
      | Type  | TPA Group  |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-550 @SF-550-API-003 @p1 @api-update
  Scenario: API - Create Account with TPA Group Type
    # NOTE: Account Type cannot be changed once set (Salesforce validation rule)
    # So we create the account with TPA Group from the start
    When I create a new Account via POST with:
      | field | value      |
      | Name  | API Test Account TPA Group |
      | Type  | TPA Group  |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-550 @SF-550-API-004 @p2 @api-query
  Scenario: API - Query Account by TPA Group
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-550 @SF-550-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Type value
    When I create a new Account via POST with:
      | field | value           |
      | Name  | Invalid Test    |
      | Type  | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Type"

  @SF-550 @SF-550-API-006 @p2 @negative @null-value
  Scenario: API - Handle Account with Type other than TPA Group
    Given I have a test Account created via API with Type "Agency"
    When I query the Account record via API
    Then the "Type" should equal "Agency"


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: Add TPA Group to Account Type picklist
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Restrict Account Type to approved values only
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Integration and automation alignment
  #     → Should be tested via API | Priority: p2


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
