# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-859 - Issues with Opportunity Summary Questionaire (SF-357)
# Type: Bug | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:34.880Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)
# RBT: UI test cases generated; API optional (minimal 1-2 or skip).
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Issues with Opportunity Summary Questionaire (SF-357)
# Primary Entity: Opportunity
#
# Account Types Involved (1):
#   • Member
#
# Test Requirements (4):
#   REQ-1: Details field value validation takes a ‘,’ as business plan detai
#     → Test Type: API | Priority: p2
#   REQ-2: Should we expect a minimum number of words? (need to confirm with
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Deal Currency - Currency - “Deal” is missing in the UI. b.
#     → Test Type: UI | Priority: p2
#   REQ-4: Opportunity Summary Fields Completed By Summary Fields Completed 
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-859 @medium @salesforce @field-visibility @opportunity
Feature: SF-859 - Issues with Opportunity Summary Questionaire (SF-357)
  As a Salesforce user
  I want to verify the Opportunity_Readiness__c functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Opportunity_Readiness__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-859 @SF-859-UI-001 @smoke @p1
  Scenario: Verify Opportunity_Readiness__c field is visible on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Opportunity_Readiness__c" field should be visible
    And I take a screenshot as evidence

  @SF-859 @SF-859-UI-002 @p1 @edit
  Scenario: Verify Opportunity_Readiness__c field can be edited on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Opportunity_Readiness__c" field to "Test Value"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Opportunity_Readiness__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-859 @SF-859-UI-003 @p2 @negative @blank-value
  Scenario: Verify behavior when Opportunity_Readiness__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Opportunity_Readiness__c"
    When I navigate to the Opportunity record
    Then the "Opportunity_Readiness__c" field should be visible
    And the "Opportunity_Readiness__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-859 @SF-859-UI-004 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Opportunity_Readiness__c
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-859 @SF-859-UI-005 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Opportunity_Readiness__c
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "Opportunity_Readiness__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-859 @SF-859-UI-006 @p2 @ui-data-creation
  Scenario: Create Opportunity record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-2: Should we expect a minimum number of words? (need to confirm with
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: Deal Currency - Currency - “Deal” is missing in the UI. b.
  #     → Should be tested via UI | Priority: p2
  #   REQ-4: Opportunity Summary Fields Completed By Summary Fields Completed 
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 37
  # Existing Steps Used: 37
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 37/37 (100%)
  #   - Feature-Specific Steps Used: 0
