# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-493 - Unhide and delete fields in opportunity - consolidation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:09:10.945Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: This requires changes to Field-Level Security (FLS), page layouts, Lightning record pages / Dynamic Forms, compact layouts, search layouts, list views, reports, and API access.
# Primary Entity: Contract
#
# Fields Involved (1):
#   • and delete fields in opportunity - consolidation (and_delete_fields_in_opportunity_-_consolidation__c) - delete
#
# Test Requirements (5):
#   REQ-1: / WHEN / THEN):A — Unhide Acceptance CriteriaField visibility (UI
#     → Test Type: BOTH | Priority: p1
#   REQ-2: org profiles → FLS is updated → the two fields are readable (
#     → Test Type: UI | Priority: p2
#   REQ-3: dynamic forms or page layouts exist → standard users view or sear
#     → Test Type: BOTH | Priority: p2
#   REQ-4: standard users with reporting/API access → they build reports or 
#     → Test Type: BOTH | Priority: p2
#   REQ-5: the change is deployed → I inspect object schemas across the org 
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

@api @salesforce @SF-493 @medium @field-visibility @contract
Feature: API - SF-493 - Unhide and delete fields in opportunity - consolidation

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify two__c field exists on Contract
    When I describe the Contract object fields
    Then the "two__c" field should exist

  @SF-493 @SF-493-API-002 @p1 @field-exists
  Scenario: API - Verify two__c field exists on Account
    When I describe the Account object fields
    Then the "two__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-API-003 @p1 @api-create
  Scenario: API - Create Contract with two
    When I create a new Contract via POST with:
      | field | value |
      | Name  | API Test Contract |
    Then the API should return status code 201
    And the response should contain the new Contract ID

  @SF-493 @SF-493-API-004 @p1 @api-update
  Scenario: API - Update two__c on Contract
    Given I have an existing Contract record
    When I update the Contract field "two__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-493 @SF-493-API-005 @p2 @api-query
  Scenario: API - Query Contract by two
    Given I have an existing Contract record
    When I query all Contract records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid two__c value
    When I create a new Contract via POST with:
      | field | value |
      | Name  | Invalid Test |
      | two__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "two"

  @SF-493 @SF-493-API-007 @p2 @negative @null-value
  Scenario: API - Handle null two__c value
    Given I have a test Contract created via API without two
    When I query the Contract record via API
    Then the "two__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: / WHEN / THEN):A — Unhide Acceptance CriteriaField visibility (UI
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-3: dynamic forms or page layouts exist → standard users view or sear
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: standard users with reporting/API access → they build reports or 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: the change is deployed → I inspect object schemas across the org 
  #     → Should be tested via API | Priority: p2


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
