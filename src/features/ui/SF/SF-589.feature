# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-589 - Coding Questionnaire Task Creation when Opportunity enters Due Diligence
# Type: Story | Priority: Medium
# Feature Type: automation | opportunity | task | notification
# Generated: RBT (Risk-Based Testing) - UI
# ══════════════════════════════════════════════════════════════════════════════
#
# Trigger: When Opportunity Stage is updated to "Opportunity – Due Diligence".
# Salesforce creates a Task for the Underwriter (specified in SF-588), due 3 working days
# after stage update, and sends email notification with Coding Questionnaire link.
#
# Task: Subject "Populate coding questionnaire for [MemberName]", Related To Opportunity,
# Priority Normal, Status Not Started. Link in email opens relevant Coding Questionnaire.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-589 @rbt @medium @opportunity @task @automation @notification
Feature: UI - SF-589 - Coding Questionnaire task creation on Due Diligence
  As an Underwriter user
  I want Salesforce to automatically create a task for the assigned Underwriter and notify them via email when an Opportunity enters Due Diligence
  So that Underwriters are clearly informed, assigned, and prompted to complete the Coding Questionnaire on time

  Background:
    Given I am logged in as a user with access to Opportunities and Tasks
    And an Opportunity exists with Type "New Business"
    And an Underwriter is assigned to the Opportunity (per SF-588)
    And the Member Name and Account Name are known for the Opportunity

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS (Acceptance A: Task | B: Notifications | C: Link)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-589 @SF-589-UI-001 @p1 @smoke @rbt @task-creation
  Scenario: Task is created when Opportunity stage is updated to Due Diligence (New Business)
    Given an Opportunity has Stage not equal to "Opportunity – Due Diligence"
    And the Opportunity Type is "New Business"
    And an Underwriter is assigned to the Opportunity (SF-588)
    When the Opportunity stage is updated to "Opportunity – Due Diligence" and the update is saved
    Then a task must be automatically created for the assigned Underwriter
    And the task Subject must be "Populate coding questionnaire for [Member Name]"
    And the task Related To must be the Opportunity Name
    And the task Priority must be Normal
    And the task Status must be "Not Started"
    And the task Due Date must be 3 working days after the Opportunity stage was updated to Due Diligence
    And I take a screenshot as evidence

  @SF-589 @SF-589-UI-002 @p1 @rbt @notification
  Scenario: Assigned Underwriter receives email notification when task is created
    Given the task is created for the assigned Underwriter when Opportunity enters Due Diligence
    When the automation completes
    Then the assigned Underwriter must receive one email notification
    And the email must contain the task details
    And the email must contain the Coding Questionnaire link
    And the email must include: "Hello [Underwriter First Name],", "You have been assigned a task in Salesforce.", "Task: Populate coding questionnaire for [Member Name]", "Due Date:", "Priority: Normal", "Related To: [Account Name]", "To begin this task, click the link below:", "[Link to Coding Questionnaire]", "This is an automated message from Salesforce."
    And I take a screenshot as evidence

  @SF-589 @SF-589-UI-003 @p1 @rbt @link-behavior
  Scenario: Link in notification opens the relevant Coding Questionnaire in Salesforce
    Given the Underwriter has received the email notification with the Coding Questionnaire link
    When the Underwriter clicks the link in the notification
    Then they must be taken directly to the relevant Coding Questionnaire in Salesforce
    And I take a screenshot as evidence

  @SF-589 @SF-589-UI-004 @p2 @rbt @negative
  Scenario: Task is not created when Opportunity Type is not New Business
    Given an Opportunity has Stage not equal to "Opportunity – Due Diligence"
    And the Opportunity Type is not "New Business"
    When the Opportunity stage is updated to "Opportunity – Due Diligence" and the update is saved
    Then the automation must not create the Coding Questionnaire task for the Underwriter
    And I take a screenshot as evidence
