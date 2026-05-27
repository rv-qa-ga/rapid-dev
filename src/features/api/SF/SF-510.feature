# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-510 - Data Source and Effective From Fields – Visibility and Validation Rules
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:37.538Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Data Source and Effective From Fields – Visibility and Validation Rules
# Primary Entity: Account
#
# Fields Involved (2):
#   • – Visibility (–_Visibility__c) - modify
#   • Validation Rules (Validation_Rules__c) - modify
#
# Test Requirements (8):
#   REQ-1: Data_Source_Written__c field visible on all Accounts
#     → Test Type: UI | Priority: p1
#   REQ-2: Data_Source_Written__c mandatory for onboarding Members
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Data_Source_Claims__c field visible on all Accounts
#     → Test Type: UI | Priority: p2
#   REQ-4: Data_Source_Claims__c mandatory for onboarding TPAs
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Create and show Written Accounting Period Effective From field
#     → Test Type: UI | Priority: p2
#   REQ-6: Written Accounting Period Effective From required when Data Sourc
#     → Test Type: BOTH | Priority: p2
#   REQ-7: Create and show Claims Production Period Effective From field
#     → Test Type: UI | Priority: p2
#   REQ-8: Claims Production Period Effective From required when Data Source
#     → Test Type: API | Priority: p2
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

@api @salesforce @SF-510 @medium @field-visibility @account
Feature: API - SF-510 - Data Source and Effective From Fields – Visibility and Validation Rules

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Data_Source_Written__c field exists on Account
    When I describe the Account object fields
    Then the "Data_Source_Written__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-API-002 @p1 @api-create
  Scenario: API - Create Account with Data_Source_Written__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
      | Data_Source_Written__c | Date |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-510 @SF-510-API-003 @p1 @api-update
  Scenario: API - Update Data_Source_Written__c on Account
    Given I have an existing Account record
    When I update the Account field "Data_Source_Written__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-510 @SF-510-API-004 @p2 @api-query
  Scenario: API - Query Account by Data_Source_Written__c
    Given I have an existing Account record
    When I query Account where "Data_Source_Written__c" equals "Date"
    Then the API should return status code 200

  @SF-510 @SF-510-API-005 @p2 @data-driven
  Scenario Outline: API - Create Account with each valid Data_Source_Written__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Data_Source_Written__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | Date |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-510 @SF-510-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Data_Source_Written__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Data_Source_Written__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Data_Source_Written"

  @SF-510 @SF-510-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Data_Source_Written__c value
    Given I have a test Account created via API without Data_Source_Written
    When I query the Account record via API
    Then the "Data_Source_Written__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-2: Data_Source_Written__c mandatory for onboarding Members
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Data_Source_Claims__c mandatory for onboarding TPAs
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: Written Accounting Period Effective From required when Data Sourc
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-8: Claims Production Period Effective From required when Data Source
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
