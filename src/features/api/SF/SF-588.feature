# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-588 - Assign Actuary, Underwriter and Exposure team member to the opportunity
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: picklist-values
# Generated: 2026-01-13T21:44:37.111Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 3
# Description: Generator Only - Full automatic generation from Jira data (current behavior)
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Assign Actuary, Underwriter and Exposure team member to the opportunity
# Primary Entity: Opportunity
#
# Test Requirements (2):
#   REQ-1: an Opportunity is in the Due Diligence stage → the MRD prepares t
#     → Test Type: BOTH | Priority: p1
#   REQ-2: an Opportunity is in the Due Diligence stage → a user attempts to
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Underwriter
#   • Actuary
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-588 @medium @picklist @opportunity
Feature: API - SF-588 - Assign Actuary, Underwriter and Exposure team member to the opportunity

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Exposure_Manager__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Exposure_Manager__c" field should exist

  @SF-588 @SF-588-API-002 @p1 @field-exists
  Scenario: API - Verify Exposure_Manager__c field exists on Account
    When I describe the Account object fields
    Then the "Exposure_Manager__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-API-003 @p1 @api-create
  Scenario: API - Create Opportunity with Exposure Manager
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | API Test Opportunity |
      | Exposure_Manager__c | Underwriter |
    Then the API should return status code 201
    And the response should contain the new Opportunity ID

  @SF-588 @SF-588-API-004 @p1 @api-update
  Scenario: API - Update Exposure_Manager__c on Opportunity
    Given I have an existing Opportunity record
    When I update the Opportunity field "Exposure_Manager__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-588 @SF-588-API-005 @p2 @api-query
  Scenario: API - Query Opportunity by Exposure Manager
    Given I have an existing Opportunity record
    When I query Opportunity where "Exposure_Manager__c" equals "Underwriter"
    Then the API should return status code 200

  @SF-588 @SF-588-API-006 @p2 @data-driven
  Scenario Outline: API - Create Opportunity with each valid Exposure Manager
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Exposure_Manager__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | Underwriter |
      | Actuary |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Exposure_Manager__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Exposure_Manager__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Exposure_Manager"

  @SF-588 @SF-588-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Exposure_Manager__c value
    Given I have a test Opportunity created via API without Exposure_Manager
    When I query the Opportunity record via API
    Then the "Exposure_Manager__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: an Opportunity is in the Due Diligence stage → the MRD prepares t
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: an Opportunity is in the Due Diligence stage → a user attempts to
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
