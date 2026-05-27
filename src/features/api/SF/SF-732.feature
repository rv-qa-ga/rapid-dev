# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-732 - Make Billing Country read-only on Account for later phases
# Type: Task | Status: Ready for QA | Priority: Medium
# Feature Type: field-behavior, validation-rule
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT) - API minimal 1-2 tests
# Primary Entity: Account
# Validation Rule: Billing_Country_becomes_readonly
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-732 @medium @field-behavior @account @read-only
Feature: API - SF-732 - Make Billing Country read-only on Account for later phases

  Background:
    Given I have a valid Salesforce API token

  @SF-732 @SF-732-API-001 @smoke @p1 @negative
  Scenario: API - BillingCountry update blocked on Contracted Account
    Given I create a new Account via POST with:
      | field              | value              |
      | Name               | SF732-API-Test-001 |
      | Account_Status__c  | Contracted         |
      | BillingCountry     | United States      |
      | BillingState       | New York           |
    When I update the Account field "BillingCountry" to "Canada" via API
    Then the API should return an error
    And the error response should mention "Billing Country"

  @SF-732 @SF-732-API-002 @p2 @positive @boundary
  Scenario: API - BillingCountry update succeeds on pre-Onboarding Account
    Given I create a new Account via POST with:
      | field              | value              |
      | Name               | SF732-API-Test-002 |
      | Account_Status__c  | Prospect           |
      | BillingCountry     | United States      |
      | BillingState       | Texas              |
    When I update the Account field "BillingCountry" to "Canada" via API
    Then the API should not return an error
