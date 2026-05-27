# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-561 - Verify Picklist Values of OOTB Address Fields
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: picklist-values, field-behavior, validation-rule
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Updated manually from Jira doc
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI comprehensive, API minimal 1-2 tests
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Verify Picklist Values of OOTB Address Fields
# Primary Entities: Account, Lead
#
# Validation Rules Deployed:
#   Account: Billing_Country_Required, Billing_Country_becomes_readonly,
#            Account_Enforce_Billing_State_By_Country
#   Lead:    Blank_BillingCountry, Lead_Enforce_Billing_State_By_Country
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-561 @medium @picklist-values @field-behavior @account @lead
Feature: API - SF-561 - Verify Picklist Values of OOTB Address Fields

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 4: BillingCountry approved country picklist via API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-API-001 @smoke @p1 @field-exists @account
  Scenario: API - Verify BillingCountry field exists on Account
    When I describe the Account object fields
    Then the "BillingCountry" field should exist

  @SF-561 @SF-561-API-002 @smoke @p1 @field-exists @lead
  Scenario: API - Verify Country field exists on Lead
    When I describe the Lead object fields
    Then the "Country" field should exist

  @SF-561 @SF-561-API-003 @p1 @picklist @country @account
  Scenario: API - Verify BillingCountry picklist contains approved countries on Account
    When I describe the Account object fields
    Then the "BillingCountry" field should exist
    And the "BillingCountry" field should be a picklist with approved country values

  @SF-561 @SF-561-API-004 @p1 @picklist @country @lead
  Scenario: API - Verify Country picklist contains approved countries on Lead
    When I describe the Lead object fields
    Then the "Country" field should exist
    And the "Country" field should be a picklist with approved country values

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 5: BillingState approved US state picklist via API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-API-005 @p1 @field-exists @account
  Scenario: API - Verify BillingState field exists on Account
    When I describe the Account object fields
    Then the "BillingState" field should exist

  @SF-561 @SF-561-API-006 @p1 @field-exists @lead
  Scenario: API - Verify State field exists on Lead
    When I describe the Lead object fields
    Then the "State" field should exist

  @SF-561 @SF-561-API-007 @p1 @picklist @us-states @account
  Scenario: API - Verify BillingState picklist contains approved US states on Account
    When I describe the Account object fields
    Then the "BillingState" field should exist
    And the "BillingState" picklist for country "US" should contain approved US state values

  @SF-561 @SF-561-API-008 @p1 @picklist @ca-provinces @account
  Scenario: API - Verify BillingState picklist contains approved Canadian provinces on Account
    When I describe the Account object fields
    Then the "BillingState" field should exist
    And the "BillingState" picklist for country "CA" should contain approved Canadian province values

  # ══════════════════════════════════════════════════════════════════════════
  # VALIDATION RULE ENFORCEMENT
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-API-009 @p1 @positive @account @create
  Scenario: API - Create Account with valid BillingCountry and BillingState
    When I create a new Account via POST with:
      | field           | value                  |
      | Name            | API Test SF561 Account |
      | Type            | Agency                 |
      | BillingCountry  | United States          |
      | BillingState    | New York               |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-561 @SF-561-API-010 @p1 @negative @account @state-dependency
  Scenario: API - Account creation blocked when BillingState set for non-US/Canada country
    When I create a new Account via POST with:
      | field           | value          |
      | Name            | API Test State |
      | Type            | Agency         |
      | BillingCountry  | Germany        |
      | BillingState    | Bayern         |
    Then the API should return an error

  @SF-561 @SF-561-API-011 @p1 @negative @account @onboarding @read-only
  Scenario: API - BillingCountry change blocked on Onboarding Account
    Given I have a test Account created via API with:
      | field              | value         |
      | Account_Status__c  | Onboarding    |
      | BillingCountry     | United States |
      | BillingState       | New York      |
    When I update the Account field "BillingCountry" to "Canada" via API
    Then the API should return an error
    And the error response should mention "Billing Country"
