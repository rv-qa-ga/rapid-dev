# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-486 - Make Affiliate Status and Party Code mandatory when Account Type = Reinsurer and Ownership = Owned
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:28.450Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Affiliate Status and Party Code mandatory when Account Type = Reinsurer and Ownership = Owned
# Primary Entity: Account
#
# Fields Involved (2):
#   • Affiliate Status (Affiliate_Status__c) - validate
#   • Party Code (Party_Code__c) - validate
#
# Test Requirements (3):
#   REQ-1: / WHEN / THEN):Mandatory on Create (UI) → Account Type = Reinsure
#     → Test Type: BOTH | Priority: p1
#   REQ-2: an existing Account where Account Type = Reinsurer → a user attem
#     → Test Type: BOTH | Priority: p2
#   REQ-3: an API call, integration or automated job attempts to create or u
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

@api @salesforce @SF-486 @medium @field-visibility @account
Feature: API - SF-486 - Make Affiliate Status and Party Code mandatory when Account Type = Reinsurer and Ownership = Owned

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Affiliate_Non_Affiliate__c field exists on Account
    When I describe the Account object fields
    Then the "Affiliate_Non_Affiliate__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-API-002 @p1 @api-create
  Scenario: API - Create Account with Affiliate_Non_Affiliate__c
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-486 @SF-486-API-003 @p1 @api-update
  Scenario: API - Update Affiliate_Non_Affiliate__c on Account
    Given I have an existing Account record
    When I update the Account field "Affiliate_Non_Affiliate__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-486 @SF-486-API-004 @p2 @api-query
  Scenario: API - Query Account by Affiliate_Non_Affiliate__c
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Affiliate_Non_Affiliate__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Affiliate_Non_Affiliate__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Affiliate_Non_Affiliate"

  @SF-486 @SF-486-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Affiliate_Non_Affiliate__c value
    Given I have a test Account created via API without Affiliate_Non_Affiliate
    When I query the Account record via API
    Then the "Affiliate_Non_Affiliate__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: / WHEN / THEN):Mandatory on Create (UI) → Account Type = Reinsure
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: an existing Account where Account Type = Reinsurer → a user attem
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: an API call, integration or automated job attempts to create or u
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
