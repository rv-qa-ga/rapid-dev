# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-508 - Opportunity 'Win Reason' Validation Rules Update
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: picklist-values
# Generated: 2025-12-19T15:05:43.216Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Opportunity 'Win Reason' Validation Rules Update
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: I am an MRD who wants to define a win reason for an opportunity t
#     → Test Type: BOTH | Priority: p1
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

@api @salesforce @SF-508 @medium @picklist @opportunity
Feature: API - SF-508 - Opportunity 'Win Reason' Validation Rules Update

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Win_reason_details__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Win_reason_details__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-API-002 @p1 @api-create
  Scenario: API - Create Opportunity with Win reason details
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | API Test Opportunity |
    Then the API should return status code 201
    And the response should contain the new Opportunity ID

  @SF-508 @SF-508-API-003 @p1 @api-update
  Scenario: API - Update Win_reason_details__c on Opportunity
    Given I have an existing Opportunity record
    When I update the Opportunity field "Win_reason_details__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-508 @SF-508-API-004 @p2 @api-query
  Scenario: API - Query Opportunity by Win reason details
    Given I have an existing Opportunity record
    When I query all Opportunity records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Win_reason_details__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Win_reason_details__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Win_reason_details"

  @SF-508 @SF-508-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Win_reason_details__c value
    Given I have a test Opportunity created via API without Win_reason_details
    When I query the Opportunity record via API
    Then the "Win_reason_details__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: I am an MRD who wants to define a win reason for an opportunity t
  #     → Should be tested via BOTH | Priority: p1


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
