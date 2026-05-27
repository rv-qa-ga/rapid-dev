# JIRA: SF-585 - TPA Maps
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only.

@api @salesforce @SF-585 @medium @salesforce @SF-585-RBT @account
Feature: API - SF-585 - TPA Maps

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-585 @SF-585-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Account
    When I describe the Account object fields
    Then the "Type" field should exist
