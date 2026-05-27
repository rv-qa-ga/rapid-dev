# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-859 - Issues with Opportunity Summary Questionaire (SF-357)
# Type: Bug | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:34.905Z (FeatureGenerator v3.1)
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
# Overview: Issues with Opportunity Summary Questionaire (SF-357)
# Primary Entity: Opportunity
#
# Account Types Involved (1):
#   • Member
#
# Test Requirements (4):
#   REQ-1: Details field value validation takes a ‘,’ as business plan detai
#     → Test Type: API | Priority: p2
#   REQ-2: Should we expect a minimum number of words? (need to confirm with
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Deal Currency - Currency - “Deal” is missing in the UI. b.
#     → Test Type: UI | Priority: p2
#   REQ-4: Opportunity Summary Fields Completed By Summary Fields Completed 
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

@api @salesforce @SF-859 @medium @salesforce @field-visibility @opportunity
Feature: API - SF-859 - Issues with Opportunity Summary Questionaire (SF-357)

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-859 @SF-859-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Opportunity_Readiness__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: Details field value validation takes a ‘,’ as business plan detai
  #     → Should be tested via API | Priority: p2
  #   REQ-2: Should we expect a minimum number of words? (need to confirm with
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Opportunity Summary Fields Completed By Summary Fields Completed 
  #     → Should be tested via BOTH | Priority: p2


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
