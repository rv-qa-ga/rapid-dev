# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-650 - 5. Creation of Personas with MRD-Equivalent Access
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-650 @rbt @medium
Feature: API - SF-650 - 5. Creation of Personas with MRD-Equivalent Access
  API must support the behaviour described in the story (SF-650).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-650 @SF-650-API-001 @p1 @smoke @rbt
  Scenario: API - Main scenario
    Given the system is configured for SF-650
    When the API is invoked for SF-650
    Then the API must return success or the expected outcome
