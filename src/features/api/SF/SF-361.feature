# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-361 - Operations Manager Review Data Capture
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-361 @rbt @medium
Feature: API - SF-361 - Operations Manager Review Data Capture
  API must support the behaviour described in the story (SF-361).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-361 @SF-361-API-001 @p1 @smoke @rbt
  Scenario: API - Operations fields become required once onboarding review starts
    Given the Member Onboarding Questionnaire has been submitted for review
    When the Operations Manager accesses the Opportunity
    Then the required Operations onboarding fields must be available for completion (see attachment)

  @SF-361 @SF-361-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-361
    When an alternative or invalid request is made
    Then the API must respond appropriately
