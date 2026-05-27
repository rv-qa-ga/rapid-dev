# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-985 - New Member Opportunity Lifecycle continued
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-985 @rbt @medium
Feature: UI - SF-985 - New Member Opportunity Lifecycle continued
  As MRD
  I want New Business Opportunities to follow a sequential lifecycle with controlled disqualification.
  So that required approval steps are completed in order, Opportunities can be marked Unqualified at the appropriate stages.

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an Opportunity exists with Opportunity Type = “New Business”
    And the Opportunity lifecycle stages are, in order:
    And “Unqualified” is an allowed outcome from Pipeline, Due Diligence, or Contracting
    And stage progression requires completion of approval steps and required task confirmations
    And the Account lifecycle must remain broadly aligned to the Opportunity stage as follows:
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-985 @SF-985-UI-001 @p1 @rbt
  Scenario: Only sequential forward stage progression is allowed for New Business Opportunities
    Given an Opportunity exists with Type = "New Business"
    When a user attempts to change the Opportunity stage
    Then the following forward stage transitions must be allowed:
    And any attempt to skip a stage must be prevented
    And any attempt to move backwards must be prevented
    And I take a screenshot as evidence

  @SF-985 @SF-985-UI-002 @p1 @rbt
  Scenario: Opportunity cannot be set to Unqualified from Go-Live or Live
    Given an Opportunity exists with Type = “New Business”
    And the Opportunity stage is “Go-Live” or “Live”
    When a user attempts to change the Opportunity stage to “Unqualified”
    Then the change must be prevented
    And the user must see an error message stating:
    And I take a screenshot as evidence

