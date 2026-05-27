# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-590 - 4. Create Actuary task and send notifications when Coding Questionnaire is submitted
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: general
# Generated: 2026-02-13T22:53:24.764Z (FeatureGenerator v3.1)
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
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-590 @medium @salesforce @task
Feature: SF-590 - 4. Create Actuary task and send notifications when Coding Questionnaire is submitted
  As a Salesforce user
  I want to verify the Field functionality on Task
  So that Task records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-590 @SF-590-UI-001 @p1 @smoke @positive @general
  Scenario: Scenario 1
    Given I am logged in as a "Accelerant - System administrator" user
    And I save the record
    When Submission completes successfully
    Then A task is created for the Actuary selected per SF-588B. NotificationsGIVEN the task is created
    And I take a screenshot as evidence

  @SF-590 @SF-590-UI-002 @p1 @positive @data-driven @general
  Scenario: Scenario 2
    Given I am logged in as a "Accelerant - System administrator" user
    Given The Actuary clicks the link in the notification
    When It opens
    And I save the record
    Then This is ready for QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Field on Task
  # ══════════════════════════════════════════════════════════════════════════

  @SF-590 @SF-590-UI-003 @smoke @p1
  Scenario: Verify Field field is visible on Task
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    Then the "Field" field should be visible
    And I take a screenshot as evidence

  @SF-590 @SF-590-UI-004 @p1 @edit
  Scenario: Verify Field field can be edited on Task
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    And I click Edit on the Task
    And I set the "Field" field to "Test Value"
    And I save the record
    Then the Task should be saved successfully
    And the "Field" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-590 @SF-590-UI-005 @p2 @ui-data-creation
  Scenario: Create Task record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Task object list
    And I click New to create a Task
    And I fill in required Task fields
    And I save the record
    Then the Task should be created successfully
    And I take a screenshot as evidence


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
  # Total Steps Analyzed: 32
  # Existing Steps Used: 32
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 32/32 (100%)
  #   - Feature-Specific Steps Used: 0
