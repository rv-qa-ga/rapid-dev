# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-686 - Operations Add Contract Data into CMT
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-686 @rbt @medium
Feature: API - SF-686 - Operations Add Contract Data into CMT
  API must support the behaviour described in the story (SF-686).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-686 @SF-686-API-001 @p1 @smoke @rbt
  Scenario: API - Completion of MRD post-approval tasks triggers the “Input Contract Data into CMT” task
    Given the MRD “post-approval contract” task is marked Complete
    When the API is invoked for SF-686
    Then the system must create a task for the Operations Manager called “Input Contract Data into CMT”

  @SF-686 @SF-686-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-686
    When an alternative or invalid request is made
    Then the API must respond appropriately
