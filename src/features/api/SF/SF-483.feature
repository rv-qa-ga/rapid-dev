# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-483 - Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Regenerated: 2025-01-08
# ══════════════════════════════════════════════════════════════════════════════
#
# SUMMARY:
#   Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts
#
# DESCRIPTION:
#   As a Product Owner / Business Analyst
#   I want the Upsell Opportunity field to be visible on Account records only when 
#   the Account is classified as Member MGA or Non-Member MGA
#   So that users only see and interact with the field on MGA accounts and the 
#   Account page is simplified for other account types
#
# SCOPE:
#   - The field visibility change is UI-only
#   - The field should NOT be deleted
#   - API, automations and integrations must continue to function
#   - The field should be accessible via API for ALL Account types (not just MGA)
#   - Field-level security and API access should remain unchanged
#
# API TESTING REQUIREMENTS:
#   - Verify Upsell_Opportunity__c field exists on Account object
#   - Verify field can be created/updated/queried via API for all Account types
#   - Verify field is accessible regardless of Account Type (Member MGA, Non-Member MGA, others)
#   - Verify field values can be set and retrieved correctly
#   - Verify API continues to work for automations and integrations
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-483 @medium @field-visibility @account
Feature: API - SF-483 - Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Upsell_Opportunity__c field exists on Account
    When I describe the Account object fields
    Then the "Upsell_Opportunity__c" field should exist

  @SF-483 @SF-483-API-002 @p1 @field-exists @field-metadata
  Scenario: API - Verify Upsell_Opportunity__c field metadata is accessible
    When I describe the Account object fields
    Then the "Upsell_Opportunity__c" field should exist
    And the field metadata should be accessible

  # ══════════════════════════════════════════════════════════════════════════
  # API OPERATIONS: Member MGA Accounts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-003 @p1 @api-create @member-mga
  Scenario: API - Create Member MGA Account with Upsell Opportunity
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Test Member MGA Account |
      | Type  | Member MGA |
      | Upsell_Opportunity__c | Member MGA |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-483 @SF-483-API-004 @p1 @api-update @member-mga
  Scenario: API - Update Upsell_Opportunity__c on Member MGA Account
    Given I have an existing Account record with Type "Member MGA"
    When I update the Account field "Upsell_Opportunity__c" to "Non-Member MGA" via API
    Then the API should return status code 204

  @SF-483 @SF-483-API-005 @p2 @api-query @member-mga
  Scenario: API - Query Member MGA Account by Upsell Opportunity
    Given I have an existing Account record with Type "Member MGA" and Upsell_Opportunity__c "Member MGA"
    When I query Account where "Upsell_Opportunity__c" equals "Member MGA"
    Then the API should return status code 200
    And the response should contain Account records

  # ══════════════════════════════════════════════════════════════════════════
  # API OPERATIONS: Non-Member MGA Accounts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-006 @p1 @api-create @non-member-mga
  Scenario: API - Create Non-Member MGA Account with Upsell Opportunity
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Test Non-Member MGA Account |
      | Type  | Non-Member MGA |
      | Upsell_Opportunity__c | Non-Member MGA |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-483 @SF-483-API-007 @p1 @api-update @non-member-mga
  Scenario: API - Update Upsell_Opportunity__c on Non-Member MGA Account
    Given I have an existing Account record with Type "Non-Member MGA"
    When I update the Account field "Upsell_Opportunity__c" to "Member MGA" via API
    Then the API should return status code 204

  @SF-483 @SF-483-API-008 @p2 @api-query @non-member-mga
  Scenario: API - Query Non-Member MGA Account by Upsell Opportunity
    Given I have an existing Account record with Type "Non-Member MGA" and Upsell_Opportunity__c "Non-Member MGA"
    When I query Account where "Upsell_Opportunity__c" equals "Non-Member MGA"
    Then the API should return status code 200
    And the response should contain Account records

  # ══════════════════════════════════════════════════════════════════════════
  # API OPERATIONS: Non-MGA Accounts (Field Still Accessible via API)
  # ══════════════════════════════════════════════════════════════════════════
  # IMPORTANT: The field should be accessible via API for ALL Account types,
  # even though it's not visible in the UI for non-MGA accounts.
  # This ensures automations and integrations continue to function.
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-009 @p1 @api-create @non-mga
  Scenario: API - Create non-MGA Account with Upsell Opportunity (API access maintained)
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Test Agency Account |
      | Type  | Agency |
      | Upsell_Opportunity__c | Member MGA |
    Then the API should return status code 201
    And the response should contain the new Account ID
    And the field "Upsell_Opportunity__c" should be accessible via API

  @SF-483 @SF-483-API-010 @p1 @api-update @non-mga
  Scenario: API - Update Upsell_Opportunity__c on non-MGA Account (API access maintained)
    Given I have an existing Account record with Type "Agency"
    When I update the Account field "Upsell_Opportunity__c" to "Non-Member MGA" via API
    Then the API should return status code 204
    And the field update should be successful

  @SF-483 @SF-483-API-011 @p2 @api-query @non-mga
  Scenario: API - Query non-MGA Account and retrieve Upsell Opportunity field
    Given I have an existing Account record with Type "Agency" and Upsell_Opportunity__c "Member MGA"
    When I query Account where "Id" equals the Account ID
    Then the API should return status code 200
    And the response should contain the "Upsell_Opportunity__c" field
    And the "Upsell_Opportunity__c" field value should be accessible

  @SF-483 @SF-483-API-012 @p2 @data-driven @non-mga
  Scenario Outline: API - Create non-MGA Account types with Upsell Opportunity (API access maintained)
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Test <account_type> Account |
      | Type  | <account_type> |
      | Upsell_Opportunity__c | Member MGA |
    Then the API should return status code 201
    And the response should contain the new Account ID
    And the field "Upsell_Opportunity__c" should be accessible via API

    Examples:
      | account_type |
      | Insurer |
      | Reinsurer |
      | Third Party Administrator |
      | Legal Entity |

  # ══════════════════════════════════════════════════════════════════════════
  # DATA-DRIVEN: Valid Picklist Values
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-013 @p2 @data-driven @picklist-values
  Scenario Outline: API - Create Account with each valid Upsell Opportunity value
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Test <value> Account |
      | Type  | Member MGA |
      | Upsell_Opportunity__c | <value> |
    Then the API should return status code 201
    And the response should contain the new Account ID

    Examples:
      | value |
      | Member MGA |
      | Non-Member MGA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-014 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Upsell_Opportunity__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Invalid Test Account |
      | Type  | Member MGA |
      | Upsell_Opportunity__c | INVALID_VALUE_### |
    Then the API should return an error
    And the error response should mention "Upsell_Opportunity"

  @SF-483 @SF-483-API-015 @p2 @negative @null-value
  Scenario: API - Handle null Upsell_Opportunity__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Null Test Account |
      | Type  | Member MGA |
    Then the API should return status code 201
    When I query the Account record via API
    Then the "Upsell_Opportunity__c" should be null or empty

  @SF-483 @SF-483-API-016 @p2 @negative @blank-value
  Scenario: API - Handle blank Upsell_Opportunity__c value
    When I create a new Account via POST with:
      | field | value |
      | Name  | SF-483 API Blank Test Account |
      | Type  | Member MGA |
      | Upsell_Opportunity__c | |
    Then the API should return status code 201
    When I query the Account record via API
    Then the "Upsell_Opportunity__c" should be null or empty

  # ══════════════════════════════════════════════════════════════════════════
  # BULK OPERATIONS: Verify API works for automations/integrations
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-API-017 @p2 @api-bulk @automations
  Scenario: API - Bulk update Upsell_Opportunity__c on multiple Account types
    Given I have 3 Account records with different Types
    When I bulk update the Upsell_Opportunity__c field via composite API
    Then all records should be updated successfully
    And the API should return status code 200

  @SF-483 @SF-483-API-018 @p2 @api-bulk @integrations
  Scenario: API - Bulk query Accounts with Upsell_Opportunity__c field
    Given I have multiple Account records with various Types
    When I query Accounts with Upsell_Opportunity__c field included
    Then the API should return status code 200
    And all Account records should have Upsell_Opportunity__c field accessible
    And the field should be accessible regardless of Account Type

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # API Testing Requirements: ✅ All covered
  #
  # ✅ Field Existence: Verified (API-001, API-002)
  # ✅ Member MGA Accounts: Create/Update/Query (API-003, API-004, API-005)
  # ✅ Non-Member MGA Accounts: Create/Update/Query (API-006, API-007, API-008)
  # ✅ Non-MGA Accounts: API access maintained (API-009, API-010, API-011, API-012)
  # ✅ Valid Picklist Values: Tested (API-013)
  # ✅ Negative/Boundary: Invalid/Null/Blank values (API-014, API-015, API-016)
  # ✅ Bulk Operations: For automations/integrations (API-017, API-018)
  #
  # Key Verification: The field remains accessible via API for ALL Account types,
  # ensuring automations and integrations continue to function despite UI visibility changes.
  #
  # ══════════════════════════════════════════════════════════════════════════
