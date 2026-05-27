# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-670 - Draft Contract Upload and Triggers Internal Approval
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-670 @rbt @medium
Feature: API - SF-670 - Draft Contract Upload and Triggers Internal Approval
  API must support the behaviour described in the story (SF-670).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-670 @SF-670-API-001 @p1 @smoke @rbt
  Scenario: API - Moving a New Opportunity to Contracting notifies MRD to upload a draft contract
    Given an Opportunity is moved to stage "Contracting"
    When the stage change is saved
    Then the system must notify the MRD to upload a draft contract to SharePoint via the Opportunity

  @SF-670 @SF-670-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-670
    When an alternative or invalid request is made
    Then the API must respond appropriately
