# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-559 - Add field Dataverse_ID_c field to contact object
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-559 @rbt @medium
Feature: API - SF-559 - Add field Dataverse_ID_c field to contact object
  API must support the behaviour described in the story (SF-559).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-559 @SF-559-API-001 @p1 @smoke @rbt
  Scenario: API - Create hidden Dataverse ID field on Contact
    Given the Contact object
    When the field "Dataverse_ID__c" is created
    Then it must be of type Text(36)

  @SF-559 @SF-559-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-559
    When an alternative or invalid request is made
    Then the API must respond appropriately
