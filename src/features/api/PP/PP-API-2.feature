# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-2 -  Update to TPA Mapping
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-21T17:54:25.815Z (FeatureGenerator v3.1)
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
# Overview:  Update to TPA Mapping
# Primary Entity: Account
#
# Test Requirements (3):
#   REQ-1: TPA Group Pulled from Parties TableGiven a Party exists in Refere
#     → Test Type: BOTH | Priority: p1
#   REQ-2: TPA Group Field Is Not MandatoryGiven a TPA Mapping record is bei
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Inclusion of All Third Party AdministratorsGiven Parties exist in
#     → Test Type: BOTH | Priority: p2
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

@api @dynamics @PP-2 @medium @dynamics @d365 @auto-populate @field-mapping @account
Feature: API - PP-2 -  Update to TPA Mapping

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @PP-2 @PP-2-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify non__c field exists on Account
    When I call the Dynamics API to describe accounts entity
    Then the "non__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-2 @PP-2-API-002 @smoke @p1 @auto-populate
  Scenario: API - Verify non__c is inherited from Account on Account creation
    Given I have a test Account created via API with non "EU"
    When I create a Account for the Account via API
    Then the API should return status code 201
    And the Account should have non "EU"

  @PP-2 @PP-2-API-003 @p1 @read-only @negative
  Scenario: API - Verify non__c cannot be updated on Account after creation
    Given I have a test Account created via API with non "UK"
    And I have a test Account created via API for the Account
    When I try to update the Account non to "US" via API
    Then the API should reject the non update
    And the Account non should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-2 @PP-2-API-004 @p2 @negative @invalid-value
  Scenario: API - Reject invalid non__c value
    When I create a Dynamics accounts record via API with:
      | field | value |
      | Name  | Invalid Test |
      | non__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "non"

  @PP-2 @PP-2-API-005 @p2 @negative @null-value
  Scenario: API - Handle null non__c value
    Given I have a test Account created via API without non
    When I query Dynamics accounts records via API
    Then the "non__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: TPA Group Pulled from Parties TableGiven a Party exists in Refere
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: TPA Group Field Is Not MandatoryGiven a TPA Mapping record is bei
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Inclusion of All Third Party AdministratorsGiven Parties exist in
  #     → Should be tested via BOTH | Priority: p2


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
