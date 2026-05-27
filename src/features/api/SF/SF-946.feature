# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-946 - Contract Renewal - Contracting Stage
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-946 @rbt @medium
Feature: API - SF-946 - Contract Renewal - Contracting Stage
  API must support the behaviour described in the story (SF-946).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-946 @SF-946-API-001 @p1 @smoke @rbt
  Scenario: API - Contracting Stage for ‘Contract Renewal’ Opportunities should follow the same Contracting process as ‘New Member’ Opportunities
    Given the Opportunity Sub Type is ‘Contract Renewal’
    When the API is invoked for SF-946
    Then the Opportunity should follow the same Contracting process as ‘New Member’ Opportunities, ie

  @SF-946 @SF-946-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-946
    When an alternative or invalid request is made
    Then the API must respond appropriately
