# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-947 - Contract Renewal - Go-Live Stage
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-947 @rbt @medium
Feature: API - SF-947 - Contract Renewal - Go-Live Stage
  API must support the behaviour described in the story (SF-947).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-947 @SF-947-API-001 @p1 @smoke @rbt
  Scenario: API - Go-Live Stage for ‘Contract Renewal’ Opportunities should follow the same Go-Live process as ‘New Member’ Opportunities
    Given the Opportunity Sub Type is ‘Contract Renewal’
    When the API is invoked for SF-947
    Then the Opportunity should follow the same Go-Live process as ‘New Member’ Opportunities, ie

  @SF-947 @SF-947-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-947
    When an alternative or invalid request is made
    Then the API must respond appropriately
