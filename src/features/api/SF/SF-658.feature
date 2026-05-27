# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-658 - Member Onboarding Questionnaire Completion
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-658 @rbt @medium
Feature: API - SF-658 - Member Onboarding Questionnaire Completion
  API must support the behaviour described in the story (SF-658).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-658 @SF-658-API-001 @p1 @smoke @rbt
  Scenario: API - Moving Opportunity to Due Diligence triggers notification to MRD
    Given an Opportunity has Opportunity Type = "New Business"
    When the Opportunity Stage changes to "Due Diligence"
    Then the MRD must be notified that the Member Onboarding Questionnaire must be sent to the Member

  @SF-658 @SF-658-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-658
    When an alternative or invalid request is made
    Then the API must respond appropriately
