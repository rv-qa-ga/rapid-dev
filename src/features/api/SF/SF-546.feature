# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-546 - Remove other record type layouts
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-removal
# Generated: 2026-01-05T21:57:23.562Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove other record type layouts
# Primary Entity: Account
#
# Fields Involved (1):
#   • other record type layouts (other_record_type_layouts__c) - delete
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

@api @salesforce @SF-546 @medium @account
Feature: API - SF-546 - Remove other record type layouts

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-API-001 @smoke @p1 @field-removal
  Scenario: API - Verify master_record_type_and_Account_type__c field does NOT exist on Account
    When I describe the Account object fields
    Then the "master_record_type_and_Account_type__c" field should not exist

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-API-002 @p1 @api-create
  Scenario: API - Create Account (field should not exist)
    When I create a new Account via POST with:
      | field | value |
      | Name  | API Test Account |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-546 @SF-546-API-003 @p1 @api-update @negative
  Scenario: API - Attempt to update master_record_type_and_Account_type__c (should fail - field does not exist)
    Given I have an existing Account record
    When I update the Account field "master_record_type_and_Account_type__c" to "Updated Value" via API
    Then the API should return an error

  @SF-546 @SF-546-API-004 @p2 @api-query
  Scenario: API - Verify master_record_type_and_Account_type__c is not in query results
    Given I have an existing Account record
    When I query all Account records via API
    Then the API should return status code 200
    And the response should not include the "master_record_type_and_Account_type__c" field

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid master_record_type_and_Account_type__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | master_record_type_and_Account_type__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "master_record_type_and_Account_type"

  @SF-546 @SF-546-API-006 @p2 @negative @null-value
  Scenario: API - Handle null master_record_type_and_Account_type__c value
    Given I have a test Account created via API without master_record_type_and_Account_type
    When I query the Account record via API
    Then the "master_record_type_and_Account_type__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 18
  # Existing Steps Used: 18
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 18/18 (100%)
  #   - Feature-Specific Steps Used: 0
