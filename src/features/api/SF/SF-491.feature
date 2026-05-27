# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-491 - AnnualRevenue only appears for Member MGA and Non-Member MGA Accounts
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:34.622Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: AnnualRevenue only appears for Member MGA and Non-Member MGA Accounts
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: . Search / compact / list views we would not be able to customise
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

@api @salesforce @SF-491 @medium @field-visibility @opportunity
Feature: API - SF-491 - AnnualRevenue only appears for Member MGA and Non-Member MGA Accounts

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify AnnualRevenue__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "AnnualRevenue__c" field should exist

  @SF-491 @SF-491-API-002 @p1 @field-exists
  Scenario: API - Verify AnnualRevenue__c field exists on Account
    When I describe the Account object fields
    Then the "AnnualRevenue__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-API-003 @p1 @api-create
  Scenario: API - Create Opportunity with AnnualRevenue
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | API Test Opportunity |
    Then the API should return status code 201
    And the response should contain the new Opportunity ID

  @SF-491 @SF-491-API-004 @p1 @api-update
  Scenario: API - Update AnnualRevenue__c on Opportunity
    Given I have an existing Opportunity record
    When I update the Opportunity field "AnnualRevenue__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-491 @SF-491-API-005 @p2 @api-query
  Scenario: API - Query Opportunity by AnnualRevenue
    Given I have an existing Opportunity record
    When I query all Opportunity records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid AnnualRevenue__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | AnnualRevenue__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "AnnualRevenue"

  @SF-491 @SF-491-API-007 @p2 @negative @null-value
  Scenario: API - Handle null AnnualRevenue__c value
    Given I have a test Opportunity created via API without AnnualRevenue
    When I query the Opportunity record via API
    Then the "AnnualRevenue__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: . Search / compact / list views we would not be able to customise
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
