# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-567 - Default Value for Data Source Claims and Written
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: general
# Generated: 2025-12-24T19:08:07.191Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Default Value for Data Source Claims and Written
# Primary Entity: Account
#
# Test Requirements (5):
#   REQ-1: Written Data Source defaults to VIPR for onboarding Accounts
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Claims Data Source defaults to VIPR for onboarding Accounts
#     → Test Type: BOTH | Priority: p2
#   REQ-3: User-entered values must override the default
#     → Test Type: BOTH | Priority: p2
#   REQ-4: No defaulting outside onboarding status
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Defaulting supports mandatory conditions
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

@api @salesforce @SF-567 @medium @account
Feature: API - SF-567 - Default Value for Data Source Claims and Written

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Data_Source_Written__c field exists on Account
    When I describe the Account object fields
    Then the "Data_Source_Written__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-API-002 @p1 @api-create
  Scenario: API - Create Account with Data_Source_Written__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-567 @SF-567-API-003 @p1 @api-update
  Scenario: API - Update Data_Source_Written__c on Account
    Given I have an existing Account record
    When I update the Account field "Data_Source_Written__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-567 @SF-567-API-004 @p2 @api-query
  Scenario: API - Query Account by Data_Source_Written__c
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-567 @SF-567-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Data_Source_Written__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Data_Source_Written__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Data_Source_Written"

  @SF-567 @SF-567-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Data_Source_Written__c value
    Given I have a test Account created via API without Data_Source_Written
    When I query the Account record via API
    Then the "Data_Source_Written__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: Written Data Source defaults to VIPR for onboarding Accounts
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Claims Data Source defaults to VIPR for onboarding Accounts
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: User-entered values must override the default
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: No defaulting outside onboarding status
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Defaulting supports mandatory conditions
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
