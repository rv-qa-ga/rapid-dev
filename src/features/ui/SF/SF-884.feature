# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-884 - Contract Renewal Opportunity Sub Type
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-884 @rbt @medium
Feature: UI - SF-884 - Contract Renewal Opportunity Sub Type
  As MRD
  I want to be able to complete the required information needed for a Contract Renewal Opportunity type
  So that all required information for a Contract Renewal is captured for Approval

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account exists in Salesforce
    And an MRD can create an Opportunity against an existing Account
    And the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Renewal’
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-884 @SF-884-UI-001 @p1 @rbt
  Scenario: MRD must upload the draft contract to SharePoint via the Opportunity
    Given the MRD has created a new Opportunity
    And the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Renewal’
    Then the MRD must upload a draft contract document to SharePoint from the Opportunity record
    And the draft contract document must be accessible via the Opportunity
    And associated to the correct Opportunity
    And the MRD marks the Opportunity as ‘Ready for Approval’
    And I take a screenshot as evidence

  @SF-884 @SF-884-UI-002 @p1 @rbt
  Scenario: Opportunity moves to the Due Diligence stage once a Contract has been Uploaded
    Given an MRD has created a new Opportunity
    And the Opportunity Type is ‘Contract Renewal’
    When the MRD has uploaded a Draft contract and marked the Opportunity as ‘Ready for Approval’
    Then the Opportunity can progress to the ‘Due Diligence’ stage
    And I take a screenshot as evidence

  @SF-884 @SF-884-UI-003 @p1 @rbt
  Scenario: Opportunity can’t move to the Due Diligence stage until a contract has been uploaded
    Given an MRD has created a new Opportunity
    And the Opportunity Type is ‘Contract Renewal’
    Then the Opportunity can *NOT* progress to the ‘Due Diligence’ stage
    And I take a screenshot as evidence

