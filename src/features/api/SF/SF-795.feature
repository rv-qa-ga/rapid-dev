# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-795 - Dataverse ID Field on Account Relationship (TPA Maps)
# Type: Story | Priority: Medium
# Feature Type: field-visibility, field-behavior, integration
# ══════════════════════════════════════════════════════════════════════════════
#
# Implementation note: Object API name is Account_Relationship__c.
# Step support for "I have an existing Account_Relationship__c record" and
# "I have an Account_Relationship__c record with ... already populated" may
# need to be added (data-factory + api-common update step object switch).
#
# User Story:
#   As an Integration Analyst I want a hidden field on the Account Relationship
#   (TPA Maps) object to store the Dataverse record ID returned by Dataverse after
#   Salesforce creates the relationship, so that downstream integrations can
#   reliably match relationship records across systems without user intervention.
#
# Key Requirements:
#   - Object: Account Relationship (TPA Maps) [API: Account_Relationship__c]
#   - Field: Dataverse_ID__c — Text(36), label "Dataverse ID"
#   - New record has blank Dataverse_ID__c; populated only by MuleSoft integration via API
#   - Non–integration user cannot create/update Dataverse_ID__c (validation/FLS)
#   - Dataverse ID is immutable once set — any attempt to change or clear is blocked
#   - Error: "Dataverse ID is system-managed and can only be set by the MuleSoft integration."
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-795 @medium @dataverse @tpa-maps @integration @field-exists
Feature: API - SF-795 - Dataverse ID Field on Account Relationship (TPA Maps)

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Create hidden Dataverse ID field — field exists, type, label
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API - Verify Dataverse_ID__c field exists on Account Relationship (TPA Maps)
    When I describe the Account_Relationship__c object fields
    Then the "Dataverse_ID__c" field should exist

  @SF-795 @SF-795-API-002 @p1 @field-type
  Scenario: API - Dataverse_ID__c is Text(36) with label "Dataverse ID"
    When I describe the Account_Relationship__c object fields
    Then the "Dataverse_ID__c" field should exist
    And the "Dataverse_ID__c" field type should be "string" with length 36

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: New relationship has no Dataverse ID (blank until integration)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-API-003 @p1 @positive @new-record
  Scenario: API - New Account Relationship (TPA Maps) record has blank Dataverse_ID__c
    When I create an Account_Relationship__c record via API with required fields only
    Then the "Dataverse_ID__c" field on the created record should be blank

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Prevent manual or non-integration updates to Dataverse ID
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-API-004 @p1 @negative @validation-rule
  Scenario: API - Non-integration user cannot set Dataverse_ID__c
    Given I have an existing Account_Relationship__c record
    When I update the Account_Relationship__c field "Dataverse_ID__c" to "test-dataverse-guid-12345" via API
    Then the API should return an error
    And the error response should mention "Dataverse ID"

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 5: Dataverse ID is immutable once set
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-API-005 @p2 @negative @immutable
  Scenario: API - Cannot change or clear Dataverse_ID__c once populated
    Given I have an Account_Relationship__c record with "Dataverse_ID__c" already populated
    When I update the Account_Relationship__c field "Dataverse_ID__c" to "different-guid-value" via API
    Then the API should return an error
    And the error response should mention "Dataverse ID"
