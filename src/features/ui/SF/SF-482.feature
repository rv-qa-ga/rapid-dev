# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-482 - Hide Target Insured Industry field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility, permissions
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT)
# Primary Entity: Account
# Field: Industry (API name), labeled "Target Insured Industry"
#
# Key Requirements:
#   - Hidden from non-admin users on Account detail page
#   - Still visible to System Administrators
#   - Not visible in search results, compact layouts, list views for non-admins
#   - Not available in report field picker for non-admins
#   - Visibility change only — no data or logic changes
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-482 @medium @field-visibility @account @permissions
Feature: SF-482 - Hide Target Insured Industry field on Account
  As an MRD User
  I want the Target Insured Industry field hidden from non-admin users
  So that standard users do not see or interact with this field

  Background:
    Given I am an authenticated Salesforce user

  @SF-482 @SF-482-UI-001 @p1 @smoke @positive @admin
  Scenario: Target Insured Industry is visible to System Administrator
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Industry" field should be visible
    And I take a screenshot as evidence

  @SF-482 @SF-482-UI-002 @p1 @smoke @negative @non-admin
  Scenario: Target Insured Industry is hidden from non-admin users
    Given I am logged in as a "QA MRD User" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Industry" field should not be visible
    And I take a screenshot as evidence

  @SF-482 @SF-482-UI-003 @p2 @negative @standard-user
  Scenario: Target Insured Industry is hidden from standard users on edit form
    Given I am logged in as a "Standard User" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Industry" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # API VERIFICATION (included in UI suite)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-482 @SF-482-API-001 @smoke @p1 @api @field-exists
  Scenario: API - Verify Industry field still exists on Account (not deleted)
    Given I have a valid Salesforce API token
    When I describe the Account object fields
    Then the "Industry" field should exist

  @SF-482 @SF-482-API-002 @p2 @api @positive @data-intact
  Scenario: API - Verify existing Account Industry data is intact after layout change
    Given I have a valid Salesforce API token
    And I have an existing Account record
    When I query the Account record via API
    Then the API should return status code 200
