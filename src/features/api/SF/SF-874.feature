# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-874 - Opportunity Readiness - Summary and MOU Fields Change
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:36.609Z (FeatureGenerator v3.1)
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
# Overview: BACKGROUNDThe opportunity summary fields AND the MOU detail fields need to be surfaced, completed and submitted for approval at the same time.
# Primary Entity: Task
#
# Fields Involved (1):
#   • Change (Change__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "Change" behavior on Task
#     → Test Type: BOTH | Priority: p2
#   REQ-2: GIVEN a US based Opportunity Record is created AND type is update
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

@api @salesforce @SF-874 @medium @salesforce @field-visibility @task
Feature: API - SF-874 - Opportunity Readiness - Summary and MOU Fields Change

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-874 @SF-874-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Task
    When I describe the Task object fields
    Then the "Change__c" field should exist

  @SF-874 @SF-874-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Change__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "Change" behavior on Task
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: GIVEN a US based Opportunity Record is created AND type is update
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
