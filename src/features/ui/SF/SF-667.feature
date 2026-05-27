# JIRA: SF-667 - Initiate Management Committee Approval for UK and EU Members
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - Risk-Based Testing (RBT)
# RBT: UI test cases from acceptance criteria; API minimal 1-2 smoke tests.
#
# Story: As a POG Manager I want to assign ManCo approvers once POG review and
# onboarding reviews are complete (EU/UK only), so that the opportunity is
# formally submitted for ManCo consideration before Contracting.

@ui @salesforce @SF-667 @high @salesforce @SF-667-RBT @opportunity @manco @pog
Feature: SF-667 - Initiate Management Committee Approval for UK and EU Members
  As a POG Manager
  I want to assign the Management Committee (ManCo) approvers once POG review and onboarding reviews are complete (EU/UK only)
  So that the opportunity is formally submitted for ManCo consideration before Contracting

  Background:
    Given I am logged in as a "QA MRD User" user

  # RBT: Scenario 1 - ManCo required for UK/EU when prerequisites complete
  @SF-667 @SF-667-UI-001 @p1 @smoke @rbt @manco-required
  Scenario: ManCo approval is required for UK and EU once prerequisites are complete
    Given the Opportunity is in Due Diligence
    And the Opportunity Type is "New Business"
    And the Opportunity Region is "UK" or "EU"
    And the POG review is marked as Complete
    And all Member Onboarding Questionnaire reviews are marked as Complete
    When the POG Manager views the Opportunity
    Then the system must indicate that ManCo approval is required
    And the POG Manager must be prompted to assign the ManCo approvers
    And I take a screenshot as evidence

  # RBT: Scenario 2 - ManCo not required outside UK/EU
  @SF-667 @SF-667-UI-002 @p1 @rbt @manco-not-required
  Scenario: ManCo approval is not required outside UK and EU
    Given the Opportunity is in Due Diligence
    And the Opportunity Type is "New Business"
    And the Opportunity Region is not "EU" and not "UK"
    When the POG Manager views the Opportunity
    Then ManCo approval must not be required
    And the Opportunity must not be allowed to progress to the "Contract" stage
    And I take a screenshot as evidence

  # RBT: Scenario 3 - Cannot assign ManCo before prerequisites complete
  @SF-667 @SF-667-UI-003 @p1 @rbt @prerequisites
  Scenario: POG Manager cannot assign ManCo approvers before prerequisites are complete
    Given the Opportunity is in Due Diligence
    And the Opportunity Type is "New Business"
    And the Opportunity Region is "UK" or "EU"
    And either POG review is not complete or one or more onboarding questionnaire reviews are not complete
    When the POG Manager attempts to assign the ManCo approvers
    Then the system must prevent the assignment
    And explain that all prerequisite reviews must be completed first
    And I take a screenshot as evidence

  # RBT: Scenario 4 - POG Manager assigns ManCo approval team
  @SF-667 @SF-667-UI-004 @p1 @rbt @assign-manco
  Scenario: POG Manager can assign ManCo approvers when prerequisites are complete
    Given the Opportunity is in Due Diligence
    And the Opportunity Type is "New Business"
    And the Opportunity Region is "UK" or "EU"
    And all prerequisite reviews are complete
    When the POG Manager assigns the ManCo approvers
    Then the assignment must be recorded
    And the Opportunity must be eligible for ManCo approvals
    And I take a screenshot as evidence

  # RBT: Scenario 5 - Cannot move to Contracting until ManCo granted
  @SF-667 @SF-667-UI-005 @p1 @rbt @block-contracting
  Scenario: Opportunity cannot move to Contracting until ManCo approval is granted
    Given the Opportunity is in Due Diligence
    And the Opportunity Type is "New Business"
    And ManCo approval is required and has not yet been granted
    When a user attempts to move the Opportunity to Contracting
    Then the system must prevent the stage change
    And indicate that ManCo approval is required
    And I take a screenshot as evidence

  # RBT: Permissions - only POG Manager can assign ManCo
  @SF-667 @SF-667-UI-006 @p2 @rbt @permissions
  Scenario: Only POG Manager can assign ManCo approvers
    Given the Opportunity is eligible for ManCo assignment
    When a user who is not the POG Manager attempts to assign ManCo approvers
    Then the system must prevent the assignment
    And I take a screenshot as evidence
