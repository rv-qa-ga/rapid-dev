# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-517 - Create Dataverse ID Field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility, field-behavior, validation-rule
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT) - API minimal
# Primary Entity: Account
# Field: Dataverse_ID__c (Text 36)
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-517 @medium @field-behavior @account
Feature: API - SF-517 - Create Dataverse ID Field on Account

  Background:
    Given I have a valid Salesforce API token

  @SF-517 @SF-517-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Dataverse_ID__c field exists on Account as Text(36)
    When I describe the Account object fields
    Then the "Dataverse_ID__c" field should exist

  @SF-517 @SF-517-API-002 @p1 @negative @read-only
  Scenario: API - Non-integration user cannot update Dataverse_ID__c
    Given I have an existing Account record
    When I update the Account field "Dataverse_ID__c" to "test-guid-value" via API
    Then the API should return an error
    And the error response should mention "Dataverse ID"
