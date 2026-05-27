# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-671 - Head of Distribution Approval Workflow for Contracts (UK/EU New Opportunities)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-671 @rbt @medium
Feature: API - SF-671 - Head of Distribution Approval Workflow for Contracts (UK/EU New Opportunities)
  API must support the behaviour described in the story (SF-671).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-671 @SF-671-API-001 @p1 @smoke @rbt
  Scenario: API - Head of Distribution can approve the draft contract
    Given the system is configured for SF-671
    When the Head of Distribution approves the draft contract
    Then the system must record the decision as Approved

  @SF-671 @SF-671-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-671
    When an alternative or invalid request is made
    Then the API must respond appropriately
