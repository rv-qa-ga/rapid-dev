# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-356 - Actuary Review Data Capture
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:17.440Z (FeatureGenerator v3.1)
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
# Overview: Actuary Review Data Capture
# Primary Entity: Task
#
# Test Requirements (2):
#   REQ-1: Actuarial fields become required once onboarding review startsGiv
#     → Test Type: API | Priority: p1
#   REQ-2: ce8Commit notes: Email templatesSource: Dev (gearsetintegration@a
#     → Test Type: API | Priority: p2
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

@api @salesforce @SF-356 @medium @salesforce @field-visibility @task
Feature: API - SF-356 - Actuary Review Data Capture

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-356 @SF-356-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Actuarial review field exists on Opportunity Readiness
    When I describe the Opportunity_Readiness__c object fields
    # Actuary field "Confirm Loss ratio analysis completed?" is FLS-visible to MRD; default user sees other review fields
    Then the "Confirm Risk appetite has been set?" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Actuarial fields become required once onboarding review startsGiv
  #     → Should be tested via API | Priority: p1
  #   REQ-2: ce8Commit notes: Email templatesSource: Dev (gearsetintegration@a
  #     → Should be tested via API | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 0
  # Existing Steps Used: 0
  # Missing Steps: 0

  # ⚠️  No steps found in scenarios - analysis could not be performed
  #     This may indicate scenarios were not extracted correctly
