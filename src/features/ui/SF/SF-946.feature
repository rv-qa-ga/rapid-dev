# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-946 - Contract Renewal - Contracting Stage
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-946 @rbt @medium
Feature: UI - SF-946 - Contract Renewal - Contracting Stage
  As MRD
  I want All ‘Contract Renewal’ Opportunities to follow the same process for the Contracting stage as ‘New Member’ Opportunities
  So that the right people approve the Contract Renewal Opportunities and the information is added into CMT

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Account exists in Salesforce
    And an MRD can create an Opportunity against an existing Account
    And the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Contracting’ Stage
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-946 @SF-946-UI-001 @p1 @rbt
  Scenario: Contracting Stage for ‘Contract Renewal’ Opportunities should follow the same Contracting process as ‘New Member’ Opportunities
    Given the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Contracting’ Stage
    Then the Opportunity should follow the same Contracting process as ‘New Member’ Opportunities, ie
    And I take a screenshot as evidence

  @SF-946 @SF-946-UI-002 @p1 @rbt
  Scenario: The MRD should not have to re upload a draft contract to the sharepoint in the ‘Contracting' Stage
    Given the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Contracting’ Stage
    Then the Opportunity should follow the same workflow as ‘New Member’ Opportunities in this stage
    And I take a screenshot as evidence

  @SF-946 @SF-946-UI-003 @p1 @rbt
  Scenario: No Product Map related tasks should be completed for ‘Contract Renewal’ Opportunities in the ‘Contracting’ stage
    Given the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Contracting’ Stage
    Then the Opportunity should follow the same workflow as ‘New Member’ Opportunities in this stage
    And no product map related validations should block the Opportunity from moving to the Go-Live stage
    And I take a screenshot as evidence

