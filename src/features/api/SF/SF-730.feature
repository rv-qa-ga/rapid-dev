# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-730 - Govern regional fields on Opportunity during Lead conversion
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-24T17:08:21.515Z (FeatureGenerator v3.1)
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
# Overview: Govern regional fields on Opportunity during Lead conversion
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • on Opportunity during Lead conversion (on_Opportunity_during_Lead_conversion__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "on Opportunity during Lead conversion" behavior on Opport
#     → Test Type: BOTH | Priority: p2
#   REQ-2: UNSD Region on Lead is not mapped to OpportunityGiven a Lead cont
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

@api @salesforce @SF-730 @medium @salesforce @field-visibility @opportunity
Feature: API - SF-730 - Govern regional fields on Opportunity during Lead conversion

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-730 @SF-730-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "on_Opportunity_during_Lead_conversion__c" field should exist

  @SF-730 @SF-730-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Account
    When I describe the Account object fields
    Then the "on_Opportunity_during_Lead_conversion__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "on Opportunity during Lead conversion" behavior on Opport
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: UNSD Region on Lead is not mapped to OpportunityGiven a Lead cont
  #     → Should be tested via API | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 4
  # Existing Steps Used: 4
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 4/4 (100%)
  #   - Feature-Specific Steps Used: 0
