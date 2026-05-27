# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-480 - Delete Account fields Mission_Series_MGA_c and Owned_MGA_c
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:08:15.512Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Account fields Mission_Series_MGA_c and Owned_MGA_c
# Primary Entity: Lead
#
# Fields Involved (2):
#   • Account fields Mission_Series_MGA_c (Account_fields_Mission_Series_MGA_c__c) - delete
#   • Owned_MGA_c (Owned_MGA_c__c) - delete
#
# Test Requirements (6):
#   REQ-1: the change is deployed → object schemas across the org are inspec
#     → Test Type: BOTH | Priority: p1
#   REQ-2: the Account object → the Ownership field is reviewed → it exists 
#     → Test Type: API | Priority: p2
#   REQ-3: a full metadata → searching for references to Account.Mission_Ser
#     → Test Type: API | Priority: p2
#   REQ-4: integration owners → each owner confirms dependency status → no e
#     → Test Type: BOTH | Priority: p2
#   REQ-5: reports, dashboards, → owners update or remove those references →
#     → Test Type: BOTH | Priority: p2
#   REQ-6: lead deduplication rules → the fields are removed → deduplication
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Independent
#   • Mission
#   • Owned
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-480 @medium @auto-populate @field-mapping @lead
Feature: API - SF-480 - Delete Account fields Mission_Series_MGA_c and Owned_MGA_c

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Ownership__c field exists on Lead
    When I describe the Lead object fields
    Then the "Ownership__c" field should exist

  @SF-480 @SF-480-API-002 @p1 @field-exists
  Scenario: API - Verify Ownership__c field exists on Account
    When I describe the Account object fields
    Then the "Ownership__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-API-003 @smoke @p1 @auto-populate
  Scenario: API - Verify Ownership__c is inherited from Account on Lead creation
    Given I have a test Account created via API with Ownership "EU"
    When I create a Lead for the Account via API
    Then the API should return status code 201
    And the Lead should have Ownership "EU"

  @SF-480 @SF-480-API-004 @p1 @auto-populate @data-driven
  Scenario Outline: API - Verify Ownership__c mapping for all valid values
    Given I have a test Account created via API with Ownership "<value>"
    When I create a Lead for the Account via API
    Then the API should return status code 201
    And the Lead should have Ownership "<value>"

    Examples:
      | value |
      | Independent |
      | Mission |
      | Owned |

  @SF-480 @SF-480-API-005 @p1 @read-only @negative
  Scenario: API - Verify Ownership__c cannot be updated on Lead after creation
    Given I have a test Account created via API with Ownership "UK"
    And I have a test Lead created via API for the Account
    When I try to update the Lead Ownership to "US" via API
    Then the API should reject the Ownership update
    And the Lead Ownership should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Ownership__c value
    When I create a new Lead via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Ownership__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Ownership"

  @SF-480 @SF-480-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Ownership__c value
    Given I have a test Lead created via API without Ownership
    When I query the Lead record via API
    Then the "Ownership__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (6):
  #   REQ-1: the change is deployed → object schemas across the org are inspec
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: the Account object → the Ownership field is reviewed → it exists 
  #     → Should be tested via API | Priority: p2
  #   REQ-3: a full metadata → searching for references to Account.Mission_Ser
  #     → Should be tested via API | Priority: p2
  #   REQ-4: integration owners → each owner confirms dependency status → no e
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: reports, dashboards, → owners update or remove those references →
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: lead deduplication rules → the fields are removed → deduplication
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
