# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-754 - Restrict Lookups on Member, Legal Entity and Group relationships
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-13T22:53:41.814Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - Focus on user story scenarios (UI comprehensive, API minimal 1-2 tests)
# RBT Approach: UI tests focus on user story scenarios, API tests limited to 1-2 smoke tests
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Restrict Lookups on Member, Legal Entity and Group relationships
# Primary Entity: Opportunity
#
# Account Types Involved (3):
#   • Group
#   • Legal Entity
#   • Member
#
# Test Requirements (1):
#   REQ-1: Restrict Member lookup to Member accountsGiven a user is creating
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

@api @salesforce @SF-754 @medium @salesforce @field-visibility @opportunity
Feature: API - SF-754 - Restrict Lookups on Member, Legal Entity and Group relationships

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API SMOKE TEST (Mode 4 - Field Existence)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-754 @SF-754-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify user_searches_for_an_Account_in_the_Member_lookup__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "user_searches_for_an_Account_in_the_Member_lookup__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Restrict Member lookup to Member accountsGiven a user is creating
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
