# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-794 - Make Dataverse field identifiers available in Salesforce for integration - Account relationship (TPA Maps) -> TPA Maps
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-794 @rbt @medium
Feature: API - SF-794 - Make Dataverse field identifiers available in Salesforce for integration - Account relationship (TPA Maps) -> TPA Maps
  API must support the behaviour described in the story (SF-794).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-794 @SF-794-API-001 @p1 @smoke @rbt
  Scenario: API - Salesforce holds Dataverse IDs so MuleSoft does not hard-code mappings
    Given an integrated Salesforce field includes a value that must be translated to a Dataverse ID
    When I query Salesforce to resolve the Dataverse ID for that value
    Then Salesforce returns the Dataverse ID needed for the Dataverse TPA maps payload

  @SF-794 @SF-794-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-794
    When an alternative or invalid request is made
    Then the API must respond appropriately
