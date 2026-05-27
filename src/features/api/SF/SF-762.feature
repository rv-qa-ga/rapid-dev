# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-762 - Contract Approval to Move Account to Contracted (New Business)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-762 @rbt @medium
Feature: API - SF-762 - Contract Approval to Move Account to Contracted (New Business)
  API must support the behaviour described in the story (SF-762).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-762 @SF-762-API-001 @p1 @smoke @rbt
  Scenario: API - Account cannot move to Contracted unless executed contract confirmation exists (New Business only)
    Given an Account exists with Account Type = “Member” or “Non-Member MGA”
    When a user attempts to change the Account Status to “Contracted” and saves
    Then the signed contract should have been uploaded to SharePoint and is associated to the Opportunity

  @SF-762 @SF-762-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-762
    When an alternative or invalid request is made
    Then the API must respond appropriately
