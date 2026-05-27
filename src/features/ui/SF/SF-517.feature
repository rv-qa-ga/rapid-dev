# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-517 - Create Dataverse ID Field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility, field-behavior, validation-rule
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT)
# Primary Entity: Account
# Field: Dataverse_ID__c (Text 36, hidden from layouts, API-only)
#
# Key Requirements:
#   - Field exists as Text(36), labeled "Dataverse ID"
#   - Excluded from all page layouts (not visible in UI)
#   - Visible via API to integration users
#   - Blank on new Account creation
#   - Read-only for non-integration users (system-managed)
#   - Validation rule blocks manual edits with message:
#     "Dataverse ID is system-managed and cannot be edited."
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-517 @medium @field-behavior @account
Feature: SF-517 - Create Dataverse ID Field on Account
  As an integration analyst
  I want a hidden field on Account to store the Dataverse record ID
  So that downstream integrations can reliably match records across systems

  Background:
    Given I am an authenticated Salesforce user

  @SF-517 @SF-517-UI-001 @p1 @smoke @hidden-field
  Scenario: Dataverse_ID__c is not visible on Account page layout
    Given I am logged in as a "QA MRD User" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Dataverse_ID__c" field should not be visible
    And I take a screenshot as evidence

  @SF-517 @SF-517-UI-002 @p1 @negative @read-only
  Scenario: Dataverse_ID__c is not editable via Account edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Dataverse_ID__c" field should not be editable
    And I take a screenshot as evidence

  @SF-517 @SF-517-UI-003 @p2 @positive @new-account
  Scenario: Dataverse_ID__c is blank on newly created Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # API VERIFICATION (included in UI suite)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-517 @SF-517-API-001 @smoke @p1 @api @field-exists
  Scenario: API - Verify Dataverse_ID__c field exists on Account as Text(36)
    Given I have a valid Salesforce API token
    When I describe the Account object fields
    Then the "Dataverse_ID__c" field should exist

  @SF-517 @SF-517-API-002 @p1 @api @negative @read-only
  Scenario: API - Non-integration user cannot update Dataverse_ID__c
    Given I have a valid Salesforce API token
    And I have an existing Account record
    When I update the Account field "Dataverse_ID__c" to "test-guid-value" via API
    Then the API should return an error
    And the error response should mention "Dataverse ID"
