# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-498 - Map Region from Lead or Account to Opportunity
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Map Region from Lead or Account to Opportunity
# Primary Entity: Opportunity
#
# Test Requirements (5 - ALL COVERED):
#   REQ-1: Region mapped from Lead during conversion ✅ (UI only - API can't convert Leads)
#   REQ-2: Region mapped from Account when Opportunity is created ✅ SF-498-API-004, API-005
#   REQ-3: Region blank on source record ✅ SF-498-API-006
#   REQ-4: Consistent Region behaviour ✅ SF-498-API-008
#   REQ-5: Region not editable after creation ✅ SF-498-API-007
#
# COVERAGE: 100%
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-498 @medium @auto-populate @field-mapping @opportunity
Feature: API - SF-498 - Map Region from Lead or Account to Opportunity

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Region__c field exists on Opportunity
    When I describe the Opportunity object fields
    Then the "Region__c" field should exist

  @SF-498 @SF-498-API-002 @p1 @field-exists
  Scenario: API - Verify Region__c field exists on Account
    When I describe the Account object fields
    Then the "Region__c" field should exist

  @SF-498 @SF-498-API-003 @p1 @field-exists
  Scenario: API - Verify Region__c field exists on Lead
    When I describe the Lead object fields
    Then the "Region__c" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-2: AUTO-POPULATION - Region from Account to Opportunity via API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-API-004 @smoke @p1 @auto-populate
  Scenario: API - Verify Region__c is inherited from Account on Opportunity creation
    Given I have a test Account created via API with Region "EU"
    When I create an Opportunity for the Account via API
    Then the API should return status code 201
    And the Opportunity should have Region "EU"

  @SF-498 @SF-498-API-005 @p1 @auto-populate @data-driven
  Scenario Outline: API - Verify Region__c mapping for all valid values
    Given I have a test Account created via API with Region "<value>"
    When I create an Opportunity for the Account via API
    Then the API should return status code 201
    And the Opportunity should have Region "<value>"

    Examples:
      | value |
      | US    |
      | UK    |
      | EU    |
      | CA    |

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-3: BLANK REGION - Handle blank/null Region gracefully
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-API-006 @p2 @blank-source
  Scenario: API - Handle null Region__c value from Account
    Given I have a test Account created via API without "Region__c"
    When I create an Opportunity for the Account via API
    Then the API should return status code 201
    And the "Region__c" should be null or empty

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-5: READ-ONLY - Region not editable after creation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-API-007 @p1 @read-only @negative
  Scenario: API - Verify Region__c cannot be updated on Opportunity after creation
    Given I have a test Account created via API with Region "UK"
    And I have a test Opportunity created via API for the Account
    When I try to update the Opportunity Region to "US" via API
    Then the API should reject the Region update
    And the Opportunity Region should still be "UK"

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-4: CONSISTENCY - Query and verify Region values
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-API-008 @p2 @query
  Scenario: API - Query Opportunity and verify Region field is populated
    Given I have a test Account created via API with Region "APAC"
    And I have a test Opportunity created via API for the Account
    When I query the Opportunity record via API
    Then the API should return status code 200
    And the Opportunity should have Region "APAC"

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-API-009 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Region__c value on Opportunity creation
    When I create a new Opportunity via POST with:
      | field     | value             |
      | Name      | Invalid Test      |
      | Region__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Region"
