# JIRA: SF-362 - Compliance Data Capture for Member Onboarding Review
# RBT - API minimal 1-2 smoke tests (Mode 4).

@api @salesforce @SF-362 @medium @salesforce @SF-362-RBT @compliance @task
Feature: API - SF-362 - Compliance Data Capture for Member Onboarding Review

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-362 @SF-362-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Task object available for Compliance review tasks
    When I describe the Task object fields
    Then the "Subject" field should exist

  @SF-362 @SF-362-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify Opportunity_Readiness__c available for onboarding review context
    When I describe the Opportunity_Readiness__c object fields
    Then the "Id" field should exist
