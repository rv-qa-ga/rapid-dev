# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-521 - Allow Users to Merge Potential Duplicate Records
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: permission-based
# Generated: 2025-12-19T15:09:01.308Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Allow Users to Merge Potential Duplicate Records
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: I encounter potential duplicates of a particular record → I confi
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

@api @salesforce @SF-521 @medium @permissions @roles @opportunity
Feature: API - SF-521 - Allow Users to Merge Potential Duplicate Records

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Allow_Users_to_Merge_Potential_Duplicate_Records__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Allow_Users_to_Merge_Potential_Duplicate_Records__c" field should exist

  @SF-521 @SF-521-API-002 @p1 @field-exists
  Scenario: API - Verify Allow_Users_to_Merge_Potential_Duplicate_Records__c field exists on Account
    When I describe the Account object fields
    Then the "Allow_Users_to_Merge_Potential_Duplicate_Records__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-API-003 @p1 @api-create
  Scenario: API - Create Opportunity with Allow Users to Merge Potential Duplicate Records
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | API Test Opportunity |
    Then the API should return status code 201
    And the response should contain the new Opportunity ID

  @SF-521 @SF-521-API-004 @p1 @api-update
  Scenario: API - Update Allow_Users_to_Merge_Potential_Duplicate_Records__c on Opportunity
    Given I have an existing Opportunity record
    When I update the Opportunity field "Allow_Users_to_Merge_Potential_Duplicate_Records__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-521 @SF-521-API-005 @p2 @api-query
  Scenario: API - Query Opportunity by Allow Users to Merge Potential Duplicate Records
    Given I have an existing Opportunity record
    When I query all Opportunity records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Allow_Users_to_Merge_Potential_Duplicate_Records__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Allow_Users_to_Merge_Potential_Duplicate_Records__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Allow_Users_to_Merge_Potential_Duplicate_Records"

  @SF-521 @SF-521-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Allow_Users_to_Merge_Potential_Duplicate_Records__c value
    Given I have a test Opportunity created via API without Allow_Users_to_Merge_Potential_Duplicate_Records
    When I query the Opportunity record via API
    Then the "Allow_Users_to_Merge_Potential_Duplicate_Records__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: I encounter potential duplicates of a particular record → I confi
  #     → Should be tested via BOTH | Priority: p1


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
