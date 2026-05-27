# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-363 - IT Security Review Data Capture
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:26.144Z (FeatureGenerator v3.1)
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
# Overview: IT Security Review Data Capture
# Primary Entity: Task
#
# Test Requirements (1):
#   REQ-1: IT Security fields become required once onboarding review startsG
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-363 @medium @salesforce @field-visibility @task
Feature: SF-363 - IT Security Review Data Capture
  As a Salesforce user
  I want to verify the data functionality on Task
  So that Task records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-363 @SF-363-UI-001 @p1 @smoke @positive @populate-it-security-fieldsgiven-a-it-security-review-task-existswhen-an-authorised-it-security @field-visibility @field-exists @update @visibility @permissions
  Scenario: IT Security fields become required once onboarding review startsGiven the Member Onboarding Questionnaire has been submitted for reviewAnd the IT Security review task is activeWhen a IT Security reviewer accesses the OpportunityThen the required IT Security onboarding fields must be available for population (see attachment)Scenario 2: IT Security reviewers can populate IT Security fieldsGiven a IT Security review task existsWhen an authorised IT Security user populates the required IT Security onboarding fieldsThen the values must be saved successfullyAnd recorded against the OpportunityScenario 3: Onboarding review cannot be marked as complete if IT Security fields are missingGiven the Member Onboarding Questionnaire review is in progressAnd one or more required IT Security onboarding fields are not populatedWhen the IT Security approver attempts to mark their review of the Member Onboarding Questionnaire as completeThen the system must prevent completionAnd display a message indicating that IT Security fields must be completed firstScenario 4: Onboarding review can be completed once IT Security fields are populatedGiven the Member Onboarding Questionnaire review is in progressAnd all required IT Security onboarding fields are populatedWhen the IT Security approver attempts to mark their review of the Member Onboarding Questionnaire as completeThen the action must succeedScenario 5: Only IT Security users may populate IT Security fieldsGiven a user is not part of the IT Security role or teamWhen they attempt to populate or update the IT Security onboarding fieldsThen the action must be prevented
    Given I am logged in as a "Populate It Security Fieldsgiven A It Security Review Task Existswhen An Authorised It Security" user
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Task
  # ══════════════════════════════════════════════════════════════════════════

  @SF-363 @SF-363-UI-002 @smoke @p1 @admin
  Scenario: Verify "data" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Task object list
    And I click New to create a Task
    Then the "data" field should be visible
    And I take a screenshot as evidence

  @SF-363 @SF-363-UI-003 @p2 @edit-form
  Scenario: Verify "data" is visible on Task edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    And I click Edit on the Task
    Then the "data" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-363 @SF-363-UI-004 @p2 @negative @blank-value
  Scenario: Verify behavior when data is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Task created via API without "data"
    When I navigate to the Task record
    Then the "data" field should be visible
    And the "data" field should be blank or empty
    And I take a screenshot as evidence

  @SF-363 @SF-363-UI-005 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify data
    Given I am logged in as a read-only user
    And I have a test Task created via API
    When I navigate to the Task record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-363 @SF-363-UI-006 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to data
    Given I am logged in as a standard user
    And I have a test Task created via API
    When I navigate to the Task record
    Then the "data" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-363 @SF-363-UI-007 @p2 @ui-data-creation
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
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: IT Security fields become required once onboarding review startsG
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 36
  # Existing Steps Used: 36
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 36/36 (100%)
  #   - Feature-Specific Steps Used: 0
