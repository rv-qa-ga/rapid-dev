# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-479 - Delete Legal_Entity__c from Lead only; ensure no impact to other objects or systems
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2025-12-19T15:09:13.369Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Legal_Entity__c from Lead only; ensure no impact to other objects or systems
# Primary Entity: Case
#
# Fields Involved (1):
#   • Legal Entity (Legal_Entity__c) - delete
#
# Test Requirements (5):
#   REQ-1: / WHEN / THEN):Lead-only deletion → I inspect object schemas acro
#     → Test Type: API | Priority: p1
#   REQ-2: a full metadata → I search for references to Lead.Legal_Entity__c
#     → Test Type: API | Priority: p2
#   REQ-3: reports, dashboards → owners update or remove those references → 
#     → Test Type: BOTH | Priority: p2
#   REQ-4: lead deduplication rules → the field is removed → deduplication b
#     → Test Type: BOTH | Priority: p2
#   REQ-5: all scheduled jobs → they run after deletion → none fail with fie
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

@api @salesforce @SF-479 @medium @case
Feature: API - SF-479 - Delete Legal_Entity__c from Lead only; ensure no impact to other objects or systems

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Legal_Entity__c field exists on Case
    When I describe the Case object fields
    Then the "Legal_Entity__c" field should exist

  @SF-479 @SF-479-API-002 @p1 @field-exists
  Scenario: API - Verify Legal_Entity__c field exists on Account
    When I describe the Account object fields
    Then the "Legal_Entity__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-API-003 @p1 @api-create
  Scenario: API - Create Case with Legal_Entity__c
    When I create a new Case via POST with:
      | field | value |
      | Name  | API Test Case |
      | Legal_Entity__c | US |
    Then the API should return status code 201
    And the response should contain the new Case ID

  @SF-479 @SF-479-API-004 @p1 @api-update
  Scenario: API - Update Legal_Entity__c on Case
    Given I have an existing Case record
    When I update the Case field "Legal_Entity__c" to "Updated Value" via API
    Then the API should return status code 204

  @SF-479 @SF-479-API-005 @p2 @api-query
  Scenario: API - Query Case by Legal_Entity__c
    Given I have an existing Case record
    When I query Case where "Legal_Entity__c" equals "US"
    Then the API should return status code 200

  @SF-479 @SF-479-API-006 @p2 @data-driven
  Scenario Outline: API - Create Case with each valid Legal_Entity__c
    When I create a new Case via POST with:
      | field | value |
      | Name  | API Test <value> |
      | Legal_Entity__c | <value> |
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

  @SF-479 @SF-479-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Legal_Entity__c value
    When I create a new Case via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Legal_Entity__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Legal_Entity"

  @SF-479 @SF-479-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Legal_Entity__c value
    Given I have a test Case created via API without Legal_Entity
    When I query the Case record via API
    Then the "Legal_Entity__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: / WHEN / THEN):Lead-only deletion → I inspect object schemas acro
  #     → Should be tested via API | Priority: p1
  #   REQ-2: a full metadata → I search for references to Lead.Legal_Entity__c
  #     → Should be tested via API | Priority: p2
  #   REQ-3: reports, dashboards → owners update or remove those references → 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: lead deduplication rules → the field is removed → deduplication b
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: all scheduled jobs → they run after deletion → none fail with fie
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
