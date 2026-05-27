# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-672 - Legal Approval Workflow for Contracts (US/CA New Opportunities)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-672 @rbt @medium
Feature: API - SF-672 - Legal Approval Workflow for Contracts (US/CA New Opportunities)
  API must support the behaviour described in the story (SF-672).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-672 @SF-672-API-001 @p1 @smoke @rbt
  Scenario: API - Legal can approve the draft contract
    Given the system is configured for SF-672
    When the Legal team approves the draft contract
    Then the system must record the decision as Approved

  @SF-672 @SF-672-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-672
    When an alternative or invalid request is made
    Then the API must respond appropriately
