# JIRA: SF-614 - Derive and maintain Is_Active__c on Member Legal Entity Relationship records
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only.

@api @salesforce @SF-614 @medium @salesforce @SF-614-RBT @member-legal-entity-relationship
Feature: API - SF-614 - Derive and maintain Is_Active__c on Member Legal Entity Relationship records

  Background:
    Given I have a valid Salesforce API token

  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS
  @SF-614 @SF-614-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Is_Active__c exists on Member Legal Entity Relationship
    When I describe the Member_Legal_Entity_Relationship__c object fields
    Then the "Is_Active__c" field should exist

  @SF-614 @SF-614-API-002 @p2 @rbt @field-exists
  Scenario: API (RBT) - Verify Start and End Date fields exist for derivation logic
    When I describe the Member_Legal_Entity_Relationship__c object fields
    Then the "Start_Date__c" field should exist
    And the "End_Date__c" field should exist
