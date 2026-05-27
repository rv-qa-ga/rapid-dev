# JIRA: SF-668 - Management Committee Approval Decision
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only.

@api @salesforce @SF-668 @high @salesforce @SF-668-RBT @opportunity
Feature: API - SF-668 - Management Committee Approval Decision

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-668 @SF-668-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "StageName" field should exist
