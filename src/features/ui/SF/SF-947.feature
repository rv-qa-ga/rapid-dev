# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-947 - Contract Renewal - Go-Live Stage
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-947 @rbt @medium
Feature: UI - SF-947 - Contract Renewal - Go-Live Stage
  As MRD
  I want All ‘Contract Renewal’ Opportunities to follow the same process for the Go-Live stage as ‘New Member’ Opportunities
  So that all Go-Live tasks are completed for ‘Contract Renewal’ Opportunities

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an existing Account exists in Salesforce
    And an MRD can create an Opportunity against an existing Account
    And the Opportunity Type is ‘Expansions’
    And the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Go-Live’ Stage
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-947 @SF-947-UI-001 @p1 @rbt
  Scenario: Go-Live Stage for ‘Contract Renewal’ Opportunities should follow the same Go-Live process as ‘New Member’ Opportunities
    Given the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Go-Live’ Stage
    Then the Opportunity should follow the same Go-Live process as ‘New Member’ Opportunities, ie
    And I take a screenshot as evidence

  @SF-947 @SF-947-UI-002 @p1 @rbt
  Scenario: No Product Map related tasks should be completed for ‘Contract Renewal’ Opportunities in the ‘Go-Live’ stage
    Given the Opportunity Sub Type is ‘Contract Renewal’
    And the Opportunity is in the ‘Go-Live’ Stage
    Then the Opportunity should follow the same workflow as ‘New Member’ Opportunities in this stage
    And no product map related validations should block the Opportunity from moving to the Live stage
    And I take a screenshot as evidence

