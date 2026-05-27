# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-478 - Member-Legal Entity-Group Relationships
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-478 @rbt @medium
Feature: API - SF-478 - Member-Legal Entity-Group Relationships
  API must support the behaviour described in the story (SF-478).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-478 @SF-478-API-001 @p1 @smoke @rbt
  Scenario: API - Support all valid relationship types
    Given the system is configured for SF-478
    When the API is invoked for SF-478
    Then the API must return success or the expected outcome

  @SF-478 @SF-478-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-478
    When an alternative or invalid request is made
    Then the API must respond appropriately
