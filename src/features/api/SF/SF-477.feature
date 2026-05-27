# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-477 - Create Opportunity field Annual_GWP_Estimate_Year_1__c (editable) and sync updates back to Lead
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:19.576Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Create Opportunity field Annual_GWP_Estimate_Year_1__c (editable) and sync updates back to Lead
# Primary Entity: Case
#
# Fields Involved (2):
#   • Annual_GWP_Estimate_Year_1__c (editable) (Annual_GWP_Estimate_Year_1__c_(editable)__c) - modify
#   • sync updates back to Lead (sync_updates_back_to_Lead__c) - modify
#
# Test Requirements (4):
#   REQ-1: / WHEN / THEN):Field creation → I inspect Opportunity fields → th
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a Lead with Annual_GWP_Estimate_Year_1__c populated → that Lead i
#     → Test Type: BOTH | Priority: p2
#   REQ-3: any Salesforce user with edit rights to Opportunity → they open a
#     → Test Type: BOTH | Priority: p2
#   REQ-4: an Opportunity that was created from a Lead → the Opportunity.Ann
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Owned
#   • Mission
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-477 @medium @auto-populate @field-mapping @case
Feature: API - SF-477 - Create Opportunity field Annual_GWP_Estimate_Year_1__c (editable) and sync updates back to Lead

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Opportunity__c field exists on Case
    When I describe the Case object fields
    Then the "Opportunity__c" field should exist

  @SF-477 @SF-477-API-002 @p1 @field-exists
  Scenario: API - Verify Opportunity__c field exists on Account
    When I describe the Account object fields
    Then the "Opportunity__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-API-003 @smoke @p1 @lead-conversion
  Scenario: API - Verify Opportunity__c maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with Opportunity "EU"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Opportunity "EU"

  @SF-477 @SF-477-API-004 @p1 @lead-conversion @data-driven
  Scenario Outline: API - Verify Opportunity__c maps from Lead to Opportunity for all values during conversion
    Given I have a test Lead created via API with Opportunity "<value>"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Opportunity "<value>"

    Examples:
      | value |
      | Owned |
      | Mission |

  @SF-477 @SF-477-API-005 @p1 @lead-conversion @negative
  Scenario: API - Verify Opportunity__c does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with Opportunity "UK"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Opportunity "UK"
    And the Account should NOT have Opportunity

  @SF-477 @SF-477-API-006 @p2 @lead-conversion
  Scenario: API - Verify Opportunity__c value is preserved during Lead conversion
    Given I have a test Lead created via API with Opportunity "US"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Opportunity "US"
    And the Opportunity value should match exactly what was on the Lead

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Opportunity__c value
    When I create a new Case via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Opportunity__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Opportunity"

  @SF-477 @SF-477-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Opportunity__c value
    Given I have a test Case created via API without Opportunity
    When I query the Case record via API
    Then the "Opportunity__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: / WHEN / THEN):Field creation → I inspect Opportunity fields → th
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: a Lead with Annual_GWP_Estimate_Year_1__c populated → that Lead i
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: any Salesforce user with edit rights to Opportunity → they open a
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: an Opportunity that was created from a Lead → the Opportunity.Ann
  #     → Should be tested via API | Priority: p2


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
