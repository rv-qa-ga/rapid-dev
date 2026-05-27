# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-657 - Handle Opportunity Summary approval outcomes
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: approval-outcomes, stage-progression
# Primary Entity: Opportunity, Opportunity Readiness (Opportunity Summary)
# Regenerated: 2026-03-01 | Mode 4 RBT | Opportunity + Opportunity questionnaire
# ══════════════════════════════════════════════════════════════════════════════
#
# User story (MRD):
#   As an MRD I want clear outcomes when the Opportunity Summary fields are
#   approved or rejected, so that I know what actions are required and whether
#   the prospect may continue.
#
# OPPORTUNITY SUMMARY CONTEXT (related stories):
#   SF-357: Opportunity Summary questionnaire; SF-656: Approval routing;
#   SF-648: Executive Approval (read-only until approved/returned);
#   SF-657: Approval outcomes (Approved / Rejected / Returned); stage to Due Diligence.
#   SF-658: Member Onboarding Questionnaire.
#
# Scenarios (5): Approved → Due Diligence; Rejected → returned to MRD;
#   Resubmission after Returned for Update; Rejected (Disqualify);
#   Stage progression blocked after Disqualification / not submitted.
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI scenarios; Opportunity + Opportunity Summary.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-657 @medium @salesforce @approval-outcomes @opportunity @opportunity-summary
Feature: SF-657 - Handle Opportunity Summary approval outcomes
  As an MRD
  I want clear outcomes when the Opportunity Summary fields are approved or rejected
  So that I know what actions are required and whether the prospect may continue

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Once approved, Opportunity can progress to Due Diligence
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-001 @p1 @smoke @stage-progression @approved
  Scenario: Once approved, Opportunity can progress to Due Diligence
    Given an Opportunity exists in stage "Opportunity Pipeline" with Type "New Business"
    And the Opportunity Summary Fields are Approved
    And the MRD has been notified that the fields have been approved
    And the Opportunity is not associated with a US member (Region__c = US)
    When a user changes the Opportunity stage to "Due Diligence"
    Then the stage change must be allowed
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-002 @p1 @stage-progression
  Scenario: Stage change to Due Diligence allowed when Opportunity Summary is approved (non-US)
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary Fields are Approved
    When a user changes the Opportunity stage to "Due Diligence"
    Then the stage change must be allowed
    And the Opportunity should have stage "Due Diligence"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Rejected Opportunity Summary fields are returned to MRD for review
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-003 @p1 @smoke @rejected @mrd-review
  Scenario: Rejected Opportunity Summary fields are returned to MRD for review
    Given the Opportunity Summary fields are Pending approval
    When an Executive approver records a decision of Rejected
    And provides rejection comments
    Then the approval outcome must be recorded as Rejected
    And the rejection comments must be recorded
    And the Opportunity Summary fields must become editable
    And the Opportunity must remain in stage "Opportunity Pipeline"
    And the MRD must be notified, including the rejection comments
    And the MRD may resubmit the Opportunity Summary fields for approval
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-004 @p1 @rejected @fields-editable
  Scenario: After rejection, Opportunity Summary fields become editable for MRD
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary fields approval has been submitted and is in status "Rejected"
    When I open the Opportunity Readiness record from the Opportunity
    Then the Opportunity Summary fields must be editable by the MRD
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Resubmission rules after Returned for Update
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-005 @p1 @resubmission @returned-for-update
  Scenario: Resubmission rules after Returned for Update
    Given the Opportunity Summary fields have been Returned for Update
    When the MRD attempts to resubmit the fields for Executive approval
    Then the system must validate that at least one Opportunity Summary field has been updated
    And if no fields have been changed the system must prevent resubmission
    And display the message "Update at least one Opportunity Summary field before resubmitting for approval."
    And when at least one field has been updated the MRD may resubmit the Opportunity Summary fields for approval
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-006 @p2 @resubmission @validation
  Scenario: Resubmission prevented when no Opportunity Summary field has been updated
    Given the Opportunity Summary fields have been Returned for Update
    And the MRD has not updated any Opportunity Summary field
    When the MRD attempts to resubmit the fields for Executive approval
    Then the system must prevent resubmission
    And the system must display a message to update at least one Opportunity Summary field before resubmitting
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Approval outcome – Rejected (Disqualify prospect)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-007 @p1 @rejected @disqualify
  Scenario: Approval outcome – Rejected (Disqualify prospect)
    Given the Opportunity Summary fields are Pending approval
    When an Executive approver records a decision of Rejected
    And selects rejection reason "Disqualify"
    Then the approver must provide a rejection reason (comments)
    And the approval status must be set to Rejected
    And the Opportunity Summary fields must be marked as Rejected
    And the MRD must be notified, including the rejection reason
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 5: Stage progression is blocked after Disqualification / not submitted
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-008 @p1 @smoke @stage-blocked
  Scenario: Stage progression is blocked when Opportunity Summary not submitted or rejected
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary fields have not been submitted for approval or are rejected
    When any user attempts to move the Opportunity to "Due Diligence" or beyond
    Then the system must prevent the stage change
    And the system must indicate that the Opportunity Summary Fields must be approved
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-009 @p1 @stage-validation
  Scenario: Opportunity cannot move to Due Diligence until Opportunity Summary is approved
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary Fields are not Approved
    When a user attempts to change the Opportunity stage to "Due Diligence"
    Then the system must prevent the stage change
    And the system must display a message that Opportunity Summary Fields must be approved before moving to Due Diligence
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RBT: Approval outcomes visibility and MRD actions
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-010 @p1 @approval-history
  Scenario: MRD can view Opportunity and approval outcome in Approval History
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary fields have been submitted for approval
    When I open the Opportunity Readiness record from the Opportunity
    Then the approval request is visible in Approval History
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-011 @p1 @read-only-when-pending
  Scenario: Opportunity Summary fields are read-only when approval is Pending
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary fields approval has been submitted and is in status "Pending"
    When I open the Opportunity Readiness record from the Opportunity
    Then the Opportunity Summary fields must be read-only
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-012 @p2 @disqualified-mrd-can
  Scenario: When disqualified, MRD can view Opportunity and approval comments
    Given an Opportunity has been disqualified as a result of Executive rejection
    When the MRD opens the Opportunity
    Then the MRD can view the Opportunity and all historical data
    And the MRD can view approval comments and rejection reason
    And I take a screenshot as evidence

  @SF-657 @SF-657-UI-013 @p2 @disqualified-mrd-cannot
  Scenario: When disqualified, MRD cannot move to Due Diligence or resubmit
    Given an Opportunity has been disqualified as a result of Executive rejection
    When the MRD attempts to move the Opportunity to Due Diligence
    Then the system must prevent the stage change
    And the Opportunity stage must remain Disqualified
    And the MRD cannot submit the Opportunity Summary fields again
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RBT: Permissions – only Executive can approve/reject
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-014 @p2 @permissions
  Scenario: Only Executive team members can approve or reject Opportunity Summary Fields
    Given the Opportunity Summary fields are Pending approval
    When a non-Executive user views the approval request
    Then the user cannot approve or reject the Opportunity Summary fields
    And only the Executive team can record approval or rejection
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (RBT)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-UI-015 @p2 @ui-data-creation
  Scenario: Create Opportunity in Pipeline via UI for approval flow
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence
