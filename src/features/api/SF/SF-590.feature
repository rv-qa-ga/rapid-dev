# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-590 - 4. Create Actuary task and send notifications when Coding Questionnaire is submitted
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: general
# Generated: 2026-02-13T22:53:24.789Z (FeatureGenerator v3.1)
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
# Overview: 4. Create Actuary task and send notifications when Coding Questionnaire is submitted
# Primary Entity: Task
#
# Account Types Involved (1):
#   • Member
#
# Test Requirements (2):
#   REQ-1: an Underwriter clicks Submit on the Coding Questionnaire → submis
#     → Test Type: BOTH | Priority: p1
#   REQ-2: the Actuary clicks the link in the notification → it opens → they
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

@api @salesforce @SF-590 @medium @salesforce @task
Feature: API - SF-590 - 4. Create Actuary task and send notifications when Coding Questionnaire is submitted

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API SMOKE TEST (Mode 4 - Field Existence)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-590 @SF-590-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Field__c field exists on Task
    When I describe the Task object fields
    Then the "Field__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: an Underwriter clicks Submit on the Coding Questionnaire → submis
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: the Actuary clicks the link in the notification → it opens → they
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
