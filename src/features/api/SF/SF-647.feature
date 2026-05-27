# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-647 - MOU Data fields - Item Completion
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-02-22T16:46:17.388Z (FeatureGenerator v3.1)
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
# Overview: MOU Data fields - Item Completion
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • - Item Completion (-_Item_Completion__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "- Item Completion" behavior on Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-2: The MOU Data fields has been uploaded to sharepont  (this scenari
#     → Test Type: BOTH | Priority: p1
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

@api @salesforce @SF-647 @medium @salesforce @opportunity
Feature: API - SF-647 - MOU Data fields - Item Completion

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  # ══════════════════════════════════════════════════════════════════════════
  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.
  #

  @SF-647 @SF-647-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "-_Item_Completion__c" field should exist


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "- Item Completion" behavior on Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: The MOU Data fields has been uploaded to sharepont  (this scenari
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
