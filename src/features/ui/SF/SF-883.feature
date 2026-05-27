# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-883 - Rate & Commission Changes Opportunity Sub Type
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-883 @rbt @medium
Feature: UI - SF-883 - Rate & Commission Changes Opportunity Sub Type
  As MRD
  I want to be able to complete the required information needed for a Rate & Commission Changes Opportunity sub type
  So that all required information for a Rate & Commission Changes is captured for Approval

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account exists in Salesforce
    And an MRD can create an Opportunity against an existing Account
    And the Opportunity sub Type is "Rate & Commission Changes"
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-883 @SF-883-UI-001 @p1 @rbt
  Scenario: Allow entry of updated rate
    Given an MRD creates a new Opportunity for an existing Account
    And the Opportunity Sub Type for this test is "Rate & Commission Changes"
    When the MRD views the Opportunity details
    Then the current Commission Rate must be displayed as read-only
    Then the MRD must be able to enter an Updated Commission Rate
    And the MRD must be able to enter additional comments in a free-text field
    And I take a screenshot as evidence

  @SF-883 @SF-883-UI-002 @p1 @rbt
  Scenario: Updated Commission Rate is required before saving
    Given a "Rate & Commission Changes" Opportunity exists
    And the Updated Commission Rate field is blank
    When the MRD attempts to save the Opportunity
    Then the save must be prevented
    And a validation message must be displayed indicating that the Updated Commission Rate is required containing "Complete this field"
    And I take a screenshot as evidence

  @SF-883 @SF-883-UI-003 @p1 @rbt
  Scenario: Opportunity can be saved once Updated Commission Rate is entered
    Given a "Rate & Commission Changes" Opportunity exists
    And the Updated Commission Rate has been completed
    When the MRD saves the Opportunity
    Then the save must succeed
    And the Updated Commission Rate must be stored against the Opportunity
    And any additional comments must be stored against the Opportunity
    And I take a screenshot as evidence

  @SF-883 @SF-883-UI-004 @p1 @rbt
  Scenario: Rate & Commission Changes fields and validation do not apply to other Opportunity sub types
    Given an MRD creates or edits an Opportunity
    And the Opportunity Sub Type is not "Rate & Commission Changes"
    When the MRD views the Opportunity details
    Then the current Commission Rate field must not be shown
    And the Updated Commission Rate field must not be shown
    And the free-text comments field specific to this flow must not be shown
    And no validation relating to Updated Commission Rate should be enforced
    And I take a screenshot as evidence

  @SF-883 @SF-883-UI-005 @p1 @rbt
  Scenario: Opportunity can move to the "Contracting" stage once Updated Commission Rate is entered
    Given an MRD has created an Opportunity
    And the Opportunity Sub Type is "Rate & Commission Changes"
    When the Updated Commission Rate field has been completed
    And the MRD has successfully saved the Opportunity
    Then the Opportunity can progress to the "Contracting" stage
    And I take a screenshot as evidence

  @SF-883 @SF-883-UI-006 @p1 @rbt
  Scenario: Opportunity cannot move to the "Contracting" stage until Updated Commission Rate is entered
    Given an MRD has created an Opportunity
    And the Opportunity Sub Type is "Rate & Commission Changes"
    Then the Opportunity cannot progress to the "Contracting" stage
    And I take a screenshot as evidence

