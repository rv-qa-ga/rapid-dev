# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-459 - Update Account field name labels
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:50.229Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Update Account field name labels
# Primary Entity: Case
#
# Fields Involved (1):
#   • name labels (name_labels__c) - modify
#
# Test Requirements (1):
#   REQ-1: Update field labels to reduce data input errorsGiven I am viewing
#     → Test Type: API | Priority: p1
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

@api @salesforce @SF-459 @medium @field-visibility @case
Feature: API - SF-459 - Update Account field name labels

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify label_currently_stated_as__c field exists on Case
    When I describe the Case object fields
    Then the "label_currently_stated_as__c" field should exist

  @SF-459 @SF-459-API-002 @p1 @field-exists
  Scenario: API - Verify label_currently_stated_as__c field exists on Account
    When I describe the Account object fields
    Then the "label_currently_stated_as__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-API-003 @p1 @api-create
  Scenario: API - Create Case with label currently stated as
    When I create a new Case via POST with:
      | field | value |
      | Name  | API Test Case |
    Then the API should return status code 201
    And the response should contain the new Case ID

  @SF-459 @SF-459-API-004 @p1 @api-update
  Scenario: API - Update label_currently_stated_as__c on Case
    Given I have an existing Case record
    When I update the Case field "label_currently_stated_as__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-459 @SF-459-API-005 @p2 @api-query
  Scenario: API - Query Case by label currently stated as
    Given I have an existing Case record
    When I query all Case records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-459 @SF-459-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid label_currently_stated_as__c value
    When I create a new Case via POST with:
      | field | value |
      | Name  | Invalid Test |
      | label_currently_stated_as__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "label_currently_stated_as"

  @SF-459 @SF-459-API-007 @p2 @negative @null-value
  Scenario: API - Handle null label_currently_stated_as__c value
    Given I have a test Case created via API without label_currently_stated_as
    When I query the Case record via API
    Then the "label_currently_stated_as__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Update field labels to reduce data input errorsGiven I am viewing
  #     → Should be tested via API | Priority: p1


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
