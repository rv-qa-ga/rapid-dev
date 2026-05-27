# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-670 - Draft Contract Upload and Triggers Internal Approval
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-670 @rbt @medium
Feature: UI - SF-670 - Draft Contract Upload and Triggers Internal Approval
  As MRD
  I want to be prompted to upload a draft contract when an Opportunity enters Contracting and have it routed to the right approver based on Region
  So that the contract is reviewed internally by the right team before progressing

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity exists
    And the Opportunity.Type = New Business
    And the Opportunity is eligible to enter stage "Contracting"
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-670 @SF-670-UI-001 @p1 @rbt
  Scenario: Moving a New Opportunity to Contracting notifies MRD to upload a draft contract
    Given an Opportunity is moved to stage "Contracting"
    When the stage change is saved
    Then the system must notify the MRD to upload a draft contract to SharePoint via the Opportunity
    And I take a screenshot as evidence

  @SF-670 @SF-670-UI-002 @p1 @rbt
  Scenario: MRD uploads the draft contract to SharePoint via the Opportunity
    Given the MRD has a notification to upload a draft contract
    When the MRD uploads a draft contract document to SharePoint from the Opportunity record
    Then the draft contract document must be accessible via the Opportunity
    And associated to the correct Opportunity
    And the MRD marks the contract as ‘Ready for Approval’
    And I take a screenshot as evidence

  @SF-670 @SF-670-UI-003 @p1 @rbt
  Scenario: US/CA Opportunities approved by Legal
    Given an Opportunity is in stage "Contracting"
    And a draft contract document is uploaded and associated with the Opportunity
    And Region__c = US or CA
    When the MRD marks the contract as ‘Ready for Approval’
    Then the system must send the approval request to the Legal team and say ‘Please review this Draft Contact’ with a link to the SharePoint
    And I take a screenshot as evidence

  @SF-670 @SF-670-UI-004 @p1 @rbt
  Scenario: UK/EU Opportunities approved by Head of Distribution
    Given an Opportunity is in stage "Contracting"
    And a draft contract document is uploaded and associated with the Opportunity
    And Region__c = UK or EU
    When the MRD marks the contract as ‘Ready for Approval’
    Then the system must send the approval request to the Head of Distribution and say ‘Please review this Draft Contact’ with a link to the SharePoint
    And I take a screenshot as evidence

  @SF-670 @SF-670-UI-005 @p1 @rbt
  Scenario: Only for New Business Opportunities
    Given an Opportunity is moved to stage "Contracting"
    And the Opportunity.Type is NOT New Business
    When the stage change is saved
    Then the system must not trigger the draft contract upload notification
    And the system must not initiate the internal contract approval process
    And I take a screenshot as evidence

