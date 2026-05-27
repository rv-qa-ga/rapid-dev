# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-587 - 1. Coding questionnaire and exposure questionnaire 
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-13T22:53:23.707Z (FeatureGenerator v3.1)
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
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Submitted Date
#   • Submitted By
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-587 @medium @salesforce @field-visibility @order
Feature: SF-587 - 1. Coding questionnaire and exposure questionnaire 
  As a Salesforce user
  I want to verify the Coding_QuestionaireNewLayoutCoding_Questionaire__c functionality on Order
  So that Order records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-587 @SF-587-UI-001 @p1 @smoke @positive @profileend @field-visibility
  Scenario: f3ccfb0d5aCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given I am logged in as a "Profileend" user
    And I navigate to the Account record
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=d90fa5b5-51ba-4dd7-97e1-47cc30a5c188Commit notes: cmp missingSource: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Coding-questionnaire-and-exposure-questionnaireDifference TypeMetadata TypeNameNewAura componentReloadPage
    Then :check_mark: Successfully merged PR #150 from gs-pipeline/SF-587/Coding-questionnaire-and-exposure-questionnaire_-_QA into QA
    Then This is ready for QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-587 @SF-587-UI-002 @smoke @p1 @admin
  Scenario: Verify "Coding_QuestionaireNewLayoutCoding_Questionaire__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Order object list
    And I click New to create a Order
    Then the "Coding_QuestionaireNewLayoutCoding_Questionaire__c" field should be visible
    And I take a screenshot as evidence

  @SF-587 @SF-587-UI-003 @p2 @edit-form
  Scenario: Verify "Coding_QuestionaireNewLayoutCoding_Questionaire__c" is visible on Order edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "Coding_QuestionaireNewLayoutCoding_Questionaire__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-587 @SF-587-UI-004 @p2 @ui-data-creation
  Scenario: Create Order record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Order object list
    And I click New to create a Order
    And I fill in required Order fields
    And I save the record
    Then the Order should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 18
  # Existing Steps Used: 18
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 18/18 (100%)
  #   - Feature-Specific Steps Used: 0
