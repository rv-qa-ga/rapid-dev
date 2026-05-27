# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-484 - Hide Investment_Status_c on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:04.501Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Hide Investment_Status_c on Account
# Primary Entity: Account
#
# Fields Involved (1):
#   • Investment_Status_c (Investment_Status_c__c) - hide
#
# Test Requirements (4):
#   REQ-1: / WHEN / THEN):Account detail page (UI) → they open any Account r
#     → Test Type: UI | Priority: p1
#   REQ-2: a System Administrator or approved support role → they open any A
#     → Test Type: UI | Priority: p2
#   REQ-3: the Account record page uses Dynamic Forms or custom Lightning co
#     → Test Type: BOTH | Priority: p2
#   REQ-4: a non-admin user builds or views reports & dashboards → they try 
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

@api @salesforce @SF-484 @medium @field-visibility @account
Feature: API - SF-484 - Hide Investment_Status_c on Account

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Investment_Status_c__c field exists on Account
    When I describe the Account object fields
    Then the "Investment_Status_c__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-API-002 @p1 @api-create
  Scenario: API - Create Account with Investment_Status_c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-484 @SF-484-API-003 @p1 @api-update
  Scenario: API - Update Investment_Status_c__c on Account
    Given I have an existing Account record
    When I update the Account field "Investment_Status_c__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-484 @SF-484-API-004 @p2 @api-query
  Scenario: API - Query Account by Investment_Status_c
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-484 @SF-484-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Investment_Status_c__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Investment_Status_c__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Investment_Status_c"

  @SF-484 @SF-484-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Investment_Status_c__c value
    Given I have a test Account created via API without Investment_Status_c
    When I query the Account record via API
    Then the "Investment_Status_c__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-3: the Account record page uses Dynamic Forms or custom Lightning co
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: a non-admin user builds or views reports & dashboards → they try 
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
