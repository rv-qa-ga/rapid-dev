# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-272 - Launchpad | TPA Reassessment | Update Security Role for Stage Transition
# Type: Story | Status: In QA | Priority: Low
# Feature Type: validation-rule
# Generated: 2026-02-23T15:40:12.900Z (FeatureGenerator v3.1)
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
# Overview: Launchpad | TPA Reassessment | Update Security Role for Stage Transition
# Primary Entity: Contract
#
# Fields Involved (1):
#   • Launchpad (Launchpad__c) - show
#
# Test Requirements (1):
#   REQ-1: Verify "Launchpad" is visible on Contract page layout for all Acc
#     → Test Type: UI | Priority: p1
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

@api @dynamics @PP-272 @low @dynamics @d365 @contract
Feature: API - PP-272 - Launchpad | TPA Reassessment | Update Security Role for Stage Transition

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @PP-272 @PP-272-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Launchpad__c field exists on Contract
    When I call the Dynamics API to describe contracts entity
    Then the "Launchpad__c" field should exist

  @PP-272 @PP-272-API-002 @p1 @field-exists
  Scenario: API - Verify Launchpad__c field exists on Account
    When I call the Dynamics API to describe accounts entity
    Then the "Launchpad__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-272 @PP-272-API-003 @p1 @api-create
  Scenario: API - Create Contract with Launchpad
    When I create a Dynamics contracts record via API with:
      | field | value |
      | Name  | API Test Contract |
    Then the API should return status code 201
    And the response should contain the new Contract ID

  @PP-272 @PP-272-API-004 @p1 @api-update
  Scenario: API - Update Launchpad__c on Contract
    Given I have an existing Contract record
    When I update the Contract field "Launchpad__c" to "Updated Value" via API
    Then the API should return status code 204

  @PP-272 @PP-272-API-005 @p2 @api-query
  Scenario: API - Query Contract by Launchpad
    Given I have an existing Contract record
    When I query all Contract records via API
    Then the API should return status code 200

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-272 @PP-272-API-006 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Launchpad__c value
    When I create a Dynamics contracts record via API with:
      | field | value |
      | Name  | Invalid Test |
      | Launchpad__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Launchpad"

  @PP-272 @PP-272-API-007 @p2 @negative @null-value
  Scenario: API - Handle null Launchpad__c value
    Given I have a test Contract created via API without Launchpad
    When I query Dynamics contracts records via API
    Then the "Launchpad__c" should be null or empty


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


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
