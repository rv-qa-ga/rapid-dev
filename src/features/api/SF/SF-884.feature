# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-884 - Contract Renewal Opportunity Sub Type
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-884 @rbt @medium
Feature: API - SF-884 - Contract Renewal Opportunity Sub Type
  API must support the behaviour described in the story (SF-884).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-884 @SF-884-API-001 @p1 @smoke @rbt
  Scenario: API - MRD must upload the draft contract to SharePoint via the Opportunity
    Given the MRD has created a new Opportunity
    When the API is invoked for SF-884
    Then the MRD must upload a draft contract document to SharePoint from the Opportunity record

  @SF-884 @SF-884-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-884
    When an alternative or invalid request is made
    Then the API must respond appropriately
