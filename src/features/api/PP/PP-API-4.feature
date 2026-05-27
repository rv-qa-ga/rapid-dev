# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-4 - Add Descriptive Fields to NAICS Codes in RDM
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-21T17:54:59.620Z (FeatureGenerator v3.1)
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
# Overview: Add Descriptive Fields to NAICS Codes in RDM
# Primary Entity: Record
#
# Fields Involved (1):
#   • to NAICS Codes in RDM (to_NAICS_Codes_in_RDM__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "to NAICS Codes in RDM" behavior on Record
#     → Test Type: BOTH | Priority: p2
#   REQ-2: I am managing business classification data within Reference Data 
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

@api @dynamics @PP-4 @medium @dynamics @d365 @auto-populate @field-mapping
Feature: API - PP-4 - Add Descriptive Fields to NAICS Codes in RDM

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify to_NAICS_Codes_in_RDM__c field exists on Record
    When I call the Dynamics API to describe records entity
    Then the "to_NAICS_Codes_in_RDM__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION VIA API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-API-002 @smoke @p1 @auto-populate
  Scenario: API - Verify Descriptive__c is inherited from Account on Record creation
    Given I have a test Account created via API with Descriptive "EU"
    When I create a Record for the Account via API
    Then the API should return status code 201
    And the Record should have Descriptive "EU"

  @PP-4 @PP-4-API-003 @p1 @read-only @negative
  Scenario: API - Verify Descriptive__c cannot be updated on Record after creation
    Given I have a test Account created via API with Descriptive "UK"
    And I have a test Record created via API for the Account
    When I try to update the Record Descriptive to "US" via API
    Then the API should reject the Descriptive update
    And the Record Descriptive should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-API-004 @p2 @negative @invalid-value
  Scenario: API - Reject invalid to_NAICS_Codes_in_RDM__c value
    When I create a Dynamics records record via API with:
      | field | value |
      | Name  | Invalid Test |
      | to_NAICS_Codes_in_RDM__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "to_NAICS_Codes_in_RDM"

  @PP-4 @PP-4-API-005 @p2 @negative @null-value
  Scenario: API - Handle null to_NAICS_Codes_in_RDM__c value
    Given I have a test Record created via API without to_NAICS_Codes_in_RDM
    When I query Dynamics records records via API
    Then the "to_NAICS_Codes_in_RDM__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "to NAICS Codes in RDM" behavior on Record
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: I am managing business classification data within Reference Data 
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
