# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-523 - Hide Account Fields
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-08T19:38:10.373Z (FeatureGenerator v3.1)
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
# Overview: Hide Account Fields
# Primary Entity: Account
#
# Fields Involved (1):
#   • Account Fields (Account_Fields__c) - hide
#
# Account Types Involved (17):
#   • Acquisition Company
#   • Agency
#   • Agency Branch
#   • Distribution Partner
#   • Group
#   • Insurer
#   • Insurer Branch
#   • Legal Entity
#   • Member
#   • Non-Member MGA
#   • Placing Broker
#   • Reinsurance Broker
#   • Reinsurer
#   • Reinsurer Branch
#   • Service Company
#   • Third Party Administrator (TPA)
#   • TPA Group
#
# Test Requirements (5):
#   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
#     → Test Type: UI | Priority: p1
#   REQ-2: Verify "Account Fields" is hidden on Account page layout (for all
#     → Test Type: UI | Priority: p2
#   REQ-3: Hide fields from all Account Types
#     → Test Type: BOTH | Priority: p1
#   REQ-4: Prevent population of fields
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Remove references to fields in automation or reporting
#     → Test Type: BOTH | Priority: p2
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

@api @salesforce @SF-523 @medium @field-visibility @account
Feature: API - SF-523 - Hide Account Fields

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Account_Fields__c field exists on Account
    When I describe the Account object fields
    Then the "Account_Fields__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-API-002 @p1 @api-create
  Scenario: API - Create Account with First_Written_Premium_Date__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-523 @SF-523-API-003 @p1 @api-update
  Scenario: API - Update First_Written_Premium_Date__c on Account
    Given I have an existing Account record
    When I update the Account field "First_Written_Premium_Date__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-523 @SF-523-API-004 @p2 @api-query
  Scenario: API - Query Account by First_Written_Premium_Date__c
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-523 @SF-523-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid First_Written_Premium_Date__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | First_Written_Premium_Date__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "First_Written_Premium_Date"

  @SF-523 @SF-523-API-006 @p2 @negative @null-value
  Scenario: API - Handle null First_Written_Premium_Date__c value
    Given I have a test Account created via API without First_Written_Premium_Date
    When I query the Account record via API
    Then the "First_Written_Premium_Date__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-3: Hide fields from all Account Types
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: Prevent population of fields
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Remove references to fields in automation or reporting
  #     → Should be tested via BOTH | Priority: p2


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
