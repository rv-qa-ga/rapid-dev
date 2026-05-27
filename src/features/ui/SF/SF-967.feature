# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-967 - Contract Capacity Increase - IRD Sign Off
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-967 @rbt @medium
Feature: UI - SF-967 - Contract Capacity Increase - IRD Sign Off
  As MRD
  I want the required Contract Capacity Increase change Opportunities to go to the IRD queue for Sign Off
  So that IRD Sign Off can be completed for required Opportunities

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account exists in Salesforce
    And the MRD creates a New Opportunity with an Opportunity Types = ‘Expansions’
    And the Opportunity has a Sub Type = ‘Contract Capacity Increase’
    And the Opportunity is in the ‘Due Diligence’ stage
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-967 @SF-967-UI-001 @p1 @rbt
  Scenario: MRD should be asked if the Opportunity requires IRD Sign Off
    Given the Opportunity has a Sub Type = ‘Contract Capacity Increase’
    And the Opportunity is in the ‘Due Diligence’ stage
    And the MRD will either be able answer ‘Yes’ or ‘No’
    And the MRD *MUST* answer
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-002 @p1 @rbt
  Scenario: IRD Sign Off is Required (MRD selects ‘Yes’)
    Given  the Opportunity has a Sub Type = ‘Contract Capacity Increase’
    And the Opportunity is in the ‘Due Diligence’ stage
    And the system has asked the MRD if Opportunity requires IRD Sign off
    And the MRD selected ‘Yes’
    Then the system must send the approval request to the IRD queue and say ‘Please review this Contract Capacity Increase' with a link to the Opportunity
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-003 @p1 @rbt
  Scenario: Approval notification is sent when IRD Sign Off is required
    Given the Opportunity Type is “Expansions”
    And the Opportunity Sub Type is “Contract Capacity Increase”
    And the MRD has selected “Yes” to IRD Sign Off
    When the approval request is triggered
    Then an approval Email must be sent to the IRD queue
    And the Email notification must be visible to all members of the IRD queue
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-004 @p1 @rbt
  Scenario: IRD Sign Off is NOT Required (MRD selects ‘No’)
    Given the Opportunity has a Sub Type = ‘Contract Capacity Increase’
    And the Opportunity is in the ‘Due Diligence’ stage
    And the system has asked the MRD if Opportunity requires IRD Sign off
    And the MRD selected ‘No’
    Then the system must *NOT* send the approval request to the IRD
    And the Opportunity must be allowed to progress to the ‘Contracting Stage’
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-005 @p1 @rbt
  Scenario: Notification is not sent unless IRD Sign Off is Required
    Given the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Capacity Increase’
    And the Opportunity does *NOT* require IRD Sign Off
    Then the Approval Notification should *NOT* be sent
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-006 @p1 @rbt
  Scenario: IRD signs off on the Contract Capacity Increase
    Given an IRD reviews the ‘Contract Capacity Increase’
    When a IRD signs off
    Then the system must record the decision as Signed Off
    And the system must record which IRD signs off
    And the system must record the date of sign off
    And the system must notify the MRD that the draft contract has been Signed Off
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-007 @p1 @rbt
  Scenario: Only one IRD needs to sign off the Contract Capacity Increase
    Given the Opportunity has a Sub Type = ‘Contract Capacity Increase’
    And the Opportunity requires IRD Sign Off
    And the approval request has been sent to the IRD queue
    And multiple IRD users have access to the approval request
    When any one IRD user signs off the Contract Capacity Increase
    Then the Opportunity must be marked as “Signed Off”
    And no further IRD approvals are required
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-008 @p1 @rbt
  Scenario: Signed off Contract Capacity Increase Opportunities can be moved to the 'Contracting' stage
    Given a IRD signs off the Contract Capacity Increase
    When a user attempts to move the Opportunity to Contracting
    Then the stage change must be allowed
    And I take a screenshot as evidence

  @SF-967 @SF-967-UI-009 @p1 @rbt
  Scenario: Contract Capacity Increase Opportunities CANNOT be moved to the 'Contracting' stage until the IRD has Signed Off (if required)
    Given IRD Sign Off is required
    And an IRD has *NOT* signed off the Contract Capacity Increase
    When a user attempts to move the Opportunity to the Contracting stage
    Then the system must prevent this from happening
    And display a message ‘_IRD Sign Off is required before moving to the Contracting stage’_
    And I take a screenshot as evidence

