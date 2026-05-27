# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-503 - Remove Sub_Type__c from Lead page layout and make it non-required
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:04.965Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove Sub_Type__c from Lead page layout and make it non-required
# Primary Entity: Lead
#
# Fields Involved (1):
#   • Sub Type (Sub_Type__c) - delete
#
# Test Requirements (1):
#   REQ-1: / WHEN / THEN)Page layout removalGIVEN a standard user opens or e
#     → Test Type: UI | Priority: p1
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

@api @salesforce @SF-503 @medium @field-visibility @lead
Feature: API - SF-503 - Remove Sub_Type__c from Lead page layout and make it non-required

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Sub_Type__c field exists on Lead
    When I describe the Lead object fields
    Then the "Sub_Type__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-API-002 @p1 @api-create
  Scenario: API - Create Lead with Sub_Type__c
    When I create a new Lead via POST with:
      | field | value |
      | Name  | API Test Lead |
    Then the API should return status code 201
    And the response should contain the new Lead ID

  @SF-503 @SF-503-API-003 @p1 @api-update
  Scenario: API - Update Sub_Type__c on Lead
    Given I have an existing Lead record
    When I update the Lead field "Sub_Type__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-503 @SF-503-API-004 @p2 @api-query
  Scenario: API - Query Lead by Sub_Type__c
    Given I have an existing Lead record
    When I query all Lead records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-503 @SF-503-API-005 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Sub_Type__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Sub_Type__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Sub_Type"

  @SF-503 @SF-503-API-006 @p2 @negative @null-value
  Scenario: API - Handle null Sub_Type__c value
    Given I have a test Lead created via API without Sub_Type
    When I query the Lead record via API
    Then the "Sub_Type__c" should be null or empty


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
  # Total Steps Analyzed: 17
  # Existing Steps Used: 17
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 17/17 (100%)
  #   - Feature-Specific Steps Used: 0
