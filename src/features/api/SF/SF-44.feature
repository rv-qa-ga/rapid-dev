# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-44 - 8108: Binding Authority Limited Flag
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:25.141Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8108: Binding Authority Limited Flag
# Primary Entity: Account
#
# Test Requirements (2):
#   REQ-1: I am viewing a Member Account → the Binding Authority Limited che
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a Member Account has Binding Authority Limited = TRUE → any user 
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

@api @salesforce @SF-44 @medium @field-visibility @account
Feature: API - SF-44 - 8108: Binding Authority Limited Flag

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-44 @SF-44-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify checkbox_is_checked_Then_the_Reason__c field exists on Account
    When I describe the Account object fields
    Then the "checkbox_is_checked_Then_the_Reason__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-44 @SF-44-API-002 @p1 @api-create
  Scenario: API - Create Account with checkbox is checked
Then the Reason
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-44 @SF-44-API-003 @p1 @api-update
  Scenario: API - Update checkbox_is_checked_Then_the_Reason__c on Account
    Given I have an existing Account record
    When I update the Account field "checkbox_is_checked_Then_the_Reason__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-44 @SF-44-API-004 @p2 @api-query
  Scenario: API - Query Account by checkbox is checked
Then the Reason
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-44 @SF-44-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid checkbox_is_checked_Then_the_Reason__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | checkbox_is_checked_Then_the_Reason__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "checkbox_is_checked_Then_the_Reason"

  @SF-44 @SF-44-API-006 @p2 @negative @null-value
  Scenario: API - Handle null checkbox_is_checked_Then_the_Reason__c value
    Given I have a test Account created via API without checkbox_is_checked_Then_the_Reason
    When I query the Account record via API
    Then the "checkbox_is_checked_Then_the_Reason__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: I am viewing a Member Account → the Binding Authority Limited che
  #     → Should be tested via BOTH | Priority: p1


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
