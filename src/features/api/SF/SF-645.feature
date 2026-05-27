# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-645 - MOU Data fields - Complete Fields
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-22T16:46:19.312Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# OPPORTUNITY SUMMARY / MOU CONTEXT (related work items):
#   SF-357: Opportunity Summary questionnaire; SF-656: Executive approval routing; SF-648: Executive Approval.
#   SF-657: Approval outcomes; SF-645: MOU Complete Fields; SF-646: MOU Generate Export; SF-647: MOU Item Completion.
#   Field list: data/excel/Opportunity Summary Fields (1).xlsx
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
# Overview: MOU Data fields - Complete Fields
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • - Complete Fields (-_Complete_Fields__c) - modify
#
# Test Requirements (3):
#   REQ-1: Verify "- Complete Fields" behavior on Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-2: MOU Data fields only become available after Opportunity Summary F
#     → Test Type: BOTH | Priority: p1
#   REQ-3: f92-bc94-b9b92f602310Commit notes: MOU Data fields and related au
#     → Test Type: API | Priority: p2
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

@api @salesforce @SF-645 @medium @salesforce @field-visibility @opportunity
Feature: API - SF-645 - MOU Data fields - Complete Fields

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-645 @SF-645-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "-_Complete_Fields__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: Verify "- Complete Fields" behavior on Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: MOU Data fields only become available after Opportunity Summary F
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-3: f92-bc94-b9b92f602310Commit notes: MOU Data fields and related au
  #     → Should be tested via API | Priority: p2


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
