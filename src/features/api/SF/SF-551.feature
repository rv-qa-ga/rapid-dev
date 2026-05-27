# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-551 - Make the State and Country field on the Address picklists
# Type: Story | Status: Blocked | Priority: Medium
# Feature Type: picklist-values
# Generated: 2025-12-19T15:08:40.018Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make the State and Country field on the Address picklists
# Primary Entity: Lead
#
# Fields Involved (1):
#   • on the Address picklists (on_the_Address_picklists__c) - modify
#
# Test Requirements (5):
#   REQ-1: Country field standardised as picklist
#     → Test Type: UI | Priority: p1
#   REQ-2: State/Province field standardised as picklist
#     → Test Type: UI | Priority: p2
#   REQ-3: Standard applies to all objects holding address fields
#     → Test Type: BOTH | Priority: p2
#   REQ-4: State/Province values must depend on Country
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Picklist values must remain consistent across systems
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

@api @salesforce @SF-551 @medium @picklist @lead
Feature: API - SF-551 - Make the State and Country field on the Address picklists

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify State_and_Country__c field exists on Lead
    When I describe the Lead object fields
    Then the "State_and_Country__c" field should exist

  @SF-551 @SF-551-API-002 @p1 @field-exists
  Scenario: API - Verify State_and_Country__c field exists on Account
    When I describe the Account object fields
    Then the "State_and_Country__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-API-003 @p1 @api-create
  Scenario: API - Create Lead with State and Country
    When I create a new Lead via POST with:
      | field | value |
      | Name  | API Test Lead |
    Then the API should return status code 201
    And the response should contain the new Lead ID

  @SF-551 @SF-551-API-004 @p1 @api-update
  Scenario: API - Update State_and_Country__c on Lead
    Given I have an existing Lead record
    When I update the Lead field "State_and_Country__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-551 @SF-551-API-005 @p2 @api-query
  Scenario: API - Query Lead by State and Country
    Given I have an existing Lead record
    When I query all Lead records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid State_and_Country__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | State_and_Country__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "State_and_Country"

  @SF-551 @SF-551-API-007 @p2 @negative @null-value
  Scenario: API - Handle null State_and_Country__c value
    Given I have a test Lead created via API without State_and_Country
    When I query the Lead record via API
    Then the "State_and_Country__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-3: Standard applies to all objects holding address fields
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: State/Province values must depend on Country
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Picklist values must remain consistent across systems
  #     → Should be tested via BOTH | Priority: p2


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
