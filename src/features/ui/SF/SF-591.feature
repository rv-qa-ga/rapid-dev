# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-591 - 2. Enable Actuary approval or rejection of Coding Questionnaire with notifications and rework flow
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-13T22:53:25.532Z (FeatureGenerator v3.1)
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
# Overview: 2. Enable Actuary approval or rejection of Coding Questionnaire with notifications and rework flow
# Primary Entity: Task
#
# Account Types Involved (1):
#   • Member
#
# Test Requirements (1):
#   REQ-1: for detailsWhen Approve is clicked:The Coding Questionnaire is ma
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Reject
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-591 @medium @salesforce @field-visibility @task
Feature: SF-591 - 2. Enable Actuary approval or rejection of Coding Questionnaire with notifications and rework flow
  As a Salesforce user
  I want to verify the is optionalThe user must click functionality on Task
  So that Task records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-591 @SF-591-UI-001 @p1 @smoke @negative @data-driven @actuary-clicks-approve-the @field-visibility @update @visibility @read-only
  Scenario: for detailsWhen Approve is clicked:The Coding Questionnaire is marked as ApprovedThe questionnaire remains locked for editing by the UnderwriterNotifications are sent to:The UnderwriterThe Exposure Team member (determined using logic in SF-588)Approval NotificationsSent via email Message content indicates that the Coding Questionnaire has been approvedIncludes a reference to the related Opportunity / MemberReject Flow - see email scenario 2 for detailsWhen Reject is clicked:The rejecting user is prompted with a “Reason for Rejection” text boxThis field is optionalThe user must click “Confirm Rejection” to proceedUpon confirmation:The Coding Questionnaire status is set to RejectedThe questionnaire becomes unlocked and editable for the UnderwriterA new Task is created for the UnderwriterThe Underwriter receives notifications via email Rejection Task & NotificationThe task instructs the Underwriter to review and update the rejected Coding QuestionnaireNotifications include:Confirmation that the questionnaire was rejectedThe optional rejection reason (if provided)A direct link to the rejected Coding QuestionnaireAfter updates, the Underwriter can resubmit the Coding Questionnaire for Actuary review.Acceptance Criteria A. Button VisibilityGIVEN a Coding Questionnaire is submitted
    Given I am logged in as a "Actuary Clicks Approve The" user
    Given An Actuary clicks Approve
    When The user is an Actuary or System Administrator
    Then Approve
    Then Reject buttons are availableB. ApprovalGIVEN an Actuary clicks Approve
    Then Reject buttons are availableB. ApprovalGIVEN an Actuary clicks Approve
    Then Exposure Team member receive email notifications confirming approvalC. RejectionGIVEN an Actuary clicks Reject
    Then Click Confirm Rejection
    And I save the record
    Then Requires updates.Reason for Rejection
    And I save the record
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Task
  # ══════════════════════════════════════════════════════════════════════════

  @SF-591 @SF-591-UI-002 @smoke @p1 @admin
  Scenario: Verify "is optionalThe user must click" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Task object list
    And I click New to create a Task
    Then the "is optionalThe user must click" field should be visible
    And I take a screenshot as evidence

  @SF-591 @SF-591-UI-003 @p2 @edit-form
  Scenario: Verify "is optionalThe user must click" is visible on Task edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    And I click Edit on the Task
    Then the "is optionalThe user must click" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-591 @SF-591-UI-004 @p2 @ui-data-creation
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
  #   REQ-1: for detailsWhen Approve is clicked:The Coding Questionnaire is ma
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 30
  # Existing Steps Used: 30
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 30/30 (100%)
  #   - Feature-Specific Steps Used: 0
