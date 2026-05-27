# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-800 - Publish Platform Events for Reference Data Integration
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-800 @rbt @medium
Feature: API - SF-800 - Publish Platform Events for Reference Data Integration
  API must support the behaviour described in the story (SF-800).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-800 @SF-800-API-001 @p1 @smoke @rbt
  Scenario: API - Publish Platform Event for eligible reference data value addition
    Given a new reference data value is created in Salesforce
    When the addition to the reference data is saved successfully
    Then a Platform Event is published

  @SF-800 @SF-800-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-800
    When an alternative or invalid request is made
    Then the API must respond appropriately
