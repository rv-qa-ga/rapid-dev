# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-40 - 8105: Standard Account List Views - Member
# Type: Story | Status: In development | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:29.006Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8105: Standard Account List Views - Member
# Primary Entity: Contract
#
# Test Requirements (2):
#   REQ-1: I am a Salesforce User with access to Accounts → I navigate to th
#     → Test Type: UI | Priority: p1
#   REQ-2: standard Account list views are configured → Salesforce Users acc
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • My Active Accounts
#   • My Onboarding Members
#   • Recently Updated
#   • PTY Code
#   • Owner
#   • Type
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

@api @salesforce @SF-40 @medium @field-visibility @contract
Feature: API - SF-40 - 8105: Standard Account List Views - Member

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Active__c field exists on Contract
    When I describe the Contract object fields
    Then the "Active__c" field should exist

  @SF-40 @SF-40-API-002 @p1 @field-exists
  Scenario: API - Verify Active__c field exists on Account
    When I describe the Account object fields
    Then the "Active__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-API-003 @p1 @api-create
  Scenario: API - Create Contract with Active
    When I create a new Contract via POST with:
      | field | value |
      | Name  | API Test Contract |
      | Active__c | My Active Accounts |
    Then the API should return status code 201
    And the response should contain the new Contract ID

  @SF-40 @SF-40-API-004 @p1 @api-update
  Scenario: API - Update Active__c on Contract
    Given I have an existing Contract record
    When I update the Contract field "Active__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-40 @SF-40-API-005 @p2 @api-query
  Scenario: API - Query Contract by Active
    Given I have an existing Contract record
    When I query Contract where "Active__c" equals "My Active Accounts"
    Then the API should return status code 200

  @SF-40 @SF-40-API-006 @p2 @data-driven
  Scenario Outline: API - Create Contract with each valid Active
    When I create a new Contract via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Active__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | My Active Accounts |
      | My Onboarding Members |
      | Recently Updated |
      | PTY Code |
      | Owner |
      | Type |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Active__c value
    When I create a new Contract via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Active__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Active"

  @SF-40 @SF-40-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Active__c value
    Given I have a test Contract created via API without Active
    When I query the Contract record via API
    Then the "Active__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-2: standard Account list views are configured → Salesforce Users acc
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
