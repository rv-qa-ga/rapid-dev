# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-944 - Contract Renewal - Compliance Approval
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-944 @rbt @medium
Feature: API - SF-944 - Contract Renewal - Compliance Approval
  API must support the behaviour described in the story (SF-944).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-944 @SF-944-API-001 @p1 @smoke @rbt
  Scenario: API - Compliance Team should receive a notification requesting their Approval of the Draft Contract Renewal
    Given an Opportunity is in the ‘Due Diligence’ stage
    When the API is invoked for SF-944
    Then the system must send the approval request to the Compliance team and say ‘Please review this Draft Contact’ with a link to the Opportunity

  @SF-944 @SF-944-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-944
    When an alternative or invalid request is made
    Then the API must respond appropriately
