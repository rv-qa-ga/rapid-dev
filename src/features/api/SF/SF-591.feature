# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-591 - 2. Enable Actuary approval or rejection of Coding Questionnaire with notifications and rework flow
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-13T22:53:25.557Z (FeatureGenerator v3.1)
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
# Overview: 2. Enable Actuary approval or rejection of Coding Questionnaire with notifications and rework flow
# Primary Entity: Task
#
# Account Types Involved (1):
#   • Member
#
# Test Requirements (1):
#   REQ-1: for detailsWhen Approve is clicked:The Coding Questionnaire is ma
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Reject
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-591 @medium @salesforce @field-visibility @task
Feature: API - SF-591 - 2. Enable Actuary approval or rejection of Coding Questionnaire with notifications and rework flow

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API SMOKE TEST (Mode 4 - Field Existence)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-591 @SF-591-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify is_optionalThe_user_must_click__c field exists on Task
    When I describe the Task object fields
    Then the "is_optionalThe_user_must_click__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: for detailsWhen Approve is clicked:The Coding Questionnaire is ma
  #     → Should be tested via BOTH | Priority: p1


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
