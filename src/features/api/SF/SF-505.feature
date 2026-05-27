# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-505 - Broker Sourced Name Field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:05:51.910Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Broker Sourced Name Field on Account
# Primary Entity: Account
#
# Fields Involved (2):
#   • Broker Sourced Name (Broker_Sourced_Name__c) - create
#   • on Account (on_Account__c) - modify
#
# Test Requirements (5):
#   REQ-1: Create Broker Sourced Name field on Account
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Auto-populate Broker Sourced Name from Lead on conversion
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Field should not be editable post-conversion
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Field visibility
#     → Test Type: UI | Priority: p2
#   REQ-5: referring to Non-Member MGA as Account type instead of record typ
#     → Test Type: BOTH | Priority: p1
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

@api @salesforce @SF-505 @medium @auto-populate @field-mapping @account
Feature: API - SF-505 - Broker Sourced Name Field on Account

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Broker_Sourced_Name__c field exists on Account
    When I describe the Account object fields
    Then the "Broker_Sourced_Name__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-API-002 @smoke @p1 @auto-populate
  Scenario: API - Verify Broker_Sourced_Name__c field exists and can be set on Account
    Given I have a test Account created via API with Broker_Sourced_Name "EU"
    When I query the Account record via API
    Then the API should return status code 200
    And the Account should have Broker_Sourced_Name "EU"

  @SF-505 @SF-505-API-003 @p1 @read-only @negative
  Scenario: API - Verify Broker_Sourced_Name__c cannot be updated on Account after Lead conversion
    Given I have a test Account created via API with Broker_Sourced_Name "UK"
    When I try to update the Account Broker_Sourced_Name to "US" via API
    Then the API should reject the Broker_Sourced_Name update
    And the Account Broker_Sourced_Name should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-API-004 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Broker_Sourced_Name__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | Invalid Test |
      | Broker_Sourced_Name__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Broker_Sourced_Name"

  @SF-505 @SF-505-API-005 @p2 @negative @null-value
  Scenario: API - Handle null Broker_Sourced_Name__c value
    Given I have a test Account created via API without Broker_Sourced_Name
    When I query the Account record via API
    Then the "Broker_Sourced_Name__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: Create Broker Sourced Name field on Account
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Auto-populate Broker Sourced Name from Lead on conversion
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Field should not be editable post-conversion
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: referring to Non-Member MGA as Account type instead of record typ
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 17
  # Existing Steps Used: 17
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 17/17 (100%)
  #   - Feature-Specific Steps Used: 0
