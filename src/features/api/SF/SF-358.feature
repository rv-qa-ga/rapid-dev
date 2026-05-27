# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-358 - Underwriter Review Data Capture
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:19.513Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)
# RBT: API optional - 1-2 minimal smoke scenarios only (skip API file if not needed).
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Underwriter Review Data Capture
# Primary Entity: Task
#
# Test Requirements (1):
#   REQ-1: Underwriting fields become required once onboarding review starts
#     → Test Type: API | Priority: p1
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

@api @salesforce @SF-358 @medium @salesforce @field-visibility @task
Feature: API - SF-358 - Underwriter Review Data Capture

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-358 @SF-358-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify all required Underwriting fields exist on Opportunity Readiness
    When I describe the Opportunity_Readiness__c object fields
    Then the "Confirm Referral Triggers have been set?" field should exist
    And the "Confirm Risk appetite has been set?" field should exist
    And the "Underwriting Guidelines Finalised" field should exist
    And the "Policy Wording Approved" field should exist
    And the "Nat Cat Analysis Completed" field should exist
    And the "Attritional Analysis Completed" field should exist
    And the "COB Analysis Completed" field should exist
    And the "Confirm Geographic Analysis Completed" field should exist
    And the "Confirm Limit Profiles Completed" field should exist
    And the "Confirm Rates agreed" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Underwriting fields become required once onboarding review starts
  #     → Should be tested via API | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 2
  # Existing Steps Used: 2
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 2/2 (100%)
  #   - Feature-Specific Steps Used: 0
