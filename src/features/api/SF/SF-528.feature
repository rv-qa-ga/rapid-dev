# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-528 - Type on the lead to include only member or Non-Member MGA
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: picklist-values
# Updated: 2026-01-26 - Regenerated with proper test scenarios
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Type on the lead to include only member or Non-Member MGA
# Primary Entity: Lead
#
# Field Configuration:
#   • Field Label: "Type"
#   • API Name: Type__c
#   • Field Type: Picklist (Required)
#   • Valid Selectable Values: Member, Non-Member MGA
#   • Note: --None-- is standard Salesforce behavior (appears in all picklists)
#     but the field is required, so --None-- cannot be saved
#   • Invalid Values: Any other account types (should not be available)
#
# Test Requirements (3):
#   REQ-1: Lead Type field only displays Member and Non-Member MGA
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Lead creation requires a valid Lead Type
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Phase 1 scope enforcement
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling (should fail if required)
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-528 @medium @picklist @lead @required-field
Feature: API - SF-528 - Type on the lead to include only member or Non-Member MGA

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-528 @SF-528-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Type__c field exists on Lead
    When I describe the Lead object fields
    Then the "Type__c" field should exist

  @SF-528 @SF-528-API-002 @p1 @picklist-values @scope-enforcement
  Scenario: API - Verify Type__c picklist contains only Member and Non-Member MGA as valid values
    When I describe the Lead object fields
    And I inspect the "Type__c" field metadata
    Then the picklist should contain the following valid selectable values:
      | Member          |
      | Non-Member MGA  |
    And the field should be required to prevent saving with null/blank values
    And the picklist should not contain any other account types
    And the field should be required to enforce Phase 1 scope

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL API OPERATIONS - Valid Values
  # ══════════════════════════════════════════════════════════════════════════

  @SF-528 @SF-528-API-003 @p1 @api-create @data-driven
  Scenario Outline: API - Create Lead with valid Type__c values
    When I create a new Lead via POST with:
      | field | value |
      | FirstName | API Test |
      | LastName | API Test Lead <type> |
      | Company | Test Company |
      | Email | api.test.<type>@example.com |
      | Phone | +1-555-0100 |
      | Title | CEO |
      | Industry | Insurance |
      | LeadSource | Website |
      | Status | Open - Not Contacted |
      | Rating | Hot |
      | Website | https://www.testcompany.com |
      | Street | 123 Test Street |
      | City | New York |
      | State | New York |
      | PostalCode | 10001 |
      | Country | United States |
      | Region__c | US |
      | Distribution_Region__c | US |
      | Type__c | <type> |
      | Is_Record_Duplicate__c | false |
      | Duplicate_Override_Reason__c | Test data creation for SF-528 |
      | Annual_GWP_Estimate_Year_1__c | 1000000 |
      | Product_Overview__c | Property & Casualty |
      | Prior_Incumbent__c | Competitor A |
      | Series_Entity__c | Series 1 |
    Then the API should return status code 201
    And the response should contain the new Lead ID
    And the response should contain "Type__c" with value "<type>"

    Examples:
      | type            |
      | Member          |
      | Non-Member MGA  |

  @SF-528 @SF-528-API-004 @p1 @api-update @data-driven
  Scenario Outline: API - Update Type__c on Lead to valid values
    Given I have an existing Lead record
    When I update the Lead field "Type__c" to "<type>" via API
    Then the API should return status code 204

    Examples:
      | type            |
      | Member          |
      | Non-Member MGA  |

  @SF-528 @SF-528-API-005 @p2 @api-query @data-driven
  Scenario Outline: API - Query Lead by Type__c
    Given I have an existing Lead record with "Type__c" = "<type>"
    When I query Lead where "Type__c" equals "<type>"
    Then the API should return status code 200
    And the response should contain Lead records with "Type__c" = "<type>"

    Examples:
      | type            |
      | Member          |
      | Non-Member MGA  |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY API SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-528 @SF-528-API-006 @p2 @negative @invalid-value @scope-enforcement
  Scenario Outline: API - Reject invalid Type__c values
    When I create a new Lead via POST with:
      | field | value |
      | FirstName | Invalid |
      | LastName | Invalid Test Lead |
      | Company | Test Company |
      | Email | invalid@example.com |
      | Phone | +1-555-0100 |
      | Title | CEO |
      | Industry | Insurance |
      | LeadSource | Website |
      | Status | Open - Not Contacted |
      | Region__c | US |
      | Distribution_Region__c | US |
      | Type__c | <invalid_type> |
      | Is_Record_Duplicate__c | false |
      | Duplicate_Override_Reason__c | Test data creation for SF-528 |
    Then the API should return an error
    And the error response should mention "Type__c" or "invalid picklist value"
    And the error response should indicate that "<invalid_type>" is not a valid value

    Examples:
      | invalid_type      |
      | INVALID_VALUE_### |
      | Agency            |
      | Insurer           |

  @SF-528 @SF-528-API-008 @p2 @negative @null-value @required-field
  Scenario: API - Handle null Type__c value - should fail if required
    When I create a new Lead via POST with:
      | field | value |
      | FirstName | Test |
      | LastName | Test Lead Without Type |
      | Company | Test Company |
      | Email | test@example.com |
      | Phone | +1-555-0100 |
      | Title | CEO |
      | Industry | Insurance |
      | LeadSource | Website |
      | Status | Open - Not Contacted |
      | Region__c | US |
      | Distribution_Region__c | US |
      | Is_Record_Duplicate__c | false |
      | Duplicate_Override_Reason__c | Test data creation for SF-528 |
    Then the API should return an error if Type__c is required
    And the error response should mention "Type__c" or "required field"

  @SF-528 @SF-528-API-009 @p2 @negative @null-value
  Scenario: API - Query Lead with null Type__c
    Given I have a valid Salesforce API token
    When I create a new Lead via POST with:
      | field                        | value                         |
      | FirstName                    | Test                          |
      | LastName                     | Test Lead Without Type        |
      | Company                      | Test Company                  |
      | Email                        | test@example.com              |
      | Phone                        | +1-555-0100                   |
      | Title                        | CEO                           |
      | Industry                     | Insurance                     |
      | LeadSource                   | Website                       |
      | Status                       | Open - Not Contacted          |
      | Region__c                    | US                            |
      | Distribution_Region__c       | US                            |
      | Is_Record_Duplicate__c       | false                         |
      | Duplicate_Override_Reason__c | Test data creation for SF-528 |
    Then the API should return an error
    And the error response should mention "Type__c" or "required field"

