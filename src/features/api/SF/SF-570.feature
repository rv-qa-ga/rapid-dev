# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-570 - Introduce an additional picklist value in Account.Account_Status_c
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-behavior
# Generated: 2025-12-24T19:17:45.837Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Introduce an additional picklist value in Account.Account_Status_c
# Primary Entity: Account
#
# Test Requirements (6):
#   REQ-1: Invalid value added to Account Status picklist
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Restrict who can set a record to Invalid
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Authorised users may move a record to Invalid
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Impact assessment must be confirmed before setting status to Inva
#     → Test Type: UI | Priority: p2
#   REQ-5: Governance check before invalidation
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Invalid Accounts are read-only for non-authorised users
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

@api @salesforce @SF-570 @medium @field-behavior @read-only @account
Feature: API - SF-570 - Introduce an additional picklist value in Account.Account_Status_c

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Account_Status__c field exists on Account
    When I describe the Account object fields
    Then the "Account_Status__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-API-002 @p1 @read-only
  Scenario: API - Verify Account_Status__c field is marked as not updateable
    When I describe the Account object fields
    Then the "Account_Status__c" field should exist
    And the "Account_Status__c" field should be marked as not updateable

  @SF-570 @SF-570-API-003 @p1 @negative
  Scenario: API - Verify Account_Status__c cannot be updated after creation
    Given I have an existing Account record
    When I update the Account field "Account_Status__c" to "Invalid" via API
    Then the API should return an error

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-570 @SF-570-API-004 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Account_Status__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Account_Status__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Account_Status"

  @SF-570 @SF-570-API-005 @p2 @negative @null-value
  Scenario: API - Handle null Account_Status__c value
    Given I have a test Account created via API without Account_Status
    When I query the Account record via API
    Then the "Account_Status__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: Invalid value added to Account Status picklist
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Restrict who can set a record to Invalid
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Authorised users may move a record to Invalid
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Governance check before invalidation
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: Invalid Accounts are read-only for non-authorised users
  #     → Should be tested via API | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 14
  # Existing Steps Used: 14
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 14/14 (100%)
  #   - Feature-Specific Steps Used: 0
