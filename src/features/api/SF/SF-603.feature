# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-603 - Make fields on the country object mandatory 
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-02-19T21:01:21.360Z (FeatureGenerator v3.1)
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
# Overview: Make fields on the country object mandatory 
# Primary Entity: Record
#
# Fields Involved (1):
#   • on the country object mandatory (on_the_country_object_mandatory__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "on the country object mandatory" behavior on Record
#     → Test Type: BOTH | Priority: p2
#   REQ-2: a Country record exists → I attempt to delete the Country recordT
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

@api @salesforce @SF-603 @medium @salesforce
Feature: API - SF-603 - Make fields on the country object mandatory 

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-603 @SF-603-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Record
    When I describe the Record object fields
    Then the "on_the_country_object_mandatory__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "on the country object mandatory" behavior on Record
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: a Country record exists → I attempt to delete the Country recordT
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
