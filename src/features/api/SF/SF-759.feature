# JIRA: SF-759 - Account Status Governance Approval Mechanism
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only.

@api @salesforce @SF-759 @high @salesforce @SF-759-RBT @account
Feature: API - SF-759 - Account Status Governance Approval Mechanism

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-759 @SF-759-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify critical field exists on Account
    When I describe the Account object fields
    Then the "Type" field should exist

  @SF-759 @SF-759-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify Account has Name field for governance context
    When I describe the Account object fields
    Then the "Name" field should exist
