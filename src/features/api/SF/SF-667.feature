# JIRA: SF-667 - Initiate Management Committee Approval for UK and EU Members
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only.

@api @salesforce @SF-667 @high @salesforce @SF-667-RBT @opportunity
Feature: API - SF-667 - Initiate Management Committee Approval for UK and EU Members

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-667 @SF-667-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "StageName" field should exist

  @SF-667 @SF-667-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify Distribution_Region__c exists on Opportunity for UK/EU logic
    When I describe the Opportunity object fields
    Then the "Distribution_Region__c" field should exist
