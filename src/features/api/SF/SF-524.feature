# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-524 - Configure Admission Status Field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:59.341Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Configure Admission Status Field on Account
# Primary Entity: AccountContactRelation
#
# Fields Involved (1):
#   • on Account (on_Account__c) - modify
#
# Test Requirements (5):
#   REQ-1: Admission Status field visible and mandatory for Insurers
#     → Test Type: UI | Priority: p1
#   REQ-2: Admission Status hidden for all non-Insurer account types
#     → Test Type: UI | Priority: p2
#   REQ-3: Default value for non-Insurer account types
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Validation for Insurer accounts
#     → Test Type: UI | Priority: p2
#   REQ-5: -532e5517b94dCommit notes: Source: Dev (gearsetintegration@acceli
#     → Test Type: API | Priority: p2
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

@api @salesforce @SF-524 @medium @field-visibility @accountcontactrelation
Feature: API - SF-524 - Configure Admission Status Field on Account

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Admission_Status__c field exists on AccountContactRelation
    When I describe the AccountContactRelation object fields
    Then the "Admission_Status__c" field should exist

  @SF-524 @SF-524-API-002 @p1 @field-exists
  Scenario: API - Verify Admission_Status__c field exists on Account
    When I describe the Account object fields
    Then the "Admission_Status__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-API-003 @p1 @api-create
  Scenario: API - Create AccountContactRelation with Admission_Status__c
    When I create a new AccountContactRelation via POST with:
      | field | value |
      | Name  | API Test AccountContactRelation |
      | Admission_Status__c | US |
    Then the API should return status code 201
    And the response should contain the new AccountContactRelation ID

  @SF-524 @SF-524-API-004 @p1 @api-update
  Scenario: API - Update Admission_Status__c on AccountContactRelation
    Given I have an existing AccountContactRelation record
    When I update the AccountContactRelation field "Admission_Status__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-524 @SF-524-API-005 @p2 @api-query
  Scenario: API - Query AccountContactRelation by Admission_Status__c
    Given I have an existing AccountContactRelation record
    When I query AccountContactRelation where "Admission_Status__c" equals "US"
    Then the API should return status code 200

  @SF-524 @SF-524-API-006 @p2 @data-driven
  Scenario Outline: API - Create AccountContactRelation with each valid Admission_Status__c
    When I create a new AccountContactRelation via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Admission_Status__c | <value> |
    Then the API should return status code 201

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-524 @SF-524-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Admission_Status__c value
    When I create a new AccountContactRelation via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Admission_Status__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Admission_Status"

  @SF-524 @SF-524-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Admission_Status__c value
    Given I have a test AccountContactRelation created via API without Admission_Status
    When I query the AccountContactRelation record via API
    Then the "Admission_Status__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-3: Default value for non-Insurer account types
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: -532e5517b94dCommit notes: Source: Dev (gearsetintegration@acceli
  #     → Should be tested via API | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 16
  # Existing Steps Used: 16
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 16/16 (100%)
  #   - Feature-Specific Steps Used: 0
