# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-915 - Account Field Updates - Replaces Bug 851
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-915 @rbt @medium
Feature: API - SF-915 - Account Field Updates - Replaces Bug 851
  API must support the behaviour described in the story (SF-915).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-915 @SF-915-API-001 @p1 @smoke @rbt
  Scenario: API - Fields are visible only for the statuses they are mapped to
    Given the Account Status is set to a specific value
    When a user views the Account record
    Then only the fields mapped to that Account Status must be visible (see attachment)

  @SF-915 @SF-915-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-915
    When an alternative or invalid request is made
    Then the API must respond appropriately
