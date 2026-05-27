# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-573 - Account.Ownership field should be mandatory
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-24T19:13:14.172Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Account.Ownership field should be mandatory
# Primary Entity: Account
#
# Fields Involved (1):
#   • should be mandatory (should_be_mandatory__c) - modify
#
# Test Requirements (3):
#   REQ-1: Ownership field is mandatory on all Account Types
#     → Test Type: UI | Priority: p1
#   REQ-2: Ownership field visible on all Account Types
#     → Test Type: UI | Priority: p2
#   REQ-3: Consistency across integrations and reporting
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

@api @salesforce @SF-573 @medium @field-visibility @account
Feature: API - SF-573 - Account.Ownership field should be mandatory

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Ownership field exists on Account
    When I describe the Account object fields
    Then the "Ownership" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-API-002 @p1 @api-create
  Scenario: API - Create Account with Ownership
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-573 @SF-573-API-003 @p1 @api-update
  Scenario: API - Update Ownership on Account
    Given I have an existing Account record
    When I update the Account field "Ownership" to "Public" via API
    Then the API should return status code 204

  @SF-573 @SF-573-API-004 @p2 @api-query
  Scenario: API - Query Account by Ownership
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-573 @SF-573-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Ownership value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Ownership | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Ownership"

  @SF-573 @SF-573-API-006 @p2 @negative @null-value
  Scenario: API - Reject Account creation without Ownership (required field)
    When I create a new Account via POST with:
      | field | value |
      | Name  | Test Account Without Ownership |
      | Ownership | |
    Then the API should return an error
    And the error response should mention "Ownership"


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-3: Consistency across integrations and reporting
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
