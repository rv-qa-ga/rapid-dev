# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-732 - Make Billing Country read-only on Account for later phases
# Type: Task | Status: Ready for QA | Priority: Medium
# Feature Type: field-behavior, validation-rule
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT)
# Primary Entity: Account
# Related Story: SF-561 (Onboarding-only read-only rule)
#
# Validation Rule: Billing_Country_becomes_readonly
#   Fires when Account_Status__c IN:
#     Onboarding, Contracted, Active, Runoff, Offboarded, Invalid
#
# Error: "Billing Country cannot be changed once the Account is in
#         Onboarding status or beyond."
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-732 @medium @field-behavior @account @read-only
Feature: SF-732 - Make Billing Country read-only on Account for later phases
  As an MRD and Data Steward
  I want BillingCountry to remain read-only for all statuses from Onboarding onward
  So that billing address data cannot be modified once the Account is in a downstream lifecycle phase

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # RBT: Read-only check across all locked statuses (data-driven)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-732 @SF-732-UI-001 @p1 @smoke @read-only
  Scenario Outline: BillingCountry is read-only for Account_Status__c = "<status>"
    Given I am logged in as a "QA MRD User" user
    And I have a test Account created via API with:
      | field              | value           |
      | Account_Status__c  | <status>        |
      | BillingCountry     | United States   |
      | BillingState       | New York        |
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "BillingCountry" field should not be editable
    And I take a screenshot as evidence

    Examples:
      | status      |
      | Onboarding  |
      | Contracted  |
      | Active      |
      | Runoff      |
      | Offboarded  |
      | Invalid     |

  # ══════════════════════════════════════════════════════════════════════════
  # RBT: Error message on attempted change (single representative status)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-732 @SF-732-UI-002 @p1 @negative @error-message
  Scenario: Error displayed when attempting to change BillingCountry on Contracted Account
    Given I am logged in as a "QA MRD User" user
    And I have a test Account created via API with:
      | field              | value         |
      | Account_Status__c  | Contracted    |
      | BillingCountry     | United States |
      | BillingState       | New York      |
    When I navigate to the Account record
    And I click Edit on the Account
    And I attempt to change the "BillingCountry" field to "Canada"
    And I save the record
    Then the record should not be saved
    And the error message should mention "Billing Country" or "Onboarding"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RBT: Boundary - still editable before Onboarding
  # ══════════════════════════════════════════════════════════════════════════

  @SF-732 @SF-732-UI-003 @p2 @positive @boundary
  Scenario: BillingCountry is still editable when Account is pre-Onboarding
    Given I am logged in as a "QA MRD User" user
    And I have a test Account created via API with:
      | field              | value         |
      | Account_Status__c  | Prospect      |
      | BillingCountry     | United States |
      | BillingState       | Texas         |
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "BillingCountry" field should be visible
    And the "BillingCountry" field should be editable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # API VERIFICATION (included in UI suite)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-732 @SF-732-API-001 @smoke @p1 @api @negative
  Scenario: API - BillingCountry update blocked on Contracted Account
    Given I have a valid Salesforce API token
    And I create a new Account via POST with:
      | field              | value              |
      | Name               | SF732-API-Test-001 |
      | Account_Status__c  | Contracted         |
      | BillingCountry     | United States      |
      | BillingState       | New York           |
    When I update the Account field "BillingCountry" to "Canada" via API
    Then the API should return an error
    And the error response should mention "Billing Country"

  @SF-732 @SF-732-API-002 @p2 @api @positive @boundary
  Scenario: API - BillingCountry update succeeds on pre-Onboarding Account
    Given I have a valid Salesforce API token
    And I create a new Account via POST with:
      | field              | value              |
      | Name               | SF732-API-Test-002 |
      | Account_Status__c  | Prospect           |
      | BillingCountry     | United States      |
      | BillingState       | Texas              |
    When I update the Account field "BillingCountry" to "Canada" via API
    Then the API should not return an error
