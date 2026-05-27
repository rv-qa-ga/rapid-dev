# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-589 - Coding Questionnaire Task Creation when Opportunity enters Due Diligence
# Type: Story | Priority: Medium
# Feature Type: automation | opportunity | task | notification
# Generated: RBT (Risk-Based Testing) - API minimal
# ══════════════════════════════════════════════════════════════════════════════
#
# When Opportunity Stage = "Opportunity – Due Diligence" and Type = "New Business",
# a Task is created for the assigned Underwriter (SF-588), Due Date = 3 working days
# after stage update. API tests: minimal – verify task exists with correct attributes.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-589 @rbt @medium @opportunity @task @automation
Feature: API - SF-589 - Coding Questionnaire task creation on Due Diligence
  API/automation must create a Task for the assigned Underwriter when Opportunity
  stage is set to Due Diligence (Type = New Business), with due date 3 working days later.

  Background:
    Given I have a valid Salesforce API token
    And an Opportunity exists with Type "New Business" and an assigned Underwriter (per SF-588)

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-589 @SF-589-API-001 @p1 @smoke @rbt
  Scenario: API - Task exists with correct attributes after Opportunity moves to Due Diligence
    Given an Opportunity has Type "New Business" and Stage is updated to "Opportunity – Due Diligence"
    And an Underwriter is assigned to the Opportunity
    When the stage update is saved and automation runs
    Then a Task must exist related to the Opportunity
    And the Task must be assigned to the assigned Underwriter
    And the Task Subject must match "Populate coding questionnaire for"
    And the Task Priority must be Normal
    And the Task Due Date must be 3 working days after the stage update date

  @SF-589 @SF-589-API-002 @p2 @rbt @negative
  Scenario: API - Task is not created when Opportunity Type is not New Business
    Given an Opportunity has Type not equal to "New Business"
    And the Opportunity Stage is updated to "Opportunity – Due Diligence"
    When the stage update is saved
    Then no Coding Questionnaire task must be created for the Underwriter for this Opportunity
