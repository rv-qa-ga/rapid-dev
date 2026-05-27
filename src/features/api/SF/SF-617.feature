# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-617 - Updates to Account Relationship (TPA Maps) object
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-617 @rbt @medium
Feature: API - SF-617 - Updates to Account Relationship (TPA Maps) object
  API must support the behaviour described in the story (SF-617).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-617 @SF-617-API-001 @p1 @smoke @rbt
  Scenario: API - Rename object label and API name to TPA Maps
    Given the custom object currently has:
    When the object is updated
    Then the Label must be changed to “TPA Maps”

  @SF-617 @SF-617-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-617
    When an alternative or invalid request is made
    Then the API must respond appropriately
