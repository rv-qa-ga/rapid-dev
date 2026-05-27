# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-514 - Capture Line of Business Information on Lead
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-13T22:46:30.293Z (FeatureGenerator v3.1)
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
# Overview: Capture Line of Business Information on Lead
# Primary Entity: Lead
#
# Test Requirements (2):
#   REQ-1: Select multiple Lines of Business for a LeadGiven I am creating o
#     → Test Type: UI | Priority: p1
#   REQ-2: -e0f1e20f7639Commit notes: layout and record page changes.Source:
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

@api @salesforce @SF-514 @medium @salesforce @field-visibility @lead
Feature: API - SF-514 - Capture Line of Business Information on Lead

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API SMOKE TEST (Mode 4 - Field Existence)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify TypeLines_of_Business__c field exists on Lead
    When I describe the Lead object fields
    Then the "TypeLines_of_Business__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-2: -e0f1e20f7639Commit notes: layout and record page changes.Source:
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
