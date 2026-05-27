# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-500 - More Opportunity consolidation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:08.439Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: More Opportunity consolidation
# Primary Entity: AccountContactRelation
#
# Test Requirements (1):
#   REQ-1: / WHEN / THEN)A — Field label changeGIVEN the Opportunity object 
#     → Test Type: UI | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • US
#   • UK
#   • EU
#   • CA
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-500 @medium @auto-populate @field-mapping @accountcontactrelation
Feature: API - SF-500 - More Opportunity consolidation

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Current_Program_Expiration_Date__c field exists on AccountContactRelation
    When I describe the AccountContactRelation object fields
    Then the "Current_Program_Expiration_Date__c" field should exist

  @SF-500 @SF-500-API-002 @p1 @field-exists
  Scenario: API - Verify Current_Program_Expiration_Date__c field exists on Account
    When I describe the Account object fields
    Then the "Current_Program_Expiration_Date__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-API-003 @smoke @p1 @lead-conversion
  Scenario: API - Verify Current_Program_Expiration_Date__c maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with Current_Program_Expiration_Date "EU"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Current_Program_Expiration_Date "EU"

  @SF-500 @SF-500-API-004 @p1 @lead-conversion @data-driven
  Scenario Outline: API - Verify Current_Program_Expiration_Date__c maps from Lead to Opportunity for all values during conversion
    Given I have a test Lead created via API with Current_Program_Expiration_Date "<value>"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Current_Program_Expiration_Date "<value>"

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-500 @SF-500-API-005 @p1 @lead-conversion @negative
  Scenario: API - Verify Current_Program_Expiration_Date__c does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with Current_Program_Expiration_Date "UK"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Current_Program_Expiration_Date "UK"
    And the Account should NOT have Current_Program_Expiration_Date

  @SF-500 @SF-500-API-006 @p2 @lead-conversion
  Scenario: API - Verify Current_Program_Expiration_Date__c value is preserved during Lead conversion
    Given I have a test Lead created via API with Current_Program_Expiration_Date "US"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Current_Program_Expiration_Date "US"
    And the Current_Program_Expiration_Date value should match exactly what was on the Lead

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Current_Program_Expiration_Date__c value
    When I create a new AccountContactRelation via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Current_Program_Expiration_Date__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Current_Program_Expiration_Date"

  @SF-500 @SF-500-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Current_Program_Expiration_Date__c value
    Given I have a test AccountContactRelation created via API without Current_Program_Expiration_Date
    When I query the AccountContactRelation record via API
    Then the "Current_Program_Expiration_Date__c" should be null or empty


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
  # Total Steps Analyzed: 24
  # Existing Steps Used: 24
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 24/24 (100%)
  #   - Feature-Specific Steps Used: 0
