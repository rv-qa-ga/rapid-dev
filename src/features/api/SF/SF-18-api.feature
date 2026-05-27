# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-18 - 8229: View Opportunities and Contracts in Relationship Tab
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-24T15:43:00.833Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8229: View Opportunities and Contracts in Relationship Tab
# Primary Entity: Order
#
# Test Requirements (3):
#   REQ-1: an Account has related Opportunities → I scroll below the FSC Rel
#     → Test Type: BOTH | Priority: p1
#   REQ-2: the Open Opportunities related list is displayed → I view the lis
#     → Test Type: UI | Priority: p2
#   REQ-3: the Active Contracts related list is displayed → I view the list 
#     → Test Type: UI | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Open Opportunities
#   • Opportunity Name
#   • Stage
#   • Close Date
#   • Contract Number
#   • Contract Version
#   • Contract Status
#   • Contract Start Date
#   • Contract End Date
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-18 @medium @auto-populate @field-mapping @order
Feature: API - SF-18 - 8229: View Opportunities and Contracts in Relationship Tab

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify opportunities__c field exists on Order
    When I describe the Order object fields
    Then the "opportunities__c" field should exist

  @SF-18 @SF-18-API-002 @p1 @field-exists
  Scenario: API - Verify opportunities__c field exists on Account
    When I describe the Account object fields
    Then the "opportunities__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-API-003 @smoke @p1 @auto-populate
  Scenario: API - Verify opportunities__c is inherited from Account on Order creation
    Given I have a test Account created via API with opportunities "EU"
    When I create a Order for the Account via API
    Then the API should return status code 201
    And the Order should have opportunities "EU"

  @SF-18 @SF-18-API-004 @p1 @auto-populate @data-driven
  Scenario Outline: API - Verify opportunities__c mapping for all valid values
    Given I have a test Account created via API with opportunities "<value>"
    When I create a Order for the Account via API
    Then the API should return status code 201
    And the Order should have opportunities "<value>"

    Examples:
      | value |
      | Open Opportunities |
      | Opportunity Name |
      | Stage |
      | Close Date |
      | Contract Number |
      | Contract Version |
      | Contract Status |
      | Contract Start Date |
      | Contract End Date |

  @SF-18 @SF-18-API-005 @p1 @read-only @negative
  Scenario: API - Verify opportunities__c cannot be updated on Order after creation
    Given I have a test Account created via API with opportunities "UK"
    And I have a test Order created via API for the Account
    When I try to update the Order opportunities to "US" via API
    Then the API should reject the opportunities update
    And the Order opportunities should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid opportunities__c value
    When I create a new Order via POST with:
      | field | value |
      | Name  | Invalid Test |
      | opportunities__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "opportunities"

  @SF-18 @SF-18-API-007 @p2 @negative @null-value
  Scenario: API - Handle null opportunities__c value
    Given I have a test Order created via API without opportunities
    When I query the Order record via API
    Then the "opportunities__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: an Account has related Opportunities → I scroll below the FSC Rel
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
