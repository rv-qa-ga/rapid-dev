# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-985 - New Member Opportunity Lifecycle continued
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-985 @rbt @medium
Feature: API - SF-985 - New Member Opportunity Lifecycle continued
  API must support the behaviour described in the story (SF-985).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-985 @SF-985-API-001 @p1 @smoke @rbt
  Scenario: API - Only sequential forward stage progression is allowed for New Business Opportunities
    Given an Opportunity exists with Type = "New Business"
    When a user attempts to change the Opportunity stage
    Then the following forward stage transitions must be allowed:

  @SF-985 @SF-985-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-985
    When an alternative or invalid request is made
    Then the API must respond appropriately
