# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-563 - Derive Region fields from Country reference data
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-02-24T17:08:23.149Z (FeatureGenerator v3.1)
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
# Overview: Derive Region fields from Country reference data
# Primary Entity: Lead
#
# Fields Involved (1):
#   • from Country reference data (from_Country_reference_data__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "from Country reference data" behavior on Lead
#     → Test Type: BOTH | Priority: p2
#   REQ-2: Auto-populate Distribution Region and Region when Billing Country
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Country Name
#   • Distribution Region Name
#   • UNSD Region
#   • Distribution Region
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

@api @salesforce @SF-563 @medium @salesforce @auto-populate @field-mapping @lead
Feature: API - SF-563 - Derive Region fields from Country reference data

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-563 @SF-563-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Lead
    When I describe the Lead object fields
    Then the "from_Country_reference_data__c" field should exist

  @SF-563 @SF-563-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Account
    When I describe the Account object fields
    Then the "from_Country_reference_data__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "from Country reference data" behavior on Lead
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: Auto-populate Distribution Region and Region when Billing Country
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
