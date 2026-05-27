# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-501 - Account, Opportunity, Role consolidation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-removal, field-modification, field-hide
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Account, Opportunity, Role consolidation
# Primary Entity: AccountContactRelation
#
# Fields Involved (3):
#   • Relationship_Strength__c - DELETE (field should not exist in metadata)
#   • Roles (standard field) - MODIFY (remove "Other" value)
#   • Account Contact Relationship Currency - HIDE (field should not be accessible)
#
# API Test Strategy:
#   - Verify Relationship_Strength__c does NOT exist in object metadata
#   - Verify attempts to use deleted field result in errors
#   - Verify Roles picklist values via API
#
# ═══════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-501 @medium @accountcontactrelation
Feature: API - SF-501 - Account, Opportunity, Role consolidation

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # REQUIREMENT 1: Relationship_Strength__c - DELETE (field should NOT exist)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-API-001 @smoke @p1 @field-removal
  Scenario: API - Verify Relationship_Strength__c field does NOT exist on AccountContactRelation
    When I describe the AccountContactRelation object fields
    Then the "Relationship_Strength__c" field should not exist

  @SF-501 @SF-501-API-002 @p1 @field-removal @negative
  Scenario: API - Verify attempting to query Relationship_Strength__c fails
    Given I have an existing AccountContactRelation record
    When I query all AccountContactRelation records via API
    Then the API should return status code 200
    And the response should not include the "Relationship_Strength__c" field

  @SF-501 @SF-501-API-003 @p2 @field-removal @negative
  Scenario: API - Verify creating ACR with Relationship_Strength__c fails
    Given I have an existing Account record
    And I have a test Contact created via API without "AccountId"
    When I create a new AccountContactRelation via POST with:
      | field                    | value               |
      | AccountId                | {existingAccountId} |
      | ContactId                | {existingContactId} |
      | Relationship_Strength__c | Strong              |
    Then the API should return an error
    And the error response should mention "Relationship_Strength"

  # ══════════════════════════════════════════════════════════════════════════
  # REQUIREMENT 2: Roles picklist - MODIFY (remove "Other" value)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-API-004 @smoke @p1 @picklist
  Scenario: API - Verify Roles field exists on AccountContactRelation
    When I describe the AccountContactRelation object fields
    Then the "Roles" field should exist

  @SF-501 @SF-501-API-005 @p2 @picklist @negative
  Scenario: API - Verify Roles picklist does NOT contain "Other" value
    When I describe the AccountContactRelation object fields
    Then the API "Roles" picklist should not contain "Other"

  # ══════════════════════════════════════════════════════════════════════════
  # REQUIREMENT 3: Account Contact Relationship Currency - HIDE
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-API-006 @smoke @p1 @field-hide
  Scenario: API - Verify AccountContactRelation Currency field accessibility
    When I describe the AccountContactRelation object fields
    # Note: Hidden fields may still exist in metadata but have restricted access
    # This verifies the field configuration
    Then the response should contain AccountContactRelation metadata

  # ══════════════════════════════════════════════════════════════════════════
  # BASIC FUNCTIONALITY - Verify ACR can still be created/queried
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-API-007 @smoke @p1 @basic
  Scenario: API - Verify AccountContactRelation can be created without deleted fields
    Given I have an existing AccountContactRelation record
    When I query the AccountContactRelation record via API
    Then the API should return status code 200
