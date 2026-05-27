# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-489 - Delete Account fields Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c, Legal_Entity_Name__c
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2025-12-19T15:06:25.045Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Account fields Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c, Legal_Entity_Name__c
# Primary Entity: Lead
#
# Fields Involved (5):
#   • Series Entity (Series_Entity__c) - delete
#   • Sub Type (Sub_Type__c) - delete
#   • Legal Entity (Legal_Entity__c) - delete
#   • Legal Entity Lookup (Legal_Entity_Lookup__c) - delete
#   • Legal Entity Name (Legal_Entity_Name__c) - delete
#
# Test Requirements (3):
#   REQ-1: / WHEN / THEN):Lead/Account-only deletion → I inspect object sche
#     → Test Type: BOTH | Priority: p1
#   REQ-2: reports, dashboards → owners update or remove those references → 
#     → Test Type: BOTH | Priority: p2
#   REQ-3: production data before deletion → a final backup is taken → a ver
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

@api @salesforce @SF-489 @medium @lead
Feature: API - SF-489 - Delete Account fields Series_Entity__c, Sub_Type__c, Legal_Entity__c, Legal_Entity_Lookup__c, Legal_Entity_Name__c

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Series_Entity__c field exists on Lead
    When I describe the Lead object fields
    Then the "Series_Entity__c" field should exist

  @SF-489 @SF-489-API-002 @p1 @field-exists
  Scenario: API - Verify Series_Entity__c field exists on Account
    When I describe the Account object fields
    Then the "Series_Entity__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-API-003 @p1 @api-create
  Scenario: API - Create Lead with Series_Entity__c
    When I create a new Lead via POST with:
      | field | value |
      | Name  | API Test Lead |
    Then the API should return status code 201
    And the response should contain the new Lead ID

  @SF-489 @SF-489-API-004 @p1 @api-update
  Scenario: API - Update Series_Entity__c on Lead
    Given I have an existing Lead record
    When I update the Lead field "Series_Entity__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-489 @SF-489-API-005 @p2 @api-query
  Scenario: API - Query Lead by Series_Entity__c
    Given I have an existing Lead record
    When I query all Lead records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-489 @SF-489-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Series_Entity__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Series_Entity__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Series_Entity"

  @SF-489 @SF-489-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Series_Entity__c value
    Given I have a test Lead created via API without Series_Entity
    When I query the Lead record via API
    Then the "Series_Entity__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: / WHEN / THEN):Lead/Account-only deletion → I inspect object sche
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: reports, dashboards → owners update or remove those references → 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: production data before deletion → a final backup is taken → a ver
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
