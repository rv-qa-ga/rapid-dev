# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-587 - 1. Coding questionnaire and exposure questionnaire 
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-13T22:53:23.720Z (FeatureGenerator v3.1)
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
# Overview: 1. Coding questionnaire and exposure questionnaire 
# Primary Entity: Order
#
# Account Types Involved (2):
#   • Insurer
#   • Member
#
# Test Requirements (1):
#   REQ-1: f3ccfb0d5aCommit notes: Source: Dev (gearsetintegration@accelins.
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Submitted Date
#   • Submitted By
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

@api @salesforce @SF-587 @medium @salesforce @field-visibility @order
Feature: API - SF-587 - 1. Coding questionnaire and exposure questionnaire 

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API SMOKE TEST (Mode 4 - Field Existence)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-587 @SF-587-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Coding_QuestionaireNewLayoutCoding_Questionaire__c field exists on Order
    When I describe the Order object fields
    Then the "Coding_QuestionaireNewLayoutCoding_Questionaire__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: f3ccfb0d5aCommit notes: Source: Dev (gearsetintegration@accelins.
  #     → Should be tested via API | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 0
  # Existing Steps Used: 0
  # Missing Steps: 0

  # ⚠️  No steps found in scenarios - analysis could not be performed
  #     This may indicate scenarios were not extracted correctly
