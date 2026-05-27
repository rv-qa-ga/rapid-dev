# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-544 - Remove Country and State/Province From Account Object
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:56.987Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove Country and State/Province From Account Object
# Primary Entity: Account
#
# Fields Involved (2):
#   • Country (Country__c) - delete
#   • State/Province (State/Province__c) - delete
#
# Test Requirements (3):
#   REQ-1: Remove Country__c field from all Account record types
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Remove State_Province__c field from all Account record types
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Remove dependencies referencing Country__c or State_Province__c
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

@api @salesforce @SF-544 @medium @field-visibility @account
Feature: API - SF-544 - Remove Country and State/Province From Account Object

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Country__c field exists on Account
    When I describe the Account object fields
    Then the "Country__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-API-002 @p1 @api-create
  Scenario: API - Create Account with Country__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-544 @SF-544-API-003 @p1 @api-update
  Scenario: API - Update Country__c on Account
    Given I have an existing Account record
    When I update the Account field "Country__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-544 @SF-544-API-004 @p2 @api-query
  Scenario: API - Query Account by Country__c
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Country__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Country__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Country"

  @SF-544 @SF-544-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Country__c value
    Given I have a test Account created via API without Country
    When I query the Account record via API
    Then the "Country__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: Remove Country__c field from all Account record types
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Remove State_Province__c field from all Account record types
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Remove dependencies referencing Country__c or State_Province__c
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
