# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-360 - Claims Manager Review Data Capture
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:21.315Z (FeatureGenerator v3.1)
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
# Overview: Claims Manager Review Data Capture
# Primary Entity: Task
#
# Test Requirements (1):
#   REQ-1: Claims fields become required once onboarding review startsGiven 
#     → Test Type: API | Priority: p1
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

@api @salesforce @SF-360 @medium @salesforce @field-visibility @task
Feature: API - SF-360 - Claims Manager Review Data Capture

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  # Claims Manager fields are FLS-visible to MRD; run with SF_USE_QA_MRD_FOR_API=true for full validation.
  @SF-360 @SF-360-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify all required Claims Manager fields exist on Opportunity Readiness
    When I describe the Opportunity_Readiness__c object fields
    Then the "Claims Solution" field should exist
    And the "New/Existing" field should exist
    And the "Name of TPA" field should exist
    And the "TPA Address" field should exist
    And the "Contact Details" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Claims fields become required once onboarding review startsGiven 
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
