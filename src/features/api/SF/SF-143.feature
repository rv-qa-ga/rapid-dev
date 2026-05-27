# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-143 - Leads UAT Final Feedback
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:24.254Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Leads UAT Final Feedback
# Primary Entity: Opportunity
#
# Test Requirements (14):
#   REQ-1: Target Insured Revenue Size is not required to move from New to F
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Broker Sourced field not mandatory at creation
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Broker Sourced and Broker Name required to progress to Funnel
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Member Qualification Action Plan not mandatory when converting
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Unqualified status includes key fields
#     → Test Type: BOTH | Priority: p1
#   REQ-6: Validation message shown for missing Unqualified Reason
#     → Test Type: UI | Priority: p2
#   REQ-7: Replace Region with Target Insured Industry in Highlights Panel
#     → Test Type: UI | Priority: p1
#   REQ-8: Change label for Proposed Expiration Date
#     → Test Type: BOTH | Priority: p2
#   REQ-9: Hide Series Entity field
#     → Test Type: UI | Priority: p2
#   REQ-10: All users can see qualified leads
#     → Test Type: BOTH | Priority: p1
#   REQ-11: Users can see all leads
#     → Test Type: BOTH | Priority: p2
#   REQ-12: Broker Source auto-populates on Opportunity
#     → Test Type: BOTH | Priority: p1
#   REQ-13: User can merge potential duplicate leads
#     → Test Type: API | Priority: p1
#   REQ-14: Broker Source auto-populates on Opportunity
#     → Test Type: BOTH | Priority: p1
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

@api @salesforce @SF-143 @medium @auto-populate @field-mapping @opportunity
Feature: API - SF-143 - Leads UAT Final Feedback

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Funnel__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Funnel__c" field should exist

  @SF-143 @SF-143-API-002 @p1 @field-exists
  Scenario: API - Verify Funnel__c field exists on Account
    When I describe the Account object fields
    Then the "Funnel__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-API-003 @smoke @p1 @lead-conversion
  Scenario: API - Verify Funnel__c maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with Funnel "EU"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Funnel "EU"

  @SF-143 @SF-143-API-004 @p1 @lead-conversion @data-driven
  Scenario Outline: API - Verify Funnel__c maps from Lead to Opportunity for all values during conversion
    Given I have a test Lead created via API with Funnel "<value>"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Funnel "<value>"

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-143 @SF-143-API-005 @p1 @lead-conversion @negative
  Scenario: API - Verify Funnel__c does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with Funnel "UK"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Funnel "UK"
    And the Account should NOT have Funnel

  @SF-143 @SF-143-API-006 @p2 @lead-conversion
  Scenario: API - Verify Funnel__c value is preserved during Lead conversion
    Given I have a test Lead created via API with Funnel "US"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Opportunity should have Funnel "US"
    And the Funnel value should match exactly what was on the Lead

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-143 @SF-143-API-007 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Funnel__c value
    When I create a new Opportunity via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Funnel__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Funnel"

  @SF-143 @SF-143-API-008 @p2 @negative @null-value
  Scenario: API - Handle null Funnel__c value
    Given I have a test Opportunity created via API without Funnel
    When I query the Opportunity record via API
    Then the "Funnel__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 11
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (11):
  #   REQ-1: Target Insured Revenue Size is not required to move from New to F
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Broker Sourced field not mandatory at creation
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Broker Sourced and Broker Name required to progress to Funnel
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Member Qualification Action Plan not mandatory when converting
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Unqualified status includes key fields
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-8: Change label for Proposed Expiration Date
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-10: All users can see qualified leads
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-11: Users can see all leads
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-12: Broker Source auto-populates on Opportunity
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-13: User can merge potential duplicate leads
  #     → Should be tested via API | Priority: p1
  #   REQ-14: Broker Source auto-populates on Opportunity
  #     → Should be tested via BOTH | Priority: p1


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
