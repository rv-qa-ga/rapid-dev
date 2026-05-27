# JIRA: SF-723 - New Opportunity Moved to Contracting Stage
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only.

@api @salesforce @SF-723 @medium @salesforce @SF-723-RBT @opportunity
Feature: API - SF-723 - New Opportunity Moved to Contracting Stage

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-723 @SF-723-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "StageName" field should exist

  @SF-723 @SF-723-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify Distribution_Region__c exists for US/CA/UK/EU logic
    When I describe the Opportunity object fields
    Then the "Distribution_Region__c" field should exist
